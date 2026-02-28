-- ============================================================================
-- G-018 Day 1 — Escrow Schema Cycle Fix
-- Task ID:  G-018-DAY1-CYCLE-FIX
-- Date:     2026-03-08
-- Gate:     Gate E (Trade Domain Foundation)
-- Author:   TexQtic Platform Engineering (Safe-Write Mode)
--
-- Purpose:
--   Remove escrow_accounts.trade_id to break the circular FK graph that was
--   introduced by migration 20260308000000_g018_day1_escrow_schema:
--
--     trades.escrow_id   → escrow_accounts.id   (KEEP — canonical owner)
--     escrow_accounts.trade_id → trades.id       (REMOVE — creates cycle)
--
--   The cycle makes it impossible to INSERT either a trade or an escrow
--   account "first" without leaving one FK side NULL and updating later —
--   an operationally brittle two-step write that would require a governed
--   UPDATE path that does not exist in Day 1.
--
--   Canonical linkage after this fix:
--     trades.escrow_id → escrow_accounts.id
--
--   The trade is the authoritative owner of the association. The canonical
--   query "which escrow belongs to this trade?" is answered via trades.escrow_id.
--   The reverse query "which trade uses this escrow?" can be answered by a JOIN
--   on trades.escrow_id = escrow_accounts.id — no DB-level FK on escrow_accounts
--   is required for query capability.
--
-- SQL Allowlist used in this migration:
--   BEGIN / COMMIT
--   DROP INDEX IF EXISTS
--   ALTER TABLE ... DROP COLUMN IF EXISTS
--   DO $$ ... $$ (read-only verification)
--
-- Rollback (restores the column — normally unnecessary; the cycle was a bug):
--   ALTER TABLE public.escrow_accounts
--     ADD COLUMN trade_id UUID NULL REFERENCES public.trades(id) ON DELETE RESTRICT;
--   CREATE INDEX escrow_accounts_trade_id_idx ON public.escrow_accounts (trade_id);
--   CREATE UNIQUE INDEX escrow_accounts_tenant_trade_unique
--     ON public.escrow_accounts (tenant_id, trade_id)
--     WHERE trade_id IS NOT NULL;
-- ============================================================================
BEGIN;
-- ── Pre-flight: confirm the column we are about to drop actually exists ──────
-- (Guards against re-running the migration accidentally.)
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'escrow_accounts'
    AND column_name = 'trade_id'
) THEN RAISE NOTICE 'G-018 FIX: escrow_accounts.trade_id does not exist -- migration may already be applied. Skipping.';
END IF;
END;
$$;
-- ── 1) Drop indexes that depend on trade_id ──────────────────────────────────
-- Must precede DROP COLUMN; PostgreSQL drops dependent indexes automatically
-- when a column is dropped, but explicit DROP avoids any ambiguity.
DROP INDEX IF EXISTS public.escrow_accounts_tenant_trade_unique;
DROP INDEX IF EXISTS public.escrow_accounts_trade_id_idx;
-- ── 2) Drop the column (its FK constraint is dropped automatically) ──────────
-- ON DELETE RESTRICT FK to trades(id) is a dependent object; PostgreSQL
-- removes it as part of DROP COLUMN without a separate DROP CONSTRAINT step.
ALTER TABLE public.escrow_accounts DROP COLUMN IF EXISTS trade_id;
-- ── 3) Verification (read-only) ──────────────────────────────────────────────
DO $$ BEGIN -- trade_id must be gone
IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'escrow_accounts'
    AND column_name = 'trade_id'
) THEN RAISE EXCEPTION 'G-018 FIX VERIFY FAIL: escrow_accounts.trade_id still exists';
END IF;
-- trades.escrow_id must still be present (canonical link preserved)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'trades'
    AND column_name = 'escrow_id'
) THEN RAISE EXCEPTION 'G-018 FIX VERIFY FAIL: trades.escrow_id missing — canonical link broken';
END IF;
-- trades_escrow_id_fk constraint must still exist
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND table_name = 'trades'
    AND constraint_name = 'trades_escrow_id_fk'
    AND constraint_type = 'FOREIGN KEY'
) THEN RAISE EXCEPTION 'G-018 FIX VERIFY FAIL: trades_escrow_id_fk FK constraint missing';
END IF;
RAISE NOTICE 'G-018 FIX PASS: Circular FK broken. Canonical link remains: trades.escrow_id -> escrow_accounts.id. escrow_accounts.trade_id removed.';
END;
$$;
COMMIT;