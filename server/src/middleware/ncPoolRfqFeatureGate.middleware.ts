import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma.js';
import { sendError } from '../utils/response.js';

const NC_POOL_RFQ_FEATURE_FLAG_KEY = 'nc.procurement_pools.rfq.enabled';

/**
 * Two-layer route gate for Network Commerce pool RFQ sub-feature routes.
 * Layer 1: global RFQ sub-flag must exist and be enabled.
 * Layer 2: if a per-tenant override exists and is explicitly disabled, block.
 *          No override row → allow (global=true is sufficient).
 *
 * Fails closed if orgId is not resolvable — all RFQ routes are tenant-scoped.
 * Does NOT check parent key (nc.procurement_pools.enabled); that is enforced
 * by ncPoolFeatureGateMiddleware, which must be chained before this middleware.
 */
export async function ncPoolRfqFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let currentLayer: 1 | 2 = 1;
  const resolvedOrgId =
    request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null;

  try {
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: NC_POOL_RFQ_FEATURE_FLAG_KEY },
      select: { enabled: true },
    });

    if (globalFlag?.enabled !== true) {
      request.log.info(
        {
          event: 'nc.pool.rfq.feature_gate.global_blocked',
          feature: NC_POOL_RFQ_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.rfq.feature_gate.global_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool RFQ is disabled.',
        503,
      ) as unknown as void;
    }

    currentLayer = 2;

    if (!resolvedOrgId) {
      request.log.info(
        {
          event: 'nc.pool.rfq.feature_gate.no_org_context',
          feature: NC_POOL_RFQ_FEATURE_FLAG_KEY,
        },
        'nc.pool.rfq.feature_gate.no_org_context',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool RFQ is disabled.',
        503,
      ) as unknown as void;
    }

    const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
      where: {
        tenantId_key: {
          tenantId: resolvedOrgId as string,
          key: NC_POOL_RFQ_FEATURE_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });

    if (tenantOverride?.enabled === false) {
      request.log.info(
        {
          event: 'nc.pool.rfq.feature_gate.org_blocked',
          feature: NC_POOL_RFQ_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.rfq.feature_gate.org_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool RFQ is disabled.',
        503,
      ) as unknown as void;
    }

    request.log.debug(
      {
        event: 'nc.pool.rfq.feature_gate.allowed',
        feature: NC_POOL_RFQ_FEATURE_FLAG_KEY,
        orgId: resolvedOrgId,
      },
      'nc.pool.rfq.feature_gate.allowed',
    );
    return;
  } catch (err) {
    request.log.error(
      {
        event: 'nc.pool.rfq.feature_gate.db_error',
        feature: NC_POOL_RFQ_FEATURE_FLAG_KEY,
        layer: currentLayer,
        orgId: resolvedOrgId,
        errMsg: err instanceof Error ? err.message : String(err),
      },
      'nc.pool.rfq.feature_gate.db_error',
    );
    return sendError(
      reply,
      'FEATURE_DISABLED',
      'Network Commerce procurement pool RFQ is disabled.',
      503,
    ) as unknown as void;
  }
}
