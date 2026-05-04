/**
 * TTP Enrollment Service — Frontend API Client (TTP Slice 7)
 *
 * Tenant endpoints:
 *   GET  /api/tenant/trades/:tradeId/ttp-enrollment — get enrollment state
 *   POST /api/tenant/trades/:tradeId/ttp-enrollment — request enrollment (idempotent)
 *
 * Control-plane admin endpoints:
 *   GET    /api/control/ttp/enrollments             — list enrollments
 *   GET    /api/control/ttp/enrollments/:tradeId    — get enrollment detail
 *   PATCH  /api/control/ttp/enrollments/:tradeId    — review enrollment
 *
 * D-017-A: org_id is NEVER sent in any request body. Server derives it from JWT.
 *
 * Boundary disclaimer:
 *   TradeTrust Pay is a verified trade readiness layer.
 *   It is NOT a payment guarantee, financing commitment, or escrow instruction.
 *
 * NOTE: apiRequest auto-unwraps { success: true, data: X } → returns X directly.
 *       Type T is the INNER type. Never access .data on the result.
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { tenantGet, tenantPost } from './tenantApiClient';
import { adminGet, adminPatch } from './adminApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TtpEnrollmentRecord {
  org_id: string;
  trade_id: string;
  seller_org_id: string;
  buyer_org_id: string;
  enrollment_state: string | null;
  latest_log_id: string | null;
  last_updated_at: string | null;
  last_reason: string | null;
}

export interface AdminEnrollmentRecord extends TtpEnrollmentRecord {
  trade_reference: string;
  currency: string;
  trade_lifecycle_state: string;
}

export type TtpEnrollmentReviewOutcome = 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'CANCELLED';

// ─── Tenant API functions ─────────────────────────────────────────────────────

/** Get enrollment state for a trade. Actor must be buyer or seller party. */
export async function tenantGetTtpEnrollment(tradeId: string): Promise<TtpEnrollmentRecord> {
  return tenantGet<TtpEnrollmentRecord>(`/api/tenant/trades/${tradeId}/ttp-enrollment`);
}

/**
 * Request TTP enrollment for the seller org of a trade (idempotent).
 * Does NOT imply payment, guarantee, or financing.
 * If already REQUESTED or APPROVED, returns current state without creating duplicate.
 */
export async function tenantRequestTtpEnrollment(
  tradeId: string,
  input?: { reason?: string },
): Promise<TtpEnrollmentRecord> {
  return tenantPost<TtpEnrollmentRecord>(
    `/api/tenant/trades/${tradeId}/ttp-enrollment`,
    input ?? {},
  );
}

// ─── Admin API functions ──────────────────────────────────────────────────────

/** List all TTP enrollments with optional filters (admin). */
export async function adminListTtpEnrollments(filters?: {
  status?: string;
  orgId?: string;
  tradeId?: string;
  limit?: number;
}): Promise<AdminEnrollmentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.orgId) params.set('orgId', filters.orgId);
  if (filters?.tradeId) params.set('tradeId', filters.tradeId);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return adminGet<AdminEnrollmentRecord[]>(
    `/api/control/ttp/enrollments${query ? `?${query}` : ''}`,
  );
}

/** Get enrollment detail for a specific trade (admin). */
export async function adminGetTtpEnrollment(tradeId: string): Promise<AdminEnrollmentRecord> {
  return adminGet<AdminEnrollmentRecord>(`/api/control/ttp/enrollments/${tradeId}`);
}

/**
 * Review a TTP enrollment request (admin).
 * Approval enforces gates: seller GST APPROVED + eligibility present and not expired.
 * This does NOT generate VPCs, routing stubs, or escrow mutations.
 */
export async function adminReviewTtpEnrollment(
  tradeId: string,
  input: { outcome: TtpEnrollmentReviewOutcome; notes?: string },
): Promise<AdminEnrollmentRecord> {
  return adminPatch<AdminEnrollmentRecord>(
    `/api/control/ttp/enrollments/${tradeId}`,
    input,
  );
}
