import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNullStringBug() {
  console.log('🔍 Testing "null" String vs NULL Bug\n');

  console.log('1️⃣  Testing current_setting return value...');
  const test1 = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.tenant_id', true) as value,
      current_setting('app.tenant_id', true) IS NULL as is_null,
      current_setting('app.tenant_id', true) IS NOT NULL as is_not_null,
      current_setting('app.tenant_id', true) = 'null' as equals_null_string,
      NULLIF(current_setting('app.tenant_id', true), '') as nullif_empty,
      NULLIF(current_setting('app.tenant_id', true), 'null') as nullif_null_string
  `;
  console.log('   Result:');
  console.log(JSON.stringify(test1[0], null, 2));
  console.log('');

  console.log('2️⃣  Testing the EXACT old policy condition...');
  const test2 = await prisma.$queryRaw<Array<any>>`
    SELECT 
      (current_setting('app.tenant_id', true) IS NOT NULL) as condition_result
  `;
  console.log(
    `   (current_setting('app.tenant_id', true) IS NOT NULL) = ${test2[0].condition_result}`
  );
  console.log('');

  console.log('3️⃣  Checking typeof and length...');
  const test3 = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.tenant_id', true) as value,
      length(current_setting('app.tenant_id', true)) as len,
      pg_typeof(current_setting('app.tenant_id', true)) as type
  `;
  console.log(`   Value: "${test3[0].value}"`);
  console.log(`   Length: ${test3[0].len}`);
  console.log(`   Type: ${test3[0].type}`);
  console.log('');

  console.log('4️⃣  Testing if this is why rows are visible...');
  if (test2[0].condition_result === true) {
    console.log('   ❌ BUG CONFIRMED: current_setting returns string "null", not SQL NULL!');
    console.log('   This causes (IS NOT NULL) to return TRUE, making old policy pass.');
    console.log('   OLD POLICY MUST BE DROPPED OR FIXED.');
  } else {
    console.log('   ✅ No bug: current_setting properly returns NULL.');
  }

  await prisma.$disconnect();
}

testNullStringBug();
