-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001 (feature flag seed)
-- Migration:  nc_settlement_waterfall_flag_seed
-- Sequence:   20260536000000
-- Date:       2026-06-01
-- Summary:    Seeds the global feature flag for NC settlement waterfall:
--               key     = 'nc.settlement_waterfall.enabled'
--               enabled = false (disabled by default — MUST remain false)
--
--             This flag is the global kill-switch for the NC pool settlement
--             waterfall computation feature (Phase 1H).
--             Must be seeded false and NEVER activated in this migration.
--
--             Safety invariants:
--               - INSERT ... ON CONFLICT (key) DO NOTHING — idempotent.
--               - enabled is seeded false; activation requires explicit
--                 per-tenant provisioning and platform admin approval.
--               - No other flags are touched.
--               - No money movement, payout, or escrow logic.
--
--             Pre-flight requirements:
--               - public.feature_flags must exist (prerequisite: init migration)
--               - public.network_settlement_splits must exist (prerequisite: 20260535000000)
--
--             Authority:
--               TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001
--               TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001 §Phase 1H
-- =============================================================================
-- §1  Pre-flight guard
-- §2  Seed: nc.settlement_waterfall.enabled
-- §3  Post-flight verification
-- =============================================================================
-- §1  Pre-flight guard --------------------------------------------------------
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
) THEN RAISE EXCEPTION 'NC-SETTLEMENT-WATERFALL-FLAG-SEED PRE-FLIGHT BLOCKED: public.feature_flags does not exist. Apply init migration first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_settlement_splits'
) THEN RAISE EXCEPTION 'NC-SETTLEMENT-WATERFALL-FLAG-SEED PRE-FLIGHT BLOCKED: public.network_settlement_splits does not exist. Apply 20260535000000_nc_network_settlement_splits first.';
END IF;
END $$;
-- §2  Seed: nc.settlement_waterfall.enabled -----------------------------------
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
    'nc.settlement_waterfall.enabled',
    false,
    'NC Phase 1H: global kill-switch for NC pool settlement waterfall computation. Must be false until settlement service and per-tenant provisioning is fully authorized. Does not imply nc.procurement_pools.enabled or any sub-feature flag.',
    NULL,
    NOW()
  ) ON CONFLICT (key) DO NOTHING;
-- §3  Post-flight verification ------------------------------------------------
DO $$
DECLARE v_flag_exists BOOLEAN;
v_flag_enabled BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM public.feature_flags
    WHERE key = 'nc.settlement_waterfall.enabled'
  ) INTO v_flag_exists;
IF NOT v_flag_exists THEN RAISE EXCEPTION 'NC-SETTLEMENT-WATERFALL-FLAG-SEED POST-FLIGHT: flag row not found after INSERT. key=nc.settlement_waterfall.enabled';
END IF;
SELECT enabled
FROM public.feature_flags
WHERE key = 'nc.settlement_waterfall.enabled' INTO v_flag_enabled;
IF v_flag_enabled IS TRUE THEN RAISE EXCEPTION 'NC-SETTLEMENT-WATERFALL-FLAG-SEED POST-FLIGHT: flag is enabled=true — MUST be false by default. key=nc.settlement_waterfall.enabled';
END IF;
-- Verify existing RFQ award hold is intact (guardrail QD-AD7)
IF EXISTS (
  SELECT 1
  FROM public.feature_flags
  WHERE key = 'nc.procurement_pools.rfq.award.enabled'
    AND enabled = true
) THEN RAISE EXCEPTION 'NC-SETTLEMENT-WATERFALL-FLAG-SEED POST-FLIGHT: nc.procurement_pools.rfq.award.enabled is true — QD-AD7 hold violated.';
END IF;
RAISE NOTICE 'NC-SETTLEMENT-WATERFALL-FLAG-SEED POST-FLIGHT PASSED. key=nc.settlement_waterfall.enabled, enabled=false. QD-AD7 hold intact.';
END $$;