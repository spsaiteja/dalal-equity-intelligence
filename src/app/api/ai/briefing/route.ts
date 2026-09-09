import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketIndices, fetchStockQuote } from '@/lib/yahoo-client';
import { generateMarketBriefing } from '@/lib/gemini';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-data';
import { StockQuote } from '@/types/stock';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    const isDevBypass = process.env.NODE_ENV === 'development' && !process.env.GOOGLE_CLIENT_ID && !process.env.ENFORCE_AUTH_IN_DEV;

    if (!isDevBypass && (!sessionUser || !sessionUser.isApproved)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Approved session required to access AI models' },
        { status: 401 }
      );
    }
    let apiKey: string | undefined;
    try {
      const body = await request.json();
      apiKey = body.apiKey;
    } catch {
      // Empty body is acceptable
    }

    const indices = await fetchMarketIndices();
    
    // Sample top stocks
    const sampleSymbols = POPULAR_INDIAN_STOCKS.slice(0, 10);
    const quotes = await Promise.all(sampleSymbols.map((s) => fetchStockQuote(s.symbol)));
    const validQuotes = quotes.filter((q): q is StockQuote => q !== null);

    const briefing = await generateMarketBriefing(indices, validQuotes, apiKey);

    return NextResponse.json({
      success: true,
      data: briefing,
    });
  } catch (error: any) {
    console.error('Error in AI briefing route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI briefing failed' },
      { status: 500 }
    );
  }
}

