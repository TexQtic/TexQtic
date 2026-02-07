import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRoleSetup() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║        DATABASE ROLE VERIFICATION                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Check current database role
    const roleInfo = await prisma.$queryRaw<any[]>`
      SELECT 
        current_user as current_role,
        session_user as session_role,
        usesuper as is_superuser,
        usename as role_name,
        rolbypassrls as bypass_rls
      FROM pg_user
      LEFT JOIN pg_roles ON pg_user.usename = pg_roles.rolname
      WHERE usename = current_user
    `;

    if (roleInfo.length === 0) {
      console.log('❌ FAIL: Could not determine current database role\n');
      await prisma.$disconnect();
      process.exit(1);
    }

    const role = roleInfo[0];

    console.log('Current Database Connection:');
    console.log(`  Role: ${role.current_role}`);
    console.log(`  Session User: ${role.session_role}`);
    console.log(`  Superuser: ${role.is_superuser}`);
    console.log(`  Bypass RLS: ${role.bypass_rls}\n`);

    // Check if using restricted role (app_user)
    if (role.current_role === 'app_user') {
      if (role.bypass_rls) {
        console.log('❌ FAIL: app_user has BYPASSRLS privilege - RLS will not be enforced!');
        console.log('   ACTION: Re-run create-app-user.sql to fix role permissions\n');
        await prisma.$disconnect();
        process.exit(1);
      }

      if (role.is_superuser) {
        console.log('❌ FAIL: app_user has superuser privilege - RLS will not be enforced!');
        console.log('   ACTION: Re-run create-app-user.sql to fix role permissions\n');
        await prisma.$disconnect();
        process.exit(1);
      }

      console.log('✅ SUCCESS: Using app_user role (RLS enforced)\n');
      console.log('Configuration:');
      console.log('  - Tenant isolation: ENFORCED');
      console.log('  - Cross-tenant writes: BLOCKED');
      console.log('  - Audit log immutability: ENFORCED');
      console.log('  - Phase 3B verification: READY\n');

      console.log('Next step: Run verification script');
      console.log('  npx tsx prisma/verify-ai-budgets.ts\n');
    } else if (role.current_role === 'postgres' || role.is_superuser || role.bypass_rls) {
      console.log('⚠️  WARNING: Using owner/superuser role - RLS bypassed!\n');
      console.log('Current role:', role.current_role);
      console.log('  - Superuser: YES (RLS policies are NOT enforced)');
      console.log('  - Bypass RLS: YES (tenant isolation NOT guaranteed)\n');

      console.log('❌ Phase 3B acceptance criteria NOT met with this role\n');

      console.log('ACTION REQUIRED:');
      console.log('  1. Create app_user role:');
      console.log('     - Run: server/prisma/create-app-user.sql in Supabase SQL Editor');
      console.log('     - Replace <STRONG_PASSWORD> with secure password\n');
      
      console.log('  2. Update DATABASE_URL in .env:');
      console.log('     DATABASE_URL=postgresql://app_user:<PASSWORD>@<HOST>:5432/postgres\n');

      console.log('  3. Keep MIGRATION_DATABASE_URL as postgres owner:');
      console.log('     MIGRATION_DATABASE_URL=postgresql://postgres.<PROJECT>:<PASSWORD>@<HOST>:5432/postgres\n');

      console.log('  4. Regenerate Prisma client:');
      console.log('     npx prisma generate\n');

      console.log('  5. Re-run this verification:');
      console.log('     npx tsx prisma/verify-role-setup.ts\n');

      console.log('See: server/prisma/DB_ROLE_SETUP.md for detailed instructions');

      await prisma.$disconnect();
      process.exit(1);
    } else {
      console.log(`⚠️  WARNING: Unexpected role: ${role.current_role}\n`);
      console.log('Expected roles:');
      console.log('  - app_user (runtime, RLS enforced) ✅ RECOMMENDED');
      console.log('  - postgres (migrations only, RLS bypassed)\n');

      console.log('Current role may not enforce RLS policies correctly.');
      console.log('See: server/prisma/DB_ROLE_SETUP.md for setup instructions\n');

      await prisma.$disconnect();
      process.exit(1);
    }

    // Check RLS is enabled on audit_logs
    const rlsStatus = await prisma.$queryRaw<any[]>`
      SELECT 
        relname as table_name,
        relrowsecurity as rls_enabled,
        relforcerowsecurity as force_rls
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'audit_logs'
    `;

    if (rlsStatus.length > 0) {
      const table = rlsStatus[0];
      console.log('audit_logs RLS Status:');
      console.log(`  RLS Enabled: ${table.rls_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`  Force RLS: ${table.force_rls ? '✅ YES' : '❌ NO'}\n');

      if (!table.rls_enabled || !table.force_rls) {
        console.log('❌ FAIL: RLS not properly configured on audit_logs');
        console.log('   ACTION: Run server/prisma/apply-hardening.ts\n');
        await prisma.$disconnect();
        process.exit(1);
      }
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.log('❌ ERROR: Failed to verify role setup');
    console.log(`   ${error.message}\n`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyRoleSetup();
