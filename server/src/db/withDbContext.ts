import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';

interface DbContext {
  tenantId?: string;
  isAdmin?: boolean;
}

/**
 * Execute a database operation with tenant/admin context.
 *
 * Doctrine v1.4 — Constitutional Tenancy (G-W3-A1):
 * - SET LOCAL ROLE texqtic_app  (tx-local; auto-resets on commit/rollback)
 * - All set_config calls use tx-local=true
 * - No RESET ROLE (tx-local SET LOCAL makes it unnecessary)
 * - No helper function calls (set_tenant_context / set_admin_context / clear_context)
 */
export async function withDbContext<T>(
  context: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async tx => {
    // Doctrine v1.4: switch to canonical app role (tx-local)
    await tx.$executeRawUnsafe('SET LOCAL ROLE texqtic_app');

    // Defensive drift clear: legacy key app.tenant_id (was set by old helper)
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '', true)`);
    // Ensure bypass is explicitly off for this transaction
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);

    if (context.isAdmin) {
      // Admin realm: cross-tenant; no org_id
      await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', '', true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    } else if (context.tenantId) {
      // Tenant realm: tx-local org_id (compat: context.tenantId maps to org_id)
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.org_id', $1::text, true)`,
        context.tenantId
      );
      await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'false', true)`);
    } else {
      // No context: fail-closed (org_id empty → RLS denies access)
      await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', '', true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'false', true)`);
    }

    // Execute the operation within this tx-local context
    return await fn(tx);
  });
}

/**
 * Verify tenant exists and is active
 */
export async function verifyTenantAccess(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });

  return tenant?.status === 'ACTIVE';
}

/**
 * Get user's membership in a tenant
 */
export async function getUserMembership(userId: string, tenantId: string) {
  return await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
        },
      },
    },
  });
}
