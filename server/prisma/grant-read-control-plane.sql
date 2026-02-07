-- Grant SELECT on control-plane tables for app_user
-- These are needed for runtime queries but modification is still blocked
BEGIN;
-- Grant read access to tenants (needed for tenant context resolution)
GRANT SELECT ON TABLE public.tenants TO app_user;
-- Grant read access to users (needed for membership/auth queries)  
GRANT SELECT ON TABLE public.users TO app_user;
-- Grant read access to admin_users (needed for admin context queries)
GRANT SELECT ON TABLE public.admin_users TO app_user;
-- Still block INSERT/UPDATE/DELETE on these tables
REVOKE
INSERT,
  UPDATE,
  DELETE ON TABLE public.tenants,
  public.users,
  public.admin_users
FROM app_user;
COMMIT;
-- Verify grants
SELECT tablename,
  string_agg(
    privilege_type,
    ', '
    ORDER BY privilege_type
  ) as privileges
FROM information_schema.table_privileges
WHERE grantee = 'app_user'
  AND table_schema = 'public'
  AND tablename IN ('tenants', 'users', 'admin_users')
GROUP BY tablename
ORDER BY tablename;