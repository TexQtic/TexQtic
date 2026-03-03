-- ============================================================================
-- G-027: The Morgue — public.morgue_entries table + canonical RLS (Wave 4)
-- TECS ID  : G-027-MORGUE-TABLE-RLS-001
-- Date     : 2026-03-03
-- Doctrine : v1.4
-- Risk     : 🔴 HIGH — schema governance approval explicitly granted via TECS
--
-- Goal:
--   Introduce public.morgue_entries to store finalized / terminal lifecycle
--   resolutions for traceability and post-mortem analysis. This table captures
--   entity resolution snapshots (ORDER, TRADE, ESCROW, CERTIFICATION). It is
--   append-only (immutable) and governed by canonical Wave 3 Tail RLS.
--
-- Scope (this TECS only):
--   - Create table + indexes
--   - Apply FORCE ROW LEVEL SECURITY
--   - Apply canonical Doctrine v1.4 RLS (1 RESTRICTIVE guard + 4 PERMISSIVE)
--   - Grant base privileges
--   - Self-verifier DO block (raises on any invariant violation)
--
-- HARD CONSTRAINTS:
--   - No changes to existing tables
--   - No cross-table schema modification
--   - No feature integration (no service wiring in this TECS)
--   - No bypass_enabled() usage
--   - No {public} policies
--   - UPDATE/DELETE permanently false (immutability)
--
-- BEFORE:
--   morgue_entries — does not exist
--
-- AFTER:
--   morgue_entries — created, FORCE RLS, canonical 5-policy set (1 RESTRICTIVE
--     + PERMISSIVE SELECT/INSERT with tenant+admin arms + UPDATE/DELETE immutability blocks)
--   Indexes: idx_morgue_entries_tenant_created, idx_morgue_entries_entity_type_id
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- STEP 1: Create public.morgue_entries
-- append-only; no UPDATE/DELETE at DDL or RLS level
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.morgue_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  final_state text NOT NULL,
  resolved_by uuid NULL,
  resolution_reason text NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT morgue_entries_pkey PRIMARY KEY (id)
);
-- ─────────────────────────────────────────────────────────────
-- STEP 2: Indexes
-- (tenant_id, created_at DESC) — tenant-scoped time-ordered queries
-- (entity_type, entity_id)    — entity resolution lookups
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_morgue_entries_tenant_created ON public.morgue_entries (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_morgue_entries_entity_type_id ON public.morgue_entries (entity_type, entity_id);
-- ─────────────────────────────────────────────────────────────
-- STEP 3: Enable RLS + FORCE RLS
-- FORCE RLS ensures the table owner cannot bypass policies.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.morgue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morgue_entries FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────
-- STEP 4: Drop any pre-existing policies (idempotency guard)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS morgue_entries_guard ON public.morgue_entries;
DROP POLICY IF EXISTS morgue_entries_select_unified ON public.morgue_entries;
DROP POLICY IF EXISTS morgue_entries_insert_unified ON public.morgue_entries;
DROP POLICY IF EXISTS morgue_entries_update_unified ON public.morgue_entries;
DROP POLICY IF EXISTS morgue_entries_delete_unified ON public.morgue_entries;
-- ─────────────────────────────────────────────────────────────
-- STEP 5: RLS — RESTRICTIVE guard (Doctrine v1.4)
-- Default-deny for all operations. Allows only when:
--   • org context is present (app.require_org_context()), OR
--   • admin realm declared (app.is_admin = 'true')
-- No bypass_enabled() usage per governance constraint.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY morgue_entries_guard ON public.morgue_entries AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
);
-- ─────────────────────────────────────────────────────────────
-- STEP 6: RLS — PERMISSIVE SELECT
-- Tenant can read own rows; admin can read all rows.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY morgue_entries_select_unified ON public.morgue_entries AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- ─────────────────────────────────────────────────────────────
-- STEP 7: RLS — PERMISSIVE INSERT
-- Tenant can insert only for own tenant_id; admin can insert for any tenant.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY morgue_entries_insert_unified ON public.morgue_entries AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- ─────────────────────────────────────────────────────────────
-- STEP 8: RLS — PERMISSIVE UPDATE — BLOCKED (immutability)
-- false ensures no actor (including admin) can UPDATE morgue rows.
-- Morgue entries are permanent terminal records.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY morgue_entries_update_unified ON public.morgue_entries AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (false);
-- ─────────────────────────────────────────────────────────────
-- STEP 9: RLS — PERMISSIVE DELETE — BLOCKED (immutability)
-- false ensures no actor (including admin) can DELETE morgue rows.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY morgue_entries_delete_unified ON public.morgue_entries AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);
-- ─────────────────────────────────────────────────────────────
-- STEP 10: Base grants
-- texqtic_app: SELECT + INSERT (no UPDATE, no DELETE — append-only)
-- app_user:    SELECT only (read-only access for tenant UI)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT ON TABLE public.morgue_entries TO texqtic_app;
GRANT SELECT ON TABLE public.morgue_entries TO app_user;
-- ─────────────────────────────────────────────────────────────
-- STEP 11: Self-verifier DO block
-- Raises exception on ANY invariant violation → triggers ROLLBACK.
-- Checks:
--   - Table exists
--   - FORCE RLS enabled
--   - Exactly 1 RESTRICTIVE guard
--   - Exactly 1 PERMISSIVE SELECT
--   - Exactly 1 PERMISSIVE INSERT
--   - Exactly 1 PERMISSIVE UPDATE (immutability block)
--   - Exactly 1 PERMISSIVE DELETE (immutability block)
--   - No {public} policies
--   - Both required indexes exist
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_table_count INT;
v_force_rls BOOLEAN;
v_guard_count INT;
v_perm_select INT;
v_perm_insert INT;
v_perm_update INT;
v_perm_delete INT;
v_public_count INT;
v_idx_tenant INT;
v_idx_entity INT;
BEGIN -- Assert table exists
SELECT COUNT(*) INTO v_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'morgue_entries';
IF v_table_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — table does not exist';
END IF;
-- Assert FORCE RLS enabled
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'morgue_entries'
  AND relnamespace = (
    SELECT oid
    FROM pg_namespace
    WHERE nspname = 'public'
  );
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — relforcerowsecurity is false';
END IF;
-- Assert exactly 1 RESTRICTIVE guard
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — expected 1 RESTRICTIVE guard, found %',
v_guard_count;
END IF;
-- Assert exactly 1 PERMISSIVE SELECT
SELECT COUNT(*) INTO v_perm_select
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_perm_select <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — expected 1 PERMISSIVE SELECT, found %',
v_perm_select;
END IF;
-- Assert exactly 1 PERMISSIVE INSERT
SELECT COUNT(*) INTO v_perm_insert
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_perm_insert <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — expected 1 PERMISSIVE INSERT, found %',
v_perm_insert;
END IF;
-- Assert exactly 1 PERMISSIVE UPDATE (immutability block)
SELECT COUNT(*) INTO v_perm_update
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_perm_update <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — expected 1 PERMISSIVE UPDATE (immutability block), found %',
v_perm_update;
END IF;
-- Assert exactly 1 PERMISSIVE DELETE (immutability block)
SELECT COUNT(*) INTO v_perm_delete
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_perm_delete <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — expected 1 PERMISSIVE DELETE (immutability block), found %',
v_perm_delete;
END IF;
-- Assert no {public} role policies
SELECT COUNT(*) INTO v_public_count
FROM pg_policies
WHERE tablename = 'morgue_entries'
  AND roles::text = '{public}';
IF v_public_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — found % {public} policies, expected 0',
v_public_count;
END IF;
-- Assert (tenant_id, created_at DESC) index exists
SELECT COUNT(*) INTO v_idx_tenant
FROM pg_indexes
WHERE tablename = 'morgue_entries'
  AND indexname = 'idx_morgue_entries_tenant_created';
IF v_idx_tenant <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — missing index idx_morgue_entries_tenant_created';
END IF;
-- Assert (entity_type, entity_id) index exists
SELECT COUNT(*) INTO v_idx_entity
FROM pg_indexes
WHERE tablename = 'morgue_entries'
  AND indexname = 'idx_morgue_entries_entity_type_id';
IF v_idx_entity <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: morgue_entries — missing index idx_morgue_entries_entity_type_id';
END IF;
RAISE NOTICE 'VERIFIER PASS: morgue_entries created (table + 2 indexes + FORCE RLS=t + 1 RESTRICTIVE guard + 4 PERMISSIVE policies [SELECT/INSERT tenant+admin arms + UPDATE/DELETE immutability blocks=false] + 0 {public} policies)';
END;
$$;
COMMIT;
-- ============================================================================
-- CROSS-TENANT ISOLATION PROOF (run manually after psql apply):
-- SIM1 — tenant context, own morgue rows visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.actor_id',   '<user_uuid>',    true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.morgue_entries; -- Expected: own-tenant rows
--   ROLLBACK;
-- SIM2 — tenant context, other tenant rows = 0:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.morgue_entries
--    WHERE tenant_id = '<tenantB_uuid>'; -- Expected: 0
--   ROLLBACK;
-- SIM3 — UPDATE must be blocked for all actors (immutability):
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.is_admin', 'true', true);
--   UPDATE public.morgue_entries SET final_state='HACKED' WHERE true;
--   -- Expected: 0 rows updated (PERMISSIVE UPDATE USING(false))
--   ROLLBACK;
-- SIM4 — DELETE must be blocked (immutability):
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.is_admin', 'true', true);
--   DELETE FROM public.morgue_entries WHERE true;
--   -- Expected: 0 rows deleted (PERMISSIVE DELETE USING(false))
--   ROLLBACK;
-- ============================================================================
-- APPLY:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f server/prisma/migrations/20260315000006_g027_morgue_table_rls_001/migration.sql
--   pnpm -C server exec prisma migrate resolve --applied 20260315000006_g027_morgue_table_rls_001
-- ============================================================================