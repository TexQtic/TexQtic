/**
 * supplierMatchRuntimeGuard.service.ts — Runtime Output Guard
 *
 * Deterministic runtime guard for buyer-facing supplier match output.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice D (runtime guard layer).
 *
 * This guard is the final safety layer before candidates are surfaced to buyers.
 * It scans for forbidden fields and forbidden text fragments in explanation labels,
 * blocking any candidate that fails inspection. Passing candidates are returned
 * in original order; blocked candidates are logged internally only.
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO.
 * - DETERMINISTIC: Same input always produces same output.
 * - NEVER THROWS: Errors are blocked safely; empty/missing input returns passed=true.
 * - ZERO RAW VALUE LEAKAGE: Violation records contain field NAMES only — never values.
 * - SILENT EXCLUSION: Blocked candidates are excluded without buyer-visible explanation.
 * - ORDER PRESERVATION: Safe candidates retain their original ordinal position.
 *
 * Guard checks (in order):
 *   1. Forbidden field scan: recursive key traversal against FORBIDDEN_GUARD_FIELDS.
 *   2. Explanation text scan: label strings against FORBIDDEN_EXPLANATION_FRAGMENTS.
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService         (no AI model calls in guard layer)
 * - vectorEmbeddingClient    (no embeddings)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 *
 * @module supplierMatchRuntimeGuard.service
 */

import type {
  SupplierMatchCandidate,
  SupplierMatchRuntimeGuardInput,
  SupplierMatchRuntimeGuardResult,
  SupplierMatchRuntimeGuardViolation,
  SupplierMatchRuntimeGuardViolationReason,
} from './supplierMatch.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Internal algorithm version for observability. */
export const GUARD_VERSION = 'mvp-guard-v1' as const;

/**
 * Authoritative set of forbidden JSON key names.
 *
 * Any candidate whose object graph contains one of these keys is blocked.
 * This set is intentionally conservative — better to block a borderline
 * candidate than to surface a hidden field to buyers.
 *
 * Classification of forbidden fields (see FIELD_VIOLATION_MAP for reasons):
 * - Price / financial       price, amount, unitPrice, basePrice, listPrice, costPrice,
 *                           supplierPrice, negotiatedPrice, internalMargin, margin,
 *                           commercialTerms, price_disclosure_policy_mode,
 *                           payment, credit, escrow, grossAmount
 * - Relationship / policy   relationshipState, blockedReason, rejectedReason,
 *                           suspensionReason, supplierPolicy,
 *                           supplierDisclosurePolicy, publicationPosture
 * - Allowlist / graph       relationshipGraph, allowlistGraph, allowlistEntries
 * - Score / confidence      score, rank, ranking, confidenceScore, aiConfidence,
 *                           buyerScore, supplierScore, risk_score, riskScore
 * - DPP unpublished         unpublishedEvidence
 * - AI draft                aiExtractionDraft, draftExtraction, aiDraftData
 * - Audit / secrets         auditMetadata, privateNotes, secrets, tokens, auth
 */
const FORBIDDEN_GUARD_FIELDS_SET: ReadonlySet<string> = new Set<string>([
  // Price / financial
  'price',
  'amount',
  'unitPrice',
  'basePrice',
  'listPrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'internalMargin',
  'margin',
  'commercialTerms',
  'price_disclosure_policy_mode',
  'payment',
  'credit',
  'escrow',
  'grossAmount',
  // Relationship / policy
  'relationshipState',
  'blockedReason',
  'rejectedReason',
  'suspensionReason',
  'supplierPolicy',
  'supplierDisclosurePolicy',
  'publicationPosture',
  // Allowlist / graph
  'relationshipGraph',
  'allowlistGraph',
  'allowlistEntries',
  // Score / confidence
  'score',
  'rank',
  'ranking',
  'confidenceScore',
  'aiConfidence',
  'buyerScore',
  'supplierScore',
  'risk_score',
  'riskScore',
  // DPP unpublished
  'unpublishedEvidence',
  // AI draft
  'aiExtractionDraft',
  'draftExtraction',
  'aiDraftData',
  // Audit / secrets
  'auditMetadata',
  'privateNotes',
  'secrets',
  'tokens',
  'auth',
]);

/**
 * Forbidden text fragments for explanation label scanning.
 * Matched case-insensitively as substrings of explanation labels.
 *
 * These fragments detect policy state, financial, and internal data leakage
 * in buyer-facing explanation strings. Any label containing one of these
 * fragments blocks its candidate.
 *
 * NOTE: These fragments are chosen to be specific enough to avoid false positives
 * with normal textile domain terms (e.g., "woven", "cotton", "fabric structure").
 * "blocked" is included intentionally to detect relationship state leaks in labels —
 * controlled explanation labels from CATEGORY_LABEL_MAP never contain this term.
 */
const FORBIDDEN_EXPLANATION_FRAGMENTS: ReadonlyArray<string> = [
  'hidden price',
  'internal margin',
  'negotiated price',
  'cost price',
  'payment status',
  'credit score',
  'blocked',
  'rejected',
  'suspended',
  'allowlist',
  'relationship graph',
  'risk score',
  'publication posture',
  'ai confidence',
  'score:',
  'rank:',
  'unpublished evidence',
  'draft extraction',
  'private note',
  'competitor',
];

// ─── Field Violation Classification ──────────────────────────────────────────

/**
 * Maps each forbidden field name to its violation reason.
 * Fields not present in this map default to 'FORBIDDEN_FIELD_PRESENT'.
 */
const FIELD_VIOLATION_MAP: Readonly<Record<string, SupplierMatchRuntimeGuardViolationReason>> = {
  // Price / financial → HIDDEN_PRICE_LEAK
  price:                         'HIDDEN_PRICE_LEAK',
  amount:                        'HIDDEN_PRICE_LEAK',
  unitPrice:                     'HIDDEN_PRICE_LEAK',
  basePrice:                     'HIDDEN_PRICE_LEAK',
  listPrice:                     'HIDDEN_PRICE_LEAK',
  costPrice:                     'HIDDEN_PRICE_LEAK',
  supplierPrice:                 'HIDDEN_PRICE_LEAK',
  negotiatedPrice:               'HIDDEN_PRICE_LEAK',
  internalMargin:                'HIDDEN_PRICE_LEAK',
  margin:                        'HIDDEN_PRICE_LEAK',
  commercialTerms:               'HIDDEN_PRICE_LEAK',
  price_disclosure_policy_mode:  'HIDDEN_PRICE_LEAK',
  payment:                       'HIDDEN_PRICE_LEAK',
  credit:                        'HIDDEN_PRICE_LEAK',
  escrow:                        'HIDDEN_PRICE_LEAK',
  grossAmount:                   'HIDDEN_PRICE_LEAK',
  // Relationship / policy → RELATIONSHIP_STATE_LEAK
  relationshipState:             'RELATIONSHIP_STATE_LEAK',
  blockedReason:                 'RELATIONSHIP_STATE_LEAK',
  rejectedReason:                'RELATIONSHIP_STATE_LEAK',
  suspensionReason:              'RELATIONSHIP_STATE_LEAK',
  supplierPolicy:                'RELATIONSHIP_STATE_LEAK',
  supplierDisclosurePolicy:      'RELATIONSHIP_STATE_LEAK',
  publicationPosture:            'RELATIONSHIP_STATE_LEAK',
  // Allowlist / graph → ALLOWLIST_GRAPH_LEAK
  relationshipGraph:             'ALLOWLIST_GRAPH_LEAK',
  allowlistGraph:                'ALLOWLIST_GRAPH_LEAK',
  allowlistEntries:              'ALLOWLIST_GRAPH_LEAK',
  // Score / confidence → INTERNAL_SCORE_LEAK
  score:                         'INTERNAL_SCORE_LEAK',
  rank:                          'INTERNAL_SCORE_LEAK',
  ranking:                       'INTERNAL_SCORE_LEAK',
  confidenceScore:               'INTERNAL_SCORE_LEAK',
  aiConfidence:                  'INTERNAL_SCORE_LEAK',
  buyerScore:                    'INTERNAL_SCORE_LEAK',
  supplierScore:                 'INTERNAL_SCORE_LEAK',
  risk_score:                    'INTERNAL_SCORE_LEAK',
  riskScore:                     'INTERNAL_SCORE_LEAK',
  // DPP unpublished → UNPUBLISHED_DPP_LEAK
  unpublishedEvidence:           'UNPUBLISHED_DPP_LEAK',
  // AI draft → AI_DRAFT_LEAK
  aiExtractionDraft:             'AI_DRAFT_LEAK',
  draftExtraction:               'AI_DRAFT_LEAK',
  aiDraftData:                   'AI_DRAFT_LEAK',
  // Audit / secrets → UNKNOWN_UNSAFE_OUTPUT
  auditMetadata:                 'UNKNOWN_UNSAFE_OUTPUT',
  privateNotes:                  'UNKNOWN_UNSAFE_OUTPUT',
  secrets:                       'UNKNOWN_UNSAFE_OUTPUT',
  tokens:                        'UNKNOWN_UNSAFE_OUTPUT',
  auth:                          'UNKNOWN_UNSAFE_OUTPUT',
};

// ─── Exported Accessors ───────────────────────────────────────────────────────

/**
 * Returns the authoritative set of forbidden JSON key names.
 * Exported as a function to allow safe testing of the deny-list without
 * direct mutation of the internal constant.
 */
export function getForbiddenGuardFields(): ReadonlySet<string> {
  return FORBIDDEN_GUARD_FIELDS_SET;
}

/**
 * Returns the authoritative list of forbidden explanation text fragments.
 * Exported as a function for test inspection.
 */
export function getForbiddenExplanationFragments(): ReadonlyArray<string> {
  return FORBIDDEN_EXPLANATION_FRAGMENTS;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Recursively extract all object key names from an unknown value.
 * Traverses arrays and nested objects. Does not include array indices.
 * Guards against deep nesting with a max depth limit.
 *
 * @param obj - Value to traverse.
 * @param depth - Current recursion depth (internal use).
 * @returns Flat array of all key names found in the object graph.
 */
function getAllObjectKeys(obj: unknown, depth = 0): string[] {
  if (depth > 10) return []; // depth guard — prevents runaway traversal
  if (obj === null || obj === undefined || typeof obj !== 'object') return [];

  if (Array.isArray(obj)) {
    const result: string[] = [];
    for (const item of obj) {
      const nested = getAllObjectKeys(item, depth + 1);
      for (const k of nested) {
        result.push(k);
      }
    }
    return result;
  }

  const result: string[] = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    result.push(key);
    const nested = getAllObjectKeys(val, depth + 1);
    for (const k of nested) {
      result.push(k);
    }
  }
  return result;
}

/**
 * Scan a single candidate for forbidden JSON keys.
 * Returns violation records (field name only — never field value).
 *
 * @param candidate - Buyer-facing candidate to inspect.
 * @returns Array of violations found (may be empty).
 */
function scanCandidateFields(
  candidate: SupplierMatchCandidate,
): SupplierMatchRuntimeGuardViolation[] {
  const violations: SupplierMatchRuntimeGuardViolation[] = [];
  const allKeys = getAllObjectKeys(candidate);

  for (const key of allKeys) {
    if (FORBIDDEN_GUARD_FIELDS_SET.has(key)) {
      const violationReason: SupplierMatchRuntimeGuardViolationReason =
        FIELD_VIOLATION_MAP[key] ?? 'FORBIDDEN_FIELD_PRESENT';
      violations.push({
        supplierOrgId: candidate.supplierOrgId,
        violationReason,
        fieldName: key,
        // NOTE: the raw value of key is intentionally NOT included
      });
    }
  }
  return violations;
}

/**
 * Scan a candidate's explanation labels for forbidden text fragments.
 * Returns violation records (label position only — never label content in violation).
 *
 * @param candidate - Buyer-facing candidate whose explanation to inspect.
 * @returns Array of violations found (may be empty).
 */
function scanExplanationLabels(
  candidate: SupplierMatchCandidate,
): SupplierMatchRuntimeGuardViolation[] {
  const violations: SupplierMatchRuntimeGuardViolation[] = [];
  const { explanation, supplierOrgId } = candidate;

  if (explanation === undefined || explanation === null) {
    return violations;
  }

  // Scan primary label
  const primaryLower = explanation.primaryLabel.toLowerCase();
  for (const fragment of FORBIDDEN_EXPLANATION_FRAGMENTS) {
    if (primaryLower.includes(fragment.toLowerCase())) {
      violations.push({
        supplierOrgId,
        violationReason: 'UNSAFE_EXPLANATION',
        fieldName: 'explanation.primaryLabel',
        labelIndex: -1,
        // NOTE: the matched fragment and raw label text are intentionally NOT included
      });
      break; // one violation per label position is sufficient
    }
  }

  // Scan supporting labels
  for (let idx = 0; idx < explanation.supportingLabels.length; idx++) {
    const supportingLabel = explanation.supportingLabels[idx];
    if (supportingLabel === undefined) continue;

    const labelLower = supportingLabel.toLowerCase();
    for (const fragment of FORBIDDEN_EXPLANATION_FRAGMENTS) {
      if (labelLower.includes(fragment.toLowerCase())) {
        violations.push({
          supplierOrgId,
          violationReason: 'UNSAFE_EXPLANATION',
          fieldName: `explanation.supportingLabels[${idx}]`,
          labelIndex: idx,
          // NOTE: the matched fragment and raw label text are intentionally NOT included
        });
        break; // one violation per label position
      }
    }
  }

  return violations;
}

// ─── Guard Function ───────────────────────────────────────────────────────────

/**
 * Run the runtime guard over buyer-facing supplier match candidates.
 *
 * For each candidate:
 * 1. Scan the object graph for forbidden JSON keys.
 * 2. Scan explanation labels for forbidden text fragments.
 * If any violation is found, the candidate is blocked (excluded from sanitizedCandidates).
 * Safe candidates are returned in their original ordinal position.
 *
 * CRITICAL:
 * - NEVER THROWS. All errors result in candidate exclusion, not exceptions.
 * - Violation records NEVER contain raw field values.
 * - Empty input → { passed: true, sanitizedCandidates: [], blockedCandidateCount: 0, violations: [] }.
 *
 * @param input - Guard input with buyer org ID, candidates, and optional request ID.
 * @returns Guard result with sanitized candidates and internal violations.
 */
export function guardSupplierMatchOutput(
  input: SupplierMatchRuntimeGuardInput,
): SupplierMatchRuntimeGuardResult {
  // Empty or missing candidates → trivially passes
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    return {
      passed: true,
      sanitizedCandidates: [],
      blockedCandidateCount: 0,
      violations: [],
    };
  }

  const sanitizedCandidates: SupplierMatchCandidate[] = [];
  const allViolations: SupplierMatchRuntimeGuardViolation[] = [];

  for (const candidate of input.candidates) {
    // Defensive: skip completely invalid candidates
    if (!candidate || typeof candidate.supplierOrgId !== 'string') {
      allViolations.push({
        supplierOrgId: '<unknown>',
        violationReason: 'UNKNOWN_UNSAFE_OUTPUT',
      });
      continue;
    }

    // Run both scans
    const fieldViolations = scanCandidateFields(candidate);
    const labelViolations = scanExplanationLabels(candidate);
    const candidateViolations = [...fieldViolations, ...labelViolations];

    if (candidateViolations.length > 0) {
      // Block candidate — record violations internally, never surface to buyer
      for (const v of candidateViolations) {
        allViolations.push(v);
      }
    } else {
      // Candidate passed all guard checks
      sanitizedCandidates.push(candidate);
    }
  }

  const blockedCandidateCount = input.candidates.length - sanitizedCandidates.length;

  return {
    passed: allViolations.length === 0 && blockedCandidateCount === 0,
    sanitizedCandidates,
    blockedCandidateCount,
    violations: allViolations,
  };
}
