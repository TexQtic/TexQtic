import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function grantRoleMembership() {
  try {
    console.log('Granting app_user role to postgres...\n');

    await prisma.$executeRaw`GRANT app_user TO postgres`;

    console.log('✅ Successfully granted app_user to postgres');
    console.log('   Now postgres role can SET ROLE app_user');
  } catch (error: any) {
    console.log('❌ Failed to grant role');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

grantRoleMembership();
