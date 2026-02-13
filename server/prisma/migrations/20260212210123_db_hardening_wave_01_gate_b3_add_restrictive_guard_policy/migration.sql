-- TEXQTIC DB-HARDENING-WAVE-01 (Gate B.3)
-- Migration: Add RESTRICTIVE Guard Policy for Tenant Isolation
-- DOCTRINE: TexQtic v1.4 Constitutional RLS (Section 6)
-- OBJECTIVE: Fix PERMISSIVE policy OR-leak by adding RESTRICTIVE guard
--
-- PROBLEM DIAGNOSED:
--   Two PERMISSIVE policies (bypass_select, tenant_select) are ORd
--   Test evidence shows ALL tenant rows returned regardless of org_id match
--   RLS not enforcing tenant_id filtering despite correct context
--
-- ROOT CAUSE:
--   Multiple PERMISSIVE policies create OR semantics
--   One overly-broad policy leaks all data
--   Need AND semantics to enforce fail-closed
--
-- SOLUTION (Option 2 from diagnostic guidance):
--   Add RESTRICTIVE policy that ANDs with existing PERMISSIVE policies
--   Forces: (require_org_context() AND (tenant_id = current_org_id() OR bypass))
--   Maintains bypass for seeding, enforces tenant isolation for queries
-- Policy: catalog_items_guard (RESTRICTIVE)
-- Purpose AND with all other policies to enforce tenant boundary
-- Semantics: Row visible ONLY IF (has context AND matches tenant) OR bypass
CREATE POLICY catalog_items_guard ON public.catalog_items AS RESTRICTIVE FOR
SELECT USING (
    app.require_org_context()
    AND (
      tenant_id = app.current_org_id()
      OR app.bypass_enabled()
    )
  );