-- ============================================================================
-- TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001 (feature flag seed)
-- Task ID:    TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001
-- Doctrine:   v1.4 + TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001
-- Date:       2026-05-31
-- Author:     TexQtic Platform Engineering (Safe-Write Mode)
-- Constitutional Review: NC Phase 1C authorized track
-- ============================================================================
--
-- PURPOSE
--   Seed the global feature flag for the supplier quote sub-feature:
--     key = 'nc.procurement_pools.supplier_quotes.enabled'
--     enabled = false (disabled by default — requires per-tenant override to activate)
--
--   This flag is consumed by ncPoolSupplierQuoteFeatureGateMiddleware (Layer 1).
--   Per-tenant activation requires a TenantFeatureOverride row with the same key
--   and enabled = true (Layer 2 — applied manually per provisioned supplier org).
--
-- IDEMPOTENCY
--   INSERT ... ON CONFLICT (key) DO NOTHING.
--   Safe to apply multiple times.
--
-- PROVISIONING NOTE (QD-6)
--   To activate the supplier quote feature for a specific supplier org, a
--   TenantFeatureOverride row must be inserted separately (outside this migration):
--
--   INSERT INTO public.tenant_feature_overrides (tenant_id, key, enabled, updated_at)
--   VALUES ('<supplier_org_id>', 'nc.procurement_pools.supplier_quotes.enabled', true, NOW())
--   ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
--
--   NEVER apply this automatically for all tenants.
--   Supplier orgs that need this feature require overrides for both:
--     nc.procurement_pools.supplier_invites.enabled
--     nc.procurement_pools.supplier_quotes.enabled
--   Note: QD-6 — quote gate is independent from invite gate.
--
-- PRE-FLIGHT
--   Requires public.feature_flags to exist (prerequisite: init migration).
--   Requires public.network_pool_rfq_supplier_quotes to exist (prerequisite: 20260531000000).
-- ============================================================================
-- ─── §1  PRE-FLIGHT SAFETY CHECK ─────────────────────────────────────────────
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
) THEN RAISE EXCEPTION 'NC-SUPPLIER-QUOTE-FEATURE-FLAG-SEED PRE-FLIGHT BLOCKED: public.feature_flags does not exist. Apply init migration first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'network_pool_rfq_supplier_quotes'
) THEN RAISE EXCEPTION 'NC-SUPPLIER-QUOTE-FEATURE-FLAG-SEED PRE-FLIGHT BLOCKED: public.network_pool_rfq_supplier_quotes does not exist. Apply 20260531000000_nc_pool_supplier_quote_schema first.';
END IF;
END $$;
-- ─── §2  SEED: nc.procurement_pools.supplier_quotes.enabled ──────────────────
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
    'nc.procurement_pools.supplier_quotes.enabled',
    false,
    'NC Phase 1C global kill-switch for supplier quote sub-feature. Must be false until per-tenant provisioning is authorized (QD-6). Layer 1 of ncPoolSupplierQuoteFeatureGateMiddleware. Does not imply nc.procurement_pools.enabled, nc.procurement_pools.rfq.enabled, or nc.procurement_pools.supplier_invites.enabled.',
    NULL,
    NOW()
  ) ON CONFLICT (key) DO NOTHING;
-- ─── §3  POST-FLIGHT VERIFICATION ────────────────────────────────────────────
DO $$
DECLARE v_flag_exists BOOLEAN;
v_flag_enabled BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT 1
    FROM public.feature_flags
    WHERE key = 'nc.procurement_pools.supplier_quotes.enabled'
  ) INTO v_flag_exists;
IF NOT v_flag_exists THEN RAISE EXCEPTION 'NC-SUPPLIER-QUOTE-FEATURE-FLAG-SEED POST-FLIGHT: flag row not found after INSERT.';
END IF;
SELECT enabled
FROM public.feature_flags
WHERE key = 'nc.procurement_pools.supplier_quotes.enabled' INTO v_flag_enabled;
IF v_flag_enabled IS TRUE THEN RAISE EXCEPTION 'NC-SUPPLIER-QUOTE-FEATURE-FLAG-SEED POST-FLIGHT: flag is enabled=true — must be false by default.';
END IF;
RAISE NOTICE 'NC-SUPPLIER-QUOTE-FEATURE-FLAG-SEED: POST-FLIGHT PASSED. key=nc.procurement_pools.supplier_quotes.enabled, enabled=false.';
END $$;