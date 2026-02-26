/**
 * G-018 — EscrowService Guardrails (Day 2)
 * Task ID: G-018-DAY2-ESCROW-SERVICE
 * Doctrine v1.4 + D-020-C (AI boundary, escrow-strict)
 *
 * Pure helper functions — no DB, no side effects, fully testable in isolation.
 * All validations that can be computed without a DB round-trip live here.
 */

import type { TransactionDirection, TransactionEntryType } from './escrow.types.js';

// ─── Canonical Value Sets ─────────────────────────────────────────────────────

/**
 * Canonical valid direction values.
 * Mirrors the DB CHECK constraint on escrow_transactions.direction.
 */
export const VALID_DIRECTIONS: readonly TransactionDirection[] = ['CREDIT', 'DEBIT'];

/**
 * Canonical valid entry type values.
 * Mirrors the DB CHECK constraint on escrow_transactions.entry_type.
 */
export const VALID_ENTRY_TYPES: readonly TransactionEntryType[] = [
  'HOLD',
  'RELEASE',
  'REFUND',
  'ADJUSTMENT',
];

// ─── Field Validators ─────────────────────────────────────────────────────────

/**
 * Returns true if `dir` is a valid TransactionDirection.
 * Uses an explicit string cast to satisfy readonly string[] includes().
 */
export function isValidDirection(dir: string): dir is TransactionDirection {
  return (VALID_DIRECTIONS as readonly string[]).includes(dir);
}

/**
 * Returns true if `type` is a valid TransactionEntryType.
 */
export function isValidEntryType(type: string): type is TransactionEntryType {
  return (VALID_ENTRY_TYPES as readonly string[]).includes(type);
}

/**
 * Returns true if `amount` is a finite positive number.
 * Mirrors the DB CHECK constraint: amount > 0.
 * NaN, Infinity, 0, and negative values all return false.
 */
export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

/**
 * Returns true if `currency` is a non-empty trimmed string.
 * Accepts any string value — ISO 4217 format validation is a business-layer concern.
 */
export function isValidCurrency(currency: string): boolean {
  return currency.trim().length > 0;
}

// ─── D-020-C: AI Boundary (Escrow-Strict Variant) ────────────────────────────

/**
 * Validates the AI boundary constraint for escrow lifecycle transitions.
 *
 * Escrow transitions are stricter than the baseline D-020-C rule because:
 *   - Escrow lifecycle acknowledgements must remain human-confirmed always.
 *   - AI has zero direct authority over escrow state (G-018 §2, D-020-C).
 *
 * Rule: If aiTriggered=true, reason MUST contain the literal string
 * "HUMAN_CONFIRMED:" to prove a human reviewed and confirmed the AI suggestion.
 * No actor type is exempt from this requirement in the escrow domain.
 *
 * @param aiTriggered - Whether the transition was AI-suggested.
 * @param reason      - Mandatory transition justification (D-020-D).
 * @returns null if the boundary is satisfied; an error message string if violated.
 */
export function checkEscrowAiBoundary(
  aiTriggered: boolean,
  reason: string,
): string | null {
  if (aiTriggered && !reason.includes('HUMAN_CONFIRMED:')) {
    return (
      'AI_BOUNDARY_VIOLATION: aiTriggered=true requires reason to contain the ' +
      '"HUMAN_CONFIRMED:" prefix to prove a human confirmed the AI suggestion. ' +
      '[D-020-C + G-018 ESCROW STRICT] No transition attempted.'
    );
  }
  return null;
}
