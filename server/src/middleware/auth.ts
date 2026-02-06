import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendUnauthorized, sendForbidden } from '../utils/response.js';
import { verifyTenantAccess, getUserMembership } from '../db/withDbContext.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
    userId?: string;
    userRole?: string;
    isAdmin?: boolean;
    adminId?: string;
    adminRole?: string;
  }
}

/**
 * Extract and validate tenant from X-Tenant-Id header
 */
export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return sendUnauthorized(reply, 'Missing X-Tenant-Id header');
  }

  // Validate tenant exists and is active
  const isValid = await verifyTenantAccess(tenantId);
  if (!isValid) {
    return sendForbidden(reply, 'Invalid or inactive tenant');
  }

  request.tenantId = tenantId;
}

/**
 * Verify tenant user JWT and membership
 */
export async function tenantAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT using tenant realm
    await request.jwtVerify({ onlyCookie: false });
    const payload = request.user as any;

    if (!payload.userId || !payload.tenantId) {
      return sendUnauthorized(reply, 'Invalid token payload');
    }

    // Verify membership
    const membership = await getUserMembership(payload.userId, payload.tenantId);
    if (!membership) {
      return sendForbidden(reply, 'No membership in this tenant');
    }

    request.userId = payload.userId;
    request.tenantId = payload.tenantId;
    request.userRole = membership.role;
  } catch (error) {
    return sendUnauthorized(reply, 'Invalid or expired token');
  }
}

/**
 * Verify admin JWT
 */
export async function adminAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT using admin realm
    const payload = await request.adminJwtVerify();

    if (!payload.adminId || !payload.role) {
      return sendUnauthorized(reply, 'Invalid admin token');
    }

    request.isAdmin = true;
    request.adminId = payload.adminId;
    request.adminRole = payload.role;
  } catch (error) {
    return sendUnauthorized(reply, 'Invalid or expired admin token');
  }
}

/**
 * Require specific admin role
 */
export function requireAdminRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.isAdmin || !request.adminRole) {
      return sendUnauthorized(reply, 'Admin authentication required');
    }

    if (!allowedRoles.includes(request.adminRole)) {
      return sendForbidden(reply, `Requires one of: ${allowedRoles.join(', ')}`);
    }
  };
}
