/**
 * GST Verification Service — Frontend API Client (TTP Slice 2)
 *
 * Tenant endpoints:
 *   POST /api/tenant/gst-verification  — submit / re-submit GST details
 *   GET  /api/tenant/gst-verification  — get own verification status
 *
 * Control-plane endpoints (admin only):
 *   GET   /api/control/gst-verification              — list pending verifications
 *   GET   /api/control/gst-verification/:orgId       — get full record for org
 *   PATCH /api/control/gst-verification/:orgId       — record review outcome
 *
 * D-017-A: tenantId / org_id is NEVER sent in any request body.
 *           The server derives org scope exclusively from JWT claims.
 */

import { tenantGet, tenantPost } from './tenantApiClient';
import { adminGet, adminPatch } from './adminApiClient';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface GstVerificationRecord {
  id: string;
  org_id: string;
  gstin: string;
  legal_name_on_gst: string;
  state_code: string;
  registration_type: string;
  filing_status: string;
  submitted_at: string;
  review_outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO' | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GstVerificationAdminRecord extends GstVerificationRecord {
  reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  /** Safe provider evidence fields (admin-only display context).
   *  raw_verification_json and provider_request_id are excluded from the normal
   *  admin queue contract (audit-only; served by a separate endpoint if needed). */
  provider_name: string | null;
  provider_result: string | null;
  provider_verified_at: string | null;
}

// ─── Tenant endpoints ─────────────────────────────────────────────────────────

export interface GstSubmitInput {
  gstin: string;
  legal_name_on_gst: string;
  state_code: string;
  registration_type: string;
}

export interface GstVerificationResponse {
  gst_verification: GstVerificationRecord | null;
}

/**
 * Submit or re-submit GST verification details for admin review.
 * D-017-A: No tenantId in body — TENANT realm guard handles it.
 * Throws GstAlreadyApproved-style error (403 FORBIDDEN) if current record is APPROVED.
 */
export async function submitGstVerification(
  data: GstSubmitInput,
): Promise<GstVerificationResponse> {
  return tenantPost<GstVerificationResponse>('/api/tenant/gst-verification', data);
}

/**
 * Get own GST verification status.
 * Returns { gst_verification: null } if no submission has been made.
 * raw_verification_json is not included in this response.
 */
export async function getGstVerification(): Promise<GstVerificationResponse> {
  return tenantGet<GstVerificationResponse>('/api/tenant/gst-verification');
}

// ─── Control-plane endpoints (admin only) ────────────────────────────────────

export interface GstVerificationListResponse {
  gst_verifications: GstVerificationAdminRecord[];
  count: number;
}

export interface GstVerificationAdminResponse {
  gst_verification: GstVerificationAdminRecord;
}

export interface AdminReviewInput {
  review_outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO';
  review_notes?: string | null;
}

/**
 * List all pending GST verifications (review_outcome IS NULL).
 */
export async function adminListPendingGstVerifications(): Promise<GstVerificationListResponse> {
  return adminGet<GstVerificationListResponse>('/api/control/gst-verification');
}

/**
 * Get full GST verification record for a specific org (admin view).
 */
export async function adminGetGstVerification(
  orgId: string,
): Promise<GstVerificationAdminResponse> {
  return adminGet<GstVerificationAdminResponse>(`/api/control/gst-verification/${orgId}`);
}

/**
 * Record admin review outcome for an org's GST verification.
 * Restricted to SUPER_ADMIN role on the backend.
 * On APPROVED: may advance organizations.status from PENDING_VERIFICATION.
 */
export async function adminReviewGstVerification(
  orgId: string,
  data: AdminReviewInput,
): Promise<GstVerificationAdminResponse> {
  return adminPatch<GstVerificationAdminResponse>(
    `/api/control/gst-verification/${orgId}`,
    data,
  );
}
