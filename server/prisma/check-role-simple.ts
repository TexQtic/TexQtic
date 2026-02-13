import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRole() {
  console.log('🔍 Checking Database Role and RLS Settings\n');

  // Check current role (simplified)
  console.log('1️⃣  Checking current database role...');
  const roleCheck = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_user as username,
     usesuper as is_superuser
    FROM pg_user
    WHERE usename = current_user
  `;
  console.log(`   Current user: ${roleCheck[0].username}`);
  console.log(`   Is superuser: ${roleCheck[0].is_superuser}\n`);

  // Check table RLS status
  console.log('2️⃣  Checking RLS enforcement status...');
  const rlsStatus = await prisma.$queryRaw<Array<any>>`
    SELECT 
      relname,
      relrowsecurity as rls_enabled,
      relforcerowsecurity as rls_forced
    FROM pg_class
    WHERE relname = 'catalog_items'
  `;
  console.log(`   Table: ${rlsStatus[0].relname}`);
  console.log(`   RLS enabled: ${rlsStatus[0].rls_enabled}`);
  console.log(`   RLS forced (for table owner): ${rlsStatus[0].rls_forced}\n`);

  // Important note
  if (roleCheck[0].is_superuser || !rlsStatus[0].rls_forced) {
    console.log('⚠️  IMPORTANT:');
    if (roleCheck[0].is_superuser) {
      console.log('   Superusers bypass RLS by default!');
      console.log('   Production app should NOT use superuser role.');
    }
    if (!rlsStatus[0].rls_forced) {
      console.log('   RLS not forced for table owner.');
      console.log('   Run: ALTER TABLE catalog_items FORCE ROW LEVEL SECURITY;');
      console.log('   This ensures even table owner respects RLS policies.');
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkRole();
