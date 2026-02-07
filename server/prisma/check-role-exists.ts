import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL, // Use postgres owner to query
    },
  },
});

async function checkRoleExists() {
  try {
    console.log('Checking if app_user role exists in database...\n');

    const result = await prisma.$queryRaw<
      Array<{
        rolname: string;
        rolsuper: boolean;
        rolcanlogin: boolean;
        rolbypassrls: boolean;
      }>
    >`
      SELECT rolname, rolsuper, rolcanlogin, rolbypassrls
      FROM pg_roles
      WHERE rolname = 'app_user'
    `;

    if (result.length === 0) {
      console.log('❌ app_user role DOES NOT EXIST in database');
      console.log('\nYou need to run create-app-user.sql in Supabase SQL Editor');
      process.exit(1);
    }

    const role = result[0];
    console.log('✅ app_user role EXISTS in database');
    console.log('\nRole details:');
    console.log(`  - Can login: ${role.rolcanlogin}`);
    console.log(`  - Superuser: ${role.rolsuper} (should be false)`);
    console.log(`  - Bypass RLS: ${role.rolbypassrls} (should be false)`);

    if (role.rolsuper || role.rolbypassrls) {
      console.log('\n⚠️  WARNING: Role has elevated privileges!');
    } else {
      console.log('\n✅ Role configuration is correct!');
    }
  } catch (error) {
    console.error('Error checking role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoleExists();
