/**
 * Security Hardening — Supabase Performance & Security Advisor Remediations
 *
 * Addresses four advisor findings without broadening access:
 *
 * 1. policy_exists_rls_disabled (tenants, _prisma_migrations)
 *    → ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY
 *    → REVOKE ALL on _prisma_migrations from API roles (app_user, texqtic_app)
 *
 * 2. function_search_path_mutable (all app.* functions)
 *    → ALTER FUNCTION … SET search_path = pg_catalog, app, public
 *    → Prevents search_path injection attacks (Postgres hardening)
 *
 * 3. rls_policy_always_true (bypass_operations_policy  cmd=ALL  qual=null)
 *    → ALTER POLICY … USING (app.bypass_enabled()) so bypass is conditional
 *    → Tables: ai_budgets, ai_usage_meters, marketplace_cart_summaries,
 *              tenant_branding, tenant_domains, tenant_feature_overrides
 *
 * Usage:   pnpm tsx scripts/apply-security-hardening.ts
 * Safe:    Idempotent — no DROP/CREATE, only ENABLE/ALTER/REVOKE.
 * Scope:   DB-only; no Prisma schema changes, no rls.sql edits.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

async function exec(label: string, sql: string): Promise<void> {
  process.stdout.write(`   • ${label}...`);
  try {
    await prisma.$executeRawUnsafe(sql.trim());
    console.log(' ✅');
  } catch (err: any) {
    console.log(` ❌ ${err.message}`);
    throw err;
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── §1 Enable RLS on tables that have policies but rowsecurity=false ──────
  console.log('\n§1 Enabling RLS on tenants + _prisma_migrations\n');

  await exec(
    'tenants ENABLE ROW LEVEL SECURITY',
    `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY`
  );
  await exec(
    'tenants FORCE ROW LEVEL SECURITY',
    `ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY`
  );
  await exec(
    '_prisma_migrations ENABLE ROW LEVEL SECURITY',
    `ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY`
  );
  await exec(
    '_prisma_migrations FORCE ROW LEVEL SECURITY',
    `ALTER TABLE public._prisma_migrations FORCE ROW LEVEL SECURITY`
  );

  // REVOKE API roles from _prisma_migrations (deny_all policy handles it, but be explicit)
  for (const role of ['app_user', 'texqtic_app']) {
    // REVOKE is a no-op if the role doesn't hold the privilege — safe to run always
    await exec(
      `REVOKE ALL on _prisma_migrations FROM ${role}`,
      `REVOKE ALL ON TABLE public._prisma_migrations FROM ${role}`
    );
  }

  // ── §2 Set fixed search_path on all app.* functions ──────────────────────
  console.log('\n§2 Setting search_path on app.* functions\n');

  // app_user needs USAGE on schema 'app' to resolve app.* function names
  // (EXECUTE was already granted, but schema resolution requires USAGE)
  await exec('GRANT USAGE on schema app TO app_user', `GRANT USAGE ON SCHEMA app TO app_user`);

  // Exact signatures from pg_get_function_identity_arguments (diag-rls.ts evidence):
  const appFunctions = [
    'app.bypass_enabled()',
    'app.current_actor_id()',
    'app.current_org_id()',
    'app.current_realm()',
    'app.current_request_id()',
    'app.current_roles()',
    'app.has_role(role text)',
    'app.projector_bypass_enabled()',
    'app.require_admin_context()',
    'app.require_org_context()',
  ];

  for (const fn of appFunctions) {
    await exec(
      `ALTER FUNCTION ${fn} SET search_path`,
      `ALTER FUNCTION ${fn} SET search_path = pg_catalog, app, public`
    );
  }

  // ── §3 Tighten bypass_operations ALL-cmd policies (always-true USING) ─────
  console.log('\n§3 Tightening bypass_operations_policy USING clause\n');

  // These policies have cmd=ALL and qual=NULL (USING always true).
  // Fetch their current WITH CHECK dynamically to preserve it.
  type PolicyRow = { tablename: string; policyname: string; with_check: string | null };
  const bypassPolicies = await prisma.$queryRawUnsafe<PolicyRow[]>(
    `SELECT tablename, policyname, with_check
     FROM pg_policies
     WHERE schemaname = 'public'
       AND cmd = 'ALL'
       AND qual IS NULL
       AND tablename IN (
         'ai_budgets','ai_usage_meters','marketplace_cart_summaries',
         'tenant_branding','tenant_domains','tenant_feature_overrides'
       )
     ORDER BY tablename, policyname`
  );

  if (bypassPolicies.length === 0) {
    console.log('   ⚠️  No always-true ALL-cmd bypass policies found — skipping');
  }

  for (const { tablename, policyname, with_check } of bypassPolicies) {
    // Use with_check from live DB; fall back to bypass_enabled() if null
    const withCheckExpr = with_check ?? 'app.bypass_enabled()';
    await exec(
      `ALTER POLICY ${tablename}.${policyname}`,
      `ALTER POLICY "${policyname}" ON public.${tablename}
         USING (app.bypass_enabled())
         WITH CHECK (${withCheckExpr})`
    );
  }

  // ── §4 Verification ───────────────────────────────────────────────────────
  console.log('\n§4 Verification\n');

  // Check RLS enabled on tenants and _prisma_migrations
  const rlsCheck = await prisma.$queryRawUnsafe<
    Array<{ tablename: string; rowsecurity: boolean; forcerowsecurity: boolean }>
  >(
    `SELECT c.relname AS tablename,
            c.relrowsecurity AS rowsecurity,
            c.relforcerowsecurity AS forcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('tenants', '_prisma_migrations')
     ORDER BY c.relname`
  );
  for (const r of rlsCheck) {
    const rlsOk = r.rowsecurity ? '✅' : '❌';
    const forceOk = r.forcerowsecurity ? '✅' : '⚠️ ';
    console.log(
      `   ${rlsOk} ${r.tablename}: rowsecurity=${r.rowsecurity}  ${forceOk} force=${r.forcerowsecurity}`
    );
  }

  // Check search_path on app.* functions
  const schemaUsage = await prisma.$queryRawUnsafe<Array<{ has_usage: boolean }>>(
    `SELECT has_schema_privilege('app_user', 'app', 'USAGE') AS has_usage`
  );
  console.log(
    `   ${schemaUsage[0].has_usage ? '✅' : '❌'} app_user USAGE on schema app: ${schemaUsage[0].has_usage}`
  );

  const fnCheck = await prisma.$queryRawUnsafe<
    Array<{ proname: string; proconfig: string[] | null }>
  >(
    `SELECT p.proname, p.proconfig
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'app'
     ORDER BY p.proname`
  );
  let fnIssues = 0;
  for (const f of fnCheck) {
    const hasSearchPath = f.proconfig?.some(c => c.startsWith('search_path='));
    const icon = hasSearchPath ? '✅' : '❌';
    if (!hasSearchPath) fnIssues++;
    console.log(`   ${icon} app.${f.proname}() search_path=${hasSearchPath ? 'set' : 'MISSING'}`);
  }

  // Check bypass policies now have USING
  const bypassCheck = await prisma.$queryRawUnsafe<
    Array<{ tablename: string; policyname: string; qual: string | null }>
  >(
    `SELECT tablename, policyname, qual
     FROM pg_policies
     WHERE schemaname = 'public'
       AND cmd = 'ALL'
       AND tablename IN (
         'ai_budgets','ai_usage_meters','marketplace_cart_summaries',
         'tenant_branding','tenant_domains','tenant_feature_overrides'
       )
     ORDER BY tablename, policyname`
  );
  for (const r of bypassCheck) {
    const ok = r.qual !== null;
    console.log(`   ${ok ? '✅' : '❌'} ${r.tablename}.${r.policyname}  qual=${r.qual ?? 'null'}`);
  }

  console.log('\n✅ Security hardening complete.');
  if (fnIssues > 0) {
    console.log(
      `   ⚠️  ${fnIssues} app.* function(s) still missing search_path — check output above`
    );
  }
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
