-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION: 20260303120000_g022_p2_cert_entity_type
-- Gap:       GAP-G022-02
-- Sync:      GOVERNANCE-SYNC-047
-- Doctrine:  v1.4 + G-022 Design v1.1 + D-022-B
--
-- Objective:
--   Extend escalation_events.entity_type CHECK constraint to include
--   'CERTIFICATION', matching the updated EscalationEntityType TS union.
--
-- Why a constraint ALTER and not a migration re-create:
--   The original migration (20260303000000_g022_escalation_core) created the
--   entity_type CHECK inline without a name; PostgreSQL auto-named it
--   escalation_events_entity_type_check.  We DROP and re-ADD with the same
--   name so any dependent indexes / catalog references remain consistent.
--
-- Sections:
--   §0  PRE-FLIGHT  verify escalation_events exists; new constraint absent
--   §1  ALTER       DROP old CHECK + ADD new CHECK including 'CERTIFICATION'
--   §2  VERIFIER    DO-block asserts constraint is in catalog + value accepted
--
-- Approved commands:
--   ALTER TABLE … DROP CONSTRAINT IF EXISTS …
--   ALTER TABLE … ADD CONSTRAINT … CHECK (…)
--   DO $$ … $$
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─────────────────────────────────────────────────────────────────────────────
-- §0  PRE-FLIGHT
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Verify escalation_events table exists (G-022 must be applied)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'escalation_events'
  ) THEN
    RAISE EXCEPTION '[G-022-P2 FAIL] public.escalation_events does not exist. Apply 20260303000000_g022_escalation_core first.';
  END IF;

  -- Verify CERTIFICATION is not already in the constraint (idempotency guard)
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'escalation_events_entity_type_check'
      AND check_clause LIKE '%CERTIFICATION%'
  ) THEN
    RAISE NOTICE '[G-022-P2] CERTIFICATION already present in entity_type constraint -- migration may be a replay. Skipping.';
    -- Do NOT raise exception: allow idempotent replay
  END IF;

  RAISE NOTICE '[G-022-P2] Pre-flight OK: escalation_events present, CERTIFICATION absent from constraint. Proceeding.';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- §1  ALTER TABLE: extend entity_type CHECK to include CERTIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old auto-named CHECK constraint (present since 20260303000000_g022_escalation_core)
ALTER TABLE public.escalation_events
  DROP CONSTRAINT IF EXISTS escalation_events_entity_type_check;

-- Re-add with CERTIFICATION included.
-- Values mirror EscalationEntityType union in server/src/services/escalation.types.ts.
ALTER TABLE public.escalation_events
  ADD CONSTRAINT escalation_events_entity_type_check
    CHECK (
      entity_type IN (
        'TRADE',
        'ESCROW',
        'APPROVAL',
        'LIFECYCLE_LOG',
        'ORG',
        'GLOBAL',
        'CERTIFICATION'
      )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- §2  VERIFIER DO-BLOCK (asserts schema correctness at migration time)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_constraint_present  BOOLEAN;
  v_cert_in_constraint  BOOLEAN;
BEGIN
  -- Verify constraint exists in pg_catalog
  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'escalation_events_entity_type_check'
  ) INTO v_constraint_present;

  IF NOT v_constraint_present THEN
    RAISE EXCEPTION '[G-022-P2 VERIFIER FAIL] escalation_events_entity_type_check constraint not found after ALTER.';
  END IF;

  -- Verify CERTIFICATION is in the constraint expression
  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'escalation_events_entity_type_check'
      AND check_clause LIKE '%CERTIFICATION%'
  ) INTO v_cert_in_constraint;

  IF NOT v_cert_in_constraint THEN
    RAISE EXCEPTION '[G-022-P2 VERIFIER FAIL] CERTIFICATION not present in escalation_events_entity_type_check after ALTER.';
  END IF;

  RAISE NOTICE '[G-022-P2 VERIFIER OK] escalation_events_entity_type_check present and includes CERTIFICATION.';
END;
$$;
