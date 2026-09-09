'use client';

import React, { useState } from 'react';
import { StockQuote } from '@/types/stock';
import { X, BookmarkPlus, Target, AlertTriangle, Layers } from 'lucide-react';

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockQuote | null;
  availableBuckets: string[];
  onAdd: (data: {
    symbol: string;
    name: string;
    bucket: string;
    addedPrice: number;
    targetPrice?: number;
    stopLoss?: number;
    notes?: string;
  }) => void;
}

export const AddToWatchlistModal: React.FC<AddToWatchlistModalProps> = ({
  isOpen,
  onClose,
  stock,
  availableBuckets,
  onAdd,
}) => {
  const [bucket, setBucket] = useState(availableBuckets[0] || 'Long-Term Value');
  const [customBucket, setCustomBucket] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !stock) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBucket = customBucket.trim() ? customBucket.trim() : bucket;

    onAdd({
      symbol: stock.symbol,
      name: stock.name,
      bucket: finalBucket,
      addedPrice: stock.price,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add to Bucket List</h3>
              <p className="text-xs text-surface-muted">
                {stock.name} ({stock.symbol.replace('.NS', '')})
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5">
              Select Bucket
            </label>
            <div className="space-y-2">
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {availableBuckets.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Or type a new bucket name..."
                value={customBucket}
                onChange={(e) => setCustomBucket(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white placeholder-surface-muted focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5 flex items-center gap-1">
                <Target className="h-3 w-3 text-emerald-400" /> Target (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder={`e.g. ${Math.round(stock.price * 1.15)}`}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-400" /> Stop-Loss (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder={`e.g. ${Math.round(stock.price * 0.94)}`}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-surface-muted block mb-1.5">
              Trading Notes / Strategy
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Accumulate during consolidation dip, Q3 earnings expected to beat..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white placeholder-surface-muted focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              Add to Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

