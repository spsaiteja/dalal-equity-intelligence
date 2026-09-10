'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  Scale,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  BullionHolding,
  BullionHoldingCalculated,
  BullionPortfolioSummary,
  UaeBullionRates,
  BullionMetalType,
  GRAMS_PER_TOLA,
  GRAMS_PER_TROY_OZ,
} from '@/types/bullion';

const METAL_LABELS: Record<BullionMetalType, { title: string; purity: string; color: string; badge: string }> = {
  GOLD_24K: {
    title: 'Gold 24K',
    purity: '99.9% Pure (999)',
    color: 'from-amber-400 to-yellow-500 text-amber-300 border-amber-400/40 bg-amber-500/10',
    badge: 'Investment Bars / Mint Coins',
  },
  GOLD_22K: {
    title: 'Gold 22K',
    purity: '91.6% Pure (916)',
    color: 'from-yellow-400 to-amber-600 text-yellow-300 border-yellow-500/40 bg-yellow-500/10',
    badge: 'Jewelry & Sovereign Coins',
  },
  GOLD_21K: {
    title: 'Gold 21K',
    purity: '87.5% Pure (875)',
    color: 'from-amber-500 to-orange-600 text-orange-300 border-orange-500/40 bg-orange-500/10',
    badge: 'Arab Market Benchmark',
  },
  GOLD_18K: {
    title: 'Gold 18K',
    purity: '75.0% Pure (750)',
    color: 'from-amber-600 to-amber-700 text-amber-200 border-amber-600/40 bg-amber-600/10',
    badge: 'Stone Setting & Modern',
  },
  SILVER_999: {
    title: 'Silver 999',
    purity: '99.9% Pure Fine Silver',
    color: 'from-slate-300 to-cyan-300 text-cyan-200 border-cyan-400/40 bg-cyan-500/10',
    badge: 'Fine Silver Bars / Ingots',
  },
};

export const BullionView: React.FC = () => {
  const [rates, setRates] = useState<UaeBullionRates | null>(null);
  const [holdings, setHoldings] = useState<BullionHoldingCalculated[]>([]);
  const [summary, setSummary] = useState<BullionPortfolioSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Display currency toggle: 'AED' | 'INR'
  const [currency, setCurrency] = useState<'AED' | 'INR'>('AED');

  // Filter: 'ALL' | 'GOLD' | 'SILVER'
  const [filter, setFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingHolding, setEditingHolding] = useState<BullionHolding | null>(null);
  const [formData, setFormData] = useState<{
    metalType: BullionMetalType;
    itemName: string;
    unit: 'grams' | 'tolas' | 'oz' | 'kg';
    inputWeight: string;
    priceMode: 'per_gram' | 'total';
    inputPrice: string;
    buyDate: string;
    notes: string;
  }>({
    metalType: 'GOLD_24K',
    itemName: '',
    unit: 'grams',
    inputWeight: '',
    priceMode: 'per_gram',
    inputPrice: '',
    buyDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch Bullion Data
  const loadBullionData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bullion');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load UAE bullion data');
      }

      setRates(data.rates);
      setHoldings(data.holdings || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error('Error fetching bullion:', err);
      setError(err?.message || 'Error loading live bullion data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBullionData();
  }, []);

  // Filtered holdings list
  const filteredHoldings = useMemo(() => {
    if (filter === 'GOLD') {
      return holdings.filter((h) => h.metalType !== 'SILVER_999');
    }
    if (filter === 'SILVER') {
      return holdings.filter((h) => h.metalType === 'SILVER_999');
    }
    return holdings;
  }, [holdings, filter]);

  // Open modal to add purchase
  const handleOpenAdd = () => {
    setEditingHolding(null);
    setFormData({
      metalType: 'GOLD_24K',
      itemName: '',
      unit: 'grams',
      inputWeight: '',
      priceMode: 'per_gram',
      inputPrice: rates ? rates.gold24k.aedPerGram.toString() : '',
      buyDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal to edit purchase
  const handleOpenEdit = (h: BullionHoldingCalculated) => {
    setEditingHolding(h);
    setFormData({
      metalType: h.metalType,
      itemName: h.itemName,
      unit: 'grams',
      inputWeight: h.weightGrams.toString(),
      priceMode: 'per_gram',
      inputPrice: h.buyPricePerGramAED.toString(),
      buyDate: h.buyDate,
      notes: h.notes || '',
    });
    setIsModalOpen(true);
  };

  // Convert input weight to grams
  const computedWeightGrams = useMemo(() => {
    const val = parseFloat(formData.inputWeight) || 0;
    if (formData.unit === 'grams') return val;
    if (formData.unit === 'tolas') return val * GRAMS_PER_TOLA;
    if (formData.unit === 'oz') return val * GRAMS_PER_TROY_OZ;
    if (formData.unit === 'kg') return val * 1000;
    return val;
  }, [formData.inputWeight, formData.unit]);

  // Convert input price to price per gram in AED
  const computedPricePerGramAED = useMemo(() => {
    const priceVal = parseFloat(formData.inputPrice) || 0;
    if (formData.priceMode === 'per_gram') {
      return priceVal;
    }
    if (computedWeightGrams > 0) {
      return priceVal / computedWeightGrams;
    }
    return 0;
  }, [formData.inputPrice, formData.priceMode, computedWeightGrams]);

  // Auto-fill current CMP
  const handleUseCurrentLivePrice = () => {
    if (!rates) return;
    let cmp = rates.gold24k.aedPerGram;
    if (formData.metalType === 'GOLD_22K') cmp = rates.gold22k.aedPerGram;
    if (formData.metalType === 'GOLD_21K') cmp = rates.gold21k.aedPerGram;
    if (formData.metalType === 'GOLD_18K') cmp = rates.gold18k.aedPerGram;
    if (formData.metalType === 'SILVER_999') cmp = rates.silver.aedPerGram;

    if (formData.priceMode === 'per_gram') {
      setFormData((prev) => ({ ...prev, inputPrice: cmp.toFixed(2) }));
    } else {
      const total = cmp * computedWeightGrams;
      setFormData((prev) => ({ ...prev, inputPrice: total.toFixed(2) }));
    }
  };

  // Submit Add / Edit Holding
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedWeightGrams <= 0) {
      alert('Please enter a valid weight greater than 0');
      return;
    }
    if (computedPricePerGramAED <= 0) {
      alert('Please enter a valid purchase price greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: editingHolding ? editingHolding.id : undefined,
        metalType: formData.metalType,
        itemName: formData.itemName.trim() || `${formData.metalType.replace('_', ' ')} Holding`,
        weightGrams: Math.round(computedWeightGrams * 1000) / 1000,
        buyPricePerGramAED: Math.round(computedPricePerGramAED * 100) / 100,
        buyDate: formData.buyDate,
        notes: formData.notes.trim(),
      };

      const res = await fetch('/api/bullion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save holding');
      }

      setHoldings(data.holdings || []);
      setSummary(data.summary || null);
      if (data.rates) setRates(data.rates);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving holding');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Holding
  const handleDeleteHolding = async (id: string) => {
    try {
      const res = await fetch(`/api/bullion?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete holding');
      }
      setHoldings(data.holdings || []);
      setSummary(data.summary || null);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Error deleting holding');
    }
  };

  // Helper currency formatter
  const formatVal = (aedVal: number, inrVal: number, decimals = 2) => {
    if (currency === 'INR') {
      return `₹${inrVal.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }
    return `${aedVal.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} AED`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Rates Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-surface-card to-surface-card border border-amber-500/30 p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Coins className="h-6 w-6 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    UAE Gold &amp; Silver Spot Terminal
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Master Admin
                  </span>
                </div>
                <p className="text-xs text-surface-muted mt-0.5">
                  Dubai Gold Souk live benchmark rates &bull; Official UAE Central Bank Peg &bull; Physical Bullion Portfolio
                </p>
              </div>
            </div>
          </div>

          {/* Peg & Forex Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-surface-card/90 border border-surface-border text-xs flex items-center gap-2">
              <span className="text-surface-muted">Peg:</span>
              <span className="font-bold text-white">1 USD = 3.6725 AED</span>
            </div>

            {rates && (
              <div className="px-3 py-1.5 rounded-xl bg-surface-card/90 border border-surface-border text-xs flex items-center gap-2">
                <span className="text-surface-muted">Forex:</span>
                <span className="font-bold text-emerald-400">1 AED ≈ ₹{rates.aedInrRate.toFixed(2)}</span>
              </div>
            )}

            {/* Currency Toggle */}
            <div className="flex items-center bg-surface-border/50 p-1 rounded-xl border border-surface-border">
              <button
                onClick={() => setCurrency('AED')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  currency === 'AED'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                AED (د.إ)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  currency === 'INR'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                INR (₹)
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadBullionData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-surface-border bg-surface-card hover:bg-surface-border/40 text-surface-muted hover:text-white transition-all disabled:opacity-50"
              title="Refresh live UAE market rates"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dubai Live Gold & Silver Spot Cards */}
        {loading && !rates ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-surface-border/30 animate-pulse" />
            ))}
          </div>
        ) : rates ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
            {/* Gold 24K */}
            <div className="rounded-xl p-3.5 bg-surface-card/80 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Gold 24K</span>
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    rates.gold24k.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {rates.gold24k.change24hPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {rates.gold24k.change24hPct >= 0 ? '+' : ''}
                  {rates.gold24k.change24hPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg md:text-xl font-black text-white">
                  {currency === 'AED' ? (
                    <span>{rates.gold24k.aedPerGram.toFixed(2)} <span className="text-xs font-normal text-amber-400/80">AED/g</span></span>
                  ) : (
                    <span>₹{rates.gold24k.inrPerGram.toLocaleString('en-IN')} <span className="text-xs font-normal text-amber-400/80">/g</span></span>
                  )}
                </div>
                <div className="text-[11px] text-surface-muted mt-0.5">
                  {currency === 'AED'
                    ? `≈ ₹${rates.gold24k.inrPerGram.toLocaleString('en-IN')}/g`
                    : `${rates.gold24k.aedPerGram.toFixed(2)} AED/g`}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-surface-border/50 text-[10px] text-amber-400/70 truncate">
                999.9 Fine Ingot / Bar
              </div>
            </div>

            {/* Gold 22K */}
            <div className="rounded-xl p-3.5 bg-surface-card/80 border border-yellow-500/30 hover:border-yellow-500/60 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-300">Gold 22K</span>
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    rates.gold22k.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {rates.gold22k.change24hPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {rates.gold22k.change24hPct >= 0 ? '+' : ''}
                  {rates.gold22k.change24hPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg md:text-xl font-black text-white">
                  {currency === 'AED' ? (
                    <span>{rates.gold22k.aedPerGram.toFixed(2)} <span className="text-xs font-normal text-yellow-400/80">AED/g</span></span>
                  ) : (
                    <span>₹{rates.gold22k.inrPerGram.toLocaleString('en-IN')} <span className="text-xs font-normal text-yellow-400/80">/g</span></span>
                  )}
                </div>
                <div className="text-[11px] text-surface-muted mt-0.5">
                  {currency === 'AED'
                    ? `≈ ₹${rates.gold22k.inrPerGram.toLocaleString('en-IN')}/g`
                    : `${rates.gold22k.aedPerGram.toFixed(2)} AED/g`}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-surface-border/50 text-[10px] text-yellow-400/70 truncate">
                916 Sovereign / Jewelry
              </div>
            </div>

            {/* Gold 21K */}
            <div className="rounded-xl p-3.5 bg-surface-card/80 border border-orange-500/30 hover:border-orange-500/60 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-300">Gold 21K</span>
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    rates.gold21k.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {rates.gold21k.change24hPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {rates.gold21k.change24hPct >= 0 ? '+' : ''}
                  {rates.gold21k.change24hPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg md:text-xl font-black text-white">
                  {currency === 'AED' ? (
                    <span>{rates.gold21k.aedPerGram.toFixed(2)} <span className="text-xs font-normal text-orange-400/80">AED/g</span></span>
                  ) : (
                    <span>₹{rates.gold21k.inrPerGram.toLocaleString('en-IN')} <span className="text-xs font-normal text-orange-400/80">/g</span></span>
                  )}
                </div>
                <div className="text-[11px] text-surface-muted mt-0.5">
                  {currency === 'AED'
                    ? `≈ ₹${rates.gold21k.inrPerGram.toLocaleString('en-IN')}/g`
                    : `${rates.gold21k.aedPerGram.toFixed(2)} AED/g`}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-surface-border/50 text-[10px] text-orange-400/70 truncate">
                875 Arab Market Standard
              </div>
            </div>

            {/* Gold 18K */}
            <div className="rounded-xl p-3.5 bg-surface-card/80 border border-amber-700/40 hover:border-amber-600/60 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-200">Gold 18K</span>
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    rates.gold18k.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {rates.gold18k.change24hPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {rates.gold18k.change24hPct >= 0 ? '+' : ''}
                  {rates.gold18k.change24hPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg md:text-xl font-black text-white">
                  {currency === 'AED' ? (
                    <span>{rates.gold18k.aedPerGram.toFixed(2)} <span className="text-xs font-normal text-amber-300/80">AED/g</span></span>
                  ) : (
                    <span>₹{rates.gold18k.inrPerGram.toLocaleString('en-IN')} <span className="text-xs font-normal text-amber-300/80">/g</span></span>
                  )}
                </div>
                <div className="text-[11px] text-surface-muted mt-0.5">
                  {currency === 'AED'
                    ? `≈ ₹${rates.gold18k.inrPerGram.toLocaleString('en-IN')}/g`
                    : `${rates.gold18k.aedPerGram.toFixed(2)} AED/g`}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-surface-border/50 text-[10px] text-amber-300/70 truncate">
                750 Modern &amp; Diamond
              </div>
            </div>

            {/* Silver 999 */}
            <div className="rounded-xl p-3.5 bg-surface-card/80 border border-cyan-500/30 hover:border-cyan-500/60 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Silver 999</span>
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    rates.silver.change24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {rates.silver.change24hPct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {rates.silver.change24hPct >= 0 ? '+' : ''}
                  {rates.silver.change24hPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg md:text-xl font-black text-white">
                  {currency === 'AED' ? (
                    <span>{rates.silver.aedPerGram.toFixed(2)} <span className="text-xs font-normal text-cyan-400/80">AED/g</span></span>
                  ) : (
                    <span>₹{rates.silver.inrPerGram.toLocaleString('en-IN')} <span className="text-xs font-normal text-cyan-400/80">/g</span></span>
                  )}
                </div>
                <div className="text-[11px] text-surface-muted mt-0.5">
                  {currency === 'AED'
                    ? `${rates.silver.aedPerKg.toLocaleString('en-US')} AED/kg`
                    : `₹${rates.silver.inrPerKg.toLocaleString('en-IN')}/kg`}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-surface-border/50 text-[10px] text-cyan-400/70 truncate">
                Spot: ${rates.usdSpotSilver}/oz
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Portfolio Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-muted uppercase tracking-wider">
              Total Invested
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary
              ? formatVal(summary.totalInvestedAED, summary.totalInvestedINR)
              : formatVal(0, 0)}
          </div>
          <div className="text-xs text-surface-muted mt-1">
            {summary && currency === 'AED'
              ? `≈ ₹${summary.totalInvestedINR.toLocaleString('en-IN')}`
              : summary && currency === 'INR'
              ? `${summary.totalInvestedAED.toLocaleString('en-US')} AED`
              : 'Physical bullion cost basis'}
          </div>
        </div>

        {/* Current Valuation */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-muted uppercase tracking-wider">
              Current Market Value
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {summary
              ? formatVal(summary.totalCurrentValueAED, summary.totalCurrentValueINR)
              : formatVal(0, 0)}
          </div>
          <div className="text-xs text-surface-muted mt-1">
            {summary && currency === 'AED'
              ? `≈ ₹${summary.totalCurrentValueINR.toLocaleString('en-IN')}`
              : summary && currency === 'INR'
              ? `${summary.totalCurrentValueAED.toLocaleString('en-US')} AED`
              : 'At live Dubai Souk CMP'}
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-muted uppercase tracking-wider">
              Unrealized Profit / Loss
            </span>
            {summary && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-0.5 ${
                  summary.totalPnlAED >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {summary.totalPnlAED >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {summary.totalPnlAED >= 0 ? '+' : ''}
                {summary.totalPnlPct.toFixed(2)}%
              </span>
            )}
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              summary && summary.totalPnlAED >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary
              ? `${summary.totalPnlAED >= 0 ? '+' : ''}${formatVal(
                  summary.totalPnlAED,
                  summary.totalPnlINR
                )}`
              : formatVal(0, 0)}
          </div>
          <div className="text-xs text-surface-muted mt-1">
            {summary && currency === 'AED'
              ? `≈ ${summary.totalPnlINR >= 0 ? '+' : ''}₹${summary.totalPnlINR.toLocaleString('en-IN')}`
              : summary && currency === 'INR'
              ? `${summary.totalPnlAED >= 0 ? '+' : ''}${summary.totalPnlAED.toLocaleString('en-US')} AED`
              : 'Net portfolio returns'}
          </div>
        </div>

        {/* Total Physical Weight */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-surface-muted uppercase tracking-wider">
              Bullion Holdings Weight
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-400">
              {summary ? summary.totalGoldGrams.toFixed(2) : '0.00'}g
            </span>
            <span className="text-xs text-surface-muted">Gold</span>
            {summary && summary.totalGoldTolas > 0 && (
              <span className="text-xs text-amber-300/80 font-semibold">
                ({summary.totalGoldTolas.toFixed(2)} tolas)
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1 text-xs text-surface-muted">
            <span className="font-bold text-cyan-300">
              {summary ? summary.totalSilverGrams.toFixed(1) : '0.0'}g
            </span>
            <span>Silver</span>
            {summary && summary.totalSilverKg >= 0.1 && (
              <span className="text-cyan-400/80">({summary.totalSilverKg.toFixed(2)} kg)</span>
            )}
            <span className="ml-auto text-[11px] text-surface-muted">
              {summary?.itemCount || 0} item(s)
            </span>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-sm">
        {/* Action Header & Tabs */}
        <div className="p-4 sm:p-5 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-border/40 p-1 rounded-xl border border-surface-border text-xs font-semibold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                All Assets ({holdings.length})
              </button>
              <button
                onClick={() => setFilter('GOLD')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'GOLD'
                    ? 'bg-amber-500 text-black shadow-sm font-bold'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                Gold ({holdings.filter((h) => h.metalType !== 'SILVER_999').length})
              </button>
              <button
                onClick={() => setFilter('SILVER')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'SILVER'
                    ? 'bg-cyan-500 text-black shadow-sm font-bold'
                    : 'text-surface-muted hover:text-white'
                }`}
              >
                Silver ({holdings.filter((h) => h.metalType === 'SILVER_999').length})
              </button>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>Record Bullion Purchase</span>
          </button>
        </div>

        {/* Holdings Table */}
        {filteredHoldings.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Coins className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">No bullion holdings recorded yet</h3>
            <p className="text-xs text-surface-muted max-w-md mx-auto mt-1.5">
              Keep track of your physical gold bars, coins, sovereign jewelry, and silver ingots against real-time Dubai Souk prices.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Purchase</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface/50 text-[11px] font-semibold text-surface-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Metal / Asset</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4 text-right">Weight</th>
                  <th className="py-3 px-4 text-right">Buy Price / g</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Current Rate / g</th>
                  <th className="py-3 px-4 text-right">Market Value</th>
                  <th className="py-3 px-4 text-right">Unrealized P&amp;L</th>
                  <th className="py-3 px-4">Notes / Dealer</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredHoldings.map((h) => {
                  const meta = METAL_LABELS[h.metalType];
                  const tolas = (h.weightGrams / GRAMS_PER_TOLA).toFixed(2);
                  const isProfit = h.pnlAED >= 0;

                  return (
                    <tr key={h.id} className="hover:bg-surface-border/20 transition-colors">
                      {/* Asset & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${meta.color}`}
                          >
                            {meta.title}
                          </span>
                          <div>
                            <div className="font-bold text-white">{h.itemName}</div>
                            <div className="text-[10px] text-surface-muted">{meta.purity}</div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-surface-muted font-medium whitespace-nowrap">
                        {h.buyDate}
                      </td>

                      {/* Weight */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-white">{h.weightGrams.toFixed(2)}g</div>
                        {h.metalType !== 'SILVER_999' ? (
                          <div className="text-[10px] text-amber-400/80">{tolas} tola</div>
                        ) : (
                          <div className="text-[10px] text-cyan-400/80">
                            {(h.weightGrams / 1000).toFixed(3)} kg
                          </div>
                        )}
                      </td>

                      {/* Buy Price / g */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {currency === 'AED'
                            ? `${h.buyPricePerGramAED.toFixed(2)} AED`
                            : `₹${(h.buyPricePerGramAED * (rates?.aedInrRate || 23.1)).toFixed(0)}`}
                        </div>
                      </td>

                      {/* Total Cost */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-white">
                          {formatVal(h.totalCostAED, h.totalCostINR)}
                        </div>
                      </td>

                      {/* CMP / g */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-amber-300">
                          {currency === 'AED'
                            ? `${h.currentPricePerGramAED.toFixed(2)} AED`
                            : `₹${h.currentPricePerGramINR.toFixed(0)}`}
                        </div>
                      </td>

                      {/* Market Value */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-black text-white">
                          {formatVal(h.currentValueAED, h.currentValueINR)}
                        </div>
                      </td>

                      {/* Unrealized P&L */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-black flex items-center justify-end gap-0.5 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatVal(h.pnlAED, h.pnlINR)}
                        </div>
                        <div
                          className={`text-[10px] font-bold ${
                            isProfit ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {h.pnlPct.toFixed(2)}%
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-[180px] truncate text-surface-muted" title={h.notes}>
                        {h.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(h)}
                            className="p-1.5 rounded-lg border border-surface-border text-surface-muted hover:text-white hover:bg-surface-border/40 transition-colors"
                            title="Edit holding"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {deleteConfirmId === h.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteHolding(h.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-500 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-surface-border text-surface-muted text-[10px] hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(h.id)}
                              className="p-1.5 rounded-lg border border-surface-border text-surface-muted hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                              title="Delete holding"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Bullion Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-scale-in">
            {/* Modal Header (Pinned) */}
            <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingHolding ? 'Edit Bullion Holding' : 'Record Bullion Purchase'}
                  </h3>
                  <p className="text-[11px] text-surface-muted">
                    Save purchase details in UAE Dirhams (AED) to track live P&amp;L
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface-border/40 transition-colors"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
                {/* Metal Type Selector */}
                <div>
                  <label className="block font-semibold text-surface-muted mb-1.5">Select Metal Purity</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['GOLD_24K', 'GOLD_22K', 'GOLD_21K', 'GOLD_18K', 'SILVER_999'] as BullionMetalType[]).map(
                      (type) => {
                        const meta = METAL_LABELS[type];
                        const isSelected = formData.metalType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, metalType: type }))}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/15 text-white shadow-sm ring-1 ring-amber-500'
                                : 'border-surface-border bg-surface/50 text-surface-muted hover:border-surface-borderLight'
                            }`}
                          >
                            <div className="font-bold">{meta.title}</div>
                            <div className="text-[10px] opacity-75">{meta.purity}</div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Item / Description Name */}
                <div>
                  <label className="block font-semibold text-surface-muted mb-1">
                    Item Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10g Emirates Mint 24K Bar, Malabar 22K Bangle, 1kg Silver Ingot"
                    value={formData.itemName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, itemName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-white placeholder-surface-muted/50 focus:outline-none focus:border-amber-500 transition-colors text-xs"
                  />
                </div>

                {/* Quantity & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-surface-muted mb-1">
                      Weight / Quantity <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 10 or 1"
                      value={formData.inputWeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, inputWeight: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-white placeholder-surface-muted/50 focus:outline-none focus:border-amber-500 transition-colors text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-surface-muted mb-1">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          unit: e.target.value as 'grams' | 'tolas' | 'oz' | 'kg',
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-amber-500 transition-colors text-xs font-semibold"
                    >
                      <option value="grams">Grams (g)</option>
                      <option value="tolas">Tolas (11.66g)</option>
                      <option value="oz">Troy Ounces (oz)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </div>

                {/* Buy Price Entry */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-surface-muted">
                      Buy Price <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            priceMode: prev.priceMode === 'per_gram' ? 'total' : 'per_gram',
                          }))
                        }
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        {formData.priceMode === 'per_gram' ? 'Switch to Total AED' : 'Switch to AED/gram'}
                      </button>
                      {rates && (
                        <button
                          type="button"
                          onClick={handleUseCurrentLivePrice}
                          className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
                        >
                          <Sparkles className="h-3 w-3" /> Use Today&apos;s UAE CMP
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={
                        formData.priceMode === 'per_gram'
                          ? 'e.g. 516.10 (AED per gram)'
                          : 'e.g. 5161.00 (Total AED paid)'
                      }
                      value={formData.inputPrice}
                      onChange={(e) => setFormData((prev) => ({ ...prev, inputPrice: e.target.value }))}
                      className="w-full px-3 py-2 pr-16 rounded-xl bg-surface border border-surface-border text-white placeholder-surface-muted/50 focus:outline-none focus:border-amber-500 transition-colors text-xs font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-surface-muted text-[11px] font-semibold">
                      {formData.priceMode === 'per_gram' ? 'AED / g' : 'Total AED'}
                    </span>
                  </div>
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block font-semibold text-surface-muted mb-1">
                    Purchase Date <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formData.buyDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, buyDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-amber-500 transition-colors text-xs"
                    />
                  </div>
                </div>

                {/* Notes / Dealer / Invoice */}
                <div>
                  <label className="block font-semibold text-surface-muted mb-1">
                    Dealer / Jeweler / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dubai Gold Souk, Joyalukkas, Malabar Gold, Invoice #54921"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-white placeholder-surface-muted/50 focus:outline-none focus:border-amber-500 transition-colors text-xs"
                  />
                </div>

                {/* Live Preview Card */}
                {computedWeightGrams > 0 && computedPricePerGramAED > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1.5 text-amber-200">
                    <div className="flex items-center justify-between font-bold">
                      <span>Effective Weight:</span>
                      <span>
                        {computedWeightGrams.toFixed(2)}g{' '}
                        <span className="opacity-80 font-normal">
                          ({(computedWeightGrams / GRAMS_PER_TOLA).toFixed(2)} tolas)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold">
                      <span>Effective Rate:</span>
                      <span>{computedPricePerGramAED.toFixed(2)} AED / g</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black text-white pt-1 border-t border-amber-500/20">
                      <span>Total Purchase Cost:</span>
                      <span className="text-amber-300">
                        {(computedWeightGrams * computedPricePerGramAED).toFixed(2)} AED{' '}
                        {rates && (
                          <span className="text-surface-muted font-normal text-[10px]">
                            (≈ ₹
                            {(
                              computedWeightGrams *
                              computedPricePerGramAED *
                              rates.aedInrRate
                            ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            )
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons (Pinned Sticky Footer - Always Visible!) */}
              <div className="p-3.5 sm:p-4 border-t border-surface-border bg-surface/95 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="text-[11px] text-surface-muted truncate max-w-[170px] sm:max-w-none">
                  {computedWeightGrams > 0 && computedPricePerGramAED > 0 ? (
                    <span className="text-amber-400 font-bold">
                      Total: {(computedWeightGrams * computedPricePerGramAED).toFixed(2)} AED
                    </span>
                  ) : (
                    <span>Fill weight &amp; price</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-surface-border text-surface-muted hover:text-white hover:bg-surface-border/30 transition-colors text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 hover:scale-[1.02]"
                  >
                    {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingHolding ? 'Update Holding' : 'Save Holding'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
