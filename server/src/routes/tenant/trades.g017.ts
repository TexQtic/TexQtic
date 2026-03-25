/**
 * G-017 Day 3 — Tenant Plane Trade Routes
 *
 * Fastify plugin — registered at /api/tenant/trades
 *
 * Routes:
 *   GET  /api/tenant/trades                      — list trades for authenticated org (RLS-scoped)
 *   POST /api/tenant/trades                     — create a trade in DRAFT state
 *   POST /api/tenant/trades/:id/transition       — lifecycle transition
 *
 * Constitutional compliance:
 *   D-017-A  tenantId is ALWAYS derived from JWT/dbContext — NEVER from request body
 *   D-022-B  Entity freeze gate enforced by TradeService.transitionTrade()
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason
 *   Audit written in SAME Prisma transaction as the trade mutation (atomic)
 *
 * Proxy pattern (makeTxBoundPrisma):
 *   TradeService internally calls this.db.$transaction() which does not exist on
 *   a Prisma.TransactionClient. The proxy below intercepts $transaction calls and
 *   redirects them to execute within the already-open withDbContext transaction,
 *   preserving RLS context and atomicity.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { tenantAuthMiddleware } from '../../middleware/auth.js';
import { databaseContextMiddleware } from '../../middleware/database-context.middleware.js';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { TradeService } from '../../services/trade.g017.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';
import {
  createTradeCreatedAudit,
  createTradeTransitionAppliedAudit,
  createTradeTransitionPendingAudit,
  createTradeTransitionRejectedAudit,
} from '../../utils/audit.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction rather than opening a
 * nested one (which Prisma does not support on TransactionClient).
 *
 * This allows TradeService — which internally calls this.db.$transaction() —
 * to be safely instantiated inside a withDbContext callback.
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        // Redirect: execute the callback immediately in the current tx.
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

function buildTradeService(tx: Prisma.TransactionClient): TradeService {
  const txBound = makeTxBoundPrisma(tx);
  const escalationSvc = new EscalationService(txBound);
  const sanctionsSvc = new SanctionsService(txBound);
  const smSvc = new StateMachineService(txBound, escalationSvc, sanctionsSvc);

  return new TradeService(txBound, smSvc, escalationSvc, undefined, sanctionsSvc);
}

function getTradeCreateErrorStatusCode(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'FROZEN_BY_ESCALATION':
      return 423;
    case 'RFQ_ALREADY_CONVERTED':
    case 'ESCROW_ALREADY_LINKED':
      return 409;
    default:
      return 422;
  }
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createTradeBodySchema = z.object({
  buyerOrgId:      uuidSchema,
  sellerOrgId:     uuidSchema,
  tradeReference:  z.string().min(1).max(200).trim(),
  currency:        z.string().length(3, 'Currency must be an ISO 4217 3-letter code').toUpperCase(),
  grossAmount:     z.number().positive('grossAmount must be > 0'),
  reason:          z.string().min(1).max(2000).trim(),
  reasoningLogId:  uuidSchema.optional().nullable(),
  createdByUserId: uuidSchema.optional().nullable(),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:        z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const createTradeFromRfqBodySchema = z.object({
  rfqId:           uuidSchema,
  tradeReference:  z.string().min(1).max(200).trim(),
  currency:        z.string().length(3, 'Currency must be an ISO 4217 3-letter code').toUpperCase(),
  grossAmount:     z.number().positive('grossAmount must be > 0'),
  reason:          z.string().min(1).max(2000).trim(),
  reasoningLogId:  uuidSchema.optional().nullable(),
  createdByUserId: uuidSchema.optional().nullable(),
  buyerOrgId:      z.never({ message: 'buyerOrgId must not be set in RFQ-derived trade creation body' }).optional(),
  sellerOrgId:     z.never({ message: 'sellerOrgId must not be set in RFQ-derived trade creation body' }).optional(),
  tenantId:        z.never({ message: 'tenantId must not be set in request body' }).optional(),
}).strict();

const createTradeEscrowBodySchema = z.object({
  reason:          z.string().min(1).max(2000).trim(),
  createdByUserId: uuidSchema.optional().nullable(),
  tenantId:        z.never({ message: 'tenantId must not be set in request body' }).optional(),
  currency:        z.never({ message: 'currency is derived from the trade and must not be set in request body' }).optional(),
  tradeId:         z.never({ message: 'tradeId is derived from the route path and must not be set in request body' }).optional(),
}).strict();

const transitionTradeBodySchema = z.object({
  toStateKey:  z.string().min(1).max(100).trim().toUpperCase(),
  reason:      z.string().min(1).max(2000).trim(),
  actorRole:   z.string().min(1).max(100).trim(),
  aiTriggered: z.boolean().optional().default(false),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:    z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const tradeIdParamSchema = z.object({ id: uuidSchema });

const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'SETTLED', 'DISPUTED', 'CANCELLED']).optional(),
  limit:  z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantTradesRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/tenant/trades ──────────────────────────────────────────────
  /**
   * List trades for the authenticated tenant's org.
   * org scope is derived exclusively from the authenticated JWT (dbContext.orgId).
   * RLS via withDbContext enforces the tenant boundary at DB level — no cross-org
   * access is possible. No client-supplied org identifier is trusted.
   * TECS-FBW-002-B-BE-ROUTE-001 (resolves BLK-FBW-002-B-001).
   */
  fastify.get(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const queryResult = listQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }
      const query = queryResult.data;

      try {
        const rows = await withDbContext(prisma, dbContext, async tx => {
          // RLS enforces org_id boundary — app.org_id is set by withDbContext
          // to dbContext.orgId (JWT-derived). No explicit tenantId filter needed
          // beyond what RLS provides; adding it here is defence-in-depth.
          return (tx as unknown as PrismaClient).trade.findMany({
            where: {
              tenantId: dbContext.orgId,
              ...(query.status ? { lifecycleState: { stateKey: query.status } } : {}),
            },
            include: { lifecycleState: true },
            orderBy: { createdAt: 'desc' },
            take:    query.limit,
            skip:    query.offset,
          });
        });

        return sendSuccess(reply, { trades: rows, count: rows.length });
      } catch (err) {
        fastify.log.error({ err }, '[G-017] GET /tenant/trades error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list trades', 500);
      }
    },
  );

  // ─── POST /api/tenant/trades ─────────────────────────────────────────────
  /**
   * Create a trade in DRAFT state.
   * tenantId is derived exclusively from the authenticated JWT (dbContext.orgId).
   * Audit row emitted atomically in the same Prisma transaction as the trade INSERT.
   */
  fastify.post(
    '/',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const bodyResult = createTradeBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const tradeSvc = buildTradeService(tx);

          const createResult = await tradeSvc.createTrade({
            tenantId:        dbContext.orgId,   // D-017-A: from JWT only
            buyerOrgId:      body.buyerOrgId,
            sellerOrgId:     body.sellerOrgId,
            tradeReference:  body.tradeReference,
            currency:        body.currency,
            grossAmount:     body.grossAmount,
            reason:          body.reason,
            reasoningLogId:  body.reasoningLogId ?? null,
            createdByUserId: body.createdByUserId ?? userId,
          });

          if (createResult.status !== 'CREATED') {
            return createResult;
          }

          // Audit in SAME transaction as trade INSERT
          await writeAuditLog(
            tx as unknown as PrismaClient,
            createTradeCreatedAudit({
              realm:          'TENANT',
              tenantId:       dbContext.orgId,
              actorType:      'USER',
              actorId:        userId,
              tradeId:        createResult.tradeId,
              tradeReference: createResult.tradeReference,
              grossAmount:    body.grossAmount,
              currency:       body.currency,
              reason:         body.reason,
            }),
          );

          return createResult;
        });

        if (result.status !== 'CREATED') {
          return sendError(reply, result.code, result.message, getTradeCreateErrorStatusCode(result.code));
        }

        return sendSuccess(reply, { tradeId: result.tradeId, tradeReference: result.tradeReference }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create trade', 500);
      }
    },
  );

  // ─── POST /api/tenant/trades/from-rfq ────────────────────────────────────
  /**
   * Create a trade from a buyer-owned RFQ in RESPONDED state.
   * buyerOrgId/sellerOrgId are derived exclusively from the RFQ context.
   * tenant scope is derived exclusively from the authenticated JWT (dbContext.orgId).
   */
  fastify.post(
    '/from-rfq',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const bodyResult = createTradeFromRfqBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const tradeSvc = buildTradeService(tx);

          const createResult = await tradeSvc.createTradeFromRfq({
            tenantId:        dbContext.orgId,
            rfqId:           body.rfqId,
            tradeReference:  body.tradeReference,
            currency:        body.currency,
            grossAmount:     body.grossAmount,
            reason:          body.reason,
            reasoningLogId:  body.reasoningLogId ?? null,
            createdByUserId: body.createdByUserId ?? userId,
          });

          if (createResult.status !== 'CREATED') {
            return createResult;
          }

          await writeAuditLog(
            tx as unknown as PrismaClient,
            {
              realm: 'TENANT',
              tenantId: dbContext.orgId,
              actorType: 'USER',
              actorId: userId,
              action: 'TRADE_CREATED_FROM_RFQ',
              entity: 'trade',
              entityId: createResult.tradeId,
              metadataJson: {
                tradeId: createResult.tradeId,
                tradeReference: createResult.tradeReference,
                rfqId: createResult.rfqId,
                grossAmount: body.grossAmount,
                currency: body.currency,
                reason: body.reason,
              },
            },
          );

          return createResult;
        });

        if (result.status !== 'CREATED') {
          return sendError(reply, result.code, result.message, getTradeCreateErrorStatusCode(result.code));
        }

        return sendSuccess(reply, {
          tradeId: result.tradeId,
          tradeReference: result.tradeReference,
          rfqId: result.rfqId,
        }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades/from-rfq error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create trade from RFQ', 500);
      }
    },
  );

  // ─── POST /api/tenant/trades/:id/escrow ──────────────────────────────────
  /**
   * Creates a new escrow account derived from an existing tenant trade and
   * links the resulting escrow to trades.escrow_id atomically.
   */
  fastify.post(
    '/:id/escrow',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id: tradeId } = paramResult.data;

      const bodyResult = createTradeEscrowBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const tradeSvc = buildTradeService(tx);

          const createResult = await tradeSvc.createEscrowForTrade({
            tradeId,
            tenantId: dbContext.orgId,
            reason: body.reason,
            createdByUserId: body.createdByUserId ?? userId,
          });

          if (createResult.status !== 'CREATED') {
            return createResult;
          }

          await writeAuditLog(
            tx as unknown as PrismaClient,
            {
              realm: 'TENANT',
              tenantId: dbContext.orgId,
              actorType: 'USER',
              actorId: userId,
              action: 'TRADE_ESCROW_LINKED',
              entity: 'trade',
              entityId: tradeId,
              metadataJson: {
                tradeId,
                escrowId: createResult.escrowId,
                currency: createResult.currency,
                reason: body.reason,
              },
            },
          );

          return createResult;
        });

        if (result.status !== 'CREATED') {
          return sendError(reply, result.code, result.message, getTradeCreateErrorStatusCode(result.code));
        }

        return sendSuccess(reply, {
          tradeId: result.tradeId,
          escrowId: result.escrowId,
          currency: result.currency,
        }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades/:id/escrow error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create trade escrow continuity', 500);
      }
    },
  );

  // ─── POST /api/tenant/trades/:id/transition ──────────────────────────────
  /**
   * Lifecycle transition for a trade.
   * tenantId is derived exclusively from the authenticated JWT (dbContext.orgId).
   * Audit row emitted atomically in the same Prisma tx as the trade UPDATE.
   */
  fastify.post(
    '/:id/transition',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const { userId } = request;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User ID missing', 401);
      }

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id: tradeId } = paramResult.data;

      const bodyResult = transitionTradeBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound         = makeTxBoundPrisma(tx);
          const escalationSvc   = new EscalationService(txBound);
          const sanctionsSvc    = new SanctionsService(txBound);
          const smSvc           = new StateMachineService(txBound, escalationSvc, sanctionsSvc);
          // G-021 Fix A2: inject MC so TradeService creates pending_approvals on PENDING_APPROVAL
          const mcSvc           = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const tradeSvc        = new TradeService(txBound, smSvc, escalationSvc, mcSvc, sanctionsSvc);

          const transResult = await tradeSvc.transitionTrade({
            tradeId,
            tenantId:    dbContext.orgId,   // D-017-A: from JWT only
            toStateKey:  body.toStateKey,
            actorType:   'TENANT_ADMIN' as const,
            actorUserId: userId,
            actorRole:   body.actorRole,
            reason:      body.reason,
            aiTriggered: body.aiTriggered,
          });

          // Emit typed audit based on outcome
          if (transResult.status === 'APPLIED') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createTradeTransitionAppliedAudit({
                realm:        'TENANT',
                tenantId:     dbContext.orgId,
                actorType:    'USER',
                actorId:      userId,
                tradeId,
                fromStateKey: transResult.fromStateKey,
                toStateKey:   transResult.toStateKey,
                transitionId: transResult.transitionId ?? undefined,
                reason:       body.reason,
              }),
            );
          } else if (transResult.status === 'PENDING_APPROVAL') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createTradeTransitionPendingAudit({
                realm:          'TENANT',
                tenantId:       dbContext.orgId,
                actorType:      'USER',
                actorId:        userId,
                tradeId,
                fromStateKey:   transResult.fromStateKey,
                toStateKey:     body.toStateKey,
                requiredActors: transResult.requiredActors ?? [],
                reason:         body.reason,
              }),
            );
          } else if (transResult.status === 'ERROR') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createTradeTransitionRejectedAudit({
                realm:        'TENANT',
                tenantId:     dbContext.orgId,
                actorType:    'USER',
                actorId:      userId,
                tradeId,
                toStateKey:   body.toStateKey,
                errorCode:    transResult.code,
                errorMessage: transResult.message,
                reason:       body.reason,
              }),
            );
          }

          return transResult;
        });

        if (result.status === 'ERROR') {
          const statusCode = getTradeCreateErrorStatusCode(result.code);
          return sendError(reply, result.code, result.message, statusCode);
        }

        if (result.status === 'APPLIED') {
          return sendSuccess(reply, {
            status:       result.status,
            fromStateKey: result.fromStateKey,
            toStateKey:   result.toStateKey,
            transitionId: result.transitionId ?? null,
          });
        }

        // PENDING_APPROVAL
        return sendSuccess(reply, {
          status:         result.status,
          fromStateKey:   result.fromStateKey,
          requiredActors: result.requiredActors ?? [],
          approvalId:     result.approvalId ?? null,
        }, 202);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades/:id/transition error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition trade', 500);
      }
    },
  );
};

export default tenantTradesRoutes;
