export type BullionMetalType =
  | 'GOLD_24K'
  | 'GOLD_22K'
  | 'GOLD_21K'
  | 'GOLD_18K'
  | 'SILVER_999';

export const USD_AED_PEG = 3.6725;
export const GRAMS_PER_TROY_OZ = 31.1034768;
export const GRAMS_PER_TOLA = 11.6638;

export interface BullionHolding {
  id: string;
  metalType: BullionMetalType;
  itemName: string;
  weightGrams: number;
  buyPricePerGramAED: number;
  buyDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MetalRateDetail {
  aedPerGram: number;
  inrPerGram: number;
  change24h: number;
  change24hPct: number;
}

export interface SilverRateDetail extends MetalRateDetail {
  aedPerKg: number;
  inrPerKg: number;
}

export interface UaeBullionRates {
  gold24k: MetalRateDetail;
  gold22k: MetalRateDetail;
  gold21k: MetalRateDetail;
  gold18k: MetalRateDetail;
  silver: SilverRateDetail;
  aedInrRate: number;
  usdSpotGold: number;
  usdSpotSilver: number;
  usdAedPeg: number;
  lastUpdated: string;
}

export interface BullionHoldingCalculated extends BullionHolding {
  totalCostAED: number;
  totalCostINR: number;
  currentPricePerGramAED: number;
  currentPricePerGramINR: number;
  currentValueAED: number;
  currentValueINR: number;
  pnlAED: number;
  pnlINR: number;
  pnlPct: number;
}

export interface BullionPortfolioSummary {
  totalInvestedAED: number;
  totalCurrentValueAED: number;
  totalPnlAED: number;
  totalPnlPct: number;
  totalInvestedINR: number;
  totalCurrentValueINR: number;
  totalPnlINR: number;
  totalGoldGrams: number;
  totalGoldTolas: number;
  totalSilverGrams: number;
  totalSilverKg: number;
  itemCount: number;
}
