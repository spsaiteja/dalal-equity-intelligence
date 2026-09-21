/**
 * Phase 15: Institutional Executive Dossier & Report Export Engine Types
 * Multi-page institutional equity research memo, printable HTML/PDF, and executive audio briefing synthesizer.
 */

import { CouncilDeliberationResult } from './agent';

export interface DossierAgentSummary {
  agentRole: string;
  personaTitle: string;
  stance: string;
  confidenceScore: number;
  coreThesis: string;
  riskOrOpportunityHighlight: string;
}

export interface ExecutiveDossier {
  dossierId: string;
  generatedAt: string;
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  verdict: 'BUY' | 'SELL' | 'HOLD';
  convictionScore: number; // 0 - 100
  targetPrice: string;
  target2Price?: string;
  stopLoss: string;
  riskRewardRatio: string;
  timeHorizon: string;
  executiveSummary: string;
  councilBreakdown: DossierAgentSummary[];
  consensusMetrics: {
    agreementIndex: number;
    hasDissent: boolean;
    dissenter?: string;
    dissentCounterThesis?: string;
    polarizationScore: number;
  };
  chartVisionInsights: {
    patternDetected?: string;
    patternConfidence?: number;
    implication?: string;
    keyLevels?: {
      support: number;
      resistance: number;
    };
    breakoutTarget?: string;
    candlestickFormations?: string[];
  };
  historicalTrackRecord: {
    symbolEvaluationsCount: number;
    directionalWinRate: number;
    profitFactor: number;
    brierScore: number;
    calibrationReliability: 'High' | 'Moderate' | 'Insufficient Data';
  };
  audioBriefingScript: string;
  sebiComplianceStatement: string;
}

export type DossierExportFormat = 'JSON' | 'MARKDOWN' | 'HTML_PRINT';

export interface DossierExportOptions {
  format?: DossierExportFormat;
  includeAudioBriefing?: boolean;
  includeTelemetryTrace?: boolean;
  analystSignOffName?: string;
}

