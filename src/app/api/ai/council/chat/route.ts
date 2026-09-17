import { NextRequest, NextResponse } from 'next/server';
import { InterrogationRequest, CouncilRole } from '@/types/chat';
import { generateAgentClarification } from '@/lib/agents/interrogation';
import { validateSymbol } from '@/lib/agents/guardrails';

const VALID_ROLES: CouncilRole[] = [
  'SENTINEL',
  'FUNDAMENTALIST',
  'NEWS_SCOUT',
  'RISK_GUARDIAN',
  'CIO',
  'ALL',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      runId,
      symbol,
      stockPrice,
      targetAgent = 'CIO',
      userQuery,
      history = [],
      consensusSummary,
      cioVerdict,
      cioDirective,
      apiKey,
    } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target stock symbol is required.' },
        { status: 400 }
      );
    }

    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return NextResponse.json(
        { success: false, error: 'User inquiry or scenario text is required.' },
        { status: 400 }
      );
    }

    // Phase 6 Symbol allowlist check
    if (!validateSymbol(symbol)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or prohibited stock symbol format.' },
        { status: 400 }
      );
    }

    const assignedRole: CouncilRole = VALID_ROLES.includes(targetAgent)
      ? targetAgent
      : 'CIO';

    const interrogationReq: InterrogationRequest = {
      runId: runId || `run-adhoc-${Date.now()}`,
      symbol: symbol.trim(),
      stockPrice: typeof stockPrice === 'number' ? stockPrice : 0,
      targetAgent: assignedRole,
      userQuery: userQuery.trim(),
      history: Array.isArray(history) ? history : [],
      consensusSummary: typeof consensusSummary === 'string' ? consensusSummary : '',
      cioVerdict: typeof cioVerdict === 'string' ? cioVerdict : '',
      cioDirective: typeof cioDirective === 'string' ? cioDirective : '',
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : undefined,
    };

    const clarification = await generateAgentClarification(interrogationReq);

    return NextResponse.json({
      success: true,
      ...clarification,
    });
  } catch (err: any) {
    console.error('[API /api/ai/council/chat] Error handling interrogation:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error processing council interrogation.',
      },
      { status: 500 }
    );
  }
}

