'use client';

import React, { useState } from 'react';
import {
  PortfolioAuditReport,
  RebalanceAction,
  SectorWeight,
} from '@/types/upstox';
import {
  X,
  Shield,
  Award,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Users,
  CheckCircle,
  AlertOctagon,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
} from 'lucide-react';

interface PortfolioAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PortfolioAuditReport | null;
  loading: boolean;
}

export const PortfolioAuditModal: React.FC<PortfolioAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'rebalancing' | 'sectors' | 'agents'>('rebalancing');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">AI Council Portfolio Audit</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  5-Agent Committee
                </span>
              </div>
              <p className="text-xs text-surface-muted">
                Holistic Health Check: Risk Exposure, Sector Concentration & Rebalancing Directive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center space-y-4">
              <div className="relative h-14 w-14 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-ping" />
                <div className="h-14 w-14 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Auditing Demat Portfolio with 5 AI Agents...
                </p>
                <p className="text-xs text-surface-muted max-w-md mx-auto">
                  Risk Guardian, Sentinel, Fundamentalist, News Scout, and CIO are evaluating your holdings, allocations, and profit-booking targets.
                </p>
              </div>
            </div>
          ) : report ? (
            <>
              {/* Overall Health Score Banner */}
              <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-surface border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Award className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                          Portfolio Health Verdict
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white">{report.healthStatus}</h2>
                    </div>
                  </div>

                  {/* Score Gauge */}
                  {(() => {
                    const rawScore = Number(report.overallHealthScore) || 8.0;
                    const score = rawScore > 10 ? rawScore / 10 : rawScore;
                    const displayScore = parseFloat(score.toFixed(1));
                    const displayPct = Math.min(100, Math.max(0, Math.round(displayScore * 10)));

                    return (
                      <div className="flex items-center gap-3 bg-surface/80 border border-purple-500/30 rounded-xl px-4 py-2.5">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-surface-muted">
                            Health Score
                          </div>
                          <div className="text-2xl font-black text-purple-400 leading-none">
                            {displayScore}
                            <span className="text-xs font-normal text-surface-muted">/10</span>
                          </div>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-sm">
                          {displayPct}%
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* CIO Directive */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Chief Investment Officer Directive
                  </div>
                  <p className="text-sm text-surface-text leading-relaxed font-medium">
                    {report.cioExecutiveSummary}
                  </p>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-surface-border pb-3">
                <button
                  onClick={() => setActiveTab('rebalancing')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'rebalancing'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-surface-muted hover:text-white bg-surface'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Actionable Rebalancing Plan</span>
                </button>
                <button
                  onClick={() => setActiveTab('sectors')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'sectors'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-surface-muted hover:text-white bg-surface'
                  }`}
                >
                  <PieChart className="h-3.5 w-3.5" />
                  <span>Sector Allocation</span>
                </button>
                <button
                  onClick={() => setActiveTab('agents')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'agents'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-surface-muted hover:text-white bg-surface'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>4 Department Head Audits</span>
                </button>
              </div>

              {/* Tab 1: Rebalancing Plan */}
              {activeTab === 'rebalancing' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-surface-border rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface/80 text-surface-muted font-bold uppercase tracking-wider text-[10px] border-b border-surface-border">
                        <tr>
                          <th className="py-2.5 px-3">Holding</th>
                          <th className="py-2.5 px-3">Weight</th>
                          <th className="py-2.5 px-3 text-center">Council Action</th>
                          <th className="py-2.5 px-3">Target Price</th>
                          <th className="py-2.5 px-3">Stop-Loss</th>
                          <th className="py-2.5 px-3">Strategic Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {report.rebalancingPlan.map((item, idx) => {
                          let actionBadge = 'bg-surface text-surface-muted border-surface-border';
                          if (item.action.includes('ACCUMULATE') || item.action === 'STRONG_ACCUMULATE') {
                            actionBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                          } else if (item.action.includes('PROFIT')) {
                            actionBadge = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                          } else if (item.action.includes('EXIT')) {
                            actionBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                          }

                          return (
                            <tr key={idx} className="hover:bg-surface-hover/80 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-white">
                                {item.company_name}{' '}
                                <span className="text-[10px] font-normal text-surface-muted">
                                  ({item.symbol})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {item.allocationWeightPercent}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${actionBadge}`}>
                                  {item.action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-emerald-400 font-semibold font-mono">
                                {item.targetPrice || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-rose-400 font-semibold font-mono">
                                {item.stopLoss || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-surface-text text-[11px] max-w-xs">
                                {item.recommendedActionNote}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Sector Allocation */}
              {activeTab === 'sectors' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {report.sectorWeights.map((sec, idx) => {
                      let badge = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                      if (sec.riskRating === 'Overweight') {
                        badge = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                      }

                      return (
                        <div
                          key={idx}
                          className="bg-surface border border-surface-border rounded-xl p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{sec.sector}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badge}`}>
                              {sec.riskRating}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-surface-muted">
                              ₹{sec.investedAmount.toLocaleString('en-IN')}
                            </span>
                            <span className="font-black text-white">{sec.percentage}%</span>
                          </div>

                          <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                sec.percentage > 35
                                  ? 'bg-amber-500'
                                  : sec.percentage > 20
                                  ? 'bg-blue-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(100, sec.percentage * 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Department Findings */}
              {activeTab === 'agents' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Risk Guardian */}
                  <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-surface-border/60 pb-2">
                      <div className="h-7 w-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <AlertOctagon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Risk Guardian</div>
                        <div className="text-[10px] text-surface-muted">
                          Diversification Score: {report.agentAudits.riskGuardian.diversificationScore}/100
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-surface-text">
                      <strong>Top Concentration Risk:</strong> {report.agentAudits.riskGuardian.topRiskHolding}
                    </p>
                    <ul className="text-[11px] text-surface-muted space-y-1 list-disc list-inside">
                      {report.agentAudits.riskGuardian.mandatedRiskAdjustments.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Sentinel */}
                  <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-surface-border/60 pb-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Sentinel Agent</div>
                        <div className="text-[10px] text-surface-muted">
                          Stance: {report.agentAudits.sentinel.stance}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-surface-text leading-relaxed">
                      {report.agentAudits.sentinel.technicalAlert}
                    </p>
                  </div>

                  {/* Fundamentalist */}
                  <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-surface-border/60 pb-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Agent Fundamentalist</div>
                        <div className="text-[10px] text-surface-muted">
                          Portfolio Valuation: {report.agentAudits.fundamental.portfolioPeEstimate}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-surface-text leading-relaxed">
                      {report.agentAudits.fundamental.valuationAssessment}
                    </p>
                  </div>

                  {/* News Scout */}
                  <div className="bg-surface border border-surface-border rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-surface-border/60 pb-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">News Scout Agent</div>
                        <div className="text-[10px] text-surface-muted">
                          Macro Sentiment: {report.agentAudits.newsScout.headlineSentiment}
                        </div>
                      </div>
                    </div>
                    <ul className="text-[11px] text-surface-muted space-y-1 list-disc list-inside">
                      {report.agentAudits.newsScout.catalystsIdentified.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-surface-muted">
              No audit report generated. Click &ldquo;Run AI Portfolio Audit&rdquo; to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
