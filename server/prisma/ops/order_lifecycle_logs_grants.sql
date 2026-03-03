-- OPS / GAP-ORDER-LC-001: unblock order_lifecycle_logs lifecycle writes
-- TECS: OPS-ORDER-LC-LOGS-GRANT-001 | GOVERNANCE-SYNC-060A
-- Purpose: Grant base SELECT + INSERT privileges on order_lifecycle_logs
--          to texqtic_app and app_user so that RLS policies can evaluate.
--          RLS policies (guard + select_unified + insert_unified) were applied
--          in B1 migration (20260315000005_gap_order_lc_001_schema_foundation)
--          but base table privileges were never granted, causing Postgres
--          code 42501 "permission denied for table order_lifecycle_logs"
--          on every INSERT attempt by the SM checkout + PATCH transitions.
-- Precedent: rcp1_orders_update_grant.sql (same pattern, same root cause)
-- Roles:  texqtic_app — primary RLS-enforced app role (tenant + admin paths)
--         app_user    — secondary role used by Prisma direct connection paths
-- Note:   UPDATE + DELETE are intentionally NOT granted (append-only table;
--         PERMISSIVE UPDATE/DELETE RLS policies are already blocked via
--         "USING (false)" — double enforcement).
-- Applied: 2026-03-03 via DATABASE_URL psql (Supabase Postgres)
-- Committed: for auditability and reproducibility (ops trail)
BEGIN;
GRANT SELECT, INSERT ON TABLE public.order_lifecycle_logs TO texqtic_app;
GRANT SELECT, INSERT ON TABLE public.order_lifecycle_logs TO app_user;
COMMIT;
-- Verification query (run after apply):
--   SELECT grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_name = 'order_lifecycle_logs'
--     AND grantee IN ('texqtic_app', 'app_user')
--   ORDER BY grantee, privilege_type;
-- Expected rows:
--   app_user    | INSERT
--   app_user    | SELECT
--   texqtic_app | INSERT
--   texqtic_app | SELECT
