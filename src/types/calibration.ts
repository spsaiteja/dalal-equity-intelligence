import { ConvictionType } from './stock';

export type DeliberationOutcome = 'PROFITABLE' | 'NEUTRAL' | 'ADVERSE' | 'PENDING';

export interface DeliberationEvaluation {
  runId: string;
  symbol: string;
  recommendationDate: string;
  originalPrice: number;
  currentPrice: number;
  cioVerdict: ConvictionType;
  priceChangePercent: number;
  target1Price?: number;
  stopLossPrice?: number;
  target1Hit: boolean;
  stopLossHit: boolean;
  outcome: DeliberationOutcome;
  holdingPeriodDays: number;
  entryStrategy?: string;
  target1Str?: string;
  stopLossStr?: string;
}

export interface CouncilCalibrationMetrics {
  totalEvaluatedRuns: number;
  profitableRuns: number;
  adverseRuns: number;
  neutralRuns: number;
  directionalWinRatePercent: number;
  target1HitRatePercent: number;
  stopLossHitRatePercent: number;
  averageReturnPercent: number;
  profitFactor: number;
  brierAccuracyScore: number; // 0.0 to 1.0 (mean squared error of probabilistic conviction vs binary success)
  verdictWinRates: Record<string, { total: number; profitable: number; winRatePercent: number }>;
}

export interface SymbolTrackRecord {
  symbol: string;
  metrics: CouncilCalibrationMetrics;
  evaluations: DeliberationEvaluation[];
}
