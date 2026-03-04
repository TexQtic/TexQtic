-- ============================================================================
-- G-025 TECS 4A: node_certifications join table (DPP cert-to-lineage linkage)
-- TECS ID  : G-025-DPP-NODE-CERTIFICATIONS-001
-- Date     : 2026-03-04
-- Doctrine : v1.4
-- Governance Sync: GOVERNANCE-SYNC-080
-- Design Anchor  : G-025-DPP-SNAPSHOT-VIEWS-DESIGN-001 D1 - Option C (APPROVED Paresh)
--
-- Purpose:
--   Create public.node_certifications -- an M:N join table linking
--   traceability_nodes to certifications within a single org.
--   Resolves G-025-B (partial): explicit FK linkage without modifying
--   existing verified tables (traceability_nodes, certifications).
--
-- RLS Pattern: Canonical Wave 3 Tail (Doctrine v1.4)
--   1 RESTRICTIVE guard (FOR ALL TO texqtic_app)
--   4 PERMISSIVE policies: SELECT / INSERT / UPDATE(false) / DELETE(false)
--
-- Grants: SELECT, INSERT TO texqtic_app
-- Closes (partially): G-025-B
-- ============================================================================
BEGIN;

-- ============================================================================
-- S0: PREFLIGHT -- assert required FK target tables/columns exist
-- ============================================================================
DO $preflight$
DECLARE
  v_orgs_id      INTEGER;
  v_nodes_id     INTEGER;
  v_nodes_org    INTEGER;
  v_certs_id     INTEGER;
  v_certs_org    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orgs_id  FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations'      AND column_name='id';
  SELECT COUNT(*) INTO v_nodes_id FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_nodes' AND column_name='id';
  SELECT COUNT(*) INTO v_nodes_org FROM information_schema.columns WHERE table_schema='public' AND table_name='traceability_nodes' AND column_name='org_id';
  SELECT COUNT(*) INTO v_certs_id  FROM information_schema.columns WHERE table_schema='public' AND table_name='certifications'     AND column_name='id';
  SELECT COUNT(*) INTO v_certs_org FROM information_schema.columns WHERE table_schema='public' AND table_name='certifications'     AND column_name='org_id';

  IF v_orgs_id   = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] public.organizations.id not found';       END IF;
  IF v_nodes_id  = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] public.traceability_nodes.id not found';  END IF;
  IF v_nodes_org = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] public.traceability_nodes.org_id not found'; END IF;
  IF v_certs_id  = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] public.certifications.id not found';      END IF;
  IF v_certs_org = 0 THEN RAISE EXCEPTION '[G-025 PREFLIGHT FAIL] public.certifications.org_id not found';  END IF;

  RAISE NOTICE '[G-025 PREFLIGHT] PASS -- orgs.id=%, nodes.id=%, nodes.org_id=%, certs.id=%, certs.org_id=%', v_orgs_id, v_nodes_id, v_nodes_org, v_certs_id, v_certs_org;
END;
$preflight$;

-- ============================================================================
-- S1: CREATE TABLE public.node_certifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.node_certifications (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           UUID        NOT NULL REFERENCES public.organizations(id)        ON DELETE RESTRICT,
  node_id          UUID        NOT NULL REFERENCES public.traceability_nodes(id)   ON DELETE CASCADE,
  certification_id UUID        NOT NULL REFERENCES public.certifications(id)       ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT node_certifications_unique_per_org_node_cert UNIQUE (org_id, node_id, certification_id)
);

-- ============================================================================
-- S2: INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS node_certifications_org_node_idx ON public.node_certifications (org_id, node_id);
CREATE INDEX IF NOT EXISTS node_certifications_org_cert_idx ON public.node_certifications (org_id, certification_id);

-- ============================================================================
-- S3: ENABLE + FORCE Row Level Security
-- ============================================================================
ALTER TABLE public.node_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_certifications FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- S4: DROP existing policies (idempotency)
-- ============================================================================
DROP POLICY IF EXISTS node_certifications_guard           ON public.node_certifications;
DROP POLICY IF EXISTS node_certifications_select_unified  ON public.node_certifications;
DROP POLICY IF EXISTS node_certifications_insert_unified  ON public.node_certifications;
DROP POLICY IF EXISTS node_certifications_update_unified  ON public.node_certifications;
DROP POLICY IF EXISTS node_certifications_delete_unified  ON public.node_certifications;

-- ============================================================================
-- S5: RLS POLICIES -- Canonical Wave 3 Tail Pattern (Doctrine v1.4)
-- ============================================================================

-- Policy 1: RESTRICTIVE guard (fail-closed) FOR ALL TO texqtic_app
CREATE POLICY node_certifications_guard
  ON public.node_certifications AS RESTRICTIVE FOR ALL TO texqtic_app
  USING (
    app.require_org_context()
    OR current_setting('app.is_admin'::text, true) = 'true'::text
    OR app.bypass_enabled()
  );

-- Policy 2: PERMISSIVE SELECT (tenant arm + admin arm)
CREATE POLICY node_certifications_select_unified
  ON public.node_certifications AS PERMISSIVE FOR SELECT TO texqtic_app
  USING (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- Policy 3: PERMISSIVE INSERT (tenant arm + admin arm)
CREATE POLICY node_certifications_insert_unified
  ON public.node_certifications AS PERMISSIVE FOR INSERT TO texqtic_app
  WITH CHECK (
    (app.require_org_context() AND org_id = app.current_org_id())
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );

-- Policy 4: PERMISSIVE UPDATE -- permanently false (join table is immutable in v1)
CREATE POLICY node_certifications_update_unified
  ON public.node_certifications AS PERMISSIVE FOR UPDATE TO texqtic_app
  USING (false) WITH CHECK (false);

-- Policy 5: PERMISSIVE DELETE -- permanently false (no detach semantics approved in v1)
CREATE POLICY node_certifications_delete_unified
  ON public.node_certifications AS PERMISSIVE FOR DELETE TO texqtic_app
  USING (false);

-- ============================================================================
-- S6: GRANTS
-- ============================================================================
GRANT SELECT, INSERT ON public.node_certifications TO texqtic_app;

-- ============================================================================
-- S7: VERIFIER DO block
-- ============================================================================
DO $verifier$
DECLARE
  v_force_rls    BOOLEAN;
  v_rls_enabled  BOOLEAN;
  v_guard_count  INTEGER;
  v_guard_restr  BOOLEAN;
  v_guard_admin  BOOLEAN;
  v_sel_count    INTEGER;
  v_ins_count    INTEGER;
  v_upd_count    INTEGER;
  v_del_count    INTEGER;
  v_pub_count    INTEGER;
  v_has_select   INTEGER;
  v_has_insert   INTEGER;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity INTO v_rls_enabled, v_force_rls
    FROM pg_class WHERE relname = 'node_certifications' AND relnamespace = 'public'::regnamespace;
  IF NOT v_rls_enabled THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] RLS not enabled'; END IF;
  IF NOT v_force_rls   THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] FORCE RLS not set'; END IF;

  SELECT COUNT(*) INTO v_guard_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_guard';
  IF v_guard_count = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] guard policy not found'; END IF;

  SELECT (permissive = 'RESTRICTIVE') INTO v_guard_restr FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_guard';
  IF NOT v_guard_restr THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] guard is not RESTRICTIVE'; END IF;

  SELECT (qual LIKE '%is_admin%') INTO v_guard_admin FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_guard';
  IF NOT v_guard_admin THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] guard does not include is_admin'; END IF;

  SELECT COUNT(*) INTO v_sel_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_select_unified';
  IF v_sel_count = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] select_unified policy not found'; END IF;

  SELECT COUNT(*) INTO v_ins_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_insert_unified';
  IF v_ins_count = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] insert_unified policy not found'; END IF;

  SELECT COUNT(*) INTO v_upd_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_update_unified';
  IF v_upd_count = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] update_unified policy not found'; END IF;

  SELECT COUNT(*) INTO v_del_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND policyname='node_certifications_delete_unified';
  IF v_del_count = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] delete_unified policy not found'; END IF;

  SELECT COUNT(*) INTO v_pub_count FROM pg_policies WHERE schemaname='public' AND tablename='node_certifications' AND roles='{public}';
  IF v_pub_count > 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] % {public}-role policies found (expected 0)', v_pub_count; END IF;

  SELECT COUNT(*) INTO v_has_select FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='node_certifications' AND grantee='texqtic_app' AND privilege_type='SELECT';
  IF v_has_select = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] texqtic_app missing SELECT grant'; END IF;

  SELECT COUNT(*) INTO v_has_insert FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='node_certifications' AND grantee='texqtic_app' AND privilege_type='INSERT';
  IF v_has_insert = 0 THEN RAISE EXCEPTION '[G-025 VERIFIER FAIL] texqtic_app missing INSERT grant'; END IF;

  RAISE NOTICE '[G-025] VERIFIER PASS: node_certifications -- FORCE_RLS=t, rls_enabled=t, guard=RESTRICTIVE+admin, select=%, insert=%, update=%(false), delete=%(false), public_policies=%, texqtic_app_SELECT=%, texqtic_app_INSERT=%', v_sel_count, v_ins_count, v_upd_count, v_del_count, v_pub_count, v_has_select, v_has_insert;
END;
$verifier$;

COMMIT;