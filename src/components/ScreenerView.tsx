'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { StockQuote } from '@/types/stock';
import {
  Search,
  Sparkles,
  Flame,
  Zap,
  TrendingUp,
  BookmarkPlus,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown,
  SlidersHorizontal,
  Users,
  Layers,
} from 'lucide-react';

interface ScreenerViewProps {
  stocks: StockQuote[];
  loading: boolean;
  onSelectStock: (stock: StockQuote) => void;
  onRunAiAnalysis: (stock: StockQuote) => void;
  onRunCouncil: (stock: StockQuote) => void;
  onAddToWatchlist: (stock: StockQuote, bucket?: string) => void;
  watchlistSymbols: Set<string>;
  onOpenOrderModal?: (stock: StockQuote, transactionType?: 'BUY' | 'SELL') => void;
}

type FilterType = 'all' | 'discounted' | 'oversold' | 'buy_signals' | 'pullback' | 'nifty50';
type SortField = 'discount' | 'score' | 'change' | 'price' | 'rsi';

export const ScreenerView: React.FC<ScreenerViewProps> = ({
  stocks,
  loading,
  onSelectStock,
  onRunAiAnalysis,
  onRunCouncil,
  onAddToWatchlist,
  watchlistSymbols,
  onOpenOrderModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [universeScope, setUniverseScope] = useState<'all' | 'nifty100' | 'nifty50'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('discount');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Extract unique sectors
  const sectors = useMemo(() => {
    const list = new Set<string>();
    stocks.forEach((s) => {
      if (s.sector) list.add(s.sector);
    });
    return Array.from(list).sort();
  }, [stocks]);

  // Reset pagination on filter or scope changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, universeScope, selectedSector, searchQuery, sortField, sortAsc, pageSize]);

  // Filter & Sort stocks
  const filteredStocks = useMemo(() => {
    let list = [...stocks];

    // Index Universe Scope
    if (universeScope === 'nifty50') {
      list = list.filter((s) => s.nifty50);
    } else if (universeScope === 'nifty100') {
      list = list.filter((s) => s.nifty50 || s.nifty100);
    }

    // Filter type
    if (activeFilter === 'discounted') {
      list = list.filter((s) => s.discountFromHigh >= 10 || (s.rsi14 && s.rsi14 <= 42));
    } else if (activeFilter === 'oversold') {
      list = list.filter((s) => (s.rsi14 && s.rsi14 <= 42) || s.changePercent <= -1.8);
    } else if (activeFilter === 'buy_signals') {
      list = list.filter((s) => s.signal === 'STRONG_BUY' || s.signal === 'BUY');
    } else if (activeFilter === 'pullback') {
      list = list.filter((s) =>
        s.tags.some((t) => t.includes('50 EMA') || t.includes('Pullback') || t.includes('Macro'))
      );
    }

    // Sector
    if (selectedSector !== 'all') {
      list = list.filter((s) => s.sector === selectedSector);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.sector && s.sector.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'discount') {
        valA = a.discountFromHigh;
        valB = b.discountFromHigh;
      } else if (sortField === 'score') {
        valA = a.signalScore;
        valB = b.signalScore;
      } else if (sortField === 'change') {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (sortField === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortField === 'rsi') {
        valA = a.rsi14 ?? 50;
        valB = b.rsi14 ?? 50;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [stocks, activeFilter, universeScope, selectedSector, searchQuery, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const paginatedStocks = useMemo(() => {
    if (pageSize >= 500) return filteredStocks;
    const start = (currentPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, currentPage, pageSize]);

  // Screener summary counts
  const discountedCount = useMemo(
    () => stocks.filter((s) => s.discountFromHigh >= 12).length,
    [stocks]
  );
  const buyConvictionCount = useMemo(
    () => stocks.filter((s) => s.signal === 'STRONG_BUY' || s.signal === 'BUY').length,
    [stocks]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card border border-amber-500/20 rounded-xl p-4 flex items-center gap-3.5 bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{discountedCount} Stocks</div>
            <div className="text-xs text-amber-300 font-medium">Trading at 12%+ Discount to 52W High</div>
          </div>
        </div>

        <div className="bg-surface-card border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3.5 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{buyConvictionCount} Stocks</div>
            <div className="text-xs text-emerald-300 font-medium">High Confluence Buy Signals</div>
          </div>
        </div>

        <div className="bg-surface-card border border-blue-500/20 rounded-xl p-4 flex items-center gap-3.5 bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">Gemini 3.5 Flash</div>
            <div className="text-xs text-blue-300 font-medium">Bargain vs. Value Trap Engine Ready</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 space-y-3">
        {/* Index Universe Scope Selector (NIFTY 500 / 100 / 50) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-surface-border/60">
          <div className="flex items-center gap-2">
            <span className="text-surface-muted font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-400" /> Universe Scope:
            </span>
            <button
              onClick={() => setUniverseScope('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                universeScope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
              }`}
            >
              NIFTY 500 (All 500)
            </button>
            <button
              onClick={() => setUniverseScope('nifty100')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                universeScope === 'nifty100'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
              }`}
            >
              NIFTY 100 (Top 100)
            </button>
            <button
              onClick={() => setUniverseScope('nifty50')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                universeScope === 'nifty50'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
              }`}
            >
              NIFTY 50 (Blue Chips)
            </button>
          </div>

          <div className="text-[11px] text-surface-muted">
            Matching <span className="font-bold text-white">{filteredStocks.length}</span> companies
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveFilter('discounted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'discounted'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>🔥 Discounted Stocks Today</span>
          </button>

          <button
            onClick={() => setActiveFilter('buy_signals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'buy_signals'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>🟢 Strong Buy Signals</span>
          </button>

          <button
            onClick={() => setActiveFilter('oversold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'oversold'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>⚡ RSI Oversold (&lt;42)</span>
          </button>

          <button
            onClick={() => setActiveFilter('pullback')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'pullback'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>📈 Trend Pullback (50 EMA)</span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>All Universe ({stocks.length})</span>
          </button>
        </div>

        {/* Search & Sector Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
            <input
              type="text"
              placeholder="Search by ticker, company name, or sector (e.g. Reliance, HDFC, IT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-surface-muted focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Sectors</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stock Screener Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface text-[11px] font-bold uppercase tracking-wider text-surface-muted">
                <th className="py-3 px-4">Stock & Sector</th>
                <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('price')}>
                  <div className="flex items-center gap-1">
                    <span>Price</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('change')}>
                  <div className="flex items-center gap-1">
                    <span>Today</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">52-Week Range</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-white text-center"
                  onClick={() => toggleSort('discount')}
                >
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    <span>Discount</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-white text-center"
                  onClick={() => toggleSort('rsi')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>RSI (14)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-white text-center"
                  onClick={() => toggleSort('score')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Conviction</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-xs">
              {paginatedStocks.map((stock) => {
                const isWatchlisted = watchlistSymbols.has(stock.symbol);
                const isPositive = stock.change >= 0;

                // 52W range progress percentage
                const rangeDiff = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
                const rangePct =
                  rangeDiff > 0
                    ? Math.max(0, Math.min(100, ((stock.price - stock.fiftyTwoWeekLow) / rangeDiff) * 100))
                    : 50;

                // Signal style
                let signalBadgeClass = 'bg-surface text-surface-muted border-surface-border';
                let signalText = 'HOLD';
                if (stock.signal === 'STRONG_BUY') {
                  signalBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                  signalText = 'STRONG BUY';
                } else if (stock.signal === 'BUY') {
                  signalBadgeClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                  signalText = 'BUY ZONE';
                } else if (stock.signal === 'SELL' || stock.signal === 'STRONG_SELL') {
                  signalBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  signalText = 'PROFIT / SELL';
                }

                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-surface-hover/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectStock(stock)}
                  >
                    {/* Stock Name & Sector */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <span>{stock.name}</span>
                            <span className="text-[10px] text-surface-muted font-normal">
                              ({stock.symbol.replace('.NS', '')})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-surface-border text-surface-muted">
                              {stock.sector || 'NSE'}
                            </span>
                            {stock.peRatio && (
                              <span className="text-[10px] text-surface-muted">
                                P/E: <span className="text-white font-medium">{stock.peRatio}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 font-semibold text-white">
                      ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>

                    {/* Change % */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* 52-Week Range Bar */}
                    <td className="py-3 px-4 w-44">
                      <div className="space-y-1">
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-blue-500"
                            style={{ width: `${rangePct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-surface-muted">
                          <span>₹{Math.round(stock.fiftyTwoWeekLow).toLocaleString('en-IN')}</span>
                          <span className="text-blue-400 font-medium">{rangePct.toFixed(0)}%</span>
                          <span>₹{Math.round(stock.fiftyTwoWeekHigh).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Discount from High */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          stock.discountFromHigh >= 15
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : stock.discountFromHigh >= 8
                            ? 'bg-amber-500/10 text-amber-200'
                            : 'text-surface-muted'
                        }`}
                      >
                        -{stock.discountFromHigh.toFixed(1)}%
                      </span>
                    </td>

                    {/* RSI */}
                    <td className="py-3 px-3 text-center">
                      {stock.rsi14 !== undefined ? (
                        <span
                          className={`font-semibold ${
                            stock.rsi14 < 35
                              ? 'text-emerald-400 font-bold'
                              : stock.rsi14 > 70
                              ? 'text-rose-400'
                              : 'text-surface-muted'
                          }`}
                        >
                          {stock.rsi14}
                        </span>
                      ) : (
                        <span className="text-surface-muted">-</span>
                      )}
                    </td>

                    {/* Conviction & Signal */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${signalBadgeClass}`}
                        >
                          {signalText}
                        </span>
                        <span className="text-[10px] text-surface-muted mt-0.5">
                          Score: <strong className="text-white">{stock.signalScore}</strong>/10
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Gemini Deep Dive */}
                        <button
                          onClick={() => onRunAiAnalysis(stock)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                          title="Run Gemini AI Deep Dive"
                        >
                          <Sparkles className="h-3 w-3 text-blue-400" />
                          <span>AI Deep Dive</span>
                        </button>

                        {/* Multi-Agent Council */}
                        <button
                          onClick={() => onRunCouncil(stock)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                          title="Summon 5-Agent Investment Council"
                        >
                          <Users className="h-3 w-3 text-purple-400" />
                          <span>AI Council</span>
                        </button>

                        {/* Trade / Order Placement */}
                        {onOpenOrderModal && (
                          <button
                            onClick={() => onOpenOrderModal(stock, 'BUY')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                            title="Place Buy / Trade Order"
                          >
                            <Zap className="h-3 w-3 text-emerald-400" />
                            <span>Trade</span>
                          </button>
                        )}

                        {/* Add to Watchlist */}
                        <button
                          onClick={() => onAddToWatchlist(stock)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isWatchlisted
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : 'bg-surface hover:bg-surface-card border-surface-border text-surface-muted hover:text-white'
                          }`}
                          title={isWatchlisted ? 'Added to Bucket List' : 'Add to Bucket List'}
                        >
                          {isWatchlisted ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <BookmarkPlus className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* View details */}
                        <button
                          onClick={() => onSelectStock(stock)}
                          className="p-1.5 rounded-lg text-surface-muted hover:text-white"
                          title="View Chart"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStocks.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-surface-muted">
                    <p className="text-sm font-medium">No stocks matched your active filter or search.</p>
                    <button
                      onClick={() => {
                        setActiveFilter('all');
                        setSearchQuery('');
                        setSelectedSector('all');
                      }}
                      className="mt-2 text-xs text-blue-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Screener Universe Footer Bar */}
        <div className="p-3.5 border-t border-surface-border flex flex-col md:flex-row items-center justify-between text-xs text-surface-muted gap-3 bg-surface/50">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-white font-semibold">
                {filteredStocks.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, filteredStocks.length)}
              </strong>{' '}
              of <strong className="text-white font-semibold">{filteredStocks.length}</strong> matching stocks ({stocks.length} in universe)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-surface-muted">Rows:</span>
              {[25, 50, 100, 500].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    pageSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-surface hover:bg-surface-hover text-surface-muted hover:text-white border border-surface-border'
                  }`}
                >
                  {size === 500 ? 'All 500' : size}
                </button>
              ))}
            </div>

            {/* Prev / Next Pagination */}
            {pageSize < 500 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-2 text-[11px] font-medium text-surface-muted">
                  Page <strong className="text-white">{currentPage}</strong> of{' '}
                  <strong className="text-white">{totalPages}</strong>
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

