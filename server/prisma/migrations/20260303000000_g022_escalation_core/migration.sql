-- ============================================================================
-- G-022 Day 2: Escalation Core — Schema + RLS + Triggers + D-022 Directives
-- Task ID:    G-022-DAY2-SCHEMA-SERVICE
-- Doctrine:   v1.4 + Addendum Draft v1 + G-022 Design v1.1 (APPROVED)
-- Date:       2026-03-03
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: APPROVED 2026-02-24
--   D-022-A (monotonic severity upgrade)  · D-022-B (org freeze via escalation_events)
--   D-022-C (kill switch non-propagation) · D-022-D (override + maker-checker lock)
-- ============================================================================
--
-- INVARIANTS
--   - ADDITIVE ONLY. No existing table is modified. No existing policy touched.
--   - FORCE RLS on every new table. No table bypasses RLS.
--   - app.org_id is the ONLY canonical RLS variable (app.tenant_id: NEVER used).
--   - org_id → organizations.id is a LIVE FK.
--   - escalation_events is APPEND-ONLY (immutability trigger + RLS UPDATE/DELETE = false).
--   - D-022-A: parent_escalation_id IS NOT NULL triggers severity monotonicity trigger.
--   - D-022-B: org freeze stored as entity_type='ORG' row — NO boolean on organizations.
--   - D-022-C: LEVEL_4 sets freeze_recommendation=true only — does NOT touch config.
--   - D-022-D: override path must record escalation resolution before SM.transition().
--
-- OBJECTS CREATED
--   §1  PRE-FLIGHT safety check
--   §2  TABLE   public.escalation_events
--   §3  FUNCTION public.escalation_events_immutability()           [E-022-IMMUTABLE]
--   §4  TRIGGER  trg_escalation_events_immutability ON escalation_events
--   §5  FUNCTION public.escalation_severity_upgrade_check()        [D-022-A]
--   §6  TRIGGER  trg_escalation_severity_upgrade ON escalation_events
--   §7  RLS      ENABLE + FORCE + policies × 5 on escalation_events
--   §8  GRANTS   texqtic_app / texqtic_admin
--   §9  VERIFY   inline DO $$ block
--
-- SOFT REFERENCE NOTICE (recorded for future hardening)
--   G-023: ALTER TABLE public.escalation_events
--            ADD COLUMN reasoning_log_id UUID REFERENCES public.reasoning_logs(id);
--   G-021: ALTER TABLE public.pending_approvals
--            ADD CONSTRAINT pending_approvals_escalation_id_fk
--            FOREIGN KEY (escalation_id) REFERENCES public.escalation_events(id);
-- ============================================================================
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §1  PRE-FLIGHT SAFETY CHECK
--     Abort if prerequisite tables are absent or migration already applied.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- Require organizations (G-015 Phase A)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'organizations'
) THEN RAISE EXCEPTION 'G-022 PRE-FLIGHT BLOCKED: public.organizations does not exist. Apply G-015 Phase A migration before this migration.';
END IF;
-- Require lifecycle_states (G-020 must precede G-022)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'lifecycle_states'
) THEN RAISE EXCEPTION 'G-022 PRE-FLIGHT BLOCKED: public.lifecycle_states does not exist. Apply G-020 Day 2 migration (20260301000000_g020_lifecycle_state_machine_core) before this migration.';
END IF;
-- Require pending_approvals (G-021 must precede G-022)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'pending_approvals'
) THEN RAISE EXCEPTION 'G-022 PRE-FLIGHT BLOCKED: public.pending_approvals does not exist. Apply G-021 Day 2 migration (20260302000000_g021_maker_checker_core) before this migration.';
END IF;
-- Idempotency guard: abort if already applied
IF EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'escalation_events'
) THEN RAISE EXCEPTION 'G-022 PRE-FLIGHT BLOCKED: public.escalation_events already exists. Migration 20260303000000_g022_escalation_core may already be applied.';
END IF;
RAISE NOTICE 'G-022 pre-flight OK: organizations + lifecycle_states + pending_approvals present, escalation_events absent. Proceeding.';
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §2  TABLE: public.escalation_events
--
--  Append-only governance escalation record.
--  Covers entity-level (TRADE, ESCROW, APPROVAL, LIFECYCLE_LOG),
--  org-level (ORG), and global (GLOBAL) escalation events.
--
--  D-022-A: parent_escalation_id enables monotonic severity upgrade chain.
--  D-022-B: entity_type='ORG' replaces any boolean freeze column on organizations.
--  D-022-C: freeze_recommendation=true on GLOBAL rows is informational only.
--  No UPDATE or DELETE is ever permitted (enforced by trigger §4 + RLS §7).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE public.escalation_events (
  -- ── Identity ─────────────────────────────────────────────────────
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ── Org boundary (live FK, RLS anchor) ───────────────────────────
  -- For entity_type='GLOBAL': org_id is a sentinel/platform-level UUID.
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- ── Entity scope ─────────────────────────────────────────────────
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'TRADE',
      'ESCROW',
      'APPROVAL',
      'LIFECYCLE_LOG',
      'ORG',
      'GLOBAL'
    )
  ),
  -- For entity_type='ORG': entity_id = org_id (D-022-B).
  -- For entity_type='GLOBAL': entity_id = sentinel constant UUID.
  entity_id UUID NOT NULL,
  -- ── D-022-A: Severity upgrade chain link ─────────────────────────
  -- NULL for first-created escalation. Set to prior row's id when upgrading.
  -- Trigger §6 enforces: new.severity_level > parent.severity_level
  --                      parent.status = 'OPEN'
  parent_escalation_id UUID NULL REFERENCES public.escalation_events(id) ON DELETE RESTRICT,
  -- ── Event metadata ────────────────────────────────────────────────
  source TEXT NOT NULL CHECK (
    source IN ('STATE_MACHINE', 'APPROVAL', 'MANUAL', 'SYSTEM')
  ),
  severity_level INTEGER NOT NULL CHECK (severity_level IN (0, 1, 2, 3, 4)),
  -- ── D-022-C: Informational only — no automated side effects ──────
  -- Set true only on entity_type='GLOBAL' LEVEL_4 rows.
  -- Reading this flag never triggers config changes automatically.
  freeze_recommendation BOOLEAN NOT NULL DEFAULT false,
  -- ── Actor identity ────────────────────────────────────────────────
  triggered_by_actor_type TEXT NOT NULL CHECK (
    triggered_by_actor_type IN (
      'PLATFORM_ADMIN',
      'TENANT_ADMIN',
      'SYSTEM_AUTOMATION',
      'SERVICE_LAYER'
    )
  ),
  triggered_by_principal TEXT NOT NULL,
  -- sub/fingerprint of initiating actor
  -- ── Reason ────────────────────────────────────────────────────────
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 0),
  -- ── Status (OPEN → RESOLVED or OPEN → OVERRIDDEN, append-only) ───
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'OVERRIDDEN')),
  -- ── Resolution fields (NULL until resolved) ───────────────────────
  resolved_by_principal TEXT NULL,
  resolution_reason TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  -- ── Timestamps ────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- resolved_by_principal + resolution_reason must both be non-null when status != 'OPEN'
  -- (Enforced at service layer — partial NOT NULL constraint not natively available in PG
  --  without a trigger; service layer is Layer 1, trigger is optional Layer 2 hardening.)
);
-- ── Indexes ─────────────────────────────────────────────────────────────────
-- Entity freeze check: primary query for checkEntityFreeze()
CREATE INDEX escalation_events_entity_freeze_idx ON public.escalation_events (entity_type, entity_id, status, severity_level);
-- Org freeze check: primary query for checkOrgFreeze()
CREATE INDEX escalation_events_org_freeze_idx ON public.escalation_events (entity_type, entity_id, status, severity_level)
WHERE entity_type = 'ORG';
-- Org-scoped list (tenant read query)
CREATE INDEX escalation_events_org_id_idx ON public.escalation_events (org_id, created_at DESC);
-- Parent chain traversal (D-022-A upgrade queries)
CREATE INDEX escalation_events_parent_idx ON public.escalation_events (parent_escalation_id)
WHERE parent_escalation_id IS NOT NULL;
COMMENT ON TABLE public.escalation_events IS 'G-022: Append-only governance escalation record. Covers entity/org/global scope. Severity monotonic (D-022-A). Org freeze via entity_type=ORG row (D-022-B). No UPDATE or DELETE permitted (trigger + RLS). See docs/governance/G-022_ESCALATION_DESIGN.md v1.1.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §3  FUNCTION: escalation_events_immutability()
--     Enforcement Layer 2: DB trigger rejects UPDATE and DELETE.
--     This is the DB-level backstop; service layer is Layer 1.
--     Mirrors G-021 prevent_approval_signature_modification() pattern.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.escalation_events_immutability() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'escalation_events are append-only. DELETE is forbidden. [E-022-IMMUTABLE] Row id: %',
  OLD.id;
END IF;
IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'escalation_events are append-only. UPDATE is forbidden. [E-022-IMMUTABLE] Row id: %, attempted field(s) may include status/severity. Use INSERT with a new resolution row instead.',
OLD.id;
END IF;
RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.escalation_events_immutability() IS 'G-022 Layer 2: Rejects any UPDATE or DELETE on escalation_events. Error code: [E-022-IMMUTABLE]. Mirrors G-021 approval_signatures pattern.';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §4  TRIGGER: trg_escalation_events_immutability
--     Fires BEFORE UPDATE OR DELETE on escalation_events.
--     Raises [E-022-IMMUTABLE] unconditionally.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TRIGGER trg_escalation_events_immutability BEFORE
UPDATE
  OR DELETE ON public.escalation_events FOR EACH ROW EXECUTE FUNCTION public.escalation_events_immutability();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §5  FUNCTION: escalation_severity_upgrade_check()
--     D-022-A: Enforces monotonic severity upgrade rule.
--     On INSERT where parent_escalation_id IS NOT NULL:
--       1. Parent row must exist.
--       2. Parent row must be status = 'OPEN'.
--       3. new.severity_level must be strictly > parent.severity_level.
--     Prevents: hidden downgrade, escalation overwrite, severity erasure.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.escalation_severity_upgrade_check() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_parent_severity INTEGER;
v_parent_status TEXT;
BEGIN -- Only enforce when a parent is specified AND this is a new OPEN escalation.
-- RESOLVED / OVERRIDDEN rows link to their resolved target for history tracing;
-- they are NOT severity upgrades and must bypass the monotonicity check.
--
-- GUARD: resolution rows MUST have a parent. An orphan RESOLVED/OVERRIDDEN row
-- (parent_escalation_id IS NULL) would have no audit lineage and could be used
-- to create a fake "already resolved" signal. Forbidden unconditionally.
IF NEW.status IN ('RESOLVED', 'OVERRIDDEN')
AND NEW.parent_escalation_id IS NULL THEN RAISE EXCEPTION '[E-022-ORPHAN-RESOLUTION] % rows must reference a parent escalation via parent_escalation_id. Orphan resolution rows are forbidden. Insert rejected to preserve audit lineage integrity.',
NEW.status;
END IF;
-- Root OPEN rows (no parent) and child resolution rows (parent present) both pass here.
IF NEW.parent_escalation_id IS NULL
OR NEW.status IN ('RESOLVED', 'OVERRIDDEN') THEN RETURN NEW;
END IF;
-- Fetch parent row
SELECT severity_level,
  status INTO v_parent_severity,
  v_parent_status
FROM public.escalation_events
WHERE id = NEW.parent_escalation_id;
-- Parent must exist (FK handles this, but belt-and-suspenders check)
IF NOT FOUND THEN RAISE EXCEPTION 'D-022-A violation: parent_escalation_id % does not exist in escalation_events. [E-022-PARENT-NOT-FOUND]',
NEW.parent_escalation_id;
END IF;
-- Parent must be OPEN (only OPEN escalations may be upgraded)
IF v_parent_status <> 'OPEN' THEN RAISE EXCEPTION 'D-022-A violation: parent escalation % has status "%" - only OPEN escalations may be upgraded. [E-022-PARENT-NOT-OPEN]',
NEW.parent_escalation_id,
v_parent_status;
END IF;
-- New severity must be strictly greater than parent severity (NO equal, NO lower)
IF NEW.severity_level <= v_parent_severity THEN RAISE EXCEPTION 'D-022-A violation: new severity_level % is not strictly greater than parent severity_level % for escalation %. Severity downgrade and equal-severity re-insert are forbidden. [E-022-SEVERITY-DOWNGRADE]',
NEW.severity_level,
v_parent_severity,
NEW.parent_escalation_id;
END IF;
RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.escalation_severity_upgrade_check() IS 'D-022-A: Enforces strictly monotonic severity upgrade chain. Orphan resolution guard: RESOLVED/OVERRIDDEN rows must have parent_escalation_id set. Error codes: [E-022-ORPHAN-RESOLUTION] [E-022-PARENT-NOT-FOUND] [E-022-PARENT-NOT-OPEN] [E-022-SEVERITY-DOWNGRADE].';
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §6  TRIGGER: trg_escalation_severity_upgrade
--     Fires BEFORE INSERT on escalation_events.
--     Runs escalation_severity_upgrade_check() for every new row.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TRIGGER trg_escalation_severity_upgrade BEFORE
INSERT ON public.escalation_events FOR EACH ROW EXECUTE FUNCTION public.escalation_severity_upgrade_check();
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §7  RLS: escalation_events
--     ENABLE + FORCE ensures all sessions (including superuser via role) go through RLS.
--     Policies:
--       escalation_events_tenant_select — tenant reads own org's escalations
--       escalation_events_admin_select  — platform admin reads all
--       escalation_events_tenant_insert — tenant inserts own org rows (service layer)
--       escalation_events_admin_insert  — platform admin inserts any row
--       (no UPDATE or DELETE policies — immutability enforced via trigger)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events FORCE ROW LEVEL SECURITY;
-- Tenant: SELECT own org's escalation events
CREATE POLICY escalation_events_tenant_select ON public.escalation_events FOR
SELECT USING (
    org_id::text = current_setting('app.org_id', true)
  );
-- Platform admin: SELECT all escalation events (cross-org visibility for operations)
CREATE POLICY escalation_events_admin_select ON public.escalation_events FOR
SELECT USING (current_setting('app.is_admin', true) = 'true');
-- Tenant: INSERT only within own org (service layer enforces org match before call)
CREATE POLICY escalation_events_tenant_insert ON public.escalation_events FOR
INSERT WITH CHECK (
    org_id::text = current_setting('app.org_id', true)
  );
-- Platform admin: INSERT with any org_id (for cross-org escalation creation)
CREATE POLICY escalation_events_admin_insert ON public.escalation_events FOR
INSERT WITH CHECK (current_setting('app.is_admin', true) = 'true');
-- Explicit guard: UPDATE is forbidden via immutability trigger (§3–4).
-- No UPDATE policy is defined — all UPDATE attempts will be blocked by the trigger
-- *before* RLS evaluation reaches the table (BEFORE triggers run first).
-- This is belt-and-suspenders: trigger fires, then RLS would also deny.
-- Explicit guard: DELETE is forbidden via immutability trigger (§3–4).
-- Same reasoning as UPDATE — trigger fires before RLS.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §8  GRANTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$ BEGIN -- texqtic_app: SELECT + INSERT only (no UPDATE, no DELETE)
IF EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_app'
) THEN
GRANT SELECT,
  INSERT ON public.escalation_events TO texqtic_app;
RAISE NOTICE 'G-022: Granted SELECT+INSERT on escalation_events to texqtic_app';
ELSE RAISE NOTICE 'G-022: Role texqtic_app not found — skipping grant (test environment)';
END IF;
-- texqtic_admin: SELECT + INSERT only (no UPDATE, no DELETE — even admin cannot mutate)
IF EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = 'texqtic_admin'
) THEN
GRANT SELECT,
  INSERT ON public.escalation_events TO texqtic_admin;
RAISE NOTICE 'G-022: Granted SELECT+INSERT on escalation_events to texqtic_admin';
ELSE RAISE NOTICE 'G-022: Role texqtic_admin not found — skipping grant (test environment)';
END IF;
END;
$$;
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- §9  VERIFICATION
--     Inline assertions — raise EXCEPTION if anything is wrong.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE v_count INTEGER;
v_rls_on BOOLEAN;
v_rls_forced BOOLEAN;
BEGIN -- 1. Table exists
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'escalation_events'
) THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: escalation_events table not found';
END IF;
-- 2. RLS enabled + forced
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_on,
  v_rls_forced
FROM pg_class
WHERE relname = 'escalation_events'
  AND relnamespace = 'public'::regnamespace;
IF NOT v_rls_on THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: RLS not enabled on escalation_events';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: FORCE RLS not set on escalation_events';
END IF;
-- 3. Policies: expect at least 4
SELECT COUNT(*) INTO v_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'escalation_events';
IF v_count < 4 THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: expected >= 4 RLS policies on escalation_events, found %',
v_count;
END IF;
-- 4. Immutability trigger exists
IF NOT EXISTS (
  SELECT 1
  FROM pg_trigger
  WHERE tgname = 'trg_escalation_events_immutability'
) THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: trg_escalation_events_immutability trigger not found';
END IF;
-- 5. Severity upgrade trigger exists
IF NOT EXISTS (
  SELECT 1
  FROM pg_trigger
  WHERE tgname = 'trg_escalation_severity_upgrade'
) THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: trg_escalation_severity_upgrade trigger not found';
END IF;
-- 6. Required columns exist
SELECT COUNT(*) INTO v_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'escalation_events'
  AND column_name IN (
    'id',
    'org_id',
    'entity_type',
    'entity_id',
    'parent_escalation_id',
    'source',
    'severity_level',
    'freeze_recommendation',
    'triggered_by_actor_type',
    'triggered_by_principal',
    'reason',
    'status',
    'resolved_by_principal',
    'resolution_reason',
    'created_at',
    'resolved_at'
  );
IF v_count < 16 THEN RAISE EXCEPTION 'G-022 VERIFY FAIL: expected 16 columns on escalation_events, found %',
v_count;
END IF;
RAISE NOTICE 'G-022 VERIFY PASS: escalation_events table, RLS, triggers, columns all confirmed.';
END;
$$;