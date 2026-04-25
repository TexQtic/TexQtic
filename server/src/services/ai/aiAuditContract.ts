/**
 * aiAuditContract.ts — AI Audit Contract Helpers
 *
 * Pure helper functions and types for constructing audit-safe AI event summaries
 * and reasoning log entries. Implements TECS-AI-FOUNDATION-DATA-CONTRACTS-001
 * Section O.
 *
 * RULES:
 * - promptSummary and responseSummary max 500 chars (PROMPT_SUMMARY_MAX_CHARS).
 * - No raw chunk content in any summary.
 * - No PII in summaries.
 * - Summaries must not reference forbidden fields (price, escrow, email, etc.).
 * - Source references as IDs only — no chunk content.
 * - No IO, no DB calls, no provider calls.
 *
 * @module aiAuditContract
 */

import { AI_REASONING_LOG_LIMITS, AI_FORBIDDEN_FIELD_NAMES } from './aiDataContracts.js';

// ─── Internal registries ───────────────────────────────────────────────────────

/** Set of forbidden field names for audit content checking. */
const FORBIDDEN_AUDIT_FIELDS: ReadonlySet<string> = new Set<string>(AI_FORBIDDEN_FIELD_NAMES);

// ─── Enums and event types ─────────────────────────────────────────────────────

/**
 * Event types emitted by the AI layer via emitAiEventBestEffort().
 * All events are best-effort and must never block the primary flow.
 */
export const AI_AUDIT_EVENT_TYPES = [
  'ai.vector.upsert',
  'ai.vector.delete',
  'ai.vector.query',
  'ai.inference.generate',
  'ai.budget.exceeded',
  'ai.inference.timeout',
  'ai.killswitch.activated',
] as const;

export type AiAuditEventType = (typeof AI_AUDIT_EVENT_TYPES)[number];

// ─── Audit summary types ───────────────────────────────────────────────────────

/**
 * Audit-safe summary of an assembled context pack.
 *
 * Contains no chunk content, no forbidden fields, and no raw user text.
 */
export interface AiContextPackAuditSummary {
  /** Context pack type identifier */
  packType: string;
  /** JWT-derived orgId of the requesting tenant */
  orgId: string;
  /** Source types included in retrieved chunks — no IDs or chunk content */
  sourceTypes: string[];
  /** Number of retrieved chunks injected into the prompt */
  chunkCount: number;
  /** Whether piiGuard.redactPii() was applied to any user-originated text */
  piiGuardApplied: boolean;
  /** ISO 8601 timestamp of context pack assembly */
  assembledAt: string;
}

/**
 * Audit-safe summary of an AI model output.
 *
 * responseSummary is truncated and PII-scanned by caller before passing here.
 * Contains no forbidden fields and no chunk content.
 */
export interface AiOutputAuditSummary {
  /** Output type identifier (e.g., 'SupplierMatchResult', 'RFQDraft') */
  outputType: string;
  /** JWT-derived orgId of the requesting tenant */
  orgId: string;
  /** Truncated and PII-scanned response summary — max 500 chars */
  responseSummary: string;
  /** Confidence or match score if applicable */
  score?: number;
  /** Whether human confirmation is required before any downstream action */
  humanConfirmationRequired: boolean;
  /** Source entity IDs referenced in the output — no chunk content */
  sourceIds: string[];
  /** ISO 8601 timestamp of output generation */
  generatedAt: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Truncates a string to the specified max length.
 * Appends '…' (ellipsis character) if truncated to signal the truncation to callers.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026'; // U+2026 HORIZONTAL ELLIPSIS
}

/**
 * Returns true if the text contains any forbidden field name as a whole word.
 *
 * Uses word-boundary regex (\b) to avoid false positives on substrings.
 * The check is case-insensitive — field names are lowercased before comparison.
 *
 * Conservative: any audit summary that mentions a forbidden field name as a
 * standalone word is considered to contain forbidden content and must be rejected.
 */
function containsForbiddenAuditContent(text: string): boolean {
  const lower = text.toLowerCase();
  for (const field of FORBIDDEN_AUDIT_FIELDS) {
    if (new RegExp(`\\b${field.toLowerCase()}\\b`).test(lower)) {
      return true;
    }
  }
  return false;
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Builds an audit-safe prompt summary for storage in reasoning_logs.promptSummary.
 *
 * Rules enforced:
 * - Truncated to PROMPT_SUMMARY_MAX_CHARS (500).
 * - Throws if the summary contains a forbidden field name as a whole word.
 * - Caller is responsible for ensuring no raw user text, no chunk content,
 *   and no PII appears in the input.
 *
 * @param rawSummary - Prompt summary prepared by the caller.
 * @returns Truncated, audit-safe string.
 * @throws {Error} with 'AI_AUDIT_FORBIDDEN_CONTENT' prefix if a forbidden
 *   field name is detected.
 */
export function buildAiPromptSummary(rawSummary: string): string {
  if (containsForbiddenAuditContent(rawSummary)) {
    throw new Error(
      `AI_AUDIT_FORBIDDEN_CONTENT: promptSummary contains a forbidden field reference. ` +
        `Remove all references to forbidden fields before constructing the prompt summary. ` +
        `See TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section B.`,
    );
  }
  return truncate(rawSummary, AI_REASONING_LOG_LIMITS.PROMPT_SUMMARY_MAX_CHARS);
}

/**
 * Builds an audit-safe response summary for storage in reasoning_logs.responseSummary.
 *
 * Rules enforced:
 * - Truncated to RESPONSE_SUMMARY_MAX_CHARS (500).
 * - Throws if the summary contains a forbidden field name as a whole word.
 * - Caller is responsible for passing PII-scanned content only.
 *
 * @param rawSummary - Response summary prepared by the caller (PII-scanned).
 * @returns Truncated, audit-safe string.
 * @throws {Error} with 'AI_AUDIT_FORBIDDEN_CONTENT' prefix if a forbidden
 *   field name is detected.
 */
export function buildAiResponseSummary(rawSummary: string): string {
  if (containsForbiddenAuditContent(rawSummary)) {
    throw new Error(
      `AI_AUDIT_FORBIDDEN_CONTENT: responseSummary contains a forbidden field reference. ` +
        `Remove all references to forbidden fields before constructing the response summary. ` +
        `See TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section B.`,
    );
  }
  return truncate(rawSummary, AI_REASONING_LOG_LIMITS.RESPONSE_SUMMARY_MAX_CHARS);
}
