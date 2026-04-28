/**
 * supplierMatchExplanationBuilder.service.ts — Safe Explanation Builder
 *
 * Deterministic, buyer-safe explanation builder for the AI Supplier Matching system.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice D (explanation layer).
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO.
 * - DETERMINISTIC: Same input always produces same output.
 * - NEVER THROWS: Missing or empty matchCategories falls back to generic safe label.
 * - ALLOWLIST-ONLY LABELS: All output labels are derived exclusively from
 *   CATEGORY_LABEL_MAP. Raw model output, relationship state, price, and policy
 *   internals are constitutionally excluded from every label.
 * - NO FORBIDDEN OUTPUT: BLOCKED / REJECTED / SUSPENDED / APPROVED wording,
 *   numeric score/rank/confidence, price, allowlist graph, and relationship graph
 *   are constitutionally excluded.
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService         (no AI model calls in explanation layer)
 * - vectorEmbeddingClient    (no embeddings)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 *
 * @module supplierMatchExplanationBuilder.service
 */

import type {
  SupplierMatchCategory,
  SupplierMatchExplanation,
  SupplierMatchExplanationBuilderInput,
  SupplierMatchExplanationBuilderResult,
} from './supplierMatch.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Internal algorithm version for observability. */
export const EXPLANATION_BUILDER_VERSION = 'mvp-label-v1' as const;

/**
 * Safe buyer-facing fallback label when no match categories are present.
 * Used when matchCategories is empty or yields no mapped labels.
 */
export const FALLBACK_PRIMARY_LABEL = 'Potential supplier match' as const;

/**
 * Authoritative mapping from SupplierMatchCategory to safe buyer-facing label.
 *
 * CONSTITUTIONAL RULES:
 * - All labels must be pre-approved for buyer exposure.
 * - No label may reference relationship state (APPROVED/BLOCKED/REJECTED/SUSPENDED).
 * - No label may contain numeric score, rank, or confidence value.
 * - No label may contain price, margin, payment, credit, or policy internals.
 *
 * RELATIONSHIP_APPROVED maps to "Connected supplier" — the word APPROVED is
 * intentionally absent to prevent relationship state leakage in the buyer surface.
 */
export const CATEGORY_LABEL_MAP: Readonly<Record<SupplierMatchCategory, string>> = {
  RFQ_FIT:              'Matches RFQ requirement',
  MATERIAL_FIT:         'Matches requested material',
  CATEGORY_FIT:         'Matches catalog category',
  COMPLIANCE_FIT:       'Published certification match',
  GEOGRAPHY_FIT:        'Geography fit',
  MOQ_FIT:              'MOQ compatible',
  RELATIONSHIP_APPROVED: 'Connected supplier',
} as const;

/**
 * Deterministic sort priority for match categories.
 * Lower number = higher priority (appears first → becomes primaryLabel).
 * RFQ_FIT is highest priority as it represents direct buyer intent signal.
 */
const CATEGORY_PRIORITY: Readonly<Record<SupplierMatchCategory, number>> = {
  RFQ_FIT:              1,
  MATERIAL_FIT:         2,
  CATEGORY_FIT:         3,
  COMPLIANCE_FIT:       4,
  GEOGRAPHY_FIT:        5,
  MOQ_FIT:              6,
  RELATIONSHIP_APPROVED: 7,
} as const;

// ─── Fallback Explanation ─────────────────────────────────────────────────────

/**
 * Canonical safe fallback explanation.
 * Emitted when matchCategories is empty or yields no mapped labels.
 * Safe for buyer surface: no policy, score, or state content.
 */
const FALLBACK_EXPLANATION: Readonly<SupplierMatchExplanation> = {
  primaryLabel: FALLBACK_PRIMARY_LABEL,
  supportingLabels: [],
} as const;

// ─── Builder Function ─────────────────────────────────────────────────────────

/**
 * Build a safe, deterministic buyer-facing explanation from match categories.
 *
 * Algorithm:
 * 1. Deduplicate matchCategories (preserve first occurrence, then sort by priority).
 * 2. Map each unique category to its safe label via CATEGORY_LABEL_MAP.
 * 3. First label → primaryLabel; remaining → supportingLabels.
 * 4. Empty categories or no mapped labels → FALLBACK_EXPLANATION.
 *
 * CRITICAL:
 * - This function MUST NOT emit any label not present in CATEGORY_LABEL_MAP.
 * - This function MUST NOT reference any score, rank, confidence, or policy internals.
 * - This function MUST NOT call any inference or embedding service.
 *
 * @param input - Builder input with buyerOrgId and matchCategories.
 * @returns Buyer-safe explanation result.
 */
export function buildSupplierMatchExplanation(
  input: SupplierMatchExplanationBuilderInput,
): SupplierMatchExplanationBuilderResult {
  // Defensive: empty or missing categories → safe fallback
  if (!Array.isArray(input.matchCategories) || input.matchCategories.length === 0) {
    return { explanation: { ...FALLBACK_EXPLANATION } };
  }

  // Deduplicate while preserving relative occurrence; then sort by priority
  const seen = new Set<SupplierMatchCategory>();
  const uniqueCategories: SupplierMatchCategory[] = [];
  for (const cat of input.matchCategories) {
    if (!seen.has(cat)) {
      seen.add(cat);
      uniqueCategories.push(cat);
    }
  }

  // Sort deterministically by priority (stable sort; lower priority number first)
  uniqueCategories.sort(
    (a, b) => (CATEGORY_PRIORITY[a] ?? 99) - (CATEGORY_PRIORITY[b] ?? 99),
  );

  // Map to safe labels — skip any category without a mapping
  const labels: string[] = uniqueCategories
    .map((cat) => CATEGORY_LABEL_MAP[cat])
    .filter((label): label is string => label !== undefined && label.length > 0);

  if (labels.length === 0) {
    return { explanation: { ...FALLBACK_EXPLANATION } };
  }

  const firstLabel = labels[0];
  if (firstLabel === undefined) {
    return { explanation: { ...FALLBACK_EXPLANATION } };
  }

  return {
    explanation: {
      primaryLabel: firstLabel,
      supportingLabels: labels.slice(1),
    },
  };
}
