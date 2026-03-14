-- ============================================================
-- PW5-AUTH-BY-EMAIL-RLS-REMEDIATION
-- Migration: 20260319000001_pw5_by_email_service_role_grants
-- Date: 2026-03-14
--
-- Placement note:
--   Timestamped 20260319000001 to ensure this migration runs AFTER
--   20260317000000_g026_texqtic_service_role, which creates the
--   texqtic_service role this migration grants to.
--   Ordering is determined by directory name sort — placing this
--   before G-026 would cause GRANT to fail on a fresh database.
--
-- Purpose:
--   Extend texqtic_service (the approved BYPASSRLS service role
--   established in G-026 / 20260317000000_g026_texqtic_service_role)
--   with the minimum SELECT permissions required for the new
--   tenant-by-email resolution endpoint introduced in
--   PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN.
--
-- Problem:
--   GET /api/public/tenants/by-email queries memberships JOIN users.
--   Both tables are under FORCE RLS with policies scoped exclusively
--   to texqtic_app. The bare Prisma client (postgres role) matches no
--   PERMISSIVE policy — 0 rows returned under deny-by-default.
--
-- Fix:
--   Grant SELECT on public.memberships and public.users to texqtic_service.
--   The endpoint route was updated to run inside a prisma.$transaction with
--   SET LOCAL ROLE texqtic_service — the canonical TexQtic BYPASSRLS pattern
--   (see resolveDomain.ts / G-026 precedent).
--
-- Security model (unchanged from G-026):
--   texqtic_service is NOLOGIN — cannot connect directly.
--   Only reachable via SET LOCAL ROLE by the postgres user.
--   Only SELECT is granted. No INSERT/UPDATE/DELETE.
--   RLS policies are NOT modified; FORCE RLS is NOT disabled.
--   Minimum-necessary: only the two tables strictly required by the query path.
--
-- Deployment:
--   Applied through the repo-managed migration path:
--     pnpm -C server migrate:deploy:prod
--   (OPS-ENV-001 wrapper: tsx scripts/migrate-deploy.ts → prisma migrate deploy
--    using DIRECT_DATABASE_URL.)
--   Do NOT apply via ad hoc psql directly to production.
--
-- Idempotent: GRANT is safe to re-run (PostgreSQL silently skips existing grants).
-- ============================================================
BEGIN;
-- Grant minimum required SELECT permissions to texqtic_service.
-- memberships: required for membership WHERE user.email + tenant.status filter.
-- users:       required for the nested user.email join path executed by Prisma.
GRANT SELECT ON public.memberships TO texqtic_service;
GRANT SELECT ON public.users TO texqtic_service;
-- ── VERIFIER ─────────────────────────────────────────────────────────────────
-- Fails the transaction on any invariant violation.
DO $$
DECLARE v_has_memberships_sel BOOLEAN;
v_has_users_sel BOOLEAN;
v_bypassrls BOOLEAN;
BEGIN
SELECT rolbypassrls
FROM pg_roles
WHERE rolname = 'texqtic_service' INTO v_bypassrls;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'memberships'
      AND privilege_type = 'SELECT'
  ) INTO v_has_memberships_sel;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'users'
      AND privilege_type = 'SELECT'
  ) INTO v_has_users_sel;
IF v_bypassrls IS NULL THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service role not found';
END IF;
IF NOT v_bypassrls THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing BYPASSRLS (pre-existing invariant broken)';
END IF;
IF NOT v_has_memberships_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on public.memberships';
END IF;
IF NOT v_has_users_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on public.users';
END IF;
RAISE NOTICE 'VERIFIER PASS: texqtic_service granted SELECT on memberships + users; BYPASSRLS confirmed';
END $$;
COMMIT;