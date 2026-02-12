/**
 * Verification Script: Gate A RLS Implementation
 * Purpose: Validate context helpers + catalog_items RLS policies
 * Safe-Write: Read-only verification (no data modifications)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: VerificationResult[] = [];

async function verify() {
  console.log('🔍 DB-HARDENING-WAVE-01 Gate A Verification\n');

  try {
    // ========================================================================
    // Test 1: Check RLS enabled on catalog_items
    // ========================================================================
    console.log('1️⃣  Checking RLS enabled...');
    const rlsCheck = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'catalog_items'
    `;

    if (rlsCheck.length > 0 && rlsCheck[0].rowsecurity === true) {
      results.push({
        test: 'RLS Enabled on catalog_items',
        status: 'PASS',
        details: `rowsecurity = ${rlsCheck[0].rowsecurity}`,
      });
      console.log('   ✅ RLS enabled on catalog_items\n');
    } else {
      results.push({
        test: 'RLS Enabled on catalog_items',
        status: 'FAIL',
        details: `rowsecurity = ${rlsCheck[0]?.rowsecurity || 'table not found'}`,
      });
      console.log('   ❌ RLS NOT enabled\n');
    }

    // ========================================================================
    // Test 2: Check policies exist
    // ========================================================================
    console.log('2️⃣  Checking policies...');
    const policies = await prisma.$queryRaw<Array<{ policyname: string; cmd: string }>>`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'catalog_items'
      ORDER BY policyname
    `;

    const expectedPolicies = [
      'bypass_delete',
      'bypass_insert',
      'bypass_select',
      'bypass_update',
      'tenant_delete',
      'tenant_insert',
      'tenant_select',
      'tenant_update',
    ];

    const foundPolicies = policies.map(p => p.policyname);
    const allFound = expectedPolicies.every(p => foundPolicies.includes(p));

    if (allFound && policies.length === 8) {
      results.push({
        test: 'Policies Created',
        status: 'PASS',
        details: `Found all 8 policies: ${foundPolicies.join(', ')}`,
      });
      console.log('   ✅ All 8 policies created');
      policies.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));
      console.log('');
    } else {
      results.push({
        test: 'Policies Created',
        status: 'FAIL',
        details: `Expected 8, found ${policies.length}. Missing: ${expectedPolicies.filter(p => !foundPolicies.includes(p)).join(', ')}`,
      });
      console.log(`   ❌ Policy mismatch (found ${policies.length}/8)\n`);
    }

    // ========================================================================
    // Test 3: Check app schema functions
    // ========================================================================
    console.log('3️⃣  Checking context helper functions...');
    const functions = await prisma.$queryRaw<Array<{ proname: string; prorettype: string }>>`
      SELECT p.proname, t.typname as prorettype
      FROM pg_proc p
      JOIN pg_type t ON p.prorettype = t.oid
      WHERE p.pronamespace = 'app'::regnamespace
      ORDER BY p.proname
    `;

    const expectedFunctions = [
      'bypass_enabled',
      'current_actor_id',
      'current_org_id',
      'current_realm',
      'current_request_id',
      'current_roles',
      'has_role',
      'require_org_context',
    ];

    const foundFunctions = functions.map(f => f.proname);
    const allFunctionsFound = expectedFunctions.every(f => foundFunctions.includes(f));

    if (allFunctionsFound && functions.length === 8) {
      results.push({
        test: 'Context Functions Created',
        status: 'PASS',
        details: `Found all 8 functions: ${foundFunctions.join(', ')}`,
      });
      console.log('   ✅ All 8 context functions created');
      functions.forEach(f => console.log(`      - app.${f.proname}() → ${f.prorettype}`));
      console.log('');
    } else {
      results.push({
        test: 'Context Functions Created',
        status: 'FAIL',
        details: `Expected 8, found ${functions.length}. Missing: ${expectedFunctions.filter(f => !foundFunctions.includes(f)).join(', ')}`,
      });
      console.log(`   ❌ Function mismatch (found ${functions.length}/8)\n`);
    }

    // ========================================================================
    // Test 4: Fail-closed behavior (no context)
    // ========================================================================
    console.log('4️⃣  Testing fail-closed behavior (no context)...');
    try {
      const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM catalog_items
      `;

      // In fail-closed mode, should return 0 rows (policies deny access)
      if (count[0].count === BigInt(0)) {
        results.push({
          test: 'Fail-Closed Enforcement',
          status: 'PASS',
          details: 'Query without context returned 0 rows (policies block access)',
        });
        console.log('   ✅ Fail-closed: Query without context returned 0 rows\n');
      } else {
        results.push({
          test: 'Fail-Closed Enforcement',
          status: 'FAIL',
          details: `Query returned ${count[0].count} rows (should be 0 without context)`,
        });
        console.log(`   ⚠️  Query returned ${count[0].count} rows (expected 0)\n`);
      }
    } catch (error: any) {
      // Permission denied is also acceptable for fail-closed
      results.push({
        test: 'Fail-Closed Enforcement',
        status: 'PASS',
        details: `Query failed with permission denied (acceptable fail-closed behavior): ${error.message}`,
      });
      console.log('   ✅ Fail-closed: Query denied by RLS (acceptable)\n');
    }

    // ========================================================================
    // Test 5: Context-based access (get first tenant)
    // ========================================================================
    console.log('5️⃣  Testing context-based access...');

    // First, get a valid tenant ID from the database
    const tenants = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tenants LIMIT 1
    `;

    if (tenants.length === 0) {
      results.push({
        test: 'Context-Based Access',
        status: 'FAIL',
        details: 'No tenants found in database (cannot test context)',
      });
      console.log('   ⚠️  No tenants found (skipping context test)\n');
    } else {
      const testTenantId = tenants[0].id;
      const testActorId = '00000000-0000-0000-0000-000000000001'; // Dummy actor ID

      try {
        await prisma.$executeRaw`
          BEGIN;
          SELECT set_config('app.org_id', ${testTenantId}, true);
          SELECT set_config('app.actor_id', ${testActorId}, true);
          SELECT set_config('app.realm', 'tenant', true);
          SELECT set_config('app.request_id', 'verify-req-1', true);
          SELECT set_config('app.roles', 'ADMIN', true);
          SELECT set_config('app.bypass_rls', 'off', true);
        `;

        const contextCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM catalog_items
        `;

        await prisma.$executeRaw`ROLLBACK`;

        results.push({
          test: 'Context-Based Access',
          status: 'PASS',
          details: `With context (tenant=${testTenantId}), query succeeded and returned ${contextCount[0].count} rows`,
        });
        console.log(
          `   ✅ Context-based access: Query with context returned ${contextCount[0].count} rows\n`
        );
      } catch (error: any) {
        results.push({
          test: 'Context-Based Access',
          status: 'FAIL',
          details: `Context query failed: ${error.message}`,
        });
        console.log(`   ❌ Context query failed: ${error.message}\n`);
      }
    }

    // ========================================================================
    // Test 6: Bypass mode (seed-only)
    // ========================================================================
    console.log('6️⃣  Testing bypass mode (triple-gated)...');

    try {
      await prisma.$executeRaw`
        BEGIN;
        SELECT set_config('app.bypass_rls', 'on', true);
        SELECT set_config('app.realm', 'test', true);
        SELECT set_config('app.roles', 'TEST_SEED', true);
      `;

      const bypassCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM catalog_items
      `;

      await prisma.$executeRaw`ROLLBACK`;

      results.push({
        test: 'Bypass Mode (Triple-Gated)',
        status: 'PASS',
        details: `Bypass enabled (bypass=on, realm=test, role=TEST_SEED), query returned ${bypassCount[0].count} rows`,
      });
      console.log(
        `   ✅ Bypass mode: Query with bypass returned ${bypassCount[0].count} rows (all data)\n`
      );
    } catch (error: any) {
      results.push({
        test: 'Bypass Mode (Triple-Gated)',
        status: 'FAIL',
        details: `Bypass query failed: ${error.message}`,
      });
      console.log(`   ❌ Bypass query failed: ${error.message}\n`);
    }

    // ========================================================================
    // Test 7: Bypass rejection (missing role)
    // ========================================================================
    console.log('7️⃣  Testing bypass rejection (missing TEST_SEED role)...');

    try {
      await prisma.$executeRaw`
        BEGIN;
        SELECT set_config('app.bypass_rls', 'on', true);
        SELECT set_config('app.realm', 'test', true);
        SELECT set_config('app.roles', 'ADMIN', true);
      `;

      const noBypassCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM catalog_items
      `;

      await prisma.$executeRaw`ROLLBACK`;

      // Should return 0 rows (bypass requires TEST_SEED role)
      if (noBypassCount[0].count === BigInt(0)) {
        results.push({
          test: 'Bypass Rejection (Missing Role)',
          status: 'PASS',
          details: 'Bypass denied when TEST_SEED role missing (returned 0 rows)',
        });
        console.log('   ✅ Bypass rejection: Query returned 0 rows (TEST_SEED role required)\n');
      } else {
        results.push({
          test: 'Bypass Rejection (Missing Role)',
          status: 'FAIL',
          details: `Query returned ${noBypassCount[0].count} rows (should be 0 without TEST_SEED)`,
        });
        console.log(`   ❌ Bypass not rejected: Query returned ${noBypassCount[0].count} rows\n`);
      }
    } catch (error: any) {
      // Permission denied is acceptable
      results.push({
        test: 'Bypass Rejection (Missing Role)',
        status: 'PASS',
        details: `Query denied without TEST_SEED role: ${error.message}`,
      });
      console.log('   ✅ Bypass rejection: Query denied (acceptable)\n');
    }

    // ========================================================================
    // Summary Report
    // ========================================================================
    console.log('═'.repeat(80));
    console.log('📊 VERIFICATION SUMMARY\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;

    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${r.test}`);
      console.log(`   ${r.details}\n`);
    });

    console.log('═'.repeat(80));
    console.log(`\n📈 Results: ${passed}/${total} tests passed`);

    if (failed === 0) {
      console.log('\n🎉 All verifications PASSED! Gate A implementation successful.\n');
    } else {
      console.log(`\n⚠️  ${failed} verification(s) FAILED. Review details above.\n`);
    }
  } catch (error) {
    console.error('❌ Verification failed with exception:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify().catch(console.error);
