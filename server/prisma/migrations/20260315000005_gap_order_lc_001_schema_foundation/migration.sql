-- ============================================================================
-- GAP-ORDER-LC-001: ORDER Lifecycle Schema Foundation
-- TECS ID  : GAP-ORDER-LC-001-SCHEMA-FOUNDATION-001
-- Date     : 2026-03-03
-- Doctrine : v1.4
-- Risk     : 🔴 HIGH — schema governance approval explicitly granted via TECS B1
--
-- Goal:
--   1. Create public.order_lifecycle_logs (append-only lifecycle audit log for
--      ORDER entity type; companion to trade_lifecycle_logs / escrow_lifecycle_logs).
--   2. Extend lifecycle_states.entity_type CHECK constraint to include 'ORDER'
--      (DROP old constraint + ADD new — reversible, unlike ALTER TYPE ADD VALUE).
--   3. Extend allowed_transitions.entity_type CHECK constraint to include 'ORDER'
--      (same DROP + recreate approach).
--   4. Seed ORDER lifecycle states into lifecycle_states:
--      PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED.
--   5. Apply canonical Wave 3 Tail RLS to order_lifecycle_logs (1 RESTRICTIVE
--      guard + 4 PERMISSIVE: SELECT/INSERT with tenant+admin arms, UPDATE/DELETE
--      permanently blocked for immutability).
--
-- STOP CONDITION NOTES (pre-execution decisions):
--   orders.status is a USER-DEFINED enum (order_status: PAYMENT_PENDING, PLACED,
--   CANCELLED). Extending this enum requires ALTER TYPE ADD VALUE — IRREVERSIBLE.
--   B1 DECISION: DO NOT touch the orders.status enum. order_lifecycle_logs uses
--   TEXT columns (from_state, to_state) independent of the enum. Enum extension
--   (+ state key alignment) is deferred to B3 (SM wiring TECS).
--
-- tenant_id column (additional to TECS minimum spec, JUSTIFIED):
--   Schema spec columns do not include tenant_id. However, RLS for this table
--   requires tenant isolation. Without tenant_id, isolation requires an EXISTS
--   subquery into orders — a design decision beyond canonical arms (TECS STOP
--   condition). Adding tenant_id as a denormalised column (populated from the
--   parent order.tenant_id at insert time) enables the canonical
--   `tenant_id = app.current_org_id()` arm with no subquery. This is the correct
--   approach per Doctrine v1.4.
--
-- BEFORE:
--   order_lifecycle_logs  — does not exist
--   lifecycle_states.entity_type CHECK — ARRAY['TRADE','ESCROW','CERTIFICATION']
--   allowed_transitions.entity_type CHECK — ARRAY['TRADE','ESCROW','CERTIFICATION']
--   lifecycle_states ORDER rows — 0
--
-- AFTER:
--   order_lifecycle_logs  — created, FORCE RLS, canonical 5-policy set
--   lifecycle_states.entity_type CHECK — ARRAY['TRADE','ESCROW','CERTIFICATION','ORDER']
--   allowed_transitions.entity_type CHECK — ARRAY['TRADE','ESCROW','CERTIFICATION','ORDER']
--   lifecycle_states ORDER rows: PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED
-- ============================================================================
BEGIN;
-- ─────────────────────────────────────────────────────────────
-- STEP 1: Extend lifecycle_states.entity_type CHECK to include 'ORDER'
-- Strategy: DROP named constraint + ADD new constraint with extended array.
-- Reversible (unlike enum ADD VALUE).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.lifecycle_states DROP CONSTRAINT IF EXISTS lifecycle_states_entity_type_check;
ALTER TABLE public.lifecycle_states
ADD CONSTRAINT lifecycle_states_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
    'TRADE'::text,
    'ESCROW'::text,
    'CERTIFICATION'::text,
    'ORDER'::text
  ]
    )
  );
-- ─────────────────────────────────────────────────────────────
-- STEP 2: Extend allowed_transitions.entity_type CHECK to include 'ORDER'
-- Same DROP + recreate approach.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.allowed_transitions DROP CONSTRAINT IF EXISTS allowed_transitions_entity_type_check;
ALTER TABLE public.allowed_transitions
ADD CONSTRAINT allowed_transitions_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY [
    'TRADE'::text,
    'ESCROW'::text,
    'CERTIFICATION'::text,
    'ORDER'::text
  ]
    )
  );
-- ─────────────────────────────────────────────────────────────
-- STEP 3: Seed ORDER lifecycle states into lifecycle_states
-- States: PAYMENT_PENDING (initial), CONFIRMED (in-progress),
--         FULFILLED (terminal + irreversible), CANCELLED (terminal + irreversible)
-- state_key enforced UPPERCASE per lifecycle_states_state_key_uppercase CHECK.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.lifecycle_states (
    entity_type,
    state_key,
    is_terminal,
    is_irreversible,
    severity_level,
    requires_maker_checker,
    description
  )
VALUES (
    'ORDER',
    'PAYMENT_PENDING',
    false,
    false,
    0,
    false,
    'Order created; awaiting payment confirmation.'
  ),
  (
    'ORDER',
    'CONFIRMED',
    false,
    false,
    0,
    false,
    'Payment received; order confirmed and in fulfilment.'
  ),
  (
    'ORDER',
    'FULFILLED',
    true,
    true,
    0,
    false,
    'Order fully fulfilled and delivered. Terminal state.'
  ),
  (
    'ORDER',
    'CANCELLED',
    true,
    true,
    1,
    false,
    'Order cancelled. Terminal state. Irreversible.'
  ) ON CONFLICT DO NOTHING;
-- ─────────────────────────────────────────────────────────────
-- STEP 4: Create public.order_lifecycle_logs
-- Append-only lifecycle audit log for ORDER transitions.
-- Mirrors the schema pattern of trade_lifecycle_logs /
-- escrow_lifecycle_logs but uses FK → orders(id) directly.
-- tenant_id: denormalised for canonical RLS (see header note).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.order_lifecycle_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  from_state text,
  to_state text NOT NULL,
  actor_id uuid,
  realm text NOT NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_lifecycle_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_lifecycle_logs_order_fk FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE CASCADE,
  CONSTRAINT order_lifecycle_logs_to_state_nonempty CHECK (to_state <> '')
);
-- ─────────────────────────────────────────────────────────────
-- STEP 5: Indexes on order_lifecycle_logs
-- (order_id, created_at DESC): primary lookup — all events for an order
-- (tenant_id, created_at DESC): RLS-aligned; tenant activity window
-- (to_state, created_at DESC): ops queries — find all orders in a state window
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_order_lifecycle_logs_order_created ON public.order_lifecycle_logs (order_id, created_at DESC);
CREATE INDEX idx_order_lifecycle_logs_tenant_created ON public.order_lifecycle_logs (tenant_id, created_at DESC);
CREATE INDEX idx_order_lifecycle_logs_to_state_created ON public.order_lifecycle_logs (to_state, created_at DESC);
-- ─────────────────────────────────────────────────────────────
-- STEP 6: RLS on order_lifecycle_logs — ENABLE + FORCE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.order_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lifecycle_logs FORCE ROW LEVEL SECURITY;
-- ─────────────────────────────────────────────────────────────
-- STEP 7: Drop any pre-existing policies (idempotent safety net)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS order_lifecycle_logs_guard ON public.order_lifecycle_logs;
DROP POLICY IF EXISTS order_lifecycle_logs_select_unified ON public.order_lifecycle_logs;
DROP POLICY IF EXISTS order_lifecycle_logs_insert_unified ON public.order_lifecycle_logs;
DROP POLICY IF EXISTS order_lifecycle_logs_update_unified ON public.order_lifecycle_logs;
DROP POLICY IF EXISTS order_lifecycle_logs_delete_unified ON public.order_lifecycle_logs;
-- ─────────────────────────────────────────────────────────────
-- STEP 8: RLS policies — canonical Wave 3 Tail pattern
--
-- Tenant arm  : require_org_context() AND tenant_id = app.current_org_id()
-- Admin arm   : current_setting('app.is_admin', true) = 'true'
-- Immutability: UPDATE + DELETE permanently blocked (PERMISSIVE false)
--   → Even bypass / admin cannot update or delete log entries.
-- ─────────────────────────────────────────────────────────────
-- RESTRICTIVE guard (FOR ALL TO texqtic_app)
-- Passes: tenant context, platform admin, test/seed bypass
CREATE POLICY order_lifecycle_logs_guard ON public.order_lifecycle_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR current_setting('app.is_admin'::text, true) = 'true'::text
  OR app.bypass_enabled()
);
-- PERMISSIVE SELECT — tenant sees own-tenant rows; admin sees all
CREATE POLICY order_lifecycle_logs_select_unified ON public.order_lifecycle_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- PERMISSIVE INSERT — tenant can only insert rows for own tenant
CREATE POLICY order_lifecycle_logs_insert_unified ON public.order_lifecycle_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR current_setting('app.is_admin'::text, true) = 'true'::text
  );
-- PERMISSIVE UPDATE — BLOCKED (immutability: log entries are append-only)
-- false ensures no actor (including admin/bypass) can UPDATE log rows.
CREATE POLICY order_lifecycle_logs_update_unified ON public.order_lifecycle_logs AS PERMISSIVE FOR
UPDATE TO texqtic_app USING (false);
-- PERMISSIVE DELETE — BLOCKED (immutability: log entries are permanent)
-- false ensures no actor (including admin/bypass) can DELETE log rows.
CREATE POLICY order_lifecycle_logs_delete_unified ON public.order_lifecycle_logs AS PERMISSIVE FOR DELETE TO texqtic_app USING (false);
-- ─────────────────────────────────────────────────────────────
-- STEP 9: Self-verifier DO block
-- Raises on any invariant violation → triggers ROLLBACK.
-- Checks:
--   - Table exists
--   - FK to orders(id) exists
--   - All 3 indexes exist
--   - lifecycle_states CHECK includes 'ORDER'
--   - allowed_transitions CHECK includes 'ORDER'
--   - FORCE RLS = true
--   - Exactly 1 RESTRICTIVE guard (FOR ALL)
--   - Exactly 1 PERMISSIVE SELECT, INSERT, UPDATE, DELETE
--   - No {public} role policies
--   - ORDER lifecycle states seeded (4 rows)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_table_count INT;
v_fk_count INT;
v_idx_order INT;
v_idx_tenant INT;
v_idx_state INT;
v_lc_check TEXT;
v_at_check TEXT;
v_force_rls BOOLEAN;
v_guard_count INT;
v_perm_select INT;
v_perm_insert INT;
v_perm_update INT;
v_perm_delete INT;
v_public_count INT;
v_order_states INT;
BEGIN -- Assert table exists
SELECT COUNT(*) INTO v_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'order_lifecycle_logs';
IF v_table_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — table does not exist';
END IF;
-- Assert FK to orders(id) exists
SELECT COUNT(*) INTO v_fk_count
FROM information_schema.referential_constraints rc
  JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
  AND tc.table_name = 'order_lifecycle_logs'
WHERE rc.unique_constraint_name IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'orders'
      AND constraint_type = 'PRIMARY KEY'
  );
IF v_fk_count < 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — FK to orders(id) not found';
END IF;
-- Assert (order_id, created_at DESC) index exists
SELECT COUNT(*) INTO v_idx_order
FROM pg_indexes
WHERE tablename = 'order_lifecycle_logs'
  AND indexname = 'idx_order_lifecycle_logs_order_created';
IF v_idx_order <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — missing index idx_order_lifecycle_logs_order_created';
END IF;
-- Assert (tenant_id, created_at DESC) index exists
SELECT COUNT(*) INTO v_idx_tenant
FROM pg_indexes
WHERE tablename = 'order_lifecycle_logs'
  AND indexname = 'idx_order_lifecycle_logs_tenant_created';
IF v_idx_tenant <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — missing index idx_order_lifecycle_logs_tenant_created';
END IF;
-- Assert (to_state, created_at DESC) index exists
SELECT COUNT(*) INTO v_idx_state
FROM pg_indexes
WHERE tablename = 'order_lifecycle_logs'
  AND indexname = 'idx_order_lifecycle_logs_to_state_created';
IF v_idx_state <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — missing index idx_order_lifecycle_logs_to_state_created';
END IF;
-- Assert lifecycle_states entity_type CHECK includes 'ORDER'
SELECT pg_get_constraintdef(oid) INTO v_lc_check
FROM pg_constraint
WHERE conrelid = 'public.lifecycle_states'::regclass
  AND conname = 'lifecycle_states_entity_type_check';
IF v_lc_check IS NULL
OR v_lc_check NOT LIKE '%ORDER%' THEN RAISE EXCEPTION 'VERIFIER FAIL: lifecycle_states — entity_type CHECK does not include ORDER. Got: %',
v_lc_check;
END IF;
-- Assert allowed_transitions entity_type CHECK includes 'ORDER'
SELECT pg_get_constraintdef(oid) INTO v_at_check
FROM pg_constraint
WHERE conrelid = 'public.allowed_transitions'::regclass
  AND conname = 'allowed_transitions_entity_type_check';
IF v_at_check IS NULL
OR v_at_check NOT LIKE '%ORDER%' THEN RAISE EXCEPTION 'VERIFIER FAIL: allowed_transitions — entity_type CHECK does not include ORDER. Got: %',
v_at_check;
END IF;
-- Assert FORCE RLS on order_lifecycle_logs
SELECT relforcerowsecurity INTO v_force_rls
FROM pg_class
WHERE relname = 'order_lifecycle_logs';
IF NOT v_force_rls THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — relforcerowsecurity is false';
END IF;
-- Assert exactly 1 RESTRICTIVE guard
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND permissive = 'RESTRICTIVE';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — expected 1 RESTRICTIVE guard, found %',
v_guard_count;
END IF;
-- Assert exactly 1 PERMISSIVE policy per command
SELECT COUNT(*) INTO v_perm_select
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'SELECT';
IF v_perm_select <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — expected 1 PERMISSIVE SELECT, found %',
v_perm_select;
END IF;
SELECT COUNT(*) INTO v_perm_insert
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'INSERT';
IF v_perm_insert <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — expected 1 PERMISSIVE INSERT, found %',
v_perm_insert;
END IF;
SELECT COUNT(*) INTO v_perm_update
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'UPDATE';
IF v_perm_update <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — expected 1 PERMISSIVE UPDATE (immutability block), found %',
v_perm_update;
END IF;
SELECT COUNT(*) INTO v_perm_delete
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND permissive = 'PERMISSIVE'
  AND cmd = 'DELETE';
IF v_perm_delete <> 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — expected 1 PERMISSIVE DELETE (immutability block), found %',
v_perm_delete;
END IF;
-- Assert no {public} role policies
SELECT COUNT(*) INTO v_public_count
FROM pg_policies
WHERE tablename = 'order_lifecycle_logs'
  AND roles::text = '{public}';
IF v_public_count <> 0 THEN RAISE EXCEPTION 'VERIFIER FAIL: order_lifecycle_logs — found % {public} policies, expected 0',
v_public_count;
END IF;
-- Assert ORDER lifecycle states seeded (at minimum the 4 canonical states)
SELECT COUNT(*) INTO v_order_states
FROM public.lifecycle_states
WHERE entity_type = 'ORDER'
  AND state_key IN (
    'PAYMENT_PENDING',
    'CONFIRMED',
    'FULFILLED',
    'CANCELLED'
  );
IF v_order_states <> 4 THEN RAISE EXCEPTION 'VERIFIER FAIL: lifecycle_states — expected 4 ORDER rows (PAYMENT_PENDING/CONFIRMED/FULFILLED/CANCELLED), found %',
v_order_states;
END IF;
RAISE NOTICE 'VERIFIER PASS: order_lifecycle_logs created (table + FK + 3 indexes + FORCE RLS=t + 1 RESTRICTIVE guard + 4 PERMISSIVE policies + no {public} policies + UPDATE/DELETE immutability blocks); lifecycle_states CHECK extended to include ORDER; allowed_transitions CHECK extended to include ORDER; 4 ORDER lifecycle states seeded';
END;
$$;
COMMIT;
-- ============================================================================
-- orders.status ENUM NOTE (recorded here for audit trail):
--   enum order_status current values: PAYMENT_PENDING, PLACED, CANCELLED
--   SM lifecycle state keys use: PAYMENT_PENDING, CONFIRMED, FULFILLED, CANCELLED
--   Alignment (PLACED↔CONFIRMED, missing FULFILLED) requires:
--     ALTER TYPE order_status ADD VALUE 'CONFIRMED' AFTER 'PAYMENT_PENDING';
--     ALTER TYPE order_status ADD VALUE 'FULFILLED' AFTER 'CONFIRMED';
--   Per TECS B1 STOP CONDITION: ALTER TYPE ADD VALUE is IRREVERSIBLE.
--   Decision: enum extension DEFERRED to B3 (SM wiring TECS). B1 uses TEXT
--   columns in order_lifecycle_logs — no enum dependency.
-- ============================================================================
-- CROSS-TENANT ISOLATION PROOF (run manually after psql apply):
-- SIM1 — tenant context, own order logs visible:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.actor_id',   '<user_uuid>',    true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.order_lifecycle_logs; -- Expected: own-tenant logs
--   ROLLBACK;
-- SIM2 — tenant context, other tenant logs = 0:
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.org_id',     '<tenantA_uuid>', true);
--   SELECT set_config('app.realm',      'tenant',         true);
--   SELECT set_config('app.bypass_rls', 'off',            true);
--   SELECT count(*) FROM public.order_lifecycle_logs
--    WHERE tenant_id = '<tenantB_uuid>'; -- Expected: 0
--   ROLLBACK;
-- SIM3 — UPDATE must be blocked for all actors (immutability):
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.bypass_rls', 'on', true);
--   UPDATE public.order_lifecycle_logs SET to_state='HACKED' WHERE true;
--   -- Expected: 0 rows updated (PERMISSIVE UPDATE policy = false)
--   ROLLBACK;
-- SIM4 — DELETE must be blocked (immutability):
--   BEGIN;
--   SET LOCAL ROLE texqtic_app;
--   SELECT set_config('app.bypass_rls', 'on', true);
--   DELETE FROM public.order_lifecycle_logs WHERE true;
--   -- Expected: 0 rows deleted (PERMISSIVE DELETE policy = false)
--   ROLLBACK;
-- ============================================================================
-- APPLY:
--   $u = (Get-Content server/.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
--   psql "--dbname=$u" "--variable=ON_ERROR_STOP=1" "--file=server/prisma/migrations/20260315000005_gap_order_lc_001_schema_foundation/migration.sql"
--   pnpm -C server exec prisma migrate resolve --applied 20260315000005_gap_order_lc_001_schema_foundation
-- ============================================================================