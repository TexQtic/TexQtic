/**
 * TtpSummaryService unit tests — TTP Slice 7
 *
 * 24 test cases covering:
 *   TC-001: returns summary for seller party
 *   TC-002: returns summary for buyer party (uses rootDb for trade lookup)
 *   TC-003: blocks non-party org
 *   TC-004: returns GST readiness when record found
 *   TC-005: returns GST not-found readiness when no record
 *   TC-006: marks eligibility valid when ELIGIBLE and not expired
 *   TC-007: marks eligibility expired when valid_until in past
 *   TC-008: returns invoice readiness with state key
 *   TC-009: returns latest invoice (by created_at desc — first returned)
 *   TC-010: returns VPC readiness when VPC exists
 *   TC-011: does NOT create VPC (no db.create called)
 *   TC-012: does NOT create routing stub
 *   TC-013: does NOT expose raw_bureau_json in response
 *   TC-014: does NOT expose raw_verification_json in response
 *   TC-015: seller summary returns all readiness fields populated
 *   TC-016: buyer summary uses rootDb for trade lookup (not scoped db)
 *   TC-017: empty optional data returns graceful response (no VPC/routing/enrollment)
 *   TC-018: missing trade throws TtpSummaryTradeNotFoundError
 *   TC-019: non-party org throws TtpSummaryPartyMismatchError
 *   TC-020: gst_verifications null → found:false + blocker
 *   TC-021: expired eligibility assessment → is_expired:true
 *   TC-022: invoice in non-VERIFIED state → is_verified:false + blocker
 *   TC-023: trade with buyer_org_id match → actor_role BUYER
 *   TC-024: full happy path — all readiness checks pass, zero blockers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TtpSummaryService,
  TtpSummaryPartyMismatchError,
  TtpSummaryTradeNotFoundError,
} from '../services/ttpSummary.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRADE_ID   = '11111111-1111-1111-1111-111111111111';
const SELLER_ORG = '22222222-2222-2222-2222-222222222222';
const BUYER_ORG  = '33333333-3333-3333-3333-333333333333';
const OTHER_ORG  = '44444444-4444-4444-4444-444444444444';
const INVOICE_ID = '55555555-5555-5555-5555-555555555555';
const VPC_ID     = '66666666-6666-6666-6666-666666666666';

const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    trade: {
      findUnique: vi.fn().mockResolvedValue(makeTrade()),
    },
    lifecycleState: {
      findFirst: vi.fn().mockResolvedValue({ stateKey: 'VERIFIED' }),
    },
    gst_verifications: {
      findUnique: vi.fn().mockResolvedValue({ review_outcome: 'APPROVED' }),
    },
    ttp_eligibility_assessments: {
      findMany: vi.fn().mockResolvedValue([
        { eligibility_outcome: 'ELIGIBLE', risk_tier: 2, valid_until: new Date(FUTURE_DATE) },
      ]),
    },
    invoices: {
      findMany: vi.fn().mockResolvedValue([
        { id: INVOICE_ID, lifecycle_state_id: 'lsid-1' },
      ]),
    },
    verified_payable_certificates: {
      findMany: vi.fn().mockResolvedValue([
        { id: VPC_ID, lifecycle_state_id: 'lsid-2' },
      ]),
    },
    partner_routing_stubs: {
      findMany: vi.fn().mockResolvedValue([
        { transmission_status: 'TRANSMITTED' },
      ]),
    },
    ttp_enrollment_logs: {
      findMany: vi.fn().mockResolvedValue([
        { to_state: 'APPROVED' },
      ]),
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TtpSummaryService.getTradeTtpSummary', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpSummaryService;

  beforeEach(() => {
    db = makeDb();
    // Pass db as rootDb so the unscoped trade lookup hits the same mock
    svc = new TtpSummaryService(db, db);
  });

  it('TC-001: returns summary for seller party', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })   // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });     // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.actor_role).toBe('SELLER');
    expect(result.trade_id).toBe(TRADE_ID);
    expect(result.seller_org_id).toBe(SELLER_ORG);
  });

  it('TC-002: returns summary for buyer party', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: BUYER_ORG });
    expect(result.actor_role).toBe('BUYER');
    expect(result.buyer_org_id).toBe(BUYER_ORG);
  });

  it('TC-003: throws TtpSummaryPartyMismatchError for non-party org', async () => {
    await expect(
      svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: OTHER_ORG }),
    ).rejects.toThrow(TtpSummaryPartyMismatchError);
  });

  it('TC-004: returns GST readiness when record found and approved', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.gst_readiness.found).toBe(true);
    expect(result.gst_readiness.review_outcome).toBe('APPROVED');
    expect(result.gst_readiness.is_approved).toBe(true);
  });

  it('TC-005: returns GST not-found readiness when no GST record', async () => {
    db.gst_verifications.findUnique.mockResolvedValue(null);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.gst_readiness.found).toBe(false);
    expect(result.gst_readiness.is_approved).toBe(false);
    expect(result.blockers).toContain('GST verification not submitted');
  });

  it('TC-006: marks eligibility valid when ELIGIBLE and not expired', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.eligibility_readiness.is_eligible).toBe(true);
    expect(result.eligibility_readiness.is_expired).toBe(false);
  });

  it('TC-007: marks eligibility expired when valid_until is in the past', async () => {
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([
      { eligibility_outcome: 'ELIGIBLE', risk_tier: 2, valid_until: new Date(PAST_DATE) },
    ]);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.eligibility_readiness.is_expired).toBe(true);
    expect(result.eligibility_readiness.is_eligible).toBe(false);
    expect(result.blockers).toContain('TTP eligibility assessment has expired');
  });

  it('TC-008: returns invoice readiness with state_key', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' }) // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });  // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.invoice_readiness.found).toBe(true);
    expect(result.invoice_readiness.invoice_id).toBe(INVOICE_ID);
    expect(result.invoice_readiness.state_key).toBe('VERIFIED');
    expect(result.invoice_readiness.is_verified).toBe(true);
  });

  it('TC-009: uses first invoice returned (most recent by db order)', async () => {
    const OTHER_INVOICE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    db.invoices.findMany.mockResolvedValue([
      { id: OTHER_INVOICE, lifecycle_state_id: 'lsid-x' },  // most recent
      { id: INVOICE_ID, lifecycle_state_id: 'lsid-1' },
    ]);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'SUBMITTED' }) // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });   // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.invoice_readiness.invoice_id).toBe(OTHER_INVOICE);
  });

  it('TC-010: returns VPC readiness when VPC exists and state is ACTIVE', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' }) // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });  // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.vpc_readiness.found).toBe(true);
    expect(result.vpc_readiness.vpc_id).toBe(VPC_ID);
    expect(result.vpc_readiness.is_active).toBe(true);
  });

  it('TC-011: does NOT call any db.create (no VPC or log created)', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    // No create calls anywhere
    expect(db.trade.findUnique).toHaveBeenCalledOnce();
    for (const key of [
      'gst_verifications', 'ttp_eligibility_assessments', 'invoices',
      'verified_payable_certificates', 'partner_routing_stubs', 'ttp_enrollment_logs',
    ]) {
      expect(db[key].findMany ?? db[key].findUnique).not.toHaveProperty('mock.calls.length', 0);
      // verify no create was defined/called
      expect(db[key]).not.toHaveProperty('create');
    }
  });

  it('TC-012: does NOT create routing stubs (only reads them)', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(db.partner_routing_stubs.findMany).toHaveBeenCalledOnce();
    expect(db.partner_routing_stubs).not.toHaveProperty('create');
  });

  it('TC-013: response does not contain raw_bureau_json', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('raw_bureau_json');
  });

  it('TC-014: response does not contain raw_verification_json', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('raw_verification_json');
  });

  it('TC-015: seller summary returns all readiness fields populated', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.gst_readiness).toBeDefined();
    expect(result.eligibility_readiness).toBeDefined();
    expect(result.invoice_readiness).toBeDefined();
    expect(result.vpc_readiness).toBeDefined();
    expect(result.routing_readiness).toBeDefined();
    expect(result.enrollment_state).toBe('APPROVED');
    expect(result.actor_role).toBe('SELLER');
  });

  it('TC-016: buyer summary uses rootDb for trade lookup (rootDb.trade.findUnique called)', async () => {
    const rootDb = makeDb();
    rootDb.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const scopedDb = makeDb();
    scopedDb.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const svcWithRoot = new TtpSummaryService(scopedDb, rootDb);
    const result = await svcWithRoot.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: BUYER_ORG });
    expect(result.actor_role).toBe('BUYER');
    // rootDb.trade.findUnique called; scopedDb.trade.findUnique not called
    expect(rootDb.trade.findUnique).toHaveBeenCalledOnce();
    expect(scopedDb.trade.findUnique).not.toHaveBeenCalled();
  });

  it('TC-017: empty optional data returns graceful response when no VPC/routing/enrollment', async () => {
    db.invoices.findMany.mockResolvedValue([]);
    db.verified_payable_certificates.findMany.mockResolvedValue([]);
    db.partner_routing_stubs.findMany.mockResolvedValue([]);
    db.ttp_enrollment_logs.findMany.mockResolvedValue([]);
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.invoice_readiness.found).toBe(false);
    expect(result.vpc_readiness.found).toBe(false);
    expect(result.routing_readiness.found).toBe(false);
    expect(result.enrollment_state).toBeNull();
    expect(result.blockers).toContain('No invoice found for this trade');
    expect(result.blockers).toContain('No Verified Payable Certificate issued for this trade');
  });

  it('TC-018: missing trade throws TtpSummaryTradeNotFoundError', async () => {
    db.trade.findUnique.mockResolvedValue(null);
    await expect(
      svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG }),
    ).rejects.toThrow(TtpSummaryTradeNotFoundError);
  });

  it('TC-019: non-party org throws TtpSummaryPartyMismatchError', async () => {
    await expect(
      svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: OTHER_ORG }),
    ).rejects.toThrow(TtpSummaryPartyMismatchError);
  });

  it('TC-020: gst_verifications null → found:false + blocker added', async () => {
    db.gst_verifications.findUnique.mockResolvedValue(null);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.gst_readiness.found).toBe(false);
    expect(result.gst_readiness.is_approved).toBe(false);
    expect(result.blockers).toContain('GST verification not submitted');
  });

  it('TC-021: expired eligibility assessment → is_expired:true + is_eligible:false', async () => {
    db.ttp_eligibility_assessments.findMany.mockResolvedValue([
      { eligibility_outcome: 'ELIGIBLE', risk_tier: 1, valid_until: new Date(PAST_DATE) },
    ]);
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.eligibility_readiness.is_expired).toBe(true);
    expect(result.eligibility_readiness.is_eligible).toBe(false);
    expect(result.blockers).toContain('TTP eligibility assessment has expired');
  });

  it('TC-022: invoice in non-VERIFIED state → is_verified:false + blocker', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'SUBMITTED' }) // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });   // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.invoice_readiness.is_verified).toBe(false);
    expect(result.invoice_readiness.state_key).toBe('SUBMITTED');
    expect(result.blockers).toContain('Latest invoice is in state SUBMITTED (must be VERIFIED)');
  });

  it('TC-023: trade with buyer_org_id match → actor_role BUYER', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: BUYER_ORG });
    expect(result.actor_role).toBe('BUYER');
    expect(result.buyer_org_id).toBe(BUYER_ORG);
    expect(result.seller_org_id).toBe(SELLER_ORG);
  });

  it('TC-024: full happy path — all readiness checks pass, zero blockers', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' }) // invoice
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });  // vpc
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.blockers).toHaveLength(0);
    expect(result.gst_readiness.is_approved).toBe(true);
    expect(result.eligibility_readiness.is_eligible).toBe(true);
    expect(result.invoice_readiness.is_verified).toBe(true);
    expect(result.vpc_readiness.is_active).toBe(true);
  });

  it('TC-025: trade_trust_score is present in summary response and has required fields', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.trade_trust_score).toBeDefined();
    expect(typeof result.trade_trust_score.score).toBe('number');
    expect(['READY', 'NEAR_READY', 'NEEDS_REVIEW', 'NOT_READY']).toContain(result.trade_trust_score.band);
    expect(Array.isArray(result.trade_trust_score.factors)).toBe(true);
    expect(result.trade_trust_score.factors.length).toBeGreaterThan(0);
    expect(Array.isArray(result.trade_trust_score.blockers)).toBe(true);
    expect(Array.isArray(result.trade_trust_score.next_steps)).toBe(true);
    expect(result.trade_trust_score.disclaimer).toContain('advisory readiness indicator only');
  });

  it('TC-026: full happy-path summary returns score 100 and band READY', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    expect(result.trade_trust_score.score).toBe(100);
    expect(result.trade_trust_score.band).toBe('READY');
    expect(result.trade_trust_score.blockers).toHaveLength(0);
  });

  it('TC-027: score response does not contain raw_bureau_json or raw_verification_json', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    const result = await svc.getTradeTtpSummary({ tradeId: TRADE_ID, actorOrgId: SELLER_ORG });
    const scoreJson = JSON.stringify(result.trade_trust_score);
    expect(scoreJson).not.toContain('raw_bureau_json');
    expect(scoreJson).not.toContain('raw_verification_json');
  });
});
