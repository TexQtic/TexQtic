-- ============================================================================
-- G-006C P2: RLS Unify — tenant_branding
-- TECS ID  : G-006C-P2-TENANT_BRANDING-RLS-UNIFY-001
-- Date     : 2026-03-03
-- Doctrine : v1.4
-- Pattern  : Canonical unified policy per command — matches Wave 3 Tail standard
--            established by GOVERNANCE-SYNC-030 (orders/order_items) and
--            GOVERNANCE-SYNC-031 (event_logs).
--
-- Problem:
--   tenant_branding policies use bypass_enabled() as the admin arm across all
--   PERMISSIVE policies. Critical defects found:
--   1. RESTRICTIVE guard (tenant_branding_guard_policy) applies to {public}
--      (all roles) instead of texqtic_app, and is missing the is_admin arm.
--   2. PERMISSIVE SELECT/UPDATE/INSERT policies use OR bypass_enabled() as admin
--      arm instead of is_admin='true', and are missing require_org_context() in
--      the tenant arm conjunction.
--   3. PERMISSIVE DELETE policy has NO tenant arm at all — only bypass_enabled().
--   This migration rebuilds all policies to canonical Wave 3 Tail pattern.
--
-- NOTE: tenant_branding HAS a direct tenant_id column.
--   Tenant isolation uses: tenant_id = app.current_org_id()
--   (No EXISTS JOIN required.)
--
-- BEFORE (5 policies, non-canonical):
--   tenant_branding_guard_policy   RESTRICTIVE FOR ALL {public}      — require_org_context() OR bypass_enabled()   [MISSING is_admin; wrong role]
--   tenant_branding_select_unified PERMISSIVE  SELECT  {texqtic_app} — (tenant_id=current_org_id()) OR bypass_enabled()  [MISSING require_org_context; wrong admin arm]
--   tenant_branding_insert_unified PERMISSIVE  INSERT  {texqtic_app} — WITH CHECK same pattern
--   tenant_branding_update_unified PERMISSIVE  UPDATE  {texqtic_app} — USING + WITH CHECK same
--   tenant_branding_delete_unified PERMISSIVE  DELETE  {texqtic_app} — bypass_enabled() ONLY  [NO tenant arm at all]
--
-- AFTER (canonical Wave 3 Tail pattern):
--   tenant_branding_guard           RESTRICTIVE FOR ALL {texqtic_app} — require_org_context() OR is_admin='true' OR bypass_enabled()
--   tenant_branding_select_unified  PERMISSIVE  SELECT  {texqtic_app} — (require_org_context() AND tenant_id=current_org_id()) OR is_admin='true'
--   tenant_branding_insert_unified  PERMISSIVE  INSERT  {texqtic_app} — (require_org_context() AND tenant_id=current_org_id()) OR is_admin='true'
--   tenant_branding_update_unified  PERMISSIVE  UPDATE  {texqtic_app} — (require_org_context() AND tenant_id=current_org_id()) OR is_admin='true'
--   tenant_branding_delete_unified  PERMISSIVE  DELETE  {texqtic_app} — (require_org_context() AND tenant_id=current_org_id()) OR is_admin='true'
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- STEP 1: Drop all existing policies for tenant_branding
-- Covers: current unified set + guard variant + any legacy gate-d2 variants
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tenant_branding_guard ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_guard_policy ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_select_unified ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_insert_unified ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_update_unified ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_delete_unified ON public.tenant_branding;
-- legacy gate-d2 variants (safety net)
DROP POLICY IF EXISTS tenant_select ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_insert ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_update ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_delete ON public.tenant_branding;
DROP POLICY IF EXISTS bypass_select ON public.tenant_branding;
DROP POLICY IF EXISTS bypass_insert ON public.tenant_branding;
DROP POLICY IF EXISTS bypass_update ON public.tenant_branding;
DROP POLICY IF EXISTS bypass_delete ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_select ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_insert ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_update ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_delete ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_bypass_select ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_bypass_insert ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_bypass_update ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_bypass_delete ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_tenant_access ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_admin_all ON public.tenant_branding;
-- ─────────────────────────────────────────────────────────────
-- STEP 2: Confirm FORCE RLS (should already be t/t from G-002)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────
-- STEP 3: RESTRICTIVE guard — canonical Wave 3 Tail pattern
-- FOR ALL TO texqtic_app
-- Passes for: tenant context, platform admin, test/seed bypass
-- Admin arm prevents guard from blocking admin reads/writes.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY tenant_branding_guard ON public.tenant_branding AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
-- ─────────────────────────────────────────────────────────────
-- STEP 4: PERMISSIVE unified policies — one per command
-- Tenant arm: tenant_id = app.current_org_id() (direct column)
-- Admin arm : current_setting('app.is_admin', true) = 'true'
--             (NOT bypass_enabled() — see Gate 1 / GOVERNANCE-SYNC-030)
-- Note: UPDATE and INSERT both present — tenant branding is owned by tenant;
--       app-layer OWNER/ADMIN enforcement is handled at route layer, not DB.
-- ─────────────────────────────────────────────────────────────
-- SELECT unified
CREATE POLICY tenant_branding_select_unified ON public.tenant_branding AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- INSERT unified
CREATE POLICY tenant_branding_insert_unified ON public.tenant_branding AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- UPDATE unified (USING + WITH CHECK both required)
CREATE POLICY tenant_branding_update_unified ON public.tenant_branding AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  ) WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- DELETE unified
CREATE POLICY tenant_branding_delete_unified ON public.tenant_branding AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_org_context()
    AND tenant_id = app.current_org_id()
  )
  OR current_setting('app.is_admin'::text, true) = 'true'::text
);
-- ─────────────────────────────────────────────────────────────
-- STEP 5: Self-verifier DO block
-- Raises on any invariant violation → triggers ROLLBACK.
-- Checks: FORCE RLS, exactly 1 RESTRICTIVE guard (FOR ALL),
-- exactly 1 PERMISSIVE per command, 0 {public} policies,
-- is_admin arm present in guard + SELECT.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_force_rls BOOLEAN;
v_guard_count INT;
v_perm_select INT;
v_perm_insert INT;
v_perm_update INT;
v_perm_delete INT;
v_public_count INT;
v_guard_qual TEXT;
v_sel_qual TEXT;
BEGIN -- Assert FORCE RLS enabled
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'tenant_branding';
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — relforcerowsecurity is false';
END IF;
-- Assert exactly 1 RESTRICTIVE guard
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — expected 1 RESTRICTIVE guard, found %',
v_guard_count;
END IF;
-- Assert guard predicate includes both is_admin and require_org_context
SELECT qual INTO v_guard_qual
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'RESTRICTIVE';
IF v_guard_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding guard — missing is_admin arm in USING predicate';
END IF;
IF v_guard_qual NOT LIKE '%require_org_context%' THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding guard — missing require_org_context arm in USING predicate';
END IF;
-- Assert exactly 1 PERMISSIVE policy per command
SELECT COUNT(*) INTO v_perm_select
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_perm_select <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — expected 1 PERMISSIVE SELECT, found %',
v_perm_select;
END IF;
SELECT COUNT(*) INTO v_perm_insert
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_perm_insert <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — expected 1 PERMISSIVE INSERT, found %',
v_perm_insert;
END IF;
SELECT COUNT(*) INTO v_perm_update
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_perm_update <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — expected 1 PERMISSIVE UPDATE, found %',
v_perm_update;
END IF;
SELECT COUNT(*) INTO v_perm_delete
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_perm_delete <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — expected 1 PERMISSIVE DELETE, found %',
v_perm_delete;
END IF;
-- Assert PERMISSIVE SELECT predicate includes admin arm
SELECT qual INTO v_sel_qual
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_sel_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding SELECT — missing is_admin arm (bypass_enabled wrongly used?)';
END IF;
-- Assert no {public} role policies remain
SELECT COUNT(*) INTO v_public_count
FROM pg_policies
WHERE tablename = 'tenant_branding'
  AND roles::text = '{public}';
IF v_public_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL: tenant_branding — found % {public} policies, expected 0',
v_public_count;
END IF;
RAISE NOTICE 'VERIFIER PASS: tenant_branding — guard=1 RESTRICTIVE FOR ALL (is_admin arm present), SELECT/INSERT/UPDATE/DELETE=1 PERMISSIVE each (is_admin arm present), FORCE RLS=%, no {public} policies',
v_force_rls;
END;
$$;
COMMIT;
-- ============================================================================
-- CROSS-TENANT ISOLATION PROOF (run manually after psql apply):
-- SIM1 — tenant context, own branding visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.actor_id',   '<any_uuid>',     true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT set_config('app.request_id', gen_random_uuid()::text, true);
--   SELECT count(*) FROM public.tenant_branding; -- Expected: own-tenant count (0 or 1)
--   ROLLBACK;
--
-- SIM2 — tenant context, OTHER tenant branding = 0:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.tenant_branding
--    WHERE tenant_id = '<tenantB_uuid>';  -- Expected: 0
--   ROLLBACK;
--
-- SIM3 — control + is_admin='true': cross-tenant rows visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.actor_id',   '00000000-0000-0000-0000-000000000001', true);
--   SELECT set_config('app.realm',      'control', true);
--   SELECT set_config('app.is_admin',   'true',    true);
--   SELECT set_config('app.bypass_rls', 'off',     true);
--   SELECT count(*) FROM public.tenant_branding; -- Expected: total across all tenants
--   ROLLBACK;
-- ============================================================================
-- APPLY:
--   $u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
--   psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" "--file=server/prisma/migrations/20260315000002_g006c_p2_tenant_branding_rls_unify/migration.sql"
--   pnpm -C server exec prisma migrate resolve --applied 20260315000002_g006c_p2_tenant_branding_rls_unify
-- ============================================================================