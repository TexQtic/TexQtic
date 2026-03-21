/**
 * G-016 — Tenant Plane Traceability Routes (Phase A)
 *
 * Fastify plugin — registered at /api/tenant/traceability
 *
 * Routes:
 *   POST  /api/tenant/traceability/nodes              — create node
 *   GET   /api/tenant/traceability/nodes              — list nodes (paginated)
 *   POST  /api/tenant/traceability/edges              — create edge
 *   GET   /api/tenant/traceability/edges              — list edges (paginated)
 *   GET   /api/tenant/traceability/nodes/:id/neighbors — 1-hop neighbors (tenant-scoped)
 *
 * Constitutional compliance:
 *   D-017-A  orgId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   Phase A only: no maker-checker, no AI/vector infra
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { TraceabilityService } from '../../services/traceability.g016.service.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context.
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (arg: unknown) => {
          if (typeof arg === 'function') {
            return (arg as (client: Prisma.TransactionClient) => Promise<unknown>)(tx);
          }

          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }

          throw new TypeError('Unsupported $transaction usage in makeTxBoundPrisma');
        };
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createNodeBodySchema = z.object({
  batchId:    z.string().min(1).max(500).trim(),
  nodeType:   z.string().min(1).max(100).trim(),
  meta:       z.record(z.unknown()).optional().default({}),
  visibility: z.enum(['TENANT', 'SHARED']).optional().default('TENANT'),
  geoHash:    z.string().max(20).trim().optional().nullable(),
  // D-017-A: orgId MUST NOT be in the body
  orgId:      z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const createEdgeBodySchema = z.object({
  fromNodeId:       uuidSchema,
  toNodeId:         uuidSchema,
  edgeType:         z.string().min(1).max(100).trim(),
  transformationId: z.string().max(500).trim().optional().nullable(),
  meta:             z.record(z.unknown()).optional().default({}),
  // D-017-A: orgId MUST NOT be in the body
  orgId:            z.never({ message: 'orgId must not be set in request body' }).optional(),
});

const listNodesQuerySchema = z.object({
  nodeType: z.string().max(100).trim().optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:   z.coerce.number().int().min(0).optional().default(0),
});

const listEdgesQuerySchema = z.object({
  edgeType:   z.string().max(100).trim().optional(),
  fromNodeId: uuidSchema.optional(),
  toNodeId:   uuidSchema.optional(),
  limit:      z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:     z.coerce.number().int().min(0).optional().default(0),
});

const nodeIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantTraceabilityRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/tenant/traceability/nodes ─────────────────────────────────
  fastify.post(
    '/nodes',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const bodyResult = createNodeBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const svc = new TraceabilityService(makeTxBoundPrisma(tx));
        const result = await svc.createNode({
          orgId:      dbContext.orgId,
          batchId:    body.batchId,
          nodeType:   body.nodeType,
          meta:       body.meta as Record<string, unknown>,
          visibility: body.visibility,
          geoHash:    body.geoHash ?? null,
        });

        if (result.status !== 'CREATED') {
          const httpCode = result.code === 'CONFLICT' ? 409 : result.code === 'INVALID_INPUT' ? 400 : 500;
          return sendError(reply, result.code, result.message, httpCode);
        }

        return sendSuccess(reply, { nodeId: result.nodeId }, 201);
      });
    },
  );

  // ─── GET /api/tenant/traceability/nodes ──────────────────────────────────
  fastify.get(
    '/nodes',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = listNodesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const svc = new TraceabilityService(makeTxBoundPrisma(tx));
        const result = await svc.listNodes({
          orgId:    dbContext.orgId,
          nodeType: query.nodeType,
          limit:    query.limit,
          offset:   query.offset,
        });

        if (result.status !== 'OK') {
          return sendError(reply, result.code, result.message, 500);
        }

        return sendSuccess(reply, {
          rows:   result.rows,
          total:  result.total,
          limit:  query.limit,
          offset: query.offset,
        });
      });
    },
  );

  // ─── GET /api/tenant/traceability/nodes/:id/neighbors ────────────────────
  fastify.get(
    '/nodes/:id/neighbors',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramResult = nodeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }

      return withDbContext(prisma, dbContext, async tx => {
        const svc = new TraceabilityService(makeTxBoundPrisma(tx));
        const result = await svc.getNodeNeighbors(paramResult.data.id, dbContext.orgId);

        if (result.status !== 'OK') {
          const httpCode = result.code === 'NOT_FOUND' ? 404 : 500;
          return sendError(reply, result.code, result.message, httpCode);
        }

        return sendSuccess(reply, {
          node:       result.node,
          edgesFrom:  result.edgesFrom,
          edgesTo:    result.edgesTo,
        });
      });
    },
  );

  // ─── POST /api/tenant/traceability/edges ─────────────────────────────────
  fastify.post(
    '/edges',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const bodyResult = createEdgeBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const svc = new TraceabilityService(makeTxBoundPrisma(tx));
        const result = await svc.createEdge({
          orgId:            dbContext.orgId,
          fromNodeId:       body.fromNodeId,
          toNodeId:         body.toNodeId,
          edgeType:         body.edgeType,
          transformationId: body.transformationId ?? null,
          meta:             body.meta as Record<string, unknown>,
        });

        if (result.status !== 'CREATED') {
          const httpCode =
            result.code === 'CONFLICT' ? 409 :
            result.code === 'NOT_FOUND' ? 404 :
            result.code === 'INVALID_INPUT' ? 400 : 500;
          return sendError(reply, result.code, result.message, httpCode);
        }

        return sendSuccess(reply, { edgeId: result.edgeId }, 201);
      });
    },
  );

  // ─── GET /api/tenant/traceability/edges ──────────────────────────────────
  fastify.get(
    '/edges',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = listEdgesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      return withDbContext(prisma, dbContext, async tx => {
        const svc = new TraceabilityService(makeTxBoundPrisma(tx));
        const result = await svc.listEdges({
          orgId:      dbContext.orgId,
          edgeType:   query.edgeType,
          fromNodeId: query.fromNodeId,
          toNodeId:   query.toNodeId,
          limit:      query.limit,
          offset:     query.offset,
        });

        if (result.status !== 'OK') {
          return sendError(reply, result.code, result.message, 500);
        }

        return sendSuccess(reply, {
          rows:   result.rows,
          total:  result.total,
          limit:  query.limit,
          offset: query.offset,
        });
      });
    },
  );
};

export default tenantTraceabilityRoutes;
