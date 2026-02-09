import { prisma } from './prisma.js';

interface DbContext {
  tenantId?: string;
  isAdmin?: boolean;
}

/**
 * Execute a database operation with tenant/admin context
 * Sets session variables for RLS policies
 * Uses app_user role to enforce RLS (Supabase workaround)
 */
export async function withDbContext<T>(context: DbContext, fn: () => Promise<T>): Promise<T> {
  return await prisma.$transaction(async tx => {
    // Switch to app_user role for RLS enforcement
    // (Supabase doesn't allow direct auth with custom roles)
    await tx.$executeRawUnsafe('SET ROLE app_user');

    // Set session variables for RLS
    // Schema-qualified calls for app_user role compatibility
    if (context.isAdmin) {
      await tx.$executeRawUnsafe(`SELECT public.set_admin_context()`);
    } else if (context.tenantId) {
      await tx.$executeRawUnsafe(`SELECT public.set_tenant_context($1::uuid, false)`, context.tenantId);
    } else {
      await tx.$executeRawUnsafe(`SELECT public.clear_context()`);
    }

    try {
      // Execute the operation within this context
      return await fn();
    } finally {
      // Reset role for connection pooling
      await tx.$executeRawUnsafe('RESET ROLE');
    }
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
