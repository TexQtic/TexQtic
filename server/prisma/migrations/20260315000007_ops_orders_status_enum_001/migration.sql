-- OPS-ORDERS-STATUS-ENUM-001: Extend order_status enum for lifecycle parity
-- Adds:    CONFIRMED, FULFILLED
-- Verifies: CANCELLED already present (NOT re-added)
-- Doctrine v1.4 | TECS: OPS-ORDERS-STATUS-ENUM-001
-- Formally deferred from GAP-ORDER-LC-001 B6b (GOVERNANCE-SYNC-063)
-- Irreversibility note: ALTER TYPE ADD VALUE is not reversible; applied with full pre-flight + verifier.
-- ============================================================
-- SECTION 1: PRE-FLIGHT ASSERTIONS (read-only)
-- Asserts: enum exists, orders.status uses it, CANCELLED is present.
-- Stops migration on any failure via RAISE EXCEPTION.
-- ============================================================
DO $$
DECLARE v_enum_exists BOOLEAN;
v_col_exists BOOLEAN;
BEGIN -- 1a. enum type must exist
SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'order_status'
      AND typtype = 'e'
  ) INTO v_enum_exists;
IF NOT v_enum_exists THEN RAISE EXCEPTION 'PREFLIGHT FAIL: enum type order_status does not exist';
END IF;
-- 1b. orders.status must use order_status
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'status'
      AND udt_name = 'order_status'
  ) INTO v_col_exists;
IF NOT v_col_exists THEN RAISE EXCEPTION 'PREFLIGHT FAIL: orders.status does not use order_status type';
END IF;
-- 1c. CANCELLED must already be present (do NOT re-add)
IF NOT EXISTS (
  SELECT 1
  FROM pg_enum
  WHERE enumlabel = 'CANCELLED'
    AND enumtypid = 'public.order_status'::regtype
) THEN RAISE EXCEPTION 'PREFLIGHT FAIL: CANCELLED missing from order_status -- unexpected schema state; aborting';
END IF;
RAISE NOTICE 'PREFLIGHT PASS: order_status enum and orders.status confirmed; CANCELLED is present';
END $$;
-- ============================================================
-- SECTION 2: ENUM EXTENSION
-- ALTER TYPE ADD VALUE cannot run inside an explicit transaction block
-- (Postgres constraint). These statements execute at top level in
-- autocommit mode when applied via psql -f.
-- IF NOT EXISTS guards idempotency (requires Postgres 12+).
-- ============================================================
ALTER TYPE public.order_status
ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE public.order_status
ADD VALUE IF NOT EXISTS 'FULFILLED';
-- ============================================================
-- SECTION 3: VERIFIER
-- Asserts all required labels are present after extension.
-- Raises EXCEPTION (not just NOTICE) on any missing label.
-- ============================================================
DO $$
DECLARE v_labels TEXT [];
BEGIN
SELECT array_agg(
    enumlabel
    ORDER BY enumsortorder
  ) INTO v_labels
FROM pg_enum
WHERE enumtypid = 'public.order_status'::regtype;
IF NOT ('PAYMENT_PENDING' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: PAYMENT_PENDING missing from order_status';
END IF;
IF NOT ('PLACED' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: PLACED missing from order_status';
END IF;
IF NOT ('CANCELLED' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: CANCELLED missing from order_status -- critical; do not ignore';
END IF;
IF NOT ('CONFIRMED' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: CONFIRMED missing from order_status after ALTER TYPE';
END IF;
IF NOT ('FULFILLED' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: FULFILLED missing from order_status after ALTER TYPE';
END IF;
RAISE NOTICE 'VERIFIER PASS: order_status includes all required lifecycle labels: PAYMENT_PENDING, PLACED, CANCELLED, CONFIRMED, FULFILLED';
END $$;