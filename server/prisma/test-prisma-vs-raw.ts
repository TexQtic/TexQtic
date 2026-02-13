import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPrismaVsRaw() {
  console.log('🔍 Comparing Prisma ORM vs Raw SQL Query\n');

  console.log('1️⃣  Query via Prisma ORM (prisma.catalogItem.findMany)...');
  try {
    const prismaResult = await prisma.catalogItem.findMany();
    console.log(`   Result: ${prismaResult.length} rows`);
    if (prismaResult.length > 0) {
      console.log(`   First row ID: ${prismaResult[0].id}\n`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('2️⃣  Query via Prisma raw SQL ($queryRaw)...');
  try {
    const rawResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM catalog_items
    `;
    console.log(`   Result: ${rawResult[0].count} rows\n`);
  } catch (error: any) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('3️⃣  Query via Prisma raw execute ($executeRawUnsafe)...');
  try {
    const executeResult = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM catalog_items'
    );
    console.log(`   Result: ${executeResult.length} rows\n`);
  } catch (error: any) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log('4️⃣  Explicitly check if connection is somehow setting context...');
  const contextBefore = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.org_id', true) as org_id_before,
      app.bypass_enabled() as bypass_before
  `;
  console.log(
    `   Before query - org_id: ${contextBefore[0].org_id_before}, bypass: ${contextBefore[0].bypass_before}`
  );

  const items = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM catalog_items`;

  const contextAfter = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.org_id', true) as org_id_after,
      app.bypass_enabled() as bypass_after
  `;
  console.log(
    `   After query - org_id: ${contextAfter[0].org_id_after}, bypass: ${contextAfter[0].bypass_after}`
  );
  console.log(`   Rows returned: ${items.length}\n`);

  await prisma.$disconnect();
}

testPrismaVsRaw();
