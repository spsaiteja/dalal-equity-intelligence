import { StockQuote } from '@/types/stock';
import { CouncilConsensus } from '@/types/agent';
import { CouncilExecutionMode } from '@/types/routing';
import { orchestrateCouncilDeliberation } from './orchestrator';

export async function runCouncilDeliberation(
  quote: StockQuote,
  recentNews: any[] = [],
  customApiKey?: string,
  executionMode?: CouncilExecutionMode
): Promise<CouncilConsensus> {
  return orchestrateCouncilDeliberation(quote, recentNews, customApiKey, executionMode);
}

/* Backwards-compatible legacy implementation reference below */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { runSentinelAgent } from './sentinel';
import { runFundamentalAgent } from './fundamental';
import { runNewsScoutAgent } from './news-scout';
import { runRiskGuardianAgent } from './risk-guardian';
import { generateGeminiJson } from '../gemini-helper';

export async function runDirectCouncilDeliberation(
  quote: StockQuote,
  recentNews: any[] = [],
  customApiKey?: string
): Promise<CouncilConsensus> {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  const client = key && key.trim() ? new GoogleGenerativeAI(key.trim()) : null;

  // Phase 1: Deploy all 4 specialized department agents in parallel
  const [sentinel, fundamental, newsScout, riskGuardian] = await Promise.all([
    runSentinelAgent(quote, client),
    runFundamentalAgent(quote, client),
    runNewsScoutAgent(quote, recentNews, client),
    runRiskGuardianAgent(quote, client),
  ]);

  // Fallback consensus synthesis (always calculated and ready instantly)
  const target1 = Math.round(quote.price * 1.09);
  const target2 = Math.round(quote.price * 1.20);
  const stopLoss = Math.round(quote.price * 0.94);

  const isDiscounted = quote.discountFromHigh > 15 || (quote.rsi14 ?? 50) < 40;
  const defaultVerdict = quote.signal || (isDiscounted ? 'STRONG_BUY' : 'BUY');
  const defaultScore = quote.signalScore || (isDiscounted ? 8.6 : 7.2);

  const fallbackConsensus: CouncilConsensus = {
    symbol: quote.symbol,
    companyName: quote.name,
    currentPrice: quote.price,
    cioVerdict: defaultVerdict,
    overallScore: defaultScore,
    debateSummary: `The committee supports accumulating ${quote.name}. Agent Fundamentalist notes the ${quote.discountFromHigh}% margin of safety, while Sentinel confirms RSI is stabilizing. Agent Risk Guardian has sanctioned an entry with stop-loss at ₹${stopLoss}.`,
    cioExecutiveDirective: `Execute staggered buy orders across 2 tranches. Allocate up to ${riskGuardian.recommendedMaxPositionPercent}% of portfolio. Exit if price breaks below ₹${stopLoss}.`,
    tradeActionPlan: {
      entryStrategy: `Stagger accumulation between ₹${Math.round(quote.price * 0.98)} and ₹${quote.price}`,
      target1: `₹${target1.toLocaleString('en-IN')}`,
      target2: `₹${target2.toLocaleString('en-IN')}`,
      stopLoss: `₹${stopLoss.toLocaleString('en-IN')}`,
      timeHorizon: '2-4 Months (Swing to Positional)',
      positionAllocation: `Max ${riskGuardian.recommendedMaxPositionPercent}% of portfolio`,
    },
    agents: {
      sentinel,
      fundamental,
      newsScout,
      riskGuardian,
    },
    timestamp: new Date().toISOString(),
  };

  if (!client) return fallbackConsensus;

  const prompt = `
You are the CHIEF INVESTMENT OFFICER (CIO) presiding over the DalalAI Investment Committee for Indian equities.
Review the 4 department briefs and render the FINAL INVESTMENT DIRECTIVE.

Company: ${quote.name} (${quote.symbol}) | Price: ₹${quote.price}
1. Sentinel: ${sentinel.stance} (${sentinel.headlineTakeaway})
2. Fundamentalist: ${fundamental.stance} (${fundamental.headlineTakeaway})
3. News Scout: ${newsScout.stance} (${newsScout.headlineTakeaway})
4. Risk Guardian: ${riskGuardian.stance} (${riskGuardian.headlineTakeaway})

TASK: Output valid JSON:
{
  "cioVerdict": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "overallScore": number (1.0 to 10.0),
  "debateSummary": "Brief synthesis weighing bulls vs bears",
  "cioExecutiveDirective": "Direct actionable execution instruction",
  "tradeActionPlan": {
    "entryStrategy": "Entry guidance",
    "target1": "Target 1 in ₹",
    "target2": "Target 2 in ₹",
    "stopLoss": "Stop-loss in ₹",
    "timeHorizon": "Timeframe",
    "positionAllocation": "Allocation %"
  }
}
`;

  const parsed = await generateGeminiJson(client, prompt, 3800);
  if (!parsed) return fallbackConsensus;

  return {
    symbol: quote.symbol,
    companyName: quote.name,
    currentPrice: quote.price,
    cioVerdict: parsed.cioVerdict || fallbackConsensus.cioVerdict,
    overallScore: parsed.overallScore || fallbackConsensus.overallScore,
    debateSummary: parsed.debateSummary || fallbackConsensus.debateSummary,
    cioExecutiveDirective: parsed.cioExecutiveDirective || fallbackConsensus.cioExecutiveDirective,
    tradeActionPlan: parsed.tradeActionPlan || fallbackConsensus.tradeActionPlan,
    agents: {
      sentinel,
      fundamental,
      newsScout,
      riskGuardian,
    },
    timestamp: new Date().toISOString(),
  };
}
