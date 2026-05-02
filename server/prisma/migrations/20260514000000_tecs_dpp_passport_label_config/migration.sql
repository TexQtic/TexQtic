-- TECS-DPP-PASSPORT-NETWORK-020 — White-Label Passport Naming
-- Slice: tenant-configurable buyer-facing DPP passport label (Option C)
-- Additive migration: creates dpp_passport_label_config table with full RLS.
-- No data migration required. No destructive changes.
-- Apply manually via: psql "$DATABASE_URL" -f <this file>
-- After apply: prisma db pull && prisma generate && restart server.
CREATE TABLE public.dpp_passport_label_config (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  public_title TEXT,
  buyer_facing_label TEXT NOT NULL DEFAULT 'Verified Supply Chain Passport',
  subtitle TEXT,
  show_texqtic_brand BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dpp_passport_label_config_pkey PRIMARY KEY (id),
  CONSTRAINT dpp_passport_label_config_org_id_key UNIQUE (org_id),
  CONSTRAINT dpp_passport_label_config_buyer_facing_label_check CHECK (
    char_length(trim(buyer_facing_label)) >= 1
    AND char_length(buyer_facing_label) <= 80
  ),
  CONSTRAINT dpp_passport_label_config_public_title_check CHECK (
    public_title IS NULL
    OR char_length(public_title) <= 120
  ),
  CONSTRAINT dpp_passport_label_config_subtitle_check CHECK (
    subtitle IS NULL
    OR char_length(subtitle) <= 180
  )
);
-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Pattern mirrors dpp_passport_states RLS (hotfix migration 20260512000000).
-- RESTRICTIVE policy acts as fail-closed default; permissive policies add
-- the minimum access required per operation.
ALTER TABLE public.dpp_passport_label_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_passport_label_config FORCE ROW LEVEL SECURITY;
-- Fail-closed: any row where org_id ≠ current org is invisible/blocked.
CREATE POLICY dpp_passport_label_config_restrictive ON public.dpp_passport_label_config AS RESTRICTIVE TO texqtic_app USING (org_id = app.current_org_id());
-- SELECT: tenant can read their own config row.
CREATE POLICY dpp_passport_label_config_select ON public.dpp_passport_label_config FOR
SELECT TO texqtic_app USING (org_id = app.current_org_id());
-- INSERT: tenant can create their config row (org_id must match).
CREATE POLICY dpp_passport_label_config_insert ON public.dpp_passport_label_config FOR
INSERT TO texqtic_app WITH CHECK (org_id = app.current_org_id());
-- UPDATE: tenant can update their own row only.
CREATE POLICY dpp_passport_label_config_update ON public.dpp_passport_label_config FOR
UPDATE TO texqtic_app USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
-- Grant DML to app role (SELECT already implied by policies; explicit is safer).
GRANT SELECT,
  INSERT,
  UPDATE ON public.dpp_passport_label_config TO texqtic_app;
-- Allow public-lookup role to SELECT for the public passport read path.
-- No INSERT/UPDATE: public role must never write.
GRANT SELECT ON public.dpp_passport_label_config TO texqtic_public_lookup;