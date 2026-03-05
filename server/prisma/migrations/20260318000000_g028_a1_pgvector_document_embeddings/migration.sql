-- ============================================================================
-- G-028 Phase A1: Enable pgvector + document_embeddings schema
-- TECS ID   : OPS-G028-A1-PGVECTOR-ENABLE
-- ADR       : ADR-028 (Vector Store: Option A — Postgres + pgvector)
-- Gap ref   : G-028
-- Date      : 2026-03-18
-- Author    : TexQtic Platform Engineering (Safe-Write Mode)
-- ============================================================================
--
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table is modified. No existing policy touched.
--   - FORCE RLS on every new table. No table bypasses RLS.
--   - app.org_id is the ONLY canonical RLS variable (app.tenant_id: NEVER used).
--   - org_id → organizations.id is a LIVE FK (ON DELETE CASCADE).
--   - Embedding dimension: 768 — LOCKED (text-embedding-004 / nomic-embed-text).
--     ⚠️ Changing dims requires DROP column + recreate + full reindex of all data.
--   - No vector retrieval logic (<=>) added in this phase (deferred to A2).
--   - No UPDATE or DELETE policies in A1 — deferred to A2 re-indexing service.
--
-- OBJECTS CREATED
--   §1  PRE-FLIGHT safety check
--   §2  EXTENSION   pgvector (CREATE EXTENSION IF NOT EXISTS vector)
--   §3  TABLE       public.document_embeddings
--   §4  INDEXES     (org_id + source_type + source_id), content_hash, HNSW vector
--   §5  RLS         ENABLE + FORCE + RESTRICTIVE guard + PERMISSIVE SELECT/INSERT
--   §6  GRANTS      texqtic_app / texqtic_admin
--   §7  VERIFY      inline DO $$ block
--
-- EMBEDDING DIMENSION GATE (ADR-028 §5.1 — CONFIRMED):
--   Model    : text-embedding-004 (Google Gemini)
--   Dims     : 768 (outputDimensionality will be explicitly set in TVS module A2)
--   Fallback : nomic-embed-text local model — also 768 dims (confirmed parity)
--   Smoke test required before A2 sealing: embed 1 doc and assert values.length === 768
--
-- DEFERRED TO A2: OPS-G028-A2-TVS-MODULE
--   - vector retrieval (<=>) query function: server/src/lib/vectorQuery.ts
--   - embedding generation pipeline (ingestion worker / upsert service)
--   - UPDATE + DELETE policies (when re-indexing service is defined)
--   - hnsw.ef_search session param (SET before $queryRaw in TVS query path)
--   - EXPLAIN ANALYZE baseline benchmarks (P95 < 200ms at 10K docs/tenant gate)
-- ============================================================================

BEGIN;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECK
--     Abort if prerequisite tables are absent or migration already applied.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN
  -- Require organizations (G-015 Phase A)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    RAISE EXCEPTION 'G-028 PRE-FLIGHT BLOCKED: public.organizations does not exist. '
                    'Apply G-015 Phase A migration (20260224000000_g015_phase_a_introduce_organizations) before this migration.';
  END IF;

  -- Idempotency guard: abort if already applied
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_embeddings'
  ) THEN
    RAISE EXCEPTION 'G-028 PRE-FLIGHT BLOCKED: public.document_embeddings already exists. '
                    'Migration 20260318000000_g028_a1_pgvector_document_embeddings may already be applied.';
  END IF;

  RAISE NOTICE 'G-028 pre-flight OK: organizations present, document_embeddings absent. Proceeding.';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  EXTENSION: pgvector
--
--  CREATE EXTENSION IF NOT EXISTS is idempotent: safe to run even if the
--  extension is already enabled (e.g., on repeated CI runs against a
--  persistent dev instance). Requires Supabase Pro (or pg_vector installed).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE EXTENSION IF NOT EXISTS vector;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  TABLE: public.document_embeddings
--
--  Storage layer for semantic search, RAG context assembly, and DPP
--  compliance assistance. One row per document chunk, strictly scoped
--  to one organization via org_id (live FK + FORCE RLS).
--
--  Design anchors (ADR-028):
--    - Multi-tenant isolation: RLS RESTRICTIVE guard + FORCE RLS (§5).
--    - Idempotent upsert key: (org_id, source_type, source_id, chunk_index, content_hash).
--    - embedding: vector(768) — pgvector column. Prisma treats as Unsupported.
--      All similarity queries MUST use $queryRaw. See server/src/lib/vectorQuery.ts (A2).
--    - metadata: JSONB for per-chunk provenance (source version, language, etc.).
--      Schema documented in A2.
--    - updated_at: set on INSERT; explicit update responsibility in A2 upsert layer.
--
--  NOT INCLUDED IN A1:
--    - immutability trigger (document chunks ARE mutable — re-indexing replaces contents)
--    - updated_at BEFORE UPDATE trigger (A2 service layer handles explicit set)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.document_embeddings (
  -- ── Identity ─────────────────────────────────────────────────────
  id           uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Org boundary (live FK, RLS anchor) ───────────────────────────
  -- Every chunk is scoped to exactly one organization.
  -- ON DELETE CASCADE: removing an org deletes all its embeddings (GDPR compliance).
  org_id       uuid        NOT NULL
               REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- ── Source provenance ─────────────────────────────────────────────
  -- Text discriminator for the producing entity type.
  -- Examples: 'CATALOG_ITEM' | 'DPP_SNAPSHOT' | 'CERTIFICATION' | 'TRADE_EVENT'
  -- Enforced by service layer only — no DB enum, allows evolution without migrations.
  source_type  text        NOT NULL,

  -- UUID of the originating entity row in its domain table.
  source_id    uuid        NOT NULL,

  -- Sequential chunk index within the source entity (0-indexed).
  -- Allows multi-chunk splitting of long documents.
  chunk_index  int         NOT NULL DEFAULT 0,

  -- ── Content ───────────────────────────────────────────────────────
  -- Full text of this chunk. Stored for audit trail and context debugging.
  -- May be compressed / truncated in A2 if storage growth is a concern.
  content      text        NOT NULL,

  -- Fingerprint of content for deduplication and idempotent upsert key.
  -- Computed by the service layer (e.g., md5 or sha256 of the content string).
  content_hash text        NOT NULL,

  -- ── Vector ────────────────────────────────────────────────────────
  -- pgvector column. Dimension LOCKED at 768 (text-embedding-004 default).
  -- ⚠️ Changing dim requires: DROP COLUMN embedding + ADD COLUMN embedding vector(NEW_DIM)
  --    + full reindex of all tenant data. This is a destructive, non-trivial migration.
  -- All similarity queries MUST use prisma.$queryRaw with the <=> cosine operator.
  -- See ADR-028 §5.2 (querySimilar function, OPS-G028-A2-TVS-MODULE).
  embedding    vector(768) NOT NULL,

  -- ── Metadata ─────────────────────────────────────────────────────
  -- Per-chunk JSONB bag. Schema-less intentionally; A2 will document standard keys.
  -- Expected keys (A2): { source_version, language, char_count, model, indexed_at }
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- ── Timestamps ───────────────────────────────────────────────────
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_embeddings IS
  'G-028 A1: pgvector embedding storage for semantic search and RAG. '
  'One row per document chunk. Strictly org-scoped via FORCE RLS. '
  'embedding dim = 768 (text-embedding-004 / nomic-embed-text). '
  'All <=> similarity queries via $queryRaw only (Prisma Unsupported type).';

COMMENT ON COLUMN public.document_embeddings.embedding IS
  'pgvector(768). LOCKED dim. All similarity queries via $queryRaw. '
  'Changing dim = destructive migration (full reindex required).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  INDEXES
--
--  Index design rationale (ADR-028):
--    1. Uniqueness constraint — idempotent upsert key (A2 service uses ON CONFLICT)
--    2. Composite org+source — primary lookup path for re-index and retrieval
--    3. Content hash — deduplication existence check before embedding generation
--    4. HNSW — approximate nearest-neighbor for similarity search (A2 <=> queries)
--
--  HNSW params (m=16, ef_construction=64): balanced for TexQtic Wave 4 scale
--  (thousands to low-millions of vectors per tenant). Revisit at Wave 7+.
--  ef_search (runtime) will be set per-session in A2 TVS query path.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Uniqueness: idempotent upsert key.
-- Service layer can INSERT ... ON CONFLICT (org_id, source_type, source_id, chunk_index, content_hash) DO NOTHING / DO UPDATE.
ALTER TABLE public.document_embeddings
  ADD CONSTRAINT document_embeddings_uq
    UNIQUE (org_id, source_type, source_id, chunk_index, content_hash);

-- Composite lookup: fetch all chunks for an entity within an org.
-- Used by re-indexing (delete stale chunks) and context assembly.
CREATE INDEX idx_doc_embed_org_source
  ON public.document_embeddings (org_id, source_type, source_id);

-- Content hash lookup: check existence before triggering embedding generation.
CREATE INDEX idx_doc_embed_content_hash
  ON public.document_embeddings (content_hash);

-- HNSW approximate nearest-neighbor index (pgvector ≥ 0.5, cosine distance).
-- Cosine distance (vector_cosine_ops) matches the <=> operator used in querySimilar().
-- Non-blocking: Supabase builds this index without a long table lock.
CREATE INDEX idx_doc_embed_hnsw
  ON public.document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  RLS — ENABLE + FORCE + POLICIES
--
--  Pattern: canonical Wave 3 Tail (GOVERNANCE-SYNC-030).
--  Reference implementation: catalog_items (20260315000000).
--
--  Policies:
--    document_embeddings_guard          RESTRICTIVE FOR ALL TO texqtic_app
--    document_embeddings_select_unified PERMISSIVE  SELECT  TO texqtic_app
--    document_embeddings_insert_unified PERMISSIVE  INSERT  TO texqtic_app
--
--  No UPDATE or DELETE policies in A1:
--    - Without a PERMISSIVE UPDATE/DELETE policy, those operations are blocked
--      by default after the RESTRICTIVE guard passes (belt-and-suspenders).
--    - UPDATE/DELETE will be added in A2 when the re-indexing service is built.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings FORCE ROW LEVEL SECURITY;

-- RESTRICTIVE guard (fail-closed).
-- Passes for: tenant context set, platform admin, or test/seed bypass.
-- Evaluated first for ALL commands — any row that fails this guard is invisible.
CREATE POLICY document_embeddings_guard
  ON public.document_embeddings
  AS RESTRICTIVE FOR ALL TO texqtic_app
  USING (
    app.require_org_context()
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );

-- PERMISSIVE SELECT: tenant sees own org's chunks only; platform admin sees all.
CREATE POLICY document_embeddings_select_unified
  ON public.document_embeddings
  AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- PERMISSIVE INSERT: tenant inserts own org's chunks only; platform admin inserts any.
-- WITH CHECK (not USING) — RLS INSERT clauses apply to the new row being written.
CREATE POLICY document_embeddings_insert_unified
  ON public.document_embeddings
  AS PERMISSIVE FOR INSERT TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  GRANTS
--
--  texqtic_app  : SELECT + INSERT (NOBYPASSRLS — all reads go through RLS)
--  texqtic_admin: SELECT + INSERT (admin realm — reads all orgs via admin policy)
--
--  UPDATE + DELETE not granted in A1. Added in A2 with matching policies.
--  Wrapped in IF EXISTS to degrade gracefully in test environments without roles.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'texqtic_app') THEN
    GRANT SELECT, INSERT ON public.document_embeddings TO texqtic_app;
    RAISE NOTICE 'G-028: Granted SELECT+INSERT on document_embeddings to texqtic_app';
  ELSE
    RAISE NOTICE 'G-028: Role texqtic_app not found — skipping grant (test environment)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'texqtic_admin') THEN
    GRANT SELECT, INSERT ON public.document_embeddings TO texqtic_admin;
    RAISE NOTICE 'G-028: Granted SELECT+INSERT on document_embeddings to texqtic_admin';
  ELSE
    RAISE NOTICE 'G-028: Role texqtic_admin not found — skipping grant (test environment)';
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  VERIFY — inline assertions
--     Raises EXCEPTION if any invariant is not met → triggers ROLLBACK.
--     Every assertion maps to a governance requirement in ADR-028 + TECS.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  v_vector_ext    boolean;
  v_table_exists  boolean;
  v_rls_on        boolean;
  v_rls_forced    boolean;
  v_col_count     int;
  v_guard_count   int;
  v_perm_select   int;
  v_perm_insert   int;
  v_hnsw_index    boolean;
  v_uq_constraint boolean;
  v_guard_qual    text;
BEGIN
  -- 1. pgvector extension enabled
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO v_vector_ext;
  IF NOT v_vector_ext THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: pgvector extension (vector) is not installed.';
  END IF;

  -- 2. Table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_embeddings'
  ) INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: public.document_embeddings table not found.';
  END IF;

  -- 3. RLS enabled + forced (both required)
  SELECT relrowsecurity, relforcerowsecurity
    INTO v_rls_on, v_rls_forced
    FROM pg_class
   WHERE relname = 'document_embeddings'
     AND relnamespace = 'public'::regnamespace;
  IF NOT v_rls_on THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: RLS (relrowsecurity) not enabled on document_embeddings.';
  END IF;
  IF NOT v_rls_forced THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: FORCE RLS (relforcerowsecurity) not set on document_embeddings.';
  END IF;

  -- 4. Required columns — all 11 must exist
  SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'document_embeddings'
     AND column_name IN (
       'id', 'org_id', 'source_type', 'source_id', 'chunk_index',
       'content', 'content_hash', 'embedding', 'metadata',
       'created_at', 'updated_at'
     );
  IF v_col_count < 11 THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: expected 11 columns on document_embeddings, found %.', v_col_count;
  END IF;

  -- 5. Exactly 1 RESTRICTIVE guard
  SELECT COUNT(*) INTO v_guard_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'document_embeddings'
     AND permissive = 'RESTRICTIVE';
  IF v_guard_count <> 1 THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: expected 1 RESTRICTIVE guard on document_embeddings, found %.', v_guard_count;
  END IF;

  -- 6. Guard predicate includes require_org_context arm
  SELECT qual INTO v_guard_qual
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'document_embeddings'
     AND permissive = 'RESTRICTIVE';
  IF v_guard_qual NOT LIKE '%require_org_context%' THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: document_embeddings guard is missing require_org_context arm.';
  END IF;
  IF v_guard_qual NOT LIKE '%is_admin%' THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: document_embeddings guard is missing is_admin arm.';
  END IF;

  -- 7. PERMISSIVE SELECT policy (exactly 1)
  SELECT COUNT(*) INTO v_perm_select
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'document_embeddings'
     AND permissive = 'PERMISSIVE'
     AND cmd        = 'SELECT';
  IF v_perm_select <> 1 THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: expected 1 PERMISSIVE SELECT policy on document_embeddings, found %.', v_perm_select;
  END IF;

  -- 8. PERMISSIVE INSERT policy (exactly 1)
  SELECT COUNT(*) INTO v_perm_insert
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'document_embeddings'
     AND permissive = 'PERMISSIVE'
     AND cmd        = 'INSERT';
  IF v_perm_insert <> 1 THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: expected 1 PERMISSIVE INSERT policy on document_embeddings, found %.', v_perm_insert;
  END IF;

  -- 9. HNSW index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'document_embeddings'
      AND indexname  = 'idx_doc_embed_hnsw'
  ) INTO v_hnsw_index;
  IF NOT v_hnsw_index THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: HNSW index idx_doc_embed_hnsw not found.';
  END IF;

  -- 10. Uniqueness constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema    = 'public'
      AND table_name      = 'document_embeddings'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'document_embeddings_uq'
  ) INTO v_uq_constraint;
  IF NOT v_uq_constraint THEN
    RAISE EXCEPTION 'G-028 VERIFY FAIL: UNIQUE constraint document_embeddings_uq not found.';
  END IF;

  RAISE NOTICE 'G-028 VERIFY PASS: pgvector enabled, document_embeddings — table + RLS + FORCE RLS + guard + policies + indexes + constraint all confirmed.';
END $$;

COMMIT;
