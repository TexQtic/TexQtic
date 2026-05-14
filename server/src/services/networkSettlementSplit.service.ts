/**
 * Network Commerce — Settlement Visibility & Payable-Split Foundation
 *
 * TEXQTIC-NC-PHASE1-POOL-SETTLE-001
 *
 * Doctrine alignment:
 *   - TexQtic is NOT a payment executor, PSP, escrow custodian, lender, or funder.
 *   - This service provides settlement VISIBILITY only: status reads and a
 *     non-mutating preview of how net-payable amounts would be split across
 *     waterfall participants.
 *   - `createPoolSettlementSplits` creates rows in PENDING state with
 *     escrowAccountId = null.  It does NOT trigger, release, or disburse.
 *   - No pool lifecycle mutation, no invoice paid-state mutation in this packet.
 *   - Packet 21 (TRIGGERED → RELEASED flow) is explicitly out of scope.
 *
 * TradeTrust Pay vocabulary used throughout:
 *   settlementVisibilityStatus | payableSplits | paymentTermsDays
 *   paymentDueDate | maturityStatus | financeReadinessStatus
 *
 * NEVER use: releaseStatus | payoutStatus | disbursementStatus | escrowReleaseStatus
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ─── Feature-flag key ────────────────────────────────────────────────────────

export const NC_SETTLEMENT_FEATURE_FLAG = 'nc.settlement_waterfall.enabled';

// ─── Constants ───────────────────────────────────────────────────────────────

export const NC_SETTLEMENT_ENTITY_TYPE = 'POOL' as const;

const VALID_SPLIT_STATUSES = ['PENDING', 'TRIGGERED', 'RELEASED', 'FAILED'] as const;
export type SplitStatus = (typeof VALID_SPLIT_STATUSES)[number];

export const MATURITY_STATUS = {
  OVERDUE: 'OVERDUE',
  DUE_TODAY: 'DUE_TODAY',
  UPCOMING: 'UPCOMING',
  NO_DUE_DATE: 'NO_DUE_DATE',
} as const;
export type MaturityStatus = (typeof MATURITY_STATUS)[keyof typeof MATURITY_STATUS];

export const FINANCE_READINESS_STATUS = {
  SPLITS_PRESENT: 'SPLITS_PRESENT',
  NO_SPLITS: 'NO_SPLITS',
  PARTIAL: 'PARTIAL',
} as const;
export type FinanceReadinessStatus =
  (typeof FINANCE_READINESS_STATUS)[keyof typeof FINANCE_READINESS_STATUS];

// ─── Error classes ────────────────────────────────────────────────────────────

export class NetworkSettlementSplitPoolNotFoundError extends Error {
  constructor() {
    super('Pool not found');
    this.name = 'NetworkSettlementSplitPoolNotFoundError';
  }
}

export class NetworkSettlementSplitNotFoundError extends Error {
  constructor() {
    super('Settlement split not found');
    this.name = 'NetworkSettlementSplitNotFoundError';
  }
}

export class NetworkSettlementSplitFeatureDisabledError extends Error {
  constructor() {
    super('Settlement waterfall feature is disabled');
    this.name = 'NetworkSettlementSplitFeatureDisabledError';
  }
}

export class NetworkSettlementSplitAlreadyExistsError extends Error {
  constructor() {
    super('Settlement splits already exist for this pool');
    this.name = 'NetworkSettlementSplitAlreadyExistsError';
  }
}

export class NetworkSettlementSplitInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkSettlementSplitInvalidInputError';
  }
}

// ─── DTO types ────────────────────────────────────────────────────────────────

export interface PayableSplitDto {
  id: string;
  recipientOrgId: string;
  waterfallSeq: number;
  currency: string;
  grossAmount: string;
  holdbackAmount: string;
  penaltyDeduction: string;
  netPayable: string;
  /** TradeTrust Pay vocab — never "status" in financial readout context */
  settlementVisibilityStatus: SplitStatus;
  escrowAccountId: string | null;
  triggeredAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoolSettlementStatusResult {
  poolId: string;
  orgId: string;
  payableSplits: PayableSplitDto[];
  financeReadinessStatus: FinanceReadinessStatus;
  /** ISO-string of the linked invoice due date, if any. Null when no invoice. */
  paymentDueDate: string | null;
  paymentTermsDays: number | null;
  maturityStatus: MaturityStatus;
}

export interface PoolSettlementPreviewResult {
  poolId: string;
  orgId: string;
  /** Computed split rows — NOT persisted. grossAmount derived from invoice. */
  previewSplits: Array<{
    waterfallSeq: number;
    recipientOrgId: string;
    currency: string;
    grossAmount: string;
    holdbackAmount: string;
    penaltyDeduction: string;
    netPayable: string;
  }>;
  paymentDueDate: string | null;
  paymentTermsDays: number | null;
  maturityStatus: MaturityStatus;
  /** True when existing PENDING splits are present (compute idempotency guard). */
  hasPendingSplits: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toPayableSplitDto(
  row: {
    id: string;
    recipientOrgId: string;
    waterfallSeq: number;
    currency: string;
    grossAmount: Prisma.Decimal;
    holdbackAmount: Prisma.Decimal;
    penaltyDeduction: Prisma.Decimal;
    netPayable: Prisma.Decimal;
    status: string;
    escrowAccountId: string | null;
    triggeredAt: Date | null;
    releasedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
): PayableSplitDto {
  return {
    id: row.id,
    recipientOrgId: row.recipientOrgId,
    waterfallSeq: row.waterfallSeq,
    currency: row.currency,
    grossAmount: row.grossAmount.toString(),
    holdbackAmount: row.holdbackAmount.toString(),
    penaltyDeduction: row.penaltyDeduction.toString(),
    netPayable: row.netPayable.toString(),
    settlementVisibilityStatus: row.status as SplitStatus,
    escrowAccountId: row.escrowAccountId ?? null,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function deriveMaturityStatus(dueDate: Date | null, invoiceDate: Date | null): MaturityStatus {
  const anchor = dueDate ?? invoiceDate;
  if (!anchor) return MATURITY_STATUS.NO_DUE_DATE;
  const nowMs = Date.now();
  const anchorMs = anchor.getTime();
  if (anchorMs < nowMs) return MATURITY_STATUS.OVERDUE;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const anchorDay = new Date(anchor);
  anchorDay.setUTCHours(0, 0, 0, 0);
  if (anchorDay.getTime() === todayStart.getTime()) return MATURITY_STATUS.DUE_TODAY;
  return MATURITY_STATUS.UPCOMING;
}

function derivePaymentTermsDays(
  invoiceDate: Date | null,
  dueDate: Date | null,
): number | null {
  if (!invoiceDate || !dueDate) return null;
  const diffMs = dueDate.getTime() - invoiceDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ─── Service class ────────────────────────────────────────────────────────────

export class NetworkSettlementSplitService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Returns existing settlement split rows for a pool, scoped to the
   * authenticated org.  Read-only — no mutations.
   *
   * Tenancy guarantee: orgId ALWAYS sourced from dbContext.orgId (JWT).
   * Wrong-org access returns 404 (non-leaking).
   */
  async getPoolSettlementStatus(
    orgId: string,
    poolId: string,
  ): Promise<PoolSettlementStatusResult> {
    // Confirm pool belongs to org (non-leaking 404 on mismatch)
    const pool = await this.db.networkPool.findFirst({
      where: { id: poolId, orgId },
      select: { id: true, orgId: true },
    });
    if (!pool) throw new NetworkSettlementSplitPoolNotFoundError();

    const splits = await this.db.networkSettlementSplit.findMany({
      where: { orgId, entityType: NC_SETTLEMENT_ENTITY_TYPE, entityId: poolId },
      orderBy: { waterfallSeq: 'asc' },
    });

    // Fetch the most recent POOL_ORDER invoice for payment-term metadata
    const latestInvoice = await this.db.networkInvoice.findFirst({
      where: {
        orgId,
        networkEntityType: NC_SETTLEMENT_ENTITY_TYPE,
        networkEntityId: poolId,
      },
      orderBy: { createdAt: 'desc' },
      select: { invoiceDate: true, dueDate: true },
    });

    const paymentDueDate = latestInvoice?.dueDate?.toISOString() ?? null;
    const paymentTermsDays = derivePaymentTermsDays(
      latestInvoice?.invoiceDate ?? null,
      latestInvoice?.dueDate ?? null,
    );
    const maturityStatus = deriveMaturityStatus(
      latestInvoice?.dueDate ?? null,
      latestInvoice?.invoiceDate ?? null,
    );

    let financeReadinessStatus: FinanceReadinessStatus = FINANCE_READINESS_STATUS.NO_SPLITS;
    if (splits.length > 0) {
      const allPending = splits.every(s => s.status === 'PENDING');
      financeReadinessStatus = allPending
        ? FINANCE_READINESS_STATUS.SPLITS_PRESENT
        : FINANCE_READINESS_STATUS.PARTIAL;
    }

    return {
      poolId,
      orgId,
      payableSplits: splits.map(toPayableSplitDto),
      financeReadinessStatus,
      paymentDueDate,
      paymentTermsDays,
      maturityStatus,
    };
  }

  /**
   * Non-mutating preview: computes what split rows WOULD look like without
   * persisting anything.
   *
   * Derive grossAmount from the most recent pool invoice.
   * One split per current membership recipient (supplierOrgId), ordered by
   * joinedAt ascending → natural waterfall sequence.
   *
   * No feature-flag check: preview is always allowed (read-only intel view).
   */
  async computePoolSettlementPreview(
    orgId: string,
    poolId: string,
  ): Promise<PoolSettlementPreviewResult> {
    const pool = await this.db.networkPool.findFirst({
      where: { id: poolId, orgId },
      select: { id: true, orgId: true },
    });
    if (!pool) throw new NetworkSettlementSplitPoolNotFoundError();

    // Check for existing PENDING splits (idempotency guard signal)
    const existingCount = await this.db.networkSettlementSplit.count({
      where: {
        orgId,
        entityType: NC_SETTLEMENT_ENTITY_TYPE,
        entityId: poolId,
        status: 'PENDING',
      },
    });

    const latestInvoice = await this.db.networkInvoice.findFirst({
      where: {
        orgId,
        networkEntityType: NC_SETTLEMENT_ENTITY_TYPE,
        networkEntityId: poolId,
      },
      orderBy: { createdAt: 'desc' },
      select: { invoiceDate: true, dueDate: true, grossAmount: true, currency: true },
    });

    const paymentDueDate = latestInvoice?.dueDate?.toISOString() ?? null;
    const paymentTermsDays = derivePaymentTermsDays(
      latestInvoice?.invoiceDate ?? null,
      latestInvoice?.dueDate ?? null,
    );
    const maturityStatus = deriveMaturityStatus(
      latestInvoice?.dueDate ?? null,
      latestInvoice?.invoiceDate ?? null,
    );

    // Derive participants from active memberships (APPROVED or ALLOCATED state)
    const memberships = await this.db.networkPoolMembership.findMany({
      where: {
        poolId,
        orgId,
        status: { in: ['APPROVED', 'ALLOCATED'] },
      },
      orderBy: { joinedAt: 'asc' },
      select: { orgId: true, joinedAt: true },
    });

    const invoiceCurrency = latestInvoice?.currency ?? 'USD';
    const totalGross = new Prisma.Decimal(latestInvoice?.grossAmount?.toString() ?? '0');
    const memberCount = memberships.length;

    const previewSplits = memberships.map((m, idx) => {
      const perMemberGross =
        memberCount > 0
          ? totalGross.div(memberCount).toDecimalPlaces(6)
          : new Prisma.Decimal(0);

      return {
        waterfallSeq: idx + 1,
        recipientOrgId: m.orgId,
        currency: invoiceCurrency,
        grossAmount: perMemberGross.toString(),
        holdbackAmount: '0',
        penaltyDeduction: '0',
        netPayable: perMemberGross.toString(),
      };
    });

    return {
      poolId,
      orgId,
      previewSplits,
      paymentDueDate,
      paymentTermsDays,
      maturityStatus,
      hasPendingSplits: existingCount > 0,
    };
  }

  /**
   * Gated by `nc.settlement_waterfall.enabled` feature flag.
   * Creates PENDING split rows for the pool — no escrow, no disbursement.
   * Throws NetworkSettlementSplitFeatureDisabledError when gate is closed.
   * Throws NetworkSettlementSplitAlreadyExistsError if PENDING splits exist.
   *
   * escrowAccountId is always null (Phase 1H deferred).
   * status is always PENDING (triggering is Packet 21+).
   */
  async createPoolSettlementSplits(
    orgId: string,
    poolId: string,
  ): Promise<PayableSplitDto[]> {
    // Feature-flag gate
    const flag = await this.db.featureFlag.findUnique({
      where: { key: NC_SETTLEMENT_FEATURE_FLAG },
      select: { enabled: true },
    });
    if (flag?.enabled !== true) {
      throw new NetworkSettlementSplitFeatureDisabledError();
    }

    const pool = await this.db.networkPool.findFirst({
      where: { id: poolId, orgId },
      select: { id: true, orgId: true },
    });
    if (!pool) throw new NetworkSettlementSplitPoolNotFoundError();

    // Idempotency: block if PENDING splits already exist
    const existingCount = await this.db.networkSettlementSplit.count({
      where: {
        orgId,
        entityType: NC_SETTLEMENT_ENTITY_TYPE,
        entityId: poolId,
        status: 'PENDING',
      },
    });
    if (existingCount > 0) throw new NetworkSettlementSplitAlreadyExistsError();

    const latestInvoice = await this.db.networkInvoice.findFirst({
      where: {
        orgId,
        networkEntityType: NC_SETTLEMENT_ENTITY_TYPE,
        networkEntityId: poolId,
      },
      orderBy: { createdAt: 'desc' },
      select: { grossAmount: true, currency: true },
    });

    const memberships = await this.db.networkPoolMembership.findMany({
      where: {
        poolId,
        orgId,
        status: { in: ['APPROVED', 'ALLOCATED'] },
      },
      orderBy: { joinedAt: 'asc' },
      select: { orgId: true },
    });

    if (memberships.length === 0) {
      throw new NetworkSettlementSplitInvalidInputError(
        'No approved or allocated members found in pool; cannot create settlement splits',
      );
    }

    const invoiceCurrency = latestInvoice?.currency ?? 'USD';
    const totalGross = new Prisma.Decimal(latestInvoice?.grossAmount?.toString() ?? '0');
    const perMemberGross = totalGross.div(memberships.length).toDecimalPlaces(6);
    const zero = new Prisma.Decimal(0);

    const created = await this.db.$transaction(
      memberships.map((m, idx) =>
        this.db.networkSettlementSplit.create({
          data: {
            orgId,
            entityType: NC_SETTLEMENT_ENTITY_TYPE,
            entityId: poolId,
            recipientOrgId: m.orgId,
            waterfallSeq: idx + 1,
            currency: invoiceCurrency,
            grossAmount: perMemberGross,
            holdbackAmount: zero,
            penaltyDeduction: zero,
            netPayable: perMemberGross,
            status: 'PENDING',
            // escrowAccountId intentionally null — Phase 1H deferred
            escrowAccountId: null,
            triggeredAt: null,
            releasedAt: null,
          },
        }),
      ),
    );

    return created.map(toPayableSplitDto);
  }
}
