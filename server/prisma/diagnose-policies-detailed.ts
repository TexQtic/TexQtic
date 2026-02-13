import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Step 1 — Active SELECT policies on catalog_items\n');

  const policies = await prisma.$queryRaw<
    Array<{
      polname: string;
      polcmd: string;
      polpermissive: boolean;
      using_expr: string | null;
      withcheck_expr: string | null;
    }>
  >`
    select
      polname,
      polcmd,
      polpermissive,
      pg_get_expr(polqual, polrelid) as using_expr,
      pg_get_expr(polwithcheck, polrelid) as withcheck_expr
    from pg_policy
    where polrelid = 'public.catalog_items'::regclass
    order by polcmd, polname
  `;

  console.log('Policies:');
  policies.forEach(p => {
    console.log(`\nPolicy: ${p.polname}`);
    console.log(`  Command: ${p.polcmd}`);
    console.log(`  Type: ${p.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
    console.log(`  USING: ${p.using_expr || '(none)'}`);
    console.log(`  WITH CHECK: ${p.withcheck_expr || '(none)'}`);
  });

  console.log('\n\n🔍 Table RLS flags\n');

  const tableFlags = await prisma.$queryRaw<
    Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>
  >`
    select
      relrowsecurity,
      relforcerowsecurity
    from pg_class
    where oid = 'public.catalog_items'::regclass
  `;

  console.log('RLS Enabled:', tableFlags[0].relrowsecurity);
  console.log('FORCE RLS (for table owner):', tableFlags[0].relforcerowsecurity);

  await prisma.$disconnect();
}

diagnose();
