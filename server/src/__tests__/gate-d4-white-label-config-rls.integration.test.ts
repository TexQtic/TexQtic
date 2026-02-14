/**
 * Gate D.4: Constitutional RLS Tests — White-Label Configuration Cluster
 * Tables: tenant_domains, tenant_branding, tenant_feature_overrides
 * Doctrine v1.4: Direct boundary (tenant_id), mutable config, fail-closed
 *
 * Test Strategy:
 * - Deterministic UUIDs for reproducibility
 * - Bypass-gated seeding (triple-gate verification)
 * - Tag-based cleanup (no test pollution)
 * - Sequential execution (--no-file-parallelism)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../db/prisma.js';
import { randomUUID } from 'node:crypto';
import { withDbContext, withBypassForSeed, type DatabaseContext } from '../lib/database-context.js';

// Test run ID (unique per execution)
const testRunId = randomUUID();

// Deterministic IDs (hex-compliant UUIDs)
const orgAId = `0000aa${testRunId.slice(6)}`; // Org A UUID
const orgBId = `0000bb${testRunId.slice(6)}`; // Org B UUID
const userAId = `00000a${testRunId.slice(6)}`; // User A UUID
const userBId = `00000b${testRunId.slice(6)}`; // User B UUID
const domainAId = `dddd0a${testRunId.slice(6)}`; // Domain A UUID
const domainBId = `dddd0b${testRunId.slice(6)}`; // Domain B UUID
const brandingAId = `bbbb0a${testRunId.slice(6)}`; // Branding A UUID
const brandingBId = `bbbb0b${testRunId.slice(6)}`; // Branding B UUID
const overrideAId = `ffff0a${testRunId.slice(6)}`; //Feature Override A UUID
const overrideBId = `ffff0b${testRunId.slice(6)}`; // Feature Override B UUID
const featureFlagKey = `test_flag_${testRunId.slice(0, 8)}`;

// Tracking created records for cleanup
const createdIds = {
  tenants: new Set<string>(),
  users: new Set<string>(),
  domains: new Set<string>(),
  branding: new Set<string>(),
  overrides: new Set<string>(),
  featureFlags: new Set<string>(),
};

describe('Gate D.4: RLS Enforcement — White-Label Configuration', () => {
  beforeAll(async () => {
    console.log(`[Gate D.4] Test run ID: ${testRunId}`);
    console.log(`[Gate D.4] Org A: ${orgAId}, Org B: ${orgBId}`);
  });

  afterAll(async () => {
    // Cleanup with bypass (test-only triple-gate)
    await withBypassForSeed(prisma, async tx => {
      // Delete feature overrides
      if (createdIds.overrides.size > 0) {
        await tx.tenantFeatureOverride.deleteMany({
          where: { id: { in: Array.from(createdIds.overrides) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.overrides.size} feature overrides`);
      }

      // Delete branding
      if (createdIds.branding.size > 0) {
        await tx.tenantBranding.deleteMany({
          where: { id: { in: Array.from(createdIds.branding) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.branding.size} branding records`);
      }

      // Delete domains
      if (createdIds.domains.size > 0) {
        await tx.tenantDomain.deleteMany({
          where: { id: { in: Array.from(createdIds.domains) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.domains.size} domains`);
      }

      // Delete users
      if (createdIds.users.size > 0) {
        await tx.user.deleteMany({
          where: { id: { in: Array.from(createdIds.users) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.users.size} users`);
      }

      // Delete tenants
      if (createdIds.tenants.size > 0) {
        await tx.tenant.deleteMany({
          where: { id: { in: Array.from(createdIds.tenants) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.tenants.size} tenants`);
      }

      // Delete feature flag
      if (createdIds.featureFlags.size > 0) {
        await tx.featureFlag.deleteMany({
          where: { key: { in: Array.from(createdIds.featureFlags) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.featureFlags.size} feature flags`);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TENANT ISOLATION — tenant_domains
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('should isolate Org A domains from Org B', async () => {
    // Seed: Create tenants + users + domains for Org A + B
    await withBypassForSeed(prisma, async tx => {
      await tx.tenant.createMany({
        data: [
          {
            id: orgAId,
            slug: `org-a-${testRunId.slice(0, 8)}`,
            name: 'Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
          {
            id: orgBId,
            slug: `org-b-${testRunId.slice(0, 8)}`,
            name: 'Org B',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
        ],
      });
      createdIds.tenants.add(orgAId);
      createdIds.tenants.add(orgBId);

      await tx.user.createMany({
        data: [
          {
            id: userAId,
            email: `d4-a-${testRunId.slice(0, 8)}@test.local`,
            passwordHash: 'hash',
          },
          {
            id: userBId,
            email: `d4-b-${testRunId.slice(0, 8)}@test.local`,
            passwordHash: 'hash',
          },
        ],
      });
      createdIds.users.add(userAId);
      createdIds.users.add(userBId);

      await tx.tenantDomain.createMany({
        data: [
          {
            id: domainAId,
            tenantId: orgAId,
            domain: `orga-${testRunId.slice(0, 8)}.test.local`,
            verified: false,
            primary: true,
          },
          {
            id: domainBId,
            tenantId: orgBId,
            domain: `orgb-${testRunId.slice(0, 8)}.test.local`,
            verified: false,
            primary: true,
          },
        ],
      });
      createdIds.domains.add(domainAId);
      createdIds.domains.add(domainBId);
    });

    // Test: Org A context sees only Org A domain
    const contextA: DatabaseContext = {
      orgId: orgAId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const domainsA = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantDomain.findMany({
        select: { id: true, tenantId: true, domain: true },
      });
    });

    expect(domainsA).toHaveLength(1);
    expect(domainsA[0].tenantId).toBe(orgAId);

    // Test: Org B context sees only Org B domain
    const contextB: DatabaseContext = {
      orgId: orgBId,
      actorId: userBId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const domainsB = await withDbContext(prisma, contextB, async tx => {
      return await tx.tenantDomain.findMany({
        select: { id: true, tenantId: true, domain: true },
      });
    });

    expect(domainsB).toHaveLength(1);
    expect(domainsB[0].tenantId).toBe(orgBId);
  }, 30000);

  it('should deny INSERT domain for different tenant', async () => {
    const contextB: DatabaseContext = {
      orgId: orgBId,
      actorId: userBId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    await expect(
      withDbContext(prisma, contextB, async tx => {
        return await tx.tenantDomain.create({
          data: {
            tenantId: orgAId, // Wrong tenant!
            domain: `malicious-${testRunId.slice(0, 8)}.test.local`,
            verified: false,
            primary: false,
          },
        });
      })
    ).rejects.toThrow(/violates row-level security policy|permission denied/i);
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TENANT ISOLATION — tenant_branding
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('should isolate Org A branding from Org B', async () => {
    // Seed: Create branding for Org A + B
    await withBypassForSeed(prisma, async tx => {
      await tx.tenantBranding.createMany({
        data: [
          {
            id: brandingAId,
            tenantId: orgAId,
            logoUrl: 'https://orga.test/logo.png',
            themeJson: { primaryColor: '#FF0000' },
          },
          {
            id: brandingBId,
            tenantId: orgBId,
            logoUrl: 'https://orgb.test/logo.png',
            themeJson: { primaryColor: '#0000FF' },
          },
        ],
      });
      createdIds.branding.add(brandingAId);
      createdIds.branding.add(brandingBId);
    });

    // Test: Org A context sees only Org A branding
    const contextA: DatabaseContext = {
      orgId: orgAId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const brandingA = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantBranding.findMany({
        select: { id: true, tenantId: true, logoUrl: true },
      });
    });

    expect(brandingA).toHaveLength(1);
    expect(brandingA[0].tenantId).toBe(orgAId);
    expect(brandingA[0].logoUrl).toBe('https://orga.test/logo.png');
  }, 30000);

  it('should deny UPDATE branding for different tenant', async () => {
    const contextB: DatabaseContext = {
      orgId: orgBId,
      actorId: userBId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    await expect(
      withDbContext(prisma, contextB, async tx => {
        return await tx.tenantBranding.update({
          where: { id: brandingAId }, // Org A's branding!
          data: { logoUrl: 'https://malicious.test/logo.png' },
        });
      })
    ).rejects.toThrow(/not found|violates row-level security policy|permission denied/i);
  }, 30000);

  it('should allow UPDATE branding for own tenant', async () => {
    const contextA: DatabaseContext = {
      orgId: orgAId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const updatedBranding = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantBranding.update({
        where: { id: brandingAId },
        data: { logoUrl: 'https://orga.test/new-logo.png' },
      });
    });

    expect(updatedBranding.logoUrl).toBe('https://orga.test/new-logo.png');
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TENANT ISOLATION — tenant_feature_overrides
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('should isolate Org A feature overrides from Org B', async () => {
    // Seed: Create feature flag + overrides for Org A + B
    await withBypassForSeed(prisma, async tx => {
      await tx.featureFlag.create({
        data: {
          key: featureFlagKey,
          enabled: false,
          description: 'Test flag for Gate D.4',
        },
      });
      createdIds.featureFlags.add(featureFlagKey);

      await tx.tenantFeatureOverride.createMany({
        data: [
          {
            id: overrideAId,
            tenantId: orgAId,
            key: featureFlagKey,
            enabled: true,
          },
          {
            id: overrideBId,
            tenantId: orgBId,
            key: featureFlagKey,
            enabled: false,
          },
        ],
      });
      createdIds.overrides.add(overrideAId);
      createdIds.overrides.add(overrideBId);
    });

    // Test: Org A context sees only Org A override
    const contextA: DatabaseContext = {
      orgId: orgAId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const overridesA = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantFeatureOverride.findMany({
        select: { id: true, tenantId: true, key: true, enabled: true },
      });
    });

    expect(overridesA).toHaveLength(1);
    expect(overridesA[0].tenantId).toBe(orgAId);
    expect(overridesA[0].enabled).toBe(true);
  }, 30000);

  it('should deny INSERT feature override for different tenant', async () => {
    const contextB: DatabaseContext = {
      orgId: orgBId,
      actorId: userBId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    await expect(
      withDbContext(prisma, contextB, async tx => {
        return await tx.tenantFeatureOverride.create({
          data: {
            tenantId: orgAId, // Wrong tenant!
            key: featureFlagKey,
            enabled: true,
          },
        });
      })
    ).rejects.toThrow(/violates row-level security policy|permission denied/i);
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FAIL-CLOSED ENFORCEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('should return zero rows when querying with non-existent tenant context', async () => {
    const nonExistentOrgId = `0000ff${testRunId.slice(6)}`;

    const contextInvalid: DatabaseContext = {
      orgId: nonExistentOrgId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const domains = await withDbContext(prisma, contextInvalid, async tx => {
      return await tx.tenantDomain.findMany();
    });

    const branding = await withDbContext(prisma, contextInvalid, async tx => {
      return await tx.tenantBranding.findMany();
    });

    const overrides = await withDbContext(prisma, contextInvalid, async tx => {
      return await tx.tenantFeatureOverride.findMany();
    });

    expect(domains).toHaveLength(0);
    expect(branding).toHaveLength(0);
    expect(overrides).toHaveLength(0);
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POOLER SAFETY — Context Isolation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  it('should isolate context between sequential transactions (Org A → Org B → Org A)', async () => {
    const contextA: DatabaseContext = {
      orgId: orgAId,
      actorId: userAId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const contextB: DatabaseContext = {
      orgId: orgBId,
      actorId: userBId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    // Sequential queries: A → B → A (pooler may reuse connections)
    const domainsA1 = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantDomain.findMany({
        select: { tenantId: true },
      });
    });

    expect(domainsA1).toHaveLength(1);
    expect(domainsA1[0].tenantId).toBe(orgAId);

    const domainsB = await withDbContext(prisma, contextB, async tx => {
      return await tx.tenantDomain.findMany({
        select: { tenantId: true },
      });
    });

    expect(domainsB).toHaveLength(1);
    expect(domainsB[0].tenantId).toBe(orgBId);

    const domainsA2 = await withDbContext(prisma, contextA, async tx => {
      return await tx.tenantDomain.findMany({
        select: { tenantId: true },
      });
    });

    expect(domainsA2).toHaveLength(1);
    expect(domainsA2[0].tenantId).toBe(orgAId);
  }, 30000);
});
