import { NextRequest, NextResponse } from 'next/server';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-data';
import { fetchStockQuote } from '@/lib/yahoo-client';
import { StockQuote } from '@/types/stock';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  quotes: StockQuote[];
  timestamp: number;
}

let stockCache: CacheEntry | null = null;
const MEMORY_CACHE_TTL_MS = 60 * 1000; // 60 seconds memory TTL
const DISK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes disk TTL

function getDiskCache(): CacheEntry | null {
  try {
    const cachePath = path.join(process.cwd(), 'data', 'stocks_cache.json');
    if (!fs.existsSync(cachePath)) return null;
    const content = fs.readFileSync(cachePath, 'utf8');
    const data = JSON.parse(content);
    if (data?.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
      return data as CacheEntry;
    }
  } catch (e) {
    console.error('Error reading disk cache:', e);
  }
  return null;
}

function saveDiskCache(quotes: StockQuote[]) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const cachePath = path.join(dataDir, 'stocks_cache.json');
    fs.writeFileSync(cachePath, JSON.stringify({ quotes, timestamp: Date.now() }, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving disk cache:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const sector = searchParams.get('sector') || 'all';
    const indexScope = searchParams.get('index') || 'all'; // nifty50 | nifty100 | all
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const now = Date.now();
    let allQuotes: StockQuote[] = [];

    // 1. Try memory cache
    if (!forceRefresh && stockCache && now - stockCache.timestamp < MEMORY_CACHE_TTL_MS) {
      allQuotes = stockCache.quotes;
    } else if (!forceRefresh) {
      // 2. Try disk cache
      const diskData = getDiskCache();
      if (diskData && now - diskData.timestamp < DISK_CACHE_TTL_MS) {
        allQuotes = diskData.quotes;
        stockCache = diskData;
      }
    }

    // 3. Fallback: Fetch in chunks if empty or force refresh requested
    if (allQuotes.length === 0) {
      const diskData = getDiskCache();
      if (diskData && diskData.quotes.length > 0 && !forceRefresh) {
        // Use available disk data even if older than TTL while refreshing
        allQuotes = diskData.quotes;
        stockCache = diskData;
      } else {
        const chunkSize = 40;
        for (let i = 0; i < POPULAR_INDIAN_STOCKS.length; i += chunkSize) {
          const chunk = POPULAR_INDIAN_STOCKS.slice(i, i + chunkSize);
          const quotes = await Promise.all(chunk.map((s) => fetchStockQuote(s.symbol)));
          const valid = quotes.filter((q): q is StockQuote => q !== null);
          allQuotes.push(...valid);
        }

        if (allQuotes.length > 0) {
          stockCache = { quotes: allQuotes, timestamp: now };
          saveDiskCache(allQuotes);
        }
      }
    }

    let validQuotes = [...allQuotes];

    // Index Scope Filter (NIFTY 50 vs NIFTY 100 vs NIFTY 500)
    if (indexScope === 'nifty50') {
      const n50Symbols = new Set(
        POPULAR_INDIAN_STOCKS.filter((s) => s.nifty50).map((s) => s.symbol)
      );
      validQuotes = validQuotes.filter((q) => n50Symbols.has(q.symbol));
    } else if (indexScope === 'nifty100') {
      const n100Symbols = new Set(
        POPULAR_INDIAN_STOCKS.filter((s) => s.nifty50 || s.nifty100).map((s) => s.symbol)
      );
      validQuotes = validQuotes.filter((q) => n100Symbols.has(q.symbol));
    }

    // Sector Filter
    if (sector !== 'all') {
      validQuotes = validQuotes.filter(
        (s) => s.sector && s.sector.toLowerCase() === sector.toLowerCase()
      );
    }

    // Search Query (ticker, company name, or sector)
    if (search) {
      validQuotes = validQuotes.filter(
        (s) =>
          s.symbol.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search) ||
          (s.sector && s.sector.toLowerCase().includes(search))
      );
    }

    // Screener Presets
    if (filter === 'discounted') {
      validQuotes = validQuotes
        .filter((q) => q.discountFromHigh >= 10 || (q.rsi14 && q.rsi14 <= 42))
        .sort((a, b) => b.discountFromHigh - a.discountFromHigh);
    } else if (filter === 'oversold') {
      validQuotes = validQuotes
        .filter((q) => (q.rsi14 !== undefined && q.rsi14 <= 42) || q.changePercent <= -1.5)
        .sort((a, b) => (a.rsi14 ?? 50) - (b.rsi14 ?? 50));
    } else if (filter === 'buy_signals') {
      validQuotes = validQuotes
        .filter((q) => q.signal === 'STRONG_BUY' || q.signal === 'BUY')
        .sort((a, b) => b.signalScore - a.signalScore);
    } else if (filter === 'pullback') {
      validQuotes = validQuotes
        .filter((q) => q.tags.some((t) => t.includes('50 EMA') || t.includes('Pullback') || t.includes('Macro')))
        .sort((a, b) => b.signalScore - a.signalScore);
    } else if (filter === 'nifty50') {
      const n50Symbols = new Set(
        POPULAR_INDIAN_STOCKS.filter((s) => s.nifty50).map((s) => s.symbol)
      );
      validQuotes = validQuotes.filter((q) => n50Symbols.has(q.symbol));
    }

    const result = limit < validQuotes.length ? validQuotes.slice(0, limit) : validQuotes;

    return NextResponse.json({
      success: true,
      count: result.length,
      totalUniverse: allQuotes.length,
      data: result,
    });
  } catch (error: any) {
    console.error('Stocks screener API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to screen stocks' },
      { status: 500 }
    );
  }
}
