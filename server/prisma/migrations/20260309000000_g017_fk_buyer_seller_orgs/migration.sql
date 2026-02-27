-- ============================================================================
-- G-017 Hardening: FK integrity for buyer_org_id / seller_org_id → organizations(id)
--
-- Purpose:
--   Enforce referential integrity for trades.buyer_org_id and
--   trades.seller_org_id by adding FK constraints to public.organizations(id).
--
--   This closes the G-017 caveat recorded in GOVERNANCE-SYNC-001 (2026-02-27):
--   "buyer_org_id / seller_org_id have NO FK to organizations (unvalidated UUIDs)"
--
-- Prerequisite: G-015 Phase A (organizations table) must be applied. ✅
--
-- ON DELETE action: RESTRICT
--   Rationale: An organization row must not be deleted while it has active
--   trades as buyer or seller. Cascade delete would silently destroy trade
--   records which are immutable governance artefacts.
--
-- Indexes: Already exist from migration 20260306000000_g017_trades_domain:
--   - trades_buyer_org_id_idx ON public.trades(buyer_org_id)
--   - trades_seller_org_id_idx ON public.trades(seller_org_id)
--   No new indexes required.
--
-- SQL Allowlist used in this migration:
--   BEGIN / COMMIT
--   DO $$ ... $$ (preflight stop-loss + post-add verification)
--   ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Preflight stop-loss — abort migration if any invalid org references exist
--
-- This DO block runs BEFORE the FK constraints are added.
-- If any trade row has a buyer_org_id or seller_org_id that does not exist in
-- public.organizations, the migration RAISES EXCEPTION and the transaction is
-- rolled back. The FK is NOT added.
--
-- STOP-LOSS SEMANTICS:
--   invalid_buyer_count + invalid_seller_count MUST both be 0.
--   Any nonzero count → RAISE EXCEPTION → entire migration rolls back.
-- ============================================================================
DO $$
DECLARE invalid_buyer_count INTEGER;
invalid_seller_count INTEGER;
sample_buyer TEXT;
sample_seller TEXT;
BEGIN
SELECT COUNT(*) INTO invalid_buyer_count
FROM public.trades t
WHERE NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = t.buyer_org_id
  );
SELECT COUNT(*) INTO invalid_seller_count
FROM public.trades t
WHERE NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = t.seller_org_id
  );
-- Collect sample trade IDs for reporting (limit 20 each)
SELECT string_agg(
    sub.id::text,
    ', '
    ORDER BY sub.id
  ) INTO sample_buyer
FROM (
    SELECT t.id
    FROM public.trades t
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = t.buyer_org_id
      )
    LIMIT 20
  ) sub;
SELECT string_agg(
    sub.id::text,
    ', '
    ORDER BY sub.id
  ) INTO sample_seller
FROM (
    SELECT t.id
    FROM public.trades t
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = t.seller_org_id
      )
    LIMIT 20
  ) sub;
IF invalid_buyer_count > 0
OR invalid_seller_count > 0 THEN RAISE EXCEPTION E'[G-017-FK-STOP-LOSS] Invalid org references detected — FK constraints NOT applied.\n' 'invalid_buyer_count=%, invalid_seller_count=%.\n' 'Sample trade IDs with invalid buyer_org_id (up to 20): [%]\n' 'Sample trade IDs with invalid seller_org_id (up to 20): [%]\n' 'ACTION REQUIRED: Fix data (ensure all buyer/seller org UUIDs exist in organizations) before retrying.',
invalid_buyer_count,
invalid_seller_count,
COALESCE(sample_buyer, 'none'),
COALESCE(sample_seller, 'none');
END IF;
RAISE NOTICE '[G-017-FK-PREFLIGHT] PASS — 0 invalid buyer_org_id, 0 invalid seller_org_id. Proceeding to add FK constraints.';
END;
$$;
-- ============================================================================
-- §2: Add FK: trades.buyer_org_id → public.organizations(id)
--
-- Constraint name: fk_trades_buyer_org_id
-- ON DELETE RESTRICT: prevents deleting an org that is a buyer in any trade.
-- ON UPDATE NO ACTION: org IDs are UUIDs and are immutable by convention.
-- ============================================================================
ALTER TABLE public.trades
ADD CONSTRAINT fk_trades_buyer_org_id FOREIGN KEY (buyer_org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
-- ============================================================================
-- §3: Add FK: trades.seller_org_id → public.organizations(id)
--
-- Constraint name: fk_trades_seller_org_id
-- ON DELETE RESTRICT: prevents deleting an org that is a seller in any trade.
-- ON UPDATE NO ACTION: org IDs are UUIDs and are immutable by convention.
-- ============================================================================
ALTER TABLE public.trades
ADD CONSTRAINT fk_trades_seller_org_id FOREIGN KEY (seller_org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
-- ============================================================================
-- §4: Post-add verification — confirm both constraints exist in pg_catalog
-- ============================================================================
DO $$
DECLARE fk_buyer_exists BOOLEAN;
fk_seller_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'fk_trades_buyer_org_id'
      AND table_name = 'trades'
      AND constraint_type = 'FOREIGN KEY'
  ) INTO fk_buyer_exists;
SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'fk_trades_seller_org_id'
      AND table_name = 'trades'
      AND constraint_type = 'FOREIGN KEY'
  ) INTO fk_seller_exists;
IF NOT fk_buyer_exists
OR NOT fk_seller_exists THEN RAISE EXCEPTION '[G-017-FK-VERIFY] Post-add check FAILED. fk_trades_buyer_org_id exists=%, fk_trades_seller_org_id exists=%.',
fk_buyer_exists,
fk_seller_exists;
END IF;
RAISE NOTICE '[G-017-FK-VERIFY] PASS — fk_trades_buyer_org_id: ✓, fk_trades_seller_org_id: ✓';
END;
$$;
COMMIT;