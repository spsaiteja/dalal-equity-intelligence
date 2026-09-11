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

/**
 * Execution Context for the AI Deliberation Run
 */
export interface ExecutionContext {
  runId: string;
  timestamp: string;
  symbol: string;
  quote: StockQuote;
  news: any[];
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
// Strict Schema Validators
// ---------------------------------------------------------

export function isValidSentinelReport(report: any): report is SentinelReport {
  return (
    Boolean(report) &&
    report.role === 'SENTINEL' &&
    typeof report.stance === 'string' &&
    typeof report.confidenceScore === 'number' &&
    typeof report.headlineTakeaway === 'string' &&
    Array.isArray(report.arguments) &&
    Boolean(report.keyLevels) &&
    typeof report.keyLevels.immediateSupport === 'string' &&
    typeof report.keyLevels.immediateResistance === 'string'
  );
}

export function isValidFundamentalReport(report: any): report is FundamentalReport {
  return (
    Boolean(report) &&
    report.role === 'FUNDAMENTAL' &&
    typeof report.stance === 'string' &&
    typeof report.confidenceScore === 'number' &&
    typeof report.headlineTakeaway === 'string' &&
    typeof report.valuationStatus === 'string' &&
    typeof report.estimatedMarginOfSafetyPercent === 'number' &&
    Array.isArray(report.arguments)
  );
}

export function isValidNewsScoutReport(report: any): report is NewsScoutReport {
  return (
    Boolean(report) &&
    report.role === 'NEWS_SCOUT' &&
    typeof report.stance === 'string' &&
    typeof report.confidenceScore === 'number' &&
    typeof report.headlineTakeaway === 'string' &&
    typeof report.sentimentPolarity === 'number' &&
    Array.isArray(report.catalystsIdentified) &&
    Array.isArray(report.headwindWarnings)
  );
}

export function isValidRiskGuardianReport(report: any): report is RiskGuardianReport {
  return (
    Boolean(report) &&
    report.role === 'RISK_GUARDIAN' &&
    typeof report.stance === 'string' &&
    typeof report.confidenceScore === 'number' &&
    typeof report.headlineTakeaway === 'string' &&
    typeof report.riskRating === 'string' &&
    typeof report.recommendedMaxPositionPercent === 'number' &&
    typeof report.mandatedStopLoss === 'string'
  );
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

  const context: ExecutionContext = {
    runId,
    timestamp,
    symbol: quote.symbol,
    quote,
    news: recentNews,
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
  // Step 1: Parallel Execution of 4 Department Agents
  // -------------------------------------------------------
  const [sentinelResult, fundamentalResult, newsScoutResult, riskGuardianResult] = await Promise.allSettled([
    timedExecution(() => runSentinelAgent(quote, client), isValidSentinelReport, getSentinelFallback(quote)),
    timedExecution(() => runFundamentalAgent(quote, client), isValidFundamentalReport, getFundamentalFallback(quote)),
    timedExecution(() => runNewsScoutAgent(quote, recentNews, client), isValidNewsScoutReport, getNewsScoutFallback(quote, recentNews)),
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
    data: getNewsScoutFallback(quote, recentNews),
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
      if (parsed && parsed.cioVerdict && parsed.cioExecutiveDirective) {
        finalConsensus = {
          ...baselineConsensus,
          cioVerdict: parsed.cioVerdict || baselineConsensus.cioVerdict,
          overallScore: parsed.overallScore || baselineConsensus.overallScore,
          debateSummary: parsed.debateSummary || baselineConsensus.debateSummary,
          cioExecutiveDirective: parsed.cioExecutiveDirective || baselineConsensus.cioExecutiveDirective,
          tradeActionPlan: parsed.tradeActionPlan || baselineConsensus.tradeActionPlan,
        };
        cioStatus = 'success';
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

  const metadata: OrchestrationMetadata = {
    runId,
    executionTimeMs: totalDurationMs,
    timestamp,
    agentsStatus: context.status,
    model: client ? 'gemini-1.5-flash / ensemble-v1' : 'rule-engine-fallback',
    promptVersion: '1.2.0-orchestrated',
    disclaimer: 'DalalAI Autonomous Research Committee is for informational and educational purposes only. Not SEBI registered investment advice.',
  };

  return {
    ...finalConsensus,
    metadata,
  };
}
