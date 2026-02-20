/**
 * Gate D.5: Constitutional RLS Tests — AI Governance Cluster
 *
 * Tables: ai_budgets, ai_usage_meters
 * Doctrine v1.4: Direct boundary (tenant_id), rollup updates, fail-closed
 *
 * Test Strategy:
 * - Deterministic UUID generation (hex-compliant prefixes)
 * - Bypass-gated seeding (withBypassForSeed)
 * - Tag-based cleanup (afterAll hook)
 * - Sequential execution (--no-file-parallelism)
 *
 * Coverage:
 * 1. Budget isolation (A vs B)
 * 2. Budget UPDATE denial (cross-tenant)
 * 3. Usage meter isolation (A vs B)
 * 4. Rollup integrity (sequential increments)
 * 5. Fail-closed (missing context)
 * 6. Pooler safety (A → B → A)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withDbContext, withBypassForSeed, type DatabaseContext } from '../lib/database-context.js';

const prisma = new PrismaClient();

// Deterministic UUID generation (hex-compliant)
const TEST_TAG = 'gate-d5-ai-gov';
const USER_A_ID = 'aaaa0000-d500-d500-d500-000000000001';
const USER_B_ID = 'bbbb0000-d500-d500-d500-000000000002';
const TENANT_A_ID = '0000aa00-d500-d500-d500-00000000000a';
const TENANT_B_ID = '0000bb00-d500-d500-d500-00000000000b';
const MEMBER_A_ID = 'eeee0000-d500-d500-d500-00000000000a';
const MEMBER_B_ID = 'eeee0000-d500-d500-d500-00000000000b';
const BUDGET_A_ID = 'bbbb0ddd-d500-d500-d500-00000000000a';
const BUDGET_B_ID = 'bbbb0ddd-d500-d500-d500-00000000000b';
const METER_A_ID = 'eeee00aa-d500-d500-d500-00000000000a';
const METER_B_ID = 'eeee00aa-d500-d500-d500-00000000000b';

// Test month keys
const MONTH_KEY = '2026-02';

describe('Gate D.5: AI Governance RLS (ai_budgets + ai_usage_meters)', () => {
  beforeAll(async () => {
    // Seed test data with bypass mode (triple-gated)
    await withBypassForSeed(prisma, async tx => {
      // Create tenants
      await tx.tenant.createMany({
        data: [
          {
            id: TENANT_A_ID,
            slug: `${TEST_TAG}-org-a`,
            name: 'Gate D.5 Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'PROFESSIONAL',
          },
          {
            id: TENANT_B_ID,
            slug: `${TEST_TAG}-org-b`,
            name: 'Gate D.5 Org B',
            type: 'B2C',
            status: 'ACTIVE',
            plan: 'ENTERPRISE',
          },
        ],
        skipDuplicates: true,
      });

      // Create users
      await tx.user.createMany({
        data: [
          {
            id: USER_A_ID,
            email: `${TEST_TAG}-user-a@example.com`,
            passwordHash: 'bypass-seeded',
            emailVerified: true,
          },
          {
            id: USER_B_ID,
            email: `${TEST_TAG}-user-b@example.com`,
            passwordHash: 'bypass-seeded',
            emailVerified: true,
          },
        ],
        skipDuplicates: true,
      });

      // Create memberships
      await tx.membership.createMany({
        data: [
          {
            id: MEMBER_A_ID,
            tenantId: TENANT_A_ID,
            userId: USER_A_ID,
            role: 'OWNER',
          },
          {
            id: MEMBER_B_ID,
            tenantId: TENANT_B_ID,
            userId: USER_B_ID,
            role: 'OWNER',
          },
        ],
        skipDuplicates: true,
      });

      // Create AI budgets
      await tx.aiBudget.createMany({
        data: [
          {
            id: BUDGET_A_ID,
            tenantId: TENANT_A_ID,
            monthlyLimit: 100000,
            hardStop: false,
          },
          {
            id: BUDGET_B_ID,
            tenantId: TENANT_B_ID,
            monthlyLimit: 200000,
            hardStop: true,
          },
        ],
        skipDuplicates: true,
      });

      // Create initial usage meters
      await tx.aiUsageMeter.createMany({
        data: [
          {
            id: METER_A_ID,
            tenantId: TENANT_A_ID,
            month: MONTH_KEY,
            tokens: 5000,
            costEstimate: 0.25,
          },
          {
            id: METER_B_ID,
            tenantId: TENANT_B_ID,
            month: MONTH_KEY,
            tokens: 15000,
            costEstimate: 0.75,
          },
        ],
        skipDuplicates: true,
      });
    });

    // Verify bypass worked (triple-gate check)
    const budgetCount = await prisma.aiBudget.count({
      where: {
        tenantId: { in: [TENANT_A_ID, TENANT_B_ID] },
      },
    });
    if (budgetCount !== 2) {
      throw new Error(
        `Bypass seeding failed: expected 2 budgets, got ${budgetCount}. ` +
          `Check NODE_ENV=test and bypass gate configuration.`
      );
    }
  }, 30000);

  afterAll(async () => {
    // Tag-based cleanup (bypass mode)
    await withBypassForSeed(prisma, async tx => {
      // Delete in dependency order
      await tx.aiUsageMeter.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await tx.aiBudget.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await tx.membership.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await tx.user.deleteMany({
        where: { id: { in: [USER_A_ID, USER_B_ID] } },
      });
      await tx.tenant.deleteMany({
        where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
    });

    await prisma.$disconnect();
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: Budget Isolation (Org A vs Org B)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should isolate Org A budget from Org B', async () => {
    const contextA: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'test-budget-isolation-a',
    };

    const contextB: DatabaseContext = {
      orgId: TENANT_B_ID,
      actorId: USER_B_ID,
      realm: 'tenant',
      requestId: 'test-budget-isolation-b',
    };

    // Org A sees only its budget
    const budgetA = await withDbContext(prisma, contextA, async tx => {
      return tx.aiBudget.findFirst({});
    });
    expect(budgetA).toBeDefined();
    expect(budgetA?.tenantId).toBe(TENANT_A_ID);
    expect(budgetA?.monthlyLimit).toBe(100000);

    // Org B sees only its budget
    const budgetB = await withDbContext(prisma, contextB, async tx => {
      return tx.aiBudget.findFirst({});
    });
    expect(budgetB).toBeDefined();
    expect(budgetB?.tenantId).toBe(TENANT_B_ID);
    expect(budgetB?.monthlyLimit).toBe(200000);

    // Org A cannot see Org B budget (direct query by ID)
    const budgetBFromA = await withDbContext(prisma, contextA, async tx => {
      return tx.aiBudget.findUnique({
        where: { tenantId: TENANT_B_ID },
      });
    });
    expect(budgetBFromA).toBeNull();
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: Budget UPDATE Denial (Cross-Tenant)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should deny UPDATE budget for different tenant', async () => {
    const contextA: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'test-budget-update-denial',
    };

    // Org A attempts to update Org B budget (should be blocked by RLS)
    await expect(
      withDbContext(prisma, contextA, async tx => {
        return tx.aiBudget.update({
          where: { tenantId: TENANT_B_ID },
          data: { monthlyLimit: 999999 },
        });
      })
    ).rejects.toThrow(/not found|violates row-level security policy|permission denied/i);
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: Usage Meter Isolation (Org A vs Org B)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should isolate Org A usage meters from Org B', async () => {
    const contextA: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'test-usage-isolation-a',
    };

    const contextB: DatabaseContext = {
      orgId: TENANT_B_ID,
      actorId: USER_B_ID,
      realm: 'tenant',
      requestId: 'test-usage-isolation-b',
    };

    // Org A sees only its usage
    const usageA = await withDbContext(prisma, contextA, async tx => {
      return tx.aiUsageMeter.findMany({});
    });
    expect(usageA).toHaveLength(1);
    expect(usageA[0].tenantId).toBe(TENANT_A_ID);
    expect(usageA[0].tokens).toBe(5000);

    // Org B sees only its usage
    const usageB = await withDbContext(prisma, contextB, async tx => {
      return tx.aiUsageMeter.findMany({});
    });
    expect(usageB).toHaveLength(1);
    expect(usageB[0].tenantId).toBe(TENANT_B_ID);
    expect(usageB[0].tokens).toBe(15000);

    // Org A cannot see Org B usage (direct query)
    const usageBFromA = await withDbContext(prisma, contextA, async tx => {
      return tx.aiUsageMeter.findUnique({
        where: {
          tenantId_month: { tenantId: TENANT_B_ID, month: MONTH_KEY },
        },
      });
    });
    expect(usageBFromA).toBeNull();
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: Rollup Integrity (Sequential Increments)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should correctly increment usage tokens and cost (rollup pattern)', async () => {
    const contextA: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'test-rollup-integrity',
    };

    // Get initial usage
    const initialUsage = await withDbContext(prisma, contextA, async tx => {
      return tx.aiUsageMeter.findUnique({
        where: {
          tenantId_month: { tenantId: TENANT_A_ID, month: MONTH_KEY },
        },
      });
    });
    expect(initialUsage).toBeDefined();
    const initialTokens = initialUsage!.tokens;
    const initialCost = Number(initialUsage!.costEstimate);

    // Perform 3 sequential increments
    const increment1 = { tokens: 1000, cost: 0.05 };
    const increment2 = { tokens: 1500, cost: 0.075 };
    const increment3 = { tokens: 2000, cost: 0.1 };

    await withDbContext(prisma, contextA, async tx => {
      await tx.aiUsageMeter.update({
        where: {
          tenantId_month: { tenantId: TENANT_A_ID, month: MONTH_KEY },
        },
        data: {
          tokens: { increment: increment1.tokens },
          costEstimate: { increment: increment1.cost },
        },
      });
    });

    await withDbContext(prisma, contextA, async tx => {
      await tx.aiUsageMeter.update({
        where: {
          tenantId_month: { tenantId: TENANT_A_ID, month: MONTH_KEY },
        },
        data: {
          tokens: { increment: increment2.tokens },
          costEstimate: { increment: increment2.cost },
        },
      });
    });

    await withDbContext(prisma, contextA, async tx => {
      await tx.aiUsageMeter.update({
        where: {
          tenantId_month: { tenantId: TENANT_A_ID, month: MONTH_KEY },
        },
        data: {
          tokens: { increment: increment3.tokens },
          costEstimate: { increment: increment3.cost },
        },
      });
    });

    // Verify final totals
    const finalUsage = await withDbContext(prisma, contextA, async tx => {
      return tx.aiUsageMeter.findUnique({
        where: {
          tenantId_month: { tenantId: TENANT_A_ID, month: MONTH_KEY },
        },
      });
    });

    const expectedTokens =
      initialTokens + increment1.tokens + increment2.tokens + increment3.tokens;
    const expectedCost = initialCost + increment1.cost + increment2.cost + increment3.cost;

    expect(finalUsage!.tokens).toBe(expectedTokens);
    expect(Number(finalUsage!.costEstimate)).toBeCloseTo(expectedCost, 4);

    // Verify Org B usage unaffected
    const contextB: DatabaseContext = {
      orgId: TENANT_B_ID,
      actorId: USER_B_ID,
      realm: 'tenant',
      requestId: 'test-rollup-isolation-check',
    };
    const usageB = await withDbContext(prisma, contextB, async tx => {
      return tx.aiUsageMeter.findUnique({
        where: {
          tenantId_month: { tenantId: TENANT_B_ID, month: MONTH_KEY },
        },
      });
    });
    expect(usageB!.tokens).toBe(15000); // Original value unchanged
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: Fail-Closed (Missing Context)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should return zero rows with non-existent tenant context', async () => {
    const nonExistentContext: DatabaseContext = {
      orgId: 'ffff0000-d500-d500-d500-ffff00000001',
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'test-fail-closed',
    };

    const budgets = await withDbContext(prisma, nonExistentContext, async tx => {
      return tx.aiBudget.findMany({});
    });
    expect(budgets).toHaveLength(0);

    const usageMeters = await withDbContext(prisma, nonExistentContext, async tx => {
      return tx.aiUsageMeter.findMany({});
    });
    expect(usageMeters).toHaveLength(0);
  }, 30000);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: Pooler Safety (Context Isolation A → B → A)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  it('should isolate context between sequential transactions (pooler safety)', async () => {
    const contextA: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'pooler-test-a1',
    };

    const contextB: DatabaseContext = {
      orgId: TENANT_B_ID,
      actorId: USER_B_ID,
      realm: 'tenant',
      requestId: 'pooler-test-b',
    };

    const contextA2: DatabaseContext = {
      orgId: TENANT_A_ID,
      actorId: USER_A_ID,
      realm: 'tenant',
      requestId: 'pooler-test-a2',
    };

    // A → Read budget (should see 100k)
    const budgetA1 = await withDbContext(prisma, contextA, async tx => {
      return tx.aiBudget.findFirst({});
    });
    expect(budgetA1?.monthlyLimit).toBe(100000);

    // B → Read budget (should see 200k, not A's 100k)
    const budgetB = await withDbContext(prisma, contextB, async tx => {
      return tx.aiBudget.findFirst({});
    });
    expect(budgetB?.monthlyLimit).toBe(200000);

    // A → Read budget again (should still see 100k, no bleed from B)
    const budgetA2 = await withDbContext(prisma, contextA2, async tx => {
      return tx.aiBudget.findFirst({});
    });
    expect(budgetA2?.monthlyLimit).toBe(100000);
  }, 30000);
});
