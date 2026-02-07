import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugRLSContext() {
  console.log('=== DEBUG: RLS Context During Cross-Tenant Test ===\n');

  // 1. Find two different tenants
  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    take: 2,
    select: { id: true, name: true },
  });

  if (tenants.length < 2) {
    console.log('❌ Need at least 2 tenants for this test');
    await prisma.$disconnect();
    return;
  }

  const [tenant1, tenant2] = tenants;
  console.log(`Tenant 1: ${tenant1.name} (${tenant1.id})`);
  console.log(`Tenant 2: ${tenant2.name} (${tenant2.id})\n`);

  // 2. Set context to Tenant 1
  await prisma.$executeRawUnsafe(`SELECT set_tenant_context('${tenant1.id}'::uuid);`);

  // 3. Verify context is set
  const contextCheck = await prisma.$queryRaw<any[]>`
    SELECT current_setting('app.tenant_id', true) as tenant_context,
           current_setting('app.is_admin', true) as is_admin;
  `;
  console.log('Session context:', contextCheck[0]);
  console.log();

  // 4. Try to insert with Tenant 1 ID (should succeed)
  try {
    await prisma.auditLog.create({
      data: {
        realm: 'TENANT',
        tenantId: tenant1.id, // Matches session context
        actorType: 'SYSTEM',
        actorId: null,
        action: 'DEBUG_TEST_SAME_TENANT',
        entity: 'test',
      },
    });
    console.log('✅ INSERT with matching tenant ID: SUCCESS (expected)\n');
  } catch (error: any) {
    console.log(`❌ INSERT with matching tenant ID: FAILED (unexpected!)`);
    console.log(`   Error: ${error.message}\n`);
  }

  // 5. Try to insert with Tenant 2 ID (should FAIL with RLS)
  try {
    await prisma.auditLog.create({
      data: {
        realm: 'TENANT',
        tenantId: tenant2.id, // DIFFERENT from session context!
        actorType: 'SYSTEM',
        actorId: null,
        action: 'DEBUG_TEST_CROSS_TENANT',
        entity: 'test',
      },
    });
    console.log(`❌ INSERT with cross-tenant ID: SUCCESS (RLS NOT ENFORCING!)\n`);
    console.log(`   This is a BUG - RLS should have blocked this write.\n`);
  } catch (error: any) {
    if (error.message.includes('row-level security') || error.message.includes('policy')) {
      console.log('✅ INSERT with cross-tenant ID: BLOCKED by RLS (expected)\n');
    } else {
      console.log(`⚠️  INSERT with cross-tenant ID: Failed with different error`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // 6. Clear context
  await prisma.$executeRawUnsafe(`SELECT clear_context();`);
  console.log('Context cleared');

  await prisma.$disconnect();
}

debugRLSContext();
