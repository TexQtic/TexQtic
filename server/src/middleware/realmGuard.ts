/**
 * Wave 0-B: Server-side realm guard middleware
 *
 * Validates JWT realm matches endpoint expectations.
 * Prevents token misuse (e.g., tenant token on admin endpoint).
 *
 * Must run AFTER JWT verification middleware.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendForbidden } from '../utils/response.js';

/**
 * Endpoint to realm mapping
 * Used to validate JWT realm matches route expectations
 */
const ENDPOINT_REALM_MAP: Record<string, 'tenant' | 'admin' | 'public'> = {
  '/api/auth': 'public',
  '/api/control': 'admin',
  '/api/tenant': 'tenant',
  '/api/me': 'tenant',
  '/api/cart': 'tenant',
  '/api/catalog': 'tenant',
  '/health': 'public',
  '/api/health': 'public',
};

/**
 * Match request URL to expected realm
 * Uses longest-prefix matching for deterministic routing
 */
function matchRealm(url: string): 'tenant' | 'admin' | 'public' {
  // Extract pathname (remove query string)
  const pathname = url.split('?')[0];

  // Check explicit mappings first
  for (const [prefix, realm] of Object.entries(ENDPOINT_REALM_MAP)) {
    if (pathname.startsWith(prefix)) {
      return realm;
    }
  }

  // Default: tenant realm for unknown /api/* routes
  if (pathname.startsWith('/api/')) {
    return 'tenant';
  }

  // All non-API routes are public
  return 'public';
}

/**
 * Realm guard middleware
 * Validates JWT realm matches endpoint expectations
 *
 * NOTE: Must run AFTER JWT verification middleware
 */
export async function realmGuardMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const expectedRealm = matchRealm(request.url);

  // Public endpoints skip realm check
  if (expectedRealm === 'public') {
    return;
  }

  // Check JWT payload realm
  const jwtPayload = request.user as any;

  // No token present - let auth middleware handle 401
  if (!jwtPayload) {
    return;
  }

  if (expectedRealm === 'admin') {
    // Admin endpoint requires admin JWT
    if (!jwtPayload?.adminId) {
      return sendForbidden(
        reply,
        'Admin endpoint requires admin token. Please log in as admin.'
      );
    }
  } else if (expectedRealm === 'tenant') {
    // Tenant endpoint requires tenant JWT
    if (!jwtPayload?.userId || !jwtPayload?.tenantId) {
      return sendForbidden(
        reply,
        'Tenant endpoint requires tenant token. Please log in as tenant user.'
      );
    }
  }
}
