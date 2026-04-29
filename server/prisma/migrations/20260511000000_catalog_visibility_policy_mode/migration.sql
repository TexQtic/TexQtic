-- Migration: 20260511000000_catalog_visibility_policy_mode
-- Unit: TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Slice B
-- Scope: Add durable item-level visibility policy column to catalog_items
--
-- Constitutional invariants:
--   1. publication_posture is NOT altered — it serves orthogonal public-projection semantics.
--   2. All existing rows remain NULL in catalog_visibility_policy_mode.
--   3. No data is migrated or mutated.
--   4. REGION_CHANNEL_SENSITIVE is intentionally excluded from the CHECK constraint.
--      It may only be added in a future explicitly authorized slice.
--   5. Rollback note (informational, NOT executed here):
--      ALTER TABLE public.catalog_items DROP COLUMN catalog_visibility_policy_mode;
-- ─── 1. Add nullable column ───────────────────────────────────────────────────
ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS catalog_visibility_policy_mode VARCHAR(30);
-- ─── 2. Add CHECK constraint ──────────────────────────────────────────────────
-- Allows NULL (fallback to publication_posture mapping) or one of the
-- five authorized storable policy modes.
ALTER TABLE public.catalog_items
ADD CONSTRAINT catalog_items_visibility_policy_mode_check CHECK (
    catalog_visibility_policy_mode IS NULL
    OR catalog_visibility_policy_mode IN (
      'PUBLIC',
      'AUTHENTICATED_ONLY',
      'APPROVED_BUYER_ONLY',
      'HIDDEN',
      'RELATIONSHIP_GATED'
    )
  );
-- ─── 3. Add partial index ─────────────────────────────────────────────────────
-- Covers the WHERE clause used by catalog browse + PDP route queries that
-- need to filter by non-null visibility policy mode within a tenant context.
-- Partial index avoids index bloat from the majority of NULL rows.
CREATE INDEX IF NOT EXISTS idx_catalog_items_visibility_policy_mode ON public.catalog_items (tenant_id, catalog_visibility_policy_mode)
WHERE catalog_visibility_policy_mode IS NOT NULL;