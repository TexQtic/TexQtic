#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.$queryRaw<
    Array<{
      policyname: string;
      cmd: string;
      qual: string | null;
      with_check: string | null;
    }>
  >`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    ORDER BY cmd, policyname
  `;

  console.log('\n📋 Audit Logs RLS Policies:\n');
  for (const p of policies) {
    console.log(`Policy: ${p.policyname}`);
    console.log(`  Command: ${p.cmd}`);
    if (p.qual) console.log(`  USING: ${p.qual}`);
    if (p.with_check) console.log(`  WITH CHECK: ${p.with_check}`);
    console.log('');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(error => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
