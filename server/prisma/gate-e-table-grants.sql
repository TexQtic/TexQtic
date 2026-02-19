-- Gate E Permissions Baseline: Grant table privileges for app_user
-- 
-- Purpose: Enable Gate E tests (auth login flows, rate limiting, audit) by granting
--          necessary privileges for app_user role operations.
--
-- Context: app_user role requires table access for:
--    - Auth login flows: SELECT on users, admin_users, memberships, tenants (E.3, E.4)
--    - Rate limiting infrastructure: SELECT/INSERT/UPDATE on rate_limit_attempts (E.3)
--    - Auth token management: SELECT/INSERT/UPDATE/DELETE on refresh_tokens (E.3, E.4)
--
-- Doctrine v1.4: Least privilege. Read-only for core tables, write for infrastructure only.
-- RLS policies remain unchanged. This is permissions baseline only.
--
-- DO NOT TOUCH: auth.* schema (Supabase system tables)
-- Grant schema-level USAGE (required for table access)
GRANT USAGE ON SCHEMA public TO app_user;
-- ============================================================================
-- AUTH LOGIN FLOW TABLES (READ-ONLY)
-- Required by: /api/auth/login (tenant and admin variants)
-- Code locations: server/src/routes/auth.ts lines ~147, ~423, ~638, ~858
-- ============================================================================
-- users: tenant login queries (tx.user.findUnique in withDbContext)
-- Line: auth.ts:149 - const user = await tx.user.findUnique({ where: { email } })
GRANT SELECT ON TABLE public.users TO app_user;
-- admin_users: admin login queries (tx.adminUser.findUnique in withDbContext)
-- Line: auth.ts:423, 638 - const admin = await tx.adminUser.findUnique({ where: { email } })
GRANT SELECT ON TABLE public.admin_users TO app_user;
-- memberships: tenant membership checks (nested in user queries)
-- Line: auth.ts:154 - memberships: { select: { tenantId, role, tenant: { ... } } }
GRANT SELECT ON TABLE public.memberships TO app_user;
-- tenants: tenant status validation (nested via memberships)
-- Line: auth.ts:158 - tenant: { select: { status: true } }
GRANT SELECT ON TABLE public.tenants TO app_user;
-- ============================================================================
-- INFRASTRUCTURE TABLES (READ-WRITE)
-- Required by: rate limiter, auth token management
-- ============================================================================
-- rate_limit_attempts: rate limiting enforcement (E.3)
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.rate_limit_attempts TO app_user;
-- refresh_tokens: auth session management
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.refresh_tokens TO app_user;
-- ============================================================================
-- AUDIT TABLES (READ-ONLY)
-- Required by: E.4 audit emission tests, operational audit log queries
-- ============================================================================
-- audit_logs: audit event verification (E.4)
-- Line: gate-e-4-audit.integration.test.ts - tx.auditLog.findMany in withDbContext
-- Note: INSERT handled by triggers; app_user only needs SELECT for verification
GRANT SELECT ON TABLE public.audit_logs TO app_user;
-- ============================================================================
-- SEQUENCES
-- Prisma uses RETURNING for UUIDs, but grant sequences for safety
-- ============================================================================
GRANT USAGE,
  SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- ============================================================================
-- VERIFICATION QUERIES (READ-ONLY)
-- Run these manually to confirm grants applied correctly
-- ============================================================================
-- Check table privileges for auth tables
SELECT tablename,
  has_table_privilege('app_user', 'public.' || tablename, 'SELECT') AS can_select,
  has_table_privilege('app_user', 'public.' || tablename, 'INSERT') AS can_insert,
  has_table_privilege('app_user', 'public.' || tablename, 'UPDATE') AS can_update,
  has_table_privilege('app_user', 'public.' || tablename, 'DELETE') AS can_delete
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'admin_users',
    'memberships',
    'tenants',
    'rate_limit_attempts',
    'refresh_tokens',
    'audit_logs'
  )
ORDER BY tablename;
-- Verify RLS is still enabled (should be 't' for all)
SELECT schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'admin_users',
    'memberships',
    'tenants',
    'rate_limit_attempts',
    'refresh_tokens',
    'audit_logs'
  )
ORDER BY tablename;