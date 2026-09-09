import { ConvictionType } from '@/types/stock';

/**
 * Calculates 14-period RSI from historical close prices
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // Default neutral if not enough data

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Math.round(rsi * 10) / 10;
}

/**
 * Calculates Exponential Moving Average
 */
export function calculateEMA(closes: number[], period: number): number | undefined {
  if (closes.length < period) return undefined;

  const k = 2 / (period + 1);
  // Initial SMA
  let ema = closes.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return Math.round(ema * 100) / 100;
}

/**
 * Multi-factor Conviction & Signal Engine
 */
export function evaluateConviction(params: {
  price: number;
  high52: number;
  low52: number;
  rsi?: number;
  ema50?: number;
  ema200?: number;
  peRatio?: number;
  changePercent: number;
}): { signal: ConvictionType; score: number; reason: string; tags: string[] } {
  const { price, high52, low52, rsi, ema50, ema200, peRatio, changePercent } = params;

  const discountFromHigh = high52 > 0 ? ((high52 - price) / high52) * 100 : 0;
  const tags: string[] = [];
  let score = 5.0; // Baseline neutral

  // 1. Discount Factor (Up to +2.5 pts)
  if (discountFromHigh >= 25) {
    score += 2.5;
    tags.push('Deep 25%+ Discount');
  } else if (discountFromHigh >= 15) {
    score += 1.8;
    tags.push('Value Discount');
  } else if (discountFromHigh >= 8) {
    score += 0.8;
    tags.push('Moderate Pullback');
  }

  // 2. RSI Oversold / Overbought Factor (Up to +/- 2 pts)
  if (rsi !== undefined) {
    if (rsi < 30) {
      score += 2.2;
      tags.push('RSI Deeply Oversold (<30)');
    } else if (rsi < 40) {
      score += 1.3;
      tags.push('RSI Oversold (<40)');
    } else if (rsi > 75) {
      score -= 2.5;
      tags.push('Overbought (RSI > 75)');
    } else if (rsi > 68) {
      score -= 1.2;
      tags.push('Approaching Resistance');
    }
  }

  // 3. Moving Average Trend Support (Up to +1.5 pts)
  if (ema50 && ema200) {
    const isMacroUptrend = price > ema200;
    if (isMacroUptrend) {
      tags.push('Above 200 EMA (Bullish Macro)');
      // Near 50 EMA bounce
      const diff50 = Math.abs(price - ema50) / ema50;
      if (diff50 < 0.02) {
        score += 1.2;
        tags.push('Testing 50 EMA Support');
      }
    } else {
      score -= 1.0;
      tags.push('Below 200 EMA (Bearish Trend)');
    }
  }

  // 4. Valuation Check (PE sanity)
  if (peRatio && peRatio > 0) {
    if (peRatio < 22) {
      score += 0.8;
      tags.push('Attractive P/E (<22)');
    } else if (peRatio > 70) {
      score -= 0.8;
      tags.push('Premium Valuation (P/E > 70)');
    }
  }

  // 5. Daily Drop / Dip Trigger
  if (changePercent <= -2.5) {
    tags.push('Intraday Dip');
  }

  // Clamp score between 1.0 and 9.9
  score = Math.max(1.0, Math.min(9.8, Math.round(score * 10) / 10));

  let signal: ConvictionType = 'HOLD';
  let reason = '';

  if (score >= 8.2) {
    signal = 'STRONG_BUY';
    reason = `Exceptional risk-reward: ${discountFromHigh.toFixed(1)}% off 52W high with oversold RSI and key support confluence.`;
  } else if (score >= 6.8) {
    signal = 'BUY';
    reason = `Favorable entry: Trading at a discount with stabilizing indicators and strong accumulation zone.`;
  } else if (score >= 4.5) {
    signal = 'HOLD';
    reason = `Consolidating in fair-value territory. Await clearer breakout or deeper value pullback.`;
  } else if (score >= 3.0) {
    signal = 'SELL';
    reason = `Extended valuation or testing downward momentum. Protect profits or tighten stop-losses.`;
  } else {
    signal = 'STRONG_SELL';
    reason = `Severe overbought conditions or breakdown below critical moving averages.`;
  }

  return { signal, score, reason, tags };
}

