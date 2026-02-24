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
  ApprovalQueueQuery,
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
import type { EscalationService } from './escalation.service.js';
import { GovError } from './escalation.types.js';

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

/**
 * Returns true if the error is a Postgres LockNotAvailable error (SQLSTATE 55P03).
 * Raised by SELECT ... FOR UPDATE NOWAIT when the row is already locked.
 */
function isLockNotAvailableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message ?? '';
    return msg.includes('could not obtain lock') || msg.includes('55P03');
  }
  return false;
}

// ─── MakerCheckerService ──────────────────────────────────────────────────────

export class MakerCheckerService {
  /**
   * @param db                - Prisma client (injected for testability).
   * @param stateMachine      - StateMachineService (injected; used only in verifyAndReplay).
   * @param escalationService - EscalationService (optional). When provided, freeze checks
   *                            run in verifyAndReplay() before SM.transition() call
   *                            (G-022 Gate D integration). Null = skip (backward compat).
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
    private readonly escalationService?: EscalationService | null,
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
   * Day 3 upgrades:
   *   - Caller actor type validation (SYSTEM_AUTOMATION blocked).
   *   - Org ID match check against the loaded row.
   *   - Idempotency: SELECT FOR UPDATE NOWAIT on pending_approvals row +
   *     lifecycle log marker check. Marker = "APPROVAL_ID:{approvalId}" in reason.
   *   - Reason format: "CHECKER_APPROVAL:{id}|APPROVAL_ID:{id}|FROZEN_HASH:{hash}|{signerReason}"
   *   - aiTriggered forced false unconditionally.
   *   - Returns transitionId from StateMachineService on APPLIED.
   *
   * Steps:
   *   0. Validate callerActorType (if provided): SYSTEM_AUTOMATION → REPLAY_TRANSITION_DENIED.
   *   1. Fetch pending_approvals row (with signatures).
   *   1b. Org ID match check.
   *   2. Verify status === 'APPROVED'.
   *   3. Verify not expired.
   *   4. D-021-A: Recompute hash, compare vs stored. Mismatch → HASH_MISMATCH.
   *   5. Find the APPROVE signature.
   *   6. Idempotency lock + marker check via DB transaction.
   *   7. Call stateMachine.transition() with CHECKER actor type.
   *
   * @returns VerifyReplayResult (APPLIED | ERROR)
   */
  async verifyAndReplay(input: VerifyAndReplayInput): Promise<VerifyReplayResult> {
    // Step 0: Caller actor type guard — SYSTEM_AUTOMATION cannot replay
    // SignerActorType = 'CHECKER' | 'PLATFORM_ADMIN', so this only fires if
    // caller passes an invalid value via unsafe cast (defense-in-depth).
    if (
      input.callerActorType != null &&
      (input.callerActorType as string) === 'SYSTEM_AUTOMATION'
    ) {
      return {
        status:  'ERROR',
        code:    'REPLAY_TRANSITION_DENIED',
        message: 'SYSTEM_AUTOMATION is not permitted to trigger approval replay. ' +
                 'Only CHECKER or PLATFORM_ADMIN actors may call verifyAndReplay.',
      };
    }

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
        status:  'ERROR',
        code:    'APPROVAL_NOT_FOUND',
        message: `Approval ${input.approvalId} not found.`,
      };
    }

    // Step 1b: Org ID match check
    if (input.orgId != null && approval.orgId !== input.orgId) {
      return {
        status:  'ERROR',
        code:    'APPROVAL_NOT_FOUND',
        message: `Approval ${input.approvalId} does not belong to org ${input.orgId}. ` +
                 'Cross-tenant replay is forbidden.',
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
      return {
        status:  'ERROR',
        code:    'APPROVAL_NOT_APPROVED',
        message: `Approval ${input.approvalId} is APPROVED but no APPROVE signature found. Data integrity error.`,
      };
    }

    // Step 6: Idempotency — acquire row-level lock + check lifecycle log for replay marker.
    //
    // Strategy (no schema change required):
    //   a) SELECT FOR UPDATE NOWAIT on pending_approvals row → serialises concurrent replays.
    //   b) Query the entity-type-specific lifecycle log for an entry whose reason contains
    //      the marker "APPROVAL_ID:{approvalId}". SM writes this marker during the first replay.
    //   c) If marker found → ALREADY_REPLAYED (idempotent guard).
    //   d) If not found → release lock → call SM (writes marker into lifecycle log reason).
    //   e) Next concurrent caller: acquires lock after first commits, then sees the marker.
    //
    // Limitation: CERTIFICATION entity type has no lifecycle log (G-023 deferred).
    //   Attempts on CERTIFICATION approvals skip the marker check and allow replay.
    //   This is accepted: CERTIFICATION state machine transitions currently return
    //   CERTIFICATION_LOG_DEFERRED from SM anyway (safe no-op).
    let alreadyReplayed = false;
    try {
      await (this.db as unknown as {
        $transaction: (fn: (tx: PrismaClient) => Promise<void>) => Promise<void>;
      }).$transaction(async (tx: PrismaClient) => {
        // Lock the row to prevent concurrent replay of the same approval
        await (tx as unknown as {
          $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
        }).$queryRaw`SELECT id FROM pending_approvals WHERE id = ${input.approvalId}::uuid FOR UPDATE NOWAIT`;

        alreadyReplayed = await this.checkReplayMarker(tx, approval!, input.approvalId);
      });
    } catch (err) {
      if (isLockNotAvailableError(err)) {
        return {
          status:  'ERROR',
          code:    'DB_ERROR',
          message:
            `Concurrent replay detected for approval ${input.approvalId}. ` +
            'Another replay is in progress. Try again in a moment.',
        };
      }
      return {
        status:  'ERROR',
        code:    'DB_ERROR',
        message:
          err instanceof Error
            ? `Idempotency check failed: ${err.message}`
            : 'Unknown error during idempotency check',
      };
    }

    if (alreadyReplayed) {
      return {
        status:  'ERROR',
        code:    'ALREADY_REPLAYED',
        message:
          `Approval ${input.approvalId} has already been replayed. ` +
          'Idempotency marker "APPROVAL_ID:{id}" found in lifecycle log. ' +
          `Current approval status: ${approval.status}. Duplicate replay is blocked.`,
      };
    }

    // Step 7: Replay through StateMachineService.
    //
    // G-022 precondition hooks: check org-level and entity-level freeze BEFORE
    // calling SM.transition(). These run after all G-021 validations are complete.
    // D-022-D: Freeze checks run here (inside verifyAndReplay) so that even
    // a fully APPROVED approval cannot replay on a frozen entity/org.
    if (this.escalationService) {
      try {
        await this.escalationService.checkOrgFreeze(approval.orgId);
        await this.escalationService.checkEntityFreeze(approval.entityType, approval.entityId);
      } catch (err) {
        if (err instanceof GovError) {
          return {
            status:  'ERROR',
            code:    'REPLAY_TRANSITION_DENIED',
            message: `G-022 Freeze blocked replay for approval ${input.approvalId}: ${err.message}`,
          };
        }
        throw err; // unexpected DB error — re-throw
      }
    }

    // Reason format (Day 3): includes idempotency marker + D-021-A hash anchor.
    //   "CHECKER_APPROVAL:{id}|APPROVAL_ID:{id}|FROZEN_HASH:{hash}|{signerReason}"
    //
    // aiTriggered is unconditionally false — AI has no authority over approval replay.
    // The APPROVE signature was already written by a human Checker (signApproval).
    const replayReason =
      `CHECKER_APPROVAL:${input.approvalId}|` +
      `APPROVAL_ID:${input.approvalId}|` +
      `FROZEN_HASH:${approval.frozenPayloadHash}|` +
      approveSig.reason;
    const replayRequestId = `replay:${input.approvalId}:${approveSig.id}`;

    const replayResult = await this.stateMachine.transition({
      orgId:         approval.orgId,
      entityType:    approval.entityType as 'TRADE' | 'ESCROW' | 'CERTIFICATION',
      entityId:      approval.entityId,
      fromStateKey:  approval.fromStateKey,
      toStateKey:    approval.toStateKey,
      actorType:     'CHECKER',
      actorUserId:   approveSig.signerUserId ?? undefined,
      actorAdminId:  approveSig.signerAdminId ?? undefined,
      actorRole:     approveSig.signerRole,
      reason:        replayReason,
      requestId:     replayRequestId,
      makerUserId:   approval.requestedByUserId ?? undefined,
      checkerUserId: approveSig.signerUserId ?? undefined,
      aiTriggered:   false,  // unconditional — AI has no replay authority
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
      status:       'APPLIED',
      approvalId:   input.approvalId,
      transitionId: (replayResult as { transitionId?: string }).transitionId,
    };
  }

  // ─── Private: checkReplayMarker ────────────────────────────────────────────

  /**
   * Check whether a replay marker exists in the entity-type-specific lifecycle log.
   * The marker is "APPROVAL_ID:{approvalId}" embedded in the reason field by SM.
   *
   * Called inside a $transaction to ensure atomicity with the FOR UPDATE lock.
   *
   * @returns true if this approval has already been replayed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async checkReplayMarker(tx: any, approval: PendingApprovalRow, approvalId: string): Promise<boolean> {
    const marker = `APPROVAL_ID:${approvalId}`;

    if (approval.entityType === 'TRADE') {
      const existing = await tx.tradeLifecycleLog.findFirst({
        where: {
          orgId:        approval.orgId,
          tradeId:      approval.entityId,
          fromStateKey: approval.fromStateKey,
          toStateKey:   approval.toStateKey,
          reason:       { contains: marker },
        },
        select: { id: true },
      });
      return existing !== null;
    }

    if (approval.entityType === 'ESCROW') {
      const existing = await tx.escrowLifecycleLog.findFirst({
        where: {
          orgId:        approval.orgId,
          escrowId:     approval.entityId,
          fromStateKey: approval.fromStateKey,
          toStateKey:   approval.toStateKey,
          reason:       { contains: marker },
        },
        select: { id: true },
      });
      return existing !== null;
    }

    // CERTIFICATION: lifecycle log deferred to G-023 — no marker check possible.
    // SM transition() returns CERTIFICATION_LOG_DEFERRED anyway (safe path).
    return false;
  }

  // ─── Method 4: getPendingQueue ─────────────────────────────────────────────

  /**
   * List all REQUESTED and ESCALATED approval requests for an org (tenant scope).
   * Ordered by expires_at ASC (most urgent first).
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

  // ─── Method 5: getApprovalById (Day 3) ────────────────────────────────────

  /**
   * Fetch a single pending_approvals row by ID with its signatures.
   * Optionally validates orgId to prevent cross-tenant access.
   *
   * @param approvalId - UUID of the pending_approvals record.
   * @param orgId      - If provided, returns null if the row belonds to a different org.
   * @returns The row (with signatures) or null if not found / org mismatch.
   */
  async getApprovalById(
    approvalId: string,
    orgId?: string,
  ): Promise<(PendingApprovalRow & { signatures: ApprovalSignatureRow[] }) | null> {
    const row = (await this.db.pendingApproval.findUnique({
      where:   { id: approvalId },
      include: { signatures: true },
    })) as (PendingApprovalRow & { signatures: ApprovalSignatureRow[] }) | null;

    if (!row) return null;
    if (orgId != null && row.orgId !== orgId) return null;

    return row;
  }

  // ─── Method 6: getControlPlaneQueue (Day 3) ───────────────────────────────

  /**
   * List approval requests for control-plane admin view.
   * Supports cross-org filtering (CONTROL_PLANE scope) or org-scoped (TENANT scope).
   *
   * For TENANT scope: orgId is required (same as getPendingQueue, plus optional filters).
   * For CONTROL_PLANE scope: orgId is optional — if omitted, returns across all orgs.
   *
   * Ordered by expires_at ASC (most urgent first).
   *
   * @param query - ApprovalQueueQuery filter set.
   * @returns Array of PendingApprovalRow matching the filters.
   */
  async getControlPlaneQueue(query: ApprovalQueueQuery): Promise<PendingApprovalRow[]> {
    const effectiveStatuses: string[] =
      query.status && query.status.length > 0
        ? query.status
        : ['REQUESTED', 'ESCALATED'];

    // Build where clause dynamically
    const where: Record<string, unknown> = {
      status: { in: effectiveStatuses },
    };

    if (query.orgId) {
      where['orgId'] = query.orgId;
    }
    if (query.entityType) {
      where['entityType'] = query.entityType;
    }

    const rows = await this.db.pendingApproval.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where:   where as any,
      orderBy: { expiresAt: 'asc' },
    });

    return rows as PendingApprovalRow[];
  }
}
