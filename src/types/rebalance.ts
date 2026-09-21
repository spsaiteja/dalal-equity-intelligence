/**
 * Phase 14: Portfolio Health & Automated Rebalancing Agent Types
 * Institutional-grade risk metrics, HHI diversification, sector caps, and automated trade sizing.
 */

export interface PortfolioHoldingInput {
  symbol: string;
  companyName: string;
  quantity: number;
  avgPrice: number;
  lastPrice: number;
  currentValue: number;
  investedValue: number;
  pnl: number;
  pnlPercent: number;
  sector: string;
}

export interface SectorExposure {
  sector: string;
  currentValue: number;
  percentage: number;
  maxCapPercent: number;
  isOverweight: boolean;
  excessPercent: number;
}

export interface StockExposure {
  symbol: string;
  companyName: string;
  currentValue: number;
  percentage: number;
  maxCapPercent: number;
  isOverweight: boolean;
  excessPercent: number;
}

export interface PortfolioViolation {
  rule: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  currentValue: string;
  limit: string;
}

export interface PortfolioHealthMetrics {
  healthScore: number; // 0 - 100
  grade: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  hhiIndex: number; // 0 - 10,000 (Herfindahl-Hirschman Index)
  diversificationScore: number; // 0 - 100
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  sectorExposures: SectorExposure[];
  stockExposures: StockExposure[];
  topSectorRisk: string;
  topStockRisk: string;
  maxDrawdownRisk: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  violations: PortfolioViolation[];
}

export type RebalanceActionType = 'TRIM' | 'ACCUMULATE' | 'HOLD' | 'EXIT';
export type RebalanceUrgency = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RebalanceAction {
  symbol: string;
  companyName: string;
  action: RebalanceActionType;
  currentShares: number;
  targetShares: number;
  deltaShares: number; // Negative = sell/trim, Positive = buy
  currentPrice: number;
  currentWeightPercent: number;
  targetWeightPercent: number;
  capitalDeltaINR: number; // Negative = cash freed, Positive = cash deployed
  urgency: RebalanceUrgency;
  rationale: string;
}

export interface RebalancePlan {
  timestamp: string;
  totalCapital: number;
  currentHealth: PortfolioHealthMetrics;
  projectedHealth: {
    projectedScore: number;
    projectedGrade: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
    projectedHhi: number;
    freedCapitalINR: number;
    reallocatedCapitalINR: number;
    netCashDeltaINR: number;
  };
  actions: RebalanceAction[];
  executiveSummary: string;
  sebiDisclaimer: string;
}

export interface RebalancePolicy {
  maxSectorWeightPercent: number; // Default: 25%
  maxStockWeightPercent: number;  // Default: 12%
  minHoldingWeightPercent: number; // Default: 2%
  targetCashBufferPercent: number; // Default: 5%
  pnlProfitTakePercent: number;    // Default: 25%
  pnlStopLossPercent: number;      // Default: -12%
}
