export type ConvictionType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  discountFromHigh: number; // % drop from 52-week high
  distanceFromLow: number;  // % gain from 52-week low
  rsi14?: number;
  ema50?: number;
  ema200?: number;
  sector?: string;
  nifty50?: boolean;
  nifty100?: boolean;
  signal: ConvictionType;
  signalScore: number;      // 1 to 10
  signalReason: string;
  tags: string[];           // e.g. ['Value Discount', 'RSI Oversold', '50 DMA Support']
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AiStockAnalysis {
  symbol: string;
  companyName: string;
  currentPrice: number;
  conviction: ConvictionType;
  convictionScore: number; // 1 to 10
  dipClassification: {
    category: 'Bargain Opportunity' | 'Value Trap' | 'Fair Value Pullback' | 'Overvalued Dip' | 'Momentum Ride';
    confidencePercent: number;
    explanation: string;
  };
  tradePlan: {
    recommendedEntryZone: string;
    target1: string;
    target2: string;
    stopLoss: string;
    riskRewardRatio: string;
    timeHorizon: string;
  };
  catalysts: string[];
  downsideRisks: string[];
  aiExecutiveSummary: string;
  timestamp: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  bucket: string;
  addedPrice: number;
  currentPrice?: number;
  changePercent?: number;
  targetPrice?: number;
  stopLoss?: number;
  signal?: ConvictionType;
  notes?: string;
  addedAt: string;
}

export interface MarketBriefing {
  sentiment: 'Bullish' | 'Cautiously Bullish' | 'Neutral' | 'Bearish' | 'Volatile';
  niftyOutlook: string;
  macroFactors: {
    giftNifty: string;
    globalCues: string;
    crudeAndFii: string;
  };
  topSectorsToWatch: {
    sector: string;
    stance: 'Bullish' | 'Bearish' | 'Neutral';
    reason: string;
  }[];
  geminiPicksOfTheDay: {
    symbol: string;
    rationale: string;
    type: 'Dip Buy' | 'Breakout' | 'Value';
  }[];
  actionableSummary: string;
  timestamp: string;
}

