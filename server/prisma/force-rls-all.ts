import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceRLSOnAllTables() {
  console.log('🔒 Forcing RLS on all tenant-scoped tables\n');

  const tenantScopedTables = [
    'tenant_domains',
    'tenant_branding',
    'memberships',
    'invites',
    'password_reset_tokens',
    'tenant_feature_overrides',
    'ai_budgets',
    'ai_usage_meters',
    'impersonation_sessions',
    'audit_logs',
  ];

  for (const table of tenantScopedTables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      console.log(`✓ ${table}: RLS forced`);
    } catch (e: any) {
      console.log(`⚠ ${table}:`, e.meta?.message || 'Error');
    }
  }

  console.log('\n✅ RLS forcing complete!');
  console.log('\nNote: FORCE ROW LEVEL SECURITY ensures policies apply even to superuser roles.');

  await prisma.$disconnect();
}

forceRLSOnAllTables();
