/**
 * ttp-monitoring-events unit tests — TTP-ACTIVATION-MONITORING-IMPL-001
 *
 * Documents the error class → monitoring event mapping for TTP route monitoring.
 * These tests protect against error class renames or import path changes that
 * would silently break the event classification logic in route handlers.
 *
 * TC-001: VpcEligibilityExpiredError → instanceof check succeeds (ttp.eligibility.expired path)
 * TC-002: EnrollmentReviewEligibilityExpiredError → instanceof check succeeds (ttp.eligibility.expired path)
 * TC-003: EnrollmentReviewGstError → instanceof check succeeds (ttp.enrollment.gate_failed path)
 * TC-004: EnrollmentReviewEligibilityMissingError → instanceof check succeeds (ttp.enrollment.gate_failed path)
 * TC-005: errMsg extraction — Error instance → err.message
 * TC-006: errMsg extraction — non-Error (string) → String(err)
 * TC-007: errMsg extraction — non-Error (number) → String(err)
 * TC-008: VpcEligibilityExpiredError is distinct from EnrollmentReviewEligibilityExpiredError
 * TC-009: EnrollmentReviewGstError is distinct from EnrollmentReviewEligibilityMissingError
 * TC-010: EnrollmentReviewOutcomeInvalidError does NOT route to gate_failed path
 */

import { describe, it, expect } from 'vitest';
import { VpcEligibilityExpiredError } from '../services/vpc.service.js';
import {
  EnrollmentReviewGstError,
  EnrollmentReviewEligibilityMissingError,
  EnrollmentReviewEligibilityExpiredError,
  EnrollmentReviewOutcomeInvalidError,
} from '../services/ttpEnrollment.service.js';

// ─── Helper — mirrors errMsg extraction used in all route handlers ────────────

function extractErrMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─── Helper — mirrors the ttp.eligibility.expired branch predicate ────────────

function isEligibilityExpired(err: unknown): boolean {
  return (
    err instanceof VpcEligibilityExpiredError ||
    err instanceof EnrollmentReviewEligibilityExpiredError
  );
}

// ─── Helper — mirrors the ttp.enrollment.gate_failed branch predicate ─────────

function isEnrollmentGateFailed(err: unknown): boolean {
  return (
    err instanceof EnrollmentReviewGstError ||
    err instanceof EnrollmentReviewEligibilityMissingError
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TTP monitoring event error classification (TTP-ACTIVATION-MONITORING-IMPL-001)', () => {
  /**
   * TC-001: VpcEligibilityExpiredError routes to ttp.eligibility.expired
   */
  it('TC-001: VpcEligibilityExpiredError → ttp.eligibility.expired', () => {
    const err = new VpcEligibilityExpiredError();
    expect(err instanceof VpcEligibilityExpiredError).toBe(true);
    expect(isEligibilityExpired(err)).toBe(true);
    expect(isEnrollmentGateFailed(err)).toBe(false);
  });

  /**
   * TC-002: EnrollmentReviewEligibilityExpiredError routes to ttp.eligibility.expired
   */
  it('TC-002: EnrollmentReviewEligibilityExpiredError → ttp.eligibility.expired', () => {
    const err = new EnrollmentReviewEligibilityExpiredError();
    expect(err instanceof EnrollmentReviewEligibilityExpiredError).toBe(true);
    expect(isEligibilityExpired(err)).toBe(true);
    expect(isEnrollmentGateFailed(err)).toBe(false);
  });

  /**
   * TC-003: EnrollmentReviewGstError routes to ttp.enrollment.gate_failed
   */
  it('TC-003: EnrollmentReviewGstError → ttp.enrollment.gate_failed', () => {
    const err = new EnrollmentReviewGstError();
    expect(err instanceof EnrollmentReviewGstError).toBe(true);
    expect(isEnrollmentGateFailed(err)).toBe(true);
    expect(isEligibilityExpired(err)).toBe(false);
  });

  /**
   * TC-004: EnrollmentReviewEligibilityMissingError routes to ttp.enrollment.gate_failed
   */
  it('TC-004: EnrollmentReviewEligibilityMissingError → ttp.enrollment.gate_failed', () => {
    const err = new EnrollmentReviewEligibilityMissingError();
    expect(err instanceof EnrollmentReviewEligibilityMissingError).toBe(true);
    expect(isEnrollmentGateFailed(err)).toBe(true);
    expect(isEligibilityExpired(err)).toBe(false);
  });

  /**
   * TC-005: errMsg extraction — Error instance uses err.message
   */
  it('TC-005: errMsg extraction — Error instance → err.message', () => {
    const err = new Error('test error message');
    expect(extractErrMsg(err)).toBe('test error message');
  });

  /**
   * TC-006: errMsg extraction — non-Error string uses String(err)
   */
  it('TC-006: errMsg extraction — non-Error string → String(err)', () => {
    const err = 'raw string error';
    expect(extractErrMsg(err)).toBe('raw string error');
  });

  /**
   * TC-007: errMsg extraction — non-Error number uses String(err)
   */
  it('TC-007: errMsg extraction — non-Error number → String(err)', () => {
    const err = 42;
    expect(extractErrMsg(err)).toBe('42');
  });

  /**
   * TC-008: VpcEligibilityExpiredError is distinct from EnrollmentReviewEligibilityExpiredError
   */
  it('TC-008: VpcEligibilityExpiredError is distinct from EnrollmentReviewEligibilityExpiredError', () => {
    const vpcErr = new VpcEligibilityExpiredError();
    const enrollErr = new EnrollmentReviewEligibilityExpiredError();
    expect(vpcErr instanceof EnrollmentReviewEligibilityExpiredError).toBe(false);
    expect(enrollErr instanceof VpcEligibilityExpiredError).toBe(false);
    // Both still trigger the same event — confirmed by TC-001 and TC-002
    expect(isEligibilityExpired(vpcErr)).toBe(true);
    expect(isEligibilityExpired(enrollErr)).toBe(true);
  });

  /**
   * TC-009: EnrollmentReviewGstError is distinct from EnrollmentReviewEligibilityMissingError
   */
  it('TC-009: EnrollmentReviewGstError is distinct from EnrollmentReviewEligibilityMissingError', () => {
    const gstErr = new EnrollmentReviewGstError();
    const missingErr = new EnrollmentReviewEligibilityMissingError();
    expect(gstErr instanceof EnrollmentReviewEligibilityMissingError).toBe(false);
    expect(missingErr instanceof EnrollmentReviewGstError).toBe(false);
    // Both trigger ttp.enrollment.gate_failed — confirmed by TC-003 and TC-004
    expect(isEnrollmentGateFailed(gstErr)).toBe(true);
    expect(isEnrollmentGateFailed(missingErr)).toBe(true);
  });

  /**
   * TC-010: EnrollmentReviewOutcomeInvalidError does NOT route to either monitoring event
   * (it returns 400 BAD_REQUEST with no log — expected client error, not an eligibility gate)
   */
  it('TC-010: EnrollmentReviewOutcomeInvalidError does NOT trigger eligibility.expired or gate_failed', () => {
    const err = new EnrollmentReviewOutcomeInvalidError('INVALID');
    expect(isEligibilityExpired(err)).toBe(false);
    expect(isEnrollmentGateFailed(err)).toBe(false);
  });
});
