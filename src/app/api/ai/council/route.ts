import { NextRequest, NextResponse } from 'next/server';
import { fetchStockQuote, fetchStockNews } from '@/lib/yahoo-client';
import { runCouncilDeliberation } from '@/lib/agents/cio';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, apiKey, quote: clientQuote } = body;

    const sym = symbol || clientQuote?.symbol;

    if (!sym) {
      return NextResponse.json(
        { success: false, error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    const [quote, news] = await Promise.all([
      clientQuote ? Promise.resolve(clientQuote) : fetchStockQuote(sym),
      fetchStockNews(sym),
    ]);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: `Quote not found for ${sym}` },
        { status: 404 }
      );
    }

    const consensus = await runCouncilDeliberation(quote, news, apiKey);

    return NextResponse.json({
      success: true,
      data: consensus,
    });
  } catch (error: any) {
    console.error('Error in AI Council route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI Council deliberation failed' },
      { status: 500 }
    );
  }
}
