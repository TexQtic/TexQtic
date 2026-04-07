/**
 * G-011: Impersonation Service (Doctrine v1.4 compliant)
 *
 * All DB operations run in a single atomic prisma.$transaction under the
 * postgres/BYPASSRLS role (control-plane writes). No SET LOCAL ROLE texqtic_app
 * — impersonation_sessions is a control-plane table protected by admin-only RLS.
 *
 * Revocation note: The stop() method marks endedAt in DB and emits an audit event.
 * The issued JWT's validity is bounded by exp (30 min TTL). Server-side revocation
 * check in tenantAuthMiddleware is out-of-scope for G-011 (middleware is outside
 * allowlist). Revocation is therefore exp-based + audit-documented.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  StartImpersonationRequest,
  StartImpersonationResult,
  ImpersonationSessionStatus,
} from '../types/impersonation.types.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { withAdminContext, withSuperAdminContext } from '../lib/database-context.js';

/** TTL in minutes for impersonation tokens */
const IMPERSONATION_TTL_MINUTES = 30;

export class ImpersonationAbortError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ImpersonationAbortError';
  }
}

/**
 * Start an impersonation session.
 *
 * Validates:
 *  - Target tenant exists and is ACTIVE
 *  - Target userId is a member of orgId
 *
 * Creates:
 *  - ImpersonationSession row (control-plane, postgres BYPASSRLS)
 *  - IMPERSONATION_START audit log entry after the session row persists
 *
 * Returns StartImpersonationResult (JWT signing deferred to route — G-008 pattern).
 */
export async function startImpersonation(
  prisma: PrismaClient,
  adminId: string,
  req: StartImpersonationRequest
): Promise<StartImpersonationResult> {
  const { orgId, userId, reason } = req;

  const result = await withSuperAdminContext(prisma, async tx => {
    // Stop-loss: verify tenant exists and is ACTIVE
    const tenant = await tx.tenant.findUnique({
      where: { id: orgId },
      select: { id: true, status: true },
    });
    if (!tenant) {
      throw new ImpersonationAbortError(`Tenant ${orgId} not found`, 'TENANT_NOT_FOUND');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ImpersonationAbortError(
        `Tenant ${orgId} is not ACTIVE (status: ${tenant.status})`,
        'TENANT_INACTIVE'
      );
    }

    // Stop-loss: verify userId is a member of orgId
    const membership = await tx.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId: orgId } },
      select: { id: true, role: true },
    });
    if (!membership) {
      throw new ImpersonationAbortError(
        `User ${userId} is not a member of org ${orgId}`,
        'USER_NOT_MEMBER'
      );
    }

    // Compute expiry
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MINUTES * 60 * 1000);

    // Create impersonation session
    // Note: ImpersonationSession schema has no userId column — only adminId + tenantId.
    // userId is validated above and embedded in the JWT (not persisted here).
    const session = await tx.impersonationSession.create({
      data: {
        adminId,
        tenantId: orgId, // canonical org UUID — matches Doctrine v1.4 app.org_id
        reason,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    return {
      impersonationId: session.id,
      userId,
      orgId,
      membershipRole: membership.role,
      expiresAt: session.expiresAt,
    };
  });

  // Persist the session row first; admin audit logging remains best-effort and must
  // not poison session continuity if audit_logs RLS rejects the insert in a tx-local context.
  await writeAuditLog(prisma, {
    realm: 'ADMIN',
    tenantId: orgId,
    actorType: 'ADMIN',
    actorId: adminId,
    action: 'IMPERSONATION_START',
    entity: 'impersonation_session',
    entityId: result.impersonationId,
    afterJson: {
      impersonationId: result.impersonationId,
      orgId,
      userId,
      membershipRole: result.membershipRole,
      expiresAt: result.expiresAt.toISOString(),
      reason,
    },
  });

  return result;
}

/**
 * Stop / revoke an impersonation session.
 *
 * Validates:
 *  - Session exists
 *  - Admin owns the session OR is SUPER_ADMIN
 *  - Session is not already ended
 *  - Session is not expired
 *
 * Sets endedAt = now (control-plane DB state update).
 * Writes IMPERSONATION_STOP audit log entry after the session row update succeeds.
 *
 * Note: stop reason is written only to the audit log —
 * ImpersonationSession.reason field stores the start reason only (schema constraint).
 */
export async function stopImpersonation(
  prisma: PrismaClient,
  adminId: string,
  adminRole: string,
  impersonationId: string,
  stopReason: string
): Promise<void> {
  const stopped = await withSuperAdminContext(prisma, async tx => {
    const session = await tx.impersonationSession.findUnique({
      where: { id: impersonationId },
      select: {
        id: true,
        adminId: true,
        tenantId: true,
        endedAt: true,
        expiresAt: true,
      },
    });

    if (!session) {
      throw new ImpersonationAbortError(
        `Impersonation session ${impersonationId} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    // Ownership check: session owner OR SUPER_ADMIN can stop
    if (session.adminId !== adminId && adminRole !== 'SUPER_ADMIN') {
      throw new ImpersonationAbortError(
        'Not authorized to stop this impersonation session',
        'NOT_AUTHORIZED'
      );
    }

    if (session.endedAt !== null) {
      throw new ImpersonationAbortError(
        `Session ${impersonationId} is already ended`,
        'ALREADY_ENDED'
      );
    }

    if (session.expiresAt < new Date()) {
      throw new ImpersonationAbortError(
        `Session ${impersonationId} has already expired`,
        'ALREADY_EXPIRED'
      );
    }

    const endedAt = new Date();

    await tx.impersonationSession.update({
      where: { id: impersonationId },
      data: { endedAt },
    });

    return {
      impersonationId: session.id,
      orgId: session.tenantId,
      endedAt,
    };
  });

  await writeAuditLog(prisma, {
    realm: 'ADMIN',
    tenantId: stopped.orgId,
    actorType: 'ADMIN',
    actorId: adminId,
    action: 'IMPERSONATION_STOP',
    entity: 'impersonation_session',
    entityId: stopped.impersonationId,
    afterJson: {
      impersonationId: stopped.impersonationId,
      orgId: stopped.orgId,
      endedAt: stopped.endedAt.toISOString(),
      stopReason,
    },
  });
}

/**
 * Get impersonation session status.
 * Does not return the token (tokens are single-issuance at start time).
 */
export async function getImpersonationStatus(
  prisma: PrismaClient,
  adminId: string,
  adminRole: string,
  impersonationId: string
): Promise<ImpersonationSessionStatus> {
  return withAdminContext(prisma, async tx => {
    const session = await tx.impersonationSession.findUnique({
      where: { id: impersonationId },
      select: {
        id: true,
        adminId: true,
        tenantId: true,
        endedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!session) {
      throw new ImpersonationAbortError(
        `Impersonation session ${impersonationId} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    // Only the session owner or SUPER_ADMIN can view status
    if (session.adminId !== adminId && adminRole !== 'SUPER_ADMIN') {
      throw new ImpersonationAbortError(
        'Not authorized to view this impersonation session',
        'NOT_AUTHORIZED'
      );
    }

    const now = new Date();
    const active = session.endedAt === null && session.expiresAt > now;

    return {
      impersonationId: session.id,
      adminId: session.adminId,
      orgId: session.tenantId,
      startedAt: session.createdAt,
      expiresAt: session.expiresAt,
      endedAt: session.endedAt,
      active,
    };
  });
}
