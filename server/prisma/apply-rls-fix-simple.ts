#!/usr/bin/env tsx

/**
 * Simple RLS Fix Application
 * Applies only the critical fixes needed for TEST 8
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying RLS policy fixes to database...\n');

  try {
    // Step 1: Update set_admin_context() function
    console.log('1️⃣  Updating set_admin_context() to use NULL instead of empty string...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION set_admin_context()
      RETURNS void AS $$
      BEGIN
        PERFORM set_config('app.tenant_id', NULL, true);
        PERFORM set_config('app.is_admin', 'true', true);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Updated set_admin_context()\n');

    // Step 2: Update clear_context() function
    console.log('2️⃣  Updating clear_context() to use NULL instead of empty string...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION clear_context()
      RETURNS void AS $$
      BEGIN
        PERFORM set_config('app.tenant_id', NULL, true);
        PERFORM set_config('app.is_admin', 'false', true);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Updated clear_context()\n');

    // Step 3: Drop and recreate the problematic audit_logs policy
    console.log('3️⃣  Updating audit_logs_tenant_read policy with safe UUID comparison...');
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS audit_logs_tenant_read ON audit_logs`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_tenant_read ON audit_logs
        FOR SELECT
        USING (
          (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL 
           AND tenant_id::text = current_setting('app.tenant_id', true))
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('   ✅ Updated audit_logs_tenant_read\n');

    // Verify the fix by testing the helper functions
    console.log('🧪 Testing fixes...\n');

    console.log('   Testing set_admin_context()...');
    await prisma.$executeRawUnsafe(`SELECT set_admin_context()`);
    const adminCtx = await prisma.$queryRaw<Array<{ tenant_id: string | null; is_admin: string }>>`
      SELECT 
        NULLIF(current_setting('app.tenant_id', true), '') as tenant_id,
        current_setting('app.is_admin', true) as is_admin
    `;
    console.log(
      `   ✅ Admin context: tenant_id=${adminCtx[0].tenant_id === null ? 'NULL' : adminCtx[0].tenant_id}, is_admin=${adminCtx[0].is_admin}`
    );

    // Test that admin context can now query audit_logs without error
    console.log('\n   Testing admin query on audit_logs (this was failing before)...\n');

    const auditLogs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM audit_logs
    `;

    console.log(
      `   ✅ Successfully queried audit_logs in admin context: ${auditLogs[0].count} rows\n`
    );

    console.log('✅ RLS policy fix applied successfully!\n');
    console.log('🎉 TEST 8 should now pass!\n');
  } catch (error) {
    console.error('❌ Error applying RLS fixes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
