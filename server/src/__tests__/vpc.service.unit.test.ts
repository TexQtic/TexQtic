/**
 * vpc.service.unit.test.ts — VpcService Unit Tests
 *
 * Covers all 12 generation gates + adminGetVpc + adminListVpcs + adminTransitionVpc.
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VpcService,
  VpcInvoiceNotFoundError,
  VpcInvoiceIneligibleStateError,
  VpcGstNotApprovedError,
  VpcEligibilityMissingError,
  VpcEligibilityOutcomeError,
  VpcEligibilityExpiredError,
  VpcRiskTierBlockedError,
  VpcAmountExceedsCapError,
  VpcDueDateMissingError,
  VpcDuplicateError,
  VpcNotFoundError,
  VpcTransitionNotAllowedError,
  VpcTerminalStateError,
} from '../services/vpc.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const INVOICE_ID = '11111111-1111-1111-1111-111111111111';
const VPC_ID = '22222222-2222-2222-2222-222222222222';
const ORG_ID = '33333333-3333-3333-3333-333333333333';
const BUYER_ORG_ID = '44444444-4444-4444-4444-444444444444';
const TRADE_ID = '55555555-5555-5555-5555-555555555555';
const ADMIN_ID = '66666666-6666-6666-6666-666666666666';
const LIFECYCLE_STATE_ID_ACTIVE = 'lsid-active-0000-0000-000000000001';
const LIFECYCLE_STATE_ID_ROUTING = 'lsid-routing-000-0000-000000000002';
const LIFECYCLE_STATE_ID_VOIDED = 'lsid-voided-0000-0000-000000000003';
const LIFECYCLE_STATE_ID_EXPIRED = 'lsid-expired-000-0000-000000000004';
const INVOICE_STATE_ID_VERIFIED = 'lsid-verified-00-0000-000000000005';
const INVOICE_STATE_ID_DRAFT = 'lsid-draft-00000-0000-000000000006';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    org_id: ORG_ID,
    buyer_org_id: BUYER_ORG_ID,
    trade_id: TRADE_ID,
    currency: 'INR',
    gross_amount: '100000',
    due_date: new Date('2025-12-31'),
    lifecycle_state_id: INVOICE_STATE_ID_VERIFIED,
    ...overrides,
  };
}

function makeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    org_id: ORG_ID,
    eligibility_outcome: 'ELIGIBLE',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
    risk_tier: 2,
    max_invoice_amount: null,
    assessed_at: new Date(),
    ...overrides,
  };
}

function makeVpcRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VPC_ID,
    org_id: ORG_ID,
    invoice_id: INVOICE_ID,
    trade_id: TRADE_ID,
    buyer_org_id: BUYER_ORG_ID,
    seller_org_id: ORG_ID,
    vpc_reference: 'VPC-20250101-11111111',
    currency: 'INR',
    invoice_amount: '100000',
    risk_tier: 2,
    lifecycle_state_id: LIFECYCLE_STATE_ID_ACTIVE,
    issued_at: new Date(),
    expires_at: new Date('2025-12-31'),
    voided_at: null,
    void_reason: null,
    partner_routing_eligible: false,
    created_by_admin_id: ADMIN_ID,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// ─── Mock DB factory ──────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    invoices: { findUnique: vi.fn(), findMany: vi.fn() },
    verified_payable_certificates: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    gst_verifications: { findUnique: vi.fn() },
    ttp_eligibility_assessments: { findMany: vi.fn() },
    lifecycleState: { findFirst: vi.fn() },
    ...overrides,
  };
}

// ─── Helpers to set up a "passing all gates" mock ─────────────────────────────

function setupPassingGates(db: ReturnType<typeof makeDb>, invoiceOverrides = {}, assessmentOverrides = {}) {
  const invoice = makeInvoice(invoiceOverrides);
  db.invoices.findUnique.mockResolvedValue(invoice);

  // lifecycleState.findFirst is called several times — configure by argument
  db.lifecycleState.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
    // Invoice state resolution
    if (where.entityType === 'INVOICE' && where.id === invoice.lifecycle_state_id) {
      return Promise.resolve({ stateKey: 'VERIFIED', isTerminal: false });
    }
    // VPC state resolution — ACTIVE
    if (where.entityType === 'VPC' && where.stateKey === 'ACTIVE') {
      return Promise.resolve({ id: LIFECYCLE_STATE_ID_ACTIVE, stateKey: 'ACTIVE', isTerminal: false });
    }
    // VPC current state resolution by id
    if (where.entityType === 'VPC' && where.id === LIFECYCLE_STATE_ID_ACTIVE) {
      return Promise.resolve({ stateKey: 'ACTIVE', isTerminal: false });
    }
    return Promise.resolve(null);
  });

  db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
  db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment(assessmentOverrides)]);
  db.verified_payable_certificates.findMany.mockResolvedValue([]); // no duplicates
  db.verified_payable_certificates.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(makeVpcRow(data)),
  );
}

// ─── generateVpc tests ────────────────────────────────────────────────────────

describe('VpcService.generateVpc', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: VpcService;

  beforeEach(() => {
    db = makeDb();
    svc = new VpcService(db);
  });

  it('TC-001: happy path — creates VPC for VERIFIED invoice', async () => {
    setupPassingGates(db);
    const vpc = await svc.generateVpc(INVOICE_ID, ADMIN_ID);
    expect(vpc.org_id).toBe(ORG_ID);
    expect(vpc.invoice_id).toBe(INVOICE_ID);
    expect(db.verified_payable_certificates.create).toHaveBeenCalledOnce();
  });

  it('TC-002: Gate 1 — invoice not found throws VpcInvoiceNotFoundError', async () => {
    db.invoices.findUnique.mockResolvedValue(null);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceNotFoundError);
  });

  it('TC-003: Gate 2 — invoice state DRAFT throws VpcInvoiceIneligibleStateError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice({ lifecycle_state_id: INVOICE_STATE_ID_DRAFT }));
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'DRAFT', isTerminal: false });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceIneligibleStateError);
  });

  it('TC-004: Gate 2 — invoice state SUBMITTED throws VpcInvoiceIneligibleStateError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'SUBMITTED', isTerminal: false });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceIneligibleStateError);
  });

  it('TC-005: Gate 2 — invoice state UNDER_REVIEW throws VpcInvoiceIneligibleStateError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'UNDER_REVIEW', isTerminal: false });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceIneligibleStateError);
  });

  it('TC-006: Gate 2 — invoice state DISPUTED throws VpcInvoiceIneligibleStateError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'DISPUTED', isTerminal: false });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceIneligibleStateError);
  });

  it('TC-007: Gate 2 — invoice state INELIGIBLE (terminal) throws VpcInvoiceIneligibleStateError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'INELIGIBLE', isTerminal: true });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcInvoiceIneligibleStateError);
  });

  it('TC-008: Gate 5 — GST record not found throws VpcGstNotApprovedError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue(null);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcGstNotApprovedError);
  });

  it('TC-009: Gate 5 — GST PENDING throws VpcGstNotApprovedError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'PENDING' });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcGstNotApprovedError);
  });

  it('TC-010: Gate 5 — GST REJECTED throws VpcGstNotApprovedError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'REJECTED' });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcGstNotApprovedError);
  });

  it('TC-011: Gate 6 — no assessments throws VpcEligibilityMissingError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcEligibilityMissingError);
  });

  it('TC-012: Gate 7 — outcome INELIGIBLE throws VpcEligibilityOutcomeError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment({ eligibility_outcome: 'INELIGIBLE' })]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcEligibilityOutcomeError);
  });

  it('TC-013: Gate 7 — outcome MANUAL_REVIEW throws VpcEligibilityOutcomeError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment({ eligibility_outcome: 'MANUAL_REVIEW' })]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcEligibilityOutcomeError);
  });

  it('TC-014: Gate 8 — valid_until expired throws VpcEligibilityExpiredError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([
      makeAssessment({ valid_until: new Date(Date.now() - 1000) }), // 1 second ago
    ]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcEligibilityExpiredError);
  });

  it('TC-015: Gate 8 — valid_until null does not throw expiry error', async () => {
    setupPassingGates(db, {}, { valid_until: null });
    await svc.generateVpc(INVOICE_ID, ADMIN_ID);
    expect(db.verified_payable_certificates.create).toHaveBeenCalledOnce();
  });

  it('TC-016: Gate 9 — risk_tier 0 throws VpcRiskTierBlockedError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment({ risk_tier: 0, eligibility_outcome: 'ELIGIBLE' })]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcRiskTierBlockedError);
  });

  it('TC-017: Gate 10 — amount exceeds tier 1 cap (250,000) throws VpcAmountExceedsCapError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice({ gross_amount: '300000' }));
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment({ risk_tier: 1, max_invoice_amount: null })]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcAmountExceedsCapError);
  });

  it('TC-018: Gate 10 — amount exceeds tier 2 cap (500,000) throws VpcAmountExceedsCapError', async () => {
    db.invoices.findUnique.mockResolvedValue(makeInvoice({ gross_amount: '600000' }));
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'VERIFIED', isTerminal: false });
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'APPROVED' });
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([makeAssessment({ risk_tier: 2, max_invoice_amount: null })]);
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcAmountExceedsCapError);
  });

  it('TC-019: Gate 10 — amount exactly at cap does not throw', async () => {
    setupPassingGates(db, { gross_amount: '500000' }, { risk_tier: 2, max_invoice_amount: null });
    const vpc = await svc.generateVpc(INVOICE_ID, ADMIN_ID);
    expect(vpc.id).toBeDefined();
  });

  it('TC-020: Gate 11 — due_date null throws VpcDueDateMissingError', async () => {
    setupPassingGates(db, { due_date: null });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcDueDateMissingError);
  });

  it('TC-021: Gate 12 — existing ACTIVE VPC throws VpcDuplicateError', async () => {
    setupPassingGates(db);
    // Override to return an existing non-terminal VPC
    db.verified_payable_certificates.findMany.mockResolvedValue([
      { id: 'existing-vpc-id', lifecycle_state_id: LIFECYCLE_STATE_ID_ACTIVE },
    ]);
    // When resolving the existing VPC state, return ACTIVE (non-terminal)
    db.lifecycleState.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.entityType === 'INVOICE') return Promise.resolve({ stateKey: 'VERIFIED', isTerminal: false });
      if (where.id === LIFECYCLE_STATE_ID_ACTIVE && where.entityType === 'VPC') {
        return Promise.resolve({ stateKey: 'ACTIVE', isTerminal: false });
      }
      return Promise.resolve(null);
    });
    await expect(svc.generateVpc(INVOICE_ID, ADMIN_ID)).rejects.toBeInstanceOf(VpcDuplicateError);
  });

  it('TC-022: Gate 12 — existing VOIDED VPC (terminal) does not throw duplicate error', async () => {
    setupPassingGates(db);
    db.verified_payable_certificates.findMany.mockResolvedValue([
      { id: 'existing-voided', lifecycle_state_id: LIFECYCLE_STATE_ID_VOIDED },
    ]);
    db.lifecycleState.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.entityType === 'INVOICE') return Promise.resolve({ stateKey: 'VERIFIED', isTerminal: false });
      if (where.id === LIFECYCLE_STATE_ID_VOIDED && where.entityType === 'VPC') {
        return Promise.resolve({ stateKey: 'VOIDED', isTerminal: true });
      }
      if (where.stateKey === 'ACTIVE' && where.entityType === 'VPC') {
        return Promise.resolve({ id: LIFECYCLE_STATE_ID_ACTIVE, stateKey: 'ACTIVE', isTerminal: false });
      }
      return Promise.resolve(null);
    });
    const vpc = await svc.generateVpc(INVOICE_ID, ADMIN_ID);
    expect(vpc.id).toBeDefined();
  });
});

// ─── adminGetVpc tests ────────────────────────────────────────────────────────

describe('VpcService.adminGetVpc', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: VpcService;

  beforeEach(() => {
    db = makeDb();
    svc = new VpcService(db);
  });

  it('TC-023: happy path — returns VPC record', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(makeVpcRow());
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'ACTIVE', isTerminal: false });
    const vpc = await svc.adminGetVpc(VPC_ID);
    expect(vpc.id).toBe(VPC_ID);
    expect(vpc.state_key).toBe('ACTIVE');
    expect(vpc.is_terminal).toBe(false);
  });

  it('TC-024: VPC not found throws VpcNotFoundError', async () => {
    db.verified_payable_certificates.findUnique.mockResolvedValue(null);
    await expect(svc.adminGetVpc(VPC_ID)).rejects.toBeInstanceOf(VpcNotFoundError);
  });
});

// ─── adminListVpcs tests ──────────────────────────────────────────────────────

describe('VpcService.adminListVpcs', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: VpcService;

  beforeEach(() => {
    db = makeDb();
    svc = new VpcService(db);
  });

  it('TC-025: happy path (no filters) — returns all VPCs', async () => {
    const rows = [makeVpcRow(), makeVpcRow({ id: 'other-vpc' })];
    db.verified_payable_certificates.findMany.mockResolvedValue(rows);
    db.lifecycleState.findFirst.mockResolvedValue({ stateKey: 'ACTIVE', isTerminal: false });
    const vpcs = await svc.adminListVpcs({});
    expect(vpcs).toHaveLength(2);
  });

  it('TC-026: state_key filter excludes non-matching VPCs (post-query filter)', async () => {
    const activeRow = makeVpcRow({ lifecycle_state_id: LIFECYCLE_STATE_ID_ACTIVE });
    const voidedRow = makeVpcRow({ id: 'voided-vpc', lifecycle_state_id: LIFECYCLE_STATE_ID_VOIDED });
    db.verified_payable_certificates.findMany.mockResolvedValue([activeRow, voidedRow]);
    db.lifecycleState.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.id === LIFECYCLE_STATE_ID_ACTIVE) return Promise.resolve({ stateKey: 'ACTIVE', isTerminal: false });
      if (where.id === LIFECYCLE_STATE_ID_VOIDED) return Promise.resolve({ stateKey: 'VOIDED', isTerminal: true });
      return Promise.resolve(null);
    });
    const vpcs = await svc.adminListVpcs({ state_key: 'ACTIVE' });
    expect(vpcs).toHaveLength(1);
    expect(vpcs[0].state_key).toBe('ACTIVE');
  });
});

// ─── adminTransitionVpc tests ─────────────────────────────────────────────────

describe('VpcService.adminTransitionVpc', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: VpcService;

  beforeEach(() => {
    db = makeDb();
    svc = new VpcService(db);
  });

  function setupTransition(fromStateId: string, fromStateKey: string, isTerminal: boolean) {
    db.verified_payable_certificates.findUnique.mockResolvedValue(makeVpcRow({ lifecycle_state_id: fromStateId }));
    db.lifecycleState.findFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      // Current / new state resolution (by id)
      if (where.id === fromStateId) return Promise.resolve({ stateKey: fromStateKey, isTerminal });
      if (where.id === LIFECYCLE_STATE_ID_ROUTING) return Promise.resolve({ stateKey: 'ROUTING_READY', isTerminal: false });
      if (where.id === LIFECYCLE_STATE_ID_VOIDED) return Promise.resolve({ stateKey: 'VOIDED', isTerminal: true });
      if (where.id === LIFECYCLE_STATE_ID_EXPIRED) return Promise.resolve({ stateKey: 'EXPIRED', isTerminal: true });
      // New state id resolution (by stateKey — resolveVpcStateId path)
      if (where.stateKey === 'ROUTING_READY') return Promise.resolve({ id: LIFECYCLE_STATE_ID_ROUTING, stateKey: 'ROUTING_READY', isTerminal: false });
      if (where.stateKey === 'VOIDED') return Promise.resolve({ id: LIFECYCLE_STATE_ID_VOIDED, stateKey: 'VOIDED', isTerminal: true });
      if (where.stateKey === 'EXPIRED') return Promise.resolve({ id: LIFECYCLE_STATE_ID_EXPIRED, stateKey: 'EXPIRED', isTerminal: true });
      return Promise.resolve(null);
    });
    db.verified_payable_certificates.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(makeVpcRow({ lifecycle_state_id: data.lifecycle_state_id as string })),
    );
  }

  it('TC-027: ACTIVE → ROUTING_READY succeeds', async () => {
    setupTransition(LIFECYCLE_STATE_ID_ACTIVE, 'ACTIVE', false);
    await svc.adminTransitionVpc(VPC_ID, { to_state_key: 'ROUTING_READY', reason: 'ready' }, ADMIN_ID);
    expect(db.verified_payable_certificates.update).toHaveBeenCalledOnce();
    const call = db.verified_payable_certificates.update.mock.calls[0][0];
    expect(call.data.lifecycle_state_id).toBe(LIFECYCLE_STATE_ID_ROUTING);
  });

  it('TC-028: ACTIVE → VOIDED sets voided_at and void_reason', async () => {
    setupTransition(LIFECYCLE_STATE_ID_ACTIVE, 'ACTIVE', false);
    await svc.adminTransitionVpc(
      VPC_ID,
      { to_state_key: 'VOIDED', reason: 'admin cancel', void_reason: 'Duplicate detected' },
      ADMIN_ID,
    );
    const call = db.verified_payable_certificates.update.mock.calls[0][0];
    expect(call.data.lifecycle_state_id).toBe(LIFECYCLE_STATE_ID_VOIDED);
    expect(call.data.voided_at).toBeDefined();
    expect(call.data.void_reason).toBe('Duplicate detected');
  });

  it('TC-029: ROUTING_READY → EXPIRED succeeds', async () => {
    setupTransition(LIFECYCLE_STATE_ID_ROUTING, 'ROUTING_READY', false);
    await svc.adminTransitionVpc(VPC_ID, { to_state_key: 'EXPIRED', reason: 'past due' }, ADMIN_ID);
    const call = db.verified_payable_certificates.update.mock.calls[0][0];
    expect(call.data.lifecycle_state_id).toBe(LIFECYCLE_STATE_ID_EXPIRED);
  });

  it('TC-030: from terminal state throws VpcTerminalStateError', async () => {
    setupTransition(LIFECYCLE_STATE_ID_VOIDED, 'VOIDED', true);
    await expect(
      svc.adminTransitionVpc(VPC_ID, { to_state_key: 'ROUTING_READY', reason: 'attempt' }, ADMIN_ID),
    ).rejects.toBeInstanceOf(VpcTerminalStateError);
  });

  it('TC-031: ROUTING_READY → ROUTING_READY invalid transition throws VpcTransitionNotAllowedError', async () => {
    setupTransition(LIFECYCLE_STATE_ID_ROUTING, 'ROUTING_READY', false);
    await expect(
      svc.adminTransitionVpc(VPC_ID, { to_state_key: 'ROUTING_READY', reason: 'invalid' }, ADMIN_ID),
    ).rejects.toBeInstanceOf(VpcTransitionNotAllowedError);
  });
});
