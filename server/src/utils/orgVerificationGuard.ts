/**
 * orgVerificationGuard — Backend transactional gate for organization verification status.
 *
 * POLICY (IMPL-MAINAPP-PENDING-VERIFICATION-BACKEND-STATUS-GATE-01):
 * - Organizations in PENDING_VERIFICATION, VERIFICATION_REJECTED, or
 *   VERIFICATION_NEEDS_MORE_INFO states MUST NOT be able to perform transactional
 *   mutations (checkout, RFQ submission, trade creation, etc.) by calling backend
 *   APIs directly — even with a valid JWT.
 * - Returns 403 ORG_VERIFICATION_REQUIRED if the org is in a blocked status.
 * - Fails closed on DB error or missing org (treats as blocked).
 *
 * USAGE (in mutation handlers, after dbContext null-check):
 *   if (await isOrgVerificationBlocked(dbContext.orgId, reply)) return;
 *
 * ALLOWED statuses: ACTIVE, VERIFICATION_APPROVED, SUSPENDED, CLOSED
 * BLOCKED statuses: PENDING_VERIFICATION, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO
 */

import type { FastifyReply } from 'fastify';
import { prisma } from '../db/prisma.js';
import { sendError } from './response.js';

/**
 * Organization statuses that block transactional mutations.
 * Matches frontend ONBOARDING_STATUS_CONTINUITY set in App.tsx.
 */
const BLOCKED_ORG_STATUSES = new Set([
  'PENDING_VERIFICATION',
  'VERIFICATION_REJECTED',
  'VERIFICATION_NEEDS_MORE_INFO',
]);

const ORG_VERIFICATION_BLOCKED_MESSAGE =
  'Organization verification is required before this action is available.';

/**
 * isOrgVerificationBlocked — Check whether an org's status blocks transactional mutations.
 *
 * @param orgId - Organization UUID (from dbContext.orgId — always JWT-derived)
 * @param reply - Fastify reply (used to send 403 when blocked)
 * @returns true if blocked (reply already sent), false if the request may proceed
 *
 * Fail-closed: missing org or DB error → blocked (returns true, 403 sent).
 */
export async function isOrgVerificationBlocked(
  orgId: string,
  reply: FastifyReply,
): Promise<boolean> {
  try {
    const org = await prisma.organizations.findUnique({
      where: { id: orgId },
      select: { status: true },
    });

    if (!org) {
      // Org not found — fail-closed (should not happen if auth middleware ran correctly)
      sendError(reply, 'ORG_VERIFICATION_REQUIRED', ORG_VERIFICATION_BLOCKED_MESSAGE, 403);
      return true;
    }

    if (BLOCKED_ORG_STATUSES.has(org.status)) {
      sendError(reply, 'ORG_VERIFICATION_REQUIRED', ORG_VERIFICATION_BLOCKED_MESSAGE, 403);
      return true;
    }

    return false;
  } catch {
    // DB error — fail-closed
    sendError(reply, 'ORG_VERIFICATION_REQUIRED', ORG_VERIFICATION_BLOCKED_MESSAGE, 403);
    return true;
  }
}
