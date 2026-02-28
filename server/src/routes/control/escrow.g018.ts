/**
 * G-018 Day 3 — Control Plane Escrow Routes
 *
 * Fastify plugin — registered at /api/control/escrows
 *
 * Routes:
 *   GET /api/control/escrows            — cross-tenant escrow list (admin)
 *   GET /api/control/escrows/:escrowId  — escrow detail (cross-tenant, admin)
 *
 * Constitutional compliance:
 *   D-017-A  tenantId ALWAYS from JWT or route context — NEVER from body (read-only here)
 *   D-020-B  balance derived from ledger; never stored
 *   Auth: adminAuthMiddleware is registered as a global addHook in the parent
 *         control plugin (control.ts) — no per-route onRequest needed here.
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
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';
import { MakerCheckerService } from '../../services/makerChecker.service.js';
import { SanctionsService } from '../../services/sanctions.service.js';
import {
  createEscrowTransitionAppliedAudit,
  createEscrowTransitionPendingAudit,
  createEscrowTransitionRejectedAudit,
} from '../../utils/audit.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

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

/**
 * Open a withDbContext scoped to a specific orgId with admin escalation flag set.
 * Mirrors the withTradeAdminContext pattern in control/trades.g017.ts.
 */
async function withEscrowAdminContext<T>(
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

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  tenantId: uuidSchema.optional(),
  limit:    z.coerce.number().int().min(1).max(200).optional().default(50),
  offset:   z.coerce.number().int().min(0).optional().default(0),
});

const escrowIdParamSchema = z.object({ escrowId: uuidSchema });

// G-021 Fix B: transition body schema mirrors tenant plane pattern
const transitionEscrowBodySchema = z.object({
  /** Target org for RLS context — admin provides explicitly. */
  orgId:       uuidSchema,
  toStateKey:  z.string().min(1).max(100).trim().toUpperCase(),
  reason:      z.string().min(1).max(2000).trim(),
  actorRole:   z.string().min(1).max(100).trim(),
  aiTriggered: z.boolean().optional().default(false),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlEscrowRoutes: FastifyPluginAsync = async fastify => {

  // ─── GET /api/control/escrows ────────────────────────────────────────────
  /**
   * List escrow accounts across all tenants (admin, cross-org read).
   * Optional tenantId query param narrows the result to a single tenant.
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
        const result = await withEscrowAdminContext(
          query.tenantId ?? ADMIN_SENTINEL_ID,
          adminId,
          async tx => {
            const txBound       = makeTxBoundPrisma(tx);
            const escalationSvc = new EscalationService(txBound);
            const sanctionsSvc  = new SanctionsService(txBound);
            const smSvc         = new StateMachineService(txBound, escalationSvc, sanctionsSvc);
            const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, undefined, sanctionsSvc);

            return escrowSvc.listEscrowAccounts({
              tenantId: query.tenantId,   // undefined → cross-tenant admin list
              limit:    query.limit,
              offset:   query.offset,
            });
          },
        );

        if (result.status !== 'OK') {
          const statusCode = result.code === 'DB_ERROR' ? 422 : 422;
          return sendError(reply, result.code, result.message, statusCode);
        }

        return sendSuccess(reply, {
          escrows: result.escrows,
          count:   result.count,
          limit:   query.limit,
          offset:  query.offset,
        });
      } catch (err) {
        fastify.log.error({ err }, '[G-018] GET /control/escrows error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to list escrow accounts', 500);
      }
    },
  );

  // ─── GET /api/control/escrows/:escrowId ─────────────────────────────────
  /**
   * Get escrow account detail cross-tenant (admin access).
   * Admin RLS bypass (SET LOCAL app.is_admin='true') removes tenant isolation,
   * allowing detail access without knowing the tenant ahead of time.
   * D-020-B: balance is derived (SUM) — never stored.
   */
  fastify.get(
    '/:escrowId',
    async (request, reply) => {
      const adminId = request.adminId ?? ADMIN_SENTINEL_ID;

      const paramResult = escrowIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendValidationError(reply, paramResult.error.errors);
      }
      const { escrowId } = paramResult.data;

      try {
        const result = await withEscrowAdminContext(
          ADMIN_SENTINEL_ID,
          adminId,
          async tx => {
            const txBound       = makeTxBoundPrisma(tx);
            const escalationSvc = new EscalationService(txBound);
            const sanctionsSvc  = new SanctionsService(txBound);
            const smSvc         = new StateMachineService(txBound, escalationSvc, sanctionsSvc);
            const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, undefined, sanctionsSvc);

            // No tenantId passed → cross-tenant admin access (admin bypass in effect)
            return escrowSvc.getEscrowAccountDetail(escrowId);
          },
        );

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
        fastify.log.error({ err }, '[G-018] GET /control/escrows/:escrowId error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to load escrow account', 500);
      }
    },
  );

  // ─── POST /api/control/escrows/:escrowId/transition ────────────────────────────────────
  /**
   * G-021 Fix B — Admin-initiated escrow lifecycle transition (control plane).
   * Mirrors tenant plane pattern: MakerCheckerService is injected so that
   * PENDING_APPROVAL transitions create pending_approvals rows.
   * D-022-B: Freeze gate enforced by EscrowService.transitionEscrow().
   * Audit emitted atomically in the same Prisma transaction.
   */
  fastify.post(
    '/:escrowId/transition',
    async (request, reply) => {
      const adminId = request.adminId ?? ADMIN_SENTINEL_ID;

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
        const result = await withEscrowAdminContext(body.orgId, adminId, async tx => {
          const txBound       = makeTxBoundPrisma(tx);
          const escalationSvc = new EscalationService(txBound);
          const sanctionsSvc  = new SanctionsService(txBound);
          const smSvc         = new StateMachineService(txBound, escalationSvc, sanctionsSvc);
          // G-021 Fix B: inject MC so EscrowService creates pending_approvals on PENDING_APPROVAL
          const mcSvc         = new MakerCheckerService(txBound, smSvc, escalationSvc);
          const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc, mcSvc, sanctionsSvc);

          const transResult = await escrowSvc.transitionEscrow({
            escrowId,
            tenantId:     body.orgId,   // admin provides org explicitly; service re-validates
            toStateKey:   body.toStateKey,
            actorType:    'PLATFORM_ADMIN' as const,
            actorAdminId: adminId,
            actorRole:    body.actorRole,
            reason:       body.reason,
            aiTriggered:  body.aiTriggered,
          });

          // Emit typed audit based on outcome
          if (transResult.status === 'APPLIED') {
            await writeAuditLog(
              tx as unknown as PrismaClient,
              createEscrowTransitionAppliedAudit({
                realm:        'ADMIN',
                tenantId:     body.orgId,
                actorType:    'ADMIN',
                actorId:      adminId,
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
                realm:          'ADMIN',
                tenantId:       body.orgId,
                actorType:      'ADMIN',
                actorId:        adminId,
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
                realm:        'ADMIN',
                tenantId:     body.orgId,
                actorType:    'ADMIN',
                actorId:      adminId,
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
            result.code === 'ESCROW_NOT_FOUND'   ? 404
            : result.code === 'ENTITY_FROZEN'    ? 423
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
        fastify.log.error({ err }, '[G-018] POST /control/escrows/:escrowId/transition error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition escrow account', 500);
      }
    },
  );
};

export default controlEscrowRoutes;
