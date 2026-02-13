/**
 * Verify RLS Data - Check catalog_items tenant_ids and RLS configuration
 */

import { prisma } from '../src/db/prisma.js';

async function main() {
  // Check RLS configuration
  const rlsConfig = await prisma.$queryRaw<
    Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>
  >`
    SELECT relname, relrowsecurity, relforcerowsecurity 
    FROM pg_class 
    WHERE relname = 'catalog_items'
  `;
  console.log('\n=== RLS Configuration ===');
  console.log(JSON.stringify(rlsConfig, null, 2));

  // Check all TEST catalog_items with their tenant_ids
  const testItems = await prisma.$queryRaw<
    Array<{ id: string; sku: string; name: string; tenant_id: string }>
  >`
    SELECT id::text, sku, name, tenant_id::text 
    FROM catalog_items 
    WHERE sku LIKE 'TEST-%'
    ORDER BY sku
  `;
  console.log('\n=== TEST Catalog Items ===');
  console.log(JSON.stringify(testItems, null, 2));

  // Check active policies
  const policies = await prisma.$queryRaw<
    Array<{ polname: string; polcmd: string; polpermissive: string; qual: string }>
  >`
    SELECT 
      polname, 
      polcmd,
      polpermissive::text,
      pg_get_expr(polqual, polrelid) as qual
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'catalog_items'
    AND polcmd = 'r'
    ORDER BY polname
  `;
  console.log('\n=== Active SELECT Policies ===');
  console.log(JSON.stringify(policies, null, 2));

  // Test context functions
  const contextTest = await prisma.$queryRaw<
    Array<{
      current_org_id: string | null;
      require_org_context: boolean;
      bypass_enabled: boolean;
      raw_org_id: string | null;
    }>
  >`
    SELECT 
      app.current_org_id()::text as current_org_id,
      app.require_org_context() as require_org_context,
      app.bypass_enabled() as bypass_enabled,
      current_setting('app.org_id', true) as raw_org_id
  `;
  console.log('\n=== Context State (No Context Set) ===');
  console.log(JSON.stringify(contextTest, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
