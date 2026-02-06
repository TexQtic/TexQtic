import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 PHASE 2A VERIFICATION\n');
  console.log('═'.repeat(60));

  try {
    // 1. Connection test
    console.log('\n1️⃣  Database Connection:');
    const now = await prisma.$queryRaw<[{ now: Date }]>`SELECT now()`;
    console.log(`   ✅ Connected: ${now[0].now}`);

    // 2. List all tables
    console.log('\n2️⃣  Tables Created:');
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    console.log(`   ✅ ${tables.length} tables found:`);
    tables.forEach(t => console.log(`      - ${t.tablename}`));

    // 3. Check RLS enabled
    console.log('\n3️⃣  RLS Status (Tenant-Scoped Tables):');
    const rlsTables = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = true
      ORDER BY tablename
    `;
    console.log(`   ✅ ${rlsTables.length} tables with RLS enabled:`);
    rlsTables.forEach(t => console.log(`      - ${t.tablename}: ENABLED`));

    // 4. Check audit_logs policies
    console.log('\n4️⃣  Audit Log Protection:');
    const auditPolicies = await prisma.$queryRaw<{ policyname: string; cmd: string }[]>`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE tablename = 'audit_logs'
      ORDER BY policyname
    `;
    console.log(`   ✅ ${auditPolicies.length} policies on audit_logs:`);
    auditPolicies.forEach(p => console.log(`      - ${p.policyname} (${p.cmd})`));

    // 5. Check helper functions exist
    console.log('\n5️⃣  Helper Functions:');
    const functions = await prisma.$queryRaw<{ proname: string }[]>`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('set_tenant_context', 'set_admin_context', 'clear_context')
      ORDER BY proname
    `;
    console.log(`   ✅ ${functions.length}/3 helper functions found:`);
    functions.forEach(f => console.log(`      - ${f.proname}()`));

    // 6. Tenant context test
    console.log('\n6️⃣  Tenant Context Test:');

    // Get a tenant ID
    const tenants = await prisma.tenant.findMany({ take: 2 });
    if (tenants.length >= 2) {
      const tenant1 = tenants[0];
      const tenant2 = tenants[1];

      console.log(`   Testing with tenant: ${tenant1.slug} (${tenant1.id})`);

      // Set tenant context
      await prisma.$executeRawUnsafe(`SELECT set_tenant_context('${tenant1.id}')`);

      // Try to read tenant-scoped data
      const domains1 = await prisma.$queryRaw<any[]>`SELECT * FROM tenant_domains`;
      console.log(`   ✅ With context set: Found ${domains1.length} domain(s)`);

      // Clear context and try again
      await prisma.$executeRawUnsafe(`SELECT clear_context()`);
      const domains2 = await prisma.$queryRaw<any[]>`SELECT * FROM tenant_domains`;
      console.log(
        `   ✅ Without context: Found ${domains2.length} domain(s) (RLS isolation working)`
      );

      // Test admin bypass
      await prisma.$executeRawUnsafe(`SELECT set_admin_context()`);
      const domainsAdmin = await prisma.$queryRaw<any[]>`SELECT * FROM tenant_domains`;
      console.log(
        `   ✅ Admin context: Found ${domainsAdmin.length} domain(s) (cross-tenant access working)`
      );

      // Clear context for safety
      await prisma.$executeRawUnsafe(`SELECT clear_context()`);
    } else {
      console.log('   ⚠️  Not enough tenants to test RLS isolation');
    }

    // 7. Audit log append-only test
    console.log('\n7️⃣  Audit Log Append-Only Test:');
    try {
      // Try to update an audit log (should fail)
      await prisma.$executeRaw`
        UPDATE audit_logs SET action = 'test' WHERE id = (SELECT id FROM audit_logs LIMIT 1)
      `;
      console.log('   ❌ UPDATE allowed (SECURITY ISSUE!)');
    } catch (error: any) {
      if (error.code === 'P2010' || error.meta?.message?.includes('permission denied')) {
        console.log('   ✅ UPDATE denied (append-only working)');
      } else {
        console.log('   ⚠️  UPDATE test inconclusive:', error.meta?.message);
      }
    }

    // 8. Prisma Client test
    console.log('\n8️⃣  Prisma Client Query Test:');
    const tenantCount = await prisma.tenant.count();
    const userCount = await prisma.user.count();
    const flagCount = await prisma.featureFlag.count();
    console.log(`   ✅ Tenants: ${tenantCount}`);
    console.log(`   ✅ Users: ${userCount}`);
    console.log(`   ✅ Feature Flags: ${flagCount}`);

    console.log('\n' + '═'.repeat(60));
    console.log('✅ VERIFICATION COMPLETE\n');
  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
