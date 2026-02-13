import { prisma } from '../src/db/prisma.js';

console.log('\n=== Current Connection Role ===');
const currentRole = await prisma.$queryRaw<
  Array<{ current_user: string; current_role: string; row_security: string | null }>
>`
  SELECT
    current_user,
    current_role,
    current_setting('row_security', true) AS row_security
`;
console.log(JSON.stringify(currentRole, null, 2));

console.log('\n=== Role Privileges ===');
const rolePrivs = await prisma.$queryRaw<
  Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>
>`
  SELECT
    rolname,
    rolsuper,
    rolbypassrls
  FROM pg_roles
  WHERE rolname = current_user
`;
console.log(JSON.stringify(rolePrivs, null, 2));

if (rolePrivs[0]?.rolsuper || rolePrivs[0]?.rolbypassrls) {
  console.log('\n🚨 ROOT CAUSE CONFIRMED:');
  console.log(`   Role "${rolePrivs[0].rolname}" has SUPERUSER or BYPASSRLS attribute.`);
  console.log('   This role IGNORES all RLS policies (including FORCE RLS).');
  console.log('   Tenant isolation will NOT work until using an RLS-enforced role.');
} else {
  console.log('\n✅ Role is RLS-enforced (not superuser, not bypassrls)');
}

process.exit(0);
