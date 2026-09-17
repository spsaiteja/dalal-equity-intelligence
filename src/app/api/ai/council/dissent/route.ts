import { NextRequest, NextResponse } from 'next/server';
import { analyzeCouncilDissent } from '@/lib/agents/dissent-analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agents, cioVerdict = 'BUY' } = body;

    if (!agents || typeof agents !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Agent outputs object is required for dissent analysis.' },
        { status: 400 }
      );
    }

    const analysis = analyzeCouncilDissent({
      agents: {
        sentinel: agents.sentinel,
        fundamental: agents.fundamental,
        newsScout: agents.newsScout,
        riskGuardian: agents.riskGuardian,
      },
      cioVerdict: String(cioVerdict),
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    console.error('[API /api/ai/council/dissent] Error computing dissent:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to compute consensus dissent analysis.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    description: 'DalalAI Multi-Agent Consensus Scoring & Dissent Analysis API',
    metricsProvided: [
      'agreementIndexPercent',
      'consensusStrength',
      'bullishPercent',
      'bearishPercent',
      'neutralPercent',
      'dissenters',
      'primaryCounterThesis',
      'polarizationScore',
    ],
  });
}

