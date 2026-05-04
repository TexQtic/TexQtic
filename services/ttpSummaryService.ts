/**
 * TTP Summary Service — Frontend API Client (TTP Slice 7)
 *
 * Tenant endpoints:
 *   GET /api/tenant/trades/:tradeId/ttp-summary — TTP readiness summary
 *
 * D-017-A: org_id is NEVER sent in any request body. Server derives it from JWT.
 *
 * Response safety:
 *   - Contains NO raw_bureau_json, raw_verification_json, or partner payload.
 *   - Contains NO admin notes or internal risk details.
 *   - Read-only: no state mutations.
 *
 * NOTE: apiRequest auto-unwraps { success: true, data: X } → returns X directly.
 *       Type T is the INNER type. Never access .data on the result.
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { tenantGet } from './tenantApiClient';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface GstReadiness {
  found: boolean;
  review_outcome: string | null;
  is_approved: boolean;
}

export interface EligibilityReadiness {
  found: boolean;
  outcome: string | null;
  risk_tier: number | null;
  is_eligible: boolean;
  is_expired: boolean;
  valid_until: string | null;
}

export interface InvoiceReadiness {
  found: boolean;
  invoice_id: string | null;
  state_key: string | null;
  is_verified: boolean;
}

export interface VpcReadiness {
  found: boolean;
  vpc_id: string | null;
  vpc_state: string | null;
  is_active: boolean;
}

export interface RoutingReadiness {
  found: boolean;
  routing_state: string | null;
}

// ─── Score types (Slice 8) ────────────────────────────────────────────────────

export interface TradeTrustScoreFactor {
  key: string;
  label: string;
  points_awarded: number;
  points_possible: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE';
  explanation: string;
}

export interface TradeTrustScore {
  score: number;
  band: 'READY' | 'NEAR_READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  factors: TradeTrustScoreFactor[];
  blockers: string[];
  next_steps: string[];
  /** MANDATORY advisory disclaimer. */
  disclaimer: string;
}

export interface TradeTtpSummary {
  trade_id: string;
  trade_reference: string;
  currency: string;
  trade_lifecycle_state: string;
  seller_org_id: string;
  buyer_org_id: string;
  actor_role: 'BUYER' | 'SELLER';
  enrollment_state: string | null;
  gst_readiness: GstReadiness;
  eligibility_readiness: EligibilityReadiness;
  invoice_readiness: InvoiceReadiness;
  vpc_readiness: VpcReadiness;
  routing_readiness: RoutingReadiness;
  blockers: string[];
  /** Advisory readiness score. ADVISORY ONLY — not a credit score or payment guarantee. */
  trade_trust_score: TradeTrustScore;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Fetch the TTP readiness summary for a trade.
 * Actor must be buyer or seller party — enforced by server.
 * Returns NO raw bureau/GST/partner data.
 */
export async function tenantGetTradeTtpSummary(tradeId: string): Promise<TradeTtpSummary> {
  return tenantGet<TradeTtpSummary>(`/api/tenant/trades/${tradeId}/ttp-summary`);
}
