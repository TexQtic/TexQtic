import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRole() {
  // Check current database role
  const roleInfo = await prisma.$queryRaw<any[]>`
    SELECT 
      current_user as current_role,
      session_user as session_role,
      usesuper as is_superuser,
      usename as role_name
    FROM pg_user
    WHERE usename = current_user
  `;

  console.log('Database Role Info:');
  console.log(JSON.stringify(roleInfo, null, 2));

  // Check DATABASE_URL from env
  console.log('\nDATABASE_URL user (from connection string):');
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):/);
    if (urlMatch) {
      console.log(`  User: ${urlMatch[1]}`);
    }
  }

  await prisma.$disconnect();
}

checkRole();
