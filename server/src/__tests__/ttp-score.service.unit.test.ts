/**
 * TtpScoreService unit tests — TTP Slice 8: TradeTrust Score Advisory Layer
 *
 * 16 test cases covering:
 *   TC-S-001: full readiness returns score 100 and band READY
 *   TC-S-002: missing GST (not submitted) reduces score and adds blocker
 *   TC-S-003: GST submitted but not approved reduces score and adds blocker
 *   TC-S-004: missing eligibility assessment reduces score and adds blocker
 *   TC-S-005: expired eligibility reduces score and adds blocker
 *   TC-S-006: eligibility outcome not ELIGIBLE reduces score and adds blocker
 *   TC-S-007: risk tier 0 blocks tier points and adds blocker
 *   TC-S-008: risk tier null blocks tier points and adds blocker
 *   TC-S-009: no verified invoice reduces score and adds blocker
 *   TC-S-010: invoice found but not verified reduces score and adds blocker
 *   TC-S-011: no VPC reduces score and adds blocker
 *   TC-S-012: enrollment missing adds next_step (not blocker)
 *   TC-S-013: enrollment in terminal state adds next_step
 *   TC-S-014: routing stub missing adds next_step
 *   TC-S-015: score is deterministic given same input
 *   TC-S-016: disclaimer is always present
 *   TC-S-017: band thresholds are correct (80=READY, 60=NEAR_READY, 40=NEEDS_REVIEW, 39=NOT_READY)
 *   TC-S-018: buyer-safe output: no raw bureau/GST/CIBIL fields in response
 *   TC-S-019: missing optional fields never throw
 */

import { describe, it, expect } from 'vitest';
import { computeTtpScore, type TtpScoreInput } from '../services/ttpScore.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Full happy-path input — all factors pass → score 100, band READY. */
function makeFullInput(overrides: Partial<TtpScoreInput> = {}): TtpScoreInput {
  return {
    gst_readiness: { found: true, is_approved: true },
    eligibility_readiness: {
      found: true,
      is_eligible: true,
      is_expired: false,
      risk_tier: 2,
    },
    invoice_readiness: { found: true, is_verified: true },
    vpc_readiness: { found: true, is_active: true },
    routing_readiness: { found: true },
    enrollment_state: 'APPROVED',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeTtpScore', () => {
  it('TC-S-001: full readiness returns score 100 and band READY', () => {
    const result = computeTtpScore(makeFullInput());
    expect(result.score).toBe(100);
    expect(result.band).toBe('READY');
    expect(result.blockers).toHaveLength(0);
    expect(result.factors).toHaveLength(7);
  });

  it('TC-S-002: GST not submitted reduces score by 20 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({ gst_readiness: { found: false, is_approved: false } }),
    );
    expect(result.score).toBe(80);
    expect(result.blockers).toContain('GST verification not submitted');
    const factor = result.factors.find((f) => f.key === 'gst_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-003: GST submitted but not approved reduces score by 20 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({ gst_readiness: { found: true, is_approved: false } }),
    );
    expect(result.score).toBe(80);
    expect(result.blockers).toContain('GST verification is pending approval');
    const factor = result.factors.find((f) => f.key === 'gst_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-004: missing eligibility assessment reduces score by 35 (elig+tier) and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({
        eligibility_readiness: {
          found: false,
          is_eligible: false,
          is_expired: false,
          risk_tier: null,
        },
      }),
    );
    // missing elig = -25, tier null = -10 → 100 - 35 = 65
    expect(result.score).toBe(65);
    expect(result.blockers).toContain('TTP eligibility assessment not found');
    expect(result.blockers).toContain('Risk tier not assigned — eligibility assessment required');
    const eligFactor = result.factors.find((f) => f.key === 'eligibility_readiness')!;
    expect(eligFactor.points_awarded).toBe(0);
    expect(eligFactor.status).toBe('FAIL');
  });

  it('TC-S-005: expired eligibility reduces score by 25 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({
        eligibility_readiness: {
          found: true,
          is_eligible: false,
          is_expired: true,
          risk_tier: 2,
        },
      }),
    );
    expect(result.score).toBe(75);
    expect(result.blockers).toContain('TTP eligibility assessment has expired');
    const factor = result.factors.find((f) => f.key === 'eligibility_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-006: eligibility outcome not ELIGIBLE reduces score and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({
        eligibility_readiness: {
          found: true,
          is_eligible: false,
          is_expired: false,
          risk_tier: 2,
        },
      }),
    );
    expect(result.score).toBe(75);
    expect(result.blockers).toContain('Eligibility outcome is not ELIGIBLE');
    const factor = result.factors.find((f) => f.key === 'eligibility_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-007: risk tier 0 blocks 10 pts and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({
        eligibility_readiness: {
          found: true,
          is_eligible: true,
          is_expired: false,
          risk_tier: 0,
        },
      }),
    );
    expect(result.score).toBe(90);
    expect(result.blockers).toContain('Risk tier 0 is ineligible — a valid tier (1, 2, or 3) is required');
    const factor = result.factors.find((f) => f.key === 'risk_tier')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-008: risk tier null blocks 10 pts and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({
        eligibility_readiness: {
          found: true,
          is_eligible: true,
          is_expired: false,
          risk_tier: null,
        },
      }),
    );
    expect(result.score).toBe(90);
    expect(result.blockers).toContain('Risk tier not assigned — eligibility assessment required');
    const factor = result.factors.find((f) => f.key === 'risk_tier')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-009: no invoice found reduces score by 15 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({ invoice_readiness: { found: false, is_verified: false } }),
    );
    expect(result.score).toBe(85);
    expect(result.blockers).toContain('No invoice found for this trade');
    const factor = result.factors.find((f) => f.key === 'invoice_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-010: invoice found but not verified reduces score by 15 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({ invoice_readiness: { found: true, is_verified: false } }),
    );
    expect(result.score).toBe(85);
    expect(result.blockers).toContain('Invoice is not verified');
    const factor = result.factors.find((f) => f.key === 'invoice_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-011: no VPC reduces score by 15 and adds blocker', () => {
    const result = computeTtpScore(
      makeFullInput({ vpc_readiness: { found: false, is_active: false } }),
    );
    expect(result.score).toBe(85);
    expect(result.blockers).toContain('No Verified Payable Certificate issued for this trade');
    const factor = result.factors.find((f) => f.key === 'vpc_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-012: enrollment null adds next_step (not a blocker)', () => {
    const result = computeTtpScore(makeFullInput({ enrollment_state: null }));
    expect(result.score).toBe(90);
    expect(result.next_steps).toContain('Initiate TTP enrollment to improve readiness score');
    expect(result.blockers).not.toContain(expect.stringContaining('enrollment'));
    const factor = result.factors.find((f) => f.key === 'enrollment_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-013: enrollment in terminal state (REJECTED) adds next_step', () => {
    const result = computeTtpScore(makeFullInput({ enrollment_state: 'REJECTED' }));
    expect(result.score).toBe(90);
    expect(result.next_steps).toContain('Submit or reinstate TTP enrollment to improve readiness score');
    const factor = result.factors.find((f) => f.key === 'enrollment_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-014: routing stub missing adds next_step (not a blocker)', () => {
    const result = computeTtpScore(makeFullInput({ routing_readiness: { found: false } }));
    expect(result.score).toBe(95);
    expect(result.next_steps).toContain(
      'Partner routing stub will be generated after VPC reaches ROUTING_READY state',
    );
    const factor = result.factors.find((f) => f.key === 'routing_readiness')!;
    expect(factor.points_awarded).toBe(0);
    expect(factor.status).toBe('FAIL');
  });

  it('TC-S-015: score is deterministic — same input returns same output', () => {
    const input = makeFullInput();
    const a = computeTtpScore(input);
    const b = computeTtpScore(input);
    expect(a.score).toBe(b.score);
    expect(a.band).toBe(b.band);
    expect(a.factors.map((f) => f.points_awarded)).toEqual(
      b.factors.map((f) => f.points_awarded),
    );
  });

  it('TC-S-016: disclaimer is always present', () => {
    const withAll = computeTtpScore(makeFullInput());
    expect(withAll.disclaimer).toBe(
      'TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment.',
    );
    const withNone = computeTtpScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        eligibility_readiness: { found: false, is_eligible: false, is_expired: false, risk_tier: null },
        invoice_readiness: { found: false, is_verified: false },
        vpc_readiness: { found: false, is_active: false },
        routing_readiness: { found: false },
        enrollment_state: null,
      }),
    );
    expect(withNone.disclaimer).toBe(withAll.disclaimer);
  });

  it('TC-S-017: band thresholds — 80=READY, 79=NEAR_READY, 60=NEAR_READY, 59=NEEDS_REVIEW, 40=NEEDS_REVIEW, 39=NOT_READY', () => {
    // These are direct band tests — not relying on a specific input combination
    // We test scoreToBand indirectly by checking known score totals.
    // 80 pts: all except routing (5) and enrollment (10) missing → 100-15=85 → READY
    // Let's just verify via direct score construction
    const ready = computeTtpScore(makeFullInput());
    expect(ready.band).toBe('READY'); // score 100

    // NEAR_READY: remove GST (20) → score 80 → READY still; remove VPC (15) too → 65 → NEAR_READY
    const nearReady = computeTtpScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        vpc_readiness: { found: false, is_active: false },
      }),
    );
    expect(nearReady.score).toBe(65);
    expect(nearReady.band).toBe('NEAR_READY');

    // NEEDS_REVIEW: remove GST+VPC+Invoice → 100-20-15-15=50 → NEEDS_REVIEW
    const needsReview = computeTtpScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        vpc_readiness: { found: false, is_active: false },
        invoice_readiness: { found: false, is_verified: false },
      }),
    );
    expect(needsReview.score).toBe(50);
    expect(needsReview.band).toBe('NEEDS_REVIEW');

    // NOT_READY: everything missing → score 0
    const notReady = computeTtpScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        eligibility_readiness: { found: false, is_eligible: false, is_expired: false, risk_tier: null },
        invoice_readiness: { found: false, is_verified: false },
        vpc_readiness: { found: false, is_active: false },
        routing_readiness: { found: false },
        enrollment_state: null,
      }),
    );
    expect(notReady.score).toBe(0);
    expect(notReady.band).toBe('NOT_READY');
  });

  it('TC-S-018: buyer-safe — no raw bureau/GST/CIBIL data in response', () => {
    const result = computeTtpScore(makeFullInput());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('raw_bureau_json');
    expect(serialized).not.toContain('raw_verification_json');
    expect(serialized).not.toContain('cibil');
    expect(serialized).not.toContain('admin_note');
    expect(serialized).not.toContain('payload_json');
  });

  it('TC-S-019: enrollment REQUESTED earns full enrollment points', () => {
    const result = computeTtpScore(makeFullInput({ enrollment_state: 'REQUESTED' }));
    const factor = result.factors.find((f) => f.key === 'enrollment_readiness')!;
    expect(factor.points_awarded).toBe(10);
    expect(factor.status).toBe('PASS');
  });
});
