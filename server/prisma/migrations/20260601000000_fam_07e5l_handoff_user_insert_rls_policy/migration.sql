-- FAM-07E5L-CONSENT-RUNTIME-HANDOFF-USER-RLS-REMEDIATION-001
-- Narrow remediation: unblock user bootstrap inserts under RLS for admin-scoped activation flows.
-- Scope constraints:
-- - No RLS disable.
-- - No broad public/anonymous/authenticated access.
-- - No tenant isolation bypass for tenant-scoped tables.
-- Ensure old policy name (if any) does not conflict.
DROP POLICY IF EXISTS users_admin_insert ON public.users;
-- Allow INSERT on users only for texqtic_app when admin context is explicitly active.
CREATE POLICY users_admin_insert ON public.users AS PERMISSIVE FOR
INSERT TO texqtic_app WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    AND current_setting('app.org_id', true) IS NOT NULL
    AND current_setting('app.actor_id', true) IS NOT NULL
  );
COMMENT ON POLICY users_admin_insert ON public.users IS 'Admin-scoped user bootstrap insert. Requires app.is_admin=true with org/actor context; no anon/authenticated/public coverage.';