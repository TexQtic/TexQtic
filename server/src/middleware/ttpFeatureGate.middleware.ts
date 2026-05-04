/**
 * TTP Feature Gate Middleware
 *
 * Kill-switch enforcer for TradeTrust Pay (TTP).
 *
 * Reads the `ttp_enabled` row from feature_flags (Boolean field).
 * If the flag is missing, disabled, or unreadable → HTTP 503 FEATURE_DISABLED.
 * If the flag is explicitly enabled (true) → request proceeds.
 *
 * PLACEMENT: In preHandler, AFTER auth middleware (onRequest).
 * Auth must run first so that unauthenticated requests still return 401,
 * not 503. The gate must never reveal feature status to unauthenticated actors.
 *
 * Fail-closed: any DB error, missing row, or non-true value → block.
 * No side effects: does not write to DB, does not mutate request state.
 *
 * Governance: TTP Unit 1 – Activation Readiness Safety Gate
 * References: TTP_FEATURE_FLAG.TTP_ENABLED, FeatureFlag.enabled (Boolean)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/prisma.js';
import { TTP_FEATURE_FLAG } from '../ttp/ttp.constants.js';
import { sendError } from '../utils/response.js';

/**
 * ttpFeatureGateMiddleware
 *
 * Blocks access to TTP routes when `ttp_enabled` feature flag is not true.
 * Must be registered as a preHandler after auth middleware.
 *
 * Returns 503 FEATURE_DISABLED if:
 *   - `feature_flags` row for `ttp_enabled` does not exist
 *   - `feature_flags.enabled` is false
 *   - DB read throws (fail-closed)
 *
 * Allows through if:
 *   - `feature_flags.enabled === true`
 */
export async function ttpFeatureGateMiddleware(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key: TTP_FEATURE_FLAG.TTP_ENABLED },
      select: { enabled: true },
    });

    if (flag?.enabled === true) {
      // Feature is enabled — allow request to proceed
      return;
    }
  } catch {
    // DB read error → fail-closed (block access)
  }

  // Flag missing, disabled, or DB error → 503 FEATURE_DISABLED
  return sendError(
    reply,
    'FEATURE_DISABLED',
    'TradeTrust Pay is not enabled for this platform.',
    503,
  ) as unknown as void;
}
