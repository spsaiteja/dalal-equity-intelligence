import { ConvictionType } from '@/types/stock';
import {
  DeliberationEvaluation,
  DeliberationOutcome,
  CouncilCalibrationMetrics,
  SymbolTrackRecord,
} from '@/types/calibration';
import {
  DeliberationMemoryEntry,
  getSymbolDeliberationHistory,
  getAllDeliberations,
} from './memory';

/**
 * Cleanly extracts numeric price from currency strings (e.g. "₹2,725.50" -> 2725.5)
 */
export function parsePriceString(str?: string): number | undefined {
  if (!str) return undefined;
  const cleaned = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Evaluates an individual past council deliberation against the current stock price.
 */
export function evaluateDeliberationAccuracy(
  entry: DeliberationMemoryEntry,
  currentPrice: number
): DeliberationEvaluation {
  const origPrice = entry.price || currentPrice;
  const priceChangePercent = origPrice > 0
    ? Number((((currentPrice - origPrice) / origPrice) * 100).toFixed(2))
    : 0;

  const target1Price = parsePriceString(entry.target1);
  const stopLossPrice = parsePriceString(entry.stopLoss);
  const verdict = (entry.cioVerdict || 'HOLD') as ConvictionType;

  const isBullish = verdict === 'STRONG_BUY' || verdict === 'BUY';
  const isBearish = verdict === 'STRONG_SELL' || verdict === 'SELL' || (verdict as any) === 'AVOID';

  let target1Hit = false;
  let stopLossHit = false;

  if (isBullish) {
    target1Hit = target1Price ? currentPrice >= target1Price : priceChangePercent >= 5.0;
    stopLossHit = stopLossPrice ? currentPrice <= stopLossPrice : priceChangePercent <= -5.0;
  } else if (isBearish) {
    target1Hit = target1Price ? currentPrice <= target1Price : priceChangePercent <= -5.0;
    stopLossHit = stopLossPrice ? currentPrice >= stopLossPrice : priceChangePercent >= 5.0;
  }

  let outcome: DeliberationOutcome = 'NEUTRAL';

  if (isBullish) {
    if (target1Hit || priceChangePercent >= 2.0) {
      outcome = 'PROFITABLE';
    } else if (stopLossHit || priceChangePercent <= -2.0) {
      outcome = 'ADVERSE';
    } else {
      outcome = 'NEUTRAL';
    }
  } else if (isBearish) {
    if (target1Hit || priceChangePercent <= -2.0) {
      outcome = 'PROFITABLE';
    } else if (stopLossHit || priceChangePercent >= 2.0) {
      outcome = 'ADVERSE';
    } else {
      outcome = 'NEUTRAL';
    }
  } else {
    // Neutral (HOLD recommendation): accurate if price stayed within +/- 3.5%
    if (Math.abs(priceChangePercent) <= 3.5) {
      outcome = 'PROFITABLE';
    } else {
      outcome = 'NEUTRAL';
    }
  }

  const holdingDays = Math.max(
    0,
    Math.round(
      (new Date().getTime() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return {
    runId: entry.runId,
    symbol: entry.symbol,
    recommendationDate: entry.timestamp,
    originalPrice: origPrice,
    currentPrice,
    cioVerdict: verdict,
    priceChangePercent,
    target1Price,
    stopLossPrice,
    target1Hit,
    stopLossHit,
    outcome,
    holdingPeriodDays: holdingDays,
    target1Str: entry.target1,
    stopLossStr: entry.stopLoss,
  };
}

/**
 * Computes system-level or symbol-level calibration metrics from a list of evaluations.
 */
export function calculateCalibrationMetrics(
  evaluations: DeliberationEvaluation[]
): CouncilCalibrationMetrics {
  const total = evaluations.length;
  if (total === 0) {
    return {
      totalEvaluatedRuns: 0,
      profitableRuns: 0,
      adverseRuns: 0,
      neutralRuns: 0,
      directionalWinRatePercent: 0,
      target1HitRatePercent: 0,
      stopLossHitRatePercent: 0,
      averageReturnPercent: 0,
      profitFactor: 1.0,
      brierAccuracyScore: 0.25,
      verdictWinRates: {},
    };
  }

  let profitable = 0;
  let adverse = 0;
  let neutral = 0;
  let target1Hits = 0;
  let stopLossHits = 0;
  let totalReturn = 0;
  let grossGains = 0;
  let grossLosses = 0;
  let brierSum = 0;

  const verdictStats: Record<string, { total: number; profitable: number }> = {};

  for (const ev of evaluations) {
    const v = ev.cioVerdict || 'HOLD';
    if (!verdictStats[v]) verdictStats[v] = { total: 0, profitable: 0 };
    verdictStats[v].total++;

    if (ev.outcome === 'PROFITABLE') {
      profitable++;
      verdictStats[v].profitable++;
    } else if (ev.outcome === 'ADVERSE') {
      adverse++;
    } else {
      neutral++;
    }

    if (ev.target1Hit) target1Hits++;
    if (ev.stopLossHit) stopLossHits++;

    // Calculate effective return for this evaluation
    const isBearish = v === 'STRONG_SELL' || v === 'SELL' || (v as any) === 'AVOID';
    const effectiveReturn = isBearish ? -ev.priceChangePercent : ev.priceChangePercent;
    totalReturn += effectiveReturn;

    if (effectiveReturn > 0) {
      grossGains += effectiveReturn;
    } else if (effectiveReturn < 0) {
      grossLosses += Math.abs(effectiveReturn);
    }

    // Probabilistic Brier score calculation:
    // Assign expected probability based on institutional conviction tier
    let expectedProbability = 0.5;
    if (v === 'STRONG_BUY') expectedProbability = 0.85;
    else if (v === 'BUY') expectedProbability = 0.70;
    else if (v === 'HOLD') expectedProbability = 0.50;
    else if (v === 'SELL') expectedProbability = 0.70;
    else if (v === 'STRONG_SELL') expectedProbability = 0.85;

    const actualOutcomeBinary = ev.outcome === 'PROFITABLE' ? 1.0 : ev.outcome === 'NEUTRAL' ? 0.5 : 0.0;
    brierSum += Math.pow(expectedProbability - actualOutcomeBinary, 2);
  }

  const decisionalRuns = profitable + adverse;
  const winRate = decisionalRuns > 0 ? (profitable / decisionalRuns) * 100 : (profitable / total) * 100;
  const profitFactor = grossLosses > 0 ? Number((grossGains / grossLosses).toFixed(2)) : grossGains > 0 ? 5.0 : 1.0;
  const brierAccuracyScore = Number((brierSum / total).toFixed(3));

  const verdictWinRates: Record<string, { total: number; profitable: number; winRatePercent: number }> = {};
  for (const [k, val] of Object.entries(verdictStats)) {
    verdictWinRates[k] = {
      total: val.total,
      profitable: val.profitable,
      winRatePercent: val.total > 0 ? Math.round((val.profitable / val.total) * 100) : 0,
    };
  }

  return {
    totalEvaluatedRuns: total,
    profitableRuns: profitable,
    adverseRuns: adverse,
    neutralRuns: neutral,
    directionalWinRatePercent: Math.round(winRate),
    target1HitRatePercent: Math.round((target1Hits / total) * 100),
    stopLossHitRatePercent: Math.round((stopLossHits / total) * 100),
    averageReturnPercent: Number((totalReturn / total).toFixed(2)),
    profitFactor,
    brierAccuracyScore,
    verdictWinRates,
  };
}

/**
 * Retrieves past deliberations for a stock and computes its historical track record.
 */
export async function getSymbolTrackRecord(
  symbol: string,
  currentPrice?: number
): Promise<SymbolTrackRecord> {
  const history = await getSymbolDeliberationHistory(symbol, 20);

  // If no current price is provided, default to the most recent run's price
  const activePrice = currentPrice || (history.length > 0 ? history[0].price : 1000);

  const evaluations = history.map((entry) => evaluateDeliberationAccuracy(entry, activePrice));
  const metrics = calculateCalibrationMetrics(evaluations);

  return {
    symbol: symbol.toUpperCase(),
    metrics,
    evaluations,
  };
}

/**
 * Retrieves all deliberations across the platform and computes global council accuracy.
 */
export async function getSystemCalibrationReport(
  quotesMap: Record<string, number> = {}
): Promise<{ metrics: CouncilCalibrationMetrics; evaluations: DeliberationEvaluation[] }> {
  const allDeliberations = await getAllDeliberations();

  const evaluations = allDeliberations.map((entry) => {
    const sym = entry.symbol.toUpperCase();
    const currentPrice = quotesMap[sym] || entry.price;
    return evaluateDeliberationAccuracy(entry, currentPrice);
  });

  const metrics = calculateCalibrationMetrics(evaluations);

  return {
    metrics,
    evaluations,
  };
}
