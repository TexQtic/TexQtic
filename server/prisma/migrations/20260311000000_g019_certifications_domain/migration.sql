-- ============================================================================
-- G-019: Certifications Domain -- Schema + RLS (admin-inclusive)
--
-- Purpose:
--   1. Create public.certifications table (tenant-scoped, lifecycle-aligned).
--   2. Enable + Force RLS on certifications.
--   3. RESTRICTIVE guard (fail-closed) including admin pass-through.
--   4. PERMISSIVE SELECT / INSERT / UPDATE policies (tenant-scoped + bypass).
--   5. PERMISSIVE admin SELECT (cross-tenant, is_admin context gate).
--   6. updated_at maintenance trigger.
--   7. Verification block -- migration fails fast if invariants are violated.
--
-- Governance:
--   - Lifecycle: reuses lifecycle_states (entity_type='CERTIFICATION', 6 states).
--   - org_id FK to organizations(id) (canonical entity, same UUID as tenant).
--   - Admin RLS: mirrors G-017 admin-plane pattern (GOVERNANCE-SYNC-007).
--   - No BYPASSRLS. No weakening of tenant isolation.
--
-- Roles: texqtic_app (matches all prior domain table patterns).
-- RLS functions: app.require_org_context(), app.current_org_id(), app.bypass_enabled()
-- Admin gate: current_setting('app.is_admin', true) = 'true'
--
-- NOT included (deferred):
--   - API routes (service layer, G-019 routes)
--   - Hard FK from certification_lifecycle_logs (if added later)
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Create public.certifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RLS boundary: org_id scopes every row to one organization.
  -- FK to organizations (canonical cross-plane entity; same UUID as tenants.id).
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- Human-readable cert category (GOTS, OEKO_TEX, ISO_9001, etc.) -- not an enum;
  -- open-coded text intentionally to avoid schema churn for new cert types.
  certification_type TEXT NOT NULL,
  -- G-020: FK to lifecycle_states registry. entity_type must be CERTIFICATION.
  lifecycle_state_id UUID NOT NULL REFERENCES public.lifecycle_states(id) ON DELETE RESTRICT,
  -- Nullable -- not yet issued at SUBMITTED/UNDER_REVIEW state.
  issued_at TIMESTAMPTZ NULL,
  -- Nullable -- some certs do not expire.
  expires_at TIMESTAMPTZ NULL,
  created_by_user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Invariant: expiry must be after issuance when both are present.
  CONSTRAINT certifications_expires_after_issued CHECK (
    issued_at IS NULL
    OR expires_at IS NULL
    OR expires_at > issued_at
  )
);
-- ============================================================================
-- §2: Indexes on public.certifications
-- ============================================================================
CREATE INDEX IF NOT EXISTS certifications_org_id_idx ON public.certifications(org_id);
CREATE INDEX IF NOT EXISTS certifications_lifecycle_state_id_idx ON public.certifications(lifecycle_state_id);
CREATE INDEX IF NOT EXISTS certifications_org_type_idx ON public.certifications(org_id, certification_type);
-- Partial unique index: at most one pending (issued_at IS NULL) cert per type per org.
-- Once issued_at is set, the uniqueness is (org_id, certification_type, issued_at).
CREATE UNIQUE INDEX IF NOT EXISTS certifications_org_type_pending_unique ON public.certifications(org_id, certification_type)
WHERE issued_at IS NULL;
-- Full unique index on issued cert: one cert per type+issuance date per org.
CREATE UNIQUE INDEX IF NOT EXISTS certifications_org_type_issued_unique ON public.certifications(org_id, certification_type, issued_at)
WHERE issued_at IS NOT NULL;
-- ============================================================================
-- §3: ENABLE + FORCE Row Level Security
-- ============================================================================
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- §4: updated_at trigger for public.certifications
-- ============================================================================
CREATE OR REPLACE FUNCTION public.certifications_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_certifications_set_updated_at ON public.certifications;
CREATE TRIGGER trg_certifications_set_updated_at BEFORE
UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.certifications_set_updated_at();
-- ============================================================================
-- §5: RLS Policies -- public.certifications
--
-- Pattern: mirrors G-017 admin-inclusive pattern (GOVERNANCE-SYNC-007).
--   Guard (RESTRICTIVE FOR ALL):
--     - Pass: org context present | bypass (test/seed) | admin realm (is_admin)
--     - Fail: everything else (anonymous, wrong context, cross-tenant without admin)
--   Tenant SELECT (PERMISSIVE):
--     - Own rows only: org_id = app.current_org_id() OR bypass
--   Tenant INSERT (PERMISSIVE):
--     - Own rows only (WITH CHECK): require_org_context AND org_id = current_org_id() OR bypass
--   Tenant UPDATE (PERMISSIVE):
--     - Own rows only: org_id = app.current_org_id() OR bypass
--   Admin SELECT (PERMISSIVE):
--     - All rows when is_admin = 'true' (set by admin route context)
-- ============================================================================
-- Guard (RESTRICTIVE): fail-closed -- requires org context OR bypass OR admin
DROP POLICY IF EXISTS certifications_guard ON public.certifications;
CREATE POLICY certifications_guard ON public.certifications AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
COMMENT ON POLICY certifications_guard ON public.certifications IS 'RESTRICTIVE fail-closed guard. Permits access only when: org context set (tenant), bypass active (test/seed), or admin realm (is_admin=true). Mirrors G-017 admin-inclusive guard pattern.';
-- Tenant SELECT: own rows only (+ bypass)
DROP POLICY IF EXISTS certifications_tenant_select ON public.certifications;
CREATE POLICY certifications_tenant_select ON public.certifications AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  );
COMMENT ON POLICY certifications_tenant_select ON public.certifications IS 'PERMISSIVE tenant SELECT: own org rows only (org_id = current_org_id) or bypass. No cross-tenant reads.';
-- Tenant INSERT: own tenant only (+ bypass)
DROP POLICY IF EXISTS certifications_tenant_insert ON public.certifications;
CREATE POLICY certifications_tenant_insert ON public.certifications AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
COMMENT ON POLICY certifications_tenant_insert ON public.certifications IS 'PERMISSIVE tenant INSERT: require org context + org_id matches current_org_id, or bypass. Prevents cross-tenant INSERT.';
-- Tenant UPDATE: own rows only (+ bypass)
DROP POLICY IF EXISTS certifications_tenant_update ON public.certifications;
CREATE POLICY certifications_tenant_update ON public.certifications AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (org_id = app.current_org_id())
    OR app.bypass_enabled()
  ) WITH CHECK (
    (
      app.require_org_context()
      AND org_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
COMMENT ON POLICY certifications_tenant_update ON public.certifications IS 'PERMISSIVE tenant UPDATE: own org rows only. Prevents cross-tenant UPDATE.';
-- Admin SELECT: cross-tenant read when is_admin context is active
DROP POLICY IF EXISTS certifications_admin_select ON public.certifications;
CREATE POLICY certifications_admin_select ON public.certifications AS PERMISSIVE FOR
SELECT TO texqtic_app USING (current_setting('app.is_admin', true) = 'true');
COMMENT ON POLICY certifications_admin_select ON public.certifications IS 'PERMISSIVE admin SELECT: cross-tenant read when app.is_admin=true (control/admin realm only). No tenant boundary enforced -- audit/ops use only.';
-- ============================================================================
-- §6: GRANT -- texqtic_app gets SELECT + INSERT + UPDATE (no DELETE)
-- ============================================================================
GRANT SELECT,
  INSERT,
  UPDATE ON public.certifications TO texqtic_app;
-- ============================================================================
-- §7: Verification block -- fails migration on any violated invariant
-- ============================================================================
DO $$
DECLARE v_lifecycle_exists boolean;
v_orgs_exists boolean;
v_cert_rls boolean;
v_cert_force boolean;
v_guard_count int;
v_guard_restrictive boolean;
v_guard_admin boolean;
v_tenant_sel int;
v_tenant_ins int;
v_tenant_upd int;
v_admin_sel int;
BEGIN -- 1) lifecycle_states table must exist (G-020 dependency)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'lifecycle_states'
  ) INTO v_lifecycle_exists;
IF NOT v_lifecycle_exists THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] lifecycle_states table not found -- G-020 must be applied first'
);
END IF;
-- 2) organizations table must exist (G-015 dependency)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
  ) INTO v_orgs_exists;
IF NOT v_orgs_exists THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] organizations table not found -- G-015 must be applied first'
);
END IF;
-- 3) certifications RLS enabled + forced
SELECT relrowsecurity,
  relforcerowsecurity INTO v_cert_rls,
  v_cert_force
FROM pg_class
WHERE relname = 'certifications'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_cert_rls
  AND v_cert_force
) THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] certifications missing ENABLE/FORCE RLS (rls=%s, force=%s)',
  v_cert_rls,
  v_cert_force
);
END IF;
-- 4) Guard policy exists, is RESTRICTIVE, and includes is_admin predicate
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_guard';
IF v_guard_count = 0 THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] certifications_guard policy not found'
);
END IF;
SELECT (permissive = 'RESTRICTIVE') INTO v_guard_restrictive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_guard';
IF NOT v_guard_restrictive THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] certifications_guard is not RESTRICTIVE'
);
END IF;
SELECT (qual LIKE '%is_admin%') INTO v_guard_admin
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_guard';
IF NOT v_guard_admin THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] certifications_guard does not include is_admin predicate'
);
END IF;
-- 5) Tenant policies exist
SELECT COUNT(*) INTO v_tenant_sel
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_tenant_select';
SELECT COUNT(*) INTO v_tenant_ins
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_tenant_insert';
SELECT COUNT(*) INTO v_tenant_upd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_tenant_update';
IF v_tenant_sel = 0
OR v_tenant_ins = 0
OR v_tenant_upd = 0 THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] tenant policies missing (sel=%s, ins=%s, upd=%s)',
  v_tenant_sel,
  v_tenant_ins,
  v_tenant_upd
);
END IF;
-- 6) Admin SELECT policy exists
SELECT COUNT(*) INTO v_admin_sel
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'certifications'
  AND policyname = 'certifications_admin_select';
IF v_admin_sel = 0 THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-019 FAIL] certifications_admin_select policy not found'
);
END IF;
RAISE NOTICE '[G-019] PASS -- certifications: ENABLE/FORCE RLS t, guard RESTRICTIVE+admin t, tenant_select=%, tenant_insert=%, tenant_update=%, admin_select=%',
v_tenant_sel,
v_tenant_ins,
v_tenant_upd,
v_admin_sel;
END;
$$;
COMMIT;