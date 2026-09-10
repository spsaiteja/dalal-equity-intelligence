import fs from 'fs';
import path from 'path';
import { WatchlistItem } from '@/types/stock';
import { isVaultConfigured, readVaultFile, writeVaultFile } from './drive-vault';
import { encryptUserData, decryptUserData, getUserVaultHash } from './crypto-vault';

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

/**
 * Loads a user's personal watchlist and custom buckets.
 * Prioritizes Drive Vault (AES-256 decrypted) for cross-device synchronization,
 * falling back to local disk and standard defaults.
 */
export async function loadUserWatchlist(email?: string | null): Promise<{ watchlist: WatchlistItem[]; buckets: string[] }> {
  if (!email) {
    return loadWatchlistFromDisk();
  }

  const cleanEmail = email.trim().toLowerCase();
  const hash = getUserVaultHash(cleanEmail);
  const userWlFile = path.join(getDataDir(), `watchlist_${hash}.json`);

  // 1. Try reading direct JSON from Cloud Vault (Upstash Redis)
  if (isVaultConfigured()) {
    try {
      const jsonFilename = `watchlist_${hash}.json`;
      const rawJson = await readVaultFile(jsonFilename);
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.watchlist)) {
          ensureDataDir();
          try {
            fs.writeFileSync(userWlFile, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch {}
          return {
            watchlist: parsed.watchlist,
            buckets: parsed.buckets && parsed.buckets.length > 0 ? parsed.buckets : DEFAULT_BUCKETS,
          };
        }
      }
    } catch (e) {
      console.warn('Failed reading direct JSON watchlist from Cloud Vault:', e);
    }
  }

  // 2. Try reading AES-256 encrypted file from Vault if direct JSON not found
  if (isVaultConfigured()) {
    try {
      const vaultFilename = `wl_${hash}.enc`;
      const cipherText = await readVaultFile(vaultFilename);
      if (cipherText) {
        const decrypted = decryptUserData<{ watchlist: WatchlistItem[]; buckets?: string[] }>(cipherText, cleanEmail);
        if (decrypted && Array.isArray(decrypted.watchlist)) {
          ensureDataDir();
          try {
            fs.writeFileSync(userWlFile, JSON.stringify(decrypted, null, 2), 'utf-8');
          } catch {}
          // Immediately save as unencrypted direct JSON to Cloud Vault for future zero-decryption loads
          try {
            const jsonFilename = `watchlist_${hash}.json`;
            await writeVaultFile(jsonFilename, JSON.stringify(decrypted, null, 2), 'application/json');
          } catch {}
          return {
            watchlist: decrypted.watchlist,
            buckets: decrypted.buckets && decrypted.buckets.length > 0 ? decrypted.buckets : DEFAULT_BUCKETS,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load watchlist from Drive Vault:', e);
    }
  }

  // 3. Try reading from local per-user cache
  try {
    if (fs.existsSync(userWlFile)) {
      const raw = fs.readFileSync(userWlFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.watchlist) && parsed.watchlist.length > 0) {
        return {
          watchlist: parsed.watchlist,
          buckets: parsed.buckets && parsed.buckets.length > 0 ? parsed.buckets : DEFAULT_BUCKETS,
        };
      }
    }
  } catch (e) {}

  // 4. Fallback to standard disk watchlist
  return loadWatchlistFromDisk();
}

/**
 * Saves a user's personal watchlist and buckets to local disk and encrypts it
 * into the Google Drive Vault for seamless cross-device synchronization.
 */
export async function saveUserWatchlist(
  email: string | null | undefined,
  watchlist: WatchlistItem[],
  buckets?: string[]
): Promise<boolean> {
  // Always save to standard disk as a baseline
  saveWatchlistToDisk(watchlist, buckets);

  if (!email) return true;

  const cleanEmail = email.trim().toLowerCase();
  const hash = getUserVaultHash(cleanEmail);
  const payload = {
    watchlist,
    buckets: buckets && buckets.length > 0 ? buckets : DEFAULT_BUCKETS,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to local per-user file
  ensureDataDir();
  const userWlFile = path.join(getDataDir(), `watchlist_${hash}.json`);
  try {
    fs.writeFileSync(userWlFile, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (e) {}

  // 2. Save directly to Cloud Vault (Upstash Redis) as structured JSON
  if (isVaultConfigured()) {
    try {
      const jsonFilename = `watchlist_${hash}.json`;
      await writeVaultFile(jsonFilename, JSON.stringify(payload, null, 2), 'application/json');

      // Also maintain encrypted backup for Google Drive
      const vaultFilename = `wl_${hash}.enc`;
      const cipherText = encryptUserData(payload, cleanEmail);
      await writeVaultFile(vaultFilename, cipherText, 'text/plain');
    } catch (e) {
      console.error('Failed to save watchlist to Drive Vault:', e);
      return false;
    }
  }

  return true;
}
