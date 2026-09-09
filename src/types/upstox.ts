export type HoldingSignal = 'BUY_MORE' | 'BOOK_PROFIT' | 'STOP_LOSS' | 'HOLD';

export interface PortfolioAlert {
  id: string;
  symbol: string;
  company_name: string;
  type: 'BUY_MORE' | 'BOOK_PROFIT' | 'STOP_LOSS' | 'CONCENTRATION_WARNING';
  severity: 'urgent' | 'warning' | 'opportunity';
  title: string;
  message: string;
  suggestedAction: string;
  metric: string;
  currentPrice: number;
  averagePrice: number;
  targetPrice?: number;
  stopLossPrice?: number;
  holdingSignal: HoldingSignal;
}

export interface UpstoxHolding {
  isin: string;
  trading_symbol: string;
  company_name: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  pnl_percentage: number;
  day_change: number;
  day_change_percentage: number;
  invested_value: number;
  current_value: number;
  sector?: string;
  exchange: 'NSE' | 'BSE';
  holdingSignal?: HoldingSignal;
  signalReason?: string;
  targetPrice?: number;
  stopLossPrice?: number;
}

export interface UpstoxPosition {
  trading_symbol: string;
  product: 'I' | 'D' | 'CO' | 'OCO'; // Intraday, Delivery, etc.
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_buy_quantity: number;
  day_sell_quantity: number;
}

export interface UpstoxSession {
  access_token: string;
  user_id: string;
  user_name: string;
  email?: string;
  broker: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
  day_pnl: number;
  day_pnl_percentage: number;
  holdings_count: number;
  is_demo_mode: boolean;
}

export interface RebalanceAction {
  symbol: string;
  company_name: string;
  action: 'STRONG_ACCUMULATE' | 'ACCUMULATE' | 'HOLD' | 'BOOK_PROFIT' | 'EXIT_STOP_LOSS';
  allocationWeightPercent: number;
  recommendedActionNote: string;
  targetPrice?: string;
  stopLoss?: string;
}

export interface SectorWeight {
  sector: string;
  percentage: number;
  investedAmount: number;
  riskRating: 'Balanced' | 'Overweight' | 'Underweight';
}

export interface PortfolioAuditReport {
  overallHealthScore: number; // 1.0 to 10.0
  healthStatus: 'Institutional Grade' | 'Balanced & Resilient' | 'Moderate Concentration Risk' | 'High Risk / Unbalanced';
  cioExecutiveSummary: string;
  sectorWeights: SectorWeight[];
  rebalancingPlan: RebalanceAction[];
  agentAudits: {
    sentinel: {
      stance: string;
      technicalAlert: string;
      breakdownRisks: string[];
    };
    fundamental: {
      valuationAssessment: string;
      portfolioPeEstimate: string;
      undervaluedOpportunities: string[];
      stretchedHoldings: string[];
    };
    newsScout: {
      headlineSentiment: string;
      catalystsIdentified: string[];
      headwindAlerts: string[];
    };
    riskGuardian: {
      diversificationScore: number;
      maxSingleStockExposurePercent: number;
      topRiskHolding: string;
      mandatedRiskAdjustments: string[];
    };
  };
  timestamp: string;
}

export interface OrderPlacementRequest {
  symbol: string;
  companyName: string;
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  transactionType: 'BUY' | 'SELL';
  productType: 'D' | 'I'; // D = Delivery (CNC), I = Intraday (MIS)
  price: number;
  triggerPrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  isAmo?: boolean;
  isPaperTrade?: boolean;
}

export interface OrderPlacementResponse {
  success: boolean;
  orderId?: string;
  status: 'COMPLETE' | 'PENDING' | 'AMO_QUEUED' | 'REJECTED';
  message: string;
  executionPrice?: number;
  totalValue?: number;
  timestamp: string;
  isPaperTrade: boolean;
}


