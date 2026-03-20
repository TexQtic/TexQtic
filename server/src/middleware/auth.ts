import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendUnauthorized, sendForbidden } from '../utils/response.js';
import { getUserMembership } from '../db/withDbContext.js';
import { checkRealmMismatch } from './realmGuard.js';

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

// G-W3-A1 cleanup: tenantMiddleware (X-Tenant-Id header bypass, 0 callers) deleted.
// Tenant context MUST come from JWT. See lib/tenantContext.ts.

/**
 * Verify tenant user JWT and membership
 * Alias: requireTenantAuth
 *
 * Wave 0-B-FIX: Only verifies tenant JWT. Cross-realm detection handled by checkRealmMismatch.
 */
export async function tenantAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT using tenant realm ONLY
    await request.tenantJwtVerify({ onlyCookie: false });
    const payload = request.user as { userId?: string; tenantId?: string };

    if (!payload.userId || !payload.tenantId) {
      return sendUnauthorized(reply, 'Invalid token payload');
    }

    // Wave 0-B: Check realm mismatch using centralized mapping
    // This catches cases where tenant token is used on admin-only endpoint
    if (checkRealmMismatch(request, reply)) {
      return; // checkRealmMismatch already sent 403 WRONG_REALM response
    }

    if (request.resolvedTenantId && request.resolvedTenantId !== payload.tenantId) {
      return sendForbidden(reply, 'Resolved tenant does not match token tenant');
    }

    // Verify membership
    const membership = await getUserMembership(payload.userId, payload.tenantId);
    if (!membership) {
      return sendForbidden(reply, 'No membership in this tenant');
    }

    request.userId = payload.userId;
    request.tenantId = payload.tenantId;
    request.userRole = membership.role;
  } catch {
    // Tenant JWT verification failed - invalid or expired
    return sendUnauthorized(reply, 'Invalid or expired token');
  }
}

/**
 * Verify admin JWT
 * Alias: requireAdminAuth
 *
 * Wave 0-B-FIX: Only verifies admin JWT. Cross-realm detection handled by checkRealmMismatch.
 */
export async function adminAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verify JWT using admin realm ONLY
    const payload = await request.adminJwtVerify();

    if (!payload.adminId || !payload.role) {
      return sendUnauthorized(reply, 'Invalid admin token');
    }

    request.isAdmin = true;
    request.adminId = payload.adminId;
    request.adminRole = payload.role;

    // Wave 0-B: Check realm mismatch using centralized mapping
    // This catches cases where admin token is used on tenant-only endpoint
    if (checkRealmMismatch(request, reply)) {
      return; // checkRealmMismatch already sent 403 WRONG_REALM response
    }
  } catch {
    // Admin JWT verification failed - invalid or expired
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

// Aliases for requirement compliance
export const requireAdminAuth = adminAuthMiddleware;
export const requireTenantAuth = tenantAuthMiddleware;
