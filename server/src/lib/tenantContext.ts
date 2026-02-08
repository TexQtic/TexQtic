import type { FastifyRequest } from 'fastify';

export interface TenantContext {
  tenantId: string | null;
  realm: 'tenant' | 'admin' | 'public';
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Extract tenant context from authenticated request
 * Priority: JWT payload > X-Tenant-Id header (fallback only)
 *
 * GOVERNANCE: Never trust tenantId from request body
 */
export function getTenantContext(request: FastifyRequest): TenantContext {
  // Priority 1: Authenticated tenant JWT (preferred)
  if (request.tenantId && request.userId) {
    return {
      tenantId: request.tenantId,
      userId: request.userId,
      realm: 'tenant',
      isAdmin: false,
    };
  }

  // Priority 2: Admin realm (control plane)
  if (request.isAdmin && request.adminId) {
    return {
      tenantId: null, // Admins operate cross-tenant
      realm: 'admin',
      isAdmin: true,
    };
  }

  /**
   * TECHNICAL DEBT: X-Tenant-Id header fallback
   * 
   * Context: Phase 2 temporary workaround for unauthenticated tenant API access
   * Phase Gate: REMOVE in Phase 3B when authentication is fully enforced
   * Action Required: Delete this fallback block once all tenant endpoints require JWT auth
   * 
   * WARNING: This bypasses authentication - do not use in production Phase 3+
   */
  const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
  if (headerTenantId) {
    request.log.warn({ headerTenantId }, 'Using X-Tenant-Id fallback - REMOVE IN PHASE 3B');
    return {
      tenantId: headerTenantId,
      realm: 'public',
    };
  }

  // No tenant context available
  return {
    tenantId: null,
    realm: 'public',
  };
}
