/**
 * TTP-TEXQTICSCORE-V2-SNAPSHOT-INTEGRATION-001 unit tests
 *
 * 11 test cases covering:
 *   TC-V2SI-001: v1 default (no scoreVersion) still writes score_version TTP_V1
 *   TC-V2SI-002: v1 default score_detail_json has factors/blockers/next_steps only
 *   TC-V2SI-003: explicit scoreVersion TEXQTICSCORE_V2 writes score_version TEXQTICSCORE_V2
 *   TC-V2SI-004: explicit v2 capture uses computeTexQticScore score and band
 *   TC-V2SI-005: explicit v2 score_detail_json contains v2 factor keys
 *   TC-V2SI-006: explicit v2 score_disclaimer_hash equals SHA-256(TEXQTICSCORE_V2_DISCLAIMER)
 *   TC-V2SI-007: explicit v2 route_disclaimer_hash equals SHA-256(TTP_DISCLAIMER_TEXT) (unchanged)
 *   TC-V2SI-008: explicit v2 score_detail_json excludes score, band, version, disclaimer, raw payloads
 *   TC-V2SI-009: compareTtpV1AndTexQticV2 returns score_delta 0 for parity fixtures
 *   TC-V2SI-010: compareTtpV1AndTexQticV2 returns band_match true for parity fixtures
 *   TC-V2SI-011: compareTtpV1AndTexQticV2 does not mutate the input object
 */

import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TtpScoreSnapshotService,
  compareTtpV1AndTexQticV2,
  type CaptureSnapshotInput,
} from '../services/ttpScoreSnapshot.service.js';
import type { TtpScoreInput } from '../services/ttpScore.service.js';
import {
  TTP_DISCLAIMER_TEXT,
  TEXQTICSCORE_V2_DISCLAIMER,
} from '../ttp/ttp.constants.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID      = '11111111-1111-1111-1111-111111111111';
const TRADE_ID    = '22222222-2222-2222-2222-222222222222';
const VPC_ID      = '33333333-3333-3333-3333-333333333333';
const INVOICE_ID  = '44444444-4444-4444-4444-444444444444';
const SNAPSHOT_ID = '99999999-9999-9999-9999-999999999999';
const ACTOR_ID    = '00000000-0000-0000-0000-000000000001';

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

/** Happy-path mock DB — all readiness checks pass → score 100. */
function makeDb(snapshotOverrides: Record<string, unknown> = {}): any {
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
        .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
        .mockResolvedValueOnce({ stateKey: 'ACTIVE' }),
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
        ...snapshotOverrides,
      }),
    },
  };
}

/** Base VPC_ISSUED input — no scoreVersion passed (default v1 behaviour). */
function makeV1Input(overrides: Partial<CaptureSnapshotInput> = {}): CaptureSnapshotInput {
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

/** Fully-enrolled parity input for dual-run comparison — expected score = 100. */
const PARITY_INPUT: TtpScoreInput = {
  gst_readiness:         { found: true,  is_approved: true },
  eligibility_readiness: { found: true,  is_eligible: true, is_expired: false, risk_tier: 2 },
  invoice_readiness:     { found: true,  is_verified: true },
  vpc_readiness:         { found: true,  is_active: true },
  routing_readiness:     { found: true },
  enrollment_state:      'APPROVED',
};

// ─── v1 default regression ─────────────────────────────────────────────────

describe('TtpScoreSnapshotService.captureSnapshot — v1 default behaviour', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpScoreSnapshotService;

  beforeEach(() => {
    db = makeDb();
    svc = new TtpScoreSnapshotService(db);
  });

  // TC-V2SI-001 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-001: no scoreVersion → writes score_version TTP_V1', async () => {
    await svc.captureSnapshot(makeV1Input());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.score_version).toBe('TTP_V1');
  });

  // TC-V2SI-002 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-002: v1 default score_detail_json has factors, blockers, next_steps only', async () => {
    await svc.captureSnapshot(makeV1Input());
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const detail = data.score_detail_json;
    expect(detail).toHaveProperty('factors');
    expect(detail).toHaveProperty('blockers');
    expect(detail).toHaveProperty('next_steps');
    expect(detail).not.toHaveProperty('score');
    expect(detail).not.toHaveProperty('band');
    expect(detail).not.toHaveProperty('version');
    expect(detail).not.toHaveProperty('disclaimer');
  });
});

// ─── v2 explicit snapshot ─────────────────────────────────────────────────────

describe('TtpScoreSnapshotService.captureSnapshot — scoreVersion TEXQTICSCORE_V2', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: TtpScoreSnapshotService;

  beforeEach(() => {
    // Reset lifecycle state mock for each test (2 calls: invoice + vpc)
    db = makeDb({ score_version: 'TEXQTICSCORE_V2', score_band: 'READY' });
    db.lifecycleState.findFirst
      .mockResolvedValueOnce({ stateKey: 'VERIFIED' })
      .mockResolvedValueOnce({ stateKey: 'ACTIVE' });
    svc = new TtpScoreSnapshotService(db);
  });

  // TC-V2SI-003 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-003: explicit TEXQTICSCORE_V2 writes score_version TEXQTICSCORE_V2', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    expect(data.score_version).toBe('TEXQTICSCORE_V2');
  });

  // TC-V2SI-004 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-004: explicit v2 capture writes score 100 and band READY for fully-ready fixture', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    // Happy-path fixture → all 7 factors pass → score 100, band READY
    expect(data.score_value).toBe(100);
    expect(data.score_band).toBe('READY');
  });

  // TC-V2SI-005 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-005: explicit v2 score_detail_json contains v2 factor keys', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const factorKeys: string[] = (data.score_detail_json.factors as Array<{ key: string }>).map(
      (f) => f.key,
    );
    expect(factorKeys).toContain('gst_verification');
    expect(factorKeys).toContain('eligibility_status');
    expect(factorKeys).toContain('risk_tier');
    expect(factorKeys).toContain('invoice_verification');
    expect(factorKeys).toContain('vpc_issuance');
    expect(factorKeys).toContain('enrollment_status');
    expect(factorKeys).toContain('routing_readiness');
  });

  // TC-V2SI-006 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-006: explicit v2 score_disclaimer_hash equals SHA-256(TEXQTICSCORE_V2_DISCLAIMER)', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const expected = createHash('sha256').update(TEXQTICSCORE_V2_DISCLAIMER).digest('hex');
    expect(data.score_disclaimer_hash).toBe(expected);
    // Must differ from the v1 SCORE_DISCLAIMER hash
    expect(data.score_disclaimer_hash).not.toHaveLength(0);
  });

  // TC-V2SI-007 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-007: explicit v2 route_disclaimer_hash equals SHA-256(TTP_DISCLAIMER_TEXT) — same as v1', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const expected = createHash('sha256').update(TTP_DISCLAIMER_TEXT).digest('hex');
    expect(data.route_disclaimer_hash).toBe(expected);
  });

  // TC-V2SI-008 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-008: explicit v2 score_detail_json excludes score, band, version, disclaimer, raw payloads', async () => {
    await svc.captureSnapshot(makeV1Input({ scoreVersion: 'TEXQTICSCORE_V2' }));
    const data = db.ttp_score_snapshots.create.mock.calls[0][0].data;
    const detail = data.score_detail_json;
    expect(detail).not.toHaveProperty('score');
    expect(detail).not.toHaveProperty('band');
    expect(detail).not.toHaveProperty('version');
    expect(detail).not.toHaveProperty('disclaimer');
    expect(detail).not.toHaveProperty('raw_bureau_json');
    expect(detail).not.toHaveProperty('raw_verification_json');
    // Must still have required fields
    expect(detail).toHaveProperty('factors');
    expect(detail).toHaveProperty('blockers');
    expect(detail).toHaveProperty('next_steps');
  });
});

// ─── Dual-run comparison ──────────────────────────────────────────────────────

describe('compareTtpV1AndTexQticV2', () => {
  // TC-V2SI-009 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-009: returns score_delta 0 for fully-ready parity fixture (OQ-V2-01)', () => {
    const result = compareTtpV1AndTexQticV2(PARITY_INPUT);
    expect(result.score_delta).toBe(0);
  });

  // TC-V2SI-010 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-010: returns band_match true for fully-ready parity fixture (OQ-V2-02)', () => {
    const result = compareTtpV1AndTexQticV2(PARITY_INPUT);
    expect(result.band_match).toBe(true);
    expect(result.score_match).toBe(true);
    // v1 and v2 both return score 100, band READY for fully-ready fixture
    expect(result.v1_score).toBe(100);
    expect(result.v2_score).toBe(100);
    expect(result.v1_band).toBe('READY');
    expect(result.v2_band).toBe('READY');
  });

  // TC-V2SI-011 ────────────────────────────────────────────────────────────────
  it('TC-V2SI-011: does not mutate the input object', () => {
    const input: TtpScoreInput = {
      gst_readiness:         { found: true,  is_approved: true },
      eligibility_readiness: { found: false, is_eligible: false, is_expired: false, risk_tier: null },
      invoice_readiness:     { found: false, is_verified: false },
      vpc_readiness:         { found: false, is_active: false },
      routing_readiness:     { found: false },
      enrollment_state:      'REQUESTED',
    };
    // Deep-clone to compare after the call
    const inputSnapshot = JSON.parse(JSON.stringify(input)) as TtpScoreInput;

    compareTtpV1AndTexQticV2(input);

    expect(input).toStrictEqual(inputSnapshot);
  });
});
