-- ============================================================================
-- G-017 Day 1: Trades Domain — Schema + RLS
--
-- Purpose:
--   1. Create public.trades table (canonical trade entity, lifecycle-aligned).
--   2. Create public.trade_events table (append-only event log per trade).
--   3. Enable + Force RLS on both tables.
--   4. Tenant-scoped RLS policies (RESTRICTIVE guard + PERMISSIVE SELECT/INSERT).
--   5. updated_at maintenance trigger on trades.
--   6. Verification block — migration fails fast if invariants are violated.
--
-- Governance:
--   - Lifecycle: reuses lifecycle_states (G-020). No new states created.
--   - Escalation: freeze_recommended column (D-022-B compatible, informational).
--   - Reasoning: reasoning_log_id nullable FK → reasoning_logs (G-023).
--   - Audit: no audit_logs changes. No reasoning_logs changes.
--
-- Roles: texqtic_app (matches G-020/G-021/G-022/G-023 patterns).
-- RLS functions: app.require_org_context(), app.current_org_id(), app.bypass_enabled()
--
-- NOT included (deferred):
--   - Escrow table (G-018)
--   - API routes (future Day 2+)
--   - Admin/superadmin RLS policies (deferred — no cross-tenant access in Day 1)
--   - trade_lifecycle_logs.trade_id hard FK (follow-up migration once wired)
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Create public.trades
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  buyer_org_id UUID NOT NULL,
  seller_org_id UUID NOT NULL,
  -- G-020: FK to lifecycle_states registry. Determines current trade state.
  lifecycle_state_id UUID NOT NULL REFERENCES public.lifecycle_states(id) ON DELETE RESTRICT,
  -- Human-readable external reference, unique per tenant.
  trade_reference TEXT NOT NULL,
  currency TEXT NOT NULL,
  gross_amount NUMERIC(18, 6) NOT NULL,
  -- G-022 compatibility: informational flag. EscalationService may set this.
  -- Never auto-toggles KILL_SWITCH or any config (D-022-C doctrine).
  freeze_recommended BOOLEAN NOT NULL DEFAULT false,
  -- G-023: optional link to reasoning_logs row that informed this trade.
  -- ON DELETE RESTRICT: reasoning_logs is append-only anyway (immutability trigger).
  reasoning_log_id UUID REFERENCES public.reasoning_logs(id) ON DELETE RESTRICT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trades_gross_amount_positive CHECK (gross_amount > 0)
);
-- Unique: one trade_reference per tenant
ALTER TABLE public.trades
ADD CONSTRAINT trades_tenant_ref_unique UNIQUE (tenant_id, trade_reference);
-- ============================================================================
-- §2: Indexes on public.trades
-- ============================================================================
CREATE INDEX IF NOT EXISTS trades_tenant_id_idx ON public.trades(tenant_id);
CREATE INDEX IF NOT EXISTS trades_buyer_org_id_idx ON public.trades(buyer_org_id);
CREATE INDEX IF NOT EXISTS trades_seller_org_id_idx ON public.trades(seller_org_id);
CREATE INDEX IF NOT EXISTS trades_lifecycle_state_id_idx ON public.trades(lifecycle_state_id);
-- ============================================================================
-- §3: Create public.trade_events (append-only event log per trade)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================================
-- §4: Indexes on public.trade_events
-- ============================================================================
CREATE INDEX IF NOT EXISTS trade_events_tenant_id_idx ON public.trade_events(tenant_id);
CREATE INDEX IF NOT EXISTS trade_events_trade_id_idx ON public.trade_events(trade_id);
-- ============================================================================
-- §5: ENABLE + FORCE Row Level Security
-- ============================================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trade_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_events FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- §6: updated_at trigger for public.trades
--     (Forward-looking: UPDATE requires a future policy; trigger is ready.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trades_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_trades_set_updated_at ON public.trades;
CREATE TRIGGER trg_trades_set_updated_at BEFORE
UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.trades_set_updated_at();
-- ============================================================================
-- §7: RLS Policies — public.trades
--
-- Pattern mirrors G-022 / G-023:
--   - One RESTRICTIVE guard (FOR ALL) — fail-closed baseline
--   - One PERMISSIVE SELECT  — tenant-scoped reads (+ bypass for test seeding)
--   - One PERMISSIVE INSERT  — tenant-scoped writes (+ bypass for test seeding)
--   No UPDATE/DELETE policies in Day 1. Future policy additions are additive.
-- ============================================================================
-- Guard (RESTRICTIVE): fail-closed — must have org context or bypass enabled
DROP POLICY IF EXISTS trades_guard ON public.trades;
CREATE POLICY trades_guard ON public.trades AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- Tenant SELECT: own rows only (+ bypass)
DROP POLICY IF EXISTS trades_tenant_select ON public.trades;
CREATE POLICY trades_tenant_select ON public.trades AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- Tenant INSERT: own tenant only (+ bypass)
DROP POLICY IF EXISTS trades_tenant_insert ON public.trades;
CREATE POLICY trades_tenant_insert ON public.trades AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- ============================================================================
-- §8: RLS Policies — public.trade_events
--
-- Same three-policy pattern as §7.
-- No UPDATE/DELETE policies — trade_events is append-only by design.
-- ============================================================================
-- Guard (RESTRICTIVE)
DROP POLICY IF EXISTS trade_events_guard ON public.trade_events;
CREATE POLICY trade_events_guard ON public.trade_events AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- Tenant SELECT
DROP POLICY IF EXISTS trade_events_tenant_select ON public.trade_events;
CREATE POLICY trade_events_tenant_select ON public.trade_events AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- Tenant INSERT
DROP POLICY IF EXISTS trade_events_tenant_insert ON public.trade_events;
CREATE POLICY trade_events_tenant_insert ON public.trade_events AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- ============================================================================
-- §9: GRANT — texqtic_app gets SELECT + INSERT only (no UPDATE/DELETE)
-- ============================================================================
GRANT SELECT,
  INSERT ON public.trades TO texqtic_app;
GRANT SELECT,
  INSERT ON public.trade_events TO texqtic_app;
-- ============================================================================
-- §10: Verification block — fails migration on any violated invariant
-- ============================================================================
DO $$
DECLARE v_lifecycle_exists boolean;
v_trades_rls boolean;
v_trades_force boolean;
v_events_rls boolean;
v_events_force boolean;
v_trades_guard_count int;
v_events_guard_count int;
v_lifecycle_fk_count int;
BEGIN -- 1) lifecycle_states table must exist (G-020 dependency)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'lifecycle_states'
  ) INTO v_lifecycle_exists;
IF NOT v_lifecycle_exists THEN RAISE EXCEPTION 'G-017 FAIL: lifecycle_states table not found — G-020 must be applied first';
END IF;
-- 2) ENABLE + FORCE RLS on trades
SELECT relrowsecurity,
  relforcerowsecurity INTO v_trades_rls,
  v_trades_force
FROM pg_class
WHERE relname = 'trades'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_trades_rls
  AND v_trades_force
) THEN RAISE EXCEPTION 'G-017 FAIL: trades missing ENABLE/FORCE RLS (rls=%, force=%)',
v_trades_rls,
v_trades_force;
END IF;
-- 3) ENABLE + FORCE RLS on trade_events
SELECT relrowsecurity,
  relforcerowsecurity INTO v_events_rls,
  v_events_force
FROM pg_class
WHERE relname = 'trade_events'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_events_rls
  AND v_events_force
) THEN RAISE EXCEPTION 'G-017 FAIL: trade_events missing ENABLE/FORCE RLS (rls=%, force=%)',
v_events_rls,
v_events_force;
END IF;
-- 4) trades_guard must exist and be RESTRICTIVE
SELECT COUNT(*) INTO v_trades_guard_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND policyname = 'trades_guard'
  AND permissive = 'RESTRICTIVE';
IF v_trades_guard_count <> 1 THEN RAISE EXCEPTION 'G-017 FAIL: trades_guard RESTRICTIVE policy missing (found %)',
v_trades_guard_count;
END IF;
-- 5) trade_events_guard must exist and be RESTRICTIVE
SELECT COUNT(*) INTO v_events_guard_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trade_events'
  AND policyname = 'trade_events_guard'
  AND permissive = 'RESTRICTIVE';
IF v_events_guard_count <> 1 THEN RAISE EXCEPTION 'G-017 FAIL: trade_events_guard RESTRICTIVE policy missing (found %)',
v_events_guard_count;
END IF;
-- 6) lifecycle_state_id FK to lifecycle_states must exist
SELECT COUNT(*) INTO v_lifecycle_fk_count
FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name
  AND kcu.constraint_schema = rc.constraint_schema
WHERE kcu.table_schema = 'public'
  AND kcu.table_name = 'trades'
  AND kcu.column_name = 'lifecycle_state_id';
IF v_lifecycle_fk_count < 1 THEN RAISE EXCEPTION 'G-017 FAIL: lifecycle_state_id FK constraint on trades not found';
END IF;
RAISE NOTICE 'G-017 PASS: trades domain created — lifecycle_states: %, trades RLS: %/%, trade_events RLS: %/%, trades_guard: %, events_guard: %, lifecycle_fk: %',
v_lifecycle_exists,
v_trades_rls,
v_trades_force,
v_events_rls,
v_events_force,
v_trades_guard_count,
v_events_guard_count,
v_lifecycle_fk_count;
END;
$$;
COMMIT;