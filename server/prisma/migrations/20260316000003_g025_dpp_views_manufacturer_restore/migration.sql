-- ============================================================================
-- G-025 TECS 5C1: DPP Snapshot Views — Manufacturer Fields Restore
-- TECS ID   : G-025-DPP-VIEWS-MANUFACTURER-RESTORE-001
-- Governance: GOVERNANCE-SYNC-086
-- Date      : 2026-03-05
-- Predecessor: TECS 5B (commit afcf47e) — G-025-ORGS-RLS-001 ✅ VALIDATED
--
-- Context:
--   TECS 4B (GOVERNANCE-SYNC-081) removed manufacturer_* columns from
--   dpp_snapshot_products_v1 due to D4 Gate FAIL (organizations RLS blocked
--   tenant-realm SELECT). G-025-ORGS-RLS-001 is now VALIDATED — organizations
--   tenant self-read is enabled via:
--     PERMISSIVE SELECT USING (id = app.current_org_id())
--
--   This migration adds the 3 manufacturer fields back using a LEFT JOIN on
--   organizations, sourced from the locked D2 design anchor
--   (docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md §5.1):
--     manufacturer_name          → organizations.legal_name
--     manufacturer_jurisdiction  → organizations.jurisdiction
--     manufacturer_registration_no → organizations.registration_no (nullable)
--
-- Join key: organizations.id = traceability_nodes.org_id
--           (confirmed: traceability_nodes.org_id is the tenant FK to organizations)
--
-- Security model:
--   View remains SECURITY INVOKER — organizations FORCE RLS fires on JOIN.
--   Tenant session: can now read own org row (id = app.current_org_id());
--   manufacturer_* columns will be populated for nodes belonging to caller's org.
--   Admin/bypass context: reads all org rows without restriction.
--   LEFT JOIN: preserves node rows even if org row is not visible in current context.
--
-- Minimal delta: ONLY dpp_snapshot_products_v1 is modified.
--   dpp_snapshot_lineage_v1 and dpp_snapshot_certifications_v1 are UNCHANGED.
--   No RLS policy changes. No schema changes. No server/src changes.
-- ============================================================================
BEGIN;
-- ============================================================================
-- S1: REPLACE VIEW — add manufacturer fields via organizations LEFT JOIN
-- ============================================================================
CREATE OR REPLACE VIEW public.dpp_snapshot_products_v1 WITH (security_invoker = true) AS
SELECT n.id AS node_id,
  n.org_id,
  n.batch_id,
  n.node_type,
  n.meta,
  n.geo_hash,
  n.visibility,
  n.created_at,
  n.updated_at,
  -- Manufacturer fields (G-025 D2 design anchor — conditional on D4 gate PASS)
  -- Source: organizations table, joined on org_id = id (tenancy key)
  o.legal_name AS manufacturer_name,
  o.jurisdiction AS manufacturer_jurisdiction,
  o.registration_no AS manufacturer_registration_no
FROM public.traceability_nodes n
  LEFT JOIN public.organizations o ON o.id = n.org_id;
-- ============================================================================
-- S2: RE-GRANT SELECT (idempotent — CREATE OR REPLACE VIEW preserves grants,
--     but explicit grant ensures correctness after any future DROP+CREATE)
-- ============================================================================
GRANT SELECT ON public.dpp_snapshot_products_v1 TO texqtic_app;
-- ============================================================================
-- S3: VERIFIER DO BLOCK
-- ============================================================================
DO $$
DECLARE v_view_exists INT;
v_col_manufacturer_name INT;
v_col_manufacturer_jur INT;
v_col_manufacturer_reg INT;
v_security_invoker INT;
v_grant_count INT;
BEGIN -- View exists
SELECT count(*) INTO v_view_exists
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_products_v1';
IF v_view_exists != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: dpp_snapshot_products_v1 not found in information_schema.views';
END IF;
-- manufacturer_name column present
SELECT count(*) INTO v_col_manufacturer_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_products_v1'
  AND column_name = 'manufacturer_name';
IF v_col_manufacturer_name != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: column manufacturer_name not found in dpp_snapshot_products_v1';
END IF;
-- manufacturer_jurisdiction column present
SELECT count(*) INTO v_col_manufacturer_jur
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_products_v1'
  AND column_name = 'manufacturer_jurisdiction';
IF v_col_manufacturer_jur != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: column manufacturer_jurisdiction not found in dpp_snapshot_products_v1';
END IF;
-- manufacturer_registration_no column present
SELECT count(*) INTO v_col_manufacturer_reg
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_products_v1'
  AND column_name = 'manufacturer_registration_no';
IF v_col_manufacturer_reg != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: column manufacturer_registration_no not found in dpp_snapshot_products_v1';
END IF;
-- security_invoker=true in reloptions
SELECT count(*) INTO v_security_invoker
FROM pg_class
WHERE relname = 'dpp_snapshot_products_v1'
  AND relnamespace = 'public'::regnamespace
  AND reloptions::text LIKE '%security_invoker%';
IF v_security_invoker != 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: security_invoker not present in reloptions for dpp_snapshot_products_v1';
END IF;
-- texqtic_app SELECT grant present
SELECT count(*) INTO v_grant_count
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'dpp_snapshot_products_v1'
  AND grantee = 'texqtic_app'
  AND privilege_type = 'SELECT';
IF v_grant_count < 1 THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_app SELECT grant missing on dpp_snapshot_products_v1';
END IF;
RAISE NOTICE 'VERIFIER PASS: dpp_snapshot_products_v1 manufacturer fields restored (G-025)';
END $$;
COMMIT;