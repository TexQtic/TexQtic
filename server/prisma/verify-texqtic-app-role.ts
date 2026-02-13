import { prisma } from '../src/db/prisma.js';

console.log('\n=== Verify texqtic_app Role ===');
const role = await prisma.$queryRaw<
  Array<{
    rolname: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcanlogin: boolean;
  }>
>`
  SELECT
    rolname,
    rolsuper,
    rolbypassrls,
    rolcanlogin
  FROM pg_roles
  WHERE rolname = 'texqtic_app'
`;

console.log(JSON.stringify(role, null, 2));

if (!role || role.length === 0) {
  console.log('\n❌ Role texqtic_app NOT found');
  process.exit(1);
}

const r = role[0];
if (r.rolsuper) {
  console.log('\n❌ Role has SUPERUSER (should be false)');
  process.exit(1);
}

if (r.rolbypassrls) {
  console.log('\n❌ Role has BYPASSRLS (should be false)');
  process.exit(1);
}

if (!r.rolcanlogin) {
  console.log('\n❌ Role cannot LOGIN (should be true)');
  process.exit(1);
}

console.log('\n✅ Role texqtic_app configured correctly:');
console.log('   - NOSUPERUSER (will not bypass security)');
console.log('   - NOBYPASSRLS (RLS will be enforced)');
console.log('   - LOGIN enabled (can connect)');

console.log('\n📋 NEXT STEP REQUIRED (MANUAL):');
console.log('   Update DATABASE_URL in server/.env to use texqtic_app:');
console.log(
  '   DATABASE_URL="postgresql://texqtic_app:<password>@...pooler.../postgres?sslmode=require"'
);
console.log('');
console.log('   Keep DIRECT_URL as postgres (for migrations only).');

process.exit(0);
