import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFailClosed() {
  console.log('🔍 Testing Fail-Closed Behavior\n');

  console.log('1️⃣  Query catalog_items WITHOUT any context...');
  try {
    const result = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name FROM catalog_items
    `;
    console.log(`   ❌ FAIL: Query succeeded and returned ${result.length} rows`);
    console.log(`   (Should return 0 rows or throw error in fail-closed mode)`);
    if (result.length > 0) {
      console.log(`   First row: ${JSON.stringify(result[0])}`);
    }
  } catch (error: any) {
    console.log(`   ✅ PASS: Query properly denied`);
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n2️⃣  Checking which policy is allowing access...');
  const allowingPolicies = await prisma.$queryRaw<Array<any>>`
    SELECT 
      polname,
      polpermissive,
      pg_get_expr(polqual, polrelid) as using_clause
    FROM pg_policy
    WHERE polrelid = 'catalog_items'::regclass
    AND polcmd = 'r'
    ORDER BY polname
  `;

  console.log('   SELECT policies:');
  for (const policy of allowingPolicies) {
    console.log(`   - ${policy.polname}`);
    console.log(`     Type: ${policy.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
    console.log(`     USING: ${policy.using_clause}\n`);
  }

  await prisma.$disconnect();
}

testFailClosed();
