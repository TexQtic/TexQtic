/**
 * GstVerificationService — TTP Slice 2: GST Verification Gate
 *
 * Manual admin-review workflow. No live GST portal verification in this phase.
 *
 * Constraints:
 *  - org_id is unique in gst_verifications (one record per org)
 *  - APPROVED records cannot be re-submitted by tenant
 *  - raw_verification_json and provider_request_id are stored for server-side audit/write-path
 *    purposes; they are excluded from all normal admin and tenant API response contracts
 *  - GSTIN validation: exactly 15 chars, uppercase, India state code 01–38
 *
 * Governance: TTP Slice 2, D-017-A org isolation
 */

import type { PrismaClient } from '@prisma/client';
import { TTP_GST_FILING_STATUS, TTP_GST_REVIEW_OUTCOME } from '../ttp/ttp.constants.js';
import {
  type GstProviderAdapter,
  nameMatches,
  createGstProvider,
} from './gstProvider.service.js';
import {
  notifyGstSubmitted,
  notifyGstResubmitted,
  notifyProviderCheckCompleted,
  notifyAdminReviewedApproved,
  notifyAdminReviewedRejected,
  notifyAdminReviewedNeedsMoreInfo,
} from './crmLifecycleNotifyClient.js';
import { maybeSyncZohoBooksContactAfterActivation } from './zoho/zohoBooks.lifecycle.js';

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

/** Admin review record — includes reviewed_by_admin_id, reviewed_at, and safe provider evidence.
 *  raw_verification_json and provider_request_id are stored in DB but excluded from normal
 *  admin queue responses (audit-only fields; served by a separate endpoint if needed). */
export interface GstVerificationAdminRecord extends GstVerificationTenantRecord {
  reviewed_at: Date | null;
  reviewed_by_admin_id: string | null;
  provider_name: string | null;
  provider_verified_at: Date | null;
  provider_result: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class GstVerificationService {
  private readonly gstProvider: GstProviderAdapter | undefined;

  constructor(
    private readonly db: PrismaClient,
    /** Inject a provider for testing; if omitted, resolved from GST_PROVIDER env var. */
    gstProviderOverride?: GstProviderAdapter,
  ) {
    if (gstProviderOverride !== undefined) {
      this.gstProvider = gstProviderOverride;
    } else {
      const providerName = process.env.GST_PROVIDER;
      // Only create a provider when GST_PROVIDER is explicitly set.
      // Default (undefined) = no provider = admin fallback queue (backwards-compatible).
      this.gstProvider = providerName ? createGstProvider(providerName) : undefined;
    }
  }

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

    // Reset org.status to PENDING_VERIFICATION on resubmission after REJECTED or NEEDS_MORE_INFO.
    // Defence-in-depth: guard is on { in: [...] } so only those exact statuses are touched.
    const isResubmit =
      existing?.review_outcome === TTP_GST_REVIEW_OUTCOME.REJECTED ||
      existing?.review_outcome === TTP_GST_REVIEW_OUTCOME.NEEDS_MORE_INFO;

    if (isResubmit) {
      await (this.db as any).organizations.updateMany({
        where: {
          id: orgId,
          status: { in: ['VERIFICATION_REJECTED', 'VERIFICATION_NEEDS_MORE_INFO'] },
        },
        data: { status: 'PENDING_VERIFICATION' },
      });
    }

    // Emit GST submit / resubmit lifecycle event — awaited-safe, timeout-bounded.
    const gstCrmParams = {
      orgId,
      tenantId: orgId, // org_id === tenant_id in current schema
      registrationType: data.registration_type,
      stateCode: data.state_code,
      orgStatus: 'PENDING_VERIFICATION',
    };
    if (isResubmit) {
      await notifyGstResubmitted(gstCrmParams).catch(() => undefined);
    } else {
      await notifyGstSubmitted(gstCrmParams).catch(() => undefined);
    }

    // Provider check — if configured, runs inline and updates record with evidence.
    // Provider failures do NOT throw; they leave the record in the admin fallback queue.
    if (this.gstProvider) {
      const providerCheckResult = await this.runProviderCheck(
        orgId,
        normalizedGstin,
        data.legal_name_on_gst,
        data.state_code,
      );

      // Emit provider check event if provider ran — awaited-safe, timeout-bounded.
      if (providerCheckResult) {
        await notifyProviderCheckCompleted({
          orgId,
          tenantId: orgId,
          providerResult: providerCheckResult.provider_result,
          providerName: providerCheckResult.provider_name,
          autoApproved: providerCheckResult.auto_approved,
          orgStatus: providerCheckResult.org_status,
        }).catch(() => undefined);
      }

      // Return the definitively updated record
      const updatedRecord = await (this.db as any).gst_verifications.findUnique({
        where: { org_id: orgId },
      });
      return this.toTenantRecord(updatedRecord ?? record);
    }

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
   * Get full GST verification record for admin view.
   * Returns safe admin projection — raw_verification_json and provider_request_id
   * are stored in DB but excluded from the normal admin queue response.
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

    // Conditionally advance org.status based on review outcome.
    // Each branch only transitions from PENDING_VERIFICATION — no other org.status is touched.
    if (data.review_outcome === TTP_GST_REVIEW_OUTCOME.APPROVED) {
      await (this.db as any).organizations.updateMany({
        where: { id: orgId, status: 'PENDING_VERIFICATION' },
        data: { status: 'VERIFICATION_APPROVED' },
      });
      // Emit admin-approved lifecycle event — awaited-safe, timeout-bounded.
      await notifyAdminReviewedApproved({
        orgId,
        tenantId: orgId,
        reviewNotesCategory: null, // safe default; admin category UI is a future unit
      }).catch(() => undefined);
      // Feature-flagged Zoho Books contact sync — disabled by default.
      // Flag: ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED=true to enable.
      // Never throws; failure does not affect lifecycle transition.
      await maybeSyncZohoBooksContactAfterActivation(orgId).catch(() => undefined);
    } else if (data.review_outcome === TTP_GST_REVIEW_OUTCOME.REJECTED) {
      await (this.db as any).organizations.updateMany({
        where: { id: orgId, status: 'PENDING_VERIFICATION' },
        data: { status: 'VERIFICATION_REJECTED' },
      });
      // Emit admin-rejected lifecycle event — awaited-safe, timeout-bounded.
      await notifyAdminReviewedRejected({
        orgId,
        tenantId: orgId,
        rejectionReasonCategory: null, // safe default; admin category UI is a future unit
      }).catch(() => undefined);
    } else if (data.review_outcome === TTP_GST_REVIEW_OUTCOME.NEEDS_MORE_INFO) {
      await (this.db as any).organizations.updateMany({
        where: { id: orgId, status: 'PENDING_VERIFICATION' },
        data: { status: 'VERIFICATION_NEEDS_MORE_INFO' },
      });
      // Emit admin-needs-more-info lifecycle event — awaited-safe, timeout-bounded.
      await notifyAdminReviewedNeedsMoreInfo({
        orgId,
        tenantId: orgId,
        reviewNotesCategory: null, // safe default; admin category UI is a future unit
      }).catch(() => undefined);
    }

    return this.toAdminRecord(updated);
  }

  // ─── Provider check ───────────────────────────────────────────────────────

  /**
   * Run the GST provider verification and write evidence columns.
   *
   * Returns provider check result info for the CRM notify caller,
   * or null if no provider is configured.
   *
   * Auto-approval criteria (all must pass):
   *   C3 — provider reports gstin_status 'Active'
   *   C4 — GSTIN prefix (state code) matches submitted state_code
   *   C5 — legalName or businessName fuzzy-matches submitted legal_name_on_gst (≥80%)
   *   C6 — No other org already has the same GSTIN with review_outcome = APPROVED
   *
   * Race guard: auto-approval updateMany uses WHERE review_outcome IS NULL
   * so an admin review that already occurred between the upsert and here is preserved.
   */
  private async runProviderCheck(
    orgId: string,
    gstin: string,
    legalNameOnGst: string,
    stateCode: string,
  ): Promise<{
    provider_result: string;
    provider_name: string;
    auto_approved: boolean;
    org_status: string;
  } | null> {
    if (!this.gstProvider) return null;

    const providerResult = await this.gstProvider.verifyGstin({
      gstin,
      legalNameOnGst,
      stateCode,
      orgId,
    });

    const now = new Date();

    if (!providerResult.ok) {
      // Provider failed — record result, leave record in admin fallback queue
      await (this.db as any).gst_verifications.updateMany({
        where: { org_id: orgId },
        data: {
          provider_name: this.gstProvider.name,
          provider_result: providerResult.reason,
          updated_at: now,
        },
      });
      return {
        provider_result: providerResult.reason,
        provider_name: this.gstProvider.name,
        auto_approved: false,
        org_status: 'PENDING_VERIFICATION',
      };
    }

    const { data } = providerResult;

    // Determine provider_result based on auto-approval criteria
    let autoProviderResult: string;

    // C3: GSTIN status must be Active
    if (data.normalizedFilingStatus !== TTP_GST_FILING_STATUS.ACTIVE) {
      autoProviderResult = 'INACTIVE_GSTIN';
    }
    // C4: State code from GSTIN prefix must match submitted state_code
    else if (gstin.substring(0, 2) !== stateCode) {
      autoProviderResult = 'MISMATCH';
    }
    // C5: Legal or business name must fuzzy-match (≥80%)
    else if (
      !nameMatches(legalNameOnGst, data.legalName) &&
      !nameMatches(legalNameOnGst, data.businessName)
    ) {
      autoProviderResult = 'MISMATCH';
    } else {
      // C6: Duplicate GSTIN check — another org already approved with same GSTIN
      const duplicate = await (this.db as any).gst_verifications.findFirst({
        where: {
          gstin,
          review_outcome: TTP_GST_REVIEW_OUTCOME.APPROVED,
          org_id: { not: orgId },
        },
        select: { org_id: true },
      });
      autoProviderResult = duplicate ? 'DUPLICATE_GSTIN' : 'AUTO_APPROVED';
    }

    // Write evidence columns + provider_result + filing_status
    await (this.db as any).gst_verifications.updateMany({
      where: { org_id: orgId },
      data: {
        provider_name: this.gstProvider.name,
        provider_request_id: data.transactionId || null,
        provider_verified_at: new Date(data.providerTimestamp),
        filing_status: data.normalizedFilingStatus,
        provider_result: autoProviderResult,
        raw_verification_json: {
          provider: this.gstProvider.name,
          transaction_id: data.transactionId,
          timestamp: data.providerTimestamp,
          ...data.sanitizedPayload,
        },
        updated_at: now,
      },
    });

    // Auto-approve — race guard: only write if review_outcome is still null
    if (autoProviderResult === 'AUTO_APPROVED') {
      const approveResult = await (this.db as any).gst_verifications.updateMany({
        where: { org_id: orgId, review_outcome: null },
        data: {
          review_outcome: TTP_GST_REVIEW_OUTCOME.APPROVED,
          reviewed_at: now,
          updated_at: now,
        },
      });

      // Only advance org.status if the race guard succeeded (count > 0)
      if (approveResult.count > 0) {
        await (this.db as any).organizations.updateMany({
          where: { id: orgId, status: 'PENDING_VERIFICATION' },
          data: { status: 'VERIFICATION_APPROVED' },
        });
        // Emit provider auto-approved lifecycle event — awaited-safe, timeout-bounded.
        // review_notes_category 'AUTO_APPROVED' is from controlled taxonomy §8.1 of
        // DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01.
        // Aligns with org.gst.admin_reviewed.approved.v1 parity contract (design doc line 393).
        await notifyAdminReviewedApproved({
          orgId,
          tenantId: orgId,
          reviewNotesCategory: 'AUTO_APPROVED',
        }).catch(() => undefined);
        // Feature-flagged Zoho Books contact sync — disabled by default.
        // Flag: ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED=true to enable.
        // Never throws; failure does not affect lifecycle transition.
        await maybeSyncZohoBooksContactAfterActivation(orgId).catch(() => undefined);
      }

      return {
        provider_result: autoProviderResult,
        provider_name: this.gstProvider.name,
        auto_approved: true,
        org_status: approveResult.count > 0 ? 'VERIFICATION_APPROVED' : 'PENDING_VERIFICATION',
      };
    }

    return {
      provider_result: autoProviderResult,
      provider_name: this.gstProvider.name,
      auto_approved: false,
      org_status: 'PENDING_VERIFICATION',
    };
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
      provider_name: record.provider_name ?? null,
      provider_verified_at: record.provider_verified_at ?? null,
      provider_result: record.provider_result ?? null,
    };
  }
}
