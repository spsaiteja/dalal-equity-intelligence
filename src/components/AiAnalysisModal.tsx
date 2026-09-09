'use client';

import React from 'react';
import { AiStockAnalysis } from '@/types/stock';
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Target,
  Clock,
  TrendingUp,
  Flame,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AiStockAnalysis | null;
  loading: boolean;
  symbol: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  loading,
  symbol,
}) => {
  if (!isOpen) return null;

  const isOpportunity =
    analysis?.dipClassification.category === 'Bargain Opportunity' ||
    analysis?.dipClassification.category === 'Fair Value Pullback';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Gemini Deep Dive: {analysis?.companyName || symbol}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  {symbol.replace('.NS', '')}
                </span>
              </div>
              <p className="text-xs text-surface-muted">
                Opportunity vs. Value Trap Intelligence & Quantitative Trade Plan
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">Gemini is synthesizing stock metrics & news...</p>
              <p className="text-xs text-surface-muted">
                Evaluating 52-week distance, technical momentum, and corporate drivers
              </p>
            </div>
          ) : analysis ? (
            <>
              {/* Top Banner: Bargain vs Value Trap & Score */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isOpportunity
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isOpportunity ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    )}
                    <span className="text-xs uppercase tracking-wider font-extrabold text-surface-muted">
                      Classification:
                    </span>
                    <span
                      className={`text-sm font-black ${
                        isOpportunity ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {analysis.dipClassification.category}
                    </span>
                  </div>
                  <p className="text-xs text-surface-foreground leading-relaxed max-w-xl">
                    {analysis.dipClassification.explanation}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-surface-border pt-2 sm:pt-0">
                  <span className="text-[10px] text-surface-muted uppercase font-bold">
                    Conviction Score
                  </span>
                  <div className="text-2xl font-black text-white">
                    {analysis.convictionScore}
                    <span className="text-xs text-surface-muted font-normal"> / 10</span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      analysis.conviction.includes('BUY')
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {analysis.conviction.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Trade Setup Matrix */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-surface-muted mb-3 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-market-blue" />
                  <span>Actionable Trade Plan (NSE / INR)</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Recommended Entry
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {analysis.tradePlan.recommendedEntryZone}
                    </span>
                  </div>

                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Target 1 (Primary)
                    </span>
                    <span className="text-sm font-bold text-blue-400">
                      {analysis.tradePlan.target1}
                    </span>
                  </div>

                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Target 2 (Extended)
                    </span>
                    <span className="text-sm font-bold text-indigo-400">
                      {analysis.tradePlan.target2}
                    </span>
                  </div>

                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Strict Stop-Loss
                    </span>
                    <span className="text-sm font-bold text-rose-400">
                      {analysis.tradePlan.stopLoss}
                    </span>
                  </div>

                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Risk / Reward
                    </span>
                    <span className="text-sm font-bold text-white">
                      {analysis.tradePlan.riskRewardRatio}
                    </span>
                  </div>

                  <div className="bg-surface border border-surface-border rounded-xl p-3">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Time Horizon
                    </span>
                    <span className="text-sm font-bold text-white">
                      {analysis.tradePlan.timeHorizon}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catalysts & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Catalysts */}
                <div className="bg-surface border border-surface-border rounded-xl p-4">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span>Upside Catalysts</span>
                  </h5>
                  <ul className="space-y-2 text-xs text-surface-foreground">
                    {analysis.catalysts.map((cat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold mt-0.5">•</span>
                        <span>{cat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div className="bg-surface border border-surface-border rounded-xl p-4">
                  <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Key Downside Risks</span>
                  </h5>
                  <ul className="space-y-2 text-xs text-surface-foreground">
                    {analysis.downsideRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-surface border border-surface-border rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted block mb-1">
                  Gemini Analyst Takeaway
                </span>
                <p className="text-xs text-white leading-relaxed">
                  {analysis.aiExecutiveSummary}
                </p>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-surface-muted py-8">
              No analysis data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

