/**
 * G-026 — Internal Domain Resolver Endpoint
 *
 * GET /api/internal/resolve-domain?host=<raw-host>
 *
 * Resolves a raw HTTP Host header value to the owning TexQtic tenant.
 * Called exclusively by the Vercel Edge function for the bounded
 * platform-subdomain runtime routing path.
 *
 * Auth:
 *   HMAC-SHA256 via x-texqtic-resolver-hmac + x-texqtic-resolver-ts headers.
 *   NO JWT auth — this endpoint is machine-to-machine only (Edge → API).
 *
 * Resolution logic (§D6.4):
 *   1. Platform subdomain  <slug>.texqtic.app
 *      → lookup tenant by slug WHERE status = ACTIVE
 *   2. Verified custom domain
 *      → lookup tenant_domain by normalized host WHERE verified = true AND tenant.status = ACTIVE
 *   3. Any other hostname
 *      → bounded runtime path returns not_found
 *
 * DB execution (§D4):
 *   Runs inside a Prisma $transaction with SET LOCAL ROLE texqtic_service,
 *   which carries BYPASSRLS so RLS policies do not interfere.
 *   Role texqtic_service is created by migration g026_texqtic_service_role.
 *
 * PREFLIGHT NOTE (deviation from design §D6.6):
 *   Design said `WHERE active = true`. Actual schema uses `status TenantStatus`
 *   enum with default ACTIVE. Implementation uses `status: 'ACTIVE'` — intent
 *   preserved. Documented in wave-execution-log.md (GOVERNANCE-SYNC-090).
 *
 * Response (success):
 *   { status: 'resolved', tenantId, tenantSlug, canonicalHost }
 *
 * Response (not found):
 *   HTTP 404  { status: 'not_found' }
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { config } from '../../config/index.js';
import { verifyResolverHmac } from '../../lib/resolverHmac.js';
import { normalizeHost, parsePlatformHost } from '../../lib/hostNormalize.js';
import { sendError } from '../../utils/response.js';

// ─── Query-string schema ──────────────────────────────────────────────────────

const querySchema = z.object({
  host: z.string().min(1).max(255),
});

// ─── Route handler ────────────────────────────────────────────────────────────

async function handleResolveDomain(request: FastifyRequest, reply: FastifyReply) {
  // 1. Parse query string.
  const queryParse = querySchema.safeParse(request.query);
  if (!queryParse.success) {
    return sendError(
      reply,
      'INVALID_HOST_PARAM',
      'Required query parameter "host" is missing or invalid.',
      400,
    );
  }

  // 2. Normalize the raw host value.
  const normalizeResult = normalizeHost(queryParse.data.host);
  if (!normalizeResult.ok) {
    return sendError(reply, 'INVALID_HOST', `Host normalization failed: ${normalizeResult.reason}`, 400);
  }
  const normalizedHost = normalizeResult.host;

  // 3. Verify HMAC signature (runs AFTER normalization so the same host
  //    string is used in both the Edge-side MAC computation and here).
  const hmacResult = verifyResolverHmac(
    normalizedHost,
    request.headers['x-texqtic-resolver-hmac'] as string | undefined,
    request.headers['x-texqtic-resolver-ts'] as string | undefined,
    config.TEXQTIC_RESOLVER_SECRET,
  );
  if (!hmacResult.valid) {
    request.log.warn({ reason: hmacResult.reason, host: normalizedHost }, 'Resolver HMAC rejected');
    // Return 401 for all HMAC failures — do NOT leak which check failed.
    return sendError(reply, 'RESOLVER_AUTH_FAILED', 'HMAC verification failed.', 401);
  }

  // 4. Resolve host → tenant.
  try {
    const resolved = await resolveHostToTenant(normalizedHost);
    if (!resolved) {
      return reply.code(404).send({ status: 'not_found' });
    }

    return reply.code(200).send({
      status: 'resolved',
      tenantId:      resolved.tenantId,
      tenantSlug:    resolved.tenantSlug,
      canonicalHost: normalizedHost,
    });
  } catch (err) {
    request.log.error({ err, host: normalizedHost }, 'Resolver DB query failed');
    return sendError(reply, 'RESOLVER_DB_ERROR', 'Failed to resolve domain.', 500);
  }
}

// ─── Resolution logic (§D6.4) ─────────────────────────────────────────────────

export interface ResolvedTenant {
  tenantId: string;
  tenantSlug: string;
}

/**
 * Run the domain→tenant resolution inside a transaction with
 * `SET LOCAL ROLE texqtic_service` so BYPASSRLS applies.
 *
 * texqtic_service has:
 *   - BYPASSRLS
 *   - SELECT on public.tenants
 *
 * This is safe because the role is NOLOGIN and only reachable
 * via `SET LOCAL ROLE` by the postgres user.
 */
export async function resolveHostToTenant(host: string): Promise<ResolvedTenant | null> {
  return prisma.$transaction(async tx => {
    // Assume texqtic_service role for this transaction (BYPASSRLS).
    await tx.$executeRaw`SET LOCAL ROLE texqtic_service`;

    const platformParseResult = parsePlatformHost(host);

    if (platformParseResult.isPlatform) {
      const tenant = await tx.tenant.findFirst({
        where: { slug: platformParseResult.slug, status: 'ACTIVE' },
        select: { id: true, slug: true },
      });

      if (!tenant) return null;
      return { tenantId: tenant.id, tenantSlug: tenant.slug };
    }

    const customDomain = await tx.tenantDomain.findFirst({
      where: {
        domain: host,
        verified: true,
        tenant: {
          status: 'ACTIVE',
        },
      },
      select: {
        tenant: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!customDomain?.tenant) return null;
    return { tenantId: customDomain.tenant.id, tenantSlug: customDomain.tenant.slug };
  });
}

// ─── Fastify plugin ───────────────────────────────────────────────────────────

/**
 * Resolver domain routes plugin.
 *
 * Registered in internal/index.ts with prefix '/api/internal'.
 * Final route: GET /api/internal/resolve-domain
 *
 * No JWT auth. HMAC-only. No X-Texqtic-Internal requirement
 * (this is called by the Edge function which is a different trust model).
 */
const resolveDomainRoutes: FastifyPluginAsync = async fastify => {
  fastify.get(
    '/resolve-domain',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            host: { type: 'string', minLength: 1, maxLength: 255 },
          },
          required: ['host'],
        },
      },
    },
    handleResolveDomain,
  );
};

export default resolveDomainRoutes;
