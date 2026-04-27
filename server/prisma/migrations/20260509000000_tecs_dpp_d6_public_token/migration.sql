-- ─────────────────────────────────────────────────────────────────────────────
-- TECS-DPP-PASSPORT-FOUNDATION-001 D-6 — Public QR Access / Published DPP
-- TECS ID : TECS-DPP-PUBLIC-QR-001
-- Date    : 2026-05-09
-- Slice   : D-6 — public_token on dpp_passport_states + public lookup grant
--
-- Public identifier strategy: Option B — public_token UUID UNIQUE DEFAULT NULL.
-- Populated when passportStatus transitions to PUBLISHED (application layer, future).
-- Null for DRAFT/INTERNAL/TRADE_READY rows; only non-null PUBLISHED rows are
-- reachable via the public route.
--
-- Prerequisites: D-3 (dpp_passport_states table) must be applied.
-- NOTE: Prisma migrate manages the transaction. No BEGIN/COMMIT in this file.
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- S0: PREFLIGHT — verify D-3 prerequisite
-- ─────────────────────────────────────────────────────────────────────────────
DO $d6_preflight$ BEGIN -- D-3 prerequisite: dpp_passport_states table
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'dpp_passport_states'
) THEN RAISE EXCEPTION 'D6 PREFLIGHT FAIL: dpp_passport_states not found — D-3 must be applied first';
END IF;
-- texqtic_public_lookup role must exist (created in 20260319000001_pw5_by_email_service_role_grants)
IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_public_lookup'
) THEN RAISE EXCEPTION 'D6 PREFLIGHT FAIL: texqtic_public_lookup role not found — pw5_by_email_service_role_grants must be applied first';
END IF;
RAISE NOTICE '[D6 PREFLIGHT] PASS — all prerequisites confirmed';
END $d6_preflight$;
-- ─────────────────────────────────────────────────────────────────────────────
-- S1: Add public_token column to dpp_passport_states
--
-- public_token UUID UNIQUE DEFAULT NULL:
--   - NULL for DRAFT / INTERNAL / TRADE_READY rows (not publicly accessible)
--   - Set at application layer when status transitions to PUBLISHED
--   - gen_random_uuid() used when setting (application layer calls, not DB default)
--   - UNIQUE constraint enforces one public identity per passport state row
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.dpp_passport_states
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT NULL;
-- Add UNIQUE constraint if not already present
DO $d6_unique$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conrelid = 'public.dpp_passport_states'::regclass
    AND contype = 'u'
    AND conname = 'dpp_passport_states_public_token_unique'
) THEN
ALTER TABLE public.dpp_passport_states
ADD CONSTRAINT dpp_passport_states_public_token_unique UNIQUE (public_token);
END IF;
END $d6_unique$;
-- ─────────────────────────────────────────────────────────────────────────────
-- S2: Index for fast public token lookups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dpp_passport_states_public_token ON public.dpp_passport_states (public_token)
WHERE public_token IS NOT NULL;
-- ─────────────────────────────────────────────────────────────────────────────
-- S3: RLS policy for texqtic_public_lookup role
--
-- FORCE RLS on dpp_passport_states (set in D-3) applies to all roles.
-- Without an explicit policy for texqtic_public_lookup, all rows are denied.
-- This policy permits SELECT for public_token-keyed lookups of PUBLISHED rows only.
-- No GUC context required — policy is entirely row-data-driven.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpp_passport_states_public_lookup_select ON public.dpp_passport_states;
CREATE POLICY dpp_passport_states_public_lookup_select ON public.dpp_passport_states FOR
SELECT TO texqtic_public_lookup USING (
    status = 'PUBLISHED'
    AND public_token IS NOT NULL
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- S4: GRANT SELECT on dpp_passport_states to texqtic_public_lookup
--     (SELECT privilege required; policy above scopes to PUBLISHED rows only)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.dpp_passport_states TO texqtic_public_lookup;
-- ─────────────────────────────────────────────────────────────────────────────
-- S5: VERIFIER DO block — assert all expected objects are present after DDL
-- ─────────────────────────────────────────────────────────────────────────────
DO $d6_verifier$
DECLARE v_col INTEGER;
v_unique INTEGER;
v_idx INTEGER;
v_policy INTEGER;
BEGIN -- public_token column exists
SELECT COUNT(*) INTO v_col
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_passport_states'
  AND column_name = 'public_token';
IF v_col = 0 THEN RAISE EXCEPTION 'D6 VERIFIER FAIL: dpp_passport_states.public_token column not found';
END IF;
-- UNIQUE constraint exists
SELECT COUNT(*) INTO v_unique
FROM pg_constraint
WHERE conrelid = 'public.dpp_passport_states'::regclass
  AND contype = 'u'
  AND conname = 'dpp_passport_states_public_token_unique';
IF v_unique = 0 THEN RAISE EXCEPTION 'D6 VERIFIER FAIL: dpp_passport_states_public_token_unique constraint not found';
END IF;
-- Partial index exists
SELECT COUNT(*) INTO v_idx
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'dpp_passport_states'
  AND indexname = 'idx_dpp_passport_states_public_token';
IF v_idx = 0 THEN RAISE EXCEPTION 'D6 VERIFIER FAIL: idx_dpp_passport_states_public_token index not found';
END IF;
-- RLS policy for texqtic_public_lookup
SELECT COUNT(*) INTO v_policy
FROM pg_policies
WHERE tablename = 'dpp_passport_states'
  AND policyname = 'dpp_passport_states_public_lookup_select';
IF v_policy = 0 THEN RAISE EXCEPTION 'D6 VERIFIER FAIL: dpp_passport_states_public_lookup_select policy not found';
END IF;
RAISE NOTICE '[D6 VERIFIER] PASS — public_token column, unique constraint, index, and RLS policy verified';
END $d6_verifier$;