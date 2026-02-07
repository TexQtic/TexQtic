import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectPolicy() {
  // Get full policy definition
  const policyDef = await prisma.$queryRaw<any[]>`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_strict'
  `;

  console.log('Policy Definition:');
  console.log(JSON.stringify(policyDef, null, 2));

  // Check RLS and FORCE RLS
  const tableInfo = await prisma.$queryRaw<any[]>`
    SELECT 
      relname as table_name,
      relrowsecurity as rls_enabled,      relforcerowsecurity as force_rls
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'audit_logs'
  `;

  console.log('\nTable RLS Status:');
  console.log(JSON.stringify(tableInfo, null, 2));

  await prisma.$disconnect();
}

inspectPolicy();
