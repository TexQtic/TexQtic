/**
 * DB Availability Gate for Tests
 *
 * Provides a way to skip test suites when database is unreachable.
 * Handles Supabase pooler constraints and connection failures gracefully.
 *
 * Usage:
 * ```typescript
 * beforeAll(async () => {
 *   await assertDbOrSkip(prisma);
 * });
 * ```
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Check database connectivity and skip suite if unavailable.
 *
 * Attempts a simple SELECT 1 query. If it fails, the test suite
 * should be skipped (caller must implement skip logic).
 *
 * @param prisma - Prisma client instance
 * @returns Promise<boolean> - true if DB available, false otherwise
 */
export async function checkDbAvailable(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn(
      '[DB Gate] Database unavailable, suite will be skipped:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Assert DB is available or throw with skip-friendly message.
 *
 * Use this in beforeAll/beforeEach to gate test execution.
 *
 * @param prisma - Prisma client instance
 * @throws Error with skip message if DB unavailable
 */
export async function assertDbOrSkip(prisma: PrismaClient): Promise<void> {
  const available = await checkDbAvailable(prisma);
  if (!available) {
    throw new Error('[DB Gate] Database unavailable - test suite skipped');
  }
}
