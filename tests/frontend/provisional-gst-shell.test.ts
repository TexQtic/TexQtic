/**
 * TEST-MAINAPP-GST-VERIFICATION-PROVISIONAL-SHELL-STATE-SWITCHING-01
 *
 * Covers the provisional GST verification shell state-switching behavior
 * introduced in commit 56d916f9.
 *
 * Gap closed:
 *   FRONTEND_SHELL_TEST_GAP_ACCEPTED_PENDING_FOLLOWUP
 *   (recorded in VERIFY-MAINAPP-GST-VERIFICATION-PROVISIONAL-SHELL-SURFACING-PRODUCTION-01)
 *
 * Tests:
 *   PGSS-001  resolveProvisionalGstStatus(null) → 'not_submitted'
 *   PGSS-002  resolveProvisionalGstStatus with pending record → 'pending'
 *   PGSS-003  resolveProvisionalGstStatus with REJECTED record → 'rejected'
 *   PGSS-004  resolveProvisionalGstStatus with NEEDS_MORE_INFO record → 'needs_more_info'
 *   PGSS-005  resolveProvisionalGstStatus with APPROVED record → 'approved'
 *   PGSS-006  PENDING_VERIFICATION bannerText is neutral (does not assume submission)
 *   PGSS-007  VERIFICATION_REJECTED bannerText describes rejection
 *   PGSS-008  VERIFICATION_NEEDS_MORE_INFO bannerText describes additional info required
 *   PGSS-009  ACTIVE status returns null from getOnboardingStatusContinuity (no banner)
 *   PGSS-010  Unknown status returns null from getOnboardingStatusContinuity (no banner)
 *
 * Safety invariants:
 *   - No production source changed
 *   - No network calls made
 *   - No production GST records touched
 *   - No schema/migration/RLS/env changes
 */

import { describe, expect, it, vi } from 'vitest';

// Mock API clients before importing App to prevent module-load network access
vi.mock('../../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

vi.mock('../../services/adminApiClient', () => ({
  adminDelete: vi.fn(),
  adminGet: vi.fn(),
  adminGetWithHeaders: vi.fn(),
  adminPatch: vi.fn(),
  adminPost: vi.fn(),
  adminPostWithHeaders: vi.fn(),
  adminPut: vi.fn(),
}));

import {
  __PROVISIONAL_GST_SHELL_TESTING__,
} from '../../App';

const { resolveProvisionalGstStatus, getOnboardingStatusContinuity } =
  __PROVISIONAL_GST_SHELL_TESTING__;

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeGstRecord(overrides: { review_outcome?: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO' | null } = {}) {
  return {
    id: 'gst-record-1',
    org_id: 'org-1',
    gstin: '29ABCDE1234F1Z5',
    legal_name_on_gst: 'Test Company Pvt Ltd',
    state_code: '29',
    registration_type: 'Regular',
    filing_status: 'UNKNOWN',
    submitted_at: '2026-01-01T00:00:00.000Z',
    review_outcome: overrides.review_outcome !== undefined ? overrides.review_outcome : null,
    review_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

// ─── resolveProvisionalGstStatus ──────────────────────────────────────────────

describe('resolveProvisionalGstStatus', () => {
  /**
   * PGSS-001 — No GST record exists: provisional shell must surface "Submit GST" CTA.
   */
  it('returns not_submitted when record is null', () => {
    expect(resolveProvisionalGstStatus(null)).toBe('not_submitted');
  });

  /**
   * PGSS-002 — GST submitted but not yet reviewed (review_outcome is null):
   * shell shows "pending review" copy and "View GST Submission" link.
   */
  it('returns pending when record exists with null review_outcome', () => {
    expect(resolveProvisionalGstStatus(makeGstRecord({ review_outcome: null }))).toBe('pending');
  });

  /**
   * PGSS-003 — Admin marked REJECTED: shell must surface "Resubmit GST Verification" CTA.
   */
  it('returns rejected when review_outcome is REJECTED', () => {
    expect(resolveProvisionalGstStatus(makeGstRecord({ review_outcome: 'REJECTED' }))).toBe('rejected');
  });

  /**
   * PGSS-004 — Admin requested more info: shell must surface "Update GST Submission" CTA.
   */
  it('returns needs_more_info when review_outcome is NEEDS_MORE_INFO', () => {
    expect(resolveProvisionalGstStatus(makeGstRecord({ review_outcome: 'NEEDS_MORE_INFO' }))).toBe('needs_more_info');
  });

  /**
   * PGSS-005 — APPROVED records should not produce blocked-shell states in practice,
   * but the resolver must return 'approved' cleanly without throwing or defaulting incorrectly.
   */
  it('returns approved when review_outcome is APPROVED', () => {
    expect(resolveProvisionalGstStatus(makeGstRecord({ review_outcome: 'APPROVED' }))).toBe('approved');
  });
});

// ─── ONBOARDING_STATUS_CONTINUITY bannerText ─────────────────────────────────

describe('getOnboardingStatusContinuity — bannerText', () => {
  /**
   * PGSS-006 — PENDING_VERIFICATION banner must NOT say "has been submitted".
   * The new neutral copy works for both pre-submission and post-submission states.
   */
  it('PENDING_VERIFICATION bannerText is the neutral copy introduced in 56d916f9', () => {
    const entry = getOnboardingStatusContinuity('PENDING_VERIFICATION');
    expect(entry).not.toBeNull();
    expect(entry!.bannerText).toBe(
      'Complete business verification to unlock trade and fund operations.',
    );
    // Regression guard: old misleading copy must not be present
    expect(entry!.bannerText).not.toMatch(/has been submitted/i);
  });

  /**
   * PGSS-007 — VERIFICATION_REJECTED banner must communicate rejection to the tenant.
   */
  it('VERIFICATION_REJECTED bannerText describes a rejection outcome', () => {
    const entry = getOnboardingStatusContinuity('VERIFICATION_REJECTED');
    expect(entry).not.toBeNull();
    expect(entry!.bannerText).toMatch(/not approved/i);
  });

  /**
   * PGSS-008 — VERIFICATION_NEEDS_MORE_INFO banner must communicate that more info is needed.
   */
  it('VERIFICATION_NEEDS_MORE_INFO bannerText describes additional info requirement', () => {
    const entry = getOnboardingStatusContinuity('VERIFICATION_NEEDS_MORE_INFO');
    expect(entry).not.toBeNull();
    expect(entry!.bannerText).toMatch(/more information/i);
  });

  /**
   * PGSS-009 — ACTIVE org should not show any verification banner.
   */
  it('returns null for ACTIVE status (no banner shown)', () => {
    expect(getOnboardingStatusContinuity('ACTIVE')).toBeNull();
  });

  /**
   * PGSS-010 — Unknown/unrecognised org status must not show a banner.
   * Guards against future status codes accidentally producing a continuity entry.
   */
  it('returns null for an unrecognised status string', () => {
    expect(getOnboardingStatusContinuity('UNKNOWN_STATUS')).toBeNull();
  });
});
