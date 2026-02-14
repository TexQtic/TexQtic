-- ============================================================================
-- DB-HARDENING-WAVE-01 — GATE D.6
-- RLS Enforcement: marketplace_cart_summaries (Projection Table)
-- ============================================================================
--
-- Table: marketplace_cart_summaries
-- Purpose: Event-driven projection for marketplace cart analytics
-- Writer: System projector (event handlers)
-- Readers: Admin control plane only (tenant analytics future-proofed)
--
-- CRITICAL DESIGN:
-- - Projector writes with NO tenant context (system operation)
-- - Projector bypass required (projector_bypass_enabled() function)
-- - Tenant isolation enforced on SELECT (future-proof)
-- - DELETE denied by omission (projections are append/update only)
--
-- ============================================================================
-- ============================================================================
-- PHASE 1: Create Projector Bypass Function
-- ============================================================================
-- Function: app.projector_bypass_enabled()
-- Returns: BOOLEAN (true only if ALL conditions met)
-- Authorization: projector_bypass='on' AND realm='system' AND has_role('PROJECTOR')
--
-- This function enables production-safe bypass for system projection writes.
-- Unlike test bypass (bypass_enabled), this is allowed in production for
-- the specific use case of event-driven projection handlers.
CREATE OR REPLACE FUNCTION app.projector_bypass_enabled() RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT current_setting('app.projector_bypass', TRUE) = 'on'
  AND current_setting('app.realm', TRUE) = 'system'
  AND app.has_role('PROJECTOR');
$$;
COMMENT ON FUNCTION app.projector_bypass_enabled() IS 'Returns TRUE only if: (1) app.projector_bypass = on, (2) realm = system, (3) role includes PROJECTOR. Production-safe: Used for system projection writes only.';
-- ============================================================================
-- PHASE 2: Enable RLS on marketplace_cart_summaries
-- ============================================================================
-- Enable RLS (fail-closed by default: no policies = no access)
ALTER TABLE marketplace_cart_summaries ENABLE ROW LEVEL SECURITY;
-- Force RLS for table owner (prevents accidental bypass via owner role)
ALTER TABLE marketplace_cart_summaries FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- PHASE 3: Tenant Isolation Policy (SELECT only)
-- ============================================================================
-- Policy: tenant_select
-- Purpose: Allow SELECT only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND projector bypass disabled
--
-- Future-proofs for tenant-facing analytics while ensuring current admin
-- reads (which use bypass via isAdmin flag) continue to work.
CREATE POLICY tenant_select ON marketplace_cart_summaries FOR
SELECT USING (
    app.require_org_context()
    AND marketplace_cart_summaries.tenant_id = app.current_org_id()
  );
COMMENT ON POLICY tenant_select ON marketplace_cart_summaries IS 'Tenant isolation for SELECT: only return rows where tenant_id matches app.org_id context. Fail-closed: requires tenant context.';
-- ============================================================================
-- PHASE 4: Projector Write Policies (INSERT + UPDATE)
-- ============================================================================
-- Policy: projector_insert
-- Purpose: Allow INSERT ONLY when projector bypass is enabled
-- Authorization: projector_bypass_enabled() = true
--
-- Projector creates initial projection rows when cart.created events arrive.
-- No tenant context available (system operation).
CREATE POLICY projector_insert ON marketplace_cart_summaries FOR
INSERT WITH CHECK (app.projector_bypass_enabled());
COMMENT ON POLICY projector_insert ON marketplace_cart_summaries IS 'Projector-only INSERT: allows projection row creation when projector bypass is enabled. System operation: no tenant context required.';
-- Policy: projector_update
-- Purpose: Allow UPDATE ONLY when projector bypass is enabled
-- Authorization: projector_bypass_enabled() = true
--
-- Projector updates projection rows when cart item mutations occur
-- (item.added, item.updated, item.removed events). Recalculates counts
-- and increments version for optimistic locking.
CREATE POLICY projector_update ON marketplace_cart_summaries FOR
UPDATE USING (app.projector_bypass_enabled()) WITH CHECK (app.projector_bypass_enabled());
COMMENT ON POLICY projector_update ON marketplace_cart_summaries IS 'Projector-only UPDATE: allows projection row updates when projector bypass is enabled. System operation: recalculates item counts and updates version. No tenant context required.';
-- ============================================================================
-- PHASE 5: Test Bypass Policies (for seed/cleanup)
-- ============================================================================
-- Policy: bypass_select
-- Purpose: Allow SELECT when test bypass is enabled
-- Authorization: bypass_enabled() = true (triple-gate test bypass)
CREATE POLICY bypass_select ON marketplace_cart_summaries FOR
SELECT USING (app.bypass_enabled());
-- Policy: bypass_operations
-- Purpose: Allow all operations when test bypass is enabled
-- Authorization: bypass_enabled() = true (triple-gate test bypass)
CREATE POLICY bypass_operations ON marketplace_cart_summaries FOR ALL WITH CHECK (app.bypass_enabled());
COMMENT ON POLICY bypass_select ON marketplace_cart_summaries IS 'Test bypass for SELECT: allows read access when bypass_enabled() = true (test mode only).';
COMMENT ON POLICY bypass_operations ON marketplace_cart_summaries IS 'Test bypass for all operations: allows INSERT/UPDATE/DELETE when bypass_enabled() = true. Test mode only: used for seed/cleanup operations.';
-- ============================================================================
-- PHASE 6: Fail-Closed Restrictive Guard
-- ============================================================================
-- Policy: restrictive_guard
-- Purpose: Block ALL operations unless context OR bypass is present
-- Enforcement: RESTRICTIVE (AND-combined with permissive policies)
--
-- This is the constitutional fail-closed enforcement. Even if a permissive
-- policy allows an operation, this guard ensures either:
-- 1. Valid org context is set (app.require_org_context()), OR
-- 2. Projector bypass is enabled, OR
-- 3. Test bypass is enabled
--
-- NOTE: USING applies to SELECT/UPDATE/DELETE, WITH CHECK applies to INSERT/UPDATE
CREATE POLICY restrictive_guard ON marketplace_cart_summaries AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.projector_bypass_enabled()
  OR app.bypass_enabled()
) WITH CHECK (
  app.require_org_context()
  OR app.projector_bypass_enabled()
  OR app.bypass_enabled()
);
COMMENT ON POLICY restrictive_guard ON marketplace_cart_summaries IS 'Fail-closed guard: Block ALL operations unless context or bypass is present. RESTRICTIVE (AND-combined): even if other policies allow, this must pass. Allows: (1) valid org context, OR (2) projector bypass, OR (3) test bypass. Has both USING (SELECT/DELETE) and WITH CHECK (INSERT) clauses.';
-- ============================================================================
-- PHASE 7: Grant Permissions to Application Role
-- ============================================================================
-- Grant schema access
GRANT USAGE ON SCHEMA public TO texqtic_app;
-- Grant table operations
-- SELECT: Admin analytics (with bypass) + future tenant reads (with context)
-- INSERT: Projector creates initial projection rows
-- UPDATE: Projector updates counts and version
-- DELETE: Denied by omission (no grant = no permission)
GRANT SELECT,
  INSERT,
  UPDATE ON marketplace_cart_summaries TO texqtic_app;
COMMENT ON TABLE marketplace_cart_summaries IS 'Event-driven projection for marketplace cart analytics. RLS enforced: Tenant isolation on SELECT, projector bypass for INSERT/UPDATE. Writers: System projector only. Readers: Admin (bypass) + future tenant analytics. Gate D.6: marketplace_cart_summaries RLS enforcement.';
-- ============================================================================
-- PHASE 8: Verification
-- ============================================================================
-- Verify RLS is enabled
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'marketplace_cart_summaries'
    AND rowsecurity = true
) THEN RAISE EXCEPTION 'RLS verification failed: marketplace_cart_summaries.rowsecurity != true';
END IF;
END $$;
-- Verify FORCE RLS is enabled
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'marketplace_cart_summaries'
    AND c.relforcerowsecurity = true
) THEN RAISE EXCEPTION 'FORCE RLS verification failed: marketplace_cart_summaries.relforcerowsecurity != true';
END IF;
END $$;
-- Verify policy count (6 policies: tenant_select, projector_insert, projector_update, 
-- bypass_select, bypass_operations, restrictive_guard)
DO $$
DECLARE policy_count INT;
BEGIN
SELECT COUNT(*) INTO policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'marketplace_cart_summaries';
IF policy_count < 6 THEN RAISE EXCEPTION 'Policy verification failed: Expected 6+ policies, found %',
policy_count;
END IF;
END $$;
-- ============================================================================
-- End of Migration
-- ============================================================================