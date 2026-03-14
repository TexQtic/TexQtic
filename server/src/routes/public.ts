/**
 * Public Routes — unauthenticated, no realm guard required.
 *
 * TECS-FBW-AUTH-001 (2026-03-13):
 *   Added GET /api/public/tenants/resolve?slug=<slug>
 *   Resolves a tenant slug to its canonical identity for login flow use only.
 *   No auth required. Returns only public-safe fields (id, slug, name).
 *   Registered in index.ts at prefix /api/public.
 *   /api/public added to ENDPOINT_REALM_MAP as 'public' in realmGuard.ts.
 *
 * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14):
 *   Added GET /api/public/tenants/by-email?email=<email>
 *   Returns all active tenant memberships for an email address.
 *   Used by tenant login UI to replace the manual slug entry field.
 *   No auth required. Returns only public-safe tenant fields (id, slug, name).
 *   Empty array is a valid response — handled by frontend as "no account found".
 *
 * PW5-AUTH-BY-EMAIL-RLS-REMEDIATION (2026-03-14):
 *   Fixed /tenants/by-email to run under SET LOCAL ROLE texqtic_service so the
 *   membership lookup is not denied by FORCE RLS (memberships policies scope
 *   exclusively to texqtic_app; bare postgres gets 0 rows under deny-by-default).
 *   Migration 20260319000001_pw5_by_email_service_role_grants adds minimum
 *   SELECT grants on public.memberships and public.users to texqtic_service.
 *   Deployed via pnpm -C server migrate:deploy:prod (OPS-ENV-001).
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

  /**
   * GET /api/public/tenants/by-email?email=<email>
   *
   * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14)
   *
   * Returns all ACTIVE tenant memberships that exist for the given email address.
   * Used by the tenant login flow to present a server-driven tenant selection
   * instead of requiring the user to manually enter an organisation slug.
   *
   * Response: { success: true, data: { tenants: Array<{ tenantId, slug, name }> } }
   *   tenants is [] when no memberships exist — frontend handles this as "no account found".
   *
   * Public endpoint — no authentication required.
   * Returns only non-sensitive public-safe fields.
   * Email is normalised to lowercase before lookup.
   *
   * Security note: this endpoint reveals which tenant(s) an email is associated with
   * before authentication. This is comparable to the prior slug-lookup flow and is
   * an accepted B2B SaaS pattern. No passwords, roles, or internal IDs beyond
   * tenantId are returned.
   */
  fastify.get('/tenants/by-email', async (request, reply) => {
    const querySchema = z.object({
      email: z
        .string()
        .email('A valid email address is required')
        .max(255, 'Email must be 255 characters or fewer'),
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return sendValidationError(reply, parseResult.error.errors);
    }

    const emailNormalized = parseResult.data.email.trim().toLowerCase();

    // Query via memberships → join tenant. Only return ACTIVE tenants.
    //
    // PW5-AUTH-BY-EMAIL-RLS-REMEDIATION (2026-03-14):
    //   memberships is under FORCE RLS with policies scoped exclusively to
    //   texqtic_app. The bare Prisma client connects as postgres, which matches
    //   no PERMISSIVE policy under FORCE RLS → 0 rows returned (deny-by-default).
    //
    //   Fix: wrap in prisma.$transaction + SET LOCAL ROLE texqtic_service.
    //   texqtic_service carries BYPASSRLS (NOLOGIN, unreachable except via
    //   SET LOCAL ROLE from postgres). This is the canonical TexQtic pattern
    //   established by G-026 / resolveDomain.ts.
    //
    //   Migration 20260319000001_pw5_by_email_service_role_grants adds the
    //   minimum required SELECT grants on public.memberships and public.users
    //   to texqtic_service. Deployed via pnpm -C server migrate:deploy:prod.
    const memberships = await prisma.$transaction(async tx => {
      // Assume texqtic_service role for this transaction only (tx-local BYPASSRLS).
      // Role auto-resets on transaction commit/rollback — no persistent state change.
      await tx.$executeRaw`SET LOCAL ROLE texqtic_service`;

      return tx.membership.findMany({
        where: {
          user: { email: emailNormalized },
          tenant: { status: 'ACTIVE' },
        },
        select: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });
    });

    const tenants = memberships.map(m => ({
      tenantId: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
    }));

    return sendSuccess(reply, { tenants });
  });
};

export default publicRoutes;
