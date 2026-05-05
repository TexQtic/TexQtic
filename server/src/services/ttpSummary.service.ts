/**
 * TtpSummaryService — TTP Slice 7: TTP Trade Summary
 *
 * Read-only service. Returns a structured TTP readiness summary for a given trade
 * from the perspective of the authenticated org (buyer or seller).
 *
 * Boundaries (ABSOLUTE — never violate):
 *  - READ-ONLY: no mutations, no inserts, no lifecycle transitions.
 *  - No live GST API / bureau API calls.
 *  - No raw_bureau_json / raw_verification_json in response.
 *  - No escrow_transactions / escrow_accounts access.
 *  - No partner routing payload / transmission details.
 *  - No admin-only notes in tenant-facing response.
 *  - No VPC generation.
 *  - No ttp_enabled activation.
 *  - No PSP / payment actions.
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { PrismaClient } from '@prisma/client';
import { TTP_GST_REVIEW_OUTCOME, TTP_ELIGIBILITY_OUTCOME, TTP_DISCLAIMER_TEXT } from '../ttp/ttp.constants.js';
import { computeTtpScore, type TradeTrustScore } from './ttpScore.service.js';

// ─── Error classes ────────────────────────────────────────────────────────────

export class TtpSummaryTradeNotFoundError extends Error {
  constructor(tradeId: string) {
    super(`Trade not found: ${tradeId}`);
    this.name = 'TtpSummaryTradeNotFoundError';
  }
}

export class TtpSummaryPartyMismatchError extends Error {
  constructor() {
    super('Authenticated org is not a party to this trade');
    this.name = 'TtpSummaryPartyMismatchError';
  }
}

// ─── Readiness sub-types ──────────────────────────────────────────────────────

export interface GstReadiness {
  found: boolean;
  /** review_outcome without raw GST bureau data */
  review_outcome: string | null;
  is_approved: boolean;
}

export interface EligibilityReadiness {
  found: boolean;
  outcome: string | null;
  risk_tier: number | null;
  is_eligible: boolean;
  is_expired: boolean;
  valid_until: string | null;
}

export interface InvoiceReadiness {
  found: boolean;
  invoice_id: string | null;
  state_key: string | null;
  is_verified: boolean;
}

export interface VpcReadiness {
  found: boolean;
  vpc_id: string | null;
  vpc_state: string | null;
  /** true when VPC state is ACTIVE or ROUTING_READY */
  is_active: boolean;
}

export interface RoutingReadiness {
  found: boolean;
  /** transmission_status of the most recent routing stub — no payload_json */
  routing_state: string | null;
}

export interface TradeTtpSummary {
  trade_id: string;
  trade_reference: string;
  currency: string;
  trade_lifecycle_state: string;
  seller_org_id: string;
  buyer_org_id: string;
  actor_role: 'BUYER' | 'SELLER';
  enrollment_state: string | null;
  gst_readiness: GstReadiness;
  eligibility_readiness: EligibilityReadiness;
  invoice_readiness: InvoiceReadiness;
  vpc_readiness: VpcReadiness;
  routing_readiness: RoutingReadiness;
  blockers: string[];
  /** Advisory readiness score. ADVISORY ONLY — not a credit score or payment guarantee. */
  trade_trust_score: TradeTrustScore;
  /** Interim advisory disclaimer. TTP-IMPL-005. Always sourced from TTP_DISCLAIMER_TEXT constant. */
  advisory_disclaimer: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TtpSummaryService {
  constructor(
    private db: PrismaClient,
    /** Optional unscoped client for cross-org trade party verification */
    private rootDb?: PrismaClient,
  ) {}

  /**
   * Build a read-only TTP summary for a trade.
   *
   * actorOrgId must be either buyerOrgId or sellerOrgId of the trade.
   * Returns actor-sensitive summary (role exposed; no admin notes or raw fields).
   */
  async getTradeTtpSummary({
    tradeId,
    actorOrgId,
    preloadedTrade,
  }: {
    tradeId: string;
    actorOrgId: string;
    actorUserId?: string | null;
    /** Pre-fetched trade record. When provided, skips the DB trade lookup to avoid
     *  deadlocking on connection_limit=1 poolers (rootDb inside prisma.$transaction). */
    preloadedTrade?: {
      id: string;
      buyerOrgId: string;
      sellerOrgId: string;
      tradeReference: string;
      currency: string;
      lifecycleState: { stateKey: string } | null;
    };
  }): Promise<TradeTtpSummary> {
    // ── 1. Load trade (includes lifecycle state) ──────────────────────────────
    // If preloadedTrade is supplied by the route (fetched outside the transaction),
    // use it directly. Otherwise fall back to rootDb (unscoped) or db.
    // Motivation: calling rootDb.trade.findUnique() INSIDE prisma.$transaction()
    // with connection_limit=1 (Supabase serverless pooler) deadlocks — the outer
    // tx holds the only connection and the inner query can never acquire one.
    let trade: {
      id: string;
      buyerOrgId: string;
      sellerOrgId: string;
      tradeReference: string;
      currency: string;
      lifecycleState: { stateKey: string } | null;
    } | null;
    if (preloadedTrade !== undefined) {
      trade = preloadedTrade;
    } else {
      const tradeDb = (this.rootDb ?? this.db) as any;
      trade = await tradeDb.trade.findUnique({
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
    }
    if (!trade) throw new TtpSummaryTradeNotFoundError(tradeId);

    // ── 2. Verify actor is a party ────────────────────────────────────────────
    const isSeller = trade.sellerOrgId === actorOrgId;
    const isBuyer = trade.buyerOrgId === actorOrgId;
    if (!isSeller && !isBuyer) throw new TtpSummaryPartyMismatchError();

    const actorRole: 'BUYER' | 'SELLER' = isSeller ? 'SELLER' : 'BUYER';
    const sellerOrgId = trade.sellerOrgId;

    // ── 3. GST readiness (seller org) — no raw_verification_json ─────────────
    const gstRecord = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: sellerOrgId },
      select: { review_outcome: true },
    });
    const gstReadiness: GstReadiness = {
      found: gstRecord !== null,
      review_outcome: gstRecord?.review_outcome ?? null,
      is_approved: gstRecord?.review_outcome === TTP_GST_REVIEW_OUTCOME.APPROVED,
    };

    // ── 4. Eligibility readiness (seller org) — no raw_bureau_json ───────────
    const assessments = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: sellerOrgId },
      orderBy: { assessed_at: 'desc' },
      take: 1,
      select: { eligibility_outcome: true, risk_tier: true, valid_until: true },
    });
    const latestAssessment: {
      eligibility_outcome: string;
      risk_tier: number;
      valid_until: Date | null;
    } | undefined = assessments[0];

    const isEligibilityExpired =
      latestAssessment?.valid_until
        ? new Date(latestAssessment.valid_until) < new Date()
        : false;

    const eligibilityReadiness: EligibilityReadiness = {
      found: latestAssessment !== undefined,
      outcome: latestAssessment?.eligibility_outcome ?? null,
      risk_tier: latestAssessment?.risk_tier ?? null,
      is_eligible:
        latestAssessment?.eligibility_outcome === TTP_ELIGIBILITY_OUTCOME.ELIGIBLE &&
        !isEligibilityExpired,
      is_expired: isEligibilityExpired,
      valid_until: latestAssessment?.valid_until
        ? new Date(latestAssessment.valid_until).toISOString()
        : null,
    };

    // ── 5. Latest invoice on trade ────────────────────────────────────────────
    const invoiceRows = await (this.db as any).invoices.findMany({
      where: { trade_id: tradeId },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: { id: true, lifecycle_state_id: true },
    });
    const latestInvoice: { id: string; lifecycle_state_id: string } | undefined = invoiceRows[0];

    let invoiceStateKey: string | null = null;
    if (latestInvoice) {
      const stateRow = await (this.db as any).lifecycleState.findFirst({
        where: { id: latestInvoice.lifecycle_state_id, entityType: 'INVOICE' },
        select: { stateKey: true },
      });
      invoiceStateKey = stateRow?.stateKey ?? null;
    }

    const invoiceReadiness: InvoiceReadiness = {
      found: latestInvoice !== undefined,
      invoice_id: latestInvoice?.id ?? null,
      state_key: invoiceStateKey,
      is_verified: invoiceStateKey === 'VERIFIED',
    };

    // ── 6. VPC readiness (latest VPC for trade) ───────────────────────────────
    const vpcRows = await (this.db as any).verified_payable_certificates.findMany({
      where: { trade_id: tradeId },
      orderBy: { issued_at: 'desc' },
      take: 1,
      select: { id: true, lifecycle_state_id: true },
    });
    const latestVpc: { id: string; lifecycle_state_id: string } | undefined = vpcRows[0];

    let vpcStateKey: string | null = null;
    if (latestVpc) {
      const stateRow = await (this.db as any).lifecycleState.findFirst({
        where: { id: latestVpc.lifecycle_state_id, entityType: 'VPC' },
        select: { stateKey: true },
      });
      vpcStateKey = stateRow?.stateKey ?? null;
    }

    const vpcReadiness: VpcReadiness = {
      found: latestVpc !== undefined,
      vpc_id: latestVpc?.id ?? null,
      vpc_state: vpcStateKey,
      is_active: vpcStateKey === 'ACTIVE' || vpcStateKey === 'ROUTING_READY',
    };

    // ── 7. Routing readiness — no payload_json ────────────────────────────────
    let routingReadiness: RoutingReadiness = { found: false, routing_state: null };
    if (latestVpc) {
      const stubs = await (this.db as any).partner_routing_stubs.findMany({
        where: { vpc_id: latestVpc.id },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { transmission_status: true },
      });
      const stub: { transmission_status: string } | undefined = stubs[0];
      routingReadiness = {
        found: stub !== undefined,
        routing_state: stub?.transmission_status ?? null,
      };
    }

    // ── 8. Enrollment state (seller org — latest to_state) ────────────────────
    const enrollmentLogs = await (this.db as any).ttp_enrollment_logs.findMany({
      where: { org_id: sellerOrgId },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: { to_state: true },
    });
    const enrollmentState: string | null = enrollmentLogs[0]?.to_state ?? null;

    // ── 9. Blockers ────────────────────────────────────────────────────────────
    const blockers: string[] = [];

    if (!gstReadiness.is_approved) {
      blockers.push(
        gstReadiness.found
          ? 'GST verification pending approval'
          : 'GST verification not submitted',
      );
    }

    if (!eligibilityReadiness.found) {
      blockers.push('TTP eligibility assessment not found');
    } else if (eligibilityReadiness.is_expired) {
      blockers.push('TTP eligibility assessment has expired');
    } else if (!eligibilityReadiness.is_eligible) {
      blockers.push(
        `Eligibility outcome is ${eligibilityReadiness.outcome} (must be ELIGIBLE)`,
      );
    }

    if (!invoiceReadiness.found) {
      blockers.push('No invoice found for this trade');
    } else if (!invoiceReadiness.is_verified) {
      blockers.push(
        `Latest invoice is in state ${invoiceReadiness.state_key ?? 'UNKNOWN'} (must be VERIFIED)`,
      );
    }

    if (!vpcReadiness.found) {
      blockers.push('No Verified Payable Certificate issued for this trade');
    }

    // ── 10. Advisory readiness score ──────────────────────────────────────────
    const trade_trust_score = computeTtpScore({
      gst_readiness: gstReadiness,
      eligibility_readiness: eligibilityReadiness,
      invoice_readiness: invoiceReadiness,
      vpc_readiness: vpcReadiness,
      routing_readiness: routingReadiness,
      enrollment_state: enrollmentState,
    });

    return {
      trade_id: trade.id,
      trade_reference: trade.tradeReference,
      currency: trade.currency,
      trade_lifecycle_state: trade.lifecycleState?.stateKey ?? '',
      seller_org_id: sellerOrgId,
      buyer_org_id: trade.buyerOrgId,
      actor_role: actorRole,
      enrollment_state: enrollmentState,
      gst_readiness: gstReadiness,
      eligibility_readiness: eligibilityReadiness,
      invoice_readiness: invoiceReadiness,
      vpc_readiness: vpcReadiness,
      routing_readiness: routingReadiness,
      blockers,
      trade_trust_score,
      advisory_disclaimer: TTP_DISCLAIMER_TEXT,
    };
  }
}
