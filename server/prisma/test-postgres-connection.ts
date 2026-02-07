import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATION_DATABASE_URL, // Test postgres owner connection
    },
  },
});

async function testConnection() {
  try {
    console.log('Testing MIGRATION_DATABASE_URL (postgres owner) connection...\n');

    const result = await prisma.$queryRaw<
      Array<{
        current_database: string;
        current_user: string;
      }>
    >`SELECT current_database(), current_user`;

    console.log('✅ Connection successful!');
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
  } catch (error: any) {
    console.log('❌ Connection failed!');
    console.log('   Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
