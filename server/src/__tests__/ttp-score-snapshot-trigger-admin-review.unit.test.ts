/**
 * Unit tests â€” TTP Score Snapshot Trigger: Admin Review
 * Unit: TTP-SCORE-SNAPSHOT-TRIGGER-ADMIN-REVIEW-001 (Slice 5)
 *
 * Tests captureAdminReviewSnapshot helper exported from
 * server/src/routes/control/ttp-eligibility.ts
 *
 * Pure unit tests with vi.fn() mocks. No DB access.
 * Verifies best-effort orchestration: snapshot failure never affects assessment result.
 *
 * Run: pnpm -C server exec vitest run src/__tests__/ttp-score-snapshot-trigger-admin-review.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureAdminReviewSnapshot } from '../routes/control/ttp-eligibility.js';
import {
  TTP_SCORE_TRIGGER_EVENT,
  type CaptureSnapshotInput,
  type CaptureSnapshotResult,
} from '../services/ttpScoreSnapshot.service.js';
import type { TtpEligibilityAssessmentRecord } from '../services/ttpEligibility.service.js';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ORG_ID        = 'aaaa1111-0000-0000-0000-000000000001';
const ADMIN_ID      = 'bbbb2222-0000-0000-0000-000000000002';
const ASSESSMENT_ID = 'cccc3333-0000-0000-0000-000000000003';

// â”€â”€â”€ Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeAssessment(overrides: Partial<TtpEligibilityAssessmentRecord> = {}): TtpEligibilityAssessmentRecord {
  const now = new Date('2026-05-05T00:00:00.000Z');
  return {
    id: ASSESSMENT_ID,
    org_id: ORG_ID,
    assessment_type: 'MANUAL',
    risk_tier: 1,
    eligibility_outcome: 'ELIGIBLE',
    max_invoice_amount: 250000,
    currency: 'INR',
    assessed_at: now,
    valid_until: null,
    assessed_by_admin_id: ADMIN_ID,
    assessment_notes: null,
    raw_bureau_json: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeSnapshotResult(): CaptureSnapshotResult {
  return {
    id: 'snap-0001-0000-0000-000000000001',
    org_id: ORG_ID,
    score_value: 720,
    score_band: 'MEDIUM',
    score_version: 'TTP_V1',
    trigger_event: TTP_SCORE_TRIGGER_EVENT.ADMIN_REVIEW_COMPLETE,
    created_at: new Date('2026-05-05T00:00:00.000Z'),
  };
}

// â”€â”€â”€ Mock type helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Typed vi.fn factories â€” implementation signature tells TypeScript the exact mock type.
// vi.fn(implementation) infers Mock<typeof implementation>, satisfying Pick<TtpScoreSnapshotService, 'captureSnapshot'>
// without needing an unsafe `as any` cast.

function makeCaptureSnapshotMock(result: CaptureSnapshotResult = makeSnapshotResult()) {
  return vi.fn((_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
    Promise.resolve(result),
  );
}

function makeRejectingCaptureSnapshotMock(err: Error) {
  return vi.fn((_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
    Promise.reject(err),
  );
}

function makeLogErrorMock() {
  return vi.fn((_obj: Record<string, unknown>, _msg: string): void => undefined);
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('captureAdminReviewSnapshot', () => {
  let snapshotSvc: { captureSnapshot: ReturnType<typeof makeCaptureSnapshotMock> };
  let log: { error: ReturnType<typeof makeLogErrorMock> };
  let assessment: TtpEligibilityAssessmentRecord;

  beforeEach(() => {
    snapshotSvc = { captureSnapshot: makeCaptureSnapshotMock() };
    log = { error: makeLogErrorMock() };
    assessment = makeAssessment();
  });

  // â”€â”€â”€ TC-TADM-001 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-001: calls captureSnapshot with triggerEvent = ADMIN_REVIEW_COMPLETE', async () => {
    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(snapshotSvc.captureSnapshot).toHaveBeenCalledOnce();
    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.triggerEvent).toBe(TTP_SCORE_TRIGGER_EVENT.ADMIN_REVIEW_COMPLETE);
  });

  // â”€â”€â”€ TC-TADM-002 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-002: snapshot context has correct sourceEventId, orgId, actorId', async () => {
    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.sourceEventId).toBe(ASSESSMENT_ID);
    expect(input.orgId).toBe(ORG_ID);
    expect(input.actorId).toBe(ADMIN_ID);
  });

  // â”€â”€â”€ TC-TADM-003 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-003: sourceEventId equals assessment.id', async () => {
    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.sourceEventId).toBe(assessment.id);
  });

  // â”€â”€â”€ TC-TADM-004 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-004: captureSnapshot success â†’ helper resolves without error', async () => {
    await expect(
      captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log }),
    ).resolves.toBeUndefined();
  });

  // â”€â”€â”€ TC-TADM-005 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-005: captureSnapshot throws â†’ helper still resolves (no rethrow)', async () => {
    snapshotSvc = { captureSnapshot: makeRejectingCaptureSnapshotMock(new Error('DB write failed')) };

    await expect(
      captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log }),
    ).resolves.toBeUndefined();
  });

  // â”€â”€â”€ TC-TADM-006 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-006: captureSnapshot throws â†’ log.error called once', async () => {
    snapshotSvc = { captureSnapshot: makeRejectingCaptureSnapshotMock(new Error('Connection timeout')) };

    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(log.error).toHaveBeenCalledOnce();
  });

  // â”€â”€â”€ TC-TADM-007 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-007: log.error event contains trigger_event, assessment_id, org_id, err_name, err_msg', async () => {
    const err = new Error('Score compute failed');
    err.name = 'ScoreComputeError';
    snapshotSvc = { captureSnapshot: makeRejectingCaptureSnapshotMock(err) };

    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const logObj = log.error.mock.calls[0][0];
    expect(logObj['trigger_event']).toBe(TTP_SCORE_TRIGGER_EVENT.ADMIN_REVIEW_COMPLETE);
    expect(logObj['assessment_id']).toBe(ASSESSMENT_ID);
    expect(logObj['org_id']).toBe(ORG_ID);
    expect(logObj['err_name']).toBe('ScoreComputeError');
    expect(logObj['err_msg']).toBe('Score compute failed');
  });

  // â”€â”€â”€ TC-TADM-008 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-008: captureSnapshot success â†’ log.error NOT called', async () => {
    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(log.error).not.toHaveBeenCalled();
  });

  // â”€â”€â”€ TC-TADM-009 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-009: missing assessment.id â†’ log.error called with reason=missing_assessment_id', async () => {
    assessment = makeAssessment({ id: '' });

    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(log.error).toHaveBeenCalledOnce();
    const logObj = log.error.mock.calls[0][0];
    expect(logObj['reason']).toBe('missing_assessment_id');
  });

  // â”€â”€â”€ TC-TADM-010 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-010: missing assessment.id â†’ captureSnapshot NOT called', async () => {
    assessment = makeAssessment({ id: '' });

    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    expect(snapshotSvc.captureSnapshot).not.toHaveBeenCalled();
  });

  // â”€â”€â”€ TC-TADM-011 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-011: missing assessment.id â†’ helper resolves normally (no rethrow)', async () => {
    assessment = makeAssessment({ id: '' });

    await expect(
      captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log }),
    ).resolves.toBeUndefined();
  });

  // â”€â”€â”€ TC-TADM-012 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  it('TC-TADM-012: tradeId and enrollmentId are null (ADMIN_REVIEW_COMPLETE is org-scoped â€” AF-06)', async () => {
    await captureAdminReviewSnapshot({ assessment, orgId: ORG_ID, adminId: ADMIN_ID, snapshotSvc, log });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.tradeId).toBeNull();
    expect(input.enrollmentId).toBeNull();
  });
});

