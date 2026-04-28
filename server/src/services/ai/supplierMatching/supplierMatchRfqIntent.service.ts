/**
 * supplierMatchRfqIntent.service.ts — RFQ Intent Supplier Matching Service
 *
 * Orchestration layer for the AI Supplier Matching system.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice E (RFQ intent pipeline).
 *
 * Pipeline (in order):
 *   1. Validate buyerOrgId (required trusted context)
 *   2. Build RFQ intent signals via Slice A (buildSupplierMatchSignals)
 *   3. Inject RFQ intent signals into each candidate draft (non-mutating)
 *   4. Apply Slice B policy filter (isRfqContextual: true)
 *   5. Apply Slice C ranker
 *   6. Apply Slice D explanation builder to each ranked candidate
 *   7. Apply Slice D runtime guard
 *   8. Return SupplierMatchRfqIntentResult (modelCallMade: false always)
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO.
 * - DETERMINISTIC: Same input with same requestedAt/requestId produces same output.
 * - NEVER THROWS: Invalid/missing optional inputs produce structured fallback results.
 * - modelCallMade: false — always; this service is deterministic only.
 * - humanConfirmationRequired: true — always; design §7 constraint.
 * - buyerOrgId flows through every stage and is validated before pipeline entry.
 * - isRfqContextual: true is always passed to the policy filter.
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService         (no AI model calls in RFQ intent layer)
 * - vectorEmbeddingClient    (no embeddings)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 * - prisma / database clients (no DB access in this service)
 * - supabaseClient
 *
 * @module supplierMatchRfqIntent.service
 */

import type {
  SupplierMatchCandidateDraft,
  SupplierMatchCandidate,
  SupplierMatchResult,
  SupplierMatchAuditEnvelope,
  SupplierMatchRfqContext,
  SupplierMatchRfqIntentInput,
  SupplierMatchRfqIntentResult,
} from './supplierMatch.types.js';
import type {
  SupplierMatchSignalBuilderInput,
} from './supplierMatchSignalBuilder.service.js';
import { buildSupplierMatchSignals } from './supplierMatchSignalBuilder.service.js';
import { applySupplierMatchPolicyFilter } from './supplierMatchPolicyFilter.service.js';
import { rankSupplierCandidates, DEFAULT_MAX_CANDIDATES } from './supplierMatchRanker.service.js';
import { buildSupplierMatchExplanation } from './supplierMatchExplanationBuilder.service.js';
import { guardSupplierMatchOutput } from './supplierMatchRuntimeGuard.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Algorithm version label for observability and audit correlation. */
export const RFQ_INTENT_SERVICE_VERSION = 'mvp-rfq-intent-v1' as const;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Normalize requestedAt to a UTC ISO string.
 * Falls back to the current UTC timestamp when not provided.
 */
function normalizeRequestedAt(requestedAt: Date | string | undefined): string {
  if (requestedAt instanceof Date) return requestedAt.toISOString();
  if (typeof requestedAt === 'string' && requestedAt.trim().length > 0) return requestedAt.trim();
  return new Date().toISOString();
}

/**
 * Build a structured fallback SupplierMatchResult.
 * Used when: buyerOrgId is missing/empty, or no safe candidates remain.
 */
function buildFallbackMatchResult(
  buyerOrgId: string,
  requestId: string | undefined,
  requestedAt: string,
  policyViolationsBlocked: number,
): SupplierMatchResult {
  const auditEnvelope: SupplierMatchAuditEnvelope = {
    buyerOrgId,
    requestId,
    requestedAt,
    candidateCount: 0,
    policyViolationsBlocked,
    signalTypeCounts: {},
    totalSignalsConsidered: 0,
    modelCallMade: false,
    fallbackUsed: true,
    rankerVersion: RFQ_INTENT_SERVICE_VERSION,
  };
  return {
    buyerOrgId,
    requestId,
    candidates: [],
    fallback: true,
    modelCallMade: false,
    auditEnvelope,
    humanConfirmationRequired: true,
  };
}

/**
 * Map a SupplierMatchRfqContext to the SafeRfqContextInput expected by the
 * signal builder, injecting the trusted buyerOrgId from the service input.
 */
function buildSignalBuilderInput(
  buyerOrgId: string,
  rfqContext: SupplierMatchRfqContext,
): SupplierMatchSignalBuilderInput {
  return {
    buyerOrgId,
    rfqContext: {
      rfqId:              rfqContext.rfqId,
      buyerOrgId,
      productCategory:    rfqContext.productCategory,
      material:           rfqContext.material,
      moqRequirement:     rfqContext.moqRequirement ?? rfqContext.requestedQuantity,
      geographyPreference: rfqContext.deliveryRegion,
      buyerMessage:       rfqContext.buyerMessage,
    },
  };
}

/**
 * Inject RFQ intent signals into a candidate draft (non-mutating).
 * RFQ signals are prepended so they are weighted first by the ranker.
 */
function injectRfqSignals(
  draft: SupplierMatchCandidateDraft,
  rfqSignals: ReturnType<typeof buildSupplierMatchSignals>,
): SupplierMatchCandidateDraft {
  return {
    ...draft,
    signals: [...rfqSignals, ...draft.signals],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Match suppliers against an RFQ's intent using the full Slice A–D pipeline.
 *
 * @param input - Trusted server-side input bundle (buyerOrgId, rfqContext, candidateDrafts).
 * @returns SupplierMatchRfqIntentResult with buyer-safe ranked candidates.
 *
 * Fallback result (candidates: [], fallback: true) is returned when:
 * - buyerOrgId is missing or empty
 * - candidateDrafts is empty
 * - no candidates survive the policy filter
 * - runtime guard removes all remaining candidates
 */
export function matchSuppliersForRfqIntent(
  input: SupplierMatchRfqIntentInput,
): SupplierMatchRfqIntentResult {
  // ── Step 1: Validate required trusted context ────────────────────────────
  const buyerOrgId =
    typeof input?.buyerOrgId === 'string' ? input.buyerOrgId.trim() : '';

  const requestId    = input?.requestId;
  const requestedAt  = normalizeRequestedAt(input?.requestedAt);
  const rfqContext   = input?.rfqContext ?? {};
  const rfqId        = rfqContext.rfqId;

  if (buyerOrgId === '') {
    return {
      matchResult: buildFallbackMatchResult('', requestId, requestedAt, 0),
      rfqId,
      policyViolationsBlocked: 0,
      guardViolationsBlocked:  0,
    };
  }

  const candidateDrafts: SupplierMatchCandidateDraft[] = Array.isArray(input?.candidateDrafts)
    ? input.candidateDrafts
    : [];

  const maxCandidates =
    typeof input?.maxCandidates === 'number' ? input.maxCandidates : DEFAULT_MAX_CANDIDATES;

  // ── Step 2: Build RFQ intent signals via Slice A signal builder ──────────
  const signalBuilderInput = buildSignalBuilderInput(buyerOrgId, rfqContext);
  const rfqIntentSignals   = buildSupplierMatchSignals(signalBuilderInput);

  // ── Step 3: Inject RFQ intent signals into each candidate (non-mutating) ─
  const enrichedDrafts: SupplierMatchCandidateDraft[] = candidateDrafts.map((draft) =>
    injectRfqSignals(draft, rfqIntentSignals),
  );

  // ── Step 4: Apply Slice B policy filter (isRfqContextual: true) ──────────
  const policyFilterResult = applySupplierMatchPolicyFilter({
    buyerOrgId,
    candidates: enrichedDrafts,
    policyContext: {
      forbiddenSupplierOrgIds: input?.policyContext?.forbiddenSupplierOrgIds,
      isRfqContextual:         true,
    },
  });

  const policyViolationsBlocked = policyFilterResult.policyViolationsBlocked;

  if (policyFilterResult.fallback) {
    return {
      matchResult: buildFallbackMatchResult(
        buyerOrgId, requestId, requestedAt, policyViolationsBlocked,
      ),
      rfqId,
      policyViolationsBlocked,
      guardViolationsBlocked: 0,
    };
  }

  // ── Step 5: Apply Slice C ranker ──────────────────────────────────────────
  const rankerResult = rankSupplierCandidates({
    buyerOrgId,
    requestId,
    candidates:              policyFilterResult.safeCandidates,
    maxCandidates,
    policyViolationsBlocked,
    requestedAt,
  });

  // ── Step 6: Apply Slice D explanation builder to each ranked candidate ────
  const candidatesWithExplanations: SupplierMatchCandidate[] =
    rankerResult.result.candidates.map((candidate) => {
      const { explanation } = buildSupplierMatchExplanation({
        buyerOrgId,
        matchCategories: candidate.matchCategories,
      });
      return { ...candidate, explanation };
    });

  // ── Step 7: Apply Slice D runtime guard ───────────────────────────────────
  const guardResult = guardSupplierMatchOutput({
    buyerOrgId,
    requestId,
    candidates: candidatesWithExplanations,
  });

  const guardViolationsBlocked = guardResult.blockedCandidateCount;
  const finalCandidates        = guardResult.sanitizedCandidates;
  const finalFallback          = finalCandidates.length === 0;

  // ── Step 8: Assemble final SupplierMatchResult ────────────────────────────
  const matchResult: SupplierMatchResult = {
    ...rankerResult.result,
    candidates: finalCandidates,
    fallback:   finalFallback,
    auditEnvelope: {
      ...rankerResult.result.auditEnvelope,
      candidateCount: finalCandidates.length,
      fallbackUsed:   finalFallback,
    },
  };

  return {
    matchResult,
    rfqId,
    policyViolationsBlocked,
    guardViolationsBlocked,
  };
}
