import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAuditLogs() {
  console.log('🔍 Checking audit_logs policies...\n');

  // Check current policies
  const policies = await prisma.$queryRaw<{ policyname: string; cmd: string }[]>`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'audit_logs' ORDER BY policyname
  `;

  console.log('Current policies:');
  policies.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));

  console.log('\n🔧 Creating missing audit_logs policies...\n');

  try {
    // Policy 1: audit_logs_tenant_read (SELECT)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_tenant_read ON audit_logs
        FOR SELECT
        USING (
          (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✓ audit_logs_tenant_read created');
  } catch (e: any) {
    if (e.meta?.message?.includes('already exists')) {
      console.log('⚠ audit_logs_tenant_read already exists');
    } else {
      console.error('❌', e.meta?.message);
    }
  }

  try {
    // Policy 2: audit_logs_insert (INSERT)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_insert ON audit_logs
        FOR INSERT
        WITH CHECK (true)
    `);
    console.log('✓ audit_logs_insert created');
  } catch (e: any) {
    if (e.meta?.message?.includes('already exists')) {
      console.log('⚠ audit_logs_insert already exists');
    } else {
      console.error('❌', e.meta?.message);
    }
  }

  try {
    // Policy 3: audit_logs_no_update (UPDATE) - CRITICAL
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_no_update ON audit_logs
        FOR UPDATE
        USING (false)
    `);
    console.log('✓ audit_logs_no_update created (CRITICAL - prevents modifications)');
  } catch (e: any) {
    if (e.meta?.message?.includes('already exists')) {
      console.log('⚠ audit_logs_no_update already exists');
    } else {
      console.error('❌', e.meta?.message);
    }
  }

  // Revoke UPDATE/DELETE permissions
  try {
    await prisma.$executeRawUnsafe(`REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC`);
    console.log('✓ UPDATE/DELETE permissions revoked');
  } catch (e: any) {
    console.log('⚠ Permission revocation:', e.meta?.message);
  }

  console.log('\n✅ Audit log protection complete!');

  await prisma.$disconnect();
}

fixAuditLogs();
