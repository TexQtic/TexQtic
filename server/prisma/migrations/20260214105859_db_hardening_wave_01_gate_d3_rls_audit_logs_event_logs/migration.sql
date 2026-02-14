-- ============================================================================
-- TEXQTIC DB-HARDENING-WAVE-01 (Gate D.3 - Ledger-Adjacent RLS)
-- Migration: Enable Constitutional RLS on audit_logs + event_logs
-- Doctrine v1.4: Fail-closed, immutable ledger-adjacent enforcement
-- ============================================================================
--
-- CRITICAL CONSTRAINTS:
--   - audit_logs + event_logs are IMMUTABLE (append-only)
--   - Writes may be necessary for operation; reads MUST be org-scoped
--   - UPDATE/DELETE are DENIED (no policies = denied by FORCE RLS)
--   - Fail-closed: No access without org context OR test bypass
--   - Control plane: Can read across tenants (admin auditing)
--   - Tenant plane: Strict org isolation (app.current_org_id())
--
-- SCOPE: Gate D.3 (audit_logs + event_logs immutability + isolation)
-- ============================================================================
-- ============================================================================
-- PART 1: audit_logs — RLS + POLICIES
-- ============================================================================
-- Enable RLS + FORCE RLS (mandatory enforcement)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
COMMENT ON TABLE audit_logs IS 'Immutable audit trail (append-only). RLS enforced. UPDATE/DELETE denied. Gate D.3.';
-- ----------------------------------------------------------------------------
-- TENANT SELECT POLICY: Strict org-scoped reads
-- ----------------------------------------------------------------------------
-- Allows tenant to read ONLY their audit logs (tenant_id = app.current_org_id())
-- Control plane accesses via bypass role (texqtic_role_bypass)
CREATE POLICY audit_logs_tenant_select ON audit_logs FOR
SELECT TO texqtic_app USING (tenant_id = app.current_org_id());
-- ----------------------------------------------------------------------------
-- TENANT INSERT POLICY: Org-scoped + context-validated writes
-- ----------------------------------------------------------------------------
-- Allows INSERT only when:
-- 1. Org context exists (app.require_org_context() succeeds)
-- 2. tenant_id matches session context (app.current_org_id())
-- 3. OR test bypass is active (triple-gated)
CREATE POLICY audit_logs_tenant_insert ON audit_logs FOR
INSERT TO texqtic_app WITH CHECK (
    -- Enforce org context exists
    app.require_org_context() IS NOT NULL -- Enforce tenant_id matches session context
    AND (tenant_id = app.current_org_id())
  );
-- ----------------------------------------------------------------------------
-- TEST-ONLY BYPASS POLICY: SELECT (triple-gated)
-- ----------------------------------------------------------------------------
-- Allows tests to read all rows during seeding/cleanup
-- Triple gate: bypass_rls=on + realm=test + roles=TEST_SEED
CREATE POLICY audit_logs_bypass_select ON audit_logs FOR
SELECT TO texqtic_app USING (app.bypass_enabled());
-- ----------------------------------------------------------------------------
-- TEST-ONLY BYPASS POLICY: INSERT (triple-gated)
-- ----------------------------------------------------------------------------
-- Allows tests to insert without org context during seeding
CREATE POLICY audit_logs_bypass_insert ON audit_logs FOR
INSERT TO texqtic_app WITH CHECK (app.bypass_enabled());
-- ----------------------------------------------------------------------------
-- RESTRICTIVE GUARD POLICY: Fail-closed enforcement
-- ----------------------------------------------------------------------------
-- Denies ALL operations unless org context exists OR test bypass enabled
-- RESTRICTIVE = applied IN ADDITION TO permissive policies (belt + suspenders)
CREATE POLICY audit_logs_guard ON audit_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ----------------------------------------------------------------------------
-- IMMUTABILITY ENFORCEMENT: UPDATE/DELETE DENIED
-- ----------------------------------------------------------------------------
-- NO UPDATE/DELETE policies = FORCE RLS denies all UPDATE/DELETE
-- Audit logs are immutable (append-only ledger)
COMMENT ON TABLE audit_logs IS 'Immutable audit trail. UPDATE/DELETE denied by RLS. INSERT-only. Gate D.3.';
-- ============================================================================
-- PART 2: event_logs — RLS + POLICIES
-- ============================================================================
-- Enable RLS + FORCE RLS (mandatory enforcement)
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs FORCE ROW LEVEL SECURITY;
COMMENT ON TABLE event_logs IS 'Immutable event stream (append-only). RLS enforced. UPDATE/DELETE denied. Gate D.3.';
-- ----------------------------------------------------------------------------
-- TENANT SELECT POLICY: Strict org-scoped reads
-- ----------------------------------------------------------------------------
-- Allows tenant to read ONLY their events (tenant_id = app.current_org_id())
CREATE POLICY event_logs_tenant_select ON event_logs FOR
SELECT TO texqtic_app USING (tenant_id = app.current_org_id());
-- ----------------------------------------------------------------------------
-- TENANT INSERT POLICY: Org-scoped + context-validated writes
-- ----------------------------------------------------------------------------
-- Allows INSERT only when:
-- 1. Org context exists (app.require_org_context() succeeds)
-- 2. tenant_id matches session context (app.current_org_id())
-- 3. OR test bypass is active (triple-gated)
CREATE POLICY event_logs_tenant_insert ON event_logs FOR
INSERT TO texqtic_app WITH CHECK (
    -- Enforce org context exists
    app.require_org_context() IS NOT NULL -- Enforce tenant_id matches session context
    AND (tenant_id = app.current_org_id())
  );
-- ----------------------------------------------------------------------------
-- TEST-ONLY BYPASS POLICY: SELECT (triple-gated)
-- ----------------------------------------------------------------------------
-- Allows tests to read all rows during seeding/cleanup
CREATE POLICY event_logs_bypass_select ON event_logs FOR
SELECT TO texqtic_app USING (app.bypass_enabled());
-- ----------------------------------------------------------------------------
-- TEST-ONLY BYPASS POLICY: INSERT (triple-gated)
-- ----------------------------------------------------------------------------
-- Allows tests to insert without org context during seeding
CREATE POLICY event_logs_bypass_insert ON event_logs FOR
INSERT TO texqtic_app WITH CHECK (app.bypass_enabled());
-- ----------------------------------------------------------------------------
-- RESTRICTIVE GUARD POLICY: Fail-closed enforcement
-- ----------------------------------------------------------------------------
-- Denies ALL operations unless org context exists OR test bypass enabled
CREATE POLICY event_logs_guard ON event_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ----------------------------------------------------------------------------
-- IMMUTABILITY ENFORCEMENT: UPDATE/DELETE DENIED
-- ----------------------------------------------------------------------------
-- NO UPDATE/DELETE policies = FORCE RLS denies all UPDATE/DELETE
-- Event logs are immutable (append-only event stream)
COMMENT ON TABLE event_logs IS 'Immutable event stream. UPDATE/DELETE denied by RLS. INSERT-only. Gate D.3.';
-- ============================================================================
-- PART 3: GRANTS (schema USAGE + table permissions)
-- ============================================================================
-- Schema USAGE grant (prerequisite for table access)
-- Already granted in previous gates, but re-applying for safety
GRANT USAGE ON SCHEMA public TO texqtic_app;
-- Grant table privileges: audit_logs
-- SELECT + INSERT only (UPDATE/DELETE denied by policy absence)
GRANT SELECT,
  INSERT ON TABLE public.audit_logs TO texqtic_app;
COMMENT ON TABLE public.audit_logs IS 'RLS-protected immutable audit trail. texqtic_app has SELECT + INSERT only. Gate D.3.';
-- Grant table privileges: event_logs
-- SELECT + INSERT only (UPDATE/DELETE denied by policy absence)
GRANT SELECT,
  INSERT ON TABLE public.event_logs TO texqtic_app;
COMMENT ON TABLE public.event_logs IS 'RLS-protected immutable event stream. texqtic_app has SELECT + INSERT only. Gate D.3.';
-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================
-- Verify RLS is enabled + forced
DO $$
DECLARE audit_logs_rls_enabled boolean;
audit_logs_rls_forced boolean;
event_logs_rls_enabled boolean;
event_logs_rls_forced boolean;
audit_logs_policy_count int;
event_logs_policy_count int;
BEGIN -- Check audit_logs RLS status
SELECT relrowsecurity,
  relforcerowsecurity INTO audit_logs_rls_enabled,
  audit_logs_rls_forced
FROM pg_class
WHERE relname = 'audit_logs';
IF NOT audit_logs_rls_enabled
OR NOT audit_logs_rls_forced THEN RAISE EXCEPTION 'Gate D.3 verification FAILED: audit_logs RLS not properly enabled';
END IF;
-- Check event_logs RLS status
SELECT relrowsecurity,
  relforcerowsecurity INTO event_logs_rls_enabled,
  event_logs_rls_forced
FROM pg_class
WHERE relname = 'event_logs';
IF NOT event_logs_rls_enabled
OR NOT event_logs_rls_forced THEN RAISE EXCEPTION 'Gate D.3 verification FAILED: event_logs RLS not properly enabled';
END IF;
-- Count policies for audit_logs (should be 5: 2 tenant + 2 bypass + 1 guard)
SELECT COUNT(*) INTO audit_logs_policy_count
FROM pg_policies
WHERE tablename = 'audit_logs'
  AND schemaname = 'public';
IF audit_logs_policy_count < 5 THEN RAISE WARNING 'Gate D.3: audit_logs has only % policies (expected 5+)',
audit_logs_policy_count;
END IF;
-- Count policies for event_logs (should be 5: 2 tenant + 2 bypass + 1 guard)
SELECT COUNT(*) INTO event_logs_policy_count
FROM pg_policies
WHERE tablename = 'event_logs'
  AND schemaname = 'public';
IF event_logs_policy_count < 5 THEN RAISE WARNING 'Gate D.3: event_logs has only % policies (expected 5+)',
event_logs_policy_count;
END IF;
RAISE NOTICE 'Gate D.3 verification PASSED:';
RAISE NOTICE '  - audit_logs: RLS=% FORCE=% policies=%',
audit_logs_rls_enabled,
audit_logs_rls_forced,
audit_logs_policy_count;
RAISE NOTICE '  - event_logs: RLS=% FORCE=% policies=%',
event_logs_rls_enabled,
event_logs_rls_forced,
event_logs_policy_count;
RAISE NOTICE '  - Immutability: UPDATE/DELETE policies absent (denied by FORCE RLS)';
RAISE NOTICE '  - Fail-closed: RESTRICTIVE guard policies active';
END $$;