'use client';

import React from 'react';
import { MarketIndex } from '@/types/stock';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface MarketIndicesProps {
  indices: MarketIndex[];
  loading: boolean;
  onRefresh: () => void;
}

export const MarketIndices: React.FC<MarketIndicesProps> = ({ indices, loading, onRefresh }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-muted">
            Indian Market Pulse (NSE / BSE)
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-surface-muted hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indices.map((idx) => {
          const isPositive = idx.change >= 0;
          return (
            <div
              key={idx.symbol}
              className="bg-surface-card border border-surface-border rounded-xl p-3.5 hover:border-surface-borderLight transition-all relative overflow-hidden group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-surface-muted truncate">
                  {idx.name}
                </span>
                <span
                  className={`text-[11px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPositive ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  ₹{idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {idx.change.toFixed(2)}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[10px] text-surface-muted">
                <span>L: ₹{idx.dayLow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span>H: ₹{idx.dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          );
        })}

        {indices.length === 0 && loading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-surface-card border border-surface-border animate-pulse"
            />
          ))
        )}
      </div>
    </div>
  );
};

