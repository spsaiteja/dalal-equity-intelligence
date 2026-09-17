export type ApprovalDecision = 'APPROVED_AS_IS' | 'MODIFIED_BY_HUMAN' | 'VETOED_BY_HUMAN';

export interface TradePlanParameters {
  target1: string;
  target2: string;
  stopLoss: string;
  positionAllocation: string;
  verdict?: string;
}

export interface HumanOverridePayload {
  runId?: string;
  symbol: string;
  originalPlan: TradePlanParameters;
  humanPlan: TradePlanParameters;
  decision: ApprovalDecision;
  overrideReason?: string;
  operatorNotes?: string;
  timestamp?: string;
}

export interface ApprovalRecord extends HumanOverridePayload {
  approvalId: string;
  timestamp: string;
  isModified: boolean;
}
