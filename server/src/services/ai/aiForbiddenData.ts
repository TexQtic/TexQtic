/**
 * aiForbiddenData.ts — AI Forbidden Data Guard Helpers
 *
 * Pure guard functions that enforce the AI data boundary at the context-pack
 * assembly boundary. Implements TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section B.
 *
 * RULES:
 * - Pure functions — no IO, no DB calls, no provider calls.
 * - Must detect/strip ALL fields listed in AI_FORBIDDEN_FIELD_NAMES.
 * - Must NOT strip AI-safe catalog fields: moq, catalogStage, stageAttributes,
 *   certifications, material, composition, name, sku, description, etc.
 * - assertNoForbiddenAiFields throws on detection (fail-safe: use at assembly boundary).
 * - stripForbiddenAiFields returns a sanitized shallow copy (does not mutate input).
 *
 * @module aiForbiddenData
 */

import { AI_FORBIDDEN_FIELD_NAMES } from './aiDataContracts.js';

// ─── Internal registries ───────────────────────────────────────────────────────

/**
 * Fields that are constitutionally safe for AI context packs.
 * Used by isAiSafeCatalogField() to positively confirm allowance.
 */
const AI_SAFE_CATALOG_FIELDS: ReadonlySet<string> = new Set([
  'moq',
  'catalogStage',
  'stageAttributes',
  'certifications',
  'material',
  'composition',
  'name',
  'sku',
  'description',
  'productCategory',
  'fabricType',
  'gsm',
  'color',
  'widthCm',
  'construction',
]);

/** Set of forbidden field names for O(1) lookup. */
const FORBIDDEN_FIELD_SET: ReadonlySet<string> = new Set<string>(AI_FORBIDDEN_FIELD_NAMES);

// ─── Guard helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if the input object contains any forbidden AI field key at the
 * top level (own enumerable keys only).
 *
 * @param input - Any value; non-objects return false.
 */
export function containsForbiddenAiField(input: unknown): boolean {
  if (input === null || typeof input !== 'object') return false;
  return Object.keys(input as Record<string, unknown>).some((k) =>
    FORBIDDEN_FIELD_SET.has(k),
  );
}

/**
 * Throws if the input object contains any forbidden AI field key.
 *
 * Use at the AI context pack assembly boundary to catch field leakage before
 * any data enters an AI prompt or embedding.
 *
 * Non-objects are silently allowed (no keys to check).
 *
 * @throws {Error} with 'AI_FORBIDDEN_FIELD_DETECTED' message if a forbidden
 *   key is present.
 */
export function assertNoForbiddenAiFields(input: unknown): void {
  if (input === null || typeof input !== 'object') return;
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (FORBIDDEN_FIELD_SET.has(key)) {
      throw new Error(
        `AI_FORBIDDEN_FIELD_DETECTED: field "${key}" must not enter any AI path. ` +
          `See TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section B.`,
      );
    }
  }
}

/**
 * Returns a shallow copy of the input with all forbidden AI field keys removed.
 *
 * AI-safe catalog fields (moq, catalogStage, stageAttributes, certifications,
 * material, composition, etc.) are always preserved.
 *
 * Does not mutate the original object.
 *
 * @param input - Source object to sanitize.
 * @returns Shallow copy with forbidden keys omitted.
 */
export function stripForbiddenAiFields<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  const result = {} as Partial<T>;
  for (const [key, value] of Object.entries(input)) {
    if (!FORBIDDEN_FIELD_SET.has(key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Returns true if the given field name is in the set of AI-safe catalog fields.
 *
 * Use on completeness and suggestion surfaces to confirm that a field is
 * allowable in an AI suggestion output.
 *
 * @param fieldName - The catalog item field name to check.
 */
export function isAiSafeCatalogField(fieldName: string): boolean {
  return AI_SAFE_CATALOG_FIELDS.has(fieldName);
}

/**
 * Returns the complete set of forbidden field names as a read-only Set.
 *
 * Useful for test assertions and for building custom guard logic that extends
 * this contract.
 */
export function getForbiddenFieldNames(): ReadonlySet<string> {
  return FORBIDDEN_FIELD_SET;
}
