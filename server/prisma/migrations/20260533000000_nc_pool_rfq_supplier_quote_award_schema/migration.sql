-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001 (DDL)
-- Migration:  nc_pool_rfq_supplier_quote_award_schema
-- Sequence:   20260533000000
-- Date:       2026-05-12
-- Summary:    Extends network_pool_rfq_supplier_quotes for Phase 1D award path.
--
--             Changes:
--               1. Replaces the status CHECK constraint to allow:
--                  SUBMITTED | WITHDRAWN | ACCEPTED | REJECTED
--               2. Adds nullable audit columns:
--                  accepted_at   TIMESTAMPTZ
--                  rejected_at   TIMESTAMPTZ
--                  reject_reason TEXT
--
--             Safety invariants:
--               - UNIQUE(invite_id) (nc_pool_rfq_supplier_quotes_invite_unique) is NOT touched.
--               - All existing quote rows remain unaffected (columns are nullable).
--               - No data is mutated.
--               - No feature flag is activated.
--               - No RLS policies are changed.
--
--             Authority sources:
--               TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001 §6.1
--               Existing constraint name confirmed from:
--                 20260531000000_nc_pool_supplier_quote_schema/migration.sql
--                 Constraint: nc_pool_rfq_supplier_quotes_status_check
--
--             Design decisions:
--               AD-2: ACCEPTED and REJECTED are terminal quote statuses.
--               AD-3: UNIQUE(invite_id) stays (no re-quoting in Phase 1D).
--               AD-11: accepted_at, rejected_at, reject_reason audit columns.
--               QD-6: supplier_quotes.enabled remains false — not changed here.
-- =============================================================================
-- §1  Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
) THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA PRE-FLIGHT BLOCKED: public.network_pool_rfq_supplier_quotes does not exist. Apply 20260531000000_nc_pool_supplier_quote_schema first.';
END IF;
END $$;
-- §2  Extend status CHECK constraint -------------------------------------------
-- Drop the Phase 1C status CHECK (SUBMITTED | WITHDRAWN).
-- Uses IF EXISTS — idempotent-safe.
-- IMPORTANT: actual constraint name from 20260531000000 is nc_pool_rfq_supplier_quotes_status_check.
ALTER TABLE public.network_pool_rfq_supplier_quotes DROP CONSTRAINT IF EXISTS nc_pool_rfq_supplier_quotes_status_check;
-- Add Phase 1D status CHECK (SUBMITTED | WITHDRAWN | ACCEPTED | REJECTED).
-- Only adds if not already present — idempotent-safe via DO block.
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.constraint_column_usage
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
    AND constraint_name = 'nc_pool_rfq_supplier_quotes_status_check'
) THEN
ALTER TABLE public.network_pool_rfq_supplier_quotes
ADD CONSTRAINT nc_pool_rfq_supplier_quotes_status_check CHECK (
    status IN ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED')
  );
END IF;
END $$;
-- §3  Add nullable audit columns -----------------------------------------------
-- All three columns are nullable — existing rows are unaffected.
-- ADD COLUMN IF NOT EXISTS — idempotent-safe.
ALTER TABLE public.network_pool_rfq_supplier_quotes
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;
-- §4  Post-flight verification -------------------------------------------------
DO $$
DECLARE v_has_accepted_at BOOLEAN;
v_has_rejected_at BOOLEAN;
v_has_reject_reason BOOLEAN;
v_constraint_def TEXT;
BEGIN -- Verify audit columns exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'network_pool_rfq_supplier_quotes'
      AND column_name = 'accepted_at'
  ) INTO v_has_accepted_at;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'network_pool_rfq_supplier_quotes'
      AND column_name = 'rejected_at'
  ) INTO v_has_rejected_at;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'network_pool_rfq_supplier_quotes'
      AND column_name = 'reject_reason'
  ) INTO v_has_reject_reason;
IF NOT v_has_accepted_at THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: column accepted_at not found on network_pool_rfq_supplier_quotes.';
END IF;
IF NOT v_has_rejected_at THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: column rejected_at not found on network_pool_rfq_supplier_quotes.';
END IF;
IF NOT v_has_reject_reason THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: column reject_reason not found on network_pool_rfq_supplier_quotes.';
END IF;
-- Verify the new status CHECK constraint is present
SELECT pg_get_constraintdef(oid) INTO v_constraint_def
FROM pg_constraint
WHERE conrelid = 'public.network_pool_rfq_supplier_quotes'::regclass
  AND conname = 'nc_pool_rfq_supplier_quotes_status_check';
IF v_constraint_def IS NULL THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: status CHECK constraint nc_pool_rfq_supplier_quotes_status_check not found.';
END IF;
-- Verify ACCEPTED and REJECTED appear in the constraint definition
IF v_constraint_def NOT LIKE '%ACCEPTED%' THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: status CHECK constraint does not include ACCEPTED. Found: %',
v_constraint_def;
END IF;
IF v_constraint_def NOT LIKE '%REJECTED%' THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: status CHECK constraint does not include REJECTED. Found: %',
v_constraint_def;
END IF;
-- Verify UNIQUE(invite_id) constraint is still intact
IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conrelid = 'public.network_pool_rfq_supplier_quotes'::regclass
    AND conname = 'nc_pool_rfq_supplier_quotes_invite_unique'
    AND contype = 'u'
) THEN RAISE EXCEPTION 'NC-AWARD-SCHEMA POST-FLIGHT: UNIQUE(invite_id) constraint nc_pool_rfq_supplier_quotes_invite_unique is missing — was it accidentally dropped?';
END IF;
RAISE NOTICE 'NC-AWARD-SCHEMA POST-FLIGHT PASSED. Columns: accepted_at ✓, rejected_at ✓, reject_reason ✓. Status CHECK: ACCEPTED ✓, REJECTED ✓. UNIQUE(invite_id): intact ✓.';
END $$;