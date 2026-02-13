/**
 * RLS Cleanup Helpers — Gate C.1
 *
 * Tag-based cleanup for test data (no global deleteMany).
 * Uses withBypassForSeed for cleanup operations.
 *
 * DOCTRINE COMPLIANCE:
 * - Tag-based cleanup ONLY (no deleteMany without filter)
 * - Uses withBypassForSeed (seed-only bypass for cleanup allowed)
 * - Transaction-local bypass (context clears after cleanup)
 * - Prevents cross-test interference (isolated cleanup)
 */

import { prisma } from '../../db/prisma.js';
import { withBypassForSeed } from '../../lib/database-context.js';

/**
 * cleanupCatalogItemsByTag — Delete catalog items by testRunId tag
 *
 * Removes catalog items created during test run using embedded tag.
 * Safe for concurrent tests (only removes tagged rows).
 *
 * Tag matching: Finds rows where sku contains testRunId.
 * Format: `TEST-${testRunId}-*`
 *
 * @param testRunId - Unique test run identifier (from seedCatalogItemsForOrg)
 * @returns Number of deleted items
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupCatalogItemsByTag(testRunId);
 * });
 * ```
 */
export async function cleanupCatalogItemsByTag(testRunId: string): Promise<number> {
  let deletedCount = 0;

  await withBypassForSeed(prisma, async tx => {
    // Delete catalog items where sku contains testRunId tag
    const result = await tx.catalogItem.deleteMany({
      where: {
        sku: {
          contains: testRunId,
        },
      },
    });
    deletedCount = result.count;
  });

  return deletedCount;
}

/**
 * cleanupAllTestCatalogItems — Emergency cleanup for test items
 *
 * Removes ALL catalog items with 'TEST-' prefix in SKU.
 * Use ONLY in test suite teardown or emergency cleanup.
 * NOT for per-test cleanup (use cleanupCatalogItemsByTag instead).
 *
 * @returns Number of deleted items
 *
 * @example
 * ```typescript
 * // In test suite afterAll
 * afterAll(async () => {
 *   await cleanupAllTestCatalogItems();
 * });
 * ```
 */
export async function cleanupAllTestCatalogItems(): Promise<number> {
  let deletedCount = 0;

  await withBypassForSeed(prisma, async tx => {
    // Delete all test catalog items (TEST- prefix in SKU)
    const result = await tx.catalogItem.deleteMany({
      where: {
        sku: {
          startsWith: 'TEST-',
        },
      },
    });
    deletedCount = result.count;
  });

  return deletedCount;
}

/**
 * verifyCleanupComplete — Verify no tagged items remain
 *
 * Checks that cleanup removed all items for this testRunId.
 * Useful for debugging cleanup failures.
 *
 * @param testRunId - Test run identifier to verify
 * @returns True if no tagged items remain
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupCatalogItemsByTag(testRunId);
 *   const clean = await verifyCleanupComplete(testRunId);
 *   expect(clean).toBe(true);
 * });
 * ```
 */
export async function verifyCleanupComplete(testRunId: string): Promise<boolean> {
  let remainingCount = 0;

  await withBypassForSeed(prisma, async tx => {
    // Count remaining items with this tag
    remainingCount = await tx.catalogItem.count({
      where: {
        sku: {
          contains: testRunId,
        },
      },
    });
  });

  return remainingCount === 0;
}
