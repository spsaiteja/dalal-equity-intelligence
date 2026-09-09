'use client';

import React from 'react';
import { MarketBriefing } from '@/types/stock';
import {
  X,
  Newspaper,
  Compass,
  Globe2,
  TrendingUp,
  Flame,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface MarketBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: MarketBriefing | null;
  loading: boolean;
  onSelectPick: (symbol: string) => void;
}

export const MarketBriefingModal: React.FC<MarketBriefingModalProps> = ({
  isOpen,
  onClose,
  briefing,
  loading,
  onSelectPick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Dalal Street Morning Intelligence</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pre-Market
                </span>
              </div>
              <p className="text-xs text-surface-muted">
                Synthesized GIFT Nifty, Global Cues, and High-Conviction Indian Stock Setups
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

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">Synthesizing pre-market cues with Gemini...</p>
              <p className="text-xs text-surface-muted">
                Scanning GIFT Nifty, institutional flows, crude oil, and sector rotations
              </p>
            </div>
          ) : briefing ? (
            <>
              {/* Sentiment Banner */}
              <div className="bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Compass className="h-4 w-4" /> Market Sentiment Tone
                  </span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {briefing.sentiment}
                  </span>
                </div>
                <p className="text-xs text-surface-foreground leading-relaxed">
                  {briefing.niftyOutlook}
                </p>
              </div>

              {/* Macro Vectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface border border-surface-border rounded-xl p-3.5">
                  <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                    GIFT Nifty Cues
                  </span>
                  <p className="text-xs text-white leading-relaxed">
                    {briefing.macroFactors.giftNifty}
                  </p>
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-3.5">
                  <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1 flex items-center gap-1">
                    <Globe2 className="h-3 w-3 text-market-blue" /> Wall Street & Asia
                  </span>
                  <p className="text-xs text-white leading-relaxed">
                    {briefing.macroFactors.globalCues}
                  </p>
                </div>

                <div className="bg-surface border border-surface-border rounded-xl p-3.5">
                  <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1 flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-400" /> Crude & FII Flows
                  </span>
                  <p className="text-xs text-white leading-relaxed">
                    {briefing.macroFactors.crudeAndFii}
                  </p>
                </div>
              </div>

              {/* Top Sectors to Watch */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-muted mb-2.5">
                  Sector Rotation Radar
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {briefing.topSectorsToWatch.map((sec, i) => (
                    <div key={i} className="bg-surface border border-surface-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">{sec.sector}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            sec.stance === 'Bullish'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-surface-card text-surface-muted'
                          }`}
                        >
                          {sec.stance}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-muted leading-relaxed">
                        {sec.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gemini Stock Picks of the Day */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Gemini Picks of the Day</span>
                </h4>
                <div className="space-y-2">
                  {briefing.geminiPicksOfTheDay.map((pick, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        onSelectPick(pick.symbol);
                        onClose();
                      }}
                      className="bg-surface hover:bg-surface-hover border border-surface-border hover:border-blue-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                            {pick.symbol.replace('.NS', '')}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {pick.type}
                          </span>
                        </div>
                        <p className="text-xs text-surface-muted">{pick.rationale}</p>
                      </div>

                      <div className="p-1.5 rounded-lg bg-surface-card text-surface-muted group-hover:text-white transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Summary */}
              <div className="bg-surface border border-surface-border rounded-xl p-4">
                <span className="text-[10px] text-surface-muted uppercase font-bold block mb-1">
                  Tactical Playbook
                </span>
                <p className="text-xs text-white leading-relaxed">
                  {briefing.actionableSummary}
                </p>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-surface-muted py-8">
              No briefing available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

