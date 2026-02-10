/**
 * Fastify Type Augmentation
 * Adds custom decorators and JWT methods from @fastify/jwt plugin
 */

import '@fastify/jwt';

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
