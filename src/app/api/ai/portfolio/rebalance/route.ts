import { NextRequest, NextResponse } from 'next/server';
import {
  calculatePortfolioHealth,
  generateRebalancePlan,
  DEFAULT_REBALANCE_POLICY,
} from '@/lib/agents/rebalancer';
import { PortfolioHoldingInput, RebalancePolicy } from '@/types/rebalance';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Realistic institutional demo portfolio for test suite and diagnostic execution
const BENCHMARK_TEST_PORTFOLIO: PortfolioHoldingInput[] = [
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd',
    quantity: 60,
    avgPrice: 2850,
    lastPrice: 3020,
    currentValue: 181200, // ~33% of 550,000 portfolio (overweight violation)
    investedValue: 171000,
    pnl: 10200,
    pnlPercent: 5.96,
    sector: 'Energy & Petrochemicals',
  },
  {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Ltd',
    quantity: 75,
    avgPrice: 1580,
    lastPrice: 1650,
    currentValue: 123750, // ~22.5% of portfolio
    investedValue: 118500,
    pnl: 5250,
    pnlPercent: 4.43,
    sector: 'Banking & Financials',
  },
  {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    quantity: 20,
    avgPrice: 3900,
    lastPrice: 4150,
    currentValue: 83000, // ~15.1%
    investedValue: 78000,
    pnl: 5000,
    pnlPercent: 6.41,
    sector: 'Information Technology',
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys Ltd',
    quantity: 35,
    avgPrice: 1720,
    lastPrice: 1840,
    currentValue: 64400, // ~11.7%
    investedValue: 60200,
    pnl: 4200,
    pnlPercent: 6.98,
    sector: 'Information Technology',
  },
  {
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Ltd',
    quantity: 60,
    avgPrice: 940,
    lastPrice: 980,
    currentValue: 58800, // ~10.7%
    investedValue: 56400,
    pnl: 2400,
    pnlPercent: 4.26,
    sector: 'Automotive',
  },
  {
    symbol: 'PAYTM',
    companyName: 'One97 Communications',
    quantity: 80,
    avgPrice: 620,
    lastPrice: 470,
    currentValue: 37600, // ~6.8%
    investedValue: 49600,
    pnl: -12000,
    pnlPercent: -24.19, // Severe stop loss breach (< -20%)
    sector: 'Fintech',
  },
];

/**
 * Normalize whatever holding format is passed (UpstoxHolding format or PortfolioHoldingInput)
 */
function normalizeHoldings(rawList: any[]): PortfolioHoldingInput[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item) => {
    const symbol = item.symbol || item.trading_symbol || 'UNKNOWN';
    const companyName = item.companyName || item.company_name || symbol;
    const quantity = Number(item.quantity) || 0;
    const avgPrice = Number(item.avgPrice || item.average_price || item.avg_price) || 0;
    const lastPrice = Number(item.lastPrice || item.last_price || item.close || avgPrice) || avgPrice;
    const currentValue = Number(item.currentValue || item.current_value) || (quantity * lastPrice);
    const investedValue = Number(item.investedValue || item.invested_value) || (quantity * avgPrice);
    const pnl = Number(item.pnl) || (currentValue - investedValue);
    const pnlPercent = Number(item.pnlPercent || item.pnl_percentage) || (investedValue > 0 ? (pnl / investedValue) * 100 : 0);
    const sector = item.sector || 'Unclassified';

    return {
      symbol,
      companyName,
      quantity,
      avgPrice,
      lastPrice,
      currentValue,
      investedValue,
      pnl,
      pnlPercent,
      sector,
    };
  });
}

/**
 * GET: Run benchmark test rebalancing diagnostic
 */
export async function GET() {
  try {
    const metrics = calculatePortfolioHealth(BENCHMARK_TEST_PORTFOLIO);
    const plan = generateRebalancePlan(BENCHMARK_TEST_PORTFOLIO);

    return NextResponse.json({
      success: true,
      mode: 'BENCHMARK_DIAGNOSTIC',
      benchmarkHoldingsCount: BENCHMARK_TEST_PORTFOLIO.length,
      metrics,
      plan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Rebalancing diagnostic failed' },
      { status: 500 }
    );
  }
}

/**
 * POST: Compute live portfolio health and generate institutional rebalance plan
 */
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
    const rawHoldings = body?.holdings;

    if (!rawHoldings || !Array.isArray(rawHoldings) || rawHoldings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No portfolio holdings provided. Provide non-empty holdings array.' },
        { status: 400 }
      );
    }

    const holdings = normalizeHoldings(rawHoldings);
    const policy: Partial<RebalancePolicy> | undefined = body?.policy;

    const metrics = calculatePortfolioHealth(holdings, policy);
    const plan = generateRebalancePlan(holdings, policy);

    return NextResponse.json({
      success: true,
      holdingsCount: holdings.length,
      metrics,
      plan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process portfolio rebalance' },
      { status: 500 }
    );
  }
}
