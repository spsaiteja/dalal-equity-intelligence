import { ConvictionType } from './stock';

export type AgentRole = 'SENTINEL' | 'FUNDAMENTAL' | 'NEWS_SCOUT' | 'RISK_GUARDIAN' | 'CIO';
export type AgentStance = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';

export interface BaseAgentReport {
  agentName: string;
  role: AgentRole;
  stance: AgentStance;
  confidenceScore: number; // 0 to 100%
  headlineTakeaway: string;
  arguments: string[];
}

export interface SentinelReport extends BaseAgentReport {
  role: 'SENTINEL';
  keyLevels: {
    immediateSupport: string;
    majorSupport: string;
    immediateResistance: string;
    majorBreakout: string;
  };
  trendAssessment: string;
}

export interface FundamentalReport extends BaseAgentReport {
  role: 'FUNDAMENTAL';
  valuationStatus: 'Deeply Undervalued' | 'Fair Value' | 'Stretched Valuation' | 'Overvalued';
  estimatedMarginOfSafetyPercent: number;
  balanceSheetHealth: 'Robust' | 'Moderate' | 'Vulnerable';
}

export interface NewsScoutReport extends BaseAgentReport {
  role: 'NEWS_SCOUT';
  sentimentPolarity: number; // -1.0 (very negative) to +1.0 (very positive)
  catalystsIdentified: string[];
  headwindWarnings: string[];
}

export interface RiskGuardianReport extends BaseAgentReport {
  role: 'RISK_GUARDIAN';
  riskRating: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Extreme Risk';
  recommendedMaxPositionPercent: number; // e.g. 5% of portfolio
  mandatedStopLoss: string;
  riskRewardAssessment: string;
}

export interface CouncilConsensus {
  symbol: string;
  companyName: string;
  currentPrice: number;
  cioVerdict: ConvictionType;
  overallScore: number; // 1 to 10
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
  agents: {
    sentinel: SentinelReport;
    fundamental: FundamentalReport;
    newsScout: NewsScoutReport;
    riskGuardian: RiskGuardianReport;
  };
  timestamp: string;
  metadata?: OrchestrationMetadata;
}

export type AgentExecutionStatus = 'success' | 'fallback' | 'failed';

export interface OrchestrationMetadata {
  runId: string;
  executionTimeMs: number;
  timestamp: string;
  agentsStatus: {
    sentinel: AgentExecutionStatus;
    fundamental: AgentExecutionStatus;
    newsScout: AgentExecutionStatus;
    riskGuardian: AgentExecutionStatus;
    cio: AgentExecutionStatus;
  };
  model: string;
  promptVersion: string;
  disclaimer: string;
}

