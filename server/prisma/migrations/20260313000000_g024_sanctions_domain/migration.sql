-- ============================================================================
-- G-024: Sanctions Domain -- Schema + RLS + Enforcement Functions
--
-- Purpose:
--   1. Create public.sanctions table (org-scoped, optional entity-scoped).
--   2. Enable + Force RLS on sanctions.
--   3. RESTRICTIVE guard (fail-closed) with admin pass-through.
--   4. Admin-only SELECT policy (no tenant SELECT -- enforcement via SECURITY DEFINER).
--   5. SECURITY DEFINER enforcement functions (bypass RLS for runtime checks):
--         public.is_org_sanctioned(p_org_id UUID, p_min_severity SMALLINT) RETURNS BOOLEAN
--         public.is_entity_sanctioned(p_entity_type TEXT, p_entity_id UUID, p_min_severity SMALLINT) RETURNS BOOLEAN
--   6. updated_at trigger.
--   7. Verification block.
--
-- Design note on tenant visibility:
--   Tenants do NOT have a SELECT policy on sanctions rows. This prevents gaming
--   the system by querying whether they have an active sanction before taking an
--   action. Enforcement is provided entirely via SECURITY DEFINER helper functions
--   which the application service layer (SanctionsService) calls without exposing
--   raw policy details.
--
-- Governance:
--   - org_id FK to organizations(id) (canonical entity, same UUID as tenants.id).
--   - optional entity_type + entity_id for per-entity sanctions.
--   - escalation_event_id FK to escalation_events(id) ON DELETE RESTRICT.
--   - CHECK: (entity_type IS NULL) = (entity_id IS NULL) -- null parity.
--   - sanction_type CHECK: FRICTION | SUPPRESSION | FEATURE_RESTRICTION | SUSPENDED |
--     PERMANENT_BAN
--   - status CHECK: ACTIVE | DECAYED | LIFTED
--   - severity CHECK: 1 <= severity <= 5
--   - Blocking threshold: severity >= 2 (severity 1 is friction-only, non-blocking)
--
-- Roles: texqtic_app (matches all prior domain table patterns).
-- RLS functions: app.require_org_context(), app.current_org_id(), app.bypass_enabled()
-- Admin gate: current_setting('app.is_admin', true) = 'true'
--
-- NOT included (deferred):
--   - Sanction create/lift/decay REST routes (admin-plane -- out of G-024 scope for routes only)
--   - CERTIFICATION entity_type in EscalationEntityType enum extension (separate TECS)
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Create public.sanctions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RLS boundary: every sanction is scoped to one organization.
  -- FK to organizations (canonical cross-plane entity; same UUID as tenants.id).
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- Optional: secondary entity-level scope.
  -- Both must be NULL or both must be set (enforced by CHECK below).
  entity_type TEXT NULL,
  entity_id UUID NULL,
  -- Sanction classification.
  sanction_type TEXT NOT NULL,
  -- Risk severity: 1=Friction(non-blocking) 2=Suppression 3=Hard-block 4=Suspended 5=Permanent
  severity SMALLINT NOT NULL DEFAULT 1,
  -- Lifecycle status.
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  -- Mandatory justification (non-empty enforced by APP layer; DB supplies non-null).
  reason TEXT NOT NULL,
  -- Actor metadata: who imposed the sanction.
  imposed_by_actor TEXT NOT NULL,
  imposed_by_principal TEXT NOT NULL,
  -- Optional link to an escalation event that triggered this sanction.
  escalation_event_id UUID NULL REFERENCES public.escalation_events(id) ON DELETE RESTRICT,
  -- Optional TTL: NULL means no decay configured.
  decays_at TIMESTAMPTZ NULL,
  -- Lifecycle: NULL until lifted.
  lifted_at TIMESTAMPTZ NULL,
  lifted_by_principal TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Entity null-parity: entity_type and entity_id must both be NULL or both non-NULL.
  CONSTRAINT sanctions_entity_null_parity CHECK (
    (entity_type IS NULL) = (entity_id IS NULL)
  ),
  -- Sanction type enforcement.
  CONSTRAINT sanctions_type_check CHECK (
    sanction_type IN (
      'FRICTION',
      'SUPPRESSION',
      'FEATURE_RESTRICTION',
      'SUSPENDED',
      'PERMANENT_BAN'
    )
  ),
  -- Status enforcement.
  CONSTRAINT sanctions_status_check CHECK (
    status IN ('ACTIVE', 'DECAYED', 'LIFTED')
  ),
  -- Severity range: 1 (friction) to 5 (permanent ban).
  CONSTRAINT sanctions_severity_range CHECK (
    severity BETWEEN 1 AND 5
  )
);
-- ============================================================================
-- §2: Indexes on public.sanctions
-- ============================================================================
-- Active org sanctions ordered by severity (enforcement hot path).
CREATE INDEX IF NOT EXISTS sanctions_active_org_severity_idx ON public.sanctions(org_id, severity)
WHERE status = 'ACTIVE';
-- Active entity sanctions (secondary enforcement check).
CREATE INDEX IF NOT EXISTS sanctions_active_entity_severity_idx ON public.sanctions(entity_type, entity_id, severity)
WHERE status = 'ACTIVE'
  AND entity_id IS NOT NULL;
-- General org + created_at index for admin queries.
CREATE INDEX IF NOT EXISTS sanctions_org_id_created_idx ON public.sanctions(org_id, created_at DESC);
-- ============================================================================
-- §3: ENABLE + FORCE Row Level Security
-- ============================================================================
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- §4: updated_at trigger for public.sanctions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sanctions_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sanctions_set_updated_at ON public.sanctions;
CREATE TRIGGER trg_sanctions_set_updated_at BEFORE
UPDATE ON public.sanctions FOR EACH ROW EXECUTE FUNCTION public.sanctions_set_updated_at();
-- ============================================================================
-- §5: RLS Policies -- public.sanctions
--
-- Pattern: mirrors G-017 admin-inclusive pattern (GOVERNANCE-SYNC-007).
--   Guard (RESTRICTIVE FOR ALL):
--     - Pass: org context present | bypass (test/seed) | admin realm (is_admin)
--     - Fail: everything else (anonymous, wrong context, cross-tenant without admin)
--   Admin SELECT (PERMISSIVE): all rows when is_admin = 'true'
--   NOTE: No tenant SELECT policy -- tenants CANNOT see their own sanction rows.
--         Enforcement is provided via SECURITY DEFINER functions (see §6).
-- ============================================================================
-- Guard (RESTRICTIVE): fail-closed
DROP POLICY IF EXISTS sanctions_guard ON public.sanctions;
CREATE POLICY sanctions_guard ON public.sanctions AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
  OR current_setting('app.is_admin', true) = 'true'
);
COMMENT ON POLICY sanctions_guard ON public.sanctions IS 'RESTRICTIVE fail-closed guard. Permits access only when: org context set (tenant), bypass active (test/seed), or admin realm (is_admin=true). Mirrors G-024 admin-inclusive guard pattern.';
-- Admin SELECT: cross-tenant read when is_admin context is active
DROP POLICY IF EXISTS sanctions_admin_select ON public.sanctions;
CREATE POLICY sanctions_admin_select ON public.sanctions AS PERMISSIVE FOR
SELECT TO texqtic_app USING (current_setting('app.is_admin', true) = 'true');
COMMENT ON POLICY sanctions_admin_select ON public.sanctions IS 'PERMISSIVE admin SELECT: cross-tenant read when app.is_admin=true (control/admin realm only). No tenant boundary enforced.';
-- ============================================================================
-- §6: GRANT -- texqtic_app gets SELECT only (admin reads via is_admin policy)
-- ============================================================================
GRANT SELECT,
  INSERT,
  UPDATE ON public.sanctions TO texqtic_app;
-- ============================================================================
-- §7: SECURITY DEFINER Enforcement Functions
--
-- These functions bypass RLS (run as owner) so the application service layer
-- can enforce sanctions regardless of the current tenant context.
-- They are intentionally READ-ONLY (no writes); they return BOOLEAN.
-- GRANT EXECUTE to texqtic_app enables the service layer to call them.
-- ============================================================================
-- Function 1: Is an org sanctioned at or above p_min_severity?
CREATE OR REPLACE FUNCTION public.is_org_sanctioned(
    p_org_id UUID,
    p_min_severity SMALLINT DEFAULT 2
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM public.sanctions
    WHERE org_id = p_org_id
      AND status = 'ACTIVE'
      AND severity >= p_min_severity
      AND entity_type IS NULL -- org-level sanction only
      AND entity_id IS NULL
  ) INTO v_exists;
RETURN v_exists;
END;
$$;
COMMENT ON FUNCTION public.is_org_sanctioned(UUID, SMALLINT) IS 'G-024 enforcement: returns TRUE if the given org has an ACTIVE sanction at or above the minimum severity (default 2). SECURITY DEFINER -- bypasses RLS. Used by SanctionsService for all enforcement checks.';
GRANT EXECUTE ON FUNCTION public.is_org_sanctioned(UUID, SMALLINT) TO texqtic_app;
-- Function 2: Is a specific entity sanctioned at or above p_min_severity?
CREATE OR REPLACE FUNCTION public.is_entity_sanctioned(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_min_severity SMALLINT DEFAULT 2
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM public.sanctions
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND status = 'ACTIVE'
      AND severity >= p_min_severity
  ) INTO v_exists;
RETURN v_exists;
END;
$$;
COMMENT ON FUNCTION public.is_entity_sanctioned(TEXT, UUID, SMALLINT) IS 'G-024 enforcement: returns TRUE if the given entity (type+id) has an ACTIVE sanction at or above the minimum severity (default 2). SECURITY DEFINER -- bypasses RLS. Used by SanctionsService for entity-level enforcement checks.';
GRANT EXECUTE ON FUNCTION public.is_entity_sanctioned(TEXT, UUID, SMALLINT) TO texqtic_app;
-- ============================================================================
-- §8: Verification block -- fails migration on any violated invariant
-- ============================================================================
DO $$
DECLARE v_sanctions_exists BOOLEAN;
v_orgs_exists BOOLEAN;
v_esc_exists BOOLEAN;
v_sanctions_rls BOOLEAN;
v_sanctions_force BOOLEAN;
v_policy_count INT;
v_guard_exists BOOLEAN;
v_admin_sel_exists BOOLEAN;
v_fn_org_exists BOOLEAN;
v_fn_entity_exists BOOLEAN;
v_active_org_idx BOOLEAN;
v_active_entity_idx BOOLEAN;
BEGIN -- 1) sanctions table must exist
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'sanctions'
  ) INTO v_sanctions_exists;
IF NOT v_sanctions_exists THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-024 FAIL] sanctions table not found after CREATE'
);
END IF;
-- 2) organizations table must exist (G-015 dependency)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
  ) INTO v_orgs_exists;
IF NOT v_orgs_exists THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-024 FAIL] organizations table not found -- G-015 must be applied first'
);
END IF;
-- 3) escalation_events table must exist (G-022 dependency)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'escalation_events'
  ) INTO v_esc_exists;
IF NOT v_esc_exists THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-024 FAIL] escalation_events table not found -- G-022 must be applied first'
);
END IF;
-- 4) sanctions RLS enabled + forced
SELECT relrowsecurity,
  relforcerowsecurity INTO v_sanctions_rls,
  v_sanctions_force
FROM pg_class
WHERE relname = 'sanctions'
  AND relnamespace = 'public'::regnamespace;
IF NOT (
  v_sanctions_rls
  AND v_sanctions_force
) THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-024 FAIL] sanctions missing ENABLE/FORCE RLS (rls=%s, force=%s)',
  v_sanctions_rls,
  v_sanctions_force
);
END IF;
-- 5) Policy count: 2 (guard RESTRICTIVE + admin_select PERMISSIVE)
SELECT COUNT(*) INTO v_policy_count
FROM pg_policies
WHERE tablename = 'sanctions'
  AND schemaname = 'public';
IF v_policy_count < 2 THEN RAISE EXCEPTION USING MESSAGE = format(
  '[G-024 FAIL] sanctions expected >= 2 RLS policies, found %s',
  v_policy_count
);
END IF;
-- 6) Guard policy exists and is RESTRICTIVE
SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'sanctions'
      AND schemaname = 'public'
      AND policyname = 'sanctions_guard'
      AND permissive = 'RESTRICTIVE'
  ) INTO v_guard_exists;
IF NOT v_guard_exists THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] sanctions_guard RESTRICTIVE policy not found';
END IF;
-- 7) Admin select policy exists
SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'sanctions'
      AND schemaname = 'public'
      AND policyname = 'sanctions_admin_select'
  ) INTO v_admin_sel_exists;
IF NOT v_admin_sel_exists THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] sanctions_admin_select policy not found';
END IF;
-- 8) is_org_sanctioned function exists
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_org_sanctioned'
  ) INTO v_fn_org_exists;
IF NOT v_fn_org_exists THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] is_org_sanctioned function not found';
END IF;
-- 9) is_entity_sanctioned function exists
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_entity_sanctioned'
  ) INTO v_fn_entity_exists;
IF NOT v_fn_entity_exists THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] is_entity_sanctioned function not found';
END IF;
-- 10) Active org index exists
SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'sanctions'
      AND schemaname = 'public'
      AND indexname = 'sanctions_active_org_severity_idx'
  ) INTO v_active_org_idx;
IF NOT v_active_org_idx THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] sanctions_active_org_severity_idx not found';
END IF;
-- 11) Active entity index exists
SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'sanctions'
      AND schemaname = 'public'
      AND indexname = 'sanctions_active_entity_severity_idx'
  ) INTO v_active_entity_idx;
IF NOT v_active_entity_idx THEN RAISE EXCEPTION USING MESSAGE = '[G-024 FAIL] sanctions_active_entity_severity_idx not found';
END IF;
RAISE NOTICE '[G-024 PASS] sanctions domain migration verified: table=OK rls=OK force=OK policies=% guard=OK admin_select=OK fn_org=OK fn_entity=OK idx_org=OK idx_entity=OK',
v_policy_count;
END;
$$;
COMMIT;