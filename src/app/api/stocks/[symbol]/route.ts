import { NextRequest, NextResponse } from 'next/server';
import { fetchStockQuote, fetchStockHistory, fetchStockNews } from '@/lib/yahoo-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    let symbol = decodeURIComponent(params.symbol);
    if (!symbol.includes('.')) {
      symbol = `${symbol}.NS`;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    const [quote, history, news] = await Promise.all([
      fetchStockQuote(symbol),
      fetchStockHistory(symbol, days),
      fetchStockNews(symbol),
    ]);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: `Stock ${symbol} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        quote,
        history,
        news,
      },
    });
  } catch (error: any) {
    console.error(`Error in stock detail route for ${params.symbol}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}

