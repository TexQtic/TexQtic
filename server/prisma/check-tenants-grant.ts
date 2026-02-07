import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function checkGrants() {
  try {
    console.log('Checking app_user privileges on tenants table...\n');

    const privileges = await prisma.$queryRaw<
      Array<{
        table_name: string;
        privileges: string | null;
      }>
    >`
      SELECT table_name,
        string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
      FROM information_schema.table_privileges
      WHERE grantee = 'app_user'
        AND table_schema = 'public'
        AND table_name = 'tenants'
      GROUP BY table_name
    `;

    if (privileges.length === 0) {
      console.log('❌ app_user has NO privileges on tenants table!');
      console.log('\nGranting SELECT on tenants...');
      await prisma.$executeRawUnsafe('GRANT SELECT ON TABLE public.tenants TO app_user');
      console.log('✅ Granted SELECT on tenants');
    } else {
      console.log(`✅ app_user privileges on tenants: ${privileges[0].privileges}`);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGrants();
