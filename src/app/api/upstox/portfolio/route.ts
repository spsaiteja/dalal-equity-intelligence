import { NextRequest, NextResponse } from 'next/server';
import { getUpstoxSession } from '@/lib/upstox-storage';
import { fetchLiveUpstoxHoldings, generateSamplePortfolio } from '@/lib/upstox-client';
import { PortfolioSummary, UpstoxHolding } from '@/types/upstox';
import { analyzePortfolioAlerts } from '@/lib/portfolio-alerts';
import { getSessionUser } from '@/lib/auth';
import { getLivePaperPortfolio } from '@/lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please sign in to view portfolio holdings.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceDemo = searchParams.get('demo') === 'true';

    // Prioritize per-user header token (for zero-db user isolation)
    const headerToken = request.headers.get('x-upstox-token');
    const session = getUpstoxSession();

    const activeToken = !forceDemo && (headerToken || (session && session.is_active ? session.access_token : null));
    const isLiveConnected = Boolean(activeToken);

    if (isLiveConnected && activeToken) {
      try {
        const liveHoldings = await fetchLiveUpstoxHoldings(activeToken);

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
          user_name: session?.user_name || 'Upstox Investor',
          user_id: session?.user_id || 'LIVE_DEMAT',
          tokenType: headerToken ? 'analytics' : (session?.token_type || 'oauth'),
          isAnalyticsToken: Boolean(headerToken || session?.token_type === 'analytics' || session?.is_analytics_token),
          expires_at: session?.expires_at,
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

    // Check if user has active paper trading portfolio
    const livePaper = await getLivePaperPortfolio(sessionUser.email);
    const hasPaperActivity = livePaper.portfolio.holdings.length > 0 || livePaper.portfolio.orders.length > 0;

    if (hasPaperActivity) {
      const holdings: UpstoxHolding[] = livePaper.portfolio.holdings.map((h) => ({
        isin: `INE_PAPER_${h.symbol.replace('.NS', '')}`,
        trading_symbol: h.symbol.replace('.NS', ''),
        company_name: h.companyName,
        quantity: h.quantity,
        average_price: h.averagePrice,
        last_price: h.currentPrice,
        close_price: parseFloat((h.currentPrice - (h.dayChange || 0)).toFixed(2)),
        pnl: h.pnl,
        pnl_percentage: h.pnlPercentage,
        day_change: h.dayChange || 0,
        day_change_percentage: h.dayChangePercentage || 0,
        invested_value: h.investedValue,
        current_value: h.currentValue,
        exchange: 'NSE',
        targetPrice: h.targetPrice,
        stopLossPrice: h.stopLossPrice,
      }));

      const alertAnalysis = analyzePortfolioAlerts(holdings);

      return NextResponse.json({
        success: true,
        isConnected: false,
        isDemoMode: true,
        isPaperTrading: true,
        cashBalance: livePaper.portfolio.cashBalance,
        initialCapital: livePaper.portfolio.initialCapital,
        user_name: `${sessionUser.name || 'Investor'} (Paper Portfolio)`,
        user_id: 'PAPER_PORTFOLIO',
        summary: {
          total_invested: livePaper.totalInvested,
          current_value: livePaper.currentValue,
          total_pnl: livePaper.totalPnl,
          total_pnl_percentage: livePaper.totalPnlPercentage,
          day_pnl: livePaper.dayPnl,
          day_pnl_percentage: livePaper.dayPnlPercentage,
          holdings_count: holdings.length,
          is_demo_mode: true,
        },
        holdings: alertAnalysis.holdingsWithSignals,
        alerts: alertAnalysis.alerts,
        alertCounts: alertAnalysis.alertCounts,
      });
    }

    // Return realistic demo portfolio if no paper trades yet
    const demoData = generateSamplePortfolio();
    const alertAnalysis = analyzePortfolioAlerts(demoData.holdings);

    return NextResponse.json({
      success: true,
      isConnected: false,
      isDemoMode: true,
      isPaperTrading: false,
      cashBalance: livePaper.portfolio.cashBalance,
      initialCapital: livePaper.portfolio.initialCapital,
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
