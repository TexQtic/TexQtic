import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma.js';
import { sendError } from '../utils/response.js';

const NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY = 'nc.procurement_pools.supplier_invites.enabled';

/**
 * Two-layer route gate for Network Commerce pool RFQ supplier invite routes.
 * Layer 1: global supplier invite sub-flag must exist and be enabled.
 * Layer 2: per-tenant override must exist and be enabled for the request org.
 *
 * Fails closed if orgId is not resolvable — all supplier invite routes are tenant-scoped.
 * Does NOT check parent keys (nc.procurement_pools.enabled or nc.procurement_pools.rfq.enabled).
 * This middleware is intentionally usable by supplier routes where the supplier org
 * may not have the parent pool feature enabled — only the invite flag is required.
 *
 * Owner routes must chain: ncPoolFeatureGateMiddleware → ncPoolRfqFeatureGateMiddleware →
 * ncPoolSupplierInviteFeatureGateMiddleware (OD-6, TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001).
 * Supplier routes use only this middleware.
 */
export async function ncPoolSupplierInviteFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let currentLayer: 1 | 2 = 1;
  const resolvedOrgId =
    request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null;

  try {
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY },
      select: { enabled: true },
    });

    if (globalFlag?.enabled !== true) {
      request.log.info(
        {
          event: 'nc.pool.supplier_invite.feature_gate.global_blocked',
          feature: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.supplier_invite.feature_gate.global_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier invite is disabled.',
        503,
      ) as unknown as void;
    }

    currentLayer = 2;

    if (!resolvedOrgId) {
      request.log.info(
        {
          event: 'nc.pool.supplier_invite.feature_gate.no_org_context',
          feature: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
        },
        'nc.pool.supplier_invite.feature_gate.no_org_context',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier invite is disabled.',
        503,
      ) as unknown as void;
    }

    const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
      where: {
        tenantId_key: {
          tenantId: resolvedOrgId as string,
          key: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });

    if (tenantOverride?.enabled !== true) {
      request.log.info(
        {
          event: 'nc.pool.supplier_invite.feature_gate.org_blocked',
          feature: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.supplier_invite.feature_gate.org_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier invite is disabled.',
        503,
      ) as unknown as void;
    }

    request.log.debug(
      {
        event: 'nc.pool.supplier_invite.feature_gate.allowed',
        feature: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
        orgId: resolvedOrgId,
      },
      'nc.pool.supplier_invite.feature_gate.allowed',
    );
    return;
  } catch (err) {
    request.log.error(
      {
        event: 'nc.pool.supplier_invite.feature_gate.db_error',
        feature: NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY,
        layer: currentLayer,
        orgId: resolvedOrgId,
        errMsg: err instanceof Error ? err.message : String(err),
      },
      'nc.pool.supplier_invite.feature_gate.db_error',
    );
    return sendError(
      reply,
      'FEATURE_DISABLED',
      'Network Commerce procurement pool supplier invite is disabled.',
      503,
    ) as unknown as void;
  }
}
