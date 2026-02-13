-- ============================================================================
-- TEXQTIC DB-HARDENING-WAVE-01 (Gate D.1)
-- Migration: Enable Constitutional RLS on memberships + invites
-- DOCTRINE: TexQtic v1.4 Constitutional RLS (Section 6.4)
--
-- SCOPE: Rollout slice #1
--   - memberships table
--   - invites table
--
-- PATTERN: org-scoped policies using app.current_org_id()
-- ENFORCEMENT: RESTRICTIVE guard policy (fail-closed)
-- BYPASS: Separate test-only bypass policies (triple-gated)
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEMBERSHIPS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE memberships IS 'RLS-protected tenant memberships. Enforces tenant_id = app.current_org_id(). Gate D.1.';

-- 2) Tenant Isolation Policies (Fail-Closed)

-- Policy: tenant_select
CREATE POLICY memberships_tenant_select ON memberships
  FOR SELECT
  USING (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY memberships_tenant_select ON memberships IS 'Tenant isolation for SELECT: only return memberships where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_insert
CREATE POLICY memberships_tenant_insert ON memberships
  FOR INSERT
  WITH CHECK (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY memberships_tenant_insert ON memberships IS 'Tenant isolation for INSERT: only allow inserts where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_update
CREATE POLICY memberships_tenant_update ON memberships
  FOR UPDATE
  USING (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  )
  WITH CHECK (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY memberships_tenant_update ON memberships IS 'Tenant isolation for UPDATE: only update memberships where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_delete
CREATE POLICY memberships_tenant_delete ON memberships
  FOR DELETE
  USING (
    app.require_org_context()
    AND memberships.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY memberships_tenant_delete ON memberships IS 'Tenant isolation for DELETE: only delete memberships where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- 3) Bypass Policies (Seed-Only, Triple-Gated)

-- Policy: bypass_select
CREATE POLICY memberships_bypass_select ON memberships
  FOR SELECT
  USING (app.bypass_enabled());

COMMENT ON POLICY memberships_bypass_select ON memberships IS 'Bypass policy for SELECT: allows seed scripts to read all rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_insert
CREATE POLICY memberships_bypass_insert ON memberships
  FOR INSERT
  WITH CHECK (app.bypass_enabled());

COMMENT ON POLICY memberships_bypass_insert ON memberships IS 'Bypass policy for INSERT: allows seed scripts to insert rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_update
CREATE POLICY memberships_bypass_update ON memberships
  FOR UPDATE
  USING (app.bypass_enabled()) 
  WITH CHECK (app.bypass_enabled());

COMMENT ON POLICY memberships_bypass_update ON memberships IS 'Bypass policy for UPDATE: allows seed scripts to update rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_delete
CREATE POLICY memberships_bypass_delete ON memberships
  FOR DELETE
  USING (app.bypass_enabled());

COMMENT ON POLICY memberships_bypass_delete ON memberships IS 'Bypass policy for DELETE: allows seed scripts to delete rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- 4) RESTRICTIVE Guard: Fail-closed enforcement
CREATE POLICY memberships_guard_require_context ON memberships
  AS RESTRICTIVE
  FOR ALL
  USING (
    app.require_org_context()
    OR app.bypass_enabled()
  );

COMMENT ON POLICY memberships_guard_require_context ON memberships IS 'RESTRICTIVE guard: Blocks all access unless org context exists OR bypass allowed. Enforces fail-closed behavior.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INVITES TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) Enable RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE invites IS 'RLS-protected tenant invites. Enforces tenant_id = app.current_org_id(). Gate D.1.';

-- 2) Tenant Isolation Policies (Fail-Closed)

-- Policy: tenant_select
CREATE POLICY invites_tenant_select ON invites
  FOR SELECT
  USING (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY invites_tenant_select ON invites IS 'Tenant isolation for SELECT: only return invites where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_insert
CREATE POLICY invites_tenant_insert ON invites
  FOR INSERT
  WITH CHECK (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY invites_tenant_insert ON invites IS 'Tenant isolation for INSERT: only allow inserts where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_update
CREATE POLICY invites_tenant_update ON invites
  FOR UPDATE
  USING (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  )
  WITH CHECK (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY invites_tenant_update ON invites IS 'Tenant isolation for UPDATE: only update invites where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- Policy: tenant_delete
CREATE POLICY invites_tenant_delete ON invites
  FOR DELETE
  USING (
    app.require_org_context()
    AND invites.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

COMMENT ON POLICY invites_tenant_delete ON invites IS 'Tenant isolation for DELETE: only delete invites where tenant_id matches app.org_id context. Fail-closed: requires context.';

-- 3) Bypass Policies (Seed-Only, Triple-Gated)

-- Policy: bypass_select
CREATE POLICY invites_bypass_select ON invites
  FOR SELECT
  USING (app.bypass_enabled());

COMMENT ON POLICY invites_bypass_select ON invites IS 'Bypass policy for SELECT: allows seed scripts to read all rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_insert
CREATE POLICY invites_bypass_insert ON invites
  FOR INSERT
  WITH CHECK (app.bypass_enabled());

COMMENT ON POLICY invites_bypass_insert ON invites IS 'Bypass policy for INSERT: allows seed scripts to insert rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_update
CREATE POLICY invites_bypass_update ON invites
  FOR UPDATE
  USING (app.bypass_enabled()) 
  WITH CHECK (app.bypass_enabled());

COMMENT ON POLICY invites_bypass_update ON invites IS 'Bypass policy for UPDATE: allows seed scripts to update rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- Policy: bypass_delete
CREATE POLICY invites_bypass_delete ON invites
  FOR DELETE
  USING (app.bypass_enabled());

COMMENT ON POLICY invites_bypass_delete ON invites IS 'Bypass policy for DELETE: allows seed scripts to delete rows. CRITICAL: Only active when bypass_enabled() = TRUE (triple-gated).';

-- 4) RESTRICTIVE Guard: Fail-closed enforcement
CREATE POLICY invites_guard_require_context ON invites
  AS RESTRICTIVE
  FOR ALL
  USING (
    app.require_org_context()
    OR app.bypass_enabled()
  );

COMMENT ON POLICY invites_guard_require_context ON invites IS 'RESTRICTIVE guard: Blocks all access unless org context exists OR bypass allowed. Enforces fail-closed behavior.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled and forced for both tables
SELECT 
  relname, 
  relrowsecurity AS rls_enabled, 
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('memberships', 'invites');

-- Expected output:
--   relname     | rls_enabled | rls_forced
--  -------------+-------------+------------
--   memberships | t           | t
--   invites     | t           | t
