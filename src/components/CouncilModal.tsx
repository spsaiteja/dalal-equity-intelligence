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
  ShieldCheck,
  ShieldAlert,
  History,
  Edit3,
  RotateCcw,
  Ban,
  Check,
} from 'lucide-react';

interface CouncilModalProps {
  isOpen: boolean;
  onClose: () => void;
  consensus: CouncilConsensus | null;
  loading: boolean;
  symbol: string;
  onOpenOrderModal?: (stockSymbol: string, transactionType: 'BUY' | 'SELL', targetPrice?: string, stopLossPrice?: string) => void;
  onOpenTelemetry?: (runId?: string) => void;
}

export const CouncilModal: React.FC<CouncilModalProps> = ({
  isOpen,
  onClose,
  consensus,
  loading,
  symbol,
  onOpenOrderModal,
  onOpenTelemetry,
}) => {
  const [activeAgentTab, setActiveAgentTab] = useState<'all' | 'sentinel' | 'fundamental' | 'news' | 'risk'>('all');

  // Phase 8: Human-in-the-Loop Override & Approval State
  const [isCustomizingPlan, setIsCustomizingPlan] = useState<boolean>(false);
  const [customTarget1, setCustomTarget1] = useState<string>('');
  const [customTarget2, setCustomTarget2] = useState<string>('');
  const [customStopLoss, setCustomStopLoss] = useState<string>('');
  const [customAllocation, setCustomAllocation] = useState<string>('');
  const [isVetoed, setIsVetoed] = useState<boolean>(false);
  const [vetoReason, setVetoReason] = useState<string>('');
  const [showVetoInput, setShowVetoInput] = useState<boolean>(false);

  React.useEffect(() => {
    if (consensus?.tradeActionPlan) {
      setCustomTarget1(consensus.tradeActionPlan.target1 || '');
      setCustomTarget2(consensus.tradeActionPlan.target2 || '');
      setCustomStopLoss(consensus.tradeActionPlan.stopLoss || '');
      setCustomAllocation(consensus.tradeActionPlan.positionAllocation || '');
      setIsCustomizingPlan(false);
      setIsVetoed(false);
      setShowVetoInput(false);
      setVetoReason('');
    }
  }, [consensus]);

  const isPlanModified = Boolean(
    consensus?.tradeActionPlan && (
      customTarget1 !== (consensus.tradeActionPlan.target1 || '') ||
      customTarget2 !== (consensus.tradeActionPlan.target2 || '') ||
      customStopLoss !== (consensus.tradeActionPlan.stopLoss || '') ||
      customAllocation !== (consensus.tradeActionPlan.positionAllocation || '')
    )
  );

  const handleResetPlan = () => {
    if (consensus?.tradeActionPlan) {
      setCustomTarget1(consensus.tradeActionPlan.target1 || '');
      setCustomTarget2(consensus.tradeActionPlan.target2 || '');
      setCustomStopLoss(consensus.tradeActionPlan.stopLoss || '');
      setCustomAllocation(consensus.tradeActionPlan.positionAllocation || '');
      setIsCustomizingPlan(false);
    }
  };

  const handleExecuteOrder = async () => {
    if (!onOpenOrderModal || !consensus) return;

    try {
      fetch('/api/ai/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: consensus.metadata?.runId,
          symbol: consensus.symbol,
          originalPlan: {
            target1: consensus.tradeActionPlan?.target1 || '',
            target2: consensus.tradeActionPlan?.target2 || '',
            stopLoss: consensus.tradeActionPlan?.stopLoss || '',
            positionAllocation: consensus.tradeActionPlan?.positionAllocation || '',
            verdict: consensus.cioVerdict,
          },
          humanPlan: {
            target1: customTarget1,
            target2: customTarget2,
            stopLoss: customStopLoss,
            positionAllocation: customAllocation,
            verdict: consensus.cioVerdict,
          },
          decision: isPlanModified ? 'MODIFIED_BY_HUMAN' : 'APPROVED_AS_IS',
          overrideReason: isPlanModified ? 'Operator customized parameters via HITL mode' : undefined,
        }),
      }).catch((e) => console.warn('[Approval] POST failed:', e));
    } catch {
      // non-blocking
    }

    onOpenOrderModal(
      consensus.symbol,
      (consensus.cioVerdict || '').includes('BUY') ? 'BUY' : 'SELL',
      customTarget1,
      customStopLoss
    );
  };

  const handleConfirmVeto = async () => {
    if (!consensus) return;
    setIsVetoed(true);
    setShowVetoInput(false);

    try {
      fetch('/api/ai/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: consensus.metadata?.runId,
          symbol: consensus.symbol,
          originalPlan: {
            target1: consensus.tradeActionPlan?.target1 || '',
            target2: consensus.tradeActionPlan?.target2 || '',
            stopLoss: consensus.tradeActionPlan?.stopLoss || '',
            positionAllocation: consensus.tradeActionPlan?.positionAllocation || '',
            verdict: consensus.cioVerdict,
          },
          humanPlan: {
            target1: customTarget1,
            target2: customTarget2,
            stopLoss: customStopLoss,
            positionAllocation: customAllocation,
            verdict: 'VETOED',
          },
          decision: 'VETOED_BY_HUMAN',
          overrideReason: vetoReason || 'Operator vetoed committee directive',
        }),
      }).catch((e) => console.warn('[Approval] Veto POST failed:', e));
    } catch {
      // non-blocking
    }
  };

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
                          {(consensus.cioVerdict || 'NEUTRAL').replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Score: {consensus.overallScore ?? 7} / 10
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block">
                      Current Price
                    </span>
                    <span className="text-xl font-black text-white">
                      ₹{(consensus.currentPrice ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* CIO Executive Directive */}
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                    Executive Directive
                  </span>
                  <p className="text-xs font-semibold text-white leading-relaxed bg-surface/60 p-3 rounded-xl border border-purple-500/20">
                    {consensus.cioExecutiveDirective || 'Hold existing allocations and observe market structure.'}
                  </p>
                </div>

                {/* CIO Action Plan Matrix Header with HITL Controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                      Institutional Trade Action Plan
                    </span>
                    {isVetoed ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <Ban className="h-2.5 w-2.5" />
                        Vetoed by Operator
                      </span>
                    ) : isPlanModified ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Edit3 className="h-2.5 w-2.5" />
                        Human Refined (HITL Active)
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        AI Recommended Baseline
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPlanModified && !isVetoed && (
                      <button
                        type="button"
                        onClick={handleResetPlan}
                        className="text-[10px] text-surface-muted hover:text-white px-2 py-0.5 rounded bg-surface border border-surface-border flex items-center gap-1 transition-colors"
                        title="Reset to original AI committee parameters"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Reset
                      </button>
                    )}
                    {!isVetoed && (
                      <button
                        type="button"
                        onClick={() => setIsCustomizingPlan(!isCustomizingPlan)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                          isCustomizingPlan
                            ? 'bg-cyan-500 text-black border-cyan-400'
                            : 'bg-surface hover:bg-surface-border text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        <Edit3 className="h-3 w-3" />
                        {isCustomizingPlan ? 'Done Customizing' : 'Customize Plan'}
                      </button>
                    )}
                    {!isVetoed && !showVetoInput && (
                      <button
                        type="button"
                        onClick={() => setShowVetoInput(true)}
                        className="text-[10px] text-surface-muted hover:text-rose-400 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                        title="Veto this recommendation"
                      >
                        <Ban className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Veto Rationale Gate */}
                {showVetoInput && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-rose-300 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5 text-rose-400" />
                        Operator Veto Confirmation
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowVetoInput(false)}
                        className="text-surface-muted hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-surface-muted">
                      Vetoing suppresses the execution directive and documents your rationale in the compliance audit log.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reason for veto (e.g. Earnings event risk, Sector cap reached)..."
                        value={vetoReason}
                        onChange={(e) => setVetoReason(e.target.value)}
                        className="flex-1 bg-surface-card border border-rose-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-surface-muted focus:outline-none focus:border-rose-400"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmVeto}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors"
                      >
                        Confirm Veto
                      </button>
                    </div>
                  </div>
                )}

                {/* CIO Action Plan Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                      Target 1
                    </span>
                    {isCustomizingPlan ? (
                      <input
                        type="text"
                        value={customTarget1}
                        onChange={(e) => setCustomTarget1(e.target.value)}
                        className="w-full bg-surface-card border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-emerald-400 font-bold focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-emerald-400">
                        {customTarget1 || consensus.tradeActionPlan?.target1 || 'N/A'}
                      </span>
                    )}
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                      Target 2
                    </span>
                    {isCustomizingPlan ? (
                      <input
                        type="text"
                        value={customTarget2}
                        onChange={(e) => setCustomTarget2(e.target.value)}
                        className="w-full bg-surface-card border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-blue-400 font-bold focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-blue-400">
                        {customTarget2 || consensus.tradeActionPlan?.target2 || 'N/A'}
                      </span>
                    )}
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                      Mandated Stop-Loss
                    </span>
                    {isCustomizingPlan ? (
                      <input
                        type="text"
                        value={customStopLoss}
                        onChange={(e) => setCustomStopLoss(e.target.value)}
                        className="w-full bg-surface-card border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-rose-400 font-bold focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-rose-400">
                        {customStopLoss || consensus.tradeActionPlan?.stopLoss || 'N/A'}
                      </span>
                    )}
                  </div>

                  <div className="bg-surface/80 border border-surface-border rounded-xl p-2.5">
                    <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                      Max Allocation
                    </span>
                    {isCustomizingPlan ? (
                      <input
                        type="text"
                        value={customAllocation}
                        onChange={(e) => setCustomAllocation(e.target.value)}
                        className="w-full bg-surface-card border border-cyan-500/40 rounded px-2 py-0.5 text-xs text-purple-300 font-bold focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-purple-300">
                        {customAllocation || consensus.tradeActionPlan?.positionAllocation || '5% Portfolio'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1-Click Order Execution Trigger */}
                {onOpenOrderModal && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-purple-200/90 font-medium">
                      {isVetoed
                        ? 'Recommendation vetoed by operator. Execution suppressed.'
                        : isPlanModified
                        ? 'Operator refined trade plan ready for execution.'
                        : 'Ready to trade with CIO price targets & stop-loss?'}
                    </div>
                    {isVetoed ? (
                      <div className="px-4 py-2 rounded-xl bg-surface border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                        <Ban className="h-4 w-4 text-rose-400" />
                        <span>Execution Vetoed</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleExecuteOrder}
                        className={`px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all shrink-0 ${
                          (consensus.cioVerdict || '').includes('BUY')
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                            : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        <span>
                          Execute {isPlanModified ? 'Customized' : '1-Click'}{' '}
                          {(consensus.cioVerdict || '').includes('BUY') ? 'Buy' : 'Sell'} Order
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Committee Memory: Historical Deliberation Trajectory */}
              {consensus.metadata?.previousRun && (
                <div className="bg-gradient-to-r from-purple-950/30 via-surface to-surface border border-purple-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Prior Committee Review</span>
                        <span className="text-[10px] text-surface-muted">
                          ({consensus.metadata.previousRun.elapsedTimeText})
                        </span>
                      </div>
                      <div className="text-[11px] text-surface-muted flex items-center gap-2 mt-0.5">
                        <span>Prior Price: <strong className="text-white">₹{consensus.metadata.previousRun.price.toLocaleString('en-IN')}</strong></span>
                        <span className="text-surface-border">•</span>
                        <span>Verdict: <strong className="text-purple-300">{consensus.metadata.previousRun.cioVerdict}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:text-right">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-surface-muted block">Trajectory Return</span>
                      <span
                        className={`text-xs font-black flex items-center gap-1 sm:justify-end ${
                          consensus.metadata.previousRun.priceDeltaPercent >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {consensus.metadata.previousRun.priceDeltaPercent >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {consensus.metadata.previousRun.priceDeltaPercent >= 0 ? '+' : ''}
                        {consensus.metadata.previousRun.priceDeltaPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                        {consensus.agents.sentinel.isFallback && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={consensus.agents.sentinel.fallbackReason}>
                            Fallback
                          </span>
                        )}
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
                        {consensus.agents.fundamental.isFallback && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={consensus.agents.fundamental.fallbackReason}>
                            Fallback
                          </span>
                        )}
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
                        {consensus.agents.newsScout.isFallback && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={consensus.agents.newsScout.fallbackReason}>
                            Fallback
                          </span>
                        )}
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
                        {consensus.agents.riskGuardian.isFallback && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={consensus.agents.riskGuardian.fallbackReason}>
                            Fallback
                          </span>
                        )}
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

              {/* Orchestration Observability Bar */}
              {consensus.metadata && (
                <div className="bg-surface/40 border border-surface-border/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    {onOpenTelemetry && consensus.metadata.runId ? (
                      <button
                        onClick={() => onOpenTelemetry(consensus.metadata?.runId)}
                        className="flex items-center gap-1.5 text-surface-muted hover:text-cyan-300 font-mono text-[11px] hover:underline transition-colors cursor-pointer group"
                        title="Click to view run execution telemetry in the Observability dashboard"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Run ID: <strong className="text-white font-mono group-hover:text-cyan-300">{(consensus.metadata.runId || '').slice(0, 8)}...</strong>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-surface-muted font-mono text-[11px]">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Run ID: <strong className="text-white font-mono">{(consensus.metadata.runId || 'SYSTEM').slice(0, 8)}...</strong>
                      </span>
                    )}
                    <span className="text-surface-border">|</span>
                    <span className="text-surface-muted text-[11px]">
                      Latency: <strong className="text-white">{consensus.metadata.executionTimeMs ?? 0}ms</strong>
                    </span>
                    <span className="text-surface-border">|</span>
                    <span className="text-surface-muted text-[11px]">
                      Model: <strong className="text-purple-400">{consensus.metadata.model || 'gemini'}</strong>
                    </span>
                    {consensus.metadata.toolCallsCount !== undefined && (
                      <>
                        <span className="text-surface-border">|</span>
                        <span className="text-surface-muted text-[11px]">
                          Tools: <strong className="text-cyan-400 font-mono">{consensus.metadata.toolCallsCount} executed</strong>
                        </span>
                      </>
                    )}
                    {consensus.metadata.tokenEstimate && (
                      <>
                        <span className="text-surface-border">|</span>
                        <span className="text-surface-muted text-[11px]" title={`Prompt: ${consensus.metadata.tokenEstimate.promptTokens} | Completion: ${consensus.metadata.tokenEstimate.completionTokens}`}>
                          Tokens: <strong className="text-purple-300 font-mono">~{Math.round(consensus.metadata.tokenEstimate.totalTokens / 100) / 10}k</strong>
                        </span>
                      </>
                    )}
                    {consensus.metadata.guardrailFlags !== undefined && (
                      <>
                        <span className="text-surface-border">|</span>
                        {consensus.metadata.guardrailFlags.length === 0 ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Safety: Clean
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[11px] text-amber-400 font-medium cursor-help"
                            title={consensus.metadata.guardrailFlags.map((f) => `[${f.severity}] ${f.message}`).join('\n')}
                          >
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            Safety: {consensus.metadata.guardrailFlags.length} Notice(s)
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <span className="text-surface-muted font-bold mr-1">Agents:</span>
                    {Object.entries(consensus.metadata.agentsStatus || {}).map(([agent, status]) => (
                      <span
                        key={agent}
                        className={`px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                          status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {agent}: {status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEBI Compliance Disclaimer Banner */}
              <div className="bg-surface/30 border border-surface-border/50 rounded-xl p-3 text-[11px] text-surface-muted leading-relaxed flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-purple-400/70 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-white/90 block">
                    SEBI Regulatory Compliance Disclaimer
                  </span>
                  <p className="text-[10.5px] leading-relaxed text-surface-muted">
                    {consensus.metadata?.compliance?.full || consensus.metadata?.disclaimer ||
                      'DalalAI Autonomous Research Committee is for informational and educational purposes only. Not SEBI-registered investment advice.'}
                  </p>
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

