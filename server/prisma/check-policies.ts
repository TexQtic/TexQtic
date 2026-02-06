import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicies() {
  const sql = `
    SELECT 
      pol.policyname,
      pol.cmd,
      pol.permissive::text as permiss,
      pg_get_expr(pol.qual, pol.polrelid) as using_clause,
      pg_get_expr(pol.with_check, pol.polrelid) as with_check_clause
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    WHERE c.relname = 'audit_logs'
    ORDER BY pol.cmd, pol.policyname
  `;

  const policies: any[] = await prisma.$queryRawUnsafe(sql);

  console.log(`\nFound ${policies.length} policies on audit_logs:\n`);
  policies.forEach(p => {
    console.log(`${p.policyname} (${p.cmd})`);
    console.log(`  USING: ${p.using_clause || 'null'}`);
  });

  await prisma.$disconnect();
}

checkPolicies();
