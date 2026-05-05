/**
 * Control-plane TTP Score Snapshot Read Routes — TTP Slice 6
 *
 * GET  /api/control/ttp/score-snapshots/:orgId   — list score snapshots for an org (SUPER_ADMIN)
 * GET  /api/control/ttp/score-snapshot/:snapshotId — get snapshot detail (SUPER_ADMIN)
 *
 * Auth: adminAuthMiddleware inherited from parent plugin (control.ts addHook).
 *       requireAdminRole('SUPER_ADMIN') enforced per-route.
 *       ttpFeatureGateMiddleware gates both routes.
 *
 * TENANT-FACING SCORE HISTORY: NOT implemented.
 * LEGAL_REVIEW_PENDING remains unresolved — tenant score-history endpoints are
 * intentionally withheld from this slice and must not be added here.
 *
 * No write operations, no state mutations, no ttp_enabled activation.
 *
 * Governance: TTP Slice 6, TTP-SCORE-SNAPSHOT-READ-ADMIN-001,
 *             TTP-TEXQTICSCORE-V2-ADMIN-READ-001,
 *             TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { requireAdminRole } from '../../middleware/auth.js';
import { ttpFeatureGateMiddleware } from '../../middleware/ttpFeatureGate.middleware.js';
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
} from '../../utils/response.js';
import { withDbContext, type DatabaseContext } from '../../lib/database-context.js';
import { prisma } from '../../db/prisma.js';
import { TTP_DISCLAIMER_TEXT } from '../../ttp/ttp.constants.js';

// ─── Admin DB context ─────────────────────────────────────────────────────────

const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

async function withAdminReadContext<T>(callback: (db: PrismaClient) => Promise<T>): Promise<T> {
  const ctx: DatabaseContext = {
    orgId:     ADMIN_SENTINEL_ID,
    actorId:   ADMIN_SENTINEL_ID,
    realm:     'control',
    requestId: randomUUID(),
  };
  return withDbContext(prisma, ctx, async tx => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);
    return callback(tx as unknown as PrismaClient);
  });
}

// ─── Query schemas ────────────────────────────────────────────────────────────

export const snapshotListQuerySchema = z.object({
  limit:         z.coerce.number().min(1).max(200).default(50),
  trigger_event: z.string().optional(),
  trade_id:      z.string().uuid().optional(),
  vpc_id:        z.string().uuid().optional(),
  invoice_id:    z.string().uuid().optional(),
  enrollment_id: z.string().uuid().optional(),
  score_version: z.enum(['TTP_V1', 'TEXQTICSCORE_V2']).optional(),
});

type SnapshotListFilters = z.infer<typeof snapshotListQuerySchema>;

// ─── Safe field projection ────────────────────────────────────────────────────
// score_detail_json is intentionally excluded — reserved for future auditable surface.
// No raw bureau payloads are exposed through this endpoint.
export const SNAPSHOT_SELECT = {
  id:                    true,
  org_id:                true,
  trade_id:              true,
  invoice_id:            true,
  vpc_id:                true,
  enrollment_id:         true,
  score_value:           true,
  score_band:            true,
  score_version:         true,
  trigger_event:         true,
  source_event_id:       true,
  actor_id:              true,
  score_disclaimer_hash: true,
  route_disclaimer_hash: true,
  metadata_json:         true,
  created_at:            true,
} as const;

// ─── Exported query helpers (also used in unit tests) ────────────────────────

export async function querySnapshotList(
  db: unknown,
  orgId: string,
  filters: SnapshotListFilters,
): Promise<unknown[]> {
  const where: Record<string, unknown> = { org_id: orgId };
  if (filters.trigger_event !== undefined) where.trigger_event = filters.trigger_event;
  if (filters.trade_id      !== undefined) where.trade_id      = filters.trade_id;
  if (filters.vpc_id        !== undefined) where.vpc_id        = filters.vpc_id;
  if (filters.invoice_id    !== undefined) where.invoice_id    = filters.invoice_id;
  if (filters.enrollment_id !== undefined) where.enrollment_id = filters.enrollment_id;
  if (filters.score_version !== undefined) where.score_version = filters.score_version;

  return (db as any).ttp_score_snapshots.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take:    filters.limit,
    select:  SNAPSHOT_SELECT,
  });
}

export async function querySnapshotDetail(
  db: unknown,
  snapshotId: string,
): Promise<unknown | null> {
  return (db as any).ttp_score_snapshots.findUnique({
    where:  { id: snapshotId },
    select: SNAPSHOT_SELECT,
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const controlTtpScoreSnapshotRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /score-snapshots/:orgId — admin list of score snapshots for an org
  fastify.get<{
    Params:      { orgId: string };
    Querystring: SnapshotListFilters;
  }>(
    '/score-snapshots/:orgId',
    {
      preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware],
    },
    async (request, reply) => {
      const paramsResult = z.object({ orgId: z.string().uuid() }).safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const queryResult = snapshotListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return sendValidationError(reply, queryResult.error.errors);
      }

      const { orgId } = paramsResult.data;
      const filters   = queryResult.data;

      try {
        const snapshots = await withAdminReadContext(async db =>
          querySnapshotList(db, orgId, filters),
        );

        return sendSuccess(reply, {
          snapshots,
          count:               snapshots.length,
          advisory_disclaimer: TTP_DISCLAIMER_TEXT,
        });
      } catch (err) {
        request.log.error({ err }, 'ttp.score_snapshot.list.error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve score snapshot history', 500);
      }
    },
  );

  // GET /score-snapshot/:snapshotId — admin single-snapshot detail
  fastify.get<{
    Params: { snapshotId: string };
  }>(
    '/score-snapshot/:snapshotId',
    {
      preHandler: [requireAdminRole('SUPER_ADMIN'), ttpFeatureGateMiddleware],
    },
    async (request, reply) => {
      const paramsResult = z
        .object({ snapshotId: z.string().uuid() })
        .safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(reply, paramsResult.error.errors);
      }

      const { snapshotId } = paramsResult.data;

      try {
        const snapshot = await withAdminReadContext(async db =>
          querySnapshotDetail(db, snapshotId),
        );

        if (!snapshot) {
          return sendNotFound(reply, 'Score snapshot not found');
        }

        return sendSuccess(reply, {
          snapshot,
          advisory_disclaimer: TTP_DISCLAIMER_TEXT,
        });
      } catch (err) {
        request.log.error({ err }, 'ttp.score_snapshot.detail.error');
        return sendError(reply, 'INTERNAL_ERROR', 'Failed to retrieve score snapshot', 500);
      }
    },
  );
};

export default controlTtpScoreSnapshotRoutes;
