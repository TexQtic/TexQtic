/**
 * Integration Test: Marketplace Cart Projection Pipeline
 *
 * Prompt #32B - Verify end-to-end cart mutations → EventLog → MarketplaceCartSummary
 *
 * Tests that the projection pipeline works correctly:
 * 1. Cart mutations emit marketplace.cart.* events to EventLog
 * 2. Events trigger projection updates to MarketplaceCartSummary
 * 3. Projections reflect accurate cart state (item count, quantities, version)
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../lib/auditLog.js';
import type { Prisma } from '@prisma/client';

// Type helper for database client (handles both PrismaClient and TransactionClient)
type DbClient = PrismaClient | Prisma.TransactionClient;

describe('Marketplace Cart Projection Pipeline', () => {
  // Test fixtures - IDs created during setup
  let testTenantId: string;
  let testUserId: string;
  let testCatalogItemId: string;
  let testCartId: string | null = null;
  let testCartItemId: string | null = null;

  /**
   * Setup: Create test tenant, user, and catalog item
   *
   * Uses RLS context via dbContext pattern to ensure proper isolation.
   * All fixtures are created fresh for each test to avoid cross-test pollution.
   */
  beforeEach(async () => {
    // Clean up any previous test data first
    await cleanupTestData();

    // Create test tenant
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    const tenant = await prisma.tenant.create({
      data: {
        name: `test-tenant-${Date.now()}`,
        slug: `test-${Date.now()}`,
        status: 'ACTIVE',
      },
    });
    testTenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash-not-used',
        emailVerified: true,
      },
    });
    testUserId = user.id;

    // Create test catalog item
    const catalogItem = await prisma.catalogItem.create({
      data: {
        tenantId: testTenantId,
        name: 'Test Product',
        sku: `TEST-SKU-${Date.now()}`,
        price: 99.99,
        active: true,
      },
    });
    testCatalogItemId = catalogItem.id;

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  /**
   * Teardown: Remove all test data
   *
   * Cleans up EventLog, MarketplaceCartSummary, CartItem, Cart, CatalogItem, User, Tenant
   * in proper dependency order to avoid foreign key violations.
   */
  afterEach(async () => {
    await cleanupTestData();
  });

  /**
   * Helper: Clean up test data across all related tables
   */
  async function cleanupTestData() {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // Delete in dependency order (children first, parents last)
    if (testCartItemId) {
      await prisma.cartItem.deleteMany({
        where: { id: testCartItemId },
      });
    }

    if (testCartId) {
      await prisma.marketplaceCartSummary.deleteMany({
        where: { cartId: testCartId },
      });
      await prisma.eventLog.deleteMany({
        where: { entityId: testCartId },
      });
      await prisma.cart.deleteMany({
        where: { id: testCartId },
      });
    }

    if (testCatalogItemId) {
      await prisma.catalogItem.deleteMany({
        where: { id: testCatalogItemId },
      });
    }

    if (testUserId) {
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }

    if (testTenantId) {
      await prisma.auditLog.deleteMany({
        where: { tenantId: testTenantId },
      });
      await prisma.tenant.deleteMany({
        where: { id: testTenantId },
      });
    }

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    // Reset test IDs
    testCartId = null;
    testCartItemId = null;
  }

  /**
   * Helper: Simulate cart creation (mimics POST /tenant/cart logic)
   *
   * Creates a cart and audit log entry, which triggers event emission
   * and projection update via the canonical pipeline.
   */
  async function createCart(tx: DbClient): Promise<string> {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;

    // Create cart
    const cart = await tx.cart.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        status: 'ACTIVE',
      },
    });

    // Write audit log (triggers event emission + projection via Prompt #31 + #29 pipeline)
    await writeAuditLog(tx, {
      realm: 'TENANT',
      tenantId: testTenantId,
      actorType: 'USER',
      actorId: testUserId,
      action: 'cart.CART_CREATED',
      entity: 'cart',
      entityId: cart.id,
      afterJson: {
        cartId: cart.id,
        userId: testUserId,
        status: 'ACTIVE',
      },
    });

    return cart.id;
  }

  /**
   * Helper: Simulate adding item to cart (mimics POST /tenant/cart/items logic)
   */
  async function addCartItem(
    tx: DbClient,
    cartId: string,
    catalogItemId: string,
    quantity: number
  ): Promise<string> {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;

    const cartItem = await tx.cartItem.create({
      data: {
        cartId,
        catalogItemId,
        quantity,
      },
    });

    await writeAuditLog(tx, {
      realm: 'TENANT',
      tenantId: testTenantId,
      actorType: 'USER',
      actorId: testUserId,
      action: 'cart.CART_ITEM_ADDED',
      entity: 'cart_item',
      entityId: cartItem.id,
      afterJson: {
        cartId,
        cartItemId: cartItem.id,
        catalogItemId,
        quantity,
      },
    });

    return cartItem.id;
  }

  /**
   * Helper: Simulate updating cart item quantity (mimics PATCH /tenant/cart/items/:id logic)
   */
  async function updateCartItem(
    tx: DbClient,
    cartItemId: string,
    cartId: string,
    newQuantity: number
  ): Promise<void> {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;

    await tx.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: newQuantity },
    });

    await writeAuditLog(tx, {
      realm: 'TENANT',
      tenantId: testTenantId,
      actorType: 'USER',
      actorId: testUserId,
      action: 'cart.CART_ITEM_UPDATED',
      entity: 'cart_item',
      entityId: cartItemId,
      afterJson: {
        cartId,
        cartItemId,
        quantity: newQuantity,
      },
    });
  }

  /**
   * Helper: Simulate removing cart item (mimics PATCH /tenant/cart/items/:id with quantity=0)
   */
  async function removeCartItem(tx: DbClient, cartItemId: string, cartId: string): Promise<void> {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${testTenantId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;

    await tx.cartItem.delete({
      where: { id: cartItemId },
    });

    await writeAuditLog(tx, {
      realm: 'TENANT',
      tenantId: testTenantId,
      actorType: 'USER',
      actorId: testUserId,
      action: 'cart.CART_ITEM_REMOVED',
      entity: 'cart_item',
      entityId: cartItemId,
      afterJson: {
        cartId,
        cartItemId,
      },
    });
  }

  /**
   * TEST CASE: End-to-end cart projection pipeline
   *
   * Verifies:
   * 1. Create cart → EventLog has marketplace.cart.created → Projection exists with 0 items
   * 2. Add item → EventLog has marketplace.cart.item.added → Projection updated (1 item)
   * 3. Update item → EventLog has marketplace.cart.item.updated → Projection reflects new quantity
   * 4. Remove item → EventLog has marketplace.cart.item.removed → Projection back to 0 items
   */
  it(
    'should update MarketplaceCartSummary projection when cart is mutated',
    { timeout: 30000 }, // 30 second timeout for integration test
    async () => {
      // STEP 1: Create cart
      testCartId = await prisma.$transaction(async tx => {
        return await createCart(tx);
      });

      // Assert: EventLog contains marketplace.cart.created event
      const createEvent = await prisma.eventLog.findFirst({
        where: {
          tenantId: testTenantId,
          name: 'marketplace.cart.created',
          entityId: testCartId,
        },
      });
      expect(createEvent).toBeDefined();
      expect(createEvent?.name).toBe('marketplace.cart.created');

      // Assert: MarketplaceCartSummary projection created with 0 items
      let projection = await prisma.marketplaceCartSummary.findUnique({
        where: {
          cartId: testCartId,
        },
      });
      expect(projection).toBeDefined();
      expect(projection?.itemCount).toBe(0);
      expect(projection?.totalQuantity).toBe(0);
      expect(projection?.version).toBeGreaterThanOrEqual(1);

      const initialVersion = projection!.version;

      // STEP 2: Add item to cart
      testCartItemId = await prisma.$transaction(async tx => {
        return await addCartItem(tx, testCartId!, testCatalogItemId, 3);
      });

      // Assert: EventLog contains marketplace.cart.item.added event
      const addEvent = await prisma.eventLog.findFirst({
        where: {
          tenantId: testTenantId,
          name: 'marketplace.cart.item.added',
          entityId: testCartItemId,
        },
      });
      expect(addEvent).toBeDefined();
      expect(addEvent?.name).toBe('marketplace.cart.item.added');

      // Assert: Projection updated with 1 item, quantity 3
      projection = await prisma.marketplaceCartSummary.findUnique({
        where: {
          cartId: testCartId!,
        },
      });
      expect(projection).toBeDefined();
      expect(projection?.itemCount).toBe(1);
      expect(projection?.totalQuantity).toBe(3);
      expect(projection?.version).toBeGreaterThan(initialVersion);

      const afterAddVersion = projection!.version;

      // STEP 3: Update item quantity
      await prisma.$transaction(async tx => {
        await updateCartItem(tx, testCartItemId!, testCartId!, 5);
      });

      // Assert: EventLog contains marketplace.cart.item.updated event
      const updateEvent = await prisma.eventLog.findFirst({
        where: {
          tenantId: testTenantId,
          name: 'marketplace.cart.item.updated',
        },
        orderBy: { occurredAt: 'desc' },
      });
      expect(updateEvent).toBeDefined();
      expect(updateEvent?.name).toBe('marketplace.cart.item.updated');

      // Assert: Projection reflects new quantity (still 1 item, but quantity 5)
      projection = await prisma.marketplaceCartSummary.findUnique({
        where: {
          cartId: testCartId!,
        },
      });
      expect(projection).toBeDefined();
      expect(projection?.itemCount).toBe(1);
      expect(projection?.totalQuantity).toBe(5);
      expect(projection?.version).toBeGreaterThan(afterAddVersion);

      // STEP 4: Remove item from cart
      await prisma.$transaction(async tx => {
        await removeCartItem(tx, testCartItemId!, testCartId!);
      });

      // Assert: EventLog contains marketplace.cart.item.removed event
      const removeEvent = await prisma.eventLog.findFirst({
        where: {
          tenantId: testTenantId,
          name: 'marketplace.cart.item.removed',
        },
        orderBy: { occurredAt: 'desc' },
      });
      expect(removeEvent).toBeDefined();
      expect(removeEvent?.name).toBe('marketplace.cart.item.removed');

      // Assert: Projection back to 0 items, 0 quantity
      projection = await prisma.marketplaceCartSummary.findUnique({
        where: {
          cartId: testCartId!,
        },
      });
      expect(projection).toBeDefined();
      expect(projection?.itemCount).toBe(0);
      expect(projection?.totalQuantity).toBe(0);
      expect(projection?.version).toBeGreaterThan(afterAddVersion);
    }
  );
});
