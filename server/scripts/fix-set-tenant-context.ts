/**
 * Fix: Align set_tenant_context to set app.org_id (Gate E.4 — Test 1 + Test 5)
 *
 * Root cause:
 *   app.current_org_id()   reads  current_setting('app.org_id', TRUE)
 *   app.require_org_context() checks  app.current_org_id() IS NOT NULL
 *   memberships_guard_require_context (RESTRICTIVE ALL):  app.require_org_context() OR app.bypass_enabled()
 *
 *   BUT public.set_tenant_context() only sets app.tenant_id — NOT app.org_id.
 *   → require_org_context() always false → RESTRICTIVE policy blocks all memberships reads
 *   → user.findUnique({ include: memberships }) returns empty memberships → login 401
 *   → audit_logs null-tenantId EXISTS (SELECT 1 FROM memberships ...) blocked → replay polling timeout
 *
 * Fix:
 *   Recreate public.set_tenant_context() to also set app.org_id = p_tenant_id
 *   This aligns the GUC with what app.current_org_id() reads.
 *   No schema changes · No Prisma migration · Idempotent (CREATE OR REPLACE)
 *
 * Usage: pnpm -C server tsx scripts/fix-set-tenant-context.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Fixing public.set_tenant_context() — aligning app.org_id GUC\n');

  // Step 1: Recreate set_tenant_context to also set app.org_id
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.set_tenant_context(
      p_tenant_id uuid,
      p_is_admin  boolean DEFAULT false
    )
    RETURNS void
    LANGUAGE plpgsql
    SET search_path = public, pg_catalog
    AS $$
    BEGIN
      -- Set tenant GUC (used by tenants_tenant_read + audit_logs_tenant_read)
      PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
      -- Set org GUC (used by app.current_org_id() → require_org_context() → memberships RESTRICTIVE guard)
      PERFORM set_config('app.org_id', p_tenant_id::text, false);
      -- Set admin flag
      PERFORM set_config('app.is_admin', p_is_admin::text, false);
    END;
    $$
  `);
  console.log(
    '   ✅ set_tenant_context updated — now sets app.tenant_id + app.org_id + app.is_admin'
  );

  // Step 2: Also fix set_admin_context to clear app.org_id (for consistency)
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.set_admin_context()
    RETURNS void
    LANGUAGE plpgsql
    SET search_path = public, pg_catalog
    AS $$
    BEGIN
      PERFORM set_config('app.is_admin', 'true', false);
      PERFORM set_config('app.tenant_id', '', false);
      PERFORM set_config('app.org_id', '', false);
    END;
    $$
  `);
  console.log('   ✅ set_admin_context updated — now clears app.org_id');

  // Step 3: Verify the function bodies
  const fns = await prisma.$queryRawUnsafe<Array<{ proname: string; body: string }>>(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('set_tenant_context', 'set_admin_context')
    ORDER BY p.proname
  `);

  console.log('\n📋 Verification — updated function bodies:');
  for (const f of fns) {
    const hasOrgId = f.body.includes('app.org_id');
    console.log(`   ${hasOrgId ? '✅' : '❌'} ${f.proname} — app.org_id reference: ${hasOrgId}`);
  }

  // Step 4: Smoke-test — verify require_org_context works when app.org_id is set
  const smokeResult = await prisma.$queryRawUnsafe<
    Array<{ org_id: string; require_org: boolean }>
  >(`
    SELECT
      current_setting('app.org_id', true) AS org_id,
      app.require_org_context()          AS require_org
    FROM (SELECT public.set_tenant_context('00000000-0000-0000-0000-000000000001'::uuid)) x
  `);
  const smoke = smokeResult[0];
  const smokePass = smoke?.require_org === true;
  console.log(
    `\n   ${smokePass ? '✅' : '❌'} Smoke test: set_tenant_context → require_org_context() = ${smoke?.require_org} (org_id='${smoke?.org_id}')`
  );

  if (!smokePass) {
    throw new Error('Smoke test failed — require_org_context() still returns false after fix');
  }

  console.log(
    '\n✅ Fix applied. memberships RESTRICTIVE guard will now pass for tenant-context queries.'
  );
  console.log('   → Test 1 (tenant login 401) should be resolved');
  console.log(
    '   → Test 5 (replay detection timeout) should be resolved via memberships EXISTS subquery'
  );
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
