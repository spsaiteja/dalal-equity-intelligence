import { NextRequest, NextResponse } from 'next/server';
import { recordApprovalDecision, getApprovalHistory } from '@/lib/agents/approval';
import { validateSymbol } from '@/lib/agents/guardrails';
import { HumanOverridePayload } from '@/types/approval';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: HumanOverridePayload = await request.json();

    if (!body || !body.symbol) {
      return NextResponse.json(
        { success: false, error: 'Stock symbol is required.' },
        { status: 400 }
      );
    }

    const symbolCheck = validateSymbol(body.symbol);
    if (symbolCheck.blocked) {
      return NextResponse.json(
        { success: false, error: symbolCheck.reason || 'Invalid symbol.' },
        { status: 400 }
      );
    }

    const record = await recordApprovalDecision({
      ...body,
      symbol: symbolCheck.cleanInput,
    });

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error('Error in approval route POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record approval decision' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20;

    let cleanSymbol: string | undefined;
    if (rawSymbol) {
      const symbolCheck = validateSymbol(rawSymbol);
      if (symbolCheck.blocked) {
        return NextResponse.json(
          { success: false, error: symbolCheck.reason || 'Invalid symbol.' },
          { status: 400 }
        );
      }
      cleanSymbol = symbolCheck.cleanInput;
    }

    const history = await getApprovalHistory(cleanSymbol, limit);

    return NextResponse.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Error in approval route GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve approval history' },
      { status: 500 }
    );
  }
}

