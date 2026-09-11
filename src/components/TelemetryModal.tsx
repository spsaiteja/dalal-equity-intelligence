'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Cpu,
  RefreshCw,
  Zap,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { DeliberationRunTelemetry, TelemetrySummaryStats } from '@/lib/agents/telemetry';

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRunId?: string;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({ isOpen, onClose, selectedRunId }) => {
  const [stats, setStats] = useState<TelemetrySummaryStats | null>(null);
  const [runs, setRuns] = useState<DeliberationRunTelemetry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(selectedRunId || null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/telemetry');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setRuns(data.recentRuns || []);
          if (selectedRunId) setExpandedRunId(selectedRunId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelemetry();
    }
  }, [isOpen, selectedRunId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">AI Engine Observability & Telemetry</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Production Tracing
                </span>
              </div>
              <p className="text-xs text-surface-muted">
                Real-time agent execution latency, retry counts, fallback distribution, and model failover traces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTelemetry}
              disabled={loading}
              className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface border border-surface-border transition-colors flex items-center gap-1.5 text-xs px-2.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading && !stats ? (
            <div className="py-20 text-center space-y-4">
              <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-surface-muted">Aggregating telemetry audit logs...</p>
            </div>
          ) : (
            <>
              {/* Executive KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface border border-surface-border p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-surface-muted block mb-1">
                    Total Deliberations
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{stats?.totalDeliberations || 0}</span>
                    <span className="text-[10px] text-cyan-400 font-semibold">Tracked runs</span>
                  </div>
                </div>

                <div className="bg-surface border border-surface-border p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-surface-muted block mb-1">
                    Overall Success Rate
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">
                      {stats?.successRatePercent ?? 100}%
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-surface border border-surface-border p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-surface-muted block mb-1">
                    Avg Deliberation Latency
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-cyan-400">
                      {stats?.averageLatencyMs || 0}
                      <span className="text-xs font-normal text-surface-muted">ms</span>
                    </span>
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                </div>

                <div className="bg-surface border border-surface-border p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-surface-muted block mb-1">
                    Fallback Rate
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-400">
                      {stats?.fallbackRatePercent ?? 0}%
                    </span>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Department Head Latency & Reliability Matrix */}
              {stats?.agentAverages && (
                <div className="bg-surface border border-surface-border rounded-xl p-4">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-surface-muted mb-3 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Per-Agent Performance & Latency Matrix</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(stats.agentAverages).map(([agent, data]) => (
                      <div key={agent} className="bg-surface-card p-3 rounded-lg border border-surface-border">
                        <span className="text-[10px] font-bold uppercase text-white block capitalize">
                          {agent}
                        </span>
                        <span className="text-lg font-black text-cyan-400 block my-1">
                          {data.avgLatencyMs}
                          <span className="text-[10px] font-normal text-surface-muted">ms</span>
                        </span>
                        <div className="flex items-center justify-between text-[9px] text-surface-muted">
                          <span className="text-emerald-400 font-bold">{data.successCount} succ</span>
                          <span className="text-amber-400 font-bold">{data.fallbackCount} fall</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Deliberation Runs Trace Table */}
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-surface-muted mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Recent Deliberation Traces (Last {runs.length} runs)</span>
                  </span>
                  <span className="text-[10px] text-surface-muted">Click row to inspect agent traces</span>
                </h4>

                {runs.length === 0 ? (
                  <div className="text-center py-8 text-surface-muted text-xs bg-surface rounded-xl border border-surface-border">
                    No recent deliberation runs logged yet. Summon the AI Council on any stock to record live traces.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {runs.map((r) => {
                      const isExpanded = expandedRunId === r.runId;
                      return (
                        <div
                          key={r.runId}
                          className="bg-surface border border-surface-border hover:border-cyan-500/40 rounded-xl overflow-hidden transition-all"
                        >
                          <div
                            onClick={() => setExpandedRunId(isExpanded ? null : r.runId)}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  r.overallStatus === 'SUCCESS' ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm font-bold text-white">{r.symbol}</strong>
                                  <span className="text-xs text-surface-muted font-normal hidden sm:inline">
                                    {r.companyName}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                      r.overallStatus === 'SUCCESS'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    {r.overallStatus}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-surface-muted">
                                  Run: {r.runId.slice(0, 13)}... | {new Date(r.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-[10px] text-surface-muted block text-right">Verdict</span>
                                <span className="font-bold text-purple-400">{r.cioVerdict} ({r.cioScore}/10)</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-surface-muted block">Duration</span>
                                <span className="font-mono font-bold text-cyan-400">{r.totalExecutionTimeMs}ms</span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Per-Agent Trace Breakdown */}
                          {isExpanded && (
                            <div className="border-t border-surface-border bg-surface-card p-4 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-[11px] text-surface-muted mb-2">
                                <span>Model: <strong className="text-white">{r.model}</strong></span>
                                <span>Tools Invoked: <strong className="text-cyan-400">{r.toolsExecutedCount}</strong></span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                {Object.entries(r.agents || {}).map(([roleKey, agentLog]) => (
                                  <div
                                    key={roleKey}
                                    className="bg-surface p-2.5 rounded-lg border border-surface-border space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <strong className="text-white capitalize">{agentLog.agentName || roleKey}</strong>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                          agentLog.status === 'success' && !agentLog.isFallback
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-amber-500/10 text-amber-400'
                                        }`}
                                      >
                                        {agentLog.isFallback ? 'Fallback' : agentLog.status}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-surface-muted flex justify-between">
                                      <span>Latency: <strong className="text-cyan-300">{agentLog.executionTimeMs}ms</strong></span>
                                      <span>Retries: {agentLog.retryCount || 0}</span>
                                    </div>
                                    {agentLog.fallbackReason && (
                                      <p className="text-[9px] text-amber-300/80 italic line-clamp-1" title={agentLog.fallbackReason}>
                                        {agentLog.fallbackReason}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
