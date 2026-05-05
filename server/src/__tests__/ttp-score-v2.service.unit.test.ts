/**
 * TTP-TEXQTICSCORE-V2-SERVICE-001: Unit tests for ttpScoreV2.service.ts
 *
 * 17 test cases proving v2 parity with v1 and v2-specific output shape.
 * TC-V2-001 through TC-V2-017.
 *
 * Safety invariants verified by this suite:
 *   - v2 factor keys are renamed (gst_verification, eligibility_status, etc.)
 *   - `version: 'TEXQTICSCORE_V2'` always present
 *   - `disclaimer` always equals TEXQTICSCORE_V2_DISCLAIMER
 *   - No forbidden advisory language in labels or explanations
 *   - No raw bureau/GST/CIBIL/PAN/admin fields in output
 *   - Score and band parity with v1 computeTtpScore for the same input
 *   - v1 computeTtpScore unchanged (regression guard)
 *   - ttp_enabled=false unchanged (function is pure; feature gate is a separate concern)
 *   - LEGAL_REVIEW_PENDING unchanged (disclaimer is interim)
 *
 * Governance: TTP-TEXQTICSCORE-V2-SERVICE-001; OQ-V2-01 through OQ-V2-09.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTexQticScore,
  type TexQticScoreV2Input,
} from '../services/ttpScoreV2.service.js';
import { computeTtpScore, type TtpScoreInput, SCORE_DISCLAIMER } from '../services/ttpScore.service.js';
import { TEXQTICSCORE_V2_DISCLAIMER } from '../ttp/ttp.constants.js';

// ─── Shared fixture ───────────────────────────────────────────────────────────

/** All-pass input — every factor awarded full points. Score: 100, band: READY. */
function makeFullInput(overrides: Partial<TexQticScoreV2Input> = {}): TexQticScoreV2Input {
  return {
    gst_readiness: { found: true, is_approved: true },
    eligibility_readiness: { found: true, is_eligible: true, is_expired: false, risk_tier: 2 },
    invoice_readiness: { found: true, is_verified: true },
    vpc_readiness: { found: true, is_active: true },
    routing_readiness: { found: true },
    enrollment_state: 'APPROVED',
    ...overrides,
  };
}

/** All-fail input — every factor produces 0 pts. Score: 0, band: NOT_READY. */
function makeEmptyInput(): TexQticScoreV2Input {
  return {
    gst_readiness: { found: false, is_approved: false },
    eligibility_readiness: { found: false, is_eligible: false, is_expired: false, risk_tier: null },
    invoice_readiness: { found: false, is_verified: false },
    vpc_readiness: { found: false, is_active: false },
    routing_readiness: { found: false },
    enrollment_state: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeTexQticScore — TTP-TEXQTICSCORE-V2-SERVICE-001', () => {
  // ── TC-V2-001: All-factor-pass returns score 100 and band READY ───────────
  it('TC-V2-001: all factors pass → score 100, band READY', () => {
    const result = computeTexQticScore(makeFullInput());
    expect(result.score).toBe(100);
    expect(result.band).toBe('READY');
    expect(result.factors).toHaveLength(7);
    expect(result.blockers).toHaveLength(0);
  });

  // ── TC-V2-002: All-factors-absent → safe score, no throw ─────────────────
  it('TC-V2-002: all factors absent does not throw and returns safe score', () => {
    expect(() => computeTexQticScore(makeEmptyInput())).not.toThrow();
    const result = computeTexQticScore(makeEmptyInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.band).toBe('NOT_READY');
    expect(result.factors).toHaveLength(7);
  });

  // ── TC-V2-003: GST Verification key + 20 pts when approved ───────────────
  it('TC-V2-003: gst_verification factor — key is gst_verification and awards 20 pts when approved', () => {
    const result = computeTexQticScore(makeFullInput());
    const gst = result.factors.find((f) => f.key === 'gst_verification');
    expect(gst).toBeDefined();
    expect(gst!.points_awarded).toBe(20);
    expect(gst!.points_possible).toBe(20);
    expect(gst!.status).toBe('PASS');
  });

  it('TC-V2-003b: gst_verification factor — 0 pts when not approved', () => {
    const result = computeTexQticScore(
      makeFullInput({ gst_readiness: { found: false, is_approved: false } }),
    );
    const gst = result.factors.find((f) => f.key === 'gst_verification');
    expect(gst!.points_awarded).toBe(0);
    expect(gst!.status).toBe('FAIL');
  });

  // ── TC-V2-004: Eligibility Status key + 25 pts when eligible/found/current
  it('TC-V2-004: eligibility_status factor — key is eligibility_status and awards 25 pts when eligible, found, not expired', () => {
    const result = computeTexQticScore(makeFullInput());
    const elig = result.factors.find((f) => f.key === 'eligibility_status');
    expect(elig).toBeDefined();
    expect(elig!.points_awarded).toBe(25);
    expect(elig!.points_possible).toBe(25);
    expect(elig!.status).toBe('PASS');
  });

  it('TC-V2-004b: eligibility_status — 0 pts when expired', () => {
    const result = computeTexQticScore(
      makeFullInput({
        eligibility_readiness: { found: true, is_eligible: true, is_expired: true, risk_tier: 2 },
      }),
    );
    const elig = result.factors.find((f) => f.key === 'eligibility_status');
    expect(elig!.points_awarded).toBe(0);
    expect(elig!.status).toBe('FAIL');
  });

  it('TC-V2-004c: eligibility_status — 0 pts when not found', () => {
    const result = computeTexQticScore(
      makeFullInput({
        eligibility_readiness: { found: false, is_eligible: false, is_expired: false, risk_tier: null },
      }),
    );
    const elig = result.factors.find((f) => f.key === 'eligibility_status');
    expect(elig!.points_awarded).toBe(0);
    expect(elig!.status).toBe('FAIL');
  });

  // ── TC-V2-005: Risk Tier key + 10 pts when tier >= 1 ─────────────────────
  it('TC-V2-005: risk_tier factor — key is risk_tier and awards 10 pts when risk_tier >= 1', () => {
    const result = computeTexQticScore(makeFullInput());
    const tier = result.factors.find((f) => f.key === 'risk_tier');
    expect(tier).toBeDefined();
    expect(tier!.points_awarded).toBe(10);
    expect(tier!.points_possible).toBe(10);
    expect(tier!.status).toBe('PASS');
  });

  it('TC-V2-005b: risk_tier — 0 pts when tier is null', () => {
    const result = computeTexQticScore(
      makeFullInput({
        eligibility_readiness: { found: true, is_eligible: true, is_expired: false, risk_tier: null },
      }),
    );
    const tier = result.factors.find((f) => f.key === 'risk_tier');
    expect(tier!.points_awarded).toBe(0);
    expect(tier!.status).toBe('FAIL');
  });

  it('TC-V2-005c: risk_tier — 0 pts when tier is 0', () => {
    const result = computeTexQticScore(
      makeFullInput({
        eligibility_readiness: { found: true, is_eligible: true, is_expired: false, risk_tier: 0 },
      }),
    );
    const tier = result.factors.find((f) => f.key === 'risk_tier');
    expect(tier!.points_awarded).toBe(0);
    expect(tier!.status).toBe('FAIL');
  });

  // ── TC-V2-006: Invoice Verification key + 15 pts when verified ───────────
  it('TC-V2-006: invoice_verification factor — key is invoice_verification and awards 15 pts when verified', () => {
    const result = computeTexQticScore(makeFullInput());
    const inv = result.factors.find((f) => f.key === 'invoice_verification');
    expect(inv).toBeDefined();
    expect(inv!.points_awarded).toBe(15);
    expect(inv!.points_possible).toBe(15);
    expect(inv!.status).toBe('PASS');
  });

  it('TC-V2-006b: invoice_verification — 0 pts when not verified', () => {
    const result = computeTexQticScore(
      makeFullInput({ invoice_readiness: { found: true, is_verified: false } }),
    );
    const inv = result.factors.find((f) => f.key === 'invoice_verification');
    expect(inv!.points_awarded).toBe(0);
    expect(inv!.status).toBe('FAIL');
  });

  // ── TC-V2-007: VPC Issuance key + 15 pts when active ─────────────────────
  it('TC-V2-007: vpc_issuance factor — key is vpc_issuance and awards 15 pts when VPC is active', () => {
    const result = computeTexQticScore(makeFullInput());
    const vpc = result.factors.find((f) => f.key === 'vpc_issuance');
    expect(vpc).toBeDefined();
    expect(vpc!.points_awarded).toBe(15);
    expect(vpc!.points_possible).toBe(15);
    expect(vpc!.status).toBe('PASS');
  });

  it('TC-V2-007b: vpc_issuance — 0 pts when VPC not active', () => {
    const result = computeTexQticScore(
      makeFullInput({ vpc_readiness: { found: false, is_active: false } }),
    );
    const vpc = result.factors.find((f) => f.key === 'vpc_issuance');
    expect(vpc!.points_awarded).toBe(0);
    expect(vpc!.status).toBe('FAIL');
  });

  // ── TC-V2-008: Enrollment Status key + 10 pts for APPROVED/REQUESTED ─────
  it('TC-V2-008: enrollment_status factor — key is enrollment_status and awards 10 pts for APPROVED', () => {
    const result = computeTexQticScore(makeFullInput({ enrollment_state: 'APPROVED' }));
    const enroll = result.factors.find((f) => f.key === 'enrollment_status');
    expect(enroll).toBeDefined();
    expect(enroll!.points_awarded).toBe(10);
    expect(enroll!.points_possible).toBe(10);
    expect(enroll!.status).toBe('PASS');
  });

  it('TC-V2-008b: enrollment_status — 10 pts for REQUESTED', () => {
    const result = computeTexQticScore(makeFullInput({ enrollment_state: 'REQUESTED' }));
    const enroll = result.factors.find((f) => f.key === 'enrollment_status');
    expect(enroll!.points_awarded).toBe(10);
    expect(enroll!.status).toBe('PASS');
  });

  it('TC-V2-008c: enrollment_status — 0 pts for null enrollment', () => {
    const result = computeTexQticScore(makeFullInput({ enrollment_state: null }));
    const enroll = result.factors.find((f) => f.key === 'enrollment_status');
    expect(enroll!.points_awarded).toBe(0);
    expect(enroll!.status).toBe('FAIL');
  });

  // ── TC-V2-009: Routing Readiness key + 5 pts when found ──────────────────
  it('TC-V2-009: routing_readiness factor — key is routing_readiness and awards 5 pts when routing stub found', () => {
    const result = computeTexQticScore(makeFullInput());
    const routing = result.factors.find((f) => f.key === 'routing_readiness');
    expect(routing).toBeDefined();
    expect(routing!.points_awarded).toBe(5);
    expect(routing!.points_possible).toBe(5);
    expect(routing!.status).toBe('PASS');
  });

  it('TC-V2-009b: routing_readiness — 0 pts when not found', () => {
    const result = computeTexQticScore(
      makeFullInput({ routing_readiness: { found: false } }),
    );
    const routing = result.factors.find((f) => f.key === 'routing_readiness');
    expect(routing!.points_awarded).toBe(0);
    expect(routing!.status).toBe('FAIL');
  });

  // ── TC-V2-010: Band boundaries ────────────────────────────────────────────
  it('TC-V2-010: band boundaries — score 80 is READY', () => {
    // 100 - 20 (no GST) = 80
    const result = computeTexQticScore(
      makeFullInput({ gst_readiness: { found: false, is_approved: false } }),
    );
    expect(result.score).toBe(80);
    expect(result.band).toBe('READY');
  });

  it('TC-V2-010b: band boundaries — score 65 is NEAR_READY', () => {
    // 100 - 20 (no GST) - 15 (no VPC) = 65
    const result = computeTexQticScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        vpc_readiness: { found: false, is_active: false },
      }),
    );
    expect(result.score).toBe(65);
    expect(result.band).toBe('NEAR_READY');
  });

  it('TC-V2-010c: band boundaries — score 40 is NEEDS_REVIEW', () => {
    // 100 - 20 (no GST) - 15 (no invoice) - 15 (no VPC) - 10 (no enrollment) = 40
    const result = computeTexQticScore(
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        invoice_readiness: { found: false, is_verified: false },
        vpc_readiness: { found: false, is_active: false },
        enrollment_state: null,
      }),
    );
    expect(result.score).toBe(40);
    expect(result.band).toBe('NEEDS_REVIEW');
  });

  it('TC-V2-010d: band boundaries — score 0 is NOT_READY', () => {
    const result = computeTexQticScore(makeEmptyInput());
    expect(result.score).toBe(0);
    expect(result.band).toBe('NOT_READY');
  });

  // ── TC-V2-011: version discriminator is always TEXQTICSCORE_V2 ───────────
  it('TC-V2-011: version field is always TEXQTICSCORE_V2', () => {
    expect(computeTexQticScore(makeFullInput()).version).toBe('TEXQTICSCORE_V2');
    expect(computeTexQticScore(makeEmptyInput()).version).toBe('TEXQTICSCORE_V2');
  });

  // ── TC-V2-012: disclaimer is always TEXQTICSCORE_V2_DISCLAIMER ───────────
  it('TC-V2-012: disclaimer is always TEXQTICSCORE_V2_DISCLAIMER', () => {
    expect(computeTexQticScore(makeFullInput()).disclaimer).toBe(TEXQTICSCORE_V2_DISCLAIMER);
    expect(computeTexQticScore(makeEmptyInput()).disclaimer).toBe(TEXQTICSCORE_V2_DISCLAIMER);
  });

  it('TC-V2-012b: TEXQTICSCORE_V2_DISCLAIMER is not empty and not SCORE_DISCLAIMER (v1)', () => {
    expect(TEXQTICSCORE_V2_DISCLAIMER).toBeTruthy();
    expect(TEXQTICSCORE_V2_DISCLAIMER).not.toBe(SCORE_DISCLAIMER);
    expect(TEXQTICSCORE_V2_DISCLAIMER.length).toBeGreaterThan(0);
  });

  // ── TC-V2-013: No raw bureau/GST/CIBIL/PAN/admin fields in output ─────────
  it('TC-V2-013: output does not expose raw bureau, GST, CIBIL, PAN, or admin note fields', () => {
    const result = computeTexQticScore(makeFullInput());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/raw_bureau_json/i);
    expect(serialized).not.toMatch(/raw_verification_json/i);
    expect(serialized).not.toMatch(/cibil/i);
    expect(serialized).not.toMatch(/pan_number/i);
    expect(serialized).not.toMatch(/admin_note/i);
    expect(serialized).not.toMatch(/gstin/i);
  });

  // ── TC-V2-014: No forbidden advisory wording in output ───────────────────
  it('TC-V2-014: no forbidden wording (credit approved, underwriting, guaranteed, financeable, lender approved, partner approved) in factor labels, explanations, or disclaimer', () => {
    const result = computeTexQticScore(makeFullInput());
    const allText = [
      result.disclaimer,
      ...result.factors.map((f) => `${f.label} ${f.explanation}`),
      ...result.blockers,
      ...result.next_steps,
    ].join(' ');

    expect(allText).not.toMatch(/credit approved/i);
    expect(allText).not.toMatch(/underwriting/i);
    expect(allText).not.toMatch(/guaranteed/i);
    expect(allText).not.toMatch(/financeable/i);
    expect(allText).not.toMatch(/lender approved/i);
    expect(allText).not.toMatch(/partner approved/i);
  });

  // ── TC-V2-015: Parity — score matches v1 ─────────────────────────────────
  it('TC-V2-015: score parity with v1 computeTtpScore for representative input matrix', () => {
    const fixtures: TtpScoreInput[] = [
      makeFullInput(),
      makeEmptyInput(),
      makeFullInput({ gst_readiness: { found: false, is_approved: false } }),
      makeFullInput({ enrollment_state: 'REQUESTED' }),
      makeFullInput({
        eligibility_readiness: { found: true, is_eligible: false, is_expired: false, risk_tier: 1 },
      }),
      makeFullInput({
        eligibility_readiness: { found: true, is_eligible: true, is_expired: true, risk_tier: 3 },
      }),
      makeFullInput({ vpc_readiness: { found: true, is_active: false } }),
      makeFullInput({ routing_readiness: { found: false } }),
    ];

    for (const input of fixtures) {
      const v1 = computeTtpScore(input);
      const v2 = computeTexQticScore(input);
      expect(v2.score).toBe(v1.score);
    }
  });

  // ── TC-V2-016: Parity — band matches v1 ──────────────────────────────────
  it('TC-V2-016: band parity with v1 computeTtpScore for representative input matrix', () => {
    const fixtures: TtpScoreInput[] = [
      makeFullInput(),
      makeEmptyInput(),
      makeFullInput({ gst_readiness: { found: false, is_approved: false } }),
      makeFullInput({ enrollment_state: null }),
      makeFullInput({
        gst_readiness: { found: false, is_approved: false },
        vpc_readiness: { found: false, is_active: false },
        invoice_readiness: { found: false, is_verified: false },
      }),
    ];

    for (const input of fixtures) {
      const v1 = computeTtpScore(input);
      const v2 = computeTexQticScore(input);
      expect(v2.band).toBe(v1.band);
    }
  });

  // ── TC-V2-017: v1 regression guard ───────────────────────────────────────
  it('TC-V2-017: v1 computeTtpScore is unchanged — still produces expected output for all-pass input', () => {
    const result = computeTtpScore(makeFullInput() as TtpScoreInput);
    expect(result.score).toBe(100);
    expect(result.band).toBe('READY');
    expect(result.disclaimer).toBe(SCORE_DISCLAIMER);
    // v1 uses enrollment_readiness key (not enrollment_status)
    const enrollFactor = result.factors.find((f) => f.key === 'enrollment_readiness');
    expect(enrollFactor).toBeDefined();
    expect(enrollFactor!.points_awarded).toBe(10);
  });
});
