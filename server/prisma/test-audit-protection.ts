import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAuditLogProtection() {
  console.log('🔒 Testing Audit Log Append-Only Protection\n');

  try {
    // First, check if there are any audit logs
    const logCount = await prisma.auditLog.count();
    console.log(`Current audit logs: ${logCount}`);

    if (logCount === 0) {
      console.log('No audit logs exist - trying to create one for testing...\n');

      // Get admin user for test
      const admin = await prisma.adminUser.findFirst();
      if (!admin) {
        console.log('❌ No admin user found');
        await prisma.$disconnect();
        return;
      }

      // Create a test audit log
      const testLog = await prisma.auditLog.create({
        data: {
          realm: 'ADMIN',
          actorId: admin.id,
          actorType: 'ADMIN',
          action: 'test.action',
          entity: 'test_entity',
          metadataJson: { test: true },
        },
      });

      console.log(`✓ Created test audit log: ${testLog.id}\n`);
    }

    // Get an audit log to test with
    const log = await prisma.auditLog.findFirst();
    if (!log) {
      console.log('❌ Could not find audit log for testing');
      await prisma.$disconnect();
      return;
    }

    console.log(`Testing with audit log: ${log.id}`);
    console.log(`  Action: ${log.action}\n`);

    // Test 1: Try UPDATE via Prisma
    console.log('Test 1: UPDATE via Prisma ORM');
    try {
      await prisma.auditLog.update({
        where: { id: log.id },
        data: { action: 'modified_action' },
      });
      console.log('  ❌ UPDATE succeeded (SECURITY ISSUE!)\n');
    } catch (error: any) {
      console.log('  ✅ UPDATE denied:', error.code || error.meta?.message || 'Permission denied');
      console.log('');
    }

    // Test 2: Try UPDATE via raw SQL
    console.log('Test 2: UPDATE via raw SQL');
    try {
      const result = await prisma.$executeRaw`
        UPDATE audit_logs SET action = 'direct_sql_update' WHERE id = ${log.id}::uuid
      `;
      if (result === 0) {
        console.log('  ✅ UPDATE denied (0 rows affected - policy blocked it)\n');
      } else {
        console.log(`  ❌ UPDATE succeeded (${result} rows affected - SECURITY ISSUE!)\n`);
      }
    } catch (error: any) {
      console.log('  ✅ UPDATE denied:', error.meta?.message || 'Permission denied');
      console.log('');
    }

    // Test 3: Try DELETE
    console.log('Test 3: DELETE via Prisma ORM');
    try {
      await prisma.auditLog.delete({
        where: { id: log.id },
      });
      console.log('  ❌ DELETE succeeded (SECURITY ISSUE!)\n');
    } catch (error: any) {
      console.log('  ✅ DELETE denied:', error.code || error.meta?.message || 'Permission denied');
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log('✅ Audit log protection test complete\n');
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditLogProtection();
