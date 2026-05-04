/**
 * partner-routing.service.unit.test.ts — PartnerRoutingService Unit Tests
 *
 * 20 test cases covering all Slice 6 boundary guarantees:
 *   TC-001 to TC-002: ACTIVE and ROUTING_READY VPC — happy path
 *   TC-003 to TC-005: VPC gate enforcement (missing, VOIDED, EXPIRED)
 *   TC-006 to TC-013: Payload content / exclusion guarantees
 *   TC-014 to TC-016: Stub persistence behaviour
 *   TC-017 to TC-018: Optional field handling, disclaimer
 *   TC-019 to TC-020: Cap/eligibility metadata, admin-safe projection
 *
 * Governance: TTP Slice 6, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PartnerRoutingService,
  RoutingStubVpcNotFoundError,
  RoutingStubVpcVoidedError,
  RoutingStubVpcExpiredError,
} from '../services/partnerRouting.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const VPC_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee01';
const INVOICE_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee02';
const ORG_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee03';
const SELLER_ORG_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee03';
const BUYER_ORG_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee04';
const TRADE_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee05';
const ADMIN_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee06';
const STUB_ID = 'aabbccdd-aaaa-aaaa-aaaa-aabbccddee07';

const LIFECYCLE_STATE_ID_ACTIVE = 'lsid-active-p6-0000-000000000001';
const LIFECYCLE_STATE_ID_ROUTING = 'lsid-routing-p6-000-000000000002';
const LIFECYCLE_STATE_ID_VOIDED = 'lsid-voided-p6-000-000000000003';
const LIFECYCLE_STATE_ID_EXPIRED = 'lsid-expired-p6-00-000000000004';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeVpc(overrides: Record<string, unknown> = {}) {
  return {
    id: VPC_ID,
    org_id: ORG_ID,
    invoice_id: INVOICE_ID,
    trade_id: TRADE_ID,
    buyer_org_id: BUYER_ORG_ID,
    seller_org_id: SELLER_ORG_ID,
    vpc_reference: 'VPC-20260504-AABBCCDD',
    currency: 'INR',
    invoice_amount: '250000',
    risk_tier: 2,
    lifecycle_state_id: LIFECYCLE_STATE_ID_ACTIVE,
    expires_at: new Date('2026-12-31'),
    voided_at: null,
    partner_routing_eligible: false,
    created_by_admin_id: ADMIN_ID,
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-001',
    invoice_date: new Date('2026-01-15'),
    due_date: new Date('2026-03-15'),
    currency: 'INR',
    gross_amount: '250000',
    trade_id: TRADE_ID,
    ...overrides,
  };
}

function makeSellerOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: SELLER_ORG_ID,
    legal_name: 'Acme Exports Pvt Ltd',
    ...overrides,
  };
}

function makeBuyerOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: BUYER_ORG_ID,
    legal_name: 'GlobeMart India Ltd',
    ...overrides,
  };
}

function makeGst(overrides: Record<string, unknown> = {}) {
  return {
    gstin: '22AAAAA0000A1Z5',
    review_outcome: 'APPROVED',
    // raw_verification_json intentionally NOT included in select — excluded from stub
    ...overrides,
  };
}

function makeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    eligibility_outcome: 'ELIGIBLE',
    valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    max_invoice_amount: '500000',
    // raw_bureau_json intentionally NOT included in select — excluded from stub
    ...overrides,
  };
}

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    tradeReference: 'TR-2026-ACME-001',
    ...overrides,
  };
}

function makeStubRow(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: STUB_ID,
    org_id: SELLER_ORG_ID,
    vpc_id: VPC_ID,
    partner_type: 'NBFC_STUB',
    payload_json: {
      vpc_id: VPC_ID,
      vpc_reference: 'VPC-20260504-AABBCCDD',
      vpc_state: 'ACTIVE',
      vpc_expires_at: '2026-12-31T00:00:00.000Z',
      invoice_id: INVOICE_ID,
      invoice_number: 'INV-2026-001',
      invoice_date: '2026-01-15T00:00:00.000Z',
      invoice_due_date: '2026-03-15T00:00:00.000Z',
      amount: '250000',
      currency: 'INR',
      seller_org_id: SELLER_ORG_ID,
      seller_legal_name: 'Acme Exports Pvt Ltd',
      seller_gst_status: 'APPROVED',
      seller_gstin: '22AAAAA0000A1Z5',
      buyer_org_id: BUYER_ORG_ID,
      buyer_legal_name: 'GlobeMart India Ltd',
      trade_id: TRADE_ID,
      trade_reference: 'TR-2026-ACME-001',
      ttp_risk_tier: 2,
      ttp_eligibility_outcome: 'ELIGIBLE',
      ttp_eligibility_valid_until: null,
      ttp_max_invoice_amount: '500000',
      disclaimer: 'Routing stub only',
      generated_at: now.toISOString(),
    },
    payload_version: '1.0',
    transmission_status: 'PENDING',
    generated_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ─── Mock DB factory ──────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    verified_payable_certificates: { findUnique: vi.fn() },
    invoices: { findUnique: vi.fn() },
    organizations: { findUnique: vi.fn() },
    gst_verifications: { findUnique: vi.fn() },
    ttp_eligibility_assessments: { findMany: vi.fn() },
    partner_routing_stubs: { findFirst: vi.fn(), create: vi.fn() },
    trade: { findUnique: vi.fn() },
    lifecycleState: { findFirst: vi.fn() },
    ...overrides,
  };
}

// ─── Full happy-path setup ────────────────────────────────────────────────────

function setupHappyPath(
  db: ReturnType<typeof makeDb>,
  vpcOverrides: Record<string, unknown> = {},
  stateKeyOverride = 'ACTIVE',
) {
  db.verified_payable_certificates.findUnique.mockResolvedValue(makeVpc(vpcOverrides));
  db.lifecycleState.findFirst.mockResolvedValue({
    stateKey: stateKeyOverride,
    isTerminal: false,
  });
  db.partner_routing_stubs.findFirst.mockResolvedValue(null); // no existing stub
  db.invoices.findUnique.mockResolvedValue(makeInvoice());
  db.organizations.findUnique
    .mockResolvedValueOnce(makeSellerOrg())
    .mockResolvedValueOnce(makeBuyerOrg());
  db.gst_verifications.findUnique.mockResolvedValue(makeGst());
  db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment()]);
  db.trade.findUnique.mockResolvedValue(makeTrade());
  db.partner_routing_stubs.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(makeStubRow({ payload_json: data.payload_json, org_id: data.org_id, vpc_id: data.vpc_id })),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PartnerRoutingService.getOrCreateRoutingStub', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: PartnerRoutingService;

  beforeEach(() => {
    db = makeDb();
    svc = new PartnerRoutingService(db);
  });

  // TC-001: ACTIVE VPC — happy path
  it('TC-001: returns routing stub for ACTIVE VPC', async () => {
    setupHappyPath(db, {}, 'ACTIVE');
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.vpc_id).toBe(VPC_ID);
    expect(result.persisted).toBe(true);
    expect(db.partner_routing_stubs.create).toHaveBeenCalledOnce();
  });

  // TC-002: ROUTING_READY VPC — happy path
  it('TC-002: returns routing stub for ROUTING_READY VPC', async () => {
    setupHappyPath(db, { lifecycle_state_id: LIFECYCLE_STATE_ID_ROUTING }, 'ROUTING_READY');
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.vpc_id).toBe(VPC_ID);
    expect(result.persisted).toBe(true);
  });

  // TC-003: VPC not found
  it('TC-003: blocks missing VPC with RoutingStubVpcNotFoundError', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(null);
    await expect(svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID)).rejects.toBeInstanceOf(RoutingStubVpcNotFoundError);
  });

  // TC-004: VOIDED VPC
  it('TC-004: blocks VOIDED VPC with RoutingStubVpcVoidedError', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(
      makeVpc({ lifecycle_state_id: LIFECYCLE_STATE_ID_VOIDED }),
    );
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VOIDED', isTerminal: true });
    await expect(svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID)).rejects.toBeInstanceOf(RoutingStubVpcVoidedError);
  });

  // TC-005: EXPIRED VPC
  it('TC-005: blocks EXPIRED VPC with RoutingStubVpcExpiredError', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(
      makeVpc({ lifecycle_state_id: LIFECYCLE_STATE_ID_EXPIRED }),
    );
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'EXPIRED', isTerminal: true });
    await expect(svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID)).rejects.toBeInstanceOf(RoutingStubVpcExpiredError);
  });

  // TC-006: Payload contains VPC, invoice, buyer/seller, GST, eligibility fields
  it('TC-006: builds payload with VPC, invoice, buyer/seller, GST, eligibility fields', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    const payload = result.payload;

    expect(payload.vpc_id).toBe(VPC_ID);
    expect(payload.vpc_reference).toBe('VPC-20260504-AABBCCDD');
    expect(payload.invoice_id).toBe(INVOICE_ID);
    expect(payload.invoice_number).toBe('INV-2026-001');
    expect(payload.seller_org_id).toBe(SELLER_ORG_ID);
    expect(payload.seller_legal_name).toBe('Acme Exports Pvt Ltd');
    expect(payload.buyer_org_id).toBe(BUYER_ORG_ID);
    expect(payload.buyer_legal_name).toBe('GlobeMart India Ltd');
    expect(payload.seller_gst_status).toBe('APPROVED');
    expect(payload.ttp_risk_tier).toBe(2);
    expect(payload.ttp_eligibility_outcome).toBe('ELIGIBLE');
  });

  // TC-007: Does not include raw_bureau_json
  it('TC-007: does not include raw_bureau_json in payload', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(JSON.stringify(result.payload)).not.toContain('raw_bureau_json');
    // Also verify ttp_eligibility_assessments select did not request raw_bureau_json
    const findManyCall = db.ttp_eligibility_assessments.findMany.mock.calls[0][0];
    expect(findManyCall?.select).toBeDefined();
    expect(findManyCall.select.raw_bureau_json).toBeUndefined();
  });

  // TC-008: Does not include raw GST portal JSON
  it('TC-008: does not include raw_verification_json (GST portal) in payload', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(JSON.stringify(result.payload)).not.toContain('raw_verification_json');
    const findUniqueCall = db.gst_verifications.findUnique.mock.calls[0][0];
    expect(findUniqueCall?.select?.raw_verification_json).toBeUndefined();
  });

  // TC-009: Does not include bank/payment credentials
  it('TC-009: does not include bank account or payment credentials in payload', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    const payloadStr = JSON.stringify(result.payload);
    expect(payloadStr).not.toContain('bank_account');
    expect(payloadStr).not.toContain('account_number');
    expect(payloadStr).not.toContain('ifsc');
    expect(payloadStr).not.toContain('api_key');
    expect(payloadStr).not.toContain('secret');
  });

  // TC-010: Does not call external APIs
  it('TC-010: does not call any external API (only DB interactions)', async () => {
    setupHappyPath(db);
    // Spy on globalThis.fetch — service must never call it
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // TC-011: Does not mutate escrow_transactions
  it('TC-011: does not mutate escrow_transactions', async () => {
    setupHappyPath(db);
    await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    // escrow_transactions is not in the mock DB — if service tried to call it, test would throw
    expect(db.escrow_transactions).toBeUndefined();
  });

  // TC-012: Does not mutate escrow_accounts
  it('TC-012: does not mutate escrow_accounts', async () => {
    setupHappyPath(db);
    await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(db.escrow_accounts).toBeUndefined();
  });

  // TC-013: Does not create partner API call (no external HTTP)
  it('TC-013: does not create any partner API call or transmission record with transmitted_at set', async () => {
    setupHappyPath(db);
    await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    const createCall = db.partner_routing_stubs.create.mock.calls[0]?.[0];
    expect(createCall?.data?.transmitted_at).toBeUndefined();
    expect(createCall?.data?.transmission_status).toBe('PENDING');
  });

  // TC-014: Does not change VPC state
  it('TC-014: does not change VPC state', async () => {
    setupHappyPath(db);
    await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    // verified_payable_certificates.update must not have been called
    expect(db.verified_payable_certificates.update).toBeUndefined();
  });

  // TC-015: Prevents duplicate active stub — returns existing stub, does not create new one
  it('TC-015: returns existing PENDING stub without creating a new one (idempotent)', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(makeVpc());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'ACTIVE', isTerminal: false });
    const existingStub = makeStubRow();
    db.partner_routing_stubs.findFirst.mockResolvedValue(existingStub);

    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.id).toBe(STUB_ID);
    expect(result.persisted).toBe(true);
    expect(db.partner_routing_stubs.create).not.toHaveBeenCalled();
    // Invoice, org, GST, eligibility queries are skipped when stub already exists
    expect(db.invoices.findUnique).not.toHaveBeenCalled();
  });

  // TC-016: Reuses existing stub if present (same as TC-015 from different angle)
  it('TC-016: reuses existing stub — does not double-create', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(makeVpc());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'ROUTING_READY', isTerminal: false });
    db.partner_routing_stubs.findFirst.mockResolvedValue(makeStubRow());

    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(db.partner_routing_stubs.create).not.toHaveBeenCalled();
    expect(result.persisted).toBe(true);
  });

  // TC-017: Handles missing optional trade reference safely
  it('TC-017: handles missing trade reference safely — sets trade_reference to null', async () => {
    setupHappyPath(db);
    db.trade.findUnique.mockResolvedValue(null);

    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.payload.trade_reference).toBeNull();
  });

  // TC-018: Includes no-guarantee disclaimer
  it('TC-018: includes no-guarantee disclaimer in payload', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.payload.disclaimer).toBeTruthy();
    expect(result.payload.disclaimer).toContain('no partner transmission');
    expect(result.payload.disclaimer).toContain('not a payment guarantee');
  });

  // TC-019: Handles VPC cap/eligibility metadata
  it('TC-019: includes TTP risk tier, eligibility outcome, and max invoice amount', async () => {
    setupHappyPath(db);
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([
      makeAssessment({
        eligibility_outcome: 'ELIGIBLE',
        max_invoice_amount: '750000',
        valid_until: new Date('2026-11-01'),
      }),
    ]);

    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    expect(result.payload.ttp_risk_tier).toBe(2);
    expect(result.payload.ttp_eligibility_outcome).toBe('ELIGIBLE');
    expect(result.payload.ttp_max_invoice_amount).toBe('750000');
    expect(result.payload.ttp_eligibility_valid_until).toContain('2026-11-01');
  });

  // TC-020: Returns admin-safe projection (no response_json, no transmitted_at in output)
  it('TC-020: returns admin-safe projection without response_json or raw fields', async () => {
    setupHappyPath(db);
    const result = await svc.getOrCreateRoutingStub(VPC_ID, ADMIN_ID);
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('response_json');
    expect(resultStr).not.toContain('raw_bureau_json');
    expect(resultStr).not.toContain('raw_verification_json');
    expect(result.transmission_status).toBe('PENDING');
    expect(result.partner_type).toBe('NBFC_STUB');
  });
});
