/**
 * Diagnostic: RLS status, policies, function signatures, bypass policies
 * Usage: pnpm tsx scripts/diag-rls.ts
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const tables = [
    'users',
    'memberships',
    'tenants',
    'admin_users',
    'refresh_tokens',
    'rate_limit_attempts',
    '_prisma_migrations',
    'ai_budgets',
    'ai_usage_meters',
    'tenant_branding',
    'tenant_domains',
    'tenant_feature_overrides',
  ];

  // Check rowsecurity on each table
  const rlsStatus = await p.$queryRawUnsafe<Array<{ tablename: string; rowsecurity: boolean }>>(
    `SELECT tablename, rowsecurity
     FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])
     ORDER BY tablename`,
    tables
  );
  console.log('=== RLS Enabled Status ===');
  for (const r of rlsStatus) {
    console.log(`  ${r.tablename}: rowsecurity=${r.rowsecurity}`);
  }

  // Fetch all policies for these tables
  const policies = await p.$queryRawUnsafe<
    Array<{
      tablename: string;
      policyname: string;
      roles: string;
      cmd: string;
      qual: string | null;
    }>
  >(
    `SELECT tablename, policyname, roles::text, cmd, qual
     FROM pg_policies
     WHERE schemaname='public' AND tablename = ANY($1::text[])
     ORDER BY tablename, policyname`,
    tables
  );
  console.log('\n=== Policies ===');
  for (const r of policies) {
    console.log(`  ${r.tablename}.${r.policyname}  cmd=${r.cmd}  roles=${r.roles}`);
    if (r.qual) console.log(`    qual: ${r.qual.substring(0, 120)}`);
  }

  // Check SELECT privilege for app_user on each table
  console.log('\n=== app_user SELECT privileges ===');
  for (const t of tables) {
    try {
      const r = await p.$queryRawUnsafe<Array<{ can_select: boolean }>>(
        `SELECT has_table_privilege('app_user', 'public.${t}', 'SELECT') AS can_select`
      );
      console.log(`  ${t}: can_select=${r[0].can_select}`);
    } catch {
      console.log(`  ${t}: table does not exist or no privilege`);
    }
  }

  // app.* function signatures (for search_path hardening)
  const fns = await p.$queryRawUnsafe<
    Array<{ routine_name: string; args: string; prosecdef: boolean }>
  >(
    `SELECT p.proname AS routine_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
            p.prosecdef
     FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'app'
     ORDER BY p.proname`
  );
  console.log('\n=== app.* function signatures ===');
  for (const f of fns) {
    console.log(`  app.${f.routine_name}(${f.args})  security_definer=${f.prosecdef}`);
  }

  // Bypass policies that may have always-true USING clauses
  console.log('\n=== Policies with potentially always-true USING ===');
  const bypassPolicies = await p.$queryRawUnsafe<
    Array<{
      tablename: string;
      policyname: string;
      cmd: string;
      roles: string;
      qual: string | null;
    }>
  >(
    `SELECT tablename, policyname, cmd, roles::text, qual
     FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual = 'true' OR qual IS NULL)
     ORDER BY tablename, policyname`
  );
  for (const r of bypassPolicies) {
    console.log(`  ${r.tablename}.${r.policyname}  cmd=${r.cmd}  roles=${r.roles}`);
    console.log(`    qual: ${r.qual}`);
  }
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
