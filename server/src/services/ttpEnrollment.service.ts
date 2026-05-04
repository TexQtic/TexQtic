/**
 * TtpEnrollmentService — TTP Slice 7: TTP Enrollment Management
 *
 * Manages TTP enrollment lifecycle for seller organizations.
 * Enrollment is org-scoped (seller org). Trade context is used to validate party
 * membership and provide trade-specific readiness gates.
 *
 * Enrollment state is derived from ttp_enrollment_logs (latest to_state for org_id).
 * No separate state table — all state is derived from append-only log.
 *
 * Boundaries (ABSOLUTE — never violate):
 *  - Does NOT generate VPCs.
 *  - Does NOT create partner routing stubs.
 *  - Does NOT call external APIs (no live GST, no CIBIL, no bureau).
 *  - Does NOT mutate escrow_transactions / escrow_accounts.
 *  - Does NOT activate ttp_enabled flag.
 *  - Does NOT require escrow_id (optional field; treated as setup item only).
 *  - Does NOT imply payment, financing, or money movement of any kind.
 *  - Enrollment does not guarantee TTP execution — platform readiness only.
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { PrismaClient } from '@prisma/client';
import {
  TTP_ENROLLMENT_STATE,
  TTP_ENROLLMENT_REVIEW_OUTCOME,
  TTP_GST_REVIEW_OUTCOME,
  TTP_ACTOR_TYPE,
  type TtpEnrollmentReviewOutcome,
} from '../ttp/ttp.constants.js';

// ─── Error classes ────────────────────────────────────────────────────────────

export class EnrollmentTradeNotFoundError extends Error {
  constructor(tradeId: string) {
    super(`Trade not found: ${tradeId}`);
    this.name = 'EnrollmentTradeNotFoundError';
  }
}

export class EnrollmentPartyMismatchError extends Error {
  constructor() {
    super('Authenticated org is not a party to this trade');
    this.name = 'EnrollmentPartyMismatchError';
  }
}

export class EnrollmentAlreadyActiveError extends Error {
  constructor(state: string) {
    super(`Enrollment already in state: ${state}`);
    this.name = 'EnrollmentAlreadyActiveError';
  }
}

export class EnrollmentNotFoundError extends Error {
  constructor(tradeId: string) {
    super(`No enrollment found for trade: ${tradeId}`);
    this.name = 'EnrollmentNotFoundError';
  }
}

export class EnrollmentReviewGstError extends Error {
  constructor() {
    super('Seller org does not have an APPROVED GST verification record');
    this.name = 'EnrollmentReviewGstError';
  }
}

export class EnrollmentReviewEligibilityMissingError extends Error {
  constructor() {
    super('No TTP eligibility assessment found for the seller org');
    this.name = 'EnrollmentReviewEligibilityMissingError';
  }
}

export class EnrollmentReviewEligibilityExpiredError extends Error {
  constructor() {
    super('Seller org TTP eligibility assessment has expired');
    this.name = 'EnrollmentReviewEligibilityExpiredError';
  }
}

export class EnrollmentReviewOutcomeInvalidError extends Error {
  constructor(outcome: string) {
    super(`Invalid review outcome: ${outcome}`);
    this.name = 'EnrollmentReviewOutcomeInvalidError';
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TtpEnrollmentRecord {
  /** Seller org_id — the enrollment subject */
  org_id: string;
  trade_id: string;
  seller_org_id: string;
  buyer_org_id: string;
  /** Current enrollment state derived from latest ttp_enrollment_logs.to_state */
  enrollment_state: string | null;
  /** Log entry id of the most recent enrollment action */
  latest_log_id: string | null;
  /** Timestamp of most recent enrollment action */
  last_updated_at: string | null;
  /** reason from the most recent log entry */
  last_reason: string | null;
}

export interface AdminEnrollmentRecord extends TtpEnrollmentRecord {
  trade_reference: string;
  currency: string;
  trade_lifecycle_state: string;
}

export interface AdminEnrollmentFilters {
  status?: string;
  orgId?: string;
  tradeId?: string;
  limit?: number;
}

export interface RequestEnrollmentInput {
  tradeId: string;
  actorOrgId: string;
  actorUserId?: string | null;
  reason?: string | null;
}

export interface AdminReviewInput {
  tradeId: string;
  adminId: string;
  outcome: TtpEnrollmentReviewOutcome;
  notes?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TtpEnrollmentService {
  constructor(private db: PrismaClient) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadTrade(tradeId: string) {
    const trade = await (this.db as any).trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        buyerOrgId: true,
        sellerOrgId: true,
        tradeReference: true,
        currency: true,
        lifecycleState: { select: { stateKey: true } },
      },
    });
    return trade;
  }

  private async getLatestEnrollmentLog(orgId: string) {
    const logs = await (this.db as any).ttp_enrollment_logs.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: { id: true, to_state: true, reason: true, created_at: true },
    });
    return logs[0] as {
      id: string;
      to_state: string;
      reason: string;
      created_at: Date;
    } | undefined;
  }

  private buildRecord(
    trade: {
      id: string;
      buyerOrgId: string;
      sellerOrgId: string;
    },
    latestLog: { id: string; to_state: string; reason: string; created_at: Date } | undefined,
  ): TtpEnrollmentRecord {
    return {
      org_id: trade.sellerOrgId,
      trade_id: trade.id,
      seller_org_id: trade.sellerOrgId,
      buyer_org_id: trade.buyerOrgId,
      enrollment_state: latestLog?.to_state ?? null,
      latest_log_id: latestLog?.id ?? null,
      last_updated_at: latestLog?.created_at
        ? new Date(latestLog.created_at).toISOString()
        : null,
      last_reason: latestLog?.reason ?? null,
    };
  }

  private buildAdminRecord(
    trade: {
      id: string;
      buyerOrgId: string;
      sellerOrgId: string;
      tradeReference: string;
      currency: string;
      lifecycleState: { stateKey: string } | null;
    },
    latestLog: { id: string; to_state: string; reason: string; created_at: Date } | undefined,
  ): AdminEnrollmentRecord {
    return {
      ...this.buildRecord(trade, latestLog),
      trade_reference: trade.tradeReference,
      currency: trade.currency,
      trade_lifecycle_state: trade.lifecycleState?.stateKey ?? '',
    };
  }

  // ─── Tenant-facing methods ────────────────────────────────────────────────

  /**
   * Get enrollment state for a trade (tenant-facing).
   * actorOrgId must be buyer or seller.
   */
  async getEnrollment({
    tradeId,
    actorOrgId,
  }: {
    tradeId: string;
    actorOrgId: string;
  }): Promise<TtpEnrollmentRecord> {
    const trade = await this.loadTrade(tradeId);
    if (!trade) throw new EnrollmentTradeNotFoundError(tradeId);

    const isSeller = trade.sellerOrgId === actorOrgId;
    const isBuyer = trade.buyerOrgId === actorOrgId;
    if (!isSeller && !isBuyer) throw new EnrollmentPartyMismatchError();

    const latestLog = await this.getLatestEnrollmentLog(trade.sellerOrgId);
    return this.buildRecord(trade, latestLog);
  }

  /**
   * Request TTP enrollment for the seller org of a trade (idempotent).
   *
   * - Validates actorOrgId is a party to the trade.
   * - If enrollment already REQUESTED or APPROVED, returns current state (idempotent).
   * - Does NOT generate VPCs, routing stubs, or escrow mutations.
   * - Does NOT require Trade.escrow_id — missing linkage is a setup item, not a blocker.
   */
  async requestEnrollment({
    tradeId,
    actorOrgId,
    actorUserId,
    reason,
  }: RequestEnrollmentInput): Promise<TtpEnrollmentRecord> {
    const trade = await this.loadTrade(tradeId);
    if (!trade) throw new EnrollmentTradeNotFoundError(tradeId);

    const isSeller = trade.sellerOrgId === actorOrgId;
    const isBuyer = trade.buyerOrgId === actorOrgId;
    if (!isSeller && !isBuyer) throw new EnrollmentPartyMismatchError();

    const sellerOrgId = trade.sellerOrgId;
    const latestLog = await this.getLatestEnrollmentLog(sellerOrgId);

    // Idempotent: already REQUESTED or APPROVED — return current state
    if (
      latestLog &&
      (latestLog.to_state === TTP_ENROLLMENT_STATE.REQUESTED ||
        latestLog.to_state === TTP_ENROLLMENT_STATE.APPROVED)
    ) {
      return this.buildRecord(trade, latestLog);
    }

    // Record new enrollment request
    const newLog = await (this.db as any).ttp_enrollment_logs.create({
      data: {
        org_id: sellerOrgId,
        from_state: latestLog?.to_state ?? null,
        to_state: TTP_ENROLLMENT_STATE.REQUESTED,
        actor_type: TTP_ACTOR_TYPE.TENANT_USER,
        actor_id: actorUserId ?? null,
        reason: reason?.trim() || 'ENROLLMENT_REQUESTED',
        ai_triggered: false,
      },
      select: { id: true, to_state: true, reason: true, created_at: true },
    });

    return this.buildRecord(trade, newLog as { id: string; to_state: string; reason: string; created_at: Date });
  }

  // ─── Admin methods ────────────────────────────────────────────────────────

  /**
   * List enrollments (admin, cross-tenant).
   * Returns latest enrollment state per matching seller org.
   * Supports filters: status, orgId, tradeId, limit.
   */
  async adminListEnrollments(filters: AdminEnrollmentFilters = {}): Promise<AdminEnrollmentRecord[]> {
    const limit = Math.min(filters.limit ?? 50, 200);

    // If tradeId filter: look up single trade, return its seller enrollment
    if (filters.tradeId) {
      const trade = await this.loadTrade(filters.tradeId);
      if (!trade) return [];
      const latestLog = await this.getLatestEnrollmentLog(trade.sellerOrgId);
      if (filters.status && latestLog?.to_state !== filters.status) return [];
      if (filters.orgId && trade.sellerOrgId !== filters.orgId) return [];
      return [this.buildAdminRecord(trade, latestLog)];
    }

    // Build log query — latest log per matching org
    const logWhere: Record<string, unknown> = {};
    if (filters.orgId) logWhere['org_id'] = filters.orgId;
    if (filters.status) logWhere['to_state'] = filters.status;

    // Fetch logs ordered by created_at desc; take up to limit per org (deduplicated below)
    const allLogs = await (this.db as any).ttp_enrollment_logs.findMany({
      where: logWhere,
      orderBy: { created_at: 'desc' },
      take: limit * 10, // over-fetch to deduplicate
      select: {
        id: true,
        org_id: true,
        to_state: true,
        reason: true,
        created_at: true,
      },
    });

    // Deduplicate: keep first (most recent) log per org_id
    const seenOrgs = new Set<string>();
    const latestPerOrg: Array<{
      id: string;
      org_id: string;
      to_state: string;
      reason: string;
      created_at: Date;
    }> = [];
    for (const log of allLogs) {
      if (!seenOrgs.has(log.org_id)) {
        seenOrgs.add(log.org_id);
        latestPerOrg.push(log);
        if (latestPerOrg.length >= limit) break;
      }
    }

    // Lookup trades for each enrolled org (via verified_payable_certificates or invoices)
    // We find trades where seller_org_id = org_id from VPCs, or seller_org_id = org_id from trades
    const orgIds = latestPerOrg.map(l => l.org_id);
    const trades = await (this.db as any).trade.findMany({
      where: { sellerOrgId: { in: orgIds } },
      select: {
        id: true,
        buyerOrgId: true,
        sellerOrgId: true,
        tradeReference: true,
        currency: true,
        lifecycleState: { select: { stateKey: true } },
      },
      take: limit,
    });

    // Build result: one record per enrolled org × trade (first trade per org for now)
    const result: AdminEnrollmentRecord[] = [];
    const tradeByOrgId = new Map<string, typeof trades[0]>();
    for (const t of trades) {
      if (!tradeByOrgId.has(t.sellerOrgId)) {
        tradeByOrgId.set(t.sellerOrgId, t);
      }
    }

    for (const log of latestPerOrg) {
      const trade = tradeByOrgId.get(log.org_id);
      if (!trade) continue;
      result.push(
        this.buildAdminRecord(trade, {
          id: log.id,
          to_state: log.to_state,
          reason: log.reason,
          created_at: log.created_at,
        }),
      );
    }

    return result;
  }

  /**
   * Get enrollment detail for a specific trade (admin).
   */
  async adminGetEnrollment(tradeId: string): Promise<AdminEnrollmentRecord> {
    const trade = await this.loadTrade(tradeId);
    if (!trade) throw new EnrollmentTradeNotFoundError(tradeId);

    const latestLog = await this.getLatestEnrollmentLog(trade.sellerOrgId);
    return this.buildAdminRecord(trade, latestLog);
  }

  /**
   * Admin review: approve, reject, suspend, or cancel an enrollment.
   *
   * Approval gates:
   *  1. Seller org has an APPROVED gst_verifications record.
   *  2. Seller org has a TTP eligibility assessment.
   *  3. Latest eligibility assessment is not expired.
   *
   * Does NOT generate VPCs, routing stubs, or escrow mutations.
   * Does NOT activate ttp_enabled.
   * Does NOT imply money movement or payment guarantee.
   */
  async adminReviewEnrollment({
    tradeId,
    adminId,
    outcome,
    notes,
  }: AdminReviewInput): Promise<AdminEnrollmentRecord> {
    const validOutcomes = Object.values(TTP_ENROLLMENT_REVIEW_OUTCOME);
    if (!validOutcomes.includes(outcome as TtpEnrollmentReviewOutcome)) {
      throw new EnrollmentReviewOutcomeInvalidError(outcome);
    }

    const trade = await this.loadTrade(tradeId);
    if (!trade) throw new EnrollmentTradeNotFoundError(tradeId);

    const sellerOrgId = trade.sellerOrgId;
    const latestLog = await this.getLatestEnrollmentLog(sellerOrgId);

    // Approval gates (only when approving)
    if (outcome === TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED) {
      // Gate 1: Seller GST must be APPROVED
      const gstRecord = await (this.db as any).gst_verifications.findUnique({
        where: { org_id: sellerOrgId },
        select: { review_outcome: true },
      });
      if (!gstRecord || gstRecord.review_outcome !== TTP_GST_REVIEW_OUTCOME.APPROVED) {
        throw new EnrollmentReviewGstError();
      }

      // Gate 2: Eligibility assessment must exist
      const assessments = await (this.db as any).ttp_eligibility_assessments.findMany({
        where: { org_id: sellerOrgId },
        orderBy: { assessed_at: 'desc' },
        take: 1,
        select: { eligibility_outcome: true, valid_until: true },
      });
      if (assessments.length === 0) throw new EnrollmentReviewEligibilityMissingError();

      // Gate 3: Eligibility must not be expired
      const latestAssessment = assessments[0];
      if (
        latestAssessment.valid_until &&
        new Date(latestAssessment.valid_until) < new Date()
      ) {
        throw new EnrollmentReviewEligibilityExpiredError();
      }
    }

    // Record the review outcome
    const newLog = await (this.db as any).ttp_enrollment_logs.create({
      data: {
        org_id: sellerOrgId,
        from_state: latestLog?.to_state ?? null,
        to_state: outcome,
        actor_type: TTP_ACTOR_TYPE.PLATFORM_ADMIN,
        actor_id: adminId,
        reason: notes?.trim() || outcome,
        ai_triggered: false,
      },
      select: { id: true, to_state: true, reason: true, created_at: true },
    });

    return this.buildAdminRecord(trade, newLog as {
      id: string;
      to_state: string;
      reason: string;
      created_at: Date;
    });
  }
}
