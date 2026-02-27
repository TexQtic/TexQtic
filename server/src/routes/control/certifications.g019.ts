/**
 * G-019 — Control Plane Certification Routes
 *
 * Fastify plugin — registered at /api/control/certifications
 *
 * Routes:
 *   GET /api/control/certifications — cross-tenant certification list (admin read only)
 *
 * Constitutional compliance:
 *   D-017-A  orgId for RLS context is admin sentinel (cross-org read) or optional filter
 *   Audit trail: admin reads are audited
 *   Auth: adminAuthMiddleware registered globally in parent control plugin (control.ts)
 *   Admin RLS: certifications_admin_select PERMISSIVE policy activated via is_admin='true'
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Sentinel admin UUID used for RLS org_id when performing cross-tenant reads.
 * Mirrors ADMIN_SENTINEL_ID established in control/trades.g017.ts.
 */
const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Open a withDbContext scoped to admin realm with is_admin='true'.
 * Mirrors withTradeAdminContext from control/trades.g017.ts.
 * Admin SELECT policies on certifications require this flag to be set.
 */
async function withCertAdminContext<T>(
  orgId: string,
  adminId: string,
  callback: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId,
    actorId:   adminId,
    realm:     'control',
    requestId: randomUUID(),
  };

  return withDbContext(prisma, ctx, async tx => {
    // Set admin override so certifications_admin_select PERMISSIVE policy activates.
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx as unknown as PrismaClient);
  });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  /** Optional: filter by a specific org UUID */
  orgId:     uuidSchema.optional(),
  /** Optional: filter by lifecycle state key (e.g., SUBMITTED, APPROVED) */
  stateKey:  z.string().max(50).trim().toUpperCase().optional(),
  limit:     z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:    z.coerce.number().int().min(0).optional().default(0),
});

const certIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlCertificationRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/control/certifications ──────────────────────────────────────
  /**
   * List certifications across all orgs (admin cross-tenant read).
   * Optional orgId filter to scope to a single org.
   * Optional stateKey filter (e.g., SUBMITTED, APPROVED, REVOKED).
   * Uses admin sentinel + is_admin='true' so the PERMISSIVE admin SELECT policy activates.
   */
  fastify.get(
    '/',
    async (request, reply) => {
      const adminId = request.adminId ?? ADMIN_SENTINEL_ID;

      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      try {
        const rows = await withCertAdminContext(
          query.orgId ?? ADMIN_SENTINEL_ID,
          adminId,
          async db => {
            return db.certification.findMany({
              where: {
                ...(query.orgId ? { orgId: query.orgId } : {}),
                ...(query.stateKey
                  ? { lifecycleState: { stateKey: query.stateKey } }
                  : {}),
              },
              include: {
                lifecycleState: { select: { stateKey: true, entityType: true } },
              },
              orderBy: { createdAt: 'desc' },
              take:    query.limit,
              skip:    query.offset,
            });
          },
        );

        return sendSuccess(reply, {
          certifications: rows.map(c => ({
            id:                c.id,
            orgId:             c.orgId,
            certificationType: c.certificationType,
            stateKey:          c.lifecycleState.stateKey,
            issuedAt:          c.issuedAt,
            expiresAt:         c.expiresAt,
            createdAt:         c.createdAt,
            updatedAt:         c.updatedAt,
          })),
          count:  rows.length,
          limit:  query.limit,
          offset: query.offset,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-019] GET /control/certifications error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list certifications', 500);
      }
    },
  );

  // ─── GET /api/control/certifications/:id ─────────────────────────────────
  /**
   * Get a single certification by id (admin, cross-tenant read).
   * Uses admin sentinel + is_admin='true'.
   */
  fastify.get(
    '/:id',
    async (request, reply) => {
      const adminId = request.adminId ?? ADMIN_SENTINEL_ID;

      const paramResult = certIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id } = paramResult.data;

      try {
        const cert = await withCertAdminContext(
          ADMIN_SENTINEL_ID,
          adminId,
          async db => {
            return db.certification.findFirst({
              where: { id },
              include: {
                lifecycleState: { select: { stateKey: true, entityType: true, isTerminal: true } },
              },
            });
          },
        );

        if (!cert) {
          return sendError(reply, 'NOT_FOUND', `Certification ${id} not found`, 404);
        }

        return sendSuccess(reply, {
          id:                cert.id,
          orgId:             cert.orgId,
          certificationType: cert.certificationType,
          stateKey:          cert.lifecycleState.stateKey,
          isTerminal:        cert.lifecycleState.isTerminal,
          issuedAt:          cert.issuedAt,
          expiresAt:         cert.expiresAt,
          createdByUserId:   cert.createdByUserId,
          createdAt:         cert.createdAt,
          updatedAt:         cert.updatedAt,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-019] GET /control/certifications/:id error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to get certification', 500);
      }
    },
  );
};

export default controlCertificationRoutes;
