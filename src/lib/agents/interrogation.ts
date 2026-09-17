import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  CouncilRole,
  ChatMessage,
  InterrogationRequest,
  InterrogationResponse,
} from '@/types/chat';
import { generateGeminiText } from '../gemini-helper';
import {
  sanitizeInput,
  stripPII,
  scanOutputSafety,
  getComplianceDisclaimer,
} from './guardrails';

export interface PersonaConfig {
  role: CouncilRole;
  displayName: string;
  badgeTitle: string;
  systemPrompt: string;
}

export function getPersonaConfig(role: CouncilRole): PersonaConfig {
  switch (role) {
    case 'SENTINEL':
      return {
        role: 'SENTINEL',
        displayName: 'Sentinel',
        badgeTitle: 'Quantitative Chartist',
        systemPrompt: `You are Sentinel, the Quantitative Technical Chartist of the DalalAI Investment Council.
Your expertise is in technical price action, multi-timeframe candlestick patterns, support and resistance zones, RSI momentum indicators, 50-day and 200-day EMAs, and volume profiles on Indian equities (NSE & BSE).
Analyze user questions or what-if scenarios from a rigorous technical charting perspective. Cite concrete price levels, pivot zones, and breakout thresholds.`,
      };

    case 'FUNDAMENTALIST':
      return {
        role: 'FUNDAMENTALIST',
        displayName: 'The Fundamentalist',
        badgeTitle: 'Deep-Value Skeptic',
        systemPrompt: `You are The Fundamentalist, the Deep-Value Skeptic of the DalalAI Investment Council.
Your expertise is corporate balance sheet health, P/E multiples vs 5-year historical medians, industry peer comparisons, ROCE, debt-to-equity ratios, and intrinsic margin of safety.
Evaluate user questions or counterfactual what-if scenarios through valuation discipline, earnings multiples, and margin of safety compression.`,
      };

    case 'NEWS_SCOUT':
      return {
        role: 'NEWS_SCOUT',
        displayName: 'News Scout',
        badgeTitle: 'Macro & Sentiment Pulse',
        systemPrompt: `You are News Scout, the Macro & Sentiment Analyst of the DalalAI Investment Council.
Your expertise is Dalal Street sentiment, earnings reports, regulatory announcements (SEBI, RBI), Government of India policy shifts (PLI, budget allocations, tariffs), and global macro cues (crude oil, USD/INR, US Fed yields).
Evaluate user questions or counterfactual macro shocks by tracking sentiment catalysts, sector tailwinds, and headline vulnerabilities.`,
      };

    case 'RISK_GUARDIAN':
      return {
        role: 'RISK_GUARDIAN',
        displayName: 'Risk Guardian',
        badgeTitle: 'Capital Protector',
        systemPrompt: `You are Risk Guardian, the Capital Protector of the DalalAI Investment Council.
Your mandate is strict downside capital preservation, stop-loss governance, portfolio beta exposure, volatility defense, and position allocation ceilings.
Respond to user queries or what-if scenarios by evaluating drawdown risks, stop-loss viability, and portfolio risk budgets. You reject reckless or overleveraged proposals.`,
      };

    case 'CIO':
    case 'ALL':
    default:
      return {
        role: 'CIO',
        displayName: 'Chief Investment Officer',
        badgeTitle: 'Committee Chair',
        systemPrompt: `You are the Chief Investment Officer (CIO) and Chair of the DalalAI Investment Council.
You coordinate all 4 department agents (Sentinel, The Fundamentalist, News Scout, Risk Guardian). You synthesize conflicting viewpoints, weigh technical trends against fundamental value, and deliver decisive executive directives on entry strategy, target horizons, and risk limits.
Respond to user queries with a balanced, authoritative synthesis representing the committee's final judgment.`,
      };
  }
}

/**
 * Builds a deterministic fallback clarification if the Gemini API is unreachable or rate-limited.
 */
export function generateFallbackClarification(
  role: CouncilRole,
  symbol: string,
  price: number = 0,
  userQuery: string
): string {
  const sym = (symbol || 'this asset').toUpperCase();
  const priceStr = price > 0 ? ` at ₹${price.toLocaleString('en-IN')}` : '';

  switch (role) {
    case 'SENTINEL':
      return `From a quantitative chartist perspective on **${sym}**${priceStr}: Key support is anchored near current price levels with 50-EMA providing dynamic support. In response to "${userQuery}", any continuation requires volume confirmation above the immediate swing high. Maintain disciplined stops below critical chart support.`;

    case 'FUNDAMENTALIST':
      return `Valuation analysis for **${sym}**${priceStr} indicates that our intrinsic margin of safety is our primary anchor. Regarding "${userQuery}", if underlying earnings or industry multiples adjust, fair value estimates will re-rate accordingly. We advise accumulation only where reasonable valuation multiples protect downside capital.`;

    case 'NEWS_SCOUT':
      return `Macro and sentiment evaluation for **${sym}** shows that headline flow and sectoral sentiment remain sensitive. In light of "${userQuery}", investors should monitor forthcoming quarterly disclosures, regulatory actions, and commodity trends that directly influence institutional flows.`;

    case 'RISK_GUARDIAN':
      return `Capital preservation protocol for **${sym}**${priceStr}: In addressing "${userQuery}", portfolio risk must remain strictly capped. We recommend maintaining strict stop-loss adherence, limiting exposure to within approved portfolio caps, and avoiding chasing volatile intraday swings.`;

    case 'CIO':
    case 'ALL':
    default:
      return `As CIO, synthesizing the council's perspective on **${sym}**${priceStr}: In assessing "${userQuery}", the committee maintains a balanced stance. While tactical upside remains supported by sector fundamentals, execution must align with the established stop-loss and allocation parameters.`;
  }
}

/**
 * Generates an agent clarification or what-if scenario analysis in response to a user interrogation.
 */
export async function generateAgentClarification(
  request: InterrogationRequest
): Promise<InterrogationResponse> {
  const {
    symbol,
    stockPrice = 0,
    targetAgent = 'CIO',
    userQuery,
    history = [],
    consensusSummary = '',
    cioVerdict = '',
    cioDirective = '',
    apiKey,
  } = request;

  // 1. Guardrail Validation: Sanitize user query against prompt injection
  const injectionCheck = sanitizeInput(userQuery);
  if (injectionCheck.blocked) {
    const violationMessage: ChatMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 10)}`,
      role: 'assistant',
      senderRole: targetAgent,
      senderName: getPersonaConfig(targetAgent).displayName,
      content: `⚠️ Your query was flagged by DalalAI security guardrails: ${injectionCheck.reason || 'Unauthorized instruction pattern detected.'} Please refine your question.`,
      timestamp: new Date().toISOString(),
    };
    return {
      message: violationMessage,
      targetAgent,
      complianceNotice: getComplianceDisclaimer().short,
    };
  }

  // 2. Guardrail Validation: Strip PII from query
  const cleanQuery = stripPII(userQuery).cleaned;

  // 3. Select persona configuration
  const persona = getPersonaConfig(targetAgent);

  // 4. Bound conversation history to last 6 messages to stay well within token limits
  const boundedHistory = history.slice(-6);
  const formattedHistory = boundedHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : msg.senderName || 'Agent'}: ${msg.content}`)
    .join('\n\n');

  // 5. Construct persona prompt
  const prompt = `${persona.systemPrompt}

TARGET ASSET: ${symbol.toUpperCase()}
CURRENT PRICE: ₹${stockPrice.toLocaleString('en-IN')}
${cioVerdict ? `COMMITTEE VERDICT: ${cioVerdict}` : ''}
${cioDirective ? `CIO DIRECTIVE: ${cioDirective}` : ''}
${consensusSummary ? `ORIGINAL DELIBERATION SUMMARY: ${consensusSummary}` : ''}

${formattedHistory ? `RECENT CONVERSATION HISTORY:\n${formattedHistory}\n` : ''}
USER INQUIRY / COUNTERFACTUAL WHAT-IF SCENARIO:
"${cleanQuery}"

INSTRUCTIONS:
1. Address the user's specific inquiry directly in your persona's distinctive voice.
2. If the user asks a "what-if" scenario (e.g. macro shock, price drop, margin compression), analyze the specific counterfactual implications for ${symbol.toUpperCase()}.
3. Be professional, concise (2 to 4 paragraphs), and cite realistic financial or technical levels where applicable.
4. Do NOT make guaranteed return promises or solicit illegal investment schemes.`;

  // 6. Execute model call with exponential backoff & timeout protection
  const key = apiKey || process.env.GEMINI_API_KEY;
  let responseText: string | null = null;

  if (key && key.trim()) {
    try {
      const client = new GoogleGenerativeAI(key.trim());
      responseText = await generateGeminiText(client, prompt, {
        timeoutMs: 8000,
        maxRetries: 2,
      });
    } catch (err: any) {
      console.warn(`[Interrogation] Gemini text generation error for ${targetAgent}:`, err?.message);
    }
  }

  // 7. Fallback if LLM unavailable
  if (!responseText || !responseText.trim()) {
    responseText = generateFallbackClarification(targetAgent, symbol, stockPrice, cleanQuery);
  }

  // 8. Output Safety & SEBI compliance check
  const safetyResult = scanOutputSafety(responseText);
  if (safetyResult.flagged) {
    responseText += `\n\n*(Note: Analysis strictly reflects algorithmic models; past performance does not guarantee future results.)*`;
  }

  const complianceNotice = getComplianceDisclaimer().short;

  const assistantMessage: ChatMessage = {
    id: `msg-${crypto.randomUUID().slice(0, 10)}`,
    role: 'assistant',
    senderRole: persona.role,
    senderName: persona.displayName,
    content: responseText.trim(),
    timestamp: new Date().toISOString(),
  };

  return {
    message: assistantMessage,
    targetAgent: persona.role,
    complianceNotice,
  };
}
