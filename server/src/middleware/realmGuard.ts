/**
 * Wave 0-B: Server-side realm guard middleware
 *
 * Validates JWT realm matches endpoint expectations.
 * Prevents token misuse (e.g., tenant token on admin endpoint).
 *
 * This module exports utilities for realm checking that are integrated
 * into auth middleware where request.user is populated.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../utils/response.js';

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
export function matchRealm(url: string): 'tenant' | 'admin' | 'public' {
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
 * Check if token realm matches endpoint expectations
 * Returns error response if mismatch detected
 *
 * Should be called from within auth middleware after JWT verification
 */
export function checkRealmMismatch(request: FastifyRequest, reply: any): boolean {
  const expectedRealm = matchRealm(request.url);

  // Public endpoints skip realm check
  if (expectedRealm === 'public') {
    return false;
  }

  // Check JWT payload realm
  const jwtPayload = request.user as any;

  // No token present - not a realm mismatch, auth will handle
  if (!jwtPayload) {
    return false;
  }

  if (expectedRealm === 'admin') {
    // Admin endpoint requires admin JWT
    if (!jwtPayload?.adminId) {
      sendError(
        reply,
        'WRONG_REALM',
        'This endpoint requires admin authentication. Please log in as admin.',
        403
      );
      return true;
    }
  } else if (expectedRealm === 'tenant') {
    // Tenant endpoint requires tenant JWT
    if (!jwtPayload?.userId || !jwtPayload?.tenantId) {
      sendError(
        reply,
        'WRONG_REALM',
        'This endpoint requires tenant authentication. Please log in with a tenant account.',
        403
      );
      return true;
    }
  }

  return false;
}

/**
 * Wave 0-B-FIX-V3: Realm hint header guard (onRequest hook)
 *
 * Checks X-Texqtic-Realm header against expected endpoint realm.
 * Returns 403 WRONG_REALM if mismatch detected, BEFORE JWT verification.
 *
 * Benefits:
 * - Restores user-friendly 403 WRONG_REALM error (not generic 401)
 * - Does NOT verify JWT, preserves single-verifier isolation
 * - Backwards compatible (no-op if header missing)
 *
 * MUST run in onRequest phase (before auth middleware)
 */
export async function realmHintGuardOnRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const expectedRealm = matchRealm(request.url);

  // Public endpoints skip realm check
  if (expectedRealm === 'public') {
    return;
  }

  // Read realm hint header (case-insensitive)
  const realmHint = (request.headers['x-texqtic-realm'] as string)?.toLowerCase();

  // If no hint header, skip check (backwards compatible)
  if (!realmHint) {
    return;
  }

  // Normalize hint: "tenant" | "control" -> internal realm values
  let hintRealm: 'tenant' | 'admin' | null = null;
  if (realmHint === 'tenant') {
    hintRealm = 'tenant';
  } else if (realmHint === 'control') {
    hintRealm = 'admin';
  }

  // Invalid hint value - ignore it
  if (!hintRealm) {
    return;
  }

  // Check for mismatch
  if (expectedRealm === 'admin' && hintRealm !== 'admin') {
    return sendError(
      reply,
      'WRONG_REALM',
      'WRONG_REALM: This endpoint requires control-plane authentication.',
      403
    );
  }

  if (expectedRealm === 'tenant' && hintRealm !== 'tenant') {
    return sendError(
      reply,
      'WRONG_REALM',
      'WRONG_REALM: This endpoint requires tenant authentication.',
      403
    );
  }

  // Hint matches expected realm - proceed to auth verification
}
