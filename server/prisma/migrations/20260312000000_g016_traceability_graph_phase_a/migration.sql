-- ============================================================================
-- G-016: Traceability Graph — Phase A (Schema + RLS)
--
-- Purpose:
--   1. Create public.traceability_nodes  (supply-chain node backbone).
--   2. Create public.traceability_edges  (directed graph edges between nodes).
--   3. Enable + Force RLS on both tables.
--   4. RESTRICTIVE guard (fail-closed) including admin pass-through.
--   5. PERMISSIVE SELECT / INSERT / UPDATE policies (tenant-scoped + bypass).
--   6. PERMISSIVE admin SELECT (cross-tenant, is_admin context gate).
--   7. updated_at maintenance trigger on traceability_nodes.
--   8. Verification block — migration fails fast if invariants are violated.
--
-- Governance:
--   - org_id FK to organizations(id) (canonical entity, same UUID as tenant).
--   - RLS pattern: mirrors G-019 admin-inclusive pattern (GOVERNANCE-SYNC-008).
--   - No BYPASSRLS. No weakening of tenant isolation.
--   - Phase A ONLY: no AI/vector infra, no maker-checker wiring.
--
-- Roles: texqtic_app (matches all prior domain table patterns).
-- RLS functions:
--   app.require_org_context()  — true when org_id session var is set
--   app.current_org_id()       — returns org_id from session settings
--   app.bypass_enabled()       — true in test/seed context
-- Admin gate:
--   current_setting('app.is_admin', true) = 'true'
-- ============================================================================
BEGIN;

-- ============================================================================
-- §1: Create public.traceability_nodes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traceability_nodes (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- RLS boundary: org_id scopes every row to one organization.
  -- FK to organizations (canonical cross-plane entity; same UUID as tenants.id).
  org_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- Human-readable supply-chain batch identifier (e.g., SKU-LOT-2026-001).
  batch_id       TEXT NOT NULL,
  -- Node type classification (e.g., RAW_MATERIAL, PROCESSING, DISTRIBUTION, RETAIL).
  node_type      TEXT NOT NULL,
  -- Extensible metadata blob. Validated in application layer (size stop-loss).
  meta           JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Visibility scope: TENANT (default) or SHARED (future cross-org sharing).
  visibility     TEXT NOT NULL DEFAULT 'TENANT',
  -- Optional geospatial hash (geohash / H3 index) for location-aware queries.
  geo_hash       TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- §2: Indexes on public.traceability_nodes
-- ============================================================================
-- Enforce org-scoped batch uniqueness: one node per batch per org.
CREATE UNIQUE INDEX IF NOT EXISTS traceability_nodes_org_batch_unique
  ON public.traceability_nodes(org_id, batch_id);

-- Composite query index: org + type lookups (most common filter pattern).
CREATE INDEX IF NOT EXISTS traceability_nodes_org_type_idx
  ON public.traceability_nodes(org_id, node_type);

-- ============================================================================
-- §3: updated_at trigger for public.traceability_nodes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.traceability_nodes_set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_traceability_nodes_set_updated_at
  ON public.traceability_nodes;

CREATE TRIGGER trg_traceability_nodes_set_updated_at
  BEFORE UPDATE ON public.traceability_nodes
  FOR EACH ROW EXECUTE FUNCTION public.traceability_nodes_set_updated_at();

-- ============================================================================
-- §4: ENABLE + FORCE Row Level Security on traceability_nodes
-- ============================================================================
ALTER TABLE public.traceability_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_nodes FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- §5: RLS Policies — public.traceability_nodes
--
-- Pattern: mirrors G-019 admin-inclusive pattern (GOVERNANCE-SYNC-008).
--   Guard (RESTRICTIVE FOR ALL):
--     - Pass: org context present | bypass (test/seed) | admin realm (is_admin)
--     - Fail: everything else (anonymous, wrong context, cross-tenant without admin)
--   Tenant SELECT (PERMISSIVE): own rows only (org_id = current_org_id OR bypass)
--   Tenant INSERT (PERMISSIVE): own rows only WITH CHECK
--   Tenant UPDATE (PERMISSIVE): own rows only
--   Admin SELECT (PERMISSIVE): all rows when is_admin = 'true'
-- ============================================================================

-- Guard (RESTRICTIVE): fail-closed — requires org context OR bypass OR admin
DROP POLICY IF EXISTS traceability_nodes_guard ON public.traceability_nodes;
CREATE POLICY traceability_nodes_guard
  ON public.traceability_nodes
  AS RESTRICTIVE FOR ALL TO texqtic_app
  USING (
    app.require_org_context()
    OR app.bypass_enabled()
    OR current_setting('app.is_admin', true) = 'true'
  );
COMMENT ON POLICY traceability_nodes_guard ON public.traceability_nodes IS
  'RESTRICTIVE fail-closed guard. Permits access only when: org context set (tenant), bypass active (test/seed), or admin realm (is_admin=true). Mirrors G-019 admin-inclusive guard pattern.';

-- Tenant SELECT: own rows only (+ bypass)
DROP POLICY IF EXISTS traceability_nodes_tenant_select ON public.traceability_nodes;
CREATE POLICY traceability_nodes_tenant_select
  ON public.traceability_nodes
  AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_nodes_tenant_select ON public.traceability_nodes IS
  'PERMISSIVE tenant SELECT: own org rows only (org_id = current_org_id) or bypass. No cross-tenant reads.';

-- Tenant INSERT: own tenant only (+ bypass)
DROP POLICY IF EXISTS traceability_nodes_tenant_insert ON public.traceability_nodes;
CREATE POLICY traceability_nodes_tenant_insert
  ON public.traceability_nodes
  AS PERMISSIVE FOR INSERT TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_nodes_tenant_insert ON public.traceability_nodes IS
  'PERMISSIVE tenant INSERT: require org context + org_id matches current_org_id, or bypass. Prevents cross-tenant INSERT.';

-- Tenant UPDATE: own rows only (+ bypass)
DROP POLICY IF EXISTS traceability_nodes_tenant_update ON public.traceability_nodes;
CREATE POLICY traceability_nodes_tenant_update
  ON public.traceability_nodes
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  )
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_nodes_tenant_update ON public.traceability_nodes IS
  'PERMISSIVE tenant UPDATE: own org rows only. Prevents cross-tenant UPDATE.';

-- Admin SELECT: cross-tenant read when is_admin context is active
DROP POLICY IF EXISTS traceability_nodes_admin_select ON public.traceability_nodes;
CREATE POLICY traceability_nodes_admin_select
  ON public.traceability_nodes
  AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (current_setting('app.is_admin', true) = 'true');
COMMENT ON POLICY traceability_nodes_admin_select ON public.traceability_nodes IS
  'PERMISSIVE admin SELECT: cross-tenant read when app.is_admin=true (control/admin realm only). No tenant boundary enforced — audit/ops use only.';

-- ============================================================================
-- §6: GRANT on traceability_nodes
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.traceability_nodes TO texqtic_app;

-- ============================================================================
-- §7: Create public.traceability_edges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.traceability_edges (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- RLS boundary: org_id scopes every edge to one organization.
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- Directed edge: from_node_id → to_node_id.
  -- CASCADE: removing a node removes its incident edges.
  from_node_id      UUID NOT NULL REFERENCES public.traceability_nodes(id) ON DELETE CASCADE,
  to_node_id        UUID NOT NULL REFERENCES public.traceability_nodes(id) ON DELETE CASCADE,
  -- Edge classification (e.g., SOURCED_FROM, PROCESSED_INTO, SHIPPED_TO).
  edge_type         TEXT NOT NULL,
  -- Optional transformation reference (processing batch, recipe ID, etc.).
  transformation_id TEXT NULL,
  -- Extensible metadata blob.
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- §8: Indexes on public.traceability_edges
-- ============================================================================
-- Partial unique: when transformation_id IS NULL — one edge per (org, from, to, type).
-- Postgres treats NULLs as distinct so a plain UNIQUE would allow duplicates;
-- partial indexes give correct uniqueness semantics.
CREATE UNIQUE INDEX IF NOT EXISTS traceability_edges_unique_no_transform
  ON public.traceability_edges(org_id, from_node_id, to_node_id, edge_type)
  WHERE transformation_id IS NULL;

-- Partial unique: when transformation_id IS NOT NULL — fully qualified.
CREATE UNIQUE INDEX IF NOT EXISTS traceability_edges_unique_with_transform
  ON public.traceability_edges(org_id, from_node_id, to_node_id, edge_type, transformation_id)
  WHERE transformation_id IS NOT NULL;

-- Graph traversal indexes: forward and reverse neighbour lookups.
CREATE INDEX IF NOT EXISTS traceability_edges_org_from_idx
  ON public.traceability_edges(org_id, from_node_id);

CREATE INDEX IF NOT EXISTS traceability_edges_org_to_idx
  ON public.traceability_edges(org_id, to_node_id);

-- ============================================================================
-- §9: ENABLE + FORCE Row Level Security on traceability_edges
-- ============================================================================
ALTER TABLE public.traceability_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_edges FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- §10: RLS Policies — public.traceability_edges
-- ============================================================================

-- Guard (RESTRICTIVE): fail-closed — requires org context OR bypass OR admin
DROP POLICY IF EXISTS traceability_edges_guard ON public.traceability_edges;
CREATE POLICY traceability_edges_guard
  ON public.traceability_edges
  AS RESTRICTIVE FOR ALL TO texqtic_app
  USING (
    app.require_org_context()
    OR app.bypass_enabled()
    OR current_setting('app.is_admin', true) = 'true'
  );
COMMENT ON POLICY traceability_edges_guard ON public.traceability_edges IS
  'RESTRICTIVE fail-closed guard. Mirrors traceability_nodes_guard pattern.';

-- Tenant SELECT: own rows only (+ bypass)
DROP POLICY IF EXISTS traceability_edges_tenant_select ON public.traceability_edges;
CREATE POLICY traceability_edges_tenant_select
  ON public.traceability_edges
  AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_edges_tenant_select ON public.traceability_edges IS
  'PERMISSIVE tenant SELECT: own org edges only.';

-- Tenant INSERT: own tenant only (+ bypass)
DROP POLICY IF EXISTS traceability_edges_tenant_insert ON public.traceability_edges;
CREATE POLICY traceability_edges_tenant_insert
  ON public.traceability_edges
  AS PERMISSIVE FOR INSERT TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_edges_tenant_insert ON public.traceability_edges IS
  'PERMISSIVE tenant INSERT: own org only.';

-- Tenant UPDATE: own rows only (+ bypass)
DROP POLICY IF EXISTS traceability_edges_tenant_update ON public.traceability_edges;
CREATE POLICY traceability_edges_tenant_update
  ON public.traceability_edges
  AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  )
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY traceability_edges_tenant_update ON public.traceability_edges IS
  'PERMISSIVE tenant UPDATE: own org edges only.';

-- Admin SELECT: cross-tenant read when is_admin context is active
DROP POLICY IF EXISTS traceability_edges_admin_select ON public.traceability_edges;
CREATE POLICY traceability_edges_admin_select
  ON public.traceability_edges
  AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (current_setting('app.is_admin', true) = 'true');
COMMENT ON POLICY traceability_edges_admin_select ON public.traceability_edges IS
  'PERMISSIVE admin SELECT: cross-tenant read when app.is_admin=true.';

-- ============================================================================
-- §11: GRANT on traceability_edges
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.traceability_edges TO texqtic_app;

-- ============================================================================
-- §12: Verification block — fails migration on any violated invariant
-- ============================================================================
DO $$
DECLARE
  v_orgs_exists        boolean;
  v_nodes_rls          boolean;
  v_nodes_force        boolean;
  v_edges_rls          boolean;
  v_edges_force        boolean;
  v_nodes_guard        int;
  v_nodes_guard_restr  boolean;
  v_nodes_guard_admin  boolean;
  v_nodes_t_sel        int;
  v_nodes_t_ins        int;
  v_nodes_t_upd        int;
  v_nodes_a_sel        int;
  v_edges_guard        int;
  v_edges_guard_restr  boolean;
  v_edges_guard_admin  boolean;
  v_edges_t_sel        int;
  v_edges_t_ins        int;
  v_edges_t_upd        int;
  v_edges_a_sel        int;
BEGIN
  -- 1) organizations table must exist (G-015 dependency)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) INTO v_orgs_exists;
  IF NOT v_orgs_exists THEN
    RAISE EXCEPTION USING MESSAGE = format(
      '[G-016 FAIL] organizations table not found -- G-015 must be applied first'
    );
  END IF;

  -- 2) traceability_nodes RLS enabled + forced
  SELECT relrowsecurity, relforcerowsecurity
    INTO v_nodes_rls, v_nodes_force
    FROM pg_class
   WHERE relname = 'traceability_nodes'
     AND relnamespace = 'public'::regnamespace;
  IF NOT (v_nodes_rls AND v_nodes_force) THEN
    RAISE EXCEPTION USING MESSAGE = format(
      '[G-016 FAIL] traceability_nodes missing ENABLE/FORCE RLS (rls=%s, force=%s)',
      v_nodes_rls, v_nodes_force
    );
  END IF;

  -- 3) traceability_edges RLS enabled + forced
  SELECT relrowsecurity, relforcerowsecurity
    INTO v_edges_rls, v_edges_force
    FROM pg_class
   WHERE relname = 'traceability_edges'
     AND relnamespace = 'public'::regnamespace;
  IF NOT (v_edges_rls AND v_edges_force) THEN
    RAISE EXCEPTION USING MESSAGE = format(
      '[G-016 FAIL] traceability_edges missing ENABLE/FORCE RLS (rls=%s, force=%s)',
      v_edges_rls, v_edges_force
    );
  END IF;

  -- 4) traceability_nodes: guard policy exists, is RESTRICTIVE, includes is_admin
  SELECT COUNT(*) INTO v_nodes_guard
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_guard';
  IF v_nodes_guard = 0 THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_nodes_guard policy not found';
  END IF;

  SELECT (permissive = 'RESTRICTIVE') INTO v_nodes_guard_restr
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_guard';
  IF NOT v_nodes_guard_restr THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_nodes_guard is not RESTRICTIVE';
  END IF;

  SELECT (qual LIKE '%is_admin%') INTO v_nodes_guard_admin
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_guard';
  IF NOT v_nodes_guard_admin THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_nodes_guard does not include is_admin predicate';
  END IF;

  -- 5) traceability_nodes: tenant policies exist
  SELECT COUNT(*) INTO v_nodes_t_sel FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_tenant_select';
  SELECT COUNT(*) INTO v_nodes_t_ins FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_tenant_insert';
  SELECT COUNT(*) INTO v_nodes_t_upd FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_tenant_update';
  IF v_nodes_t_sel = 0 OR v_nodes_t_ins = 0 OR v_nodes_t_upd = 0 THEN
    RAISE EXCEPTION USING MESSAGE = format(
      '[G-016 FAIL] traceability_nodes tenant policies missing (sel=%s, ins=%s, upd=%s)',
      v_nodes_t_sel, v_nodes_t_ins, v_nodes_t_upd
    );
  END IF;

  -- 6) traceability_nodes: admin SELECT policy exists
  SELECT COUNT(*) INTO v_nodes_a_sel FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_nodes'
     AND policyname = 'traceability_nodes_admin_select';
  IF v_nodes_a_sel = 0 THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_nodes_admin_select policy not found';
  END IF;

  -- 7) traceability_edges: guard policy exists, is RESTRICTIVE, includes is_admin
  SELECT COUNT(*) INTO v_edges_guard FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_guard';
  IF v_edges_guard = 0 THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_edges_guard policy not found';
  END IF;

  SELECT (permissive = 'RESTRICTIVE') INTO v_edges_guard_restr
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_guard';
  IF NOT v_edges_guard_restr THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_edges_guard is not RESTRICTIVE';
  END IF;

  SELECT (qual LIKE '%is_admin%') INTO v_edges_guard_admin
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_guard';
  IF NOT v_edges_guard_admin THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_edges_guard does not include is_admin predicate';
  END IF;

  -- 8) traceability_edges: tenant policies exist
  SELECT COUNT(*) INTO v_edges_t_sel FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_tenant_select';
  SELECT COUNT(*) INTO v_edges_t_ins FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_tenant_insert';
  SELECT COUNT(*) INTO v_edges_t_upd FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_tenant_update';
  IF v_edges_t_sel = 0 OR v_edges_t_ins = 0 OR v_edges_t_upd = 0 THEN
    RAISE EXCEPTION USING MESSAGE = format(
      '[G-016 FAIL] traceability_edges tenant policies missing (sel=%s, ins=%s, upd=%s)',
      v_edges_t_sel, v_edges_t_ins, v_edges_t_upd
    );
  END IF;

  -- 9) traceability_edges: admin SELECT policy exists
  SELECT COUNT(*) INTO v_edges_a_sel FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'traceability_edges'
     AND policyname = 'traceability_edges_admin_select';
  IF v_edges_a_sel = 0 THEN
    RAISE EXCEPTION USING MESSAGE = '[G-016 FAIL] traceability_edges_admin_select policy not found';
  END IF;

  RAISE NOTICE
    '[G-016] PASS -- nodes: ENABLE/FORCE RLS t, guard RESTRICTIVE+admin t, tenant_select=%, tenant_insert=%, tenant_update=%, admin_select=% | edges: ENABLE/FORCE RLS t, guard RESTRICTIVE+admin t, tenant_select=%, tenant_insert=%, tenant_update=%, admin_select=%',
    v_nodes_t_sel, v_nodes_t_ins, v_nodes_t_upd, v_nodes_a_sel,
    v_edges_t_sel, v_edges_t_ins, v_edges_t_upd, v_edges_a_sel;
END;
$$;

COMMIT;
