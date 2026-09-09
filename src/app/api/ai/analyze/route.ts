import { NextRequest, NextResponse } from 'next/server';
import { fetchStockQuote, fetchStockNews } from '@/lib/yahoo-client';
import { analyzeStockWithGemini } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, apiKey } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const [quote, news] = await Promise.all([
      fetchStockQuote(symbol),
      fetchStockNews(symbol),
    ]);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: `Quote not found for ${symbol}` },
        { status: 404 }
      );
    }

    const analysis = await analyzeStockWithGemini(quote, news, apiKey);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Error in AI analysis route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI analysis failed' },
      { status: 500 }
    );
  }
}

