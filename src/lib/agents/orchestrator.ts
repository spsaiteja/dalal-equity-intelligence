import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockQuote, ConvictionType } from '@/types/stock';
import {
  CouncilConsensus,
  SentinelReport,
  FundamentalReport,
  NewsScoutReport,
  RiskGuardianReport,
  OrchestrationMetadata,
  AgentExecutionStatus,
} from '@/types/agent';
import { runSentinelAgent } from './sentinel';
import { runFundamentalAgent } from './fundamental';
import { runNewsScoutAgent } from './news-scout';
import { runRiskGuardianAgent } from './risk-guardian';
import { generateGeminiJson } from '../gemini-helper';
import { executeTool, ToolCallResult, listAvailableTools } from './tools';
import {
  validateAndRepairSentinel,
  validateAndRepairFundamental,
  validateAndRepairNewsScout,
  validateAndRepairRiskGuardian,
  validateAndRepairCIOConsensus,
} from './schema-validator';
import { recordDeliberationTelemetry, DeliberationRunTelemetry } from './telemetry';
import { stripPII, scanConsensusOutput, getComplianceDisclaimer } from './guardrails';

/**
 * Execution Context for the AI Deliberation Run
 */
export interface ExecutionContext {
  runId: string;
  timestamp: string;
  symbol: string;
  quote: StockQuote;
  news: any[];
  toolCalls: ToolCallResult[];
  agentOutputs: {
    sentinel?: SentinelReport;
    fundamental?: FundamentalReport;
    newsScout?: NewsScoutReport;
    riskGuardian?: RiskGuardianReport;
  };
  metrics: {
    sentinelMs?: number;
    fundamentalMs?: number;
    newsScoutMs?: number;
    riskGuardianMs?: number;
    cioMs?: number;
    totalMs?: number;
  };
  status: {
    sentinel: AgentExecutionStatus;
    fundamental: AgentExecutionStatus;
    newsScout: AgentExecutionStatus;
    riskGuardian: AgentExecutionStatus;
    cio: AgentExecutionStatus;
  };
}

// ---------------------------------------------------------
// Strict Runtime Schema Validators (Powered by Zod)
// ---------------------------------------------------------

export function isValidSentinelReport(report: any): report is SentinelReport {
  return validateAndRepairSentinel(report).success;
}

export function isValidFundamentalReport(report: any): report is FundamentalReport {
  return validateAndRepairFundamental(report).success;
}

export function isValidNewsScoutReport(report: any): report is NewsScoutReport {
  return validateAndRepairNewsScout(report).success;
}

export function isValidRiskGuardianReport(report: any): report is RiskGuardianReport {
  return validateAndRepairRiskGuardian(report).success;
}

// ---------------------------------------------------------
// Deterministic Safe Fallbacks
// ---------------------------------------------------------

function getSentinelFallback(quote: StockQuote): SentinelReport {
  const isOversold = (quote.rsi14 ?? 50) < 40;
  const isAbove200 = quote.ema200 ? quote.price > quote.ema200 : true;

  return {
    agentName: 'Agent Sentinel (Technicals & Momentum)',
    role: 'SENTINEL',
    stance: isOversold ? 'Strong Bullish' : isAbove200 ? 'Bullish' : 'Neutral',
    confidenceScore: isOversold ? 86 : 74,
    headlineTakeaway: isOversold
      ? `RSI at ${quote.rsi14 ?? 'oversold'} with price ${quote.discountFromHigh}% off peak signals prime mean-reversion opportunity.`
      : 'Price action is consolidating in a supportive band relative to moving averages.',
    trendAssessment: isAbove200
      ? 'Macro Uptrend: Holding above 200 EMA with solid structural base.'
      : 'Macro Consolidation: Testing intermediate horizontal supports.',
    keyLevels: {
      immediateSupport: `₹${Math.round(quote.price * 0.98).toLocaleString('en-IN')}`,
      majorSupport: `₹${Math.round(quote.price * 0.94).toLocaleString('en-IN')}`,
      immediateResistance: `₹${Math.round(quote.price * 1.06).toLocaleString('en-IN')}`,
      majorBreakout: `₹${Math.round(quote.fiftyTwoWeekHigh).toLocaleString('en-IN')}`,
    },
    arguments: [
      `52-Week distance: Currently ${quote.discountFromHigh}% below peak and ${quote.distanceFromLow}% above annual low.`,
      `14-Day RSI is hovering at ${quote.rsi14 ?? 'N/A'}, reflecting healthy accumulation.`,
      quote.ema50 ? `Price is within ${Math.abs(quote.price - quote.ema50).toFixed(1)} pts of the 50-day EMA.` : 'Consolidation channel.',
    ],
    isFallback: true,
    fallbackReason: 'Quantitative technical model fallback (zero LLM latency / rate-limit shield)',
  };
}

function getFundamentalFallback(quote: StockQuote): FundamentalReport {
  const isDiscounted = quote.discountFromHigh > 15;
  const isCheap = (quote.peRatio ?? 30) < 25;

  return {
    agentName: 'Agent Fundamentalist (Valuation & Financials)',
    role: 'FUNDAMENTAL',
    stance: isDiscounted ? 'Strong Bullish' : isCheap ? 'Bullish' : 'Neutral',
    confidenceScore: 82,
    headlineTakeaway: isDiscounted
      ? `Valuation margin of safety has expanded significantly with the ${quote.discountFromHigh}% drop from recent peaks.`
      : `Fundamentals remain sound with stable operating profitability in the ${quote.sector || 'Indian'} sector.`,
    valuationStatus: isDiscounted ? 'Deeply Undervalued' : 'Fair Value',
    estimatedMarginOfSafetyPercent: isDiscounted ? 24 : 12,
    balanceSheetHealth: 'Robust',
    arguments: [
      `P/E Ratio currently sits at ${quote.peRatio ? quote.peRatio + 'x' : 'reasonable industry median'}.`,
      'Core business generates reliable free cash flows and maintains defensible competitive moats.',
      'Institutional ownership provides long-term valuation anchor.',
    ],
    isFallback: true,
    fallbackReason: 'Quantitative valuation model fallback (zero LLM latency / rate-limit shield)',
  };
}

function getNewsScoutFallback(quote: StockQuote, recentNews: any[]): NewsScoutReport {
  return {
    agentName: 'Agent News Scout (Sentiment & Catalysts)',
    role: 'NEWS_SCOUT',
    stance: 'Bullish',
    confidenceScore: 78,
    headlineTakeaway: 'Market chatter remains constructive with steady corporate updates and sector demand.',
    sentimentPolarity: 0.45,
    catalystsIdentified: [
      'Solid domestic capex cycle and government infrastructure/policy thrust.',
      'Continuous domestic mutual fund SIP liquidity inflows.',
    ],
    headwindWarnings: [
      'Global interest rate trajectory and foreign institutional selling waves.',
    ],
    arguments: [
      `News sentiment indicates steady institutional interest for ${quote.name}.`,
      recentNews.length > 0 ? `Latest report: "${recentNews[0].title}"` : 'No negative regulatory or governance flags detected.',
    ],
    isFallback: true,
    fallbackReason: 'Heuristic news analysis fallback (zero LLM latency / rate-limit shield)',
  };
}

function getRiskGuardianFallback(quote: StockQuote): RiskGuardianReport {
  const defaultStopLoss = `₹${Math.round(quote.price * 0.94).toLocaleString('en-IN')}`;

  return {
    agentName: 'Agent Risk Guardian (Capital Preservation)',
    role: 'RISK_GUARDIAN',
    stance: 'Neutral',
    confidenceScore: 88,
    headlineTakeaway: `Downside risk is contained provided stop-loss at ${defaultStopLoss} is rigorously enforced.`,
    riskRating: 'Moderate Risk',
    recommendedMaxPositionPercent: 6,
    mandatedStopLoss: defaultStopLoss,
    riskRewardAssessment: '1:2.6 (Favorable upside skew relative to 6% stop-loss buffer)',
    arguments: [
      `Risk-Reward asymmetry: ${quote.discountFromHigh}% drop from peak provides cushion against multiple compression.`,
      'Mandatory stop-loss pegged at 5-6% below current price to protect institutional capital.',
      'Cap single-stock allocation to 6% of total portfolio value to prevent sector clustering.',
    ],
    isFallback: true,
    fallbackReason: 'Quantitative risk assessment fallback (zero LLM latency / rate-limit shield)',
  };
}

// ---------------------------------------------------------
// Main AI Deliberation Orchestrator
// ---------------------------------------------------------

export async function orchestrateCouncilDeliberation(
  quote: StockQuote,
  recentNews: any[] = [],
  customApiKey?: string
): Promise<CouncilConsensus> {
  const totalStartTime = performance.now();
  const runId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const key = customApiKey || process.env.GEMINI_API_KEY;
  const client = key && key.trim() ? new GoogleGenerativeAI(key.trim()) : null;

  // Guardrail: Strip PII from news content before LLM ingestion
  let piiDetectedInNews = false;
  const sanitizedNews = recentNews.map((n) => {
    const titleResult = stripPII(n.title || '');
    const publisherResult = stripPII(n.publisher || '');
    if (titleResult.piiDetected || publisherResult.piiDetected) piiDetectedInNews = true;
    return { ...n, title: titleResult.cleaned, publisher: publisherResult.cleaned };
  });

  const context: ExecutionContext = {
    runId,
    timestamp,
    symbol: quote.symbol,
    quote,
    news: sanitizedNews,
    toolCalls: [],
    agentOutputs: {},
    metrics: {},
    status: {
      sentinel: 'failed',
      fundamental: 'failed',
      newsScout: 'failed',
      riskGuardian: 'failed',
      cio: 'failed',
    },
  };

  // -------------------------------------------------------
  // Step 1: Execute Discrete AI Tools Concurrently
  // -------------------------------------------------------
  const [quoteToolRes, techToolRes, finToolRes, newsToolRes, riskToolRes] = await Promise.all([
    executeTool('get_stock_quote', { symbol: quote.symbol }),
    executeTool('get_technical_indicators', { symbol: quote.symbol }),
    executeTool('get_company_financials', { symbol: quote.symbol }),
    executeTool('search_market_news', { query: quote.name || quote.symbol, limit: 5 }),
    executeTool('calculate_risk_metrics', { symbol: quote.symbol, price: quote.price }),
  ]);
  context.toolCalls.push(quoteToolRes, techToolRes, finToolRes, newsToolRes, riskToolRes);

  // Helper to wrap agent execution with latency tracking and fail-soft catch
  async function timedExecution<T>(
    agentFn: () => Promise<T>,
    validator: (data: any) => boolean,
    fallback: T
  ): Promise<{ data: T; durationMs: number; status: AgentExecutionStatus }> {
    const t0 = performance.now();
    try {
      const res = await agentFn();
      const durationMs = Math.round(performance.now() - t0);
      if (validator(res)) {
        // If it used client, mark 'success'; if client was null, it returned fallback seamlessly
        return { data: res, durationMs, status: client ? 'success' : 'fallback' };
      }
      return { data: fallback, durationMs, status: 'fallback' };
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      console.warn('[Orchestrator] Agent execution encountered error; applying fallback:', err);
      return { data: fallback, durationMs, status: 'fallback' };
    }
  }

  // -------------------------------------------------------
  // Step 2: Parallel Execution of 4 Department Agents
  // -------------------------------------------------------
  const [sentinelResult, fundamentalResult, newsScoutResult, riskGuardianResult] = await Promise.allSettled([
    timedExecution(() => runSentinelAgent(quote, client), isValidSentinelReport, getSentinelFallback(quote)),
    timedExecution(() => runFundamentalAgent(quote, client), isValidFundamentalReport, getFundamentalFallback(quote)),
    timedExecution(() => runNewsScoutAgent(quote, sanitizedNews, client), isValidNewsScoutReport, getNewsScoutFallback(quote, sanitizedNews)),
    timedExecution(() => runRiskGuardianAgent(quote, client), isValidRiskGuardianReport, getRiskGuardianFallback(quote)),
  ]);

  // Extract results safely
  const sentinelData = sentinelResult.status === 'fulfilled' ? sentinelResult.value : {
    data: getSentinelFallback(quote),
    durationMs: 0,
    status: 'fallback' as AgentExecutionStatus,
  };
  context.agentOutputs.sentinel = sentinelData.data;
  context.metrics.sentinelMs = sentinelData.durationMs;
  context.status.sentinel = sentinelData.status;

  const fundamentalData = fundamentalResult.status === 'fulfilled' ? fundamentalResult.value : {
    data: getFundamentalFallback(quote),
    durationMs: 0,
    status: 'fallback' as AgentExecutionStatus,
  };
  context.agentOutputs.fundamental = fundamentalData.data;
  context.metrics.fundamentalMs = fundamentalData.durationMs;
  context.status.fundamental = fundamentalData.status;

  const newsScoutData = newsScoutResult.status === 'fulfilled' ? newsScoutResult.value : {
    data: getNewsScoutFallback(quote, sanitizedNews),
    durationMs: 0,
    status: 'fallback' as AgentExecutionStatus,
  };
  context.agentOutputs.newsScout = newsScoutData.data;
  context.metrics.newsScoutMs = newsScoutData.durationMs;
  context.status.newsScout = newsScoutData.status;

  const riskGuardianData = riskGuardianResult.status === 'fulfilled' ? riskGuardianResult.value : {
    data: getRiskGuardianFallback(quote),
    durationMs: 0,
    status: 'fallback' as AgentExecutionStatus,
  };
  context.agentOutputs.riskGuardian = riskGuardianData.data;
  context.metrics.riskGuardianMs = riskGuardianData.durationMs;
  context.status.riskGuardian = riskGuardianData.status;

  // -------------------------------------------------------
  // Step 2: CIO Synthesis Layer
  // -------------------------------------------------------
  const cioStartTime = performance.now();
  const target1 = Math.round(quote.price * 1.09);
  const target2 = Math.round(quote.price * 1.20);
  const stopLoss = Math.round(quote.price * 0.94);

  const isDiscounted = quote.discountFromHigh > 15 || (quote.rsi14 ?? 50) < 40;
  const defaultVerdict: ConvictionType = (quote.signal as ConvictionType) || (isDiscounted ? 'STRONG_BUY' : 'BUY');
  const defaultScore = quote.signalScore || (isDiscounted ? 8.6 : 7.2);

  const baselineConsensus: CouncilConsensus = {
    symbol: quote.symbol,
    companyName: quote.name,
    currentPrice: quote.price,
    cioVerdict: defaultVerdict,
    overallScore: defaultScore,
    debateSummary: `The committee supports accumulating ${quote.name}. Agent Fundamentalist notes the ${quote.discountFromHigh}% margin of safety, while Sentinel confirms RSI is stabilizing. Agent Risk Guardian has sanctioned an entry with stop-loss at ₹${stopLoss}.`,
    cioExecutiveDirective: `Execute staggered buy orders across 2 tranches. Allocate up to ${context.agentOutputs.riskGuardian.recommendedMaxPositionPercent}% of portfolio. Exit if price breaks below ₹${stopLoss}.`,
    tradeActionPlan: {
      entryStrategy: `Stagger accumulation between ₹${Math.round(quote.price * 0.98)} and ₹${quote.price}`,
      target1: `₹${target1.toLocaleString('en-IN')}`,
      target2: `₹${target2.toLocaleString('en-IN')}`,
      stopLoss: `₹${stopLoss.toLocaleString('en-IN')}`,
      timeHorizon: '2-4 Months (Swing to Positional)',
      positionAllocation: `Max ${context.agentOutputs.riskGuardian.recommendedMaxPositionPercent}% of portfolio`,
    },
    agents: {
      sentinel: context.agentOutputs.sentinel,
      fundamental: context.agentOutputs.fundamental,
      newsScout: context.agentOutputs.newsScout,
      riskGuardian: context.agentOutputs.riskGuardian,
    },
    timestamp,
  };

  let finalConsensus: CouncilConsensus = baselineConsensus;
  let cioStatus: AgentExecutionStatus = 'fallback';

  if (client) {
    try {
      const prompt = `
You are the CHIEF INVESTMENT OFFICER (CIO) presiding over the DalalAI Investment Committee for Indian equities.
Review the 4 department briefs and render the FINAL INVESTMENT DIRECTIVE.

Company: ${quote.name} (${quote.symbol}) | Current Market Price: ₹${quote.price}
1. Sentinel (Technicals): ${context.agentOutputs.sentinel.stance} - "${context.agentOutputs.sentinel.headlineTakeaway}"
2. Fundamentalist (Valuation): ${context.agentOutputs.fundamental.stance} - "${context.agentOutputs.fundamental.headlineTakeaway}"
3. News Scout (Sentiment): ${context.agentOutputs.newsScout.stance} - "${context.agentOutputs.newsScout.headlineTakeaway}"
4. Risk Guardian (Risk & Allocation): ${context.agentOutputs.riskGuardian.stance} - "${context.agentOutputs.riskGuardian.headlineTakeaway}"

TASK: Synthesize these 4 department briefings into an institutional directive.
Return STRICT valid JSON:
{
  "cioVerdict": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "overallScore": number (1.0 to 10.0),
  "debateSummary": "Concise synthesis weighing department consensus against key risks",
  "cioExecutiveDirective": "Direct, actionable tactical directive for institutional execution",
  "tradeActionPlan": {
    "entryStrategy": "Entry pricing guidance",
    "target1": "Target 1 in ₹",
    "target2": "Target 2 in ₹",
    "stopLoss": "Stop-loss level in ₹",
    "timeHorizon": "e.g. 1-3 Months / 6-12 Months",
    "positionAllocation": "Allocation %"
  }
}
`;
      const parsed = await generateGeminiJson(client, prompt, 3800);
      if (parsed) {
        const validated = validateAndRepairCIOConsensus(parsed);
        if (validated.success && validated.data) {
          finalConsensus = {
            ...baselineConsensus,
            cioVerdict: validated.data.cioVerdict,
            overallScore: validated.data.overallScore,
            debateSummary: validated.data.debateSummary,
            cioExecutiveDirective: validated.data.cioExecutiveDirective,
            tradeActionPlan: validated.data.tradeActionPlan,
          };
          cioStatus = 'success';
        }
      }
    } catch (cioErr) {
      console.warn('[Orchestrator] CIO synthesis encountered error; using baseline consensus:', cioErr);
      cioStatus = 'fallback';
    }
  }

  const cioDurationMs = Math.round(performance.now() - cioStartTime);
  context.metrics.cioMs = cioDurationMs;
  context.status.cio = cioStatus;

  const totalDurationMs = Math.round(performance.now() - totalStartTime);
  context.metrics.totalMs = totalDurationMs;

  // Guardrail: Scan all deliberation output for safety & regulatory compliance
  const safetyScan = scanConsensusOutput({
    debateSummary: finalConsensus.debateSummary,
    cioExecutiveDirective: finalConsensus.cioExecutiveDirective,
    agents: {
      sentinel: finalConsensus.agents.sentinel,
      fundamental: finalConsensus.agents.fundamental,
      newsScout: finalConsensus.agents.newsScout,
      riskGuardian: finalConsensus.agents.riskGuardian,
    },
  });

  const compliance = getComplianceDisclaimer();

  const metadata: OrchestrationMetadata = {
    runId,
    executionTimeMs: totalDurationMs,
    timestamp,
    agentsStatus: context.status,
    model: client ? 'gemini-1.5-flash / ensemble-v1' : 'rule-engine-fallback',
    promptVersion: '1.3.0-agentic-tools',
    disclaimer: compliance.short,
    compliance,
    guardrailFlags: safetyScan.flags,
    toolCallsCount: context.toolCalls.length,
    toolCalls: context.toolCalls.map((tc) => ({
      toolName: tc.toolName,
      durationMs: tc.durationMs,
      status: tc.status,
      error: tc.error,
    })),
  };

  // Asynchronous non-blocking telemetry audit trail
  const overallStatus = Object.values(context.status).every((s) => s === 'success')
    ? 'SUCCESS'
    : Object.values(context.status).some((s) => s === 'failed')
    ? 'FAILED'
    : 'PARTIAL_FALLBACK';

  const telemetryPayload: DeliberationRunTelemetry = {
    runId,
    timestamp,
    symbol: quote.symbol,
    companyName: quote.name,
    totalExecutionTimeMs: totalDurationMs,
    overallStatus,
    cioVerdict: finalConsensus.cioVerdict,
    cioScore: finalConsensus.overallScore,
    agents: {
      sentinel: {
        runId,
        agentName: 'Agent Sentinel',
        role: 'SENTINEL',
        executionTimeMs: context.metrics.sentinelMs || 0,
        retryCount: 0,
        modelUsed: metadata.model,
        status: context.status.sentinel,
        isFallback: Boolean(context.agentOutputs.sentinel?.isFallback),
        fallbackReason: context.agentOutputs.sentinel?.fallbackReason,
        timestamp,
      },
      fundamental: {
        runId,
        agentName: 'Agent Fundamentalist',
        role: 'FUNDAMENTAL',
        executionTimeMs: context.metrics.fundamentalMs || 0,
        retryCount: 0,
        modelUsed: metadata.model,
        status: context.status.fundamental,
        isFallback: Boolean(context.agentOutputs.fundamental?.isFallback),
        fallbackReason: context.agentOutputs.fundamental?.fallbackReason,
        timestamp,
      },
      newsScout: {
        runId,
        agentName: 'Agent News Scout',
        role: 'NEWS_SCOUT',
        executionTimeMs: context.metrics.newsScoutMs || 0,
        retryCount: 0,
        modelUsed: metadata.model,
        status: context.status.newsScout,
        isFallback: Boolean(context.agentOutputs.newsScout?.isFallback),
        fallbackReason: context.agentOutputs.newsScout?.fallbackReason,
        timestamp,
      },
      riskGuardian: {
        runId,
        agentName: 'Agent Risk Guardian',
        role: 'RISK_GUARDIAN',
        executionTimeMs: context.metrics.riskGuardianMs || 0,
        retryCount: 0,
        modelUsed: metadata.model,
        status: context.status.riskGuardian,
        isFallback: Boolean(context.agentOutputs.riskGuardian?.isFallback),
        fallbackReason: context.agentOutputs.riskGuardian?.fallbackReason,
        timestamp,
      },
      cio: {
        runId,
        agentName: 'Chief Investment Officer',
        role: 'CIO',
        executionTimeMs: context.metrics.cioMs || 0,
        retryCount: 0,
        modelUsed: metadata.model,
        status: context.status.cio,
        isFallback: context.status.cio === 'fallback',
        timestamp,
      },
    },
    toolsExecutedCount: context.toolCalls.length,
    model: metadata.model,
  };

  recordDeliberationTelemetry(telemetryPayload).catch((e) =>
    console.warn('[Orchestrator] Telemetry logging encountered error:', e)
  );

  return {
    ...finalConsensus,
    metadata,
  };
}
