/**
 * supplierMatchRanker.service.ts — Deterministic Supplier Match Ranker
 *
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice C.
 *
 * Accepts policy-filtered candidates from Slice B and produces a deterministic,
 * safe-signal-only ranked result. No model calls, no embeddings, no AI inference.
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO.
 * - DETERMINISTIC: Same input always produces same output.
 * - NEVER THROWS: Malformed/empty input returns a structured fallback result.
 * - NO MODEL CALLS: modelCallMade is always the literal `false`.
 * - NO SCORE IN OUTPUT: Buyer-facing SupplierMatchCandidate contains no numeric
 *   score, rank, or confidence value (design §7). Array position is ordinal rank.
 * - TENANT ISOLATION: Candidates with cross-tenant scope are dropped silently.
 * - ANTI-LEAKAGE: price, riskScore, relationship graph, allowlist graph, audit
 *   internals, confidence score, and AI draft data are excluded from all output.
 * - SIGNAL SAFETY: Only signals with isSafe === true are scored.
 *
 * Deterministic signal score weights:
 *   RFQ_INTENT:               10  (intent match — strongest signal)
 *   MATERIAL:                  8  (textile domain primary)
 *   COMPOSITION:               8  (textile domain primary)
 *   FABRIC_TYPE:               8  (textile domain primary)
 *   CATALOG_STAGE:             7  (active catalog presence)
 *   PRODUCT_CATEGORY:          7  (category fit)
 *   CERTIFICATION:             5  (compliance fit)
 *   DPP_PUBLISHED:             5  (compliance fit)
 *   MOQ:                       4  (operational fit)
 *   SUPPLIER_CAPABILITY:       3  (supplementary)
 *   GEOGRAPHY:                 3  (geography fit)
 *   GSM:                       2  (supplementary textile spec)
 *   RELATIONSHIP_APPROVED:     2  (small boost; never overrides policy gates)
 *   PRICE_DISCLOSURE_METADATA: 0  (neutral; no scoring benefit — constitutionally 0)
 *
 * Tie-breaking order (stable):
 *   1. Higher totalScore (primary, descending)
 *   2. More distinct match categories (descending)
 *   3. supplierOrgId lexical (ascending — final stable tie-breaker)
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService       (no AI model calls in ranking layer)
 * - vectorEmbeddingClient  (no embeddings)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 *
 * @module supplierMatchRanker.service
 */

import type {
  SupplierMatchSignalType,
  SupplierMatchCategory,
  SupplierMatchCandidateDraft,
  SupplierMatchRankerInput,
  SupplierMatchRankerResult,
  SupplierMatchRankedCandidate,
  SupplierMatchScoreBreakdown,
  SupplierMatchConfidenceBucket,
  SupplierMatchCandidate,
  SupplierMatchAuditEnvelope,
  SupplierMatchResult,
} from './supplierMatch.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default maximum candidates returned when maxCandidates is not specified. */
export const DEFAULT_MAX_CANDIDATES = 5 as const;

/** Hard maximum candidates — cannot be exceeded regardless of input. */
export const MAX_CANDIDATES_CAP = 20 as const;

/** Ranker algorithm version label recorded in audit envelope. */
export const RANKER_VERSION = 'mvp-deterministic-v1' as const;

/**
 * Deterministic signal score weights for MVP ranker.
 * Values are whole numbers for exact reproducibility.
 *
 * PRICE_DISCLOSURE_METADATA is deliberately 0 — no scoring benefit.
 * RELATIONSHIP_APPROVED is intentionally small (2) — it is a tiebreaker boost
 * only and must never override policy gate decisions from Slice B.
 */
export const SIGNAL_SCORE_WEIGHTS: Readonly<Record<SupplierMatchSignalType, number>> = {
  RFQ_INTENT:               10,
  MATERIAL:                  8,
  COMPOSITION:               8,
  FABRIC_TYPE:               8,
  CATALOG_STAGE:             7,
  PRODUCT_CATEGORY:          7,
  CERTIFICATION:             5,
  DPP_PUBLISHED:             5,
  MOQ:                       4,
  SUPPLIER_CAPABILITY:       3,
  GEOGRAPHY:                 3,
  GSM:                       2,
  RELATIONSHIP_APPROVED:     2,
  PRICE_DISCLOSURE_METADATA: 0,
} as const;

/**
 * Signal type → match category mapping.
 * PRICE_DISCLOSURE_METADATA is intentionally absent — it contributes no category.
 */
const SIGNAL_CATEGORY_MAP: Readonly<Partial<Record<SupplierMatchSignalType, SupplierMatchCategory>>> = {
  MATERIAL:              'MATERIAL_FIT',
  COMPOSITION:           'MATERIAL_FIT',
  FABRIC_TYPE:           'MATERIAL_FIT',
  GSM:                   'MATERIAL_FIT',
  CATALOG_STAGE:         'CATEGORY_FIT',
  PRODUCT_CATEGORY:      'CATEGORY_FIT',
  SUPPLIER_CAPABILITY:   'CATEGORY_FIT',
  CERTIFICATION:         'COMPLIANCE_FIT',
  DPP_PUBLISHED:         'COMPLIANCE_FIT',
  RFQ_INTENT:            'RFQ_FIT',
  GEOGRAPHY:             'GEOGRAPHY_FIT',
  MOQ:                   'MOQ_FIT',
  RELATIONSHIP_APPROVED: 'RELATIONSHIP_APPROVED',
  // PRICE_DISCLOSURE_METADATA: intentionally absent — no category
} as const;

/** Score threshold for HIGH confidence bucket. */
const CONFIDENCE_HIGH_THRESHOLD = 20 as const;

/** Score threshold for MEDIUM confidence bucket. */
const CONFIDENCE_MEDIUM_THRESHOLD = 10 as const;

/**
 * Field names that must NEVER appear in ranker output (JSON keys).
 * Defense-in-depth: output types already exclude these at the type level.
 * This set provides a testable surface for anti-leakage assertions.
 */
export const FORBIDDEN_RANKER_OUTPUT_FIELDS: ReadonlySet<string> = new Set<string>([
  // Monetary / pricing (constitutionally forbidden)
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
  'grossAmount',
  'commercialTerms',
  'price_disclosure_policy_mode',
  // Policy internals
  'supplierPolicy',
  'supplierDisclosurePolicy',
  'publicationPosture',
  'blockedReason',
  'rejectedReason',
  'suspensionReason',
  // Score / confidence (must not appear in buyer-facing output)
  'score',
  'rank',
  'ranking',
  'confidenceScore',
  'aiConfidence',
  'buyerScore',
  'supplierScore',
  'risk_score',
  'riskScore',
  // Relationship / allowlist graph
  'relationshipState',
  'relationshipGraph',
  'allowlistGraph',
  'allowlistEntries',
  // Audit internals
  'auditMetadata',
  'privateNotes',
  'unpublishedEvidence',
  // AI draft data
  'aiDraftData',
  'draftExtraction',
  // Financial
  'payment',
  'credit',
  'escrow',
  // Auth
  'secrets',
  'tokens',
  'auth',
]);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if the candidate must be dropped due to cross-tenant scope.
 * Defense-in-depth — Slice B is the primary policy gate; this is belt-and-suspenders.
 */
function isCrossTenantViolation(
  candidate: SupplierMatchCandidateDraft,
  buyerOrgId: string,
): boolean {
  if (candidate.supplierOrgId === buyerOrgId) return true;
  if (candidate.sourceOrgId !== undefined && candidate.sourceOrgId !== buyerOrgId) return true;
  return false;
}

/**
 * Compute the deterministic score breakdown for a single candidate draft.
 * Only signals with isSafe === true contribute to the score.
 * PRICE_DISCLOSURE_METADATA always contributes 0.
 */
function scoreCandidateDraft(draft: SupplierMatchCandidateDraft): SupplierMatchScoreBreakdown {
  let rfqIntentScore = 0;
  let materialScore = 0;
  let categoryScore = 0;
  let certificationScore = 0;
  let moqScore = 0;
  let geographyScore = 0;
  let relationshipBoost = 0;
  const categorySet = new Set<SupplierMatchCategory>();

  for (const signal of draft.signals) {
    if (signal.isSafe !== true) continue;

    const weight = SIGNAL_SCORE_WEIGHTS[signal.signalType] ?? 0;
    const category = SIGNAL_CATEGORY_MAP[signal.signalType];

    if (category !== undefined) {
      categorySet.add(category);
    }

    switch (signal.signalType) {
      case 'RFQ_INTENT':
        rfqIntentScore += weight;
        break;
      case 'MATERIAL':
      case 'COMPOSITION':
      case 'FABRIC_TYPE':
      case 'GSM':
        materialScore += weight;
        break;
      case 'CATALOG_STAGE':
      case 'PRODUCT_CATEGORY':
      case 'SUPPLIER_CAPABILITY':
        categoryScore += weight;
        break;
      case 'CERTIFICATION':
      case 'DPP_PUBLISHED':
        certificationScore += weight;
        break;
      case 'MOQ':
        moqScore += weight;
        break;
      case 'GEOGRAPHY':
        geographyScore += weight;
        break;
      case 'RELATIONSHIP_APPROVED':
        relationshipBoost += weight;
        break;
      case 'PRICE_DISCLOSURE_METADATA':
        // Constitutionally 0 — no scoring benefit; weight is already 0
        break;
      default:
        // Unknown signal type — skip safely (future-proof)
        break;
    }
  }

  const totalScore =
    rfqIntentScore +
    materialScore +
    categoryScore +
    certificationScore +
    moqScore +
    geographyScore +
    relationshipBoost;

  return {
    rfqIntentScore,
    materialScore,
    categoryScore,
    certificationScore,
    moqScore,
    geographyScore,
    relationshipBoost,
    totalScore,
    signalCategoryCount: categorySet.size,
  };
}

/**
 * Classify a total score into an ordinal confidence bucket (internal only).
 */
function toConfidenceBucket(totalScore: number): SupplierMatchConfidenceBucket {
  if (totalScore >= CONFIDENCE_HIGH_THRESHOLD) return 'HIGH';
  if (totalScore >= CONFIDENCE_MEDIUM_THRESHOLD) return 'MEDIUM';
  return 'LOW';
}

/**
 * Derive distinct sorted match categories from a candidate draft.
 * Only safe signals (isSafe === true) contribute categories.
 */
function deriveMatchCategories(draft: SupplierMatchCandidateDraft): SupplierMatchCategory[] {
  const categorySet = new Set<SupplierMatchCategory>();
  for (const signal of draft.signals) {
    if (signal.isSafe !== true) continue;
    const category = SIGNAL_CATEGORY_MAP[signal.signalType];
    if (category !== undefined) categorySet.add(category);
  }
  return Array.from(categorySet).sort() as SupplierMatchCategory[];
}

/**
 * Derive the relationship CTA hint for a buyer-facing candidate.
 * Only APPROVED relationship state produces 'REQUEST_QUOTE'.
 * Other known states produce 'REQUEST_ACCESS'.
 * Absent state produces 'VIEW_PROFILE'.
 *
 * MUST NOT use hidden/blocked relationship states in the CTA derivation.
 */
function deriveRelationshipCta(
  draft: SupplierMatchCandidateDraft,
): SupplierMatchCandidate['relationshipCta'] {
  const state = draft.relationshipState;
  if (state === 'APPROVED') return 'REQUEST_QUOTE';
  if (state !== undefined) return 'REQUEST_ACCESS';
  return 'VIEW_PROFILE';
}

/**
 * Project a ranked candidate to the buyer-facing SupplierMatchCandidate.
 * Strips all internal score, rank, confidence, and policy-internal fields.
 */
function toSupplierMatchCandidate(rc: SupplierMatchRankedCandidate): SupplierMatchCandidate {
  return {
    supplierOrgId: rc.draft.supplierOrgId,
    matchCategories: rc.matchCategories,
    relationshipCta: deriveRelationshipCta(rc.draft),
    // explanation: not populated in Slice C — Slice D responsibility
    // supplierDisplayName: not present in SupplierMatchCandidateDraft — Slice D/G
  };
}

/**
 * Stable comparison function for ranked candidates.
 *
 * Tie-breaking order:
 * 1. Higher totalScore (descending)
 * 2. More distinct signal categories (descending)
 * 3. supplierOrgId lexical order (ascending — final stable tie-breaker)
 */
function compareRankedCandidates(a: SupplierMatchRankedCandidate, b: SupplierMatchRankedCandidate): number {
  const scoreDiff = b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore;
  if (scoreDiff !== 0) return scoreDiff;
  const categoryDiff = b.scoreBreakdown.signalCategoryCount - a.scoreBreakdown.signalCategoryCount;
  if (categoryDiff !== 0) return categoryDiff;
  return a.draft.supplierOrgId.localeCompare(b.draft.supplierOrgId);
}

/**
 * Build the safe audit envelope from ranker inputs and results.
 * Records safe signal summary only — no raw forbidden data.
 */
function buildAuditEnvelope(
  buyerOrgId: string,
  requestId: string | undefined,
  requestedAt: string,
  rankedCandidates: SupplierMatchRankedCandidate[],
  policyViolationsBlocked: number,
  fallbackUsed: boolean,
): SupplierMatchAuditEnvelope {
  const signalTypeCounts: Partial<Record<SupplierMatchSignalType, number>> = {};
  let totalSignalsConsidered = 0;

  for (const rc of rankedCandidates) {
    for (const signal of rc.draft.signals) {
      if (signal.isSafe !== true) continue;
      const existing = signalTypeCounts[signal.signalType] ?? 0;
      signalTypeCounts[signal.signalType] = existing + 1;
      totalSignalsConsidered += 1;
    }
  }

  return {
    buyerOrgId,
    requestId,
    requestedAt,
    candidateCount: rankedCandidates.length,
    policyViolationsBlocked,
    signalTypeCounts,
    totalSignalsConsidered,
    modelCallMade: false,
    fallbackUsed,
    rankerVersion: RANKER_VERSION,
  };
}

/** Returns a structured empty ranker result for fallback scenarios. */
function makeFallbackResult(
  buyerOrgId: string,
  requestId: string | undefined,
  requestedAt: string,
  policyViolationsBlocked: number,
): SupplierMatchRankerResult {
  const auditEnvelope = buildAuditEnvelope(
    buyerOrgId,
    requestId,
    requestedAt,
    [],
    policyViolationsBlocked,
    true,
  );
  const result: SupplierMatchResult = {
    buyerOrgId,
    requestId,
    candidates: [],
    fallback: true,
    modelCallMade: false,
    auditEnvelope,
    humanConfirmationRequired: true,
  };
  return { result, rankedCandidates: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply the deterministic supplier match ranker to policy-filtered candidates.
 *
 * Returns SupplierMatchRankerResult containing:
 * - result:            buyer-facing SupplierMatchResult (no score/rank/confidence)
 * - rankedCandidates:  INTERNAL ONLY — score breakdowns for testing/audit
 *
 * NEVER THROWS. Returns a fallback result for empty/invalid input.
 * modelCallMade is always false — no AI inference in this slice.
 */
export function rankSupplierCandidates(input: SupplierMatchRankerInput): SupplierMatchRankerResult {
  const requestedAt =
    input.requestedAt instanceof Date
      ? input.requestedAt.toISOString()
      : typeof input.requestedAt === 'string'
      ? input.requestedAt
      : new Date().toISOString();

  const policyViolationsBlocked = input.policyViolationsBlocked ?? 0;

  // ─ Gate 0: Missing buyer context ──────────────────────────────────────────
  if (!input.buyerOrgId || typeof input.buyerOrgId !== 'string') {
    return makeFallbackResult('', input.requestId, requestedAt, policyViolationsBlocked);
  }

  // ─ Resolve maxCandidates ──────────────────────────────────────────────────
  const rawMax = input.maxCandidates;
  const effectiveMax =
    rawMax === undefined || rawMax === null
      ? DEFAULT_MAX_CANDIDATES
      : rawMax <= 0
      ? DEFAULT_MAX_CANDIDATES
      : rawMax > MAX_CANDIDATES_CAP
      ? MAX_CANDIDATES_CAP
      : rawMax;

  // ─ Empty candidates fallback ──────────────────────────────────────────────
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    return makeFallbackResult(input.buyerOrgId, input.requestId, requestedAt, policyViolationsBlocked);
  }

  // ─ Score, deduplicate, and filter candidates ──────────────────────────────
  const seenOrgIds = new Set<string>();
  const scoredCandidates: SupplierMatchRankedCandidate[] = [];

  for (const candidate of input.candidates) {
    // Drop candidates with missing supplierOrgId (defense-in-depth)
    if (!candidate.supplierOrgId || typeof candidate.supplierOrgId !== 'string') continue;
    // Drop cross-tenant candidates silently (defense-in-depth; Slice B is primary gate)
    if (isCrossTenantViolation(candidate, input.buyerOrgId)) continue;
    // Deduplication: first occurrence wins (consistent with Slice B contract)
    if (seenOrgIds.has(candidate.supplierOrgId)) continue;
    seenOrgIds.add(candidate.supplierOrgId);

    const scoreBreakdown = scoreCandidateDraft(candidate);
    const matchCategories = deriveMatchCategories(candidate);
    const confidenceBucket = toConfidenceBucket(scoreBreakdown.totalScore);

    scoredCandidates.push({ draft: candidate, scoreBreakdown, matchCategories, confidenceBucket });
  }

  // ─ Sort deterministically ─────────────────────────────────────────────────
  scoredCandidates.sort(compareRankedCandidates);

  // ─ Truncate to maxCandidates ──────────────────────────────────────────────
  const topCandidates = scoredCandidates.slice(0, effectiveMax);

  // ─ Project to buyer-facing candidates ────────────────────────────────────
  const buyerCandidates: SupplierMatchCandidate[] = topCandidates.map(toSupplierMatchCandidate);

  // ─ Fallback check ─────────────────────────────────────────────────────────
  const fallbackUsed = buyerCandidates.length === 0;

  // ─ Assemble audit envelope ────────────────────────────────────────────────
  const auditEnvelope = buildAuditEnvelope(
    input.buyerOrgId,
    input.requestId,
    requestedAt,
    topCandidates,
    policyViolationsBlocked,
    fallbackUsed,
  );

  return {
    result: {
      buyerOrgId: input.buyerOrgId,
      requestId: input.requestId,
      candidates: buyerCandidates,
      fallback: fallbackUsed,
      modelCallMade: false,
      auditEnvelope,
      humanConfirmationRequired: true,
    },
    rankedCandidates: topCandidates,
  };
}

/**
 * Returns the set of field names that must never appear in ranker output.
 * Exported for test use — allows anti-leakage assertions without duplication.
 */
export function getForbiddenRankerOutputFields(): ReadonlySet<string> {
  return FORBIDDEN_RANKER_OUTPUT_FIELDS;
}
