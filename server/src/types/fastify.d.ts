/**
 * Fastify Type Augmentation
 * Adds custom decorators and JWT methods from @fastify/jwt plugin
 */

import '@fastify/jwt';
import type { DatabaseContext } from '../lib/database-context.js';

// JWT payload types
interface AdminJwtPayload {
  adminId: string;
  role: string;
  [key: string]: unknown;
}

interface TenantJwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  [key: string]: unknown;
}

interface JwtSignPayload {
  [key: string]: unknown;
}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Verify JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtVerify(): Promise<AdminJwtPayload>;

    /**
     * Verify JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtVerify(options?: { onlyCookie: boolean }): Promise<void>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: JwtSignPayload): Promise<string>;

    /**
     * Database RLS context (Gate B.1)
     * Populated by database-context.middleware after JWT verification
     * Contains: orgId, actorId, realm, requestId, roles
     * Used by withDbContext() for transaction-local SET LOCAL statements
     */
    dbContext?: DatabaseContext;
  }

  interface FastifyReply {
    /**
     * Sign JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtSign(payload: JwtSignPayload): Promise<string>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: JwtSignPayload): Promise<string>;
  }
}
