/**
 * GstVerificationService — TTP Slice 2: GST Verification Gate
 *
 * Manual admin-review workflow. No live GST portal verification in this phase.
 *
 * Constraints:
 *  - org_id is unique in gst_verifications (one record per org)
 *  - APPROVED records cannot be re-submitted by tenant
 *  - raw_verification_json is never returned to tenants
 *  - GSTIN validation: exactly 15 chars, uppercase, India state code 01–38
 *
 * Governance: TTP Slice 2, D-017-A org isolation
 */

import type { PrismaClient } from '@prisma/client';
import { TTP_GST_FILING_STATUS, TTP_GST_REVIEW_OUTCOME } from '../ttp/ttp.constants.js';

// GSTIN pattern: 2-digit state code + 5 uppercase letters + 4 digits +
//                1 uppercase letter + 1 [1-9A-Z] + literal Z + 1 [0-9A-Z]
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Valid India GST state/UT codes: 01–38 (padded to two digits)
const VALID_STATE_CODES = new Set<string>(
  Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, '0')),
);

// ─── Error classes ────────────────────────────────────────────────────────────

export class GstAlreadyApprovedError extends Error {
  constructor() {
    super('GST verification is already approved and cannot be modified');
    this.name = 'GstAlreadyApprovedError';
  }
}

export class GstNotFoundError extends Error {
  constructor() {
    super('GST verification record not found for this organization');
    this.name = 'GstNotFoundError';
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GstSubmitInput {
  gstin: string;
  legal_name_on_gst: string;
  state_code: string;
  registration_type: string;
}

export interface AdminReviewInput {
  review_outcome: string;
  review_notes?: string | null;
}

export interface GstValidationResult {
  valid: boolean;
  error?: string;
}

/** Tenant-safe projection — omits raw_verification_json, reviewed_by_admin_id, reviewed_at */
export interface GstVerificationTenantRecord {
  id: string;
  org_id: string;
  gstin: string;
  legal_name_on_gst: string;
  state_code: string;
  registration_type: string;
  filing_status: string;
  submitted_at: Date;
  review_outcome: string | null;
  review_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Admin full record — includes all fields */
export interface GstVerificationAdminRecord extends GstVerificationTenantRecord {
  reviewed_at: Date | null;
  reviewed_by_admin_id: string | null;
  raw_verification_json: unknown;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GstVerificationService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Validate GSTIN format (pure, no DB access).
   * Normalizes to uppercase before checking.
   */
  validateGstin(gstin: string): GstValidationResult {
    if (!gstin || typeof gstin !== 'string') {
      return { valid: false, error: 'GSTIN is required' };
    }

    const normalized = gstin.trim().toUpperCase();

    if (normalized.length !== 15) {
      return { valid: false, error: 'GSTIN must be exactly 15 characters' };
    }

    if (!GSTIN_REGEX.test(normalized)) {
      return {
        valid: false,
        error:
          'GSTIN format is invalid. Expected: 2-digit state code + 5 uppercase letters + 4 digits + 1 uppercase letter + 1 alphanumeric [1-9A-Z] + Z + 1 alphanumeric [0-9A-Z]',
      };
    }

    const stateCode = normalized.substring(0, 2);
    if (!VALID_STATE_CODES.has(stateCode)) {
      return { valid: false, error: `Invalid state code '${stateCode}'. Must be 01–38` };
    }

    return { valid: true };
  }

  /**
   * Submit or re-submit GST verification for a tenant.
   * - Upserts on org_id (one record per org).
   * - Throws GstAlreadyApprovedError if existing record is APPROVED.
   * - Resets review fields on re-submission (pending re-review).
   * - D-017-A: orgId comes from auth context, never from input.
   */
  async submitVerification(
    orgId: string,
    data: GstSubmitInput,
  ): Promise<GstVerificationTenantRecord> {
    const normalizedGstin = data.gstin.trim().toUpperCase();

    // Block resubmission if current record is APPROVED
    const existing = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
      select: { review_outcome: true },
    });

    if (existing?.review_outcome === TTP_GST_REVIEW_OUTCOME.APPROVED) {
      throw new GstAlreadyApprovedError();
    }

    const record = await (this.db as any).gst_verifications.upsert({
      where: { org_id: orgId },
      create: {
        org_id: orgId,
        gstin: normalizedGstin,
        legal_name_on_gst: data.legal_name_on_gst,
        state_code: data.state_code,
        registration_type: data.registration_type,
        filing_status: TTP_GST_FILING_STATUS.UNKNOWN,
        review_outcome: null,
        review_notes: null,
        reviewed_at: null,
        reviewed_by_admin_id: null,
        raw_verification_json: {},
      },
      update: {
        gstin: normalizedGstin,
        legal_name_on_gst: data.legal_name_on_gst,
        state_code: data.state_code,
        registration_type: data.registration_type,
        filing_status: TTP_GST_FILING_STATUS.UNKNOWN,
        review_outcome: null,
        review_notes: null,
        reviewed_at: null,
        reviewed_by_admin_id: null,
        updated_at: new Date(),
      },
    });

    return this.toTenantRecord(record);
  }

  /**
   * Get tenant's own GST verification record.
   * Returns tenant-safe projection (no raw_verification_json).
   */
  async getVerificationByOrgId(orgId: string): Promise<GstVerificationTenantRecord | null> {
    const record = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
    });
    return record ? this.toTenantRecord(record) : null;
  }

  /**
   * Get full GST verification record for admin view (all fields including raw_verification_json).
   */
  async getVerificationByOrgIdAdmin(orgId: string): Promise<GstVerificationAdminRecord | null> {
    const record = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
    });
    return record ? this.toAdminRecord(record) : null;
  }

  /**
   * List all GST verifications with review_outcome IS NULL (pending admin review).
   * Returns full admin records ordered by submission time (oldest first).
   */
  async listPendingVerifications(): Promise<GstVerificationAdminRecord[]> {
    const records = await (this.db as any).gst_verifications.findMany({
      where: { review_outcome: null },
      orderBy: { submitted_at: 'asc' },
    });
    return records.map((r: any) => this.toAdminRecord(r));
  }

  /**
   * Record admin review outcome for a GST verification.
   * - Throws GstNotFoundError if no record exists for orgId.
   * - On APPROVED: conditionally advances organizations.status from
   *   PENDING_VERIFICATION → VERIFICATION_APPROVED (defence-in-depth guard,
   *   only updates if current status is exactly PENDING_VERIFICATION).
   */
  async adminReviewVerification(
    orgId: string,
    adminId: string,
    data: AdminReviewInput,
  ): Promise<GstVerificationAdminRecord> {
    const existing = await (this.db as any).gst_verifications.findUnique({
      where: { org_id: orgId },
      select: { id: true },
    });

    if (!existing) {
      throw new GstNotFoundError();
    }

    const now = new Date();
    const updated = await (this.db as any).gst_verifications.update({
      where: { org_id: orgId },
      data: {
        review_outcome: data.review_outcome,
        review_notes: data.review_notes ?? null,
        reviewed_at: now,
        reviewed_by_admin_id: adminId,
        updated_at: now,
      },
    });

    // On APPROVED: conditionally advance org onboarding status.
    // Only transitions from PENDING_VERIFICATION — no other state is touched.
    if (data.review_outcome === TTP_GST_REVIEW_OUTCOME.APPROVED) {
      await (this.db as any).organizations.updateMany({
        where: {
          id: orgId,
          status: 'PENDING_VERIFICATION',
        },
        data: { status: 'VERIFICATION_APPROVED' },
      });
    }

    return this.toAdminRecord(updated);
  }

  // ─── Private projectors ───────────────────────────────────────────────────

  private toTenantRecord(record: any): GstVerificationTenantRecord {
    return {
      id: record.id,
      org_id: record.org_id,
      gstin: record.gstin,
      legal_name_on_gst: record.legal_name_on_gst,
      state_code: record.state_code,
      registration_type: record.registration_type,
      filing_status: record.filing_status,
      submitted_at: record.submitted_at,
      review_outcome: record.review_outcome,
      review_notes: record.review_notes,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  private toAdminRecord(record: any): GstVerificationAdminRecord {
    return {
      ...this.toTenantRecord(record),
      reviewed_at: record.reviewed_at,
      reviewed_by_admin_id: record.reviewed_by_admin_id,
      raw_verification_json: record.raw_verification_json,
    };
  }
}
