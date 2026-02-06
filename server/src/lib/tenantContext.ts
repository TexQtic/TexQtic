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

  // Priority 3: TEMPORARY fallback - X-Tenant-Id header (for Phase 3A only)
  // TODO Phase 3B: Remove this fallback and require authentication
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
