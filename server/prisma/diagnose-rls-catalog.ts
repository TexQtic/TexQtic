import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing RLS Configuration\n');

  // Check catalog items count
  console.log('1️⃣  Checking catalog_items count...');
  const items = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM catalog_items
  `;
  console.log(`   Total catalog items: ${items[0].count}\n`);

  // Check policy details for tenant_select
  console.log('2️⃣  Checking tenant_select policy USING clause...');
  const policy = await prisma.$queryRaw<Array<{ qual: string }>>`
    SELECT pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy
    WHERE polname = 'tenant_select' 
    AND polrelid = 'catalog_items'::regclass
  `;
  console.log(`   USING clause: ${policy[0]?.qual || 'NOT FOUND'}\n`);

  // Test context functions directly
  console.log('3️⃣  Testing context functions (no context set)...');
  const contextCheck = await prisma.$queryRaw<Array<any>>`
    SELECT 
      app.current_org_id() as org_id,
      app.require_org_context() as has_context,
      app.bypass_enabled() as bypass
  `;
  console.log(`   org_id: ${contextCheck[0].org_id}`);
  console.log(`   has_context: ${contextCheck[0].has_context}`);
  console.log(`   bypass: ${contextCheck[0].bypass}\n`);

  // Check old policy
  console.log('4️⃣  Checking old catalog_items_tenant_read policy...');
  const oldPolicy = await prisma.$queryRaw<Array<{ qual: string }>>`
    SELECT pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy
    WHERE polname = 'catalog_items_tenant_read' 
    AND polrelid = 'catalog_items'::regclass
  `;
  console.log(`   USING clause: ${oldPolicy[0]?.qual || 'NOT FOUND'}\n`);

  await prisma.$disconnect();
}

diagnose();
