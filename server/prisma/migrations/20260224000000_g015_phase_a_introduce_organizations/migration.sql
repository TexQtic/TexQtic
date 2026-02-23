-- ============================================================================
-- G-015 Phase A: Canonical organizations table — Additive Introduction
-- Gap:      G-015 (Canonical organizations alignment vs current Tenant model)
-- Doctrine: v1.4 / TECS v1.6 / Wave-3 S2
-- Date:     2026-02-24
-- Author:   TexQtic Platform Engineering
-- ============================================================================
--
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table is modified.
--   - No FK from organizations → tenants yet (Phase B).
--   - organizations.id will always equal tenants.id for the same entity.
--   - Dual-write is enforced at the DB level via trigger.
--   - FORCE RLS active from creation. Fail-closed.
--   - Fully reversible: DROP TABLE organizations; DROP TRIGGER; DROP FUNCTION.
--
-- OBJECTS CREATED
--   1. TABLE     public.organizations
--   2. INDEX ×5  (slug unique enforced by PK, 4 additional)
--   3. RLS       ENABLE + FORCE + 3 policies
--   4. GRANTS    texqtic_app (SELECT), texqtic_admin (SELECT + INSERT + UPDATE)
--   5. FUNCTION  public.sync_tenants_to_organizations()
--   6. TRIGGER   trg_sync_tenants_to_org ON public.tenants
--   7. VERIFY    inline DO $$ block
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  CREATE TABLE public.organizations
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.organizations (
  -- Identity (mirrors tenants.id 1:1 — same UUID value)
  id UUID NOT NULL,
  -- Canonical slug (mirrored from tenants.slug for read independence)
  slug VARCHAR(100) NOT NULL,
  -- Doctrine §3.1 invariants
  legal_name VARCHAR(500) NOT NULL,
  jurisdiction VARCHAR(100) NOT NULL DEFAULT 'UNKNOWN',
  registration_no VARCHAR(200),
  -- Classification
  org_type VARCHAR(50) NOT NULL DEFAULT 'B2B',
  risk_score SMALLINT NOT NULL DEFAULT 0,
  -- Lifecycle (Doctrine §3.1 status + §1.3 temporal)
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CONSTRAINT organizations_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
  plan VARCHAR(30) NOT NULL DEFAULT 'FREE',
  -- Temporal anchors (Doctrine §1.3)
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ,
  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_slug_key UNIQUE (slug),
  -- Slug canonicalization: prevents normalization bugs across lifecycle (G-015 review)
  CONSTRAINT organizations_slug_lowercase CHECK (slug = lower(slug))
);
COMMENT ON TABLE public.organizations IS 'G-015: Doctrine v1.4 canonical organization identity table. ' '1:1 with tenants.id during transition. Authoritative for legal_name, ' 'jurisdiction, risk_score, effective_at, superseded_at. ' 'Phase B adds deferred FK to tenants. Phase D promotes to sole authority.';
COMMENT ON COLUMN public.organizations.id IS 'Same UUID as tenants.id. Not a FK in Phase A (added deferred in Phase B).';
COMMENT ON COLUMN public.organizations.legal_name IS 'Doctrine §3.1 canonical invariant. Seeded from tenants.name in backfill.';
COMMENT ON COLUMN public.organizations.jurisdiction IS 'ISO 3166-2 jurisdiction code (e.g. US-DE, GB, IN-MH). Default UNKNOWN for legacy tenants.';
COMMENT ON COLUMN public.organizations.registration_no IS 'Official trade/company registration number. Nullable for early-stage tenants.';
COMMENT ON COLUMN public.organizations.risk_score IS 'Doctrine §3.1: 0=clean, higher=elevated. Supports sanctions + trade lifecycle.';
COMMENT ON COLUMN public.organizations.effective_at IS 'Doctrine §1.3: When this organization record became effective.';
COMMENT ON COLUMN public.organizations.superseded_at IS 'Doctrine §1.3: When this record was superseded or closed. NULL = currently active.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  INDEXES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Note: UNIQUE(slug) is covered by the table constraint above.
-- Additional access pattern indexes below.
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations (status);
CREATE INDEX IF NOT EXISTS idx_organizations_jurisdiction ON public.organizations (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_organizations_effective_at ON public.organizations (effective_at DESC);
-- Sparse index: only rows with non-zero risk require enforcement queries
CREATE INDEX IF NOT EXISTS idx_organizations_risk_score ON public.organizations (risk_score)
WHERE risk_score > 0;
-- Composite for control-plane listing (status + created_at pagination)
CREATE INDEX IF NOT EXISTS idx_organizations_status_created ON public.organizations (status, created_at DESC);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  ROW LEVEL SECURITY
--
-- organizations is a CONTROL-PLANE table.
-- Tenant actors NEVER read their own organizations row directly.
-- Only the admin realm or bypass (test/seed) can access.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
-- Policy 1: Control-plane SELECT
--   Allows: admin realm actors OR bypass (test seeding / backfill)
DROP POLICY IF EXISTS organizations_control_plane_select ON public.organizations;
CREATE POLICY organizations_control_plane_select ON public.organizations FOR
SELECT USING (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  );
-- Policy 2: Control-plane INSERT
--   Only admin realm or bypass may create organization records.
--   The dual-write trigger runs as the table owner (SECURITY DEFINER),
--   so it bypasses RLS when inserting from the tenant-write path.
DROP POLICY IF EXISTS organizations_control_plane_insert ON public.organizations;
CREATE POLICY organizations_control_plane_insert ON public.organizations FOR
INSERT WITH CHECK (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  );
-- Policy 3: Control-plane UPDATE
DROP POLICY IF EXISTS organizations_control_plane_update ON public.organizations;
CREATE POLICY organizations_control_plane_update ON public.organizations FOR
UPDATE USING (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  ) WITH CHECK (
    app.bypass_enabled()
    OR app.current_realm() = 'admin'
  );
-- Policy 4: RESTRICTIVE fail-closed guard
--   This policy MUST pass in addition to any permissive policy above.
--   Ensures no request without proper context can ever access this table.
DROP POLICY IF EXISTS organizations_guard_policy ON public.organizations;
CREATE POLICY organizations_guard_policy ON public.organizations AS RESTRICTIVE FOR ALL USING (
  -- NOTE: app.require_org_context() deliberately excluded.
  -- organizations is control-plane only. Tenant realm actors must NEVER
  -- pass this guard via a tenant org context — that would allow realm bleed.
  app.bypass_enabled()
  OR app.current_realm() = 'admin'
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  GRANTS
--
-- texqtic_app   — SELECT only (tenant runtime role, read-only here)
-- texqtic_admin — SELECT + INSERT + UPDATE (control-plane role)
-- No DELETE grant on either role (organizations records are immutable
-- or superseded, not deleted).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRANT USAGE ON SCHEMA public TO texqtic_app;
GRANT SELECT ON TABLE public.organizations TO texqtic_app;
-- texqtic_admin is the control-plane write role
-- Grant is conditional: role may not exist in all environments.
-- We use DO block to avoid hard failure if role is absent.
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_admin'
) THEN
GRANT SELECT,
  INSERT,
  UPDATE ON TABLE public.organizations TO texqtic_admin;
RAISE NOTICE 'GRANT: texqtic_admin → SELECT, INSERT, UPDATE on organizations';
ELSE RAISE NOTICE 'SKIP: texqtic_admin role not found — grant deferred';
END IF;
END $$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  TRIGGER FUNCTION: sync_tenants_to_organizations()
--
-- SECURITY DEFINER: runs as the function owner (postgres/superuser),
-- which bypasses RLS on organizations. This is intentional — the
-- trigger must write to organizations regardless of the calling
-- session's app.realm context.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING on INSERT.
-- Non-blocking: AFTER trigger, does not delay tenant writes.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.sync_tenants_to_organizations() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- ── INSERT path ─────────────────────────────────────────────────────
  IF (TG_OP = 'INSERT') THEN
INSERT INTO public.organizations (
    id,
    slug,
    legal_name,
    org_type,
    status,
    plan,
    effective_at,
    created_at,
    updated_at
  )
VALUES (
    NEW.id,
    NEW.slug,
    NEW.name,
    -- tenants.name → organizations.legal_name
    NEW.type,
    -- tenants.type (enum cast to text implicitly)
    NEW.status::text,
    -- tenants.status (enum cast to text)
    NEW.plan,
    -- tenants.plan (enum cast to text implicitly)
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  ) ON CONFLICT (id) DO NOTHING;
-- ON CONFLICT DO NOTHING: if a race or backfill already inserted, skip silently.
RETURN NEW;
END IF;
-- ── UPDATE path ─────────────────────────────────────────────────────
IF (TG_OP = 'UPDATE') THEN
UPDATE public.organizations
SET slug = NEW.slug,
  legal_name = NEW.name,
  org_type = NEW.type::text,
  status = NEW.status::text,
  plan = NEW.plan::text,
  updated_at = now()
WHERE id = NEW.id;
-- If no matching row exists (pre-backfill edge case), insert it.
IF NOT FOUND THEN
INSERT INTO public.organizations (
    id,
    slug,
    legal_name,
    org_type,
    status,
    plan,
    effective_at,
    created_at,
    updated_at
  )
VALUES (
    NEW.id,
    NEW.slug,
    NEW.name,
    NEW.type::text,
    NEW.status::text,
    NEW.plan::text,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()),
    now()
  ) ON CONFLICT (id) DO NOTHING;
END IF;
RETURN NEW;
END IF;
RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.sync_tenants_to_organizations() IS 'G-015 Phase A: AFTER INSERT OR UPDATE trigger on tenants. ' 'Maintains identity parity between tenants and organizations without ' 'requiring application changes. SECURITY DEFINER to bypass RLS on organizations. ' 'Idempotent via ON CONFLICT DO NOTHING.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  TRIGGER: trg_sync_tenants_to_org ON public.tenants
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Drop if exists (idempotent — safe to re-run migration)
DROP TRIGGER IF EXISTS trg_sync_tenants_to_org ON public.tenants;
CREATE TRIGGER trg_sync_tenants_to_org
AFTER
INSERT
  OR
UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.sync_tenants_to_organizations();
COMMENT ON TRIGGER trg_sync_tenants_to_org ON public.tenants IS 'G-015 Phase A: Fires after every tenant INSERT or UPDATE. ' 'Syncs to organizations to maintain identity parity. Non-blocking (AFTER).';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  VERIFICATION BLOCK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_rls_enabled boolean;
v_rls_forced boolean;
v_policy_count int;
v_trigger_count int;
v_function_exists boolean;
v_col_count int;
v_fail boolean := false;
BEGIN -- 1) Table + RLS state
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'organizations';
IF NOT FOUND THEN RAISE EXCEPTION 'VERIFY FAIL: organizations table not found';
END IF;
IF NOT v_rls_enabled THEN RAISE WARNING 'VERIFY FAIL: organizations RLS not enabled';
v_fail := true;
ELSE RAISE NOTICE 'VERIFY OK: organizations RLS enabled';
END IF;
IF NOT v_rls_forced THEN RAISE WARNING 'VERIFY FAIL: organizations FORCE RLS not set';
v_fail := true;
ELSE RAISE NOTICE 'VERIFY OK: organizations FORCE RLS set';
END IF;
-- 2) Policy count (expect 4)
SELECT COUNT(*) INTO v_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations';
IF v_policy_count < 4 THEN RAISE WARNING 'VERIFY WARN: only % policies found on organizations (expected 4)',
v_policy_count;
ELSE RAISE NOTICE 'VERIFY OK: % RLS policies installed on organizations',
v_policy_count;
END IF;
-- 3) Trigger existence
SELECT COUNT(*) INTO v_trigger_count
FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'tenants'
  AND t.tgname = 'trg_sync_tenants_to_org'
  AND NOT t.tgisinternal;
IF v_trigger_count = 0 THEN RAISE WARNING 'VERIFY FAIL: trg_sync_tenants_to_org trigger not found on tenants';
v_fail := true;
ELSE RAISE NOTICE 'VERIFY OK: trg_sync_tenants_to_org trigger installed on tenants';
END IF;
-- 4) Sync function existence
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'sync_tenants_to_organizations'
  ) INTO v_function_exists;
IF NOT v_function_exists THEN RAISE WARNING 'VERIFY FAIL: sync_tenants_to_organizations function not found';
v_fail := true;
ELSE RAISE NOTICE 'VERIFY OK: sync_tenants_to_organizations function exists';
END IF;
-- 5) Column count (expect 14 defined columns)
SELECT COUNT(*) INTO v_col_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations';
RAISE NOTICE 'VERIFY INFO: organizations has % columns',
v_col_count;
-- Final decision
IF v_fail THEN RAISE EXCEPTION 'G-015 Phase A VERIFY FAILED — see WARNINGs above';
ELSE RAISE NOTICE '══════════════════════════════════════════════════════════';
RAISE NOTICE 'G-015 Phase A VERIFY PASSED';
RAISE NOTICE 'Table: organizations ✅  RLS: ENABLED + FORCED ✅';
RAISE NOTICE 'Policies: % ✅  Trigger: installed ✅  Function: exists ✅',
v_policy_count;
RAISE NOTICE '══════════════════════════════════════════════════════════';
END IF;
END $$;