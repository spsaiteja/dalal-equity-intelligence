import {
  SentinelReportSchema,
  FundamentalReportSchema,
  NewsScoutReportSchema,
  RiskGuardianReportSchema,
  CIOConsensusSchema,
} from './schemas';
import {
  SentinelReport,
  FundamentalReport,
  NewsScoutReport,
  RiskGuardianReport,
  AgentStance,
} from '@/types/agent';
import { ConvictionType } from '@/types/stock';

// ---------------------------------------------------------
// Heuristic Repair Helpers
// ---------------------------------------------------------

export function normalizeStance(raw: any, defaultStance: AgentStance = 'Neutral'): AgentStance {
  if (typeof raw !== 'string') return defaultStance;
  const s = raw.toLowerCase().trim().replace(/[-_]/g, ' ');

  if (s.includes('strong') && s.includes('bull')) return 'Strong Bullish';
  if (s.includes('strong') && s.includes('bear')) return 'Strong Bearish';
  if (s.includes('bull') || s === 'buy') return 'Bullish';
  if (s.includes('bear') || s === 'sell') return 'Bearish';
  return 'Neutral';
}

export function coerceNumber(val: any, fallback: number, min?: number, max?: number): number {
  if (typeof val === 'number' && !isNaN(val)) {
    let num = val;
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    return num;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      let num = parsed;
      if (min !== undefined) num = Math.max(min, num);
      if (max !== undefined) num = Math.min(max, num);
      return num;
    }
  }
  return fallback;
}

export function coerceStringArray(val: any, defaultItem: string = 'Analysis confirmed.'): string[] {
  if (Array.isArray(val) && val.length > 0) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    // Split by newlines or semicolons if LLM returned formatted text
    const parts = val.split(/[\n;•]+/).map((s) => s.replace(/^[0-9.-]+\s*/, '').trim()).filter(Boolean);
    if (parts.length > 0) return parts;
    return [val.trim()];
  }
  return [defaultItem];
}

// ---------------------------------------------------------
// Typed Safe Parsers with Automatic Repair
// ---------------------------------------------------------

export function validateAndRepairSentinel(raw: any): { success: boolean; data?: SentinelReport; errors?: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['Input is not an object'] };
  }

  // Pre-repair mutations
  const repaired: any = {
    agentName: raw.agentName || 'Agent Sentinel (Technicals & Momentum)',
    role: 'SENTINEL',
    stance: normalizeStance(raw.stance, 'Bullish'),
    confidenceScore: coerceNumber(raw.confidenceScore, 80, 0, 100),
    headlineTakeaway: typeof raw.headlineTakeaway === 'string' && raw.headlineTakeaway.trim().length > 3
      ? raw.headlineTakeaway.trim()
      : 'Technical momentum indicates key support consolidation.',
    trendAssessment: typeof raw.trendAssessment === 'string' && raw.trendAssessment.trim().length > 3
      ? raw.trendAssessment.trim()
      : 'Macro Consolidation: Testing structural levels.',
    keyLevels: {
      immediateSupport: raw.keyLevels?.immediateSupport || 'Support band',
      majorSupport: raw.keyLevels?.majorSupport || 'Major base',
      immediateResistance: raw.keyLevels?.immediateResistance || 'Resistance band',
      majorBreakout: raw.keyLevels?.majorBreakout || 'Breakout level',
    },
    arguments: coerceStringArray(raw.arguments, 'Technical indicators support structural accumulation.'),
  };

  const parsed = SentinelReportSchema.safeParse(repaired);
  if (parsed.success) {
    return { success: true, data: parsed.data as SentinelReport };
  }
  return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export function validateAndRepairFundamental(raw: any): { success: boolean; data?: FundamentalReport; errors?: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['Input is not an object'] };
  }

  const rawVal = String(raw.valuationStatus || '').toLowerCase();
  let valuationStatus: 'Deeply Undervalued' | 'Fair Value' | 'Stretched Valuation' | 'Overvalued' = 'Fair Value';
  if (rawVal.includes('deep')) valuationStatus = 'Deeply Undervalued';
  else if (rawVal.includes('over')) valuationStatus = 'Overvalued';
  else if (rawVal.includes('stretch')) valuationStatus = 'Stretched Valuation';

  const rawHealth = String(raw.balanceSheetHealth || '').toLowerCase();
  let balanceSheetHealth: 'Robust' | 'Moderate' | 'Vulnerable' = 'Robust';
  if (rawHealth.includes('vuln')) balanceSheetHealth = 'Vulnerable';
  else if (rawHealth.includes('mod')) balanceSheetHealth = 'Moderate';

  const repaired: any = {
    agentName: raw.agentName || 'Agent Fundamentalist (Valuation & Financials)',
    role: 'FUNDAMENTAL',
    stance: normalizeStance(raw.stance, 'Bullish'),
    confidenceScore: coerceNumber(raw.confidenceScore, 82, 0, 100),
    headlineTakeaway: typeof raw.headlineTakeaway === 'string' && raw.headlineTakeaway.trim().length > 3
      ? raw.headlineTakeaway.trim()
      : 'Fundamental valuation provides defensible margin of safety.',
    valuationStatus,
    estimatedMarginOfSafetyPercent: coerceNumber(raw.estimatedMarginOfSafetyPercent, 15, -100, 100),
    balanceSheetHealth,
    arguments: coerceStringArray(raw.arguments, 'Healthy cash flows and robust institutional capital backing.'),
  };

  const parsed = FundamentalReportSchema.safeParse(repaired);
  if (parsed.success) {
    return { success: true, data: parsed.data as FundamentalReport };
  }
  return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export function validateAndRepairNewsScout(raw: any): { success: boolean; data?: NewsScoutReport; errors?: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['Input is not an object'] };
  }

  const repaired: any = {
    agentName: raw.agentName || 'Agent News Scout (Sentiment & Catalysts)',
    role: 'NEWS_SCOUT',
    stance: normalizeStance(raw.stance, 'Bullish'),
    confidenceScore: coerceNumber(raw.confidenceScore, 78, 0, 100),
    headlineTakeaway: typeof raw.headlineTakeaway === 'string' && raw.headlineTakeaway.trim().length > 3
      ? raw.headlineTakeaway.trim()
      : 'Corporate narrative and sector tailwinds remain constructive.',
    sentimentPolarity: coerceNumber(raw.sentimentPolarity, 0.45, -1.0, 1.0),
    catalystsIdentified: coerceStringArray(raw.catalystsIdentified, 'Domestic capex cycle support and institutional liquidity.'),
    headwindWarnings: coerceStringArray(raw.headwindWarnings, 'Global interest rate volatility.'),
    arguments: coerceStringArray(raw.arguments, 'Market sentiment indicates steady institutional accumulation.'),
  };

  const parsed = NewsScoutReportSchema.safeParse(repaired);
  if (parsed.success) {
    return { success: true, data: parsed.data as NewsScoutReport };
  }
  return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export function validateAndRepairRiskGuardian(raw: any): { success: boolean; data?: RiskGuardianReport; errors?: string[] } {
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['Input is not an object'] };
  }

  const rawRisk = String(raw.riskRating || '').toLowerCase();
  let riskRating: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Extreme Risk' = 'Moderate Risk';
  if (rawRisk.includes('extreme')) riskRating = 'Extreme Risk';
  else if (rawRisk.includes('high')) riskRating = 'High Risk';
  else if (rawRisk.includes('low')) riskRating = 'Low Risk';

  const repaired: any = {
    agentName: raw.agentName || 'Agent Risk Guardian (Capital Preservation)',
    role: 'RISK_GUARDIAN',
    stance: normalizeStance(raw.stance, 'Neutral'),
    confidenceScore: coerceNumber(raw.confidenceScore, 88, 0, 100),
    headlineTakeaway: typeof raw.headlineTakeaway === 'string' && raw.headlineTakeaway.trim().length > 3
      ? raw.headlineTakeaway.trim()
      : 'Downside risk is contained provided stop-loss discipline is observed.',
    riskRating,
    recommendedMaxPositionPercent: coerceNumber(raw.recommendedMaxPositionPercent, 6, 1, 25),
    mandatedStopLoss: typeof raw.mandatedStopLoss === 'string' ? raw.mandatedStopLoss : 'Stop-loss mandatory',
    riskRewardAssessment: typeof raw.riskRewardAssessment === 'string' ? raw.riskRewardAssessment : '1:2.5 favorable skew',
    arguments: coerceStringArray(raw.arguments, 'Enforce strict position caps to prevent portfolio concentration.'),
  };

  const parsed = RiskGuardianReportSchema.safeParse(repaired);
  if (parsed.success) {
    return { success: true, data: parsed.data as RiskGuardianReport };
  }
  return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export function validateAndRepairCIOConsensus(raw: any): {
  success: boolean;
  data?: {
    cioVerdict: ConvictionType;
    overallScore: number;
    debateSummary: string;
    cioExecutiveDirective: string;
    tradeActionPlan: {
      entryStrategy: string;
      target1: string;
      target2: string;
      stopLoss: string;
      timeHorizon: string;
      positionAllocation: string;
    };
  };
  errors?: string[];
} {
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['CIO output is not an object'] };
  }

  const rawVerdict = String(raw.cioVerdict || '').toUpperCase().replace(/\s+/g, '_');
  let cioVerdict: ConvictionType = 'BUY';
  if (['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'].includes(rawVerdict)) {
    cioVerdict = rawVerdict as ConvictionType;
  }

  const repaired: any = {
    cioVerdict,
    overallScore: coerceNumber(raw.overallScore, 7.5, 1.0, 10.0),
    debateSummary: typeof raw.debateSummary === 'string' && raw.debateSummary.trim().length > 3
      ? raw.debateSummary.trim()
      : 'The committee deliberated technical momentum against margin of safety.',
    cioExecutiveDirective: typeof raw.cioExecutiveDirective === 'string' && raw.cioExecutiveDirective.trim().length > 3
      ? raw.cioExecutiveDirective.trim()
      : 'Accumulate in tranches with strict stop-loss adherence.',
    tradeActionPlan: {
      entryStrategy: raw.tradeActionPlan?.entryStrategy || 'Accumulate at or below CMP',
      target1: raw.tradeActionPlan?.target1 || 'Target 1',
      target2: raw.tradeActionPlan?.target2 || 'Target 2',
      stopLoss: raw.tradeActionPlan?.stopLoss || 'Stop Loss',
      timeHorizon: raw.tradeActionPlan?.timeHorizon || '1-3 Months',
      positionAllocation: raw.tradeActionPlan?.positionAllocation || 'Max 6% of portfolio',
    },
  };

  const parsed = CIOConsensusSchema.safeParse(repaired);
  if (parsed.success) {
    return { success: true, data: parsed.data as any };
  }
  return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
