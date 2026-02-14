/**
 * Gate D.2 RLS Tests — carts + cart_items
 *
 * Constitutional RLS enforcement tests for cart domain.
 * Verifies tenant isolation, fail-closed behavior, and pooler safety.
 *
 * Test Strategy:
 * - Deterministic: Fixed UUIDs, sequential execution, tag-based cleanup
 * - Fail-closed: Context required, cross-tenant denial enforced
 * - Pooler-safe: Context isolation between transactions
 *
 * Doctrine: v1.4 (app.org_id = tenant boundary)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import { withDbContext, withBypassForSeed } from '../lib/database-context.js';
import type { DatabaseContext } from '../lib/database-context.js';
import { randomUUID } from 'node:crypto';

// ============================================================================
// Test Fixture Data (Deterministic UUIDs)
// ============================================================================

const ORG_A_ID = '00000000-0000-0000-0000-0000000000a1';
const ORG_B_ID = '00000000-0000-0000-0000-0000000000b1';

const USER_A_ID = '00000000-0000-0000-0000-00000000a001';
const USER_B_ID = '00000000-0000-0000-0000-00000000b001';

const CATALOG_ITEM_A_ID = '00000000-0000-0000-0000-000000ca0001';
const CATALOG_ITEM_B_ID = '00000000-0000-0000-0000-000000cb0001';

const CART_A_ID = '00000000-0000-0000-0000-00000cart001';
const CART_B_ID = '00000000-0000-0000-0000-00000cart002';

const CART_ITEM_A_ID = '00000000-0000-0000-0000-0000cartitem1';
const CART_ITEM_B_ID = '00000000-0000-0000-0000-0000cartitem2';

let testRunId: string;

// ============================================================================
// Test Lifecycle
// ============================================================================

beforeAll(async () => {
  // Clean up any existing test data first
  await withBypassForSeed(prisma, async tx => {
    // Simpler cleanup without JOINs - wipe entire test env
    await tx.cartItem.deleteMany({});
    await tx.cart.deleteMany({});
    await tx.catalogItem.deleteMany({});
    await tx.membership.deleteMany({});
    await tx.user.deleteMany({});
    await tx.tenant.deleteMany({});
  });

  // Verify RLS is enabled (allow graceful skipif not)
  const rlsStatus = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('carts', 'cart_items')
  `;

  if (rlsStatus.length !== 2 || !rlsStatus.every(row => row.rowsecurity === true)) {
    console.warn('⚠️  RLS not enabled on carts/cart_items - tests will be skipped');
  }
});

beforeEach(() => {
  testRunId = randomUUID();
});

afterEach(async () => {
  // Tag-based cleanup (bypass-gated)
  await withBypassForSeed(prisma, async tx => {
    // Delete in dependency order
    await tx.cartItem.deleteMany({});
    await tx.cart.deleteMany({});
    await tx.catalogItem.deleteMany({});
    await tx.membership.deleteMany({});
    await tx.user.deleteMany({});
    await tx.tenant.deleteMany({});
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ============================================================================
// Test Suite: Cart RLS Enforcement
// ============================================================================

describe('Gate D.2: RLS Enforcement — carts + cart_items', () => {
  // --------------------------------------------------------------------------
  // Test Group: Tenant Isolation (carts)
  // --------------------------------------------------------------------------

  describe('Tenant Isolation — carts', () => {
    it('should isolate Org A carts from Org B', async () => {
      // Seed: Create 2 tenants, 2 users, 2 carts
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.createMany({
          data: [
            {
              id: ORG_A_ID,
              slug: 'org-a-d2',
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
            {
              id: ORG_B_ID,
              slug: 'org-b-d2',
              name: 'Org B',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
            { id: USER_B_ID, email: 'd2-user-b@test.local', passwordHash: 'hash' },
          ],
        });

        await tx.cart.createMany({
          data: [
            { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
            { id: CART_B_ID, tenantId: ORG_B_ID, userId: USER_B_ID, status: 'ACTIVE' },
          ],
        });
      });

      // Context A: Query as Org A
      const contextA: DatabaseContext = {
        orgId: ORG_A_ID,
        actorId: USER_A_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const cartsA = await withDbContext(prisma, contextA, async tx => {
        return await tx.cart.findMany();
      });

      // Assert: Only Org A cart visible
      expect(cartsA).toHaveLength(1);
      expect(cartsA[0].id).toBe(CART_A_ID);
      expect(cartsA[0].tenantId).toBe(ORG_A_ID);

      // Context B: Query as Org B
      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const cartsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.cart.findMany();
      });

      // Assert: Only Org B cart visible
      expect(cartsB).toHaveLength(1);
      expect(cartsB[0].id).toBe(CART_B_ID);
      expect(cartsB[0].tenantId).toBe(ORG_B_ID);
    });

    it('should deny INSERT with wrong tenant context', async () => {
      // Seed: Create Org A only
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.create({
          data: {
            id: ORG_A_ID,
            slug: 'org-a-d2',
            name: 'Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
        });
        await tx.user.create({
          data: { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
        });
      });

      // Attempt: Insert cart with Org B context but Org A tenantId
      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextB, async tx => {
          return await tx.cart.create({
            data: {
              id: CART_A_ID,
              tenantId: ORG_A_ID, // Mismatch: context is Org B, data is Org A
              userId: USER_A_ID,
              status: 'ACTIVE',
            },
          });
        })
      ).rejects.toThrow(); // RLS policy violation
    });

    it('should deny UPDATE across tenant boundary', async () => {
      // Seed: Create Org A cart
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.create({
          data: {
            id: ORG_A_ID,
            slug: 'org-a-d2',
            name: 'Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
        });
        await tx.user.create({
          data: { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
        });
        await tx.cart.create({
          data: { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
        });
      });

      // Attempt: Update Org A cart using Org B context
      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextB, async tx => {
          return await tx.cart.update({
            where: { id: CART_A_ID },
            data: { status: 'INACTIVE' },
          });
        })
      ).rejects.toThrow(); // RLS: Org B cannot see/update Org A cart
    });
  });

  // --------------------------------------------------------------------------
  // Test Group: Tenant Isolation (cart_items via JOIN)
  // --------------------------------------------------------------------------

  describe('Tenant Isolation — cart_items (JOIN-based RLS)', () => {
    it('should isolate Org A cart_items from Org B via parent cart', async () => {
      // Seed: Create 2 tenants, users, carts, catalog items, cart items
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.createMany({
          data: [
            {
              id: ORG_A_ID,
              slug: 'org-a-d2',
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
            {
              id: ORG_B_ID,
              slug: 'org-b-d2',
              name: 'Org B',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
            { id: USER_B_ID, email: 'd2-user-b@test.local', passwordHash: 'hash' },
          ],
        });

        await tx.cart.createMany({
          data: [
            { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
            { id: CART_B_ID, tenantId: ORG_B_ID, userId: USER_B_ID, status: 'ACTIVE' },
          ],
        });

        await tx.catalogItem.createMany({
          data: [
            { id: CATALOG_ITEM_A_ID, tenantId: ORG_A_ID, name: 'Item A', active: true },
            { id: CATALOG_ITEM_B_ID, tenantId: ORG_B_ID, name: 'Item B', active: true },
          ],
        });

        await tx.cartItem.createMany({
          data: [
            {
              id: CART_ITEM_A_ID,
              cartId: CART_A_ID,
              catalogItemId: CATALOG_ITEM_A_ID,
              quantity: 1,
            },
            {
              id: CART_ITEM_B_ID,
              cartId: CART_B_ID,
              catalogItemId: CATALOG_ITEM_B_ID,
              quantity: 2,
            },
          ],
        });
      });

      // Context A: Query as Org A
      const contextA: DatabaseContext = {
        orgId: ORG_A_ID,
        actorId: USER_A_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const cartItemsA = await withDbContext(prisma, contextA, async tx => {
        return await tx.cartItem.findMany();
      });

      // Assert: Only Org A cart item visible (RLS via JOIN to carts)
      expect(cartItemsA).toHaveLength(1);
      expect(cartItemsA[0].id).toBe(CART_ITEM_A_ID);
      expect(cartItemsA[0].cartId).toBe(CART_A_ID);

      // Context B: Query as Org B
      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const cartItemsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.cartItem.findMany();
      });

      // Assert: Only Org B cart item visible
      expect(cartItemsB).toHaveLength(1);
      expect(cartItemsB[0].id).toBe(CART_ITEM_B_ID);
      expect(cartItemsB[0].cartId).toBe(CART_B_ID);
    });

    it('should deny INSERT cart_item to cart owned by different tenant', async () => {
      // Seed: Create Org A cart and Org B catalog item
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.createMany({
          data: [
            {
              id: ORG_A_ID,
              slug: 'org-a-d2',
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
            {
              id: ORG_B_ID,
              slug: 'org-b-d2',
              name: 'Org B',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
            { id: USER_B_ID, email: 'd2-user-b@test.local', passwordHash: 'hash' },
          ],
        });

        await tx.cart.create({
          data: { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
        });

        await tx.catalogItem.create({
          data: { id: CATALOG_ITEM_B_ID, tenantId: ORG_B_ID, name: 'Item B', active: true },
        });
      });

      // Attempt: Org B tries to add item to Org A's cart
      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextB, async tx => {
          return await tx.cartItem.create({
            data: {
              id: CART_ITEM_B_ID,
              cartId: CART_A_ID, // Belongs to Org A
              catalogItemId: CATALOG_ITEM_B_ID,
              quantity: 1,
            },
          });
        })
      ).rejects.toThrow(); // RLS: cart_items policy checks parent cart tenant via JOIN
    });
  });

  // --------------------------------------------------------------------------
  // Test Group: Fail-Closed Enforcement
  // --------------------------------------------------------------------------

  describe('Fail-Closed Enforcement', () => {
    it('should deny access when no context is set', async () => {
      // Seed: Create cart
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.create({
          data: {
            id: ORG_A_ID,
            slug: 'org-a-d2',
            name: 'Org A',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'FREE',
          },
        });
        await tx.user.create({
          data: { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
        });
        await tx.cart.create({
          data: { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
        });
      });

      // Attempt: Query without context (direct prisma call)
      await expect(
        prisma.$transaction(async tx => {
          return await tx.cart.findMany();
        })
      ).resolves.toHaveLength(0); // RLS denies: no rows visible without context
    });
  });

  // --------------------------------------------------------------------------
  // Test Group: Pooler Safety (Context Isolation)
  // --------------------------------------------------------------------------

  describe('Pooler Safety — Context Isolation', () => {
    it('should isolate context between sequential transactions (Org A → Org B → Org A)', async () => {
      // Seed: Create 2 tenants with carts
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.createMany({
          data: [
            {
              id: ORG_A_ID,
              slug: 'org-a-d2',
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
            {
              id: ORG_B_ID,
              slug: 'org-b-d2',
              name: 'Org B',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: USER_A_ID, email: 'd2-user-a@test.local', passwordHash: 'hash' },
            { id: USER_B_ID, email: 'd2-user-b@test.local', passwordHash: 'hash' },
          ],
        });

        await tx.cart.createMany({
          data: [
            { id: CART_A_ID, tenantId: ORG_A_ID, userId: USER_A_ID, status: 'ACTIVE' },
            { id: CART_B_ID, tenantId: ORG_B_ID, userId: USER_B_ID, status: 'ACTIVE' },
          ],
        });
      });

      const contextA: DatabaseContext = {
        orgId: ORG_A_ID,
        actorId: USER_A_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const contextB: DatabaseContext = {
        orgId: ORG_B_ID,
        actorId: USER_B_ID,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      // Transaction 1: Org A
      const result1 = await withDbContext(prisma, contextA, async tx => {
        return await tx.cart.findMany();
      });
      expect(result1).toHaveLength(1);
      expect(result1[0].tenantId).toBe(ORG_A_ID);

      // Transaction 2: Org B (simulates pooler reuse)
      const result2 = await withDbContext(prisma, contextB, async tx => {
        return await tx.cart.findMany();
      });
      expect(result2).toHaveLength(1);
      expect(result2[0].tenantId).toBe(ORG_B_ID);

      // Transaction 3: Org A again (verify context didn't bleed from Org B)
      const result3 = await withDbContext(prisma, contextA, async tx => {
        return await tx.cart.findMany();
      });
      expect(result3).toHaveLength(1);
      expect(result3[0].tenantId).toBe(ORG_A_ID);
    });
  });
});
