import fs from 'fs';
import path from 'path';
import { CouncilConsensus } from '@/types/agent';

export interface DeliberationMemoryEntry {
  runId: string;
  symbol: string;
  companyName: string;
  timestamp: string;
  price: number;
  cioVerdict: string;
  cioScore: number;
  debateSummary: string;
  cioExecutiveDirective: string;
  target1: string;
  stopLoss: string;
}

const MAX_HISTORY_PER_SYMBOL = 10;
const MAX_GLOBAL_HISTORY = 50;

function normalizeSymbol(symbol: string): string {
  return (symbol || '').toUpperCase().trim();
}

function getUpstashCredentials(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || 'https://proud-dogfish-111517.upstash.io').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAbOdAAIgcDE0MWVjNGMyM2YyNjU0MzJmYThiNGIzMGY0NTIwOWIxNw').trim();
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

function getLocalMemoryFile(): string {
  const dir = process.env.VERCEL ? path.join('/tmp', 'dalal_memory') : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'deliberations_memory.json');
}

interface LocalMemoryStore {
  bySymbol: Record<string, DeliberationMemoryEntry[]>;
  recent: DeliberationMemoryEntry[];
}

function readLocalMemory(): LocalMemoryStore {
  try {
    const file = getLocalMemoryFile();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        bySymbol: parsed.bySymbol || {},
        recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      };
    }
  } catch (err) {
    // ignore read error, fallback to empty
  }
  return { bySymbol: {}, recent: [] };
}

function writeLocalMemory(store: LocalMemoryStore): void {
  try {
    const file = getLocalMemoryFile();
    fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    // ignore in read-only environment
  }
}

/**
 * Asynchronously persists a completed deliberation consensus into memory.
 * Multi-tier: Upstash Redis REST + local disk cache. Non-blocking fire-and-forget.
 */
export async function saveDeliberationMemory(consensus: CouncilConsensus): Promise<void> {
  if (!consensus || !consensus.symbol) return;

  const sym = normalizeSymbol(consensus.symbol);
  const entry: DeliberationMemoryEntry = {
    runId: consensus.metadata?.runId || `run-${Date.now()}`,
    symbol: sym,
    companyName: consensus.companyName || sym,
    timestamp: consensus.timestamp || new Date().toISOString(),
    price: consensus.currentPrice || 0,
    cioVerdict: consensus.cioVerdict || 'NEUTRAL',
    cioScore: consensus.overallScore ?? 7,
    debateSummary: consensus.debateSummary || '',
    cioExecutiveDirective: consensus.cioExecutiveDirective || '',
    target1: consensus.tradeActionPlan?.target1 || 'N/A',
    stopLoss: consensus.tradeActionPlan?.stopLoss || 'N/A',
  };

  try {
    // 1. Local disk storage
    const localStore = readLocalMemory();
    const symbolList = localStore.bySymbol[sym] || [];
    const updatedSymbolList = [entry, ...symbolList.filter((e) => e.runId !== entry.runId)].slice(0, MAX_HISTORY_PER_SYMBOL);
    localStore.bySymbol[sym] = updatedSymbolList;

    const updatedGlobal = [entry, ...localStore.recent.filter((e) => e.runId !== entry.runId)].slice(0, MAX_GLOBAL_HISTORY);
    localStore.recent = updatedGlobal;

    writeLocalMemory(localStore);

    // 2. Upstash Redis (fire-and-forget)
    const upstash = getUpstashCredentials();
    if (upstash) {
      const symbolKey = `memory:deliberations:${sym}`;
      const globalKey = 'memory:recent_deliberations';

      // Pipeline write to Redis
      fetch(upstash.url + '/pipeline', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['SET', symbolKey, JSON.stringify(updatedSymbolList)],
          ['SET', globalKey, JSON.stringify(updatedGlobal)],
        ]),
      }).catch((err) => console.warn('[Memory] Redis write failed:', err?.message));
    }
  } catch (err: any) {
    console.warn('[Memory] saveDeliberationMemory error:', err?.message);
  }
}

/**
 * Retrieves the most recent prior deliberation for a stock.
 * Returns null if this is the first deliberation for this stock.
 */
export async function getPreviousDeliberation(symbol: string): Promise<DeliberationMemoryEntry | null> {
  const history = await getSymbolDeliberationHistory(symbol, 2);
  // Return the first entry that isn't from the current immediate moment (or the latest recorded)
  return history.length > 0 ? history[0] : null;
}

/**
 * Retrieves the deliberation history timeline for a given stock.
 */
export async function getSymbolDeliberationHistory(
  symbol: string,
  limit: number = MAX_HISTORY_PER_SYMBOL
): Promise<DeliberationMemoryEntry[]> {
  const sym = normalizeSymbol(symbol);
  if (!sym) return [];

  // 1. Try Upstash Redis
  const upstash = getUpstashCredentials();
  if (upstash) {
    try {
      const res = await fetch(upstash.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', `memory:deliberations:${sym}`]),
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.result && typeof body.result === 'string') {
          const parsed = JSON.parse(body.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, limit);
          }
        }
      }
    } catch (err) {
      // ignore and fallback to local disk
    }
  }

  // 2. Local disk fallback
  const localStore = readLocalMemory();
  const list = localStore.bySymbol[sym] || [];
  return list.slice(0, limit);
}

/**
 * Retrieves recent deliberations across all stocks to establish broad market regime context.
 */
export async function getRecentMarketDeliberations(limit: number = 5): Promise<DeliberationMemoryEntry[]> {
  // 1. Try Upstash Redis
  const upstash = getUpstashCredentials();
  if (upstash) {
    try {
      const res = await fetch(upstash.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', 'memory:recent_deliberations']),
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.result && typeof body.result === 'string') {
          const parsed = JSON.parse(body.result);
          if (Array.isArray(parsed)) {
            return parsed.slice(0, limit);
          }
        }
      }
    } catch (err) {
      // ignore and fallback to local disk
    }
  }

  // 2. Local disk fallback
  const localStore = readLocalMemory();
  return (localStore.recent || []).slice(0, limit);
}

/**
 * Retrieves all stored deliberations across all symbols for system-wide calibration.
 */
export async function getAllDeliberations(): Promise<DeliberationMemoryEntry[]> {
  const localStore = readLocalMemory();
  const map = new Map<string, DeliberationMemoryEntry>();

  for (const item of localStore.recent || []) {
    if (item.runId) map.set(item.runId, item);
  }

  for (const entries of Object.values(localStore.bySymbol || {})) {
    if (Array.isArray(entries)) {
      for (const item of entries) {
        if (item.runId) map.set(item.runId, item);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

