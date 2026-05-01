-- ============================================================================
-- TECS-DPP-PASSPORT-NETWORK-014 — Trade Linkage Foundation
-- Migration: 20260513200000_tecs_dpp_trade_links
--
-- PURPOSE
--   Adds dpp_trade_links table to link DPP traceability nodes to trade-related
--   source objects (orders, RFQs, invoices, shipments, dispatch proof, etc.).
--
-- DESIGN DECISIONS (from TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md §8, §16)
--   - Generic source reference foundation: source_table + source_id (no FK to orders)
--   - Order model uses tenantId→tenants; DPP uses org_id→organizations: DIFFERENT boundaries.
--     FK to orders would cross domain boundaries unsafely. Generic soft-reference only.
--   - No buyer identity column in v1 — buyer org linkage requires explicit Paresh approval.
--   - link_type constrained by CHECK to 9 allowed values.
--   - visibility constrained by CHECK to 3 allowed values (PRIVATE/AUTHENTICATED_BUYER/PUBLIC_COUNT).
--   - Partial unique index: (org_id, node_id, link_type, source_table, source_id)
--     WHERE source_id IS NOT NULL — prevents duplicate hard-referenced trade links.
--   - Multiple-index strategy: org_id+node_id, visibility, link_type for query patterns.
--   - RLS pattern matches 20260513100000_tecs_dpp_product_details (ENABLE+FORCE, 4 policies).
--   - GRANT SELECT, INSERT, UPDATE to texqtic_app (no DELETE route in this slice).
--
-- ADDITIVE ONLY — no destructive changes to existing tables
-- ============================================================================
-- ─── Create table ─────────────────────────────────────────────────────────────
CREATE TABLE public.dpp_trade_links (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  node_id UUID NOT NULL,
  -- Trade link type: constrained to approved taxonomy
  link_type TEXT NOT NULL,
  -- Generic soft-reference: name of source table (e.g. 'orders', 'rfqs')
  source_table TEXT,
  -- Generic soft-reference: UUID of source record (no FK — cross-domain boundary)
  source_id UUID,
  -- Optional external/manual reference (e.g. PO number, invoice number)
  external_reference TEXT,
  -- Optional human-readable title for manual trade links
  title TEXT,
  -- Visibility level controlling future public surface treatment
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  -- When the trade event occurred (can differ from created_at)
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dpp_trade_links_pkey PRIMARY KEY (id),
  -- FK: node must belong to the same org (CASCADE delete when node deleted)
  CONSTRAINT dpp_trade_links_node_id_fk FOREIGN KEY (node_id) REFERENCES public.traceability_nodes (id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- FK: org must exist
  CONSTRAINT dpp_trade_links_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON UPDATE NO ACTION,
  -- link_type must be from the approved taxonomy
  CONSTRAINT dpp_trade_links_link_type_check CHECK (
    link_type IN (
      'RFQ',
      'ORDER',
      'INVOICE',
      'SHIPMENT',
      'BUYER_ACCEPTANCE',
      'DISPATCH_PROOF',
      'QC_REFERENCE',
      'PAYMENT_REFERENCE',
      'OTHER'
    )
  ),
  -- visibility must be from the approved set
  CONSTRAINT dpp_trade_links_visibility_check CHECK (
    visibility IN ('PRIVATE', 'AUTHENTICATED_BUYER', 'PUBLIC_COUNT')
  ),
  -- source_table: constrained length to block SQL-like injection attempts
  CONSTRAINT dpp_trade_links_source_table_len CHECK (
    source_table IS NULL
    OR (
      char_length(source_table) <= 100
      AND source_table ~ '^[a-z_][a-z0-9_]*$'
    )
  ),
  -- external_reference: trimmed max length
  CONSTRAINT dpp_trade_links_external_ref_len CHECK (
    external_reference IS NULL
    OR char_length(external_reference) <= 500
  ),
  -- title: max length
  CONSTRAINT dpp_trade_links_title_len CHECK (
    title IS NULL
    OR char_length(title) <= 300
  )
);
-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- Primary lookup: node's trade links for a tenant
CREATE INDEX idx_dpp_trade_links_org_node ON public.dpp_trade_links (org_id, node_id);
-- Visibility filtering (future: public count queries)
CREATE INDEX idx_dpp_trade_links_org_node_vis ON public.dpp_trade_links (org_id, node_id, visibility);
-- Link-type filtering (e.g. all orders linked to node)
CREATE INDEX idx_dpp_trade_links_org_node_type ON public.dpp_trade_links (org_id, node_id, link_type);
-- Partial unique index: prevent duplicate hard-referenced trade links
-- (same org, same node, same type, same source_table, same source_id)
-- Only enforced when source_id IS NOT NULL — manual/external links allow duplicates.
CREATE UNIQUE INDEX idx_dpp_trade_links_source_unique ON public.dpp_trade_links (
  org_id,
  node_id,
  link_type,
  source_table,
  source_id
)
WHERE source_id IS NOT NULL;
-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_dpp_trade_links_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
CREATE TRIGGER trg_dpp_trade_links_updated_at BEFORE
UPDATE ON public.dpp_trade_links FOR EACH ROW EXECUTE FUNCTION public.set_dpp_trade_links_updated_at();
-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.dpp_trade_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_trade_links FORCE ROW LEVEL SECURITY;
-- Restrictive guard (fail-closed) — blocks all access unless app.current_org_id() matches
CREATE POLICY dpp_trade_links_restrictive ON public.dpp_trade_links AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive SELECT — tenant reads own trade links
CREATE POLICY dpp_trade_links_select ON public.dpp_trade_links FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive INSERT — tenant creates own trade links
CREATE POLICY dpp_trade_links_insert ON public.dpp_trade_links FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- Permissive UPDATE — tenant updates own trade links (future update route)
CREATE POLICY dpp_trade_links_update ON public.dpp_trade_links FOR
UPDATE TO texqtic_app USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
-- ─── Grants ───────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT,
  UPDATE ON public.dpp_trade_links TO texqtic_app;