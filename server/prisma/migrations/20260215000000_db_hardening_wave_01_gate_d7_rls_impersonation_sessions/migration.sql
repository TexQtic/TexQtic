-- ============================================================================
-- DB-HARDENING-WAVE-01 Gate D.7: RLS for impersonation_sessions
-- Purpose: Control-plane admin-scoped RLS (admin reads only their sessions)
-- Scope: impersonation_sessions (final tenant-table in Wave-01)
-- Doctrine v1.4: Actor isolation (admin_id = actor_id), fail-closed
-- Author: TexQtic Platform Engineering
-- Date: 2026-02-15
-- ============================================================================
-- ============================================================================
-- PHASE 1: Create Admin Context Helper Function
-- ============================================================================
-- Function: app.require_admin_context()
-- Returns: BOOLEAN (true only if realm='admin' AND actor_id NOT NULL)
-- Purpose: Fail-closed enforcement for control-plane admin operations
-- Usage: Policies check this to ensure admin context is present
CREATE OR REPLACE FUNCTION app.require_admin_context() RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT app.current_realm() = 'admin'
  AND app.current_actor_id() IS NOT NULL;
$$;
COMMENT ON FUNCTION app.require_admin_context() IS 'Returns TRUE only if: (1) realm = "admin", (2) actor_id IS NOT NULL. Used in control-plane policies to enforce admin-scoped access. Fail-closed: returns FALSE if context missing.';
-- ============================================================================
-- PHASE 2: Enable RLS on impersonation_sessions
-- ============================================================================
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- PHASE 3: Admin-Scoped Policies (Actor Isolation)
-- ============================================================================
-- Policy: admin_select
-- Purpose: Admin can SELECT only their own impersonation sessions
-- Actor isolation: admin_id must match current actor_id
-- Fail-closed: Requires admin context (realm='admin' + actor_id NOT NULL)
CREATE POLICY admin_select ON public.impersonation_sessions FOR
SELECT USING (
    app.require_admin_context()
    AND impersonation_sessions.admin_id = app.current_actor_id()
  );
COMMENT ON POLICY admin_select ON public.impersonation_sessions IS 'Admin SELECT: Allow admin to read ONLY their own impersonation sessions. Actor isolation: admin_id = actor_id. Fail-closed: requires admin context (realm=admin).';
-- Policy: admin_insert
-- Purpose: Admin can INSERT impersonation sessions where they are the admin
-- Actor isolation: admin_id must match current actor_id
-- Fail-closed: Requires admin context
CREATE POLICY admin_insert ON public.impersonation_sessions FOR
INSERT WITH CHECK (
    app.require_admin_context()
    AND impersonation_sessions.admin_id = app.current_actor_id()
  );
COMMENT ON POLICY admin_insert ON public.impersonation_sessions IS 'Admin INSERT: Allow admin to create impersonation sessions ONLY where admin_id = current actor. Prevents admin from creating sessions for other admins. Fail-closed: requires admin context.';
-- Policy: admin_update
-- Purpose: Admin can UPDATE only their own sessions (e.g., end session)
-- Actor isolation: admin_id must match current actor_id
-- Fail-closed: Requires admin context
-- Typical UPDATE: SET ended_at = NOW() (end impersonation session)
CREATE POLICY admin_update ON public.impersonation_sessions FOR
UPDATE USING (
    app.require_admin_context()
    AND impersonation_sessions.admin_id = app.current_actor_id()
  ) WITH CHECK (
    app.require_admin_context()
    AND impersonation_sessions.admin_id = app.current_actor_id()
  );
COMMENT ON POLICY admin_update ON public.impersonation_sessions IS 'Admin UPDATE: Allow admin to update ONLY their own sessions (e.g., end session). Actor isolation: admin_id = actor_id. Both USING and WITH CHECK enforce admin_id cannot change to another admin. Fail-closed: requires admin context.';
-- Policy: bypass_select (test-only)
-- Purpose: Test bypass for seeding/cleanup (triple-gate)
-- MUST NOT be used in production (realm='test' enforced)
CREATE POLICY bypass_select ON public.impersonation_sessions FOR
SELECT USING (app.bypass_enabled());
COMMENT ON POLICY bypass_select ON public.impersonation_sessions IS 'Test-only SELECT bypass: Triple-gate (bypass_rls=on + realm IN (test,service) + role=TEST_SEED). NEVER active in production (realm enforcement).';
-- Policy: bypass_operations (test-only)
-- Purpose: Test bypass for INSERT/UPDATE/DELETE (cleanup operations)
-- MUST NOT be used in production (realm='test' enforced)
CREATE POLICY bypass_operations ON public.impersonation_sessions FOR ALL USING (app.bypass_enabled());
COMMENT ON POLICY bypass_operations ON public.impersonation_sessions IS 'Test-only ALL bypass: Triple-gate (bypass_rls=on + realm IN (test,service) + role=TEST_SEED). Allows test cleanup operations. NEVER active in production.';
-- Policy: restrictive_guard
-- Purpose: Fail-closed enforcement (deny ALL unless admin context OR test bypass)
-- RESTRICTIVE: AND-combined with permissive policies above
-- Blocks tenant users (realm='tenant') from accessing impersonation_sessions
-- Blocks unauthenticated requests (no context)
CREATE POLICY restrictive_guard ON public.impersonation_sessions AS RESTRICTIVE FOR ALL USING (
  app.require_admin_context()
  OR app.bypass_enabled()
) WITH CHECK (
  app.require_admin_context()
  OR app.bypass_enabled()
);
COMMENT ON POLICY restrictive_guard ON public.impersonation_sessions IS 'Fail-closed guard: Block ALL operations unless admin context OR test bypass present. RESTRICTIVE (AND-combined): even if other policies allow, this must pass. Blocks tenant users (realm=tenant) and unauthenticated requests. Ensures control-plane privacy.';
-- ============================================================================
-- PHASE 4: Grant Permissions to Application Role
-- ============================================================================
-- Grant schema usage (if not already granted)
GRANT USAGE ON SCHEMA public TO texqtic_app;
-- Grant table permissions (SELECT, INSERT, UPDATE only; no DELETE)
-- DELETE is denied by omission (no policy + RLS enforced = fail-closed)
GRANT SELECT,
  INSERT,
  UPDATE ON public.impersonation_sessions TO texqtic_app;
-- ============================================================================
-- PHASE 5: Verification (Fail-Fast Checks)
-- ============================================================================
-- Verify RLS is enabled
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'impersonation_sessions'
    AND c.relrowsecurity = true
) THEN RAISE EXCEPTION 'RLS verification failed: impersonation_sessions.relrowsecurity != true';
END IF;
END $$;
-- Verify FORCE RLS is enabled
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'impersonation_sessions'
    AND c.relforcerowsecurity = true
) THEN RAISE EXCEPTION 'FORCE RLS verification failed: impersonation_sessions.relforcerowsecurity != true';
END IF;
END $$;
-- Verify policy count (6 policies: admin_select, admin_insert, admin_update, 
-- bypass_select, bypass_operations, restrictive_guard)
DO $$
DECLARE policy_count INT;
BEGIN
SELECT COUNT(*) INTO policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'impersonation_sessions';
IF policy_count < 6 THEN RAISE EXCEPTION 'Policy verification failed: Expected 6+ policies, found %',
policy_count;
END IF;
END $$;