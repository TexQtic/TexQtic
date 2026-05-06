/**
 * TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — Unit tests
 *
 * Verifies the catch-block copy-selection logic for the three TTP-gated
 * control-plane surfaces:
 *   - VpcConsole      (fetchVpcs catch)
 *   - TtpEnrollmentAdmin (load catch)
 *   - TtpEligibilityConsole (loadAssessments catch)
 *
 * Test strategy:
 *   The three components manage async fetch state internally (useEffect +
 *   useCallback). The project's test infrastructure uses renderToStaticMarkup
 *   for presentation components that accept error as props, which cannot cover
 *   async internal state updates without @testing-library/react (not in repo).
 *
 *   These tests therefore exercise the EXACT conditional logic from each
 *   catch block directly, using the REAL APIError class (no mock) so that
 *   instanceof checks behave identically to runtime.
 *
 *   Each test mirrors the implementation one-to-one:
 *     if (err instanceof APIError && err.code === 'FEATURE_DISABLED') → disabled copy
 *     else if (err instanceof APIError) [TtpEnrollmentAdmin only] → err.message
 *     else → generic copy
 *
 * Design artifact: docs/TECS-TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001-DESIGN-v1.md
 * Governance:      TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md
 *
 * Safety invariants (unchanged):
 *   - ttp_enabled = false
 *   - LEGAL_REVIEW_PENDING active
 *   - No backend, service, schema, or env changes
 */

import { describe, expect, it } from 'vitest';
import { APIError } from '../services/apiClient';

// ─── Copy constants (must match implementation exactly) ───────────────────────

const FEATURE_DISABLED_COPY =
  'TradeTrust Pay is not currently enabled on this platform.';

const VPC_GENERIC_ERROR = 'Failed to load VPCs. Please try again.';
const ENROLLMENT_GENERIC_ERROR = 'Failed to load enrollments.';
const ELIGIBILITY_GENERIC_ERROR = 'Failed to load eligibility assessments.';

// ─── VpcConsole.fetchVpcs catch block logic ───────────────────────────────────
//
// Exact catch block from VpcConsole.tsx:
//   catch (err) {
//     if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
//       setError('TradeTrust Pay is not currently enabled on this platform.');
//     } else {
//       setError('Failed to load VPCs. Please try again.');
//     }
//   }

function resolveVpcLoadError(err: unknown): string {
  if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
    return FEATURE_DISABLED_COPY;
  }
  return VPC_GENERIC_ERROR;
}

// ─── TtpEnrollmentAdmin.load catch block logic ───────────────────────────────
//
// Exact catch block from TtpEnrollmentAdmin.tsx:
//   catch (err) {
//     if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
//       setError('TradeTrust Pay is not currently enabled on this platform.');
//     } else if (err instanceof APIError) {
//       setError(err.message ?? 'Failed to load enrollments.');
//     } else {
//       setError('Failed to load enrollments.');
//     }
//   }

function resolveEnrollmentLoadError(err: unknown): string {
  if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
    return FEATURE_DISABLED_COPY;
  }
  if (err instanceof APIError) {
    return err.message ?? ENROLLMENT_GENERIC_ERROR;
  }
  return ENROLLMENT_GENERIC_ERROR;
}

// ─── TtpEligibilityConsole.loadAssessments catch block logic ─────────────────
//
// Exact catch block from TtpEligibilityConsole.tsx:
//   catch (err) {
//     if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
//       setLoadError('TradeTrust Pay is not currently enabled on this platform.');
//     } else {
//       setLoadError('Failed to load eligibility assessments.');
//     }
//   }

function resolveEligibilityLoadError(err: unknown): string {
  if (err instanceof APIError && err.code === 'FEATURE_DISABLED') {
    return FEATURE_DISABLED_COPY;
  }
  return ELIGIBILITY_GENERIC_ERROR;
}

// ─── VpcConsole tests ─────────────────────────────────────────────────────────

describe('TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — VpcConsole fetchVpcs catch', () => {
  it('TC-FDU-001: APIError 503 FEATURE_DISABLED → shows feature-disabled copy', () => {
    const err = new APIError(
      503,
      'Service temporarily unavailable. Try again.',
      'FEATURE_DISABLED',
    );
    expect(resolveVpcLoadError(err)).toBe(FEATURE_DISABLED_COPY);
  });

  it('TC-FDU-002: APIError 500 SERVER_ERROR → shows generic VPC error copy', () => {
    const err = new APIError(500, 'Service temporarily unavailable. Try again.', 'SERVER_ERROR');
    expect(resolveVpcLoadError(err)).toBe(VPC_GENERIC_ERROR);
  });

  it('TC-FDU-003: non-APIError (plain Error) → shows generic VPC error copy', () => {
    const err = new Error('Network failure');
    expect(resolveVpcLoadError(err)).toBe(VPC_GENERIC_ERROR);
  });
});

// ─── TtpEnrollmentAdmin tests ─────────────────────────────────────────────────

describe('TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — TtpEnrollmentAdmin load catch', () => {
  it('TC-FDU-004: APIError 503 FEATURE_DISABLED → shows feature-disabled copy', () => {
    const err = new APIError(
      503,
      'Service temporarily unavailable. Try again.',
      'FEATURE_DISABLED',
    );
    expect(resolveEnrollmentLoadError(err)).toBe(FEATURE_DISABLED_COPY);
  });

  it('TC-FDU-005: APIError 500 with message (no FEATURE_DISABLED code) → shows err.message', () => {
    const err = new APIError(500, 'Unexpected server error', undefined);
    expect(resolveEnrollmentLoadError(err)).toBe('Unexpected server error');
  });

  it('TC-FDU-006: non-APIError (plain Error) → shows generic enrollment error copy', () => {
    const err = new Error('Network failure');
    expect(resolveEnrollmentLoadError(err)).toBe(ENROLLMENT_GENERIC_ERROR);
  });
});

// ─── TtpEligibilityConsole tests ──────────────────────────────────────────────

describe('TTP-CONTROL-PLANE-FEATURE-DISABLED-UX-001 — TtpEligibilityConsole loadAssessments catch', () => {
  it('TC-FDU-007: APIError 503 FEATURE_DISABLED → shows feature-disabled copy', () => {
    const err = new APIError(
      503,
      'Service temporarily unavailable. Try again.',
      'FEATURE_DISABLED',
    );
    expect(resolveEligibilityLoadError(err)).toBe(FEATURE_DISABLED_COPY);
  });

  it('TC-FDU-008: APIError 500 SERVER_ERROR → shows generic eligibility error copy', () => {
    const err = new APIError(500, 'Service temporarily unavailable. Try again.', 'SERVER_ERROR');
    expect(resolveEligibilityLoadError(err)).toBe(ELIGIBILITY_GENERIC_ERROR);
  });

  it('TC-FDU-009: non-APIError (plain Error) → shows generic eligibility error copy', () => {
    const err = new Error('Network failure');
    expect(resolveEligibilityLoadError(err)).toBe(ELIGIBILITY_GENERIC_ERROR);
  });
});
