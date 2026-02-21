-- ============================================================================
-- Wave 2 — G-002: FORCE ROW LEVEL SECURITY on all tenant-scoped tables
-- ============================================================================
-- Purpose:
--   Ensure RLS cannot be bypassed by table owners or elevated roles (e.g. postgres).
--   Without FORCE, a session connecting as the table owner or a superuser bypasses
--   all RLS policies, creating a fail-open constitutional violation per Decision-0001.
--
-- Prerequisite:
--   G-001 (app.org_id unification) must be VALIDATED before this runs.
--   All policies now reference app.org_id exclusively.
--
-- Idempotent:
--   ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY is safe to re-run.
--   Double-applying is a no-op in PostgreSQL.
--
-- Applied via: psql --dbname=DATABASE_URL --file=this-file -v ON_ERROR_STOP=1
-- Commit: see git log after application
-- ============================================================================

-- ============================================================
-- COMMERCE TABLES
-- ============================================================

ALTER TABLE public.catalog_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items   FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.carts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts           FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.cart_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items      FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items     FORCE  ROW LEVEL SECURITY;

-- ============================================================
-- AI / OPS BASELINE TABLES
-- ============================================================

ALTER TABLE public.ai_budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_budgets                 FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.ai_usage_meters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_meters            FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                 FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.memberships                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships                FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.invites                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites                    FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.tenant_branding            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding            FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.tenant_domains             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains             FORCE  ROW LEVEL SECURITY;

ALTER TABLE public.tenant_feature_overrides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_overrides   FORCE  ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION (run after applying to confirm state)
-- ============================================================
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE relname IN (
--   'catalog_items','carts','cart_items','orders','order_items',
--   'ai_budgets','ai_usage_meters','audit_logs','memberships','invites',
--   'tenant_branding','tenant_domains','tenant_feature_overrides'
-- )
-- ORDER BY relname;
--
-- Expected for ALL rows:
--   relrowsecurity      = t
--   relforcerowsecurity = t
