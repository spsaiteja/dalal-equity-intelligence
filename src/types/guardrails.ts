import { ConvictionType } from './stock';

/**
 * Result of input sanitization guardrail
 */
export interface InputSanitizationResult {
  /** Whether the input was modified/cleaned */
  sanitized: boolean;
  /** Whether the input was completely blocked (malicious) */
  blocked: boolean;
  /** Reason for blocking or sanitization */
  reason?: string;
  /** The cleaned input string (original if no changes needed) */
  cleanInput: string;
}

/**
 * Individual guardrail flag raised during output safety scanning
 */
export interface GuardrailFlag {
  type: 'GUARANTEED_RETURN' | 'EXTREME_ASSERTION' | 'NON_COMPLIANT_ADVICE' | 'PII_DETECTED' | 'PROMPT_INJECTION';
  severity: 'warning' | 'critical';
  message: string;
  /** The specific text fragment that triggered the flag */
  triggerText?: string;
}

/**
 * Aggregated result of output safety scan
 */
export interface GuardrailScanResult {
  /** Whether any flags were raised */
  flagged: boolean;
  /** Individual flags */
  flags: GuardrailFlag[];
  /** Count by severity */
  warningCount: number;
  criticalCount: number;
}

/**
 * SEBI-compliant financial disclaimer
 */
export interface ComplianceDisclaimer {
  /** Short one-liner for UI badges and footers */
  short: string;
  /** Full regulatory disclaimer text */
  full: string;
}

/**
 * Aggregated guardrail metadata attached to each deliberation run
 */
export interface GuardrailMetadata {
  inputSanitized: boolean;
  inputBlocked: boolean;
  piiStripped: boolean;
  outputFlags: GuardrailFlag[];
  compliance: ComplianceDisclaimer;
  scannedAt: string;
}
