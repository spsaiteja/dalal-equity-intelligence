import { UpstoxHolding, UpstoxSession, PortfolioSummary } from '@/types/upstox';

const UPSTOX_BASE_URL = 'https://api.upstox.com/v2';

export function getUpstoxLoginUrl(apiKey: string, redirectUri: string): string {
  const encodedUri = encodeURIComponent(redirectUri);
  return `${UPSTOX_BASE_URL}/login/authorization/dialog?response_type=code&client_id=${apiKey}&redirect_uri=${encodedUri}`;
}

export async function exchangeCodeForToken(
  code: string,
  apiKey: string,
  apiSecret: string,
  redirectUri: string
): Promise<UpstoxSession> {
  const tokenUrl = `${UPSTOX_BASE_URL}/login/authorization/token`;

  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', apiKey);
  params.append('client_secret', apiSecret);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.message ||
        `Upstox Token Exchange failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // Valid until 06:00 AM next day or 24h
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    access_token: data.access_token,
    user_id: data.user_id || 'UPSTOX_USER',
    user_name: data.user_name || 'Upstox Investor',
    email: data.email,
    broker: 'Upstox Securities',
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    is_active: true,
  };
}

export async function fetchLiveUpstoxHoldings(accessToken: string): Promise<UpstoxHolding[]> {
  const url = `${UPSTOX_BASE_URL}/portfolio/long-term-holdings`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Failed to fetch holdings (${response.status})`);
  }

  const result = await response.json();
  const rawList = result?.data || [];

  return rawList.map((item: any) => {
    const qty = Number(item.quantity || 0);
    const avgPrice = Number(item.average_price || 0);
    const lastPrice = Number(item.last_price || item.close_price || 0);
    const closePrice = Number(item.close_price || lastPrice);
    const invested = qty * avgPrice;
    const current = qty * lastPrice;
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    const dayChange = lastPrice - closePrice;
    const dayChangePct = closePrice > 0 ? (dayChange / closePrice) * 100 : 0;

    return {
      isin: item.isin || item.instrument_token || '',
      trading_symbol: item.trading_symbol || item.company_name || 'EQUITY',
      company_name: item.company_name || item.trading_symbol || '',
      quantity: qty,
      average_price: parseFloat(avgPrice.toFixed(2)),
      last_price: parseFloat(lastPrice.toFixed(2)),
      close_price: parseFloat(closePrice.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnl_percentage: parseFloat(pnlPct.toFixed(2)),
      day_change: parseFloat(dayChange.toFixed(2)),
      day_change_percentage: parseFloat(dayChangePct.toFixed(2)),
      invested_value: parseFloat(invested.toFixed(2)),
      current_value: parseFloat(current.toFixed(2)),
      exchange: (item.exchange || 'NSE') as 'NSE' | 'BSE',
    };
  });
}

/**
 * Realistic Institutional Sample Portfolio
 * Allows instant testing of the Portfolio View & 5-Agent Council Audit
 * even before configuring Upstox developer credentials.
 */
export function generateSamplePortfolio(): {
  holdings: UpstoxHolding[];
  summary: PortfolioSummary;
} {
  const sampleHoldings: UpstoxHolding[] = [
    {
      isin: 'INE002A01018',
      trading_symbol: 'RELIANCE',
      company_name: 'Reliance Industries Ltd.',
      quantity: 50,
      average_price: 1240.5,
      last_price: 1291.3,
      close_price: 1282.0,
      invested_value: 62025.0,
      current_value: 64565.0,
      pnl: 2540.0,
      pnl_percentage: 4.09,
      day_change: 9.3,
      day_change_percentage: 0.73,
      sector: 'Energy / Conglomerate',
      exchange: 'NSE',
    },
    {
      isin: 'INE040A01034',
      trading_symbol: 'HDFCBANK',
      company_name: 'HDFC Bank Ltd.',
      quantity: 45,
      average_price: 1680.0,
      last_price: 1724.8,
      close_price: 1715.0,
      invested_value: 75600.0,
      current_value: 77616.0,
      pnl: 2016.0,
      pnl_percentage: 2.67,
      day_change: 9.8,
      day_change_percentage: 0.57,
      sector: 'Banking',
      exchange: 'NSE',
    },
    {
      isin: 'INE467B01029',
      trading_symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      quantity: 20,
      average_price: 4120.0,
      last_price: 3980.5,
      close_price: 4010.0,
      invested_value: 82400.0,
      current_value: 79610.0,
      pnl: -2790.0,
      pnl_percentage: -3.39,
      day_change: -29.5,
      day_change_percentage: -0.74,
      sector: 'Information Technology',
      exchange: 'NSE',
    },
    {
      isin: 'INE062A01020',
      trading_symbol: 'SBIN',
      company_name: 'State Bank of India',
      quantity: 80,
      average_price: 790.0,
      last_price: 814.2,
      close_price: 808.5,
      invested_value: 63200.0,
      current_value: 65136.0,
      pnl: 1936.0,
      pnl_percentage: 3.06,
      day_change: 5.7,
      day_change_percentage: 0.71,
      sector: 'Banking',
      exchange: 'NSE',
    },
    {
      isin: 'INE154A01025',
      trading_symbol: 'ITC',
      company_name: 'ITC Ltd.',
      quantity: 120,
      average_price: 435.0,
      last_price: 472.6,
      close_price: 470.0,
      invested_value: 52200.0,
      current_value: 56712.0,
      pnl: 4512.0,
      pnl_percentage: 8.64,
      day_change: 2.6,
      day_change_percentage: 0.55,
      sector: 'Fast Moving Consumer Goods',
      exchange: 'NSE',
    },
    {
      isin: 'INE018A01030',
      trading_symbol: 'LT',
      company_name: 'Larsen & Toubro Ltd.',
      quantity: 18,
      average_price: 3450.0,
      last_price: 3620.0,
      close_price: 3590.0,
      invested_value: 62100.0,
      current_value: 65160.0,
      pnl: 3060.0,
      pnl_percentage: 4.93,
      day_change: 30.0,
      day_change_percentage: 0.84,
      sector: 'Capital Goods / Infra',
      exchange: 'NSE',
    },
    {
      isin: 'INE397D01024',
      trading_symbol: 'BHARTIARTL',
      company_name: 'Bharti Airtel Ltd.',
      quantity: 35,
      average_price: 1395.0,
      last_price: 1685.0,
      close_price: 1672.0,
      invested_value: 48825.0,
      current_value: 58975.0,
      pnl: 10150.0,
      pnl_percentage: 20.79,
      day_change: 13.0,
      day_change_percentage: 0.78,
      sector: 'Telecom',
      exchange: 'NSE',
    },
    {
      isin: 'INE121J01017',
      trading_symbol: 'BHARTIHEXA',
      company_name: 'Bharti Hexacom Ltd.',
      quantity: 40,
      average_price: 1420.0,
      last_price: 1312.0,
      close_price: 1325.0,
      invested_value: 56800.0,
      current_value: 52480.0,
      pnl: -4320.0,
      pnl_percentage: -7.61,
      day_change: -13.0,
      day_change_percentage: -0.98,
      sector: 'Telecom',
      exchange: 'NSE',
    },
  ];

  let totalInvested = 0;
  let currentValue = 0;
  let dayPnl = 0;

  sampleHoldings.forEach((h) => {
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
    holdings_count: sampleHoldings.length,
    is_demo_mode: true,
  };

  return { holdings: sampleHoldings, summary };
}

