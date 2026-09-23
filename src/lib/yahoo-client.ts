import yahooFinance from 'yahoo-finance2';
import { StockQuote, MarketIndex, HistoricalBar } from '@/types/stock';
import { POPULAR_INDIAN_STOCKS, INDIAN_INDICES } from './stock-data';
import { calculateRSI, calculateEMA, evaluateConviction } from './technicals';

// In-memory cache for fast responsive loads (60s TTL)
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const quoteCache: Record<string, CacheEntry<StockQuote>> = {};
const indicesCache: { data: MarketIndex[]; expiry: number } | null = null;

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const now = Date.now();
  if (indicesCache && indicesCache.expiry > now) {
    return indicesCache.data;
  }

  const results: MarketIndex[] = [];
  for (const item of INDIAN_INDICES) {
    try {
      const q: any = await yahooFinance.quote(item.symbol);
      results.push({
        symbol: item.symbol,
        name: item.name,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        dayHigh: q.regularMarketDayHigh ?? 0,
        dayLow: q.regularMarketDayLow ?? 0,
      });
    } catch (err) {
      console.warn(`Failed to fetch index ${item.symbol}:`, err);
    }
  }

  return results;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  const now = Date.now();
  if (quoteCache[symbol] && quoteCache[symbol].expiry > now) {
    return quoteCache[symbol].data;
  }

  try {
    const q: any = await yahooFinance.quote(symbol);
    if (!q || !q.regularMarketPrice) return null;

    // Fetch 3 months of daily history to compute RSI and EMAs
    let rsi: number | undefined;
    let ema50: number | undefined;
    let ema200: number | undefined;

    try {
      const today = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 5);

      const history = await yahooFinance.historical(symbol, {
        period1: threeMonthsAgo,
        period2: today,
        interval: '1d',
      });

      if (history && history.length >= 15) {
        const closes = history.map((h: any) => h.close).filter((c: any) => typeof c === 'number');
        rsi = calculateRSI(closes);
        ema50 = calculateEMA(closes, 50);
        ema200 = calculateEMA(closes, 200);
      }
    } catch (histErr) {
      // Historical data fetch fail gracefully
    }

    const price = q.regularMarketPrice ?? 0;
    const high52 = q.fiftyTwoWeekHigh ?? price;
    const low52 = q.fiftyTwoWeekLow ?? price;
    const discountFromHigh = high52 > 0 ? ((high52 - price) / high52) * 100 : 0;
    const distanceFromLow = low52 > 0 ? ((price - low52) / low52) * 100 : 0;
    const changePercent = q.regularMarketChangePercent ?? 0;

    const master = POPULAR_INDIAN_STOCKS.find((s) => s.symbol === symbol);

    const { signal, score, reason, tags } = evaluateConviction({
      price,
      high52,
      low52,
      rsi,
      ema50,
      ema200,
      peRatio: q.trailingPE,
      changePercent,
    });

    const stockQuote: StockQuote = {
      symbol: q.symbol,
      name: master?.name || q.shortName || q.longName || symbol.replace('.NS', ''),
      price,
      change: q.regularMarketChange ?? 0,
      changePercent,
      dayHigh: q.regularMarketDayHigh ?? price,
      dayLow: q.regularMarketDayLow ?? price,
      volume: q.regularMarketVolume ?? 0,
      marketCap: q.marketCap ?? 0,
      peRatio: q.trailingPE ? Math.round(q.trailingPE * 10) / 10 : undefined,
      fiftyTwoWeekHigh: high52,
      fiftyTwoWeekLow: low52,
      discountFromHigh: Math.round(discountFromHigh * 10) / 10,
      distanceFromLow: Math.round(distanceFromLow * 10) / 10,
      rsi14: rsi,
      ema50,
      ema200,
      sector: master?.sector,
      signal,
      signalScore: score,
      signalReason: reason,
      tags,
    };

    quoteCache[symbol] = {
      data: stockQuote,
      expiry: now + 45000, // 45 seconds cache
    };

    return stockQuote;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function fetchStockHistory(symbol: string, days: number = 90): Promise<HistoricalBar[]> {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    const data: any = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: today,
      interval: '1d',
    });

    return (data || []).map((bar: any) => ({
      date: new Date(bar.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      open: Math.round(bar.open * 100) / 100,
      high: Math.round(bar.high * 100) / 100,
      low: Math.round(bar.low * 100) / 100,
      close: Math.round(bar.close * 100) / 100,
      volume: bar.volume,
    }));
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error);
    return [];
  }
}

export async function fetchStockNews(symbol: string): Promise<any[]> {
  try {
    // Yahoo finance search/news
    const query = symbol.replace('.NS', '');
    const result: any = await yahooFinance.search(query, { newsCount: 5 });
    return (result.news || []).slice(0, 5).map((n: any) => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      providerPublishTime: n.providerPublishTime,
    }));
  } catch (err) {
    return [];
  }
}

