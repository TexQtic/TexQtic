import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma.js';
import { sendError } from '../utils/response.js';

const NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY = 'nc.procurement_pools.supplier_quotes.enabled';

/**
 * Two-layer route gate for Network Commerce pool RFQ supplier quote routes.
 * Layer 1: global supplier quote sub-flag must exist and be enabled.
 * Layer 2: per-tenant override must exist and be enabled for the request org.
 *
 * Fails closed if orgId is not resolvable — all supplier quote routes are tenant-scoped.
 * Does NOT check parent keys (nc.procurement_pools.enabled, nc.procurement_pools.rfq.enabled,
 * or nc.procurement_pools.supplier_invites.enabled) — QD-6: quote gate is independent.
 *
 * Supplier quote routes use only this middleware (plus tenantAuthMiddleware and
 * databaseContextMiddleware). Owner routes must chain pool/rfq gate before this gate.
 *
 * TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001 (Packet 12)
 */
export async function ncPoolSupplierQuoteFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let currentLayer: 1 | 2 = 1;
  const resolvedOrgId =
    request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null;

  try {
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY },
      select: { enabled: true },
    });

    if (globalFlag?.enabled !== true) {
      request.log.info(
        {
          event: 'nc.pool.supplier_quote.feature_gate.global_blocked',
          feature: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.supplier_quote.feature_gate.global_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier quote is disabled.',
        503,
      ) as unknown as void;
    }

    currentLayer = 2;

    if (!resolvedOrgId) {
      request.log.info(
        {
          event: 'nc.pool.supplier_quote.feature_gate.no_org_context',
          feature: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
        },
        'nc.pool.supplier_quote.feature_gate.no_org_context',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier quote is disabled.',
        503,
      ) as unknown as void;
    }

    const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
      where: {
        tenantId_key: {
          tenantId: resolvedOrgId as string,
          key: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
        },
      },
      select: { enabled: true },
    });

    if (tenantOverride?.enabled === false) {
      request.log.info(
        {
          event: 'nc.pool.supplier_quote.feature_gate.org_blocked',
          feature: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
          orgId: resolvedOrgId,
        },
        'nc.pool.supplier_quote.feature_gate.org_blocked',
      );
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'Network Commerce procurement pool supplier quote is disabled.',
        503,
      ) as unknown as void;
    }

    request.log.debug(
      {
        event: 'nc.pool.supplier_quote.feature_gate.allowed',
        feature: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
        orgId: resolvedOrgId,
      },
      'nc.pool.supplier_quote.feature_gate.allowed',
    );
    return;
  } catch (err) {
    request.log.error(
      {
        event: 'nc.pool.supplier_quote.feature_gate.db_error',
        feature: NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY,
        layer: currentLayer,
        orgId: resolvedOrgId,
        errMsg: err instanceof Error ? err.message : String(err),
      },
      'nc.pool.supplier_quote.feature_gate.db_error',
    );
    return sendError(
      reply,
      'FEATURE_DISABLED',
      'Network Commerce procurement pool supplier quote is disabled.',
      503,
    ) as unknown as void;
  }
}
