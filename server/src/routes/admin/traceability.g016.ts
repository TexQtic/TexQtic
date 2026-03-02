/**
 * G-016 — Admin (Control Plane) Traceability Routes (Phase A — read-only)
 *
 * Fastify plugin — registered at /api/control/traceability (via control.ts)
 *
 * Routes (read-only):
 *   GET /api/control/traceability/nodes — cross-tenant node list (admin read)
 *   GET /api/control/traceability/edges — cross-tenant edge list (admin read)
 *
 * Constitutional compliance:
 *   D-017-A  orgId for RLS context is admin sentinel (cross-org read) or optional filter
 *   Auth: adminAuthMiddleware registered globally in parent control plugin (control.ts)
 *   Admin RLS: traceability_nodes_admin_select / traceability_edges_admin_select
 *              PERMISSIVE policies activated via is_admin='true'
 *   Phase A only: read-only. No INSERT/UPDATE/DELETE via admin routes.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Sentinel admin UUID used for RLS org_id when performing cross-tenant reads.
 * Mirrors ADMIN_SENTINEL_ID established in control/certifications.g019.ts.
 */
const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Open a withDbContext scoped to admin realm with is_admin='true'.
 * Mirrors withCertAdminContext from control/certifications.g019.ts.
 * Admin SELECT policies on traceability tables require this flag to be set.
 */
async function withTraceabilityAdminContext<T>(
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
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx as unknown as PrismaClient);
  });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const listNodesQuerySchema = z.object({
  orgId:    uuidSchema.optional(),
  nodeType: z.string().max(100).trim().optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:   z.coerce.number().int().min(0).optional().default(0),
});

const listEdgesQuerySchema = z.object({
  orgId:      uuidSchema.optional(),
  edgeType:   z.string().max(100).trim().optional(),
  fromNodeId: uuidSchema.optional(),
  toNodeId:   uuidSchema.optional(),
  limit:      z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:     z.coerce.number().int().min(0).optional().default(0),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const adminTraceabilityRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/control/traceability/nodes ──────────────────────────────────
  /**
   * List traceability nodes across all orgs (admin cross-tenant read).
   * Optional orgId filter to scope to a single org.
   * Optional nodeType filter.
   * Uses admin sentinel + is_admin='true' so PERMISSIVE admin SELECT policy activates.
   */
  fastify.get(
    '/nodes',
    async (request, reply) => {
      const adminId = (request as unknown as { adminId?: string }).adminId ?? ADMIN_SENTINEL_ID;

      const queryResult = listNodesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      try {
        const rows = await withTraceabilityAdminContext(
          query.orgId ?? ADMIN_SENTINEL_ID,
          adminId,
          async db => {
            return db.traceabilityNode.findMany({
              where: {
                ...(query.orgId   ? { orgId: query.orgId }     : {}),
                ...(query.nodeType ? { nodeType: query.nodeType.trim().toUpperCase() } : {}),
              },
              orderBy: { createdAt: 'desc' },
              take:    query.limit,
              skip:    query.offset,
            });
          },
        );

        await writeAuditLog(prisma, createAdminAudit(adminId, 'control.traceability.nodes.read', 'traceability_node', { filterOrgId: query.orgId ?? null, filterNodeType: query.nodeType ?? null, limit: query.limit, offset: query.offset }));
        return sendSuccess(reply, {
          rows,
          limit:  query.limit,
          offset: query.offset,
        });
      } catch (err) {
        return sendError(reply, 'DB_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
      }
    },
  );

  // ─── GET /api/control/traceability/edges ──────────────────────────────────
  /**
   * List traceability edges across all orgs (admin cross-tenant read).
   * Optional orgId / edgeType / fromNodeId / toNodeId filters.
   */
  fastify.get(
    '/edges',
    async (request, reply) => {
      const adminId = (request as unknown as { adminId?: string }).adminId ?? ADMIN_SENTINEL_ID;

      const queryResult = listEdgesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      try {
        const rows = await withTraceabilityAdminContext(
          query.orgId ?? ADMIN_SENTINEL_ID,
          adminId,
          async db => {
            return db.traceabilityEdge.findMany({
              where: {
                ...(query.orgId      ? { orgId: query.orgId }         : {}),
                ...(query.edgeType   ? { edgeType: query.edgeType.trim().toUpperCase() } : {}),
                ...(query.fromNodeId ? { fromNodeId: query.fromNodeId } : {}),
                ...(query.toNodeId   ? { toNodeId: query.toNodeId }   : {}),
              },
              orderBy: { createdAt: 'desc' },
              take:    query.limit,
              skip:    query.offset,
            });
          },
        );

        await writeAuditLog(prisma, createAdminAudit(adminId, 'control.traceability.edges.read', 'traceability_edge', { filterOrgId: query.orgId ?? null, filterEdgeType: query.edgeType ?? null, filterFromNodeId: query.fromNodeId ?? null, filterToNodeId: query.toNodeId ?? null, limit: query.limit, offset: query.offset }));
        return sendSuccess(reply, {
          rows,
          limit:  query.limit,
          offset: query.offset,
        });
      } catch (err) {
        return sendError(reply, 'DB_ERROR', err instanceof Error ? err.message : 'Unknown error', 500);
      }
    },
  );
};

export default adminTraceabilityRoutes;
