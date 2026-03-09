-- B2-REM-1: Canonicalize TenantType enum and add white-label capability flag
-- Unit: B2-REM-1 | Program: Pre-Wave-5 Closure | Date: 2026-03-09
-- Governance basis: B2-DESIGN, B2-DESIGN-GOV (locked)
-- Doctrine v1.4 | TECS: B2-REM-1
--
-- Summary of changes:
--   1. Extend tenant_type enum: add AGGREGATOR
--   2. Add is_white_label BOOLEAN NOT NULL DEFAULT false to tenants
--   3. Add is_white_label BOOLEAN NOT NULL DEFAULT false to organizations
--   4. Migrate legacy org_type = 'WHITE_LABEL' rows → is_white_label = true, org_type = 'B2B'
--
-- Irreversibility note: ALTER TYPE ADD VALUE is not reversible without DDL recreation.
-- Applied with full preflight + verifier per TexQtic doctrine.
--
-- RLS / Tenancy note:
--   org_id remains the canonical tenancy boundary throughout.
--   is_white_label is a capability/deployment flag only — it does NOT alter RLS semantics.
--   No RLS policies are created, modified or removed by this migration.
-- ============================================================
-- SECTION 1: PRE-FLIGHT ASSERTIONS (read-only, no side effects)
-- ============================================================
DO $$
DECLARE v_enum_exists BOOLEAN;
v_tenants_exists BOOLEAN;
v_orgs_exists BOOLEAN;
v_aggregator_exists BOOLEAN;
BEGIN -- 1a. tenant_type enum must exist
SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tenant_type'
      AND typtype = 'e'
  ) INTO v_enum_exists;
IF NOT v_enum_exists THEN RAISE EXCEPTION 'PREFLIGHT FAIL: enum type tenant_type does not exist';
END IF;
-- 1b. tenants table must exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
  ) INTO v_tenants_exists;
IF NOT v_tenants_exists THEN RAISE EXCEPTION 'PREFLIGHT FAIL: table tenants does not exist';
END IF;
-- 1c. organizations table must exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
  ) INTO v_orgs_exists;
IF NOT v_orgs_exists THEN RAISE EXCEPTION 'PREFLIGHT FAIL: table organizations does not exist';
END IF;
-- 1d. AGGREGATOR must NOT already exist in tenant_type (idempotency guard)
SELECT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'AGGREGATOR'
      AND enumtypid = 'public.tenant_type'::regtype
  ) INTO v_aggregator_exists;
-- Pre-existence is acceptable (idempotent run) — just emit a notice
IF v_aggregator_exists THEN RAISE NOTICE 'PREFLIGHT NOTE: AGGREGATOR already present in tenant_type — ALTER TYPE will be a no-op (IF NOT EXISTS guard is active)';
END IF;
RAISE NOTICE 'PREFLIGHT PASS: tenant_type enum, tenants, and organizations all confirmed';
END $$;
-- ============================================================
-- SECTION 2: ENUM EXTENSION
-- ALTER TYPE ADD VALUE cannot run inside an explicit transaction block
-- (PostgreSQL < 12 constraint; Supabase runs PG15 so IF NOT EXISTS is safe).
-- IF NOT EXISTS guards idempotency.
-- ============================================================
ALTER TYPE public.tenant_type
ADD VALUE IF NOT EXISTS 'AGGREGATOR';
-- ============================================================
-- SECTION 3: COLUMN ADDITIONS
-- BOOLEAN NOT NULL DEFAULT false — idempotent via IF NOT EXISTS
-- ============================================================
-- 3a. tenants.is_white_label
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_white_label BOOLEAN NOT NULL DEFAULT false;
-- 3b. organizations.is_white_label
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS is_white_label BOOLEAN NOT NULL DEFAULT false;
-- ============================================================
-- SECTION 4: LEGACY MIGRATION
-- Migrate legacy org_type = 'WHITE_LABEL' rows to canonical form.
-- Rule (governance-locked B2-DESIGN):
--   White Label is a deployment/capability flag, not a tenant category.
--   Legacy WHITE_LABEL rows → is_white_label = true, org_type = 'B2B'
--   (default canonical identity for white-label deployments lacking a richer classifier)
-- ============================================================
UPDATE public.organizations
SET is_white_label = true,
  org_type = 'B2B'
WHERE org_type = 'WHITE_LABEL';
-- ============================================================
-- SECTION 5: VERIFIER (asserts post-conditions)
-- ============================================================
DO $$
DECLARE v_labels TEXT [];
v_wl_tenants_col BOOLEAN;
v_wl_orgs_col BOOLEAN;
v_orphaned_wl_rows BIGINT;
BEGIN -- 5a. AGGREGATOR must be present in tenant_type
SELECT array_agg(
    enumlabel
    ORDER BY enumsortorder
  ) INTO v_labels
FROM pg_enum
WHERE enumtypid = 'public.tenant_type'::regtype;
IF NOT ('AGGREGATOR' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: AGGREGATOR missing from tenant_type after ALTER TYPE';
END IF;
IF NOT ('B2B' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: B2B missing from tenant_type — unexpected regression';
END IF;
IF NOT ('B2C' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: B2C missing from tenant_type — unexpected regression';
END IF;
IF NOT ('INTERNAL' = ANY(v_labels)) THEN RAISE EXCEPTION 'VERIFIER FAIL: INTERNAL missing from tenant_type — unexpected regression';
END IF;
IF 'WHITE_LABEL' = ANY(v_labels) THEN RAISE EXCEPTION 'VERIFIER FAIL: WHITE_LABEL must not appear in canonical tenant_type enum';
END IF;
-- 5b. tenants.is_white_label column must exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'is_white_label'
      AND data_type = 'boolean'
  ) INTO v_wl_tenants_col;
IF NOT v_wl_tenants_col THEN RAISE EXCEPTION 'VERIFIER FAIL: tenants.is_white_label boolean column not found';
END IF;
-- 5c. organizations.is_white_label column must exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'is_white_label'
      AND data_type = 'boolean'
  ) INTO v_wl_orgs_col;
IF NOT v_wl_orgs_col THEN RAISE EXCEPTION 'VERIFIER FAIL: organizations.is_white_label boolean column not found';
END IF;
-- 5d. No orphaned WHITE_LABEL rows may remain in organizations.org_type
SELECT COUNT(*) INTO v_orphaned_wl_rows
FROM public.organizations
WHERE org_type = 'WHITE_LABEL';
IF v_orphaned_wl_rows > 0 THEN RAISE EXCEPTION 'VERIFIER FAIL: % orphaned WHITE_LABEL row(s) remain in organizations.org_type after migration',
v_orphaned_wl_rows;
END IF;
RAISE NOTICE 'VERIFIER PASS: tenant_type includes AGGREGATOR, B2B, B2C, INTERNAL; WHITE_LABEL absent from enum; is_white_label present on tenants and organizations; no orphaned WHITE_LABEL org_type rows remain';
END $$;