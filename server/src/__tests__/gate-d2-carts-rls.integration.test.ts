/**
 * Gate D.2 RLS Tests — carts + cart_items
 *
 * Constitutional RLS enforcement tests for cart domain.
 * Verifies tenant isolation, fail-closed behavior, and pooler safety.
 *
 * Test Strategy:
 * - Deterministic: testRunId-tagged UUIDs, sequential execution, tag-based cleanup
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
// Test State (per-run IDs)
// ============================================================================

let testRunId: string;
let orgAId: string;
let orgBId: string;
let userAId: string;
let userBId: string;
let catalogItemAId: string;
let catalogItemBId: string;
let cartAId: string;
let cartBId: string;
let cartItemAId: string;
let cartItemBId: string;

// Track all created IDs for cleanup
const createdIds = {
  tenants: new Set<string>(),
  users: new Set<string>(),
  catalogItems: new Set<string>(),
  carts: new Set<string>(),
  cartItems: new Set<string>(),
};

// ============================================================================
// Test Lifecycle
// ============================================================================

beforeAll(async () => {
  // Verify RLS is enabled
  const rlsStatus = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('carts', 'cart_items')
  `;

  if (rlsStatus.length !== 2 || !rlsStatus.every(row => row.rowsecurity === true)) {
    throw new Error('RLS not enabled on carts/cart_items - tests cannot proceed');
  }
});

beforeEach(() => {
  // Generate unique IDs for this test run (valid UUID format with hex-only chars)
  testRunId = randomUUID();

  // Create valid UUIDs by replacing first 8 chars with entity prefixes (hex-only)
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const suffix = testRunId.slice(8); // Keep everything after first 8 chars

  orgAId = `00000a1a${suffix}`; // Org A
  orgBId = `00000b1b${suffix}`; // Org B
  userAId = `0000a001${suffix}`; // User A
  userBId = `0000b001${suffix}`; // User B
  catalogItemAId = `000ca001${suffix}`; // Catalog Item A
  catalogItemBId = `000cb001${suffix}`; // Catalog Item B
  cartAId = `0000ca01${suffix}`; // Cart A (different from catalog)
  cartBId = `0000cb01${suffix}`; // Cart B
  cartItemAId = `000c1a01${suffix}`; // Cart Item A
  cartItemBId = `000c1b01${suffix}`; // Cart Item B

  // Clear tracking sets
  createdIds.tenants.clear();
  createdIds.users.clear();
  createdIds.catalogItems.clear();
  createdIds.carts.clear();
  createdIds.cartItems.clear();
});

afterEach(async () => {
  // Cleanup only this test's data (tag-based, bypass-gated)
  await withBypassForSeed(prisma, async tx => {
    // Delete in reverse dependency order
    if (createdIds.cartItems.size > 0) {
      await tx.cartItem.deleteMany({
        where: { id: { in: Array.from(createdIds.cartItems) } },
      });
    }

    if (createdIds.carts.size > 0) {
      await tx.cart.deleteMany({
        where: { id: { in: Array.from(createdIds.carts) } },
      });
    }

    if (createdIds.catalogItems.size > 0) {
      await tx.catalogItem.deleteMany({
        where: { id: { in: Array.from(createdIds.catalogItems) } },
      });
    }

    if (createdIds.users.size > 0) {
      await tx.user.deleteMany({
        where: { id: { in: Array.from(createdIds.users) } },
      });
    }

    if (createdIds.tenants.size > 0) {
      await tx.tenant.deleteMany({
        where: { id: { in: Array.from(createdIds.tenants) } },
      });
    }
  });
});

// ============================================================================
// Test Suite: Cart RLS Enforcement
// ============================================================================

describe(
  'Gate D.2: RLS Enforcement — carts + cart_items',
  { timeout: 30000 }, // Increase timeout for database operations
  () => {
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
                email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
              {
                id: userBId,
                email: `d2-b-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
            ],
          });
          createdIds.users.add(userAId);
          createdIds.users.add(userBId);

          await tx.cart.createMany({
            data: [
              { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
              { id: cartBId, tenantId: orgBId, userId: userBId, status: 'ACTIVE' },
            ],
          });
          createdIds.carts.add(cartAId);
          createdIds.carts.add(cartBId);
        });

        // Context A: Query as Org A
        const contextA: DatabaseContext = {
          orgId: orgAId,
          actorId: userAId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        const cartsA = await withDbContext(prisma, contextA, async tx => {
          return await tx.cart.findMany();
        });

        // Assert: Only Org A cart visible
        expect(cartsA).toHaveLength(1);
        expect(cartsA[0].id).toBe(cartAId);
        expect(cartsA[0].tenantId).toBe(orgAId);

        // Context B: Query as Org B
        const contextB: DatabaseContext = {
          orgId: orgBId,
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        const cartsB = await withDbContext(prisma, contextB, async tx => {
          return await tx.cart.findMany();
        });

        // Assert: Only Org B cart visible
        expect(cartsB).toHaveLength(1);
        expect(cartsB[0].id).toBe(cartBId);
        expect(cartsB[0].tenantId).toBe(orgBId);
      });

      it('should deny INSERT with wrong tenant context', async () => {
        // Seed: Create Org A only
        await withBypassForSeed(prisma, async tx => {
          await tx.tenant.create({
            data: {
              id: orgAId,
              slug: `org-a-${testRunId.slice(0, 8)}`,
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          });
          createdIds.tenants.add(orgAId);

          await tx.user.create({
            data: {
              id: userAId,
              email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
              passwordHash: 'hash',
            },
          });
          createdIds.users.add(userAId);
        });

        // Attempt: Insert cart with Org B context but Org A tenantId
        const contextB: DatabaseContext = {
          orgId: orgBId,
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        await expect(
          withDbContext(prisma, contextB, async tx => {
            return await tx.cart.create({
              data: {
                id: cartAId,
                tenantId: orgAId, // Mismatch: context is Org B, data is Org A
                userId: userAId,
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
              id: orgAId,
              slug: `org-a-${testRunId.slice(0, 8)}`,
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          });
          createdIds.tenants.add(orgAId);

          await tx.user.create({
            data: {
              id: userAId,
              email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
              passwordHash: 'hash',
            },
          });
          createdIds.users.add(userAId);

          await tx.cart.create({
            data: { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
          });
          createdIds.carts.add(cartAId);
        });

        // Attempt: Update Org A cart using Org B context
        const contextB: DatabaseContext = {
          orgId: orgBId,
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        await expect(
          withDbContext(prisma, contextB, async tx => {
            return await tx.cart.update({
              where: { id: cartAId },
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
                email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
              {
                id: userBId,
                email: `d2-b-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
            ],
          });
          createdIds.users.add(userAId);
          createdIds.users.add(userBId);

          await tx.cart.createMany({
            data: [
              { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
              { id: cartBId, tenantId: orgBId, userId: userBId, status: 'ACTIVE' },
            ],
          });
          createdIds.carts.add(cartAId);
          createdIds.carts.add(cartBId);

          await tx.catalogItem.createMany({
            data: [
              { id: catalogItemAId, tenantId: orgAId, name: 'Item A', active: true },
              { id: catalogItemBId, tenantId: orgBId, name: 'Item B', active: true },
            ],
          });
          createdIds.catalogItems.add(catalogItemAId);
          createdIds.catalogItems.add(catalogItemBId);

          await tx.cartItem.createMany({
            data: [
              {
                id: cartItemAId,
                cartId: cartAId,
                catalogItemId: catalogItemAId,
                quantity: 1,
              },
              {
                id: cartItemBId,
                cartId: cartBId,
                catalogItemId: catalogItemBId,
                quantity: 2,
              },
            ],
          });
          createdIds.cartItems.add(cartItemAId);
          createdIds.cartItems.add(cartItemBId);
        });

        // Context A: Query as Org A
        const contextA: DatabaseContext = {
          orgId: orgAId,
          actorId: userAId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        const cartItemsA = await withDbContext(prisma, contextA, async tx => {
          return await tx.cartItem.findMany();
        });

        // Assert: Only Org A cart item visible (RLS via JOIN to carts)
        expect(cartItemsA).toHaveLength(1);
        expect(cartItemsA[0].id).toBe(cartItemAId);
        expect(cartItemsA[0].cartId).toBe(cartAId);

        // Context B: Query as Org B
        const contextB: DatabaseContext = {
          orgId: orgBId,
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        const cartItemsB = await withDbContext(prisma, contextB, async tx => {
          return await tx.cartItem.findMany();
        });

        // Assert: Only Org B cart item visible
        expect(cartItemsB).toHaveLength(1);
        expect(cartItemsB[0].id).toBe(cartItemBId);
        expect(cartItemsB[0].cartId).toBe(cartBId);
      });

      it('should deny INSERT cart_item to cart owned by different tenant', async () => {
        // Seed: Create Org A cart and Org B catalog item
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
                email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
              {
                id: userBId,
                email: `d2-b-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
            ],
          });
          createdIds.users.add(userAId);
          createdIds.users.add(userBId);

          await tx.cart.create({
            data: { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
          });
          createdIds.carts.add(cartAId);

          await tx.catalogItem.create({
            data: { id: catalogItemBId, tenantId: orgBId, name: 'Item B', active: true },
          });
          createdIds.catalogItems.add(catalogItemBId);
        });

        // Attempt: Org B tries to add item to Org A's cart
        const contextB: DatabaseContext = {
          orgId: orgBId,
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        await expect(
          withDbContext(prisma, contextB, async tx => {
            return await tx.cartItem.create({
              data: {
                id: cartItemBId,
                cartId: cartAId, // Belongs to Org A
                catalogItemId: catalogItemBId,
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
      it('should return zero rows when querying with non-existent tenant context', async () => {
        // Seed: Create Org A cart
        await withBypassForSeed(prisma, async tx => {
          await tx.tenant.create({
            data: {
              id: orgAId,
              slug: `org-a-${testRunId.slice(0, 8)}`,
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          });
          createdIds.tenants.add(orgAId);

          await tx.user.create({
            data: {
              id: userAId,
              email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
              passwordHash: 'hash',
            },
          });
          createdIds.users.add(userAId);

          await tx.cart.create({
            data: { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
          });
          createdIds.carts.add(cartAId);
        });

        // Attempt: Query with non-existent tenant context (Org B doesn't exist)
        // RLS should deny access to Org A's cart when querying as non-existent Org B
        const contextB: DatabaseContext = {
          orgId: orgBId, // Non-existent tenant
          actorId: userBId,
          realm: 'tenant',
          requestId: randomUUID(),
        };

        const results = await withDbContext(prisma, contextB, async tx => {
          return await tx.cart.findMany();
        });

        // RLS denies: no rows visible when tenant context doesn't match any data
        expect(results).toHaveLength(0);
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
                email: `d2-a-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
              {
                id: userBId,
                email: `d2-b-${testRunId.slice(0, 8)}@test.local`,
                passwordHash: 'hash',
              },
            ],
          });
          createdIds.users.add(userAId);
          createdIds.users.add(userBId);

          await tx.cart.createMany({
            data: [
              { id: cartAId, tenantId: orgAId, userId: userAId, status: 'ACTIVE' },
              { id: cartBId, tenantId: orgBId, userId: userBId, status: 'ACTIVE' },
            ],
          });
          createdIds.carts.add(cartAId);
          createdIds.carts.add(cartBId);
        });

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

        // Transaction 1: Org A
        const result1 = await withDbContext(prisma, contextA, async tx => {
          return await tx.cart.findMany();
        });
        expect(result1).toHaveLength(1);
        expect(result1[0].tenantId).toBe(orgAId);

        // Transaction 2: Org B (simulates pooler reuse)
        const result2 = await withDbContext(prisma, contextB, async tx => {
          return await tx.cart.findMany();
        });
        expect(result2).toHaveLength(1);
        expect(result2[0].tenantId).toBe(orgBId);

        // Transaction 3: Org A again (verify context didn't bleed from Org B)
        const result3 = await withDbContext(prisma, contextA, async tx => {
          return await tx.cart.findMany();
        });
        expect(result3).toHaveLength(1);
        expect(result3[0].tenantId).toBe(orgAId);
      });
    });
  }
);
