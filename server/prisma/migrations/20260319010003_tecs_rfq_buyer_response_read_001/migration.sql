BEGIN;
-- Domain owner: tenant
-- Plane: tenant-plane
-- Lifecycle: read dependency fix
-- Reason: preserve verified buyer RFQ detail contract while exposing bounded supplier response payload
-- Indexes: none
-- RLS: no policy change; grant existing texqtic_service BYPASSRLS resolver role minimal read access only
GRANT SELECT ON public.catalog_items TO texqtic_service;
GRANT SELECT ON public.rfq_supplier_responses TO texqtic_service;
COMMENT ON ROLE texqtic_service IS 'G-026 domain resolver role. NOLOGIN, BYPASSRLS. SELECT on tenants + tenant_domains + bounded RFQ dependency tables (catalog_items, rfq_supplier_responses). Reachable via SET LOCAL ROLE by postgres within explicitly-scoped resolver transactions.';
DO $$
DECLARE v_has_catalog_items_sel boolean;
DECLARE v_has_rfq_responses_sel boolean;
BEGIN
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'catalog_items'
      AND privilege_type = 'SELECT'
  ) INTO v_has_catalog_items_sel;
SELECT EXISTS(
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'texqtic_service'
      AND table_schema = 'public'
      AND table_name = 'rfq_supplier_responses'
      AND privilege_type = 'SELECT'
  ) INTO v_has_rfq_responses_sel;
IF NOT v_has_catalog_items_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on catalog_items';
END IF;
IF NOT v_has_rfq_responses_sel THEN RAISE EXCEPTION 'VERIFIER FAIL: texqtic_service missing SELECT on rfq_supplier_responses';
END IF;
RAISE NOTICE 'VERIFIER PASS: texqtic_service has SELECT on catalog_items and rfq_supplier_responses';
END $$;
COMMIT;