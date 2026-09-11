import { z } from 'zod';

export const AgentStanceSchema = z.enum([
  'Strong Bullish',
  'Bullish',
  'Neutral',
  'Bearish',
  'Strong Bearish',
]);

export const BaseAgentReportSchema = z.object({
  agentName: z.string(),
  role: z.enum(['SENTINEL', 'FUNDAMENTAL', 'NEWS_SCOUT', 'RISK_GUARDIAN', 'CIO']),
  stance: AgentStanceSchema,
  confidenceScore: z.number().min(0).max(100),
  headlineTakeaway: z.string().min(3),
  arguments: z.array(z.string()).min(1),
  isFallback: z.boolean().optional(),
  fallbackReason: z.string().optional(),
});

export const KeyLevelsSchema = z.object({
  immediateSupport: z.string(),
  majorSupport: z.string(),
  immediateResistance: z.string(),
  majorBreakout: z.string(),
});

export const SentinelReportSchema = BaseAgentReportSchema.extend({
  role: z.literal('SENTINEL'),
  keyLevels: KeyLevelsSchema,
  trendAssessment: z.string(),
});

export const FundamentalReportSchema = BaseAgentReportSchema.extend({
  role: z.literal('FUNDAMENTAL'),
  valuationStatus: z.enum(['Deeply Undervalued', 'Fair Value', 'Stretched Valuation', 'Overvalued']),
  estimatedMarginOfSafetyPercent: z.number(),
  balanceSheetHealth: z.enum(['Robust', 'Moderate', 'Vulnerable']),
});

export const NewsScoutReportSchema = BaseAgentReportSchema.extend({
  role: z.literal('NEWS_SCOUT'),
  sentimentPolarity: z.number().min(-1).max(1),
  catalystsIdentified: z.array(z.string()),
  headwindWarnings: z.array(z.string()),
});

export const RiskGuardianReportSchema = BaseAgentReportSchema.extend({
  role: z.literal('RISK_GUARDIAN'),
  riskRating: z.enum(['Low Risk', 'Moderate Risk', 'High Risk', 'Extreme Risk']),
  recommendedMaxPositionPercent: z.number().min(1).max(25),
  mandatedStopLoss: z.string(),
  riskRewardAssessment: z.string(),
});

export const TradeActionPlanSchema = z.object({
  entryStrategy: z.string(),
  target1: z.string(),
  target2: z.string(),
  stopLoss: z.string(),
  timeHorizon: z.string(),
  positionAllocation: z.string(),
});

export const CIOConsensusSchema = z.object({
  cioVerdict: z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']),
  overallScore: z.number().min(1).max(10),
  debateSummary: z.string().min(5),
  cioExecutiveDirective: z.string().min(5),
  tradeActionPlan: TradeActionPlanSchema,
});

export type SentinelSchemaType = z.infer<typeof SentinelReportSchema>;
export type FundamentalSchemaType = z.infer<typeof FundamentalReportSchema>;
export type NewsScoutSchemaType = z.infer<typeof NewsScoutReportSchema>;
export type RiskGuardianSchemaType = z.infer<typeof RiskGuardianReportSchema>;
export type CIOConsensusSchemaType = z.infer<typeof CIOConsensusSchema>;
