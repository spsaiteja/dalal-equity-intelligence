import { NextRequest, NextResponse } from 'next/server';
import {
  generateExecutiveDossier,
  formatDossierAsMarkdown,
  formatDossierAsHtmlPrint,
} from '@/lib/agents/dossier-generator';
import { CouncilConsensus } from '@/types/agent';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Benchmark sample deliberation for tests & diagnostics
const BENCHMARK_DELIBERATION: CouncilConsensus = {
  symbol: 'TCS.NS',
  companyName: 'Tata Consultancy Services Ltd',
  currentPrice: 4150,
  cioVerdict: 'STRONG_BUY',
  overallScore: 8.8,
  debateSummary:
    'The council unanimously supports accumulation of TCS following consistent multi-year cloud deal momentum and solid margin resilience. Technical oscillators display a confirmed double bottom breakout while Risk Guardian mandates disciplined trailing stops.',
  cioExecutiveDirective: 'Accumulate with target ₹4,420 and stop-loss at ₹3,920.',
  tradeActionPlan: {
    entryStrategy: 'Accumulate on dips',
    target1: '₹4,420',
    target2: '₹4,680',
    stopLoss: '₹3,920',
    timeHorizon: '2 - 4 Months',
    positionAllocation: '6% Portfolio',
  },
  agents: {
    sentinel: {
      agentName: 'Sentinel',
      role: 'SENTINEL',
      stance: 'Bullish',
      confidenceScore: 85,
      headlineTakeaway: 'Bullish breakout above 50 EMA with strong volume.',
      arguments: ['Bullish breakout above 50 EMA with strong volume.'],
      trendAssessment: 'Secular uptrend confirmed above EMA 50/200.',
      keyLevels: {
        immediateSupport: '₹4,020',
        majorSupport: '₹3,900',
        immediateResistance: '₹4,250',
        majorBreakout: '₹4,300',
      },
      chartVision: {
        symbol: 'TCS.NS',
        primaryPattern: 'DOUBLE_BOTTOM',
        candlestickFormations: ['HAMMER'],
        patternConfidence: 84,
        breakoutTarget: '₹4,520',
        invalidationLevel: '₹3,960',
        visualKeyLevels: {
          support: '₹4,020',
          resistance: '₹4,280',
        },
        patternImplication: 'Double bottom accumulation pattern confirmed.',
        isVisionGrounded: true,
      },
    },
    fundamental: {
      agentName: 'The Fundamentalist',
      role: 'FUNDAMENTAL',
      stance: 'Bullish',
      confidenceScore: 82,
      headlineTakeaway: 'Attractive valuation relative to 5-year median P/E.',
      arguments: ['Trading at 28.5x P/E vs sector average of 32.1x.'],
      valuationStatus: 'Deeply Undervalued',
      estimatedMarginOfSafetyPercent: 14.5,
      balanceSheetHealth: 'Robust',
    },
    newsScout: {
      agentName: 'News Scout',
      role: 'NEWS_SCOUT',
      stance: 'Bullish',
      confidenceScore: 80,
      headlineTakeaway: 'Positive macro tailwinds in global IT enterprise spending.',
      arguments: ['\$1.2B Mega-Deal renewed in North America BFSI'],
      sentimentPolarity: 0.75,
      catalystsIdentified: ['\$1.2B Mega-Deal renewed in North America BFSI'],
      headwindWarnings: ['Currency volatility in GBP/EUR'],
    },
    riskGuardian: {
      agentName: 'Risk Guardian',
      role: 'RISK_GUARDIAN',
      stance: 'Neutral',
      confidenceScore: 86,
      headlineTakeaway: 'Preserve gains with trailing stop-loss at ₹3,920.',
      arguments: ['Low beta, high dividend yield, maximum drawdown risk is contained.'],
      riskRating: 'Low Risk',
      recommendedMaxPositionPercent: 6,
      mandatedStopLoss: '₹3,920',
      riskRewardAssessment: 'Favorable 1:2.8 risk-reward setup.',
    },
  },
  timestamp: new Date().toISOString(),
  metadata: {
    runId: 'RUN-BENCHMARK-TCS',
    executionTimeMs: 420,
    timestamp: new Date().toISOString(),
    agentsStatus: {
      sentinel: 'success',
      fundamental: 'success',
      newsScout: 'success',
      riskGuardian: 'success',
      cio: 'success',
    },
    model: 'gemini-2.5-flash',
    promptVersion: '2.0.0',
    disclaimer: 'SEBI compliant disclaimer',
    dissentAnalysis: {
      breakdown: {
        totalAgents: 4,
        bullishCount: 3,
        bearishCount: 0,
        neutralCount: 1,
        bullishPercent: 75,
        bearishPercent: 0,
        neutralPercent: 25,
        agreementIndexPercent: 85,
        consensusStrength: 'STRONG_CONCURRENCE',
      },
      dissenters: [],
      primaryDissenter: null,
      primaryCounterThesis: null,
      polarizationScore: 0.15,
      hasDissent: false,
    },
    calibration: {
      symbol: 'TCS.NS',
      metrics: {
        totalEvaluatedRuns: 6,
        profitableRuns: 5,
        adverseRuns: 1,
        neutralRuns: 0,
        directionalWinRatePercent: 83.3,
        target1HitRatePercent: 83.3,
        stopLossHitRatePercent: 16.7,
        averageReturnPercent: 7.2,
        profitFactor: 2.45,
        brierAccuracyScore: 0.18,
        verdictWinRates: {},
      },
      evaluations: [],
    },
  },
};

/**
 * GET: Run benchmark test dossier export or preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format')?.toUpperCase() || 'JSON') as 'JSON' | 'MARKDOWN' | 'HTML_PRINT';

    const dossier = generateExecutiveDossier(BENCHMARK_DELIBERATION);

    if (format === 'HTML_PRINT') {
      const html = formatDossierAsHtmlPrint(dossier);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (format === 'MARKDOWN') {
      const markdown = formatDossierAsMarkdown(dossier);
      return NextResponse.json({
        success: true,
        format: 'MARKDOWN',
        markdown,
        dossier,
      });
    }

    return NextResponse.json({
      success: true,
      format: 'JSON',
      dossier,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate benchmark dossier' },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate institutional dossier from custom deliberation result
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    const isDevBypass = process.env.NODE_ENV === 'development' && !process.env.GOOGLE_CLIENT_ID && !process.env.ENFORCE_AUTH_IN_DEV;

    if (!isDevBypass && (!sessionUser || !sessionUser.isApproved)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Approved session required to export dossier' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const deliberation: CouncilConsensus = body?.deliberation;
    const format = (body?.format?.toUpperCase() || 'JSON') as 'JSON' | 'MARKDOWN' | 'HTML_PRINT';

    if (!deliberation || (!deliberation.symbol && !(deliberation as any).stock)) {
      return NextResponse.json(
        { success: false, error: 'Invalid deliberation object provided for dossier generation' },
        { status: 400 }
      );
    }

    const dossier = generateExecutiveDossier(deliberation);

    if (format === 'HTML_PRINT') {
      const html = formatDossierAsHtmlPrint(dossier);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (format === 'MARKDOWN') {
      const markdown = formatDossierAsMarkdown(dossier);
      return NextResponse.json({
        success: true,
        format: 'MARKDOWN',
        markdown,
        dossier,
      });
    }

    return NextResponse.json({
      success: true,
      format: 'JSON',
      dossier,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export executive dossier' },
      { status: 500 }
    );
  }
}
