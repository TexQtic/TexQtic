/**
 * VpcService — TTP Slice 5: VPC Generation
 *
 * Verified Payable Certificate (VPC) lifecycle management.
 *
 * VPC generation gates (in order):
 *  1. Invoice exists
 *  2. Invoice state == VERIFIED
 *  3. Invoice is not in a terminal-blocked state (INELIGIBLE, WITHDRAWN, EXPIRED, SUPERSEDED)
 *  4. Invoice is not DISPUTED
 *  5. Seller org has an APPROVED gst_verifications record
 *  6. A TTP eligibility assessment exists for the seller org
 *  7. Latest assessment outcome == ELIGIBLE
 *  8. Assessment valid_until is not expired
 *  9. risk_tier >= 1 (VPC_ELIGIBLE_TIERS)
 * 10. Invoice gross_amount <= tier cap
 * 11. Invoice due_date is not null (used as expires_at)
 * 12. No existing non-terminal VPC for this invoice (unique constraint + pre-check)
 *
 * VPC initial state: ACTIVE
 * VPC org_id = seller's org_id (D-017-A tenant boundary)
 * partner_routing_eligible = false always in Slice 5
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { PrismaClient } from '@prisma/client';
import {
  TTP_VPC_STATE,
  TTP_VPC_TERMINAL_STATES,
  TTP_ENTITY_TYPE,
  TTP_ELIGIBILITY_OUTCOME,
  TTP_VPC_ELIGIBLE_TIERS,
  TTP_GST_REVIEW_OUTCOME,
  type TtpRiskTier,
  type TtpVpcState,
} from '../ttp/ttp.constants.js';

// ─── Tier amount caps (INR) ───────────────────────────────────────────────────

const TIER_DEFAULT_CAP_INR: Readonly<Record<number, number | null>> = {
  0: null,
  1: 250_000,
  2: 500_000,
  3: 1_000_000,
};

// ─── Error classes ────────────────────────────────────────────────────────────

export class VpcInvoiceNotFoundError extends Error {
  constructor(invoiceId: string) {
    super(`Invoice not found: ${invoiceId}`);
    this.name = 'VpcInvoiceNotFoundError';
  }
}

export class VpcInvoiceIneligibleStateError extends Error {
  constructor(stateKey: string) {
    super(`Invoice must be in VERIFIED state for VPC generation; current state: ${stateKey}`);
    this.name = 'VpcInvoiceIneligibleStateError';
  }
}

export class VpcGstNotApprovedError extends Error {
  constructor() {
    super('Seller org does not have an APPROVED GST verification record');
    this.name = 'VpcGstNotApprovedError';
  }
}

export class VpcEligibilityMissingError extends Error {
  constructor() {
    super('No TTP eligibility assessment found for the seller org');
    this.name = 'VpcEligibilityMissingError';
  }
}

export class VpcEligibilityOutcomeError extends Error {
  constructor(outcome: string) {
    super(`Seller org eligibility outcome is not ELIGIBLE; got: ${outcome}`);
    this.name = 'VpcEligibilityOutcomeError';
  }
}

export class VpcEligibilityExpiredError extends Error {
  constructor() {
    super('Seller org TTP eligibility assessment has expired');
    this.name = 'VpcEligibilityExpiredError';
  }
}

export class VpcRiskTierBlockedError extends Error {
  constructor(tier: number) {
    super(`Risk tier ${tier} is not eligible for VPC generation (minimum tier: 1)`);
    this.name = 'VpcRiskTierBlockedError';
  }
}

export class VpcAmountExceedsCapError extends Error {
  constructor(amount: string, cap: number, tier: number) {
    super(
      `Invoice gross_amount ${amount} exceeds tier ${tier} cap of ${cap}`,
    );
    this.name = 'VpcAmountExceedsCapError';
  }
}

export class VpcDueDateMissingError extends Error {
  constructor() {
    super('Invoice due_date is required for VPC generation (used as expires_at)');
    this.name = 'VpcDueDateMissingError';
  }
}

export class VpcDuplicateError extends Error {
  constructor(invoiceId: string) {
    super(`A non-terminal VPC already exists for invoice: ${invoiceId}`);
    this.name = 'VpcDuplicateError';
  }
}

export class VpcNotFoundError extends Error {
  constructor(vpcId: string) {
    super(`VPC not found: ${vpcId}`);
    this.name = 'VpcNotFoundError';
  }
}

export class VpcTransitionNotAllowedError extends Error {
  constructor(fromState: string, toState: string) {
    super(`VPC transition from ${fromState} to ${toState} is not allowed`);
    this.name = 'VpcTransitionNotAllowedError';
  }
}

export class VpcTerminalStateError extends Error {
  constructor(stateKey: string) {
    super(`VPC is in terminal state ${stateKey} and cannot be transitioned`);
    this.name = 'VpcTerminalStateError';
  }
}

// ─── Allowed transitions ──────────────────────────────────────────────────────

/**
 * Admin-allowed VPC transitions in Slice 5 (no TRANSMITTED — no partner routing yet).
 */
const ALLOWED_VPC_TRANSITIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [TTP_VPC_STATE.ACTIVE, new Set([TTP_VPC_STATE.ROUTING_READY, TTP_VPC_STATE.VOIDED, TTP_VPC_STATE.EXPIRED])],
  [TTP_VPC_STATE.ROUTING_READY, new Set([TTP_VPC_STATE.VOIDED, TTP_VPC_STATE.EXPIRED])],
]);

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AdminVpcRecord {
  id: string;
  org_id: string;
  invoice_id: string;
  trade_id: string;
  buyer_org_id: string;
  seller_org_id: string;
  vpc_reference: string;
  currency: string;
  invoice_amount: string;
  risk_tier: number;
  state_key: string;
  is_terminal: boolean;
  issued_at: string;
  expires_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  partner_routing_eligible: boolean;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VpcListFilters {
  org_id?: string;
  invoice_id?: string;
  trade_id?: string;
  state_key?: string;
  limit?: number;
  offset?: number;
}

export interface TransitionVpcInput {
  to_state_key: string;
  reason: string;
  void_reason?: string | null;
  notes?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class VpcService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Resolve the lifecycle_state_id for a given VPC state key.
   */
  private async resolveVpcStateId(stateKey: string): Promise<string> {
    const state = await this.db.lifecycleState.findFirst({
      where: { entityType: TTP_ENTITY_TYPE.VPC, stateKey },
      select: { id: true },
    });
    if (!state) {
      throw new Error(`VPC lifecycle state not found in DB: ${stateKey}`);
    }
    return state.id;
  }

  /**
   * Resolve the current state key + terminal flag for a lifecycle_state_id.
   */
  private async resolveVpcCurrentState(lifecycleStateId: string): Promise<{ stateKey: string; isTerminal: boolean }> {
    const state = await this.db.lifecycleState.findFirst({
      where: { id: lifecycleStateId, entityType: TTP_ENTITY_TYPE.VPC },
      select: { stateKey: true, isTerminal: true },
    });
    if (!state) {
      throw new Error(`VPC lifecycle state not found for id: ${lifecycleStateId}`);
    }
    return { stateKey: state.stateKey, isTerminal: state.isTerminal };
  }

  /**
   * Build a VPC reference string: VPC-{YYYYMMDD}-{first 8 chars of invoiceId uppercase}.
   */
  private buildVpcReference(invoiceId: string): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = invoiceId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `VPC-${datePart}-${shortId}`;
  }

  /**
   * Project a raw DB VPC row to the admin record shape.
   */
  private toAdminRecord(row: any, stateKey: string, isTerminal: boolean): AdminVpcRecord {
    return {
      id: row.id,
      org_id: row.org_id,
      invoice_id: row.invoice_id,
      trade_id: row.trade_id,
      buyer_org_id: row.buyer_org_id,
      seller_org_id: row.seller_org_id,
      vpc_reference: row.vpc_reference,
      currency: row.currency,
      invoice_amount: row.invoice_amount?.toString() ?? '0',
      risk_tier: row.risk_tier,
      state_key: stateKey,
      is_terminal: isTerminal,
      issued_at: row.issued_at instanceof Date ? row.issued_at.toISOString() : String(row.issued_at),
      expires_at: row.expires_at ? (row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at)) : null,
      voided_at: row.voided_at ? (row.voided_at instanceof Date ? row.voided_at.toISOString() : String(row.voided_at)) : null,
      void_reason: row.void_reason ?? null,
      partner_routing_eligible: row.partner_routing_eligible ?? false,
      created_by_admin_id: row.created_by_admin_id ?? null,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }

  /**
   * Generate a VPC for a VERIFIED invoice.
   *
   * Enforces all 12 eligibility gates in order before creating the VPC record.
   * VPC initial state: ACTIVE. partner_routing_eligible: false.
   *
   * D-017-A: org_id derived from invoice, never from input body.
   */
  async generateVpc(invoiceId: string, adminId: string): Promise<AdminVpcRecord> {
    // ── Gate 1: Invoice exists ────────────────────────────────────────────────
    const invoice = await (this.db as any).invoices.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        org_id: true,
        buyer_org_id: true,
        trade_id: true,
        currency: true,
        gross_amount: true,
        due_date: true,
        lifecycle_state_id: true,
      },
    });
    if (!invoice) throw new VpcInvoiceNotFoundError(invoiceId);

    // ── Resolve invoice state ──────────────────────────────────────────────────
    const invoiceStateRow = await this.db.lifecycleState.findFirst({
      where: { id: invoice.lifecycle_state_id, entityType: TTP_ENTITY_TYPE.INVOICE },
      select: { stateKey: true, isTerminal: true },
    });
    if (!invoiceStateRow) throw new VpcInvoiceNotFoundError(invoiceId);

    const { stateKey: invoiceStateKey } = invoiceStateRow;

    // ── Gate 2+3: Invoice state must be VERIFIED ──────────────────────────────
    if (invoiceStateKey !== 'VERIFIED') {
      throw new VpcInvoiceIneligibleStateError(invoiceStateKey);
    }

    // ── Gate 5: Seller GST must be APPROVED ──────────────────────────────────
    const gstRecord = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: invoice.org_id },
      select: { review_outcome: true },
    });
    if (!gstRecord || gstRecord.review_outcome !== TTP_GST_REVIEW_OUTCOME.APPROVED) {
      throw new VpcGstNotApprovedError();
    }

    // ── Gate 6: Latest eligibility assessment exists ───────────────────────────
    const assessments = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: invoice.org_id },
      orderBy: { assessed_at: 'desc' },
      take: 1,
    });
    if (assessments.length === 0) throw new VpcEligibilityMissingError();
    const latestAssessment = assessments[0];

    // ── Gate 7: Outcome must be ELIGIBLE ──────────────────────────────────────
    if (latestAssessment.eligibility_outcome !== TTP_ELIGIBILITY_OUTCOME.ELIGIBLE) {
      throw new VpcEligibilityOutcomeError(latestAssessment.eligibility_outcome);
    }

    // ── Gate 8: Assessment must not be expired ────────────────────────────────
    if (latestAssessment.valid_until && new Date(latestAssessment.valid_until) < new Date()) {
      throw new VpcEligibilityExpiredError();
    }

    // ── Gate 9: risk_tier >= 1 ────────────────────────────────────────────────
    const riskTier = latestAssessment.risk_tier as number;
    if (!TTP_VPC_ELIGIBLE_TIERS.has(riskTier as TtpRiskTier)) {
      throw new VpcRiskTierBlockedError(riskTier);
    }

    // ── Gate 10: Invoice amount <= tier cap ───────────────────────────────────
    const tierCap = latestAssessment.max_invoice_amount ?? TIER_DEFAULT_CAP_INR[riskTier];
    if (tierCap !== null) {
      const invoiceAmountNum = parseFloat(invoice.gross_amount?.toString() ?? '0');
      if (invoiceAmountNum > tierCap) {
        throw new VpcAmountExceedsCapError(
          invoice.gross_amount?.toString() ?? '0',
          tierCap,
          riskTier,
        );
      }
    }

    // ── Gate 11: Invoice due_date must exist ──────────────────────────────────
    if (!invoice.due_date) throw new VpcDueDateMissingError();

    // ── Gate 12: No existing non-terminal VPC for this invoice ────────────────
    const existingVpcs = await (this.db as any).verified_payable_certificates.findMany({
      where: { invoice_id: invoiceId },
      select: { id: true, lifecycle_state_id: true },
    });
    for (const existing of existingVpcs) {
      const existingState = await this.db.lifecycleState.findFirst({
        where: { id: existing.lifecycle_state_id, entityType: TTP_ENTITY_TYPE.VPC },
        select: { stateKey: true },
      });
      if (existingState && !TTP_VPC_TERMINAL_STATES.has(existingState.stateKey as TtpVpcState)) {
        throw new VpcDuplicateError(invoiceId);
      }
    }

    // ── Create VPC ────────────────────────────────────────────────────────────
    const activeStateId = await this.resolveVpcStateId(TTP_VPC_STATE.ACTIVE);
    const vpcReference = this.buildVpcReference(invoiceId);
    const now = new Date();

    const newVpc = await (this.db as any).verified_payable_certificates.create({
      data: {
        org_id: invoice.org_id,
        invoice_id: invoiceId,
        trade_id: invoice.trade_id,
        buyer_org_id: invoice.buyer_org_id,
        seller_org_id: invoice.org_id,
        vpc_reference: vpcReference,
        currency: invoice.currency,
        invoice_amount: invoice.gross_amount,
        risk_tier: riskTier,
        lifecycle_state_id: activeStateId,
        issued_at: now,
        expires_at: invoice.due_date,
        voided_at: null,
        void_reason: null,
        partner_routing_eligible: false,
        created_by_admin_id: adminId,
        created_at: now,
        updated_at: now,
      },
    });

    return this.toAdminRecord(newVpc, TTP_VPC_STATE.ACTIVE, false);
  }

  /**
   * Get a single VPC by ID (admin read, cross-tenant).
   */
  async adminGetVpc(vpcId: string): Promise<AdminVpcRecord> {
    const row = await (this.db as any).verified_payable_certificates.findUnique({
      where: { id: vpcId },
    });
    if (!row) throw new VpcNotFoundError(vpcId);

    const { stateKey, isTerminal } = await this.resolveVpcCurrentState(row.lifecycle_state_id);
    return this.toAdminRecord(row, stateKey, isTerminal);
  }

  /**
   * List VPCs with optional filters (admin read, cross-tenant).
   * Results ordered by issued_at DESC.
   */
  async adminListVpcs(filters: VpcListFilters = {}): Promise<AdminVpcRecord[]> {
    const where: Record<string, unknown> = {};
    if (filters.org_id) where['org_id'] = filters.org_id;
    if (filters.invoice_id) where['invoice_id'] = filters.invoice_id;
    if (filters.trade_id) where['trade_id'] = filters.trade_id;

    const rows = await (this.db as any).verified_payable_certificates.findMany({
      where,
      orderBy: { issued_at: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });

    // State-filter is post-query (lifecycle_state_id → stateKey lookup)
    const results: AdminVpcRecord[] = [];
    for (const row of rows) {
      const { stateKey, isTerminal } = await this.resolveVpcCurrentState(row.lifecycle_state_id);
      if (filters.state_key && stateKey !== filters.state_key) continue;
      results.push(this.toAdminRecord(row, stateKey, isTerminal));
    }
    return results;
  }

  /**
   * Transition a VPC to a new state (admin write).
   *
   * Allowed transitions (Slice 5):
   *   ACTIVE → ROUTING_READY
   *   ACTIVE → VOIDED
   *   ACTIVE → EXPIRED
   *   ROUTING_READY → VOIDED
   *   ROUTING_READY → EXPIRED
   *
   * TRANSMITTED is terminal but no transmission in Slice 5.
   */
  async adminTransitionVpc(
    vpcId: string,
    input: TransitionVpcInput,
    _adminId: string,
  ): Promise<AdminVpcRecord> {
    const row = await (this.db as any).verified_payable_certificates.findUnique({
      where: { id: vpcId },
    });
    if (!row) throw new VpcNotFoundError(vpcId);

    const { stateKey: currentStateKey, isTerminal } = await this.resolveVpcCurrentState(
      row.lifecycle_state_id,
    );

    // Block terminal states
    if (isTerminal) throw new VpcTerminalStateError(currentStateKey);

    // Validate allowed transition
    const allowedTargets = ALLOWED_VPC_TRANSITIONS.get(currentStateKey);
    if (!allowedTargets || !allowedTargets.has(input.to_state_key)) {
      throw new VpcTransitionNotAllowedError(currentStateKey, input.to_state_key);
    }

    const newStateId = await this.resolveVpcStateId(input.to_state_key);
    const now = new Date();

    const updateData: Record<string, unknown> = {
      lifecycle_state_id: newStateId,
      updated_at: now,
    };

    if (input.to_state_key === TTP_VPC_STATE.VOIDED) {
      updateData['voided_at'] = now;
      updateData['void_reason'] = input.void_reason ?? input.reason;
    }

    const updated = await (this.db as any).verified_payable_certificates.update({
      where: { id: vpcId },
      data: updateData,
    });

    const newStateFinal = await this.resolveVpcCurrentState(newStateId);
    return this.toAdminRecord(updated, newStateFinal.stateKey, newStateFinal.isTerminal);
  }
}
