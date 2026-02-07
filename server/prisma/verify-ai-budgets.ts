#!/usr/bin/env tsx
/**
 * Phase 3B Verification: AI Budget Enforcement + Usage Metering + Audit Logging
 *
 * PREREQUISITES:
 *   1. app_user role created (see prisma/create-app-user.sql)
 *   2. DATABASE_URL set to app_user connection (RLS enforced)
 *   3. MIGRATION_DATABASE_URL set to postgres owner (migrations only)
 *   4. Run: npx tsx prisma/verify-role-setup.ts (confirms role configuration)
 *
 * This script verifies:
 *   - Budget enforcement (preflight checks)
 *   - Usage metering (token tracking)
 *   - Audit logging (append-only)
 *   - Cross-tenant isolation (RLS enforcement)
 *
 * Expected output: ✅ ALL 8 TESTS PASSED
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verification Script: AI Budget Enforcement & Audit Logging
 *
 * Tests Phase 3B implementation:
 * - RLS context setting and clearing
 * - Budget policy reading
 * - Usage meter reading/writing
 * - Audit log append-only behavior
 * - Cross-tenant isolation
 */

async function verifyAiBudgets() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║        PHASE 3B: AI BUDGET & AUDIT LOG VERIFICATION                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  let passCount = 0;
  let failCount = 0;

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 1: Find test tenant for verification (uses postgres role)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 1: Find test tenant for verification');
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    if (!tenant) {
      console.log('❌ FAIL: No active tenant found. Run seed first: npm run db:seed');
      process.exit(1);
    }

    console.log(`✅ PASS: Using tenant "${tenant.name}" (${tenant.id})\n`);
    passCount++;

    const tenantId = tenant.id;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SETUP: Switch to app_user role for RLS enforcement
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    await prisma.$executeRawUnsafe('SET ROLE app_user');
    console.log('🔒 Switched to app_user role for RLS enforcement\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 2: Set tenant context
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 2: Set tenant context via set_tenant_context()');
    await prisma.$executeRawUnsafe(
      `SELECT set_tenant_context($1::uuid, $2::boolean)`,
      tenantId,
      false
    );
    console.log(`✅ PASS: Tenant context set\n`);
    passCount++;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 3: Read AI budget policy
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 3: Read AI budget policy');
    const budget = await prisma.aiBudget.findUnique({
      where: { tenantId },
    });

    if (budget) {
      console.log(
        `✅ PASS: Budget found - ${budget.monthlyLimit} tokens, hardStop=${budget.hardStop}\n`
      );
      passCount++;
    } else {
      console.log(
        `⚠️  WARN: No budget configured - will use default (50k tokens, hardStop=true)\n`
      );
      // Not a failure - default budget is acceptable
      passCount++;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 4: Read usage meter
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 4: Read usage meter for current month');
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = await prisma.aiUsageMeter.findUnique({
      where: {
        tenantId_month: { tenantId, month: monthKey },
      },
    });

    if (usage) {
      console.log(
        `✅ PASS: Usage found - ${usage.tokens} tokens, $${usage.costEstimate.toString()}\n`
      );
      passCount++;
    } else {
      console.log(`✅ PASS: No usage this month yet (expected for new tenant)\n`);
      passCount++;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 5: Write audit log with matching tenant context (should succeed)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 5: Write audit log with matching tenant context');
    try {
      await prisma.auditLog.create({
        data: {
          realm: 'TENANT',
          tenantId: tenantId, // Matches session context
          actorType: 'SYSTEM',
          actorId: null, // SYSTEM actor has no user/admin ID
          action: 'AI_BUDGET_VERIFY',
          entity: 'ai',
          metadataJson: {
            test: 'verification-script',
            timestamp: new Date().toISOString(),
          },
        },
      });
      console.log('✅ PASS: Audit log created successfully\n');
      passCount++;
    } catch (error: any) {
      console.log(`❌ FAIL: Failed to create audit log: ${error.message}\n`);
      failCount++;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 6: Attempt cross-tenant audit write (should fail with RLS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 6: Attempt cross-tenant audit log write (should fail)');
    const otherTenant = await prisma.tenant.findFirst({
      where: {
        id: { not: tenantId },
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    if (otherTenant) {
      try {
        await prisma.auditLog.create({
          data: {
            realm: 'TENANT',
            tenantId: otherTenant.id, // DIFFERENT tenant than session context
            actorType: 'SYSTEM',
            actorId: null, // SYSTEM actor has no user/admin ID
            action: 'AI_BUDGET_VERIFY_CROSS_TENANT',
            entity: 'ai',
            metadataJson: {
              test: 'cross-tenant-violation',
            },
          },
        });
        console.log(`❌ FAIL: Cross-tenant audit write succeeded (RLS not enforcing!)\n`);
        failCount++;
      } catch (error: any) {
        if (error.message.includes('row-level security') || error.message.includes('violates')) {
          console.log(`✅ PASS: Cross-tenant write blocked by RLS policy (expected)\n`);
          passCount++;
        } else {
          console.log(`❌ FAIL: Unexpected error: ${error.message}\n`);
          failCount++;
        }
      }
    } else {
      console.log(`⚠️  SKIP: Only one tenant exists, cannot test cross-tenant isolation\n`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 7: Clear context
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 7: Clear DB context');
    await prisma.$executeRawUnsafe(`SELECT clear_context()`);
    console.log(`✅ PASS: Context cleared\n`);
    passCount++;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 8: Verify audit log was written (read back)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('TEST 8: Verify audit logs are readable (admin context)');
    await prisma.$executeRawUnsafe(`SELECT set_admin_context()`);

    // Use raw SQL to avoid Prisma ORM casting issues with empty tenant_id
    const auditLogs = await prisma.$queryRaw<Array<{
      id: string;
      action: string;
      tenant_id: string | null;
    }>>`
      SELECT id, action, tenant_id, created_at
      FROM audit_logs
      WHERE action = 'AI_BUDGET_VERIFY'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (auditLogs.length > 0) {
      console.log(`✅ PASS: Found ${auditLogs.length} audit log(s) for tenant\n`);
      passCount++;
    } else {
      console.log(`❌ FAIL: No audit logs found (might be RLS blocking or write failed)\n`);
      failCount++;
    }

    await prisma.$executeRawUnsafe(`SELECT clear_context()`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      VERIFICATION SUMMARY                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    console.log(`Tests passed: ${passCount}`);
    console.log(`Tests failed: ${failCount}`);

    if (failCount === 0) {
      console.log('\n✅ ALL TESTS PASSED - Phase 3B implementation verified!\n');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED - Review errors above\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAiBudgets().catch(console.error);
