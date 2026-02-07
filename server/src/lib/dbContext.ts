import type { PrismaClient } from '@prisma/client';

/**
 * DB Context Management with RLS Session Variables
 *
 * Wraps Prisma operations in a transaction with tenant context set,
 * ensuring Row Level Security policies are enforced.
 *
 * CRITICAL: Always clears context in finally block to prevent session leakage.
 */

export interface DbContextOptions {
  tenantId: string;
  isAdmin?: boolean;
}

/**
 * Execute a function within a tenant-scoped database transaction with RLS context.
 *
 * Pattern:
 * 1. Begin transaction
 * 2. SET app.tenant_id = <tenantId>
 * 3. SET app.is_admin = <isAdmin>
 * 4. Execute user function with transaction client
 * 5. Clear context in finally block (always)
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant UUID  for RLS context
 * @param isAdmin - Whether actor has admin privileges (bypasses some RLS)
 * @param fn - Async function to execute within transaction
 * @returns Result of fn
 */
export async function withTenantDb<T>(
  prisma: PrismaClient,
  tenantId: string,
  isAdmin: boolean,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async tx => {
    try {
      // Set RLS session context using helper function
      await tx.$executeRawUnsafe(
        `SELECT set_tenant_context($1::uuid, $2::boolean)`,
        tenantId,
        isAdmin
      );

      // Execute user function with transaction client
      const result = await fn(tx);

      return result;
    } finally {
      // CRITICAL: Always clear context to prevent leakage
      // This ensures next request doesn't inherit stale context
      try {
        await tx.$executeRawUnsafe(`SELECT clear_context()`);
      } catch (clearError) {
        // Log but don't throw - transaction rollback will handle cleanup
        console.error('Failed to clear DB context:', clearError);
      }
    }
  });
}

/**
 * Execute a function within an admin-scoped database transaction with RLS context.
 *
 * Similar to withTenantDb but sets admin context without tenant scope.
 * Used for cross-tenant admin operations.
 *
 * @param prisma - PrismaClient instance
 * @param fn - Async function to execute within transaction
 * @returns Result of fn
 */
export async function withAdminDb<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async tx => {
    try {
      // Set admin context (no tenant scope)
      await tx.$executeRawUnsafe(`SELECT set_admin_context()`);

      const result = await fn(tx);

      return result;
    } finally {
      try {
        await tx.$executeRawUnsafe(`SELECT clear_context()`);
      } catch (clearError) {
        console.error('Failed to clear admin DB context:', clearError);
      }
    }
  });
}
