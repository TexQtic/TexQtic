-- Prompt #19: EventLog RLS lockdown (Supabase advisor: rls_disabled_in_public)
-- Purpose: Enable RLS on event_logs table and deny public access
-- Date: 2026-02-08
-- 1) Enable RLS
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
-- 2) Defense-in-depth: revoke default grants from PostgREST roles
REVOKE ALL ON TABLE public.event_logs
FROM anon;
REVOKE ALL ON TABLE public.event_logs
FROM authenticated;
-- 3) Explicit deny policies (ensures PostgREST roles cannot access even if granted later)
DROP POLICY IF EXISTS "event_logs_deny_anon_all" ON public.event_logs;
CREATE POLICY "event_logs_deny_anon_all" ON public.event_logs FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "event_logs_deny_authenticated_all" ON public.event_logs;
CREATE POLICY "event_logs_deny_authenticated_all" ON public.event_logs FOR ALL TO authenticated USING (false) WITH CHECK (false);