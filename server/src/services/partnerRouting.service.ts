/**
 * PartnerRoutingService — TTP Slice 6: Partner Routing Stub
 *
 * Builds a routing-readiness stub from VPC + invoice + org + GST + eligibility data.
 * Persists a partner_routing_stubs row on first access (create-on-read pattern).
 * Returns existing stub if one already exists for the VPC.
 *
 * BOUNDARY ENFORCEMENT (Slice 6 non-executing scope):
 *   - No partner transmission. No external API calls.
 *   - No payment instruction. No PSP. No escrow mutation.
 *   - No raw bureau JSON. No raw GST portal JSON. No credentials.
 *   - No VPC state change.
 *   - No tenant-facing surface.
 *
 * Stub payload contains only admin-safe, sanitised fields.
 *
 * Governance: TTP Slice 6, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import type { PrismaClient } from '@prisma/client';
import {
  TTP_VPC_STATE,
  TTP_PARTNER_TYPE,
  TTP_TRANSMISSION_STATUS,
  TTP_ENTITY_TYPE,
} from '../ttp/ttp.constants.js';

// ─── Error classes ─────────────────────────────────────────────────────────────

export class RoutingStubVpcNotFoundError extends Error {
  constructor(vpcId: string) {
    super(`VPC not found: ${vpcId}`);
    this.name = 'RoutingStubVpcNotFoundError';
  }
}

export class RoutingStubVpcVoidedError extends Error {
  constructor(vpcId: string) {
    super(`VPC is VOIDED and cannot be used for routing stub: ${vpcId}`);
    this.name = 'RoutingStubVpcVoidedError';
  }
}

export class RoutingStubVpcExpiredError extends Error {
  constructor(vpcId: string) {
    super(`VPC is EXPIRED and cannot be used for routing stub: ${vpcId}`);
    this.name = 'RoutingStubVpcExpiredError';
  }
}

export class RoutingStubVpcTerminalError extends Error {
  constructor(stateKey: string) {
    super(`VPC is in terminal state ${stateKey} and cannot be used for routing stub`);
    this.name = 'RoutingStubVpcTerminalError';
  }
}

// ─── Output types ──────────────────────────────────────────────────────────────

/**
 * Admin-safe partner routing stub payload.
 * All fields safe to expose to SUPER_ADMIN.
 * NEVER includes raw bureau JSON, raw GST portal JSON, bank credentials, or API secrets.
 */
export interface RoutingStubPayload {
  vpc_id: string;
  vpc_reference: string;
  vpc_state: string;
  vpc_expires_at: string | null;

  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_due_date: string | null;
  amount: string;
  currency: string;

  seller_org_id: string;
  seller_legal_name: string;
  seller_gst_status: string | null;
  seller_gstin: string | null;

  buyer_org_id: string;
  buyer_legal_name: string;

  trade_id: string;
  trade_reference: string | null;

  ttp_risk_tier: number;
  ttp_eligibility_outcome: string | null;
  ttp_eligibility_valid_until: string | null;
  ttp_max_invoice_amount: string | null;

  disclaimer: string;
  generated_at: string;
}

export interface AdminRoutingStubRecord {
  id: string;
  org_id: string;
  vpc_id: string;
  partner_type: string;
  payload_version: string;
  transmission_status: string;
  generated_at: string;
  created_at: string;
  payload: RoutingStubPayload;
  persisted: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PARTNER_ROUTING_DISCLAIMER =
  'Routing stub only — no partner transmission, financing approval, or payment action occurs. ' +
  'A Verified Payable Certificate (VPC) is a verified payable record only. ' +
  'It is not a payment guarantee, financial instrument, escrow instruction, or commitment of funds.';

/** Partner categories available for routing (constants only — no live routing in Slice 6). */
export const PARTNER_ROUTING_CATEGORIES = {
  TREDS: 'TReDS',
  SCF: 'SCF',
  NBFC: 'NBFC',
  FACTORING: 'FACTORING',
  BANK_WORKING_CAPITAL: 'BANK_WORKING_CAPITAL',
  CREDIT_INSURANCE: 'CREDIT_INSURANCE',
} as const;

// ─── Service ───────────────────────────────────────────────────────────────────

export class PartnerRoutingService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Get or create a routing stub for a VPC.
   *
   * Prerequisites:
   *   - VPC must exist.
   *   - VPC state must be ACTIVE or ROUTING_READY.
   *   - VOIDED and EXPIRED VPCs are blocked.
   *
   * Behaviour:
   *   - If a PENDING stub already exists for the VPC → return it (idempotent).
   *   - Otherwise → build payload from VPC, invoice, orgs, GST, eligibility data
   *     and persist a new stub row, then return it.
   *
   * No transmission occurs. Stub transmission_status stays PENDING indefinitely.
   * No VPC state change. No escrow mutation. No external API calls.
   */
  async getOrCreateRoutingStub(
    vpcId: string,
    _adminId: string,
  ): Promise<AdminRoutingStubRecord> {
    // ── Step 1: Load VPC ───────────────────────────────────────────────────────
    const vpc = await (this.db as any).verified_payable_certificates.findUnique({
      where: { id: vpcId },
      select: {
        id: true,
        org_id: true,
        invoice_id: true,
        trade_id: true,
        buyer_org_id: true,
        seller_org_id: true,
        vpc_reference: true,
        currency: true,
        invoice_amount: true,
        risk_tier: true,
        lifecycle_state_id: true,
        expires_at: true,
        voided_at: true,
        partner_routing_eligible: true,
        created_by_admin_id: true,
      },
    });

    if (!vpc) throw new RoutingStubVpcNotFoundError(vpcId);

    // ── Step 2: Resolve VPC lifecycle state ────────────────────────────────────
    const vpcStateRow = await this.db.lifecycleState.findFirst({
      where: { id: vpc.lifecycle_state_id, entityType: TTP_ENTITY_TYPE.VPC },
      select: { stateKey: true, isTerminal: true },
    });

    if (!vpcStateRow) throw new RoutingStubVpcNotFoundError(vpcId);

    const vpcStateKey = vpcStateRow.stateKey;

    // ── Step 3: Enforce VPC state gates ───────────────────────────────────────
    if (vpcStateKey === TTP_VPC_STATE.VOIDED) throw new RoutingStubVpcVoidedError(vpcId);
    if (vpcStateKey === TTP_VPC_STATE.EXPIRED) throw new RoutingStubVpcExpiredError(vpcId);
    if (vpcStateRow.isTerminal) throw new RoutingStubVpcTerminalError(vpcStateKey);

    // Must be ACTIVE or ROUTING_READY
    if (
      vpcStateKey !== TTP_VPC_STATE.ACTIVE &&
      vpcStateKey !== TTP_VPC_STATE.ROUTING_READY
    ) {
      throw new RoutingStubVpcTerminalError(vpcStateKey);
    }

    // ── Step 4: Check for existing PENDING stub ────────────────────────────────
    const existingStub = await (this.db as any).partner_routing_stubs.findFirst({
      where: { vpc_id: vpcId, transmission_status: TTP_TRANSMISSION_STATUS.PENDING },
      orderBy: { created_at: 'asc' },
    });

    if (existingStub) {
      return this.toAdminRecord(existingStub, true);
    }

    // ── Step 5: Load invoice ───────────────────────────────────────────────────
    const invoice = await (this.db as any).invoices.findUnique({
      where: { id: vpc.invoice_id },
      select: {
        id: true,
        invoice_number: true,
        invoice_date: true,
        due_date: true,
        currency: true,
        gross_amount: true,
        trade_id: true,
      },
    });

    // ── Step 6: Load seller org ────────────────────────────────────────────────
    const sellerOrg = await this.db.organizations.findUnique({
      where: { id: vpc.seller_org_id },
      select: { id: true, legal_name: true },
    });

    // ── Step 7: Load buyer org ─────────────────────────────────────────────────
    const buyerOrg = await this.db.organizations.findUnique({
      where: { id: vpc.buyer_org_id },
      select: { id: true, legal_name: true },
    });

    // ── Step 8: Load GST verification (seller) ─────────────────────────────────
    const gst = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: vpc.seller_org_id },
      select: {
        gstin: true,
        review_outcome: true,
        // raw_verification_json is deliberately excluded — never in stub payload
      },
    });

    // ── Step 9: Load latest eligibility assessment ─────────────────────────────
    const assessments = await (this.db as any).ttp_eligibility_assessments.findMany({
      where: { org_id: vpc.seller_org_id },
      orderBy: { assessed_at: 'desc' },
      take: 1,
      select: {
        eligibility_outcome: true,
        valid_until: true,
        max_invoice_amount: true,
        // raw_bureau_json is deliberately excluded — never in stub payload
      },
    });
    const latestAssessment = assessments.length > 0 ? assessments[0] : null;

    // ── Step 10: Load trade reference ──────────────────────────────────────────
    const trade = await this.db.trade.findUnique({
      where: { id: vpc.trade_id },
      select: { tradeReference: true },
    });

    // ── Step 11: Build safe payload ────────────────────────────────────────────
    const now = new Date();

    const payload: RoutingStubPayload = {
      vpc_id: vpc.id,
      vpc_reference: vpc.vpc_reference,
      vpc_state: vpcStateKey,
      vpc_expires_at: vpc.expires_at
        ? (vpc.expires_at instanceof Date ? vpc.expires_at.toISOString() : String(vpc.expires_at))
        : null,

      invoice_id: vpc.invoice_id,
      invoice_number: invoice?.invoice_number ?? '',
      invoice_date: invoice?.invoice_date
        ? (invoice.invoice_date instanceof Date ? invoice.invoice_date.toISOString() : String(invoice.invoice_date))
        : '',
      invoice_due_date: invoice?.due_date
        ? (invoice.due_date instanceof Date ? invoice.due_date.toISOString() : String(invoice.due_date))
        : null,
      amount: invoice?.gross_amount?.toString() ?? vpc.invoice_amount?.toString() ?? '0',
      currency: invoice?.currency ?? vpc.currency,

      seller_org_id: vpc.seller_org_id,
      seller_legal_name: sellerOrg?.legal_name ?? '',
      seller_gst_status: gst?.review_outcome ?? null,
      seller_gstin: gst?.gstin ?? null,

      buyer_org_id: vpc.buyer_org_id,
      buyer_legal_name: buyerOrg?.legal_name ?? '',

      trade_id: vpc.trade_id,
      trade_reference: trade?.tradeReference ?? null,

      ttp_risk_tier: vpc.risk_tier,
      ttp_eligibility_outcome: latestAssessment?.eligibility_outcome ?? null,
      ttp_eligibility_valid_until: latestAssessment?.valid_until
        ? (latestAssessment.valid_until instanceof Date
            ? latestAssessment.valid_until.toISOString()
            : String(latestAssessment.valid_until))
        : null,
      ttp_max_invoice_amount: latestAssessment?.max_invoice_amount?.toString() ?? null,

      disclaimer: PARTNER_ROUTING_DISCLAIMER,
      generated_at: now.toISOString(),
    };

    // ── Step 12: Persist stub row ──────────────────────────────────────────────
    const newStub = await (this.db as any).partner_routing_stubs.create({
      data: {
        org_id: vpc.seller_org_id,
        vpc_id: vpc.id,
        partner_type: TTP_PARTNER_TYPE.NBFC_STUB,
        payload_json: payload as unknown as Record<string, unknown>,
        payload_version: '1.0',
        transmission_status: TTP_TRANSMISSION_STATUS.PENDING,
        // transmitted_at is left null — no transmission in Slice 6
        // response_json stays as default "{}" — no response yet
      },
    });

    return this.toAdminRecord(newStub, true);
  }

  /**
   * Project a raw DB partner_routing_stubs row to the admin record shape.
   * Never includes raw_verification_json, raw_bureau_json, or response_json.
   */
  private toAdminRecord(row: any, persisted: boolean): AdminRoutingStubRecord {
    const rawPayload = typeof row.payload_json === 'string'
      ? JSON.parse(row.payload_json)
      : (row.payload_json ?? {});

    return {
      id: row.id,
      org_id: row.org_id,
      vpc_id: row.vpc_id,
      partner_type: row.partner_type,
      payload_version: row.payload_version,
      transmission_status: row.transmission_status,
      generated_at: row.generated_at instanceof Date
        ? row.generated_at.toISOString()
        : String(row.generated_at),
      created_at: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
      payload: rawPayload as RoutingStubPayload,
      persisted,
    };
  }
}
