/**
 * G-017 Day 3 — Tenant Plane Trade Routes
 *
 * Fastify plugin — registered at /api/tenant/trades
 *
 * Routes:
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

const transitionTradeBodySchema = z.object({
  toStateKey:  z.string().min(1).max(100).trim().toUpperCase(),
  reason:      z.string().min(1).max(2000).trim(),
  actorRole:   z.string().min(1).max(100).trim(),
  aiTriggered: z.boolean().optional().default(false),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:    z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const tradeIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantTradesRoutes: FastifyPluginAsync = async fastify => {

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
          const txBound         = makeTxBoundPrisma(tx);
          const escalationSvc   = new EscalationService(txBound);
          const smSvc           = new StateMachineService(txBound, escalationSvc);
          const tradeSvc        = new TradeService(txBound, smSvc, escalationSvc);

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
          const errResult = result as Extract<typeof result, { status: 'ERROR' }>;
          const statusCode =
            errResult.code === 'UNAUTHORIZED' ? 401
            : errResult.code === 'FORBIDDEN'  ? 403
            : 422;
          return sendError(reply, errResult.code, errResult.message, statusCode);
        }

        return sendSuccess(reply, { tradeId: result.tradeId, tradeReference: result.tradeReference }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create trade', 500);
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
          const smSvc           = new StateMachineService(txBound, escalationSvc);
          const tradeSvc        = new TradeService(txBound, smSvc, escalationSvc);

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
          const statusCode =
            result.code === 'UNAUTHORIZED'        ? 401
            : result.code === 'FORBIDDEN'         ? 403
            : result.code === 'NOT_FOUND'         ? 404
            : result.code === 'FROZEN_BY_ESCALATION' ? 423
            : 422;
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
        }, 202);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /tenant/trades/:id/transition error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition trade', 500);
      }
    },
  );
};

export default tenantTradesRoutes;
