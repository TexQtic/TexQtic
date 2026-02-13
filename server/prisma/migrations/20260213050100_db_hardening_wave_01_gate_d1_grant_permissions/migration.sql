-- ============================================================================
-- TEXQTIC DB-HARDENING-WAVE-01 (Gate D.1 - GRANT Fix)
-- Migration: Grant table permissions to texqtic_app role
-- CRITICAL: Required for RLS execution role to access tables after FORCE RLS
-- ============================================================================
--
-- ROOT CAUSE:
--   Gate D.1 enabled FORCE RLS on memberships + invites
--   SET LOCAL ROLE texqtic_app switches from postgres → texqtic_app
--   Postgres checks GRANT privileges BEFORE RLS policies
--   Result: 42501 permission denied (missing table privileges)
--
-- SOLUTION:
--   Grant table privileges to texqtic_app for memberships + invites
--   Follows same pattern as catalog_items (Gate B.4)
--
-- SCOPE: Gate D.1 only (memberships + invites)
-- ============================================================================

-- Grant table privileges: memberships
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.memberships TO texqtic_app;

COMMENT ON TABLE public.memberships IS 'RLS-protected tenant memberships. texqtic_app has CRUD permissions. Gate D.1.';

-- Grant table privileges: invites
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.invites TO texqtic_app;

COMMENT ON TABLE public.invites IS 'RLS-protected tenant invites. texqtic_app has CRUD permissions. Gate D.1.';

-- Verification: Confirm grants applied
DO $$
DECLARE
  membership_privs text;
  invite_privs text;
BEGIN
  -- Check memberships grants
  SELECT string_agg(privilege_type, ', ' ORDER BY privilege_type)
  INTO membership_privs
  FROM information_schema.table_privileges
  WHERE grantee = 'texqtic_app'
    AND table_schema = 'public'
    AND table_name = 'memberships';
    
  IF membership_privs IS NULL THEN
    RAISE EXCEPTION 'No privileges granted to texqtic_app on memberships table';
  END IF;
  
  -- Check invites grants
  SELECT string_agg(privilege_type, ', ' ORDER BY privilege_type)
  INTO invite_privs
  FROM information_schema.table_privileges
  WHERE grantee = 'texqtic_app'
    AND table_schema = 'public'
    AND table_name = 'invites';
    
  IF invite_privs IS NULL THEN
    RAISE EXCEPTION 'No privileges granted to texqtic_app on invites table';
  END IF;
  
  RAISE NOTICE 'Gate D.1 GRANT verification PASS:';
  RAISE NOTICE '  memberships: %', membership_privs;
  RAISE NOTICE '  invites: %', invite_privs;
END;
$$;
