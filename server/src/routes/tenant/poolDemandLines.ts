/**
 * Pool Demand Line Tenant Routes
 * TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-ROUTE-001
 *
 * Owner-only tenant routes for Network Commerce Pool RFQ demand lines.
 *
 * D-017-A: orgId is ALWAYS sourced from request.dbContext.orgId — never from params/query/body.
 *
 * Routes:
 *   GET    /:poolId/demand-lines                      — list demand lines (paginated)
 *   POST   /:poolId/demand-lines                      — create a demand line
 *   POST   /:poolId/demand-lines/lock-for-rfq         — lock ACTIVE lines for RFQ issuance
 *   PATCH  /:poolId/demand-lines/:lineId              — update a demand line (partial)
 *   POST   /:poolId/demand-lines/:lineId/cancel       — cancel a demand line
 *
 * Design: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-DECISION-RECORD-001 (1022879)
 */

import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { ncPoolFeatureGateMiddleware } from '../../middleware/ncPoolFeatureGate.middleware.js';
import { ncPoolRfqFeatureGateMiddleware } from '../../middleware/ncPoolRfqFeatureGate.middleware.js';
import { prisma } from '../../db/prisma.js';
import { sendError, sendSuccess, sendValidationError } from '../../utils/response.js';
import { isOrgVerificationBlocked } from '../../utils/orgVerificationGuard.js';
import {
  NetworkPoolDemandLineService,
  DemandLineNotFoundError,
  DemandLinePoolNotFoundError,
  DemandLineInvalidInputError,
  DemandLineInvalidStateError,
  DemandLinePoolStateError,
  DemandLineDuplicateRefError,
  DemandLineSnapshotBlockedError,
  DemandLineNoActiveLinesError,
  DemandLineSetChangedError,
  DemandLineSnapshotConflictError,
} from '../../services/networkPoolDemandLine.service.js';

// ─── Param / Query / Body Schemas ────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const poolAndLineParamSchema = z.object({
  poolId: uuidSchema,
  lineId: uuidSchema,
});

const poolParamSchema = z.object({
  poolId: uuidSchema,
});

const createDemandLineBodySchema = z
  .object({
    pool_id: z
      .never({ errorMap: () => ({ message: 'pool_id must not be provided in request body' }) })
      .optional(),
    owner_org_id: z
      .never({ errorMap: () => ({ message: 'owner_org_id must not be provided in request body' }) })
      .optional(),
    line_ref: z.string().trim().min(1).max(100, 'line_ref max 100 chars'),
    commodity_category: z.string().trim().min(1).max(100, 'commodity_category max 100 chars'),
    product_category: z.string().trim().min(1).max(100).optional().nullable(),
    product_spec_summary: z.string().trim().min(1).max(2000).optional().nullable(),
    qty: z.number().positive('qty must be > 0'),
    qty_unit: z.string().trim().min(1).max(50, 'qty_unit max 50 chars'),
    quality_requirements_json: z.record(z.unknown()).optional().nullable(),
    certification_requirements_json: z.record(z.unknown()).optional().nullable(),
    packaging_requirements_json: z.record(z.unknown()).optional().nullable(),
    delivery_location: z.string().trim().min(1).max(500).optional().nullable(),
    delivery_window_start: z.string().datetime({ offset: true }).optional().nullable(),
    delivery_window_end: z.string().datetime({ offset: true }).optional().nullable(),
    tolerance_pct: z.number().min(0).max(100).optional().nullable(),
    priority: z.number().int().min(1).max(10).optional().nullable(),
    source_type: z.string().trim().min(1).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.delivery_window_start && value.delivery_window_end) {
      const start = new Date(value.delivery_window_start).getTime();
      const end = new Date(value.delivery_window_end).getTime();
      if (start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'delivery_window_start must be before delivery_window_end',
          path: ['delivery_window_start'],
        });
      }
    }
  });

const updateDemandLineBodySchema = z
  .object({
    commodity_category: z.string().trim().min(1).max(100).optional(),
    product_category: z.string().trim().min(1).max(100).optional().nullable(),
    product_spec_summary: z.string().trim().min(1).max(2000).optional().nullable(),
    qty: z.number().positive('qty must be > 0').optional(),
    qty_unit: z.string().trim().min(1).max(50).optional(),
    quality_requirements_json: z.record(z.unknown()).optional().nullable(),
    certification_requirements_json: z.record(z.unknown()).optional().nullable(),
    packaging_requirements_json: z.record(z.unknown()).optional().nullable(),
    delivery_location: z.string().trim().min(1).max(500).optional().nullable(),
    delivery_window_start: z.string().datetime({ offset: true }).optional().nullable(),
    delivery_window_end: z.string().datetime({ offset: true }).optional().nullable(),
    tolerance_pct: z.number().min(0).max(100).optional().nullable(),
    priority: z.number().int().min(1).max(10).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.delivery_window_start && value.delivery_window_end) {
      const start = new Date(value.delivery_window_start).getTime();
      const end = new Date(value.delivery_window_end).getTime();
      if (start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'delivery_window_start must be before delivery_window_end',
          path: ['delivery_window_start'],
        });
      }
    }
  });

const listDemandLinesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.string().trim().min(1).max(50).optional(),
  commodity_category: z.string().trim().min(1).max(100).optional(),
  source_type: z.string().trim().min(1).max(50).optional(),
});

const lockDemandLinesBodySchema = z
  .object({
    captured_reason: z.string().max(1000, 'captured_reason max 1000 chars').nullable().optional(),
    expected_line_ids: z
      .array(z.string().uuid('expected_line_ids must contain valid UUIDs'))
      .min(1, 'expected_line_ids must not be empty if provided')
      .optional(),
  })
  .strict();

// ─── Validation Helpers ───────────────────────────────────────────────────────

type ParseResult<T> = z.SafeParseReturnType<unknown, T>;

function handleBodyValidation<T>(
  reply: Parameters<typeof sendValidationError>[0],
  parsed: ParseResult<T>,
): parsed is z.SafeParseSuccess<T> {
  if (parsed.success) return true;

  const hasUnknownKeys = parsed.error.errors.some(err => err.code === 'unrecognized_keys');
  if (hasUnknownKeys) {
    sendValidationError(reply, parsed.error.errors);
    return false;
  }

  const firstMessage = parsed.error.errors[0]?.message ?? 'Invalid input';
  sendError(reply, 'INVALID_INPUT', firstMessage, 400, parsed.error.errors);
  return false;
}

function handleQueryValidation<T>(
  reply: Parameters<typeof sendError>[0],
  parsed: ParseResult<T>,
): parsed is z.SafeParseSuccess<T> {
  if (parsed.success) return true;

  const firstMessage = parsed.error.errors[0]?.message ?? 'Invalid query parameters';
  sendError(reply, 'INVALID_INPUT', firstMessage, 400, parsed.error.errors);
  return false;
}

// ─── Error Mapper ────────────────────────────────────────────────────────────

function mapDemandLineServiceError(
  reply: Parameters<typeof sendError>[0],
  err: unknown,
): boolean {
  if (err instanceof DemandLineNotFoundError) {
    sendError(reply, 'DEMAND_LINE_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof DemandLinePoolNotFoundError) {
    sendError(reply, 'POOL_NOT_FOUND', err.message, 404);
    return true;
  }
  if (err instanceof DemandLineInvalidInputError) {
    sendError(reply, 'INVALID_INPUT', err.message, 400);
    return true;
  }
  if (err instanceof DemandLineInvalidStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof DemandLinePoolStateError) {
    sendError(reply, 'INVALID_STATE', err.message, 422);
    return true;
  }
  if (err instanceof DemandLineDuplicateRefError) {
    sendError(reply, 'DUPLICATE_LINE_REF', err.message, 409);
    return true;
  }
  if (err instanceof DemandLineSnapshotBlockedError) {
    sendError(reply, 'DEMAND_SNAPSHOT_NOT_READY', err.message, 422);
    return true;
  }
  if (err instanceof DemandLineNoActiveLinesError) {
    sendError(reply, 'NO_ACTIVE_DEMAND_LINES', err.message, 422);
    return true;
  }
  if (err instanceof DemandLineSetChangedError) {
    sendError(reply, 'DEMAND_LINE_SET_CHANGED', err.message, 409);
    return true;
  }
  if (err instanceof DemandLineSnapshotConflictError) {
    sendError(reply, 'SNAPSHOT_CONFLICT', err.message, 409);
    return true;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    sendError(reply, 'DUPLICATE_LINE_REF', 'A demand line with this reference already exists in this pool', 409);
    return true;
  }

  return false;
}

// ─── Route Plugin ────────────────────────────────────────────────────────────

const poolDemandLineRoutes: FastifyPluginAsync = async fastify => {
  // GET /:poolId/demand-lines — list demand lines
  fastify.get(
    '/:poolId/demand-lines',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      const paramResult = poolParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const queryResult = listDemandLinesQuerySchema.safeParse(request.query);
      if (!handleQueryValidation(reply, queryResult)) return;

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolDemandLineService(prisma);
        const result = await svc.listDemandLines(orgId, poolId, queryResult.data);
        return sendSuccess(reply, result, 200);
      } catch (err) {
        if (mapDemandLineServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.demand-lines.list');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list demand lines', 500);
      }
    },
  );

  // POST /:poolId/demand-lines — create demand line
  fastify.post(
    '/:poolId/demand-lines',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      if (await isOrgVerificationBlocked(dbContext.orgId, reply)) return;

      const paramResult = poolParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = createDemandLineBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;
      const userId = request.userId ?? '';

      try {
        const svc = new NetworkPoolDemandLineService(prisma);
        const record = await svc.createDemandLine(orgId, userId, {
          ...bodyResult.data,
          pool_id: poolId,
        });
        return sendSuccess(reply, record, 201);
      } catch (err) {
        if (mapDemandLineServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.demand-lines.create');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create demand line', 500);
      }
    },
  );

  // POST /:poolId/demand-lines/lock-for-rfq — lock active demand lines for RFQ issuance
  //
  // IMPORTANT: Registered BEFORE /:poolId/demand-lines/:lineId routes so the static
  // segment 'lock-for-rfq' is never shadowed by the dynamic :lineId param.
  // D-017-A: orgId and userId always from request.dbContext — never from body or params.
  // Role gate: OWNER + ADMIN only; MEMBER → 403.
  fastify.post(
    '/:poolId/demand-lines/lock-for-rfq',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      // Role gate: OWNER + ADMIN only; MEMBER → 403
      const userRole = (request.userRole ?? '').trim().toUpperCase();
      if (!userRole.includes('ADMIN') && userRole !== 'OWNER') {
        return sendError(reply, 'FORBIDDEN', 'Only pool owners and admins may lock demand lines for RFQ', 403);
      }

      if (await isOrgVerificationBlocked(dbContext.orgId, reply)) return;

      const paramResult = poolParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = lockDemandLinesBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { poolId } = paramResult.data;
      const orgId = dbContext.orgId;
      const userId = request.userId ?? null;

      try {
        const svc = new NetworkPoolDemandLineService(prisma);
        const result = await svc.lockDemandLinesForRfq(orgId, userId, {
          pool_id: poolId,
          captured_reason: bodyResult.data.captured_reason,
          expected_line_ids: bodyResult.data.expected_line_ids,
        });
        return sendSuccess(reply, result, 201);
      } catch (err) {
        if (mapDemandLineServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.demand-lines.lock-for-rfq');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to lock demand lines for RFQ', 500);
      }
    },
  );

  // PATCH /:poolId/demand-lines/:lineId — update demand line (partial)
  fastify.patch(
    '/:poolId/demand-lines/:lineId',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      if (await isOrgVerificationBlocked(dbContext.orgId, reply)) return;

      const paramResult = poolAndLineParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = updateDemandLineBodySchema.safeParse(request.body);
      if (!handleBodyValidation(reply, bodyResult)) return;

      const { lineId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolDemandLineService(prisma);
        const record = await svc.updateDemandLine(orgId, lineId, bodyResult.data);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapDemandLineServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.demand-lines.update');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to update demand line', 500);
      }
    },
  );

  // POST /:poolId/demand-lines/:lineId/cancel — cancel demand line
  fastify.post(
    '/:poolId/demand-lines/:lineId/cancel',
    {
      onRequest: [tenantAuthMiddleware, databaseContextMiddleware],
      preHandler: [ncPoolFeatureGateMiddleware],
    },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

      if (await isOrgVerificationBlocked(dbContext.orgId, reply)) return;

      const paramResult = poolAndLineParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { lineId } = paramResult.data;
      const orgId = dbContext.orgId;

      try {
        const svc = new NetworkPoolDemandLineService(prisma);
        const record = await svc.cancelDemandLine(orgId, lineId);
        return sendSuccess(reply, record, 200);
      } catch (err) {
        if (mapDemandLineServiceError(reply, err)) return;
        request.log.error(err, 'network-commerce.demand-lines.cancel');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to cancel demand line', 500);
      }
    },
  );
};

export default poolDemandLineRoutes;
