-- ============================================================================
-- TEXQTIC DB-HARDENING-WAVE-01 (Gate D.2 - GRANT Fix)
-- Migration: Grant table permissions to texqtic_app role
-- CRITICAL: Required for RLS execution role to access tables after FORCE RLS
-- ============================================================================
--
-- ROOT CAUSE:
--   Gate D.2 enabled FORCE RLS on carts + cart_items
--   SET LOCAL ROLE texqtic_app switches from postgres → texqtic_app
--   Postgres checks GRANT privileges BEFORE RLS policies
--   Result: 42501 permission denied for schema public
--
-- SOLUTION:
--   Grant schema USAGE + table privileges to texqtic_app
--   Schema USAGE is prerequisite for any table operations in schema public
--   Follows same pattern as catalog_items (Gate B.4) and memberships (Gate D.1)
--
-- SCOPE: Gate D.2 (carts + cart_items) + users (dependency)
-- ============================================================================
-- Grant schema usage (prerequisite for table access)
GRANT USAGE ON SCHEMA public TO texqtic_app;
-- Grant table privileges: users
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.users TO texqtic_app;
COMMENT ON TABLE public.users IS 'RLS-protected users (used by carts FK). texqtic_app has CRUD permissions. Gate D.2.';
-- Grant table privileges: carts
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.carts TO texqtic_app;
COMMENT ON TABLE public.carts IS 'RLS-protected tenant carts. texqtic_app has CRUD permissions. Gate D.2.';
-- Grant table privileges: cart_items
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON TABLE public.cart_items TO texqtic_app;
COMMENT ON TABLE public.cart_items IS 'RLS-protected cart items (JOIN-based isolation via carts). texqtic_app has CRUD permissions. Gate D.2.';
-- Verification: Confirm grants applied
DO $$
DECLARE users_privs text;
carts_privs text;
cart_items_privs text;
BEGIN -- Check users grants
SELECT string_agg(
    privilege_type,
    ', '
    ORDER BY privilege_type
  ) INTO users_privs
FROM information_schema.table_privileges
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'users';
IF users_privs IS NULL THEN RAISE EXCEPTION 'No privileges granted to texqtic_app on users table';
END IF;
-- Check carts grants
SELECT string_agg(
    privilege_type,
    ', '
    ORDER BY privilege_type
  ) INTO carts_privs
FROM information_schema.table_privileges
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'carts';
IF carts_privs IS NULL THEN RAISE EXCEPTION 'No privileges granted to texqtic_app on carts table';
END IF;
-- Check cart_items grants
SELECT string_agg(
    privilege_type,
    ', '
    ORDER BY privilege_type
  ) INTO cart_items_privs
FROM information_schema.table_privileges
WHERE grantee = 'texqtic_app'
  AND table_schema = 'public'
  AND table_name = 'cart_items';
IF cart_items_privs IS NULL THEN RAISE EXCEPTION 'No privileges granted to texqtic_app on cart_items table';
END IF;
RAISE NOTICE 'Gate D.2 GRANT verification PASS:';
RAISE NOTICE '  users: %',
users_privs;
RAISE NOTICE '  carts: %',
carts_privs;
RAISE NOTICE '  cart_items: %',
cart_items_privs;
END;
$$;