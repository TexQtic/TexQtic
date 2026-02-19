/**
 * Diagnostic: query memberships policies + app.* function bodies
 *
 * Usage: pnpm tsx scripts/diag-memberships.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [],
});

async function main() {
  // 1. Memberships policies
  const memPolicies = await prisma.$queryRawUnsafe<
    Array<{ polname: string; polcmd: string; polpermissive: string; qual: string; roles: string }>
  >(`
    SELECT
      p.polname,
      CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS polcmd,
      CASE p.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS polpermissive,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      p.polroles::regrole[]::text[] AS roles
    FROM pg_policy p
    WHERE p.polrelid = 'memberships'::regclass
    ORDER BY p.polname
  `);

  console.log('\n=== memberships policies ===');
  for (const r of memPolicies) {
    console.log(
      `  ${r.polname}  cmd=${r.polcmd}  ${r.polpermissive}  roles=${JSON.stringify(r.roles)}`
    );
    console.log(`    USING: ${r.qual}`);
    console.log();
  }

  // 2. app.* function bodies for require_org_context, current_org_id, set_tenant_context
  const fns = await prisma.$queryRawUnsafe<Array<{ proname: string; body: string }>>(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app'
      AND p.proname IN ('require_org_context', 'current_org_id', 'current_tenant_id', 'bypass_enabled')
    ORDER BY p.proname
  `);

  console.log('\n=== app.* function bodies ===');
  for (const f of fns) {
    console.log(`\n--- ${f.proname} ---`);
    console.log(f.body);
  }

  // 3. public.set_tenant_context
  const stFns = await prisma.$queryRawUnsafe<Array<{ proname: string; body: string }>>(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('set_tenant_context', 'set_admin_context')
    ORDER BY p.proname
  `);

  console.log('\n=== public.set_tenant_context / set_admin_context ===');
  for (const f of stFns) {
    console.log(`\n--- ${f.proname} ---`);
    console.log(f.body);
  }

  // 4. memberships RLS enabled?
  const rlsSt = await prisma.$queryRawUnsafe<
    Array<{ relname: string; rowsecurity: boolean; forcerowsecurity: boolean }>
  >(`
    SELECT relname, relrowsecurity AS rowsecurity, relforcerowsecurity AS forcerowsecurity
    FROM pg_class
    WHERE relname = 'memberships' AND relnamespace = 'public'::regnamespace
  `);
  console.log('\n=== memberships RLS status ===');
  console.log(rlsSt);
}

main()
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
