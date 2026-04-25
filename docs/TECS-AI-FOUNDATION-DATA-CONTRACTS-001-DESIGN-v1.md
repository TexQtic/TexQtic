# TECS-AI-FOUNDATION-DATA-CONTRACTS-001 — Design v1

**Type:** Design Artifact  
**Status:** DESIGN_COMPLETE  
**Date:** 2026-04-25  
**Governance:** G-028 constitutional layer (vector, inference, budget, audit)  
**Scope:** Design only — no implementation. Defines data contracts, boundaries, read models, and future implementation roadmap for the TexQtic constitutional AI layer.  
**Next action:** Implementation units to be selected and authorized by Paresh explicitly per each section.

---

## Index

- [A. AI Data Access Boundary](#a-ai-data-access-boundary)
- [B. AI Forbidden Data / Hidden Data](#b-ai-forbidden-data--hidden-data)
- [C. AI Action Boundary](#c-ai-action-boundary)
- [D. AI Explainability Contract](#d-ai-explainability-contract)
- [E. AI Storage Contract](#e-ai-storage-contract)
- [F. AI Read Models / Context Packs](#f-ai-read-models--context-packs)
- [G. Supplier-Buyer Matching Foundation](#g-supplier-buyer-matching-foundation)
- [H. RFQ Intelligence Foundation](#h-rfq-intelligence-foundation)
- [I. Supplier Profile Completeness Foundation](#i-supplier-profile-completeness-foundation)
- [J. Document Intelligence Foundation](#j-document-intelligence-foundation)
- [K. Trade Workflow Assistant Foundation](#k-trade-workflow-assistant-foundation)
- [L. Market Intelligence Foundation (operator-only)](#l-market-intelligence-foundation-operator-only)
- [M. Trust Score Foundation](#m-trust-score-foundation)
- [N. Tenant / RLS / Security Contract](#n-tenant--rls--security-contract)
- [O. Audit / Observability Contract](#o-audit--observability-contract)
- [P. AI Provider / Model Abstraction](#p-ai-provider--model-abstraction)
- [Q. Future Implementation Roadmap](#q-future-implementation-roadmap)

---

## Repo Truth Baseline (at design date)

This design is grounded in the following confirmed repo truths:

| Fact | Source |
|------|--------|
| Embedding model: `text-embedding-004`, dim **768 LOCKED** | `vectorEmbeddingClient.ts`, ADR-028 §5.1 |
| Inference model: `gemini-1.5-flash` (Gemini as AI provider) | `inferenceService.ts`, `eventSchemas.ts` line 256 |
| `GEMINI_API_KEY` required in server config | `server/src/config/index.ts` |
| Feature flag: `OP_G028_VECTOR_ENABLED` gates RAG retrieval | `ragContextBuilder.ts` |
| `DocumentEmbedding` table: orgId-scoped, RLS FORCE, 768-dim | `schema.prisma` |
| `ReasoningLog` table: full AI audit backbone | `schema.prisma` |
| `AiBudget` + `AiUsageMeter`: per-tenant cost control | `schema.prisma` |
| RAG constants: TOP_K=5, MIN_SIMILARITY=0.30, MAX_CHUNKS=3, MAX_INJECTED_CHARS=3000 | `ragContextBuilder.ts` |
| `price` + `publicationPosture` explicitly excluded from vector text | `tenant.ts` `buildCatalogItemVectorText()` comment |
| `catalogItemAttributeCompleteness()` returns [0,1], **not stored** (AI context metadata only) | `tenant.ts` comment |
| `aiTriggered` field pattern on: `TradeLifecycleLog`, `EscrowLifecycleLog`, `CertificationLifecycleLog`, `PendingApproval` | `schema.prisma` |
| Rate limit: 60 req/min per tenant; idempotency window: 24h | `inferenceService.ts` |
| PII guard: deterministic regex-based, pre-send redaction + post-receive scan | `piiGuard.ts` |
| Tenant inference service (TIS): budget-enforced, rate-limited, separate from control-plane | `inferenceService.ts` |
| Control-plane inference: no `reasoning_logs`, admin audit `metadataJson` only | `controlPlaneInferenceService.ts` |
| Source types: `CATALOG_ITEM`, `DPP_SNAPSHOT`, `CERTIFICATION` | `vectorIngestion.ts` |
| Ingestion: chunk → embed → upsert (idempotent ON CONFLICT DO NOTHING) | `vectorIngestion.ts` |
| All vector similarity via `$queryRaw` — Prisma does not support `<=>` | `vectorStore.ts` |
| `vectorShadowQuery.ts` note: ingestion pipeline "not yet built" for some paths | `vectorShadowQuery.ts` line 80 |
| Tenant boundary: `org_id` — canonical; app.org_id GUC; set via `withDbContext` | `rls-policy.md` |
| AI escrow authority: **zero** — human confirmation mandatory on all state transitions | `schema.prisma` D-020-C comment |

---

## A. AI Data Access Boundary

This table is the **constitutional access matrix**. It defines every data class, what AI may do with it, visibility rules, and audit requirements.

| Data Class | DB Source | AI Readable | AI May Use in Prompt | AI May Store in Embedding | AI Forbidden | Tenant-Scoped | Audit Required |
|---|---|---|---|---|---|---|---|
| `CatalogItem.name` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes (vector upsert event) |
| `CatalogItem.sku` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.description` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.catalogStage` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.stageAttributes` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.productCategory` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.fabricType` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.gsm` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.material` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.composition` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.color` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.widthCm` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.construction` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.certifications` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `CatalogItem.moq` | `catalog_items` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| **`CatalogItem.price`** | `catalog_items` | ❌ | ❌ | ❌ | **FORBIDDEN from all AI paths** | ✅ orgId | N/A |
| **`CatalogItem.publicationPosture`** | `catalog_items` | ❌ | ❌ | ❌ | **FORBIDDEN from all AI paths** | ✅ orgId | N/A |
| `Certification.certificationType` | `certifications` | ✅ | ✅ | ✅ | — | ✅ orgId | Yes |
| `Certification.issuedAt` / `expiresAt` | `certifications` | ✅ | ✅ | ⚠️ metadata only | — | ✅ orgId | Yes |
| `Certification.lifecycleStateId` | `certifications` | ✅ read-only | ✅ context only | ❌ | No state writes | ✅ orgId | Yes |
| `organizations.legal_name` | `organizations` | ✅ | ✅ | ✅ supplier context | — | — (public row) | Yes |
| `organizations.jurisdiction` | `organizations` | ✅ | ✅ | ✅ | — | — | Yes |
| `organizations.org_type` | `organizations` | ✅ | ✅ | ✅ | — | — | Yes |
| `organizations.primary_segment_key` | `organizations` | ✅ | ✅ | ✅ | — | — | Yes |
| **`organizations.risk_score`** | `organizations` | ⚠️ operator-only | ⚠️ control-plane AI only | ❌ | Tenant AI forbidden | Admin-scoped | Yes |
| `TraceabilityNode.meta` | `traceability_nodes` | ✅ | ✅ | ✅ (DPP_SNAPSHOT type) | — | ✅ orgId | Yes |
| `Rfq.buyerMessage` | `rfqs` | ✅ (buyer-own only) | ✅ (RFQ drafting context) | ❌ | Cross-tenant read forbidden | ✅ orgId | Yes |
| `RfqSupplierResponse.message` | `rfq_supplier_responses` | ✅ (own RFQ only) | ✅ (negotiation context) | ❌ | Cross-tenant read forbidden | ✅ orgId | Yes |
| `Trade.*` | `trades` | ⚠️ read-only context | ⚠️ workflow-assistant only | ❌ | No state writes, no amount inference | ✅ orgId | Yes |
| **`escrow_accounts.*`** | `escrow_accounts` | ❌ | ❌ | ❌ | **FORBIDDEN from all AI paths** | ✅ orgId | N/A |
| **`escrow_transactions.*`** | `escrow_transactions` | ❌ | ❌ | ❌ | **FORBIDDEN from all AI paths** | ✅ orgId | N/A |
| `User.email` | `users` | ❌ | ❌ | ❌ | **FORBIDDEN — PII** | ✅ orgId | N/A |
| `User.name` | `users` | ⚠️ actor audit only | ❌ (no prompt injection) | ❌ | Forbidden in prompt content | ✅ orgId | N/A |
| `ReasoningLog.*` | `reasoning_logs` | ✅ (read-back for audit) | ❌ | ❌ | No self-referential prompts | ✅ orgId | Yes |
| `AiBudget.*` | `ai_budgets` | ⚠️ enforcement read | ❌ | ❌ | Not in AI prompt context | ✅ orgId | Yes |

**Boundary note (confirmed from codebase):** `price` and `publicationPosture` are explicitly excluded in `buildCatalogItemVectorText()` with a code-level comment. This exclusion is **constitutional** — no future implementation unit may add these fields to any AI prompt, embedding text, RAG context, or AI suggestion output.

---

## B. AI Forbidden Data / Hidden Data

The following data classes are **absolutely forbidden** from all AI paths — including prompt input, RAG context, embedding ingestion, model output, and storage. No exceptions without explicit owner authorization and a new governance decision.

### B.1 Commercially Sensitive

| Field | Reason | Enforcement |
|-------|---------|-------------|
| `CatalogItem.price` | Price disclosure is Phase 3+; AI must never infer, suggest, or reveal pricing | Excluded from `buildCatalogItemVectorText()`; must also be excluded from all future AI context packs |
| `CatalogItem.publicationPosture` | Publication posture controls B2C/B2B visibility; AI must not use it as filter or signal | Excluded from `buildCatalogItemVectorText()` |
| `escrow_accounts.*` | Financial instrument; AI has zero authority over escrow state | Zero AI access — no read path |
| `escrow_transactions.*` | Financial transaction record; AI must not process or summarize | Zero AI access — no read path |
| `organizations.risk_score` | Risk scoring is control-plane only; tenant AI must never see a supplier's risk_score | Tenant AI hard boundary; control-plane AI may use in admin insight context only |

### B.2 PII / Personal Data

| Field | Reason | Enforcement |
|-------|---------|-------------|
| `User.email` | Personal email is PII; must never enter a prompt | `piiGuard.ts` pre-send redaction (EMAIL pattern) |
| `User.name` (personal) | Personal name is PII if identifiable | `piiGuard.ts` redaction; must not appear in prompt content |
| Any phone number in free text | PII | `piiGuard.ts` PHONE pattern |
| `Rfq.buyerMessage` free text (if PII present) | Buyer messages may contain email/phone/address | `piiGuard.ts` pre-send scan required before any AI use |

### B.3 Auth / Credentials

| Field | Reason |
|-------|---------|
| `RefreshToken.*` | Auth credentials |
| `PasswordResetToken.*` | Auth credentials |
| `Membership.role` (in prompt context) | Role must not be prompt-injectable |

### B.4 Cross-Tenant Data

Any data from a different `org_id` than the authenticated tenant is forbidden from all tenant-plane AI paths. The RLS `FORCE RLS` on `document_embeddings` + `app.org_id` GUC is the enforcement layer. Cross-tenant vector queries are constitutionally impossible in the current architecture.

---

## C. AI Action Boundary

The following matrix defines the complete action vocabulary for the TexQtic AI layer and classifies each action as **ALLOWED**, **ALLOWED-WITH-CONSTRAINTS**, or **FORBIDDEN**.

| Action | Classification | Constraints |
|--------|----------------|-------------|
| **READ** — retrieve stored embeddings/vectors | ALLOWED | orgId-scoped, RLS-enforced, feature-flag gated |
| **SUMMARIZE** — generate a natural-language summary of catalog/cert/supplier data | ALLOWED | Input must pass PII guard; output must be scanned for PII leak |
| **EXTRACT** — pull structured fields from unstructured document text | ALLOWED-WITH-CONSTRAINTS | Human review required before storing extracted values; confidence score required |
| **SUGGEST** — propose a value (e.g., missing field, RFQ draft line, supplier match) | ALLOWED-WITH-CONSTRAINTS | Suggestion must be labeled as AI-generated; human confirmation required before any write |
| **RANK** — order a list of suppliers or catalog items by match quality | ALLOWED-WITH-CONSTRAINTS | Ranking must include similarity scores; must not expose cross-tenant signals |
| **EXPLAIN** — narrate why a match/suggestion was produced | ALLOWED | Must reference only the injected context fields; no hallucinated sources |
| **WARN** — flag a risk, completeness gap, or expiry | ALLOWED-WITH-CONSTRAINTS | Warning must cite the specific field/condition that triggered it |
| **DRAFT** — generate a draft RFQ message, negotiation note, or summary text | ALLOWED-WITH-CONSTRAINTS | PII guard required; draft must be presented for human review before send |
| **AUTOFILL** — populate a form field from structured context | ALLOWED-WITH-CONSTRAINTS | Human must confirm autofill before write; confidence < 0.7 must show uncertainty |
| **DECIDE** — autonomously choose an outcome affecting a trade, escrow, or lifecycle state | **FORBIDDEN** | AI has zero autonomous decision authority over trade/escrow/lifecycle state transitions |
| **EXECUTE** — trigger any system action, state change, or external API call autonomously | **FORBIDDEN** | Every AI-influenced state change requires `aiTriggered=true` + mandatory human confirmation (the `D-020-C` pattern) |
| **ACCESS price data** | **FORBIDDEN** | Constitutionally excluded from all AI paths |
| **ACCESS escrow data** | **FORBIDDEN** | Financial instrument; zero AI read path |
| **Read cross-tenant vectors** | **FORBIDDEN** | RLS enforcement; architectural impossibility |
| **EMIT AI events outside best-effort wrapper** | **FORBIDDEN** | All AI event emission is `best-effort` / `non-blocking`; must never block the primary flow |

### C.1 D-020-C Pattern (MANDATORY for AI-influenced state transitions)

When AI output precedes any lifecycle state transition (trade, escrow, certification, approval), the `aiTriggered` field MUST be set to `true` and the transition reason MUST contain:

```
AI_RECOMMENDED: <summary> — HUMAN_CONFIRMED by <actorId>
```

This pattern is already established in `TradeLifecycleLog`, `EscrowLifecycleLog`, `CertificationLifecycleLog`, and `PendingApproval`. All future lifecycle-touching AI features must follow this pattern without exception.

---

## D. AI Explainability Contract

Every AI output delivered to a tenant must include the following explainability fields. Outputs that lack required fields must be rejected at the service boundary before returning to the route handler.

### D.1 Required Fields per AI Output Type

| Output Type | Required Explainability Fields |
|-------------|-------------------------------|
| Supplier match result | `matchScore` [0–1], `matchedFields[]` (list of fields that contributed), `missingFields[]` (fields that would improve match), `sourceChunks[]` (sourceType + sourceId, NOT chunk content), `reasoningSummary` (≤ 200 chars), `humanConfirmationRequired: true` |
| Catalog completeness report | `completenessScore` [0–1], `presentFields[]`, `missingFields[]`, `suggestedActions[]`, `stageApplied` (which stage schema was used), `notStored: true` (score is transient) |
| RFQ draft suggestion | `draftConfidence` [0–1], `fieldsUsed[]`, `uncertainFields[]` (where confidence < 0.7), `piiScanned: true`, `humanReviewRequired: true` |
| Document extraction result | `extractionConfidence` [0–1], `extractedFields{}`, `uncertainExtractions[]`, `sourceDocId`, `humanReviewRequired: true` |
| Negotiation insight | `insightBasis[]` (which context signals were used), `ragContextInjected: boolean`, `ragChunksUsed: number`, `reasoningSummary`, `piiScanned: true` |
| Trade workflow suggestion | `suggestionType`, `relevantState` (current lifecycle state), `suggestedNextState` (if applicable), `aiTriggered: true` (must be set on any write path), `humanConfirmationRequired: true` |
| Risk / expiry warning | `warningType`, `triggeredByField`, `triggeredByValue`, `severity` [LOW/MEDIUM/HIGH], `recommendedAction` |

### D.2 ReasoningLog Fields (mandatory for all tenant AI inference calls)

Every tenant inference call that succeeds must write a `ReasoningLog` row via the existing `inferenceService.ts` pattern:

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | ✅ | JWT-derived orgId; never client-supplied |
| `requestId` | ✅ | Correlates to the originating HTTP request |
| `reasoningHash` | ✅ | SHA-256 of (model + promptSummary); for deduplication |
| `model` | ✅ | e.g., `gemini-1.5-flash` |
| `promptSummary` | ✅ | ≤ 500 chars; NO raw user text; NO PII; NO chunk content |
| `responseSummary` | ✅ | ≤ 500 chars; NO raw model output; PII-scanned before storage |
| `tokensUsed` | ✅ | For budget accounting via `AiUsageMeter` |
| `adminActorId` | — | Control-plane only; null for tenant calls |
| `requestFingerprint` | ✅ | For idempotency window deduplication |
| `requestBucketStart` | ✅ | 24h idempotency bucket start timestamp |

**Note:** Control-plane (super-admin) inference does NOT write to `reasoning_logs`. It persists reasoning summary in admin audit `metadataJson` only. This is a constitutional boundary, not a gap.

---

## E. AI Storage Contract

This section defines which AI-generated artifacts may be persisted, where, and under what constraints.

### E.1 Embeddings (DocumentEmbedding)

| Field | Constraint |
|-------|-----------|
| `sourceType` | One of `CATALOG_ITEM` / `CERTIFICATION` / `DPP_SNAPSHOT` / `SUPPLIER_PROFILE` (future) |
| `sourceId` | UUID of the originating entity |
| `chunkIndex` | 0-indexed; max determined by `MAX_CHUNKS_PER_DOC` |
| `content` | Full chunk text — stored for RAG retrieval; NEVER logged by ingestion pipeline |
| `contentHash` | SHA-256 of content; enables idempotent ON CONFLICT DO NOTHING upsert |
| `embedding` | float[768]; dim LOCKED per ADR-028 §5.1 |
| `metadata` | JSONB; may include `completenessScore`, `stageApplied`, `version` — NEVER includes price |
| Tenant boundary | FORCE RLS on `org_id`; all queries via `withDbContext` |

### E.2 Reasoning Logs (ReasoningLog)

See Section D.2. Stored per inference call; linked to `AuditLog[]` and optionally `Trade`.

### E.3 AI Usage Metering (AiUsageMeter)

| Field | Constraint |
|-------|-----------|
| `tenantId` | JWT-derived org; never client-supplied |
| `month` | VARCHAR(7), e.g., `2026-04` |
| `tokens` | Accumulated token count; updated by `upsertUsage()` in `aiBudget.ts` |
| `costEstimate` | Decimal(10,4) USD; estimated by `estimateCostUSD()` |

Hard-stop enforcement: If `AiBudget.hardStop = true` and token usage exceeds `monthlyLimit`, `enforceBudgetOrThrow()` raises `BudgetExceededError` and the inference call is rejected before hitting the model.

### E.4 AI Suggestion Storage (Future — not yet implemented)

The following artifact types are defined here as contracts for future implementation. No schema changes are authorized by this design document.

| Artifact Type | Purpose | Tenant-Scoped | Human Confirmation Required |
|---|---|---|---|
| `ai_suggestion` | Generic AI suggestion (autofill, ranking, draft) before human acceptance | ✅ | ✅ |
| `ai_extraction` | Structured fields extracted from a document | ✅ | ✅ |
| `ai_ranking_snapshot` | Point-in-time supplier ranking result | ✅ | — (read-only) |
| `ai_profile_completeness_report` | Persisted completeness report (if promotion from transient → stored is authorized) | ✅ | — (reporting only) |
| `ai_requirement_parse` | Parsed buyer requirement from free text | ✅ | ✅ before RFQ creation |
| `ai_document_parse` | Parsed certification or traceability document | ✅ | ✅ before any entity update |
| `ai_operator_insight` | Platform-level insight for super-admin (control-plane only) | — | — (read-only dashboard) |

**Schema gate:** Any future implementation of these artifact types requires a governance-approved SQL migration, Prisma db pull + generate sequence, and RLS policy. No schema changes are authorized here.

---

## F. AI Read Models / Context Packs

Context packs are the bounded data structures assembled before an AI call. They define the exact fields that enter the prompt — nothing more. The goal is to prevent accidental field leakage into AI context.

### F.1 SupplierMatchingContext

**Used by:** Supplier-buyer matching (Section G)  
**Assembled by:** Tenant-plane service, JWT-derived orgId

```typescript
// Design only — not a code change
interface SupplierMatchingContext {
  queryOrgId: string;              // JWT-derived buyer orgId
  queryText: string;               // Buyer's requirement statement (PII-scanned)
  queryEmbedding: number[];        // 768-dim embedding of queryText
  topK: 5;                         // RAG_TOP_K constant
  minSimilarity: 0.30;             // RAG_MIN_SIMILARITY constant
  sourceType: 'CATALOG_ITEM';      // Scoped to catalog vectors only
  retrievedChunks: SimilarityResult[]; // From querySimilar(); max 3 chunks (MAX_CONTEXT_CHUNKS)
  // EXCLUDED: price, publicationPosture, cross-tenant org signals, risk_score
}
```

### F.2 RFQDraftingContext

**Used by:** RFQ Intelligence Foundation (Section H)

```typescript
interface RFQDraftingContext {
  buyerOrgId: string;             // JWT-derived
  supplierOrgId: string;          // From RFQ target
  catalogItemId: string;          // Item being quoted
  catalogItemText: string;        // buildCatalogItemVectorText() output (no price)
  completenessScore: number;      // catalogItemAttributeCompleteness() — transient, not stored
  buyerRequirementText: string;   // Buyer's free-text requirement (PII-scanned pre-use)
  retrievedChunks: SimilarityResult[]; // Relevant catalog/cert vectors
  // EXCLUDED: price, escrow data, cross-tenant data
}
```

### F.3 SupplierProfileCompletenessContext

**Used by:** Supplier Profile Completeness Foundation (Section I)

```typescript
interface SupplierProfileCompletenessContext {
  orgId: string;                   // JWT-derived supplier orgId
  catalogItems: CatalogItemForVectorText[]; // Existing AI-safe catalog item interface
  certifications: CertificationSummary[];   // certificationType + expiresAt only
  completenessScores: Record<string, number>; // itemId → score from catalogItemAttributeCompleteness()
  stageBreakdown: Record<string, number>;     // stage → item count
  // EXCLUDED: price, publicationPosture, user PII, escrow data
}
```

### F.4 DocumentExtractionContext

**Used by:** Document Intelligence Foundation (Section J)

```typescript
interface DocumentExtractionContext {
  orgId: string;               // JWT-derived
  documentSourceType: 'CERTIFICATION' | 'DPP_SNAPSHOT';
  documentText: string;        // Raw extracted text (PII-scanned pre-AI use)
  targetEntityId: string;      // UUID of the entity being updated
  targetEntityType: string;    // 'Certification' | 'TraceabilityNode'
  // EXCLUDED: price, financial data, cross-tenant data
}
```

### F.5 WorkflowAssistantContext

**Used by:** Trade Workflow Assistant Foundation (Section K)

```typescript
interface WorkflowAssistantContext {
  orgId: string;               // JWT-derived
  tradeId: string;             // Trade being assisted
  currentLifecycleState: string;
  allowedTransitions: string[];  // From AllowedTransition table — read-only
  tradeReference: string;
  buyerOrgId: string;
  sellerOrgId: string;
  // EXCLUDED: grossAmount, escrow data, price data
}
```

### F.6 MarketIntelligenceContext

**Used by:** Market Intelligence Foundation — operator-only (Section L)

```typescript
// Control-plane only — no tenant access
interface MarketIntelligenceContext {
  adminActorId: string;          // Super-admin only; never tenant-derived
  targetOrgId?: string;          // Optional: per-org targeted insight
  aggregatedSignals: {
    totalActiveItems: number;
    stageDistribution: Record<string, number>;
    certificationCoverage: number; // 0–1
    // EXCLUDED: price data, individual user PII, risk_score (displayed separately)
  };
}
```

### F.7 TrustScoreContext

**Used by:** Trust Score Foundation — operator-only (Section M)

```typescript
// Control-plane only — no tenant access
interface TrustScoreContext {
  adminActorId: string;    // Super-admin only
  targetOrgId: string;     // Org being scored
  certificationStatus: CertificationSummary[];
  tradeHistorySummary: {
    totalTrades: number;
    completedTrades: number;
    disputedTrades: number;
  };
  sanctionStatus: 'CLEAR' | 'ACTIVE' | 'DECAYED'; // From Sanction table — admin SELECT only
  // EXCLUDED: escrow balances, individual user PII
}
```

---

## G. Supplier-Buyer Matching Foundation

### G.1 Problem Statement

A buyer issues a requirement (free text or structured query). The platform should identify which supplier catalog items best match that requirement, ranked by semantic similarity.

### G.2 Existing Infrastructure (confirmed in repo)

| Component | Status | Location |
|-----------|--------|----------|
| `DocumentEmbedding` table (CATALOG_ITEM source) | ✅ Live | `schema.prisma` |
| `buildCatalogItemVectorText()` — stage-aware text builder | ✅ Live | `tenant.ts` line 696 |
| `querySimilar()` — orgId-scoped cosine similarity | ✅ Live | `vectorStore.ts` |
| `generateEmbedding()` — text-embedding-004, 768-dim | ✅ Live | `vectorEmbeddingClient.ts` |
| Catalog item ingestion via `enqueueSourceIngestion()` | ✅ Live | `tenant.ts` → `vectorIngestion.ts` |
| Feature flag `OP_G028_VECTOR_ENABLED` | ✅ Live | `ragContextBuilder.ts` |
| RAG injection into prompt | ✅ Live (for insights/negotiation) | `ragContextBuilder.ts`, `inferenceService.ts` |

### G.3 Missing Components (not yet implemented)

| Component | Gap | Prerequisite |
|-----------|-----|-------------|
| Buyer-side matching endpoint `POST /api/tenant/ai/match-suppliers` | Not yet created | Authorized by explicit implementation unit |
| Buyer requirement embedding + vector query path | No buyer-side query flow | Above endpoint + SupplierMatchingContext |
| Cross-supplier vector query (buyer queries across suppliers) | RLS scoped to own org — cross-supplier search requires explicit buyer-facing read model | Product/design decision required (NOT same as own-org vectors) |
| Match result presentation to buyer UI | No match result component | Frontend unit required |

### G.4 Constitutional Constraints for Future Implementation

1. Buyer requirement text MUST pass `piiGuard.redactPii()` before embedding generation.
2. Vector query MUST use `withDbContext()` with buyer's `orgId` — RLS scoped.
3. Supplier catalog embeddings are indexed under the **supplier's** `orgId`. Cross-tenant vector access requires a deliberately designed public-vector read model (outside current RLS scope) — this is a product boundary decision.
4. `price` MUST NOT be included in match ranking signals, match result display, or match-score calculation.
5. Match results MUST include `matchScore`, `matchedFields[]`, and `missingFields[]` per Section D.1.
6. All match calls MUST write to `ReasoningLog` + `AiUsageMeter` via the existing TIS pattern.

### G.5 Design Decision Required Before Implementation

**Cross-supplier vector search** — the buyer wants to search ACROSS suppliers (not just their own vectors). Current RLS architecture scopes `document_embeddings` to the authenticated `org_id`. A cross-supplier read model requires:
- A new public-vector read pattern (similar to `publicB2CProjection.service.ts`)
- RLS exception or a pre-projected public embedding table
- Explicit governance decision (new D-XXX)
- Separate implementation unit

This is the primary unresolved design question. No implementation should proceed without resolving it.

---

## H. RFQ Intelligence Foundation

### H.1 Problem Statement

When a buyer creates an RFQ, AI should assist with: (a) parsing the buyer's requirement into structured fields, (b) drafting a professional buyerMessage, and (c) suggesting whether the chosen catalog item is a good match for the stated requirement.

### H.2 Existing Infrastructure

| Component | Status |
|-----------|--------|
| `Rfq` + `RfqSupplierResponse` schema | ✅ Live |
| `buyerMessage` field on Rfq | ✅ Live |
| RAG context injection pattern | ✅ Live (ragContextBuilder.ts) |
| PII guard for free text | ✅ Live (piiGuard.ts) |
| TIS budget + rate-limit enforcement | ✅ Live (inferenceService.ts) |

### H.3 Missing Components

| Component | Gap |
|-----------|-----|
| `POST /api/tenant/ai/draft-rfq` endpoint | Not yet created |
| RFQDraftingContext assembly | Not yet created |
| Buyer requirement parser (free text → structured fields) | Not yet created |
| RFQ draft confidence scoring | Not yet created |

### H.4 Constitutional Constraints

1. `buyerMessage` drafts MUST be labeled as AI-generated in the UI before human edits and confirmation.
2. RFQ AI drafting MUST NOT auto-submit RFQs. Human must explicitly confirm send.
3. Buyer requirement text MUST pass `piiGuard.redactPii()` before embedding.
4. Any quote/price information in a supplier response MUST NOT flow through AI processing paths.
5. `aiTriggered` on the resulting `Rfq` row is not currently a schema field — if AI-assisted RFQ creation tracking is needed, it must be added in a future schema migration.

---

## I. Supplier Profile Completeness Foundation

### I.1 Problem Statement

AI should tell a supplier which fields are missing from their catalog items for each stage, and suggest what to add — increasing the quality and discoverability of their catalog.

### I.2 Existing Infrastructure (confirmed in repo)

| Component | Status | Location |
|-----------|--------|----------|
| `catalogItemAttributeCompleteness()` — stage-aware [0,1] score | ✅ Live | `tenant.ts` line 813 |
| All 14 stage Zod schemas in `stageAttributesSchemas` | ✅ Live | `tenant.ts` |
| `CatalogItemForVectorText` interface | ✅ Live | `tenant.ts` line 673 |
| Stage taxonomy (14 values) | ✅ Live | `schema.prisma` |

### I.3 Key Design Constraint (confirmed from code comment)

`catalogItemAttributeCompleteness()` returns a score in [0,1] **for AI context metadata only — not stored**. This is the existing pattern. If the score ever needs to be persisted for trending/reporting, a separate `ai_profile_completeness_report` table is required (see Section E.4), authorized by a future governance decision.

### I.4 Constitutional Constraints

1. Completeness reports MUST NOT include `price` or `publicationPosture` in missing-field suggestions.
2. Completeness scoring is **transient by default** — score is computed per-request and discarded.
3. Autofill suggestions (Section C: AUTOFILL) require `confidence < 0.7 → show uncertainty` rule.
4. The completeness score foundation is designed for **supplier-facing** surfaces only. Buyers MUST NOT see another supplier's completeness score.
5. Completeness suggestions MUST NOT imply pricing recommendations (e.g., "Add GSM to get better pricing" is forbidden).

### I.5 Missing Components

| Component | Gap |
|-----------|-----|
| `GET /api/tenant/ai/profile-completeness` endpoint | Not yet created |
| Completeness report UI surface for supplier | Not yet created |
| Persisted completeness trending (optional future) | Not yet created; requires schema migration |

---

## J. Document Intelligence Foundation

### J.1 Problem Statement

Certification documents (GOTS, OEKO-TEX, ISO) and DPP snapshots arrive as unstructured text. AI should extract structured fields and present them to a human reviewer for confirmation before any entity update.

### J.2 Existing Infrastructure

| Component | Status |
|-----------|--------|
| `Certification` schema with `lifecycleStateId` | ✅ Live |
| `CertificationLifecycleLog.aiTriggered` field | ✅ Live |
| `DocumentEmbedding` with `sourceType = 'CERTIFICATION'` / `'DPP_SNAPSHOT'` | ✅ Live |
| `ingestCertification()` in `vectorIngestion.ts` | ✅ Live |
| `ingestDppSnapshot()` in `vectorIngestion.ts` | ✅ Live |
| `TraceabilityNode.meta` (JSONB) | ✅ Live |

### J.3 Missing Components

| Component | Gap |
|-----------|-----|
| Document text extraction from PDFs/images | Not yet created (no document parsing pipeline) |
| `POST /api/tenant/ai/extract-certification` endpoint | Not yet created |
| DocumentExtractionContext assembly | Not yet created |
| Human review UI for extracted fields before write | Not yet created |

### J.4 Constitutional Constraints

1. Extracted certification fields MUST be presented to a human reviewer before any `Certification` update.
2. `CertificationLifecycleLog.aiTriggered` MUST be `true` on any AI-assisted lifecycle transition.
3. AI MUST NOT revoke or expire certifications autonomously. Only lifecycle state transition API with human confirmation is authorized.
4. Document text MUST pass PII guard before embedding or LLM use.
5. Extraction confidence < 0.8 MUST be flagged as uncertain in the review UI.

---

## K. Trade Workflow Assistant Foundation

### K.1 Problem Statement

When a trade is in a given lifecycle state, AI should suggest the appropriate next action to the operator/buyer/seller, explain the available transitions, and draft workflow communications — but MUST NOT trigger transitions autonomously.

### K.2 Existing Infrastructure

| Component | Status |
|-----------|--------|
| `Trade` + `TradeLifecycleLog` with `aiTriggered` field | ✅ Live |
| `AllowedTransition` table | ✅ Live |
| `LifecycleState` table | ✅ Live |
| `ReasoningLog` → `Trade` link (optional `reasoningLogId` on Trade) | ✅ Live |
| D-020-C pattern established | ✅ Constitutional |

### K.3 Missing Components

| Component | Gap |
|-----------|-----|
| `POST /api/tenant/ai/trade-workflow-suggest` endpoint | Not yet created |
| WorkflowAssistantContext assembly | Not yet created |
| Trade suggestion UI surface | Not yet created |

### K.4 Constitutional Constraints

1. **AI has zero authority over trade state transitions.** AI may only SUGGEST; human must CONFIRM.
2. Any AI-influenced transition MUST write `aiTriggered = true` and reason containing `AI_RECOMMENDED: <summary> — HUMAN_CONFIRMED by <actorId>` (D-020-C).
3. AI MUST NOT be given `grossAmount`, escrow balances, or escrow transaction data in WorkflowAssistantContext.
4. `reasoning_logs.reasoningLogId` linkage to `Trade` provides the audit chain.
5. AI workflow suggestions MUST cite the specific `lifecycleState` and `allowedTransitions` used as context.

---

## L. Market Intelligence Foundation (operator-only)

### L.1 Problem Statement

Platform operators (SUPER_ADMIN only) need aggregated AI insights across tenants — category trends, supply-demand gaps, onboarding quality signals — without access to individual tenant pricing or PII.

### L.2 Existing Infrastructure

| Component | Status |
|-----------|--------|
| `controlPlaneInferenceService.ts` — operator inference service | ✅ Live |
| Admin audit metadataJson pattern (no reasoning_logs for admin) | ✅ Live |
| PII redaction + output scan in control-plane TIS | ✅ Live |
| `emitAiControlEventBestEffort()` for control-plane events | ✅ Live |
| `organizations.risk_score` accessible in admin context | ✅ Live |

### L.3 Missing Components

| Component | Gap |
|-----------|-----|
| MarketIntelligenceContext assembly | Not yet created |
| Platform-level aggregation queries for AI insight input | Not yet created |
| Admin AI insight dashboard for market signals | Existing `AiGovernance.tsx` covers budget/model-cap but not market intelligence |

### L.4 Constitutional Constraints

1. Market intelligence is **SUPER_ADMIN only** — no tenant access.
2. `risk_score` MUST NOT be included in aggregated outputs returned to the UI (admin sees per-org risk score separately through the org management surface, not via AI output).
3. Control-plane AI MUST NOT write to `reasoning_logs` — persists in admin audit `metadataJson` only.
4. No individual tenant pricing data may appear in market intelligence prompts or outputs.
5. All control-plane inference calls must use `withSuperAdminContext()` (not `withDbContext()`).

---

## M. Trust Score Foundation

### M.1 Problem Statement

A composable, AI-assisted trust score for organizations — combining certification coverage, trade history, sanctions status, and profile completeness — to assist operators in onboarding decisions and risk flagging.

### M.2 Existing Infrastructure

| Component | Status |
|-----------|--------|
| `Sanction` model with severity 1–5, RESTRICTIVE RLS (admin SELECT only) | ✅ Live |
| `Certification` + `CertificationLifecycleLog` | ✅ Live |
| `Trade` + `TradeLifecycleLog` | ✅ Live |
| `organizations.risk_score` field | ✅ Live |
| `PendingApproval.aiTriggered` field | ✅ Live |

### M.3 Missing Components

| Component | Gap |
|-----------|-----|
| Trust score algorithm definition | Not yet defined |
| `TrustScoreContext` assembly | Not yet created |
| `POST /api/control/ai/trust-score` endpoint | Not yet created |
| Trust score surface in AiGovernance.tsx | Not yet created |

### M.4 Constitutional Constraints

1. Trust scoring is **SUPER_ADMIN only**. No tenant sees their own or another org's trust score via AI.
2. Sanction data MUST only be accessible via admin SELECT path (RESTRICTIVE RLS).
3. Trust score MUST NOT incorporate price data or escrow balances.
4. Trust score computed by AI is a **suggestion** input to the operator — it MUST NOT autonomously change `organizations.risk_score`. Human update is required.
5. `PendingApproval.aiTriggered` must be `true` on any approval influenced by AI trust score.

---

## N. Tenant / RLS / Security Contract

This section codifies the security and tenancy constraints that apply to ALL AI paths.

### N.1 Tenancy Rules

| Rule | Enforcement |
|------|-------------|
| `orgId` is ALWAYS sourced from `req.dbContext.orgId` (JWT-derived) — never request body | `vectorStore.ts`, `inferenceService.ts` constitutional comments |
| All DB operations must wrap inside `withDbContext()` to activate RLS context | `vectorStore.ts` comment |
| No `BYPASSRLS`, no `SET LOCAL ROLE bypass` anywhere in AI paths | `vectorStore.ts` constitutional comment |
| `document_embeddings` table: FORCE RLS, `app.org_id` keyed | `schema.prisma` |
| Vector queries are tenant-isolated by construction | `querySimilar()` always receives `orgId` |
| Cross-tenant vector queries are architecturally impossible under current RLS | Design boundary |
| Client-supplied `tenantId` MUST be rejected at all AI endpoints via `z.never()` guard | `rls-policy.md` §C |

### N.2 Prompt Security Rules

| Rule | Enforcement |
|------|-------------|
| PII guard required pre-send on all user-originated text | `piiGuard.redactPii()` in `inferenceService.ts` |
| Output scanned for PII leak post-receive | `piiGuard.scanForPii()` in `inferenceService.ts` |
| Chunk content NEVER logged — only metadata + scores | `ragContextBuilder.ts`, `vectorIngestion.ts` constitutional comments |
| Raw prompt text NEVER written to `reasoning_logs` — only `promptSummary` (≤ 500 chars) | `ReasoningLog.promptSummary` design |
| Prompt injection guard: no user-controlled text injected verbatim without sanitization | PII guard + bounded context pack pattern |
| `MAX_INJECTED_CHARS = 3000` caps RAG context size per prompt | `ragContextBuilder.ts` |
| `CP_MAX_PROMPT_CHARS = 2000` caps control-plane prompt size | `controlPlaneInferenceService.ts` |

### N.3 Rate Limiting and Budget Rules

| Rule | Value | Enforcement |
|------|-------|-------------|
| Tenant AI rate limit | 60 req/min | `inferenceService.ts` `tenantRequestWindows` map |
| Idempotency window | 24h | `AI_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000` |
| Hard-stop enforcement | `AiBudget.hardStop = true` | `enforceBudgetOrThrow()` in `aiBudget.ts` |
| Budget preflight | Before every inference call | `loadTenantBudget()` → `enforceBudgetOrThrow()` |
| Usage upsert | After every successful inference | `upsertUsage()` in `aiBudget.ts` |

### N.4 Feature Flag Gate

All RAG retrieval paths MUST check `OP_G028_VECTOR_ENABLED` feature flag. If disabled, the inference path falls back to zero-shot (no RAG context injection). This flag is the kill switch for the entire vector layer.

---

## O. Audit / Observability Contract

### O.1 Required Events per AI Action

| Action | Required Event(s) |
|--------|------------------|
| Embedding upsert | `ai.vector.upsert` (AiVectorUpsertPayload: vectorCount) |
| Embedding deletion | `ai.vector.delete` (AiVectorDeletePayload: vectorId) |
| Vector query / RAG retrieval | `ai.vector.query` (AiVectorQueryPayload) |
| Tenant inference call | `ai.inference.generate` |
| Budget exceeded | `ai.budget.exceeded` (existing control event) |
| Inference timeout | `ai.inference.timeout` (existing control event) |
| Kill switch activated | `ai.killswitch.activated` (existing control event) |

All events use `emitAiEventBestEffort()` — never blocking the primary flow.

### O.2 RAG Retrieval Metadata (RagRetrievalMeta)

Written to `reasoning_logs.promptSummary` after each RAG call. Contains (per confirmed implementation):
- `stage: 'vector_rag_injection'`
- `topK`, `minSimilarity`, `chunksInjected`, `topScore`
- `latencyMs`
- `sources[]` — array of `{sourceType, sourceId, similarity}` — **NO chunk content** (PII guard)

### O.3 Latency Observability

RAG metrics are tracked via `ragMetrics.ts` helpers:
- `startTimer()` → `markRetrievalStart()` → `recordRetrievalLatency()`
- `markInferenceStart()` → `recordInferenceLatency()` → `recordTotalLatency()`

These are in-memory instrumentation points. No persistent latency storage currently exists — a future `ai_latency_metrics` table may be added if performance monitoring requires it.

### O.4 Audit Log Integration

`AuditLog` entries linked to `ReasoningLog` via optional `reasoningLogId` field provide the complete AI decision audit chain:

```
HTTP request → TIS inference → ReasoningLog row → AuditLog row (with reasoningLogId)
                                                ↳ Trade.reasoningLogId (if trade-affecting)
```

---

## P. AI Provider / Model Abstraction

### P.1 Current Provider Configuration (confirmed)

| Component | Value | Source |
|-----------|-------|--------|
| Inference provider | Google Gemini | `@google/generative-ai` import |
| Inference model | `gemini-1.5-flash` | `eventSchemas.ts` line 256, `inferenceService.ts` |
| Embedding provider | Google Gemini | `vectorEmbeddingClient.ts` |
| Embedding model | `text-embedding-004` | `vectorEmbeddingClient.ts` `EMBEDDING_MODEL` constant |
| Embedding dimension | **768** (LOCKED, ADR-028 §5.1) | `vectorStore.ts` `EMBEDDING_DIM = 768` |
| Config key | `GEMINI_API_KEY` (required, `z.string().min(1)`) | `server/src/config/index.ts` |

### P.2 Provider Abstraction Boundary

The current implementation has two separate Google Gemini client instances:
1. **Tenant TIS** (`inferenceService.ts`) — module-level `genAI` instance
2. **Control-plane TIS** (`controlPlaneInferenceService.ts`) — separate module-level instance

This separation is **intentional and constitutional** — shared mutable state across plane boundaries is forbidden.

### P.3 Embedding Dimension Lock

`EMBEDDING_DIM = 768` is **hard-locked** per ADR-028 §5.1. Changing the embedding dimension requires:
1. New governance decision (ADR amendment)
2. Full re-ingestion of all `document_embeddings` records
3. HNSW index rebuild
4. Explicit verification gate

No implementation unit may change `EMBEDDING_DIM` without this sequence.

### P.4 Model Upgrade Path

If the inference model is upgraded (e.g., `gemini-1.5-flash` → `gemini-2.0-flash`):
1. Update `EMBEDDING_MODEL` constant and model reference in `inferenceService.ts`
2. Run regression against existing `ragContextBuilder.g028.test.ts`
3. Update `ReasoningLog.model` field to reflect new model name in all new writes
4. Verify embedding model parity — if embedding model changes, see §P.3 lock rules

### P.5 Provider Switching

If a future decision requires switching from Gemini to another provider:
1. Both `vectorEmbeddingClient.ts` (embedding) and `inferenceService.ts` (inference) must be updated
2. The `generateEmbedding()` function signature must be preserved (return `number[768]`) — callers are unaffected if the abstraction is maintained
3. `_overrideGenAIForTests()` pattern must be preserved or adapted for the new provider

---

## Q. Future Implementation Roadmap

The following 8 implementation units are defined as the planned next-layer AI delivery sequence. **None of these are authorized or open by this design document.** Each requires explicit Paresh authorization per the D-016 gate.

### Q.1 Unit: TECS-AI-SUPPLIER-MATCHING-001

| Field | Value |
|-------|-------|
| Purpose | Buyer-side supplier matching endpoint: embed buyer requirement → query CATALOG_ITEM vectors → rank suppliers by semantic similarity → return match results with explainability |
| Prerequisites | Resolution of cross-supplier vector read model (G.5 design decision); `OP_G028_VECTOR_ENABLED` flag active; catalog ingestion pipeline verified complete |
| Key files to create | `server/src/routes/tenant.ts` (new route POST /api/tenant/ai/match-suppliers), `server/src/services/ai/supplierMatchingService.ts` |
| Files to read first | `vectorStore.ts`, `ragContextBuilder.ts`, `inferenceService.ts`, `vectorIngestion.ts` |
| Risk | Cross-supplier read model requires RLS exception or public projection table — this is the principal technical risk |
| Verification | RAG retrieval returns non-zero results for test query; match scores within [0,1]; price excluded from results; orgId isolation confirmed |

### Q.2 Unit: TECS-AI-RFQ-INTELLIGENCE-001

| Field | Value |
|-------|-------|
| Purpose | AI-assisted RFQ drafting: parse buyer requirement → embed → RAG-augment → draft buyerMessage → present for human review and confirmation before send |
| Prerequisites | TECS-AI-SUPPLIER-MATCHING-001 (or can be parallel if SupplierMatchingContext and RFQDraftingContext are independent); PII guard in place (confirmed) |
| Key files to create | New route `POST /api/tenant/ai/draft-rfq`; `server/src/services/ai/rfqDraftingService.ts` |
| Risk | Buyer message drafts must be clearly labeled AI-generated; auto-submit prevention requires frontend gating |
| Verification | Draft presented but not auto-submitted; PII guard applied; ReasoningLog written; AiUsageMeter updated |

### Q.3 Unit: TECS-AI-PROFILE-COMPLETENESS-001

| Field | Value |
|-------|-------|
| Purpose | Supplier-facing completeness report: compute stage-aware completeness scores for all supplier catalog items; present missing-field suggestions with autofill confidence |
| Prerequisites | `catalogItemAttributeCompleteness()` already exists (live); no new infrastructure needed for transient reports |
| Key files to create | New route `GET /api/tenant/ai/profile-completeness`; frontend `SupplierCompletenessPanel.tsx` |
| Risk | Score must remain transient unless persisted completeness schema is explicitly authorized (Section E.4) |
| Verification | Score in [0,1]; price excluded from suggestions; stage-aware breakdown per item; no cross-tenant leakage |

### Q.4 Unit: TECS-AI-DOCUMENT-INTELLIGENCE-001

| Field | Value |
|-------|-------|
| Purpose | Extract structured certification fields from uploaded document text; present to human reviewer; write only after confirmation; set `CertificationLifecycleLog.aiTriggered = true` |
| Prerequisites | Document upload pipeline (not yet built); PDF/image text extraction service; `ingestCertification()` already live |
| Risk | Document upload pipeline is a prerequisite blocker — significant infrastructure required; PII in document text is a live risk |
| Verification | Extracted fields shown in review UI; no auto-write; `aiTriggered = true` on lifecycle log; PII guard applied |

### Q.5 Unit: TECS-AI-TRADE-WORKFLOW-ASSISTANT-001

| Field | Value |
|-------|-------|
| Purpose | Suggest next lifecycle transition + draft workflow communication for a given trade state; no autonomous state writes |
| Prerequisites | Trade + lifecycle schema fully operational (confirmed live); `AllowedTransition` table populated |
| Key files to create | New route `POST /api/tenant/ai/trade-workflow-suggest`; `server/src/services/ai/tradeWorkflowAssistantService.ts` |
| Risk | Must never include `grossAmount` or escrow data in context; D-020-C pattern mandatory |
| Verification | Suggestion returned; no state transition triggered; `aiTriggered = true` only set after human confirmation; `reasoningLogId` linked to Trade |

### Q.6 Unit: TECS-AI-MARKET-INTELLIGENCE-001

| Field | Value |
|-------|-------|
| Purpose | Control-plane market intelligence: aggregate cross-tenant signals for operator AI insights (category trends, supply gaps, onboarding quality) |
| Prerequisites | Sufficient catalog data volume for meaningful aggregation; super-admin auth confirmed (existing); `controlPlaneInferenceService.ts` already live |
| Risk | Price data must never appear in aggregated signals; individual tenant PII must be excluded; risk_score must not flow through AI output |
| Verification | Output contains no price data; admin audit metadataJson written (not reasoning_logs); PII scan passes |

### Q.7 Unit: TECS-AI-TRUST-SCORE-001

| Field | Value |
|-------|-------|
| Purpose | Composable AI-assisted trust score for organizations: certification coverage + trade history + sanctions status → operator-facing signal |
| Prerequisites | `Sanction` table operational; TECS-AI-MARKET-INTELLIGENCE-001 (recommended, not hard prerequisite); `PendingApproval.aiTriggered` ready |
| Risk | Sanction data RESTRICTIVE RLS must be preserved; trust score must not auto-update `risk_score`; human operator action required |
| Verification | Sanction data accessed only via admin SELECT path; trust score presented as suggestion only; `risk_score` update requires separate human action |

### Q.8 Unit: TECS-AI-RAG-BENCHMARK-HARDENING-001

| Field | Value |
|-------|-------|
| Purpose | Harden the existing RAG evaluation dataset and benchmark runner (`ragBenchmarkRunner.ts`, `ragEvaluationDataset.ts`, `ragScoring.ts`, `ragMetrics.ts`) against the full G-028 evaluation criteria; establish production-grade recall/precision baselines |
| Prerequisites | Sufficient ingested catalog/certification data for meaningful evaluation; `ragContextBuilder.g028.test.ts` already live |
| Risk | Benchmark evaluation may surface recall gaps that require ingestion pipeline improvements; gold-label annotation is labor-intensive |
| Verification | RAG benchmark run produces recall@K and precision@K metrics; baseline documented; pass/fail threshold defined |

---

## Governance Closure Note

This design artifact (`TECS-AI-FOUNDATION-DATA-CONTRACTS-001`) establishes the **constitutional data contracts and decision boundaries** for the TexQtic AI layer. It does not authorize any implementation. Every section defines what the existing infrastructure already provides and what is not yet built.

Key existing capabilities confirmed as live by repo truth inspection:
- Vector ingestion pipeline (G-028 A1–A7): ✅ Complete
- RAG retrieval + prompt injection: ✅ Complete
- Budget enforcement + usage metering: ✅ Complete
- PII guard (pre-send + post-receive): ✅ Complete
- AI-triggered lifecycle state pattern (D-020-C): ✅ Constitutional
- Price + publicationPosture exclusion from AI paths: ✅ Constitutional
- Tenant isolation via RLS + `withDbContext`: ✅ Constitutional

No implementation changes, schema migrations, API additions, or frontend changes are introduced by this document.

**Allowlist (write targets):**
- `docs/TECS-AI-FOUNDATION-DATA-CONTRACTS-001-DESIGN-v1.md` ← this file
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
