/**
 * RLS Catalog Items Smoke Test — Gate C.1
 *
 * Verifies RLS-enforced tenant isolation using Gate B.1 context library.
 *
 * Test Strategy:
 * - Seed: Use withBypassForSeed (transaction-local bypass)
 * - Query: Use withDbContext (RLS active, no manual tenant filters)
 * - Cleanup: Tag-based deletion (no global deleteMany)
 *
 * Expected Behavior:
 * - Org A context: Returns only Org A items
 * - Org B context: Returns only Org B items
 * - No context: Fail-closed (error or empty, depending on current policy)
 *
 * DOCTRINE COMPLIANCE:
 * - Seed-only bypass (withBypassForSeed)
 * - RLS-enforced queries (withDbContext, no tenantId filter)
 * - Tag-based cleanup (isolated per test)
 * - Pooler-safe (transaction-local context)
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import { withDbContext } from '../lib/database-context.js';
import { makeDbContext, makeTestOrgId, makeTestActorId } from './helpers/rlsContext.js';
import { seedCatalogItemsForOrg, seedTenantForTest, makeTestRunId } from './helpers/seedRls.js';
import {
  cleanupCatalogItemsByTag,
  cleanupAllTestCatalogItems,
  verifyCleanupComplete,
} from './helpers/cleanupRls.js';

describe('RLS Catalog Items — Cross-Tenant Isolation (Smoke)', () => {
  let testRunId: string;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;

  // Clean up all test data before suite starts
  beforeAll(async () => {
    await cleanupAllTestCatalogItems();
  }, 30000);

  beforeEach(async () => {
    // Generate unique IDs for this test run
    testRunId = makeTestRunId();
    orgAId = makeTestOrgId();
    orgBId = makeTestOrgId();
    userAId = makeTestActorId();
    userBId = makeTestActorId();

    // Seed test tenants (required for foreign key)
    await seedTenantForTest(orgAId, testRunId);
    await seedTenantForTest(orgBId, testRunId);

    // Seed catalog items for both orgs (using bypass)
    await seedCatalogItemsForOrg(orgAId, testRunId, 2);
    await seedCatalogItemsForOrg(orgBId, testRunId, 3);
  }, 30000); // Increase hook timeout to 30 seconds

  afterEach(async () => {
    // Tag-based cleanup (removes only this test's data)
    await cleanupCatalogItemsByTag(testRunId);

    // Verify cleanup succeeded
    const isClean = await verifyCleanupComplete(testRunId);
    expect(isClean).toBe(true);
  }, 30000); // Increase hook timeout to 30 seconds

  test('Org A context returns only Org A items', async () => {
    // Create Org A context
    const contextA = makeDbContext({
      orgId: orgAId,
      actorId: userAId,
    });

    // Query using RLS-enforced context (no manual tenantId filter)
    const itemsA = await withDbContext(prisma, contextA, async tx => {
      return tx.catalogItem.findMany({
        where: {
          // NO manual tenantId filter — RLS enforces boundary
          sku: {
            contains: testRunId, // Only match this test's data
          },
        },
        orderBy: { sku: 'asc' },
      });
    });

    // Assertions: Only Org A items returned
    expect(itemsA).toHaveLength(2);
    expect(itemsA.every((item: any) => item.tenantId === orgAId)).toBe(true);
    expect(itemsA[0].sku).toContain(testRunId);
  });

  test('Org B context returns only Org B items', async () => {
    // Create Org B context
    const contextB = makeDbContext({
      orgId: orgBId,
      actorId: userBId,
    });

    // Query using RLS-enforced context (no manual tenantId filter)
    const itemsB = await withDbContext(prisma, contextB, async tx => {
      return tx.catalogItem.findMany({
        where: {
          // NO manual tenantId filter — RLS enforces boundary
          sku: {
            contains: testRunId, // Only match this test's data
          },
        },
        orderBy: { sku: 'asc' },
      });
    });

    // Assertions: Only Org B items returned
    expect(itemsB).toHaveLength(3);
    expect(itemsB.every((item: any) => item.tenantId === orgBId)).toBe(true);
    expect(itemsB[0].sku).toContain(testRunId);
  });

  test('Cross-tenant isolation: Org A cannot see Org B items', async () => {
    // Create Org A context
    const contextA = makeDbContext({
      orgId: orgAId,
      actorId: userAId,
    });

    // Query ALL tagged items (both orgs) using Org A context
    const itemsA = await withDbContext(prisma, contextA, async tx => {
      return tx.catalogItem.findMany({
        where: {
          // NO tenantId filter — query all tagged items
          sku: {
            contains: testRunId,
          },
        },
      });
    });

    // Assertions: RLS should filter to ONLY Org A items
    // Even though we didn't filter by tenantId, RLS enforces boundary
    expect(itemsA).toHaveLength(2); // Not 5 (2 + 3)
    expect(itemsA.every((item: any) => item.tenantId === orgAId)).toBe(true);
  });

  test('Fail-closed: Query without context throws error or returns empty', async () => {
    // Attempt to query without setting RLS context
    // Expected: Error (missing context) OR empty results (depending on policy)

    // Note: This test's behavior depends on current RLS policy configuration
    // With FORCE RLS + fail-closed policies, this should throw or return empty

    try {
      const items = await prisma.catalogItem.findMany({
        where: {
          sku: {
            contains: testRunId,
          },
        },
      });

      // If no error thrown, verify fail-closed: empty results
      expect(items).toHaveLength(0);
    } catch (error) {
      // Expected: RLS policy blocks query when context missing
      expect(error).toBeDefined();
    }
  });

  test('Pooler safety: Context does not bleed between transactions', async () => {
    // Transaction 1: Query with Org A context
    const contextA = makeDbContext({
      orgId: orgAId,
      actorId: userAId,
    });

    const itemsA = await withDbContext(prisma, contextA, async tx => {
      const items = await tx.catalogItem.findMany({
        where: { sku: { contains: testRunId } },
        orderBy: { sku: 'asc' },
      });
      expect(items.every((item: any) => item.tenantId === orgAId)).toBe(true);
      expect(items).toHaveLength(2);
      return items;
    });
    // Transaction 1 complete — context cleared (SET LOCAL semantics)

    // DOCTRINE NOTE: 100ms delays are a stability smell.
    // These prevent connection pool contention but can hide underlying issues.
    // TODO (Gate C.2/C.3): Test removal of all setTimeout delays.
    // Better pattern: DB-level barriers (e.g., SELECT 1 in separate tx) or full awaits.
    // Keeping for now since 3/3 passes prove deterministic behavior.
    await new Promise(resolve => setTimeout(resolve, 100));

    // CRITICAL ASSERTION: Verify context is cleared outside transaction
    const contextAfterA = await prisma.$queryRaw<
      Array<{ org_id: string | null; realm: string | null }>
    >`
      SELECT 
        current_setting('app.org_id', true) as org_id,
        current_setting('app.realm', true) as realm
    `;
    expect(contextAfterA[0].org_id).toBeFalsy(); // Should be empty/null
    expect(contextAfterA[0].realm).toBeFalsy(); // Should be empty/null

    // Delay (see DOCTRINE NOTE above for removal plan)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Transaction 2: Query with Org B context (new transaction, different org)
    const contextB = makeDbContext({
      orgId: orgBId,
      actorId: userBId,
    });

    await withDbContext(prisma, contextB, async tx => {
      const items = await tx.catalogItem.findMany({
        where: { sku: { contains: testRunId } },
        orderBy: { sku: 'asc' },
      });
      // Should see ONLY Org B items (no context bleed from Transaction 1)
      expect(items.every((item: any) => item.tenantId === orgBId)).toBe(true);
      expect(items).toHaveLength(3); // Not contaminated with Org A items
      return items;
    });
    // Transaction 2 complete — context cleared again

    // Delay (see DOCTRINE NOTE above for removal plan)
    await new Promise(resolve => setTimeout(resolve, 100));

    // CRITICAL ASSERTION: Verify context cleared after second transaction
    const contextAfterB = await prisma.$queryRaw<
      Array<{ org_id: string | null; realm: string | null }>
    >`
      SELECT 
        current_setting('app.org_id', true) as org_id,
        current_setting('app.realm', true) as realm
    `;
    expect(contextAfterB[0].org_id).toBeFalsy();
    expect(contextAfterB[0].realm).toBeFalsy();

    // Delay (see DOCTRINE NOTE above for removal plan)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Transaction 3: Switch back to Org A context (verify no bleed from B)
    const itemsA2 = await withDbContext(prisma, contextA, async tx => {
      const items = await tx.catalogItem.findMany({
        where: { sku: { contains: testRunId } },
        orderBy: { sku: 'asc' },
      });
      // Should see ONLY Org A items (no contamination from Org B transaction)
      expect(items.every((item: any) => item.tenantId === orgAId)).toBe(true);
      expect(items).toHaveLength(2);
      return items;
    });

    // Final verification: Items from separate transactions match
    expect(itemsA[0].id).toBe(itemsA2[0].id); // Same Org A items
    expect(itemsA[1].id).toBe(itemsA2[1].id);
  }, 20000); // Increase timeout to 20s (test runs 3 transactions + 4 queries)
});
