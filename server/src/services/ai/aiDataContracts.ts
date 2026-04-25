/**
 * aiDataContracts.ts — AI Foundation Data Boundary Constants
 *
 * Constitutional AI data access matrix, forbidden data classes, action boundaries,
 * storage artifact types, and context pack types for the TexQtic AI layer.
 *
 * Implements TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Sections A, B, C, E, F.
 *
 * RULES:
 * - Pure constants and enums — no IO, no DB calls, no provider calls.
 * - price and publicationPosture are CONSTITUTIONALLY FORBIDDEN from all AI paths.
 * - escrow data has zero AI read path.
 * - risk_score is operator-only (control-plane AI only; tenant AI forbidden).
 * - Embedding dimension (768) is hard-locked per ADR-028 §5.1.
 *
 * @module aiDataContracts
 */

// ─── Section A: AI-Readable Data Classes ──────────────────────────────────────

/**
 * Data classes that AI paths may read, embed, and use in prompts.
 * Sourced from the constitutional access matrix (Section A).
 *
 * NOTE: price and publicationPosture are intentionally absent — they are
 * constitutionally forbidden from all AI paths.
 */
export const AI_READABLE_DATA_CLASSES = [
  'CatalogItem.name',
  'CatalogItem.sku',
  'CatalogItem.description',
  'CatalogItem.catalogStage',
  'CatalogItem.stageAttributes',
  'CatalogItem.productCategory',
  'CatalogItem.fabricType',
  'CatalogItem.gsm',
  'CatalogItem.material',
  'CatalogItem.composition',
  'CatalogItem.color',
  'CatalogItem.widthCm',
  'CatalogItem.construction',
  'CatalogItem.certifications',
  'CatalogItem.moq',
  'Certification.certificationType',
  'Certification.issuedAt',
  'Certification.expiresAt',
  'Certification.lifecycleStateId',
  'Organization.legalName',
  'Organization.jurisdiction',
  'Organization.orgType',
  'Organization.primarySegmentKey',
  'TraceabilityNode.meta',
  'Rfq.buyerMessage',
  'RfqSupplierResponse.message',
  'Trade.tradeReference',
  'Trade.currentLifecycleState',
] as const;

export type AiReadableDataClass = (typeof AI_READABLE_DATA_CLASSES)[number];

// ─── Section B: Absolutely Forbidden Data Classes ──────────────────────────────

/**
 * Data classes ABSOLUTELY FORBIDDEN from all AI paths — including prompt input,
 * RAG context, embedding ingestion, model output, and storage.
 *
 * No exceptions without explicit owner authorization and a new governance decision.
 */
export const AI_FORBIDDEN_DATA_CLASSES = [
  'CatalogItem.price',            // Price disclosure is Phase 3+; AI must never infer or reveal pricing
  'CatalogItem.publicationPosture', // Controls B2C/B2B visibility; AI must not use as filter or signal
  'escrow_accounts.*',            // Financial instrument; AI has zero authority over escrow state
  'escrow_transactions.*',        // Financial transaction record; AI must not process or summarize
  'organizations.risk_score',     // Control-plane only; tenant AI hard boundary
  'User.email',                   // PII — must never enter a prompt
  'User.name',                    // PII — must not appear in prompt content
  'RefreshToken.*',               // Auth credentials
  'PasswordResetToken.*',         // Auth credentials
] as const;

export type AiForbiddenDataClass = (typeof AI_FORBIDDEN_DATA_CLASSES)[number];

/**
 * Explicit forbidden field names used by runtime guard helpers.
 * These are the actual object-key names checked at the service boundary.
 *
 * Must cover all forbidden data classes above plus their common variants.
 */
export const AI_FORBIDDEN_FIELD_NAMES = [
  'price',
  'publicationPosture',
  'escrow',
  'escrowAccount',
  'escrowAccounts',
  'escrowTransaction',
  'escrowTransactions',
  'email',
  'phone',
  'password',
  'refreshToken',
  'passwordResetToken',
  'riskScore',
  'risk_score',
  'grossAmount',
] as const;

export type AiForbiddenFieldName = (typeof AI_FORBIDDEN_FIELD_NAMES)[number];

// ─── Section C: AI Action Boundary ─────────────────────────────────────────────

/**
 * Complete action vocabulary for the TexQtic AI layer.
 * Classifies each action as ALLOWED, ALLOWED_WITH_CONSTRAINTS, or FORBIDDEN.
 */
export const AI_ACTION_BOUNDARY = {
  ALLOWED: [
    'READ',       // Retrieve stored embeddings/vectors (orgId-scoped, RLS-enforced)
    'SUMMARIZE',  // Generate natural-language summary of catalog/cert/supplier data
    'EXPLAIN',    // Narrate why a match/suggestion was produced
  ],
  ALLOWED_WITH_CONSTRAINTS: [
    'EXTRACT',    // Pull structured fields from unstructured document text (human review required)
    'SUGGEST',    // Propose a value (human confirmation required before any write)
    'RANK',       // Order suppliers/items by match quality (similarity scores required)
    'WARN',       // Flag a risk, completeness gap, or expiry (must cite triggering field)
    'DRAFT',      // Generate draft RFQ message or summary text (PII guard + human review)
    'AUTOFILL',   // Populate form field from context (human must confirm; confidence < 0.7 → uncertainty)
  ],
  FORBIDDEN: [
    'DECIDE',                     // AI has zero autonomous decision authority
    'EXECUTE',                    // Every AI-influenced state change requires D-020-C + human confirmation
    'ACCESS_PRICE_DATA',          // Constitutionally excluded from all AI paths
    'ACCESS_ESCROW_DATA',         // Financial instrument; zero AI read path
    'READ_CROSS_TENANT_VECTORS',  // RLS enforcement; architectural impossibility
    'EMIT_AI_EVENTS_BLOCKING',    // All AI event emission is best-effort / non-blocking
  ],
} as const;

export type AllowedAiAction = (typeof AI_ACTION_BOUNDARY.ALLOWED)[number];
export type AllowedWithConstraintsAiAction = (typeof AI_ACTION_BOUNDARY.ALLOWED_WITH_CONSTRAINTS)[number];
export type ForbiddenAiAction = (typeof AI_ACTION_BOUNDARY.FORBIDDEN)[number];

// ─── Section E: AI Storage Artifact Types ──────────────────────────────────────

/**
 * Artifact types that may be persisted to AI storage tables.
 *
 * FUTURE_SCHEMA_GATE_REQUIRED artifacts are defined as contracts only.
 * Each requires a governance-approved SQL migration + Prisma db pull + generate + RLS policy.
 * No schema changes are authorized by this constants file.
 */
export const AI_STORAGE_ARTIFACT_TYPES = {
  LIVE: [
    'DocumentEmbedding',  // orgId-scoped, FORCE RLS, 768-dim vectors
    'ReasoningLog',       // Full AI audit backbone; per tenant inference call
    'AiUsageMeter',       // Per-tenant monthly token/cost metering
  ],
  FUTURE_SCHEMA_GATE_REQUIRED: [
    'ai_suggestion',                  // Generic AI suggestion before human acceptance
    'ai_extraction',                  // Structured fields extracted from a document
    'ai_ranking_snapshot',            // Point-in-time supplier ranking result
    'ai_profile_completeness_report', // Persisted completeness report (if promoted from transient)
    'ai_requirement_parse',           // Parsed buyer requirement from free text
    'ai_document_parse',              // Parsed certification or traceability document
    'ai_operator_insight',            // Platform-level insight for super-admin (control-plane only)
  ],
} as const;

// ─── Section F: AI Context Pack Types ──────────────────────────────────────────

/**
 * Context pack type identifiers.
 * Full interface definitions are in aiContextPacks.ts.
 */
export const AI_CONTEXT_PACK_TYPES = [
  'SupplierMatchingContext',
  'RFQDraftingContext',
  'SupplierProfileCompletenessContext',
  'DocumentExtractionContext',
  'WorkflowAssistantContext',
  'MarketIntelligenceContext',
  'TrustScoreContext',
] as const;

export type AiContextPackType = (typeof AI_CONTEXT_PACK_TYPES)[number];

// ─── RAG Constants (contract reference) ───────────────────────────────────────

/**
 * RAG retrieval constants.
 * Mirrors ragContextBuilder.ts — defined here as contract reference for tests
 * and context pack type validation.
 */
export const AI_RAG_CONSTANTS = {
  TOP_K: 5,
  MIN_SIMILARITY: 0.30,
  MAX_CONTEXT_CHUNKS: 3,
  MAX_INJECTED_CHARS: 3_000,
  EMBEDDING_DIM: 768, // HARD-LOCKED per ADR-028 §5.1
} as const;

// ─── Rate and Idempotency Constants (contract reference) ──────────────────────

/**
 * AI rate limiting and idempotency constants.
 * Mirrors inferenceService.ts — defined here for contract reference.
 */
export const AI_RATE_CONSTANTS = {
  RATE_LIMIT_PER_MINUTE: 60,
  IDEMPOTENCY_WINDOW_MS: 24 * 60 * 60 * 1_000,
} as const;

// ─── ReasoningLog Summary Limits ───────────────────────────────────────────────

/**
 * Character limits for ReasoningLog and explainability output fields.
 * See Section D.2 of the design document.
 */
export const AI_REASONING_LOG_LIMITS = {
  PROMPT_SUMMARY_MAX_CHARS: 500,
  RESPONSE_SUMMARY_MAX_CHARS: 500,
  REASONING_SUMMARY_MAX_CHARS: 200,
} as const;

// ─── Embedding Source Types ────────────────────────────────────────────────────

/**
 * Valid source types for DocumentEmbedding records.
 * Mirrors vectorIngestion.ts source type values.
 */
export const AI_EMBEDDING_SOURCE_TYPES = [
  'CATALOG_ITEM',
  'CERTIFICATION',
  'DPP_SNAPSHOT',
  'SUPPLIER_PROFILE', // Future — not yet implemented
] as const;

export type AiEmbeddingSourceType = (typeof AI_EMBEDDING_SOURCE_TYPES)[number];
