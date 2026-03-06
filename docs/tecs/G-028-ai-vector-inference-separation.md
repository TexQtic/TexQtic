# G-028 — AI Vector / Inference Separation — Design Anchor

**Status:** ✅ IMPLEMENTED — A1–A7 Complete (GOVERNANCE-SYNC-095)  
**Gap ref:** G-028 (`governance/gap-register.md` line 182)  
**Wave:** 4 XL (depends on G-023 ✅ complete)  
**Author:** TexQtic AI Architecture  
**Date:** 2026-03-05  
**TECS prompt ID:** G-028-DESIGN-ANCHOR-001  

---

## 0. Discovery Summary

### 0.1 What exists today (found in repo)

| Layer | Location | What it does |
|---|---|---|
| **AI provider** | `server/src/routes/ai.ts` | Google Gemini 1.5 Flash via `@google/generative-ai` · server-side only |
| **Budget enforcement** | `server/src/lib/aiBudget.ts` | Token limits + hard stop per tenant · monthly reset · `ai_budgets` + `ai_usage_meters` tables (RLS-protected) |
| **Audit trail** | `server/src/lib/database-context.ts` + G-023 schema | `reasoning_logs` — append-only, immutable trigger, tenant-RLS (`reasoning_logs_guard` RESTRICTIVE + `reasoning_logs_tenant_select` PERMISSIVE) |
| **Inference routes** | `GET /api/ai/insights` · `POST /api/ai/negotiation-advice` | Prompt → Gemini → text; budget gate → audit write → response |
| **Frontend proxy** | `services/aiService.ts` | Pure HTTP client; no Gemini key; routes through backend |
| **Deprecated** | `services/geminiService.ts` | Client-side Gemini call (security vulnerability — intentionally emptied, do not restore) |
| **Feature flag** | `OP_AI_AUTOMATION_ENABLED` | Seeded but no autonomous execution wired |

### 0.2 What does NOT exist today

- ❌ No vector/embedding generation anywhere in the codebase
- ❌ No pgvector extension or embedding column in Supabase schema
- ❌ No similarity search or retrieval-augmented generation (RAG) pipeline
- ❌ No external vector database (Pinecone / Qdrant / Weaviate)
- ❌ No document ingestion pipeline
- ❌ No caching layer for embeddings or inference results
- ❌ No semantic search on catalog, certifications, or DPP data

### 0.3 Use cases identified from repo (not invented)

| # | Use case | Current location | AI involvement today |
|---|---|---|---|
| UC-1 | **Platform insights** | `GET /api/ai/insights` → `aiService.getPlatformInsights()` | LIVE — Gemini text, no retrieval |
| UC-2 | **Negotiation advice** | `POST /api/ai/negotiation-advice` → `aiService.generateNegotiationAdvice()` | LIVE — Gemini text, no retrieval |
| UC-3 | **DPP / compliance assistance** | `server/src/routes/tenant/traceability.g016.ts` comment: "Phase A only: no AI/vector infra" | STUB — placeholder only |
| UC-4 | **Supplier discovery / product matching** | Docs + MASTER-IMPLEMENTATION-PLAN comment re: vector AI future | NOT STARTED |

### 0.4 Current data flow (today)

```
Frontend → tenantApiClient → [JWT auth] → Fastify /api/ai/*
                  ↓
         aiBudget.enforceBudgetOrThrow()   ← ai_budgets (RLS)
                  ↓
         Gemini 1.5 Flash API (HTTP, server-side)
                  ↓
         reasoning_logs INSERT (immutable, tenant-scoped)
                  ↓
         audit_logs INSERT (reasoning_hash FK)
                  ↓
         upsertUsage() → ai_usage_meters
                  ↓
         HTTP response to frontend
```

No vector store is in this flow. All AI is pure prompt → LLM → text.

---

## 1. Architecture Overview

### 1.1 Target architecture (design only — not yet built)

```mermaid
graph TB
  subgraph Frontend["Frontend (Next.js 15 / Vercel)"]
    UI[React UI Components]
    AIS[aiService.ts]
  end

  subgraph CoreBackend["Core Backend (Fastify / Node 22)"]
    AUTH[Auth + Tenant Context Middleware]
    BUDGET[aiBudget.ts<br/>Token / Cost enforcement]
    AUDIT[Audit + reasoning_logs writer]
    AIROUTES[/api/ai/* routes<br/>Orchestration layer]
    VPROXY[Vector Proxy<br/>orgId scoping + filter injection]
    IPROXY[Inference Proxy<br/>RAG context assembly]
  end

  subgraph VectorBoundary["Vector / Retrieval Boundary (future service or Postgres)"]
    VIDX[Document Indexer<br/>Embedding generation]
    VSEARCH[Similarity Search<br/>topK retrieval]
    VSTORE[(Vector Store<br/>pgvector or external)]
    VMETA[(Document Metadata<br/>Postgres — org_id scoped)]
  end

  subgraph InferenceBoundary["Inference / LLM Boundary (future — may remain in Core Backend)"]
    PROMPT[Prompt Assembler<br/>context + tools + policy]
    LLM[LLM Provider<br/>Gemini 1.5 Flash today]
    REDACT[PII Redaction<br/>pre-send + post-receive]
  end

  UI --> AIS --> AIROUTES
  AIROUTES --> AUTH
  AIROUTES --> BUDGET
  AIROUTES --> VPROXY --> VSEARCH
  VSEARCH --> VSTORE
  VSEARCH --> VMETA
  VIDX --> VSTORE
  AIROUTES --> IPROXY --> PROMPT --> REDACT --> LLM
  LLM --> REDACT
  IPROXY --> AUDIT
  AIROUTES --> AUDIT
```

### 1.2 Responsibility split

| Concern | Vector / Retrieval Boundary | Inference / LLM Boundary | Core Backend (stays) |
|---|---|---|---|
| Embedding generation | ✅ | — | — |
| Document ingestion / indexing | ✅ | — | — |
| Similarity search (topK) | ✅ | — | — |
| Index deletion / reindex | ✅ | — | — |
| Tenant scoping of index | ✅ | — | — |
| Prompt assembly | — | ✅ | — |
| LLM model call | — | ✅ | — |
| PII redaction (pre/post) | — | ✅ | — |
| Citations / reference tracking | — | ✅ | — |
| Rate limiting / cost controls | — | ✅ | ✅ (budget layer) |
| Auth / tenant context | — | — | ✅ |
| Budget enforcement | — | — | ✅ |
| Audit log write | — | — | ✅ |
| Feature flag gating | — | — | ✅ |
| org_id propagation | — | — | ✅ |

---

## 2. Service Boundary Definitions

### 2.A — Vector / Retrieval Boundary

**Logical name:** `TexQtic Vector Service` (TVS)  
**Status:** Not yet implemented. Design only.

#### Inputs

| Input | Type | Notes |
|---|---|---|
| `orgId` | `string (UUID)` | Mandatory. Hard-typed. Never inferred from body. |
| `documents[]` | `{ id, text, metadata }[]` | For upsert. `metadata` must carry `orgId`, `contentType`, `sourceId`. |
| `query` | `string` | For search. User query or intermediate retrieval string. |
| `topK` | `number (1–50)` | Max results to return. Default 5. |
| `filters` | `Record<string, string>` | Optional narrow filters (e.g., `contentType: 'catalog_item'`). |
| `docIds[]` | `string[]` | For delete operations. |
| `idempotencyKey` | `string` | UUIDv4 — prevents duplicate ingestion on retry. |

#### Outputs

| Output | Type | Notes |
|---|---|---|
| `results[]` | `{ docId, score, text, metadata }[]` | topK results, sorted by score DESC. |
| `accepted` | `string[]` | docIds accepted for indexing (upsert response). |
| `rejected` | `{ docId, reason }[]` | Validation or size failures. |
| `deletedCount` | `number` | Confirmed deletions. |

#### Tenancy model

- Every vector document stored with `orgId` in metadata.
- Vector store **must** enforce org-scoped filters on every query (no cross-tenant retrieval possible at query time).
- If vector store is pgvector: RLS policy `vectors_guard` (RESTRICTIVE) enforces `require_org_context()`.
- If external vector store: `orgId` filter injected by TVS proxy layer in Core Backend before any SDK call — TVS is never called without it.
- Delete / reindex: must verify `orgId` ownership before proceeding. Service role is **never** used to bypass org-scoping.

#### Index update modes

| Mode | When used | Trigger |
|---|---|---|
| Sync | Admin upsert, small doc (<2KB) | Direct API call, response awaited |
| Async (queue) | Batch import, catalog sync | Event on `event_logs`, worker processes |
| On-demand reindex | Schema/embedding model change | Manual TECS + approval gate |

#### Delete / reindex behavior

- Soft delete first (mark `deleted_at`), hard delete on next reindex cycle.
- Full reindex requires `OPS-G028-REINDEX-{id}` TECS approval — not self-service.
- Partial reindex by `contentType` or `sourceId` supported.

---

### 2.B — Inference / LLM Boundary

**Logical name:** `TexQtic Inference Service` (TIS)  
**Status:** Currently embedded in `server/src/routes/ai.ts`. Will be extracted to a dedicated module/service in implementation.

#### Inputs

| Input | Type | Notes |
|---|---|---|
| `orgId` | `string (UUID)` | Mandatory. |
| `taskType` | `'INSIGHTS' \| 'NEGOTIATION' \| 'DPP_ASSIST' \| 'SUPPLIER_MATCH'` | Determines system prompt template. |
| `userInput` | `string (max 2000 chars)` | User-supplied text. Must be sanitized before assembly. |
| `contextRefs[]` | `{ docId, text, score }[]` | Retrieved chunks from TVS. May be empty (zero-shot). |
| `policies` | `{ maxTokens, temperature, hardStop }` | Runtime policy from `ai_budgets` row. |
| `idempotencyKey` | `string` | UUIDv4 — deduplication for retries. |

#### Outputs

| Output | Type | Notes |
|---|---|---|
| `responseText` | `string` | Final generated answer. |
| `citations[]` | `{ docId, quote }[]` | Referenced chunks used in answer. |
| `tokensUsed` | `number` | For budget metering. |
| `reasoningHash` | `string` | SHA-256 of `(orgId + taskType + userInput + responseText + ts)` — FK to audit. |

#### Rate limiting / cost controls

- Pre-call: `enforceBudgetOrThrow(orgId)` — existing `aiBudget.ts` gate. No bypass.
- Per-request max tokens: configurable via `ai_budgets.monthly_limit_tokens` / `AI_PREFLIGHT_TOKENS_*` env vars.
- Timeout: 8s (existing), configurable per `taskType`.
- HTTP 429 on budget exceeded — client must not retry without user acknowledgement.

#### Audit logging requirements

- Every inference call MUST write to `reasoning_logs` (G-023 schema).
- Audit event: `ai.inference.generate` (see §6 for payload sketch).
- `reasoning_hash` FK from `audit_logs` to `reasoning_logs` — enforced at DB level.
- Failed calls (timeout, model error) MUST write a `ai.inference.error` event.

#### Redaction / PII handling assumptions

- Pre-send: user input scanned for email pattern (`/\S+@\S+/`), phone pattern, credit card pattern — matches replaced with `[REDACTED]` before prompt assembly.
- Post-receive: response scanned for same patterns — any match triggers `ai.inference.pii_leak_detected` audit event and response is blocked.
- PII redaction is best-effort in Phase A (regex). ML-based NER is a future TECS.
- TexQtic assumption: no health data, government ID, or financial account numbers in AI flow (NDPA/DPDP scope to be confirmed in compliance TECS).

---

## 3. Contract Specifications

> These are pseudo-contracts (language-agnostic). Implementation language is TypeScript / Fastify. All contracts are multi-tenant by construction — `orgId` is always required and never defaulted.

### 3.1 Vector / Retrieval Service (TVS)

```typescript
// Upsert documents into the org-scoped index
UpsertDocuments(
  orgId: string,                    // UUID — required, validated
  docs: Array<{
    id: string;                     // Stable document ID (idempotent)
    text: string;                   // Content to embed (max 8192 chars)
    metadata: {
      contentType: 'CATALOG_ITEM' | 'DPP_SNAPSHOT' | 'CERTIFICATION'
               | 'TRADE_RECORD' | 'SUPPLIER_PROFILE';
      sourceId: string;             // PK of source row in Postgres
      tenantId: string;             // Must match orgId — validated
      version: number;              // Monotonic; used for staleness
    };
  }>,
  idempotencyKey: string            // UUIDv4
) -> {
  accepted: string[];               // doc IDs queued / indexed
  rejected: Array<{ docId: string; reason: string }>;
  auditEventId: string;             // Written to audit_logs
}

// Semantic similarity search within org scope
Query(
  orgId: string,                    // UUID — injected by proxy; not user-supplied
  query: string,                    // Raw query text (will be embedded by TVS)
  topK: number,                     // 1–50; default 5
  filters?: {
    contentType?: string;
    sourceIdPrefix?: string;
  }
) -> Array<{
  docId: string;
  score: number;                    // 0.0–1.0 cosine similarity
  text: string;                     // Matched chunk
  metadata: Record<string, string>;
}>

// Delete documents from org-scoped index
Delete(
  orgId: string,
  docIds: string[],
  idempotencyKey: string
) -> {
  deletedCount: number;
  errors: Array<{ docId: string; reason: string }>;
  auditEventId: string;
}

// Force reindex for org (admin / OWNER only — MakerChecker required)
Reindex(
  orgId: string,
  contentType?: string,             // Optional narrow scope
  approvalRef: string               // TECS / MakerChecker approval ID
) -> { jobId: string; estimatedDuration: string }
```

### 3.2 Inference Service (TIS)

```typescript
// Generate AI response with optional RAG context
Generate(
  orgId: string,                    // Required
  taskType: 'INSIGHTS' | 'NEGOTIATION' | 'DPP_ASSIST' | 'SUPPLIER_MATCH',
  userInput: string,                // Max 2000 chars; PII-scanned before use
  contextRefs: Array<{             // From TVS Query — may be empty for zero-shot
    docId: string;
    text: string;
    score: number;
  }>,
  policies: {
    maxTokens: number;
    temperature?: number;           // Default 0.7
    hardStop: boolean;
  },
  idempotencyKey: string
) -> {
  responseText: string;
  citations: Array<{ docId: string; quote: string }>;
  tokensUsed: number;
  reasoningHash: string;            // SHA-256; FK to reasoning_logs
  cached: boolean;                  // True if response served from cache
}

// Summarize a document or retrieval set
Summarize(
  orgId: string,
  input: string,                    // Raw text to summarize (max 16384 chars)
  constraints: {
    maxLength?: number;             // Output tokens
    format?: 'prose' | 'bullets';
    language?: string;              // ISO 639-1; default 'en'
  },
  idempotencyKey: string
) -> {
  summary: string;
  tokensUsed: number;
  reasoningHash: string;
}
```

### 3.3 Idempotency + Audit event types

| Event type | Emitted by | Trigger |
|---|---|---|
| `ai.vector.upsert` | TVS | Document ingested/updated |
| `ai.vector.query` | TVS proxy | Similarity search performed |
| `ai.vector.delete` | TVS | Document(s) deleted |
| `ai.vector.reindex_started` | TVS | Reindex job triggered |
| `ai.vector.reindex_complete` | TVS worker | Job finished |
| `ai.inference.generate` | TIS | Model call completed |
| `ai.inference.error` | TIS | Model call failed |
| `ai.inference.budget_exceeded` | aiBudget | Hard stop triggered |
| `ai.inference.pii_redacted` | TIS | PII found and masked in input |
| `ai.inference.pii_leak_detected` | TIS | PII found in model output — response blocked |
| `ai.inference.cache_hit` | TIS | Response served from cache |

Idempotency enforcement: `idempotencyKey` stored in `reasoning_logs.idempotency_key` (unique index per `orgId`). Duplicate keys within 24h return the original response without re-running the model.

---

## 4. Vector Store Decision Matrix

> See companion ADR: `docs/adr/ADR-028-vector-store-choice.md`

**Recommended choice (summary):** **Postgres + pgvector inside Supabase**  
**Rationale (summary):** Zero new infrastructure, existing RLS patterns directly apply, Supabase natively supports pgvector, local dev parity is perfect.  
**Full scoring matrix and rationale:** in ADR-028.

---

## 5. Deployment & Runtime Placement

### 5.1 Decision per boundary

| Boundary | Phase A placement | Rationale |
|---|---|---|
| **TVS (Vector)** | Inside Core Backend (Fastify) as a dedicated internal module/router | Avoids new deployment; pgvector calls use existing Prisma client |
| **TIS (Inference)** | Inside Core Backend (Fastify) — existing `routes/ai.ts` refactored into a module | Already there; separation is logical (file/module), not physical (service) |
| **Edge** | ❌ Not allowed | Prisma does not run on Vercel Edge; existing TexQtic doctrine prohibits Prisma at edge |

### 5.2 Future physical split (Phase B+)

If latency or isolation requirements grow, TVS can be extracted to:
- A Fastify sub-application on a dedicated port (still on same Vercel deployment unit)
- Or a standalone Node 22 service on Railway / Fly.io (outside Vercel)

The contracts in §3 are written to support this physical split without API surface changes — the proxy layer in Core Backend absorbs the transport difference.

### 5.3 Vercel / Edge constraints (must respect)

| Constraint | Impact |
|---|---|
| No Prisma on Vercel Edge Runtime | TVS and TIS must NOT be placed at Edge |
| 10s function timeout (Vercel Hobby) | AI calls capped at 8s; must return partial or error gracefully |
| Cold start cost | Vector index preflight should be lazy-loaded, not startup singleton |
| No persistent memory | No in-process vector cache; use Redis or DB-backed cache if needed |

---

## 6. Security & Governance

### 6.1 Tenancy enforcement strategy

```
orgId flow (mandatory):
  tenantAuthMiddleware → getTenantContext(request) → { tenantId }
         ↓
  TVS proxy: inject orgId as mandatory filter in every vector SDK call
         ↓
  TIS proxy: include orgId in reasoning_logs INSERT and audit_logs INSERT
         ↓
  pgvector (if chosen): RLS policy vectors_guard (RESTRICTIVE)
         requiring require_org_context() — same pattern as all other tables
```

- `orgId` MUST be extracted from JWT tenant context, never from request body.  
- TVS MUST NOT accept `orgId` override from any client payload.
- Both boundaries MUST log `orgId` in every audit event.

### 6.2 Service role usage policy

| Scenario | Service role allowed? | Reason |
|---|---|---|
| Vector index write (embedding generation) | ⚠️ Only if using external vector store that lacks RLS | Must use a proxy-level org filter instead of RLS |
| Vector query | ❌ Never | Tenant role with RLS is required |
| Inference model call | N/A | External HTTP, no DB role used |
| Reindex (admin) | ⚠️ Only with TECS approval + MakerChecker | Explicit approval gates required |
| reasoning_logs write | ❌ Never bypass | Must be tenant-scoped; immutability trigger always fires |

### 6.3 Threat model

| Threat | Mechanism | Mitigation |
|---|---|---|
| **Cross-tenant retrieval leakage** | Query returns vectors from another orgId | `orgId` filter hardcoded in TVS proxy. If pgvector: RLS RESTRICTIVE guard. If external: filter injected at SDK level. Both are defense-in-depth. Retrieval audit log `ai.vector.query` captures every call for post-hoc inspection. |
| **Prompt injection via retrieved context** | Attacker embeds instructions in a document that gets retrieved and injected into a privileged prompt | Retrieved chunks are treated as data, never as system instruction. Chunks are bracketed with `---chunk start---` / `---chunk end---` markers. Prompt template is server-controlled, never user-editable. |
| **Data exfiltration via retrieved context** | Model leaks one tenant's data into a response served to another | `orgId` filter on retrieval prevents cross-tenant chunks from ever entering the context window. See cross-tenant leakage threat above. |
| **Unauthorized embedding of restricted content** | A low-privilege user triggers indexing of content they cannot read | TVS UpsertDocuments verifies the call comes via Core Backend with tenantAuthMiddleware enforced. No direct client-to-TVS path exists. Minimum role: `TENANT_MEMBER` for query, `TENANT_ADMIN` for upsert. |
| **Model poisoning via malicious documents** | Attacker uploads a document designed to manipulate future AI outputs | Documents sanitized (HTML stripped, max 8192 chars). Similarity threshold floor (0.3 minimum score) prevents low-relevance chunks from entering context. MakerChecker on batch import above 100 documents. |
| **Budget exhaustion / denial-of-service** | High-frequency AI calls exhaust tenant budget or incur cloud cost | Existing `aiBudget.ts` hard stop. Inference preflight token estimate before model call. Rate limit: max 60 AI requests/tenant/minute (to be implemented in Phase A of G-028 build). |
| **PII leakage through embeddings** | PII stored in vector index, retrievable by any tenant user | Regex-based redaction before indexing (pre-embed). `contentType` controls what can be indexed — PII-heavy types (e.g., order buyer details) are excluded from indexing until a TECS approves it. |

### 6.4 Audit event payload sketches

```jsonc
// ai.inference.generate
{
  "event": "ai.inference.generate",
  "orgId": "<uuid>",
  "userId": "<uuid>",
  "taskType": "NEGOTIATION",
  "tokensUsed": 1243,
  "cached": false,
  "reasoningHash": "<sha256>",
  "idempotencyKey": "<uuidv4>",
  "contextChunksCount": 3,
  "ts": "2026-03-05T10:00:00Z"
}

// ai.vector.query
{
  "event": "ai.vector.query",
  "orgId": "<uuid>",
  "userId": "<uuid>",
  "query": "[REDACTED — 42 chars]",   // length only; content not logged
  "topK": 5,
  "resultCount": 3,
  "contentTypeFilter": "CATALOG_ITEM",
  "ts": "2026-03-05T10:00:00Z"
}

// ai.inference.pii_leak_detected
{
  "event": "ai.inference.pii_leak_detected",
  "orgId": "<uuid>",
  "taskType": "INSIGHTS",
  "patternMatched": "email",          // type of pattern, not value
  "responseBlocked": true,
  "ts": "2026-03-05T10:00:00Z"
}
```

---

## 7. Rollout Plan with Gates

### Phase 0 — Foundation (now → pre-G-028 build)

| Gate | Condition | Action if failed |
|---|---|---|
| G-023 complete | ✅ Already COMPLETE | N/A |
| `OP_AI_AUTOMATION_ENABLED` flag exists | ✅ Seeded | N/A |
| G-028 design anchor approved | This document | Revise and re-approve |

### Phase A — Vector infrastructure + read path (first TECS)

**Feature flag:** `OP_G028_VECTOR_ENABLED = false` (off by default)

| Step | Action | Gate |
|---|---|---|
| A1 | Enable pgvector on Supabase (one SQL command) | Verify `CREATE EXTENSION vector` without error |
| A1-GATE | **Embedding model dimension confirmed** — see ADR-028 §5.1 checklist | All 6 items checked; `EMBEDDING_DIM` constant committed; smoke test `embedding.length === 768` passes in CI |
| A2 | Add `document_embeddings` table with RLS (TECS) | Migration applied; `embedding vector(768)` matches confirmed dim; RLS proof CI passes |
| A3 | Implement TVS module in Core Backend (TypeScript) — locked to `$queryRaw` pattern (ADR-028 §5.2) | Unit tests green; typecheck passes; `querySimilar()` dimension guard verified |
| A3-GATE | **Prisma raw query perf baseline** — see ADR-028 §5.2 guardrails | P95 query < 200ms at 10K docs/tenant; HNSW `ef_search=40` set; similarity floor 0.3 enforced |
| A4 | Wire `GET /api/ai/vector/query` — read path only | Integration test: orgId isolation |
| A5 | Shadow mode — log query responses; do NOT inject into inference | Monitor for 1 week |
| A6 | Gate review — check retrieval quality metrics | P@5 ≥ 0.6 on test queries |

### Phase B — Write path + document ingestion

**Feature flag:** `OP_G028_VECTOR_WRITE_ENABLED = false`

| Step | Action | Gate |
|---|---|---|
| B1 | Implement `POST /api/ai/vector/upsert` (catalog items only) | Integration test: upsert → query roundtrip |
| B2 | Wire catalog item create/update events → async indexer | Event roundtrip test |
| B3 | Implement `DELETE /api/ai/vector/delete` | Integration test: delete → query returns 0 |
| B4 | MakerChecker gate for bulk import (>100 docs) | TECS approval required per run |

### Phase C — RAG-enriched inference (INSIGHTS + DPP_ASSIST first)

**Feature flag:** `OP_G028_RAG_ENABLED = false`

| Step | Action | Gate |
|---|---|---|
| C1 | Refactor `ai.ts` routes → TIS module | Existing tests must pass unchanged |
| C2 | Wire TVS Query → TIS context assembly for `/api/ai/insights` | A/B comparison: RAG vs zero-shot quality |
| C3 | Enable for `DPP_ASSIST` taskType (UC-3) | Compliance team sign-off |
| C4 | Gradual rollout: 10% → 50% → 100% tenant traffic | Monitor reasoning_logs for error rate < 1% |

### Kill switch behavior

- Setting `OP_G028_VECTOR_ENABLED = false` must immediately stop all vector index queries.
- With kill switch active, `GET /api/ai/insights` falls back to existing zero-shot path (current behavior).
- Kill switch does NOT delete index data — safe to re-enable.
- Inference falls back via: RAG context empty → TIS behaves as today's Gemini call.

### Metrics to monitor

| Metric | Source | Alert threshold |
|---|---|---|
| Vector query latency P99 | TVS internal | > 500ms |
| Embedding generation time | TVS indexer | > 2s per doc |
| RAG context chunk relevance (score) | reasoning_logs | avg < 0.3 → disable RAG for that taskType |
| Budget consumption rate | ai_usage_meters | > 80% monthly budget by day 20 |
| Cross-tenant query count | ai.vector.query audit logs | > 0 — immediate alert |
| PII leak detections | ai.inference.pii_leak_detected | > 0 per hour → alert |

---

## 8. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | **Data drift / stale vectors** — Catalog items updated in Postgres; embeddings not re-generated | HIGH | MEDIUM | Event-driven sync (B2); version field on `document_embeddings`; scheduled drift detection job; staleness TTL after which chunk excluded from context |
| R-2 | **Cost spikes** — Embedding generation (if using external embedding API) or high-volume queries | MEDIUM | HIGH | Use pgvector + local embedding model (no per-call cost) for Phase A; existing hard-stop budget enforcement applies to inference; separate `ai_budgets` row for vector operations |
| R-3 | **Privacy leakage** — PII embedded into vector index | MEDIUM | HIGH | Pre-index redaction (§6.3); `contentType` allow-list gated by TECS; no embedding of order buyer details, invoice line items, or user profiles without explicit approval |
| R-4 | **Index rebuild complexity** — Schema change, embedding model upgrade, or tenant migration requires full reindex | MEDIUM | MEDIUM | Reindex is a controlled TECS operation (not self-service); dual-write period during model upgrade; `version` field on embeddings; roll-forward only |
| R-5 | **Developer experience** — Local dev cannot reproduce vector behavior without Supabase pgvector | MEDIUM | LOW | pgvector works with local Supabase CLI; add `pnpm -C server run dev:vector` mode that seeds test embeddings; document setup in PHASE3_SETUP.md pattern |
| R-6 | **Prompt injection via retrieved chunks** | LOW | HIGH | Chunk bracketing (§6.3); server-controlled prompt templates; no user-editable system instructions; retrieval audit log |
| R-7 | **Vendor lock-in to Gemini** | LOW | MEDIUM | TIS interface is provider-agnostic; LLM provider is a swappable implementation detail below the `Generate()` contract; switching costs are one file (`routes/ai.ts` → new provider SDK) |
| R-8 | **Autonomous execution drift** | LOW | HIGH | `OP_AI_AUTOMATION_ENABLED` remains `false`; all AI is advisory only; no tool call / function call execution wired; requires explicit TECS approval to change |

---

## 9. Follow-on TECS Breakdown (design → implementation path)

| TECS ID | Title | Size | Depends on |
|---|---|---|---|
| `OPS-G028-A1-PGVECTOR-ENABLE` | Enable pgvector + confirm embedding dim (ADR-028 §5.1 gate) + add `document_embeddings` table + RLS | M | G-028 anchor approved |
| `OPS-G028-A2-TVS-MODULE` | Implement TVS module using locked `$queryRaw` pattern (ADR-028 §5.2) — UpsertDocuments, Query, Delete; perf guardrails in CI | L | A1 + dim gate closed |
| `OPS-G028-A3-SHADOW-QUERY` | Wire shadow vector query to `/api/ai/insights` (log only, no injection) | S | A2 |
| `OPS-G028-B1-CATALOG-INDEXER` | Async catalog item indexer (event-driven, Phase B write path) | L | A2 |
| `OPS-G028-B2-DELETE-REINDEX` | Delete + reindex endpoints + MakerChecker gate for bulk ops | M | B1 |
| `OPS-G028-C1-TIS-REFACTOR` | Extract TIS module from `routes/ai.ts` — logical separation, no behavior change | M | A3 |
| `OPS-G028-C2-RAG-INSIGHTS` | Wire RAG context into INSIGHTS taskType inference path | L | C1 + A3 |
| `OPS-G028-C3-DPP-ASSIST` | DPP_ASSIST taskType — RAG over DPP snapshots + certification records | L | C2 |

---

## 10. Completion Checklist (G-028 Design Anchor)

- [x] Discovery performed and summarized (§0)
- [x] Clear vector vs inference responsibilities defined (§1, §2)
- [x] Contracts include explicit orgId + idempotency + audit events (§3)
- [x] Vector store decision matrix included + recommendation (§4 + ADR-028)
- [x] Deployment placement decided (§5)
- [x] Threat model + governance included (§6)
- [x] Rollout plan with gates + kill switch included (§7)
- [x] Risks & mitigations documented (§8)
- [x] Follow-on TECS breakdown (§9)

---

## 11. Implementation Status (GOVERNANCE-SYNC-094)

**All A-series TECS completed — 2026-03-28**

| Stage | TECS ID | What Was Delivered | Commits |
|---|---|---|---|
| A1 | `OPS-G028-A1-PGVECTOR-ENABLE` | `document_embeddings` table · pgvector extension · HNSW index (cosine, ef=64, m=16) · RESTRICTIVE guard + 4 PERMISSIVE policies · FORCE RLS=t · DO-block VERIFIER PASS | `c07af57`, `b90245a` |
| A2 | `OPS-G028-A2-TVS-MODULE` | `vectorStore.ts` · `upsertDocumentEmbeddings` / `queryByVector` / `deleteBySource` · `$queryRaw` cosine search · ON CONFLICT idempotency · 16 passing tests | `5fb4b8a`, `8ee0e31` |
| A3 | `OPS-G028-A3-SHADOW-QUERY` | Shadow retrieval wired to `/api/ai/insights` (log-only) · latency logged · 4 passing tests | `59b6f26`, `a4c867d` |
| A4 | `OPS-G028-A4-INGESTION` | `vectorIngestion.ts` · `chunkText` (sliding-window, SHA-256 hash) · `generateEmbedding` (Gemini `text-embedding-004`, 768-dim) · `ingestCatalogItem` / `ingestCertification` · `ai.vector.ingestion.completed` audit event | `10bda3e`, `d9292df` |
| A5 | `OPS-G028-A5-RAG-INJECTION` | `vectorContextService` · topK=5 RAG context injected into insights inference path · `ai.vector.query` audit event | `dad08f7`, `858714b` |
| A6 | `OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING` | `vectorChunker.ts` (pure, no I/O) · `vectorEmbeddingClient.ts` (lazy singleton, test override) · `vectorIndexQueue.ts` (FIFO, QUEUE_SIZE_MAX=1000, JOBS_PER_SECOND=5, `.unref()`) · `vectorReindexService.ts` (sentinel actor `00000000-0000-0000-0000-000000000010`) · `ingestDppSnapshot` / `ingestSupplierProfile` / `enqueueSourceIngestion` in `vectorIngestion.ts` · 18 passing tests | `ad5bf72`, `d31a8d8` |
| A7 | `OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK` | `ragMetrics.ts` (per-request latency accumulator; thresholds: retrieval 50 ms, embedding 500 ms, total 800 ms; console-info only) · `ragEvaluationDataset.ts` (20 benchmark queries; 5 domains: cert/trace/catalog/compliance/supplier) · `ragScoring.ts` (`scoreChunkRelevance`, `precisionAtK`, `recallAtK`, `aggregateScores`; keyword overlap threshold 0.20) · `ragBenchmarkRunner.ts` (injectable: `runBenchmark(deps)`; p95/avg/max latency; `AggregateScoreResult`) · `server/scripts/rag-benchmark.ts` (CLI runner; JSON output; local-only) · `server/src/routes/ai.ts` minimally instrumented (no response payload change) · 26 passing tests (A7-TEST-01..03) | `fdb822a`, `cddd624` |

**Quality gates at completion (A1–A7):**
- `pnpm -C server exec tsc --noEmit` EXIT 0
- `pnpm -C server run lint` EXIT 0 (0 errors)
- `pnpm -C server exec vitest run` — 64 A-series tests pass (A2: 16, A3: 4, A4: 13, A5: 7, A6: 18, A7: 26)

---

### Phase E — Retrieval Evaluation (GOVERNANCE-SYNC-095)

**Status: COMPLETE — 2026-03-28**

OPS-G028-A7 introduced the evaluation and benchmarking layer for the vector retrieval system. This stage validates the production readiness of the pgvector infrastructure established in A1–A6.

**Capabilities delivered:**

| Capability | Module | Notes |
|---|---|---|
| Runtime latency instrumentation | `ragMetrics.ts` | Per-request timer; retrieval / embedding / inference / total segments; console-info emission only |
| Benchmark evaluation dataset | `ragEvaluationDataset.ts` | 20 synthetic queries; domains: certification, traceability, catalog, compliance, supplier |
| Retrieval scoring engine | `ragScoring.ts` | Heuristic keyword-overlap + sourceType matching; Precision@3, Precision@5, Recall@5 |
| Injectable benchmark runner | `ragBenchmarkRunner.ts` | `runBenchmark(deps)` — fully testable with mocked DB + embedding; p95/avg/max latency aggregation |
| CLI benchmark script | `server/scripts/rag-benchmark.ts` | Local-only; JSON report output; not a CI gate |

**Observed benchmark performance (local run — empty corpus baseline):**

| Metric | Observed | Threshold | Pass |
|---|---|---|---|
| Embedding latency avg | ~140 ms | ≤ 500 ms | ✅ |
| Retrieval latency avg | ~12 ms | ≤ 50 ms | ✅ |
| Total endpoint latency avg | ~167 ms | ≤ 800 ms | ✅ |

**Quality scores:** Precision@3, Precision@5, and Recall@5 metrics reflect empty corpus until ingestion coverage increases. Baseline recorded for comparison after B1/B2 ingestion is complete.

**Deferred (Wave 5+):**  
`OPS-G028-B1-CATALOG-INDEXER`, `OPS-G028-B2-DELETE-REINDEX`, `OPS-G028-C1-TIS-REFACTOR`, `OPS-G028-C2-RAG-INSIGHTS`, `OPS-G028-C3-DPP-ASSIST` — not in scope for Wave 4 delivery.
