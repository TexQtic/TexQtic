/**
 * TtpScoreService — TTP Slice 8: TradeTrust Score Advisory Layer
 *
 * Pure computation service. No DB access, no external API calls, no DB writes.
 * Computes an advisory readiness score from existing TTP summary readiness data.
 *
 * Score model (100 pts total):
 *   GST approved          20 pts  — gst_readiness
 *   Eligibility ELIGIBLE  25 pts  — eligibility_readiness (expired = 0)
 *   Risk tier >= 1        10 pts  — eligibility_readiness.risk_tier
 *   Verified invoice      15 pts  — invoice_readiness
 *   Active/routing VPC    15 pts  — vpc_readiness
 *   Enrollment present    10 pts  — enrollment_state (APPROVED/REQUESTED)
 *   Routing stub present   5 pts  — routing_readiness
 *
 * Score bands:
 *   80–100 → READY
 *   60–79  → NEAR_READY
 *   40–59  → NEEDS_REVIEW
 *    0–39  → NOT_READY
 *
 * Mandatory disclaimer (must be present in every response):
 *   "TradeTrust Score is an advisory readiness indicator only. It is not a
 *    credit score, payment guarantee, financing approval, or partner commitment."
 *
 * Boundaries (ABSOLUTE — never violate):
 *   - READ-ONLY / PURE: no mutations, no DB, no external calls.
 *   - No raw_bureau_json, raw_verification_json, CIBIL, or admin notes in output.
 *   - NEVER throw HTTP 500 for a missing scoring factor.
 *   - Score is ADVISORY only — never imply payment/lending/guarantee.
 *   - Buyer view: safe (no raw bureau/GST data — only high-level boolean flags used).
 *   - ttp_enabled flag is NOT toggled here.
 *
 * Governance: TTP Slice 8, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Subset of TradeTtpSummary readiness data consumed by the score engine.
 * All fields are high-level boolean flags — no raw bureau/GST data.
 */
export interface TtpScoreInput {
  gst_readiness: {
    found: boolean;
    is_approved: boolean;
  };
  eligibility_readiness: {
    found: boolean;
    is_eligible: boolean;
    is_expired: boolean;
    risk_tier: number | null;
  };
  invoice_readiness: {
    found: boolean;
    is_verified: boolean;
  };
  vpc_readiness: {
    found: boolean;
    is_active: boolean;
  };
  routing_readiness: {
    found: boolean;
  };
  enrollment_state: string | null;
  /** Inject current timestamp for deterministic tests. Defaults to Date.now(). */
  _now?: number;
}

export interface TradeTrustScoreFactor {
  /** Machine key for this factor. */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Points awarded to score. */
  points_awarded: number;
  /** Maximum points this factor can contribute. */
  points_possible: number;
  /** Evaluation outcome. */
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE';
  /** Short explanation of how this factor was evaluated. */
  explanation: string;
}

export interface TradeTrustScore {
  /** Aggregate advisory score 0–100. */
  score: number;
  /** Score band label. */
  band: 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  /** Individual factor breakdown. */
  factors: TradeTrustScoreFactor[];
  /** Items that block progression. Missing critical data adds a blocker. */
  blockers: string[];
  /** Actionable items that would improve readiness. */
  next_steps: string[];
  /**
   * MANDATORY advisory disclaimer.
   * Must be present in every response — never omit.
   */
  disclaimer: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_DISCLAIMER =
  'TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment.';

const ENROLLMENT_ACTIVE_STATES = new Set(['APPROVED', 'REQUESTED']);

// ─── Score band helper ────────────────────────────────────────────────────────

function scoreToBand(score: number): TradeTrustScore['band'] {
  if (score >= 80) return 'READY';
  if (score >= 60) return 'NEAR_READY';
  if (score >= 40) return 'NEEDS_REVIEW';
  return 'NOT_READY';
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute the TradeTrust advisory readiness score from TTP summary readiness data.
 *
 * Pure function — deterministic given the same input.
 * Never throws for missing or null readiness fields.
 */
export function computeTtpScore(input: TtpScoreInput): TradeTrustScore {
  const factors: TradeTrustScoreFactor[] = [];
  const blockers: string[] = [];
  const next_steps: string[] = [];
  let totalScore = 0;

  // ── Factor 1: GST Readiness (20 pts) ─────────────────────────────────────
  {
    const gst = input.gst_readiness;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
      key: 'gst_readiness',
      label: 'GST Verified',
      points_awarded: points,
      points_possible: 20,
      status,
      explanation,
    });
  }

  // ── Factor 2: Eligibility (25 pts) ───────────────────────────────────────
  {
    const elig = input.eligibility_readiness;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
      key: 'eligibility_readiness',
      label: 'TTP Eligibility',
      points_awarded: points,
      points_possible: 25,
      status,
      explanation,
    });
  }

  // ── Factor 3: Risk Tier (10 pts) ──────────────────────────────────────────
  {
    const tier = input.eligibility_readiness.risk_tier;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
    let explanation: string;

    if (tier === null || tier === undefined) {
      points = 0;
      status = 'FAIL';
      explanation = 'Risk tier not assessed.';
      blockers.push('Risk tier not assigned — eligibility assessment required');
    } else if (tier === 0) {
      points = 0;
      status = 'FAIL';
      explanation = 'Risk tier 0 is not eligible for TTP.';
      blockers.push('Risk tier 0 is ineligible — a valid tier (1, 2, or 3) is required');
    } else if (tier >= 1) {
      points = 10;
      status = 'PASS';
      explanation = `Risk tier ${tier} is eligible.`;
    } else {
      points = 0;
      status = 'FAIL';
      explanation = `Risk tier ${tier} is not eligible.`;
      blockers.push(`Risk tier ${tier} is not eligible for TTP`);
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

  // ── Factor 4: Verified Invoice (15 pts) ───────────────────────────────────
  {
    const inv = input.invoice_readiness;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
      key: 'invoice_readiness',
      label: 'Verified Invoice',
      points_awarded: points,
      points_possible: 15,
      status,
      explanation,
    });
  }

  // ── Factor 5: VPC Readiness (15 pts) ──────────────────────────────────────
  {
    const vpc = input.vpc_readiness;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
      key: 'vpc_readiness',
      label: 'Verified Payable Certificate',
      points_awarded: points,
      points_possible: 15,
      status,
      explanation,
    });
  }

  // ── Factor 6: Enrollment (10 pts) ─────────────────────────────────────────
  {
    const state = input.enrollment_state;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
      key: 'enrollment_readiness',
      label: 'TTP Enrollment',
      points_awarded: points,
      points_possible: 10,
      status,
      explanation,
    });
  }

  // ── Factor 7: Routing Stub (5 pts) ────────────────────────────────────────
  {
    const routing = input.routing_readiness;
    let points = 0;
    let status: TradeTrustScoreFactor['status'] = 'FAIL';
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
    factors,
    blockers,
    next_steps,
    disclaimer: SCORE_DISCLAIMER,
  };
}
