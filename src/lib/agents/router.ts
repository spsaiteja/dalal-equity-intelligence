import { StockQuote } from '@/types/stock';
import {
  CouncilExecutionMode,
  StockMarketProfile,
  DispatchedAgent,
  RoutingDecision,
} from '@/types/routing';
import {
  SentinelReport,
  FundamentalReport,
  NewsScoutReport,
  RiskGuardianReport,
} from '@/types/agent';

/**
 * Classifies an asset into an institutional market profile based on technicals, valuation, and news volume.
 */
export function classifyStockProfile(
  quote: StockQuote,
  newsCount: number = 0
): StockMarketProfile {
  const rsi = quote.rsi14 ?? 50;
  const price = quote.price ?? (quote as any).regularMarketPrice ?? 0;
  const high52 = quote.fiftyTwoWeekHigh ?? 0;
  const discount = typeof quote.discountFromHigh === 'number'
    ? quote.discountFromHigh
    : (high52 > 0 && price > 0 ? ((high52 - price) / high52) * 100 : 0);
  const pe = quote.peRatio ?? (quote as any).trailingPE;
  const dayHigh = quote.dayHigh ?? (quote as any).high ?? (quote as any).regularMarketDayHigh;
  const dayLow = quote.dayLow ?? (quote as any).low ?? (quote as any).regularMarketDayLow;
  const changePct = quote.changePercent ?? (quote as any).regularMarketChangePercent ?? 0;

  // 1. Event / Catalyst Driven (High News Activity or Earnings Catalyst)
  if (newsCount >= 5) {
    return 'EARNINGS_CATALYST';
  }

  // 2. Momentum Breakout (Strong RSI / Near Highs / High Volume)
  if (rsi >= 64 || (quote.signal === 'STRONG_BUY' && discount < 8) || changePct >= 5) {
    return 'MOMENTUM_BREAKOUT';
  }

  // 3. Deep Value / Rebound Opportunity (Steep Discount from 52-Week High or low P/E)
  if (discount >= 20 || rsi <= 38 || (typeof pe === 'number' && pe < 12)) {
    return 'DEEP_VALUE';
  }

  // 4. High Volatility (Wide Daily Range / Extreme Beta)
  if (dayHigh && dayLow && price > 0) {
    const dailySpreadPercent = ((dayHigh - dayLow) / price) * 100;
    if (dailySpreadPercent > 4.5) {
      return 'HIGH_VOLATILITY';
    }
  }

  // 5. Default Balanced Profile
  return 'BALANCED';
}

/**
 * Determines the dynamic agent routing strategy and active/dormant department distribution.
 */
export function determineExecutionRouting(
  mode: CouncilExecutionMode = 'FULL_COUNCIL',
  quote: StockQuote,
  newsCount: number = 0
): RoutingDecision {
  const profile = classifyStockProfile(quote, newsCount);

  // If AUTO_ROUTER, select the optimal mode based on stock profile
  let resolvedMode: 'FULL_COUNCIL' | 'TECHNICAL_SWING' | 'VALUE_INVESTOR' | 'EVENT_DRIVEN';

  if (mode === 'AUTO_ROUTER') {
    switch (profile) {
      case 'MOMENTUM_BREAKOUT':
      case 'HIGH_VOLATILITY':
        resolvedMode = 'TECHNICAL_SWING';
        break;
      case 'DEEP_VALUE':
        resolvedMode = 'VALUE_INVESTOR';
        break;
      case 'EARNINGS_CATALYST':
        resolvedMode = 'EVENT_DRIVEN';
        break;
      case 'BALANCED':
      default:
        resolvedMode = 'FULL_COUNCIL';
        break;
    }
  } else {
    resolvedMode = mode;
  }

  switch (resolvedMode) {
    case 'TECHNICAL_SWING':
      return {
        mode,
        resolvedMode,
        profile,
        activeAgents: ['sentinel', 'riskGuardian'],
        dormantAgents: ['fundamental', 'newsScout'],
        rationale:
          'Technical Swing mode prioritized: Sentinel chart levels & Risk Guardian drawdown buffers dispatched. Latency reduced by ~50%.',
        estimatedLatencySavingsPercent: 50,
      };

    case 'VALUE_INVESTOR':
      return {
        mode,
        resolvedMode,
        profile,
        activeAgents: ['fundamental', 'riskGuardian'],
        dormantAgents: ['sentinel', 'newsScout'],
        rationale:
          'Value Investor mode prioritized: Fundamentalist balance-sheet forensic & Risk Guardian position sizing dispatched. Latency reduced by ~50%.',
        estimatedLatencySavingsPercent: 50,
      };

    case 'EVENT_DRIVEN':
      return {
        mode,
        resolvedMode,
        profile,
        activeAgents: ['newsScout', 'sentinel'],
        dormantAgents: ['fundamental', 'riskGuardian'],
        rationale:
          'Event-Driven mode prioritized: News Scout sentiment tracking & Sentinel breakout volume confirmation dispatched. Latency reduced by ~45%.',
        estimatedLatencySavingsPercent: 45,
      };

    case 'FULL_COUNCIL':
    default:
      return {
        mode,
        resolvedMode: 'FULL_COUNCIL',
        profile,
        activeAgents: ['sentinel', 'fundamental', 'newsScout', 'riskGuardian'],
        dormantAgents: [],
        rationale:
          'Full Council mode: All 4 department heads dispatched concurrently for exhaustive institutional deliberation.',
        estimatedLatencySavingsPercent: 0,
      };
  }
}

/**
 * Generates an informative placeholder report for agents kept dormant under selective routing.
 */
export function getDormantAgentReport(
  agent: DispatchedAgent,
  quote: StockQuote | string,
  routingMode: string
): any {
  const sym = (typeof quote === 'string' ? quote : quote?.symbol || 'EQUITY').toUpperCase();
  const price = typeof quote === 'object' && typeof quote?.price === 'number' ? quote.price : 1000;
  const discount = typeof quote === 'object' && typeof quote?.discountFromHigh === 'number' ? quote.discountFromHigh : 10;

  switch (agent) {
    case 'sentinel':
      return {
        agentName: 'Sentinel',
        role: 'SENTINEL',
        stance: 'Neutral',
        confidenceScore: 50,
        headlineTakeaway: `Sentinel placed on standby under ${routingMode} routing mode. Technical tracking remains available on demand.`,
        arguments: [
          `Dynamic routing kept Sentinel dormant to optimize query latency for ${sym}.`,
          `Current trading price: ₹${price.toLocaleString('en-IN')}.`,
        ],
        keyLevels: {
          immediateSupport: `₹${Math.round(price * 0.97).toLocaleString('en-IN')}`,
          majorSupport: `₹${Math.round(price * 0.94).toLocaleString('en-IN')}`,
          immediateResistance: `₹${Math.round(price * 1.03).toLocaleString('en-IN')}`,
          majorBreakout: `₹${Math.round(price * 1.07).toLocaleString('en-IN')}`,
        },
        trendAssessment: 'Neutral consolidation within range; dormant under selective routing.',
        isFallback: false,
      } as SentinelReport;

    case 'fundamental':
      return {
        agentName: 'The Fundamentalist',
        role: 'FUNDAMENTAL',
        stance: 'Neutral',
        confidenceScore: 50,
        headlineTakeaway: `The Fundamentalist placed on standby under ${routingMode} routing mode.`,
        arguments: [
          `Dynamic router bypassed forensic balance-sheet audit to accelerate execution.`,
          `Valuation baseline: ${discount}% discount from 52-week high.`,
        ],
        valuationStatus: 'Fair Value',
        estimatedMarginOfSafetyPercent: Math.max(0, Math.round(discount / 2)),
        balanceSheetHealth: 'Moderate',
        isFallback: false,
      } as FundamentalReport;

    case 'newsScout':
      return {
        agentName: 'News Scout',
        role: 'NEWS_SCOUT',
        stance: 'Neutral',
        confidenceScore: 50,
        headlineTakeaway: `News Scout placed on standby under ${routingMode} routing mode.`,
        arguments: [
          `Real-time headline monitoring skipped for speed optimization on ${sym}.`,
          `Prior baseline sentiment remains Neutral.`,
        ],
        sentimentPolarity: 0.0,
        catalystsIdentified: ['Standby mode active'],
        headwindWarnings: ['Macro news not scanned in this run'],
        isFallback: false,
      } as NewsScoutReport;

    case 'riskGuardian':
      return {
        agentName: 'Risk Guardian',
        role: 'RISK_GUARDIAN',
        stance: 'Neutral',
        confidenceScore: 70,
        headlineTakeaway: `Risk Guardian standardized baseline applied under ${routingMode} routing mode.`,
        arguments: [
          `Default risk protocol: 4% portfolio allocation cap recommended.`,
          `Standard stop-loss pegged at ₹${Math.round(price * 0.94).toLocaleString('en-IN')}.`,
        ],
        riskRating: 'Moderate Risk',
        recommendedMaxPositionPercent: 4,
        mandatedStopLoss: `₹${Math.round(price * 0.94).toLocaleString('en-IN')}`,
        riskRewardAssessment: 'Standard 1:2 risk-to-reward baseline under dormant standby mode.',
        isFallback: false,
      } as RiskGuardianReport;
  }
}
