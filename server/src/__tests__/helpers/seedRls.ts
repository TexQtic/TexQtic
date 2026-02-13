/**
 * RLS Seed Helpers — Gate C.1
 *
 * Seed test data using withBypassForSeed (seed-only bypass).
 * Embeds testRunId tag into existing fields for tag-based cleanup.
 *
 * DOCTRINE COMPLIANCE:
 * - Uses withBypassForSeed ONLY (NODE_ENV=test guard enforced)
 * - Transaction-local bypass (context clears after seed)
 * - Tag embedded in existing fields (no new columns)
 * - Deterministic tags for isolated cleanup
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { withBypassForSeed } from '../../lib/database-context.js';

/**
 * seedTenantForTest — Create test tenant
 *
 * Creates a tenant record for use in RLS testing.
 * Uses withBypassForSeed to write data (RLS bypassed during seed only).
 *
 * @param orgId - Tenant UUID to create
 * @param testRunId - Unique test run identifier for tagging
 * @returns Created tenant ID
 *
 * @example
 * ```typescript
 * const testRunId = randomUUID();
 * const orgId = randomUUID();
 * await seedTenantForTest(orgId, testRunId);
 * ```
 */
export async function seedTenantForTest(orgId: string, testRunId: string): Promise<string> {
  let tenantId: string = orgId;

  await withBypassForSeed(prisma, async tx => {
    const tenant = await tx.tenant.create({
      data: {
        id: orgId,
        slug: `test-tenant-${testRunId}-${orgId.slice(0, 8)}`,
        name: `Test Tenant [tag:${testRunId}]`,
        type: 'B2B', // Valid TenantType enum value
        status: 'ACTIVE', // Valid TenantStatus enum value
        plan: 'FREE', // Valid TenantPlan enum value
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    tenantId = tenant.id;
  });

  return tenantId;
}

/**
 * seedCatalogItemsForOrg — Seed catalog items for RLS testing
 *
 * Creates catalog items with embedded testRunId tag for cleanup.
 * Uses withBypassForSeed to write data (RLS bypassed during seed only).
 *
 * Tag strategy: Embeds testRunId in SKU field for cleanup targeting.
 * Format: `TEST-${testRunId}-${index}`
 *
 * @param orgId - Tenant/org UUID to create items for
 * @param testRunId - Unique test run identifier for cleanup
 * @param count - Number of items to create (default: 2)
 * @returns Array of created catalog item IDs
 *
 * @example
 * ```typescript
 * const testRunId = randomUUID();
 * const itemIds = await seedCatalogItemsForOrg(orgId, testRunId, 2);
 *
 * // Later: cleanup by testRunId
 * await cleanupCatalogItemsByTag(testRunId);
 * ```
 */
export async function seedCatalogItemsForOrg(
  orgId: string,
  testRunId: string,
  count: number = 2
): Promise<string[]> {
  const itemIds: string[] = [];

  await withBypassForSeed(prisma, async tx => {
    for (let i = 0; i < count; i++) {
      const item = await tx.catalogItem.create({
        data: {
          id: randomUUID(),
          tenantId: orgId,
          // Embed testRunId in existing fields for tag-based cleanup
          name: `Test Item ${i + 1} [tag:${testRunId}]`,
          sku: `TEST-${testRunId}-${i}`, // Primary tag field
          description: `Test catalog item for RLS verification (run: ${testRunId})`,
          price: 10.0 + i * 1.0, // $10.00, $11.00, etc.
          active: true,
          // Use current timestamp for deterministic ordering
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      itemIds.push(item.id);
    }
  });

  return itemIds;
}

/**
 * seedMultiOrgCatalogItems — Seed items for multiple orgs
 *
 * Convenience wrapper for seeding catalog items across multiple orgs
 * with a shared testRunId for batch cleanup.
 *
 * @param orgs - Array of org configurations
 * @param orgs[].orgId - Org UUID
 * @param orgs[].count - Number of items to create for this org
 * @param testRunId - Shared test run identifier for cleanup
 * @returns Map of orgId -> item IDs
 *
 * @example
 * ```typescript
 * const testRunId = randomUUID();
 * const itemsByOrg = await seedMultiOrgCatalogItems([
 *   { orgId: ORG_A_ID, count: 2 },
 *   { orgId: ORG_B_ID, count: 3 },
 * ], testRunId);
 * ```
 */
export async function seedMultiOrgCatalogItems(
  orgs: Array<{ orgId: string; count?: number }>,
  testRunId: string
): Promise<Map<string, string[]>> {
  const itemsByOrg = new Map<string, string[]>();

  for (const org of orgs) {
    const itemIds = await seedCatalogItemsForOrg(org.orgId, testRunId, org.count ?? 2);
    itemsByOrg.set(org.orgId, itemIds);
  }

  return itemsByOrg;
}

/**
 * makeTestRunId — Generate unique test run identifier
 *
 * Creates a unique identifier for this test run, used for tagging
 * and cleanup of test data.
 *
 * @returns UUID v4
 *
 * @example
 * ```typescript
 * let testRunId: string;
 * beforeEach(() => {
 *   testRunId = makeTestRunId();
 * });
 * ```
 */
export function makeTestRunId(): string {
  return randomUUID();
}
