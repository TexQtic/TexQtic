-- ============================================================================
-- G028-C3: Control-Plane Reasoning Log Persistence
-- Unit: PW5-G028-C3-REASONING-STORAGE
--
-- Changes (Slice 3 only — no unrelated DDL):
--   1. Make reasoning_logs.tenant_id nullable (enables control-plane rows).
--   2. Add admin_actor_id, request_fingerprint, request_bucket_start columns.
--   3. Partial unique index for pre-execution control-plane idempotency.
--   4. Admin INSERT policy (is_admin + tenant_id IS NULL).
--   5. Admin SELECT policy (is_admin = 'true').
--
-- Prerequisites:
--   G-023 migration must be applied (reasoning_logs table + base RLS).
--
-- RLS functions used: current_setting() built-in (no helper function deps).
-- Role: texqtic_app (matches G-023 pattern).
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Make tenant_id nullable
-- Allows control-plane rows to store tenant_id = NULL (no tenant association).
-- Existing tenant-scoped rows are unaffected (they retain their tenant_id value).
-- ============================================================================
ALTER TABLE public.reasoning_logs
ALTER COLUMN tenant_id DROP NOT NULL;
-- ============================================================================
-- §2: Add control-plane columns
-- admin_actor_id       — SUPER_ADMIN UUID (from verified JWT only)
-- request_fingerprint  — SHA256(safePrompt) computed before model invocation
-- request_bucket_start — Prompt time normalised to 15-minute boundary
-- ============================================================================
ALTER TABLE public.reasoning_logs
ADD COLUMN IF NOT EXISTS admin_actor_id UUID,
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS request_bucket_start TIMESTAMPTZ;
-- ============================================================================
-- §3: Partial unique index — pre-execution control-plane idempotency
--
-- Enforces: one finalized row per (admin, fingerprint, bucket) tuple.
-- Partial condition (admin_actor_id IS NOT NULL AND tenant_id IS NULL) ensures
-- this index applies ONLY to control-plane rows; tenant rows are unaffected.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS reasoning_logs_cp_idem_uq ON public.reasoning_logs (
  admin_actor_id,
  request_fingerprint,
  request_bucket_start
)
WHERE admin_actor_id IS NOT NULL
  AND tenant_id IS NULL;
-- ============================================================================
-- §4: Admin INSERT policy
--
-- Allows SUPER_ADMIN to insert control-plane reasoning rows (tenant_id IS NULL).
-- current_setting('app.is_admin', true): true = return empty string on missing
-- key (safe default: empty ≠ 'true').
-- ============================================================================
DROP POLICY IF EXISTS reasoning_logs_admin_insert ON public.reasoning_logs;
CREATE POLICY reasoning_logs_admin_insert ON public.reasoning_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    AND tenant_id IS NULL
  );
-- ============================================================================
-- §5: Admin SELECT policy
--
-- Allows SUPER_ADMIN to read ALL reasoning_logs rows (both tenant-scoped and
-- control-plane). Tenant SELECT policy already scopes tenant reads to own rows.
-- ============================================================================
DROP POLICY IF EXISTS reasoning_logs_admin_select ON public.reasoning_logs;
CREATE POLICY reasoning_logs_admin_select ON public.reasoning_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    current_setting('app.is_admin', true) = 'true'
  );
COMMIT;