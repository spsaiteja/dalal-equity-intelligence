import { NextRequest, NextResponse } from 'next/server';
import { analyzeChartVision } from '@/lib/agents/vision';
import { StockQuote } from '@/types/stock';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/vision/analyze
 * Analyzes candlestick chart bars and recognizes patterns, formations, and breakout targets.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, bars = [], quote } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Asset symbol is required' },
        { status: 400 }
      );
    }

    const fallbackQuote: StockQuote = quote || {
      symbol: symbol.toUpperCase(),
      name: symbol,
      price: bars.length > 0 ? bars[bars.length - 1].close : 1000,
      change: 0,
      changePercent: 0,
      dayHigh: 1050,
      dayLow: 950,
      volume: 100000,
      marketCap: 1000000000,
      fiftyTwoWeekHigh: 1200,
      fiftyTwoWeekLow: 800,
      discountFromHigh: 10,
      distanceFromLow: 20,
      signal: 'HOLD',
      signalScore: 5,
      signalReason: 'Neutral',
      tags: [],
    };

    const visionReport = await analyzeChartVision(symbol, bars, fallbackQuote);

    return NextResponse.json({
      success: true,
      symbol: visionReport.symbol,
      vision: visionReport,
    });
  } catch (error: any) {
    console.error('[Vision API] Error analyzing chart:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Chart pattern analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/vision/analyze
 * Health check & supported visual pattern catalogue.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    supportedPatterns: [
      'DOUBLE_BOTTOM',
      'DOUBLE_TOP',
      'HEAD_AND_SHOULDERS',
      'BULL_FLAG',
      'BEAR_FLAG',
      'ASCENDING_TRIANGLE',
      'DESCENDING_TRIANGLE',
      'CUP_AND_HANDLE',
      'CHANNEL_UP',
      'CHANNEL_DOWN',
    ],
    supportedFormations: [
      'HAMMER',
      'ENGULFING_BULLISH',
      'ENGULFING_BEARISH',
      'DOJI',
      'MORNING_STAR',
      'EVENING_STAR',
      'PIN_BAR',
      'MARUBOZU_BULLISH',
    ],
  });
}
