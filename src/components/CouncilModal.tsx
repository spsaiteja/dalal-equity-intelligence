'use client';

import React, { useState } from 'react';
import { CouncilConsensus } from '@/types/agent';
import {
  X,
  Users,
  Shield,
  BarChart3,
  Newspaper,
  AlertOctagon,
  Award,
  Target,
  Clock,
  PieChart,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

interface CouncilModalProps {
  isOpen: boolean;
  onClose: () => void;
  consensus: CouncilConsensus | null;
  loading: boolean;
  symbol: string;
  onOpenOrderModal?: (stockSymbol: string, transactionType: 'BUY' | 'SELL', targetPrice?: string, stopLossPrice?: string) => void;
}

export const CouncilModal: React.FC<CouncilModalProps> = ({
  isOpen,
  onClose,
  consensus,
  loading,
  symbol,
  onOpenOrderModal,
}) => {
  const [activeAgentTab, setActiveAgentTab] = useState<'all' | 'sentinel' | 'fundamental' | 'news' | 'risk'>('all');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  AI Investment Council: {consensus?.companyName || symbol}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  5-Agent Committee
                </span>
              </div>
              <p className="text-xs text-surface-muted">
                Collaborative Deliberation: CIO, Sentinel, Fundamentalist, News Scout, and Risk Guardian
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
            <div className="py-20 text-center space-y-4">
              <div className="relative h-14 w-14 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-ping" />
                <div className="h-14 w-14 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Summoning the AI Investment Council...
                </p>
                <p className="text-xs text-surface-muted max-w-md mx-auto">
                  Sentinel, Fundamentalist, News Scout, and Risk Guardian are debating technicals, margins, news catalysts, and position sizing.
                </p>
              </div>
            </div>
          ) : consensus ? (
            <>
              {/* CIO Final Verdict Banner */}
              <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-surface border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">
                        Chief Investment Officer (CIO) Verdict
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">
                          {consensus.cioVerdict.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Score: {consensus.overallScore} / 10
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Current Price
                    </span>
                    <span className="text-xl font-black text-white">
                      ₹{consensus.currentPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* CIO Executive Directive */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                    Executive Directive
                  </span>
                  <p className="text-xs font-semibold text-white leading-relaxed bg-surface/60 p-3 rounded-xl border border-purple-500/20">
                    {consensus.cioExecutiveDirective}
                  </p>
                </div>

                {/* CIO Action Plan Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Target 1
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {consensus.tradeActionPlan.target1}
                    </span>
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Target 2
                    </span>
                    <span className="text-sm font-bold text-blue-400">
                      {consensus.tradeActionPlan.target2}
                    </span>
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Mandated Stop-Loss
                    </span>
                    <span className="text-sm font-bold text-rose-400">
                      {consensus.tradeActionPlan.stopLoss}
                    </span>
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Max Allocation
                    </span>
                    <span className="text-sm font-bold text-purple-300">
                      {consensus.tradeActionPlan.positionAllocation}
                    </span>
                  </div>
                </div>

                {/* 1-Click Order Execution Trigger */}
                {onOpenOrderModal && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-purple-200/90 font-medium">
                      Ready to trade with CIO price targets & stop-loss?
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenOrderModal(
                          consensus.symbol,
                          consensus.cioVerdict.includes('BUY') ? 'BUY' : 'SELL',
                          consensus.tradeActionPlan.target1,
                          consensus.tradeActionPlan.stopLoss
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all shrink-0 ${
                        consensus.cioVerdict.includes('BUY')
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                      }`}
                    >
                      <Zap className="h-4 w-4" />
                      <span>Execute 1-Click {consensus.cioVerdict.includes('BUY') ? 'Buy' : 'Sell'} Order</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Council Debate Summary */}
              <div className="bg-surface border border-surface-border rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-surface-muted block mb-1.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  <span>Committee Debate Synthesis</span>
                </span>
                <p className="text-xs text-surface-foreground leading-relaxed">
                  {consensus.debateSummary}
                </p>
              </div>

              {/* 4 Agent Department Cards */}
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-surface-muted mb-3">
                  Department Head Reports
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1. Sentinel (Technicals) */}
                  <div className="bg-surface border border-surface-border hover:border-blue-500/40 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-white">Agent Sentinel</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {consensus.agents.sentinel.stance}
                      </span>
                    </div>

                    <p className="text-xs text-surface-foreground mb-2.5">
                      {consensus.agents.sentinel.headlineTakeaway}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-surface-card p-2 rounded-lg border border-surface-border mb-2.5">
                      <div>
                        <span className="text-surface-muted block">Immediate Support:</span>
                        <strong className="text-white">{consensus.agents.sentinel.keyLevels.immediateSupport}</strong>
                      </div>
                      <div>
                        <span className="text-surface-muted block">Immediate Resistance:</span>
                        <strong className="text-white">{consensus.agents.sentinel.keyLevels.immediateResistance}</strong>
                      </div>
                    </div>

                    <ul className="space-y-1 text-[11px] text-surface-muted">
                      {consensus.agents.sentinel.arguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 2. Fundamentalist (Valuation) */}
                  <div className="bg-surface border border-surface-border hover:border-emerald-500/40 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-white">Agent Fundamentalist</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {consensus.agents.fundamental.stance}
                      </span>
                    </div>

                    <p className="text-xs text-surface-foreground mb-2.5">
                      {consensus.agents.fundamental.headlineTakeaway}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-surface-card p-2 rounded-lg border border-surface-border mb-2.5">
                      <div>
                        <span className="text-surface-muted block">Margin of Safety:</span>
                        <strong className="text-emerald-400">+{consensus.agents.fundamental.estimatedMarginOfSafetyPercent}%</strong>
                      </div>
                      <div>
                        <span className="text-surface-muted block">Balance Sheet:</span>
                        <strong className="text-white">{consensus.agents.fundamental.balanceSheetHealth}</strong>
                      </div>
                    </div>

                    <ul className="space-y-1 text-[11px] text-surface-muted">
                      {consensus.agents.fundamental.arguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. News Scout (Sentiment) */}
                  <div className="bg-surface border border-surface-border hover:border-amber-500/40 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Newspaper className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-white">Agent News Scout</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {consensus.agents.newsScout.stance}
                      </span>
                    </div>

                    <p className="text-xs text-surface-foreground mb-2.5">
                      {consensus.agents.newsScout.headlineTakeaway}
                    </p>

                    <div className="space-y-1.5 mb-2.5">
                      {consensus.agents.newsScout.catalystsIdentified.map((cat, i) => (
                        <div key={i} className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-1.5 rounded-lg flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          <span>{cat}</span>
                        </div>
                      ))}
                    </div>

                    <ul className="space-y-1 text-[11px] text-surface-muted">
                      {consensus.agents.newsScout.arguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Risk Guardian (Downside Protection) */}
                  <div className="bg-surface border border-surface-border hover:border-rose-500/40 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                          <AlertOctagon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-white">Agent Risk Guardian</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {consensus.agents.riskGuardian.riskRating}
                      </span>
                    </div>

                    <p className="text-xs text-surface-foreground mb-2.5">
                      {consensus.agents.riskGuardian.headlineTakeaway}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-surface-card p-2 rounded-lg border border-surface-border mb-2.5">
                      <div>
                        <span className="text-surface-muted block">Mandated Stop-Loss:</span>
                        <strong className="text-rose-400">{consensus.agents.riskGuardian.mandatedStopLoss}</strong>
                      </div>
                      <div>
                        <span className="text-surface-muted block">Max Position Size:</span>
                        <strong className="text-white">{consensus.agents.riskGuardian.recommendedMaxPositionPercent}% Portfolio</strong>
                      </div>
                    </div>

                    <ul className="space-y-1 text-[11px] text-surface-muted">
                      {consensus.agents.riskGuardian.arguments.map((arg, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-surface-muted py-8">
              No council deliberation data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

