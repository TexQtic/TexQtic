-- =============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001 (feature flag seed)
-- Migration:  nc_pool_rfq_award_feature_flag_seed
-- Sequence:   20260534000000
-- Date:       2026-05-12
-- Summary:    Seeds the global feature flag for the pool RFQ award sub-feature.
--
--             Flag seeded:
--               key     = 'nc.procurement_pools.rfq.award.enabled'
--               enabled = false (disabled by default)
--
--             Safety invariants:
--               - INSERT ... ON CONFLICT (key) DO NOTHING — idempotent-safe.
--               - enabled is seeded false; never activated in this migration.
--               - nc.procurement_pools.supplier_quotes.enabled is NOT touched.
--               - No quote data is mutated.
--
--             Authority sources:
--               TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001 §6.2, §11
--
--             Design decisions:
--               AD-7: Award flag is independent of supplier_quotes flag (QD-6).
--               QD-6: nc.procurement_pools.supplier_quotes.enabled remains false.
-- =============================================================================
-- §1  Pre-flight guard ---------------------------------------------------------
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
) THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED PRE-FLIGHT BLOCKED: public.feature_flags does not exist. Apply init migration first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
) THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED PRE-FLIGHT BLOCKED: public.network_pool_rfq_supplier_quotes does not exist. Apply 20260531000000_nc_pool_supplier_quote_schema first.';
END IF;
-- Verify the award schema migration has been applied (accepted_at column must exist)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
    AND column_name = 'accepted_at'
) THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED PRE-FLIGHT BLOCKED: column accepted_at missing on network_pool_rfq_supplier_quotes. Apply 20260533000000_nc_pool_rfq_supplier_quote_award_schema first.';
END IF;
END $$;
-- §2  Seed: nc.procurement_pools.rfq.award.enabled ----------------------------
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
    'nc.procurement_pools.rfq.award.enabled',
    false,
    'NC Phase 1D: pool RFQ award / quote acceptance feature — global enable. Must be false until per-tenant provisioning is authorized (AD-7). Independent of nc.procurement_pools.supplier_quotes.enabled (QD-6).',
    NULL,
    NOW()
  ) ON CONFLICT (key) DO NOTHING;
-- §3  Post-flight verification -------------------------------------------------
DO $$
DECLARE v_flag_exists BOOLEAN;
v_flag_enabled BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM public.feature_flags
    WHERE key = 'nc.procurement_pools.rfq.award.enabled'
  ) INTO v_flag_exists;
IF NOT v_flag_exists THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED POST-FLIGHT: flag row not found after INSERT. key=nc.procurement_pools.rfq.award.enabled';
END IF;
SELECT enabled
FROM public.feature_flags
WHERE key = 'nc.procurement_pools.rfq.award.enabled' INTO v_flag_enabled;
IF v_flag_enabled IS TRUE THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default. key=nc.procurement_pools.rfq.award.enabled';
END IF;
-- Verify supplier_quotes.enabled was not accidentally touched
IF EXISTS (
  SELECT 1
  FROM public.feature_flags
  WHERE key = 'nc.procurement_pools.supplier_quotes.enabled'
    AND enabled = true
) THEN RAISE EXCEPTION 'NC-AWARD-FEATURE-FLAG-SEED POST-FLIGHT: nc.procurement_pools.supplier_quotes.enabled is true — QD-6 hold violated. This migration must not have changed it, but manual state is wrong.';
END IF;
RAISE NOTICE 'NC-AWARD-FEATURE-FLAG-SEED POST-FLIGHT PASSED. key=nc.procurement_pools.rfq.award.enabled, enabled=false ✓. QD-6 hold intact ✓.';
END $$;