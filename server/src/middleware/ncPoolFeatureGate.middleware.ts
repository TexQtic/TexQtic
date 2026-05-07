import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma.js';
import { sendError } from '../utils/response.js';

const NC_POOL_FEATURE_FLAG_KEY = 'nc.procurement_pools.enabled';

/**
 * Two-layer route gate for Network Commerce pool tenant routes.
 * Layer 1: global feature flag must exist and be enabled.
 * Layer 2: per-tenant override must exist and be enabled for the request org.
 */
export async function ncPoolFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let currentLayer: 1 | 2 = 1;
  const resolvedOrgId =
    request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null;

  try {
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: NC_POOL_FEATURE_FLAG_KEY },
      select: { enabled: true },
    });

    if (globalFlag?.enabled !== true) {
      request.log.info(
        {
          event: 'nc.pool.feature_gate.global_blocked',
          feature: NC_POOL_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.feature_gate.global_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pools are disabled.',
        503,
      ) as unknown as void;
    }

    currentLayer = 2;

    if (resolvedOrgId) {
      const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
        where: {
          tenantId_key: {
            tenantId: resolvedOrgId as string,
            key: NC_POOL_FEATURE_FLAG_KEY,
          },
        },
        select: { enabled: true },
      });

      if (tenantOverride?.enabled !== true) {
        request.log.info(
          {
            event: 'nc.pool.feature_gate.org_blocked',
            feature: NC_POOL_FEATURE_FLAG_KEY,
            orgId: resolvedOrgId,
          },
          'nc.pool.feature_gate.org_blocked',
        );
        return sendError(
          reply,
          'FEATURE_DISABLED',
          'Network Commerce procurement pools are disabled.',
          503,
        ) as unknown as void;
      }
    }

    request.log.debug(
      {
        event: 'nc.pool.feature_gate.allowed',
        feature: NC_POOL_FEATURE_FLAG_KEY,
        orgId: resolvedOrgId,
      },
      'nc.pool.feature_gate.allowed',
    );
    return;
  } catch (err) {
    request.log.error(
      {
        event: 'nc.pool.feature_gate.db_error',
        feature: NC_POOL_FEATURE_FLAG_KEY,
        layer: currentLayer,
        orgId: resolvedOrgId,
        errMsg: err instanceof Error ? err.message : String(err),
      },
      'nc.pool.feature_gate.db_error',
    );
    return sendError(
      reply,
      'FEATURE_DISABLED',
      'Network Commerce procurement pools are disabled.',
      503,
    ) as unknown as void;
  }
}
