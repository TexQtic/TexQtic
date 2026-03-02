-- OPS / RCP-1: unblock order status transitions endpoint
-- Purpose: allow Prisma DB role to perform UPDATE on orders (RLS remains in effect)
-- Cause:   PG 42501 "permission denied for table orders" at tx.order.update()
-- Fix:     Table-level privilege grant ONLY — no schema change, no RLS policy change
-- Roles:   texqtic_app (tenanted app role with RLS policies) + app_user
--          Both previously had only ar (INSERT+SELECT); UPDATE (w) was absent.
-- Applied: 2026-03-02 via DATABASE_URL psql (Supabase Postgres) — BEGIN/GRANT/GRANT/COMMIT
-- Committed: for auditability and reproducibility
BEGIN;
GRANT UPDATE ON TABLE public.orders TO texqtic_app;
GRANT UPDATE ON TABLE public.orders TO app_user;
-- Column-scoped alternative (least privilege):
-- REVOKE UPDATE ON TABLE public.orders FROM texqtic_app;
-- GRANT UPDATE (status, updated_at) ON TABLE public.orders TO texqtic_app;
COMMIT;
-- If audit_log insert fails next (same transaction), apply separately:
-- BEGIN;
-- GRANT INSERT ON TABLE public.audit_logs TO texqtic_app;
-- GRANT INSERT ON TABLE public.audit_logs TO app_user;
-- COMMIT;