/**
 * G-021 — MakerCheckerService
 * Doctrine v1.4 + G-021 v1.1 (APPROVED) + D-021-A/B/C constitutional directives
 *
 * Implements the four public methods of the Maker–Checker approval lifecycle:
 *   1. createApprovalRequest  — Maker submits a pending approval for a PENDING_APPROVAL transition.
 *   2. signApproval           — Checker records an APPROVE or REJECT decision.
 *   3. verifyAndReplay        — Replay an APPROVED transition through StateMachineService.
 *   4. getPendingQueue        — List REQUESTED + ESCALATED approvals for an org.
 *
 * Constitutional guarantees (this service = Layer 1; DB = Layers 2–3):
 *   D-021-A: Payload hash computed at request creation, verified before replay.
 *            Mismatch → PAYLOAD_INTEGRITY_VIOLATION (replay is blocked).
 *   D-021-B: Duplicate active requests caught as ACTIVE_REQUEST_EXISTS (P2002 from DB).
 *            DB unique partial index is the backstop.
 *   D-021-C: Maker≠Checker enforced here (fingerprint comparison) AND by DB trigger
 *            check_maker_checker_separation (AFTER INSERT on approval_signatures, P0002).
 *            Even if this check is bypassed, the DB trigger fires unconditionally.
 *
 * Not implemented here (deferred):
 *   - Escalation creation → G-022 (EscalationService).
 *   - Expiry sweeping → G-023 cron job.
 *   - CERTIFICATION log writes → G-023.
 */

import type { PrismaClient } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';
import type {
  CreateApprovalRequestInput,
  SignApprovalInput,
  VerifyAndReplayInput,
  CreateApprovalResult,
  SignApprovalResult,
  VerifyReplayResult,
  PendingApprovalRow,
  ApprovalSignatureRow,
} from './makerChecker.types.js';
import {
  computePayloadHash,
  computeMakerFingerprint,
  computeSignerFingerprint,
  computeExpiresAt,
  isExpired,
  recomputePayloadHash,
  verifyPayloadHash,
} from './makerChecker.guardrails.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if the error is a Prisma unique-constraint violation (P2002).
 * Used to detect D-021-B duplicate active-request insertion attempts.
 */
function isPrismaUniqueViolation(err: unknown): boolean {
  // Duck-type check: real Prisma P2002 errors extend Error with code = 'P2002'.
  // Using duck typing avoids importing the Prisma namespace value at module level,
  // which lets the test file run without @prisma/client in root node_modules.
  return (
    err instanceof Error &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}

/**
 * Returns true if the error is a DB trigger P0002 exception (D-021-C).
 * Postgres raises SQLSTATE 42000 with message containing 'MAKER_CHECKER_SAME_PRINCIPAL'.
 * Prisma surfaces this as PrismaClientUnknownRequestError or a raw Error.
 */
function isMakerCheckerSamePrincipalError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message ?? '';
    return msg.includes('MAKER_CHECKER_SAME_PRINCIPAL') || msg.includes('P0002');
  }
  return false;
}

// ─── MakerCheckerService ──────────────────────────────────────────────────────

export class MakerCheckerService {
  /**
   * @param db           - Prisma client (injected for testability).
   * @param stateMachine - StateMachineService (injected; used only in verifyAndReplay).
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
  ) {}

  // ─── Method 1: createApprovalRequest ───────────────────────────────────────

  /**
   * Record an in-flight Maker–Checker approval request.
   *
   * Called by the application layer immediately after StateMachineService.transition()
   * returns { status: 'PENDING_APPROVAL' }. The caller MUST pass the same
   * CreateApprovalRequestInput used to compute the PENDING_APPROVAL result.
   *
   * Steps:
   *   1. Compute D-021-A frozen_payload_hash from canonical fields.
   *   2. Compute D-021-C maker_principal_fingerprint.
   *   3. Compute expires_at from severityLevel TTL.
   *   4. Write pending_approvals row via Prisma.
   *   5. On P2002 → ACTIVE_REQUEST_EXISTS (D-021-B backstop triggered).
   *
   * @returns CreateApprovalResult (CREATED | ACTIVE_REQUEST_EXISTS | ERROR)
   */
  async createApprovalRequest(
    input: CreateApprovalRequestInput,
  ): Promise<CreateApprovalResult> {
    try {
      // D-021-A: hash
      const frozenPayloadHash = computePayloadHash(input);

      // D-021-C: maker fingerprint
      const makerPrincipalFingerprint = computeMakerFingerprint(input);

      // TTL
      const expiresAt = computeExpiresAt(input.severityLevel);

      const row = await this.db.pendingApproval.create({
        data: {
          orgId:                    input.orgId,
          entityType:               input.entityType,
          entityId:                 input.entityId,
          fromStateKey:             input.fromStateKey.toUpperCase(),
          toStateKey:               input.toStateKey.toUpperCase(),
          requestedByUserId:        input.requestedByUserId ?? null,
          requestedByAdminId:       input.requestedByAdminId ?? null,
          requestedByActorType:     input.requestedByActorType,
          requestedByRole:          input.requestedByRole,
          requestReason:            input.requestReason,
          status:                   'REQUESTED',
          expiresAt,
          frozenPayloadHash,
          makerPrincipalFingerprint,
          frozenPayload:            input.frozenPayload as object,
          attemptCount:             1,
          aiTriggered:              input.aiTriggered ?? false,
          impersonationId:          input.impersonationId ?? null,
          requestId:                input.requestId ?? null,
        },
      });

      return {
        status: 'CREATED',
        approvalId: row.id,
        expiresAt: row.expiresAt,
      };
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        // D-021-B: one active (REQUESTED|ESCALATED) request per entity+transition per org
        return {
          status: 'ACTIVE_REQUEST_EXISTS',
          code: 'PRINCIPAL_EXCLUSIVITY_VIOLATION',
          message:
            'An active approval request (REQUESTED or ESCALATED) already exists for ' +
            `entity ${input.entityId} transition ${input.fromStateKey}→${input.toStateKey} ` +
            `in org ${input.orgId}. D-021-B prevents concurrent duplicate requests.`,
        };
      }

      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB write failed: ${err.message}`
            : 'Unknown error during createApprovalRequest',
      };
    }
  }

  // ─── Method 2: signApproval ────────────────────────────────────────────────

  /**
   * Record a Checker APPROVE or REJECT decision on a pending approval.
   *
   * Steps:
   *   1. Fetch the pending_approvals row.
   *   2. Verify status === 'REQUESTED' (only REQUESTED rows accept signatures).
   *   3. Check expiry — expired rows return APPROVAL_EXPIRED (not signed).
   *   4. D-021-C (Layer 1): Compare signer fingerprint vs maker fingerprint.
   *      If match → MAKER_CHECKER_SAME_PRINCIPAL (before attempting DB write).
   *   5. Insert approval_signatures row.
   *      DB D-021-C trigger fires (AFTER INSERT) as Layer 2 backstop.
   *   6. Update pending_approvals.status to APPROVED or REJECTED.
   *
   * @returns SignApprovalResult (APPROVED | REJECTED | ERROR)
   */
  async signApproval(input: SignApprovalInput): Promise<SignApprovalResult> {
    // Step 1: Fetch approval
    let approval: PendingApprovalRow | null;
    try {
      approval = (await this.db.pendingApproval.findUnique({
        where: { id: input.approvalId },
      })) as PendingApprovalRow | null;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB read failed: ${err.message}`
            : 'Unknown error fetching approval',
      };
    }

    if (!approval) {
      return {
        status: 'ERROR',
        code: 'APPROVAL_NOT_FOUND',
        message: `Approval ${input.approvalId} not found.`,
      };
    }

    // Step 2: Status gate (only REQUESTED accepts new signatures)
    if (approval.status !== 'REQUESTED') {
      return {
        status: 'ERROR',
        code: 'APPROVAL_NOT_ACTIVE',
        message:
          `Approval ${input.approvalId} has status "${approval.status}". ` +
          'Only REQUESTED approvals can receive signatures.',
      };
    }

    // Step 3: Expiry gate
    if (isExpired(approval.expiresAt)) {
      return {
        status: 'ERROR',
        code: 'APPROVAL_EXPIRED',
        message:
          `Approval ${input.approvalId} expired at ${approval.expiresAt.toISOString()}. ` +
          'Create a new approval request.',
      };
    }

    // Step 4: D-021-C Layer 1 — service-level fingerprint comparison
    const signerFingerprint = computeSignerFingerprint(
      input.signerActorType,
      input.signerUserId,
      input.signerAdminId,
    );
    if (signerFingerprint === approval.makerPrincipalFingerprint) {
      return {
        status: 'ERROR',
        code: 'MAKER_CHECKER_SAME_PRINCIPAL',
        message:
          `D-021-C violation: signer fingerprint "${signerFingerprint}" matches ` +
          `maker fingerprint on approval ${input.approvalId}. ` +
          'The same principal cannot be both Maker and Checker.',
      };
    }

    // Step 5: Insert signature (DB trigger fires as Layer 2 D-021-C backstop)
    try {
      await this.db.approvalSignature.create({
        data: {
          approvalId:      input.approvalId,
          orgId:           approval.orgId,
          signerUserId:    input.signerUserId ?? null,
          signerAdminId:   input.signerAdminId ?? null,
          signerActorType: input.signerActorType,
          signerRole:      input.signerRole,
          decision:        input.decision,
          reason:          input.reason,
          impersonationId: input.impersonationId ?? null,
        },
      });
    } catch (err) {
      if (isMakerCheckerSamePrincipalError(err)) {
        // DB trigger fired — surface the same error code
        return {
          status: 'ERROR',
          code: 'MAKER_CHECKER_SAME_PRINCIPAL',
          message:
            `D-021-C DB trigger violation on approval ${input.approvalId}: ` +
            'Maker and Checker fingerprints match at database level.',
        };
      }
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `Signature insert failed: ${err.message}`
            : 'Unknown error during signApproval signature insert',
      };
    }

    // Step 6: Update approval status
    const newStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    try {
      await this.db.pendingApproval.update({
        where: { id: input.approvalId },
        data:  { status: newStatus },
      });
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `Status update failed after signature: ${err.message}`
            : 'Unknown error updating approval status',
      };
    }

    if (input.decision === 'APPROVE') {
      return { status: 'APPROVED' as const, approvalId: input.approvalId, decision: 'APPROVE' as const };
    } else {
      return { status: 'REJECTED' as const, approvalId: input.approvalId, decision: 'REJECT' as const };
    }
  }

  // ─── Method 3: verifyAndReplay ─────────────────────────────────────────────

  /**
   * Verify payload integrity (D-021-A) and replay the approved transition
   * through StateMachineService.
   *
   * Steps:
   *   1. Fetch pending_approvals row (with signatures).
   *   2. Verify status === 'APPROVED'.
   *   3. Verify not expired.
   *   4. D-021-A: Recompute hash from stored canonical fields, compare vs stored hash.
   *      Mismatch → PAYLOAD_INTEGRITY_VIOLATION (replay blocked unconditionally).
   *   5. Find the APPROVE signature (must exist — APPROVED implies one was recorded).
   *   6. Call stateMachine.transition() with CHECKER actor type.
   *      reason = "CHECKER_APPROVAL:{approvalId}|{signature reason}"
   *      requestId = "replay:{approvalId}:{signatureId}"
   *
   * @returns VerifyReplayResult (APPLIED | ERROR)
   */
  async verifyAndReplay(input: VerifyAndReplayInput): Promise<VerifyReplayResult> {
    // Step 1: Fetch approval + signatures
    let approval: (PendingApprovalRow & { signatures: ApprovalSignatureRow[] }) | null;
    try {
      approval = (await this.db.pendingApproval.findUnique({
        where:   { id: input.approvalId },
        include: { signatures: true },
      })) as (PendingApprovalRow & { signatures: ApprovalSignatureRow[] }) | null;
    } catch (err) {
      return {
        status: 'ERROR',
        code:   'DB_ERROR',
        message:
          err instanceof Error
            ? `DB read failed: ${err.message}`
            : 'Unknown error fetching approval for replay',
      };
    }

    if (!approval) {
      return {
        status: 'ERROR',
        code:   'APPROVAL_NOT_FOUND',
        message: `Approval ${input.approvalId} not found.`,
      };
    }

    // Step 2: Must be APPROVED
    if (approval.status !== 'APPROVED') {
      return {
        status: 'ERROR',
        code:   'APPROVAL_NOT_APPROVED',
        message:
          `Approval ${input.approvalId} has status "${approval.status}". ` +
          'Only APPROVED approvals can be replayed.',
      };
    }

    // Step 3: Expiry check
    if (isExpired(approval.expiresAt)) {
      return {
        status: 'ERROR',
        code:   'APPROVAL_EXPIRED',
        message:
          `Approval ${input.approvalId} expired at ${approval.expiresAt.toISOString()}. ` +
          'An expired approval cannot be replayed even if APPROVED. ' +
          'Create a new approval cycle.',
      };
    }

    // Step 4: D-021-A payload integrity verification
    const computed = recomputePayloadHash({
      entityType:           approval.entityType,
      entityId:             approval.entityId,
      fromStateKey:         approval.fromStateKey,
      toStateKey:           approval.toStateKey,
      requestedByActorType: approval.requestedByActorType,
      principalId:          (approval.requestedByUserId ?? approval.requestedByAdminId)!,
      requestedByRole:      approval.requestedByRole,
      requestReason:        approval.requestReason,
    });
    const hashCheck = verifyPayloadHash(computed, approval.frozenPayloadHash);
    if (!hashCheck.valid) {
      return {
        status:  'ERROR',
        code:    'PAYLOAD_INTEGRITY_VIOLATION',
        message:
          `D-021-A violation on approval ${input.approvalId}: ` +
          'Recomputed payload hash does not match stored frozen_payload_hash. ' +
          `Computed: ${hashCheck.computed}. Stored: ${hashCheck.stored}. ` +
          'Payload may have been tampered with. Replay is permanently blocked. ' +
          'Open a security incident and create a new approval cycle.',
      };
    }

    // Step 5: Find the APPROVE signature
    const approveSig = approval.signatures.find(s => s.decision === 'APPROVE');
    if (!approveSig) {
      // This should be unreachable if status transitions are correct, but guard defensively
      return {
        status:  'ERROR',
        code:    'APPROVAL_NOT_APPROVED',
        message: `Approval ${input.approvalId} is APPROVED but no APPROVE signature found. Data integrity error.`,
      };
    }

    // Step 6: Replay through StateMachineService
    // The Checker acts with their own credentials; the original Maker's userId is preserved
    // in the reason chain for audit linkage.
    const replayReason = `CHECKER_APPROVAL:${input.approvalId}|${approveSig.reason}`;
    const replayRequestId = `replay:${input.approvalId}:${approveSig.id}`;

    const replayResult = await this.stateMachine.transition({
      orgId:        approval.orgId,
      entityType:   approval.entityType as 'TRADE' | 'ESCROW' | 'CERTIFICATION',
      entityId:     approval.entityId,
      fromStateKey: approval.fromStateKey,
      toStateKey:   approval.toStateKey,
      actorType:    'CHECKER',
      // Checker identity
      actorUserId:  approveSig.signerUserId ?? undefined,
      actorAdminId: approveSig.signerAdminId ?? undefined,
      actorRole:    approveSig.signerRole,
      reason:       replayReason,
      requestId:    replayRequestId,
      // Pass through Maker's userId for impersonation audit chain
      makerUserId:  approval.requestedByUserId ?? undefined,
    });

    if (replayResult.status !== 'APPLIED') {
      return {
        status:  'ERROR',
        code:    'REPLAY_TRANSITION_DENIED',
        message:
          `StateMachineService denied replay for approval ${input.approvalId}. ` +
          `StateMachine status: ${replayResult.status}. ` +
          `Code: ${(replayResult as { code?: string }).code ?? 'N/A'}.`,
      };
    }

    return {
      status:     'APPLIED',
      approvalId: input.approvalId,
    };
  }

  // ─── Method 4: getPendingQueue ─────────────────────────────────────────────

  /**
   * List all REQUESTED and ESCALATED approval requests for an org.
   * Ordered by expires_at ASC (most urgent first).
   * Pagination not implemented in Day 2 — G-021 Day 3 concern.
   *
   * @param orgId - Tenant org UUID (caller must supply authenticated org_id).
   * @returns Array of PendingApprovalRow in ascending expiry order.
   */
  async getPendingQueue(orgId: string): Promise<PendingApprovalRow[]> {
    const rows = await this.db.pendingApproval.findMany({
      where:   { orgId, status: { in: ['REQUESTED', 'ESCALATED'] } },
      orderBy: { expiresAt: 'asc' },
    });
    return rows as PendingApprovalRow[];
  }
}
