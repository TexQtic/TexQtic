import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyFinalFixes() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║              APPLYING FINAL SECURITY FIXES                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 1: Update helper functions with fixed search_path
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━ FIX 1: Updating Helper Functions with Fixed search_path ━━━━\n');

    console.log('Updating set_tenant_context...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid, p_is_admin boolean DEFAULT false)
      RETURNS void
      LANGUAGE plpgsql
      SET search_path = public, pg_catalog
      AS $BODY$
      BEGIN
        PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
        PERFORM set_config('app.is_admin', p_is_admin::text, false);
      END;
      $BODY$
    `);
    console.log('✅ set_tenant_context updated');

    console.log('Updating set_admin_context...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.set_admin_context()
      RETURNS void
      LANGUAGE plpgsql
      SET search_path = public, pg_catalog
      AS $BODY$
      BEGIN
        PERFORM set_config('app.is_admin', 'true', false);
        PERFORM set_config('app.tenant_id', '', false);
      END;
      $BODY$
    `);
    console.log('✅ set_admin_context updated');

    console.log('Updating clear_context...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.clear_context()
      RETURNS void
      LANGUAGE plpgsql
      SET search_path = public, pg_catalog
      AS $BODY$
      BEGIN
        PERFORM set_config('app.tenant_id', '', false);
        PERFORM set_config('app.is_admin', 'false', false);
      END;
      $BODY$
    `);
    console.log('✅ clear_context updated\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 2: REVOKE privileges on _prisma_migrations
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━ FIX 2: Revoking Access to _prisma_migrations ━━━━\n');

    console.log('Revoking ALL on _prisma_migrations from anon, authenticated...');
    await prisma.$executeRawUnsafe(`
      REVOKE ALL ON public._prisma_migrations FROM anon, authenticated
    `);
    console.log('✅ Privileges revoked\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 3: REVOKE privileges on tenants
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━ FIX 3: Revoking Access to Control Plane Tables ━━━━\n');

    console.log('Revoking ALL on tenants from anon, authenticated...');
    await prisma.$executeRawUnsafe(`
      REVOKE ALL ON public.tenants FROM anon, authenticated
    `);
    console.log('✅ tenants: Privileges revoked');

    // Also ensure tenants has FORCE RLS
    console.log('Forcing RLS on tenants...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY
    `);
    console.log('✅ tenants: RLS forced\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║                   ALL FIXES APPLIED SUCCESSFULLY                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('❌ Error applying fixes:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyFinalFixes().catch(console.error);
