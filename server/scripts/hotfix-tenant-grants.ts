/**
 * Hotfix: Apply tenant table grants manually
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying hotfix: GRANT privileges on tenants table to texqtic_app...');

  await prisma.$executeRawUnsafe(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenants TO texqtic_app;
  `);

  console.log('✅ Grants applied successfully');

  // Verify
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM information_schema.table_privileges
    WHERE grantee = 'texqtic_app'
      AND table_schema = 'public'
      AND table_name = 'tenants'
      AND privilege_type = 'SELECT';
  `;

  if (Number(result[0].count) === 0) {
    throw new Error('Verification failed: SELECT grant not found');
  }

  console.log('✅ Verification passed: texqtic_app has required privileges on tenants');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
