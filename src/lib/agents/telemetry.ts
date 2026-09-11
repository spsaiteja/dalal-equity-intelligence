import fs from 'fs';
import path from 'path';
import { AgentRole, AgentExecutionStatus } from '@/types/agent';
import { ConvictionType } from '@/types/stock';

export interface AgentExecutionLog {
  runId: string;
  agentName: string;
  role: AgentRole;
  executionTimeMs: number;
  retryCount: number;
  modelUsed: string;
  status: AgentExecutionStatus;
  isFallback: boolean;
  fallbackReason?: string;
  timestamp: string;
}

export interface DeliberationRunTelemetry {
  runId: string;
  timestamp: string;
  symbol: string;
  companyName: string;
  totalExecutionTimeMs: number;
  overallStatus: 'SUCCESS' | 'PARTIAL_FALLBACK' | 'FAILED';
  cioVerdict: ConvictionType;
  cioScore: number;
  agents: {
    sentinel: AgentExecutionLog;
    fundamental: AgentExecutionLog;
    newsScout: AgentExecutionLog;
    riskGuardian: AgentExecutionLog;
    cio: AgentExecutionLog;
  };
  toolsExecutedCount: number;
  model: string;
}

export interface TelemetrySummaryStats {
  totalDeliberations: number;
  successRatePercent: number;
  fallbackRatePercent: number;
  averageLatencyMs: number;
  modelDistribution: Record<string, number>;
  verdictDistribution: Record<string, number>;
  agentAverages: Record<
    string,
    {
      avgLatencyMs: number;
      successCount: number;
      fallbackCount: number;
    }
  >;
}

const REDIS_TELEMETRY_KEY = 'telemetry:agent_runs.json';
const MAX_STORED_RUNS = 50;

function getUpstashCredentials(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || 'https://proud-dogfish-111517.upstash.io').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAbOdAAIgcDE0MWVjNGMyM2YyNjU0MzJmYThiNGIzMGY0NTIwOWIxNw').trim();
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

function getLocalTelemetryFile(): string {
  const dir = process.env.VERCEL ? path.join('/tmp', 'dalal_telemetry') : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'telemetry_runs.json');
}

/**
 * Persists deliberation run telemetry to Upstash Redis and local disk (non-blocking fire-and-forget).
 */
export async function recordDeliberationTelemetry(telemetry: DeliberationRunTelemetry): Promise<void> {
  try {
    const existing = await getRecentTelemetryRuns(MAX_STORED_RUNS);
    const updated = [telemetry, ...existing.filter((r) => r.runId !== telemetry.runId)].slice(0, MAX_STORED_RUNS);

    const jsonStr = JSON.stringify(updated);

    // 1. Upstash Redis
    const upstash = getUpstashCredentials();
    if (upstash) {
      fetch(upstash.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstash.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', REDIS_TELEMETRY_KEY, jsonStr]),
      }).catch((err) => console.warn('[Telemetry] Redis write error:', err?.message));
    }

    // 2. Local fallback
    try {
      const filePath = getLocalTelemetryFile();
      fs.writeFileSync(filePath, jsonStr, 'utf8');
    } catch (e) {
      // ignore in read-only environments
    }
  } catch (err: any) {
    console.warn('[Telemetry] Record telemetry failed silently:', err?.message);
  }
}

/**
 * Retrieves recent telemetry runs from Redis or local disk
 */
export async function getRecentTelemetryRuns(limit: number = 20): Promise<DeliberationRunTelemetry[]> {
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
        body: JSON.stringify(['GET', REDIS_TELEMETRY_KEY]),
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.result && typeof body.result === 'string') {
          const parsed = JSON.parse(body.result);
          if (Array.isArray(parsed)) return parsed.slice(0, limit);
        }
      }
    } catch (err) {
      console.warn('[Telemetry] Redis read error; trying disk:', err);
    }
  }

  // 2. Try local disk
  try {
    const filePath = getLocalTelemetryFile();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.slice(0, limit);
    }
  } catch (err) {
    // ignore
  }

  return [];
}

/**
 * Calculates aggregate observability metrics
 */
export async function getTelemetryStats(): Promise<TelemetrySummaryStats> {
  const runs = await getRecentTelemetryRuns(MAX_STORED_RUNS);

  if (runs.length === 0) {
    return {
      totalDeliberations: 0,
      successRatePercent: 100,
      fallbackRatePercent: 0,
      averageLatencyMs: 0,
      modelDistribution: {},
      verdictDistribution: {},
      agentAverages: {
        sentinel: { avgLatencyMs: 0, successCount: 0, fallbackCount: 0 },
        fundamental: { avgLatencyMs: 0, successCount: 0, fallbackCount: 0 },
        newsScout: { avgLatencyMs: 0, successCount: 0, fallbackCount: 0 },
        riskGuardian: { avgLatencyMs: 0, successCount: 0, fallbackCount: 0 },
        cio: { avgLatencyMs: 0, successCount: 0, fallbackCount: 0 },
      },
    };
  }

  const total = runs.length;
  let totalLatency = 0;
  let successCount = 0;
  let fallbackCount = 0;
  const modelDist: Record<string, number> = {};
  const verdictDist: Record<string, number> = {};

  const agentStats: Record<string, { totalLatency: number; successCount: number; fallbackCount: number }> = {
    sentinel: { totalLatency: 0, successCount: 0, fallbackCount: 0 },
    fundamental: { totalLatency: 0, successCount: 0, fallbackCount: 0 },
    newsScout: { totalLatency: 0, successCount: 0, fallbackCount: 0 },
    riskGuardian: { totalLatency: 0, successCount: 0, fallbackCount: 0 },
    cio: { totalLatency: 0, successCount: 0, fallbackCount: 0 },
  };

  runs.forEach((r) => {
    totalLatency += r.totalExecutionTimeMs || 0;
    if (r.overallStatus === 'SUCCESS') successCount++;
    else fallbackCount++;

    const m = r.model || 'Unknown';
    modelDist[m] = (modelDist[m] || 0) + 1;

    const v = r.cioVerdict || 'UNKNOWN';
    verdictDist[v] = (verdictDist[v] || 0) + 1;

    // Agent breakdown
    Object.entries(r.agents || {}).forEach(([agentKey, log]) => {
      if (agentStats[agentKey] && log) {
        agentStats[agentKey].totalLatency += log.executionTimeMs || 0;
        if (log.status === 'success' && !log.isFallback) agentStats[agentKey].successCount++;
        else agentStats[agentKey].fallbackCount++;
      }
    });
  });

  const agentAverages: Record<string, { avgLatencyMs: number; successCount: number; fallbackCount: number }> = {};
  Object.entries(agentStats).forEach(([k, v]) => {
    agentAverages[k] = {
      avgLatencyMs: Math.round(v.totalLatency / total),
      successCount: v.successCount,
      fallbackCount: v.fallbackCount,
    };
  });

  return {
    totalDeliberations: total,
    successRatePercent: Math.round((successCount / total) * 100),
    fallbackRatePercent: Math.round((fallbackCount / total) * 100),
    averageLatencyMs: Math.round(totalLatency / total),
    modelDistribution: modelDist,
    verdictDistribution: verdictDist,
    agentAverages,
  };
}
