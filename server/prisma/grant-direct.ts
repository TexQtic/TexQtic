import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function grantDirectly() {
  try {
    console.log('Granting SELECT directly...\n');

    await prisma.$executeRawUnsafe('GRANT SELECT ON TABLE public.tenants TO app_user');
    console.log('✅ Granted SELECT on public.tenants');

    await prisma.$executeRawUnsafe('GRANT SELECT ON TABLE public.users TO app_user');
    console.log('✅ Granted SELECT on public.users');

    await prisma.$executeRawUnsafe('GRANT SELECT ON TABLE public.admin_users TO app_user');
    console.log('✅ Granted SELECT on public.admin_users');

    // Verify
    const privileges = await prisma.$queryRaw<
      Array<{
        tablename: string;
        privileges: string;
      }>
    >`
      SELECT table_name as tablename,
        string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
      FROM information_schema.table_privileges
      WHERE grantee = 'app_user'
        AND table_schema = 'public'
        AND table_name IN ('tenants', 'users', 'admin_users')
      GROUP BY table_name
      ORDER BY table_name
    `;

    console.log('\nVerified privileges:');
    privileges.forEach(p => {
      console.log(`  ${p.tablename}: ${p.privileges}`);
    });
  } catch (error: any) {
    console.log('❌ Failed');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

grantDirectly();
