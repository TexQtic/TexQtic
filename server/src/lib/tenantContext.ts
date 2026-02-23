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

  // G-W3-A1: X-Tenant-Id header fallback removed — fail-closed (auth required).
  // No authenticated context available; upstream auth guards must reject.
  return {
    tenantId: null,
    realm: 'public',
  };
}
