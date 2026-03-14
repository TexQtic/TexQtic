/**
 * piiGuard.ts — PW5-AI-PII-GUARD
 *
 * TIS-local PII scanning and redaction helper.
 *
 * Implements deterministic, regex-based PII detection for the TIS boundary.
 * Used exclusively by inferenceService.ts for pre-send redaction and
 * post-receive leak blocking.
 *
 * RULES:
 * - Pattern-based only. No external services. No LLM classification.
 * - Returns structured metadata only. Raw matched values are NEVER returned,
 *   stored, or emitted.
 * - Redaction replaces matches with [REDACTED] in-place.
 * - Each scan/redact call creates fresh RegExp instances to avoid lastIndex drift.
 *
 * SCOPE: PW5-AI-PII-GUARD only.
 */

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * The result of a PII scan (no redaction applied).
 * Raw matched values are not included — only metadata.
 */
export interface PiiScanResult {
  /** Whether any PII pattern matched. */
  hasMatches: boolean;
  /** Distinct categories that matched (e.g. ['EMAIL', 'PHONE']). */
  categories: string[];
  /** Total count of individual matches across all categories. */
  matchCount: number;
}

/**
 * The result of a PII redact pass (scan + in-place replacement).
 * Extends PiiScanResult with the sanitised text.
 */
export interface PiiRedactResult extends PiiScanResult {
  /** Text with all matched values replaced by [REDACTED]. */
  redacted: string;
}

// ---------------------------------------------------------------------------
// Pattern registry
// ---------------------------------------------------------------------------

/**
 * Deterministic PII pattern definitions.
 *
 * Patterns are defined as factory functions to ensure a fresh RegExp instance
 * on each call, avoiding shared lastIndex state across invocations.
 */
const PII_PATTERN_DEFS: Array<{ category: string; makePattern: () => RegExp }> = [
  {
    // Standard email address
    category: 'EMAIL',
    makePattern: () => /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    // E.164 international (+CC XXXXXXXXX), US (NXX-NXX-XXXX), and Indian
    // 10-digit mobile (6–9 prefix) formats.
    // Conservative: requires explicit separator or prefix to reduce false positives
    // from numeric identifiers.
    category: 'PHONE',
    makePattern: () =>
      /(?:\+\d{1,3}[\s\-]?\d{6,12}|\b(?:\d{3}[\s\-])?\d{3}[\s\-]\d{4}\b|\b[6-9]\d{9}\b)/g,
  },
  {
    // Credit/debit card: 4×4 digit groups separated by space or dash
    category: 'CARD',
    makePattern: () => /\b(?:\d{4}[\s\-]){3}\d{4}\b/g,
  },
  {
    // Aadhaar: 12 digits in 4-4-4 grouping (with or without spaces)
    category: 'AADHAAR',
    makePattern: () => /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  },
  {
    // Indian PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
    category: 'PAN',
    makePattern: () => /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
  },
];

const REDACTION_PLACEHOLDER = '[REDACTED]';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * scanForPii — inspect text for PII patterns without modifying it.
 *
 * Returns structured metadata only. Raw match content is discarded.
 *
 * @param text  The text to inspect (prompt or model output).
 * @returns     PiiScanResult — categories, match count, presence flag.
 */
export function scanForPii(text: string): PiiScanResult {
  const categories: string[] = [];
  let matchCount = 0;

  for (const { category, makePattern } of PII_PATTERN_DEFS) {
    const pattern = makePattern();
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      categories.push(category);
      matchCount += matches.length; // count but do not expose matched values
    }
  }

  return {
    hasMatches: categories.length > 0,
    categories,
    matchCount,
  };
}

/**
 * redactPii — scan text and replace all PII matches with [REDACTED].
 *
 * Returns the redacted string along with scan metadata.
 * Raw matched values are replaced in-place and never returned or stored.
 *
 * @param text  The text to inspect and sanitise.
 * @returns     PiiRedactResult — redacted text + categories + match count.
 */
export function redactPii(text: string): PiiRedactResult {
  const categories: string[] = [];
  let matchCount = 0;
  let redacted = text;

  for (const { category, makePattern } of PII_PATTERN_DEFS) {
    const pattern = makePattern();
    const matches = redacted.match(pattern);
    if (matches && matches.length > 0) {
      categories.push(category);
      matchCount += matches.length;
      // Replace using a fresh pattern instance (match() consumed the first)
      redacted = redacted.replace(makePattern(), REDACTION_PLACEHOLDER);
    }
  }

  return {
    hasMatches: categories.length > 0,
    categories,
    matchCount,
    redacted,
  };
}
