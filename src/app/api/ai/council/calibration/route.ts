import { NextRequest, NextResponse } from 'next/server';
import { getSymbolTrackRecord, getSystemCalibrationReport } from '@/lib/agents/calibration';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/council/calibration
 * Returns historical deliberation accuracy metrics and track records.
 * Query Params:
 *  - symbol?: string (e.g. "RELIANCE")
 *  - currentPrice?: number (optional current market price for evaluation)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const currentPriceParam = searchParams.get('currentPrice');
    const currentPrice = currentPriceParam ? parseFloat(currentPriceParam) : undefined;

    if (symbol) {
      const trackRecord = await getSymbolTrackRecord(symbol, currentPrice);
      return NextResponse.json({
        success: true,
        type: 'symbol',
        symbol: trackRecord.symbol,
        metrics: trackRecord.metrics,
        evaluations: trackRecord.evaluations,
      });
    }

    const systemReport = await getSystemCalibrationReport();
    return NextResponse.json({
      success: true,
      type: 'system',
      metrics: systemReport.metrics,
      evaluations: systemReport.evaluations.slice(0, 30),
    });
  } catch (error: any) {
    console.error('[Calibration API] Error evaluating track record:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate deliberation calibration metrics',
      },
      { status: 500 }
    );
  }
}
