-- ============================================================================
-- G-023: Reasoning Hash + Reasoning Logs FK for AI Audit Events
--
-- Purpose:
--   1. Create reasoning_logs table (append-only, tenant-scoped RLS ENABLE+FORCE).
--   2. Add audit_logs.reasoning_log_id (nullable FK → reasoning_logs.id).
--   3. Immutability trigger on reasoning_logs (no UPDATE/DELETE).
--   4. RLS guard (RESTRICTIVE) + tenant SELECT/INSERT policies.
--
-- Roles used: texqtic_app only (matches G-022, G-021, G-020 patterns).
-- RLS functions: app.require_org_context(), app.current_org_id(), app.bypass_enabled()
-- ============================================================================
BEGIN;
-- ============================================================================
-- §1: Create reasoning_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reasoning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL,
  reasoning_hash TEXT NOT NULL,
  -- SHA-256 hex of prompt || response
  model TEXT NOT NULL,
  prompt_summary TEXT,
  -- First 200 chars of prompt (truncated)
  response_summary TEXT,
  -- First 200 chars of response (truncated)
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================================
-- §2: Add reasoning_log_id FK column to audit_logs (nullable)
-- ============================================================================
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS reasoning_log_id UUID REFERENCES public.reasoning_logs(id) ON DELETE
SET NULL;
CREATE INDEX IF NOT EXISTS audit_logs_reasoning_log_id_idx ON public.audit_logs(reasoning_log_id)
WHERE reasoning_log_id IS NOT NULL;
-- ============================================================================
-- §3: Indexes on reasoning_logs
-- ============================================================================
CREATE INDEX IF NOT EXISTS reasoning_logs_tenant_id_idx ON public.reasoning_logs(tenant_id);
CREATE INDEX IF NOT EXISTS reasoning_logs_request_id_idx ON public.reasoning_logs(request_id);
CREATE INDEX IF NOT EXISTS reasoning_logs_created_at_idx ON public.reasoning_logs(created_at);
-- ============================================================================
-- §4: ENABLE + FORCE Row Level Security on reasoning_logs
-- ============================================================================
ALTER TABLE public.reasoning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reasoning_logs FORCE ROW LEVEL SECURITY;
-- ============================================================================
-- §5: Immutability trigger — reasoning_logs rows are append-only
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reasoning_logs_immutability() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN -- Allow bypass context (test seed triple-gate) to delete for cleanup only.
  -- UPDATE is always blocked, even in bypass context.
  -- In production app.bypass_rls is always 'off'; only test seeding sets it 'on'.
  IF TG_OP = 'DELETE'
  AND current_setting('app.bypass_rls', true) = 'on' THEN RETURN OLD;
END IF;
RAISE EXCEPTION '[E-023-IMMUTABLE] reasoning_logs rows are append-only. UPDATE and DELETE are forbidden on id=%',
OLD.id;
END;
$$;
DROP TRIGGER IF EXISTS trg_reasoning_logs_immutability ON public.reasoning_logs;
CREATE TRIGGER trg_reasoning_logs_immutability BEFORE
UPDATE
  OR DELETE ON public.reasoning_logs FOR EACH ROW EXECUTE FUNCTION public.reasoning_logs_immutability();
-- ============================================================================
-- §6: RLS Policies — reasoning_logs
--
-- Pattern mirrors G-022 (escalation_events) and G-006C (audit_logs):
--   - One RESTRICTIVE guard (FOR ALL) — fail-closed baseline
--   - One PERMISSIVE SELECT  — tenant-scoped reads + bypass
--   - One PERMISSIVE INSERT  — tenant-scoped writes + bypass
--   No UPDATE/DELETE policies (immutability enforced by trigger).
-- ============================================================================
-- Guard (RESTRICTIVE): fail-closed — must have tenant context or bypass
DROP POLICY IF EXISTS reasoning_logs_guard ON public.reasoning_logs;
CREATE POLICY reasoning_logs_guard ON public.reasoning_logs AS RESTRICTIVE FOR ALL TO texqtic_app USING (
  app.require_org_context()
  OR app.bypass_enabled()
);
-- Tenant SELECT: own rows only + bypass
DROP POLICY IF EXISTS reasoning_logs_tenant_select ON public.reasoning_logs;
CREATE POLICY reasoning_logs_tenant_select ON public.reasoning_logs AS PERMISSIVE FOR
SELECT TO texqtic_app USING (
    (tenant_id = app.current_org_id())
    OR app.bypass_enabled()
  );
-- Tenant INSERT: own org only + bypass
DROP POLICY IF EXISTS reasoning_logs_tenant_insert ON public.reasoning_logs;
CREATE POLICY reasoning_logs_tenant_insert ON public.reasoning_logs AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    (
      app.require_org_context()
      AND tenant_id = app.current_org_id()
    )
    OR app.bypass_enabled()
  );
-- ============================================================================
-- §7: Grant permissions to texqtic_app
-- ============================================================================
GRANT SELECT,
  INSERT ON public.reasoning_logs TO texqtic_app;
-- ============================================================================
-- §8: Verification block — fails migration if any assertion is violated
-- ============================================================================
DO $$
DECLARE v_rls_enabled boolean;
v_rls_forced boolean;
v_col_exists boolean;
v_guard_count int;
v_select_count int;
v_insert_count int;
v_trigger_count int;
v_grant_exists boolean;
BEGIN -- 1) ENABLE + FORCE RLS on reasoning_logs
SELECT relrowsecurity,
  relforcerowsecurity INTO v_rls_enabled,
  v_rls_forced
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'reasoning_logs'
  AND n.nspname = 'public';
IF NOT v_rls_enabled THEN RAISE EXCEPTION 'G-023 FAIL: reasoning_logs RLS not enabled';
END IF;
IF NOT v_rls_forced THEN RAISE EXCEPTION 'G-023 FAIL: reasoning_logs FORCE RLS not set';
END IF;
-- 2) audit_logs.reasoning_log_id column exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'reasoning_log_id'
  ) INTO v_col_exists;
IF NOT v_col_exists THEN RAISE EXCEPTION 'G-023 FAIL: audit_logs.reasoning_log_id column not found';
END IF;
-- 3) RESTRICTIVE guard policy exists
SELECT COUNT(*) INTO v_guard_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reasoning_logs'
  AND policyname = 'reasoning_logs_guard';
IF v_guard_count <> 1 THEN RAISE EXCEPTION 'G-023 FAIL: reasoning_logs_guard RESTRICTIVE policy not found (count=%)',
v_guard_count;
END IF;
-- 4) Exactly 1 PERMISSIVE SELECT policy
SELECT COUNT(*) INTO v_select_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reasoning_logs'
  AND cmd = 'SELECT'
  AND permissive = 'PERMISSIVE';
IF v_select_count <> 1 THEN RAISE EXCEPTION 'G-023 FAIL: expected 1 permissive SELECT policy on reasoning_logs, found %',
v_select_count;
END IF;
-- 5) Exactly 1 PERMISSIVE INSERT policy
SELECT COUNT(*) INTO v_insert_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reasoning_logs'
  AND cmd = 'INSERT'
  AND permissive = 'PERMISSIVE';
IF v_insert_count <> 1 THEN RAISE EXCEPTION 'G-023 FAIL: expected 1 permissive INSERT policy on reasoning_logs, found %',
v_insert_count;
END IF;
-- 6) Immutability trigger installed
SELECT COUNT(*) INTO v_trigger_count
FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'reasoning_logs'
  AND n.nspname = 'public'
  AND t.tgname = 'trg_reasoning_logs_immutability';
IF v_trigger_count <> 1 THEN RAISE EXCEPTION 'G-023 FAIL: trg_reasoning_logs_immutability trigger not found (count=%)',
v_trigger_count;
END IF;
RAISE NOTICE 'G-023 PASS: reasoning_logs created — RLS: %, FORCE: %, guard: %, SELECT: %, INSERT: %, trigger: %, audit_logs.reasoning_log_id: %',
v_rls_enabled,
v_rls_forced,
v_guard_count,
v_select_count,
v_insert_count,
v_trigger_count,
v_col_exists;
END;
$$;
COMMIT;