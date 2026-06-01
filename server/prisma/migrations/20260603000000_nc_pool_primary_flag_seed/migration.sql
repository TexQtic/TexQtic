-- ============================================================================
-- TEXQTIC-FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-001
-- Task ID:    FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001
-- Doctrine:   v1.4 + FAM-08D GAP-T3-01A remediation
-- Date:       2026-06-03
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: FAM-08 launch readiness authorized track
-- ============================================================================
--
-- PURPOSE
--   Canonically seed the two missing NC primary feature flag rows:
--     key = 'nc.procurement_pools.enabled'     enabled = true
--     key = 'nc.procurement_pools.rfq.enabled' enabled = true
--
--   These are the Layer 1 global gate flags for:
--     ncPoolFeatureGateMiddleware
--     ncPoolRfqFeatureGateMiddleware
--
--   These flags were previously absent from all migrations. In production they
--   exist only due to integration test side-effects and Packet 15 psql ops
--   (TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001, 2026-06-02).
--
--   This migration establishes a canonical, reproducible seeding path for all
--   environments: dev, staging, and production.
--
-- IDEMPOTENCY
--   INSERT ... ON CONFLICT (key) DO UPDATE SET enabled, description, updated_at.
--   Safe for production (rows exist: will update description + updated_at).
--   Safe for fresh environments (rows absent: will insert).
--   ON CONFLICT DO UPDATE is intentional — unlike sub-feature kill-switches
--   (which use DO NOTHING), these primary platform defaults must be on and
--   their canonical descriptions must be applied even if a row already exists.
--
-- REMEDIATION REFERENCE
--   FAM-08D T-3 GAP-T3-01A
--   Artifact: FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001.md
--
-- DOES NOT TOUCH
--   nc.procurement_pools.supplier_invites.enabled (OD-6)
--   nc.procurement_pools.supplier_quotes.enabled  (QD-6)
--   nc.procurement_pools.rfq.award.enabled        (AD-7)
--   nc.procurement_pools.settlement.enabled       (1H)
--   ttp_enabled (kill-switch — separate foundation migration)
--   tenant_feature_overrides (no per-tenant rows created)
-- ============================================================================
-- ─── §1  PRE-FLIGHT SAFETY CHECK ─────────────────────────────────────────────
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
) THEN RAISE EXCEPTION 'FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED PRE-FLIGHT BLOCKED: public.feature_flags does not exist. Apply init migration first.';
END IF;
END $$;
-- ─── §2  SEED: nc.procurement_pools.enabled + nc.procurement_pools.rfq.enabled
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
    'nc.procurement_pools.enabled',
    true,
    'NC Phase 1: procurement pools feature primary platform default — global enable. Layer 1 of ncPoolFeatureGateMiddleware. Independent of sub-feature flags (supplier_invites, supplier_quotes, rfq.award, settlement).',
    NULL,
    NOW()
  ),
  (
    'nc.procurement_pools.rfq.enabled',
    true,
    'NC Phase 1: procurement pool RFQ feature primary platform default — global enable. Layer 1 of ncPoolRfqFeatureGateMiddleware. Requires nc.procurement_pools.enabled = true.',
    NULL,
    NOW()
  ) ON CONFLICT (key) DO
UPDATE
SET enabled = EXCLUDED.enabled,
  description = EXCLUDED.description,
  updated_at = NOW();
-- ─── §3  POST-FLIGHT VERIFICATION ────────────────────────────────────────────
DO $$
DECLARE v_pool_enabled BOOLEAN;
v_rfq_enabled BOOLEAN;
BEGIN
SELECT enabled
FROM public.feature_flags
WHERE key = 'nc.procurement_pools.enabled' INTO v_pool_enabled;
IF v_pool_enabled IS NOT TRUE THEN RAISE EXCEPTION 'FAM-08D1 POST-FLIGHT: nc.procurement_pools.enabled not found or not true.';
END IF;
SELECT enabled
FROM public.feature_flags
WHERE key = 'nc.procurement_pools.rfq.enabled' INTO v_rfq_enabled;
IF v_rfq_enabled IS NOT TRUE THEN RAISE EXCEPTION 'FAM-08D1 POST-FLIGHT: nc.procurement_pools.rfq.enabled not found or not true.';
END IF;
RAISE NOTICE 'FAM-08D1 POST-FLIGHT PASSED. nc.procurement_pools.enabled=true, nc.procurement_pools.rfq.enabled=true.';
END $$;