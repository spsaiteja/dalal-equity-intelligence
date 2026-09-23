'use client';

import React, { useState } from 'react';
import { UpstoxHolding, PortfolioSummary, PortfolioAlert, PaperOrder } from '@/types/upstox';
import { StockQuote } from '@/types/stock';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Shield,
  RefreshCw,
  Sparkles,
  Users,
  Building2,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Target,
  BellRing,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap,
  History,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface PortfolioViewProps {
  holdings: UpstoxHolding[];
  summary: PortfolioSummary | null;
  loading: boolean;
  isConnected: boolean;
  isDemoMode: boolean;
  userName?: string | null;
  onRunPortfolioAudit: () => void;
  onRefreshHoldings: () => void;
  onOpenSettings: () => void;
  onRunCouncil: (stock: StockQuote) => void;
  alerts?: PortfolioAlert[];
  alertCounts?: {
    urgent: number;
    buyMore: number;
    bookProfit: number;
    concentration: number;
    total: number;
  };
  onOpenOrderModal?: (stock: StockQuote, transactionType: 'BUY' | 'SELL', targetPrice?: number | string, stopLossPrice?: number | string) => void;
  isAnalyticsToken?: boolean;
  portfolioMode?: 'live' | 'paper';
  onTogglePortfolioMode?: (mode: 'live' | 'paper') => void;
  cashBalance?: number;
  initialCapital?: number;
  orders?: PaperOrder[];
  onResetPaperPortfolio?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  holdings,
  summary,
  loading,
  isConnected,
  isDemoMode,
  userName,
  onRunPortfolioAudit,
  onRefreshHoldings,
  onOpenSettings,
  onRunCouncil,
  alerts = [],
  alertCounts,
  onOpenOrderModal,
  isAnalyticsToken,
  portfolioMode = 'paper',
  onTogglePortfolioMode,
  cashBalance = 1000000,
  initialCapital = 1000000,
  orders = [],
  onResetPaperPortfolio,
}) => {
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'STOP_LOSS' | 'BOOK_PROFIT' | 'BUY_MORE' | 'CONCENTRATION_WARNING'>('ALL');
  const [showAlertsPanel, setShowAlertsPanel] = useState<boolean>(true);
  const [paperTab, setPaperTab] = useState<'holdings' | 'orders'>('holdings');

  const isOverallPositive = (summary?.total_pnl || 0) >= 0;
  const isDayPositive = (summary?.day_pnl || 0) >= 0;

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === 'ALL') return true;
    return a.type === alertFilter;
  });

  return (
    <div className="space-y-4">
      {/* Portfolio Mode Switcher & Virtual Capital Banner */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center p-1 bg-surface rounded-xl border border-surface-border w-full sm:w-auto">
            <button
              onClick={() => onTogglePortfolioMode?.('paper')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                portfolioMode === 'paper'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-surface-muted hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Paper Trading (Simulation)</span>
              {orders && orders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-extrabold">
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => onTogglePortfolioMode?.('live')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                portfolioMode === 'live'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-surface-muted hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>Live Upstox Demat</span>
              {isConnected && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold">
                  Synced
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Paper Trading Mode Capital & Quick Reset */}
        {portfolioMode === 'paper' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-3 bg-surface/60 border border-surface-border px-3.5 py-1.5 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-surface-muted block">Available Virtual Cash</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  ₹{Number(cashBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-6 w-px bg-surface-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-surface-muted block">Initial Capital</span>
                <span className="text-xs font-bold text-surface-muted font-mono">
                  ₹{Number(initialCapital || 1000000).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {onResetPaperPortfolio && (
              <button
                onClick={onResetPaperPortfolio}
                className="text-xs text-surface-muted hover:text-rose-400 px-2.5 py-1.5 rounded-lg border border-surface-border hover:border-rose-500/40 bg-surface transition-colors flex items-center gap-1.5"
                title="Reset simulation to ₹10,00,000"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Simulation</span>
              </button>
            )}
          </div>
        )}

        {/* Live Demat Mode Quick Actions */}
        {portfolioMode === 'live' && !isConnected && (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Connect Upstox Demat</span>
            </button>
          </div>
        )}
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Invested */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-surface-muted">
            <span>Total Invested</span>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹{summary ? Number(summary.total_invested || 0).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] text-surface-muted">
            Across <span className="text-white font-bold">{summary?.holdings_count || holdings.length}</span> {portfolioMode === 'paper' ? 'Paper positions' : 'Demat holdings'}
          </div>
        </div>

        {/* Current Value */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-surface-muted">
            <span>Current Value</span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹{summary ? Number(summary.current_value || 0).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] text-surface-muted">
            Live Dalal Street market valuation
          </div>
        </div>

        {/* Overall Returns / P&L */}
        <div
          className={`border rounded-xl p-4 space-y-1 ${
            isOverallPositive
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-rose-500/5 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-surface-muted">
            <span>Overall P&L</span>
            {isOverallPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-black ${
              isOverallPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isOverallPositive ? '+' : ''}₹
            {summary ? Math.abs(Number(summary.total_pnl || 0)).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] font-bold flex items-center gap-1">
            <span
              className={`px-1.5 py-0.2 rounded ${
                isOverallPositive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {isOverallPositive ? '+' : ''}
              {summary?.total_pnl_percentage}%
            </span>
            <span className="text-surface-muted font-normal">All-Time Returns</span>
          </div>
        </div>

        {/* Day P&L */}
        <div
          className={`border rounded-xl p-4 space-y-1 ${
            isDayPositive
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-rose-500/5 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-surface-muted">
            <span>Today&apos;s Gain / Loss</span>
            {isDayPositive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-black ${
              isDayPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isDayPositive ? '+' : ''}₹
            {summary ? Math.abs(Number(summary.day_pnl || 0)).toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] font-bold flex items-center gap-1">
            <span
              className={`px-1.5 py-0.2 rounded ${
                isDayPositive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {isDayPositive ? '+' : ''}
              {summary?.day_pnl_percentage}%
            </span>
            <span className="text-surface-muted font-normal">Today&apos;s Net Movement</span>
          </div>
        </div>
      </div>

      {/* Connection Banner & Header Controls */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {portfolioMode === 'paper'
                  ? 'Paper Trading Simulation Active'
                  : isConnected
                  ? 'Upstox Demat Account Synced'
                  : 'Upstox Demat Disconnected'}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  portfolioMode === 'paper'
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                    : isConnected
                    ? isAnalyticsToken
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                }`}
              >
                {portfolioMode === 'paper'
                  ? 'Virtual Margin Simulation'
                  : isConnected
                  ? isAnalyticsToken
                    ? '1-Year Analytics Sync'
                    : 'Live Broker Feed'
                  : 'Demo Mode'}
              </span>
            </div>
            <p className="text-[11px] text-surface-muted mt-0.5">
              {portfolioMode === 'paper'
                ? `Simulated trading engine with real-time NSE market quotes. Trades and virtual margin are saved securely.`
                : isConnected
                ? `Logged in as ${userName || 'Investor'}. Real equity holdings auto-synced from Upstox API.`
                : 'Showing sample holdings. Connect Upstox in Settings or switch to Paper Trading mode above to trade with virtual capital.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {!isConnected && (
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              <span>Connect Upstox</span>
            </button>
          )}

          <button
            onClick={onRefreshHoldings}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh live quotes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={onRunPortfolioAudit}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
          >
            <Shield className="h-4 w-4" />
            <span>Run AI Portfolio Audit</span>
          </button>
        </div>
      </div>

      {/* Active AI Holding Directives & Alerts Panel */}
      {alerts && alerts.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 shadow-xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <BellRing className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Portfolio AI Directives & Alerts</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {alerts.length} Action{alerts.length > 1 ? 's' : ''} Recommended
                  </span>
                </div>
                <p className="text-[11px] text-surface-muted">
                  Actionable trade directives: Stop-loss protection, profit-booking targets, and dip accumulation zones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Filter Pills */}
              <button
                onClick={() => setAlertFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  alertFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-surface text-surface-muted hover:text-white border border-surface-border'
                }`}
              >
                All ({alerts.length})
              </button>

              {alertCounts && alertCounts.urgent > 0 && (
                <button
                  onClick={() => setAlertFilter('STOP_LOSS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    alertFilter === 'STOP_LOSS'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                      : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/25'
                  }`}
                >
                  <AlertOctagon className="h-3 w-3" />
                  <span>Stop-Loss ({alertCounts.urgent})</span>
                </button>
              )}

              {alertCounts && alertCounts.bookProfit > 0 && (
                <button
                  onClick={() => setAlertFilter('BOOK_PROFIT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    alertFilter === 'BOOK_PROFIT'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/25'
                  }`}
                >
                  <Target className="h-3 w-3" />
                  <span>Book Profit ({alertCounts.bookProfit})</span>
                </button>
              )}

              {alertCounts && alertCounts.buyMore > 0 && (
                <button
                  onClick={() => setAlertFilter('BUY_MORE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    alertFilter === 'BUY_MORE'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/25'
                  }`}
                >
                  <TrendingUp className="h-3 w-3" />
                  <span>Buy More ({alertCounts.buyMore})</span>
                </button>
              )}

              {alertCounts && alertCounts.concentration > 0 && (
                <button
                  onClick={() => setAlertFilter('CONCENTRATION_WARNING')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    alertFilter === 'CONCENTRATION_WARNING'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/25'
                  }`}
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Concentration ({alertCounts.concentration})</span>
                </button>
              )}

              <button
                onClick={() => setShowAlertsPanel(!showAlertsPanel)}
                className="p-1 rounded-lg text-surface-muted hover:text-white hover:bg-surface transition-colors"
                title={showAlertsPanel ? 'Minimize alerts' : 'Expand alerts'}
              >
                {showAlertsPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {showAlertsPanel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {filteredAlerts.map((alert) => {
                const isStopLoss = alert.type === 'STOP_LOSS';
                const isProfit = alert.type === 'BOOK_PROFIT';
                const isBuy = alert.type === 'BUY_MORE';
                const isConc = alert.type === 'CONCENTRATION_WARNING';

                let borderBg = 'bg-surface/90 border-surface-border';
                let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                let badgeText = 'DIRECTIVE';
                let IconComponent = Sparkles;

                if (isStopLoss) {
                  borderBg = 'bg-rose-950/20 border-rose-500/40';
                  badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                  badgeText = 'SELL / STOP-LOSS';
                  IconComponent = AlertOctagon;
                } else if (isProfit) {
                  borderBg = 'bg-amber-950/20 border-amber-500/40';
                  badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  badgeText = 'BOOK PROFIT';
                  IconComponent = Target;
                } else if (isBuy) {
                  borderBg = 'bg-emerald-950/20 border-emerald-500/40';
                  badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  badgeText = 'BUY MORE';
                  IconComponent = TrendingUp;
                } else if (isConc) {
                  borderBg = 'bg-indigo-950/20 border-indigo-500/40';
                  badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                  badgeText = 'CONCENTRATION';
                  IconComponent = ShieldAlert;
                }

                const holdingObj = holdings.find((h) => h.trading_symbol === alert.symbol);
                const syntheticQuote: StockQuote = {
                  symbol: alert.symbol.endsWith('.NS') ? alert.symbol : `${alert.symbol}.NS`,
                  name: alert.company_name,
                  price: alert.currentPrice,
                  change: holdingObj?.day_change || 0,
                  changePercent: holdingObj?.day_change_percentage || 0,
                  dayHigh: alert.currentPrice * 1.02,
                  dayLow: alert.currentPrice * 0.98,
                  volume: 100000,
                  marketCap: 100000000,
                  fiftyTwoWeekHigh: Math.round(alert.currentPrice * 1.15),
                  fiftyTwoWeekLow: Math.round(alert.currentPrice * 0.85),
                  discountFromHigh: 13.0,
                  distanceFromLow: 17.6,
                  sector: holdingObj?.sector || 'Equities',
                  signal: isBuy ? 'STRONG_BUY' : isStopLoss ? 'SELL' : 'HOLD',
                  signalScore: isBuy ? 8.5 : isStopLoss ? 2.5 : 7.0,
                  signalReason: alert.message,
                  tags: ['Portfolio Alert', alert.type],
                };

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all hover:border-surface-borderLight shadow-sm ${borderBg}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{alert.symbol}</span>
                            <span
                              className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded border flex items-center gap-1 ${badgeColor}`}
                            >
                              <IconComponent className="h-2.5 w-2.5" />
                              <span>{badgeText}</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-surface-muted block truncate max-w-[200px]">
                            {alert.company_name}
                          </span>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-xs font-black text-white block">
                            ₹{Number(alert.currentPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-surface-muted block">
                            Avg: ₹{Number(alert.averagePrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-surface-text leading-snug">
                        {alert.message}
                      </div>

                      <div className="bg-surface/80 rounded-lg p-2 border border-surface-border text-[11px]">
                        <span className="text-surface-muted block text-[10px] uppercase font-bold">
                          Directive Plan:
                        </span>
                        <span className="text-white font-medium">{alert.suggestedAction}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-surface-border/50">
                      <span className="text-[10px] font-mono text-surface-muted">
                        {alert.metric}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenOrderModal && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenOrderModal(
                                syntheticQuote,
                                isStopLoss || isProfit ? 'SELL' : 'BUY',
                                alert.targetPrice,
                                alert.stopLossPrice
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm ${
                              isStopLoss
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                                : isProfit
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                            }`}
                          >
                            <Zap className="h-3 w-3" />
                            <span>{isStopLoss ? 'Sell Position' : isProfit ? 'Take Profit' : 'Buy More'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRunCouncil(syntheticQuote)}
                          className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-purple-500/40 text-purple-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                        >
                          <Users className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Holdings & Order History Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {portfolioMode === 'paper' ? (
            <div className="flex items-center p-1 bg-surface rounded-xl border border-surface-border">
              <button
                type="button"
                onClick={() => setPaperTab('holdings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  paperTab === 'holdings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Active Holdings ({holdings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  paperTab === 'orders'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Execution History ({orders?.length || 0})</span>
              </button>
            </div>
          ) : (
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Demat Holdings ({holdings.length})</span>
            </h3>
          )}
        </div>

        <div className="text-xs text-surface-muted flex items-center gap-2">
          {portfolioMode === 'paper' ? (
            <span className="text-[11px] text-blue-300/80 font-medium">Virtual Capital • Live NSE Market Feed</span>
          ) : (
            <span className="text-[11px] text-surface-muted">Live Broker Demat Holdings</span>
          )}
        </div>
      </div>

      {/* Execution History Table (Paper Trading Mode) */}
      {portfolioMode === 'paper' && paperTab === 'orders' ? (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-surface-muted font-bold uppercase tracking-wider text-[10px] border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Order ID &amp; Time</th>
                  <th className="py-3 px-3">Instrument</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3 text-center">Product</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Execution Price</th>
                  <th className="py-3 px-3 text-right">Total Value</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Execution Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {orders && orders.length > 0 ? (
                  orders.map((o) => {
                    const isBuy = o.transactionType === 'BUY';
                    const orderDate = new Date(o.timestamp);
                    const formattedDate = orderDate.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const formattedTime = orderDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={o.orderId} className="hover:bg-surface-hover/80 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span className="text-white font-bold block">{o.orderId}</span>
                          <span className="text-[10px] text-surface-muted flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-surface-muted" />
                            {formattedDate} {formattedTime}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{o.symbol.replace('.NS', '')}</span>
                          <span className="text-[10px] text-surface-muted truncate block max-w-[150px]">
                            {o.companyName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {o.transactionType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] text-surface-muted font-bold">
                            {o.productType === 'D' ? 'Delivery (CNC)' : 'Intraday (MIS)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {o.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white">
                          ₹{Number(o.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          ₹{Number(o.totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'COMPLETE'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : o.status === 'AMO_QUEUED'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{o.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-surface-muted max-w-[220px] truncate">
                          {o.message}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-surface-muted">
                      <div className="max-w-md mx-auto space-y-2">
                        <History className="h-8 w-8 text-surface-muted mx-auto opacity-60" />
                        <p className="text-white font-bold text-sm">No Simulated Trades Placed Yet</p>
                        <p className="text-xs text-surface-muted">
                          Simulated BUY and SELL executions from the Screener or Watchlist will appear here with instant audit timestamps.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Holdings Table */
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-surface-muted font-bold uppercase tracking-wider text-[10px] border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-3 text-center">AI Directive</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Avg. Price</th>
                  <th className="py-3 px-3 text-right">LTP (CMP)</th>
                  <th className="py-3 px-3 text-right">Invested</th>
                  <th className="py-3 px-3 text-right">Current Value</th>
                  <th className="py-3 px-3 text-right">Day&apos;s Gain</th>
                  <th className="py-3 px-3 text-right">Overall P&L</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {holdings.map((h, idx) => {
                  const isHoldingPositive = h.pnl >= 0;
                  const isDayHoldingPositive = h.day_change >= 0;

                  // Map to StockQuote shape for single stock Council Deliberation
                  const syntheticQuote: StockQuote = {
                    symbol: h.trading_symbol.endsWith('.NS') ? h.trading_symbol : `${h.trading_symbol}.NS`,
                    name: h.company_name,
                    price: h.last_price,
                    change: h.day_change,
                    changePercent: h.day_change_percentage,
                    dayHigh: h.last_price * 1.02,
                    dayLow: h.last_price * 0.98,
                    volume: 100000,
                    marketCap: 100000000,
                    fiftyTwoWeekHigh: Math.round(h.last_price * 1.15),
                    fiftyTwoWeekLow: Math.round(h.last_price * 0.85),
                    discountFromHigh: 13.0,
                    distanceFromLow: 17.6,
                    sector: h.sector || 'Equities',
                    signal: h.holdingSignal === 'BUY_MORE' ? 'STRONG_BUY' : h.holdingSignal === 'STOP_LOSS' ? 'SELL' : 'BUY',
                    signalScore: h.holdingSignal === 'BUY_MORE' ? 8.8 : h.holdingSignal === 'STOP_LOSS' ? 3.0 : 7.5,
                    signalReason: h.signalReason || 'Holding audited within Demat portfolio.',
                    tags: ['Portfolio Holding', h.sector || 'NSE'],
                  };

                  return (
                    <tr key={idx} className="hover:bg-surface-hover/80 transition-colors">
                      {/* Instrument Name */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{h.company_name}</span>
                            <span className="text-[10px] text-surface-muted font-normal">
                              ({h.trading_symbol})
                            </span>
                          </div>
                          {h.sector && (
                            <div className="text-[10px] text-surface-muted mt-0.5">{h.sector}</div>
                          )}
                        </div>
                      </td>

                      {/* AI Directive / Action Signal Badge */}
                      <td className="py-3 px-3 text-center">
                        {h.holdingSignal === 'STOP_LOSS' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-sm">
                              <AlertOctagon className="h-2.5 w-2.5" />
                              <span>SELL / STOP</span>
                            </span>
                            <span className="text-[9px] text-rose-400 mt-0.5 font-mono">Cut Loss</span>
                          </div>
                        ) : h.holdingSignal === 'BOOK_PROFIT' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                              <Target className="h-2.5 w-2.5" />
                              <span>BOOK PROFIT</span>
                            </span>
                            <span className="text-[9px] text-amber-400 mt-0.5 font-mono">Lock Gains</span>
                          </div>
                        ) : h.holdingSignal === 'BUY_MORE' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                              <TrendingUp className="h-2.5 w-2.5" />
                              <span>BUY MORE</span>
                            </span>
                            <span className="text-[9px] text-emerald-400 mt-0.5 font-mono">Dip Accumulate</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface text-surface-muted border border-surface-border">
                              HOLD
                            </span>
                            <span className="text-[9px] text-surface-muted mt-0.5 font-mono">Trend Intact</span>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-right font-mono text-white font-semibold">
                        {h.quantity}
                      </td>

                      {/* Average Price */}
                      <td className="py-3 px-3 text-right font-mono text-surface-muted">
                        ₹{Number(h.average_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* LTP */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        ₹{Number(h.last_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Invested Value */}
                      <td className="py-3 px-3 text-right font-mono text-surface-muted">
                        ₹{Number(h.invested_value || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Current Value */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                        ₹{Number(h.current_value || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Day's Gain */}
                      <td
                        className={`py-3 px-3 text-right font-mono font-semibold ${
                          isDayHoldingPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isDayHoldingPositive ? '+' : ''}
                        {h.day_change_percentage}%
                      </td>

                      {/* Overall P&L */}
                      <td className="py-3 px-3 text-right">
                        <div
                          className={`font-bold font-mono ${
                            isHoldingPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isHoldingPositive ? '+' : ''}₹{Number(h.pnl || 0).toLocaleString('en-IN')}
                        </div>
                        <div
                          className={`text-[10px] font-semibold ${
                            isHoldingPositive ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          ({isHoldingPositive ? '+' : ''}
                          {h.pnl_percentage}%)
                        </div>
                      </td>

                      {/* AI Council & Trade Action */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onRunCouncil(syntheticQuote)}
                            className="px-2 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Run 5-Agent Council deliberation on this holding"
                          >
                            <Users className="h-3 w-3 text-purple-400" />
                            <span>Council</span>
                          </button>
                          {onOpenOrderModal && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenOrderModal(
                                  syntheticQuote,
                                  h.holdingSignal === 'STOP_LOSS' ? 'SELL' : 'BUY'
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border ${
                                h.holdingSignal === 'STOP_LOSS'
                                  ? 'bg-rose-600/15 hover:bg-rose-600/30 border-rose-500/30 text-rose-300'
                                  : 'bg-emerald-600/15 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300'
                              }`}
                              title={h.holdingSignal === 'STOP_LOSS' ? 'Sell / Cut Loss holding' : 'Buy / Add more to holding'}
                            >
                              <Zap className="h-3 w-3" />
                              <span>{h.holdingSignal === 'STOP_LOSS' ? 'Exit' : 'Trade'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {holdings.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-surface-muted">
                      {portfolioMode === 'paper' ? (
                        <div className="max-w-md mx-auto space-y-2">
                          <Zap className="h-8 w-8 text-blue-400 mx-auto opacity-80" />
                          <p className="text-white font-bold text-sm">No Active Paper Trading Positions</p>
                          <p className="text-xs text-surface-muted">
                            You have ₹{Number(cashBalance || 1000000).toLocaleString('en-IN')} available virtual cash. Open the Screener or Watchlist, select any stock, and click &apos;Trade&apos; to execute your first simulated trade!
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-md mx-auto space-y-2">
                          <Shield className="h-8 w-8 text-surface-muted mx-auto opacity-60" />
                          <p className="text-white font-bold text-sm">No Live Upstox Demat Holdings Found</p>
                          <p className="text-xs text-surface-muted">
                            No holdings were detected in your connected Upstox Demat account. If you just placed a simulated trade, switch to the &apos;Paper Trading&apos; tab above.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
