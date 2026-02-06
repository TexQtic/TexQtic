import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for all users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ============================================================
  // 1. Create Admin Users
  // ============================================================
  console.log('Creating admin users...');

  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@omniplatform.io' },
    update: {},
    create: {
      email: 'admin@omniplatform.io',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const supportAdmin = await prisma.adminUser.upsert({
    where: { email: 'support@omniplatform.io' },
    update: {},
    create: {
      email: 'support@omniplatform.io',
      passwordHash,
      role: 'SUPPORT',
    },
  });

  console.log(`✓ Created admins: ${superAdmin.email}, ${supportAdmin.email}`);

  // ============================================================
  // 2. Create Tenants
  // ============================================================
  console.log('Creating tenants...');

  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      slug: 'acme-corp',
      name: 'Acme Corporation',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'white-label-co' },
    update: {},
    create: {
      slug: 'white-label-co',
      name: 'White Label Co',
      type: 'B2C',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
    },
  });

  console.log(`✓ Created tenants: ${tenant1.slug}, ${tenant2.slug}`);

  // ============================================================
  // 3. Create Tenant Domains
  // ============================================================
  console.log('Creating tenant domains...');

  await prisma.tenantDomain.upsert({
    where: { domain: 'acme.example.com' },
    update: {},
    create: {
      tenantId: tenant1.id,
      domain: 'acme.example.com',
      verified: true,
      primary: true,
    },
  });

  await prisma.tenantDomain.upsert({
    where: { domain: 'whitelabel.example.com' },
    update: {},
    create: {
      tenantId: tenant2.id,
      domain: 'whitelabel.example.com',
      verified: true,
      primary: true,
    },
  });

  console.log('✓ Created tenant domains');

  // ============================================================
  // 4. Create Tenant Branding
  // ============================================================
  console.log('Creating tenant branding...');

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant1.id },
    update: {},
    create: {
      tenantId: tenant1.id,
      logoUrl: 'https://example.com/logos/acme.png',
      themeJson: {
        primaryColor: '#1E40AF',
        secondaryColor: '#64748B',
        fontFamily: 'Inter',
      },
    },
  });

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant2.id },
    update: {},
    create: {
      tenantId: tenant2.id,
      logoUrl: 'https://example.com/logos/whitelabel.png',
      themeJson: {
        primaryColor: '#7C3AED',
        secondaryColor: '#A78BFA',
        fontFamily: 'Roboto',
      },
    },
  });

  console.log('✓ Created tenant branding');

  // ============================================================
  // 5. Create Tenant Users
  // ============================================================
  console.log('Creating tenant users...');

  const user1 = await prisma.user.upsert({
    where: { email: 'owner@acme.example.com' },
    update: {},
    create: {
      email: 'owner@acme.example.com',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'owner@whitelabel.example.com' },
    update: {},
    create: {
      email: 'owner@whitelabel.example.com',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✓ Created users: ${user1.email}, ${user2.email}`);

  // ============================================================
  // 6. Create Memberships
  // ============================================================
  console.log('Creating memberships...');

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user1.id,
        tenantId: tenant1.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      tenantId: tenant1.id,
      role: 'OWNER',
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user2.id,
        tenantId: tenant2.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      tenantId: tenant2.id,
      role: 'OWNER',
    },
  });

  console.log('✓ Created memberships');

  // ============================================================
  // 7. Create Feature Flags
  // ============================================================
  console.log('Creating feature flags...');

  const flags = [
    {
      key: 'KILL_SWITCH_ALL',
      enabled: false,
      description: 'Global kill switch - disables entire platform',
    },
    {
      key: 'AI_INSIGHTS_ENABLED',
      enabled: true,
      description: 'Enable AI-powered insights feature',
    },
    {
      key: 'ADVANCED_ANALYTICS',
      enabled: true,
      description: 'Enable advanced analytics dashboard',
    },
    {
      key: 'MULTI_CURRENCY',
      enabled: false,
      description: 'Enable multi-currency support',
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  console.log(`✓ Created ${flags.length} feature flags`);

  // ============================================================
  // 8. Create Tenant Feature Overrides
  // ============================================================
  console.log('Creating tenant feature overrides...');

  await prisma.tenantFeatureOverride.upsert({
    where: {
      tenantId_key: {
        tenantId: tenant1.id,
        key: 'MULTI_CURRENCY',
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      key: 'MULTI_CURRENCY',
      enabled: true, // Override: enable for this tenant
    },
  });

  console.log('✓ Created tenant feature overrides');

  // ============================================================
  // 9. Create AI Budgets
  // ============================================================
  console.log('Creating AI budgets...');

  await prisma.aiBudget.upsert({
    where: { tenantId: tenant1.id },
    update: {},
    create: {
      tenantId: tenant1.id,
      monthlyLimit: 100000, // 100k tokens
      hardStop: false,
    },
  });

  await prisma.aiBudget.upsert({
    where: { tenantId: tenant2.id },
    update: {},
    create: {
      tenantId: tenant2.id,
      monthlyLimit: 500000, // 500k tokens
      hardStop: true,
    },
  });

  console.log('✓ Created AI budgets');

  // ============================================================
  // 10. Create AI Usage Meters
  // ============================================================
  console.log('Creating AI usage meters...');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  await prisma.aiUsageMeter.upsert({
    where: {
      tenantId_month: {
        tenantId: tenant1.id,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      tenantId: tenant1.id,
      month: currentMonth,
      tokens: 15000,
      costEstimate: 0.75,
    },
  });

  await prisma.aiUsageMeter.upsert({
    where: {
      tenantId_month: {
        tenantId: tenant2.id,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      tenantId: tenant2.id,
      month: currentMonth,
      tokens: 85000,
      costEstimate: 4.25,
    },
  });

  console.log('✓ Created AI usage meters');

  // ============================================================
  // 11. Create Audit Logs (Append-only)
  // ============================================================
  console.log('Creating audit logs...');

  const auditLogs = [
    {
      realm: 'ADMIN',
      tenantId: null,
      actorId: superAdmin.id,
      actorType: 'ADMIN',
      action: 'CREATE_TENANT',
      entity: 'TENANT',
      entityId: tenant1.id,
      afterJson: { slug: tenant1.slug, name: tenant1.name },
    },
    {
      realm: 'ADMIN',
      tenantId: null,
      actorId: superAdmin.id,
      actorType: 'ADMIN',
      action: 'CREATE_TENANT',
      entity: 'TENANT',
      entityId: tenant2.id,
      afterJson: { slug: tenant2.slug, name: tenant2.name },
    },
    {
      realm: 'TENANT',
      tenantId: tenant1.id,
      actorId: user1.id,
      actorType: 'USER',
      action: 'UPDATE_BRANDING',
      entity: 'TENANT_BRANDING',
      afterJson: { logoUrl: 'https://example.com/logos/acme.png' },
    },
    {
      realm: 'ADMIN',
      tenantId: tenant1.id,
      actorId: supportAdmin.id,
      actorType: 'ADMIN',
      action: 'UPDATE_AI_BUDGET',
      entity: 'AI_BUDGET',
      beforeJson: { monthlyLimit: 50000 },
      afterJson: { monthlyLimit: 100000 },
    },
    {
      realm: 'TENANT',
      tenantId: tenant2.id,
      actorId: user2.id,
      actorType: 'USER',
      action: 'INVITE_MEMBER',
      entity: 'INVITE',
      afterJson: { email: 'member@whitelabel.example.com', role: 'MEMBER' },
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log as any });
  }

  console.log(`✓ Created ${auditLogs.length} audit log entries`);

  console.log('✅ Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
