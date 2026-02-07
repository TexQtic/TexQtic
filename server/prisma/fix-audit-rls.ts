import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAuditLogsPolicies() {
  console.log('Fixing audit_logs RLS policies...\n');

  try {
    // Drop existing policies
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;`);
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;`
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS audit_logs_admin_delete ON public.audit_logs;`
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS audit_logs_insert_strict ON public.audit_logs;`
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs;`
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;`
    );
    console.log('✅ Dropped existing policies\n');

    // Create SELECT policy: Tenant-scoped read (own logs only) OR admin can see all
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_select ON public.audit_logs
        FOR SELECT USING (
          (tenant_id = current_setting('app.tenant_id', true)::uuid)
          OR current_setting('app.is_admin', true) = 'true'
        );
    `);
    console.log('✅ Created SELECT policy (tenant isolation + admin bypass)\n');

    // Create INSERT policy: STRICT enforcement of tenant context
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_insert_strict ON public.audit_logs
        FOR INSERT WITH CHECK (
          -- Admin logs: tenant_id must be null AND must be admin context
          (tenant_id IS NULL AND current_setting('app.is_admin', true) = 'true')
          OR
          -- Tenant logs: tenant_id must match session context
          (tenant_id IS NOT NULL AND tenant_id = current_setting('app.tenant_id', true)::uuid)
        );
    `);
    console.log('✅ Created INSERT policy (strict tenant context enforcement)\n');

    // Create UPDATE policy: Deny all (append-only)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_no_update ON public.audit_logs
        FOR UPDATE USING (false);
    `);
    console.log('✅ Created UPDATE policy (deny all - append-only)\n');

    // Create DELETE policy: Admin-only
    await prisma.$executeRawUnsafe(`
      CREATE POLICY audit_logs_admin_delete ON public.audit_logs
        FOR DELETE USING (
          current_setting('app.is_admin', true) = 'true'
        );
    `);
    console.log('✅ Created DELETE policy (admin-only)\n');

    // Verify final state
    const policies = await prisma.$queryRaw<any[]>`
      SELECT policyname, cmd, with_check
      FROM pg_policies
      WHERE tablename = 'audit_logs'
      ORDER BY policyname
    `;

    console.log('\nFinal policies:');
    policies.forEach(p => {
      console.log(`  - ${p.policyname} (${p.cmd}): ${p.with_check || '(USING clause)'}`);
    });

    console.log('\n✅ SUCCESS: audit_logs RLS policies fixed\n');
  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuditLogsPolicies();
