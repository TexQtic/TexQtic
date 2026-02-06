import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseRLS() {
  console.log('🔍 RLS Diagnosis\n');

  // Check current role
  const roleInfo = await prisma.$queryRaw<{ current_user: string; session_user: string }[]>`
    SELECT current_user, session_user
  `;
  console.log('Current role:', roleInfo[0]);

  // Check if role has BYPASSRLS
  const roleAttr = await prisma.$queryRaw<{ rolname: string; rolbypassrls: boolean }[]>`
    SELECT rolname, rolbypassrls 
    FROM pg_roles 
    WHERE rolname = current_user
  `;
  console.log('Role attributes:', roleAttr[0]);

  if (roleAttr[0].rolbypassrls) {
    console.log('\n⚠️  Current role has BYPASSRLS - RLS policies will not apply!');
    console.log('This is common with Supabase postgres superuser role.\n');
  }

  // Check table owner
  const tableOwner = await prisma.$queryRaw<{ tablename: string; tableowner: string }[]>`
    SELECT tablename, tableowner 
    FROM pg_tables 
    WHERE tablename = 'audit_logs' AND schemaname = 'public'
  `;
  console.log('Table owner:', tableOwner[0]);

  // Try forcing RLS on audit_logs
  console.log('\n🔧 Forcing RLS on audit_logs (FORCE ROW LEVEL SECURITY)...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY`);
    console.log('✓ RLS forced on audit_logs');
  } catch (e: any) {
    console.log('Already forced or error:', e.meta?.message);
  }

  // Check RLS status after forcing
  const rlsStatus = await prisma.$queryRaw<
    { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]
  >`
    SELECT relname, relrowsecurity, relforcerowsecurity 
    FROM pg_class 
    WHERE relname = 'audit_logs'
  `;
  console.log('\nRLS status:', rlsStatus[0]);

  await prisma.$disconnect();
}

diagnoseRLS();
