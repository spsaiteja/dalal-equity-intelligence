import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ApprovalDecision,
  TradePlanParameters,
  HumanOverridePayload,
  ApprovalRecord,
} from '@/types/approval';

const MAX_HISTORY_PER_SYMBOL = 20;
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

function getLocalAuditFile(): string {
  const dir = process.env.VERCEL ? path.join('/tmp', 'dalal_audit') : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'approvals_audit.json');
}

interface LocalAuditStore {
  bySymbol: Record<string, ApprovalRecord[]>;
  recent: ApprovalRecord[];
}

function readLocalAudit(): LocalAuditStore {
  try {
    const file = getLocalAuditFile();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        bySymbol: parsed.bySymbol || {},
        recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      };
    }
  } catch (err) {
    // ignore read error
  }
  return { bySymbol: {}, recent: [] };
}

function writeLocalAudit(store: LocalAuditStore): void {
  try {
    const file = getLocalAuditFile();
    fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    // ignore in read-only environment
  }
}

/**
 * Checks if the human-refined plan diverges from the original AI plan in any parameter.
 */
export function hasPlanBeenModified(
  original: TradePlanParameters,
  human: TradePlanParameters
): boolean {
  if (!original || !human) return false;
  return Boolean(
    original.target1 !== human.target1 ||
    original.target2 !== human.target2 ||
    original.stopLoss !== human.stopLoss ||
    original.positionAllocation !== human.positionAllocation ||
    (original.verdict && human.verdict && original.verdict !== human.verdict)
  );
}

/**
 * Records an operator approval, override, or veto decision.
 * Persists dual-tier to Upstash Redis and local audit trail.
 */
export async function recordApprovalDecision(
  payload: HumanOverridePayload
): Promise<ApprovalRecord> {
  const sym = normalizeSymbol(payload.symbol);
  const isModified = hasPlanBeenModified(payload.originalPlan, payload.humanPlan);
  const approvalId = `appr-${crypto.randomUUID().slice(0, 12)}`;
  const timestamp = payload.timestamp || new Date().toISOString();

  let decision = payload.decision;
  if (decision === 'APPROVED_AS_IS' && isModified) {
    decision = 'MODIFIED_BY_HUMAN';
  }

  const record: ApprovalRecord = {
    ...payload,
    approvalId,
    timestamp,
    isModified,
    decision,
  };

  try {
    // 1. Local disk audit persistence
    const localStore = readLocalAudit();
    const symbolList = localStore.bySymbol[sym] || [];
    localStore.bySymbol[sym] = [record, ...symbolList].slice(0, MAX_HISTORY_PER_SYMBOL);
    localStore.recent = [record, ...localStore.recent].slice(0, MAX_GLOBAL_HISTORY);
    writeLocalAudit(localStore);

    // 2. Upstash Redis persistence (fire-and-forget)
    const upstash = getUpstashCredentials();
    if (upstash) {
      const symbolKey = `approvals:${sym}`;
      const globalKey = 'approvals:recent';

      fetch(upstash.url + '/pipeline', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['SET', symbolKey, JSON.stringify(localStore.bySymbol[sym])],
          ['SET', globalKey, JSON.stringify(localStore.recent)],
        ]),
      }).catch((err) => console.warn('[Approval] Redis audit sync error:', err?.message));
    }
  } catch (err: any) {
    console.warn('[Approval] recordApprovalDecision error:', err?.message);
  }

  return record;
}

/**
 * Retrieves approval audit records for a specific symbol or globally.
 */
export async function getApprovalHistory(
  symbol?: string,
  limit: number = 20
): Promise<ApprovalRecord[]> {
  const sym = symbol ? normalizeSymbol(symbol) : undefined;

  // 1. Try Upstash Redis
  const upstash = getUpstashCredentials();
  if (upstash) {
    try {
      const key = sym ? `approvals:${sym}` : 'approvals:recent';
      const res = await fetch(upstash.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', key]),
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
    } catch {
      // fallback to local disk
    }
  }

  // 2. Local disk fallback
  const localStore = readLocalAudit();
  if (sym) {
    return (localStore.bySymbol[sym] || []).slice(0, limit);
  }
  return (localStore.recent || []).slice(0, limit);
}
