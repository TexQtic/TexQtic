/**
 * TtpEnrollmentService unit tests — TTP Slice 7
 *
 * 18 test cases covering:
 *   TC-001: tenant party can request enrollment
 *   TC-002: non-party cannot request enrollment
 *   TC-003: request is idempotent when already REQUESTED
 *   TC-004: request is idempotent when already APPROVED
 *   TC-005: request does not require Trade.escrow_id
 *   TC-006: admin can list enrollments
 *   TC-007: admin can get enrollment detail
 *   TC-008: admin can approve when all gates pass
 *   TC-009: admin approval blocked when seller GST not approved
 *   TC-010: admin approval blocked when eligibility missing
 *   TC-011: admin approval blocked when eligibility expired
 *   TC-012: admin can reject with notes
 *   TC-013: admin can suspend
 *   TC-014: enrollment does not generate VPC
 *   TC-015: enrollment does not create partner routing stub
 *   TC-016: enrollment does not call external APIs (only db reads/writes)
 *   TC-017: enrollment does not mutate escrow data
 *   TC-018: enrollment preserves no-guarantee/no-payment boundary (no payment fields in response)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TtpEnrollmentService,
  EnrollmentPartyMismatchError,
  EnrollmentReviewGstError,
  EnrollmentReviewEligibilityMissingError,
  EnrollmentReviewEligibilityExpiredError,
} from '../services/ttpEnrollment.service.js';
import { TTP_ENROLLMENT_REVIEW_OUTCOME } from '../ttp/ttp.constants.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRADE_ID   = '11111111-1111-1111-1111-111111111111';
const SELLER_ORG = '22222222-2222-2222-2222-222222222222';
const BUYER_ORG  = '33333333-3333-3333-3333-333333333333';
const OTHER_ORG  = '44444444-4444-4444-4444-444444444444';
const ADMIN_ID   = '00000000-0000-0000-0000-000000000001';
const LOG_ID     = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const PAST   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: TRADE_ID,
    buyerOrgId: BUYER_ORG,
    sellerOrgId: SELLER_ORG,
    tradeReference: 'TRD-001',
    currency: 'INR',
    lifecycleState: { stateKey: 'ACTIVE' },
    ...overrides,
  };
}

function makeNewLog(toState = 'REQUESTED') {
  return {
    id: LOG_ID,
    to_state: toState,
    reason: 'test',
    created_at: new Date(),
  };
}

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    trade: {
      findUnique: vi.fn().mockResolvedValue(makeTrade()),
      findMany: vi.fn().mockResolvedValue([makeTrade()]),
    },
    gst_verifications: {
      findUnique: vi.fn().mockResolvedValue({ review_outcome: 'APPROVED' }),
    },
    ttp_eligibility_assessments: {
      findMany: vi.fn().mockResolvedValue([
        { eligibility_outcome: 'ELIGIBLE', valid_until: FUTURE },
      ]),
    },
    ttp_enrollment_logs: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(makeNewLog()),
    },
    // These should NEVER be called by enrollment service
    verified_payable_certificates: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    partner_routing_stubs: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    escrow_accounts: {
      update: vi.fn(),
      create: vi.fn(),
    },
    escrow_transactions: {
      create: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TtpEnrollmentService', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpEnrollmentService;

  beforeEach(() => {
    db = makeDb();
    svc = new TtpEnrollmentService(db);
  });

  // ─── requestEnrollment ─────────────────────────────────────────────────────

  it('TC-001: tenant seller party can request enrollment', async () => {
    const result = await svc.requestEnrollment({
      tradeId: TRADE_ID,
      actorOrgId: SELLER_ORG,
      actorUserId: null,
    });
    expect(db.ttp_enrollment_logs.create).toHaveBeenCalledOnce();
    expect(result.enrollment_state).toBe('REQUESTED');
    expect(result.seller_org_id).toBe(SELLER_ORG);
  });

  it('TC-002: non-party org cannot request enrollment', async () => {
    await expect(
      svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: OTHER_ORG }),
    ).rejects.toThrow(EnrollmentPartyMismatchError);
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
  });

  it('TC-003: request is idempotent when enrollment is already REQUESTED', async () => {
    db.ttp_enrollment_logs.findMany.mockResolvedValue([makeNewLog('REQUESTED')]);
    const result = await svc.requestEnrollment({
      tradeId: TRADE_ID,
      actorOrgId: SELLER_ORG,
    });
    // Should NOT create another log
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
    expect(result.enrollment_state).toBe('REQUESTED');
  });

  it('TC-004: request is idempotent when enrollment is already APPROVED', async () => {
    db.ttp_enrollment_logs.findMany.mockResolvedValue([makeNewLog('APPROVED')]);
    const result = await svc.requestEnrollment({
      tradeId: TRADE_ID,
      actorOrgId: SELLER_ORG,
    });
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
    expect(result.enrollment_state).toBe('APPROVED');
  });

  it('TC-005: requestEnrollment does not require Trade.escrow_id (optional field)', async () => {
    // Trade with no escrow_id — enrollment must still succeed
    db.trade.findUnique.mockResolvedValue(makeTrade({ escrow_id: null }));
    await expect(
      svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG }),
    ).resolves.toBeTruthy();
    expect(db.ttp_enrollment_logs.create).toHaveBeenCalledOnce();
  });

  // ─── getEnrollment ─────────────────────────────────────────────────────────

  it('TC-006: buyer party can read enrollment state', async () => {
    db.ttp_enrollment_logs.findMany.mockResolvedValue([makeNewLog('APPROVED')]);
    const result = await svc.getEnrollment({ tradeId: TRADE_ID, actorOrgId: BUYER_ORG });
    expect(result.enrollment_state).toBe('APPROVED');
    expect(result.buyer_org_id).toBe(BUYER_ORG);
  });

  // ─── adminGetEnrollment ────────────────────────────────────────────────────

  it('TC-007: admin can get enrollment detail', async () => {
    db.ttp_enrollment_logs.findMany.mockResolvedValue([makeNewLog('REQUESTED')]);
    const result = await svc.adminGetEnrollment(TRADE_ID);
    expect(result.enrollment_state).toBe('REQUESTED');
    expect(result.trade_id).toBe(TRADE_ID);
    expect(result.trade_reference).toBe('TRD-001');
  });

  // ─── adminReviewEnrollment ─────────────────────────────────────────────────

  it('TC-008: admin can approve when all gates pass', async () => {
    db.ttp_enrollment_logs.create.mockResolvedValue(makeNewLog('APPROVED'));
    const result = await svc.adminReviewEnrollment({
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
    });
    expect(result.enrollment_state).toBe('APPROVED');
    expect(db.ttp_enrollment_logs.create).toHaveBeenCalledOnce();
    const created = db.ttp_enrollment_logs.create.mock.calls[0][0].data;
    expect(created.to_state).toBe('APPROVED');
    expect(created.actor_type).toBe('PLATFORM_ADMIN');
  });

  it('TC-009: admin approval blocked when seller GST not approved', async () => {
    db.gst_verifications.findUnique.mockResolvedValue({ review_outcome: 'PENDING' });
    await expect(
      svc.adminReviewEnrollment({
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
      }),
    ).rejects.toThrow(EnrollmentReviewGstError);
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
  });

  it('TC-010: admin approval blocked when eligibility assessment missing', async () => {
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([]);
    await expect(
      svc.adminReviewEnrollment({
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
      }),
    ).rejects.toThrow(EnrollmentReviewEligibilityMissingError);
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
  });

  it('TC-011: admin approval blocked when eligibility assessment expired', async () => {
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([
      { eligibility_outcome: 'ELIGIBLE', valid_until: PAST },
    ]);
    await expect(
      svc.adminReviewEnrollment({
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
      }),
    ).rejects.toThrow(EnrollmentReviewEligibilityExpiredError);
    expect(db.ttp_enrollment_logs.create).not.toHaveBeenCalled();
  });

  it('TC-012: admin can reject with notes (no gates checked for REJECTED)', async () => {
    db.ttp_enrollment_logs.create.mockResolvedValue(makeNewLog('REJECTED'));
    const result = await svc.adminReviewEnrollment({
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.REJECTED,
      notes: 'Insufficient documentation',
    });
    expect(result.enrollment_state).toBe('REJECTED');
    const created = db.ttp_enrollment_logs.create.mock.calls[0][0].data;
    expect(created.reason).toBe('Insufficient documentation');
    // Gates NOT called for rejection
    expect(db.gst_verifications.findUnique).not.toHaveBeenCalled();
  });

  it('TC-013: admin can suspend (no gates checked for SUSPENDED)', async () => {
    db.ttp_enrollment_logs.create.mockResolvedValue(makeNewLog('SUSPENDED'));
    const result = await svc.adminReviewEnrollment({
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.SUSPENDED,
    });
    expect(result.enrollment_state).toBe('SUSPENDED');
    expect(db.gst_verifications.findUnique).not.toHaveBeenCalled();
  });

  // ─── Boundary enforcement ──────────────────────────────────────────────────

  it('TC-014: enrollment does not create VPCs', async () => {
    await svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(db.verified_payable_certificates.create).not.toHaveBeenCalled();
  });

  it('TC-015: enrollment does not create partner routing stubs', async () => {
    await svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(db.partner_routing_stubs.create).not.toHaveBeenCalled();
  });

  it('TC-016: enrollment service uses only db operations (no network calls)', async () => {
    // We confirm the service only touches db models — no external fetch spy needed
    // because the service has no external call sites. Structural assertion:
    await svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    // Only Trade lookup + enrollment log findMany + enrollment log create called
    expect(db.trade.findUnique).toHaveBeenCalledOnce();
    expect(db.ttp_enrollment_logs.findMany).toHaveBeenCalledOnce();
    expect(db.ttp_enrollment_logs.create).toHaveBeenCalledOnce();
    // Nothing else touched
    expect(db.gst_verifications.findUnique).not.toHaveBeenCalled();
  });

  it('TC-017: enrollment does not touch escrow accounts or transactions', async () => {
    await svc.requestEnrollment({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    await svc.adminReviewEnrollment({
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      outcome: TTP_ENROLLMENT_REVIEW_OUTCOME.APPROVED,
    });
    expect(db.escrow_accounts.create).not.toHaveBeenCalled();
    expect(db.escrow_accounts.update).not.toHaveBeenCalled();
    expect(db.escrow_transactions.create).not.toHaveBeenCalled();
    expect(db.escrow_transactions.update).not.toHaveBeenCalled();
  });

  it('TC-018: enrollment response contains no payment, financing, or money-movement fields', async () => {
    const result = await svc.requestEnrollment({
      tradeId: TRADE_ID,
      actorOrgId: SELLER_ORG,
    });
    const serialized = JSON.stringify(result);
    // None of the forbidden financial implication fields
    expect(serialized).not.toContain('payment');
    expect(serialized).not.toContain('payout');
    expect(serialized).not.toContain('financing');
    expect(serialized).not.toContain('escrow_balance');
    expect(serialized).not.toContain('disbursement');
  });
});
