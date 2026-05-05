/**
 * TtpScoreSnapshotService unit tests — TTP Slice 2: Score Snapshot Service
 *
 * 13 test cases covering:
 *   TC-SS-001: captureSnapshot writes row for VPC_ISSUED
 *   TC-SS-002: captureSnapshot writes row for ENROLLMENT_APPROVED
 *   TC-SS-003: captureSnapshot writes row for ADMIN_REVIEW_COMPLETE
 *   TC-SS-004: score_detail_json includes factors, blockers, next_steps
 *   TC-SS-005: score_detail_json excludes score, band, disclaimer, raw payloads
 *   TC-SS-006: score_disclaimer_hash equals SHA-256 of SCORE_DISCLAIMER
 *   TC-SS-007: route_disclaimer_hash equals SHA-256 of TTP_DISCLAIMER_TEXT
 *   TC-SS-008: score_version is TTP_V1
 *   TC-SS-009: PARTNER_TRANSMITTED trigger is rejected with SnapshotUnsupportedTriggerError
 *   TC-SS-010: ADMIN_REVIEW_COMPLETE allows trade_id=null and enrollment_id=null
 *   TC-SS-011: best-effort — caller can catch snapshot failure without affecting primary result
 *   TC-SS-012: assembleTtpScoreInput returns correct shape with tradeId context
 *   TC-SS-013: assembleTtpScoreInput returns not-found invoice/vpc/routing without tradeId
 */

import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TtpScoreSnapshotService,
  SnapshotUnsupportedTriggerError,
  type CaptureSnapshotInput,
} from '../services/ttpScoreSnapshot.service.js';
import { SCORE_DISCLAIMER } from '../services/ttpScore.service.js';
import { TTP_DISCLAIMER_TEXT } from '../ttp/ttp.constants.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID      = '11111111-1111-1111-1111-111111111111';
const TRADE_ID    = '22222222-2222-2222-2222-222222222222';
const VPC_ID      = '33333333-3333-3333-3333-333333333333';
const INVOICE_ID  = '44444444-4444-4444-4444-444444444444';
const ENROLL_ID   = '55555555-5555-5555-5555-555555555555';
const SNAPSHOT_ID = '99999999-9999-9999-9999-999999999999';
const ACTOR_ID    = '00000000-0000-0000-0000-000000000001';

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

/** Happy-path mock DB — all readiness checks pass → score 100, band READY. */
function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    gst_verifications: {
      findUnique: vi.fn().mockResolvedValue({ review_outcome: 'APPROVED' }),
    },
    ttp_eligibility_assessments: {
      findMany: vi.fn().mockResolvedValue([
        { eligibility_outcome: 'ELIGIBLE', risk_tier: 2, valid_until: FUTURE },
      ]),
    },
    ttp_enrollment_logs: {
      findMany: vi.fn().mockResolvedValue([{ to_state: 'APPROVED' }]),
    },
    invoices: {
      findMany: vi.fn().mockResolvedValue([
        { id: INVOICE_ID, lifecycle_state_id: 'lsid-inv-1' },
      ]),
    },
    lifecycleState: {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce({ stateKey: 'VERIFIED' })  // invoice
        .mockResolvedValueOnce({ stateKey: 'ACTIVE' }),   // vpc
    },
    verified_payable_certificates: {
      findMany: vi.fn().mockResolvedValue([
        { id: VPC_ID, lifecycle_state_id: 'lsid-vpc-1' },
      ]),
    },
    partner_routing_stubs: {
      findMany: vi.fn().mockResolvedValue([
        { transmission_status: 'PENDING' },
      ]),
    },
    ttp_score_snapshots: {
      create: vi.fn().mockResolvedValue({
        id: SNAPSHOT_ID,
        org_id: ORG_ID,
        score_value: 100,
        score_band: 'READY',
        score_version: 'TTP_V1',
        trigger_event: 'VPC_ISSUED',
        created_at: new Date(),
      }),
    },
    ...overrides,
  };
}

/** Base input for VPC_ISSUED trigger. */
function makeInput(
  overrides: Partial<CaptureSnapshotInput> = {},
): CaptureSnapshotInput {
  return {
    orgId: ORG_ID,
    triggerEvent: 'VPC_ISSUED',
    tradeId: TRADE_ID,
    vpcId: VPC_ID,
    invoiceId: INVOICE_ID,
    actorId: ACTOR_ID,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TtpScoreSnapshotService.captureSnapshot', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpScoreSnapshotService;

  beforeEach(() => {
    db = makeDb();
    svc = new TtpScoreSnapshotService(db);
  });

  // TC-SS-001 ─────────────────────────────────────────────────────────────────
  it('TC-SS-001: writes row for VPC_ISSUED', async () => {
    const result = await svc.captureSnapshot(makeInput({ triggerEvent: 'VPC_ISSUED' }));
    expect(db.ttp_score_snapshots.create).toHaveBeenCalledOnce();
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.trigger_event).toBe('VPC_ISSUED');
    expect(data.org_id).toBe(ORG_ID);
    expect(data.vpc_id).toBe(VPC_ID);
    expect(result.id).toBe(SNAPSHOT_ID);
  });

  // TC-SS-002 ─────────────────────────────────────────────────────────────────
  it('TC-SS-002: writes row for ENROLLMENT_APPROVED', async () => {
    db.ttp_score_snapshots.create.mockResolvedValue({
      id: SNAPSHOT_ID,
      org_id: ORG_ID,
      score_value: 100,
      score_band: 'READY',
      score_version: 'TTP_V1',
      trigger_event: 'ENROLLMENT_APPROVED',
      created_at: new Date(),
    });
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });

    const result = await svc.captureSnapshot(
      makeInput({
        triggerEvent: 'ENROLLMENT_APPROVED',
        enrollmentId: ENROLL_ID,
      }),
    );

    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.trigger_event).toBe('ENROLLMENT_APPROVED');
    expect(data.enrollment_id).toBe(ENROLL_ID);
    // OQ-SS-03: source_event_id = enrollment_id for ENROLLMENT_APPROVED
    expect(data.source_event_id).toBe(ENROLL_ID);
    expect(result.id).toBe(SNAPSHOT_ID);
  });

  // TC-SS-003 ─────────────────────────────────────────────────────────────────
  it('TC-SS-003: writes row for ADMIN_REVIEW_COMPLETE', async () => {
    const ASSESSMENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    db.ttp_score_snapshots.create.mockResolvedValue({
      id: SNAPSHOT_ID,
      org_id: ORG_ID,
      score_value: 100,
      score_band: 'READY',
      score_version: 'TTP_V1',
      trigger_event: 'ADMIN_REVIEW_COMPLETE',
      created_at: new Date(),
    });

    const result = await svc.captureSnapshot(
      makeInput({
        triggerEvent: 'ADMIN_REVIEW_COMPLETE',
        tradeId: null,
        vpcId: null,
        invoiceId: null,
        sourceEventId: ASSESSMENT_ID,
      }),
    );

    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.trigger_event).toBe('ADMIN_REVIEW_COMPLETE');
    expect(data.source_event_id).toBe(ASSESSMENT_ID);
    expect(result.id).toBe(SNAPSHOT_ID);
  });

  // TC-SS-004 ─────────────────────────────────────────────────────────────────
  it('TC-SS-004: score_detail_json includes factors, blockers, next_steps', async () => {
    await svc.captureSnapshot(makeInput());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const detail = data.score_detail_json;
    expect(detail).toHaveProperty('factors');
    expect(detail).toHaveProperty('blockers');
    expect(detail).toHaveProperty('next_steps');
    expect(Array.isArray(detail.factors)).toBe(true);
    expect(Array.isArray(detail.blockers)).toBe(true);
    expect(Array.isArray(detail.next_steps)).toBe(true);
  });

  // TC-SS-005 ─────────────────────────────────────────────────────────────────
  it('TC-SS-005: score_detail_json excludes score, band, disclaimer, raw payloads', async () => {
    await svc.captureSnapshot(makeInput());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const detail = data.score_detail_json;
    expect(detail).not.toHaveProperty('score');
    expect(detail).not.toHaveProperty('band');
    expect(detail).not.toHaveProperty('disclaimer');
    expect(detail).not.toHaveProperty('raw_bureau_json');
    expect(detail).not.toHaveProperty('raw_verification_json');
  });

  // TC-SS-006 ─────────────────────────────────────────────────────────────────
  it('TC-SS-006: score_disclaimer_hash equals SHA-256 of SCORE_DISCLAIMER', async () => {
    await svc.captureSnapshot(makeInput());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const expected = createHash('sha256').update(SCORE_DISCLAIMER).digest('hex');
    expect(data.score_disclaimer_hash).toBe(expected);
  });

  // TC-SS-007 ─────────────────────────────────────────────────────────────────
  it('TC-SS-007: route_disclaimer_hash equals SHA-256 of TTP_DISCLAIMER_TEXT', async () => {
    await svc.captureSnapshot(makeInput());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const expected = createHash('sha256').update(TTP_DISCLAIMER_TEXT).digest('hex');
    expect(data.route_disclaimer_hash).toBe(expected);
  });

  // TC-SS-008 ─────────────────────────────────────────────────────────────────
  it('TC-SS-008: score_version is always TTP_V1', async () => {
    await svc.captureSnapshot(makeInput());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.score_version).toBe('TTP_V1');
  });

  // TC-SS-009 ─────────────────────────────────────────────────────────────────
  it('TC-SS-009: PARTNER_TRANSMITTED is rejected with SnapshotUnsupportedTriggerError', async () => {
    await expect(
      svc.captureSnapshot(
        // Type assertion required because PARTNER_TRANSMITTED is intentionally
        // excluded from TtpScoreTriggerEvent — this test verifies runtime guard.
        makeInput({ triggerEvent: 'PARTNER_TRANSMITTED' as any }),
      ),
    ).rejects.toBeInstanceOf(SnapshotUnsupportedTriggerError);
    expect(db.ttp_score_snapshots.create).not.toHaveBeenCalled();
  });

  // TC-SS-010 ─────────────────────────────────────────────────────────────────
  it('TC-SS-010: ADMIN_REVIEW_COMPLETE allows trade_id=null and enrollment_id=null', async () => {
    db.ttp_score_snapshots.create.mockResolvedValue({
      id: SNAPSHOT_ID,
      org_id: ORG_ID,
      score_value: 75,
      score_band: 'NEAR_READY',
      score_version: 'TTP_V1',
      trigger_event: 'ADMIN_REVIEW_COMPLETE',
      created_at: new Date(),
    });

    await expect(
      svc.captureSnapshot(
        makeInput({
          triggerEvent: 'ADMIN_REVIEW_COMPLETE',
          tradeId: null,
          enrollmentId: null,
          vpcId: null,
          invoiceId: null,
        }),
      ),
    ).resolves.toBeDefined();

    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.trade_id).toBeNull();
    expect(data.enrollment_id).toBeNull();
  });

  // TC-SS-011 ─────────────────────────────────────────────────────────────────
  it('TC-SS-011: best-effort — caller can catch snapshot failure without mutating primary result', async () => {
    db.ttp_score_snapshots.create.mockRejectedValue(new Error('DB write failed'));

    // Simulate caller pattern: primary operation succeeds; snapshot failure is caught
    let primaryResult = 'primary_ok';
    let snapshotError: Error | null = null;

    try {
      await svc.captureSnapshot(makeInput());
    } catch (err) {
      snapshotError = err as Error;
    }

    // Primary result is unaffected
    expect(primaryResult).toBe('primary_ok');
    // Snapshot failure is surfaced as an error (not silently swallowed)
    expect(snapshotError).toBeInstanceOf(Error);
    expect(snapshotError?.message).toBe('DB write failed');
  });
});

// ─── assembleTtpScoreInput tests ──────────────────────────────────────────────

describe('TtpScoreSnapshotService.assembleTtpScoreInput', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpScoreSnapshotService;

  beforeEach(() => {
    db = makeDb();
    svc = new TtpScoreSnapshotService(db);
  });

  // TC-SS-012 ─────────────────────────────────────────────────────────────────
  it('TC-SS-012: returns correct shape with tradeId context (all readiness found)', async () => {
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });

    const input = await svc.assembleTtpScoreInput(ORG_ID, TRADE_ID);

    expect(input.gst_readiness.found).toBe(true);
    expect(input.gst_readiness.is_approved).toBe(true);
    expect(input.eligibility_readiness.found).toBe(true);
    expect(input.eligibility_readiness.is_eligible).toBe(true);
    expect(input.eligibility_readiness.is_expired).toBe(false);
    expect(input.eligibility_readiness.risk_tier).toBe(2);
    expect(input.invoice_readiness.found).toBe(true);
    expect(input.invoice_readiness.is_verified).toBe(true);
    expect(input.vpc_readiness.found).toBe(true);
    expect(input.vpc_readiness.is_active).toBe(true);
    expect(input.routing_readiness.found).toBe(true);
    expect(input.enrollment_state).toBe('APPROVED');
  });

  // TC-SS-013 ─────────────────────────────────────────────────────────────────
  it('TC-SS-013: returns not-found invoice/vpc/routing when tradeId is absent', async () => {
    const input = await svc.assembleTtpScoreInput(ORG_ID, null);

    // Org-level checks still work
    expect(input.gst_readiness.found).toBe(true);
    expect(input.eligibility_readiness.found).toBe(true);
    // Trade-level checks are not-found
    expect(input.invoice_readiness.found).toBe(false);
    expect(input.invoice_readiness.is_verified).toBe(false);
    expect(input.vpc_readiness.found).toBe(false);
    expect(input.vpc_readiness.is_active).toBe(false);
    expect(input.routing_readiness.found).toBe(false);
    // Trade DB tables must NOT have been queried
    expect(db.invoices.findMany).not.toHaveBeenCalled();
    expect(db.verified_payable_certificates.findMany).not.toHaveBeenCalled();
    expect(db.partner_routing_stubs.findMany).not.toHaveBeenCalled();
  });
});
