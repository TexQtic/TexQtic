-- ============================================================================
-- DB-HARDENING-WAVE-01 Gate A: Context Helpers + Pilot RLS
-- Purpose: Constitutional RLS foundation (Doctrine v1.4)
-- Scope: Create app.* context helpers + enable fail-closed RLS on catalog_items
-- Author: TexQtic Platform Engineering
-- Date: 2026-02-12
-- ============================================================================
-- ============================================================================
-- PHASE 1: Create App Schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS app;
-- ============================================================================
-- PHASE 2: Context Helper Functions
-- ============================================================================
-- Function: app.current_org_id()
-- Returns: UUID of current tenant (org_id maps to tenantId in schema)
-- Fail-closed: Returns NULL if context not set (policies must check NOT NULL)
CREATE OR REPLACE FUNCTION app.current_org_id() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT NULLIF(current_setting('app.org_id', TRUE), '')::uuid;
$$;
COMMENT ON FUNCTION app.current_org_id() IS 'Returns current tenant ID from request context (app.org_id). Returns NULL if not set. Policies MUST check IS NOT NULL for fail-closed enforcement.';
-- Function: app.current_actor_id()
-- Returns: UUID of current actor (user or admin performing action)
-- Fail-closed: Returns NULL if context not set
CREATE OR REPLACE FUNCTION app.current_actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT NULLIF(current_setting('app.actor_id', TRUE), '')::uuid;
$$;
COMMENT ON FUNCTION app.current_actor_id() IS 'Returns current actor ID from request context (app.actor_id). Used for audit trails and actor-scoped policies.';
-- Function: app.current_roles()
-- Returns: TEXT (CSV string of roles)
-- Returns NULL if not set
CREATE OR REPLACE FUNCTION app.current_roles() RETURNS text LANGUAGE sql STABLE AS $$
SELECT current_setting('app.roles', TRUE);
$$;
COMMENT ON FUNCTION app.current_roles() IS 'Returns comma-separated role string from request context (app.roles). Example: "ADMIN,TEST_SEED".';
-- Function: app.current_realm()
-- Returns: TEXT ('tenant' or 'control')
-- Returns NULL if not set
CREATE OR REPLACE FUNCTION app.current_realm() RETURNS text LANGUAGE sql STABLE AS $$
SELECT current_setting('app.realm', TRUE);
$$;
COMMENT ON FUNCTION app.current_realm() IS 'Returns current realm from request context (app.realm). Values: "tenant" or "control".';
-- Function: app.current_request_id()
-- Returns: TEXT (UUID as string for tracing)
-- Returns NULL if not set
CREATE OR REPLACE FUNCTION app.current_request_id() RETURNS text LANGUAGE sql STABLE AS $$
SELECT current_setting('app.request_id', TRUE);
$$;
COMMENT ON FUNCTION app.current_request_id() IS 'Returns current request ID from request context (app.request_id). Used for distributed tracing and audit correlation.';
-- Function: app.has_role(role text)
-- Returns: BOOLEAN (true if role present in CSV string)
-- Robust: exact match only, no substring false positives
CREATE OR REPLACE FUNCTION app.has_role(role text) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE roles_csv text;
role_array text [];
r text;
BEGIN -- Get roles from context
roles_csv := current_setting('app.roles', TRUE);
-- If no roles set, return false
IF roles_csv IS NULL
OR roles_csv = '' THEN RETURN FALSE;
END IF;
-- Split CSV into array and trim whitespace
role_array := string_to_array(roles_csv, ',');
-- Check for exact match (prevent "ADMIN" matching "SUPERADMIN")
FOREACH r IN ARRAY role_array LOOP IF trim(r) = role THEN RETURN TRUE;
END IF;
END LOOP;
RETURN FALSE;
END;
$$;
COMMENT ON FUNCTION app.has_role(role text) IS 'Checks if specified role exists in app.roles context (CSV). Uses exact match to prevent substring false positives.';
-- Function: app.bypass_enabled()
-- Returns: BOOLEAN (true only if ALL conditions met)
-- Triple-gate: bypass_rls='on' AND realm IN ('test','service') AND has_role('TEST_SEED')
CREATE OR REPLACE FUNCTION app.bypass_enabled() RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT current_setting('app.bypass_rls', TRUE) = 'on'
  AND current_setting('app.realm', TRUE) IN ('test', 'service')
  AND app.has_role('TEST_SEED');
$$;
COMMENT ON FUNCTION app.bypass_enabled() IS 'Returns TRUE only if: (1) app.bypass_rls = "on", (2) realm IN ("test","service"), (3) role includes TEST_SEED. CRITICAL: Production realm must never enable bypass.';
-- Function: app.require_org_context()
-- Returns: BOOLEAN (true only if org_id context is set)
-- Used for fail-closed policies
CREATE OR REPLACE FUNCTION app.require_org_context() RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT app.current_org_id() IS NOT NULL;
$$;
COMMENT ON FUNCTION app.require_org_context() IS 'Returns TRUE only if app.org_id context is set (NOT NULL). Used in policies to enforce fail-closed behavior.';
-- ============================================================================
-- PHASE 3: Enable RLS on Pilot Table (catalog_items)
-- ============================================================================
-- Enable RLS (fail-closed by default: no policies = no access)
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- PHASE 4: Tenant Isolation Policies (Explicit per operation)
-- ============================================================================
-- Policy: tenant_select
-- Purpose: Allow SELECT only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_select ON catalog_items FOR
SELECT USING (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_select ON catalog_items IS 'Tenant isolation for SELECT: only return rows where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_insert
-- Purpose: Allow INSERT only if org_id context matches row tenant_id
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_insert ON catalog_items FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_insert ON catalog_items IS 'Tenant isolation for INSERT: only allow inserts where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_update
-- Purpose: Allow UPDATE only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
-- USING: determines which rows can be updated
-- WITH CHECK: validates row state after update
CREATE POLICY tenant_update ON catalog_items FOR
UPDATE USING (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_update ON catalog_items IS 'Tenant isolation for UPDATE: only update rows where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_delete
-- Purpose: Allow DELETE only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_delete ON catalog_items FOR DELETE USING (
  app.require_org_context()
  AND catalog_items.tenant_id = app.current_org_id()
  AND NOT app.bypass_enabled()
);
COMMENT ON POLICY tenant_delete ON catalog_items IS 'Tenant isolation for DELETE: only delete rows where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- ============================================================================
-- PHASE 5: Bypass Policies (Seed-Only, Triple-Gated)
-- ============================================================================
-- Policy: bypass_select
-- Purpose: Allow seed scripts to read all rows (test/service realm only)
-- Triple-gate: bypass_rls='on' AND realm IN ('test','service') AND role=TEST_SEED
CREATE POLICY bypass_select ON catalog_items FOR
SELECT USING (app.bypass_enabled());
COMMENT ON POLICY bypass_select ON catalog_items IS 'Bypass policy for SELECT: allows seed scripts to read all rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
-- Policy: bypass_modify
-- Purpose: Allow seed scripts to insert/update/delete (test/service realm only)
-- Triple-gate: Same as bypass_select
-- Note: Single policy for INSERT/UPDATE/DELETE (allowed by Postgres)
-- Using explicit operations to be clear
CREATE POLICY bypass_insert ON catalog_items FOR
INSERT WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_update ON catalog_items FOR
UPDATE USING (app.bypass_enabled()) WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_delete ON catalog_items FOR DELETE USING (app.bypass_enabled());
COMMENT ON POLICY bypass_insert ON catalog_items IS 'Bypass policy for INSERT: allows seed scripts. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_update ON catalog_items IS 'Bypass policy for UPDATE: allows seed scripts. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_delete ON catalog_items IS 'Bypass policy for DELETE: allows seed scripts. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
-- ============================================================================
-- PHASE 6: Verification Queries (for testing)
-- ============================================================================
-- Verification can be run manually:
--
-- 1. Check RLS enabled:
--    SELECT tablename, rowsecurity FROM pg_tables 
--    WHERE schemaname = 'public' AND tablename = 'catalog_items';
--    Expected: rowsecurity = true
--
-- 2. Check policies:
--    SELECT policyname, cmd, qual, with_check 
--    FROM pg_policies 
--    WHERE tablename = 'catalog_items';
--    Expected: 8 policies (4 tenant + 4 bypass)
--
-- 3. Check functions:
--    SELECT proname, prorettype::regtype 
--    FROM pg_proc 
--    WHERE pronamespace = 'app'::regnamespace;
--    Expected: 8 functions
--
-- 4. Test fail-closed (no context):
--    BEGIN;
--    SELECT COUNT(*) FROM catalog_items;
--    -- Expected: 0 rows (or permission denied)
--    ROLLBACK;
--
-- 5. Test with context:
--    BEGIN;
--    SELECT set_config('app.org_id', '<valid-tenant-uuid>', true);
--    SELECT set_config('app.actor_id', '<valid-user-uuid>', true);
--    SELECT set_config('app.realm', 'tenant', true);
--    SELECT set_config('app.request_id', 'test-req-1', true);
--    SELECT set_config('app.roles', 'ADMIN', true);
--    SELECT set_config('app.bypass_rls', 'off', true);
--    SELECT COUNT(*) FROM catalog_items;
--    -- Expected: only rows for specified tenant
--    ROLLBACK;
--
-- 6. Test bypass (seed mode):
--    BEGIN;
--    SELECT set_config('app.bypass_rls', 'on', true);
--    SELECT set_config('app.realm', 'test', true);
--    SELECT set_config('app.roles', 'TEST_SEED', true);
--    SELECT COUNT(*) FROM catalog_items;
--    -- Expected: all rows visible
--    ROLLBACK;
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================