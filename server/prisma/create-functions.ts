import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHelperFunctions() {
  console.log('📋 Creating RLS helper functions...');

  try {
    // Function 1: set_tenant_context
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid, p_is_admin boolean DEFAULT false)
      RETURNS void AS $BODY$
      BEGIN
        PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
        PERFORM set_config('app.is_admin', p_is_admin::text, true);
      END;
      $BODY$ LANGUAGE plpgsql;
    `);
    console.log('✓ set_tenant_context() created');

    // Function 2: set_admin_context
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION set_admin_context()
      RETURNS void AS $BODY$
      BEGIN
        PERFORM set_config('app.tenant_id', '', true);
        PERFORM set_config('app.is_admin', 'true', true);
      END;
      $BODY$ LANGUAGE plpgsql;
    `);
    console.log('✓ set_admin_context() created');

    // Function 3: clear_context
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION clear_context()
      RETURNS void AS $BODY$
      BEGIN
        PERFORM set_config('app.tenant_id', '', true);
        PERFORM set_config('app.is_admin', 'false', true);
      END;
      $BODY$ LANGUAGE plpgsql;
    `);
    console.log('✓ clear_context() created');

    console.log('✅ All helper functions created successfully!');
  } catch (error) {
    console.error('❌ Error creating functions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createHelperFunctions();
