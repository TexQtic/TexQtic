/**
 * supplierMatchPolicyFilter.service.ts — Supplier Match Policy Filter
 *
 * Deterministic policy filter for the AI Supplier Matching system.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice B.
 *
 * This filter is the safety gate between the raw candidate pool (assembled by
 * the signal builder or route handler) and the ranking layer (Slice C).
 * No candidate may reach the ranker without passing every gate enforced here.
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO.
 * - DETERMINISTIC: Same input always produces same output (sorted by supplierOrgId).
 * - NEVER THROWS: Malformed/missing optional fields block the candidate safely.
 * - SILENT EXCLUSION: BLOCKED/SUSPENDED/REJECTED suppliers produce no buyer-visible
 *   hint. The violation is recorded internally only.
 * - NO FORBIDDEN OUTPUT: price, riskScore, relationship graph, allowlist graph,
 *   audit metadata, and AI confidence values are constitutionally excluded from
 *   all output types.
 * - SIGNAL SAFETY PASS-THROUGH: Only signals with isSafe === true (from Slice A
 *   builder) survive signal stripping. DPP_PUBLISHED signals are additionally
 *   gated by dppPublished flag.
 * - TENANT ISOLATION: buyerOrgId is required; cross-tenant candidates are blocked.
 *
 * Gate order (earliest gate wins):
 *   1. Missing buyer context
 *   2. Missing supplier context (no supplierOrgId)
 *   3. Cross-tenant scope (sourceOrgId mismatch or self-match)
 *   4. Forbidden supplier (policyContext.forbiddenSupplierOrgIds)
 *   5. Relationship state: BLOCKED → SUSPENDED → REJECTED
 *   6. Catalog visibility: HIDDEN / REGION_CHANNEL_SENSITIVE → APPROVED_BUYER_ONLY gate
 *   7. RFQ gate (when isRfqContextual)
 *   8. Signal safety strip (isSafe !== true; DPP gate)
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService       (no AI model calls in policy layer)
 * - vectorEmbeddingClient  (no embeddings; this is the gate layer, not the vector layer)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 *
 * @module supplierMatchPolicyFilter.service
 */

import type {
  SupplierMatchSignal,
  SupplierMatchCandidateDraft,
  SupplierMatchPolicyViolation,
  SupplierMatchPolicyFilterInput,
  SupplierMatchPolicyFilterResult,
  SupplierMatchBlockedReason,
} from './supplierMatch.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Empty set sentinel — avoids allocation on every call. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * Field names that must NEVER appear in policy filter output (JSON keys).
 * This set mirrors the signal builder's FORBIDDEN_INPUT_FIELDS and extends
 * it with output-specific forbidden keys (rank, score, confidence, etc.).
 *
 * Used for defense-in-depth assertion in tests and for type contract validation.
 * The output types (SupplierMatchCandidateDraft, SupplierMatchPolicyFilterResult)
 * are already designed to exclude these — this set provides a testable surface.
 */
export const FORBIDDEN_POLICY_FILTER_OUTPUT_FIELDS: ReadonlySet<string> = new Set<string>([
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
  // Pricing policy internals
  'price_disclosure_policy_mode',
  'supplierPolicy',
  'supplierDisclosurePolicy',
  'publicationPosture',
  // Catalog access-control policy (Slice E: must never appear in filter output)
  'catalogVisibilityPolicyMode',
  'catalog_visibility_policy_mode',
  // Risk / AI scoring (forbidden from all AI tenant paths)
  'riskScore',
  'risk_score',
  'buyerScore',
  'supplierScore',
  'aiMatchingScore',
  'confidenceScore',
  'aiConfidence',
  'rank',
  'score',
  'ranking',
  // Relationship / allowlist internal graph metadata
  'blockedReason',
  'rejectedReason',
  'suspensionReason',
  'auditMetadata',
  'privateNotes',
  'allowlistGraph',
  'relationshipGraph',
  // AI draft / unpublished evidence
  'aiDraftData',
  'aiExtractionDraft',
  'unpublishedEvidence',
  // Escrow / payment / credit
  'escrow',
  'escrowAccount',
  'escrowAccounts',
  'escrowTransaction',
  'escrowTransactions',
  'paymentTerms',
  'creditLimit',
  'payment',
  'credit',
  // Auth / PII credentials
  'email',
  'phone',
  'password',
  'refreshToken',
  'passwordResetToken',
  'token',
  'secret',
  'auth',
  // Secrets / keys
  'secrets',
  'apiKey',
]);

// ─── Internal gate result types ───────────────────────────────────────────────

type GateAllow = { decision: 'ALLOW'; candidate: SupplierMatchCandidateDraft };
type GateBlock = { decision: 'BLOCK'; blockedReason: SupplierMatchBlockedReason };
type GateResult = GateAllow | GateBlock;

// ─── Signal stripping ─────────────────────────────────────────────────────────

/**
 * Strip signals that are not constitutionally safe.
 *
 * Removed:
 * - Signals where `isSafe !== true` (not emitted by the Slice A builder).
 *   This catches injected, forged, or AI-extracted signals.
 * - `DPP_PUBLISHED` signals when `dppPublished !== true`.
 *   Defense-in-depth: even if a DPP_PUBLISHED signal somehow reached the filter,
 *   if the DPP is not confirmed published by the server, the signal is suppressed.
 *
 * This function is exported for testing; callers outside tests should use the
 * policy filter function which applies this automatically.
 */
export function stripUnsafeSignals(
  signals: SupplierMatchSignal[],
  dppPublished?: boolean,
): SupplierMatchSignal[] {
  const safe: SupplierMatchSignal[] = [];
  for (const signal of signals) {
    // Strip any signal where the Slice A builder safety brand is absent.
    if (signal.isSafe !== true) continue;
    // Strip DPP_PUBLISHED signals when publication is not confirmed by the server.
    if (signal.signalType === 'DPP_PUBLISHED' && dppPublished !== true) continue;
    safe.push(signal);
  }
  return safe;
}

/**
 * Returns the set of field names forbidden from policy filter output.
 * Exported for test-level assertion (T-27 / forbidden-key check).
 */
export function getForbiddenPolicyFilterOutputFields(): ReadonlySet<string> {
  return FORBIDDEN_POLICY_FILTER_OUTPUT_FIELDS;
}

// ─── Gate evaluator ───────────────────────────────────────────────────────────

/**
 * Evaluate a single candidate against all policy gates.
 * Returns ALLOW with a safe (signal-stripped) candidate copy, or BLOCK with reason.
 *
 * Gate order guarantees:
 * 1. Missing supplier context → MISSING_SUPPLIER_CONTEXT
 * 2. Cross-tenant scope check → CROSS_TENANT_SCOPE
 * 3. Forbidden supplier (policy context set) → SUPPLIER_FORBIDDEN
 * 4. Relationship state BLOCKED → RELATIONSHIP_BLOCKED
 * 5. Relationship state SUSPENDED → RELATIONSHIP_SUSPENDED
 * 6. Relationship state REJECTED → RELATIONSHIP_REJECTED
 * 7. Catalog HIDDEN / REGION_CHANNEL_SENSITIVE → HIDDEN_CATALOG
 * 8. Catalog APPROVED_BUYER_ONLY without APPROVED → RELATIONSHIP_REQUIRED
 * 9. RFQ APPROVED_BUYERS_ONLY without APPROVED → RFQ_NOT_ALLOWED
 * 10. Signal safety strip (unsafe signals removed; DPP gate applied)
 */
function evaluateCandidate(
  candidate: SupplierMatchCandidateDraft,
  buyerOrgId: string,
  forbiddenSupplierOrgIds: ReadonlySet<string>,
  isRfqContextual: boolean,
): GateResult {
  const supplierOrgId = candidate.supplierOrgId;

  // Gate 1: Missing supplier context
  if (typeof supplierOrgId !== 'string' || supplierOrgId.trim().length === 0) {
    return { decision: 'BLOCK', blockedReason: 'MISSING_SUPPLIER_CONTEXT' };
  }

  // Gate 2: Cross-tenant scope check
  //   a) sourceOrgId provided and does not match this buyer context
  //   b) Supplier org ID equals buyer org ID (buyer cannot match themselves)
  if (candidate.sourceOrgId !== undefined && candidate.sourceOrgId !== buyerOrgId) {
    return { decision: 'BLOCK', blockedReason: 'CROSS_TENANT_SCOPE' };
  }
  if (supplierOrgId === buyerOrgId) {
    return { decision: 'BLOCK', blockedReason: 'CROSS_TENANT_SCOPE' };
  }

  // Gate 3: Forbidden supplier (bulk BLOCKED/SUSPENDED/REJECTED pre-exclusion set)
  if (forbiddenSupplierOrgIds.has(supplierOrgId)) {
    return { decision: 'BLOCK', blockedReason: 'SUPPLIER_FORBIDDEN' };
  }

  // Gates 4–6: Relationship state hard exclusions
  const relState = candidate.relationshipState;
  if (relState === 'BLOCKED') {
    return { decision: 'BLOCK', blockedReason: 'RELATIONSHIP_BLOCKED' };
  }
  if (relState === 'SUSPENDED') {
    return { decision: 'BLOCK', blockedReason: 'RELATIONSHIP_SUSPENDED' };
  }
  if (relState === 'REJECTED') {
    return { decision: 'BLOCK', blockedReason: 'RELATIONSHIP_REJECTED' };
  }

  // Gates 7–8: Catalog visibility
  const { catalogVisibility, rfqAcceptanceMode, dppPublished } = candidate.visibility;

  if (catalogVisibility === 'HIDDEN') {
    return { decision: 'BLOCK', blockedReason: 'HIDDEN_CATALOG' };
  }
  if (catalogVisibility === 'REGION_CHANNEL_SENSITIVE') {
    // Future boundary — silently exclude until region/channel logic is implemented.
    return { decision: 'BLOCK', blockedReason: 'HIDDEN_CATALOG' };
  }
  if (catalogVisibility === 'APPROVED_BUYER_ONLY' && relState !== 'APPROVED') {
    // APPROVED_BUYER_ONLY requires relationship state APPROVED.
    // All other states (NONE, REQUESTED, EXPIRED, REVOKED) are denied.
    // Note: BLOCKED/SUSPENDED/REJECTED already blocked above (gates 4-6).
    return { decision: 'BLOCK', blockedReason: 'RELATIONSHIP_REQUIRED' };
  }
  // PUBLIC and AUTHENTICATED_ONLY pass catalog gate (buyerOrgId presence already
  // validated at the filter entry point).

  // Gate 9: RFQ acceptance mode (only when matching is RFQ-contextual)
  if (
    isRfqContextual &&
    rfqAcceptanceMode === 'APPROVED_BUYERS_ONLY' &&
    relState !== 'APPROVED'
  ) {
    return { decision: 'BLOCK', blockedReason: 'RFQ_NOT_ALLOWED' };
  }

  // Gate 10: Signal safety strip
  //   - Remove signals with isSafe !== true (not from Slice A builder).
  //   - Remove DPP_PUBLISHED signals when dppPublished !== true.
  const safeSignals = stripUnsafeSignals(candidate.signals, dppPublished);

  // All gates passed. Return a clean candidate copy with stripped signals.
  const safeCandidate: SupplierMatchCandidateDraft = {
    supplierOrgId: candidate.supplierOrgId,
    signals: safeSignals,
    visibility: candidate.visibility,
  };
  if (candidate.candidateId !== undefined) {
    safeCandidate.candidateId = candidate.candidateId;
  }
  if (candidate.relationshipState !== undefined) {
    safeCandidate.relationshipState = candidate.relationshipState;
  }
  if (candidate.sourceOrgId !== undefined) {
    safeCandidate.sourceOrgId = candidate.sourceOrgId;
  }

  return { decision: 'ALLOW', candidate: safeCandidate };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply all policy gates to a raw supplier candidate pool.
 *
 * This function is the primary export of Slice B. It must be called before
 * any candidate reaches the ranking layer (Slice C) or is surfaced to a buyer.
 *
 * Input requirements:
 * - buyerOrgId MUST originate from the authenticated JWT (never request body).
 * - candidates MUST be assembled server-side from trusted Prisma query results.
 * - policyContext.forbiddenSupplierOrgIds MUST be populated from the relationship
 *   table for this buyer (BLOCKED + SUSPENDED + REJECTED supplier set).
 *
 * Output guarantees:
 * - safeCandidates: every candidate passed all gates; all signals have isSafe === true.
 * - blocked: internal violation records — NOT buyer-facing.
 * - fallback: true when no safe candidates remain.
 * - Deterministic: sorted by supplierOrgId for stable ordering across identical inputs.
 * - Never throws: all errors produce a BLOCK with an appropriate reason.
 *
 * @param input - Trusted server-side filter input.
 * @returns Deterministic policy filter result with safe candidates and violation log.
 */
export function applySupplierMatchPolicyFilter(
  input: SupplierMatchPolicyFilterInput,
): SupplierMatchPolicyFilterResult {
  const { buyerOrgId, candidates, policyContext } = input;

  // Gate 0: Missing buyer context — fail safe with empty result.
  if (typeof buyerOrgId !== 'string' || buyerOrgId.trim().length === 0) {
    return {
      buyerOrgId: '',
      safeCandidates: [],
      blocked: [],
      policyViolationsBlocked: 0,
      fallback: true,
    };
  }

  const forbiddenSupplierOrgIds =
    policyContext?.forbiddenSupplierOrgIds ?? EMPTY_SET;
  const isRfqContextual = policyContext?.isRfqContextual ?? false;

  // Deduplicate by supplierOrgId — first valid occurrence wins.
  // Subsequent candidates with the same supplierOrgId are silently dropped
  // (no violation recorded — deduplication is not a policy violation).
  const seen = new Set<string>();
  const deduplicated: SupplierMatchCandidateDraft[] = [];

  for (const candidate of candidates) {
    const key = candidate.supplierOrgId?.trim() ?? '';
    if (!key) {
      // Missing supplierOrgId — include once for gate processing (will be blocked).
      deduplicated.push(candidate);
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(candidate);
    }
    // Duplicate key — silently skip.
  }

  // Evaluate each candidate against all policy gates.
  const safeCandidates: SupplierMatchCandidateDraft[] = [];
  const blocked: SupplierMatchPolicyViolation[] = [];

  for (const candidate of deduplicated) {
    const result = evaluateCandidate(
      candidate,
      buyerOrgId,
      forbiddenSupplierOrgIds,
      isRfqContextual,
    );

    if (result.decision === 'ALLOW') {
      safeCandidates.push(result.candidate);
    } else {
      const violation: SupplierMatchPolicyViolation = {
        supplierOrgId: candidate.supplierOrgId?.trim() || '<unknown>',
        blockedReason: result.blockedReason,
      };
      if (candidate.candidateId !== undefined) {
        violation.candidateId = candidate.candidateId;
      }
      blocked.push(violation);
    }
  }

  // Sort safe candidates by supplierOrgId for deterministic, stable output order.
  safeCandidates.sort((a, b) => a.supplierOrgId.localeCompare(b.supplierOrgId));

  return {
    buyerOrgId,
    safeCandidates,
    blocked,
    policyViolationsBlocked: blocked.length,
    fallback: safeCandidates.length === 0,
  };
}
