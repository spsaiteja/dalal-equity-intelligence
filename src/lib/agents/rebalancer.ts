/**
 * Phase 14: Portfolio Health & Automated Rebalancing Agent
 * Quantitative portfolio risk management, HHI diversification analysis,
 * institutional concentration enforcement, and algorithmic trade sizing.
 */

import {
  PortfolioHoldingInput,
  PortfolioHealthMetrics,
  SectorExposure,
  StockExposure,
  PortfolioViolation,
  RebalancePlan,
  RebalanceAction,
  RebalancePolicy,
} from '@/types/rebalance';

export const DEFAULT_REBALANCE_POLICY: RebalancePolicy = {
  maxSectorWeightPercent: 25,  // Max 25% exposure per sector
  maxStockWeightPercent: 12,   // Max 12% exposure per single stock
  minHoldingWeightPercent: 2,  // Minimum position threshold
  targetCashBufferPercent: 5,  // Recommended cash reserve
  pnlProfitTakePercent: 30,    // Target gain to begin profit shaving
  pnlStopLossPercent: -15,     // Hard stop loss threshold
};

/**
 * Calculates comprehensive institutional health metrics for a portfolio.
 */
export function calculatePortfolioHealth(
  holdings: PortfolioHoldingInput[],
  customPolicy?: Partial<RebalancePolicy>
): PortfolioHealthMetrics {
  const policy: RebalancePolicy = { ...DEFAULT_REBALANCE_POLICY, ...customPolicy };

  if (!holdings || holdings.length === 0) {
    return {
      healthScore: 0,
      grade: 'CCC',
      hhiIndex: 10000,
      diversificationScore: 0,
      totalValue: 0,
      totalInvested: 0,
      totalUnrealizedPnL: 0,
      totalUnrealizedPnLPercent: 0,
      sectorExposures: [],
      stockExposures: [],
      topSectorRisk: 'None',
      topStockRisk: 'None',
      maxDrawdownRisk: 'HIGH',
      violations: [
        {
          rule: 'PORTFOLIO_EMPTY',
          severity: 'CRITICAL',
          description: 'Portfolio contains 0 active holdings',
          currentValue: '0',
          limit: '>= 5 holdings',
        },
      ],
    };
  }

  // 1. Calculate aggregate valuations
  let totalValue = 0;
  let totalInvested = 0;
  holdings.forEach((h) => {
    totalValue += h.currentValue || (h.quantity * h.lastPrice);
    totalInvested += h.investedValue || (h.quantity * h.avgPrice);
  });

  const totalUnrealizedPnL = totalValue - totalInvested;
  const totalUnrealizedPnLPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  // 2. Compute stock exposures & HHI
  let hhiRaw = 0;
  const violations: PortfolioViolation[] = [];

  const stockExposures: StockExposure[] = holdings.map((h) => {
    const isCash = h.symbol === 'CASH_RESERVE' || h.sector === 'Cash & Equivalents';
    const val = h.currentValue || (h.quantity * h.lastPrice);
    const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;

    // Cash does not penalize HHI or concentration
    if (!isCash) {
      hhiRaw += Math.pow(pct, 2);
    }

    const isOverweight = !isCash && pct > (policy.maxStockWeightPercent + 0.5);
    const excess = Math.max(0, pct - policy.maxStockWeightPercent);

    if (isOverweight) {
      violations.push({
        rule: 'SINGLE_STOCK_CONCENTRATION_EXCEEDED',
        severity: pct > policy.maxStockWeightPercent * 1.5 ? 'CRITICAL' : 'WARNING',
        description: `${h.symbol} allocation exceeds maximum single-equity limit`,
        currentValue: `${pct.toFixed(1)}%`,
        limit: `< ${policy.maxStockWeightPercent}%`,
      });
    }

    if (!isCash && h.pnlPercent <= policy.pnlStopLossPercent) {
      violations.push({
        rule: 'STOP_LOSS_BREACH',
        severity: h.pnlPercent <= policy.pnlStopLossPercent * 1.5 ? 'CRITICAL' : 'WARNING',
        description: `${h.symbol} has sustained severe drawdown`,
        currentValue: `${h.pnlPercent.toFixed(1)}%`,
        limit: `> ${policy.pnlStopLossPercent}%`,
      });
    }

    return {
      symbol: h.symbol,
      companyName: h.companyName || h.symbol,
      currentValue: Math.round(val),
      percentage: parseFloat(pct.toFixed(1)),
      maxCapPercent: policy.maxStockWeightPercent,
      isOverweight,
      excessPercent: parseFloat(excess.toFixed(1)),
    };
  }).sort((a, b) => b.percentage - a.percentage);

  const hhiIndex = Math.min(10000, Math.round(hhiRaw));
  const diversificationScore = Math.max(0, Math.min(100, Math.round(100 - (hhiIndex / 100))));

  // 3. Compute sector exposures
  const sectorMap: Record<string, { value: number; stocks: string[] }> = {};
  holdings.forEach((h) => {
    const s = h.sector || 'Unclassified';
    const val = h.currentValue || (h.quantity * h.lastPrice);
    if (!sectorMap[s]) sectorMap[s] = { value: 0, stocks: [] };
    sectorMap[s].value += val;
    sectorMap[s].stocks.push(h.symbol);
  });

  const sectorExposures: SectorExposure[] = Object.entries(sectorMap).map(([sec, data]) => {
    const isCashSector = sec === 'Cash & Equivalents';
    const pct = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
    const isOverweight = !isCashSector && pct > (policy.maxSectorWeightPercent + 0.5);
    const excess = Math.max(0, pct - policy.maxSectorWeightPercent);

    if (isOverweight) {
      violations.push({
        rule: 'SECTOR_CONCENTRATION_EXCEEDED',
        severity: pct > policy.maxSectorWeightPercent * 1.4 ? 'CRITICAL' : 'WARNING',
        description: `${sec} sector allocation exceeds mandated institutional cap`,
        currentValue: `${pct.toFixed(1)}%`,
        limit: `< ${policy.maxSectorWeightPercent}%`,
      });
    }

    return {
      sector: sec,
      currentValue: Math.round(data.value),
      percentage: parseFloat(pct.toFixed(1)),
      maxCapPercent: policy.maxSectorWeightPercent,
      isOverweight,
      excessPercent: parseFloat(excess.toFixed(1)),
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // 4. Quantitative Health Score Calculation (Institutional Matrix out of 100)
  // - Diversification / HHI Component (up to 35 pts)
  let scoreDiversification = 0;
  if (hhiIndex < 1500) scoreDiversification = 35;
  else if (hhiIndex < 2500) scoreDiversification = 26;
  else if (hhiIndex < 3500) scoreDiversification = 16;
  else scoreDiversification = 6;

  // - Stock Concentration Component (up to 25 pts)
  let scoreStockConcentration = 25;
  stockExposures.forEach((stk) => {
    if (stk.symbol === 'CASH_RESERVE') return;
    if (stk.percentage > policy.maxStockWeightPercent * 1.5) {
      scoreStockConcentration -= 8;
    } else if (stk.isOverweight) {
      scoreStockConcentration -= 4;
    }
  });
  scoreStockConcentration = Math.max(0, scoreStockConcentration);

  // - Sector Balance Component (up to 25 pts)
  let scoreSectorBalance = 25;
  sectorExposures.forEach((sec) => {
    if (sec.sector === 'Cash & Equivalents') return;
    if (sec.percentage > policy.maxSectorWeightPercent * 1.4) {
      scoreSectorBalance -= 9;
    } else if (sec.isOverweight) {
      scoreSectorBalance -= 5;
    }
  });
  scoreSectorBalance = Math.max(0, scoreSectorBalance);

  // - PnL Resilience & Capital Health Component (up to 15 pts)
  let scorePnL = 15;
  if (totalUnrealizedPnLPercent < -15) scorePnL = 0;
  else if (totalUnrealizedPnLPercent < -5) scorePnL = 5;
  else if (totalUnrealizedPnLPercent < 0) scorePnL = 10;
  else scorePnL = 15;

  const rawScore = scoreDiversification + scoreStockConcentration + scoreSectorBalance + scorePnL;
  const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Credit Rating style grade
  let grade: PortfolioHealthMetrics['grade'] = 'BBB';
  if (healthScore >= 90) grade = 'AAA';
  else if (healthScore >= 80) grade = 'AA';
  else if (healthScore >= 70) grade = 'A';
  else if (healthScore >= 60) grade = 'BBB';
  else if (healthScore >= 50) grade = 'BB';
  else if (healthScore >= 40) grade = 'B';
  else grade = 'CCC';

  // Drawdown risk
  let maxDrawdownRisk: PortfolioHealthMetrics['maxDrawdownRisk'] = 'LOW';
  if (violations.some((v) => v.severity === 'CRITICAL') || hhiIndex > 3000) {
    maxDrawdownRisk = 'HIGH';
  } else if (violations.length > 2 || hhiIndex > 2200) {
    maxDrawdownRisk = 'ELEVATED';
  } else if (violations.length > 0 || hhiIndex > 1600) {
    maxDrawdownRisk = 'MODERATE';
  }

  return {
    healthScore,
    grade,
    hhiIndex,
    diversificationScore,
    totalValue: Math.round(totalValue),
    totalInvested: Math.round(totalInvested),
    totalUnrealizedPnL: Math.round(totalUnrealizedPnL),
    totalUnrealizedPnLPercent: parseFloat(totalUnrealizedPnLPercent.toFixed(2)),
    sectorExposures,
    stockExposures,
    topSectorRisk: sectorExposures[0]?.sector || 'None',
    topStockRisk: stockExposures[0]?.symbol || 'None',
    maxDrawdownRisk,
    violations,
  };
}

/**
 * Generates an algorithmic institutional rebalance plan.
 * Sizes share trimming and redeployment to bring exposures into regulatory compliance.
 */
export function generateRebalancePlan(
  holdings: PortfolioHoldingInput[],
  customPolicy?: Partial<RebalancePolicy>
): RebalancePlan {
  const policy: RebalancePolicy = { ...DEFAULT_REBALANCE_POLICY, ...customPolicy };
  const currentHealth = calculatePortfolioHealth(holdings, policy);
  const totalCapital = currentHealth.totalValue;

  const actions: RebalanceAction[] = [];
  let freedCapitalINR = 0;
  let reallocatedCapitalINR = 0;

  // Pass 1: Identify required TRIM / EXIT actions
  holdings.forEach((h) => {
    if (h.symbol === 'CASH_RESERVE') return;

    const val = h.currentValue || (h.quantity * h.lastPrice);
    const weight = totalCapital > 0 ? (val / totalCapital) * 100 : 0;
    const price = h.lastPrice || 1;

    // PRIORITY 1: Stop loss breach (capital preservation)
    if (h.pnlPercent <= policy.pnlStopLossPercent) {
      const isSevere = h.pnlPercent <= policy.pnlStopLossPercent * 1.5;
      const sharesToCut = isSevere ? h.quantity : Math.max(1, Math.floor(h.quantity * 0.5));
      const deltaCapital = -(sharesToCut * price);

      freedCapitalINR += Math.abs(deltaCapital);

      actions.push({
        symbol: h.symbol,
        companyName: h.companyName || h.symbol,
        action: isSevere ? 'EXIT' : 'TRIM',
        currentShares: h.quantity,
        targetShares: h.quantity - sharesToCut,
        deltaShares: -sharesToCut,
        currentPrice: price,
        currentWeightPercent: parseFloat(weight.toFixed(1)),
        targetWeightPercent: parseFloat(((val + deltaCapital) / totalCapital * 100).toFixed(1)),
        capitalDeltaINR: Math.round(deltaCapital),
        urgency: isSevere ? 'IMMEDIATE' : 'HIGH',
        rationale: `Stop-loss triggered (${h.pnlPercent.toFixed(1)}% vs threshold ${policy.pnlStopLossPercent}%). ${isSevere ? 'Full exit mandated' : 'Trim 50%'} to preserve principal capital.`,
      });
      return;
    }

    // PRIORITY 2: Single stock concentration overweight (> maxStockWeightPercent)
    if (weight > policy.maxStockWeightPercent) {
      const targetWeight = policy.maxStockWeightPercent;
      const targetVal = totalCapital * (targetWeight / 100);
      const excessVal = val - targetVal;
      const sharesToTrim = Math.max(1, Math.floor(excessVal / price));
      const deltaCapital = -(sharesToTrim * price);

      freedCapitalINR += Math.abs(deltaCapital);

      actions.push({
        symbol: h.symbol,
        companyName: h.companyName || h.symbol,
        action: 'TRIM',
        currentShares: h.quantity,
        targetShares: Math.max(0, h.quantity - sharesToTrim),
        deltaShares: -sharesToTrim,
        currentPrice: price,
        currentWeightPercent: parseFloat(weight.toFixed(1)),
        targetWeightPercent: targetWeight,
        capitalDeltaINR: Math.round(deltaCapital),
        urgency: weight > policy.maxStockWeightPercent * 1.5 ? 'IMMEDIATE' : 'HIGH',
        rationale: `Trim position from ${weight.toFixed(1)}% to policy cap ${targetWeight}%. Eliminates concentration hazard and frees ₹${Math.abs(Math.round(deltaCapital)).toLocaleString('en-IN')}.`,
      });
      return;
    }

    // PRIORITY 3: Profit-taking on heavy position
    if (h.pnlPercent >= policy.pnlProfitTakePercent && weight > 8) {
      const sharesToHarvest = Math.max(1, Math.floor(h.quantity * 0.25));
      const deltaCapital = -(sharesToHarvest * price);

      freedCapitalINR += Math.abs(deltaCapital);

      actions.push({
        symbol: h.symbol,
        companyName: h.companyName || h.symbol,
        action: 'TRIM',
        currentShares: h.quantity,
        targetShares: h.quantity - sharesToHarvest,
        deltaShares: -sharesToHarvest,
        currentPrice: price,
        currentWeightPercent: parseFloat(weight.toFixed(1)),
        targetWeightPercent: parseFloat(((val + deltaCapital) / totalCapital * 100).toFixed(1)),
        capitalDeltaINR: Math.round(deltaCapital),
        urgency: 'MEDIUM',
        rationale: `Harvest gains (+${h.pnlPercent.toFixed(1)}%). Shave 25% of position to lock in profit into portfolio cash reserve.`,
      });
      return;
    }
  });

  // Pass 2: Re-allocation candidates (ACCUMULATE) from freed capital
  const candidateAccumulate = holdings.filter(
    (h) => {
      const val = h.currentValue || (h.quantity * h.lastPrice);
      const weight = totalCapital > 0 ? (val / totalCapital) * 100 : 0;
      return (
        weight < policy.maxStockWeightPercent * 0.8 &&
        h.pnlPercent > -5 &&
        !actions.some((a) => a.symbol === h.symbol)
      );
    }
  );

  let capitalToDeploy = Math.round(freedCapitalINR * 0.6); // Deploy 60% of freed cash, keep 40% as cash buffer

  if (candidateAccumulate.length > 0 && capitalToDeploy > 2000) {
    const capitalPerStock = Math.floor(capitalToDeploy / candidateAccumulate.length);

    candidateAccumulate.forEach((h) => {
      const price = h.lastPrice || 1;
      const additionalShares = Math.floor(capitalPerStock / price);
      if (additionalShares >= 1) {
        const addedValue = additionalShares * price;
        reallocatedCapitalINR += addedValue;
        const currentVal = h.currentValue || (h.quantity * price);
        const currentWeight = totalCapital > 0 ? (currentVal / totalCapital) * 100 : 0;
        const targetWeight = totalCapital > 0 ? ((currentVal + addedValue) / totalCapital) * 100 : 0;

        actions.push({
          symbol: h.symbol,
          companyName: h.companyName || h.symbol,
          action: 'ACCUMULATE',
          currentShares: h.quantity,
          targetShares: h.quantity + additionalShares,
          deltaShares: additionalShares,
          currentPrice: price,
          currentWeightPercent: parseFloat(currentWeight.toFixed(1)),
          targetWeightPercent: parseFloat(targetWeight.toFixed(1)),
          capitalDeltaINR: Math.round(addedValue),
          urgency: 'MEDIUM',
          rationale: `Re-allocate trimmed capital into resilient under-weighted holding (${currentWeight.toFixed(1)}%). Adds +${additionalShares} shares to scale position.`,
        });
      }
    });
  }

  // Pass 3: Holdings remaining on HOLD
  holdings.forEach((h) => {
    if (!actions.some((a) => a.symbol === h.symbol)) {
      const val = h.currentValue || (h.quantity * h.lastPrice);
      const weight = totalCapital > 0 ? (val / totalCapital) * 100 : 0;
      actions.push({
        symbol: h.symbol,
        companyName: h.companyName || h.symbol,
        action: 'HOLD',
        currentShares: h.quantity,
        targetShares: h.quantity,
        deltaShares: 0,
        currentPrice: h.lastPrice,
        currentWeightPercent: parseFloat(weight.toFixed(1)),
        targetWeightPercent: parseFloat(weight.toFixed(1)),
        capitalDeltaINR: 0,
        urgency: 'LOW',
        rationale: `Holding is within target risk bandwidth (${weight.toFixed(1)}% weight). Maintain current position.`,
      });
    }
  });

  // Sort actions: IMMEDIATE first, then HIGH, then MEDIUM, then LOW
  const urgencyWeight: Record<string, number> = { IMMEDIATE: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  actions.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);

  const netCashDeltaINR = freedCapitalINR - reallocatedCapitalINR;

  // Projected Health Calculation with Capital Conservation
  const projectedHoldings: PortfolioHoldingInput[] = [];

  holdings.forEach((h) => {
    const act = actions.find((a) => a.symbol === h.symbol);
    const shares = act ? act.targetShares : h.quantity;
    if (shares > 0) {
      const price = h.lastPrice;
      projectedHoldings.push({
        ...h,
        quantity: shares,
        currentValue: shares * price,
        investedValue: shares * h.avgPrice,
      });
    }
  });

  // Add the unallocated freed cash to keep total portfolio capital conserved
  if (netCashDeltaINR > 0) {
    projectedHoldings.push({
      symbol: 'CASH_RESERVE',
      companyName: 'Liquid Cash Buffer (Overnight/LiquidBeES)',
      quantity: Math.round(netCashDeltaINR),
      avgPrice: 1,
      lastPrice: 1,
      currentValue: Math.round(netCashDeltaINR),
      investedValue: Math.round(netCashDeltaINR),
      pnl: 0,
      pnlPercent: 0,
      sector: 'Cash & Equivalents',
    });
  }

  const projectedMetrics = calculatePortfolioHealth(projectedHoldings, policy);

  // Executive Summary Synthesis
  const criticalViolations = currentHealth.violations.filter((v) => v.severity === 'CRITICAL');
  let execSummary = `Portfolio health graded at ${currentHealth.grade} (${currentHealth.healthScore}/100) with HHI of ${currentHealth.hhiIndex}. `;
  if (criticalViolations.length > 0) {
    execSummary += `Immediate remediation required: detected ${criticalViolations.length} critical concentration breaches in ${currentHealth.topStockRisk} and ${currentHealth.topSectorRisk}. `;
  } else {
    execSummary += `Portfolio exhibits balanced risk characteristics with moderate rebalancing required to optimize capital efficiency. `;
  }
  execSummary += `Executing this plan reclaims ₹${Math.round(freedCapitalINR).toLocaleString('en-IN')} in risk capital, redeploys ₹${Math.round(reallocatedCapitalINR).toLocaleString('en-IN')} into under-allocated winners, and is projected to elevate health score to ${projectedMetrics.healthScore}/100 (${projectedMetrics.grade}).`;

  return {
    timestamp: new Date().toISOString(),
    totalCapital: Math.round(totalCapital),
    currentHealth,
    projectedHealth: {
      projectedScore: projectedMetrics.healthScore,
      projectedGrade: projectedMetrics.grade,
      projectedHhi: projectedMetrics.hhiIndex,
      freedCapitalINR: Math.round(freedCapitalINR),
      reallocatedCapitalINR: Math.round(reallocatedCapitalINR),
      netCashDeltaINR: Math.round(netCashDeltaINR),
    },
    actions,
    executiveSummary: execSummary,
    sebiDisclaimer: 'DalalAI algorithmic rebalancing suggestions are generated by quantitative multi-agent heuristics for informational purposes and do not constitute registered investment advice under SEBI (Research Analysts) Regulations, 2014.',
  };
}
