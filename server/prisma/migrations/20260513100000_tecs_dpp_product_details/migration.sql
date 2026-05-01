-- ============================================================================
-- TECS-DPP-PASSPORT-NETWORK-013 — Product Passport Data Depth
-- Migration: 20260513100000_tecs_dpp_product_details
--
-- PURPOSE
--   Adds dpp_product_details table for structured product identity and
--   material composition data per DPP traceability node.
--
-- DESIGN DECISIONS (from TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md §16)
--   - Separate DPP-specific table (not altering broad catalog/traceability tables)
--   - material_composition stored as JSONB array for v1 flexibility
--   - One details row per (org_id, node_id) — unique constraint enforced
--   - node_id FK to traceability_nodes ON DELETE CASCADE
--   - product_photo_evidence_item_id nullable FK to dpp_evidence_items (no circular dep)
--   - RLS pattern matches 20260513000000_tecs_dpp_evidence_vault
--
-- ADDITIVE ONLY — no destructive changes to existing tables
-- ============================================================================
-- ─── Create table ─────────────────────────────────────────────────────────────
CREATE TABLE public.dpp_product_details (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  node_id UUID NOT NULL,
  sku TEXT,
  style_code TEXT,
  batch_lot_number TEXT,
  product_description TEXT,
  season_or_model_year TEXT,
  facility_name TEXT,
  country_of_origin TEXT,
  material_composition JSONB,
  recycled_content_percent NUMERIC(5, 2),
  organic_content_percent NUMERIC(5, 2),
  dye_finish_category TEXT,
  restricted_substances_declared BOOLEAN,
  product_photo_evidence_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dpp_product_details_pkey PRIMARY KEY (id),
  -- One details row per org_id + node_id
  CONSTRAINT dpp_product_details_org_node_unique UNIQUE (org_id, node_id),
  -- FK: node must belong to the same org (CASCADE delete when node deleted)
  CONSTRAINT dpp_product_details_node_id_fk FOREIGN KEY (node_id) REFERENCES public.traceability_nodes (id) ON DELETE CASCADE ON UPDATE NO ACTION,
  -- FK: org must exist
  CONSTRAINT dpp_product_details_org_id_fk FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON UPDATE NO ACTION,
  -- FK: optional photo evidence item (nullable, no ON DELETE to avoid circular dep)
  CONSTRAINT dpp_product_details_photo_evidence_fk FOREIGN KEY (product_photo_evidence_item_id) REFERENCES public.dpp_evidence_items (id) ON DELETE
  SET NULL ON UPDATE NO ACTION,
    -- Text field length guards
    CONSTRAINT dpp_product_details_sku_len CHECK (
      sku IS NULL
      OR char_length(sku) <= 100
    ),
    CONSTRAINT dpp_product_details_style_code_len CHECK (
      style_code IS NULL
      OR char_length(style_code) <= 100
    ),
    CONSTRAINT dpp_product_details_batch_lot_len CHECK (
      batch_lot_number IS NULL
      OR char_length(batch_lot_number) <= 200
    ),
    CONSTRAINT dpp_product_details_description_len CHECK (
      product_description IS NULL
      OR char_length(product_description) <= 2000
    ),
    CONSTRAINT dpp_product_details_season_len CHECK (
      season_or_model_year IS NULL
      OR char_length(season_or_model_year) <= 100
    ),
    CONSTRAINT dpp_product_details_facility_len CHECK (
      facility_name IS NULL
      OR char_length(facility_name) <= 300
    ),
    CONSTRAINT dpp_product_details_country_len CHECK (
      country_of_origin IS NULL
      OR char_length(country_of_origin) <= 100
    ),
    CONSTRAINT dpp_product_details_dye_finish_len CHECK (
      dye_finish_category IS NULL
      OR char_length(dye_finish_category) <= 100
    ),
    -- Percentage range guards
    CONSTRAINT dpp_product_details_recycled_range CHECK (
      recycled_content_percent IS NULL
      OR (
        recycled_content_percent >= 0
        AND recycled_content_percent <= 100
      )
    ),
    CONSTRAINT dpp_product_details_organic_range CHECK (
      organic_content_percent IS NULL
      OR (
        organic_content_percent >= 0
        AND organic_content_percent <= 100
      )
    )
);
-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_dpp_product_details_org_id ON public.dpp_product_details (org_id);
CREATE INDEX idx_dpp_product_details_node_id ON public.dpp_product_details (node_id);
-- ─── updated_at trigger ───────────────────────────────────────────────────────
-- Use same approach as evidence vault: update updated_at on row change.
CREATE OR REPLACE FUNCTION public.set_dpp_product_details_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
CREATE TRIGGER trg_dpp_product_details_updated_at BEFORE
UPDATE ON public.dpp_product_details FOR EACH ROW EXECUTE FUNCTION public.set_dpp_product_details_updated_at();
-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.dpp_product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_product_details FORCE ROW LEVEL SECURITY;
-- Restrictive guard (fail-closed) — blocks all access unless app.current_org_id() matches
CREATE POLICY dpp_product_details_restrictive ON public.dpp_product_details AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive SELECT — tenant reads own product details
CREATE POLICY dpp_product_details_select ON public.dpp_product_details FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- Permissive INSERT — tenant creates own product details
CREATE POLICY dpp_product_details_insert ON public.dpp_product_details FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- Permissive UPDATE — tenant updates own product details
CREATE POLICY dpp_product_details_update ON public.dpp_product_details FOR
UPDATE TO texqtic_app USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
-- ─── Grants ───────────────────────────────────────────────────────────────────
GRANT SELECT,
  INSERT,
  UPDATE ON public.dpp_product_details TO texqtic_app;