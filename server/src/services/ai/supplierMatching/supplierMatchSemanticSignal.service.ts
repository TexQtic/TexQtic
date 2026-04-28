/**
 * supplierMatchSemanticSignal.service.ts — Slice F: Semantic Signal Service
 *
 * Accepts pre-computed embedding candidates (already-safe similarity results
 * from an orgId-scoped, RLS-enforced vectorStore query) and converts them to
 * internal SupplierMatchSemanticSignal values.
 *
 * Constitutional constraints (NON-NEGOTIABLE):
 *  - This service makes ZERO AI model or inference calls. (modelCallMade: false always)
 *  - This service makes ZERO embedding writes. (no upsertDocumentEmbeddings)
 *  - This service makes ZERO database calls. (pure function)
 *  - Raw cosine similarity scores are NEVER stored or returned in output.
 *  - humanConfirmationRequired is always true.
 *  - price, publicationPosture, risk_score, allowlist/relationship graph,
 *    privateNotes, escrow, draft data are constitutionally forbidden in source text.
 *
 * Forbidden imports (must never be added):
 *  - Any AI provider SDK (gemini, openai, anthropic, google-generativeai)
 *  - inferenceService, vectorEmbeddingClient, querySimilar
 *  - upsertDocumentEmbeddings
 *  - Prisma client, supabaseClient, or any DB client
 *
 * @module supplierMatchSemanticSignal.service
 */

import type {
  SupplierMatchEmbeddingCandidate,
  SupplierMatchSemanticGuardResult,
  SupplierMatchSemanticSignal,
  SupplierMatchSemanticSignalInput,
  SupplierMatchSemanticSignalResult,
  SupplierMatchSemanticSimilarityBucket,
  SupplierMatchSemanticSourceType,
} from './supplierMatch.types.js';

// ─── Service Version ──────────────────────────────────────────────────────────

export const SEMANTIC_SIGNAL_SERVICE_VERSION = 'mvp-semantic-v1' as const;

// ─── Constitutional Constants ─────────────────────────────────────────────────

/** Hard-locked per ADR-028 §5.1. Must match EMBEDDING_DIM in vectorStore.ts. */
export const ALLOWED_EMBEDDING_MODEL = 'text-embedding-004' as const;

/** Required embedding dimension. Any other value is rejected. */
export const REQUIRED_EMBEDDING_DIM = 768 as const;

/** Minimum cosine similarity to produce any signal. Below this → no signal. */
const SEMANTIC_MIN_SIMILARITY = 0.30 as const;

/** Cosine threshold for HIGH bucket. */
const HIGH_THRESHOLD = 0.80 as const;

/** Cosine threshold for MEDIUM bucket. */
const MEDIUM_THRESHOLD = 0.55 as const;

// ─── Allowed and Forbidden Source Types ──────────────────────────────────────

/**
 * Source types that may produce semantic signals.
 * Only published, buyer-visible embedding sources are permitted.
 */
const ALLOWED_SEMANTIC_SOURCE_TYPES: ReadonlySet<string> = new Set<SupplierMatchSemanticSourceType>([
  'CATALOG_ITEM',
  'CERTIFICATION',
  'DPP_SNAPSHOT',
  'SUPPLIER_PROFILE',
]);

// ─── Forbidden Source Text Fragments ─────────────────────────────────────────

/**
 * Case-insensitive substrings that are unconditionally forbidden in sourceTextSnippet.
 *
 * Any snippet containing these fragments implies the embedding was derived from
 * constitutionally-protected data (price, relationship graph, risk scores, etc.)
 * and the candidate must be rejected.
 */
const FORBIDDEN_SOURCE_TEXT_FRAGMENTS: ReadonlyArray<string> = [
  'price:',              // JSON field-value price pattern
  '"price"',             // JSON key pattern
  'publicationposture',  // Publication policy (forbidden from all AI paths)
  'publication_posture',
  'risk_score',          // Control-plane only; tenant AI hard boundary
  'riskscore',
  'allowlistgraph',      // Relationship/allowlist graph data
  'allowlist_graph',
  'relationshipgraph',
  'relationship_graph',
  'blockedreason',       // Internal relationship state
  'blocked_reason',
  'rejectedreason',
  'rejected_reason',
  'suspensionreason',
  'suspension_reason',
  'internalmargin',      // Price/commercial data
  'internal_margin',
  'commercialterms',
  'commercial_terms',
  'paymentterm',
  'payment_term',
  'creditlimit',
  'credit_limit',
  'escrow',              // Financial instrument — zero AI read path
  'privatenote',         // Internal operator notes
  'private_note',
  'aidraft',             // AI draft / extraction data
  'ai_draft',
  'draftextraction',
  'draft_extraction',
  'unpublished',         // Any unpublished evidence or DPP
];

// ─── Similarity Bucketing ─────────────────────────────────────────────────────

/**
 * Convert a raw cosine similarity float to an internal categorical bucket.
 * The raw float is NEVER returned from this function — only the bucket label.
 *
 * HIGH   >= 0.80
 * MEDIUM >= 0.55
 * LOW    >= 0.30 (SEMANTIC_MIN_SIMILARITY)
 * (Candidates below 0.30 are rejected before this function is called.)
 */
function classifySimilarity(similarity: number): SupplierMatchSemanticSimilarityBucket {
  if (similarity >= HIGH_THRESHOLD) return 'HIGH';
  if (similarity >= MEDIUM_THRESHOLD) return 'MEDIUM';
  return 'LOW';
}

// ─── Candidate Guard ──────────────────────────────────────────────────────────

/**
 * Validate a single embedding candidate against all semantic guardrails.
 * Returns { passed: true } if the candidate is safe to convert to a signal.
 * Returns { passed: false, rejectionReason } otherwise.
 *
 * @internal
 */
function guardEmbeddingCandidate(
  candidate: SupplierMatchEmbeddingCandidate,
  buyerOrgId: string,
): SupplierMatchSemanticGuardResult {
  // Supplier org ID must be present
  if (
    !candidate.supplierOrgId ||
    typeof candidate.supplierOrgId !== 'string' ||
    candidate.supplierOrgId.trim() === ''
  ) {
    return { passed: false, rejectionReason: 'MISSING_SUPPLIER_ORG_ID' };
  }

  // Tenant isolation: embedding orgId must match the buyer's session orgId
  if (candidate.orgId !== buyerOrgId) {
    return { passed: false, rejectionReason: 'CROSS_TENANT_CANDIDATE' };
  }

  // Dimension must be 768 if provided
  if (candidate.dimension !== undefined && candidate.dimension !== REQUIRED_EMBEDDING_DIM) {
    return { passed: false, rejectionReason: 'INVALID_DIMENSION' };
  }

  // Embedding model must be the locked model if provided
  if (candidate.embeddingModel !== undefined && candidate.embeddingModel !== ALLOWED_EMBEDDING_MODEL) {
    return { passed: false, rejectionReason: 'INVALID_MODEL' };
  }

  // Source type must be in the allowed set
  if (!ALLOWED_SEMANTIC_SOURCE_TYPES.has(candidate.sourceType)) {
    return { passed: false, rejectionReason: 'FORBIDDEN_SOURCE_TYPE' };
  }

  // Similarity must be a valid finite number in [0, 1]
  const sim = candidate.similarity;
  if (typeof sim !== 'number' || !Number.isFinite(sim) || sim < 0 || sim > 1) {
    return { passed: false, rejectionReason: 'INVALID_SIMILARITY_VALUE' };
  }

  // Similarity must meet the minimum threshold
  if (sim < SEMANTIC_MIN_SIMILARITY) {
    return { passed: false, rejectionReason: 'BELOW_MIN_SIMILARITY' };
  }

  // Source text snippet must not contain forbidden fragments
  if (candidate.sourceTextSnippet !== undefined && candidate.sourceTextSnippet !== null) {
    const lower = candidate.sourceTextSnippet.toLowerCase();
    for (const fragment of FORBIDDEN_SOURCE_TEXT_FRAGMENTS) {
      if (lower.includes(fragment)) {
        return { passed: false, rejectionReason: 'FORBIDDEN_SOURCE_TEXT' };
      }
    }
  }

  return { passed: true };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build internal semantic signals from pre-computed embedding candidates.
 *
 * This is a pure, synchronous function. It makes no database calls, no model
 * calls, and no embedding writes. The caller is responsible for:
 *  1. Obtaining candidates via an orgId-scoped, RLS-enforced vectorStore query.
 *  2. Ensuring the buyerOrgId is derived from the authenticated JWT session
 *     (never from the request body).
 *  3. Using the returned signals as INTERNAL pipeline data only — never as
 *     buyer-facing output.
 *
 * @param input - Pre-computed candidates and the buyer org context
 * @returns Safe semantic signals with a categorical bucket, never a raw score
 */
export function buildSupplierSemanticSignals(
  input: SupplierMatchSemanticSignalInput,
): SupplierMatchSemanticSignalResult {
  const { buyerOrgId, embeddingCandidates } = input;

  // Empty buyerOrgId → safe empty result (no throw)
  if (!buyerOrgId || buyerOrgId.trim() === '') {
    return {
      signals: [],
      rejectedCandidateCount: 0,
      modelCallMade: false,
      humanConfirmationRequired: true,
    };
  }

  // Empty candidates → safe empty result (no throw)
  if (!Array.isArray(embeddingCandidates) || embeddingCandidates.length === 0) {
    return {
      signals: [],
      rejectedCandidateCount: 0,
      modelCallMade: false,
      humanConfirmationRequired: true,
    };
  }

  const signals: SupplierMatchSemanticSignal[] = [];
  let rejectedCandidateCount = 0;

  for (const candidate of embeddingCandidates) {
    const guardResult = guardEmbeddingCandidate(candidate, buyerOrgId);

    if (!guardResult.passed) {
      rejectedCandidateCount++;
      continue;
    }

    // Convert raw cosine similarity to internal bucket — raw score is NOT stored
    const similarityBucket = classifySimilarity(candidate.similarity);

    signals.push({
      supplierOrgId: candidate.supplierOrgId,
      similarityBucket,
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      matchCategory: 'SEMANTIC_FIT',
    });
  }

  return {
    signals,
    rejectedCandidateCount,
    modelCallMade: false,
    humanConfirmationRequired: true,
  };
}
