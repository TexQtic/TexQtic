/**
 * aiContextPacks.ts — AI Context Pack Type Contracts
 *
 * Bounded TypeScript interfaces for AI prompt assembly. Each interface defines the
 * exact fields that may enter an AI prompt — nothing more. Prevents accidental
 * field leakage into AI context.
 *
 * Implements TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section F.
 *
 * RULES:
 * - Type definitions only — no assembly functions, no IO.
 * - orgId is ALWAYS JWT-derived, never client-supplied.
 * - Every user-originated text field MUST be PII-scanned before assembly.
 * - All forbidden fields (price, publicationPosture, escrow*, email, grossAmount,
 *   riskScore) are explicitly excluded and documented.
 * - humanConfirmationRequired: true is a literal type, not a runtime flag —
 *   callers cannot accidentally set it to false.
 *
 * @module aiContextPacks
 */

import type { AiEmbeddingSourceType } from './aiDataContracts.js';

// ─── Shared reference type ─────────────────────────────────────────────────────

/**
 * Audit-safe reference to a retrieved similarity chunk.
 *
 * chunk content is intentionally EXCLUDED — only metadata and score are present.
 * Per piiGuard constitutional rules, chunk content must never appear in context
 * pack type definitions.
 */
export interface SimilarityResultRef {
  sourceType: AiEmbeddingSourceType;
  sourceId: string;
  similarity: number;
  // content: EXCLUDED — chunk content must not appear in context pack references
}

// ─── F.1 SupplierMatchingContext ───────────────────────────────────────────────

/**
 * Context pack for supplier-buyer semantic matching.
 *
 * Used by: TECS-AI-SUPPLIER-MATCHING-001 (future — not yet authorized)
 *
 * EXCLUDED: price, publicationPosture, cross-tenant org signals, risk_score
 */
export interface SupplierMatchingContext {
  /** JWT-derived buyer orgId — never client-supplied */
  queryOrgId: string;
  /** Buyer's requirement statement — MUST be passed through piiGuard.redactPii() before assembly */
  queryText: string;
  /** 768-dim embedding of queryText (text-embedding-004; EMBEDDING_DIM locked per ADR-028 §5.1) */
  queryEmbedding: number[];
  /** RAG_TOP_K = 5 */
  topK: 5;
  /** RAG_MIN_SIMILARITY = 0.30 */
  minSimilarity: 0.3;
  /** Scoped to catalog item vectors only */
  sourceType: 'CATALOG_ITEM';
  /** Retrieved chunks — max MAX_CONTEXT_CHUNKS (3); NO chunk content exposed */
  retrievedChunks: SimilarityResultRef[];
  // price: EXCLUDED — constitutionally forbidden from all AI paths
  // publicationPosture: EXCLUDED — constitutionally forbidden from all AI paths
  // risk_score: EXCLUDED — control-plane only; tenant AI hard boundary
}

// ─── F.2 RFQDraftingContext ────────────────────────────────────────────────────

/**
 * Context pack for AI-assisted RFQ message drafting.
 *
 * Used by: TECS-AI-RFQ-INTELLIGENCE-001 (future — not yet authorized)
 *
 * EXCLUDED: price, escrow data, cross-tenant data
 * REQUIRED: humanConfirmationRequired = true before draft is sent
 */
export interface RFQDraftingContext {
  /** JWT-derived buyer orgId */
  buyerOrgId: string;
  /** Supplier orgId (from RFQ target) */
  supplierOrgId: string;
  /** UUID of the catalog item being quoted */
  catalogItemId: string;
  /** buildCatalogItemVectorText() output — no price, no publicationPosture */
  catalogItemText: string;
  /** catalogItemAttributeCompleteness() score [0,1] — transient; never stored */
  completenessScore: number;
  /** Buyer's free-text requirement — MUST be passed through piiGuard.redactPii() before assembly */
  buyerRequirementText: string;
  /** Relevant catalog/cert vectors — max MAX_CONTEXT_CHUNKS (3); no chunk content */
  retrievedChunks: SimilarityResultRef[];
  /** Human must confirm before send — literal true enforces this at the type level */
  humanConfirmationRequired: true;
  // price: EXCLUDED — constitutionally forbidden
  // escrow*: EXCLUDED — constitutionally forbidden
}

// ─── F.3 SupplierProfileCompletenessContext ───────────────────────────────────

/**
 * Minimal catalog item summary for AI completeness analysis.
 * price and publicationPosture are constitutionally excluded.
 */
export interface CatalogItemSummary {
  id: string;
  sku: string;
  name: string;
  catalogStage: string;
  /** Stage-specific attributes — allowed and required for completeness analysis */
  stageAttributes: Record<string, unknown>;
  material?: string | null;
  composition?: string | null;
  moq?: number | null;
  // price: EXCLUDED — constitutionally forbidden
  // publicationPosture: EXCLUDED — constitutionally forbidden
}

/**
 * Minimal certification summary for AI context packs.
 * No PII, no financial data, no lifecycle state that AI may write.
 */
export interface CertificationSummary {
  id: string;
  certificationType: string;
  expiresAt: Date | null;
  // No email, no actor PII, no financial fields
}

/**
 * Context pack for supplier profile completeness reporting.
 *
 * Used by: TECS-AI-PROFILE-COMPLETENESS-001 (future — not yet authorized)
 *
 * EXCLUDED: price, publicationPosture, user PII, escrow data
 */
export interface SupplierProfileCompletenessContext {
  /** JWT-derived supplier orgId */
  orgId: string;
  /** AI-safe catalog item summaries — price and publicationPosture excluded */
  catalogItems: CatalogItemSummary[];
  /** Certification metadata — type and expiry only; no financial data, no PII */
  certifications: CertificationSummary[];
  /** itemId → completeness score [0,1] from catalogItemAttributeCompleteness() — transient; never stored */
  completenessScores: Record<string, number>;
  /** stage → item count breakdown */
  stageBreakdown: Record<string, number>;
  // price: EXCLUDED
  // publicationPosture: EXCLUDED
  // User PII: EXCLUDED
  // escrow*: EXCLUDED
}

// ─── F.4 DocumentExtractionContext ────────────────────────────────────────────

/**
 * Context pack for AI-assisted document extraction (certification / DPP).
 *
 * Used by: TECS-AI-DOCUMENT-INTELLIGENCE-001 (future — not yet authorized)
 *
 * EXCLUDED: price, financial data, cross-tenant data
 * REQUIRED: humanReviewRequired = true before any entity write
 */
export interface DocumentExtractionContext {
  /** JWT-derived orgId */
  orgId: string;
  /** Source type for embedding storage */
  documentSourceType: 'CERTIFICATION' | 'DPP_SNAPSHOT';
  /** Raw extracted text — MUST be passed through piiGuard.redactPii() before AI use */
  documentText: string;
  /** UUID of the entity to be updated after human review confirms extracted fields */
  targetEntityId: string;
  /** Entity type for the target update */
  targetEntityType: 'Certification' | 'TraceabilityNode';
  /** Human must review extracted fields before any write — literal true enforces this */
  humanReviewRequired: true;
  // price: EXCLUDED
  // financial data: EXCLUDED
  // cross-tenant data: EXCLUDED
}

// ─── F.5 WorkflowAssistantContext ─────────────────────────────────────────────

/**
 * Context pack for AI-assisted trade workflow suggestions.
 *
 * Used by: TECS-AI-TRADE-WORKFLOW-ASSISTANT-001 (future — not yet authorized)
 *
 * EXCLUDED: grossAmount, escrow data, price data
 * REQUIRED: humanConfirmationRequired = true; no autonomous state writes.
 * D-020-C: aiTriggered = true must be set only AFTER human confirmation.
 */
export interface WorkflowAssistantContext {
  /** JWT-derived orgId */
  orgId: string;
  /** Trade being assisted */
  tradeId: string;
  /** Current lifecycle state — read-only context for suggestion */
  currentLifecycleState: string;
  /** Available transitions from AllowedTransition table — read-only */
  allowedTransitions: string[];
  /** Trade reference number */
  tradeReference: string;
  /** Buyer orgId (context only — not used for cross-tenant access) */
  buyerOrgId: string;
  /** Seller orgId (context only — not used for cross-tenant access) */
  sellerOrgId: string;
  /** Human must confirm before any transition — literal true enforces this */
  humanConfirmationRequired: true;
  // grossAmount: EXCLUDED — constitutionally forbidden from all AI context
  // escrow*: EXCLUDED — constitutionally forbidden from all AI context
  // price: EXCLUDED — constitutionally forbidden
}

// ─── F.6 MarketIntelligenceContext ────────────────────────────────────────────

/**
 * Context pack for operator-only market intelligence.
 *
 * Used by: TECS-AI-MARKET-INTELLIGENCE-001 (future — not yet authorized)
 * CONTROL-PLANE ONLY — no tenant access.
 *
 * EXCLUDED: price data, individual user PII, risk_score (shown via org management surface only)
 */
export interface MarketIntelligenceContext {
  /** Super-admin actor ID — never tenant-derived */
  adminActorId: string;
  /** Optional: per-org targeted insight (admin context only) */
  targetOrgId?: string;
  /** Aggregated cross-tenant signals — no individual pricing, no PII */
  aggregatedSignals: {
    totalActiveItems: number;
    stageDistribution: Record<string, number>;
    /** Certification coverage ratio [0–1] */
    certificationCoverage: number;
    // price data: EXCLUDED — constitutionally forbidden
    // individual PII: EXCLUDED
    // risk_score: EXCLUDED from AI output (shown via org management surface only)
  };
}

// ─── F.7 TrustScoreContext ────────────────────────────────────────────────────

/**
 * Context pack for operator-only AI-assisted trust scoring.
 *
 * Used by: TECS-AI-TRUST-SCORE-001 (future — not yet authorized)
 * CONTROL-PLANE ONLY — no tenant access.
 *
 * EXCLUDED: escrow balances, individual user PII
 * REQUIRED: trust score is a SUGGESTION ONLY — human operator action required
 *   to update organizations.risk_score. AI must never auto-update it.
 */
export interface TrustScoreContext {
  /** Super-admin actor ID — never tenant-derived */
  adminActorId: string;
  /** Org being scored */
  targetOrgId: string;
  /** Certification metadata — type and expiry only */
  certificationStatus: CertificationSummary[];
  /** Trade history summary — aggregated counts only */
  tradeHistorySummary: {
    totalTrades: number;
    completedTrades: number;
    disputedTrades: number;
  };
  /** Sanction status — RESTRICTIVE RLS; admin SELECT only */
  sanctionStatus: 'CLEAR' | 'ACTIVE' | 'DECAYED';
  // escrow balances: EXCLUDED — constitutionally forbidden
  // individual user PII: EXCLUDED
  // trust score computed by AI is a SUGGESTION — human must confirm before risk_score update
}

// ─── F.8 RFQAssistantContext ──────────────────────────────────────────────────

/**
 * Context pack for AI-assisted RFQ requirement suggestion.
 *
 * Used by: TECS-AI-RFQ-ASSISTANT-MVP-001 (AUTHORIZED — DESIGN_COMPLETE 2026-04-25)
 *
 * EXCLUDED:
 *   price / item_unit_price — constitutionally forbidden; AI must not price-match
 *   publicationPosture — constitutionally forbidden from all AI paths
 *   deliveryLocation — PII risk
 *   targetDeliveryDate — scheduling sensitivity; not needed for field suggestions
 *   requirementConfirmedAt — internal audit field; AI has no authority over it
 *   escrow* / grossAmount — financial; AI has zero authority
 *   User.email / User.name — PII; must never enter a prompt
 *
 * REQUIRED: humanConfirmationRequired = true — buyer must confirm all suggestions
 * before any RFQ mutation is applied. AI does NOT write to the rfqs table.
 */
export interface RFQAssistantContext {
  /** JWT-derived buyer orgId — never client-supplied */
  buyerOrgId: string;
  /** UUID of the RFQ being assisted */
  rfqId: string;
  /** Current RFQ status — read-only context; AI has no authority to change status */
  rfqStatus: string;
  /** assembleStructuredRfqRequirementSummaryText() output — price and PII excluded */
  structuredRequirementText: string;
  /** UUID of the catalog item targeted by this RFQ */
  catalogItemId: string;
  /** Catalog item stage (e.g. FABRIC_WOVEN, GARMENT) — for stage-aware prompting */
  catalogItemStage: string | null;
  /** buildCatalogItemVectorText() output — price and publicationPosture excluded */
  catalogItemText: string;
  /** catalogItemAttributeCompleteness() score [0,1] — transient; never stored */
  catalogCompletenessScore: number;
  /** Supplier orgId (from RFQ target) — for context only; no cross-tenant access */
  supplierOrgId: string;
  /** Relevant catalog/cert vectors — max MAX_CONTEXT_CHUNKS (3); no chunk content */
  retrievedChunks: SimilarityResultRef[];
  /** Human must confirm before any RFQ mutation — literal true enforces this at the type level */
  humanConfirmationRequired: true;
  // price: EXCLUDED — constitutionally forbidden
  // item_unit_price: EXCLUDED — constitutionally forbidden
  // publicationPosture: EXCLUDED — constitutionally forbidden
  // deliveryLocation: EXCLUDED — PII risk
  // targetDeliveryDate: EXCLUDED — scheduling sensitivity
  // requirementConfirmedAt: EXCLUDED — internal audit field
  // escrow*: EXCLUDED — constitutionally forbidden
  // grossAmount: EXCLUDED — constitutionally forbidden
  // User.email: EXCLUDED — PII
  // User.name: EXCLUDED — PII
}
