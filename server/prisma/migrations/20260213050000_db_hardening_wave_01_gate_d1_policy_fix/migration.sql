-- ============================================================================
-- TEXQTIC DB-HARDENING-WAVE-01 (Gate D.1 - Corrective)
-- Migration: Fix policy logic for memberships + invites
-- CHANGE: Fix OR app.bypass_enabled() → AND NOT app.bypass_enabled() pattern
-- PATTERN: Separate bypass policies (matches catalog_items pattern)
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEMBERSHIPS TABLE: Fix Policies
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Drop incorrectly structured policies
DROP POLICY IF EXISTS memberships_tenant_select ON memberships;
DROP POLICY IF EXISTS memberships_tenant_insert ON memberships;
DROP POLICY IF EXISTS memberships_tenant_update ON memberships;
DROP POLICY IF EXISTS memberships_tenant_delete ON memberships;
DROP POLICY IF EXISTS memberships_guard_require_context ON memberships;
-- Recreate tenant isolation policies (Fail-Closed)
CREATE POLICY memberships_tenant_select ON memberships FOR
SELECT USING (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY memberships_tenant_insert ON memberships FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY memberships_tenant_update ON memberships FOR
UPDATE USING (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY memberships_tenant_delete ON memberships FOR DELETE USING (
  app.require_org_context()
  AND memberships.tenant_id = app.current_org_id()
  AND NOT app.bypass_enabled()
);
-- Create bypass policies (Seed-Only, Triple-Gated)
CREATE POLICY mb_bypass_select ON memberships FOR
SELECT USING (app.bypass_enabled());
CREATE POLICY mb_bypass_insert ON memberships FOR
INSERT WITH CHECK (app.bypass_enabled());
CREATE POLICY mb_bypass_update ON memberships FOR
UPDATE USING (app.bypass_enabled()) WITH CHECK (app.bypass_enabled());
CREATE POLICY mb_bypass_delete ON memberships FOR DELETE USING (app.bypass_enabled());
-- Recreate RESTRICTIVE guard
CREATE POLICY memberships_guard_require_context ON memberships AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INVITES TABLE: Fix Policies
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Drop incorrectly structured policies
DROP POLICY IF EXISTS invites_tenant_select ON invites;
DROP POLICY IF EXISTS invites_tenant_insert ON invites;
DROP POLICY IF EXISTS invites_tenant_update ON invites;
DROP POLICY IF EXISTS invites_tenant_delete ON invites;
DROP POLICY IF EXISTS invites_guard_require_context ON invites;
-- Recreate tenant isolation policies (Fail-Closed)
CREATE POLICY invites_tenant_select ON invites FOR
SELECT USING (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY invites_tenant_insert ON invites FOR
INSERT WITH CHECK (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY invites_tenant_update ON invites FOR
UPDATE USING (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  ) WITH CHECK (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );
CREATE POLICY invites_tenant_delete ON invites FOR DELETE USING (
  app.require_org_context()
  AND invites.tenant_id = app.current_org_id()
  AND NOT app.bypass_enabled()
);
-- Create bypass policies (Seed-Only, Triple-Gated)
CREATE POLICY inv_bypass_select ON invites FOR
SELECT USING (app.bypass_enabled());
CREATE POLICY inv_bypass_insert ON invites FOR
INSERT WITH CHECK (app.bypass_enabled());
CREATE POLICY inv_bypass_update ON invites FOR
UPDATE USING (app.bypass_enabled()) WITH CHECK (app.bypass_enabled());
CREATE POLICY inv_bypass_delete ON invites FOR DELETE USING (app.bypass_enabled());
-- Recreate RESTRICTIVE guard
CREATE POLICY invites_guard_require_context ON invites AS RESTRICTIVE FOR ALL USING (
  app.require_org_context()
  OR app.bypass_enabled()
);