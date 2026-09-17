import { NextRequest, NextResponse } from 'next/server';
import { getSymbolDeliberationHistory, getRecentMarketDeliberations } from '@/lib/agents/memory';
import { validateSymbol } from '@/lib/agents/guardrails';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;

    if (rawSymbol) {
      const symbolCheck = validateSymbol(rawSymbol);
      if (symbolCheck.blocked) {
        return NextResponse.json(
          { success: false, error: symbolCheck.reason || 'Invalid symbol format.' },
          { status: 400 }
        );
      }
      const history = await getSymbolDeliberationHistory(symbolCheck.cleanInput, limit);
      return NextResponse.json({
        success: true,
        symbol: symbolCheck.cleanInput,
        history,
        count: history.length,
      });
    }

    // Return global recent deliberations
    const recent = await getRecentMarketDeliberations(limit);
    return NextResponse.json({
      success: true,
      recent,
      count: recent.length,
    });
  } catch (error: any) {
    console.error('Error in AI Memory route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve deliberation memory' },
      { status: 500 }
    );
  }
}

