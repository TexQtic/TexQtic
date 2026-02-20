/**
 * Gate D.6: Constitutional RLS Tests — Projection Table (marketplace_cart_summaries)
 *
 * Table: marketplace_cart_summaries
 * Doctrine v1.4: Projector bypass (system writes), tenant isolation (reads), fail-closed
 *
 * Test Strategy:
 * - Deterministic UUID generation (hex-compliant prefixes)
 * - Bypass-gated seeding (withBypassForSeed for base data, withBypassForProjector for projections)
 * - Tag-based cleanup (afterAll hook)
 * - Sequential execution (--no-file-parallelism)
 *
 * Coverage:
 * 1. Tenant isolation SELECT (A vs B) - projections visible only to owning tenant
 * 2. Tenant isolation SELECT (A cannot see B by direct query)
 * 3. Fail-closed INSERT (no context, no bypass => should fail)
 * 4. Projector bypass INSERT (creates projection row successfully)
 * 5. Projector bypass UPDATE (updates counts and version successfully)
 * 6. Pooler safety (A → projector → B → A, no context bleed)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  withDbContext,
  withBypassForSeed,
  withBypassForProjector,
  withNoContext,
  type DatabaseContext,
} from '../lib/database-context.js';

const prisma = new PrismaClient();

// Deterministic UUID generation (hex-compliant)
const TEST_TAG = 'gate-d6-proj';
const USER_A_ID = 'aaaa0000-d600-d600-d600-000000000001';
const USER_B_ID = 'bbbb0000-d600-d600-d600-000000000002';
const TENANT_A_ID = '0000aa00-d600-d600-d600-00000000000a';
const TENANT_B_ID = '0000bb00-d600-d600-d600-00000000000b';
const MEMBER_A_ID = 'eeee0000-d600-d600-d600-00000000000a';
const MEMBER_B_ID = 'eeee0000-d600-d600-d600-00000000000b';
const CART_A_ID = 'cccc0000-d600-d600-d600-00000000000a';
const CART_B_ID = 'cccc0000-d600-d600-d600-00000000000b';
const SUMMARY_A_ID = 'dddd0000-d600-d600-d600-00000000000a';
const SUMMARY_B_ID = 'dddd0000-d600-d600-d600-00000000000b';

// Database contexts (Doctrine v1.4: app.org_id, NOT app.tenant_id)
// NOTE: orgId should match the tenantId in the data
const contextA: DatabaseContext = {
  orgId: TENANT_A_ID,
  actorId: USER_A_ID,
  realm: 'tenant',
  requestId: 'test-req-a',
};

const contextB: DatabaseContext = {
  orgId: TENANT_B_ID,
  actorId: USER_B_ID,
  realm: 'tenant',
  requestId: 'test-req-b',
};

const contextA2: DatabaseContext = {
  orgId: TENANT_A_ID,
  actorId: USER_A_ID,
  realm: 'tenant',
  requestId: 'test-req-a2',
};

describe('Gate D.6: Projection Table RLS (marketplace_cart_summaries)', () => {
  beforeAll(async () => {
    // Seed test data with bypass mode (triple-gated for base data)
    await withBypassForSeed(prisma, async tx => {
      // Create tenants
      await tx.tenant.createMany({
        data: [
          {
            id: TENANT_A_ID,
            slug: `${TEST_TAG}-org-a`,
            name: 'Gate D.6 Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'PROFESSIONAL',
          },
          {
            id: TENANT_B_ID,
            slug: `${TEST_TAG}-org-b`,
            name: 'Gate D.6 Org B',
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

      // Create carts (base entities, NOT projections)
      await tx.cart.createMany({
        data: [
          {
            id: CART_A_ID,
            tenantId: TENANT_A_ID,
            userId: USER_A_ID,
            status: 'ACTIVE',
          },
          {
            id: CART_B_ID,
            tenantId: TENANT_B_ID,
            userId: USER_B_ID,
            status: 'ACTIVE',
          },
        ],
        skipDuplicates: true,
      });
    });

    // Create projections with projector bypass (system operation)
    await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
      await tx.marketplaceCartSummary.createMany({
        data: [
          {
            id: SUMMARY_A_ID,
            tenantId: TENANT_A_ID,
            cartId: CART_A_ID,
            userId: USER_A_ID,
            itemCount: 2,
            totalQuantity: 5,
            version: 1,
            lastUpdatedAt: new Date(),
          },
          {
            id: SUMMARY_B_ID,
            tenantId: TENANT_B_ID,
            cartId: CART_B_ID,
            userId: USER_B_ID,
            itemCount: 3,
            totalQuantity: 8,
            version: 1,
            lastUpdatedAt: new Date(),
          },
        ],
        skipDuplicates: true,
      });
    });

    // Verify seeding worked
    const summaryCount = await withBypassForSeed(prisma, async tx => {
      return tx.marketplaceCartSummary.count({
        where: {
          tenantId: { in: [TENANT_A_ID, TENANT_B_ID] },
        },
      });
    });

    if (summaryCount !== 2) {
      throw new Error(
        `Projector seeding failed: expected 2 summaries, got ${summaryCount}. ` +
          `Check projector bypass configuration.`
      );
    }
  }, 30000);

  afterAll(async () => {
    // Tag-based cleanup (bypass mode for both projections and base data)
    await withBypassForSeed(prisma, async tx => {
      // Delete projections first (no FK, but ordered for clarity)
      await tx.marketplaceCartSummary.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });

      // Delete base data in dependency order
      await tx.cart.deleteMany({
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

  it(
    'should isolate Org A projections from Org B (tenant SELECT)',
    { timeout: 30000 },
    async () => {
      // READ: Org A context should see only Org A projection
      const summariesA = await withDbContext(prisma, contextA, async tx => {
        return tx.marketplaceCartSummary.findMany({
          where: {}, // No manual filter — RLS enforces boundary
          select: {
            id: true,
            tenantId: true,
            cartId: true,
            itemCount: true,
            totalQuantity: true,
          },
        });
      });

      expect(summariesA).toHaveLength(1);
      expect(summariesA[0].tenantId).toBe(TENANT_A_ID);
      expect(summariesA[0].cartId).toBe(CART_A_ID);
      expect(summariesA[0].itemCount).toBe(2);
      expect(summariesA[0].totalQuantity).toBe(5);

      // READ: Org B context should see only Org B projection
      const summariesB = await withDbContext(prisma, contextB, async tx => {
        return tx.marketplaceCartSummary.findMany({
          where: {}, // No manual filter — RLS enforces boundary
          select: {
            id: true,
            tenantId: true,
            cartId: true,
            itemCount: true,
            totalQuantity: true,
          },
        });
      });

      expect(summariesB).toHaveLength(1);
      expect(summariesB[0].tenantId).toBe(TENANT_B_ID);
      expect(summariesB[0].cartId).toBe(CART_B_ID);
      expect(summariesB[0].itemCount).toBe(3);
      expect(summariesB[0].totalQuantity).toBe(8);
    }
  );

  it(
    'should deny Org A from seeing Org B projection by direct query',
    { timeout: 30000 },
    async () => {
      // Attempt to read Org B projection from Org A context
      const summaryFromA = await withDbContext(prisma, contextA, async tx => {
        return tx.marketplaceCartSummary.findUnique({
          where: { id: SUMMARY_B_ID }, // Direct ID query for Org B projection
        });
      });

      // RLS should block: Org A cannot see Org B row
      expect(summaryFromA).toBeNull();
    }
  );

  it(
    'should fail-closed: no context and no bypass prevents INSERT',
    { timeout: 30000 },
    async () => {
      // Attempt to INSERT without context or bypass (using texqtic_app role = RLS enforced)
      // Expected: Should fail (RLS blocks via restrictive_guard)

      const failedCartId = 'ffff0000-d600-d600-d600-00000000ffff';

      // First create a cart with bypass (so FK is satisfied)
      await withBypassForSeed(prisma, async tx => {
        await tx.cart.create({
          data: {
            id: failedCartId,
            tenantId: TENANT_A_ID,
            userId: USER_A_ID,
            status: 'ACTIVE',
          },
        });
      });

      // Now try to create projection WITHOUT bypass or context (using withNoContext)
      // withNoContext sets LOCAL ROLE texqtic_app (RLS enforced, NO BYPASSRLS)
      // but does NOT set any GUCs (no app.org_id, no bypass, no projector_bypass)
      // Restrictive guard should block this
      await expect(
        withNoContext(prisma, async tx => {
          return tx.marketplaceCartSummary.create({
            data: {
              cartId: failedCartId,
              tenantId: TENANT_A_ID,
              userId: USER_A_ID,
              itemCount: 0,
              totalQuantity: 0,
              version: 1,
              lastUpdatedAt: new Date(),
            },
          });
        })
      ).rejects.toThrow(/violates row-level security|policy|permission denied/i);

      // Cleanup cart
      await withBypassForSeed(prisma, async tx => {
        await tx.cart.delete({ where: { id: failedCartId } });
      });
    }
  );

  it('should allow projector bypass to INSERT new projection row', { timeout: 30000 }, async () => {
    const newCartId = 'cccc0000-d600-d600-d600-00000000000c';
    const newSummaryId = 'dddd0000-d600-d600-d600-00000000000c';

    // Create cart with bypass
    await withBypassForSeed(prisma, async tx => {
      await tx.cart.create({
        data: {
          id: newCartId,
          tenantId: TENANT_A_ID,
          userId: USER_A_ID,
          status: 'ACTIVE',
        },
      });
    });

    // Create projection with projector bypass (mimics event handler)
    await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
      await tx.marketplaceCartSummary.create({
        data: {
          id: newSummaryId,
          tenantId: TENANT_A_ID,
          cartId: newCartId,
          userId: USER_A_ID,
          itemCount: 0,
          totalQuantity: 0,
          version: 1,
          lastUpdatedAt: new Date(),
        },
      });
    });

    // Verify projection was created (read with bypass)
    const created = await withBypassForSeed(prisma, async tx => {
      return tx.marketplaceCartSummary.findUnique({
        where: { id: newSummaryId },
      });
    });

    expect(created).not.toBeNull();
    expect(created!.cartId).toBe(newCartId);
    expect(created!.itemCount).toBe(0);

    // Cleanup
    await withBypassForSeed(prisma, async tx => {
      await tx.marketplaceCartSummary.delete({ where: { id: newSummaryId } });
      await tx.cart.delete({ where: { id: newCartId } });
    });
  });

  it(
    'should allow projector bypass to UPDATE projection row (version increment)',
    { timeout: 30000 },
    async () => {
      // UPDATE: Projector increments item count and version (mimics item.added event)
      await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
        await tx.marketplaceCartSummary.update({
          where: { id: SUMMARY_A_ID },
          data: {
            itemCount: 3, // Increment count
            totalQuantity: 7, // New total
            version: { increment: 1 }, // Optimistic locking
            lastUpdatedAt: new Date(),
          },
        });
      });

      // Verify UPDATE succeeded (read with bypass)
      const updated = await withBypassForSeed(prisma, async tx => {
        return tx.marketplaceCartSummary.findUnique({
          where: { id: SUMMARY_A_ID },
        });
      });

      expect(updated).not.toBeNull();
      expect(updated!.itemCount).toBe(3);
      expect(updated!.totalQuantity).toBe(7);
      expect(updated!.version).toBe(2); // Incremented from 1

      // Restore original values for subsequent tests
      await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
        await tx.marketplaceCartSummary.update({
          where: { id: SUMMARY_A_ID },
          data: {
            itemCount: 2,
            totalQuantity: 5,
            version: 1, // Reset version
            lastUpdatedAt: new Date(),
          },
        });
      });
    }
  );

  it(
    'should maintain context isolation across pooler transactions (A → projector → B → A)',
    { timeout: 30000 },
    async () => {
      // Transaction 1: Org A reads its projection (2 items)
      const summariesA1 = await withDbContext(prisma, contextA, async tx => {
        return tx.marketplaceCartSummary.findMany({
          where: {},
          select: { itemCount: true },
        });
      });
      expect(summariesA1).toHaveLength(1);
      expect(summariesA1[0].itemCount).toBe(2);

      // Transaction 2: Projector writes (system operation, no tenant context)
      await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
        await tx.marketplaceCartSummary.update({
          where: { id: SUMMARY_B_ID },
          data: {
            itemCount: 10, // Modify Org B projection
            lastUpdatedAt: new Date(),
          },
        });
      });

      // Transaction 3: Org B reads (should see updated value)
      const summariesB = await withDbContext(prisma, contextB, async tx => {
        return tx.marketplaceCartSummary.findMany({
          where: {},
          select: { itemCount: true },
        });
      });
      expect(summariesB).toHaveLength(1);
      expect(summariesB[0].itemCount).toBe(10); // Updated

      // Transaction 4: Org A reads again (should still see 2, no bleed from Org B or projector)
      const summariesA2 = await withDbContext(prisma, contextA2, async tx => {
        return tx.marketplaceCartSummary.findMany({
          where: {},
          select: { itemCount: true },
        });
      });
      expect(summariesA2).toHaveLength(1);
      expect(summariesA2[0].itemCount).toBe(2); // Unchanged, no context bleed

      // Restore B's original value
      await withBypassForProjector(prisma, { realm: 'system', role: 'PROJECTOR' }, async tx => {
        await tx.marketplaceCartSummary.update({
          where: { id: SUMMARY_B_ID },
          data: {
            itemCount: 3,
            lastUpdatedAt: new Date(),
          },
        });
      });
    }
  );
});
