/**
 * Check schema usage grants for app_user on 'app' schema
 * Usage: pnpm tsx scripts/diag-schema-grants.ts
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Check if app_user has USAGE on schema 'app'
  const schemaGrants = await p.$queryRawUnsafe<Array<{ has_usage: boolean }>>(
    `SELECT has_schema_privilege('app_user', 'app', 'USAGE') AS has_usage`
  );
  console.log('app_user USAGE on schema app:', schemaGrants[0].has_usage);

  // Check if texqtic_app has USAGE on schema 'app'
  const schemaGrants2 = await p.$queryRawUnsafe<Array<{ has_usage: boolean }>>(
    `SELECT has_schema_privilege('texqtic_app', 'app', 'USAGE') AS has_usage`
  );
  console.log('texqtic_app USAGE on schema app:', schemaGrants2[0].has_usage);

  // Check EXECUTE on key app.* functions for app_user
  const funcs = [
    'app.require_org_context()',
    'app.bypass_enabled()',
    'app.current_org_id()',
    'app.bypass_enabled()',
  ];
  for (const fn of funcs) {
    try {
      const r = await p.$queryRawUnsafe<Array<{ has_exec: boolean }>>(
        `SELECT has_function_privilege('app_user', '${fn}', 'EXECUTE') AS has_exec`
      );
      console.log(`app_user EXECUTE on ${fn}: ${r[0].has_exec}`);
    } catch (e: any) {
      console.log(`app_user EXECUTE on ${fn}: ERROR ${e.message}`);
    }
  }
}
main().finally(() => p.$disconnect());
