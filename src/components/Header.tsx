'use client';

import React from 'react';
import { Sparkles, SlidersHorizontal, Bookmark, Settings, Newspaper, TrendingUp, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'screener' | 'watchlist' | 'portfolio';
  setActiveTab: (tab: 'screener' | 'watchlist' | 'portfolio') => void;
  onOpenBriefing: () => void;
  onOpenSettings: () => void;
  watchlistCount: number;
  hasApiKey: boolean;
  isUpstoxConnected?: boolean;
  portfolioAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenBriefing,
  onOpenSettings,
  watchlistCount,
  hasApiKey,
  isUpstoxConnected = false,
  portfolioAlertsCount = 0,
}) => {
  return (
    <header className="border-b border-surface-border bg-surface/90 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                Dalal<span className="text-market-blue">AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Gemini Powered
              </span>
            </div>
            <p className="text-[11px] text-surface-muted hidden sm:block">
              NSE / BSE Screener & Institutional AI Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-surface-card p-1 rounded-xl border border-surface-border">
          <button
            onClick={() => setActiveTab('screener')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'screener'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-surface-muted hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Screener</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
              activeTab === 'watchlist'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-surface-muted hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Bucket List</span>
            {watchlistCount > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-indigo-500 text-white">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
              activeTab === 'portfolio'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-surface-muted hover:text-white'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isUpstoxConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400/80"></span>
              )}
            </span>
            <span>My Portfolio</span>
            {isUpstoxConnected ? (
              <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
            ) : (
              <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DEMO
              </span>
            )}
            {portfolioAlertsCount > 0 && (
              <span
                className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-600 text-white flex items-center gap-0.5 shadow-sm shadow-rose-600/50 animate-pulse"
                title={`${portfolioAlertsCount} action alert(s) on your portfolio`}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {portfolioAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Pre-Market Briefing Button */}
          <button
            onClick={onOpenBriefing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:border-amber-400/50 transition-all text-xs font-semibold shadow-sm"
          >
            <Newspaper className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="hidden md:inline">Daily AI Briefing</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl border transition-all ${
              hasApiKey
                ? 'bg-surface-card border-surface-border text-surface-muted hover:text-white hover:border-surface-borderLight'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title={hasApiKey ? 'Settings & Gemini API Key' : 'Configure Gemini API Key'}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

