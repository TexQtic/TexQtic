import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function checkAuditLogsPolicies() {
  try {
    console.log('Checking audit_logs RLS policies...\n');

    const policies = await prisma.$queryRaw<Array<{
      policyname: string;
      cmd: string;
      qual: string;
      with_check: string;
    }>>`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'audit_logs'
      ORDER BY policyname
    `;

    policies.forEach(policy => {
      console.log(`Policy: ${policy.policyname}`);
      console.log(`  Command: ${policy.cmd}`);
      console.log(`  USING: ${policy.qual || 'true'}`);
      console.log(`  WITH CHECK: ${policy.with_check || 'true'}`);
      console.log('');
    });

  } catch (error: any) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditLogsPolicies();
