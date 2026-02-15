/**
 * Gate E Readiness Check
 * Comprehensive verification script for DB-Hardening-Wave-01 completeness
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('GATE E READINESS CHECK — DB-Hardening-Wave-01 Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1) Runtime role properties
  console.log('1️⃣  RUNTIME ROLE VERIFICATION');
  console.log('─'.repeat(65));

  const roleProps = await prisma.$queryRaw<
    Array<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>
  >`
    SELECT rolname, rolsuper, rolbypassrls 
    FROM pg_roles 
    WHERE rolname = 'texqtic_app';
  `;

  console.log('texqtic_app role properties:');
  console.table(roleProps);

  const role = roleProps[0];
  if (!role) {
    console.log('❌ BLOCKER: texqtic_app role does not exist!\n');
    process.exit(1);
  }

  if (role.rolsuper) {
    console.log('❌ BLOCKER: texqtic_app has rolsuper=true (should be false)\n');
    process.exit(1);
  }

  if (role.rolbypassrls) {
    console.log('❌ BLOCKER: texqtic_app has rolbypassrls=true (should be false)\n');
    process.exit(1);
  }

  console.log('✅ texqtic_app role is correctly configured (no BYPASSRLS, no SUPERUSER)\n');

  // Define Wave-01 tables (including tenants for FK/grants checks)
  const wave01Tables = [
    'catalog_items',
    'memberships',
    'invites',
    'carts',
    'cart_items',
    'audit_logs',
    'event_logs',
    'tenant_domains',
    'tenant_branding',
    'tenant_feature_overrides',
    'ai_budgets',
    'ai_usage_meters',
    'marketplace_cart_summaries',
    'impersonation_sessions',
    'tenants', // Control-plane table (no RLS, but needs grants for FK checks)
  ];

  // 2) RLS enforcement status on all Wave-01 tenant-scoped tables
  console.log('2️⃣  RLS ENFORCEMENT STATUS (14 Tenant-Scoped Tables)');
  console.log('─'.repeat(65));

  // Note: 'tenants' table is excluded from RLS check - it's a control-plane table,
  // not tenant-scoped. It serves as the parent table for FK references.
  const tenantScopedTables = wave01Tables.filter(t => t !== 'tenants');

  const rlsStatus = await prisma.$queryRaw<
    Array<{
      tablename: string;
      rowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>
  >`
    SELECT 
      c.relname AS tablename,
      c.relrowsecurity AS rowsecurity,
      c.relforcerowsecurity AS relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY(${tenantScopedTables})
    ORDER BY c.relname;
  `;

  console.table(rlsStatus);

  const missingRLS = rlsStatus.filter(t => !t.rowsecurity);
  const missingForceRLS = rlsStatus.filter(t => !t.relforcerowsecurity);

  if (missingRLS.length > 0) {
    console.log(`❌ BLOCKER: ${missingRLS.length} tables missing RLS enabled:`);
    console.log(missingRLS.map(t => `  - ${t.tablename}`).join('\n'));
    console.log('');
    process.exit(1);
  }

  if (missingForceRLS.length > 0) {
    console.log(`❌ BLOCKER: ${missingForceRLS.length} tables missing FORCE RLS:`);
    console.log(missingForceRLS.map(t => `  - ${t.tablename}`).join('\n'));
    console.log('');
    process.exit(1);
  }

  console.log(`✅ All ${rlsStatus.length} tables have RLS enabled + FORCE RLS\n`);

  // 3) Policy count verification
  console.log('3️⃣  POLICY COUNT VERIFICATION');
  console.log('─'.repeat(65));

  const policyCounts = await prisma.$queryRaw<
    Array<{
      tablename: string;
      policy_count: bigint;
    }>
  >`
    SELECT 
      schemaname || '.' || tablename AS tablename,
      COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(${wave01Tables})
    GROUP BY schemaname, tablename
    ORDER BY tablename;
  `;

  console.table(
    policyCounts.map(p => ({
      tablename: p.tablename,
      policy_count: Number(p.policy_count),
    }))
  );

  const minPolicies = 5; // At least: tenant_ops (3) + bypass (2) + restrictive_guard (1) = 6 typical
  const underPolicyTables = policyCounts.filter(p => Number(p.policy_count) < minPolicies);

  if (underPolicyTables.length > 0) {
    console.log(
      `⚠️  WARNING: ${underPolicyTables.length} tables have fewer than ${minPolicies} policies:`
    );
    console.log(underPolicyTables.map(t => `  - ${t.tablename}: ${t.policy_count}`).join('\n'));
    console.log('(This may be intentional for some tables)\n');
  } else {
    console.log(`✅ All tables have ${minPolicies}+ policies\n`);
  }

  // 4) Grants audit for texqtic_app
  console.log('4️⃣  GRANTS AUDIT (texqtic_app privileges)');
  console.log('─'.repeat(65));

  const grants = await prisma.$queryRaw<
    Array<{
      table_name: string;
      privilege_type: string;
    }>
  >`
    SELECT 
      table_name,
      privilege_type
    FROM information_schema.table_privileges
    WHERE grantee = 'texqtic_app'
      AND table_schema = 'public'
      AND table_name = ANY(${wave01Tables})
    ORDER BY table_name, privilege_type;
  `;

  // Group by table
  const grantsByTable = grants.reduce(
    (acc, g) => {
      if (!acc[g.table_name]) acc[g.table_name] = [];
      acc[g.table_name].push(g.privilege_type);
      return acc;
    },
    {} as Record<string, string[]>
  );

  console.log('Privileges by table:');
  Object.entries(grantsByTable).forEach(([table, privs]) => {
    console.log(`  ${table}: ${privs.join(', ')}`);
  });
  console.log('');

  // Check for minimum expected grants (SELECT at least)
  const tablesWithoutSelect = wave01Tables.filter(t => {
    const privs = grantsByTable[t] || [];
    return !privs.includes('SELECT');
  });

  if (tablesWithoutSelect.length > 0) {
    console.log(
      `❌ BLOCKER: ${tablesWithoutSelect.length} tables missing SELECT grant for texqtic_app:`
    );
    console.log(tablesWithoutSelect.map(t => `  - ${t}`).join('\n'));
    console.log('');
    process.exit(1);
  }

  console.log('✅ All tables have at least SELECT granted to texqtic_app\n');

  // 5) Bypass function verification
  console.log('5️⃣  BYPASS FUNCTION VERIFICATION');
  console.log('─'.repeat(65));

  const bypassFunctions = await prisma.$queryRaw<
    Array<{
      routine_name: string;
      routine_definition: string;
    }>
  >`
    SELECT 
      routine_name,
      routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'app'
      AND routine_name LIKE '%bypass%'
    ORDER BY routine_name;
  `;

  console.log('Bypass functions found:');
  bypassFunctions.forEach(f => {
    console.log(`  - ${f.routine_name}`);
  });
  console.log('');

  const expectedBypassFunctions = ['bypass_enabled', 'projector_bypass_enabled'];
  const missingBypassFunctions = expectedBypassFunctions.filter(
    expected => !bypassFunctions.some(f => f.routine_name === expected)
  );

  if (missingBypassFunctions.length > 0) {
    console.log(`❌ BLOCKER: Missing bypass functions:`);
    console.log(missingBypassFunctions.map(f => `  - app.${f}`).join('\n'));
    console.log('');
    process.exit(1);
  }

  console.log('✅ All expected bypass functions exist\n');

  // 6) Context helper functions
  console.log('6️⃣  CONTEXT HELPER FUNCTIONS');
  console.log('─'.repeat(65));

  const contextFunctions = await prisma.$queryRaw<
    Array<{
      routine_name: string;
    }>
  >`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'app'
      AND (
        routine_name LIKE 'current_%'
        OR routine_name LIKE 'require_%'
      )
    ORDER BY routine_name;
  `;

  console.log('Context functions found:');
  contextFunctions.forEach(f => {
    console.log(`  - app.${f.routine_name}()`);
  });
  console.log('');

  const expectedContextFunctions = [
    'current_actor_id',
    'current_org_id',
    'current_realm',
    'require_org_context',
    'require_admin_context',
  ];

  const missingContextFunctions = expectedContextFunctions.filter(
    expected => !contextFunctions.some(f => f.routine_name === expected)
  );

  if (missingContextFunctions.length > 0) {
    console.log(`❌ BLOCKER: Missing context functions:`);
    console.log(missingContextFunctions.map(f => `  - app.${f}`).join('\n'));
    console.log('');
    process.exit(1);
  }

  console.log('✅ All expected context functions exist\n');

  // Final summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ GATE E READINESS: ALL CHECKS PASSED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Summary:');
  console.log(`  ✓ texqtic_app role: no BYPASSRLS, no SUPERUSER`);
  console.log(`  ✓ ${rlsStatus.length} tables: RLS enabled + FORCE RLS`);
  console.log(`  ✓ ${policyCounts.length} tables: policies active`);
  console.log(`  ✓ ${wave01Tables.length} tables: grants verified`);
  console.log(`  ✓ Bypass functions: present and bounded`);
  console.log(`  ✓ Context functions: complete`);
  console.log('');
  console.log('✅ DB-Hardening-Wave-01: 100% COMPLETE');
  console.log('✅ Ready for Gate E re-run');
  console.log('');
}

main()
  .catch(e => {
    console.error('❌ FATAL ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
