export type ChartPattern =
  | 'DOUBLE_BOTTOM'
  | 'DOUBLE_TOP'
  | 'HEAD_AND_SHOULDERS'
  | 'BULL_FLAG'
  | 'BEAR_FLAG'
  | 'ASCENDING_TRIANGLE'
  | 'DESCENDING_TRIANGLE'
  | 'CUP_AND_HANDLE'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'NONE';

export type CandlestickFormation =
  | 'HAMMER'
  | 'ENGULFING_BULLISH'
  | 'ENGULFING_BEARISH'
  | 'DOJI'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'PIN_BAR'
  | 'MARUBOZU_BULLISH'
  | 'NONE';

export interface VisionAnalysisReport {
  symbol: string;
  primaryPattern: ChartPattern;
  candlestickFormations: CandlestickFormation[];
  patternConfidence: number; // 0 to 100
  breakoutTarget: string;
  invalidationLevel: string;
  visualKeyLevels: {
    support: string;
    resistance: string;
  };
  patternImplication: string;
  isVisionGrounded: boolean;
}
