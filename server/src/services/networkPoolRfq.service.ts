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

import { randomUUID } from 'crypto';
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
      const rfqRow = await this.db.$transaction(async (tx) => {
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
      });

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
}
