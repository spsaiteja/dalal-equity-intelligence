export type CouncilExecutionMode =
  | 'FULL_COUNCIL'
  | 'TECHNICAL_SWING'
  | 'VALUE_INVESTOR'
  | 'EVENT_DRIVEN'
  | 'AUTO_ROUTER';

export type StockMarketProfile =
  | 'MOMENTUM_BREAKOUT'
  | 'DEEP_VALUE'
  | 'EARNINGS_CATALYST'
  | 'HIGH_VOLATILITY'
  | 'BALANCED';

export type DispatchedAgent = 'sentinel' | 'fundamental' | 'newsScout' | 'riskGuardian';

export interface RoutingDecision {
  mode: CouncilExecutionMode;
  resolvedMode: 'FULL_COUNCIL' | 'TECHNICAL_SWING' | 'VALUE_INVESTOR' | 'EVENT_DRIVEN';
  profile: StockMarketProfile;
  activeAgents: DispatchedAgent[];
  dormantAgents: DispatchedAgent[];
  rationale: string;
  estimatedLatencySavingsPercent: number;
}

