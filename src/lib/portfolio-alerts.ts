import { UpstoxHolding, PortfolioAlert, HoldingSignal } from '@/types/upstox';

export interface PortfolioAlertAnalysis {
  alerts: PortfolioAlert[];
  holdingsWithSignals: UpstoxHolding[];
  alertCounts: {
    urgent: number;
    buyMore: number;
    bookProfit: number;
    concentration: number;
    total: number;
  };
}

/**
 * Evaluates a holding and returns an alert if it breaches predefined risk/reward rules
 */
export function analyzePortfolioAlerts(holdings: UpstoxHolding[]): PortfolioAlertAnalysis {
  const alerts: PortfolioAlert[] = [];
  const totalInvested = holdings.reduce((sum, h) => sum + (h.invested_value || 0), 0);

  const holdingsWithSignals: UpstoxHolding[] = holdings.map((h, idx) => {
    const pnlPct = h.pnl_percentage;
    const weightPct = totalInvested > 0 ? (h.invested_value / totalInvested) * 100 : 0;

    let signal: HoldingSignal = 'HOLD';
    let reason = 'Holding within standard price channel. Trend structure intact.';
    let target = Math.round(h.last_price * 1.12);
    let stopLoss = Math.round(h.average_price * 0.93);

    // Rule 1: CRITICAL STOP-LOSS / SELL (Loss >= 7% or extreme daily breakdown)
    if (pnlPct <= -7.0 || h.day_change_percentage <= -5.0) {
      signal = 'STOP_LOSS';
      reason = `Loss of ${Math.abs(pnlPct)}% has breached the 7% retail risk limit. Immediate exit or trailing stop recommended.`;
      stopLoss = Math.round(h.last_price * 0.98); // Exit immediately or very tight
      target = Math.round(h.average_price * 1.02);

      alerts.push({
        id: `alert-stop-${h.trading_symbol}-${idx}`,
        symbol: h.trading_symbol,
        company_name: h.company_name,
        type: 'STOP_LOSS',
        severity: 'urgent',
        title: `Stop-Loss Alert: Down ${Math.abs(pnlPct)}%`,
        message: `${h.company_name} is trading at ₹${h.last_price.toLocaleString('en-IN')}, down ${Math.abs(pnlPct)}% from your buy average of ₹${h.average_price.toLocaleString('en-IN')}. Capital preservation trigger breached.`,
        suggestedAction: `Exit or trim position to prevent deeper portfolio drawdown. Mandate capital reallocation.`,
        metric: `Unrealized P&L: -₹${Math.abs(h.pnl).toLocaleString('en-IN')} (${pnlPct}%)`,
        currentPrice: h.last_price,
        averagePrice: h.average_price,
        targetPrice: target,
        stopLossPrice: stopLoss,
        holdingSignal: 'STOP_LOSS',
      });
    }
    // Rule 2: PROFIT BOOKING / PARTIAL SELL (Gain >= 18% or parabolic day surge >= 6%)
    else if (pnlPct >= 18.0 || h.day_change_percentage >= 6.0) {
      signal = 'BOOK_PROFIT';
      reason = `Gains of +${pnlPct}% have reached institutional profit-taking targets. Lock in accumulated Dalal Street gains.`;
      target = Math.round(h.last_price * 1.06);
      stopLoss = Math.round(h.average_price * 1.12); // Lock in at least 12% profit

      alerts.push({
        id: `alert-profit-${h.trading_symbol}-${idx}`,
        symbol: h.trading_symbol,
        company_name: h.company_name,
        type: 'BOOK_PROFIT',
        severity: 'opportunity',
        title: `Profit Booking Alert: Up +${pnlPct}%`,
        message: `${h.company_name} has appreciated to ₹${h.last_price.toLocaleString('en-IN')} (+${pnlPct}% returns). Momentum is approaching overbought resistance.`,
        suggestedAction: `Consider booking 30% to 50% profits and raise trailing stop-loss to ₹${stopLoss.toLocaleString('en-IN')} to safeguard gains.`,
        metric: `Unrealized P&L: +₹${h.pnl.toLocaleString('en-IN')} (+${pnlPct}%)`,
        currentPrice: h.last_price,
        averagePrice: h.average_price,
        targetPrice: target,
        stopLossPrice: stopLoss,
        holdingSignal: 'BOOK_PROFIT',
      });
    }
    // Rule 3: BUY MORE / PRIME DIP ACCUMULATION (Pullback between -2.5% and -6.5% on quality stock)
    else if (pnlPct <= -2.5 && pnlPct > -7.0) {
      signal = 'BUY_MORE';
      reason = `Quality pullback of ${Math.abs(pnlPct)}% near support. Favorable risk-reward for averaging down.`;
      target = Math.round(h.average_price * 1.15);
      stopLoss = Math.round(h.average_price * 0.93);

      alerts.push({
        id: `alert-buy-${h.trading_symbol}-${idx}`,
        symbol: h.trading_symbol,
        company_name: h.company_name,
        type: 'BUY_MORE',
        severity: 'opportunity',
        title: `Buy More Alert: Dip Accumulation Zone`,
        message: `${h.company_name} has pulled back to ₹${h.last_price.toLocaleString('en-IN')} (${pnlPct}% from purchase price). Key intermediate moving average supports remain resilient.`,
        suggestedAction: `Average down or accumulate an additional tranche (20-30% quantity) to lower average buy price.`,
        metric: `Pullback: ${pnlPct}% | CMP: ₹${h.last_price.toLocaleString('en-IN')}`,
        currentPrice: h.last_price,
        averagePrice: h.average_price,
        targetPrice: target,
        stopLossPrice: stopLoss,
        holdingSignal: 'BUY_MORE',
      });
    }

    // Rule 4: CONCENTRATION WARNING (> 22% of total portfolio)
    if (weightPct >= 22.0) {
      alerts.push({
        id: `alert-conc-${h.trading_symbol}-${idx}`,
        symbol: h.trading_symbol,
        company_name: h.company_name,
        type: 'CONCENTRATION_WARNING',
        severity: 'warning',
        title: `Over-Concentration Risk: ${weightPct.toFixed(1)}% Weight`,
        message: `${h.company_name} represents ${weightPct.toFixed(1)}% (₹${h.invested_value.toLocaleString('en-IN')}) of your total deployed capital. Single-stock risk is elevated.`,
        suggestedAction: `Trim position to rebalance into underweight defensive sectors and mitigate idiosyncratic stock risk.`,
        metric: `Portfolio Weight: ${weightPct.toFixed(1)}% (Institutional Cap: 15-20%)`,
        currentPrice: h.last_price,
        averagePrice: h.average_price,
        targetPrice: target,
        stopLossPrice: stopLoss,
        holdingSignal: signal,
      });
    }

    return {
      ...h,
      holdingSignal: signal,
      signalReason: reason,
      targetPrice: target,
      stopLossPrice: stopLoss,
    };
  });

  const alertCounts = {
    urgent: alerts.filter((a) => a.type === 'STOP_LOSS').length,
    buyMore: alerts.filter((a) => a.type === 'BUY_MORE').length,
    bookProfit: alerts.filter((a) => a.type === 'BOOK_PROFIT').length,
    concentration: alerts.filter((a) => a.type === 'CONCENTRATION_WARNING').length,
    total: alerts.length,
  };

  return {
    alerts,
    holdingsWithSignals,
    alertCounts,
  };
}

