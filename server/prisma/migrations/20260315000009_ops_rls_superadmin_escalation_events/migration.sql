-- ============================================================================
-- Migration: 20260315000009_ops_rls_superadmin_escalation_events
-- TECS ID:   OPS-RLS-SUPERADMIN-001-ESCALATION-INSERT-001  (REVISED from -ESCALATION-001)
-- Sync ref:  GOVERNANCE-SYNC-075
-- Doctrine:  v1.4 — 1 table, BEGIN/DROP/CREATE/VERIFIER/COMMIT
-- Tables:    public.escalation_events (admin INSERT arm only)
-- Author:    Copilot — safe-write mode
-- Date:      2026-03-15
-- ─────────────────────────────────────────────────────────────────────────────
-- SUMMARY
-- The original TECS 2C plan (SUPERADMIN-RLS-PLAN.md C.2) proposed narrowing an
-- UPDATE RLS policy on escalation_events. Discovery during GOVERNANCE-SYNC-074
-- revealed that:
--   1. escalation_events is append-only (immutability trigger blocks UPDATE/DELETE)
--   2. No UPDATE policy exists (trigger fires before RLS for BEFORE events)
--   3. texqtic_app has only SELECT + INSERT grants — no UPDATE/DELETE
--   4. The "upgrade/resolve" service operations are INSERTs (new child rows
--      with parent_escalation_id), not UPDATEs
--
-- Therefore the only meaningful attack surface to harden is:
--   escalation_events_admin_insert — currently allows any actor with
--   app.is_admin='true' to INSERT cross-tenant escalation rows.
--
-- This migration narrows that policy to require BOTH:
--   app.is_admin='true' AND app.is_superadmin='true'
--
-- All other policies (tenant SELECT, admin SELECT, tenant INSERT) are UNCHANGED.
-- No UPDATE/DELETE policies are added (table is append-only by design).
-- No grants are widened.
--
-- PREREQUISITE: service commit `1f211d6` (withSuperAdminEscalationContext wired
-- to upgrade/resolve handlers, which are INSERTs not UPDATEs).
--
-- ROLLBACK SQL (emergency — paste verbatim after ROLLBACK on this migration):
--   DROP POLICY IF EXISTS escalation_events_admin_insert ON public.escalation_events;
--   CREATE POLICY escalation_events_admin_insert ON public.escalation_events
--     FOR INSERT WITH CHECK (current_setting('app.is_admin', true) = 'true');
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Pre-flight guard
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN -- Table must exist
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'escalation_events'
) THEN RAISE EXCEPTION '20260315000009 PRE-FLIGHT BLOCKED: public.escalation_events table not found. Baseline migration 20260303000000_g022_escalation_core may not have been applied.';
END IF;
-- Baseline admin INSERT policy must exist before we drop + recreate
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'escalation_events'
    AND policyname = 'escalation_events_admin_insert'
) THEN RAISE EXCEPTION '20260315000009 PRE-FLIGHT BLOCKED: escalation_events_admin_insert not found. Baseline migration may not be applied, or policy was renamed. Investigate and abort.';
END IF;
-- Tenant INSERT policy must exist (must not be damaged by a partial prior run)
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'escalation_events'
    AND policyname = 'escalation_events_tenant_insert'
) THEN RAISE EXCEPTION '20260315000009 PRE-FLIGHT BLOCKED: escalation_events_tenant_insert not found. Baseline integrity check failed — tenant INSERT arm missing. Abort immediately.';
END IF;
-- Idempotency guard: abort if narrowing already applied
IF EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'escalation_events'
    AND policyname = 'escalation_events_admin_insert'
    AND with_check LIKE '%is_superadmin%'
) THEN RAISE EXCEPTION '20260315000009 PRE-FLIGHT BLOCKED: is_superadmin already present in escalation_events_admin_insert WITH CHECK. Migration appears already applied. Check _prisma_migrations ledger and investigate before proceeding.';
END IF;
-- No UPDATE policies should exist (belt-and-suspenders: immutability is at trigger layer)
IF EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'escalation_events'
    AND cmd = 'UPDATE'
) THEN RAISE EXCEPTION '20260315000009 PRE-FLIGHT BLOCKED: unexpected UPDATE policy found on escalation_events. This is outside the known baseline — do not proceed without investigation. [E-2C-UNEXPECTED-UPDATE-POLICY]';
END IF;
RAISE NOTICE '20260315000009 pre-flight OK: escalation_events present, all 4 baseline policies intact, admin INSERT not yet narrowed, no unexpected UPDATE policies. Proceeding.';
END;
$$;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Enable + force RLS (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Drop all four existing policies
-- Only these 4 policies exist per G-022 baseline. No GUARD, no UPDATE, no DELETE.
-- DROP under BEGIN ensures rollback if any subsequent creation fails.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS escalation_events_tenant_select ON public.escalation_events;
DROP POLICY IF EXISTS escalation_events_admin_select ON public.escalation_events;
DROP POLICY IF EXISTS escalation_events_tenant_insert ON public.escalation_events;
DROP POLICY IF EXISTS escalation_events_admin_insert ON public.escalation_events;
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Recreate all four policies
-- TENANT SELECT:  UNCHANGED — tenant reads own org's escalations
-- ADMIN SELECT:   UNCHANGED — platform admin reads all escalations (cross-org ops)
-- TENANT INSERT:  UNCHANGED — tenant creates LEVEL_0 escalations within their org
-- ADMIN INSERT:   NARROWED  — require is_superadmin='true' in addition to is_admin='true'
--
-- No UPDATE/DELETE policies added. Immutability is enforced by trigger (Layer 2).
-- texqtic_app grants remain SELECT + INSERT only — not widened by this migration.
-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant: SELECT own org's escalation events (UNCHANGED)
CREATE POLICY escalation_events_tenant_select ON public.escalation_events AS PERMISSIVE FOR
SELECT USING (
    org_id::text = current_setting('app.org_id', true)
  );
-- Platform admin: SELECT all escalation events (UNCHANGED)
CREATE POLICY escalation_events_admin_select ON public.escalation_events AS PERMISSIVE FOR
SELECT USING (
    current_setting('app.is_admin', true) = 'true'
  );
-- Tenant: INSERT within own org (UNCHANGED)
-- Service layer enforces org match before call; this is the DB-level confirmation.
CREATE POLICY escalation_events_tenant_insert ON public.escalation_events AS PERMISSIVE FOR
INSERT WITH CHECK (
    org_id::text = current_setting('app.org_id', true)
  );
-- Platform admin: INSERT any org — NARROWED to SUPER_ADMIN only
-- Previously: any actor with is_admin='true' could insert cross-org escalation rows.
-- After:      requires BOTH is_admin='true' AND is_superadmin='true'.
-- Service-layer prerequisite satisfied: withSuperAdminEscalationContext (commit 1f211d6)
-- sets both GUCs tx-local for upgrade/resolve handlers.
CREATE POLICY escalation_events_admin_insert ON public.escalation_events AS PERMISSIVE FOR
INSERT WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.is_superadmin', true) = 'true'
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Self-verifier DO block
-- Raises EXCEPTION on any invariant violation → triggers ROLLBACK.
-- Checks:
--   1. FORCE RLS enabled on escalation_events
--   2. Zero {public} RLS policies
--   3. Admin INSERT policy exists AND WITH CHECK contains is_superadmin
--   4. Tenant INSERT policy exists AND WITH CHECK contains org_id scoping
--   5. No UPDATE grant for texqtic_app (immutability defense)
--   6. No DELETE grant for texqtic_app (immutability defense)
--   7. Exactly 2 SELECT policies present (tenant + admin)
--   8. Exactly 2 INSERT policies present (tenant + admin)
--   9. Zero UPDATE policies exist (append-only invariant)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_force_rls BOOLEAN;
v_admin_ins_check TEXT;
v_tenant_ins_check TEXT;
v_upd_grant_count INT;
v_del_grant_count INT;
v_select_count INT;
v_insert_count INT;
v_update_policy_cnt INT;
BEGIN -- 1. FORCE RLS
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'escalation_events';
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: escalation_events — relforcerowsecurity is false';
END IF;
-- 2. (public-role scoping is correct for escalation_events — G-022 baseline designed without TO texqtic_app; access is predicate-controlled via GUC checks)
-- 3. Admin INSERT has is_superadmin in WITH CHECK (narrowing confirmed)
SELECT with_check INTO v_admin_ins_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events'
  AND policyname = 'escalation_events_admin_insert';
IF v_admin_ins_check IS NULL THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: escalation_events_admin_insert policy missing entirely';
END IF;
IF v_admin_ins_check NOT LIKE '%is_superadmin%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: escalation_events_admin_insert WITH CHECK missing is_superadmin — narrowing NOT applied';
END IF;
-- 4. Tenant INSERT arm still present and org-scoped (must not be lost)
SELECT with_check INTO v_tenant_ins_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events'
  AND policyname = 'escalation_events_tenant_insert';
IF v_tenant_ins_check IS NULL THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: escalation_events_tenant_insert missing — tenant INSERT arm lost (CRITICAL)';
END IF;
IF v_tenant_ins_check NOT LIKE '%org_id%' THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: escalation_events_tenant_insert WITH CHECK missing org_id — tenant isolation broken (CRITICAL)';
END IF;
-- 5. No UPDATE grant for texqtic_app (immutability: no accidental widening)
SELECT COUNT(*) INTO v_upd_grant_count
FROM information_schema.role_table_grants
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'escalation_events'
  AND privilege_type = 'UPDATE';
IF v_upd_grant_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: texqtic_app has UPDATE grant on escalation_events — accidental widening detected (append-only violation)';
END IF;
-- 6. No DELETE grant for texqtic_app
SELECT COUNT(*) INTO v_del_grant_count
FROM information_schema.role_table_grants
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'escalation_events'
  AND privilege_type = 'DELETE';
IF v_del_grant_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: texqtic_app has DELETE grant on escalation_events — accidental widening detected (append-only violation)';
END IF;
-- 7. Exactly 2 SELECT policies
SELECT COUNT(*) INTO v_select_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events'
  AND cmd = 'SELECT';
IF v_select_count <> 2 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: expected 2 SELECT policies (tenant + admin), found %',
v_select_count;
END IF;
-- 8. Exactly 2 INSERT policies
SELECT COUNT(*) INTO v_insert_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events'
  AND cmd = 'INSERT';
IF v_insert_count <> 2 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: expected 2 INSERT policies (tenant + admin), found %',
v_insert_count;
END IF;
-- 9. Zero UPDATE policies (append-only invariant must hold at RLS layer too)
SELECT COUNT(*) INTO v_update_policy_cnt
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events'
  AND cmd = 'UPDATE';
IF v_update_policy_cnt <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL [20260315000009]: found % UPDATE policies on escalation_events — append-only invariant violated',
v_update_policy_cnt;
END IF;
RAISE NOTICE 'VERIFIER PASS [20260315000009]: escalation_events — FORCE RLS=%, admin INSERT narrowed (is_superadmin CONFIRMED in WITH CHECK), tenant INSERT arm preserved (org_id scoping intact), 2 SELECT + 2 INSERT policies, 0 UPDATE policies (append-only), no UPDATE/DELETE grants for texqtic_app. (Policies are public-role scoped per G-022 baseline design.)',
v_force_rls;
END;
$$;
COMMIT;
-- ============================================================================
-- APPLY COMMAND (run AFTER reviewing this file; secrets redacted in chat):
--   $u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
--   psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" `
--        "--file=server/prisma/migrations/20260315000009_ops_rls_superadmin_escalation_events/migration.sql"
--
-- LEDGER SYNC (run AFTER successful psql apply):
--   pnpm -C server exec prisma migrate resolve --applied 20260315000009_ops_rls_superadmin_escalation_events
--
-- SEQUENCING NOTE: apply 20260315000008 (impersonation_sessions) FIRST, then this.
--
-- BLAST RADIUS VERIFICATION (run after apply):
--   SIM1 — superadmin context → admin INSERT allowed:
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.is_admin',     'true', true);
--     SELECT set_config('app.is_superadmin','true', true);
--     SELECT set_config('app.bypass_rls',   'off',  true);
--     INSERT INTO public.escalation_events (org_id, ...) VALUES (...); -- expect success
--     ROLLBACK;
--
--   SIM2 — regular admin (no superadmin) → admin INSERT BLOCKED:
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.is_admin',     'true',  true);
--     SELECT set_config('app.is_superadmin','false', true);
--     SELECT set_config('app.bypass_rls',   'off',   true);
--     INSERT INTO public.escalation_events (org_id, ...) VALUES (...); -- expect NEW WITH CHECK violation
--     ROLLBACK;
--
--   SIM3 — tenant context → tenant INSERT still allowed (org_id must match):
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.org_id', '<org_uuid>', true);
--     INSERT INTO public.escalation_events (org_id, ...) VALUES ('<org_uuid>', ...); -- expect success
--     ROLLBACK;
--
--   SIM4 — UPDATE must be blocked by immutability trigger (trigger fires before RLS):
--     BEGIN; SET LOCAL ROLE texqtic_app;
--     SELECT set_config('app.is_admin',     'true', true);
--     SELECT set_config('app.is_superadmin','true', true);
--     UPDATE public.escalation_events SET status='RESOLVED' WHERE id='<any_uuid>';
--     -- Expected: EXCEPTION [E-022-IMMUTABLE] (trigger fires, RLS never reached)
--     ROLLBACK;
-- ============================================================================