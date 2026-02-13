import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBypass() {
  console.log('🔍 Checking Bypass Configuration\n');

  // Test bypass_select policy
  console.log('1️⃣  Checking bypass_select policy USING clause...');
  const bypassPolicy = await prisma.$queryRaw<Array<{ qual: string }>>`
    SELECT pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy
    WHERE polname = 'bypass_select' 
    AND polrelid = 'catalog_items'::regclass
  `;
  console.log(`   USING clause: ${bypassPolicy[0]?.qual || 'NOT FOUND'}\n`);

  // Check if bypass is enabled with no context
  console.log('2️⃣  Testing bypass_enabled() with no context...');
  const bypassCheck = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.bypass_rls', true) as bypass_rls_setting,
      current_setting('app.realm', true) as realm_setting,
      app.has_role('TEST_SEED') as has_test_seed,
      app.bypass_enabled() as bypass_result
  `;
  console.log(`   bypass_rls setting: "${bypassCheck[0].bypass_rls_setting}"`);
  console.log(`   realm setting: "${bypassCheck[0].realm_setting}"`);
  console.log(`   has_test_seed: ${bypassCheck[0].has_test_seed}`);
  console.log(`   bypass_enabled(): ${bypassCheck[0].bypass_result}\n`);

  // Check all SELECT policies and their types
  console.log('3️⃣  Checking all SELECT policies...');
  const allPolicies = await prisma.$queryRaw<Array<any>>`
    SELECT 
      polname,
      polpermissive,
      pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy
    WHERE polrelid = 'catalog_items'::regclass
    AND polcmd = 'r'
    ORDER BY polname
  `;
  console.log('   SELECT policies:');
  allPolicies.forEach(p => {
    console.log(`   - ${p.polname}: ${p.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
    console.log(`     ${p.qual}\n`);
  });

  await prisma.$disconnect();
}

checkBypass();
