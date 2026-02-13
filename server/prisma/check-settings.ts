import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSettings() {
  console.log('🔍 Checking All app.* Settings\n');

  const settings = await prisma.$queryRaw<Array<any>>`
    SELECT 
      current_setting('app.org_id', true) as org_id,
      current_setting('app.actor_id', true) as actor_id,
      current_setting('app.realm', true) as realm,
      current_setting('app.request_id', true) as request_id,
      current_setting('app.roles', true) as roles,
      current_setting('app.bypass_rls', true) as bypass_rls,
      current_setting('app.tenant_id', true) as tenant_id
  `;

  console.log('Current settings:');
  console.log(JSON.stringify(settings[0], null, 2));

  console.log('\n🔍 Checking pg_settings for any app.* defaults\n');
  const pgSettings = await prisma.$queryRaw<Array<any>>`
    SELECT name, setting, boot_val, reset_val 
    FROM pg_settings 
    WHERE name LIKE 'app.%'
  `;

  if (pgSettings.length > 0) {
    console.log('Found pg_settings entries:');
    console.log(JSON.stringify(pgSettings, null, 2));
  } else {
    console.log('No pg_settings entries found for app.* (this is normal).');
  }

  // Check if there's a default value in pg_db_role_setting
  console.log('\n🔍 Checking pg_db_role_setting for role-specific defaults\n');
  const roleSettings = await prisma.$queryRaw<Array<any>>`
    SELECT 
      rolname,
      unnest(setconfig) as setting
    FROM pg_db_role_setting
    JOIN pg_roles ON pg_roles.oid = setrole
    WHERE setconfig::text LIKE '%app.%'
  `
    .then(result => result)
    .catch(() => []);

  if (roleSettings.length > 0) {
    console.log('⚠️  Found role-specific settings:');
    console.log(JSON.stringify(roleSettings, null, 2));
  } else {
    console.log('No role-specific app.* settings (this is expected).');
  }

  await prisma.$disconnect();
}

checkSettings();
