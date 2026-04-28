/**
 * supplierMatch.types.ts — Supplier Matching Contract Types
 *
 * Canonical TypeScript contract types for the AI Supplier Matching system.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 §15 (type contracts) — Slice A.
 *
 * RULES:
 * - Pure types — no IO, no DB calls, no provider calls, no logic.
 * - isSafe: true on every SupplierMatchSignal guarantees only builder-approved signals exist.
 * - buyerOrgId MUST always originate from JWT-trusted server context (never request body).
 * - price, publicationPosture, risk_score, audit metadata, and relationship graph are
 *   constitutionally excluded from every type defined here.
 * - Future-facing stub types (SupplierMatchCandidate, etc.) are stubs only; no field
 *   is authoritative until the implementing slice gates it.
 *
 * @module supplierMatch.types
 */

import type {
  RelationshipState,
  CatalogVisibilityPolicy,
  RelationshipPricePolicy,
  RfqAcceptanceMode,
} from '../../relationshipAccess.types.js';

// ─── Signal Type ──────────────────────────────────────────────────────────────

/**
 * Discriminator for each safe matching signal.
 * Mirrors the 14 permitted signal types from design §5.
 */
export type SupplierMatchSignalType =
  | 'CATALOG_STAGE'
  | 'PRODUCT_CATEGORY'
  | 'MATERIAL'
  | 'FABRIC_TYPE'
  | 'COMPOSITION'
  | 'GSM'
  | 'CERTIFICATION'
  | 'GEOGRAPHY'
  | 'MOQ'
  | 'RFQ_INTENT'
  | 'RELATIONSHIP_APPROVED'
  | 'SUPPLIER_CAPABILITY'
  | 'DPP_PUBLISHED'
  | 'PRICE_DISCLOSURE_METADATA';

// ─── Source Entity ────────────────────────────────────────────────────────────

/**
 * Trusted server-side entity from which a signal originates.
 * Mirrors §5 source column.
 */
export type SupplierMatchSourceEntity =
  | 'CATALOG_ITEM'
  | 'RFQ'
  | 'ORG_PROFILE'
  | 'DPP_PUBLISHED'
  | 'RELATIONSHIP_ACCESS'
  | 'PRICE_DISCLOSURE';

// ─── Match Category ───────────────────────────────────────────────────────────

/**
 * High-level match category for grouping and explaining signals.
 * Used by downstream ranker and explainability layers (Slices C+).
 */
export type SupplierMatchCategory =
  | 'MATERIAL_FIT'
  | 'CATEGORY_FIT'
  | 'COMPLIANCE_FIT'
  | 'RFQ_FIT'
  | 'GEOGRAPHY_FIT'
  | 'MOQ_FIT'
  | 'RELATIONSHIP_APPROVED';

// ─── Core Signal ──────────────────────────────────────────────────────────────

/**
 * A single, constitutionally safe matching signal emitted by SupplierMatchSignalBuilder.
 *
 * Invariant: isSafe is always the literal `true`.
 * The builder never emits a signal with isSafe = false.
 * Consumers may assert `signal.isSafe === true` at boundaries.
 *
 * Fields intentionally absent:
 * - price / amount / any monetary value — constitutionally forbidden from all AI paths
 * - publicationPosture — constitutionally forbidden from all AI paths
 * - risk_score — control-plane only; tenant AI hard boundary
 * - confidence / score / ranking score — no numeric AI score is exposed (design §7)
 * - audit metadata, private notes, relationship graph — internal only
 */
export interface SupplierMatchSignal {
  /** Signal discriminator — 14-value union. */
  signalType: SupplierMatchSignalType;
  /** Normalized, length-bounded text value (trimmed, max SIGNAL_VALUE_MAX_LENGTH chars). */
  value: string;
  /** Trusted server-side source entity. */
  sourceEntity: SupplierMatchSourceEntity;
  /**
   * Opaque reference ID to the source record.
   * Safe server-side identifier only — never exposes price, policy, or audit state.
   */
  sourceId?: string;
  /**
   * Constitutional safety brand — always `true`.
   * The builder strips all forbidden fields before emitting any signal.
   */
  isSafe: true;
}

// ─── Buyer Request ────────────────────────────────────────────────────────────

/**
 * Caller-provided matching parameters.
 *
 * CRITICAL: buyerOrgId MUST be sourced from the authenticated JWT / dbContext
 * by the calling route handler. It MUST NEVER be populated from the HTTP request body.
 */
export interface BuyerSupplierMatchRequest {
  /** JWT-derived buyer org ID — never from request body. */
  buyerOrgId: string;
  /** Optional catalog stage filter (CatalogStage enum value). */
  catalogStage?: string;
  /** Optional product category filter. */
  productCategory?: string;
  /** Optional material preference. */
  material?: string;
  /** Optional RFQ ID for context enrichment (must be buyer-owned). */
  rfqId?: string;
  /** Optional geography / jurisdiction preference. */
  geographyPreference?: string;
  /** Optional minimum order quantity requirement. */
  moqRequirement?: number;
  /** Maximum candidates to return (default: 10, max: 50). */
  maxCandidates?: number;
}

// ─── Policy Context ───────────────────────────────────────────────────────────

/**
 * Internal server-side policy context assembled before signal building.
 * NEVER exposed to buyers or serialized to API responses.
 *
 * relationshipStateBySupplierOrgId — server-resolved relationship states (never client-supplied).
 * hiddenCatalogOrgIds — supplier orgs whose catalogs are hidden from this buyer.
 * forbiddenSupplierOrgIds — BLOCKED + SUSPENDED + REJECTED: hard-excluded silently (design §8).
 * activeCatalogStages — CatalogStage values currently in scope for this context.
 */
export interface SupplierMatchPolicyContext {
  /** JWT-derived buyer org ID. */
  buyerOrgId: string;
  /**
   * Map from supplier org ID to server-resolved relationship state.
   * Sourced from relationship_access table; never from request body.
   */
  relationshipStateBySupplierOrgId: Record<string, RelationshipState>;
  /** Supplier orgs with hidden catalog policies — excluded from results. */
  hiddenCatalogOrgIds: ReadonlySet<string>;
  /**
   * Supplier orgs that must be hard-excluded: BLOCKED, SUSPENDED, REJECTED.
   * Exclusion is silent — no hint exposed to buyer (design §8).
   */
  forbiddenSupplierOrgIds: ReadonlySet<string>;
  /** CatalogStage values currently in scope for this matching context. */
  activeCatalogStages: ReadonlySet<string>;
}

// ─── Slice B — Policy Filter Types ───────────────────────────────────────────

/**
 * Visibility and policy context for a single supplier candidate.
 * Assembled server-side from trusted Prisma query results.
 * NEVER sourced from the HTTP request body.
 *
 * catalogVisibility — canonical CatalogVisibilityPolicy (design §8).
 * pricePolicy       — price disclosure policy; affects price signal eligibility,
 *                     NOT catalog access eligibility.
 * rfqAcceptanceMode — RFQ gate policy (design §10).
 * dppPublished      — server-validated DPP publication state. `true` only if
 *                     the DPP record is in published state.
 */
export interface SupplierMatchVisibilityContext {
  catalogVisibility: CatalogVisibilityPolicy;
  pricePolicy?: RelationshipPricePolicy;
  rfqAcceptanceMode?: RfqAcceptanceMode;
  /**
   * True only if the supplier has a DPP record confirmed in published state.
   * DPP_PUBLISHED signals are suppressed when this is not true.
   */
  dppPublished?: boolean;
}

/**
 * A single supplier candidate submitted to the policy filter.
 * Internal type — NOT buyer-facing until it passes policy filtering AND
 * the ranking layer (Slice C) produces a SupplierMatchCandidate.
 *
 * supplierOrgId — required primary identifier (never === buyerOrgId).
 * signals       — safe signals from Slice A builder; all must have isSafe: true.
 * visibility    — trusted server-side visibility/policy context.
 * relationshipState — server-resolved relationship state (never from request body).
 * sourceOrgId   — optional tenancy scope. If provided, MUST equal buyerOrgId.
 */
export interface SupplierMatchCandidateDraft {
  supplierOrgId: string;
  candidateId?: string;
  signals: SupplierMatchSignal[];
  visibility: SupplierMatchVisibilityContext;
  /** Server-resolved relationship state. Optional when no relationship exists. */
  relationshipState?: RelationshipState;
  /**
   * Tenancy scope marker. If provided, must exactly equal buyerOrgId.
   * Mismatch → CROSS_TENANT_SCOPE block.
   */
  sourceOrgId?: string;
}

/**
 * Internal blocked-reason union for policy filter violations.
 * MUST NOT be exposed to buyers or included in public API responses.
 *
 * Values are:
 * - CROSS_TENANT_SCOPE          sourceOrgId mismatch or supplier === buyer
 * - SUPPLIER_FORBIDDEN          in forbiddenSupplierOrgIds (BLOCKED/SUSPENDED/REJECTED set)
 * - RELATIONSHIP_BLOCKED        candidate.relationshipState === 'BLOCKED'
 * - RELATIONSHIP_SUSPENDED      candidate.relationshipState === 'SUSPENDED'
 * - RELATIONSHIP_REJECTED       candidate.relationshipState === 'REJECTED'
 * - RELATIONSHIP_REQUIRED       catalogVisibility === 'APPROVED_BUYER_ONLY' without APPROVED
 * - HIDDEN_CATALOG              catalogVisibility === 'HIDDEN' or 'REGION_CHANNEL_SENSITIVE'
 * - HIDDEN_PRICE                (reserved for future use; raw price in output path)
 * - DPP_UNPUBLISHED             DPP_PUBLISHED signal when dppPublished !== true
 * - RFQ_NOT_ALLOWED             rfqAcceptanceMode = 'APPROVED_BUYERS_ONLY' without APPROVED
 * - UNSAFE_SIGNAL               signal.isSafe !== true (not emitted by Slice A builder)
 * - MISSING_SUPPLIER_CONTEXT    no supplierOrgId on candidate
 * - MISSING_BUYER_CONTEXT       no buyerOrgId on filter input
 */
export type SupplierMatchBlockedReason =
  | 'CROSS_TENANT_SCOPE'
  | 'SUPPLIER_FORBIDDEN'
  | 'RELATIONSHIP_BLOCKED'
  | 'RELATIONSHIP_SUSPENDED'
  | 'RELATIONSHIP_REJECTED'
  | 'RELATIONSHIP_REQUIRED'
  | 'HIDDEN_CATALOG'
  | 'HIDDEN_PRICE'
  | 'DPP_UNPUBLISHED'
  | 'RFQ_NOT_ALLOWED'
  | 'UNSAFE_SIGNAL'
  | 'MISSING_SUPPLIER_CONTEXT'
  | 'MISSING_BUYER_CONTEXT';

/** Internal policy gate decision. */
export type SupplierMatchPolicyDecision = 'ALLOW' | 'BLOCK';

/**
 * Internal policy violation record for a blocked candidate.
 * Stored in SupplierMatchPolicyFilterResult.blocked for internal audit / testing.
 * MUST NOT be exposed to buyers in any API response.
 */
export interface SupplierMatchPolicyViolation {
  /** Supplier org ID of the blocked candidate. */
  supplierOrgId: string;
  /** Optional stable candidate reference (for internal audit). */
  candidateId?: string;
  /** Internal block reason — NEVER buyer-facing. */
  blockedReason: SupplierMatchBlockedReason;
}

/**
 * Input to the SupplierMatchPolicyFilter.
 *
 * All fields must be assembled server-side from trusted sources.
 * No field may be sourced from the raw HTTP request body without explicit
 * server-side validation and field selection.
 */
export interface SupplierMatchPolicyFilterInput {
  /** JWT-derived buyer org ID. Never from request body. */
  buyerOrgId: string;
  /** Raw candidate pool before policy filtering. */
  candidates: SupplierMatchCandidateDraft[];
  /**
   * Optional server-side policy context for bulk enforcement.
   * forbiddenSupplierOrgIds — suppliers that must be hard-excluded (BLOCKED/SUSPENDED/REJECTED).
   * isRfqContextual — true when the matching request originated from an RFQ flow.
   */
  policyContext?: {
    forbiddenSupplierOrgIds?: ReadonlySet<string>;
    isRfqContextual?: boolean;
  };
}

/**
 * Output of the SupplierMatchPolicyFilter.
 *
 * safeCandidates — candidates that passed all policy gates (internal type; NOT buyer-facing yet).
 * blocked        — internal violation records for blocked candidates.
 * policyViolationsBlocked — count of blocked candidates.
 * fallback       — true when no safe candidates remain or input was empty.
 *
 * IMPORTANT: safeCandidates is an INTERNAL type. It MUST NOT be serialized
 * directly into an API response. The ranking layer (Slice C) and guard layer
 * (Slice D/F) must produce the buyer-facing SupplierMatchCandidate type.
 */
export interface SupplierMatchPolicyFilterResult {
  /** JWT-derived buyer org ID (echoed for traceability). */
  buyerOrgId: string;
  /** Candidates that passed all policy gates. INTERNAL — not buyer-facing. */
  safeCandidates: SupplierMatchCandidateDraft[];
  /** Internal violation log. MUST NOT be exposed to buyers. */
  blocked: SupplierMatchPolicyViolation[];
  /** Count of candidates blocked by policy gates. */
  policyViolationsBlocked: number;
  /**
   * True when no safe candidates remain or input pool was empty.
   * Downstream must handle this as a structured empty result, not an error.
   */
  fallback: boolean;
}

// ─── Slice C — Ranker Types ───────────────────────────────────────────────────

/**
 * Human-readable explanation for a match result.
 * Slice D — explainability layer. Stub only; no implementation authorized yet.
 */
export interface SupplierMatchExplanation {
  /** Primary label shown to buyer (e.g., "Material fit: Organic Cotton"). */
  primaryLabel: string;
  /** Supporting labels for the transparency surface. */
  supportingLabels: string[];
}

/**
 * Internal confidence bucket for ranked candidates.
 * Ordinal grouping only — no numeric confidence is exposed to buyers.
 * Used internally by the ranker; NEVER buyer-visible.
 *
 * HIGH:   totalScore >= 20
 * MEDIUM: totalScore >= 10
 * LOW:    totalScore <  10
 */
export type SupplierMatchConfidenceBucket = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Internal deterministic score breakdown for a single ranked candidate.
 * INTERNAL ONLY — MUST NOT be serialized into any API response or buyer-facing type.
 *
 * All values are deterministic integer scores derived from safe signal weights.
 * No model confidence, no embeddings, no AI provider values.
 *
 * Fields intentionally absent: price, riskScore, confidence, rank.
 */
export interface SupplierMatchScoreBreakdown {
  /** Sum of RFQ_INTENT signal weights. */
  rfqIntentScore: number;
  /** Sum of MATERIAL + COMPOSITION + FABRIC_TYPE + GSM signal weights. */
  materialScore: number;
  /** Sum of CATALOG_STAGE + PRODUCT_CATEGORY + SUPPLIER_CAPABILITY signal weights. */
  categoryScore: number;
  /** Sum of CERTIFICATION + DPP_PUBLISHED signal weights. */
  certificationScore: number;
  /** Sum of MOQ signal weights. */
  moqScore: number;
  /** Sum of GEOGRAPHY signal weights. */
  geographyScore: number;
  /** Sum of RELATIONSHIP_APPROVED signal weights (small boost; never overrides gates). */
  relationshipBoost: number;
  /** Total deterministic score (sum of all sub-scores). INTERNAL ONLY. */
  totalScore: number;
  /** Count of distinct match categories present in this candidate. */
  signalCategoryCount: number;
}

/**
 * An internally ranked candidate, produced by the scoring pass of the ranker.
 * INTERNAL ONLY — the buyer-facing type is SupplierMatchCandidate (below).
 *
 * Contains internal score breakdown and confidence bucket. These MUST NEVER
 * be exposed to buyers — the projection to SupplierMatchCandidate strips them.
 */
export interface SupplierMatchRankedCandidate {
  /** Originating policy-filtered draft candidate. */
  draft: SupplierMatchCandidateDraft;
  /** Internal score breakdown — NEVER buyer-facing. */
  scoreBreakdown: SupplierMatchScoreBreakdown;
  /** Distinct match categories derived from safe signals (sorted for determinism). */
  matchCategories: SupplierMatchCategory[];
  /** Internal confidence bucket — NEVER buyer-facing. */
  confidenceBucket: SupplierMatchConfidenceBucket;
}

/**
 * Input to the SupplierMatchRanker.
 *
 * Candidates MUST already have passed the Slice B policy filter.
 * The ranker provides defense-in-depth cross-tenant checks but is NOT
 * the primary policy gate.
 */
export interface SupplierMatchRankerInput {
  /** JWT-derived buyer org ID. Never from request body. */
  buyerOrgId: string;
  /** Optional stable request reference for audit correlation. */
  requestId?: string;
  /** Policy-filtered candidates from Slice B. Must be safe candidates only. */
  candidates: SupplierMatchCandidateDraft[];
  /**
   * Maximum candidates to return.
   * Default: 5. Hard cap: 20.
   * Values <= 0 are clamped to DEFAULT_MAX_CANDIDATES (5).
   * Values > 20 are clamped to 20.
   */
  maxCandidates?: number;
  /** Count of candidates blocked by policy filter upstream (for audit envelope). */
  policyViolationsBlocked?: number;
  /** Caller-supplied request timestamp (ISO string or Date). Defaults to now. */
  requestedAt?: Date | string;
}

/**
 * Audit envelope for a ranker invocation.
 * Records safe signal summary and operational metadata only.
 *
 * MUST NOT include:
 * - Raw buyer query text or private RFQ notes
 * - Supplier score or rank
 * - Hidden price or blocked-reason details
 * - Relationship graph or allowlist entries
 * - Unpublished DPP / AI draft data
 * - Payment, credit, or escrow data
 *
 * modelCallMade is always the literal `false` — Slice C is deterministic only.
 */
export interface SupplierMatchAuditEnvelope {
  /** JWT-derived buyer org ID (scoped). */
  buyerOrgId: string;
  /** Stable request reference for correlation. */
  requestId?: string;
  /** UTC ISO timestamp of the ranking invocation. */
  requestedAt: string;
  /** Count of candidates returned in the buyer-facing result. */
  candidateCount: number;
  /** Count of candidates blocked upstream by the policy filter. */
  policyViolationsBlocked: number;
  /**
   * Count of signals considered per signal type (safe labels only).
   * Partial Record — only present signal types are included.
   */
  signalTypeCounts: Partial<Record<SupplierMatchSignalType, number>>;
  /** Total signals considered across all ranked candidates. */
  totalSignalsConsidered: number;
  /** Always false in Slice C — no model calls. */
  modelCallMade: false;
  /** True when result is empty (no safe candidates after ranking). */
  fallbackUsed: boolean;
  /** Internal ranker algorithm version label for debugging. */
  rankerVersion: string;
}

/**
 * A single buyer-facing ranked supplier candidate.
 * Produced by projecting SupplierMatchRankedCandidate, stripping all internal
 * score/rank/confidence fields.
 *
 * MUST NOT include (design §7):
 * - numeric score, rank, or confidence value
 * - relationshipState
 * - allowlist graph or hidden price
 * - internal score breakdown or confidenceBucket
 * - audit metadata or policy internals
 *
 * Array position in SupplierMatchResult.candidates implies ordinal order.
 */
export interface SupplierMatchCandidate {
  /** Supplier org ID (opaque; scoped to matching context). */
  supplierOrgId: string;
  /** Optional supplier display label, safe for buyer surface if present. */
  supplierDisplayName?: string;
  /**
   * High-level match category labels derived from safe signal types.
   * Suitable for UI grouping and Slice D explanation surface.
   */
  matchCategories: SupplierMatchCategory[];
  /**
   * Explanation stub (Slice D). Populated by SupplierMatchExplanationBuilder.
   * Optional — Slice C does not populate this field.
   */
  explanation?: SupplierMatchExplanation;
  /**
   * CTA hint for the buyer UI.
   * 'REQUEST_QUOTE'  — relationship is APPROVED; quote CTA is appropriate.
   * 'REQUEST_ACCESS' — no or pending relationship; access request CTA.
   * 'VIEW_PROFILE'   — no relationship context; view profile CTA.
   *
   * MUST NOT be derived from hidden/blocked relationship state.
   */
  relationshipCta?: 'REQUEST_ACCESS' | 'REQUEST_QUOTE' | 'VIEW_PROFILE';
  // ─── CONSTITUTIONALLY EXCLUDED FIELDS ────────────────────────────────────
  // score           — design §7: no numeric AI score exposed
  // rank            — design §7: ordinal position implicit in array order
  // confidence      — design §7: no numeric confidence exposed
  // confidenceBucket — INTERNAL ONLY
  // relationshipState — INTERNAL ONLY
  // price, amount   — constitutionally forbidden from all AI paths
  // scoreBreakdown  — INTERNAL ONLY
  // blockedReason   — INTERNAL ONLY
}

/**
 * Final matching result produced by the ranker for the buyer surface.
 * Candidates are ordered by deterministic score (descending); array position
 * implies ordinal rank — no numeric rank field is present.
 *
 * modelCallMade is always the literal `false` — Slice C is deterministic only.
 * humanConfirmationRequired is always the literal `true` — design §7 constraint.
 */
export interface SupplierMatchResult {
  /** JWT-derived buyer org ID (echoed for audit). */
  buyerOrgId: string;
  /** Stable request reference for correlation. */
  requestId?: string;
  /**
   * Ordered supplier candidates. Position 0 is the highest-ranked candidate.
   * Array length <= maxCandidates (capped at 20).
   * Empty array when fallback = true.
   */
  candidates: SupplierMatchCandidate[];
  /**
   * True when no safe candidates remain or input was empty.
   * Downstream must handle this as a structured empty result, not an error.
   */
  fallback: boolean;
  /** Always false — Slice C is deterministic, no model calls. */
  modelCallMade: false;
  /** Audit envelope for internal monitoring. MUST NOT be exposed to buyers. */
  auditEnvelope: SupplierMatchAuditEnvelope;
  /** Always true — human review required before actioning results (design §7). */
  humanConfirmationRequired: true;
}

/**
 * Full ranker output combining buyer-facing result with internal ranked candidates.
 * rankedCandidates is INTERNAL ONLY — for test use and audit pipelines.
 * It MUST NOT be serialized into any API response.
 */
export interface SupplierMatchRankerResult {
  /** Buyer-facing result. Safe for surface presentation after guard checks. */
  result: SupplierMatchResult;
  /**
   * Internal ranked candidates with score breakdowns.
   * INTERNAL ONLY — MUST NOT be exposed to buyers.
   */
  rankedCandidates: SupplierMatchRankedCandidate[];
}

// ─── Slice D — Explanation Builder & Runtime Guard Types ─────────────────────

/**
 * Safe human-readable label for a supplier match explanation.
 * Deterministically derived from match categories only.
 *
 * Constitutional constraints:
 * - NEVER contains relationship state (APPROVED, BLOCKED, REJECTED, SUSPENDED).
 * - NEVER contains numeric score, rank, or confidence value.
 * - NEVER contains raw policy, price, or allowlist data.
 * - All values are allowlist-derived from CATEGORY_LABEL_MAP in the explanation builder.
 */
export type SupplierMatchExplanationLabel =
  | 'Matches requested material'
  | 'Matches catalog category'
  | 'Published certification match'
  | 'Matches RFQ requirement'
  | 'Geography fit'
  | 'MOQ compatible'
  | 'Connected supplier'
  | 'Published DPP match'
  | 'Potential supplier match'; // safe generic fallback

/**
 * Input to the SupplierMatchExplanationBuilder.
 * Must contain only already-safe, policy-filtered, ranked data.
 * No raw request body fields may be passed here.
 */
export interface SupplierMatchExplanationBuilderInput {
  /** JWT-derived buyer org ID — never from request body. */
  buyerOrgId: string;
  /**
   * Distinct match categories derived from safe signals (from SupplierMatchRankedCandidate).
   * Empty array → falls back to generic safe explanation.
   */
  matchCategories: SupplierMatchCategory[];
}

/**
 * Output of the SupplierMatchExplanationBuilder.
 * The explanation contains only label-map-derived text; no raw model output.
 */
export interface SupplierMatchExplanationBuilderResult {
  /** Buyer-safe explanation with primary and supporting labels. */
  explanation: SupplierMatchExplanation;
}

/**
 * Discriminator for runtime guard violation reasons.
 * Used by SupplierMatchRuntimeGuard to classify detected violations.
 * INTERNAL ONLY — must not be exposed to buyers.
 */
export type SupplierMatchRuntimeGuardViolationReason =
  | 'FORBIDDEN_FIELD_PRESENT'    // Generic forbidden JSON key
  | 'FORBIDDEN_TEXT_PRESENT'     // Generic forbidden text fragment
  | 'RELATIONSHIP_STATE_LEAK'    // relationshipState, blockedReason, publicationPosture, etc.
  | 'ALLOWLIST_GRAPH_LEAK'       // allowlistGraph, relationshipGraph
  | 'HIDDEN_PRICE_LEAK'          // price, amount, margin, commercialTerms, payment, etc.
  | 'INTERNAL_SCORE_LEAK'        // score, rank, confidence, riskScore, etc.
  | 'UNPUBLISHED_DPP_LEAK'       // unpublishedEvidence
  | 'AI_DRAFT_LEAK'              // aiExtractionDraft, draftExtraction, aiDraftData
  | 'CROSS_TENANT_LEAK'          // cross-tenant candidate detected
  | 'UNSAFE_EXPLANATION'         // forbidden text in explanation label
  | 'UNKNOWN_UNSAFE_OUTPUT';     // catch-all for unclassified unsafe output

/**
 * A single violation recorded by the SupplierMatchRuntimeGuard.
 *
 * CRITICAL: raw hidden field values are NEVER included in violation records.
 * fieldName records the key that triggered the violation — NOT its value.
 * labelIndex records the supportingLabels position if applicable.
 */
export interface SupplierMatchRuntimeGuardViolation {
  /** Supplier org ID of the blocked candidate (opaque; safe for internal audit). */
  supplierOrgId: string;
  /** Classification of the violation type. */
  violationReason: SupplierMatchRuntimeGuardViolationReason;
  /**
   * Name of the offending JSON key (NOT its value).
   * Raw field values are constitutionally forbidden from violation records.
   */
  fieldName?: string;
  /**
   * Position in explanation.supportingLabels (0-based) if the violation was in a
   * supporting label. -1 indicates a primaryLabel violation.
   */
  labelIndex?: number;
}

/**
 * Input to the SupplierMatchRuntimeGuard.
 * Candidates should be buyer-facing SupplierMatchCandidate instances
 * produced by the ranking layer (Slice C).
 */
export interface SupplierMatchRuntimeGuardInput {
  /** JWT-derived buyer org ID — never from request body. */
  buyerOrgId: string;
  /** Buyer-facing ranked candidates to validate and sanitize. */
  candidates: SupplierMatchCandidate[];
  /** Optional stable request reference for audit correlation. */
  requestId?: string;
}

/**
 * Output of the SupplierMatchRuntimeGuard.
 *
 * passed — true when ALL candidates pass and there are no violations (including empty input).
 * sanitizedCandidates — candidates that survived the guard, in original order.
 * blockedCandidateCount — count of candidates blocked by the guard.
 * violations — internal records (MUST NOT be serialized into any API response).
 *
 * MUST NOT expose raw hidden field values in violations — fieldName only (not value).
 */
export interface SupplierMatchRuntimeGuardResult {
  /** True when all candidates passed and violations list is empty. */
  passed: boolean;
  /** Surviving buyer-safe candidates in original input order. */
  sanitizedCandidates: SupplierMatchCandidate[];
  /** Count of candidates blocked by the guard. */
  blockedCandidateCount: number;
  /**
   * Internal violation records.
   * MUST NOT be serialized into any API response or buyer-facing output.
   * Raw hidden field values are NEVER included here.
   */
  violations: SupplierMatchRuntimeGuardViolation[];
}

// ─── Slice E — RFQ Intent Matching Types ─────────────────────────────────────

/**
 * Safe RFQ context fields extracted server-side from a buyer-owned RFQ record.
 * All fields are optional to allow partial RFQ data without requiring a complete RFQ.
 *
 * Constitutional constraints:
 * - NEVER includes price, targetPrice, supplierQuoteTerms, or any monetary field.
 * - NEVER includes internalRfqScore or AI-generated scoring data.
 * - buyerOrgId is NOT a field here — it is provided at the service input level
 *   and injected when calling the signal builder.
 * - buyerMessage must be sanitized (no PII, no negotiation terms) before passing.
 */
export interface SupplierMatchRfqContext {
  /** Stable RFQ record identifier for audit correlation. */
  rfqId?: string;
  /** Product category (e.g., "Woven Fabric", "Yarn"). */
  productCategory?: string;
  /** Primary material requirement (e.g., "Organic Cotton"). */
  material?: string;
  /** Fabric type filter (e.g., "Jersey", "Twill"). */
  fabricType?: string;
  /** Composition requirement (e.g., "100% Cotton"). */
  composition?: string;
  /** Target catalog stage (e.g., "ACTIVE", "SAMPLE"). */
  catalogStage?: string;
  /** Requested order quantity (numeric, non-negative). */
  requestedQuantity?: number;
  /** MOQ requirement for this RFQ (numeric, non-negative). */
  moqRequirement?: number;
  /** Buyer's preferred delivery region / geography. */
  deliveryRegion?: string;
  /**
   * Buyer intent message for RFQ_INTENT signal.
   * Must be sanitized (no PII, no negotiation terms) before passing.
   * Length is further capped at SIGNAL_VALUE_MAX_LENGTH by the signal builder.
   */
  buyerMessage?: string;
  // price: EXCLUDED — constitutionally forbidden from all AI paths
  // targetPrice: EXCLUDED — constitutionally forbidden
  // supplierQuoteTerms: EXCLUDED — constitutionally forbidden
  // internalRfqScore: EXCLUDED — AI scoring data forbidden from input paths
}

/**
 * Input to the SupplierMatchRfqIntentService.
 *
 * ALL fields must be assembled server-side from validated, trusted sources.
 * No field may originate from the raw HTTP request body without explicit
 * server-side validation and field selection.
 */
export interface SupplierMatchRfqIntentInput {
  /** JWT-derived buyer org ID — required. Never from request body. */
  buyerOrgId: string;
  /** Safe RFQ context fields from a buyer-owned, server-validated RFQ record. */
  rfqContext: SupplierMatchRfqContext;
  /**
   * Trusted server-side candidate drafts to match against.
   * May be empty — empty input yields a structured fallback result, not an error.
   */
  candidateDrafts: SupplierMatchCandidateDraft[];
  /**
   * Optional server-side policy context for bulk enforcement.
   * forbiddenSupplierOrgIds — suppliers that must be hard-excluded.
   */
  policyContext?: {
    /** Hard-excluded suppliers (BLOCKED/SUSPENDED/REJECTED set). */
    forbiddenSupplierOrgIds?: ReadonlySet<string>;
  };
  /**
   * Maximum candidates to return. Passed through to the ranker.
   * Default: 5. Hard cap: 20.
   */
  maxCandidates?: number;
  /** Stable request reference for audit correlation and test determinism. */
  requestId?: string;
  /** Caller-supplied timestamp for deterministic audit envelope. Defaults to now. */
  requestedAt?: Date | string;
}

/**
 * Result of the SupplierMatchRfqIntentService.
 *
 * matchResult — buyer-safe matching result (candidates, audit envelope, guard-cleared).
 * rfqId — echo of rfqContext.rfqId for caller correlation (safe; opaque identifier only).
 * policyViolationsBlocked — count of candidates excluded by the policy filter (Slice B).
 * guardViolationsBlocked — count of candidates excluded by the runtime guard (Slice D).
 *
 * MUST NOT include: raw policy violation details, score breakdowns, relationship graph,
 * price, or any internal forbidden field.
 */
export interface SupplierMatchRfqIntentResult {
  /** Final buyer-safe matching result cleared by the Slice D runtime guard. */
  matchResult: SupplierMatchResult;
  /** Echo of rfqContext.rfqId for caller correlation. Safe: opaque identifier. */
  rfqId?: string;
  /** Count of candidates blocked by the Slice B policy filter. */
  policyViolationsBlocked: number;
  /** Count of candidates blocked by the Slice D runtime guard. */
  guardViolationsBlocked: number;
}

// ─── Slice F — Semantic Signal Types ─────────────────────────────────────────

/**
 * Allowed source types for semantic signal derivation.
 * Only published, buyer-visible embedding sources may produce signals.
 *
 * FORBIDDEN sources (cause candidate rejection):
 *   DRAFT_DPP, AI_EXTRACTION_DRAFT, HIDDEN_PRICE, RELATIONSHIP_GRAPH,
 *   ALLOWLIST_GRAPH, PRIVATE_NOTES, INTERNAL_SCORE, UNPUBLISHED_EVIDENCE.
 */
export type SupplierMatchSemanticSourceType =
  | 'CATALOG_ITEM'
  | 'CERTIFICATION'
  | 'DPP_SNAPSHOT'
  | 'SUPPLIER_PROFILE';

/**
 * Categorical similarity bucket derived from a raw cosine similarity float.
 * INTERNAL ONLY — never serialised into buyer-facing API responses.
 *
 * HIGH   cosine >= 0.80
 * MEDIUM cosine >= 0.55
 * LOW    cosine >= SEMANTIC_MIN_SIMILARITY (0.30)
 * (Below SEMANTIC_MIN_SIMILARITY → candidate rejected; no bucket emitted.)
 */
export type SupplierMatchSemanticSimilarityBucket = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * One pre-computed embedding candidate from an orgId-scoped vectorStore query.
 * The caller (e.g. querySimilar) provides this after a RLS-enforced similarity query.
 *
 * Constitutional constraints:
 *  - orgId MUST equal the session buyerOrgId (cross-tenant candidates are rejected).
 *  - similarity MUST be a finite number in [0, 1].
 *  - dimension MUST be 768 if provided (EMBEDDING_DIM, ADR-028 §5.1).
 *  - embeddingModel MUST be 'text-embedding-004' if provided.
 *  - sourceType MUST be one of SupplierMatchSemanticSourceType.
 *  - sourceTextSnippet MUST NOT contain forbidden fragments (price, risk, relationship
 *    graph, allowlist, privateNote, escrow, draft, unpublished, publicationPosture).
 *  - Raw vector embedding is NEVER present here — only the similarity float.
 */
export interface SupplierMatchEmbeddingCandidate {
  /** Supplier org ID the embedding source belongs to. */
  supplierOrgId: string;
  /** Org that owns this embedding record — must equal session buyerOrgId. */
  orgId: string;
  /** Allowed embedding source type. */
  sourceType: SupplierMatchSemanticSourceType;
  /** Source record UUID for audit correlation. */
  sourceId: string;
  /**
   * Cosine similarity score in [0, 1] from the vectorStore query.
   * INTERNAL ONLY — never serialised into buyer-facing output.
   */
  similarity: number;
  /** Embedding dimension. If provided, must equal 768. */
  dimension?: number;
  /** Embedding model identifier. If provided, must be 'text-embedding-004'. */
  embeddingModel?: string;
  /**
   * Optional short plain-text snippet from the embedding source for audit purposes.
   * Must NOT contain any forbidden field fragment (price, risk_score, etc.).
   * Maximum 500 characters. NEVER surfaced to buyers.
   */
  sourceTextSnippet?: string;
}

/**
 * One semantic signal derived from a validated embedding candidate.
 * Internal to the matching pipeline — NEVER serialised into buyer-facing output.
 *
 * Forbidden: raw vector, embedding ID, cosine score, model confidence.
 * Allowed: categorical similarity bucket, source type, source ID.
 */
export interface SupplierMatchSemanticSignal {
  /** Supplier org ID this semantic signal pertains to. */
  supplierOrgId: string;
  /** Categorical similarity bucket (internal only). */
  similarityBucket: SupplierMatchSemanticSimilarityBucket;
  /** Source type the signal was derived from. */
  sourceType: SupplierMatchSemanticSourceType;
  /** Source record UUID (opaque — for audit correlation only). */
  sourceId: string;
  /** Internal match category for pipeline integration. */
  matchCategory: 'SEMANTIC_FIT';
}

/**
 * Input to buildSupplierSemanticSignals.
 *
 * Pre-computed embedding candidates are provided by the caller after an
 * orgId-scoped, RLS-enforced vectorStore query. This service does NOT call
 * any model/provider — it validates and converts pre-computed similarity
 * values to internal categorical signals only.
 */
export interface SupplierMatchSemanticSignalInput {
  /** JWT-derived buyer org ID. MUST NOT originate from request body. */
  buyerOrgId: string;
  /**
   * Pre-computed embedding candidates from an orgId-scoped vectorStore query.
   * An empty array returns a safe empty result with no signals.
   */
  embeddingCandidates: SupplierMatchEmbeddingCandidate[];
  /** Optional request ID for audit log correlation. */
  requestId?: string;
}

/**
 * Result of buildSupplierSemanticSignals.
 *
 * NEVER contains: raw vector, cosine score, embedding ID, model confidence.
 * modelCallMade is always false — this service makes no AI model calls.
 * humanConfirmationRequired is always true — constitutional requirement.
 */
export interface SupplierMatchSemanticSignalResult {
  /** Safe semantic signals derived from valid embedding candidates. */
  signals: SupplierMatchSemanticSignal[];
  /** Count of embedding candidates rejected by semantic validation. */
  rejectedCandidateCount: number;
  /** Always false — this service makes no AI model calls. */
  modelCallMade: false;
  /** Always true — constitutional requirement for all AI signal paths. */
  humanConfirmationRequired: true;
}

/**
 * Internal guard result for a single embedding candidate.
 * NEVER surfaced to buyers or in API responses.
 */
export interface SupplierMatchSemanticGuardResult {
  /** True if the candidate passed all semantic guardrails. */
  passed: boolean;
  /** Rejection reason when passed is false. */
  rejectionReason?: SupplierMatchSemanticRejectionReason;
}

/**
 * Rejection reason codes for semantic candidate validation.
 * INTERNAL ONLY — used in guard results and test assertions.
 */
export type SupplierMatchSemanticRejectionReason =
  | 'EMPTY_BUYER_ORG_ID'
  | 'MISSING_SUPPLIER_ORG_ID'
  | 'CROSS_TENANT_CANDIDATE'
  | 'INVALID_DIMENSION'
  | 'INVALID_MODEL'
  | 'FORBIDDEN_SOURCE_TYPE'
  | 'FORBIDDEN_SOURCE_TEXT'
  | 'BELOW_MIN_SIMILARITY'
  | 'INVALID_SIMILARITY_VALUE';
