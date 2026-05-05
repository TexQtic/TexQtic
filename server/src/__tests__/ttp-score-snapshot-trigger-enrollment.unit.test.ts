/**
 * ttp-score-snapshot-trigger-enrollment.unit.test.ts — ENROLLMENT_APPROVED snapshot trigger unit tests
 *
 * Covers the `captureEnrollmentApprovedSnapshot` orchestration helper exported from the enrollment route.
 *
 * Test scope:
 *   TC-TENR-001  captureSnapshot called with triggerEvent = ENROLLMENT_APPROVED
 *   TC-TENR-002  snapshot context contains correct enrollmentId, sourceEventId, tradeId, orgId, actorId
 *   TC-TENR-003  enrollmentId equals enrollment.latest_log_id
 *   TC-TENR-004  captureSnapshot success → helper resolves without error
 *   TC-TENR-005  captureSnapshot throws → helper still resolves (no rethrow)
 *   TC-TENR-006  captureSnapshot throws → log.error called with structured event
 *   TC-TENR-007  log.error event contains trigger_event, enrollment_id, trade_id, org_id, err_name, err_msg
 *   TC-TENR-008  captureSnapshot success → log.error NOT called
 *   TC-TENR-009  missing latest_log_id → log.error called with reason=missing_enrollment_id
 *   TC-TENR-010  missing latest_log_id → captureSnapshot NOT called
 *   TC-TENR-011  missing latest_log_id → helper resolves normally (no rethrow)
 *   TC-TENR-012  triggerEvent is ENROLLMENT_APPROVED, never PARTNER_TRANSMITTED
 *
 * Governance: TTP Slice 4 (TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001), TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureEnrollmentApprovedSnapshot } from '../routes/control/ttp-enrollments.js';
import {
  TTP_SCORE_TRIGGER_EVENT,
  type CaptureSnapshotInput,
  type CaptureSnapshotResult,
} from '../services/ttpScoreSnapshot.service.js';
import type { AdminEnrollmentRecord } from '../services/ttpEnrollment.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRADE_ID       = 'aaaa1111-0000-0000-0000-000000000001';
const ORG_ID         = 'bbbb2222-0000-0000-0000-000000000002';
const ADMIN_ID       = 'cccc3333-0000-0000-0000-000000000003';
const LOG_ID         = 'dddd4444-0000-0000-0000-000000000004';
const BUYER_ORG_ID   = 'eeee5555-0000-0000-0000-000000000005';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEnrollmentRecord(
  overrides: Partial<AdminEnrollmentRecord> = {},
): AdminEnrollmentRecord {
  return {
    org_id: ORG_ID,
    trade_id: TRADE_ID,
    seller_org_id: ORG_ID,
    buyer_org_id: BUYER_ORG_ID,
    enrollment_state: 'APPROVED',
    latest_log_id: LOG_ID,
    last_updated_at: new Date().toISOString(),
    last_reason: 'APPROVED',
    advisory_disclaimer: 'TTP disclaimer text.',
    trade_reference: 'TRD-001',
    currency: 'INR',
    trade_lifecycle_state: 'ACTIVE',
    ...overrides,
  };
}

function makeSnapshotResult(): CaptureSnapshotResult {
  return {
    id: 'snap-0000-0000-0000-000000000001',
    org_id: ORG_ID,
    score_value: 72,
    score_band: 'MEDIUM',
    score_version: 'TTP_V1',
    trigger_event: 'ENROLLMENT_APPROVED',
    created_at: new Date(),
  };
}

// ─── Mock type helpers ────────────────────────────────────────────────────────

// Typed vi.fn factories — implementation signature tells TypeScript the exact mock type.
// vi.fn(implementation) infers Mock<typeof implementation>, satisfying the strict interfaces
// without needing an unsafe `as any` cast.

function makeCaptureSnapshotMock(result: CaptureSnapshotResult = makeSnapshotResult()) {
  return vi.fn((_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
    Promise.resolve(result),
  );
}

function makeLogErrorMock() {
  return vi.fn((_obj: Record<string, unknown>, _msg: string): void => undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('captureEnrollmentApprovedSnapshot', () => {
  let snapshotSvc: { captureSnapshot: ReturnType<typeof makeCaptureSnapshotMock> };
  let log: { error: ReturnType<typeof makeLogErrorMock> };
  let enrollment: AdminEnrollmentRecord;

  beforeEach(() => {
    snapshotSvc = { captureSnapshot: makeCaptureSnapshotMock() };
    log = { error: makeLogErrorMock() };
    enrollment = makeEnrollmentRecord();
  });

  // ─── TC-TENR-001 ────────────────────────────────────────────────────────────

  it('TC-TENR-001: captureSnapshot called with triggerEvent = ENROLLMENT_APPROVED', async () => {
    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    expect(snapshotSvc.captureSnapshot).toHaveBeenCalledOnce();
    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.triggerEvent).toBe(TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED);
  });

  // ─── TC-TENR-002 ────────────────────────────────────────────────────────────

  it('TC-TENR-002: snapshot context contains correct enrollmentId, sourceEventId, tradeId, orgId, actorId', async () => {
    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.enrollmentId).toBe(LOG_ID);
    expect(input.sourceEventId).toBe(LOG_ID);
    expect(input.tradeId).toBe(TRADE_ID);
    expect(input.orgId).toBe(ORG_ID);
    expect(input.actorId).toBe(ADMIN_ID);
  });

  // ─── TC-TENR-003 ────────────────────────────────────────────────────────────

  it('TC-TENR-003: enrollmentId equals enrollment.latest_log_id', async () => {
    const customLogId = 'ffff6666-0000-0000-0000-000000000006';
    const customEnrollment = makeEnrollmentRecord({ latest_log_id: customLogId });

    await captureEnrollmentApprovedSnapshot({
      enrollment: customEnrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.enrollmentId).toBe(customLogId);
    expect(input.enrollmentId).toBe(customEnrollment.latest_log_id);
  });

  // ─── TC-TENR-004 ────────────────────────────────────────────────────────────

  it('TC-TENR-004: captureSnapshot success → helper resolves without error', async () => {
    await expect(
      captureEnrollmentApprovedSnapshot({
        enrollment,
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        snapshotSvc,
        log,
      }),
    ).resolves.toBeUndefined();
  });

  // ─── TC-TENR-005 ────────────────────────────────────────────────────────────

  it('TC-TENR-005: captureSnapshot throws → helper still resolves (no rethrow)', async () => {
    snapshotSvc.captureSnapshot = vi.fn(
      (_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
        Promise.reject(new Error('DB timeout')),
    );

    await expect(
      captureEnrollmentApprovedSnapshot({
        enrollment,
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        snapshotSvc,
        log,
      }),
    ).resolves.toBeUndefined();
  });

  // ─── TC-TENR-006 ────────────────────────────────────────────────────────────

  it('TC-TENR-006: captureSnapshot throws → log.error called with structured event', async () => {
    snapshotSvc.captureSnapshot = vi.fn(
      (_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> =>
        Promise.reject(new Error('DB timeout')),
    );

    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    expect(log.error).toHaveBeenCalledOnce();
  });

  // ─── TC-TENR-007 ────────────────────────────────────────────────────────────

  it('TC-TENR-007: log.error event contains trigger_event, enrollment_id, trade_id, org_id, err_name, err_msg', async () => {
    const err = new Error('DB timeout');
    snapshotSvc.captureSnapshot = vi.fn(
      (_input: CaptureSnapshotInput): Promise<CaptureSnapshotResult> => Promise.reject(err),
    );

    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    const [logObj] = log.error.mock.calls[0];
    expect(logObj).toMatchObject({
      trigger_event: TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED,
      enrollment_id: LOG_ID,
      trade_id: TRADE_ID,
      org_id: ORG_ID,
      err_name: 'Error',
      err_msg: 'DB timeout',
    });
  });

  // ─── TC-TENR-008 ────────────────────────────────────────────────────────────

  it('TC-TENR-008: captureSnapshot success → log.error NOT called', async () => {
    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    expect(log.error).not.toHaveBeenCalled();
  });

  // ─── TC-TENR-009 ────────────────────────────────────────────────────────────

  it('TC-TENR-009: missing latest_log_id → log.error called with reason=missing_enrollment_id', async () => {
    const noLogEnrollment = makeEnrollmentRecord({ latest_log_id: null });

    await captureEnrollmentApprovedSnapshot({
      enrollment: noLogEnrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    expect(log.error).toHaveBeenCalledOnce();
    const [logObj] = log.error.mock.calls[0];
    expect(logObj).toMatchObject({
      event: 'ttp.score_snapshot.capture_failed',
      reason: 'missing_enrollment_id',
      trade_id: TRADE_ID,
      org_id: ORG_ID,
    });
  });

  // ─── TC-TENR-010 ────────────────────────────────────────────────────────────

  it('TC-TENR-010: missing latest_log_id → captureSnapshot NOT called', async () => {
    const noLogEnrollment = makeEnrollmentRecord({ latest_log_id: null });

    await captureEnrollmentApprovedSnapshot({
      enrollment: noLogEnrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    expect(snapshotSvc.captureSnapshot).not.toHaveBeenCalled();
  });

  // ─── TC-TENR-011 ────────────────────────────────────────────────────────────

  it('TC-TENR-011: missing latest_log_id → helper resolves normally (no rethrow)', async () => {
    const noLogEnrollment = makeEnrollmentRecord({ latest_log_id: null });

    await expect(
      captureEnrollmentApprovedSnapshot({
        enrollment: noLogEnrollment,
        tradeId: TRADE_ID,
        adminId: ADMIN_ID,
        snapshotSvc,
        log,
      }),
    ).resolves.toBeUndefined();
  });

  // ─── TC-TENR-012 ────────────────────────────────────────────────────────────

  it('TC-TENR-012: triggerEvent is ENROLLMENT_APPROVED, never PARTNER_TRANSMITTED', async () => {
    await captureEnrollmentApprovedSnapshot({
      enrollment,
      tradeId: TRADE_ID,
      adminId: ADMIN_ID,
      snapshotSvc,
      log,
    });

    const input = snapshotSvc.captureSnapshot.mock.calls[0][0];
    expect(input.triggerEvent).toBe(TTP_SCORE_TRIGGER_EVENT.ENROLLMENT_APPROVED);
    expect(input.triggerEvent).not.toBe('PARTNER_TRANSMITTED');
  });
});
