/**
 * Fastify Type Augmentation
 * Adds custom decorators and JWT methods from @fastify/jwt plugin
 */

import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Verify JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtVerify(): Promise<{
      adminId: string;
      role: string;
      [key: string]: any;
    }>;

    /**
     * Verify JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtVerify(options?: { onlyCookie: boolean }): Promise<void>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: any): Promise<string>;
  }

  interface FastifyReply {
    /**
     * Sign JWT token using admin realm
     * Added by @fastify/jwt with namespace: 'admin'
     */
    adminJwtSign(payload: any): Promise<string>;

    /**
     * Sign JWT token using tenant realm
     * Added by @fastify/jwt with namespace: 'tenant'
     */
    tenantJwtSign(payload: any): Promise<string>;
  }
}
