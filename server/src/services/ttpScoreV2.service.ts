/**
 * TexQticScoreV2Service — TTP-TEXQTICSCORE-V2-SERVICE-001
 *
 * Pure computation service for the TexQticScore v2 advisory readiness layer.
 * No DB access, no external API calls, no DB writes, no side effects.
 *
 * Score model (100 pts total — identical to v1 per OQ-V2-01, OQ-V2-02):
 *   GST Verification              20 pts — key: gst_verification
 *   TTP Eligibility               25 pts — key: eligibility_status
 *   Risk Tier                     10 pts — key: risk_tier
 *   Invoice Verification          15 pts — key: invoice_verification
 *   Verified Payable Certificate  15 pts — key: vpc_issuance
 *   TTP Enrollment                10 pts — key: enrollment_status
 *   Partner Routing                5 pts — key: routing_readiness
 *
 * Score bands (identical to v1 per OQ-V2-02):
 *   80–100 → READY
 *   60–79  → NEAR_READY
 *   40–59  → NEEDS_REVIEW
 *    0–39  → NOT_READY
 *
 * Key differences from v1 (computeTtpScore):
 *   - Factor keys renamed per OQ-V2-01 design decision.
 *   - `version: 'TEXQTICSCORE_V2'` discriminator field added to output.
 *   - `disclaimer` uses `TEXQTICSCORE_V2_DISCLAIMER` (not SCORE_DISCLAIMER).
 *   - Weights, bands, and pass conditions are identical to v1.
 *
 * v1 parity invariants (required by test suite):
 *   computeTexQticScore(input).score === computeTtpScore(input).score   ∀ input
 *   computeTexQticScore(input).band  === computeTtpScore(input).band    ∀ input
 *
 * Safety invariants (ABSOLUTE — must never be violated):
 *   - READ-ONLY / PURE: no mutations, no DB, no external calls.
 *   - No raw_bureau_json, raw_verification_json, CIBIL, or admin notes in output.
 *   - Never throw an unhandled error for a missing or null scoring factor.
 *   - Score is ADVISORY only — never implies payment, lending, or guarantee.
 *   - Admin/internal-only in Wave 2 (OQ-V2-04, OQ-V2-07, OQ-V2-08).
 *   - No snapshot writes in this slice (OQ-V2-09).
 *   - ttp_enabled=false unchanged.
 *   - LEGAL_REVIEW_PENDING unchanged.
 *
 * Governance: TTP-TEXQTICSCORE-V2-SERVICE-001; OQ-V2-01 through OQ-V2-09.
 */

import type { TtpScoreInput } from './ttpScore.service.js';
import { TEXQTICSCORE_V2_DISCLAIMER } from '../ttp/ttp.constants.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * TexQticScore v2 input — structurally identical to TtpScoreInput (per OQ-V2-01).
 * Safe type alias: input fields are unchanged; only output factor keys are renamed.
 */
export type TexQticScoreV2Input = TtpScoreInput;

/** Score band label — identical to v1 bands (per OQ-V2-02). */
export type TexQticScoreV2Band = 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';

/**
 * Discriminated union of supported TexQtic score versions.
 * Used as the `score_version` column value in `ttp_score_snapshots`.
 *
 * Governance: OQ-V2-06 — the existing String column with CHECK constraint is sufficient;
 * no schema migration required for this type definition.
 */
export type ScoreVersion = 'TTP_V1' | 'TEXQTICSCORE_V2';

/** A single scored factor in the v2 output. Factor keys are renamed vs v1. */
export interface TexQticScoreV2Factor {
  /** Machine-readable factor key (v2 naming — renamed from v1 per OQ-V2-01). */
  key: string;
  /** Human-readable advisory label. Must not imply credit, lending, or guarantee. */
  label: string;
  /** Points awarded to the aggregate score. */
  points_awarded: number;
  /** Maximum points this factor can contribute. */
  points_possible: number;
  /** Evaluation outcome for this factor. */
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE';
  /** Short advisory explanation of how this factor was evaluated. */
  explanation: string;
}

/**
 * TexQticScore v2 output.
 *
 * Extends the v1 shape with a `version` discriminator field.
 * Factor keys are renamed per OQ-V2-01. Weights and bands are identical to v1.
 * `disclaimer` is always `TEXQTICSCORE_V2_DISCLAIMER` (LEGAL_REVIEW_PENDING).
 */
export interface TexQticScoreV2 {
  /** Aggregate advisory score 0–100. */
  score: number;
  /** Readiness band label. */
  band: TexQticScoreV2Band;
  /** Score version discriminator. Always 'TEXQTICSCORE_V2' for this function. */
  version: 'TEXQTICSCORE_V2';
  /** Individual factor breakdown using v2 renamed keys. */
  factors: TexQticScoreV2Factor[];
  /** Items that currently block TTP readiness progression. */
  blockers: string[];
  /** Actionable items that would improve the readiness score. */
  next_steps: string[];
  /**
   * MANDATORY advisory disclaimer. Always `TEXQTICSCORE_V2_DISCLAIMER`.
   * LEGAL_REVIEW_PENDING — must not be exposed on tenant/public surfaces until legal clearance.
   */
  disclaimer: string;
}

// ─── Internal constants ───────────────────────────────────────────────────────

/** Enrollment states that award full enrollment_status points (per OQ-V2-01, v1 parity). */
const ENROLLMENT_ACTIVE_STATES = new Set(['APPROVED', 'REQUESTED']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToBand(score: number): TexQticScoreV2Band {
  if (score >= 80) return 'READY';
  if (score >= 60) return 'NEAR_READY';
  if (score >= 40) return 'NEEDS_REVIEW';
  return 'NOT_READY';
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute TexQticScore v2 from TTP summary readiness data.
 *
 * Pure function — deterministic given the same input. Never throws for missing
 * or null readiness fields. Produces the same score and band as computeTtpScore
 * for every input (v1 parity invariant).
 *
 * Factor keys are renamed vs v1 per OQ-V2-01 design decisions. A `version`
 * discriminator field is added to the output. Scoring logic, weights, and band
 * thresholds are identical to v1.
 *
 * Admin/internal-only in this slice — no tenant route authorized (OQ-V2-04).
 * No snapshot writes in this slice (OQ-V2-09).
 */
export function computeTexQticScore(input: TexQticScoreV2Input): TexQticScoreV2 {
  const factors: TexQticScoreV2Factor[] = [];
  const blockers: string[] = [];
  const next_steps: string[] = [];
  let totalScore = 0;

  // ── Factor 1: GST Verification (20 pts) ─────────────────────────────────
  {
    const gst = input.gst_readiness;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (gst.is_approved) {
      points = 20;
      status = 'PASS';
      explanation = 'GST verification is approved.';
    } else if (gst.found) {
      points = 0;
      status = 'FAIL';
      explanation = 'GST verification submitted but not yet approved.';
      blockers.push('GST verification is pending approval');
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'GST verification has not been submitted.';
      blockers.push('GST verification not submitted');
    }

    totalScore += points;
    factors.push({
      key: 'gst_verification',
      label: 'GST Verification',
      points_awarded: points,
      points_possible: 20,
      status,
      explanation,
    });
  }

  // ── Factor 2: TTP Eligibility (25 pts) ──────────────────────────────────
  {
    const elig = input.eligibility_readiness;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (!elig.found) {
      points = 0;
      status = 'FAIL';
      explanation = 'TTP eligibility assessment not found.';
      blockers.push('TTP eligibility assessment not found');
    } else if (elig.is_expired) {
      points = 0;
      status = 'FAIL';
      explanation = 'TTP eligibility assessment has expired.';
      blockers.push('TTP eligibility assessment has expired');
    } else if (elig.is_eligible) {
      points = 25;
      status = 'PASS';
      explanation = 'Eligibility outcome is ELIGIBLE and assessment is current.';
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'Eligibility outcome is not ELIGIBLE.';
      blockers.push('Eligibility outcome is not ELIGIBLE');
    }

    totalScore += points;
    factors.push({
      key: 'eligibility_status',
      label: 'TTP Eligibility',
      points_awarded: points,
      points_possible: 25,
      status,
      explanation,
    });
  }

  // ── Factor 3: Risk Tier (10 pts) ─────────────────────────────────────────
  {
    const tier = input.eligibility_readiness.risk_tier;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (tier === null || tier === undefined) {
      points = 0;
      status = 'FAIL';
      explanation = 'Risk tier not assessed.';
      blockers.push('Risk tier not assigned — eligibility assessment required');
    } else if (tier <= 0) {
      points = 0;
      status = 'FAIL';
      explanation = `Risk tier ${tier} is not eligible for TTP.`;
      blockers.push(`Risk tier ${tier} is not eligible for TTP — a valid tier (1, 2, or 3) is required`);
    } else {
      points = 10;
      status = 'PASS';
      explanation = `Risk tier ${tier} is eligible.`;
    }

    totalScore += points;
    factors.push({
      key: 'risk_tier',
      label: 'Risk Tier',
      points_awarded: points,
      points_possible: 10,
      status,
      explanation,
    });
  }

  // ── Factor 4: Invoice Verification (15 pts) ──────────────────────────────
  {
    const inv = input.invoice_readiness;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (inv.is_verified) {
      points = 15;
      status = 'PASS';
      explanation = 'Invoice is verified.';
    } else if (inv.found) {
      points = 0;
      status = 'FAIL';
      explanation = 'Invoice exists but is not yet verified.';
      blockers.push('Invoice is not verified');
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'No invoice found for this trade.';
      blockers.push('No invoice found for this trade');
    }

    totalScore += points;
    factors.push({
      key: 'invoice_verification',
      label: 'Invoice Verification',
      points_awarded: points,
      points_possible: 15,
      status,
      explanation,
    });
  }

  // ── Factor 5: VPC Issuance (15 pts) ──────────────────────────────────────
  {
    const vpc = input.vpc_readiness;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (vpc.is_active) {
      points = 15;
      status = 'PASS';
      explanation = 'Verified Payable Certificate is active or routing-ready.';
    } else if (vpc.found) {
      points = 0;
      status = 'FAIL';
      explanation = 'VPC exists but is not in an active or routing-ready state.';
      blockers.push('VPC is not active or routing-ready');
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'No Verified Payable Certificate found for this trade.';
      blockers.push('No Verified Payable Certificate issued for this trade');
    }

    totalScore += points;
    factors.push({
      key: 'vpc_issuance',
      label: 'Verified Payable Certificate',
      points_awarded: points,
      points_possible: 15,
      status,
      explanation,
    });
  }

  // ── Factor 6: Enrollment Status (10 pts) ─────────────────────────────────
  {
    const state = input.enrollment_state;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (state !== null && state !== undefined && ENROLLMENT_ACTIVE_STATES.has(state)) {
      points = 10;
      status = 'PASS';
      explanation = `TTP enrollment is ${state}.`;
    } else if (state !== null && state !== undefined) {
      points = 0;
      status = 'FAIL';
      explanation = `TTP enrollment state is ${state} — must be APPROVED or REQUESTED.`;
      next_steps.push('Submit or reinstate TTP enrollment to improve readiness score');
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'TTP enrollment has not been initiated.';
      next_steps.push('Initiate TTP enrollment to improve readiness score');
    }

    totalScore += points;
    factors.push({
      key: 'enrollment_status',
      label: 'TTP Enrollment',
      points_awarded: points,
      points_possible: 10,
      status,
      explanation,
    });
  }

  // ── Factor 7: Routing Readiness (5 pts) ──────────────────────────────────
  {
    const routing = input.routing_readiness;
    let points = 0;
    let status: TexQticScoreV2Factor['status'] = 'FAIL';
    let explanation: string;

    if (routing.found) {
      points = 5;
      status = 'PASS';
      explanation = 'Partner routing stub is available.';
    } else {
      points = 0;
      status = 'FAIL';
      explanation = 'No partner routing stub found.';
      next_steps.push('Partner routing stub will be generated after VPC reaches ROUTING_READY state');
    }

    totalScore += points;
    factors.push({
      key: 'routing_readiness',
      label: 'Partner Routing',
      points_awarded: points,
      points_possible: 5,
      status,
      explanation,
    });
  }

  // ── Final score ───────────────────────────────────────────────────────────
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: clampedScore,
    band: scoreToBand(clampedScore),
    version: 'TEXQTICSCORE_V2',
    factors,
    blockers,
    next_steps,
    disclaimer: TEXQTICSCORE_V2_DISCLAIMER,
  };
}
