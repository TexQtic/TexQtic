/**
 * NetworkPoolRfqService — TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-SERVICE-001
 *
 * Service layer for issuing a Network Commerce Pool RFQ.
 *
 * Authorized methods:
 *   issueRfq — transition pool AGGREGATING → CLOSED_FOR_BIDS and create NetworkPoolRfq + lines
 *
 * Design decisions:
 *   TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-DECISION-RECORD-001 (commit caac5a0)
 *
 * Key constraints:
 *   Q-1: SM transition + pool.lifecycleStateId update in shared $transaction (openNetworkPool pattern).
 *   Q-2: Latest CAPTURED snapshot only; no caller-supplied snapshot_id.
 *   Q-3: response_deadline_at optional, nullable, unenforced in v1.
 *   Q-4: rfqRef = randomUUID(), service-generated.
 *   Q-5: SM denial → 422 TRANSITION_DENIED (mapped at route layer — throw here, catch at route).
 *   Supplier invite: DEFERRED (v1 only — INVITE_ONLY placeholder stored).
 *   metadataInternalJson: null always; never returned in DTO.
 *
 * D-017-A: ownerOrgId and userId are ALWAYS sourced from JWT/dbContext — never from caller body.
 */

import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class NetworkPoolRfqInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolRfqInvalidInputError';
  }
}

export class NetworkPoolRfqPoolNotFoundError extends Error {
  constructor() {
    super('Network pool not found or not owned by this organisation');
    this.name = 'NetworkPoolRfqPoolNotFoundError';
  }
}

export class NetworkPoolRfqInvalidPoolStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolRfqInvalidPoolStateError';
  }
}

export class NetworkPoolRfqSnapshotNotFoundError extends Error {
  constructor(detail?: string) {
    super(
      detail ??
        'No CAPTURED snapshot found for this pool. Lock demand lines before issuing an RFQ.',
    );
    this.name = 'NetworkPoolRfqSnapshotNotFoundError';
  }
}

export class NetworkPoolRfqAlreadyIssuedError extends Error {
  constructor() {
    super('An RFQ has already been issued for this pool.');
    this.name = 'NetworkPoolRfqAlreadyIssuedError';
  }
}

export class NetworkPoolRfqTransitionDeniedError extends Error {
  constructor(code: string, message: string) {
    super(`Lifecycle transition denied [${code}]: ${message}`);
    this.name = 'NetworkPoolRfqTransitionDeniedError';
  }
}

export class NetworkPoolRfqConflictError extends Error {
  constructor(target: string) {
    super(`RFQ conflict — unique constraint violation on: ${target}`);
    this.name = 'NetworkPoolRfqConflictError';
  }
}

export class NetworkPoolRfqRfqNotFoundError extends Error {
  constructor() {
    super('Network pool RFQ not found or not owned by this organisation');
    this.name = 'NetworkPoolRfqRfqNotFoundError';
  }
}

export class NetworkPoolRfqSupplierInviteInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolRfqSupplierInviteInvalidInputError';
  }
}

export class NetworkPoolRfqSupplierInviteNotFoundError extends Error {
  constructor() {
    super('Supplier invite not found or not owned by this organisation');
    this.name = 'NetworkPoolRfqSupplierInviteNotFoundError';
  }
}

export class NetworkPoolRfqSupplierInviteAlreadySentError extends Error {
  constructor() {
    super(
      'A supplier invite for this (RFQ, supplier) pair already exists. ' +
      'Re-invite is not permitted in Phase 1B (OD-1).',
    );
    this.name = 'NetworkPoolRfqSupplierInviteAlreadySentError';
  }
}

export class NetworkPoolRfqSupplierInviteInvalidTransitionError extends Error {
  constructor(effectiveStatus: string) {
    super(
      `Cannot cancel invite with effective status '${effectiveStatus}'. ` +
      `Only PENDING invites may be cancelled.`,
    );
    this.name = 'NetworkPoolRfqSupplierInviteInvalidTransitionError';
  }
}

// ─── Supplier Quote Error Classes ─────────────────────────────────────────────

export class NetworkPoolRfqSupplierQuoteInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolRfqSupplierQuoteInvalidInputError';
  }
}

export class NetworkPoolRfqSupplierQuoteNotFoundError extends Error {
  constructor() {
    super('Supplier quote not found or not owned by this organisation');
    this.name = 'NetworkPoolRfqSupplierQuoteNotFoundError';
  }
}

export class NetworkPoolRfqSupplierQuoteConflictError extends Error {
  constructor() {
    super(
      'A quote for this invite already exists. ' +
      'Re-submission is not permitted in Phase 1C (QD-2).',
    );
    this.name = 'NetworkPoolRfqSupplierQuoteConflictError';
  }
}

export class NetworkPoolRfqSupplierQuoteInviteNotAcceptedError extends Error {
  constructor(effectiveStatus: string) {
    super(
      `Cannot submit a quote for invite with effective status '${effectiveStatus}'. ` +
      `Only ACCEPTED invites may be quoted against (QD-1).`,
    );
    this.name = 'NetworkPoolRfqSupplierQuoteInviteNotAcceptedError';
  }
}

// ─── Phase 1D: Owner Quote Award Error Classes ────────────────────────────────

export class NetworkPoolRfqOwnerQuoteNotFoundError extends Error {
  constructor() {
    super('Supplier quote not found for this RFQ and pool owner.');
    this.name = 'NetworkPoolRfqOwnerQuoteNotFoundError';
  }
}

export class NetworkPoolRfqSupplierQuoteNotInSubmittedError extends Error {
  constructor(currentStatus: string) {
    super(
      `Quote cannot be accepted or rejected: current status is '${currentStatus}'. ` +
      `Only SUBMITTED quotes may be acted on.`,
    );
    this.name = 'NetworkPoolRfqSupplierQuoteNotInSubmittedError';
  }
}

// ─── G-021: Award Maker-Checker Error Classes ─────────────────────────────────

export class NetworkPoolRfqAwardRequestAlreadyPendingError extends Error {
  constructor() {
    super('An award approval request is already pending or escalated for this quote transition.');
    this.name = 'NetworkPoolRfqAwardRequestAlreadyPendingError';
  }
}

export class NetworkPoolRfqApprovalNotFoundError extends Error {
  constructor() {
    super('Pending approval not found for this organisation.');
    this.name = 'NetworkPoolRfqApprovalNotFoundError';
  }
}

export class NetworkPoolRfqApprovalAlreadyDecidedError extends Error {
  constructor(currentStatus: string) {
    super(`Approval has already been decided. Current status: '${currentStatus}'.`);
    this.name = 'NetworkPoolRfqApprovalAlreadyDecidedError';
  }
}

export class NetworkPoolRfqApprovalExpiredError extends Error {
  constructor() {
    super('The award approval request has expired and can no longer be acted on.');
    this.name = 'NetworkPoolRfqApprovalExpiredError';
  }
}

export class NetworkPoolRfqMakerCheckerSameActorError extends Error {
  constructor() {
    super('Maker-checker separation violation: the checker cannot be the same user as the maker.');
    this.name = 'NetworkPoolRfqMakerCheckerSameActorError';
  }
}

export class NetworkPoolRfqQuoteNoLongerSubmittedError extends Error {
  constructor(currentStatus: string) {
    super(`Quote is no longer SUBMITTED; cannot complete award. Current status: '${currentStatus}'.`);
    this.name = 'NetworkPoolRfqQuoteNoLongerSubmittedError';
  }
}

// ─── Input / Record Types ─────────────────────────────────────────────────────

export interface IssueNetworkPoolRfqInput {
  /** UUID of the pool to issue the RFQ against. Required. */
  pool_id: string;
  /** Optional free-text reason for issuing the RFQ. */
  issue_reason?: string | null;
  /** Optional deadline for supplier responses. Nullable; not enforced in v1. */
  response_deadline_at?: string | Date | null;
}

/** Header-only RFQ record returned after issue. Lines and metadataInternalJson are excluded. */
export interface NetworkPoolRfqRecord {
  id: string;
  owner_org_id: string;
  pool_id: string;
  snapshot_id: string;
  rfq_ref: string;
  rfq_version: number;
  status: string;
  issue_basis: string;
  issued_at: string;
  issued_by_user_id: string | null;
  issue_reason: string | null;
  response_deadline_at: string | null;
  supplier_invite_mode: string;
  line_count: number;
  total_qty: string | null;
  qty_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendInviteInput {
  /** UUID of the pool. Required. */
  pool_id:           string;
  /** UUID of the issued RFQ. Required. */
  rfq_id:            string;
  /** UUID of the supplier organisation to invite. Required. */
  supplier_org_id:   string;
  /** OD-3: Optional expiry. Inherits rfq.responseDeadlineAt when absent and RFQ has one. */
  expires_at?:       string | Date | null;
  /** Optional message from owner to supplier. */
  supplier_message?: string | null;
  /** Optional Fastify request ID for log correlation (OD-7). */
  request_id?:       string | null;
}

/** Owner-safe supplier invite record. OD-5: metadataInternalJson is never included. */
export interface NetworkPoolRfqSupplierInviteRecord {
  id:                  string;
  owner_org_id:        string;
  supplier_org_id:     string;
  rfq_id:              string;
  pool_id:             string;
  invite_ref:          string;
  /** OD-2: Effective status. May be 'EXPIRED' even when DB status is 'PENDING'. */
  status:              string;
  invited_at:          string;
  invited_by_user_id:  string | null;
  accepted_at:         string | null;
  declined_at:         string | null;
  cancelled_at:        string | null;
  expires_at:          string | null;
  supplier_message:    string | null;
  decline_reason:      string | null;
  cancel_reason:       string | null;
  created_at:          string;
  updated_at:          string;
}

/** Supplier-safe invite record. OD-5: metadataInternalJson, cancelReason, ownerOrgId excluded. */
export interface NetworkPoolRfqSupplierInviteSupplierRecord {
  id:                   string;
  invite_ref:           string;
  /** OD-2: Effective status — may be EXPIRED even if DB is PENDING */
  status:               string;
  invited_at:           string;
  accepted_at:          string | null;
  declined_at:          string | null;
  expires_at:           string | null;
  supplier_message:     string | null;
  /** RFQ aggregate header fields — null when RFQ not joined (listSupplierInvites) */
  rfq_ref:              string | null;
  rfq_version:          number | null;
  rfq_status:           string | null;
  issued_at:            string | null;
  response_deadline_at: string | null;
  issue_basis:          string | null;
  line_count:           number | null;
  total_qty:            string | null;
  qty_unit:             string | null;
  created_at:           string;
  updated_at:           string;
}

/** Input for submitting a supplier quote against an accepted invite. */
export interface SubmitQuoteInput {
  /** Required. Positive decimal (validated at route layer by Zod). */
  quote_amount:    string | number;
  /** Required. ISO 4217 currency code (3–10 chars). */
  currency:        string;
  /** Optional. ISO datetime string or Date. QD-3: stored but not enforced in Phase 1C. */
  validity_until?: string | Date | null;
  /** Optional. Free-text supplier note. Max 5000 chars (validated at route layer). */
  supplier_note?:  string | null;
  /** Optional Fastify request ID for log correlation. */
  request_id?:     string | null;
}

/**
 * Supplier-safe quote record. QD-5: metadataInternalJson, ownerOrgId, rfqId, poolId
 * and supplierOrgId are NEVER exposed to the supplier.
 */
export interface NetworkPoolRfqSupplierQuoteSupplierRecord {
  id:                   string;
  invite_id:            string;
  quote_ref:            string;
  /** Current quote status. Phase 1C: always 'SUBMITTED'. */
  status:               string;
  /** QD-4: Decimal serialised as string to avoid floating-point loss. */
  quote_amount:         string;
  currency:             string;
  validity_until:       string | null;
  supplier_note:        string | null;
  submitted_at:         string;
  submitted_by_user_id: string | null;
  withdrawn_at:         string | null;
  withdraw_reason:      string | null;
  created_at:           string;
  updated_at:           string;
}

/** Owner-facing quote DTO — returned by listOwnerQuotes, acceptQuote, rejectQuote. */
export interface NetworkPoolRfqSupplierQuoteOwnerRecord {
  id:                   string;
  owner_org_id:         string;
  supplier_org_id:      string;
  rfq_id:               string;
  pool_id:              string;
  invite_id:            string;
  quote_ref:            string;
  status:               string;
  quote_amount:         string;
  currency:             string;
  validity_until:       string | null;
  supplier_note:        string | null;
  submitted_at:         string;
  submitted_by_user_id: string | null;
  withdrawn_at:         string | null;
  accepted_at:          string | null;
  rejected_at:          string | null;
  reject_reason:        string | null;
  created_at:           string;
  updated_at:           string;
}

export interface AcceptQuoteInput {
  request_id?: string | null;
}

export interface RejectQuoteInput {
  reject_reason?: string | null;
  request_id?:    string | null;
}

// ─── G-021: Award Maker-Checker Input / Record Types ─────────────────────────

export interface RequestAwardInput {
  request_reason: string;
  request_id?:    string | null;
}

export interface ApproveAwardInput {
  approve_reason: string;
  request_id?:    string | null;
}

export interface RejectAwardApprovalInput {
  reject_reason: string;
  request_id?:   string | null;
}

/** G-021: Award approval request DTO (no frozenPayloadHash, no makerPrincipalFingerprint). */
export interface AwardApprovalRequest {
  id:                   string;
  status:               string;
  expires_at:           string;
  entity_type:          string;
  entity_id:            string;
  from_state_key:       string;
  to_state_key:         string;
  requested_by_user_id: string | null;
  request_reason:       string | null;
  created_at:           string;
}

export interface AwardApproved {
  approval: AwardApprovalRequest;
  quote:    NetworkPoolRfqSupplierQuoteOwnerRecord;
}

export interface AwardRejected {
  approval: AwardApprovalRequest;
}

/** TTL for award approval requests. D-021-A. */
const AWARD_APPROVAL_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// ─── Service ──────────────────────────────────────────────────────────────────

export class NetworkPoolRfqService {
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
  ) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  private toRfqRecord(row: Record<string, unknown>): NetworkPoolRfqRecord {
    return {
      id:                   String(row['id']),
      owner_org_id:         String(row['ownerOrgId']),
      pool_id:              String(row['poolId']),
      snapshot_id:          String(row['snapshotId']),
      rfq_ref:              String(row['rfqRef']),
      rfq_version:          Number(row['rfqVersion']),
      status:               String(row['status']),
      issue_basis:          String(row['issueBasis']),
      issued_at:            (row['issuedAt'] as Date).toISOString(),
      issued_by_user_id:    row['issuedByUserId'] != null ? String(row['issuedByUserId']) : null,
      issue_reason:         row['issueReason'] != null ? String(row['issueReason']) : null,
      response_deadline_at: row['responseDeadlineAt'] != null
        ? (row['responseDeadlineAt'] as Date).toISOString()
        : null,
      supplier_invite_mode: String(row['supplierInviteMode']),
      line_count:           Number(row['lineCount']),
      total_qty:            row['totalQty'] != null ? String(row['totalQty']) : null,
      qty_unit:             row['qtyUnit'] != null ? String(row['qtyUnit']) : null,
      created_at:           (row['createdAt'] as Date).toISOString(),
      updated_at:           (row['updatedAt'] as Date).toISOString(),
    };
  }

  // ── issueRfq ─────────────────────────────────────────────────────────────

  /**
   * Issue a Pool RFQ.
   *
   * Transitions the pool from AGGREGATING → CLOSED_FOR_BIDS via StateMachineService.
   * Creates a NetworkPoolRfq header and one NetworkPoolRfqLine per snapshot line.
   * All writes share a single Prisma $transaction (shared-tx pattern — Q-1).
   *
   * @param ownerOrgId  - Owner org from JWT/dbContext (D-017-A). Pool must belong to this org.
   * @param userId      - User triggering the issue (nullable for system-initiated).
   * @param input       - Issue parameters: pool_id, issue_reason, response_deadline_at.
   * @returns           NetworkPoolRfqRecord (header only — no lines, no metadataInternalJson).
   */
  async issueRfq(
    ownerOrgId: string,
    userId: string | null,
    input: IssueNetworkPoolRfqInput,
  ): Promise<NetworkPoolRfqRecord> {
    // ── 1. Input validation (fast — before any DB call) ──────────────────
    if (!input.pool_id || !input.pool_id.trim()) {
      throw new NetworkPoolRfqInvalidInputError('pool_id is required and must be non-empty');
    }

    // ── 2. Resolve CLOSED_FOR_BIDS lifecycle state ID — fail fast before tx ──
    const closedForBidsState = await this.db.lifecycleState.findUnique({
      where: {
        entityType_stateKey: { entityType: 'POOL', stateKey: 'CLOSED_FOR_BIDS' },
      },
      select: { id: true, stateKey: true },
    });
    if (!closedForBidsState) {
      throw new NetworkPoolRfqInvalidPoolStateError(
        `POOL lifecycle state 'CLOSED_FOR_BIDS' not found in lifecycle_states. ` +
        `Ensure the POOL lifecycle seed migration has been applied.`,
      );
    }

    // ── 3. Generate rfqRef before entering tx (Q-4) ───────────────────────
    const rfqRef = randomUUID();

    // ── 4. Atomic transaction ─────────────────────────────────────────────
    //    All writes (rfq header, rfq lines, pool state update) + SM log write
    //    share one transaction boundary.
    try {
      const rfqRow = await this.db.$transaction(
        async (tx) => {
        // 4a. Load pool with current lifecycle state — owner-scoped
        const poolRow = await (tx as any).networkPool.findFirst({
          where:   { id: input.pool_id.trim(), orgId: ownerOrgId },
          include: { lifecycleState: { select: { stateKey: true } } },
        });

        if (!poolRow) {
          throw new NetworkPoolRfqPoolNotFoundError();
        }

        const currentStateKey: string = poolRow.lifecycleState?.stateKey ?? '';
        if (currentStateKey !== 'AGGREGATING') {
          throw new NetworkPoolRfqInvalidPoolStateError(
            `Pool is in state '${currentStateKey}' — required: [AGGREGATING]`,
          );
        }

        // 4b. Duplicate RFQ guard (belt-and-suspenders; pool state gate is primary)
        const existingRfq = await (tx as any).networkPoolRfq.findFirst({
          where:   { poolId: poolRow.id },
          orderBy: { rfqVersion: 'desc' },
          select:  { rfqVersion: true },
        });

        if (existingRfq) {
          throw new NetworkPoolRfqAlreadyIssuedError();
        }

        const rfqVersion = 1; // always 1 — no prior RFQ confirmed above

        // 4c. Find latest CAPTURED snapshot (Q-2)
        const snapshot = await (tx as any).networkPoolDemandSnapshot.findFirst({
          where:   { poolId: poolRow.id, ownerOrgId, status: 'CAPTURED' },
          orderBy: { snapshotVersion: 'desc' },
        });

        if (!snapshot) {
          throw new NetworkPoolRfqSnapshotNotFoundError();
        }

        // 4d. Load snapshot lines
        const snapshotLines = await (tx as any).networkPoolDemandSnapshotLine.findMany({
          where: { snapshotId: snapshot.id, ownerOrgId },
        });

        if (snapshotLines.length === 0) {
          throw new NetworkPoolRfqSnapshotNotFoundError(
            'CAPTURED snapshot has no lines — cannot issue RFQ from empty snapshot.',
          );
        }

        // 4e. SM transition: AGGREGATING → CLOSED_FOR_BIDS (Q-1, Q-5)
        //    opts.db = tx so SM lifecycle log write shares this transaction boundary.
        const smResult = await this.stateMachine.transition(
          {
            entityType:   'POOL',
            entityId:     poolRow.id,
            orgId:        ownerOrgId,
            fromStateKey: 'AGGREGATING',
            toStateKey:   'CLOSED_FOR_BIDS',
            actorType:    'TENANT_ADMIN',
            actorUserId:  userId ?? null,
            actorAdminId: null,
            actorRole:    'NC_POOL_ADMIN',
            reason:       `RFQ ${rfqRef} issued for pool — demand closed for new bids`,
            requestId:    null,
          },
          { db: tx as unknown as PrismaClient },
        );

        if (smResult.status !== 'APPLIED') {
          const denied = smResult as { status: string; code?: string; message?: string };
          throw new NetworkPoolRfqTransitionDeniedError(
            denied.code ?? smResult.status,
            denied.message ?? `SM returned status '${smResult.status}'`,
          );
        }

        // 4f. Create NetworkPoolRfq header
        const createdRfq = await (tx as any).networkPoolRfq.create({
          data: {
            ownerOrgId,
            poolId:            poolRow.id,
            snapshotId:        snapshot.id,
            rfqRef,
            rfqVersion,
            status:            'ISSUED',
            issueBasis:        'SNAPSHOT_LOCK',
            issuedAt:          new Date(),
            issuedByUserId:    userId ?? null,
            issueReason:       input.issue_reason ?? null,
            responseDeadlineAt: input.response_deadline_at
              ? new Date(input.response_deadline_at as string)
              : null,
            supplierInviteMode: 'INVITE_ONLY',
            lineCount:         snapshotLines.length,
            totalQty:          snapshot.totalQty ?? null,
            qtyUnit:           snapshot.qtyUnit ?? null,
            metadataInternalJson: null,
          },
        });

        // 4g. Create NetworkPoolRfqLines (one per snapshot line)
        await (tx as any).networkPoolRfqLine.createMany({
          data: snapshotLines.map((sl: any) => ({
            rfqId:                        createdRfq.id,
            ownerOrgId,
            poolId:                       poolRow.id,
            snapshotLineId:               sl.id,
            demandLineId:                 sl.demandLineId ?? null,
            sourceLineRef:                sl.sourceLineRef,
            sourceRevisionNo:             sl.sourceRevisionNo,
            commodityCategory:            sl.commodityCategory,
            productCategory:              sl.productCategory ?? null,
            productSpecSummary:           sl.productSpecSummary ?? null,
            qty:                          sl.qty,
            qtyUnit:                      sl.qtyUnit,
            qualityRequirementsJson:      sl.qualityRequirementsJson ?? null,
            certificationRequirementsJson: sl.certificationRequirementsJson ?? null,
            packagingRequirementsJson:    sl.packagingRequirementsJson ?? null,
            deliveryLocation:             sl.deliveryLocation ?? null,
            deliveryWindowStart:          sl.deliveryWindowStart ?? null,
            deliveryWindowEnd:            sl.deliveryWindowEnd ?? null,
            tolerancePct:                 sl.tolerancePct ?? null,
            priority:                     sl.priority ?? null,
          })),
        });

        // 4h. Update pool.lifecycleStateId = CLOSED_FOR_BIDS (Q-1)
        await (tx as any).networkPool.update({
          where: { id: poolRow.id },
          data: {
            lifecycleStateId: closedForBidsState.id,
            updatedAt:        new Date(),
          },
        });

        return createdRfq;
        },
        { timeout: 30000 },
      );

      return this.toRfqRecord(rfqRow as Record<string, unknown>);
    } catch (err) {
      // Re-throw known service errors without wrapping
      if (
        err instanceof NetworkPoolRfqPoolNotFoundError ||
        err instanceof NetworkPoolRfqInvalidPoolStateError ||
        err instanceof NetworkPoolRfqSnapshotNotFoundError ||
        err instanceof NetworkPoolRfqAlreadyIssuedError ||
        err instanceof NetworkPoolRfqTransitionDeniedError ||
        err instanceof NetworkPoolRfqInvalidInputError
      ) {
        throw err;
      }
      // Map P2002 unique constraint violation → NetworkPoolRfqConflictError
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new NetworkPoolRfqConflictError(
          String((err.meta as any)?.target ?? 'unknown'),
        );
      }
      throw err;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * OD-2: Compute effective invite status.
   * DB status 'PENDING' + expiresAt in the past → effective status 'EXPIRED'.
   * The DB status column is never mutated to 'EXPIRED' (lazy expiration policy).
   */
  private computeEffectiveInviteStatus(dbStatus: string, expiresAt: Date | null): string {
    if (dbStatus === 'PENDING' && expiresAt != null && expiresAt < new Date()) {
      return 'EXPIRED';
    }
    return dbStatus;
  }

  /**
   * OD-5: Map DB row to owner-safe invite DTO.
   * metadataInternalJson is never included in the returned record.
   */
  private toInviteOwnerRecord(row: Record<string, unknown>): NetworkPoolRfqSupplierInviteRecord {
    const expiresAt = row['expiresAt'] != null ? (row['expiresAt'] as Date) : null;
    return {
      id:                 String(row['id']),
      owner_org_id:       String(row['ownerOrgId']),
      supplier_org_id:    String(row['supplierOrgId']),
      rfq_id:             String(row['rfqId']),
      pool_id:            String(row['poolId']),
      invite_ref:         String(row['inviteRef']),
      status:             this.computeEffectiveInviteStatus(String(row['status']), expiresAt),
      invited_at:         (row['invitedAt'] as Date).toISOString(),
      invited_by_user_id: row['invitedByUserId'] != null ? String(row['invitedByUserId']) : null,
      accepted_at:        row['acceptedAt'] != null ? (row['acceptedAt'] as Date).toISOString() : null,
      declined_at:        row['declinedAt'] != null ? (row['declinedAt'] as Date).toISOString() : null,
      cancelled_at:       row['cancelledAt'] != null ? (row['cancelledAt'] as Date).toISOString() : null,
      expires_at:         expiresAt != null ? expiresAt.toISOString() : null,
      supplier_message:   row['messageToSupplier'] != null ? String(row['messageToSupplier']) : null,
      decline_reason:     row['declineReason'] != null ? String(row['declineReason']) : null,
      cancel_reason:      row['cancelReason'] != null ? String(row['cancelReason']) : null,
      created_at:         (row['createdAt'] as Date).toISOString(),
      updated_at:         (row['updatedAt'] as Date).toISOString(),
    };
  }

  /**
   * OD-7: Write a direct lifecycle log entry for an invite event.
   * MUST NOT call StateMachineService.transition() — direct Prisma write only.
   * Pool remains in CLOSED_FOR_BIDS (from = to = CLOSED_FOR_BIDS; not a state change).
   */
  private async writeInviteLifecycleLog(
    tx: any,
    params: {
      orgId:       string;
      entityId:    string;  // poolId (POOL entity)
      actorUserId: string | null;
      reason:      string;
      requestId?:  string | null;
    },
  ): Promise<void> {
    await tx.networkLifecycleLog.create({
      data: {
        orgId:           params.orgId,
        entityType:      'POOL',
        entityId:        params.entityId,
        fromStateKey:    'CLOSED_FOR_BIDS',
        toStateKey:      'CLOSED_FOR_BIDS',
        actorUserId:     params.actorUserId ?? null,
        actorAdminId:    null,
        actorType:       'TENANT_ADMIN',
        actorRole:       'NC_POOL_ADMIN',
        escalationLevel: null,
        makerUserId:     null,
        checkerUserId:   null,
        aiTriggered:     false,
        impersonationId: null,
        reason:          params.reason,
        requestId:       params.requestId ?? null,
      },
    });
  }

  // ── sendInvite ────────────────────────────────────────────────────────────

  /**
   * Owner/admin sends a supplier invite for an issued Pool RFQ.
   *
   * OD-1: Rejects any existing (rfqId, supplierOrgId) row regardless of status.
   * OD-2: Sets DB status = PENDING (EXPIRED is never stored).
   * OD-3: Inherits rfq.responseDeadlineAt as expiresAt when caller omits expires_at.
   * OD-4: Validates supplier org exists and status = 'ACTIVE'.
   * OD-5: Returns owner-safe DTO — no metadataInternalJson.
   * OD-7: Writes direct tx.networkLifecycleLog.create — MUST NOT call stateMachine.transition.
   */
  async sendInvite(
    ownerOrgId: string,
    userId: string | null,
    input: SendInviteInput,
  ): Promise<NetworkPoolRfqSupplierInviteRecord> {
    // 1. Input validation (fast, before DB)
    if (!input.pool_id?.trim()) {
      throw new NetworkPoolRfqSupplierInviteInvalidInputError('pool_id is required and must be non-empty');
    }
    if (!input.rfq_id?.trim()) {
      throw new NetworkPoolRfqSupplierInviteInvalidInputError('rfq_id is required and must be non-empty');
    }
    if (!input.supplier_org_id?.trim()) {
      throw new NetworkPoolRfqSupplierInviteInvalidInputError('supplier_org_id is required and must be non-empty');
    }

    // OD-3: Validate caller-provided expiresAt before entering tx
    let callerExpiresAt: Date | null = null;
    if (input.expires_at != null && input.expires_at !== '') {
      callerExpiresAt = new Date(input.expires_at as string);
      if (isNaN(callerExpiresAt.getTime())) {
        throw new NetworkPoolRfqSupplierInviteInvalidInputError('expires_at must be a valid ISO timestamp');
      }
      if (callerExpiresAt <= new Date()) {
        throw new NetworkPoolRfqSupplierInviteInvalidInputError('expires_at must be a future date');
      }
    }

    // Generate inviteRef before tx (consistent with rfqRef pattern)
    const inviteRef = randomUUID();

    try {
      const inviteRow = await this.db.$transaction(async (tx) => {
        // 2a. Validate pool exists and belongs to owner org
        const poolRow = await (tx as any).networkPool.findFirst({
          where:   { id: input.pool_id.trim(), orgId: ownerOrgId },
          include: { lifecycleState: { select: { stateKey: true } } },
        });
        if (!poolRow) {
          throw new NetworkPoolRfqPoolNotFoundError();
        }

        // 2b. Pool must be CLOSED_FOR_BIDS (RFQ must already be issued)
        const poolStateKey: string = poolRow.lifecycleState?.stateKey ?? '';
        if (poolStateKey !== 'CLOSED_FOR_BIDS') {
          throw new NetworkPoolRfqInvalidPoolStateError(
            `Pool is in state '${poolStateKey}' — supplier invites require pool state: [CLOSED_FOR_BIDS]`,
          );
        }

        // 2c. Validate RFQ exists, belongs to pool and owner org
        const rfqRow = await (tx as any).networkPoolRfq.findFirst({
          where:  { id: input.rfq_id.trim(), poolId: poolRow.id, ownerOrgId },
          select: { id: true, responseDeadlineAt: true },
        });
        if (!rfqRow) {
          throw new NetworkPoolRfqRfqNotFoundError();
        }

        // 2d. OD-4: Validate supplier org exists and status = 'ACTIVE'
        const supplierOrg = await (tx as any).organizations.findUnique({
          where:  { id: input.supplier_org_id.trim() },
          select: { id: true, status: true },
        });
        if (!supplierOrg || supplierOrg.status !== 'ACTIVE') {
          throw new NetworkPoolRfqSupplierInviteInvalidInputError(
            'Supplier organisation not found or not active.',
          );
        }

        // 2e. Reject owner org being invited as supplier
        if (input.supplier_org_id.trim() === ownerOrgId) {
          throw new NetworkPoolRfqSupplierInviteInvalidInputError(
            'Owner organisation cannot be invited as a supplier on its own RFQ.',
          );
        }

        // 2f. OD-1: No re-invite — check for any existing row for (rfqId, supplierOrgId)
        const existingInvite = await (tx as any).networkPoolRfqSupplierInvite.findUnique({
          where:  {
            rfqId_supplierOrgId: {
              rfqId:        rfqRow.id,
              supplierOrgId: input.supplier_org_id.trim(),
            },
          },
          select: { id: true },
        });
        if (existingInvite) {
          throw new NetworkPoolRfqSupplierInviteAlreadySentError();
        }

        // 2g. OD-3: Compute expiresAt — priority: caller > rfq.responseDeadlineAt > null
        let expiresAt: Date | null = callerExpiresAt;
        if (expiresAt == null && rfqRow.responseDeadlineAt != null) {
          expiresAt = rfqRow.responseDeadlineAt as Date;
        }

        // 2h. Create invite row
        const createdInvite = await (tx as any).networkPoolRfqSupplierInvite.create({
          data: {
            ownerOrgId,
            supplierOrgId:       input.supplier_org_id.trim(),
            rfqId:               rfqRow.id,
            poolId:              poolRow.id,
            inviteRef,
            status:              'PENDING',
            invitedAt:           new Date(),
            invitedByUserId:     userId ?? null,
            expiresAt:           expiresAt ?? null,
            messageToSupplier:   input.supplier_message ?? null,
            metadataInternalJson: null,
          },
        });

        // 2i. OD-7: Direct lifecycle log — MUST NOT call StateMachineService.transition
        await this.writeInviteLifecycleLog(tx, {
          orgId:       ownerOrgId,
          entityId:    poolRow.id,
          actorUserId: userId,
          reason:      `Supplier invite SENT: rfq=${rfqRow.id}, supplier=${input.supplier_org_id.trim()}, invite=${inviteRef}`,
          requestId:   input.request_id ?? null,
        });

        return createdInvite;
      });

      return this.toInviteOwnerRecord(inviteRow as Record<string, unknown>);
    } catch (err) {
      if (
        err instanceof NetworkPoolRfqPoolNotFoundError      ||
        err instanceof NetworkPoolRfqInvalidPoolStateError  ||
        err instanceof NetworkPoolRfqRfqNotFoundError       ||
        err instanceof NetworkPoolRfqSupplierInviteInvalidInputError  ||
        err instanceof NetworkPoolRfqSupplierInviteAlreadySentError
      ) {
        throw err;
      }
      // Belt-and-suspenders: P2002 on (rfq_id, supplier_org_id) unique → AlreadySent
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new NetworkPoolRfqSupplierInviteAlreadySentError();
      }
      throw err;
    }
  }

  // ── listInvites ───────────────────────────────────────────────────────────

  /**
   * Owner/admin lists supplier invites for one RFQ.
   *
   * OD-2: Returns effective status (may be EXPIRED for PENDING rows with past expiresAt).
   * OD-5: metadataInternalJson excluded from all returned records.
   * No pool-membership check is performed for the supplier org (OD-4 validated only at send time).
   */
  async listInvites(
    ownerOrgId: string,
    poolId: string,
    rfqId: string,
  ): Promise<NetworkPoolRfqSupplierInviteRecord[]> {
    const rows = await (this.db as any).networkPoolRfqSupplierInvite.findMany({
      where: {
        ownerOrgId,
        poolId,
        rfqId,
      },
      orderBy: { invitedAt: 'desc' },
    });

    return (rows as Record<string, unknown>[]).map((row) => this.toInviteOwnerRecord(row));
  }

  // ── getInvite ─────────────────────────────────────────────────────────────

  /**
   * Owner/admin reads a single supplier invite.
   *
   * OD-2: Returns effective status.
   * OD-5: metadataInternalJson excluded.
   * Wrong org or wrong pool/rfq pairing returns non-leaking NotFoundError.
   *
   * @throws NetworkPoolRfqSupplierInviteNotFoundError if not found or not owned.
   */
  async getInvite(
    ownerOrgId: string,
    poolId: string,
    rfqId: string,
    inviteId: string,
  ): Promise<NetworkPoolRfqSupplierInviteRecord> {
    const row = await (this.db as any).networkPoolRfqSupplierInvite.findFirst({
      where: {
        id: inviteId,
        ownerOrgId,
        poolId,
        rfqId,
      },
    });

    if (!row) {
      throw new NetworkPoolRfqSupplierInviteNotFoundError();
    }

    return this.toInviteOwnerRecord(row as Record<string, unknown>);
  }

  // ── cancelInvite ──────────────────────────────────────────────────────────

  /**
   * Owner/admin cancels a PENDING supplier invite.
   *
   * OD-2: Checks effective status — lazy EXPIRED counts as terminal (cannot cancel).
   * OD-7: Writes direct tx.networkLifecycleLog.create — MUST NOT call stateMachine.transition.
   *
   * @throws NetworkPoolRfqSupplierInviteNotFoundError if invite not found.
   * @throws NetworkPoolRfqSupplierInviteInvalidTransitionError if invite is not PENDING.
   */
  async cancelInvite(
    ownerOrgId: string,
    userId: string | null,
    poolId: string,
    rfqId: string,
    inviteId: string,
    cancelReason?: string | null,
  ): Promise<NetworkPoolRfqSupplierInviteRecord> {
    const updatedRow = await this.db.$transaction(async (tx) => {
      // Load invite scoped to owner org (non-leaking not-found on wrong ownership)
      const inviteRow = await (tx as any).networkPoolRfqSupplierInvite.findFirst({
        where: {
          id:          inviteId,
          ownerOrgId,
          poolId,
          rfqId,
        },
      });

      if (!inviteRow) {
        throw new NetworkPoolRfqSupplierInviteNotFoundError();
      }

      // OD-2: Compute effective status — lazy EXPIRED is terminal
      const effectiveStatus = this.computeEffectiveInviteStatus(
        String(inviteRow.status),
        inviteRow.expiresAt ?? null,
      );

      if (effectiveStatus !== 'PENDING') {
        throw new NetworkPoolRfqSupplierInviteInvalidTransitionError(effectiveStatus);
      }

      const now = new Date();

      // Update to CANCELLED
      const updated = await (tx as any).networkPoolRfqSupplierInvite.update({
        where: { id: inviteId },
        data:  {
          status:      'CANCELLED',
          cancelledAt: now,
          cancelReason: cancelReason ?? null,
          updatedAt:   now,
        },
      });

      // OD-7: Direct lifecycle log — MUST NOT call StateMachineService.transition
      await this.writeInviteLifecycleLog(tx, {
        orgId:       ownerOrgId,
        entityId:    poolId,
        actorUserId: userId,
        reason:      `Supplier invite CANCELLED: rfq=${rfqId}, invite=${inviteId}`,
      });

      return updated;
    });

    return this.toInviteOwnerRecord(updatedRow as Record<string, unknown>);
  }

  // ── Private helpers (supplier-side) ────────────────────────────────────────

  /**
   * OD-5: Map DB row (optionally with rfq join) to supplier-safe invite DTO.
   * Excluded: metadataInternalJson, cancelReason, ownerOrgId.
   */
  private toInviteSupplierRecord(
    row: Record<string, unknown>,
    rfqRow?: Record<string, unknown> | null,
  ): NetworkPoolRfqSupplierInviteSupplierRecord {
    const expiresAt = row['expiresAt'] != null ? (row['expiresAt'] as Date) : null;
    const rfq = rfqRow !== undefined
      ? rfqRow
      : (row['rfq'] as Record<string, unknown> | null | undefined) ?? null;
    return {
      id:                   String(row['id']),
      invite_ref:           String(row['inviteRef']),
      status:               this.computeEffectiveInviteStatus(String(row['status']), expiresAt),
      invited_at:           (row['invitedAt'] as Date).toISOString(),
      accepted_at:          row['acceptedAt'] != null ? (row['acceptedAt'] as Date).toISOString() : null,
      declined_at:          row['declinedAt'] != null ? (row['declinedAt'] as Date).toISOString() : null,
      expires_at:           expiresAt != null ? expiresAt.toISOString() : null,
      supplier_message:     row['messageToSupplier'] != null ? String(row['messageToSupplier']) : null,
      rfq_ref:              rfq != null && rfq['rfqRef'] != null ? String(rfq['rfqRef']) : null,
      rfq_version:          rfq != null && rfq['rfqVersion'] != null ? Number(rfq['rfqVersion']) : null,
      rfq_status:           rfq != null && rfq['status'] != null ? String(rfq['status']) : null,
      issued_at:            rfq != null && rfq['issuedAt'] != null
        ? (rfq['issuedAt'] as Date).toISOString()
        : null,
      response_deadline_at: rfq != null && rfq['responseDeadlineAt'] != null
        ? (rfq['responseDeadlineAt'] as Date).toISOString()
        : null,
      issue_basis:          rfq != null && rfq['issueBasis'] != null ? String(rfq['issueBasis']) : null,
      line_count:           rfq != null && rfq['lineCount'] != null ? Number(rfq['lineCount']) : null,
      total_qty:            rfq != null && rfq['totalQty'] != null ? String(rfq['totalQty']) : null,
      qty_unit:             rfq != null && rfq['qtyUnit'] != null ? String(rfq['qtyUnit']) : null,
      created_at:           (row['createdAt'] as Date).toISOString(),
      updated_at:           (row['updatedAt'] as Date).toISOString(),
    };
  }

  /**
   * OD-7: Write a direct lifecycle log for supplier accept/decline actions.
   * actorType = TENANT_USER, actorRole = NC_SUPPLIER.
   * Distinct from writeInviteLifecycleLog which uses TENANT_ADMIN / NC_POOL_ADMIN.
   */
  private async writeSupplierLifecycleLog(
    tx: any,
    params: {
      orgId:       string;   // pool owner org (NOT supplier)
      entityId:    string;   // poolId (POOL entity)
      actorUserId: string | null;
      reason:      string;
      requestId?:  string | null;
    },
  ): Promise<void> {
    await tx.networkLifecycleLog.create({
      data: {
        orgId:           params.orgId,
        entityType:      'POOL',
        entityId:        params.entityId,
        fromStateKey:    'CLOSED_FOR_BIDS',
        toStateKey:      'CLOSED_FOR_BIDS',
        actorUserId:     params.actorUserId ?? null,
        actorAdminId:    null,
        actorType:       'TENANT_USER',
        actorRole:       'NC_SUPPLIER',
        escalationLevel: null,
        makerUserId:     null,
        checkerUserId:   null,
        aiTriggered:     false,
        impersonationId: null,
        reason:          params.reason,
        requestId:       params.requestId ?? null,
      },
    });
  }

  // ── listSupplierInvites ───────────────────────────────────────────────────

  /**
   * Supplier lists all their invites (across all RFQs/pools).
   *
   * OD-2: Returns effective status (EXPIRED computed lazily; never written to DB).
   * OD-4: Scope is supplierOrgId only — no pool membership check.
   * OD-5: Supplier-safe DTO — no metadataInternalJson, cancelReason, ownerOrgId.
   */
  async listSupplierInvites(
    supplierOrgId: string,
  ): Promise<NetworkPoolRfqSupplierInviteSupplierRecord[]> {
    const rows = await (this.db as any).networkPoolRfqSupplierInvite.findMany({
      where:   { supplierOrgId },
      orderBy: { invitedAt: 'desc' },
    });

    return (rows as Record<string, unknown>[]).map((row) => this.toInviteSupplierRecord(row, null));
  }

  // ── viewInvite ────────────────────────────────────────────────────────────

  /**
   * Supplier views a single invite with RFQ aggregate header.
   *
   * OD-2: Returns effective status.
   * OD-4: Scope is supplierOrgId + inviteId — no pool membership check.
   * OD-5: Supplier-safe DTO — includes aggregate RFQ header only; no lines, no member data.
   *
   * @throws NetworkPoolRfqSupplierInviteNotFoundError if not found or wrong supplier.
   */
  async viewInvite(
    supplierOrgId: string,
    inviteId: string,
  ): Promise<NetworkPoolRfqSupplierInviteSupplierRecord> {
    const row = await (this.db as any).networkPoolRfqSupplierInvite.findFirst({
      where:   { id: inviteId, supplierOrgId },
      include: {
        rfq: {
          select: {
            rfqRef:             true,
            rfqVersion:         true,
            status:             true,
            issuedAt:           true,
            responseDeadlineAt: true,
            issueBasis:         true,
            lineCount:          true,
            totalQty:           true,
            qtyUnit:            true,
          },
        },
      },
    });

    if (!row) {
      throw new NetworkPoolRfqSupplierInviteNotFoundError();
    }

    return this.toInviteSupplierRecord(row as Record<string, unknown>);
  }

  // ── acceptInvite ──────────────────────────────────────────────────────────

  /**
   * Supplier accepts a PENDING invite.
   *
   * OD-2: Checks effective status — lazy EXPIRED is terminal, cannot accept.
   * OD-7: Writes direct tx.networkLifecycleLog.create — MUST NOT call stateMachine.transition.
   * Pool and RFQ state are NOT mutated — only the invite row is updated.
   *
   * @throws NetworkPoolRfqSupplierInviteNotFoundError if invite not found or wrong supplier.
   * @throws NetworkPoolRfqSupplierInviteInvalidTransitionError if invite is not PENDING.
   */
  async acceptInvite(
    supplierOrgId: string,
    userId: string | null,
    inviteId: string,
    note?: string | null,
  ): Promise<NetworkPoolRfqSupplierInviteSupplierRecord> {
    const updatedRow = await this.db.$transaction(async (tx) => {
      // 1. Load invite scoped to supplier (non-leaking not-found on wrong ownership)
      const inviteRow = await (tx as any).networkPoolRfqSupplierInvite.findFirst({
        where: { id: inviteId, supplierOrgId },
      });

      if (!inviteRow) {
        throw new NetworkPoolRfqSupplierInviteNotFoundError();
      }

      // 2. OD-2: Compute effective status — lazy EXPIRED is terminal
      const effectiveStatus = this.computeEffectiveInviteStatus(
        String(inviteRow.status),
        inviteRow.expiresAt ?? null,
      );

      if (effectiveStatus !== 'PENDING') {
        throw new NetworkPoolRfqSupplierInviteInvalidTransitionError(effectiveStatus);
      }

      const now = new Date();

      // 3. Update to ACCEPTED
      const updated = await (tx as any).networkPoolRfqSupplierInvite.update({
        where: { id: inviteId },
        data:  {
          status:     'ACCEPTED',
          acceptedAt: now,
          updatedAt:  now,
        },
      });

      // 4. OD-7: Direct lifecycle log — MUST NOT call StateMachineService.transition
      await this.writeSupplierLifecycleLog(tx, {
        orgId:       String(inviteRow.ownerOrgId),
        entityId:    String(inviteRow.poolId),
        actorUserId: userId,
        reason:      `Supplier invite ACCEPTED: rfq=${String(inviteRow.rfqId)}, invite=${inviteId}`,
        requestId:   note ?? null,
      });

      return updated;
    });

    return this.toInviteSupplierRecord(updatedRow as Record<string, unknown>, null);
  }

  // ── declineInvite ─────────────────────────────────────────────────────────

  /**
   * Supplier declines a PENDING invite.
   *
   * OD-2: Checks effective status — lazy EXPIRED is terminal, cannot decline.
   * OD-7: Writes direct tx.networkLifecycleLog.create — MUST NOT call stateMachine.transition.
   * Pool and RFQ state are NOT mutated — only the invite row is updated.
   *
   * @throws NetworkPoolRfqSupplierInviteNotFoundError if invite not found or wrong supplier.
   * @throws NetworkPoolRfqSupplierInviteInvalidTransitionError if invite is not PENDING.
   */
  async declineInvite(
    supplierOrgId: string,
    userId: string | null,
    inviteId: string,
    declineReason?: string | null,
  ): Promise<NetworkPoolRfqSupplierInviteSupplierRecord> {
    const updatedRow = await this.db.$transaction(async (tx) => {
      // 1. Load invite scoped to supplier
      const inviteRow = await (tx as any).networkPoolRfqSupplierInvite.findFirst({
        where: { id: inviteId, supplierOrgId },
      });

      if (!inviteRow) {
        throw new NetworkPoolRfqSupplierInviteNotFoundError();
      }

      // 2. OD-2: Compute effective status — lazy EXPIRED is terminal
      const effectiveStatus = this.computeEffectiveInviteStatus(
        String(inviteRow.status),
        inviteRow.expiresAt ?? null,
      );

      if (effectiveStatus !== 'PENDING') {
        throw new NetworkPoolRfqSupplierInviteInvalidTransitionError(effectiveStatus);
      }

      const now = new Date();

      // 3. Update to DECLINED
      const updated = await (tx as any).networkPoolRfqSupplierInvite.update({
        where: { id: inviteId },
        data:  {
          status:        'DECLINED',
          declinedAt:    now,
          declineReason: declineReason ?? null,
          updatedAt:     now,
        },
      });

      // 4. OD-7: Direct lifecycle log — MUST NOT call StateMachineService.transition
      await this.writeSupplierLifecycleLog(tx, {
        orgId:       String(inviteRow.ownerOrgId),
        entityId:    String(inviteRow.poolId),
        actorUserId: userId,
        reason:      `Supplier invite DECLINED: rfq=${String(inviteRow.rfqId)}, invite=${inviteId}`,
      });

      return updated;
    });

    return this.toInviteSupplierRecord(updatedRow as Record<string, unknown>, null);
  }

  // ── toQuoteSupplierRecord ─────────────────────────────────────────────────

  /**
   * Maps a DB quote row to NetworkPoolRfqSupplierQuoteSupplierRecord.
   * QD-5: Excludes metadataInternalJson, ownerOrgId, rfqId, poolId, supplierOrgId.
   */
  private toQuoteSupplierRecord(
    row: Record<string, unknown>,
  ): NetworkPoolRfqSupplierQuoteSupplierRecord {
    return {
      id:                   String(row['id']),
      invite_id:            String(row['inviteId']),
      quote_ref:            String(row['quoteRef']),
      status:               String(row['status']),
      quote_amount:         String(row['quoteAmount']),
      currency:             String(row['currency']),
      validity_until:       row['validityUntil'] != null
        ? new Date(row['validityUntil'] as string | Date).toISOString()
        : null,
      supplier_note:        row['supplierNote'] != null ? String(row['supplierNote']) : null,
      submitted_at:         new Date(row['submittedAt'] as string | Date).toISOString(),
      submitted_by_user_id: row['submittedByUserId'] != null
        ? String(row['submittedByUserId'])
        : null,
      withdrawn_at:         row['withdrawnAt'] != null
        ? new Date(row['withdrawnAt'] as string | Date).toISOString()
        : null,
      withdraw_reason:      row['withdrawReason'] != null ? String(row['withdrawReason']) : null,
      created_at:           new Date(row['createdAt'] as string | Date).toISOString(),
      updated_at:           new Date(row['updatedAt'] as string | Date).toISOString(),
    };
  }

  // ── toQuoteOwnerRecord ────────────────────────────────────────────────────

  /**
   * Maps a DB quote row to NetworkPoolRfqSupplierQuoteOwnerRecord.
   * Owner-facing DTO — includes ownerOrgId, supplierOrgId, rfqId, poolId.
   * Excludes metadataInternalJson.
   */
  private toQuoteOwnerRecord(
    row: Record<string, unknown>,
  ): NetworkPoolRfqSupplierQuoteOwnerRecord {
    return {
      id:                   String(row['id']),
      owner_org_id:         String(row['ownerOrgId']),
      supplier_org_id:      String(row['supplierOrgId']),
      rfq_id:               String(row['rfqId']),
      pool_id:              String(row['poolId']),
      invite_id:            String(row['inviteId']),
      quote_ref:            String(row['quoteRef']),
      status:               String(row['status']),
      quote_amount:         String(row['quoteAmount']),
      currency:             String(row['currency']),
      validity_until:       row['validityUntil'] != null
        ? new Date(row['validityUntil'] as string | Date).toISOString()
        : null,
      supplier_note:        row['supplierNote'] != null ? String(row['supplierNote']) : null,
      submitted_at:         new Date(row['submittedAt'] as string | Date).toISOString(),
      submitted_by_user_id: row['submittedByUserId'] != null
        ? String(row['submittedByUserId'])
        : null,
      withdrawn_at:         row['withdrawnAt'] != null
        ? new Date(row['withdrawnAt'] as string | Date).toISOString()
        : null,
      accepted_at:          row['acceptedAt'] != null
        ? new Date(row['acceptedAt'] as string | Date).toISOString()
        : null,
      rejected_at:          row['rejectedAt'] != null
        ? new Date(row['rejectedAt'] as string | Date).toISOString()
        : null,
      reject_reason:        row['rejectReason'] != null ? String(row['rejectReason']) : null,
      created_at:           new Date(row['createdAt'] as string | Date).toISOString(),
      updated_at:           new Date(row['updatedAt'] as string | Date).toISOString(),
    };
  }

  // ── getSupplierQuote ──────────────────────────────────────────────────────

  /**
   * Supplier retrieves their quote for a specific invite.
   *
   * QD-5: Returns supplier-safe DTO — metadataInternalJson, ownerOrgId, rfqId,
   *       poolId and supplierOrgId are never included.
   * Scope: supplierOrgId must match orgId (tenant isolation).
   */
  async getSupplierQuote(
    orgId:    string,
    inviteId: string,
  ): Promise<NetworkPoolRfqSupplierQuoteSupplierRecord> {
    const row = await (this.db as any).networkPoolRfqSupplierQuote.findFirst({
      where: { inviteId, supplierOrgId: orgId },
    });

    if (!row) {
      throw new NetworkPoolRfqSupplierQuoteNotFoundError();
    }

    return this.toQuoteSupplierRecord(row as Record<string, unknown>);
  }

  // ── submitQuote ───────────────────────────────────────────────────────────

  /**
   * Supplier submits a quote against an accepted invite.
   *
   * QD-1: Invite effective status must be ACCEPTED.
   * QD-2: One quote per invite — conflict → NetworkPoolRfqSupplierQuoteConflictError (409).
   * QD-3: validity_until stored but not enforced (no lazy-expiry in Phase 1C).
   * QD-4: quoteAmount + currency required; validityUntil + supplierNote optional.
   * QD-5: metadataInternalJson NEVER exposed to suppliers.
   * QD-7: Direct tx.networkLifecycleLog.create — MUST NOT call StateMachineService.transition.
   * QD-8: If RFQ status === 'ISSUED', update to 'QUOTED' and write a second lifecycle log.
   *        If RFQ status === 'QUOTED', skip the RFQ update (already in target state).
   *        If CANCELLED / EXPIRED / ACCEPTED / REJECTED → throw NetworkPoolRfqSupplierQuoteInvalidInputError.
   */
  async submitQuote(
    orgId:    string,
    userId:   string | null,
    inviteId: string,
    input:    SubmitQuoteInput,
  ): Promise<NetworkPoolRfqSupplierQuoteSupplierRecord> {
    const createdRow = await this.db.$transaction(async (tx: any) => {
      // 1. Fetch invite scoped to supplier org (with RFQ join for status check)
      const invite = await (tx as any).networkPoolRfqSupplierInvite.findFirst({
        where:   { id: inviteId, supplierOrgId: orgId },
        include: { rfq: true },
      });

      if (!invite) {
        throw new NetworkPoolRfqSupplierInviteNotFoundError();
      }

      // 2. QD-1: Compute effective invite status — must be ACCEPTED
      const effectiveStatus = this.computeEffectiveInviteStatus(
        String(invite.status),
        invite.expiresAt ?? null,
      );

      if (effectiveStatus !== 'ACCEPTED') {
        throw new NetworkPoolRfqSupplierQuoteInviteNotAcceptedError(effectiveStatus);
      }

      // 3. QD-2: Check for existing quote (one per invite, non-partial unique in Phase 1C)
      const existingQuote = await (tx as any).networkPoolRfqSupplierQuote.findFirst({
        where: { inviteId },
      });

      if (existingQuote) {
        throw new NetworkPoolRfqSupplierQuoteConflictError();
      }

      // 4. QD-8: Validate RFQ status — must be ISSUED or QUOTED
      const rfqStatus = String((invite.rfq as Record<string, unknown>).status);
      if (!['ISSUED', 'QUOTED'].includes(rfqStatus)) {
        throw new NetworkPoolRfqSupplierQuoteInvalidInputError(
          `RFQ is not open for quotes. Current status: '${rfqStatus}'.`,
        );
      }

      // 5. Generate quoteRef — design §13.1 format: 'SQ-' + 16 hex chars uppercased
      const quoteRef = 'SQ-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();

      const now = new Date();

      // 6. Insert quote row
      const created = await (tx as any).networkPoolRfqSupplierQuote.create({
        data: {
          ownerOrgId:        String(invite.ownerOrgId),
          supplierOrgId:     orgId,
          rfqId:             String(invite.rfqId),
          poolId:            String(invite.poolId),
          inviteId:          inviteId,
          quoteRef:          quoteRef,
          status:            'SUBMITTED',
          quoteAmount:       input.quote_amount,
          currency:          input.currency,
          validityUntil:     input.validity_until != null
            ? new Date(input.validity_until as string)
            : null,
          supplierNote:      input.supplier_note ?? null,
          submittedAt:       now,
          submittedByUserId: userId ?? null,
          createdAt:         now,
          updatedAt:         now,
        },
      });

      // 7. QD-7: Write lifecycle log for quote_submitted
      //    entityType/entityId follow the existing POOL-anchored pattern (schema constraint:
      //    fromStateKey and toStateKey are non-nullable; pool state is unchanged).
      await (tx as any).networkLifecycleLog.create({
        data: {
          orgId:           orgId,
          entityType:      'POOL',
          entityId:        String(invite.poolId),
          fromStateKey:    'CLOSED_FOR_BIDS',
          toStateKey:      'CLOSED_FOR_BIDS',
          actorUserId:     userId ?? null,
          actorAdminId:    null,
          actorType:       'TENANT_USER',
          actorRole:       'NC_SUPPLIER',
          escalationLevel: null,
          makerUserId:     null,
          checkerUserId:   null,
          aiTriggered:     false,
          impersonationId: null,
          reason:          `nc_pool_rfq_supplier_quote_submitted: invite=${inviteId}, quote=${String(created.id)}, rfq=${String(invite.rfqId)}`,
          requestId:       input.request_id ?? null,
        },
      });

      // 8. QD-8: If RFQ was ISSUED, transition it to QUOTED
      if (rfqStatus === 'ISSUED') {
        await (tx as any).networkPoolRfq.update({
          where: { id: String(invite.rfqId) },
          data:  { status: 'QUOTED', updatedAt: now },
        });

        await (tx as any).networkLifecycleLog.create({
          data: {
            orgId:           String(invite.ownerOrgId),
            entityType:      'POOL',
            entityId:        String(invite.poolId),
            fromStateKey:    'CLOSED_FOR_BIDS',
            toStateKey:      'CLOSED_FOR_BIDS',
            actorUserId:     userId ?? null,
            actorAdminId:    null,
            actorType:       'TENANT_USER',
            actorRole:       'NC_SUPPLIER',
            escalationLevel: null,
            makerUserId:     null,
            checkerUserId:   null,
            aiTriggered:     false,
            impersonationId: null,
            reason:          `nc_pool_rfq_status_changed_to_quoted: invite=${inviteId}, quote=${String(created.id)}, rfq=${String(invite.rfqId)}`,
            requestId:       input.request_id ?? null,
          },
        });
      }

      return created;
    });

    return this.toQuoteSupplierRecord(createdRow as Record<string, unknown>);
  }

  // ── listOwnerQuotes ───────────────────────────────────────────────────────

  /**
   * Pool owner retrieves all quotes submitted for a specific RFQ.
   * Returns [] when no quotes exist — not a 404.
   */
  async listOwnerQuotes(
    ownerOrgId: string,
    poolId:     string,
    rfqId:      string,
  ): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord[]> {
    const rows = await (this.db as any).networkPoolRfqSupplierQuote.findMany({
      where:   { ownerOrgId, poolId, rfqId },
      orderBy: { submittedAt: 'desc' },
    });
    return (rows as Record<string, unknown>[]).map((r) => this.toQuoteOwnerRecord(r));
  }

  // ── acceptQuote ───────────────────────────────────────────────────────────

  /**
   * Pool owner accepts one SUBMITTED quote.
   *
   * AD-1: Mass-reject all other SUBMITTED quotes for the same RFQ atomically.
   * AD-4: Pool MUST transition CLOSED_FOR_BIDS→QUOTED (if not already QUOTED), then QUOTED→ACCEPTED.
   * QD-8: RFQ status update is a direct DB update — NOT an SM transition.
   */
  async acceptQuote(
    ownerOrgId: string,
    userId:     string | null,
    poolId:     string,
    rfqId:      string,
    quoteId:    string,
    input:      AcceptQuoteInput,
  ): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord> {
    // Pre-load lifecycle state IDs for QUOTED and ACCEPTED (outside transaction)
    const [quotedState, acceptedState] = await Promise.all([
      (this.db as any).lifecycleState.findUnique({
        where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'QUOTED' } },
        select: { id: true, stateKey: true },
      }) as Promise<{ id: string; stateKey: string } | null>,
      (this.db as any).lifecycleState.findUnique({
        where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'ACCEPTED' } },
        select: { id: true, stateKey: true },
      }) as Promise<{ id: string; stateKey: string } | null>,
    ]);

    if (!quotedState) {
      throw new NetworkPoolRfqInvalidPoolStateError(
        'POOL lifecycle state QUOTED not found in database.',
      );
    }
    if (!acceptedState) {
      throw new NetworkPoolRfqInvalidPoolStateError(
        'POOL lifecycle state ACCEPTED not found in database.',
      );
    }

    const acceptedRow = await this.db.$transaction(
      async (tx) => {
      // 1. Load pool
      const pool = await (tx as any).networkPool.findFirst({
        where:   { id: poolId, orgId: ownerOrgId },
        include: { lifecycleState: { select: { stateKey: true, id: true } } },
      });
      if (!pool) {
        throw new NetworkPoolRfqPoolNotFoundError();
      }

      // 2. Pool state must be CLOSED_FOR_BIDS or QUOTED
      const poolStateKey: string = (pool.lifecycleState as any).stateKey;
      if (poolStateKey !== 'CLOSED_FOR_BIDS' && poolStateKey !== 'QUOTED') {
        throw new NetworkPoolRfqInvalidPoolStateError(
          `Pool must be in CLOSED_FOR_BIDS or QUOTED state to accept a quote. Current: '${poolStateKey}'.`,
        );
      }

      // 3. Load RFQ
      const rfq = await (tx as any).networkPoolRfq.findFirst({
        where: { id: rfqId, poolId, ownerOrgId },
      });
      if (!rfq) {
        throw new NetworkPoolRfqRfqNotFoundError();
      }
      if ((rfq as any).status !== 'QUOTED') {
        throw new NetworkPoolRfqTransitionDeniedError(
          'RFQ_NOT_QUOTED',
          `RFQ status must be QUOTED to accept a quote. Current: '${(rfq as any).status}'.`,
        );
      }

      // 4. Load the specific quote
      const quote = await (tx as any).networkPoolRfqSupplierQuote.findFirst({
        where: { id: quoteId, rfqId, ownerOrgId },
      });
      if (!quote) {
        throw new NetworkPoolRfqOwnerQuoteNotFoundError();
      }
      if ((quote as any).status !== 'SUBMITTED') {
        throw new NetworkPoolRfqSupplierQuoteNotInSubmittedError((quote as any).status);
      }

      const now = new Date();

      // 5. Update the accepted quote
      const updatedQuote = await (tx as any).networkPoolRfqSupplierQuote.update({
        where: { id: quoteId },
        data:  { status: 'ACCEPTED', acceptedAt: now, updatedAt: now },
      });

      // 6. AD-1: Mass-reject all other SUBMITTED quotes for this RFQ atomically
      await (tx as any).networkPoolRfqSupplierQuote.updateMany({
        where: { rfqId, ownerOrgId, status: 'SUBMITTED', id: { not: quoteId } },
        data:  { status: 'REJECTED', rejectedAt: now, updatedAt: now },
      });

      // 7. QD-8: Update RFQ status — direct DB update, NOT an SM transition
      await (tx as any).networkPoolRfq.update({
        where: { id: rfqId },
        data:  { status: 'ACCEPTED', updatedAt: now },
      });

      // 8. AD-4: Pool CLOSED_FOR_BIDS → QUOTED (only if pool was not already QUOTED)
      if (poolStateKey === 'CLOSED_FOR_BIDS') {
        const sm1Result = await this.stateMachine.transition(
          {
            entityType:   'POOL',
            entityId:     poolId,
            orgId:        ownerOrgId,
            fromStateKey: 'CLOSED_FOR_BIDS',
            toStateKey:   'QUOTED',
            actorType:    'TENANT_ADMIN',
            actorUserId:  userId ?? null,
            actorAdminId: null,
            actorRole:    'NC_POOL_ADMIN',
            reason:       `nc_pool_rfq_quote_accept_pool_to_quoted: rfq=${rfqId}, quote=${quoteId}`,
            requestId:    input.request_id ?? null,
          },
          { db: tx as unknown as PrismaClient },
        );
        if (sm1Result.status !== 'APPLIED') {
          const denied = sm1Result as { status: string; code?: string; message?: string };
          throw new NetworkPoolRfqTransitionDeniedError(
            denied.code ?? sm1Result.status,
            denied.message ?? `SM returned status '${sm1Result.status}'`,
          );
        }
        await (tx as any).networkPool.update({
          where: { id: poolId },
          data:  { lifecycleStateId: quotedState.id, updatedAt: now },
        });
      }

      // 9. AD-4: Pool QUOTED → ACCEPTED
      const sm2Result = await this.stateMachine.transition(
        {
          entityType:   'POOL',
          entityId:     poolId,
          orgId:        ownerOrgId,
          fromStateKey: 'QUOTED',
          toStateKey:   'ACCEPTED',
          actorType:    'TENANT_ADMIN',
          actorUserId:  userId ?? null,
          actorAdminId: null,
          actorRole:    'NC_POOL_ADMIN',
          reason:       `nc_pool_rfq_quote_accept_pool_to_accepted: rfq=${rfqId}, quote=${quoteId}`,
          requestId:    input.request_id ?? null,
        },
        { db: tx as unknown as PrismaClient },
      );
      if (sm2Result.status !== 'APPLIED') {
        const denied = sm2Result as { status: string; code?: string; message?: string };
        throw new NetworkPoolRfqTransitionDeniedError(
          denied.code ?? sm2Result.status,
          denied.message ?? `SM returned status '${sm2Result.status}'`,
        );
      }
      await (tx as any).networkPool.update({
        where: { id: poolId },
        data:  { lifecycleStateId: acceptedState.id, updatedAt: now },
      });

      // 10. Direct award event log (ACCEPTED → ACCEPTED, records the award decision)
      await (tx as any).networkLifecycleLog.create({
        data: {
          orgId:           ownerOrgId,
          entityType:      'POOL',
          entityId:        poolId,
          fromStateKey:    'ACCEPTED',
          toStateKey:      'ACCEPTED',
          actorUserId:     userId ?? null,
          actorAdminId:    null,
          actorType:       'TENANT_ADMIN',
          actorRole:       'NC_POOL_ADMIN',
          escalationLevel: null,
          makerUserId:     null,
          checkerUserId:   null,
          aiTriggered:     false,
          impersonationId: null,
          reason:          `nc_pool_rfq_quote_accepted: quote=${quoteId}, rfq=${rfqId}, pool=${poolId}`,
          requestId:       input.request_id ?? null,
        },
      });

      return updatedQuote;
      },
      { timeout: 30000 },
    );

    return this.toQuoteOwnerRecord(acceptedRow as Record<string, unknown>);
  }

  // ── rejectQuote ───────────────────────────────────────────────────────────

  /**
   * Pool owner rejects one SUBMITTED quote.
   *
   * AD-5: Does NOT transition the pool. Pool state remains unchanged.
   * QD-8: No RFQ status change.
   * Lifecycle log uses actual current pool state (NOT hard-coded).
   */
  async rejectQuote(
    ownerOrgId: string,
    userId:     string | null,
    poolId:     string,
    rfqId:      string,
    quoteId:    string,
    input:      RejectQuoteInput,
  ): Promise<NetworkPoolRfqSupplierQuoteOwnerRecord> {
    const rejectedRow = await this.db.$transaction(async (tx) => {
      // 1. Load pool
      const pool = await (tx as any).networkPool.findFirst({
        where:   { id: poolId, orgId: ownerOrgId },
        include: { lifecycleState: { select: { stateKey: true, id: true } } },
      });
      if (!pool) {
        throw new NetworkPoolRfqPoolNotFoundError();
      }

      // 2. Pool state must be CLOSED_FOR_BIDS or QUOTED
      const poolStateKey: string = (pool.lifecycleState as any).stateKey;
      if (poolStateKey !== 'CLOSED_FOR_BIDS' && poolStateKey !== 'QUOTED') {
        throw new NetworkPoolRfqInvalidPoolStateError(
          `Pool must be in CLOSED_FOR_BIDS or QUOTED state to reject a quote. Current: '${poolStateKey}'.`,
        );
      }

      // 3. Load RFQ
      const rfq = await (tx as any).networkPoolRfq.findFirst({
        where: { id: rfqId, poolId, ownerOrgId },
      });
      if (!rfq) {
        throw new NetworkPoolRfqRfqNotFoundError();
      }
      if ((rfq as any).status !== 'QUOTED') {
        throw new NetworkPoolRfqTransitionDeniedError(
          'RFQ_NOT_QUOTED',
          `RFQ status must be QUOTED to reject a quote. Current: '${(rfq as any).status}'.`,
        );
      }

      // 4. Load the specific quote
      const quote = await (tx as any).networkPoolRfqSupplierQuote.findFirst({
        where: { id: quoteId, rfqId, ownerOrgId },
      });
      if (!quote) {
        throw new NetworkPoolRfqOwnerQuoteNotFoundError();
      }
      if ((quote as any).status !== 'SUBMITTED') {
        throw new NetworkPoolRfqSupplierQuoteNotInSubmittedError((quote as any).status);
      }

      const now = new Date();

      // 5. Update the rejected quote
      const updatedQuote = await (tx as any).networkPoolRfqSupplierQuote.update({
        where: { id: quoteId },
        data:  {
          status:       'REJECTED',
          rejectedAt:   now,
          rejectReason: input.reject_reason ?? null,
          updatedAt:    now,
        },
      });

      // 6. AD-5: NO pool state change. NO RFQ status change.

      // 7. Lifecycle log — use actual current pool state (NOT hard-coded CLOSED_FOR_BIDS)
      await (tx as any).networkLifecycleLog.create({
        data: {
          orgId:           ownerOrgId,
          entityType:      'POOL',
          entityId:        poolId,
          fromStateKey:    poolStateKey,
          toStateKey:      poolStateKey,
          actorUserId:     userId ?? null,
          actorAdminId:    null,
          actorType:       'TENANT_ADMIN',
          actorRole:       'NC_POOL_ADMIN',
          escalationLevel: null,
          makerUserId:     null,
          checkerUserId:   null,
          aiTriggered:     false,
          impersonationId: null,
          reason:          `nc_pool_rfq_quote_rejected: quote=${quoteId}, rfq=${rfqId}, pool=${poolId}`,
          requestId:       input.request_id ?? null,
        },
      });

      return updatedQuote;
    });

    return this.toQuoteOwnerRecord(rejectedRow as Record<string, unknown>);
  }

  // ── G-021: Award Maker-Checker Private Helpers ───────────────────────────────

  /** G-021: Build frozen payload object for a POOL→ACCEPTED award approval. */
  private buildFrozenPayload(params: {
    orgId:    string;
    poolId:   string;
    rfqId:    string;
    quoteId:  string;
  }): Record<string, string> {
    return {
      orgId:   params.orgId,
      poolId:  params.poolId,
      rfqId:   params.rfqId,
      quoteId: params.quoteId,
    };
  }

  /** G-021: SHA-256 hex over alphabetically-sorted canonical JSON stringify. */
  private hashFrozenPayload(payload: object): string {
    const sorted = Object.fromEntries(
      Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
    );
    return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  }

  /** G-021 D-021-C: "{actorType}:{userId}" maker principal fingerprint. */
  private buildMakerPrincipalFingerprint(actorType: string, userId: string): string {
    return `${actorType}:${userId}`;
  }

  /** Map pending_approvals DB row → AwardApprovalRequest DTO. */
  private toAwardApprovalRequest(row: Record<string, unknown>): AwardApprovalRequest {
    return {
      id:                   String(row['id']),
      status:               String(row['status']),
      expires_at:           new Date(row['expiresAt'] as Date | string).toISOString(),
      entity_type:          String(row['entityType']),
      entity_id:            String(row['entityId']),
      from_state_key:       String(row['fromStateKey']),
      to_state_key:         String(row['toStateKey']),
      requested_by_user_id: row['requestedByUserId'] != null ? String(row['requestedByUserId']) : null,
      request_reason:       row['requestReason'] != null ? String(row['requestReason']) : null,
      created_at:           new Date(row['createdAt'] as Date | string).toISOString(),
    };
  }

  /** Assert pending_approvals row is REQUESTED and not expired. */
  private assertApprovalRequestedAndNotExpired(row: Record<string, unknown>): void {
    const status = String(row['status']);
    if (status !== 'REQUESTED') {
      throw new NetworkPoolRfqApprovalAlreadyDecidedError(status);
    }
    const expiresAt = row['expiresAt'] as Date;
    if (expiresAt <= new Date()) {
      throw new NetworkPoolRfqApprovalExpiredError();
    }
  }

  /** Assert checker ≠ maker (D-021-C maker-checker separation). */
  private assertMakerCheckerSeparated(row: Record<string, unknown>, checkerUserId: string): void {
    const makerUserId = row['requestedByUserId'] != null ? String(row['requestedByUserId']) : null;
    if (makerUserId != null && makerUserId === checkerUserId) {
      throw new NetworkPoolRfqMakerCheckerSameActorError();
    }
  }

  // ── requestAward ─────────────────────────────────────────────────────────────

  /**
   * Maker (TENANT_ADMIN) requests award approval for a SUBMITTED quote.
   *
   * G-021 §4: SM QUOTED→ACCEPTED returns PENDING_APPROVAL for TENANT_ADMIN actor.
   * If pool is CLOSED_FOR_BIDS, advances pool CLOSED_FOR_BIDS→QUOTED first.
   * Inserts pending_approvals row; D-021 partial unique index prevents duplicates.
   * Does NOT accept the quote or update RFQ/pool to ACCEPTED.
   *
   * @throws NetworkPoolRfqAwardRequestAlreadyPendingError on P2002 unique violation.
   */
  async requestAward(
    orgId:        string,
    makerUserId:  string,
    poolId:       string,
    rfqId:        string,
    quoteId:      string,
    input:        RequestAwardInput,
  ): Promise<AwardApprovalRequest> {
    // Pre-load QUOTED lifecycle state (needed if pool is CLOSED_FOR_BIDS)
    const quotedState = await (this.db as any).lifecycleState.findUnique({
      where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'QUOTED' } },
      select: { id: true, stateKey: true },
    }) as { id: string; stateKey: string } | null;

    try {
      const approvalRow = await this.db.$transaction(async (tx) => {
        // 1. Verify pool ownership
        const pool = await (tx as any).networkPool.findFirst({
          where:   { id: poolId, orgId },
          include: { lifecycleState: { select: { stateKey: true, id: true } } },
        });
        if (!pool) {
          throw new NetworkPoolRfqPoolNotFoundError();
        }
        const poolStateKey: string = (pool.lifecycleState as any).stateKey;

        // 2. Verify RFQ is QUOTED
        const rfq = await (tx as any).networkPoolRfq.findFirst({
          where: { id: rfqId, poolId, ownerOrgId: orgId },
        });
        if (!rfq) {
          throw new NetworkPoolRfqRfqNotFoundError();
        }
        if ((rfq as any).status !== 'QUOTED') {
          throw new NetworkPoolRfqTransitionDeniedError(
            'RFQ_NOT_QUOTED',
            `RFQ status must be QUOTED to request award. Current: '${(rfq as any).status}'.`,
          );
        }

        // 3. Verify quote is SUBMITTED
        const quote = await (tx as any).networkPoolRfqSupplierQuote.findFirst({
          where: { id: quoteId, rfqId, ownerOrgId: orgId },
        });
        if (!quote) {
          throw new NetworkPoolRfqOwnerQuoteNotFoundError();
        }
        if ((quote as any).status !== 'SUBMITTED') {
          throw new NetworkPoolRfqSupplierQuoteNotInSubmittedError((quote as any).status);
        }

        const now = new Date();

        // 4. If pool is CLOSED_FOR_BIDS, advance to QUOTED first (same as acceptQuote step 8)
        if (poolStateKey === 'CLOSED_FOR_BIDS') {
          if (!quotedState) {
            throw new NetworkPoolRfqInvalidPoolStateError(
              'POOL lifecycle state QUOTED not found in database.',
            );
          }
          const sm1Result = await this.stateMachine.transition(
            {
              entityType:   'POOL',
              entityId:     poolId,
              orgId,
              fromStateKey: 'CLOSED_FOR_BIDS',
              toStateKey:   'QUOTED',
              actorType:    'TENANT_ADMIN',
              actorUserId:  makerUserId,
              actorAdminId: null,
              actorRole:    'NC_POOL_ADMIN',
              reason:       `nc_pool_rfq_award_request_pool_to_quoted: rfq=${rfqId}, quote=${quoteId}`,
              requestId:    input.request_id ?? null,
            },
            { db: tx as unknown as PrismaClient },
          );
          if (sm1Result.status !== 'APPLIED') {
            const denied = sm1Result as { status: string; code?: string; message?: string };
            throw new NetworkPoolRfqTransitionDeniedError(
              denied.code ?? sm1Result.status,
              denied.message ?? `SM returned status '${sm1Result.status}'`,
            );
          }
          await (tx as any).networkPool.update({
            where: { id: poolId },
            data:  { lifecycleStateId: quotedState.id, updatedAt: now },
          });
        } else if (poolStateKey !== 'QUOTED') {
          throw new NetworkPoolRfqInvalidPoolStateError(
            `Pool must be in CLOSED_FOR_BIDS or QUOTED state to request award. Current: '${poolStateKey}'.`,
          );
        }

        // 5. SM QUOTED→ACCEPTED with TENANT_ADMIN actor → expect PENDING_APPROVAL
        const smResult = await this.stateMachine.transition(
          {
            entityType:   'POOL',
            entityId:     poolId,
            orgId,
            fromStateKey: 'QUOTED',
            toStateKey:   'ACCEPTED',
            actorType:    'TENANT_ADMIN',
            actorUserId:  makerUserId,
            actorAdminId: null,
            actorRole:    'NC_POOL_ADMIN',
            reason:       `nc_pool_rfq_award_approval_requested: maker=${makerUserId}, rfq=${rfqId}, quote=${quoteId}`,
            requestId:    input.request_id ?? null,
          },
          { db: tx as unknown as PrismaClient },
        );
        if (smResult.status !== 'PENDING_APPROVAL') {
          const denied = smResult as { status: string; code?: string; message?: string };
          throw new NetworkPoolRfqTransitionDeniedError(
            denied.code ?? smResult.status,
            denied.message ?? `SM returned status '${smResult.status}' — expected PENDING_APPROVAL`,
          );
        }

        // 6. INSERT pending_approvals row
        const frozenPayload            = this.buildFrozenPayload({ orgId, poolId, rfqId, quoteId });
        const frozenPayloadHash        = this.hashFrozenPayload(frozenPayload);
        const makerPrincipalFingerprint = this.buildMakerPrincipalFingerprint('TENANT_ADMIN', makerUserId);
        const expiresAt                = new Date(now.getTime() + AWARD_APPROVAL_TTL_MS);

        return await (tx as any).pendingApproval.create({
          data: {
            orgId,
            entityType:                'POOL',
            entityId:                 poolId,
            fromStateKey:             'QUOTED',
            toStateKey:               'ACCEPTED',
            requestedByUserId:        makerUserId,
            requestedByAdminId:       null,
            requestedByActorType:     'TENANT_ADMIN',
            requestedByRole:          'NC_POOL_ADMIN',
            requestReason:            input.request_reason,
            frozenPayload,
            frozenPayloadHash,
            makerPrincipalFingerprint,
            status:                   'REQUESTED',
            attemptCount:             1,
            expiresAt,
            escalationId:             null,
            aiTriggered:              false,
            impersonationId:          null,
            requestId:                input.request_id ?? null,
          },
        });
      }, { timeout: 30000 });

      return this.toAwardApprovalRequest(approvalRow as Record<string, unknown>);
    } catch (err) {
      if (
        err instanceof NetworkPoolRfqPoolNotFoundError              ||
        err instanceof NetworkPoolRfqInvalidPoolStateError          ||
        err instanceof NetworkPoolRfqRfqNotFoundError               ||
        err instanceof NetworkPoolRfqOwnerQuoteNotFoundError        ||
        err instanceof NetworkPoolRfqSupplierQuoteNotInSubmittedError ||
        err instanceof NetworkPoolRfqTransitionDeniedError
      ) {
        throw err;
      }
      // P2002 on partial unique index (org_id, entity_type, entity_id, from_state_key, to_state_key)
      // WHERE status IN ('REQUESTED','ESCALATED') → already pending
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new NetworkPoolRfqAwardRequestAlreadyPendingError();
      }
      throw err;
    }
  }

  // ── approveAward ──────────────────────────────────────────────────────────────

  /**
   * Checker (CHECKER actor) approves a pending award approval request.
   *
   * G-021 §4: SM QUOTED→ACCEPTED with CHECKER + makerUserId returns APPLIED.
   * Advances pool to ACCEPTED, accepts quote, mass-rejects others, closes RFQ.
   * Inserts ApprovalSignature; D-021-C DB trigger enforces maker ≠ checker at DB layer.
   *
   * @throws NetworkPoolRfqApprovalNotFoundError if approval not found or tampered.
   * @throws NetworkPoolRfqApprovalAlreadyDecidedError if not REQUESTED.
   * @throws NetworkPoolRfqApprovalExpiredError if TTL elapsed.
   * @throws NetworkPoolRfqMakerCheckerSameActorError if checker === maker.
   * @throws NetworkPoolRfqQuoteNoLongerSubmittedError if quote moved out of SUBMITTED.
   */
  async approveAward(
    orgId:          string,
    checkerUserId:  string,
    approvalId:     string,
    input:          ApproveAwardInput,
  ): Promise<AwardApproved> {
    // Pre-load ACCEPTED lifecycle state ID (needed to update pool after SM returns APPLIED)
    const acceptedState = await (this.db as any).lifecycleState.findUnique({
      where:  { entityType_stateKey: { entityType: 'POOL', stateKey: 'ACCEPTED' } },
      select: { id: true, stateKey: true },
    }) as { id: string; stateKey: string } | null;
    if (!acceptedState) {
      throw new NetworkPoolRfqInvalidPoolStateError(
        'POOL lifecycle state ACCEPTED not found in database.',
      );
    }

    const txResult = await this.db.$transaction(async (tx) => {
      // 1. Load pending_approvals by { id: approvalId, orgId }
      const approval = await (tx as any).pendingApproval.findFirst({
        where: { id: approvalId, orgId },
      });
      if (!approval) {
        throw new NetworkPoolRfqApprovalNotFoundError();
      }

      // 2. Assert REQUESTED and not expired
      this.assertApprovalRequestedAndNotExpired(approval as Record<string, unknown>);

      // 3. Verify frozen payload hash
      const storedPayload  = (approval as any).frozenPayload as Record<string, unknown>;
      const recomputedHash = this.hashFrozenPayload(storedPayload);
      if (recomputedHash !== String((approval as any).frozenPayloadHash)) {
        throw new NetworkPoolRfqApprovalNotFoundError();
      }

      // 4. Enforce checker ≠ maker
      this.assertMakerCheckerSeparated(approval as Record<string, unknown>, checkerUserId);

      // Extract coordinates from frozen payload
      const poolId      = String(storedPayload['poolId']);
      const rfqId       = String(storedPayload['rfqId']);
      const quoteId     = String(storedPayload['quoteId']);
      const makerUserId = (approval as any).requestedByUserId as string | null;

      // 5. Re-load quote; verify still SUBMITTED
      const quote = await (tx as any).networkPoolRfqSupplierQuote.findFirst({
        where: { id: quoteId, rfqId, ownerOrgId: orgId },
      });
      if (!quote) {
        throw new NetworkPoolRfqOwnerQuoteNotFoundError();
      }
      if ((quote as any).status !== 'SUBMITTED') {
        throw new NetworkPoolRfqQuoteNoLongerSubmittedError((quote as any).status);
      }

      const now = new Date();

      // 6. SM QUOTED→ACCEPTED with CHECKER actor + makerUserId + checkerUserId → expect APPLIED
      const smResult = await this.stateMachine.transition(
        {
          entityType:    'POOL',
          entityId:      poolId,
          orgId,
          fromStateKey:  'QUOTED',
          toStateKey:    'ACCEPTED',
          actorType:     'CHECKER',
          actorUserId:   checkerUserId,
          actorAdminId:  null,
          actorRole:     'NC_POOL_ADMIN',
          makerUserId:   makerUserId ?? undefined,
          checkerUserId: checkerUserId,
          reason:        `nc_pool_rfq_award_approved: checker=${checkerUserId}, maker=${makerUserId ?? 'unknown'}, rfq=${rfqId}, quote=${quoteId}`,
          requestId:     input.request_id ?? null,
        },
        { db: tx as unknown as PrismaClient },
      );
      if (smResult.status !== 'APPLIED') {
        const denied = smResult as { status: string; code?: string; message?: string };
        throw new NetworkPoolRfqTransitionDeniedError(
          denied.code ?? smResult.status,
          denied.message ?? `SM returned status '${smResult.status}' — expected APPLIED`,
        );
      }

      // Update pool.lifecycleStateId → ACCEPTED
      await (tx as any).networkPool.update({
        where: { id: poolId },
        data:  { lifecycleStateId: acceptedState.id, updatedAt: now },
      });

      // 7. UPDATE quote status='ACCEPTED'
      const updatedQuote = await (tx as any).networkPoolRfqSupplierQuote.update({
        where: { id: quoteId },
        data:  { status: 'ACCEPTED', acceptedAt: now, updatedAt: now },
      });

      // 8. AD-1: Mass-reject all other SUBMITTED quotes for same RFQ
      await (tx as any).networkPoolRfqSupplierQuote.updateMany({
        where: { rfqId, ownerOrgId: orgId, status: 'SUBMITTED', id: { not: quoteId } },
        data:  { status: 'REJECTED', rejectedAt: now, updatedAt: now },
      });

      // 9. QD-8: UPDATE RFQ status='ACCEPTED' — direct DB update
      await (tx as any).networkPoolRfq.update({
        where: { id: rfqId },
        data:  { status: 'ACCEPTED', updatedAt: now },
      });

      // 10. UPDATE pending_approvals status='APPROVED'
      const updatedApproval = await (tx as any).pendingApproval.update({
        where: { id: approvalId },
        data:  { status: 'APPROVED', updatedAt: now },
      });

      // 11. INSERT ApprovalSignature (decision='APPROVE')
      await (tx as any).approvalSignature.create({
        data: {
          approvalId,
          orgId,
          signerUserId:    checkerUserId,
          signerAdminId:   null,
          signerActorType: 'CHECKER',
          signerRole:      'NC_POOL_ADMIN',
          decision:        'APPROVE',
          reason:          input.approve_reason,
          impersonationId: null,
        },
      });

      return {
        approval: updatedApproval as Record<string, unknown>,
        quote:    updatedQuote   as Record<string, unknown>,
      };
    }, { timeout: 30000 });

    return {
      approval: this.toAwardApprovalRequest(txResult.approval),
      quote:    this.toQuoteOwnerRecord(txResult.quote),
    };
  }

  // ── rejectAwardApproval ───────────────────────────────────────────────────────

  /**
   * Checker rejects a pending award approval request.
   *
   * G-021 §4: No SM call. Pool, RFQ, and quote states are NOT changed.
   * Sets pending_approvals.status='REJECTED'; inserts ApprovalSignature.
   *
   * @throws NetworkPoolRfqApprovalNotFoundError if approval not found or already decided.
   * @throws NetworkPoolRfqApprovalExpiredError if TTL elapsed.
   * @throws NetworkPoolRfqMakerCheckerSameActorError if checker === maker.
   */
  async rejectAwardApproval(
    orgId:          string,
    checkerUserId:  string,
    approvalId:     string,
    input:          RejectAwardApprovalInput,
  ): Promise<AwardRejected> {
    const updatedApproval = await this.db.$transaction(async (tx) => {
      // 1. Load pending_approvals scoped to { id, orgId, status: 'REQUESTED' }
      const approval = await (tx as any).pendingApproval.findFirst({
        where: { id: approvalId, orgId, status: 'REQUESTED' },
      });
      if (!approval) {
        throw new NetworkPoolRfqApprovalNotFoundError();
      }

      // 2. Verify not expired
      const expiresAt = (approval as any).expiresAt as Date;
      if (expiresAt <= new Date()) {
        throw new NetworkPoolRfqApprovalExpiredError();
      }

      // 3. Enforce checker ≠ maker
      this.assertMakerCheckerSeparated(approval as Record<string, unknown>, checkerUserId);

      const now = new Date();

      // 4. No SM call. No pool/RFQ/quote state change.

      // 5. UPDATE pending_approvals status='REJECTED'
      const updated = await (tx as any).pendingApproval.update({
        where: { id: approvalId },
        data:  { status: 'REJECTED', updatedAt: now },
      });

      // 6. INSERT ApprovalSignature (decision='REJECT')
      await (tx as any).approvalSignature.create({
        data: {
          approvalId,
          orgId,
          signerUserId:    checkerUserId,
          signerAdminId:   null,
          signerActorType: 'CHECKER',
          signerRole:      'NC_POOL_ADMIN',
          decision:        'REJECT',
          reason:          input.reject_reason,
          impersonationId: null,
        },
      });

      return updated;
    });

    return { approval: this.toAwardApprovalRequest(updatedApproval as Record<string, unknown>) };
  }

  // ── getOwnerPendingAwardApprovals ─────────────────────────────────────────────

  /**
   * Owner retrieves REQUESTED award approvals for a specific pool+RFQ.
   *
   * G-021 §4: Filters by orgId, entityType='POOL', entityId=poolId, status='REQUESTED'.
   * Post-filters application-side by frozenPayload.rfqId for RFQ scoping.
   * Does NOT include frozenPayloadHash or makerPrincipalFingerprint in the response.
   */
  async getOwnerPendingAwardApprovals(
    orgId:  string,
    poolId: string,
    rfqId:  string,
  ): Promise<AwardApprovalRequest[]> {
    const rows = await (this.db as any).pendingApproval.findMany({
      where: {
        orgId,
        entityType: 'POOL',
        entityId:   poolId,
        status:     'REQUESTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Post-filter: scope to rows whose frozenPayload.rfqId matches
    const filtered = (rows as Record<string, unknown>[]).filter((row) => {
      const payload = row['frozenPayload'] as Record<string, unknown> | null;
      return payload != null && String(payload['rfqId']) === rfqId;
    });

    return filtered.map((row) => this.toAwardApprovalRequest(row));
  }
}
