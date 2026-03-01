BEGIN;

-- OPS-RLS-ADMIN-REALM-001
-- Fix: app.require_admin_context() was checking realm='admin' but production sets realm='control'.
-- Result was permanently FALSE in production, making impersonation_sessions RLS dead-code.
--
-- New semantics:
--   realm = 'control'     (plane identifier; not a capability check)
--   actor_id IS NOT NULL  (authenticated actor)
--   is_admin = 'true'     (explicit capability flag)
--
-- GOVERNANCE-SYNC-027

CREATE OR REPLACE FUNCTION app.require_admin_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT
        current_setting('app.realm', true) = 'control'
        AND NULLIF(current_setting('app.actor_id', true), '') IS NOT NULL
        AND current_setting('app.is_admin', true) = 'true';
$$;

COMMIT;
