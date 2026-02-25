-- ============================================================================
-- G-017 Day 4: Harden pending_approvals TRADE entity reference
-- Task ID:  G-017-DAY4-PA-TRADE-FK-HARDENING
-- Date:     2026-03-07
-- Gate:     Gate E (Trade Domain Foundation)
-- Author:   TexQtic Platform Engineering (Safe-Write Mode)
--
-- Purpose:
--   Enforce a hard, DB-level integrity guarantee that:
--     IF public.pending_approvals.entity_type = 'TRADE'
--     THEN entity_id MUST reference an existing public.trades(id)
--
--   Because pending_approvals is polymorphic (TRADE | ESCROW | CERTIFICATION),
--   a standard FK is not viable.  This migration implements a BEFORE INSERT OR
--   UPDATE trigger that performs the referential check at the DB level.
--
-- SQL Allowlist (only the following DDL is used here):
--   - CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql
--   - CREATE TRIGGER / DROP TRIGGER
--   - COMMENT ON FUNCTION | TRIGGER
--   - DO $$ ... $$ verification block (read-only checks + RAISE only)
--
-- NOT in this migration:
--   - No ALTER TABLE, no column additions, no table rewrites
--   - No RLS policy changes, no GRANT changes
--   - No INSERT / UPDATE / DELETE on any table
--   - No schema.prisma changes (trigger is invisible to Prisma)
--   - No ESCROW enforcement (reserved for G-018)
--
-- Rollback (clean undo — order matters):
--   DROP TRIGGER IF EXISTS trg_g017_pending_approvals_trade_entity_fk
--     ON public.pending_approvals;
--   DROP FUNCTION IF EXISTS public.g017_enforce_pending_approvals_trade_entity_fk();
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- §1: Trigger Function
--
--   public.g017_enforce_pending_approvals_trade_entity_fk()
--
--   Guards: fires only when entity_type = 'TRADE' and the entity_id or
--   entity_type is being set (INSERT) or changed (UPDATE).
--
--   Security model:
--   - SECURITY DEFINER: the referential check must run as the function owner,
--     not as the session role, so that RLS on public.trades cannot silently
--     hide the referenced row and produce a false-negative integrity failure.
--   - SET search_path = public: prevents search_path injection attacks and
--     ensures the unqualified table name 'trades' resolves deterministically.
--
--   Error contract:
--   - SQLSTATE P0003 (chosen: distinct from P0001 generic / P0002 maker-checker)
--   - Message prefix: "G-017 FK_HARDEN_FAIL:" — stable for application parsing.
--   - Includes the offending entity_id for observability.
--
--   Non-TRADE rows:
--   - entity_type = 'ESCROW'        → no check here (reserved G-018)
--   - entity_type = 'CERTIFICATION' → no check here (no FK table yet)
--   - For all non-TRADE types the trigger simply returns NEW unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.g017_enforce_pending_approvals_trade_entity_fk()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_trade_exists BOOLEAN;
BEGIN
  -- ── Guard 1: Only validate when entity_type is 'TRADE'. ─────────────────
  IF NEW.entity_type <> 'TRADE' THEN
    RETURN NEW;
  END IF;

  -- ── Guard 2: Skip check when neither entity_id nor entity_type changed. ─
  --   (On INSERT, TG_OP = 'INSERT' so OLD is NULL — always proceed.)
  --   (On UPDATE, short-circuit if both columns are unchanged.)
  IF TG_OP = 'UPDATE'
     AND (NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id)
     AND (NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type)
  THEN
    RETURN NEW;
  END IF;

  -- ── Referential check: does trades.id = NEW.entity_id exist? ────────────
  --   SECURITY DEFINER + search_path = public ensures RLS on trades is
  --   evaluated with the function owner's rights, not the session caller's,
  --   so a tenant-scoped RLS context cannot hide a valid trade row.
  SELECT EXISTS (
    SELECT 1
    FROM public.trades t
    WHERE t.id = NEW.entity_id
  ) INTO v_trade_exists;

  IF NOT v_trade_exists THEN
    RAISE EXCEPTION
      'G-017 FK_HARDEN_FAIL: pending_approvals TRADE entity_id does not reference trades.id — entity_id: %',
      NEW.entity_id
      USING ERRCODE = 'P0003';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.g017_enforce_pending_approvals_trade_entity_fk() IS
  'G-017 Day 4 — Trigger function enforcing referential integrity for '
  'pending_approvals rows whose entity_type = ''TRADE''. '
  'Validates entity_id EXISTS in public.trades. '
  'SECURITY DEFINER + search_path=public to bypass session RLS on trades. '
  'Raises SQLSTATE P0003 on violation. Non-TRADE rows are passed through unchanged.';

-- ============================================================================
-- §2: Trigger
--
--   trg_g017_pending_approvals_trade_entity_fk
--
--   - BEFORE INSERT OR UPDATE: catches both new rows and any future UPDATE
--     that attempts to change entity_id/entity_type (defensive even if app
--     logic today never updates these columns).
--   - FOR EACH ROW: must be row-level to access NEW / OLD.
--   - WHEN clause is intentionally omitted at the trigger level (guard logic
--     is inside the function) so the function body owns the conditional —
--     this keeps the WHEN clause contract auditable in one place.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_g017_pending_approvals_trade_entity_fk
  ON public.pending_approvals;

CREATE TRIGGER trg_g017_pending_approvals_trade_entity_fk
  BEFORE INSERT OR UPDATE
  ON public.pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.g017_enforce_pending_approvals_trade_entity_fk();

COMMENT ON TRIGGER trg_g017_pending_approvals_trade_entity_fk
  ON public.pending_approvals IS
  'G-017 Day 4 — Before-row trigger enforcing TRADE entity_id → trades.id '
  'referential integrity on public.pending_approvals. '
  'See function g017_enforce_pending_approvals_trade_entity_fk() for the '
  'validation logic and SQLSTATE P0003 error contract.';

-- ============================================================================
-- §3: Post-Migration Verification (read-only DO block — no data written)
--
--   Fails fast (RAISE EXCEPTION) if any expected object is missing or the
--   trigger is disabled.  Emits RAISE NOTICE lines for success summary.
--
--   Checks:
--   a) Function exists in pg_proc
--   b) Trigger exists in pg_trigger for public.pending_approvals
--   c) Trigger is enabled (tgenabled = 'O' = origin/replica)
--   d) public.pending_approvals table exists (sanity)
--   e) public.trades table exists (sanity — our referential target)
-- ============================================================================

DO $$
DECLARE
  v_func_exists    BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_trigger_enabled CHAR(1);
  v_pa_exists      BOOLEAN;
  v_trades_exists  BOOLEAN;
BEGIN

  -- (a) Function must exist in pg_proc
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'g017_enforce_pending_approvals_trade_entity_fk'
  ) INTO v_func_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION
      'G-017 Day4 VERIFY FAIL: function public.g017_enforce_pending_approvals_trade_entity_fk() not found in pg_proc';
  END IF;

  RAISE NOTICE 'G-017 Day4 VERIFY: function g017_enforce_pending_approvals_trade_entity_fk EXISTS — OK';

  -- (b) Trigger must exist in pg_trigger for public.pending_approvals
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname  = 'pending_approvals'
      AND t.tgname   = 'trg_g017_pending_approvals_trade_entity_fk'
  ) INTO v_trigger_exists;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION
      'G-017 Day4 VERIFY FAIL: trigger trg_g017_pending_approvals_trade_entity_fk on public.pending_approvals not found in pg_trigger';
  END IF;

  RAISE NOTICE 'G-017 Day4 VERIFY: trigger trg_g017_pending_approvals_trade_entity_fk EXISTS — OK';

  -- (c) Trigger must be enabled (tgenabled = 'O': fires on origin + replica)
  SELECT t.tgenabled
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname  = 'pending_approvals'
    AND t.tgname   = 'trg_g017_pending_approvals_trade_entity_fk'
  INTO v_trigger_enabled;

  IF v_trigger_enabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION
      'G-017 Day4 VERIFY FAIL: trigger trg_g017_pending_approvals_trade_entity_fk is not enabled (tgenabled=%). Expected ''O''.',
      v_trigger_enabled;
  END IF;

  RAISE NOTICE 'G-017 Day4 VERIFY: trigger tgenabled = ''O'' (enabled for origin) — OK';

  -- (d) public.pending_approvals must exist
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'pending_approvals'
  ) INTO v_pa_exists;

  IF NOT v_pa_exists THEN
    RAISE EXCEPTION
      'G-017 Day4 VERIFY FAIL: public.pending_approvals table does not exist';
  END IF;

  RAISE NOTICE 'G-017 Day4 VERIFY: public.pending_approvals EXISTS — OK';

  -- (e) public.trades must exist
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'trades'
  ) INTO v_trades_exists;

  IF NOT v_trades_exists THEN
    RAISE EXCEPTION
      'G-017 Day4 VERIFY FAIL: public.trades table does not exist — G-017 Day 1 migration must precede Day 4';
  END IF;

  RAISE NOTICE 'G-017 Day4 VERIFY: public.trades EXISTS — OK';

  -- ── Summary ─────────────────────────────────────────────────────────────
  RAISE NOTICE
    'G-017 Day4 PASS: pending_approvals TRADE FK hardening installed — '
    'function: g017_enforce_pending_approvals_trade_entity_fk, '
    'trigger: trg_g017_pending_approvals_trade_entity_fk (BEFORE INSERT OR UPDATE), '
    'SQLSTATE: P0003, SECURITY DEFINER, search_path=public';

END;
$$;

COMMIT;
