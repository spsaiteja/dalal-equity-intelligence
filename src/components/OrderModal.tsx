'use client';

import React, { useState, useEffect } from 'react';
import { StockQuote } from '@/types/stock';
import { OrderPlacementRequest, OrderPlacementResponse } from '@/types/upstox';
import { placeBrowserDirectUpstoxOrder } from '@/lib/upstox-client';
import {
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
  DollarSign,
  Wallet,
} from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockQuote | null;
  initialTransactionType?: 'BUY' | 'SELL';
  suggestedTarget?: number | string;
  suggestedStopLoss?: number | string;
  isUpstoxConnected: boolean;
  onOrderSuccess?: (response: OrderPlacementResponse) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  stock,
  initialTransactionType = 'BUY',
  suggestedTarget,
  suggestedStopLoss,
  isUpstoxConnected,
  onOrderSuccess,
}) => {
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>(initialTransactionType);
  const [productType, setProductType] = useState<'D' | 'I'>('D'); // D = Delivery/CNC, I = Intraday/MIS
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [isPaperTrade, setIsPaperTrade] = useState<boolean>(!isUpstoxConnected);
  const [capitalInput, setCapitalInput] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<OrderPlacementResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen && stock) {
      setTransactionType(initialTransactionType);
      setLimitPrice(stock.price);
      setTargetPrice(suggestedTarget ? String(suggestedTarget).replace('₹', '') : String(Math.round(stock.price * 1.12)));
      setStopLossPrice(suggestedStopLoss ? String(suggestedStopLoss).replace('₹', '') : String(Math.round(stock.price * 0.94)));
      setIsPaperTrade(!isUpstoxConnected);
      setOrderResult(null);
      setErrorMessage(null);
      setQuantity(10);
      setCapitalInput('');
    }
  }, [isOpen, stock, initialTransactionType, suggestedTarget, suggestedStopLoss, isUpstoxConnected]);

  if (!isOpen || !stock) return null;

  const currentPrice = stock.price || 100;
  const effectivePrice = orderType === 'MARKET' ? currentPrice : limitPrice;
  const totalInvested = quantity * effectivePrice;
  const estimatedCharges = totalInvested > 0 ? (productType === 'D' ? 20 : 15) : 0;
  const totalPayable = totalInvested + estimatedCharges;

  // Handle Quick Capital Allocation (e.g. ₹25,000 &rarr; calculate qty)
  const handleApplyCapital = (amount: number) => {
    if (effectivePrice > 0) {
      const computedQty = Math.max(1, Math.floor(amount / effectivePrice));
      setQuantity(computedQty);
      setCapitalInput(String(amount));
    }
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    const payload: OrderPlacementRequest = {
      symbol: stock.symbol,
      companyName: stock.name,
      quantity,
      orderType,
      transactionType,
      productType,
      price: effectivePrice,
      targetPrice: parseFloat(targetPrice) || undefined,
      stopLossPrice: parseFloat(stopLossPrice) || undefined,
      isPaperTrade,
    };

    const userUpstoxToken = typeof window !== 'undefined'
      ? localStorage.getItem('dalal_upstox_token')
      : null;

    try {

      const res = await fetch('/api/upstox/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userUpstoxToken ? { 'x-upstox-token': userUpstoxToken } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setOrderResult(data);
        if (onOrderSuccess) onOrderSuccess(data);
      } else if (!isPaperTrade && userUpstoxToken && (data.error?.includes('static IP') || data.isStaticIpError)) {
        // Fall back to browser-direct order placement matching user's whitelisted Static IP
        try {
          const directRes = await placeBrowserDirectUpstoxOrder(userUpstoxToken, {
            symbol: stock.symbol,
            quantity,
            orderType,
            transactionType,
            productType,
            price: effectivePrice,
            triggerPrice: parseFloat(stopLossPrice) || undefined,
            isAmo: payload.isAmo,
          });

          if (directRes.success) {
            const directResult: OrderPlacementResponse = {
              success: true,
              orderId: directRes.orderId || `UPSTOX-${Date.now()}`,
              status: (directRes.status as any) || 'PENDING',
              message: directRes.message || `Upstox order placed via browser-direct Static IP!`,
              executionPrice: effectivePrice,
              totalValue: parseFloat((quantity * effectivePrice).toFixed(2)),
              timestamp: new Date().toISOString(),
              isPaperTrade: false,
            };
            setOrderResult(directResult);
            if (onOrderSuccess) onOrderSuccess(directResult);
          } else {
            setErrorMessage(directRes.error || data.error || 'Order placement rejected.');
          }
        } catch (directErr: any) {
          setErrorMessage(directErr.message || 'Direct browser order placement failed.');
        }
      } else {
        setErrorMessage(data.error || 'Order placement rejected.');
      }
    } catch {
      // Direct browser attempt if network fetch to server failed
      if (!isPaperTrade && userUpstoxToken) {
        try {
          const directRes = await placeBrowserDirectUpstoxOrder(userUpstoxToken, {
            symbol: stock.symbol,
            quantity,
            orderType,
            transactionType,
            productType,
            price: effectivePrice,
            triggerPrice: parseFloat(stopLossPrice) || undefined,
            isAmo: payload.isAmo,
          });
          if (directRes.success) {
            const directResult: OrderPlacementResponse = {
              success: true,
              orderId: directRes.orderId || `UPSTOX-${Date.now()}`,
              status: (directRes.status as any) || 'PENDING',
              message: directRes.message || `Upstox order placed via browser-direct Static IP!`,
              executionPrice: effectivePrice,
              totalValue: parseFloat((quantity * effectivePrice).toFixed(2)),
              timestamp: new Date().toISOString(),
              isPaperTrade: false,
            };
            setOrderResult(directResult);
            if (onOrderSuccess) onOrderSuccess(directResult);
            return;
          }
        } catch {}
      }
      setErrorMessage('Network error connecting to order gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface/60">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-md ${
                transactionType === 'BUY'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {transactionType === 'BUY' ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{stock.symbol.replace('.NS', '')}</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-surface border border-surface-border text-surface-muted">
                  NSE EQ
                </span>
              </div>
              <p className="text-xs text-surface-muted truncate max-w-[220px]">{stock.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <span className="text-sm font-black text-white block">
                ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stock.change >= 0 ? '+' : ''}
                {stock.changePercent.toFixed(2)}%
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {orderResult ? (
            /* SUCCESS CONFIRMATION SCREEN */
            <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">Order Submitted Successfully!</h4>
                <p className="text-xs text-surface-muted max-w-sm mx-auto">{orderResult.message}</p>
              </div>

              {/* Order Receipt Box */}
              <div className="bg-surface border border-surface-border rounded-xl p-4 text-xs space-y-2 text-left max-w-sm mx-auto">
                <div className="flex justify-between border-b border-surface-border pb-1.5">
                  <span className="text-surface-muted">Order ID</span>
                  <span className="font-mono text-white font-bold">{orderResult.orderId}</span>
                </div>
                <div className="flex justify-between border-b border-surface-border pb-1.5">
                  <span className="text-surface-muted">Execution Mode</span>
                  <span
                    className={`font-bold ${
                      orderResult.isPaperTrade ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {orderResult.isPaperTrade ? 'Paper Trading (Simulation)' : 'Live NSE / Upstox'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-surface-border pb-1.5">
                  <span className="text-surface-muted">Total Order Value</span>
                  <span className="font-mono text-white font-bold">
                    ₹{orderResult.totalValue?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-muted">Status</span>
                  <span className="px-1.5 py-0.2 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {orderResult.status}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ORDER FORM */
            <>
              {/* Transaction Selector: BUY vs SELL */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-xl border border-surface-border">
                <button
                  type="button"
                  onClick={() => setTransactionType('BUY')}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    transactionType === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-surface-muted hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>BUY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('SELL')}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    transactionType === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-surface-muted hover:text-white'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  <span>SELL</span>
                </button>
              </div>

              {/* Product & Order Type Switchers */}
              <div className="grid grid-cols-2 gap-3">
                {/* Product Type: Delivery vs Intraday */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block mb-1">
                    Product
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-surface p-1 rounded-xl border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setProductType('D')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        productType === 'D'
                          ? 'bg-surface-card text-white border border-surface-borderLight'
                          : 'text-surface-muted hover:text-white'
                      }`}
                    >
                      Delivery (CNC)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType('I')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        productType === 'I'
                          ? 'bg-surface-card text-white border border-surface-borderLight'
                          : 'text-surface-muted hover:text-white'
                      }`}
                    >
                      Intraday (MIS)
                    </button>
                  </div>
                </div>

                {/* Order Type: Market vs Limit */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block mb-1">
                    Order Type
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-surface p-1 rounded-xl border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setOrderType('MARKET')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        orderType === 'MARKET'
                          ? 'bg-surface-card text-white border border-surface-borderLight'
                          : 'text-surface-muted hover:text-white'
                      }`}
                    >
                      Market (CMP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('LIMIT')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        orderType === 'LIMIT'
                          ? 'bg-surface-card text-white border border-surface-borderLight'
                          : 'text-surface-muted hover:text-white'
                      }`}
                    >
                      Limit Price
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantity & Limit Price Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block mb-1">
                    Quantity (Shares)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 5))}
                      className="h-10 w-9 bg-surface border border-surface-border rounded-xl text-white font-bold hover:bg-surface-hover transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm text-center text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 5)}
                      className="h-10 w-9 bg-surface border border-surface-border rounded-xl text-white font-bold hover:bg-surface-hover transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-surface-muted block mb-1">
                    {orderType === 'MARKET' ? 'Market Execution Price' : 'Custom Limit Price (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    disabled={orderType === 'MARKET'}
                    value={orderType === 'MARKET' ? currentPrice : limitPrice}
                    onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Quick Allocation Presets */}
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-surface-muted mb-1">
                  <span>Quick Shares</span>
                  <span>or Quick Capital</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 25, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        quantity === qty
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-surface border-surface-border text-surface-muted hover:text-white'
                      }`}
                    >
                      {qty} Qty
                    </button>
                  ))}

                  <div className="flex items-center gap-1 ml-auto">
                    {[10000, 25000, 50000].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => handleApplyCapital(cap)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-surface border border-surface-border text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors"
                      >
                        ₹{(cap / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CIO Risk/Reward Controls Matrix */}
              <div className="bg-surface/80 border border-purple-500/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>CIO Trade Targets</span>
                  </span>
                  <span className="text-[10px] text-surface-muted">Pre-filled by AI Council</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-surface-muted block mb-0.5">Target Price (₹)</label>
                    <input
                      type="text"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="e.g. 4200"
                      className="w-full bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-muted block mb-0.5">Stop-Loss (₹)</label>
                    <input
                      type="text"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      placeholder="e.g. 3850"
                      className="w-full bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Execution Mode: Live Upstox vs Paper Trading Switcher */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface-border">
                <div className="flex items-center gap-2">
                  {isPaperTrade ? (
                    <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Wallet className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isPaperTrade ? 'Paper Trading Mode (Simulation)' : 'Live Upstox Demat Account'}
                    </span>
                    <span className="text-[10px] text-surface-muted">
                      {isPaperTrade
                        ? 'Zero financial risk. Practice order execution.'
                        : 'Real money trade dispatches directly to NSE exchange.'}
                    </span>
                  </div>
                </div>

                {isUpstoxConnected && (
                  <button
                    type="button"
                    onClick={() => setIsPaperTrade(!isPaperTrade)}
                    className="px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border hover:border-surface-borderLight text-[10px] font-bold text-white transition-colors"
                  >
                    Switch to {isPaperTrade ? 'Live' : 'Paper'}
                  </button>
                )}
              </div>

              {/* Order Cost Summary */}
              <div className="bg-surface-card border border-surface-border rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-surface-muted">
                  <span>Required Margin ({quantity} shares @ ₹{effectivePrice.toLocaleString('en-IN')})</span>
                  <span className="font-mono text-white font-semibold">
                    ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-surface-muted text-[11px]">
                  <span>Est. Brokerage & Taxes (STT, GST)</span>
                  <span className="font-mono text-surface-muted">₹{estimatedCharges}</span>
                </div>
                <div className="flex justify-between border-t border-surface-border pt-1.5 font-bold">
                  <span className="text-white">Estimated Total</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    ₹{totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting || quantity <= 0}
                  className={`w-full py-3 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    transactionType === 'BUY'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                  }`}
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  <span>
                    Confirm {transactionType} Order ({quantity} Shares @ ₹
                    {effectivePrice.toLocaleString('en-IN')})
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

