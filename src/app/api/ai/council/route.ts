import { NextRequest, NextResponse } from 'next/server';
import { fetchStockQuote, fetchStockNews } from '@/lib/yahoo-client';
import { orchestrateCouncilDeliberation } from '@/lib/agents/orchestrator';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput, validateSymbol } from '@/lib/agents/guardrails';

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
    const body = await request.json();
    const { symbol, apiKey, quote: clientQuote } = body;

    const rawSym = symbol || clientQuote?.symbol;

    if (!rawSym) {
      return NextResponse.json(
        { success: false, error: 'Stock symbol is required' },
        { status: 400 }
      );
    }

    // Guardrail: Validate and sanitize symbol input
    const symbolCheck = validateSymbol(rawSym);
    if (symbolCheck.blocked) {
      return NextResponse.json(
        { success: false, error: symbolCheck.reason || 'Invalid symbol input blocked by guardrails.' },
        { status: 400 }
      );
    }
    const sym = symbolCheck.cleanInput;

    // Guardrail: Sanitize API key input (block prompt injection in key field)
    if (apiKey && typeof apiKey === 'string') {
      const keyCheck = sanitizeInput(apiKey, 'apiKey');
      if (keyCheck.blocked) {
        return NextResponse.json(
          { success: false, error: 'API key input blocked by security guardrails.' },
          { status: 400 }
        );
      }
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

    const consensus = await orchestrateCouncilDeliberation(quote, news, apiKey);

    return NextResponse.json({
      success: true,
      data: consensus,
      metadata: consensus.metadata,
    });
  } catch (error: any) {
    console.error('Error in AI Council route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI Council deliberation failed' },
      { status: 500 }
    );
  }
}

