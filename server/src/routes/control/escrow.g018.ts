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
import { EscrowService } from '../../services/escrow.service.js';
import { EscalationService } from '../../services/escalation.service.js';
import { StateMachineService } from '../../services/stateMachine.service.js';

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
            const smSvc         = new StateMachineService(txBound, escalationSvc);
            const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc);

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
            const smSvc         = new StateMachineService(txBound, escalationSvc);
            const escrowSvc     = new EscrowService(txBound, smSvc, escalationSvc);

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
};

export default controlEscrowRoutes;
