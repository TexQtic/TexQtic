/**
 * G-017 Day 3 — Control Plane Trade Routes
 *
 * Fastify plugin — registered at /api/control/trades
 *
 * Routes:
 *   GET  /api/control/trades                   — cross-tenant trade list (admin)
 *   POST /api/control/trades/:id/transition    — admin-initiated lifecycle transition
 *
 * Constitutional compliance:
 *   D-017-A  tenantId for transitions is loaded from the trade row (never body)
 *   D-022-B  Freeze gate enforced by TradeService
 *   Audit written in SAME Prisma transaction as the trade mutation
 *
 * Auth: adminAuthMiddleware is registered as a global addHook in the parent
 *       control plugin (control.ts) — no per-route onRequest needed here.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog } from '../../lib/auditLog.js';
import { TradeService } from '../../services/trade.g017.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';
import {
  createTradeTransitionAppliedAudit,
  createTradeTransitionPendingAudit,
  createTradeTransitionRejectedAudit,
} from '../../utils/audit.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context
 * while allowing TradeService to call this.db.$transaction() internally.
 */
function makeTxBoundPrisma(tx: Prisma.TransactionClient): PrismaClient {
  return new Proxy(tx as unknown as PrismaClient, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

/**
 * Open a withDbContext scoped to a specific orgId with admin escalation flag set.
 * Mirrors the withAdminContext / withEscalationAdminContext pattern in control.ts.
 */
async function withTradeAdminContext<T>(
  orgId: string,
  adminId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId,
    actorId:   adminId,
    realm:     'control',
    requestId: randomUUID(),
  };

  return withDbContext(prisma, ctx, async tx => {
    // Set admin override so RLS _admin_all policies allow cross-tenant access.
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx);
  });
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  tenantId:  uuidSchema.optional(),
  status:    z.enum(['DRAFT', 'ACTIVE', 'SETTLED', 'DISPUTED', 'CANCELLED']).optional(),
  limit:     z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:    z.coerce.number().int().min(0).optional().default(0),
});

const transitionBodySchema = z.object({
  /** Target org for RLS context — admin provides explicitly (trade row is authoritative). */
  orgId:      uuidSchema,
  toStateKey: z.string().min(1).max(100).trim().toUpperCase(),
  reason:     z.string().min(1).max(2000).trim(),
  actorRole:  z.string().min(1).max(100).trim(),
  aiTriggered: z.boolean().optional().default(false),
});

const tradeIdParamSchema = z.object({ id: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlTradesRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/control/trades ────────────────────────────────────────────
  /**
   * List trades across all tenants (admin, cross-org read).
   * Optional? tenantId filter in query.
   * Uses admin context so RLS _admin_all policy allows cross-org SELECT.
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
        // Use admin sentinel orgId for the RLS context (admin all-access policy).
        const rows = await withTradeAdminContext(
          query.tenantId ?? ADMIN_SENTINEL_ID,
          adminId,
          async tx => {
            const db = tx as unknown as PrismaClient;
            return db.trade.findMany({
              where: {
                ...(query.tenantId ? { tenantId: query.tenantId } : {}),
              },
              include: { lifecycleState: true },
              orderBy: { createdAt: 'desc' },
              take:    query.limit,
              skip:    query.offset,
            });
          },
        );

        return sendSuccess(reply, { trades: rows, count: rows.length });
      } catch (err) {
        fastify.log.error({ err }, '[G-017] GET /control/trades error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list trades', 500);
      }
    },
  );

  // ─── POST /api/control/trades/:id/transition ─────────────────────────────
  /**
   * Admin-initiated lifecycle transition.
   * tenantId (orgId) MUST be provided in the body so RLS context is set correctly;
   * the service still loads the trade to verify ownership before acting.
   * Audit written atomically in the same transaction as the trade UPDATE.
   */
  fastify.post(
    '/:id/transition',
    async (request, reply) => {
      const adminId = request.adminId ?? ADMIN_SENTINEL_ID;

      const paramResult = tradeIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { id: tradeId } = paramResult.data;

      const bodyResult = transitionBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withTradeAdminContext(body.orgId, adminId, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const sanctionsSvc  = new SanctionsService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc, sanctionsSvc);
          // G-021 Fix A2: inject MC so TradeService creates pending_approvals on PENDING_APPROVAL
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const tradeSvc      = new TradeService(txBound, smSvc, escalationSvc, mcSvc, sanctionsSvc);

          const transResult = await tradeSvc.transitionTrade({
            tradeId,
            tenantId:     body.orgId,   // D-017-A: admin supplies explicitly; service re-validates
            toStateKey:   body.toStateKey,
            actorType:    'PLATFORM_ADMIN' as const,
            actorAdminId: adminId,
            actorRole:    body.actorRole,
            reason:       body.reason,
            aiTriggered:  body.aiTriggered,
          });

          // Audit in SAME transaction
          if (transResult.status === 'APPLIED') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createTradeTransitionAppliedAudit({
                realm:        'ADMIN',
                tenantId:     body.orgId,
                actorType:    'ADMIN',
                actorId:      adminId,
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
                realm:          'ADMIN',
                tenantId:       body.orgId,
                actorType:      'ADMIN',
                actorId:        adminId,
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
                realm:        'ADMIN',
                tenantId:     body.orgId,
                actorType:    'ADMIN',
                actorId:      adminId,
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
            result.code === 'NOT_FOUND'              ? 404
            : result.code === 'FROZEN_BY_ESCALATION' ? 423
            : result.code === 'UNAUTHORIZED'         ? 401
            : result.code === 'FORBIDDEN'            ? 403
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
          approvalId:     result.approvalId ?? null,
        }, 202);
      } catch (err) {
        fastify.log.error({ err }, '[G-017] POST /control/trades/:id/transition error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition trade', 500);
      }
    },
  );
};

export default controlTradesRoutes;
