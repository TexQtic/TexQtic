/**
 * Fastify Type Augmentation
 * Adds custom decorators and JWT methods from @fastify/jwt plugin
 *
 * IMPORTANT: The bare `export {}` below is load-bearing — it makes this file a
 * TypeScript MODULE rather than a script. Without it, `declare module 'fastify'`
 * would be treated as a new ambient module declaration that REPLACES the real
 * Fastify types (breaking FastifyInstance.register, .inject, etc.).
 * With `export {}` the same construct is a MODULE AUGMENTATION that merges with
 * the existing types.
 *
 * This file is picked up two ways:
 *   1. server/tsconfig.json  include:["src/**\/*"]   — local tsc
 *   2. /// <reference path>  in api/index.ts          — Vercel @vercel/node
 */

// Makes this a module so `declare module 'fastify'` below is an augmentation.
export {};

declare module 'fastify' {
  interface FastifyRequest {
    serviceCallerId?: string;
    serviceCallerType?: 'APPROVED_ONBOARDING';

    /**
     * Verify JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtVerify(): Promise<{ adminId: string; role: string; [key: string]: unknown }>;

    /**
     * Verify JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtVerify(options?: { onlyCookie: boolean }): Promise<void>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: { [key: string]: unknown }): Promise<string>;

    /**
     * Database RLS context (Gate B.1)
     * Populated by database-context.middleware after JWT verification
     * Contains: orgId, actorId, realm, requestId, roles
     * Used by withDbContext() for transaction-local SET LOCAL statements
     */
    dbContext?: import('../lib/database-context.js').DatabaseContext;
  }

  interface FastifyReply {
    /**
     * Sign JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtSign(payload: { [key: string]: unknown }): Promise<string>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: { [key: string]: unknown }): Promise<string>;
  }
}
