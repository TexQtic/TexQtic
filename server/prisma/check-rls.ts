import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRLS() {
  // Check if RLS is enabled
  const rlsStatus = await prisma.$queryRaw<any[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
  `;

  console.log('RLS Status:', JSON.stringify(rlsStatus, null, 2));

  // Check policies
  const policies = await prisma.$queryRaw<any[]>`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'audit_logs'
    ORDER BY policyname
  `;

  console.log('\nPolicies:', JSON.stringify(policies, null, 2));

  await prisma.$disconnect();
}

checkRLS();
