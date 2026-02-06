import { prisma } from './prisma.js';

interface DbContext {
  tenantId?: string;
  isAdmin?: boolean;
}

/**
 * Execute a database operation with tenant/admin context
 * Sets session variables for RLS policies
 */
export async function withDbContext<T>(context: DbContext, fn: () => Promise<T>): Promise<T> {
  return await prisma.$transaction(async tx => {
    // Set session variables for RLS
    if (context.isAdmin) {
      await tx.$executeRawUnsafe(`SELECT set_admin_context()`);
    } else if (context.tenantId) {
      await tx.$executeRawUnsafe(`SELECT set_tenant_context($1::uuid, false)`, context.tenantId);
    } else {
      await tx.$executeRawUnsafe(`SELECT clear_context()`);
    }

    // Execute the operation within this context
    return await fn();
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
