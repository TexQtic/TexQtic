/**
 * Tenant Plane Settlement Routes
 * (formerly labeled G-019 Day 2 — label misuse corrected per GOVERNANCE-SYNC-003)
 *
 * Fastify plugin — registered at /api/tenant/settlements
 *
 * Routes:
 *   POST /api/tenant/settlements/preview  — read-only balance preview; no writes
 *   POST /api/tenant/settlements          — execute full settlement pipeline
 *
 * Constitutional compliance:
 *   D-017-A  tenantId ALWAYS derived from JWT/dbContext — NEVER from request body (z.never())
 *   D-020-B  Balance derived from ledger SUM; never stored on any column
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason
 *   D-022    Audit written inside SettlementService in SAME Prisma tx as all mutations
 *   G-021    Maker-Checker pre-check inside SettlementService (Step 6)
 *
 * Toggles locked (Day 1 frozen):
 *   TOGGLE_A = A1  SETTLEMENT_ACKNOWLEDGED / CLOSED (trade); RELEASED (escrow)
 *   TOGGLE_B = B1  Ledger-only; entryType=RELEASE, direction=DEBIT
 *   TOGGLE_C = C3  Both gates: DISPUTED semantic + escalation freeze
 *
 * HTTP status mapping:
 *   APPLIED              → 200
 *   PENDING_APPROVAL     → 202
 *   TRADE_NOT_FOUND /
 *   ESCROW_NOT_FOUND     → 404
 *   ENTITY_FROZEN        → 423
 *   TRADE_DISPUTED /
 *   INSUFFICIENT_ESCROW_FUNDS /
 *   DUPLICATE_REFERENCE /
 *   STATE_MACHINE_DENIED → 409
 *   AI_HUMAN_CONFIRMATION_REQUIRED /
 *   INVALID_AMOUNT /
 *   DB_ERROR (input)     → 400
 *   DB_ERROR (internal)  → 500
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
import { TradeService } from '../../services/trade.g017.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import {
  SettlementService,
  type WriteAuditLogFn,
} from '../../services/settlement/settlement.service.js';

function deriveTenantSettlementActorType(userRole: string | null | undefined): 'TENANT_USER' | 'TENANT_ADMIN' {
  if (userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'TENANT_OWNER' || userRole === 'TENANT_ADMIN') {
    return 'TENANT_ADMIN';
  }

  return 'TENANT_USER';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Proxy that wraps a TransactionClient so that calls to .$transaction(cb)
 * execute cb(tx) within the current open transaction, preserving RLS context.
 * Required because sub-services call this.db.$transaction() internally.
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

const previewBodySchema = z.object({
  tradeId:  uuidSchema,
  escrowId: uuidSchema,
  amount:   z.number().positive('amount must be a positive number'),
  currency: z.string().min(1, 'currency is required').max(10).trim(),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId: z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

const settleBodySchema = z.object({
  tradeId:     uuidSchema,
  escrowId:    uuidSchema,
  amount:      z.number().positive('amount must be a positive number'),
  currency:    z.string().min(1, 'currency is required').max(10).trim(),
  referenceId: z.string().min(1, 'referenceId is required').max(500).trim(),
  reason:      z.string().min(1, 'reason is required').max(2000).trim(),
  aiTriggered: z.boolean().optional().default(false),
  actorType: z.never({ message: 'actorType is derived server-side and must not be set in request body' }).optional(),
  actorRole: z.never({ message: 'actorRole is derived server-side and must not be set in request body' }).optional(),
  // D-017-A: tenantId MUST NOT be accepted from the body
  tenantId: z.never({ message: 'tenantId must not be set in request body' }).optional(),
});

// ─── HTTP error code → status helper ─────────────────────────────────────────

function settlementErrorToStatus(code: string): number {
  switch (code) {
    case 'TRADE_NOT_FOUND':
    case 'ESCROW_NOT_FOUND':
      return 404;
    case 'ENTITY_FROZEN':
      return 423;
    case 'TRADE_DISPUTED':
    case 'TRADE_ESCROW_MISMATCH':
    case 'INSUFFICIENT_ESCROW_FUNDS':
    case 'DUPLICATE_REFERENCE':
    case 'STATE_MACHINE_DENIED':
    case 'MAKER_CHECKER_REQUIRED':
      return 409;
    case 'AI_HUMAN_CONFIRMATION_REQUIRED':
    case 'INVALID_AMOUNT':
      return 400;
    case 'DB_ERROR':
      return 500;
    default:
      return 500;
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const tenantSettlementRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/tenant/settlements/preview ────────────────────────────────
  /**
   * Read-only preview: compute projected escrow balance after a hypothetical
   * settlement debit. NO ledger inserts; NO state machine calls.
   *
   * D-020-B: balance is always derived from ledger SUM — never stored.
   * D-017-A: tenantId derived from JWT only; rejected from body via z.never().
   */
  fastify.post(
    '/preview',
    { onRequest: [tenantAuthMiddleware, databaseContextMiddleware] },
    async (request, reply) => {
      const dbContext = request.dbContext;
      if (!dbContext) {
        return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
      }

      const bodyResult = previewBodySchema.safeParse(request.body);
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
          const tradeSvc      = new TradeService(txBound, smSvc, escalationSvc);
          const boundAudit: WriteAuditLogFn = (db, entry) => writeAuditLog(db, entry);
          const settlementSvc = new SettlementService(
            txBound, tradeSvc, escrowSvc, escalationSvc, boundAudit,
          );

          return settlementSvc.previewSettlement({
            tradeId:  body.tradeId,
            escrowId: body.escrowId,
            tenantId: dbContext.orgId,    // D-017-A: from JWT only
            amount:   body.amount,
            currency: body.currency,
          });
        });

        if (result.status !== 'OK') {
          const httpStatus = settlementErrorToStatus(result.code);
          return sendError(reply, result.code, result.message, httpStatus);
        }

        return sendSuccess(reply, {
          status:           result.status,
          currentBalance:   result.currentBalance,
          projectedBalance: result.projectedBalance,
          wouldSucceed:     result.wouldSucceed,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-019] POST /tenant/settlements/preview error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to preview settlement', 500);
      }
    },
  );

  // ─── POST /api/tenant/settlements ────────────────────────────────────────
  /**
   * Execute the full settlement pipeline (10-step orchestration):
   *   1. Input validation
   *   2. Load trade + escrow
   *   3–4. Freeze + dispute gates [TOGGLE_C=C3]
   *   5. AI boundary [D-020-C]
   *   6. Maker-Checker pre-check [G-021]
   *   7. Balance sufficiency [TOGGLE_B=B1, D-020-B]
   *   8. Ledger insert RELEASE DEBIT [TOGGLE_B=B1]
   *   9. Lifecycle transitions (Trade→SETTLEMENT_ACKNOWLEDGED→CLOSED; Escrow→RELEASED) [TOGGLE_A=A1]
   *   10. Audit emission (SETTLEMENT_APPLIED / SETTLEMENT_PENDING_APPROVAL) [D-022]
   *
   * ALL work executes inside ONE withDbContext Postgres transaction.
   * SettlementService.settleTrade() must NOT open its own $transaction.
   *
   * D-017-A: tenantId NEVER from request body — z.never() enforces this at deserialization.
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

      const bodyResult = settleBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;
      const actorType = deriveTenantSettlementActorType(request.userRole);
      const actorRole = request.userRole ?? actorType;

      try {
        const result = await withDbContext(prisma, dbContext, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc);
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, mcSvc);
          const tradeSvc      = new TradeService(txBound, smSvc, escalationSvc);
          // writeAuditLog is injected so it is called inside the service within
          // the SAME Prisma tx, guaranteeing atomicity (Step 10, D-022).
          const boundAudit: WriteAuditLogFn = (db, entry) => writeAuditLog(db, entry);
          const settlementSvc = new SettlementService(
            txBound, tradeSvc, escrowSvc, escalationSvc, boundAudit,
          );

          return settlementSvc.settleTrade({
            tradeId:     body.tradeId,
            escrowId:    body.escrowId,
            tenantId:    dbContext.orgId,    // D-017-A: from JWT only
            amount:      body.amount,
            currency:    body.currency,
            referenceId: body.referenceId,
            reason:      body.reason,
            aiTriggered: body.aiTriggered,
            actorType,
            actorUserId: userId,
            actorRole,
          });
        });

        // ── APPLIED ─────────────────────────────────────────────────────────
        if (result.status === 'APPLIED') {
          return sendSuccess(reply, {
            status:         result.status,
            transactionId:  result.transactionId,
            escrowReleased: result.escrowReleased,
            tradeClosed:    result.tradeClosed,
          }, 200);
        }

        // ── PENDING_APPROVAL ─────────────────────────────────────────────────
        if (result.status === 'PENDING_APPROVAL') {
          return reply.code(202).send({
            success: true,
            data: {
              status:         result.status,
              requiredActors: result.requiredActors,
            },
          });
        }

        // ── ERROR ────────────────────────────────────────────────────────────
        const httpStatus = settlementErrorToStatus(result.code);
        return sendError(reply, result.code, result.message, httpStatus);
      } catch (err) {
        fastify.log.error({ err }, '[G-019] POST /tenant/settlements error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to execute settlement', 500);
      }
    },
  );
};

export default tenantSettlementRoutes;
