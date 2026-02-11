import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Contract Normalizer Middleware (PLACEHOLDER)
 *
 * Future: Validates request/response against OpenAPI contracts
 * Future: Enforces schema conformance at edge gateway
 * Future: Generates structured warnings for schema drift
 *
 * Wave 1: Registration only, no enforcement
 */

export async function contractNormalizerMiddleware(_request: FastifyRequest, _reply: FastifyReply) {
  // TODO: Wave 2+ will implement contract validation
  // For now, this is a no-op placeholder
  return;
}
