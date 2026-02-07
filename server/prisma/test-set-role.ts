import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL,
    },
  },
});

async function testSetRole() {
  try {
    console.log('Testing SET ROLE app_user...\n');

    // Connect as postgres
    const before = await prisma.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
    console.log(`✅ Connected as: ${before[0].current_user}`);

    // Switch to app_user
    await prisma.$executeRaw`SET ROLE app_user`;

    const after = await prisma.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`;
    console.log(`✅ Switched to: ${after[0].current_user}`);

    // Try to query tenants table
    const tenants = await prisma.tenant.findMany({ take: 1 });
    console.log(`✅ Successfully queried tenants table as app_user`);
    console.log(`   Found ${tenants.length} tenant(s)`);
  } catch (error: any) {
    console.log('❌ Failed!');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

testSetRole();
