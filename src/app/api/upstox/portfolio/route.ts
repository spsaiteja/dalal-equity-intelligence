import { NextRequest, NextResponse } from 'next/server';
import { getUpstoxSession } from '@/lib/upstox-storage';
import { fetchLiveUpstoxHoldings, generateSamplePortfolio } from '@/lib/upstox-client';
import { PortfolioSummary, UpstoxHolding } from '@/types/upstox';
import { analyzePortfolioAlerts } from '@/lib/portfolio-alerts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceDemo = searchParams.get('demo') === 'true';

    const session = getUpstoxSession();
    const isLiveConnected = Boolean(session && session.is_active && !forceDemo);

    if (isLiveConnected && session) {
      try {
        const liveHoldings = await fetchLiveUpstoxHoldings(session.access_token);

        let totalInvested = 0;
        let currentValue = 0;
        let dayPnl = 0;

        liveHoldings.forEach((h) => {
          totalInvested += h.invested_value;
          currentValue += h.current_value;
          dayPnl += h.quantity * h.day_change;
        });

        const totalPnl = currentValue - totalInvested;
        const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        const dayPnlPct = currentValue > 0 ? (dayPnl / (currentValue - dayPnl)) * 100 : 0;

        const summary: PortfolioSummary = {
          total_invested: parseFloat(totalInvested.toFixed(2)),
          current_value: parseFloat(currentValue.toFixed(2)),
          total_pnl: parseFloat(totalPnl.toFixed(2)),
          total_pnl_percentage: parseFloat(totalPnlPct.toFixed(2)),
          day_pnl: parseFloat(dayPnl.toFixed(2)),
          day_pnl_percentage: parseFloat(dayPnlPct.toFixed(2)),
          holdings_count: liveHoldings.length,
          is_demo_mode: false,
        };

        const alertAnalysis = analyzePortfolioAlerts(liveHoldings);

        return NextResponse.json({
          success: true,
          isConnected: true,
          isDemoMode: false,
          user_name: session.user_name,
          user_id: session.user_id,
          tokenType: session.token_type || (session.is_analytics_token ? 'analytics' : 'oauth'),
          isAnalyticsToken: session.token_type === 'analytics' || Boolean(session.is_analytics_token),
          expires_at: session.expires_at,
          summary,
          holdings: alertAnalysis.holdingsWithSignals,
          alerts: alertAnalysis.alerts,
          alertCounts: alertAnalysis.alertCounts,
        });
      } catch (err: any) {
        console.warn('Failed to fetch live Upstox holdings, falling back to demo:', err.message);
        // Fallback to sample portfolio if token expired or API failed
      }
    }

    // Return realistic demo portfolio
    const demoData = generateSamplePortfolio();
    const alertAnalysis = analyzePortfolioAlerts(demoData.holdings);

    return NextResponse.json({
      success: true,
      isConnected: false,
      isDemoMode: true,
      user_name: 'Demo Investor (Dalal Street)',
      user_id: 'DEMO_PORTFOLIO',
      summary: demoData.summary,
      holdings: alertAnalysis.holdingsWithSignals,
      alerts: alertAnalysis.alerts,
      alertCounts: alertAnalysis.alertCounts,
    });
  } catch (error: any) {
    console.error('Portfolio fetch route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

