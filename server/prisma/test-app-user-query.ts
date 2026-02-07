import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function testAppUserQuery() {
  try {
    console.log('Testing app_user SELECT on tenants...\n');

    // SET ROLE app_user
    await prisma.$executeRawUnsafe('SET ROLE app_user');
    console.log('✅ Switched to app_user role');

    // Try to query tenants
    const tenants = await prisma.tenant.findMany({ take: 5 });

    console.log(`\n✅ SUCCESS! Found ${tenants.length} tenant(s):`);
    tenants.forEach(t => {
      console.log(`   - ${t.name} (${t.slug})`);
    });
  } catch (error: any) {
    console.log('\n❌ FAILED!');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

testAppUserQuery();
