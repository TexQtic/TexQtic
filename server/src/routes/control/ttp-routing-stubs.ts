/**
 * Control-plane TTP Partner Routing Stub Routes — TTP Slice 6
 *
 * GET /api/control/ttp/routing-stubs/:vpcId
 *   Returns or creates (create-on-read) a partner routing stub for a VPC.
 *   Auth: requireAdminRole('SUPER_ADMIN')
 *
 * Boundary enforcement:
 *   - No partner transmission.
 *   - No external API calls.
 *   - No payment instruction or money movement.
 *   - No VPC state change.
 *   - No escrow mutation.
 *   - Read-only surface: admin visibility only, no tenant-facing endpoint.
 *
 * Error mapping:
 *   RoutingStubVpcNotFoundError   → 404
 *   RoutingStubVpcVoidedError     → 400 ROUTING_STUB_VPC_VOIDED
 *   RoutingStubVpcExpiredError    → 400 ROUTING_STUB_VPC_EXPIRED
 *   RoutingStubVpcTerminalError   → 409 ROUTING_STUB_VPC_TERMINAL
 *
 * Governance: TTP Slice 6, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { type Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import {
  PartnerRoutingService,
  RoutingStubVpcNotFoundError,
  RoutingStubVpcVoidedError,
  RoutingStubVpcExpiredError,
  RoutingStubVpcTerminalError,
} from '../../services/partnerRouting.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

// ─── DB context helpers ───────────────────────────────────────────────────────

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

async function withPartnerRoutingReadContext<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const ctx: DatabaseContext = {
    orgId: ADMIN_SENTINEL_ID,
    actorId: ADMIN_SENTINEL_ID,
    realm: 'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    await (tx as unknown as PrismaClient).$executeRaw`SET LOCAL app.is_admin = 'true'`;
    return callback(tx);
  });
}

async function withPartnerRoutingWriteContext<T>(
  orgId: string,
  adminId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.org_id', $1, true)`, orgId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.actor_id', $1, true)`, adminId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'admin', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.request_id', $1, true)`, randomUUID());
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx);
  });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');
const vpcIdParamSchema = z.object({ vpcId: uuidSchema });

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlTtpRoutingStubRoutes: FastifyPluginAsync = async fastify => {
  /**
   * GET /api/control/ttp/routing-stubs/:vpcId
   *
   * Returns or creates a partner routing stub for the specified VPC.
   * Restricted to SUPER_ADMIN.
   *
   * Behaviour:
   *   - Validates VPC exists and is ACTIVE or ROUTING_READY.
   *   - Returns existing PENDING stub if one is already persisted for the VPC.
   *   - Otherwise creates a new stub (create-on-read) and returns it.
   *   - Stub transmission_status is always PENDING (no live routing in Slice 6).
   *
   * Non-executing: no partner transmission, no external API call, no payment action.
   */
  fastify.get(
    '/routing-stubs/:vpcId',
    { preHandler: requireAdminRole('SUPER_ADMIN') },
    async (request, reply) => {
      if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

      const paramResult = vpcIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { vpcId } = paramResult.data;
      const adminId = request.adminId;

      try {
        // Step 1: Read VPC to get seller_org_id for write context
        const vpcSnap = await withPartnerRoutingReadContext(async tx => {
          const row = await (makeTxBoundPrisma(tx) as any).verified_payable_certificates.findUnique({
            where: { id: vpcId },
            select: { seller_org_id: true },
          });
          return row;
        });

        if (!vpcSnap) return sendNotFound(reply, `VPC not found: ${vpcId}`);

        // Step 2: Get or create routing stub (write context for potential stub creation)
        const stub = await withPartnerRoutingWriteContext(vpcSnap.seller_org_id, adminId, async tx => {
          const svc = new PartnerRoutingService(makeTxBoundPrisma(tx));
          return svc.getOrCreateRoutingStub(vpcId, adminId);
        });

        return sendSuccess(reply, { stub }, 200);
      } catch (err) {
        if (err instanceof RoutingStubVpcNotFoundError) {
          return sendNotFound(reply, err.message);
        }
        if (err instanceof RoutingStubVpcVoidedError) {
          return sendError(reply, 'ROUTING_STUB_VPC_VOIDED', err.message, 400);
        }
        if (err instanceof RoutingStubVpcExpiredError) {
          return sendError(reply, 'ROUTING_STUB_VPC_EXPIRED', err.message, 400);
        }
        if (err instanceof RoutingStubVpcTerminalError) {
          return sendError(reply, 'ROUTING_STUB_VPC_TERMINAL', err.message, 409);
        }
        throw err;
      }
    },
  );
};

export default controlTtpRoutingStubRoutes;
