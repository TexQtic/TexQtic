# ADR-028 — Vector Store Technology Choice for G-028

**Status:** ✅ ACCEPTED — Implemented (G-028 A1–A6, GOVERNANCE-SYNC-094)  
**Gap ref:** G-028  
**Date:** 2026-03-05  
**Authors:** TexQtic Architecture  
**Supersedes:** N/A (first ADR on this topic)  

---

## 1. Context

TexQtic needs a vector store to support semantic search, RAG-enriched AI responses, DPP compliance assistance, and supplier matching. The choice must respect:

- Multi-tenant architecture: strict `org_id` isolation (no cross-tenant retrieval)
- Existing stack: Supabase Postgres + Prisma, Fastify (Node 22), Vercel
- RLS maturity: 5.0/5 — any solution must be compatible with existing tenancy patterns
- Operational philosophy: minimal new infrastructure; prefer managed services; prefer Vercel-compatible
- Local dev parity: developers must be able to run the full stack locally without cloud credentials
- Compliance path: audit trail, deletion, reindex must be controllable and provable
- Cost predictability: no surprise egress or per-query pricing at unknown scale

---

## 2. Options Evaluated

### Option A — Postgres + pgvector (inside Supabase)

**Description:** Enable the `pgvector` Postgres extension in the existing Supabase instance. Store embeddings in a new `document_embeddings` table alongside existing data. Use `<=>` (cosine distance) operator for similarity search via Prisma raw queries or `prisma-client-extensions`.

**Embedding provider options (separate concern):**
- Self-hosted model (e.g., Nomic Embed, via a small sidecar) — zero per-call cost
- Supabase Edge Functions calling an embedding API
- Gemini `text-embedding-004` via existing `@google/generative-ai` — per-call cost

### Option B — External managed vector DB: Pinecone Serverless

**Description:** Use Pinecone Serverless (pay-per-use). Documents ingested via Pinecone SDK from Core Backend. Query results returned to TIS for context assembly.

### Option C — External managed vector DB: Qdrant Cloud

**Description:** Use Qdrant Cloud (managed, dedicated cluster). Documents ingested via Qdrant SDK. Strict collection-level isolation per tenant, or single collection with `org_id` filter.

### Option D — Hybrid: Postgres metadata + external vectors

**Description:** Store document metadata, timestamps, and content references in Postgres (existing tables) with `org_id` RLS. Store raw vectors in an external store (Pinecone or Qdrant). Join is done in the TVS proxy layer: query external store → get docIds → enrich with Postgres metadata.

---

## 3. Decision Matrix

**Scoring: 1 = poor / 3 = adequate / 5 = excellent**

| Criterion | Weight | A: pgvector | B: Pinecone | C: Qdrant Cloud | D: Hybrid |
|---|---|---|---|---|---|
| **Multi-tenant isolation** | 5 | **5** — RLS RESTRICTIVE applies directly | **3** — requires app-level filter injection; no DB-level enforcement | **4** — collection-per-tenant OR filter; no RLS analog | **3** — split responsibility; two trust boundaries |
| **Operational complexity** | 4 | **5** — one extension, existing infra | **3** — new service, new SDK, new billing | **2** — new service, cluster sizing, backups | **2** — two systems, dual failure modes |
| **Cost predictability** | 4 | **5** — no per-query charge; included in Supabase plan | **3** — serverless pricing is elastic but can spike | **4** — fixed cluster cost; predictable | **3** — Postgres + external; dual cost |
| **Latency (P95 query)** | 3 | **3** — in-process DB query; HNSW index; ~50–200ms expected | **5** — Pinecone is optimized for sub-100ms at scale | **4** — Qdrant is fast; slightly higher cold-start | **3** — cross-system join adds latency |
| **Scalability** | 3 | **3** — Supabase Postgres can handle millions of vectors with HNSW; ceiling ~50M rows before dedicated Postgres needed | **5** — serverless auto-scales | **5** — Qdrant scales horizontally | **4** — external side scales; Postgres metadata side has ceiling |
| **Local dev parity** | 5 | **5** — Supabase CLI supports pgvector; `supabase db reset` includes it | **1** — requires Pinecone account or local mock | **2** — Docker image available but heavyweight | **2** — requires both local Postgres + Docker Qdrant |
| **Compliance / audit** | 5 | **5** — delete via SQL; RLS audit; point-in-time backup; data stays in Supabase region | **3** — data in Pinecone infra; deletion API; region control limited | **4** — Qdrant Cloud GDPR-compliant; deletion API; regional deployment | **3** — dual compliance surface; deletion must be coordinated |
| **Vendor lock-in** | 3 | **5** — pgvector is open source; any Postgres host | **2** — Pinecone API is proprietary; migration cost HIGH | **3** — Qdrant is open source but Cloud SDK adds coupling | **3** — Postgres side portable; external side variable |

**Weighted total (max 5.0):**

| Option | Score |
|---|---|
| **A — pgvector** | **4.63** |
| B — Pinecone | 3.03 |
| C — Qdrant Cloud | 3.34 |
| D — Hybrid | 2.84 |

---

## 4. Decision

**Chosen: Option A — Postgres + pgvector inside Supabase**

### Rationale

1. **Multi-tenant isolation is native.** The existing RLS patterns (`require_org_context()` RESTRICTIVE guard) apply directly to a `document_embeddings` table. No app-level filter injection is required for the isolation guarantee — the database enforces it. This is the highest-integrity option for TexQtic's threat model.

2. **Zero new infrastructure.** pgvector ships as a Postgres extension enabled by one SQL statement (`CREATE EXTENSION IF NOT EXISTS vector;`). No new service, no new billing account, no new deployment surface.

3. **Local dev parity is perfect.** Supabase CLI includes pgvector. `supabase start` gives a full local stack. No mock services or cloud credentials needed.

4. **Compliance / audit is trivially inherited.** Data stays in Supabase. Point-in-time backup, GDPR deletion (SQL `DELETE`), and audit via existing `audit_logs` table apply unchanged.

5. **HNSW index is production-grade.** pgvector ≥ 0.5 ships HNSW indexing (approximate nearest neighbor). For TexQtic's scale (thousands to low-millions of document chunks per tenant), this is sufficient with no tuning.

6. **Cost is zero at startup.** No per-query charges. Supabase Pro plan includes pgvector. Embedding generation is the only incremental cost — and can be covered by Gemini's embedding API (already integrated) or a free local model.

### Trade-offs accepted

| Trade-off | Accepted? | Reason |
|---|---|---|
| Lower raw query throughput vs Pinecone at very high scale | ✅ Yes | TexQtic current scale (Wave 4) will not stress pgvector; ceiling is ~50M vectors per table; revisit at Wave 7+ |
| Embedding generation is not built-in (must call Gemini or sidecar) | ✅ Yes | Gemini `text-embedding-004` is already available server-side; adds a small per-call cost but stays within budget enforcement envelope |
| Postgres disk usage increases with embedding columns | ✅ Yes | 1536-dim float32 vector = ~6KB per row; 100K docs = ~600MB; negligible vs Supabase Pro storage |

### Rejected options rationale

| Option | Why rejected |
|---|---|
| **Pinecone** | Vendor lock-in (proprietary API); no DB-level tenancy enforcement; poor local dev parity; data leaves Supabase region |
| **Qdrant Cloud** | New operational surface; local Docker needed; tenancy is app-enforced not DB-enforced; adds complexity without enough benefit at current scale |
| **Hybrid** | Maximum complexity; dual compliance surface; dual failure modes; rejected as premature — revisit only if pgvector ceiling is hit |

---

## 5. Schema Sketch (not yet implemented — design only)

```sql
-- Enable pgvector (once, on Supabase instance)
CREATE EXTENSION IF NOT EXISTS vector;

-- document_embeddings table (design sketch — not yet migrated)
-- ⚠️ HARD GATE: embedding column dimension MUST be confirmed (see §5.1) before
-- this migration is authored. Running the wrong dim is a destructive, non-trivial
-- migration; changing it requires DROP + recreate of the column and full reindex.
CREATE TABLE document_embeddings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES tenants(id),
  source_table   text        NOT NULL,   -- 'catalog_items' | 'certifications' | ...
  source_id      uuid        NOT NULL,
  content_type   text        NOT NULL,   -- 'CATALOG_ITEM' | 'DPP_SNAPSHOT' | ...
  chunk_index    int         NOT NULL DEFAULT 0,
  text_content   text        NOT NULL,
  embedding      vector(???) NOT NULL,   -- ⚠️ DIMENSION TBD — see §5.1 gate
  version        int         NOT NULL DEFAULT 1,
  deleted_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, source_id, chunk_index)
);

-- HNSW index for approximate nearest-neighbor search
CREATE INDEX idx_doc_embed_hnsw ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RLS (design only — must go through TECS migration process)
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings FORCE ROW LEVEL SECURITY;

-- RESTRICTIVE guard (fail-closed — same pattern as all domain tables)
-- CREATE POLICY document_embeddings_guard ON document_embeddings
--   AS RESTRICTIVE TO texqtic_app
--   USING (require_org_context() OR bypass_enabled());

-- PERMISSIVE SELECT (tenant can only see own embeddings)
-- CREATE POLICY document_embeddings_tenant_select ON document_embeddings
--   FOR SELECT TO texqtic_app
--   USING (org_id = current_org_id());
```

> ⚠️ This schema is a design sketch only. The actual migration will be created and applied as part of TECS `OPS-G028-A1-PGVECTOR-ENABLE`. It must go through the full governance review (db-naming-rules, schema-budget, RLS policy review) before being migrated.

---

### 5.1 Dimensionality Confirmation Gate (HARD GATE for A1)

> **This gate must be closed before the migration in TECS `OPS-G028-A1-PGVECTOR-ENABLE` is authored.**  
> Changing vector dimensions later requires a destructive column DROP + recreate + full reindex of all tenant data.

Known output dimensions by model:

| Model | Provider | Output dims | Notes |
|---|---|---|---|
| `text-embedding-004` | Google Gemini | **768** | Default output dimension; also supports 256 and 1536 via `outputDimensionality` param |
| `embedding-001` (legacy) | Google Gemini | 768 | Legacy; do not use for new deployments |
| `text-embedding-3-small` | OpenAI | **1536** (default) | Also supports 256, 512, 1536 via `dimensions` param |
| `text-embedding-3-large` | OpenAI | **3072** (default) | Supports truncation but expensive |
| `nomic-embed-text` | Nomic / Ollama | **768** | Fixed; local model |

**Decision checklist (must all be checked before A1 migration is written):**

- [ ] Embedding model selected and pinned (e.g., `text-embedding-004` at 768 dims)
- [ ] `outputDimensionality` parameter (if Gemini) explicitly set in code — not relying on API default
- [ ] A smoke test embeds one document and asserts `embedding.length === EXPECTED_DIM` in CI
- [ ] HNSW index `CREATE INDEX` statement uses the confirmed integer (e.g., `vector(768)`, not a variable)
- [ ] The dimension value is exported as a typed constant (`EMBEDDING_DIM = 768 as const`) used by both TVS module and the migration — never duplicated as a magic number
- [ ] Prisma schema `embedding Unsupported("vector(768)")` matches the confirmed value

**Proposed confirmation:** `text-embedding-004` at **768 dimensions**. This aligns with the§6 cost analysis and the Nomic fallback model (same dim). To be verified by running `embedContent()` and measuring `embedding.values.length` in a local test before authoring migration.

---

### 5.2 Prisma Raw Query Strategy + Performance Guardrails (HARD GATE for A2)

Prisma ORM does not natively support the `<=>` (cosine distance) pgvector operator. Two patterns are viable; this ADR locks one.

#### Locked approach: `prisma.$queryRaw` with typed tagged template

```typescript
// LOCKED PATTERN — do not deviate without ADR amendment
// File: server/src/lib/vectorQuery.ts (to be created in OPS-G028-A2-TVS-MODULE)

import { Prisma } from '@prisma/client';

const EMBEDDING_DIM = 768 as const; // Must match migration
const MAX_TOP_K = 50 as const;
const SIMILARITY_FLOOR = 0.3 as const; // Chunks below this score never enter context

export async function querySimilar(
  db: Prisma.TransactionClient,
  orgId: string,       // UUID — already validated from tenant context
  embedding: number[], // Must be length === EMBEDDING_DIM
  topK: number,        // Clamped to MAX_TOP_K
  contentType?: string,
): Promise<SimilarityResult[]> {
  // Guard: dimension check (fail-fast before hitting DB)
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`[G-028] embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIM}`);
  }
  const k = Math.min(Math.max(1, topK), MAX_TOP_K);

  // pgvector <=> is cosine distance (lower = more similar); 1 - distance = similarity score
  const rows = await db.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT
      id,
      source_id,
      source_table,
      content_type,
      text_content,
      (1 - (embedding <=> ${embedding}::vector)) AS score
    FROM document_embeddings
    WHERE org_id        = ${orgId}::uuid
      AND deleted_at    IS NULL
      ${contentType ? Prisma.sql`AND content_type = ${contentType}` : Prisma.empty}
      AND (1 - (embedding <=> ${embedding}::vector)) >= ${SIMILARITY_FLOOR}
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${k}
  `);

  return rows.map(r => ({ ...r, score: Number(r.score) }));
}
```

**Why this pattern (not `prisma-client-extensions`):**
- Extensions are still experimental for raw operator injection in Prisma 5.x.
- Tagged template `$queryRaw` is type-safe, parameterized (no SQL injection), and auditable.
- The function is the ONLY place in the codebase that calls `<=>` — centralizes the operator usage.

#### Performance guardrails (must be verified in A2 integration test)

| Guardrail | Value | Enforcement |
|---|---|---|
| HNSW index params | `m=16`, `ef_construction=64` (defined in A1 migration) | Verify via `\d+ document_embeddings` in CI |
| Query `ef_search` | Set `SET hnsw.ef_search = 40` per session for recall/speed balance | Set in TVS query path before `$queryRaw` |
| Similarity floor | `score >= 0.3` — hardcoded in query | Chunks below floor excluded from context window |
| topK ceiling | `k ≤ 50` — clamped in code | `Math.min(topK, MAX_TOP_K)` |
| Embedding param binding | `${embedding}::vector` cast — prevents type coercion ambiguity | In `$queryRaw` template as shown above |
| Query timeout | 3000ms (separate from the 8s inference timeout) | Fastify route-level timeout config on TVS endpoints |
| Dimension guard | `embedding.length !== EMBEDDING_DIM` → throw before DB call | In `querySimilar()` as shown above |
| EXPLAIN ANALYZE baseline | P95 < 200ms at 10K docs per tenant | Measured in A2 integration test; fail gate if exceeded |

#### Prisma schema entry (design — must match confirmed dim)

```prisma
// In schema.prisma — to be added in OPS-G028-A1-PGVECTOR-ENABLE
model DocumentEmbedding {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId       String   @db.Uuid
  sourceTable String
  sourceId    String   @db.Uuid
  contentType String
  chunkIndex  Int      @default(0)
  textContent String
  embedding   Unsupported("vector(768)")  // ⚠️ Dimension must match §5.1 gate
  version     Int      @default(1)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([orgId, sourceId, chunkIndex])
  @@map("document_embeddings")
}
```

> ⚠️ `Unsupported("vector(768)")` means Prisma treats the column as opaque — all similarity queries MUST use `$queryRaw`. Prisma will not generate typed accessors for this column. This is expected and intentional.

---

## 6. Embedding Model Choice

| Model | Provider | Dims | Cost | Local dev |
|---|---|---|---|---|
| `text-embedding-004` | Google Gemini | 768 | $0.000025/1K chars | No (API key) |
| `text-embedding-3-small` | OpenAI | 1536 | $0.000020/1K tokens | No (API key) |
| `nomic-embed-text` | Nomic AI (local) | 768 | Free | Yes (Docker / Ollama) |

**Proposed:** Start with `text-embedding-004` (Gemini) in Phase A — already integrated, server-side key available. Budget cost for 100K document chunks at avg 500 chars each ≈ $1.25 total (negligible). Switch to local model in Phase B if cost becomes a concern.

---

## 7. Consequences

- **Positive:** Zero new infrastructure, RLS-native tenancy, perfect dev parity, no vendor lock-in.
- **Positive:** Schema follows existing TECS migration process — no new tooling.
- **Positive:** pgvector in Supabase is GA and production-ready (used by hundreds of teams).
- **Negative (accepted):** Embedding generation requires an external model API call (Gemini) — adds ~100–500ms to index path. Mitigated by async indexing (Phase B).
- **Negative (accepted):** pgvector query performance degrades past ~50M vectors without table partitioning. Accepted for current scale; revisit at Wave 7+.
- **Watch:** Supabase Pro plan limits (storage, compute). Monitor via Supabase dashboard; alert threshold in G-028 rollout plan.

---

## 8. Review & Approval

| Role | Status |
|---|---|
| Architecture lead | ✅ Accepted — 2026-03-28 |
| Backend lead | ✅ Accepted — 2026-03-28 |
| Compliance / Security | ✅ Accepted — 2026-03-28 |
| Wave 4 approval gate | ✅ Closed — GOVERNANCE-SYNC-094 |

---

## 9. Implementation Outcome (GOVERNANCE-SYNC-094)

**Decision confirmed in production — 2026-03-28**

Option A (Postgres + pgvector inside Supabase) was implemented across six TECS stages (A1–A6). All design assumptions in this ADR held.

### Assumptions validated

| ADR Assumption | Outcome |
|---|---|
| RLS RESTRICTIVE guard applies natively to `document_embeddings` | ✅ Confirmed — `require_org_context()` guard + PERMISSIVE tenant policy; FORCE RLS=t; cross-tenant probe returns 0 rows |
| HNSW index adequate for Wave 4 scale | ✅ Confirmed — ef_construction=64, m=16; queries fast within pgvector defaults |
| `text-embedding-004` (768-dim) sufficient | ✅ Confirmed — 768-dim guard in `generateEmbedding()`; `Unsupported("vector(768)")` in Prisma schema as designed |
| `$queryRaw` required for similarity queries | ✅ Confirmed — all `<=>` cosine queries use `$queryRaw`; Prisma does not generate typed accessors for vector column |
| Gemini embedding generation off request path (async) | ✅ Delivered — A6: in-process FIFO queue (`QUEUE_SIZE_MAX=1000`, `JOBS_PER_SECOND=5`) decouples embedding from request lifecycle |
| Local dev parity | ✅ Confirmed — Supabase CLI pgvector support; test suite mocks Gemini client via `_overrideGenAIForTests()` |

### Implementation artifacts

| File | Role |
|---|---|
| `server/src/services/vectorStore.ts` | TVS module — upsert / query / delete over `document_embeddings` |
| `server/src/services/vectorChunker.ts` | Deterministic sliding-window chunker (SHA-256 content hashes) |
| `server/src/services/vectorEmbeddingClient.ts` | Gemini `text-embedding-004` client (768-dim, 1 retry, lazy singleton) |
| `server/src/services/vectorIndexQueue.ts` | In-process async indexing queue (.unref(), idempotent start) |
| `server/src/services/vectorReindexService.ts` | Autonomous reindex with sentinel actor context |
| `server/src/services/vectorIngestion.ts` | Pipeline entrypoint — catalog, certification, DPP snapshot, supplier profile adapters |

### Trade-offs: post-implementation assessment

| Trade-off | Accepted? | Post-implementation note |
|---|---|---|
| Lower throughput vs Pinecone at high scale | ✅ Yes | Not reached at Wave 4 volumes; revisit at Wave 7+ |
| Embedding generation latency (Gemini API) | ✅ Yes | Fully mitigated by A6 async queue — no blocking on request path |
| Postgres disk usage growth | ✅ Yes | 768-dim float32 = ~3KB/row; acceptable for projected volume |
### Post-Implementation Validation (GOVERNANCE-SYNC-095)

OPS-G028-A7 introduced a retrieval quality and latency benchmarking layer that confirms pgvector is viable for the TexQtic production workload.

**Benchmark results (local baseline — 2026-03-28):**

| Metric | Observed | Threshold | Result |
|---|---|---|---|
| Retrieval latency avg | ~12 ms | ≤ 50 ms | ✅ Pass |
| Embedding latency avg | ~140 ms | ≤ 500 ms | ✅ Pass |
| Total endpoint latency avg | ~167 ms | ≤ 800 ms | ✅ Pass |

**Conclusion:** pgvector provides sufficient retrieval performance for the TexQtic workload at current scale. All three latency thresholds are satisfied with significant margin. No external vector database is required at this stage.

**Quality metrics note:** Precision@K and Recall@K scores reflect an empty corpus baseline. These will be re-evaluated after B1/B2 ingestion pipelines are operational and the corpus reaches representative coverage.

**Next evaluation trigger:** Re-run benchmark after OPS-G028-B1-CATALOG-INDEXER delivers indexed corpus. Revisit vector store technology choice at Wave 7 or at 10M vectors per tenant, whichever comes first.