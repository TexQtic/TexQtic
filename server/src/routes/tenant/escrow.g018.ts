/**
 * G-018 Day 3 — Tenant Plane Escrow Routes
 *
 * Fastify plugin — registered at /api/tenant/escrows
 *
 * Routes:
 *   POST /api/tenant/escrows                              — create escrow account
 *   POST /api/tenant/escrows/:escrowId/transactions       — record ledger entry
 *   POST /api/tenant/escrows/:escrowId/transition         — lifecycle transition
 *   GET  /api/tenant/escrows                              — list escrow accounts
 *   GET  /api/tenant/escrows/:escrowId                    — get escrow account detail
 *
 * Constitutional compliance:
 *   D-017-A  tenantId ALWAYS derived from JWT/dbContext — NEVER from request body
 *   D-020-B  No balance column written; balance derived from ledger (SUM)
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason (escrow-strict)
 *   D-022-B  Freeze gate enforced by EscrowService.transitionEscrow()
 *   G-021    Maker-Checker integration via MakerCheckerService
 *   Audit written in SAME Prisma transaction as mutation (atomic)
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
import { EscrowService } from '../../services/escrow.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import {
  createEscrowCreatedAudit,
  createEscrowLedgerEntryRecordedAudit,
  createEscrowTransitionAppliedAudit,
  createEscrowTransitionPendingAudit,
  createEscrowTransitionRejectedAudit,
} from '../../utils/audit.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context
 * while allowing EscrowService to call this.db.$transaction() internally.
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

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createEscrowBodySchema = z.object({
  currency:        z.string().length(3, 'Currency must be an ISO 4217 3-letter code').toUpperCase(),
  reason:          z.string().min(1).max(2000).trim(),
  createdByUserId: uuidSchema.optional().nullable(),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:        z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const recordTransactionBodySchema = z.object({
  entryType:       z.enum(['HOLD', 'RELEASE', 'REFUND', 'ADJUSTMENT']),
  direction:       z.enum(['CREDIT', 'DEBIT']),
  amount:          z.number().positive('amount must be a positive number'),
  currency:        z.string().length(3, 'Currency must be an ISO 4217 3-letter code').toUpperCase(),
  reason:          z.string().min(1).max(2000).trim(),
  referenceId:     z.string().max(500).trim().optional().nullable(),
  metadata:        z.record(z.unknown()).optional().default({}),
  createdByUserId: uuidSchema.optional().nullable(),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:        z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const transitionEscrowBodySchema = z.object({
  toStateKey:  z.string().min(1).max(100).trim().toUpperCase(),
  reason:      z.string().min(1).max(2000).trim(),
  actorRole:   z.string().min(1).max(100).trim(),
  aiTriggered: z.boolean().optional().default(false),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId:    z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const listQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const escrowIdParamSchema = z.object({ escrowId: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantEscrowRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/tenant/escrows ────────────────────────────────────────────
  /**
   * Create an escrow account in DRAFT lifecycle state.
   * tenantId derived exclusively from JWT (dbContext.orgId).
   * Audit written atomically in the same Prisma transaction.
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

      const bodyResult = createEscrowBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, mcSvc);

          const createResult = await escrowSvc.createEscrowAccount({
            tenantId:        dbContext.orgId,   // D-017-A: from JWT only
            currency:        body.currency,
            reason:          body.reason,
            createdByUserId: body.createdByUserId ?? userId,
          });

          if (createResult.status !== 'CREATED') {
            return createResult;
          }

          // Audit in SAME transaction as escrow INSERT
          await writeAuditLog(
            tx as unknown as PrismaClient,
            createEscrowCreatedAudit({
              realm:     'TENANT',
              tenantId:  dbContext.orgId,
              actorType: 'USER',
              actorId:   userId,
              escrowId:  createResult.escrowId,
              currency:  body.currency,
              reason:    body.reason,
            }),
          );

          return createResult;
        });

        if (result.status !== 'CREATED') {
          const errResult = result as Extract<typeof result, { status: 'ERROR' }>;
          const statusCode = errResult.code === 'DB_ERROR' ? 422 : 422;
          return sendError(reply, errResult.code, errResult.message, statusCode);
        }

        return sendSuccess(reply, { escrowId: result.escrowId }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-018] POST /tenant/escrows error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to create escrow account', 500);
      }
    },
  );

  // ─── POST /api/tenant/escrows/:escrowId/transactions ────────────────────
  /**
   * Record an append-only ledger entry (CREDIT or DEBIT) for an escrow account.
   * D-020-B: amount is stored; balance is NEVER stored — derived on demand.
   * P0005 DB trigger is Layer 2 immutability backstop.
   */
  fastify.post(
    '/:escrowId/transactions',
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

      const paramResult = escrowIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { escrowId } = paramResult.data;

      const bodyResult = recordTransactionBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, mcSvc);

          const txResult = await escrowSvc.recordTransaction({
            tenantId:        dbContext.orgId,   // D-017-A: from JWT only
            escrowId,
            entryType:       body.entryType,
            direction:       body.direction,
            amount:          body.amount,
            currency:        body.currency,
            referenceId:     body.referenceId ?? null,
            metadata:        body.metadata as Record<string, unknown>,
            createdByUserId: body.createdByUserId ?? userId,
          });

          if (txResult.status !== 'RECORDED') {
            return txResult;
          }

          // Audit in SAME transaction as ledger INSERT
          await writeAuditLog(
            tx as unknown as PrismaClient,
            createEscrowLedgerEntryRecordedAudit({
              realm:         'TENANT',
              tenantId:      dbContext.orgId,
              actorType:     'USER',
              actorId:       userId,
              escrowId,
              transactionId: txResult.transactionId,
              direction:     body.direction,
              entryType:     body.entryType,
              amount:        String(body.amount),
              reason:        body.reason,
            }),
          );

          return txResult;
        });

        if (result.status === 'DUPLICATE_REFERENCE') {
          return sendSuccess(reply, {
            status:        result.status,
            transactionId: result.existingTransactionId,
          }, 200);
        }

        if (result.status !== 'RECORDED') {
          const errResult = result as Extract<typeof result, { status: 'ERROR' }>;
          const statusCode =
            errResult.code === 'ESCROW_NOT_FOUND' ? 404
            : errResult.code === 'ENTITY_FROZEN'  ? 423
            : 422;
          return sendError(reply, errResult.code, errResult.message, statusCode);
        }

        return sendSuccess(reply, { transactionId: result.transactionId }, 201);
      } catch (err) {
        fastify.log.error({ err }, '[G-018] POST /tenant/escrows/:escrowId/transactions error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to record escrow transaction', 500);
      }
    },
  );

  // ─── POST /api/tenant/escrows/:escrowId/transition ───────────────────────
  /**
   * Lifecycle transition for an escrow account.
   * D-022-B: Freeze gate enforced by EscrowService.transitionEscrow().
   * D-020-C: aiTriggered=true requires "HUMAN_CONFIRMED:" prefix (escrow-strict).
   * ENTITY_FROZEN → 423, APPLIED → 200, PENDING_APPROVAL → 202.
   */
  fastify.post(
    '/:escrowId/transition',
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

      const paramResult = escrowIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { escrowId } = paramResult.data;

      const bodyResult = transitionEscrowBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, mcSvc);

          const transResult = await escrowSvc.transitionEscrow({
            escrowId,
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
              createEscrowTransitionAppliedAudit({
                realm:        'TENANT',
                tenantId:     dbContext.orgId,
                actorType:    'USER',
                actorId:      userId,
                escrowId,
                fromStateKey: transResult.fromStateKey,
                toStateKey:   transResult.toStateKey,
                transitionId: transResult.transitionId ?? null,
                reason:       body.reason,
              }),
            );
          } else if (transResult.status === 'PENDING_APPROVAL') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createEscrowTransitionPendingAudit({
                realm:          'TENANT',
                tenantId:       dbContext.orgId,
                actorType:      'USER',
                actorId:        userId,
                escrowId,
                fromStateKey:   transResult.fromStateKey,
                toStateKey:     body.toStateKey,
                requiredActors: transResult.requiredActors ?? [],
                reason:         body.reason,
              }),
            );
          } else if (transResult.status === 'ERROR') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createEscrowTransitionRejectedAudit({
                realm:        'TENANT',
                tenantId:     dbContext.orgId,
                actorType:    'USER',
                actorId:      userId,
                escrowId,
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
            result.code === 'ESCROW_NOT_FOUND' ? 404
            : result.code === 'ENTITY_FROZEN'  ? 423
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
        fastify.log.error({ err }, '[G-018] POST /tenant/escrows/:escrowId/transition error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition escrow', 500);
      }
    },
  );

  // ─── GET /api/tenant/escrows ─────────────────────────────────────────────
  /**
   * List escrow accounts for the authenticated tenant.
   * D-017-A: tenantId derived from JWT only — no cross-tenant access.
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
      const { limit, offset } = queryResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc);

          return escrowSvc.listEscrowAccounts({
            tenantId: dbContext.orgId,
            limit,
            offset,
          });
        });

        if (result.status !== 'OK') {
          const statusCode = result.code === 'DB_ERROR' ? 422 : 422;
          return sendError(reply, result.code, result.message, statusCode);
        }

        return sendSuccess(reply, {
          escrows: result.escrows,
          count:   result.count,
          limit,
          offset,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-018] GET /tenant/escrows error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list escrow accounts', 500);
      }
    },
  );

  // ─── GET /api/tenant/escrows/:escrowId ───────────────────────────────────
  /**
   * Get escrow account detail (including last 20 transactions + derived balance).
   * D-020-B: balance is computed via SUM — never stored.
   * D-017-A: tenantId derived from JWT — enforces tenant isolation at DB level.
   */
  fastify.get(
    '/:escrowId',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const paramResult = escrowIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { escrowId } = paramResult.data;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc);

          return escrowSvc.getEscrowAccountDetail(escrowId, dbContext.orgId);
        });

        if (result.status !== 'OK') {
          const statusCode = result.code === 'ESCROW_NOT_FOUND' ? 404 : 422;
          return sendError(reply, result.code, result.message, statusCode);
        }

        return sendSuccess(reply, {
          escrow:             result.escrow,
          balance:            result.balance,
          recentTransactions: result.recentTransactions,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-018] GET /tenant/escrows/:escrowId error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to load escrow account', 500);
      }
    },
  );
};

export default tenantEscrowRoutes;
