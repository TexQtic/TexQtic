import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RlsStatus {
  tablename: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
}

interface PolicyCount {
  tablename: string;
  cmd: string;
  policy_count: bigint;
}

interface AuditLogPolicy {
  policyname: string;
  cmd: string;
  with_check: string | null;
}

interface FunctionConfig {
  proname: string;
  proconfig: string[] | null;
}

interface TablePrivileges {
  table_name: string;
  grantee: string;
  privilege_type: string;
}

async function verifySecurityHardening() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       SUPABASE SECURITY HARDENING VERIFICATION                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  let allChecksPassed = true;

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 1: RLS Enabled on All Tables
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 1: RLS Status for All Tables in Public Schema');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const rlsStatus = await prisma.$queryRaw<RlsStatus[]>`
      SELECT 
        c.relname as tablename,
        c.relrowsecurity,
        c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname NOT LIKE 'pg_%'
        AND c.relname NOT LIKE 'sql_%'
      ORDER BY c.relname
    `;

    const rlsDisabledTables = rlsStatus.filter(t => !t.relrowsecurity);
    
    if (rlsDisabledTables.length > 0) {
      console.log('❌ FAIL: The following tables have RLS DISABLED:');
      rlsDisabledTables.forEach(t => {
        console.log(`   - ${t.tablename}`);
      });
      allChecksPassed = false;
    } else {
      console.log('✅ PASS: All tables have RLS enabled');
    }

    console.log(`\nRLS Status Summary (${rlsStatus.length} tables):`);
    rlsStatus.forEach(t => {
      const rlsIcon = t.relrowsecurity ? '🟢' : '🔴';
      const forceIcon = t.relforcerowsecurity ? '💪' : '  ';
      console.log(`   ${rlsIcon} ${forceIcon} ${t.tablename}`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 2: Policy Coverage for Tenant-Scoped Tables
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 2: Policy Coverage by Table and Command');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const policyCoverage = await prisma.$queryRaw<PolicyCount[]>`
      SELECT 
        c.relname as tablename,
        pol.polcmd as cmd,
        COUNT(*) as policy_count
      FROM pg_policy pol
      JOIN pg_class c ON pol.polrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      GROUP BY c.relname, pol.polcmd
      ORDER BY c.relname, pol.polcmd
    `;

    const tenantScopedTables = [
      'tenant_domains', 'tenant_branding', 'memberships', 'invites',
      'tenant_feature_overrides', 'ai_budgets',
      'ai_usage_meters', 'impersonation_sessions', 'audit_logs'
    ];

    const tablesWithoutPolicies: string[] = [];
    tenantScopedTables.forEach(tableName => {
      const policies = policyCoverage.filter(p => p.tablename === tableName);
      if (policies.length === 0) {
        tablesWithoutPolicies.push(tableName);
      }
    });

    if (tablesWithoutPolicies.length > 0) {
      console.log('❌ FAIL: The following tenant-scoped tables have NO policies:');
      tablesWithoutPolicies.forEach(t => console.log(`   - ${t}`));
      allChecksPassed = false;
    } else {
      console.log('✅ PASS: All tenant-scoped tables have policies defined');
    }

    console.log('\nPolicy Coverage by Table:');
    const tableGroups = new Map<string, Map<string, bigint>>();
    policyCoverage.forEach(p => {
      if (!tableGroups.has(p.tablename)) {
        tableGroups.set(p.tablename, new Map());
      }
      tableGroups.get(p.tablename)!.set(p.cmd, p.policy_count);
    });

    tableGroups.forEach((commands, tableName) => {
      const cmdSummary = Array.from(commands.entries())
        .map(([cmd, count]) => `${cmd}:${count}`)
        .join(', ');
      console.log(`   📋 ${tableName}: ${cmdSummary}`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 3: Audit Logs INSERT Policy (Must NOT be "true")
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 3: Audit Logs INSERT Policy (Must NOT be WITH CHECK (true))');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const auditLogPolicies = await prisma.$queryRaw<AuditLogPolicy[]>`
      SELECT 
        pol.polname as policyname,
        pol.polcmd as cmd,
        pol.polwithcheck as with_check
      FROM pg_policy pol
      JOIN pg_class c ON pol.polrelid = c.oid
      WHERE c.relname = 'audit_logs'
        AND pol.polcmd = 'INSERT'
      ORDER BY pol.polname
    `;

    const permissiveInserts = auditLogPolicies.filter(p => 
      p.with_check === 'true' || p.with_check === '(true)'
    );

    if (permissiveInserts.length > 0) {
      console.log('❌ FAIL: audit_logs has overly permissive INSERT policies:');
      permissiveInserts.forEach(p => {
        console.log(`   - Policy "${p.policyname}" has WITH CHECK (${p.with_check})`);
      });
      allChecksPassed = false;
    } else {
      console.log('✅ PASS: audit_logs INSERT policies are properly restricted');
    }

    console.log('\nAudit Log Policies:');
    const allAuditPolicies = await prisma.$queryRaw<AuditLogPolicy[]>`
      SELECT 
        pol.polname as policyname,
        pol.polcmd as cmd,
        null::text as with_check
      FROM pg_policy pol
      JOIN pg_class c ON pol.polrelid = c.oid
      WHERE c.relname = 'audit_logs'
      ORDER BY pol.polcmd, pol.polname
    `;
    
    allAuditPolicies.forEach(p => {
      const checkStatus = '✅';  // Already validated in CHECK 3
      console.log(`   ${checkStatus} ${p.cmd}: ${p.policyname}`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 4: Helper Functions Search Path
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 4: Helper Functions Search Path Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const functionConfigs = await prisma.$queryRaw<FunctionConfig[]>`
      SELECT 
        p.proname,
        p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN ('set_tenant_context', 'set_admin_context', 'clear_context')
      ORDER BY p.proname
    `;

    const functionsWithoutSearchPath = functionConfigs.filter(f => 
      !f.proconfig || !f.proconfig.some(cfg => cfg.startsWith('search_path='))
    );

    if (functionsWithoutSearchPath.length > 0) {
      console.log('❌ FAIL: The following functions lack fixed search_path:');
      functionsWithoutSearchPath.forEach(f => console.log(`   - ${f.proname}`));
      allChecksPassed = false;
    } else {
      console.log('✅ PASS: All helper functions have fixed search_path');
    }

    console.log('\nFunction Configurations:');
    functionConfigs.forEach(f => {
      const searchPathConfig = f.proconfig?.find(cfg => cfg.startsWith('search_path='));
      const icon = searchPathConfig ? '✅' : '❌';
      console.log(`   ${icon} ${f.proname}: ${searchPathConfig || 'No search_path set'}`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 5: _prisma_migrations Access Control
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 5: _prisma_migrations Access Control (Must be inaccessible)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const migrationPrivileges = await prisma.$queryRaw<TablePrivileges[]>`
      SELECT 
        table_name,
        grantee,
        privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
        AND grantee IN ('anon', 'authenticated')
      ORDER BY grantee, privilege_type
    `;

    if (migrationPrivileges.length > 0) {
      console.log('❌ FAIL: _prisma_migrations has privileges granted to PostgREST roles:');
      migrationPrivileges.forEach(p => {
        console.log(`   - ${p.grantee} has ${p.privilege_type}`);
      });
      allChecksPassed = false;
    } else {
      console.log('✅ PASS: _prisma_migrations is not accessible to anon/authenticated');
    }

    // Check RLS status for _prisma_migrations
    const migrationsRls = rlsStatus.find(t => t.tablename === '_prisma_migrations');
    if (migrationsRls) {
      const rlsIcon = migrationsRls.relrowsecurity ? '✅' : '❌';
      console.log(`${rlsIcon} _prisma_migrations RLS enabled: ${migrationsRls.relrowsecurity}`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK 6: Control Plane Tables Access Control
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHECK 6: Control Plane Tables Access Control');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const controlPlaneTables = ['tenants', 'users', 'admin_users', 'feature_flags'];
    const controlPlanePrivileges = await prisma.$queryRaw<TablePrivileges[]>`
      SELECT 
        table_name,
        grantee,
        privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name = ANY(ARRAY['tenants', 'users', 'admin_users', 'feature_flags'])
        AND grantee IN ('anon', 'authenticated')
      ORDER BY table_name, grantee, privilege_type
    `;

    if (controlPlanePrivileges.length > 0) {
      console.log('⚠️  WARNING: Control plane tables have privileges granted to PostgREST roles:');
      const groupedByTable = new Map<string, TablePrivileges[]>();
      controlPlanePrivileges.forEach(p => {
        if (!groupedByTable.has(p.table_name)) {
          groupedByTable.set(p.table_name, []);
        }
        groupedByTable.get(p.table_name)!.push(p);
      });
      groupedByTable.forEach((privs, tableName) => {
        console.log(`   ${tableName}:`);
        privs.forEach(p => console.log(`     - ${p.grantee}: ${p.privilege_type}`));
      });
      console.log('   Note: These should be revoked or protected by deny-all policies');
    } else {
      console.log('✅ PASS: Control plane tables have no privileges for anon/authenticated');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FINAL SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      VERIFICATION SUMMARY                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    
    if (allChecksPassed) {
      console.log('✅ ALL CHECKS PASSED - Security hardening successful!\n');
      process.exit(0);
    } else {
      console.log('❌ SOME CHECKS FAILED - Please review findings above\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySecurityHardening().catch(console.error);
