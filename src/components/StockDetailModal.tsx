'use client';

import React, { useState, useEffect } from 'react';
import { StockQuote, HistoricalBar } from '@/types/stock';
import {
  X,
  Sparkles,
  BookmarkPlus,
  TrendingUp,
  ExternalLink,
  Newspaper,
  Calendar,
  Layers,
  Users,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockQuote | null;
  onRunAiAnalysis: (stock: StockQuote) => void;
  onRunCouncil?: (stock: StockQuote) => void;
  onAddToWatchlist: (stock: StockQuote) => void;
  onOpenOrderModal?: (stock: StockQuote, transactionType?: 'BUY' | 'SELL') => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  isOpen,
  onClose,
  stock,
  onRunAiAnalysis,
  onRunCouncil,
  onAddToWatchlist,
  onOpenOrderModal,
}) => {
  const [history, setHistory] = useState<HistoricalBar[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartDays, setChartDays] = useState(90);

  useEffect(() => {
    if (isOpen && stock) {
      setLoadingHistory(true);
      fetch(`/api/stocks/${encodeURIComponent(stock.symbol)}?days=${chartDays}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setHistory(res.data.history || []);
            setNews(res.data.news || []);
          }
        })
        .catch((err) => console.error('Error fetching detail:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, stock, chartDays]);

  if (!isOpen || !stock) return null;

  const isPositive = stock.change >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between sticky top-0 bg-surface-card/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white">{stock.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-surface-border text-surface-muted font-bold">
                {stock.symbol}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                {stock.sector || 'NSE Equities'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-sm font-bold ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
                {stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenOrderModal && (
              <button
                type="button"
                onClick={() => onOpenOrderModal(stock, 'BUY')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
              >
                <Zap className="h-4 w-4" />
                <span>Buy / Trade</span>
              </button>
            )}

            <button
              onClick={() => onRunAiAnalysis(stock)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Deep Dive</span>
            </button>

            {onRunCouncil && (
              <button
                onClick={() => onRunCouncil(stock)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/30"
              >
                <Users className="h-4 w-4" />
                <span>AI Council</span>
              </button>
            )}

            <button
              onClick={() => onAddToWatchlist(stock)}
              className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-surface-muted hover:text-white transition-colors"
              title="Add to Bucket"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-surface-muted hover:text-white hover:bg-surface transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Chart Section */}
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-muted flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-market-blue" />
                <span>Price Trend & Volume</span>
              </span>

              <div className="flex items-center gap-1 bg-surface-card p-0.5 rounded-lg border border-surface-border">
                {[30, 90, 180].map((days) => (
                  <button
                    key={days}
                    onClick={() => setChartDays(days)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      chartDays === days
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-surface-muted hover:text-white'
                    }`}
                  >
                    {days === 30 ? '1M' : days === 90 ? '3M' : '6M'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131e36',
                        borderColor: '#26354d',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(v: any) => [`₹${v}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#priceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-surface-muted">
                  Historical data not available
                </div>
              )}
            </div>
          </div>

          {/* Key Fundamentals & Technical Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface border border-surface-border rounded-xl p-3">
              <span className="text-[10px] text-surface-muted uppercase font-bold block">
                52-Week High
              </span>
              <span className="text-sm font-bold text-white">
                ₹{stock.fiftyTwoWeekHigh.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-amber-400 block mt-0.5">
                -{stock.discountFromHigh}% off peak
              </span>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-3">
              <span className="text-[10px] text-surface-muted uppercase font-bold block">
                52-Week Low
              </span>
              <span className="text-sm font-bold text-white">
                ₹{stock.fiftyTwoWeekLow.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                +{stock.distanceFromLow}% from bottom
              </span>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-3">
              <span className="text-[10px] text-surface-muted uppercase font-bold block">
                P/E Ratio
              </span>
              <span className="text-sm font-bold text-white">
                {stock.peRatio ? `${stock.peRatio}x` : 'N/A'}
              </span>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-3">
              <span className="text-[10px] text-surface-muted uppercase font-bold block">
                RSI (14)
              </span>
              <span
                className={`text-sm font-bold ${
                  (stock.rsi14 ?? 50) < 35
                    ? 'text-emerald-400'
                    : (stock.rsi14 ?? 50) > 70
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                {stock.rsi14 ?? 'N/A'}
              </span>
            </div>
          </div>

          {/* Recent News & Announcements */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-muted mb-3 flex items-center gap-1.5">
              <Newspaper className="h-4 w-4 text-market-blue" />
              <span>Recent Headlines & Catalysts</span>
            </h4>

            {news.length > 0 ? (
              <div className="space-y-2">
                {news.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-surface hover:bg-surface-hover border border-surface-border hover:border-surface-borderLight rounded-xl p-3 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-surface-muted mt-0.5 block">
                        Source: {item.publisher}
                      </span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-surface-muted group-hover:text-white transition-colors ml-3 shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-muted bg-surface p-4 rounded-xl border border-surface-border">
                No recent headlines detected for this stock.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

