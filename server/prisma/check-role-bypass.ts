import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRole() {
  console.log('🔍 Checking Database Role and RLS Settings\n');

  // Check current role
  console.log('1️⃣  Checking current database role...');
  const roleCheck = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_user as username,
      session_user as session_username,
      usesuper as is_superuser,
      rolbypassrls as bypass_rls_privilege
    FROM pg_user
    WHERE usename = current_user
  `;
  console.log(`   Current user: ${roleCheck[0].username}`);
  console.log(`   Session user: ${roleCheck[0].session_username}`);
  console.log(`   Is superuser: ${roleCheck[0].is_superuser}`);
  console.log(`   Has BYPASSRLS: ${roleCheck[0].bypass_rls_privilege}\n`);

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

  // Check table owner
  console.log('3️⃣  Checking table owner...');
  const owner = await prisma.$queryRaw<Array<any>>`
    SELECT 
      c.relname as table_name,
      u.usename as owner
    FROM pg_class c
    JOIN pg_user u ON c.relowner = u.usesysid
    WHERE c.relname = 'catalog_items'
  `;
  console.log(`   Table owner: ${owner[0].owner}`);
  console.log(`   Current user is owner: ${owner[0].owner === roleCheck[0].username}\n`);

  await prisma.$disconnect();
}

checkRole();
