#!/usr/bin/env tsx

/**
 * Apply RLS Policy UUID Casting Fix
 * 
 * This script applies the fixed RLS policies to the database.
 * Fixes UUID casting error that occurred when admin context was set.
 * 
 * Root cause: set_admin_context() was setting app.tenant_id to empty string '',
 * which caused "invalid input syntax for type uuid" when policies tried to cast it.
 * 
 * Solution:
 * 1. Update set_admin_context() and clear_context() to use NULL instead of ''
 * 2. Update all RLS policies to check for NULL before casting to avoid the error
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying RLS policy fixes to database...\n');

  try {
    // Read the fixed rls.sql file
    const rlsSqlPath = path.join(__dirname, 'rls.sql');
    const rlsSql = fs.readFileSync(rlsSqlPath, 'utf8');

    console.log('📄 Loaded rls.sql with fixes');
    console.log('   - Updated set_admin_context() to use NULL instead of empty string');
    console.log('   - Updated clear_context() to use NULL instead of empty string');
    console.log('   - Updated all policies to check NULL before UUID casting\n');

    // Drop existing policies first
    console.log('🗑️  Dropping existing RLS policies...');
    
    const tables = [
      'tenant_domains',
      'tenant_branding',
      'memberships',
      'invites',
      'password_reset_tokens',
      'tenant_feature_overrides',
      'ai_budgets',
      'ai_usage_meters',
      'impersonation_sessions',
      'audit_logs'
    ];

    for (const table of tables) {
      // Get all policies for this table
      const policies = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = ${table}
      `;

      // Drop each policy
      for (const { policyname } of policies) {
        console.log(`   Dropping ${table}.${policyname}`);
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS ${policyname} ON ${table}`);
      }
    }

    console.log('\n✅ Dropped all existing policies\n');

    // Apply the fixed SQL using psql directly
    console.log('📝 Applying fixed RLS policies and helper functions via psql...\n');
    
    // Write a temporary file with just the CREATE statements
    const { execSync } = await import('child_process');
    const tmpPath = path.join(__dirname, 'temp-rls-apply.sql');
    fs.writeFileSync(tmpPath, rlsSql);
    
    // Use psql to apply the SQL
    const dbUrl = process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL or MIGRATION_DATABASE_URL not set');
    }
    
    try {
      execSync(`psql "${dbUrl}" -f "${tmpPath}"`, { stdio: 'inherit' });
      fs.unlinkSync(tmpPath);
    } catch (error) {
      fs.unlinkSync(tmpPath);
      throw error;
    }

    console.log('\n✅ Applied all fixed policies and functions\n');

    // Verify the fix by testing the helper functions
    console.log('🧪 Testing helper functions...\n');

    console.log('   Testing set_tenant_context()...');
    await prisma.$executeRawUnsafe(`SELECT set_tenant_context('00000000-0000-0000-0000-000000000001'::uuid, false)`);
    const tenantCtx = await prisma.$queryRaw<Array<{ tenant_id: string, is_admin: string }>>`
      SELECT 
        current_setting('app.tenant_id', true) as tenant_id,
        current_setting('app.is_admin', true) as is_admin
    `;
    console.log(`   ✅ Tenant context: tenant_id=${tenantCtx[0].tenant_id}, is_admin=${tenantCtx[0].is_admin}`);

    console.log('\n   Testing set_admin_context()...');
    await prisma.$executeRawUnsafe(`SELECT set_admin_context()`);
    const adminCtx = await prisma.$queryRaw<Array<{ tenant_id: string | null, is_admin: string }>>`
      SELECT 
        NULLIF(current_setting('app.tenant_id', true), '') as tenant_id,
        current_setting('app.is_admin', true) as is_admin
    `;
    console.log(`   ✅ Admin context: tenant_id=${adminCtx[0].tenant_id === null ? 'NULL' : adminCtx[0].tenant_id}, is_admin=${adminCtx[0].is_admin}`);

    console.log('\n   Testing clear_context()...');
    await prisma.$executeRawUnsafe(`SELECT clear_context()`);
    const clearCtx = await prisma.$queryRaw<Array<{ tenant_id: string | null, is_admin: string }>>`
      SELECT 
        NULLIF(current_setting('app.tenant_id', true), '') as tenant_id,
        current_setting('app.is_admin', true) as is_admin
    `;
    console.log(`   ✅ Cleared context: tenant_id=${clearCtx[0].tenant_id === null ? 'NULL' : clearCtx[0].tenant_id}, is_admin=${clearCtx[0].is_admin}`);

    // Test that admin context can now query audit_logs without error
    console.log('\n🧪 Testing admin query on audit_logs (this was failing before)...\n');
    
    await prisma.$executeRawUnsafe(`SELECT set_admin_context()`);
    
    const auditLogs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM audit_logs
    `;
    
    console.log(`   ✅ Successfully queried audit_logs in admin context: ${auditLogs[0].count} rows\n`);

    console.log('✅ RLS policy fix applied successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Fixed helper functions to use NULL instead of empty string');
    console.log('   - Updated all RLS policies with safe UUID comparison');
    console.log('   - Tested all helper functions');
    console.log('   - Verified admin context can query audit_logs without UUID casting error\n');
    console.log('🎉 TEST 8 should now pass!\n');

  } catch (error) {
    console.error('❌ Error applying RLS fixes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
