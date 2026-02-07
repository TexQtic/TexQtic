import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function fixAuditLogPolicy() {
  try {
    console.log('Updating audit_logs RLS policy to enforce tenant matching on INSERT...\n');

    // Drop old INSERT policy
    await prisma.$executeRawUnsafe('DROP POLICY IF EXISTS audit_logs_insert ON audit_logs');
    console.log('✅ Dropped old audit_logs_insert policy');

    // Create new INSERT policy that enforces tenant matching
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_insert ON audit_logs
        FOR INSERT
        WITH CHECK (
          -- Allow if tenant_id matches session context
          tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
          -- OR if acting as admin
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✅ Created new audit_logs_insert policy with tenant enforcement');

    console.log('\n✅ Audit log RLS policy updated successfully!');
    console.log('   Now cross-tenant audit log writes will be blocked by RLS');
  } catch (error: any) {
    console.log('❌ Failed to update policy');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuditLogPolicy();
