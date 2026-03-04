-- ============================================================================
-- Migration: 20260315000008_ops_rls_superadmin_impersonation_sessions
-- TECS ID:   OPS-RLS-SUPERADMIN-001-IMPERSONATION-001
-- Sync ref:  GOVERNANCE-SYNC-074
-- Doctrine:  v1.4 — 1 table, BEGIN/DROP/CREATE/VERIFIER/COMMIT
-- Tables:    public.impersonation_sessions (write paths only)
-- Author:    Copilot — safe-write mode
-- Date:      2026-03-15
-- ─────────────────────────────────────────────────────────────────────────────
-- SUMMARY
-- Narrows INSERT / UPDATE / DELETE policies on impersonation_sessions to require
-- BOTH app.is_admin='true' AND app.is_superadmin='true'.  GUARD and SELECT are
-- unchanged — SUPPORT/ANALYST roles that only need to *read* session status are
-- unaffected.  This migration is a pure RLS policy swap (no DDL).
--
-- PREREQUISITE: service commit `1f211d6` (startImpersonation + stopImpersonation
-- migrated to withSuperAdminContext which sets both GUCs tx-local).
--
-- ROLLBACK SQL (emergency — paste verbatim after ROLLBACK on this migration):
--   DROP POLICY IF EXISTS impersonation_sessions_insert_unified ON public.impersonation_sessions;
--   DROP POLICY IF EXISTS impersonation_sessions_update_unified ON public.impersonation_sessions;
--   DROP POLICY IF EXISTS impersonation_sessions_delete_unified ON public.impersonation_sessions;
--   CREATE POLICY impersonation_sessions_insert_unified ON public.impersonation_sessions
--     AS PERMISSIVE FOR INSERT TO texqtic_app WITH CHECK (
--       (app.require_admin_context() AND admin_id = app.current_actor_id())
--       OR current_setting('app.is_admin'::text, true) = 'true'::text
--     );
--   CREATE POLICY impersonation_sessions_update_unified ON public.impersonation_sessions
--     AS PERMISSIVE FOR UPDATE TO texqtic_app
--     USING ((app.require_admin_context() AND admin_id = app.current_actor_id())
--       OR current_setting('app.is_admin'::text, true) = 'true'::text)
--     WITH CHECK ((app.require_admin_context() AND admin_id = app.current_actor_id())
--       OR current_setting('app.is_admin'::text, true) = 'true'::text);
--   CREATE POLICY impersonation_sessions_delete_unified ON public.impersonation_sessions
--     AS PERMISSIVE FOR DELETE TO texqtic_app USING (
--       (app.require_admin_context() AND admin_id = app.current_actor_id())
--       OR current_setting('app.is_admin'::text, true) = 'true'::text
--     );
-- See SUPERADMIN-RLS-PLAN.md Section C.1 for full original predicate reference.
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Pre-flight guard
-- Abort if this migration has somehow been applied already (idempotency check).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'impersonation_sessions'
    AND policyname = 'impersonation_sessions_insert_unified'
) THEN RAISE EXCEPTION '20260315000008 PRE-FLIGHT BLOCKED: policy impersonation_sessions_insert_unified not found. Baseline migration 20260315000004 may not have been applied, or policies were already dropped. Aborting.';
END IF;
-- Confirm superadmin narrowing has NOT already been applied.
-- If is_superadmin already appears in the INSERT predicate, this migration was
-- applied before and should not run again.
IF EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'impersonation_sessions'
    AND policyname = 'impersonation_sessions_insert_unified'
    AND qual LIKE '%is_superadmin%'
) THEN RAISE EXCEPTION '20260315000008 PRE-FLIGHT BLOCKED: is_superadmin already present in impersonation_sessions_insert_unified. Migration may have been applied already. Check _prisma_migrations ledger and investigate.';
END IF;
RAISE NOTICE '20260315000008 pre-flight OK: impersonation_sessions policies present, superadmin narrowing not yet applied. Proceeding.';
END;
$$;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Enable + force RLS (idempotent — safe to repeat)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Drop all five existing policies
-- Dropping under BEGIN ensures rollback if any subsequent creation fails.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS impersonation_sessions_guard ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_select_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_insert_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_update_unified ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_delete_unified ON public.impersonation_sessions;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Recreate all five policies
-- GUARD:  UNCHANGED — any admin (is_admin OR require_admin_context OR bypass)
--         passes the guard; narrowing is on PERMISSIVE write commands only.
-- SELECT: UNCHANGED — SUPPORT/ANALYST can read session status (audit use case).
-- INSERT: NARROWED — requires is_superadmin='true' in BOTH arms.
-- UPDATE: NARROWED — requires is_superadmin='true' in BOTH arms.
-- DELETE: NARROWED — requires is_superadmin='true' in BOTH arms.
-- ─────────────────────────────────────────────────────────────────────────────
-- GUARD (RESTRICTIVE FOR ALL) — UNCHANGED from 20260315000004
CREATE POLICY impersonation_sessions_guard ON public.impersonation_sessions AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_admin_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
-- SELECT (PERMISSIVE) — UNCHANGED from 20260315000004
CREATE POLICY impersonation_sessions_select_unified ON public.impersonation_sessions AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- INSERT (PERMISSIVE) — NARROWED: both arms now require is_superadmin='true'
-- Arm 1 (JWT): admin context present + actor_id match + superadmin GUC set.
-- Arm 2 (GUC-only, e.g. seed/withSuperAdminContext): both is_admin + is_superadmin set.
CREATE POLICY impersonation_sessions_insert_unified ON public.impersonation_sessions AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
    OR (
      current_setting('app.is_admin'::text, true) = 'true'::text
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
  );
-- UPDATE (PERMISSIVE, USING + WITH CHECK) — NARROWED: both arms require is_superadmin
CREATE POLICY impersonation_sessions_update_unified ON public.impersonation_sessions AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
    OR (
      current_setting('app.is_admin'::text, true) = 'true'::text
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
  ) WITH CHECK (
    (
      app.require_admin_context()
      AND admin_id = app.current_actor_id()
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
    OR (
      current_setting('app.is_admin'::text, true) = 'true'::text
      AND current_setting('app.is_superadmin'::text, true) = 'true'::text
    )
  );
-- DELETE (PERMISSIVE) — NARROWED: both arms require is_superadmin
CREATE POLICY impersonation_sessions_delete_unified ON public.impersonation_sessions AS PERMISSIVE FOR DELETE TO texqtic_app USING (
  (
    app.require_admin_context()
    AND admin_id = app.current_actor_id()
    AND current_setting('app.is_superadmin'::text, true) = 'true'::text
  )
  OR (
    current_setting('app.is_admin'::text, true) = 'true'::text
    AND current_setting('app.is_superadmin'::text, true) = 'true'::text
  )
);
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Self-verifier DO block
-- Raises EXCEPTION on any invariant violation → triggers ROLLBACK.
-- Checks:
--   1. FORCE RLS enabled
--   2. Exactly 1 RESTRICTIVE guard FOR ALL
--   3. Exactly 1 PERMISSIVE per command (SELECT / INSERT / UPDATE / DELETE)
--   4. Zero {public} policies
--   5. Guard predicate has: is_admin arm + require_admin_context arm
--   6. SELECT predicate has: is_admin arm (unchanged access check)
--   7. INSERT predicate has: is_superadmin arm (narrowing confirmed)
--   8. UPDATE predicate has: is_superadmin arm (narrowing confirmed)
--   9. DELETE predicate has: is_superadmin arm (narrowing confirmed)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_force_rls BOOLEAN;
v_guard_count INT;
v_perm_select INT;
v_perm_insert INT;
v_perm_update INT;
v_perm_delete INT;
v_public_count INT;
v_guard_qual TEXT;
v_sel_qual TEXT;
v_ins_qual TEXT;
v_upd_using_qual TEXT;
v_del_qual TEXT;
BEGIN -- 1. FORCE RLS
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'impersonation_sessions';
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: impersonation_sessions — relforcerowsecurity is false';
END IF;
-- 2. Exactly 1 RESTRICTIVE guard
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: impersonation_sessions — expected 1 RESTRICTIVE guard, found %',
v_guard_count;
END IF;
-- 3. Guard predicate: must contain is_admin + require_admin_context
SELECT qual INTO v_guard_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'RESTRICTIVE';
IF v_guard_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: guard missing is_admin arm';
END IF;
IF v_guard_qual NOT LIKE '%require_admin_context%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: guard missing require_admin_context arm';
END IF;
-- 4. Exactly 1 PERMISSIVE per command
SELECT COUNT(*) INTO v_perm_select
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_perm_select <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: expected 1 PERMISSIVE SELECT, found %',
v_perm_select;
END IF;
SELECT COUNT(*) INTO v_perm_insert
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_perm_insert <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: expected 1 PERMISSIVE INSERT, found %',
v_perm_insert;
END IF;
SELECT COUNT(*) INTO v_perm_update
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_perm_update <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: expected 1 PERMISSIVE UPDATE, found %',
v_perm_update;
END IF;
SELECT COUNT(*) INTO v_perm_delete
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_perm_delete <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: expected 1 PERMISSIVE DELETE, found %',
v_perm_delete;
END IF;
-- 5. SELECT must still contain is_admin (read path unchanged)
SELECT qual INTO v_sel_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_sel_qual NOT LIKE '%is_admin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: SELECT policy missing is_admin arm';
END IF;
-- 6. INSERT must contain is_superadmin (narrowing verified)
SELECT with_check INTO v_ins_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_ins_qual NOT LIKE '%is_superadmin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: INSERT policy WITH CHECK missing is_superadmin arm — narrowing NOT applied';
END IF;
-- 7. UPDATE must contain is_superadmin in USING
SELECT qual INTO v_upd_using_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_upd_using_qual NOT LIKE '%is_superadmin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: UPDATE policy USING missing is_superadmin arm — narrowing NOT applied';
END IF;
-- 8. DELETE must contain is_superadmin
SELECT qual INTO v_del_qual
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_del_qual NOT LIKE '%is_superadmin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: DELETE policy USING missing is_superadmin arm — narrowing NOT applied';
END IF;
-- 9. No {public} policies (admin-only table — any public policy is a security violation)
SELECT COUNT(*) INTO v_public_count
FROM pg_policies
WHERE tablename = 'impersonation_sessions'
  AND roles::text = '{public}';
IF v_public_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000008]: found % {public} policies on impersonation_sessions — admin-only security violation',
v_public_count;
END IF;
RAISE NOTICE 'VERIFIER PASS [20260315000008]: impersonation_sessions — FORCE RLS=%, 1 RESTRICTIVE guard FOR ALL (require_admin_context + is_admin), 4 PERMISSIVE (SELECT: is_admin unchanged | INSERT/UPDATE/DELETE: is_superadmin narrowing CONFIRMED), 0 {public} policies.',
v_force_rls;
END;
$$;
COMMIT;
-- ============================================================================
-- APPLY COMMAND (run AFTER reviewing this file; secrets redacted in chat):
--   $u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
--   psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" `
--        "--file=server/prisma/migrations/20260315000008_ops_rls_superadmin_impersonation_sessions/migration.sql"
--
-- LEDGER SYNC (run AFTER successful psql apply):
--   pnpm -C server exec prisma migrate resolve --applied 20260315000008_ops_rls_superadmin_impersonation_sessions
--
-- BLAST RADIUS VERIFICATION (run after apply):
--   SIM1 — superadmin context → INSERT allowed:
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.is_admin',     'true', true);
--     SELECT set_config('app.is_superadmin','true', true);
--     SELECT set_config('app.bypass_rls',   'off',  true);
--     INSERT INTO public.impersonation_sessions (...) VALUES (...); -- expect success
--     ROLLBACK;
--
--   SIM2 — regular admin (no superadmin) → INSERT BLOCKED:
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.is_admin',     'true',  true);
--     SELECT set_config('app.is_superadmin','false', true);
--     SELECT set_config('app.bypass_rls',   'off',   true);
--     INSERT INTO public.impersonation_sessions (...) VALUES (...); -- expect 0 rows / NEW WITH CHECK violation
--     ROLLBACK;
--
--   SIM3 — tenant JWT → blocked at guard:
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.realm',      'tenant', true);
--     SELECT set_config('app.bypass_rls', 'off',    true);
--     SELECT count(*) FROM public.impersonation_sessions; -- expect 0
--     ROLLBACK;
-- ============================================================================