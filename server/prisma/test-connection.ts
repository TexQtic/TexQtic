import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('Testing DATABASE_URL connection...\n');
  console.log(`URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@')}\n`);

  const prisma = new PrismaClient();

  try {
    // Test basic connection
    const result = await prisma.$queryRaw<any[]>`SELECT current_user, current_database()`;
    console.log('✅ Connection successful!');
    console.log(`   User: ${result[0].current_user}`);
    console.log(`   Database: ${result[0].current_database}\n`);

    //Check if app_user role exists
    const roleCheck = await prisma.$queryRaw<any[]>`
      SELECT rolname, rolsuper, rolbypassrls 
      FROM pg_roles 
      WHERE rolname = 'app_user'
    `;

    if (roleCheck.length > 0) {
      console.log('✅ app_user role found in database');
      console.log(`   Superuser: ${roleCheck[0].rolsuper}`);
      console.log(`   Bypass RLS: ${roleCheck[0].rolbypassrls}\n`);
    } else {
      console.log('❌ app_user role NOT found in database!');
      console.log('   ACTION: Run create-app-user.sql in Supabase SQL Editor\n');
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.log('❌ Connection failed!');
    console.log(`   Error: ${error.message}\n`);

    if (error.message.includes('Tenant or user not found')) {
      console.log('This error means:');
      console.log('  1. app_user role does not exist in database, OR');
      console.log('  2. Password in DATABASE_URL is incorrect\n');
      console.log('To fix:');
      console.log('  1. Open Supabase SQL Editor');
      console.log('  2. Run: server/prisma/create-app-user.sql');
      console.log('  3. Ensure password matches DATABASE_URL in .env');
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
