/**
 * Check permissive vs RESTRICTIVE for deny_all policies
 * Usage: pnpm tsx scripts/diag-permissive.ts
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const r = await p.$queryRawUnsafe<
    Array<{
      tablename: string;
      policyname: string;
      permissive: string;
      cmd: string;
      qual: string | null;
    }>
  >(`
    SELECT tablename, policyname, permissive::text, cmd, roles::text, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname LIKE '%deny%' OR tablename = 'tenants')
    ORDER BY tablename, policyname
  `);
  for (const row of r) {
    console.log(
      `${row.tablename}.${row.policyname}  permissive=${row.permissive}  cmd=${row.cmd}  qual=${row.qual}`
    );
  }
}
main().finally(() => p.$disconnect());
