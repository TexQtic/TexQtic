-- ============================================================================
-- FAM-07E5N: Handoff organizations UPDATE grant remediation
-- Unit:     FAM-07E5N-HANDOFF-ORGANIZATIONS-PERMISSION-REMEDIATION-AND-RERUN-001
-- Doctrine: v1.4 / TECS Safe-Write
-- Date:     2026-06-02
-- Author:   TexQtic Platform Engineering
-- ============================================================================
--
-- ROOT CAUSE
--   Migration 20260224000000_g015_phase_a_introduce_organizations granted only
--   GRANT SELECT ON public.organizations TO texqtic_app.
--   texqtic_admin received SELECT + INSERT + UPDATE, but texqtic_app did not.
--
--   The safe handoff activation path (activateConsentRuntimeInviteById) and the
--   standard invite activation path both execute tx.organizations.update() while
--   withDbContext has issued SET LOCAL ROLE texqtic_app.  PostgreSQL's privilege
--   check fires before RLS, producing:
--     42501: permission denied for table organizations
--
-- SECURITY INVARIANTS PRESERVED
--   1. RLS remains ENABLED + FORCED on public.organizations.
--   2. organizations_control_plane_update (permissive) + organizations_guard_policy
--      (RESTRICTIVE) together require app.current_realm() = 'admin' for any UPDATE.
--   3. texqtic_app never holds BYPASSRLS.  An admin-realm context (app.realm = 'admin',
--      app.is_admin = 'true') is still required at runtime for every UPDATE to pass.
--   4. No SELECT, INSERT, or DELETE privilege is modified.
--   5. No RLS policy is dropped, altered, or weakened.
--   6. DIRECT_DATABASE_URL is NOT used; this migration runs through the tracked path.
--
-- OBJECTS MODIFIED
--   GRANT UPDATE ON public.organizations TO texqtic_app
--
-- REVERSIBILITY
--   REVOKE UPDATE ON TABLE public.organizations FROM texqtic_app;
-- ============================================================================
-- §1  GRANT UPDATE to texqtic_app
--
-- texqtic_app requires UPDATE to execute the organizations.update() calls in the
-- safe-handoff and standard invite activation paths.  The existing RESTRICTIVE RLS
-- guard policy (organizations_guard_policy) ensures that only transactions with
-- app.current_realm() = 'admin' OR app.bypass_enabled() can execute any DML on
-- this table — providing defense-in-depth beyond the role grant alone.
GRANT UPDATE ON TABLE public.organizations TO texqtic_app;
-- §2  VERIFY — inline evidence of grant application
DO $$
DECLARE has_update BOOLEAN;
BEGIN
SELECT has_table_privilege('texqtic_app', 'public.organizations', 'UPDATE') INTO has_update;
IF has_update THEN RAISE NOTICE 'FAM-07E5N VERIFY: texqtic_app has UPDATE on public.organizations — PASS';
ELSE RAISE EXCEPTION 'FAM-07E5N VERIFY: texqtic_app does NOT have UPDATE on public.organizations — FAIL';
END IF;
END $$;