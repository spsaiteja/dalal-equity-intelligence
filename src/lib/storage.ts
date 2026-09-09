import fs from 'fs';
import path from 'path';
import { WatchlistItem } from '@/types/stock';

const DATA_DIR = path.join(process.cwd(), 'data');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');
const BUCKETS_FILE = path.join(DATA_DIR, 'buckets.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
    if (fs.existsSync(WATCHLIST_FILE)) {
      const raw = fs.readFileSync(WATCHLIST_FILE, 'utf-8');
      watchlist = JSON.parse(raw);
    } else {
      fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(DEFAULT_WATCHLIST, null, 2), 'utf-8');
    }

    let buckets = DEFAULT_BUCKETS;
    if (fs.existsSync(BUCKETS_FILE)) {
      const raw = fs.readFileSync(BUCKETS_FILE, 'utf-8');
      buckets = JSON.parse(raw);
    } else {
      fs.writeFileSync(BUCKETS_FILE, JSON.stringify(DEFAULT_BUCKETS, null, 2), 'utf-8');
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
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2), 'utf-8');
    if (buckets && buckets.length > 0) {
      fs.writeFileSync(BUCKETS_FILE, JSON.stringify(buckets, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error saving watchlist to disk:', error);
  }
}

