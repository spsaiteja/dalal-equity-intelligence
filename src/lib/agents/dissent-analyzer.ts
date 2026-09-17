import {
  NormalizedStance,
  ConsensusStrength,
  DissenterDetail,
  ConsensusBreakdown,
  ConsensusDissentAnalysis,
} from '@/types/dissent';

/**
 * Normalizes diverse LLM agent stances into trinary institutional categories.
 */
export function normalizeAgentStance(stance: string = ''): NormalizedStance {
  const lower = String(stance || '').toLowerCase().trim();
  if (lower.includes('bull') || lower.includes('accumulate') || lower.includes('buy')) {
    return 'BULLISH';
  }
  if (lower.includes('bear') || lower.includes('avoid') || lower.includes('sell') || lower.includes('exit')) {
    return 'BEARISH';
  }
  return 'NEUTRAL';
}

/**
 * Normalizes CIO conviction verdict into trinary directional stance.
 */
export function normalizeCIOVerdict(verdict: string = ''): NormalizedStance {
  const upper = String(verdict || '').toUpperCase().trim();
  if (upper.includes('BUY') || upper.includes('ACCUMULATE')) {
    return 'BULLISH';
  }
  if (upper.includes('SELL') || upper.includes('AVOID')) {
    return 'BEARISH';
  }
  return 'NEUTRAL';
}

/**
 * Calculates mathematical consensus alignment and agreement index.
 */
export function calculateConsensusBreakdown(stances: NormalizedStance[]): ConsensusBreakdown {
  const totalAgents = Math.max(stances.length, 1);
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  for (const s of stances) {
    if (s === 'BULLISH') bullishCount++;
    else if (s === 'BEARISH') bearishCount++;
    else neutralCount++;
  }

  const maxAligned = Math.max(bullishCount, bearishCount, neutralCount);
  const agreementIndexPercent = Math.round((maxAligned / totalAgents) * 100);

  let consensusStrength: ConsensusStrength = 'MODERATE_SPLIT';
  if (agreementIndexPercent === 100) {
    consensusStrength = 'UNANIMOUS';
  } else if (agreementIndexPercent >= 75) {
    consensusStrength = 'STRONG_CONCURRENCE';
  } else if (bullishCount >= 2 && bearishCount >= 2) {
    consensusStrength = 'SHARP_DISSENT';
  } else {
    consensusStrength = 'MODERATE_SPLIT';
  }

  return {
    totalAgents,
    bullishCount,
    bearishCount,
    neutralCount,
    bullishPercent: Math.round((bullishCount / totalAgents) * 100),
    bearishPercent: Math.round((bearishCount / totalAgents) * 100),
    neutralPercent: Math.round((neutralCount / totalAgents) * 100),
    agreementIndexPercent,
    consensusStrength,
  };
}

/**
 * Calculates polarization score (0.0 to 1.0) reflecting direct opposition between Bull and Bear camps.
 */
export function calculatePolarizationScore(
  bullishCount: number,
  bearishCount: number,
  total: number
): number {
  if (total <= 0) return 0;
  const opposingPairs = Math.min(bullishCount, bearishCount);
  return Number(((2 * opposingPairs) / total).toFixed(2));
}

/**
 * Identifies dissenting agents whose stance diverges from the overall CIO consensus.
 */
export function identifyDissenters(
  agents: {
    sentinel?: any;
    fundamental?: any;
    newsScout?: any;
    riskGuardian?: any;
  },
  cioVerdict: string
): DissenterDetail[] {
  const majorityStance = normalizeCIOVerdict(cioVerdict);
  const dissenters: DissenterDetail[] = [];

  const agentEntries: Array<{
    role: 'SENTINEL' | 'FUNDAMENTALIST' | 'NEWS_SCOUT' | 'RISK_GUARDIAN';
    name: string;
    report: any;
  }> = [
    { role: 'SENTINEL', name: 'Sentinel', report: agents.sentinel },
    { role: 'FUNDAMENTALIST', name: 'The Fundamentalist', report: agents.fundamental },
    { role: 'NEWS_SCOUT', name: 'News Scout', report: agents.newsScout },
    { role: 'RISK_GUARDIAN', name: 'Risk Guardian', report: agents.riskGuardian },
  ];

  for (const entry of agentEntries) {
    if (!entry.report) continue;
    const rawStance = String(entry.report.stance || 'Neutral');
    const stance = normalizeAgentStance(rawStance);

    // Dissent definition:
    // If majority is Bullish and agent is Bearish -> high severity
    // If majority is Bearish and agent is Bullish -> high severity
    // If majority is directional and agent is Neutral -> low severity
    if (majorityStance === 'BULLISH' && stance === 'BEARISH') {
      dissenters.push({
        agentRole: entry.role,
        agentName: entry.name,
        stance,
        rawStance,
        counterThesis:
          entry.report.arguments?.[0] ||
          entry.report.headlineTakeaway ||
          `${entry.name} warns of significant downside risk.`,
        severity: 'high',
      });
    } else if (majorityStance === 'BEARISH' && stance === 'BULLISH') {
      dissenters.push({
        agentRole: entry.role,
        agentName: entry.name,
        stance,
        rawStance,
        counterThesis:
          entry.report.arguments?.[0] ||
          entry.report.headlineTakeaway ||
          `${entry.name} identifies undervalued upside momentum.`,
        severity: 'high',
      });
    } else if (majorityStance !== 'NEUTRAL' && stance === 'NEUTRAL') {
      dissenters.push({
        agentRole: entry.role,
        agentName: entry.name,
        stance,
        rawStance,
        counterThesis:
          entry.report.headlineTakeaway ||
          `${entry.name} remains cautious pending further technical or fundamental confirmation.`,
        severity: 'low',
      });
    }
  }

  return dissenters;
}

/**
 * Synthesizes the full consensus and dissent analysis across the 5-Agent Council.
 */
export function analyzeCouncilDissent(params: {
  agents: {
    sentinel: any;
    fundamental: any;
    newsScout: any;
    riskGuardian: any;
  };
  cioVerdict: string;
}): ConsensusDissentAnalysis {
  const { agents, cioVerdict } = params;

  const sentinelStance = normalizeAgentStance(agents.sentinel?.stance);
  const fundamentalStance = normalizeAgentStance(agents.fundamental?.stance);
  const newsStance = normalizeAgentStance(agents.newsScout?.stance);
  const riskStance = normalizeAgentStance(agents.riskGuardian?.stance);

  const stances: NormalizedStance[] = [
    sentinelStance,
    fundamentalStance,
    newsStance,
    riskStance,
  ];

  const breakdown = calculateConsensusBreakdown(stances);
  const dissenters = identifyDissenters(agents, cioVerdict);
  const polarizationScore = calculatePolarizationScore(
    breakdown.bullishCount,
    breakdown.bearishCount,
    breakdown.totalAgents
  );

  const primaryDissenter = dissenters.length > 0
    ? dissenters.find((d) => d.severity === 'high') || dissenters[0]
    : null;

  return {
    breakdown,
    dissenters,
    primaryDissenter,
    primaryCounterThesis: primaryDissenter ? primaryDissenter.counterThesis : null,
    polarizationScore,
    hasDissent: dissenters.length > 0,
  };
}
