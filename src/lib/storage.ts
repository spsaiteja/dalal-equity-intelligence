import fs from 'fs';
import path from 'path';
import { WatchlistItem } from '@/types/stock';

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function getWatchlistFile() {
  return path.join(getDataDir(), 'watchlist.json');
}

function getBucketsFile() {
  return path.join(getDataDir(), 'buckets.json');
}

function ensureDataDir() {
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('Warning: Could not create data dir:', err);
  }
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    id: '1',
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd.',
    bucket: 'Long-Term Value',
    addedPrice: 1650,
    targetPrice: 1950,
    stopLoss: 1540,
    notes: 'Accumulate near multi-year valuation support',
    addedAt: new Date().toISOString(),
  },
  {
    id: '2',
    symbol: 'TATAMOTORS.NS',
    name: 'Tata Motors Ltd.',
    bucket: 'Dip Opportunities',
    addedPrice: 980,
    targetPrice: 1200,
    stopLoss: 890,
    notes: 'Monitor JLR margin expansion and EV transition',
    addedAt: new Date().toISOString(),
  },
];

const DEFAULT_BUCKETS = ['Long-Term Value', 'Dip Opportunities', 'Momentum Breakouts'];

export function loadWatchlistFromDisk(): { watchlist: WatchlistItem[]; buckets: string[] } {
  try {
    ensureDataDir();

    let watchlist = DEFAULT_WATCHLIST;
    const wlFile = getWatchlistFile();
    const bkFile = getBucketsFile();

    if (fs.existsSync(wlFile)) {
      const raw = fs.readFileSync(wlFile, 'utf-8');
      watchlist = JSON.parse(raw);
    } else {
      try {
        fs.writeFileSync(wlFile, JSON.stringify(DEFAULT_WATCHLIST, null, 2), 'utf-8');
      } catch {}
    }

    let buckets = DEFAULT_BUCKETS;
    if (fs.existsSync(bkFile)) {
      const raw = fs.readFileSync(bkFile, 'utf-8');
      buckets = JSON.parse(raw);
    } else {
      try {
        fs.writeFileSync(bkFile, JSON.stringify(DEFAULT_BUCKETS, null, 2), 'utf-8');
      } catch {}
    }

    return { watchlist, buckets };
  } catch (error) {
    console.error('Error loading watchlist from disk:', error);
    return { watchlist: DEFAULT_WATCHLIST, buckets: DEFAULT_BUCKETS };
  }
}

export function saveWatchlistToDisk(watchlist: WatchlistItem[], buckets?: string[]) {
  try {
    ensureDataDir();
    const wlFile = getWatchlistFile();
    const bkFile = getBucketsFile();
    fs.writeFileSync(wlFile, JSON.stringify(watchlist, null, 2), 'utf-8');
    if (buckets && buckets.length > 0) {
      fs.writeFileSync(bkFile, JSON.stringify(buckets, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error saving watchlist to disk:', error);
  }
}

