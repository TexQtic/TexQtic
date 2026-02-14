-- ============================================================================
-- DB-HARDENING-WAVE-01 Gate D.2: RLS Rollout Slice #2 (carts + cart_items)
-- Purpose: Constitutional RLS enforcement on cart domain tables
-- Scope: Enable fail-closed RLS on carts + cart_items with tenant isolation
-- Author: TexQtic Platform Engineering
-- Date: 2026-02-14
-- Doctrine: v1.4 (org_id = tenant boundary, fail-closed, pooler-safe)
-- ============================================================================
-- ============================================================================
-- PHASE 1: Enable RLS on Target Tables
-- ============================================================================
-- Enable RLS on carts (has direct tenant_id column)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
-- Enable RLS on cart_items (no direct tenant_id, enforces via carts FK)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- PHASE 2: Tenant Isolation Policies — carts table
-- ============================================================================
-- Policy: tenant_select (carts)
-- Purpose: Allow SELECT only for rows where tenant_id matches current org
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_select ON carts FOR
SELECT USING (
    app.require_org_context()
    AND carts.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_select ON carts IS 'Tenant isolation for SELECT: only return carts where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_insert (carts)
-- Purpose: Allow INSERT only if org_id context matches row tenant_id
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_insert ON carts FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND carts.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_insert ON carts IS 'Tenant isolation for INSERT: only allow inserts where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_update (carts)
-- Purpose: Allow UPDATE only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_update ON carts FOR
UPDATE USING (
    app.require_org_context()
    AND carts.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND carts.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_update ON carts IS 'Tenant isolation for UPDATE: only update carts where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- Policy: tenant_delete (carts)
-- Purpose: Allow DELETE only for rows belonging to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_delete ON carts FOR DELETE USING (
  app.require_org_context()
  AND carts.tenant_id = app.current_org_id()
  AND NOT app.bypass_enabled()
);
COMMENT ON POLICY tenant_delete ON carts IS 'Tenant isolation for DELETE: only delete carts where tenant_id matches app.org_id context. Fail-closed: requires context.';
-- ============================================================================
-- PHASE 3: Tenant Isolation Policies — cart_items table (JOIN-BASED)
-- ============================================================================
-- CRITICAL: cart_items has NO direct tenant_id column
-- Tenant isolation enforced via FK relationship to carts.tenant_id
-- Uses EXISTS subquery to validate parent cart belongs to current tenant
-- Policy: tenant_select (cart_items)
-- Purpose: Allow SELECT only for cart_items where parent cart belongs to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_select ON cart_items FOR
SELECT USING (
    app.require_org_context()
    AND EXISTS (
      SELECT 1
      FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.tenant_id = app.current_org_id()
    )
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_select ON cart_items IS 'Tenant isolation for SELECT: only return cart_items where parent cart belongs to current tenant (via JOIN). Fail-closed: requires context.';
-- Policy: tenant_insert (cart_items)
-- Purpose: Allow INSERT only if parent cart belongs to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_insert ON cart_items FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND EXISTS (
      SELECT 1
      FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.tenant_id = app.current_org_id()
    )
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_insert ON cart_items IS 'Tenant isolation for INSERT: only allow inserts where parent cart belongs to current tenant (via JOIN). Fail-closed: requires context.';
-- Policy: tenant_update (cart_items)
-- Purpose: Allow UPDATE only for cart_items where parent cart belongs to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_update ON cart_items FOR
UPDATE USING (
    app.require_org_context()
    AND EXISTS (
      SELECT 1
      FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.tenant_id = app.current_org_id()
    )
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND EXISTS (
      SELECT 1
      FROM carts
      WHERE carts.id = cart_items.cart_id
        AND carts.tenant_id = app.current_org_id()
    )
    AND NOT app.bypass_enabled()
  );
COMMENT ON POLICY tenant_update ON cart_items IS 'Tenant isolation for UPDATE: only update cart_items where parent cart belongs to current tenant (via JOIN). Fail-closed: requires context.';
-- Policy: tenant_delete (cart_items)
-- Purpose: Allow DELETE only for cart_items where parent cart belongs to current tenant
-- Fail-closed: Requires org_id context AND bypass disabled
CREATE POLICY tenant_delete ON cart_items FOR DELETE USING (
  app.require_org_context()
  AND EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.tenant_id = app.current_org_id()
  )
  AND NOT app.bypass_enabled()
);
COMMENT ON POLICY tenant_delete ON cart_items IS 'Tenant isolation for DELETE: only delete cart_items where parent cart belongs to current tenant (via JOIN). Fail-closed: requires context.';
-- ============================================================================
-- PHASE 4: RESTRICTIVE Guard Policies (Fail-Closed Enforcement)
-- ============================================================================
-- Guard policy: carts
-- Purpose: Deny ALL access unless context is set OR bypass enabled
-- Restrictive: Applied in addition to permissive policies (must pass both)
CREATE POLICY carts_guard ON carts AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
COMMENT ON POLICY carts_guard ON carts IS 'RESTRICTIVE guard: deny all access unless app.org_id context is set OR bypass enabled (test-only). Enforces fail-closed behavior.';
-- Guard policy: cart_items
-- Purpose: Deny ALL access unless context is set OR bypass enabled
-- Restrictive: Applied in addition to permissive policies (must pass both)
CREATE POLICY cart_items_guard ON cart_items AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
COMMENT ON POLICY cart_items_guard ON cart_items IS 'RESTRICTIVE guard: deny all access unless app.org_id context is set OR bypass enabled (test-only). Enforces fail-closed behavior.';
-- ============================================================================
-- PHASE 5: Bypass Policies (Test-Only, Triple-Gated)
-- ============================================================================
-- Bypass policies: carts
-- Purpose: Allow seed scripts to operate in test environment only
-- Triple-gate: app.bypass_rls='on' AND realm IN ('test','service') AND role=TEST_SEED
CREATE POLICY bypass_select ON carts FOR
SELECT USING (app.bypass_enabled());
CREATE POLICY bypass_insert ON carts FOR
INSERT WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_update ON carts FOR
UPDATE USING (app.bypass_enabled()) WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_delete ON carts FOR DELETE USING (app.bypass_enabled());
COMMENT ON POLICY bypass_select ON carts IS 'Bypass policy for SELECT: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_insert ON carts IS 'Bypass policy for INSERT: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_update ON carts IS 'Bypass policy for UPDATE: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_delete ON carts IS 'Bypass policy for DELETE: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
-- Bypass policies: cart_items
CREATE POLICY bypass_select ON cart_items FOR
SELECT USING (app.bypass_enabled());
CREATE POLICY bypass_insert ON cart_items FOR
INSERT WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_update ON cart_items FOR
UPDATE USING (app.bypass_enabled()) WITH CHECK (app.bypass_enabled());
CREATE POLICY bypass_delete ON cart_items FOR DELETE USING (app.bypass_enabled());
COMMENT ON POLICY bypass_select ON cart_items IS 'Bypass policy for SELECT: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_insert ON cart_items IS 'Bypass policy for INSERT: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_update ON cart_items IS 'Bypass policy for UPDATE: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
COMMENT ON POLICY bypass_delete ON cart_items IS 'Bypass policy for DELETE: allows seed scripts in test environment. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';
-- ============================================================================
-- PHASE 6: Grant Permissions to texqtic_app Role
-- ============================================================================
-- Grant required permissions for texqtic_app role (NOBYPASSRLS)
-- Required for SET LOCAL ROLE texqtic_app pattern in withDbContext()
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON public.carts TO texqtic_app;
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON public.cart_items TO texqtic_app;
-- ============================================================================
-- PHASE 7: Verification Queries
-- ============================================================================
-- Verification can be run manually after migration:
--
-- 1. Check RLS enabled + forced:
--    SELECT 
--      tablename, 
--      rowsecurity,
--      c.relforcerowsecurity 
--    FROM pg_tables t
--    JOIN pg_class c ON t.tablename = c.relname
--    WHERE schemaname = 'public' 
--      AND tablename IN ('carts', 'cart_items');
--    Expected: Both tables show rowsecurity = true, relforcerowsecurity = true
--
-- 2. Check policies count:
--    SELECT tablename, COUNT(*) as policy_count 
--    FROM pg_policies 
--    WHERE tablename IN ('carts', 'cart_items')
--    GROUP BY tablename;
--    Expected: 
--      carts: 9 policies (4 tenant + 4 bypass + 1 guard)
--      cart_items: 9 policies (4 tenant + 4 bypass + 1 guard)
--
-- 3. Test fail-closed (no context):
--    BEGIN;
--    SELECT COUNT(*) FROM carts;
--    -- Expected: 0 rows (RLS denies access without context)
--    ROLLBACK;
--
-- 4. Test with context (assuming valid test tenant/user):
--    BEGIN;
--    SELECT set_config('app.org_id', '<valid-tenant-uuid>', true);
--    SELECT set_config('app.actor_id', '<valid-user-uuid>', true);
--    SELECT set_config('app.realm', 'tenant', true);
--    SELECT set_config('app.request_id', gen_random_uuid()::text, true);
--    SELECT set_config('app.bypass_rls', 'off', true);
--    SELECT COUNT(*) FROM carts;
--    -- Expected: Only tenant-scoped rows visible
--    ROLLBACK;
--
-- 5. Test cart_items JOIN isolation:
--    -- Same transaction as #4, then:
--    SELECT COUNT(*) FROM cart_items;
--    -- Expected: Only items belonging to tenant's carts visible
-- ============================================================================
-- End of Migration
-- ============================================================================