/**
 * TTP Eligibility Service — Frontend API Client (TTP Slice 3)
 *
 * Control-plane endpoints (admin only):
 *   POST /api/control/ttp/eligibility/:orgId  — create eligibility assessment (SUPER_ADMIN)
 *   GET  /api/control/ttp/eligibility/:orgId  — get assessment history + latest
 *
 * D-017-A: org_id is NEVER sent in any request body.
 *           The server derives org scope exclusively from the route :orgId param,
 *           which is validated by the backend against JWT admin claims.
 *
 * WARNING: No live CIBIL or credit bureau pull is performed in this phase.
 *          This is a manual admin assessment gate only.
 *
 * Governance: TTP Slice 3, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { adminGet, adminPost } from './adminApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TtpEligibilityOutcome = 'ELIGIBLE' | 'INELIGIBLE' | 'MANUAL_REVIEW';

export interface TtpEligibilityAssessmentRecord {
  id: string;
  org_id: string;
  assessment_type: string;
  risk_tier: number;
  eligibility_outcome: TtpEligibilityOutcome;
  max_invoice_amount: number | null;
  currency: string;
  assessed_at: string;
  valid_until: string | null;
  assessed_by_admin_id: string | null;
  assessment_notes: string | null;
  raw_bureau_json: unknown;
  created_at: string;
  updated_at: string;
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface CreateTtpEligibilityAssessmentInput {
  risk_tier: number;
  eligibility_outcome: TtpEligibilityOutcome;
  max_invoice_amount?: number | null;
  currency?: string | null;
  assessment_notes?: string | null;
  valid_until?: string | null;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface TtpEligibilityAssessmentResponse {
  assessment: TtpEligibilityAssessmentRecord;
}

export interface TtpEligibilityAssessmentListResponse {
  assessments: TtpEligibilityAssessmentRecord[];
  latest: TtpEligibilityAssessmentRecord | null;
  count: number;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Create a new TTP eligibility assessment for an org.
 * Requires: GST approval on the org.
 * Restricted to SUPER_ADMIN role on the backend.
 *
 * On ELIGIBLE with tier >= 1: the backend updates organizations.risk_score.
 */
export async function adminCreateTtpEligibilityAssessment(
  orgId: string,
  data: CreateTtpEligibilityAssessmentInput,
): Promise<TtpEligibilityAssessmentResponse> {
  return adminPost<TtpEligibilityAssessmentResponse>(
    `/api/control/ttp/eligibility/${orgId}`,
    data,
  );
}

/**
 * Get eligibility assessment history (newest-first) and the latest assessment for an org.
 * Returns { assessments, latest, count }.
 */
export async function adminGetTtpEligibilityAssessments(
  orgId: string,
): Promise<TtpEligibilityAssessmentListResponse> {
  return adminGet<TtpEligibilityAssessmentListResponse>(
    `/api/control/ttp/eligibility/${orgId}`,
  );
}
