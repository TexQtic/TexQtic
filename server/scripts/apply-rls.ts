/**
 * Apply RLS SELECT Policies for app_user (Gate E.4 fix)
 *
 * Root cause (Gate E.4 Phase 2K / diag-rls.ts):
 *   - users:       rowsecurity=true, policy: users_deny_all (qual: false) — blocks all reads
 *   - tenants:     rowsecurity=true, policy: tenants_deny_all (qual: false) — blocks all reads
 *   - admin_users: rowsecurity=true, policy: admin_users_deny_all (qual: false) — blocks all reads
 *   - audit_logs:  rowsecurity=true, policies only for texqtic_app role (not app_user)
 *
 * Effect:
 *   - Tenant login (withDbContext({ tenantId })):  user lookup returns null → AUTH_INVALID 401
 *   - Admin login  (withDbContext({ isAdmin })):   admin lookup returns null → AUTH_INVALID 401
 *   - Replay audit (withDbContext({ tenantId })):  null-tenanted row invisible → polling timeout
 *
 * Fix: Add PERMISSIVE SELECT policies for app_user on affected tables.
 *      Does NOT remove existing deny_all policies (additive, not replacing).
 *      Idempotent — DROP IF EXISTS before each CREATE.
 *
 * Usage:  pnpm tsx scripts/apply-rls.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS: Array<{ label: string; sql: string }> = [
  // ── audit_logs: tenant read (updated — also covers null-tenantId rows for actor members) ──
  {
    label: 'DROP audit_logs_tenant_read',
    sql: `DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs`,
  },
  {
    label: 'CREATE audit_logs_tenant_read',
    sql: `CREATE POLICY audit_logs_tenant_read ON public.audit_logs
      FOR SELECT
      USING (
        -- Standard tenanted audit rows
        (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
         AND tenant_id::text = current_setting('app.tenant_id', true))
        -- Null-tenanted security events (e.g. replay detection) visible to tenant if actor is member
        OR (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
            AND tenant_id IS NULL
            AND EXISTS (
              SELECT 1 FROM memberships m
              WHERE m.user_id = audit_logs.actor_id
                AND m.tenant_id::text = current_setting('app.tenant_id', true)
            ))
        -- Admin sees all
        OR current_setting('app.is_admin', true) = 'true'
      )`,
  },

  // ── users: allow tenant-context reads for members, admin sees all ──
  {
    label: 'DROP users_tenant_read',
    sql: `DROP POLICY IF EXISTS users_tenant_read ON public.users`,
  },
  {
    label: 'CREATE users_tenant_read',
    sql: `CREATE POLICY users_tenant_read ON public.users
      FOR SELECT
      USING (
        current_setting('app.is_admin', true) = 'true'
        OR (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM memberships m
              WHERE m.user_id = users.id
                AND m.tenant_id::text = current_setting('app.tenant_id', true)
            ))
      )`,
  },

  // ── tenants: allow tenant-context to see own tenant, admin sees all ──
  {
    label: 'DROP tenants_tenant_read',
    sql: `DROP POLICY IF EXISTS tenants_tenant_read ON public.tenants`,
  },
  {
    label: 'CREATE tenants_tenant_read',
    sql: `CREATE POLICY tenants_tenant_read ON public.tenants
      FOR SELECT
      USING (
        current_setting('app.is_admin', true) = 'true'
        OR (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
            AND id::text = current_setting('app.tenant_id', true))
      )`,
  },

  // ── admin_users: allow admin-context reads only ──
  {
    label: 'DROP admin_users_admin_read',
    sql: `DROP POLICY IF EXISTS admin_users_admin_read ON public.admin_users`,
  },
  {
    label: 'CREATE admin_users_admin_read',
    sql: `CREATE POLICY admin_users_admin_read ON public.admin_users
      FOR SELECT
      USING (
        current_setting('app.is_admin', true) = 'true'
      )`,
  },
];

async function main() {
  console.log('📋 Applying RLS SELECT policies for app_user (Gate E.4 fix)...\n');

  for (let i = 0; i < STATEMENTS.length; i++) {
    const { label, sql } = STATEMENTS[i];
    console.log(`   [${i + 1}/${STATEMENTS.length}] ${label}...`);
    try {
      await prisma.$executeRawUnsafe(sql.trim());
      console.log(`   ✅ Success`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      throw err;
    }
  }

  // Verify each table has the expected policy
  const tableChecks = [
    { table: 'audit_logs', policy: 'audit_logs_tenant_read' },
    { table: 'users', policy: 'users_tenant_read' },
    { table: 'tenants', policy: 'tenants_tenant_read' },
    { table: 'admin_users', policy: 'admin_users_admin_read' },
  ];
  console.log('\n📊 Verification:');
  for (const { table, policy } of tableChecks) {
    const rows = await prisma.$queryRawUnsafe<Array<{ policyname: string; roles: string }>>(
      `SELECT policyname, roles::text FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2`,
      table,
      policy
    );
    if (rows.length === 0) {
      throw new Error(`❌ ${policy} on ${table} NOT FOUND after apply`);
    }
    console.log(`   ✅ ${table}.${policy}  roles=${rows[0].roles}`);
  }

  console.log('\n✅ All RLS SELECT policies applied and verified.');
  console.log('   app_user can now:');
  console.log('   - SELECT users (when member of tenant context, or admin)');
  console.log('   - SELECT tenants (when id matches tenant context, or admin)');
  console.log('   - SELECT admin_users (when is_admin = true)');
  console.log('   - SELECT audit_logs (tenanted rows + null-tenanted actor-member rows, or admin)');
}

main()
  .catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
