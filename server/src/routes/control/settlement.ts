/**
 * Control Plane Settlement Routes
 * (formerly labeled G-019 Day 2 — label misuse corrected per GOVERNANCE-SYNC-003)
 *
 * Fastify plugin — registered at /api/control/settlements
 *
 * Routes:
 *   POST /api/control/settlements/preview  — cross-tenant preview (admin)
 *   POST /api/control/settlements          — cross-tenant settlement execution (admin)
 *
 * Constitutional compliance:
 *   D-017-A  tenantId comes from request body (admin context explicitly names the target tenant)
 *            — control plane is an explicit exception; tenantId identifies which org to act on
 *   D-020-B  Balance derived from ledger SUM; never stored
 *   D-020-C  aiTriggered=true requires "HUMAN_CONFIRMED:" prefix in reason
 *   D-022    Audit written inside SettlementService in SAME Prisma tx as mutations
 *   G-021    Maker-Checker pre-check inside SettlementService (Step 6)
 *
 * Admin context (withSettlementAdminContext):
 *   - Mirrors withTradeAdminContext / withEscrowAdminContext pattern
 *   - Sets app.is_admin = 'true' for RLS _admin_all bypass
 *   - adminAuthMiddleware is a global addHook in the parent control plugin
 *
 * HTTP status mapping (identical to tenant plane):
 *   APPLIED                       → 200
 *   PENDING_APPROVAL              → 202
 *   TRADE_NOT_FOUND/ESCROW_NOT_FOUND → 404
 *   ENTITY_FROZEN                 → 423
 *   TRADE_DISPUTED /
 *   INSUFFICIENT_ESCROW_FUNDS /
 *   DUPLICATE_REFERENCE /
 *   STATE_MACHINE_DENIED          → 409
 *   AI_HUMAN_CONFIRMATION_REQUIRED /
 *   INVALID_AMOUNT                → 400
 *   DB_ERROR                      → 500
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { sendSuccess, sendError, sendValidationError } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

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
        return (cb: (client: Prisma.TransactionClient) => Promise<unknown>) => cb(tx);
      }
      return (target as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

/**
 * Open a withDbContext scoped to a specific orgId with admin escalation flag set.
 * Mirrors withTradeAdminContext / withEscrowAdminContext in control/trades.g017.ts.
 *
 * Sets app.is_admin = 'true' so RLS _admin_all policies allow cross-tenant access
 * on all tables (audit_logs, trade, escrow_account, escrow_transactions, etc.).
 */
async function withSettlementAdminContext<T>(
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
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx);
  });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const previewBodySchema = z.object({
  /**
   * Control plane: admin explicitly names the target tenant.
   * If omitted, the ADMIN_SENTINEL_ID is used as the org context
   * (cross-tenant admin access is still granted via is_admin flag).
   */
  tenantId: uuidSchema.optional(),
  tradeId:  uuidSchema,
  escrowId: uuidSchema,
  amount:   z.number().positive('amount must be a positive number'),
  currency: z.string().min(1, 'currency is required').max(10).trim(),
});

const settleBodySchema = z.object({
  /**
   * Control plane: admin explicitly names the target tenant for RLS context.
   * MUST be provided to correctly scope the settlement transaction.
   */
  tenantId:    uuidSchema,
  tradeId:     uuidSchema,
  escrowId:    uuidSchema,
  amount:      z.number().positive('amount must be a positive number'),
  currency:    z.string().min(1, 'currency is required').max(10).trim(),
  referenceId: z.string().min(1, 'referenceId is required').max(500).trim(),
  reason:      z.string().min(1, 'reason is required').max(2000).trim(),
  aiTriggered: z.boolean().optional().default(false),
  actorType: z
    .enum(['TENANT_USER', 'TENANT_ADMIN', 'PLATFORM_ADMIN', 'SYSTEM_AUTOMATION', 'MAKER', 'CHECKER'])
    .optional()
    .default('PLATFORM_ADMIN'),
  actorRole: z.string().min(1).max(100).trim().optional().default('PLATFORM_ADMIN'),
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

const controlSettlementRoutes: FastifyPluginAsync = async fastify => {

  // ─── POST /api/control/settlements/preview ───────────────────────────────
  /**
   * Cross-tenant read-only preview: compute projected escrow balance.
   * NO ledger inserts; NO state machine calls.
   *
   * D-020-B: balance always derived from ledger SUM — never stored.
   * Admin RLS bypass: is_admin='true' allows cross-tenant escrow read.
   */
  fastify.post(
    '/preview',
    async (request, reply) => {
      const adminId = (request as unknown as Record<string, string>).adminId ?? ADMIN_SENTINEL_ID;

      const bodyResult = previewBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      const orgId = body.tenantId ?? ADMIN_SENTINEL_ID;

      try {
        const result = await withSettlementAdminContext(orgId, adminId, async tx => {
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
            escrowId: body.escrowId,
            tenantId: orgId,
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
        fastify.log.error({ err }, '[G-019] POST /control/settlements/preview error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to preview settlement', 500);
      }
    },
  );

  // ─── POST /api/control/settlements ───────────────────────────────────────
  /**
   * Cross-tenant settlement execution.
   * Admin provides tenantId in body to name the target org for RLS context.
   * All work executes inside ONE withSettlementAdminContext Postgres transaction.
   * SettlementService.settleTrade() must NOT open its own $transaction.
   *
   * RLS bypass: is_admin='true' allows cross-tenant write on trade,
   * escrow_account, escrow_transactions, and audit_logs.
   *
   * D-022: Audit written inside SettlementService in the SAME tx as all mutations.
   */
  fastify.post(
    '/',
    async (request, reply) => {
      const adminId = (request as unknown as Record<string, string>).adminId ?? ADMIN_SENTINEL_ID;

      const bodyResult = settleBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(reply, bodyResult.error.errors);
      }
      const body = bodyResult.data;

      try {
        const result = await withSettlementAdminContext(body.tenantId, adminId, async tx => {
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

          return settlementSvc.settleTrade({
            tradeId:     body.tradeId,
            escrowId:    body.escrowId,
            tenantId:    body.tenantId,    // Control: admin names the target tenant
            amount:      body.amount,
            currency:    body.currency,
            referenceId: body.referenceId,
            reason:      body.reason,
            aiTriggered: body.aiTriggered,
            actorType:   body.actorType,
            actorUserId: adminId,
            actorRole:   body.actorRole,
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
        fastify.log.error({ err }, '[G-019] POST /control/settlements error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to execute settlement', 500);
      }
    },
  );
};

export default controlSettlementRoutes;
