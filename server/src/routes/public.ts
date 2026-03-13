/**
 * Public Routes — unauthenticated, no realm guard required.
 *
 * TECS-FBW-AUTH-001 (2026-03-13):
 *   Added GET /api/public/tenants/resolve?slug=<slug>
 *   Resolves a tenant slug to its canonical identity for login flow use only.
 *   No auth required. Returns only public-safe fields (id, slug, name).
 *   Registered in index.ts at prefix /api/public.
 *   /api/public added to ENDPOINT_REALM_MAP as 'public' in realmGuard.ts.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import { prisma } from '../db/prisma.js';

const publicRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/public/tenants/resolve?slug=<slug>
   *
   * Resolves a tenant slug to canonical identity required by tenant login flow.
   *
   * Response: { success: true, data: { tenantId, slug, name } }
   * Errors:
   *   400 VALIDATION_ERROR   — malformed slug parameter
   *   404 TENANT_NOT_FOUND   — no tenant matching the slug
   *
   * Public endpoint — no authentication required.
   * Returns only non-sensitive public-safe tenant fields.
   * Used by AuthFlows.tsx to replace the seeded tenant picker (TECS-FBW-AUTH-001).
   */
  fastify.get('/tenants/resolve', async (request, reply) => {
    const querySchema = z.object({
      slug: z
        .string()
        .min(1, 'Tenant slug is required')
        .max(100, 'Tenant slug must be 100 characters or fewer')
        .regex(
          /^[a-z0-9-]+$/,
          'Tenant slug must contain only lowercase letters, digits, and hyphens'
        ),
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const { slug } = parseResult.data;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return sendError(
        reply,
        'TENANT_NOT_FOUND',
        `No tenant found for slug '${slug}'. Check the slug and try again.`,
        404
      );
    }

    return sendSuccess(reply, {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    });
  });
};

export default publicRoutes;
