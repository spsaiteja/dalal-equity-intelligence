'use client';

import React, { useState, useMemo } from 'react';
import { WatchlistItem, StockQuote } from '@/types/stock';
import {
  Bookmark,
  Plus,
  Trash2,
  Sparkles,
  Target,
  AlertTriangle,
  TrendingUp,
  FolderPlus,
  ArrowUpRight,
  Users,
  Zap,
} from 'lucide-react';

interface WatchlistViewProps {
  watchlist: WatchlistItem[];
  stockQuotes: Record<string, StockQuote>;
  onRemoveFromWatchlist: (id: string) => void;
  onRunAiAnalysis: (stock: StockQuote) => void;
  onRunCouncil?: (stock: StockQuote) => void;
  onOpenAddModal: () => void;
  onCreateBucket: (name: string) => void;
  availableBuckets: string[];
  onOpenOrderModal?: (
    stock: StockQuote,
    transactionType?: 'BUY' | 'SELL',
    targetPrice?: number | string,
    stopLossPrice?: number | string
  ) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  stockQuotes,
  onRemoveFromWatchlist,
  onRunAiAnalysis,
  onRunCouncil,
  onOpenAddModal,
  onCreateBucket,
  availableBuckets,
  onOpenOrderModal,
}) => {
  const [selectedBucket, setSelectedBucket] = useState<string>('All');
  const [newBucketName, setNewBucketName] = useState('');
  const [showNewBucketInput, setShowNewBucketInput] = useState(false);

  // Filter items by bucket
  const filteredItems = useMemo(() => {
    if (selectedBucket === 'All') return watchlist;
    return watchlist.filter((item) => item.bucket === selectedBucket);
  }, [watchlist, selectedBucket]);

  // Aggregate bucket stats
  const stats = useMemo(() => {
    let totalAdded = 0;
    let totalCurrent = 0;

    filteredItems.forEach((item) => {
      const q = stockQuotes[item.symbol];
      const curPrice = q ? q.price : item.addedPrice;
      totalAdded += item.addedPrice;
      totalCurrent += curPrice;
    });

    const pnl = totalCurrent - totalAdded;
    const pnlPct = totalAdded > 0 ? (pnl / totalAdded) * 100 : 0;

    return { totalAdded, totalCurrent, pnl, pnlPct };
  }, [filteredItems, stockQuotes]);

  const handleCreateBucketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBucketName.trim()) {
      onCreateBucket(newBucketName.trim());
      setSelectedBucket(newBucketName.trim());
      setNewBucketName('');
      setShowNewBucketInput(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bucket List Header & Summary */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-market-blue" />
            <h2 className="text-lg font-bold text-white">Stock Bucket Lists</h2>
          </div>
          <p className="text-xs text-surface-muted mt-0.5">
            Monitor target levels, stop-losses, and receive automated Gemini AI buy/sell updates.
          </p>
        </div>

        {/* Aggregate P&L Stats */}
        <div className="flex items-center gap-4 bg-surface px-4 py-2.5 rounded-xl border border-surface-border">
          <div>
            <span className="text-[10px] text-surface-muted uppercase font-bold block">
              Bucket Holdings
            </span>
            <span className="text-sm font-black text-white">{filteredItems.length} Stocks</span>
          </div>
          <div className="h-8 w-px bg-surface-border" />
          <div>
            <span className="text-[10px] text-surface-muted uppercase font-bold block">
              Tracked Return
            </span>
            <span
              className={`text-sm font-black flex items-center gap-1 ${
                stats.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.pnlPct >= 0 ? '+' : ''}
              {stats.pnlPct.toFixed(2)}%
            </span>
          </div>

          <button
            onClick={onOpenAddModal}
            className="ml-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Bucket Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-3">
        <button
          onClick={() => setSelectedBucket('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedBucket === 'All'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-surface-card hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
          }`}
        >
          All Buckets ({watchlist.length})
        </button>

        {availableBuckets.map((bucket) => {
          const count = watchlist.filter((w) => w.bucket === bucket).length;
          return (
            <button
              key={bucket}
              onClick={() => setSelectedBucket(bucket)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBucket === bucket
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-surface-card hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
              }`}
            >
              {bucket} ({count})
            </button>
          );
        })}

        {showNewBucketInput ? (
          <form onSubmit={handleCreateBucketSubmit} className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Bucket Name..."
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              autoFocus
              className="bg-surface border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNewBucketInput(false)}
              className="text-xs text-surface-muted hover:text-white px-1"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowNewBucketInput(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs text-surface-muted hover:text-white border border-dashed border-surface-border hover:border-surface-borderLight flex items-center gap-1 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ New Bucket</span>
          </button>
        )}
      </div>

      {/* Watchlist Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface text-[11px] font-bold uppercase tracking-wider text-surface-muted">
                <th className="py-3 px-4">Stock & Bucket</th>
                <th className="py-3 px-3">Entry Price</th>
                <th className="py-3 px-3">Current Price</th>
                <th className="py-3 px-3">P&L (% Return)</th>
                <th className="py-3 px-4">Target & Stop-Loss</th>
                <th className="py-3 px-3 text-center">AI Signal</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs">
              {filteredItems.map((item) => {
                const quote = stockQuotes[item.symbol];
                const curPrice = quote ? quote.price : item.addedPrice;
                const pnl = curPrice - item.addedPrice;
                const pnlPercent = item.addedPrice > 0 ? (pnl / item.addedPrice) * 100 : 0;
                const isPositive = pnl >= 0;

                // Target progress
                let targetProgress = 0;
                if (item.targetPrice && item.targetPrice > item.addedPrice) {
                  const targetDiff = item.targetPrice - item.addedPrice;
                  targetProgress = Math.max(
                    0,
                    Math.min(100, ((curPrice - item.addedPrice) / targetDiff) * 100)
                  );
                }

                // Stop loss warning
                const isStopLossBreached = item.stopLoss ? curPrice <= item.stopLoss : false;

                const signal = quote ? quote.signal : 'HOLD';
                let signalBadge = 'bg-surface text-surface-muted border-surface-border';
                if (signal === 'STRONG_BUY' || signal === 'BUY') {
                  signalBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                } else if (signal === 'SELL' || signal === 'STRONG_SELL') {
                  signalBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                }

                return (
                  <tr key={item.id} className="hover:bg-surface-hover/80 transition-colors">
                    {/* Stock Name */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-surface-muted font-normal">
                            ({String(item.symbol || '').replace('.NS', '')})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-surface-border text-blue-300 font-medium">
                            {item.bucket}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] text-surface-muted truncate max-w-[140px]">
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 text-surface-muted font-medium">
                      ₹{item.addedPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>

                    {/* Current Price */}
                    <td className="py-3 px-3 font-semibold text-white">
                      ₹{curPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      {quote && (
                        <span
                          className={`text-[10px] ml-1.5 ${
                            quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          ({quote.change >= 0 ? '+' : ''}
                          {quote.changePercent.toFixed(2)}%)
                        </span>
                      )}
                    </td>

                    {/* P&L */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {pnlPercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Target & Stop Loss Tracker */}
                    <td className="py-3 px-4 w-48">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Target className="h-3 w-3" />
                            {item.targetPrice ? `₹${item.targetPrice}` : 'No target'}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${
                              isStopLossBreached ? 'text-rose-500 font-black animate-pulse' : 'text-surface-muted'
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {item.stopLoss ? `SL: ₹${item.stopLoss}` : 'No SL'}
                          </span>
                        </div>

                        {item.targetPrice && (
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${targetProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* AI Signal */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${signalBadge}`}
                      >
                        {String(signal || 'HOLD').replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {quote && (
                          <>
                            {onRunCouncil && (
                              <button
                                onClick={() => onRunCouncil(quote)}
                                className="px-2 py-1 rounded-lg bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                title="Convene 5-Agent AI Council"
                              >
                                <Users className="h-3 w-3 text-purple-400" />
                                <span className="hidden sm:inline">Council</span>
                              </button>
                            )}

                            <button
                              onClick={() => onRunAiAnalysis(quote)}
                              className="p-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-colors"
                              title="Run Gemini Analysis"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>

                            {onOpenOrderModal && (
                              <button
                                onClick={() =>
                                  onOpenOrderModal(
                                    quote,
                                    'BUY',
                                    item.targetPrice,
                                    item.stopLoss
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                title="Place Trade with Bucket Target & Stop-Loss"
                              >
                                <Zap className="h-3 w-3 text-emerald-400" />
                                <span className="hidden sm:inline">Trade</span>
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => onRemoveFromWatchlist(item.id)}
                          className="p-1.5 rounded-lg bg-surface hover:bg-rose-500/10 border border-surface-border hover:border-rose-500/30 text-surface-muted hover:text-rose-400 transition-colors"
                          title="Remove from Bucket"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-muted">
                    <Bookmark className="h-8 w-8 mx-auto mb-2 text-surface-borderLight" />
                    <p className="text-sm font-medium">No stocks in this bucket yet.</p>
                    <button
                      onClick={onOpenAddModal}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add your first stock
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

