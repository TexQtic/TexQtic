/**
 * TTP Feature Gate Middleware
 *
 * Two-layer kill-switch enforcer for TradeTrust Pay (TTP).
 *
 * Layer 1 — Global flag: reads `ttp_enabled` from feature_flags.
 *   If missing, disabled, or unreadable → HTTP 503 FEATURE_DISABLED.
 *   If explicitly true → proceed to Layer 2.
 *
 * Layer 2 — Per-org override: reads TenantFeatureOverride for the subject org.
 *   Subject orgId is resolved from:
 *     1. request.dbContext.orgId  (tenant-plane routes — set by tenantAuthMiddleware)
 *     2. request.params.orgId     (control-plane routes with :orgId path param)
 *   If neither is present (aggregated admin-list routes) → global gate is sufficient (OQ-1).
 *   If orgId is resolved: override row must exist with enabled=true, otherwise 503.
 *
 * PLACEMENT: In preHandler, AFTER auth middleware (onRequest).
 * Auth must run first so that unauthenticated requests still return 401,
 * not 503. The gate must never reveal feature status to unauthenticated actors.
 *
 * Fail-closed: any DB error, missing row, or non-true value → block.
 * No side effects: does not write to DB, does not mutate request state.
 *
 * Governance: TTP-IMPL-003 — Two-layer per-org activation gate
 * References: TTP_FEATURE_FLAG.TTP_ENABLED, FeatureFlag.enabled, TenantFeatureOverride
 * Design: TTP-SCOPED-ACTIVATION-DESIGN-001 §5, §6; OQ-1, OQ-2
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/prisma.js';
import { TTP_FEATURE_FLAG } from '../ttp/ttp.constants.js';
import { sendError } from '../utils/response.js';

/**
 * ttpFeatureGateMiddleware
 *
 * Two-layer gate blocking access to TTP routes.
 * Must be registered as a preHandler after auth middleware.
 *
 * Layer 1 — Returns 503 FEATURE_DISABLED if:
 *   - `feature_flags` row for `ttp_enabled` does not exist
 *   - `feature_flags.enabled` is false or not true
 *   - DB read throws (fail-closed)
 *
 * Layer 2 (when global flag is true and orgId is resolvable) — Returns 503 if:
 *   - No TenantFeatureOverride row exists for (orgId, 'ttp_enabled')
 *   - TenantFeatureOverride.enabled is false
 *   - DB read on override throws (fail-closed)
 *
 * Allows through if:
 *   - Layer 1: `feature_flags.enabled === true`
 *   - AND Layer 2: override.enabled === true (or orgId is not resolvable — aggregated routes)
 */
export async function ttpFeatureGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // ─── Layer 1: Global kill-switch (preserved from Phase 1) ─────────────────
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: TTP_FEATURE_FLAG.TTP_ENABLED },
      select: { enabled: true },
    });

    if (globalFlag?.enabled !== true) {
      // Global flag is off, missing, or unreadable → block immediately
      return sendError(
        reply,
        'FEATURE_DISABLED',
        'TradeTrust Pay is not enabled for this platform.',
        503,
      ) as unknown as void;
    }

    // ─── Layer 2: Per-org TenantFeatureOverride (new in TTP-IMPL-003) ─────────
    // Resolve subject orgId — priority: auth context (tenant routes) → path param (control routes)
    const orgId =
      request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null;

    if (orgId) {
      // OrgId resolved — enforce per-org override
      const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
        where: {
          tenantId_key: {
            tenantId: orgId as string,
            key: TTP_FEATURE_FLAG.TTP_ENABLED,
          },
        },
        select: { enabled: true },
      });

      if (tenantOverride?.enabled !== true) {
        // Override missing or disabled → block (fail-closed; missing row ≡ disabled)
        return sendError(
          reply,
          'FEATURE_DISABLED',
          'TradeTrust Pay is not activated for this organization.',
          503,
        ) as unknown as void;
      }
    }
    // OrgId not resolvable → aggregated admin-list route; global gate is sufficient (OQ-1)

    // Both layers passed (or no orgId for aggregated routes) → allow request to proceed
    return;
  } catch {
    // Any DB error → fail-closed (block access)
    return sendError(
      reply,
      'FEATURE_DISABLED',
      'TradeTrust Pay is not enabled for this platform.',
      503,
    ) as unknown as void;
  }
}
