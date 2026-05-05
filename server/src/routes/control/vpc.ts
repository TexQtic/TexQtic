/**
 * Control-plane VPC Routes — TTP Slice 5: VPC Generation
 *
 * POST  /api/control/vpc/generate/:invoiceId — generate a VPC for a VERIFIED invoice (SUPER_ADMIN)
 * GET   /api/control/vpc                     — list VPCs (cross-tenant, admin)
 * GET   /api/control/vpc/:vpcId              — get VPC detail
 * PATCH /api/control/vpc/:vpcId/transition   — admin lifecycle transition (SUPER_ADMIN)
 *
 * Auth: adminAuthMiddleware inherited from parent control plugin.
 * POST and PATCH restricted to SUPER_ADMIN role.
 *
 * VPC generation gates:
 *   Invoice must be in VERIFIED state.
 *   Seller org must have APPROVED GST, ELIGIBLE assessment, valid_until not expired,
 *   risk_tier >= 1, amount within tier cap, due_date present, no duplicate non-terminal VPC.
 *
 * No payment, escrow, or partner-routing operations in Slice 5.
 * partner_routing_eligible = false always.
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { type Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import { ttpFeatureGateMiddleware } from '../../middleware/ttpFeatureGate.middleware.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import { TTP_VPC_STATE } from '../../ttp/ttp.constants.js';
import {
  VpcService,
  type AdminVpcRecord,
  VpcInvoiceNotFoundError,
  VpcInvoiceIneligibleStateError,
  VpcGstNotApprovedError,
  VpcEligibilityMissingError,
  VpcEligibilityOutcomeError,
  VpcEligibilityExpiredError,
  VpcRiskTierBlockedError,
  VpcAmountExceedsCapError,
  VpcDueDateMissingError,
  VpcDuplicateError,
  VpcNotFoundError,
  VpcTransitionNotAllowedError,
  VpcTerminalStateError,
} from '../../services/vpc.service.js';
import {
  TtpScoreSnapshotService,
  TTP_SCORE_TRIGGER_EVENT,
} from '../../services/ttpScoreSnapshot.service.js';

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

async function withVpcAdminReadContext<T>(
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

async function withVpcAdminWriteContext<T>(
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

const invoiceIdParamSchema = z.object({ invoiceId: uuidSchema });
const vpcIdParamSchema = z.object({ vpcId: uuidSchema });

const listQuerySchema = z.object({
  org_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional(),
  trade_id: uuidSchema.optional(),
  state_key: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const transitionBodySchema = z.object({
  to_state_key: z.enum(
    [
      TTP_VPC_STATE.ROUTING_READY,
      TTP_VPC_STATE.VOIDED,
      TTP_VPC_STATE.EXPIRED,
    ],
    {
      errorMap: () => ({
        message: 'to_state_key must be one of: ROUTING_READY, VOIDED, EXPIRED',
      }),
    },
  ),
  reason: z.string().trim().min(1).max(2000),
  void_reason: z.string().trim().min(1).max(2000).optional().nullable(),
  notes: z.string().trim().min(1).max(5000).optional().nullable(),
});

// ─── Post-commit VPC_ISSUED snapshot helper ────────────────────────────────────

/**
 * Best-effort: capture a `VPC_ISSUED` score snapshot after successful VPC generation.
 *
 * Called AFTER the VPC insert has committed. Swallows all errors from
 * `snapshotSvc.captureSnapshot` — snapshot failure must never affect the VPC response.
 * Logs a structured `ttp.score_snapshot.capture_failed` event on error.
 *
 * Exported for unit testing only (do not call from outside the VPC route handler).
 *
 * @param params.record     The successfully generated AdminVpcRecord.
 * @param params.invoiceId  Invoice ID used to generate the VPC.
 * @param params.adminId    Admin actor ID from the VPC generation request.
 * @param params.snapshotSvc An already DB-context-wrapped TtpScoreSnapshotService.
 * @param params.log        Fastify request.log (or compatible logger).
 */
export async function captureVpcIssuedSnapshot(params: {
  record: AdminVpcRecord;
  invoiceId: string;
  adminId: string;
  snapshotSvc: Pick<TtpScoreSnapshotService, 'captureSnapshot'>;
  log: { error(obj: Record<string, unknown>, msg: string): void };
}): Promise<void> {
  const { record, invoiceId, adminId, snapshotSvc, log } = params;
  try {
    await snapshotSvc.captureSnapshot({
      orgId: record.org_id,
      triggerEvent: TTP_SCORE_TRIGGER_EVENT.VPC_ISSUED,
      tradeId: record.trade_id,
      invoiceId,
      vpcId: record.id,
      sourceEventId: record.id,
      actorId: adminId,
    });
  } catch (snapshotErr) {
    log.error(
      {
        event: 'ttp.score_snapshot.capture_failed',
        trigger_event: 'VPC_ISSUED',
        vpc_id: record.id,
        invoice_id: invoiceId,
        trade_id: record.trade_id,
        org_id: record.org_id,
        err_name: snapshotErr instanceof Error ? snapshotErr.name : 'UnknownError',
        err_msg: snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr),
      },
      'ttp.score_snapshot.capture_failed',
    );
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const controlVpcRoutes: FastifyPluginAsync = async fastify => {
  /**
   * POST /api/control/vpc/generate/:invoiceId
   *
   * Generate a VPC for a VERIFIED invoice. Restricted to SUPER_ADMIN.
   * Enforces all 12 eligibility gates before creation.
   */
  fastify.post(
    '/generate/:invoiceId',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

      const paramResult = invoiceIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const { invoiceId } = paramResult.data;
      const adminId = request.adminId;

      let invoiceSnap: { org_id: string } | null = null;
      try {
        // Read invoice to get org_id for write context
        invoiceSnap = await withVpcAdminReadContext(async tx => {
          const row = await (makeTxBoundPrisma(tx) as any).invoices.findUnique({
            where: { id: invoiceId },
            select: { org_id: true },
          });
          return row as { org_id: string } | null;
        });

        if (!invoiceSnap) return sendNotFound(reply, `Invoice not found: ${invoiceId}`);

        const record = await withVpcAdminWriteContext(invoiceSnap.org_id, adminId, async tx => {
          const svc = new VpcService(makeTxBoundPrisma(tx));
          return svc.generateVpc(invoiceId, adminId);
        });

        await writeAuditLog(
          prisma,
          createAdminAudit(adminId, 'VPC_GENERATE', 'verified_payable_certificate', {
            invoice_id: invoiceId,
            vpc_id: record.id,
            vpc_reference: record.vpc_reference,
            org_id: record.org_id,
          }),
        );

        // Post-commit best-effort: VPC_ISSUED score snapshot.
        // withVpcAdminWriteContext provides RLS-safe DB context for assembleTtpScoreInput reads
        // and the ttp_score_snapshots insert. captureVpcIssuedSnapshot swallows captureSnapshot
        // errors internally. This outer try/catch handles DB context setup failures only.
        // VPC HTTP response is never affected by snapshot errors.
        try {
          await withVpcAdminWriteContext(record.org_id, adminId, async tx => {
            await captureVpcIssuedSnapshot({
              record,
              invoiceId,
              adminId,
              snapshotSvc: new TtpScoreSnapshotService(makeTxBoundPrisma(tx)),
              log: request.log,
            });
          });
        } catch (snapshotCtxErr) {
          request.log.error(
            {
              event: 'ttp.score_snapshot.capture_failed',
              trigger_event: 'VPC_ISSUED',
              vpc_id: record.id,
              invoice_id: invoiceId,
              trade_id: record.trade_id,
              org_id: record.org_id,
              err_name: snapshotCtxErr instanceof Error ? snapshotCtxErr.name : 'UnknownError',
              err_msg: snapshotCtxErr instanceof Error ? snapshotCtxErr.message : String(snapshotCtxErr),
            },
            'ttp.score_snapshot.capture_failed',
          );
        }

        return sendSuccess(reply, record, 201);
      } catch (err) {
        const orgId = invoiceSnap?.org_id ?? null;
        if (err instanceof VpcInvoiceNotFoundError) return sendNotFound(reply, err.message);
        if (err instanceof VpcInvoiceIneligibleStateError)
          return sendError(reply, 'INVOICE_INELIGIBLE_STATE', err.message, 422);
        if (err instanceof VpcGstNotApprovedError)
          return sendError(reply, 'GST_NOT_APPROVED', err.message, 422);
        if (err instanceof VpcEligibilityMissingError)
          return sendError(reply, 'ELIGIBILITY_MISSING', err.message, 422);
        if (err instanceof VpcEligibilityOutcomeError)
          return sendError(reply, 'ELIGIBILITY_OUTCOME', err.message, 422);
        if (err instanceof VpcEligibilityExpiredError) {
          request.log.info(
            { event: 'ttp.eligibility.expired', route: 'POST /api/control/vpc/generate/:invoiceId', orgId, errMsg: err.message },
            'ttp.eligibility.expired',
          );
          return sendError(reply, 'ELIGIBILITY_EXPIRED', err.message, 422);
        }
        if (err instanceof VpcRiskTierBlockedError)
          return sendError(reply, 'RISK_TIER_BLOCKED', err.message, 422);
        if (err instanceof VpcAmountExceedsCapError)
          return sendError(reply, 'AMOUNT_EXCEEDS_CAP', err.message, 422);
        if (err instanceof VpcDueDateMissingError)
          return sendError(reply, 'DUE_DATE_MISSING', err.message, 422);
        if (err instanceof VpcDuplicateError)
          return sendError(reply, 'VPC_DUPLICATE', err.message, 409);
        request.log.error(
          { event: 'ttp.vpc.generate.error', route: 'POST /api/control/vpc/generate/:invoiceId', orgId, errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.vpc.generate.error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to generate VPC', 500);
      }
    },
  );

  /**
   * GET /api/control/vpc
   * List VPCs cross-tenant (admin view). Supports filters: org_id, invoice_id, trade_id, state_key.
   */
  fastify.get('/', { preHandler: [ttpFeatureGateMiddleware] }, async (request, reply) => {
    if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

    const queryResult = listQuerySchema.safeParse(request.query);
    if (!queryResult.success) return sendValidationError(reply, queryResult.error.errors);

    try {
      const records = await withVpcAdminReadContext(async tx => {
        const svc = new VpcService(makeTxBoundPrisma(tx));
        return svc.adminListVpcs(queryResult.data);
      });
      return sendSuccess(reply, records);
    } catch (err) {
        request.log.error(
          { event: 'ttp.route.error', route: 'GET /api/control/vpc', errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.route.error',
        );
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to list VPCs', 500);
    }
  });

  /**
   * GET /api/control/vpc/:vpcId
   * Get a single VPC with full admin detail.
   */
  fastify.get('/:vpcId', { preHandler: [ttpFeatureGateMiddleware] }, async (request, reply) => {
    if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

    const paramResult = vpcIdParamSchema.safeParse(request.params);
    if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

    const { vpcId } = paramResult.data;

    try {
      const record = await withVpcAdminReadContext(async tx => {
        const svc = new VpcService(makeTxBoundPrisma(tx));
        return svc.adminGetVpc(vpcId);
      });
      return sendSuccess(reply, record);
    } catch (err) {
      if (err instanceof VpcNotFoundError) return sendNotFound(reply, err.message);
      request.log.error(
        { event: 'ttp.route.error', route: 'GET /api/control/vpc/:vpcId', vpcId, errMsg: err instanceof Error ? err.message : String(err) },
        'ttp.route.error',
      );
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to get VPC', 500);
    }
  });

  /**
   * PATCH /api/control/vpc/:vpcId/transition
   *
   * Admin VPC lifecycle transition. Restricted to SUPER_ADMIN.
   * Allowed: ACTIVE→ROUTING_READY, ACTIVE→VOIDED, ACTIVE→EXPIRED,
   *          ROUTING_READY→VOIDED, ROUTING_READY→EXPIRED
   *
   * No TRANSMITTED transition in Slice 5.
   */
  fastify.patch(
    '/:vpcId/transition',
    { preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware] },
    async (request, reply) => {
      if (!request.adminId) return sendError(reply, 'UNAUTHORIZED', 'Admin auth required', 401);

      const paramResult = vpcIdParamSchema.safeParse(request.params);
      if (!paramResult.success) return sendValidationError(reply, paramResult.error.errors);

      const bodyResult = transitionBodySchema.safeParse(request.body);
      if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

      const { vpcId } = paramResult.data;
      const { to_state_key, reason, void_reason, notes } = bodyResult.data;
      const adminId = request.adminId;

      try {
        // Read VPC to get org_id for write context
        const vpcSnap = await withVpcAdminReadContext(async tx => {
          const row = await (makeTxBoundPrisma(tx) as any).verified_payable_certificates.findUnique({
            where: { id: vpcId },
            select: { org_id: true },
          });
          return row;
        });

        if (!vpcSnap) return sendNotFound(reply, `VPC not found: ${vpcId}`);

        const record = await withVpcAdminWriteContext(vpcSnap.org_id, adminId, async tx => {
          const svc = new VpcService(makeTxBoundPrisma(tx));
          return svc.adminTransitionVpc(vpcId, { to_state_key, reason, void_reason, notes }, adminId);
        });

        await writeAuditLog(
          prisma,
          createAdminAudit(adminId, 'VPC_TRANSITION', 'verified_payable_certificate', {
            vpc_id: vpcId,
            to_state_key,
            reason,
            org_id: record.org_id,
          }),
        );

        return sendSuccess(reply, record);
      } catch (err) {
        if (err instanceof VpcNotFoundError) return sendNotFound(reply, err.message);
        if (err instanceof VpcTerminalStateError)
          return sendError(reply, 'TERMINAL_STATE', err.message, 422);
        if (err instanceof VpcTransitionNotAllowedError)
          return sendError(reply, 'TRANSITION_NOT_ALLOWED', err.message, 422);
        request.log.error(
          { event: 'ttp.route.error', route: 'PATCH /api/control/vpc/:vpcId/transition', vpcId, errMsg: err instanceof Error ? err.message : String(err) },
          'ttp.route.error',
        );
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to transition VPC', 500);
      }
    },
  );
};

export default controlVpcRoutes;
