/**
 * Phase 15: Institutional Executive Dossier & Report Export Engine
 * Generates institutional-grade equity research reports, Markdown memos,
 * printable PDF-ready HTML, and executive audio briefing transcripts.
 */

import { CouncilDeliberationResult } from '@/types/agent';
import {
  ExecutiveDossier,
  DossierAgentSummary,
  DossierExportOptions,
} from '@/types/dossier';

/**
 * Generates an institutional executive dossier from an active council deliberation.
 */
export function generateExecutiveDossier(
  deliberation: CouncilDeliberationResult,
  options?: DossierExportOptions
): ExecutiveDossier {
  const rawDelib = deliberation as any;
  const symbol = rawDelib.symbol || rawDelib.stock?.symbol || 'UNKNOWN';
  const companyName = rawDelib.companyName || rawDelib.stock?.name || symbol;
  const currentPrice = Number(rawDelib.currentPrice || rawDelib.stock?.lastPrice || rawDelib.stock?.price) || 0;
  const cioVerdict = rawDelib.cioVerdict || rawDelib.cioConsensus?.action || 'HOLD';
  const convictionScore = Number(rawDelib.overallScore ? rawDelib.overallScore * 10 : rawDelib.cioConsensus?.convictionScore) || 75;
  const tradeActionPlan = rawDelib.tradeActionPlan || rawDelib.cioConsensus?.actionPlan || {};
  const executiveSummary = rawDelib.debateSummary || rawDelib.cioExecutiveDirective || rawDelib.cioConsensus?.executiveDebateSummary || 'Consensus reached after 5-agent deliberation.';
  const agents = rawDelib.agents || {
    sentinel: rawDelib.sentinelReport,
    fundamental: rawDelib.fundamentalReport,
    newsScout: rawDelib.newsScoutReport,
    riskGuardian: rawDelib.riskGuardianReport,
  };
  const metadata = rawDelib.metadata || {};

  const dossierId = `DOSSIER-${symbol.replace(/[^A-Z0-9]/g, '')}-${Date.now()}`;

  // 1. Council breakdown
  const councilBreakdown: DossierAgentSummary[] = [
    {
      agentRole: 'SENTINEL',
      personaTitle: 'Quantitative Chartist & Market Technician',
      stance: agents.sentinel?.stance || 'Neutral',
      confidenceScore: agents.sentinel?.confidenceScore || 70,
      coreThesis: agents.sentinel?.trendAssessment || agents.sentinel?.trendVerdict || agents.sentinel?.headlineTakeaway || 'Consolidation near moving average bands.',
      riskOrOpportunityHighlight: `Support: ${agents.sentinel?.keyLevels?.immediateSupport || 'N/A'}, Resistance: ${agents.sentinel?.keyLevels?.majorBreakout || agents.sentinel?.keyLevels?.immediateResistance || 'N/A'}`,
    },
    {
      agentRole: 'FUNDAMENTALIST',
      personaTitle: 'Deep-Value & Balance Sheet Skeptic',
      stance: agents.fundamental?.stance || 'Neutral',
      confidenceScore: agents.fundamental?.confidenceScore || 70,
      coreThesis: agents.fundamental?.valuationStatus || agents.fundamental?.intrinsicValuationAssessment || agents.fundamental?.headlineTakeaway || 'Valuation aligned with historical median multiples.',
      riskOrOpportunityHighlight: `Valuation: ${agents.fundamental?.valuationStatus || 'Fair Value'}, Margin of Safety: ${agents.fundamental?.estimatedMarginOfSafetyPercent || 0}%`,
    },
    {
      agentRole: 'NEWS_SCOUT',
      personaTitle: 'Macro & Dalal Street Catalyst Specialist',
      stance: agents.newsScout?.stance || 'Neutral',
      confidenceScore: agents.newsScout?.confidenceScore || 70,
      coreThesis: agents.newsScout?.headlineTakeaway || agents.newsScout?.overallMacroAssessment || 'Macro news flow reflects standard industry cadence.',
      riskOrOpportunityHighlight: (agents.newsScout?.catalystsIdentified && agents.newsScout.catalystsIdentified[0]) || 'No immediate systemic catalyst flagged.',
    },
    {
      agentRole: 'RISK_GUARDIAN',
      personaTitle: 'Capital Protector & Portfolio Governance',
      stance: agents.riskGuardian?.stance || 'Neutral',
      confidenceScore: agents.riskGuardian?.confidenceScore || 80,
      coreThesis: agents.riskGuardian?.riskRating || agents.riskGuardian?.downsideRiskAssessment || agents.riskGuardian?.headlineTakeaway || 'Preserve capital with disciplined stops.',
      riskOrOpportunityHighlight: `Max Allocation: ${agents.riskGuardian?.recommendedMaxPositionPercent || 4}%, Stop: ${agents.riskGuardian?.mandatedStopLoss || 'Standard ATR'}`,
    },
  ];

  // 2. Consensus & Dissent Metrics
  const dissentMeta = metadata.dissentAnalysis || metadata.dissent;
  const agreementIndex = dissentMeta
    ? (dissentMeta.breakdown?.agreementIndexPercent || dissentMeta.agreementIndexPercent || dissentMeta.agreementIndex || 75)
    : 75;
  const hasDissent = Boolean(dissentMeta ? dissentMeta.hasDissent : false);
  const dissenter = dissentMeta?.primaryDissenter?.agentRole || dissentMeta?.primaryDissenter?.agent;
  const dissentCounterThesis = dissentMeta?.primaryCounterThesis || dissentMeta?.primaryDissenter?.counterThesis;
  const polarizationScore = dissentMeta?.polarizationScore || 0;

  // 3. Multi-Modal Chart Vision Insights
  const chartVision = agents.sentinel?.chartVision;
  const chartVisionInsights = {
    patternDetected: chartVision?.primaryPattern?.patternName || (typeof chartVision?.primaryPattern === 'string' ? chartVision.primaryPattern : 'Consolidation Channel'),
    patternConfidence: chartVision?.patternConfidence || chartVision?.primaryPattern?.confidenceScore || 70,
    implication: chartVision?.patternImplication || chartVision?.primaryPattern?.implication || 'Price action within defined support/resistance range.',
    keyLevels: chartVision?.visualKeyLevels,
    breakoutTarget: chartVision?.breakoutTarget || chartVision?.primaryPattern?.breakoutTarget,
    candlestickFormations: chartVision?.candlestickFormations?.map((c: any) => typeof c === 'string' ? c : c.formation),
  };

  // 4. Historical Track Record & Calibration
  const calibrationMeta = metadata.calibration;
  const symbolEvaluationsCount = calibrationMeta?.metrics?.totalEvaluatedRuns || calibrationMeta?.evaluatedRuns || 0;
  const directionalWinRate = calibrationMeta?.metrics?.directionalWinRatePercent || calibrationMeta?.directionalWinRate || 0;
  const profitFactor = calibrationMeta?.metrics?.profitFactor || calibrationMeta?.profitFactor || 0;
  const brierScore = calibrationMeta?.metrics?.brierAccuracyScore || calibrationMeta?.brierScore || 0;

  const historicalTrackRecord = {
    symbolEvaluationsCount,
    directionalWinRate,
    profitFactor,
    brierScore,
    calibrationReliability: (symbolEvaluationsCount >= 5)
      ? 'High' as const
      : (symbolEvaluationsCount > 0)
      ? 'Moderate' as const
      : 'Insufficient Data' as const,
  };

  // 5. Audio Briefing Script Synthesis
  let audioBriefingScript = `Good morning. This is the DalalAI Institutional Intelligence desk with an executive morning memo on ${companyName}, ticker ${symbol}, currently trading at ₹${currentPrice.toLocaleString('en-IN')}.\n\n`;
  audioBriefingScript += `The five-agent investment council has concluded deliberations with a composite verdict of ${cioVerdict} and a conviction score of ${convictionScore} out of 100.\n\n`;
  audioBriefingScript += `The committee has framed Target 1 at ${tradeActionPlan?.target1 || 'N/A'}`;
  if (tradeActionPlan?.target2) audioBriefingScript += `, expanding to a secondary target of ${tradeActionPlan.target2}`;
  audioBriefingScript += `, backed by a strict capital stop-loss anchored at ${tradeActionPlan?.stopLoss || 'N/A'}.\n\n`;

  if (hasDissent && dissenter) {
    audioBriefingScript += `Take note: Agent ${dissenter} registered formal dissent against the majority thesis, cautioning that ${dissentCounterThesis || 'downside volatility could emerge'}.\n\n`;
  } else {
    audioBriefingScript += `The committee reached strong convergence with an agreement index of ${agreementIndex}%.\n\n`;
  }

  if (chartVision?.primaryPattern) {
    audioBriefingScript += `On technical charts, multi-modal vision detects a ${chartVision.primaryPattern.patternName.replace(/_/g, ' ')} formation with ${chartVision.primaryPattern.confidenceScore}% confidence, pointing towards ${chartVision.primaryPattern.breakoutTarget || 'key resistance'}.\n\n`;
  }

  audioBriefingScript += `Chief Investment Officer concluding guidance: ${executiveSummary}. DalalAI quantitative research memo signed.`;

  const sebiComplianceStatement = 'DalalAI Equity Research Dossier is an algorithmic multi-agent synthesis generated for institutional informational purposes. It does not constitute investment advice or solicitation under SEBI (Research Analysts) Regulations, 2014.';

  let verdictMapped: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  const vUpper = String(cioVerdict).toUpperCase();
  if (vUpper.includes('BUY') || vUpper.includes('ACCUMULATE')) verdictMapped = 'BUY';
  else if (vUpper.includes('SELL') || vUpper.includes('EXIT')) verdictMapped = 'SELL';

  return {
    dossierId,
    generatedAt: new Date().toISOString(),
    symbol,
    companyName,
    currentPrice,
    currency: 'INR',
    verdict: verdictMapped,
    convictionScore,
    targetPrice: tradeActionPlan?.target1 || 'N/A',
    target2Price: tradeActionPlan?.target2,
    stopLoss: tradeActionPlan?.stopLoss || 'N/A',
    riskRewardRatio: tradeActionPlan?.riskRewardRatio || '1:2.5',
    timeHorizon: tradeActionPlan?.timeHorizon || '1 - 3 Months',
    executiveSummary,
    councilBreakdown,
    consensusMetrics: {
      agreementIndex,
      hasDissent,
      dissenter,
      dissentCounterThesis,
      polarizationScore,
    },
    chartVisionInsights,
    historicalTrackRecord,
    audioBriefingScript,
    sebiComplianceStatement,
  };
}

/**
 * Formats the executive dossier into a publication-ready Markdown research memo.
 */
export function formatDossierAsMarkdown(dossier: ExecutiveDossier): string {
  return `# Institutional Equity Research Memo: ${dossier.companyName} (${dossier.symbol})
**Dossier Reference:** \`${dossier.dossierId}\`  
**Generated At:** ${new Date(dossier.generatedAt).toUTCString()}  
**Current Market Price:** ₹${dossier.currentPrice.toLocaleString('en-IN')} ${dossier.currency}

---

## 1. Executive Investment Committee Directive

| Metric | Committee Verdict |
| :--- | :--- |
| **Consensus Directive** | **${dossier.verdict}** |
| **Conviction Score** | **${dossier.convictionScore} / 100** |
| **Primary Target (T1)** | **${dossier.targetPrice}** |
| **Secondary Target (T2)** | **${dossier.target2Price || 'N/A'}** |
| **Mandated Stop-Loss** | **${dossier.stopLoss}** |
| **Risk-to-Reward Ratio** | **${dossier.riskRewardRatio}** |
| **Recommended Timeframe** | **${dossier.timeHorizon}** |

### Executive Summary
${dossier.executiveSummary}

---

## 2. Multi-Agent Council Stance Breakdown

| Persona | Stance | Confidence | Core Thesis | Highlight |
| :--- | :---: | :---: | :--- | :--- |
${dossier.councilBreakdown
  .map(
    (b) =>
      `| **${b.agentRole}** (${b.personaTitle}) | \`${b.stance}\` | ${b.confidenceScore}% | ${b.coreThesis.replace(/\|/g, '-')} | ${b.riskOrOpportunityHighlight.replace(/\|/g, '-')} |`
  )
  .join('\n')}

---

## 3. Committee Consensus & Dissent Analysis
- **Agreement Index:** ${dossier.consensusMetrics.agreementIndex}%
- **Consensus Status:** ${dossier.consensusMetrics.hasDissent ? '⚠️ Dissenting Counter-Thesis Present' : '✅ Unanimous Convergence'}
${dossier.consensusMetrics.hasDissent ? `- **Primary Dissenter:** \`${dossier.consensusMetrics.dissenter}\`\n- **Counter-Thesis:** ${dossier.consensusMetrics.dissentCounterThesis}` : ''}
- **Polarization Score:** ${dossier.consensusMetrics.polarizationScore}

---

## 4. Multi-Modal Technical Chart & Candlestick Vision
- **Structural Pattern:** **${dossier.chartVisionInsights.patternDetected?.replace(/_/g, ' ')}** (${dossier.chartVisionInsights.patternConfidence}% Confidence)
- **Technical Implication:** ${dossier.chartVisionInsights.implication}
${dossier.chartVisionInsights.breakoutTarget ? `- **Breakout Objective:** ${dossier.chartVisionInsights.breakoutTarget}` : ''}
${dossier.chartVisionInsights.keyLevels ? `- **Key Support / Resistance:** Support: ₹${dossier.chartVisionInsights.keyLevels.support} | Resistance: ₹${dossier.chartVisionInsights.keyLevels.resistance}` : ''}
${dossier.chartVisionInsights.candlestickFormations && dossier.chartVisionInsights.candlestickFormations.length > 0 ? `- **Candlestick Formations:** ${dossier.chartVisionInsights.candlestickFormations.join(', ')}` : ''}

---

## 5. Deliberation Accuracy & Historical Track Record
- **Historical Symbol Evaluations:** ${dossier.historicalTrackRecord.symbolEvaluationsCount} runs
- **Directional Win Rate:** ${dossier.historicalTrackRecord.directionalWinRate}%
- **Profit Factor:** ${dossier.historicalTrackRecord.profitFactor}
- **Brier Calibration Score:** ${dossier.historicalTrackRecord.brierScore}
- **Calibration Grade:** ${dossier.historicalTrackRecord.calibrationReliability}

---

## 6. Executive Audio Morning Briefing Script
> *Transcription for voice briefing / morning executive call:*
> 
${dossier.audioBriefingScript.split('\n\n').map(line => `> ${line}`).join('\n>\n')}

---

### Regulatory Disclaimer
*${dossier.sebiComplianceStatement}*
`;
}

/**
 * Formats the executive dossier into printable, standalone HTML with institutional CSS styling.
 */
export function formatDossierAsHtmlPrint(dossier: ExecutiveDossier): string {
  const verdictColor =
    dossier.verdict === 'BUY'
      ? '#10b981'
      : dossier.verdict === 'SELL'
      ? '#f43f5e'
      : '#3b82f6';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DalalAI Executive Dossier - ${dossier.symbol}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      @page { margin: 15mm 15mm 15mm 15mm; size: A4 portrait; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .kpi-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
    }
    .audio-box {
      background: #f8fafc;
      border-left: 4px solid #6366f1;
      padding: 12px 16px;
      font-style: italic;
      font-size: 12px;
      line-height: 1.6;
      color: #334155;
    }
    .disclaimer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: justify;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="logo">DALAL AI • INSTITUTIONAL EQUITY RESEARCH</div>
      <div style="font-size: 11px; color: #64748b;">Ref: ${dossier.dossierId} | Date: ${new Date(dossier.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 20px; font-weight: 900; color: ${verdictColor};">${dossier.verdict}</div>
      <div style="font-size: 11px; color: #64748b;">Conviction: ${dossier.convictionScore}/100</div>
    </div>
  </div>

  <h1 style="font-size: 24px; margin: 0 0 6px 0; color: #0f172a;">${dossier.companyName} (${dossier.symbol})</h1>
  <div style="font-size: 13px; color: #475569; margin-bottom: 20px;">
    Current Market Price: <strong>₹${dossier.currentPrice.toLocaleString('en-IN')}</strong> • Target 1: <strong style="color: #10b981;">${dossier.targetPrice}</strong> • Stop Loss: <strong style="color: #f43f5e;">${dossier.stopLoss}</strong> • Timeframe: <strong>${dossier.timeHorizon}</strong>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Risk-Reward</div>
      <div class="kpi-val">${dossier.riskRewardRatio}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Committee Agreement</div>
      <div class="kpi-val">${dossier.consensusMetrics.agreementIndex}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Chart Pattern</div>
      <div class="kpi-val" style="font-size: 14px;">${dossier.chartVisionInsights.patternDetected?.replace(/_/g, ' ')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Track Record Win Rate</div>
      <div class="kpi-val">${dossier.historicalTrackRecord.directionalWinRate > 0 ? `${dossier.historicalTrackRecord.directionalWinRate}%` : 'N/A'}</div>
    </div>
  </div>

  <h2>Executive Committee Debate Summary</h2>
  <p style="font-size: 12px; line-height: 1.6; color: #334155;">${dossier.executiveSummary}</p>

  <h2>5-Agent Council Deliberation Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Agent Persona</th>
        <th>Stance</th>
        <th>Confidence</th>
        <th>Key Thesis</th>
      </tr>
    </thead>
    <tbody>
      ${dossier.councilBreakdown.map(b => `
        <tr>
          <td><strong>${b.agentRole}</strong><br><span style="font-size: 10px; color: #64748b;">${b.personaTitle}</span></td>
          <td><span class="badge" style="background: #f1f5f9; color: #0f172a;">${b.stance}</span></td>
          <td>${b.confidenceScore}%</td>
          <td>${b.coreThesis}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Audio Morning Briefing Transcription</h2>
  <div class="audio-box">
    ${dossier.audioBriefingScript.replace(/\n\n/g, '<br><br>')}
  </div>

  <div class="disclaimer">
    ${dossier.sebiComplianceStatement}
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`;
}
