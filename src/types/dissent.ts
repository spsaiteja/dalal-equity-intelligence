export type NormalizedStance = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type ConsensusStrength =
  | 'UNANIMOUS'
  | 'STRONG_CONCURRENCE'
  | 'MODERATE_SPLIT'
  | 'SHARP_DISSENT';

export interface DissenterDetail {
  agentRole: 'SENTINEL' | 'FUNDAMENTALIST' | 'NEWS_SCOUT' | 'RISK_GUARDIAN';
  agentName: string;
  stance: NormalizedStance;
  rawStance: string;
  counterThesis: string;
  severity: 'low' | 'moderate' | 'high';
}

export interface ConsensusBreakdown {
  totalAgents: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  agreementIndexPercent: number; // 0 to 100
  consensusStrength: ConsensusStrength;
}

export interface ConsensusDissentAnalysis {
  breakdown: ConsensusBreakdown;
  dissenters: DissenterDetail[];
  primaryDissenter: DissenterDetail | null;
  primaryCounterThesis: string | null;
  polarizationScore: number; // 0 (full consensus) to 1.0 (extreme polarization)
  hasDissent: boolean;
}

