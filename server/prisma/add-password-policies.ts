import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPasswordResetPolicies() {
  console.log('Adding policies to password_reset_tokens table...\n');
  console.log('Note: password_reset_tokens is user-scoped, not tenant-scoped directly\n');

  try {
    // SELECT policy - users can see their own tokens, admins can see all
    console.log('Creating SELECT policy...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY password_reset_tokens_user_select ON public.password_reset_tokens
        FOR SELECT USING (
          user_id IN (
            SELECT u.id FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
          )
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✅ SELECT policy created');

    // INSERT policy - within tenant or admin
    console.log('Creating INSERT policy...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY password_reset_tokens_user_insert ON public.password_reset_tokens
        FOR INSERT WITH CHECK (
          user_id IN (
            SELECT u.id FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
          )
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✅ INSERT policy created');

    // UPDATE policy - within tenant or admin
    console.log('Creating UPDATE policy...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY password_reset_tokens_user_update ON public.password_reset_tokens
        FOR UPDATE USING (
          user_id IN (
            SELECT u.id FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
          )
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✅ UPDATE policy created');

    // DELETE policy - within tenant or admin
    console.log('Creating DELETE policy...');
    await prisma.$executeRawUnsafe(`
      CREATE POLICY password_reset_tokens_user_delete ON public.password_reset_tokens
        FOR DELETE USING (
          user_id IN (
            SELECT u.id FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE m.tenant_id = current_setting('app.tenant_id', true)::uuid
          )
          OR current_setting('app.is_admin', true) = 'true'
        )
    `);
    console.log('✅ DELETE policy created');

    console.log('\n✅ All policies added successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPasswordResetPolicies().catch(console.error);
