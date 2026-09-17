/**
 * DalalAI Guardrails & Safety Layer
 * Phase 6: Input sanitization, PII stripping, output safety scanning, and financial compliance disclaimers.
 *
 * All guardrails are NON-BLOCKING by design — they sanitize, flag, or append disclaimers
 * without crashing the pipeline. If a guardrail detects a violation in LLM output,
 * it annotates the response with a guardrailFlags array rather than suppressing it.
 */

import {
  InputSanitizationResult,
  GuardrailFlag,
  GuardrailScanResult,
  ComplianceDisclaimer,
  GuardrailMetadata,
} from '@/types/guardrails';

// =============================================================================
// 1. INPUT SANITIZATION — Prompt Injection Defense & Symbol Validation
// =============================================================================

/**
 * Regex patterns that indicate prompt injection attempts.
 * These are common jailbreak / override vectors for LLM-based systems.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/i,
  /ignore\s+(all\s+)?prior\s+(instructions|context)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|a|an|the)/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /<\|system\|>/i,
  /<\|im_start\|>/i,
  /<\|endoftext\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /\{\{system\}\}/i,
  /\{\{instructions?\}\}/i,
  /ADMIN\s*:/i,
  /OVERRIDE\s*:/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+enabled/i,
  /do\s+anything\s+now/i,
  /reveal\s+(your|the)\s+(system|initial)\s+prompt/i,
  /what\s+(is|are)\s+your\s+(instructions|system\s+prompt|rules)/i,
  /output\s+(your|the)\s+(system|initial)\s+prompt/i,
  /repeat\s+(your|the)\s+(system|initial|previous)\s+(prompt|instructions)/i,
];

/**
 * Strict symbol validation regex.
 * Accepts: RELIANCE, TCS, M&M, RELIANCE.NS, BAJAJ-AUTO, NIFTY_50
 * Rejects: Anything with spaces, special chars, or injection payloads.
 */
const VALID_SYMBOL_REGEX = /^[A-Z0-9&_.-]{1,20}(\.(NS|BO))?$/i;

/**
 * Maximum allowed length for user-provided text inputs (symbols, names, etc.)
 */
const MAX_INPUT_LENGTH = 500;

/**
 * Sanitizes user input to defend against prompt injection, symbol tampering,
 * and oversized payloads. Returns a sanitization result with the cleaned input.
 */
export function sanitizeInput(input: string, fieldName: string = 'input'): InputSanitizationResult {
  if (!input || typeof input !== 'string') {
    return { sanitized: false, blocked: true, reason: `${fieldName} is empty or not a string`, cleanInput: '' };
  }

  const trimmed = input.trim();

  // Length guard
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      sanitized: true,
      blocked: true,
      reason: `${fieldName} exceeds maximum allowed length (${MAX_INPUT_LENGTH} chars)`,
      cleanInput: trimmed.slice(0, MAX_INPUT_LENGTH),
    };
  }

  // Prompt injection detection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.warn(`[Guardrails] Prompt injection detected in ${fieldName}: matched pattern ${pattern}`);
      return {
        sanitized: true,
        blocked: true,
        reason: `Potential prompt injection detected in ${fieldName}. Request blocked for safety.`,
        cleanInput: '',
      };
    }
  }

  return { sanitized: false, blocked: false, cleanInput: trimmed };
}

/**
 * Validates that a stock symbol matches the expected NSE/BSE format.
 * Blocks malformed or attack-embedded symbols.
 */
export function validateSymbol(symbol: string): InputSanitizationResult {
  const base = sanitizeInput(symbol, 'symbol');
  if (base.blocked) return base;

  const clean = base.cleanInput.toUpperCase().trim();

  if (!VALID_SYMBOL_REGEX.test(clean)) {
    return {
      sanitized: true,
      blocked: true,
      reason: `Invalid stock symbol format: "${clean}". Expected NSE/BSE format (e.g., RELIANCE, TCS.NS, M&M).`,
      cleanInput: '',
    };
  }

  return { sanitized: false, blocked: false, cleanInput: clean };
}

// =============================================================================
// 2. PII STRIPPING — Remove Sensitive Identifiers Before LLM Ingestion
// =============================================================================

/**
 * PII detection patterns for Indian financial context
 */
const PII_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'EMAIL' },
  // Indian mobile numbers: +91XXXXXXXXXX, 91-XXXXX-XXXXX, 0XXXXXXXXXX
  { pattern: /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g, label: 'PHONE' },
  // Aadhaar: XXXX XXXX XXXX or XXXX-XXXX-XXXX
  { pattern: /\b\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, label: 'AADHAAR' },
  // PAN: ABCDE1234F
  { pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g, label: 'PAN' },
  // Demat account IDs: IN followed by 14 digits
  { pattern: /\bIN\d{14}\b/g, label: 'DEMAT_ID' },
  // Bank account numbers (8-18 digit sequences that look like account numbers)
  { pattern: /\b\d{8,18}\b/g, label: 'BANK_ACCOUNT' },
  // IFSC codes: 4 letter bank code + 0 + 6 char branch
  { pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, label: 'IFSC' },
];

/**
 * Strips PII (Personally Identifiable Information) from text before sending to LLM.
 * Returns the sanitized text and whether any PII was detected.
 */
export function stripPII(text: string): { cleaned: string; piiDetected: boolean; strippedTypes: string[] } {
  if (!text || typeof text !== 'string') {
    return { cleaned: text || '', piiDetected: false, strippedTypes: [] };
  }

  let cleaned = text;
  const strippedTypes: Set<string> = new Set();

  for (const { pattern, label } of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(cleaned)) {
      strippedTypes.add(label);
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, `[REDACTED_${label}]`);
    }
  }

  return {
    cleaned,
    piiDetected: strippedTypes.size > 0,
    strippedTypes: Array.from(strippedTypes),
  };
}

// =============================================================================
// 3. OUTPUT SAFETY SCANNING — Hallucination & Compliance Violation Detection
// =============================================================================

/**
 * Patterns that indicate guaranteed return claims (hallucination risk)
 */
const GUARANTEED_RETURN_PATTERNS: RegExp[] = [
  /guaranteed?\s+(returns?|profits?|gains?|income)/i,
  /risk[\s-]?free\s+(profits?|returns?|investment|gains?)/i,
  /100\s*%\s*(certain|sure|guaranteed|chance)/i,
  /will\s+definitely\s+(rise|go\s+up|increase|double|triple)/i,
  /assured\s+(returns?|gains?|profits?)/i,
  /no\s+(possibility|chance|risk)\s+of\s+(loss|losing)/i,
  /zero\s+risk/i,
  /can\s*n[o']?t\s+(fail|lose|go\s+wrong)/i,
  /sure[\s-]?shot\s+(profit|return|winner)/i,
  /money[\s-]?back\s+guarantee/i,
];

/**
 * Patterns that indicate extreme/irresponsible assertions
 */
const EXTREME_ASSERTION_PATTERNS: RegExp[] = [
  /will\s+(crash|collapse|go\s+to\s+zero)/i,
  /bankruptcy\s+(imminent|certain|inevitable|guaranteed)/i,
  /will\s+(10x|100x|1000x)/i,
  /will\s+(double|triple|quadruple)\s+in\s+\d+\s+(day|week|hour)/i,
  /ponzi\s+scheme/i,
  /fraud(ulent)?\s+(company|stock|management)/i,
  /stock\s+will\s+be\s+delisted/i,
  /multi[\s-]?bagger\s+guaranteed/i,
];

/**
 * Patterns that indicate non-compliant investment advisory language
 */
const NON_COMPLIANT_PATTERNS: RegExp[] = [
  /you\s+(must|should|need\s+to)\s+(buy|sell|invest|trade)\s+(immediately|now|today|right\s+away)/i,
  /(immediately|urgently)\s+(buy|sell|invest|exit)/i,
  /invest\s+(all\s+)?(your|entire)\s+(savings?|money|capital|retirement)/i,
  /take\s+(a|out\s+a)\s+loan\s+to\s+(invest|buy|trade)/i,
  /borrow\s+(money|funds)\s+(to|for)\s+(invest|buy|trade)/i,
  /put\s+all\s+your\s+(money|eggs)\s+in/i,
  /sell\s+(everything|all\s+your\s+holdings)/i,
  /SEBI[\s-]?registered\s+(analyst|advisor)/i, // Falsely claiming SEBI registration
  /certified\s+financial\s+(advisor|planner)/i, // Falsely claiming credentials
];

/**
 * Scans LLM output text for safety violations including hallucinated guarantees,
 * extreme assertions, and non-compliant advisory language.
 */
export function scanOutputSafety(text: string): GuardrailScanResult {
  if (!text || typeof text !== 'string') {
    return { flagged: false, flags: [], warningCount: 0, criticalCount: 0 };
  }

  const flags: GuardrailFlag[] = [];

  // Scan for guaranteed return claims
  for (const pattern of GUARANTEED_RETURN_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      flags.push({
        type: 'GUARANTEED_RETURN',
        severity: 'critical',
        message: 'Detected guaranteed return/profit claim — this is a financial compliance violation.',
        triggerText: match[0],
      });
    }
  }

  // Scan for extreme assertions
  for (const pattern of EXTREME_ASSERTION_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      flags.push({
        type: 'EXTREME_ASSERTION',
        severity: 'warning',
        message: 'Detected extreme or irresponsible market assertion that may constitute misleading advice.',
        triggerText: match[0],
      });
    }
  }

  // Scan for non-compliant advisory language
  for (const pattern of NON_COMPLIANT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      flags.push({
        type: 'NON_COMPLIANT_ADVICE',
        severity: 'critical',
        message: 'Detected non-compliant investment advisory language that may violate SEBI regulations.',
        triggerText: match[0],
      });
    }
  }

  const warningCount = flags.filter((f) => f.severity === 'warning').length;
  const criticalCount = flags.filter((f) => f.severity === 'critical').length;

  return {
    flagged: flags.length > 0,
    flags,
    warningCount,
    criticalCount,
  };
}

/**
 * Scans all text fields in a council consensus response for safety violations.
 * Aggregates flags from debate summary, CIO directive, and all agent outputs.
 */
export function scanConsensusOutput(consensus: {
  debateSummary?: string;
  cioExecutiveDirective?: string;
  agents?: Record<string, { headlineTakeaway?: string; arguments?: string[] }>;
}): GuardrailScanResult {
  const allFlags: GuardrailFlag[] = [];

  // Scan CIO-level outputs
  if (consensus.debateSummary) {
    const scan = scanOutputSafety(consensus.debateSummary);
    allFlags.push(...scan.flags);
  }
  if (consensus.cioExecutiveDirective) {
    const scan = scanOutputSafety(consensus.cioExecutiveDirective);
    allFlags.push(...scan.flags);
  }

  // Scan each agent's output
  if (consensus.agents) {
    for (const [, agent] of Object.entries(consensus.agents)) {
      if (agent?.headlineTakeaway) {
        const scan = scanOutputSafety(agent.headlineTakeaway);
        allFlags.push(...scan.flags);
      }
      if (agent?.arguments && Array.isArray(agent.arguments)) {
        for (const arg of agent.arguments) {
          const scan = scanOutputSafety(arg);
          allFlags.push(...scan.flags);
        }
      }
    }
  }

  // Deduplicate by triggerText
  const seen = new Set<string>();
  const deduped = allFlags.filter((f) => {
    const key = `${f.type}:${f.triggerText || f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    flagged: deduped.length > 0,
    flags: deduped,
    warningCount: deduped.filter((f) => f.severity === 'warning').length,
    criticalCount: deduped.filter((f) => f.severity === 'critical').length,
  };
}

// =============================================================================
// 4. FINANCIAL COMPLIANCE DISCLAIMER — SEBI RA Regulation Compliance
// =============================================================================

/**
 * Returns the standard SEBI-compliant financial disclaimer for DalalAI.
 */
export function getComplianceDisclaimer(): ComplianceDisclaimer {
  return {
    short: 'AI-generated research. Not SEBI-registered investment advice.',
    full: 'DalalAI is an AI-powered equity research tool for educational and informational purposes only. ' +
      'It does not constitute investment advice under SEBI (Research Analyst) Regulations, 2014. ' +
      'The AI models may produce inaccurate, incomplete, or biased analysis. ' +
      'Past performance is not indicative of future results. Market investments are subject to risks. ' +
      'Consult a SEBI-registered investment advisor before making any investment decisions. ' +
      'The creators of DalalAI bear no liability for investment outcomes based on AI-generated analysis.',
  };
}

// =============================================================================
// 5. AGGREGATED GUARDRAIL METADATA — Composite Safety Audit
// =============================================================================

/**
 * Builds a complete guardrail metadata record for a deliberation run.
 */
export function buildGuardrailMetadata(
  inputResult: InputSanitizationResult,
  piiResult: { piiDetected: boolean },
  outputScan: GuardrailScanResult
): GuardrailMetadata {
  return {
    inputSanitized: inputResult.sanitized,
    inputBlocked: inputResult.blocked,
    piiStripped: piiResult.piiDetected,
    outputFlags: outputScan.flags,
    compliance: getComplianceDisclaimer(),
    scannedAt: new Date().toISOString(),
  };
}
