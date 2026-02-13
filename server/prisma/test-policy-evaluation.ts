import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPolicyEvaluation() {
  console.log('🔍 Testing Policy Evaluation (No Context Set)\n');

  // Test each policy condition
  console.log('1️⃣  Evaluating bypass_select policy...');
  const bypassTest = await prisma.$queryRaw<Array<any>>`
    SELECT app.bypass_enabled() as result
  `;
  console.log(`   app.bypass_enabled() = ${bypassTest[0].result}`);
  console.log(`   Policy passes: ${bypassTest[0].result ? 'YES ❌' : 'NO ✅'}\n`);

  console.log('2️⃣  Evaluating catalog_items_tenant_read policy...');
  const oldPolicyTest = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.tenant_id', true) as tenant_id_setting,
      current_setting('app.tenant_id', true) IS NOT NULL as is_not_null,
      (current_setting('app.tenant_id', true) IS NOT NULL) AND (true) as full_condition
  `;
  console.log(`   tenant_id setting: "${oldPolicyTest[0].tenant_id_setting}"`);
  console.log(`   IS NOT NULL: ${oldPolicyTest[0].is_not_null}`);
  console.log(`   Full condition: ${oldPolicyTest[0].full_condition}`);
  console.log(`   Policy passes: ${oldPolicyTest[0].full_condition ? 'YES ❌' : 'NO ✅'}\n`);

  console.log('3️⃣  Evaluating tenant_select policy...');
  const newPolicyTest = await prisma.$queryRaw<Array<any>>`
    SELECT 
      app.require_org_context() as has_context,
      app.current_org_id() as org_id,
      app.bypass_enabled() as bypass,
      (app.require_org_context() AND app.current_org_id() IS NOT NULL AND NOT app.bypass_enabled()) as full_condition
  `;
  console.log(`   app.require_org_context() = ${newPolicyTest[0].has_context}`);
  console.log(`   app.current_org_id() = ${newPolicyTest[0].org_id}`);
  console.log(`   app.bypass_enabled() = ${newPolicyTest[0].bypass}`);
  console.log(`   Full condition: ${newPolicyTest[0].full_condition}`);
  console.log(`   Policy passes: ${newPolicyTest[0].full_condition ? 'YES ❌' : 'NO ✅'}\n`);

  console.log('4️⃣  Testing each catalog item row individually...');
  const items = await prisma.$queryRaw<Array<{ id: string; tenant_id: string }>>`
    SELECT id, tenant_id FROM catalog_items
  `;

  for (const item of items) {
    console.log(`\n   Catalog Item: ${item.id}`);
    console.log(`   tenant_id: ${item.tenant_id}`);

    // Test old policy condition for this specific row
    const rowTest = await prisma.$queryRaw<Array<any>>`
      SELECT 
        current_setting('app.tenant_id', true) as setting,
        $1::uuid as row_tenant_id,
        ($1::uuid = current_setting('app.tenant_id', true)::uuid) as matches
      FROM (VALUES (1)) as dummy
    `
      .then(r => r)
      .catch(e => [
        { setting: null, row_tenant_id: item.tenant_id, matches: null, error: e.message },
      ]);

    console.log(
      `   Old policy check: setting="${rowTest[0].setting}", matches=${rowTest[0].matches}`
    );
    if (rowTest[0].error) {
      console.log(`   Error: ${rowTest[0].error}`);
    }
  }

  await prisma.$disconnect();
}

testPolicyEvaluation();
