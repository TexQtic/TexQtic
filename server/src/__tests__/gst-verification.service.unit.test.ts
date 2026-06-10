/**
 * Unit tests — GstVerificationService (TTP Slice 2)
 *
 * Pure unit tests with mocked Prisma. No DB access.
 * All service methods are tested against: happy path, edge cases, error throws.
 *
 * Run: pnpm exec vitest run src/__tests__/gst-verification.service.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GstVerificationService,
  GstAlreadyApprovedError,
  GstNotFoundError,
} from '../services/gstVerification.service.js';
import {
  type GstProviderAdapter,
  NoopGstProviderAdapter,
} from '../services/gstProvider.service.js';

// Mock CRM lifecycle client — noop for all tests unless explicitly configured.
vi.mock('../services/crmLifecycleNotifyClient.js', () => ({
  notifyGstSubmitted: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
  notifyGstResubmitted: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
  notifyProviderCheckCompleted: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
  notifyAdminReviewedApproved: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
  notifyAdminReviewedRejected: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
  notifyAdminReviewedNeedsMoreInfo: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
}));

import {
  notifyGstSubmitted,
  notifyGstResubmitted,
  notifyProviderCheckCompleted,
  notifyAdminReviewedApproved,
  notifyAdminReviewedRejected,
  notifyAdminReviewedNeedsMoreInfo,
} from '../services/crmLifecycleNotifyClient.js';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    gst_verifications: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    organizations: {
      updateMany: vi.fn(),
    },
    ...overrides,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const NOW = new Date('2025-01-01T00:00:00.000Z');

const VALID_GSTIN = '29ABCDE1234F1Z5';

function makeTenantDbRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bbbbbbbb-0000-0000-0000-000000000002',
    org_id: ORG_ID,
    gstin: VALID_GSTIN,
    legal_name_on_gst: 'Test Company Pvt Ltd',
    state_code: '29',
    registration_type: 'Regular',
    filing_status: 'UNKNOWN',
    submitted_at: NOW,
    reviewed_at: null,
    reviewed_by_admin_id: null,
    review_outcome: null,
    review_notes: null,
    raw_verification_json: {},
    provider_name: null,
    provider_request_id: null,
    provider_verified_at: null,
    provider_result: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

// ─── Provider test helpers ────────────────────────────────────────────────────

function makeSuccessProviderData() {
  return {
    gstin: VALID_GSTIN,
    legalName: 'Test Company Pvt Ltd',
    businessName: 'Test Company Pvt Ltd',
    rawStatus: 'Active',
    normalizedFilingStatus: 'ACTIVE',
    taxpayerType: 'Regular',
    constitutionOfBusiness: 'Private Limited Company',
    dateOfRegistration: '2020-01-01',
    stateJurisdiction: 'State - Karnataka,Division - DGSTO Bengaluru',
    annualTurnover: 'Slab: Less than Rs. 1 Cr.',
    promoters: ['Test Promoter'],
    filingSummary: [],
    transactionId: 'tx-provider-001',
    providerTimestamp: NOW.getTime(),
    sanitizedPayload: { gstin: VALID_GSTIN, legal_name: 'Test Company Pvt Ltd', gstin_status: 'Active' },
  };
}

function makeAutoApprovedDbRecord() {
  return makeTenantDbRecord({
    filing_status: 'ACTIVE',
    review_outcome: 'APPROVED',
    reviewed_at: NOW,
    provider_name: 'deepvue',
    provider_request_id: 'tx-provider-001',
    provider_verified_at: NOW,
    provider_result: 'AUTO_APPROVED',
  });
}

function makeProviderErrorDbRecord() {
  return makeTenantDbRecord({
    provider_name: 'noop',
    provider_result: 'PROVIDER_ERROR',
  });
}

// ─── validateGstin ────────────────────────────────────────────────────────────

describe('GstVerificationService.validateGstin', () => {
  const db = makeDb();
  const svc = new GstVerificationService(db);

  it('accepts a valid GSTIN', () => {
    const result = svc.validateGstin('29ABCDE1234F1Z5');
    expect(result.valid).toBe(true);
  });

  it('accepts and normalises lowercase GSTIN', () => {
    // Should be normalised to uppercase before validation
    const result = svc.validateGstin('29abcde1234f1z5');
    expect(result.valid).toBe(true);
  });

  it('rejects GSTIN with wrong length (14 chars)', () => {
    const result = svc.validateGstin('29ABCDE1234F1Z');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/15 characters/i);
  });

  it('rejects GSTIN with wrong length (16 chars)', () => {
    const result = svc.validateGstin('29ABCDE1234F1Z5X');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/15 characters/i);
  });

  it('rejects GSTIN that does not match the pattern', () => {
    // Missing Z at position 12
    const result = svc.validateGstin('29ABCDE1234F1A5');
    expect(result.valid).toBe(false);
  });

  it('rejects GSTIN with invalid state code 00', () => {
    const result = svc.validateGstin('00ABCDE1234F1Z5');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/state code/i);
  });

  it('rejects GSTIN with invalid state code 39', () => {
    const result = svc.validateGstin('39ABCDE1234F1Z5');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/state code/i);
  });

  it('accepts GSTIN with boundary state code 01', () => {
    const result = svc.validateGstin('01ABCDE1234F1Z5');
    expect(result.valid).toBe(true);
  });

  it('accepts GSTIN with boundary state code 38', () => {
    const result = svc.validateGstin('38ABCDE1234F1Z5');
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = svc.validateGstin('');
    expect(result.valid).toBe(false);
  });
});

// ─── submitVerification ───────────────────────────────────────────────────────

describe('GstVerificationService.submitVerification', () => {
  it('creates a new record when none exists', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(null);
    const expectedRecord = makeTenantDbRecord();
    db.gst_verifications.upsert.mockResolvedValueOnce(expectedRecord);

    const result = await svc.submitVerification(ORG_ID, {
      gstin: VALID_GSTIN,
      legal_name_on_gst: 'Test Company Pvt Ltd',
      state_code: '29',
      registration_type: 'Regular',
    });

    expect(result.org_id).toBe(ORG_ID);
    expect(result.gstin).toBe(VALID_GSTIN);
    // raw_verification_json must not be present in tenant record
    expect((result as any).raw_verification_json).toBeUndefined();
    expect(db.gst_verifications.upsert).toHaveBeenCalledOnce();
  });

  it('allows re-submission when existing record is REJECTED', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'REJECTED' });
    const expectedRecord = makeTenantDbRecord({ review_outcome: null });
    db.gst_verifications.upsert.mockResolvedValueOnce(expectedRecord);

    await expect(
      svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      }),
    ).resolves.not.toThrow();

    expect(db.gst_verifications.upsert).toHaveBeenCalledOnce();
  });

  it('allows re-submission when existing record is NEEDS_MORE_INFO', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'NEEDS_MORE_INFO' });
    const expectedRecord = makeTenantDbRecord({ review_outcome: null });
    db.gst_verifications.upsert.mockResolvedValueOnce(expectedRecord);

    await expect(
      svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      }),
    ).resolves.not.toThrow();
  });

  it('resets org.status to PENDING_VERIFICATION on resubmission after REJECTED', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'REJECTED' });
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord({ review_outcome: null }));

    await svc.submitVerification(ORG_ID, {
      gstin: VALID_GSTIN,
      legal_name_on_gst: 'Test Company Pvt Ltd',
      state_code: '29',
      registration_type: 'Regular',
    });

    expect(db.organizations.updateMany).toHaveBeenCalledWith({
      where: {
        id: ORG_ID,
        status: { in: ['VERIFICATION_REJECTED', 'VERIFICATION_NEEDS_MORE_INFO'] },
      },
      data: { status: 'PENDING_VERIFICATION' },
    });
  });

  it('resets org.status to PENDING_VERIFICATION on resubmission after NEEDS_MORE_INFO', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'NEEDS_MORE_INFO' });
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord({ review_outcome: null }));

    await svc.submitVerification(ORG_ID, {
      gstin: VALID_GSTIN,
      legal_name_on_gst: 'Test Company Pvt Ltd',
      state_code: '29',
      registration_type: 'Regular',
    });

    expect(db.organizations.updateMany).toHaveBeenCalledWith({
      where: {
        id: ORG_ID,
        status: { in: ['VERIFICATION_REJECTED', 'VERIFICATION_NEEDS_MORE_INFO'] },
      },
      data: { status: 'PENDING_VERIFICATION' },
    });
  });

  it('throws GstAlreadyApprovedError when existing record is APPROVED', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'APPROVED' });

    await expect(
      svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      }),
    ).rejects.toBeInstanceOf(GstAlreadyApprovedError);

    expect(db.gst_verifications.upsert).not.toHaveBeenCalled();
  });

  it('normalises GSTIN to uppercase on submission', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(null);
    const expectedRecord = makeTenantDbRecord();
    db.gst_verifications.upsert.mockResolvedValueOnce(expectedRecord);

    await svc.submitVerification(ORG_ID, {
      gstin: '29abcde1234f1z5',
      legal_name_on_gst: 'Test Company Pvt Ltd',
      state_code: '29',
      registration_type: 'Regular',
    });

    const upsertCall = db.gst_verifications.upsert.mock.calls[0][0];
    expect(upsertCall.create.gstin).toBe('29ABCDE1234F1Z5');
    expect(upsertCall.update.gstin).toBe('29ABCDE1234F1Z5');
  });
});

// ─── getVerificationByOrgId ───────────────────────────────────────────────────

describe('GstVerificationService.getVerificationByOrgId', () => {
  it('returns tenant projection when record exists', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord());

    const result = await svc.getVerificationByOrgId(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.org_id).toBe(ORG_ID);
    // raw_verification_json must not be in tenant projection
    expect((result as any).raw_verification_json).toBeUndefined();
    // Admin-only fields must not be in tenant projection
    expect((result as any).reviewed_by_admin_id).toBeUndefined();
    expect((result as any).reviewed_at).toBeUndefined();
  });

  it('tenant projection excludes provider evidence fields', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({
        provider_name: 'deepvue',
        provider_request_id: 'tx-sandbox-001',
        provider_verified_at: NOW,
        provider_result: 'AUTO_APPROVED',
      }),
    );

    const result = await svc.getVerificationByOrgId(ORG_ID);

    expect(result).not.toBeNull();
    // Provider evidence must not bleed into tenant projection
    expect((result as any).provider_name).toBeUndefined();
    expect((result as any).provider_result).toBeUndefined();
    expect((result as any).provider_verified_at).toBeUndefined();
    expect((result as any).provider_request_id).toBeUndefined();
    expect((result as any).raw_verification_json).toBeUndefined();
  });

  it('returns null when no record exists', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(null);

    const result = await svc.getVerificationByOrgId(ORG_ID);
    expect(result).toBeNull();
  });
});

// ─── getVerificationByOrgIdAdmin ─────────────────────────────────────────────

describe('GstVerificationService.getVerificationByOrgIdAdmin', () => {
  it('admin record does not include raw_verification_json or provider_request_id', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({ raw_verification_json: { gstin_status: 'ACTIVE' } }),
    );

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    // raw_verification_json excluded from normal admin contract (audit-only)
    expect((result as any).raw_verification_json).toBeUndefined();
    // provider_request_id excluded from normal admin contract (audit-only)
    expect((result as any).provider_request_id).toBeUndefined();
    expect(result!.reviewed_by_admin_id).toBeNull();
    expect(result!.reviewed_at).toBeNull();
  });

  it('includes safe provider evidence fields in admin record', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({
        provider_name: 'deepvue',
        provider_request_id: 'tx-sandbox-001',
        provider_verified_at: NOW,
        provider_result: 'AUTO_APPROVED',
        raw_verification_json: { gstin: '29ABCDE1234F1Z5', legal_name: 'Test Co', gstin_status: 'Active' },
      }),
    );

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.provider_name).toBe('deepvue');
    expect(result!.provider_result).toBe('AUTO_APPROVED');
    expect(result!.provider_verified_at).toEqual(NOW);
    // provider_request_id excluded from normal admin contract (audit-only field)
    expect((result as any).provider_request_id).toBeUndefined();
    // raw_verification_json excluded from normal admin contract (audit-only field)
    expect((result as any).raw_verification_json).toBeUndefined();
  });

  it('admin record does not expose raw_verification_json regardless of stored content (sanitizer enforced at write)', async () => {
    // raw_verification_json is excluded from the normal admin projection.
    // Sanitizer (sanitizeDeepvuePayload) strips PAN/Aadhaar/contact before storage;
    // the admin projection additionally excludes the field entirely from the response contract.
    const sanitizedPayload = {
      gstin: '29ABCDE1234F1Z5',
      legal_name: 'Test Co',
      gstin_status: 'Active',
      // pan_number and aadhaar_validation absent (stripped by sanitizeDeepvuePayload at write)
    };
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({ raw_verification_json: sanitizedPayload }),
    );

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    // raw_verification_json not included in normal admin record
    expect((result as any).raw_verification_json).toBeUndefined();
  });

  it('provider_name and provider_result are null when no provider ran', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord());

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.provider_name).toBeNull();
    expect(result!.provider_result).toBeNull();
    expect(result!.provider_verified_at).toBeNull();
  });

  it('returns null when no record exists', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(null);

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);
    expect(result).toBeNull();
  });
});

// ─── listPendingVerifications ─────────────────────────────────────────────────

describe('GstVerificationService.listPendingVerifications', () => {
  it('returns records with review_outcome IS NULL', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    const records = [
      makeTenantDbRecord({ org_id: 'aaaaaaaa-0000-0000-0000-000000000001' }),
      makeTenantDbRecord({ org_id: 'aaaaaaaa-0000-0000-0000-000000000002' }),
    ];
    db.gst_verifications.findMany.mockResolvedValueOnce(records);

    const result = await svc.listPendingVerifications();

    expect(result).toHaveLength(2);
    expect(db.gst_verifications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { review_outcome: null } }),
    );
  });

  it('returns empty array when no pending records', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findMany.mockResolvedValueOnce([]);

    const result = await svc.listPendingVerifications();
    expect(result).toHaveLength(0);
  });
});

// ─── adminReviewVerification ──────────────────────────────────────────────────

describe('GstVerificationService.adminReviewVerification', () => {
  it('updates review outcome and notes', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ id: 'existing-id' });
    const updatedRecord = makeTenantDbRecord({
      review_outcome: 'REJECTED',
      review_notes: 'Invalid state code',
      reviewed_at: NOW,
      reviewed_by_admin_id: ADMIN_ID,
    });
    db.gst_verifications.update.mockResolvedValueOnce(updatedRecord);

    const result = await svc.adminReviewVerification(ORG_ID, ADMIN_ID, {
      review_outcome: 'REJECTED',
      review_notes: 'Invalid state code',
    });

    expect(result.review_outcome).toBe('REJECTED');
    expect(result.reviewed_by_admin_id).toBe(ADMIN_ID);
    expect(db.gst_verifications.update).toHaveBeenCalledOnce();
    expect(db.organizations.updateMany).toHaveBeenCalledWith({
      where: { id: ORG_ID, status: 'PENDING_VERIFICATION' },
      data: { status: 'VERIFICATION_REJECTED' },
    });
  });

  it('calls organizations.updateMany when outcome is APPROVED', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ id: 'existing-id' });
    const updatedRecord = makeTenantDbRecord({
      review_outcome: 'APPROVED',
      reviewed_at: NOW,
      reviewed_by_admin_id: ADMIN_ID,
    });
    db.gst_verifications.update.mockResolvedValueOnce(updatedRecord);
    db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.adminReviewVerification(ORG_ID, ADMIN_ID, {
      review_outcome: 'APPROVED',
    });

    expect(db.organizations.updateMany).toHaveBeenCalledWith({
      where: { id: ORG_ID, status: 'PENDING_VERIFICATION' },
      data: { status: 'VERIFICATION_APPROVED' },
    });
  });

  it('calls organizations.updateMany when outcome is NEEDS_MORE_INFO', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ id: 'existing-id' });
    const updatedRecord = makeTenantDbRecord({
      review_outcome: 'NEEDS_MORE_INFO',
      reviewed_at: NOW,
      reviewed_by_admin_id: ADMIN_ID,
    });
    db.gst_verifications.update.mockResolvedValueOnce(updatedRecord);

    await svc.adminReviewVerification(ORG_ID, ADMIN_ID, {
      review_outcome: 'NEEDS_MORE_INFO',
    });

    expect(db.organizations.updateMany).toHaveBeenCalledWith({
      where: { id: ORG_ID, status: 'PENDING_VERIFICATION' },
      data: { status: 'VERIFICATION_NEEDS_MORE_INFO' },
    });
  });

  it('throws GstNotFoundError when no record exists', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(null);

    await expect(
      svc.adminReviewVerification(ORG_ID, ADMIN_ID, { review_outcome: 'APPROVED' }),
    ).rejects.toBeInstanceOf(GstNotFoundError);

    expect(db.gst_verifications.update).not.toHaveBeenCalled();
  });
});

// ─── submitVerification — with provider ───────────────────────────────────────

const BASE_SUBMIT_INPUT = {
  gstin: VALID_GSTIN,
  legal_name_on_gst: 'Test Company Pvt Ltd',
  state_code: '29',
  registration_type: 'Regular',
};

describe('GstVerificationService.submitVerification — provider check: auto-approve path', () => {
  it('auto-approves when all criteria pass: provider_result=AUTO_APPROVED, filing_status=ACTIVE, review_outcome=APPROVED, org.status->VERIFICATION_APPROVED', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: makeSuccessProviderData() }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)                // APPROVED check
      .mockResolvedValueOnce(makeAutoApprovedDbRecord()); // final findUnique after provider check
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.findFirst.mockResolvedValueOnce(null); // no duplicate
    db.gst_verifications.updateMany
      .mockResolvedValueOnce({ count: 1 })  // evidence update
      .mockResolvedValueOnce({ count: 1 }); // auto-approve update (race guard)
    db.organizations.updateMany.mockResolvedValue({ count: 1 });

    const result = await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    // Evidence update includes correct fields
    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('AUTO_APPROVED');
    expect(evidenceCall.data.provider_name).toBe('deepvue');
    expect(evidenceCall.data.filing_status).toBe('ACTIVE');
    expect(evidenceCall.data.provider_request_id).toBe('tx-provider-001');

    // Auto-approve update uses race guard (review_outcome: null)
    const approveCall = db.gst_verifications.updateMany.mock.calls[1][0];
    expect(approveCall.where.review_outcome).toBeNull();
    expect(approveCall.data.review_outcome).toBe('APPROVED');

    // Org status advanced
    expect(db.organizations.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VERIFICATION_APPROVED' } }),
    );

    // Returned record reflects updated state
    expect(result.review_outcome).toBe('APPROVED');
    expect(result.filing_status).toBe('ACTIVE');
  });
});

describe('GstVerificationService.submitVerification — provider check: noop fallback', () => {
  it('records PROVIDER_ERROR and leaves review_outcome null when noop provider used', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db, new NoopGstProviderAdapter());

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)                   // APPROVED check
      .mockResolvedValueOnce(makeProviderErrorDbRecord()); // final findUnique
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 }); // evidence update only

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    // Only one updateMany (evidence); no second updateMany (no auto-approve)
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('PROVIDER_ERROR');
    expect(evidenceCall.data.provider_name).toBe('noop');

    // Org status NOT advanced to VERIFICATION_APPROVED
    expect(db.organizations.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VERIFICATION_APPROVED' } }),
    );
  });
});

describe('GstVerificationService.submitVerification — provider check: timeout fallback', () => {
  it('records TIMEOUT and leaves review_outcome null', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: false, reason: 'TIMEOUT' }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'TIMEOUT' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('TIMEOUT');
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: PROVIDER_ERROR', () => {
  it('records PROVIDER_ERROR and does not auto-approve when provider returns error', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: false, reason: 'PROVIDER_ERROR' }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'PROVIDER_ERROR' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('PROVIDER_ERROR');
    // No auto-approve
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: INACTIVE_GSTIN', () => {
  it('records INACTIVE_GSTIN and inactive filing_status when GSTIN is not active', async () => {
    const db = makeDb();
    const inactiveData = {
      ...makeSuccessProviderData(),
      rawStatus: 'Inactive',
      normalizedFilingStatus: 'INACTIVE',
    };
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: inactiveData }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'INACTIVE_GSTIN', filing_status: 'INACTIVE' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('INACTIVE_GSTIN');
    expect(evidenceCall.data.filing_status).toBe('INACTIVE');
    // No auto-approve
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: INVALID_GSTIN', () => {
  it('records INVALID_GSTIN when provider says GSTIN not found', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: false, reason: 'INVALID_GSTIN' }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'INVALID_GSTIN' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('INVALID_GSTIN');
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: name MISMATCH', () => {
  it('records MISMATCH when legal name does not match provider name', async () => {
    const db = makeDb();
    const mismatchData = {
      ...makeSuccessProviderData(),
      legalName: 'Completely Different Corp Ltd',
      businessName: 'Unrelated Entity Pvt Ltd',
    };
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: mismatchData }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'MISMATCH' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('MISMATCH');
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: state MISMATCH', () => {
  it('records MISMATCH when GSTIN state code does not match submitted state_code', async () => {
    const db = makeDb();
    // Provider returns data for state 29 (Karnataka)
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: makeSuccessProviderData() }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    // Submit with GSTIN starting with 30 (Goa) but state_code '29' (Karnataka)
    const GSTIN_GOA = '30ABCDE1234F1Z5';
    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'MISMATCH', gstin: GSTIN_GOA }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord({ gstin: GSTIN_GOA }));
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, {
      ...BASE_SUBMIT_INPUT,
      gstin: GSTIN_GOA,
      state_code: '29', // mismatch: GSTIN says 30 (Goa), tenant says 29 (Karnataka)
    });

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('MISMATCH');
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('GstVerificationService.submitVerification — provider check: DUPLICATE_GSTIN', () => {
  it('records DUPLICATE_GSTIN when another org is already approved with the same GSTIN', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: makeSuccessProviderData() }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    const OTHER_ORG_ID = 'cccccccc-0000-0000-0000-000000000099';
    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'DUPLICATE_GSTIN' }));
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    // Duplicate found: another org already approved with same GSTIN
    db.gst_verifications.findFirst.mockResolvedValueOnce({ org_id: OTHER_ORG_ID });
    db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    const evidenceCall = db.gst_verifications.updateMany.mock.calls[0][0];
    expect(evidenceCall.data.provider_result).toBe('DUPLICATE_GSTIN');
    // No auto-approve updateMany
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(1);
    expect(db.organizations.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VERIFICATION_APPROVED' } }),
    );
  });
});

describe('GstVerificationService.submitVerification — provider check: race-condition guard', () => {
  it('does not advance org.status when admin already reviewed before auto-approve write (count=0)', async () => {
    const db = makeDb();
    const mockProvider: GstProviderAdapter = {
      name: 'deepvue',
      verifyGstin: vi.fn().mockResolvedValue({ ok: true, data: makeSuccessProviderData() }),
    };
    const svc = new GstVerificationService(db, mockProvider);

    db.gst_verifications.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeAutoApprovedDbRecord()); // admin already set review_outcome
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
    db.gst_verifications.findFirst.mockResolvedValueOnce(null); // no duplicate
    db.gst_verifications.updateMany
      .mockResolvedValueOnce({ count: 1 }) // evidence update
      .mockResolvedValueOnce({ count: 0 }); // auto-approve: admin already reviewed (count=0)

    await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    // Auto-approve update was attempted (second updateMany)
    expect(db.gst_verifications.updateMany).toHaveBeenCalledTimes(2);

    // Org status NOT advanced because count=0
    expect(db.organizations.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VERIFICATION_APPROVED' } }),
    );
  });
});

describe('GstVerificationService.submitVerification — no provider configured', () => {
  it('skips provider check and returns record when no provider is set (backwards-compatible)', async () => {
    const db = makeDb();
    // Construct with no provider override and no GST_PROVIDER env var
    const svc = new GstVerificationService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(null);
    db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());

    const result = await svc.submitVerification(ORG_ID, BASE_SUBMIT_INPUT);

    // No provider calls
    expect(db.gst_verifications.findFirst).not.toHaveBeenCalled();
    expect(db.gst_verifications.updateMany).not.toHaveBeenCalled();
    expect(result.org_id).toBe(ORG_ID);
  });
});

// ─── toAdminRecord — provider evidence fields ─────────────────────────────────

describe('GstVerificationService.getVerificationByOrgIdAdmin — provider evidence fields', () => {
  it('includes safe provider evidence fields in admin record', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({
        provider_name: 'deepvue',
        provider_request_id: 'tx-abc',
        provider_verified_at: NOW,
        provider_result: 'AUTO_APPROVED',
        raw_verification_json: { gstin_status: 'ACTIVE' },
        review_outcome: 'APPROVED',
      }),
    );

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.provider_name).toBe('deepvue');
    // provider_request_id excluded from normal admin contract (audit-only)
    expect((result as any).provider_request_id).toBeUndefined();
    expect(result!.provider_verified_at).toEqual(NOW);
    expect(result!.provider_result).toBe('AUTO_APPROVED');
    // raw_verification_json excluded from normal admin contract (audit-only)
    expect((result as any).raw_verification_json).toBeUndefined();
  });

  it('returns null for provider evidence fields on old records without them', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);

    // Old record without provider fields
    const oldRecord = {
      id: 'bbbbbbbb-0000-0000-0000-000000000002',
      org_id: ORG_ID,
      gstin: VALID_GSTIN,
      legal_name_on_gst: 'Test Company Pvt Ltd',
      state_code: '29',
      registration_type: 'Regular',
      filing_status: 'UNKNOWN',
      submitted_at: NOW,
      reviewed_at: null,
      reviewed_by_admin_id: null,
      review_outcome: null,
      review_notes: null,
      raw_verification_json: {},
      created_at: NOW,
      updated_at: NOW,
      // provider fields absent (simulating pre-migration record)
    };
    db.gst_verifications.findUnique.mockResolvedValueOnce(oldRecord);

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.provider_name).toBeNull();
    // provider_request_id not in normal admin contract
    expect((result as any).provider_request_id).toBeUndefined();
    expect(result!.provider_result).toBeNull();
  });
});

// ─── CRM lifecycle events ─────────────────────────────────────────────────────

describe('GstVerificationService — CRM lifecycle events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sender is now awaited — drainTick() is a no-op guard kept for safety.
  async function drainTick() {
    await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  }

  describe('submitVerification — emits gst.submitted on first submit', () => {
    it('emits notifyGstSubmitted when no prior record exists', async () => {
      vi.mocked(notifyGstSubmitted).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(null); // no prior record
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      expect(vi.mocked(notifyGstSubmitted)).toHaveBeenCalledOnce();
      expect(vi.mocked(notifyGstResubmitted)).not.toHaveBeenCalled();
    });

    it('GST submit CRM params include org_id, registration_type, state_code, PENDING_VERIFICATION status', async () => {
      vi.mocked(notifyGstSubmitted).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(null);
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Composition',
      });

      await drainTick();
      const callArg = vi.mocked(notifyGstSubmitted).mock.calls[0][0];
      expect(callArg.orgId).toBe(ORG_ID);
      expect(callArg.tenantId).toBe(ORG_ID);
      expect(callArg.registrationType).toBe('Composition');
      expect(callArg.stateCode).toBe('29');
      expect(callArg.orgStatus).toBe('PENDING_VERIFICATION');
    });
  });

  describe('submitVerification — emits gst.resubmitted after REJECTED or NEEDS_MORE_INFO', () => {
    it('emits notifyGstResubmitted when prior record is REJECTED', async () => {
      vi.mocked(notifyGstResubmitted).mockClear();
      vi.mocked(notifyGstSubmitted).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'REJECTED' }),
      );
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      expect(vi.mocked(notifyGstResubmitted)).toHaveBeenCalledOnce();
      expect(vi.mocked(notifyGstSubmitted)).not.toHaveBeenCalled();
    });

    it('emits notifyGstResubmitted when prior record is NEEDS_MORE_INFO', async () => {
      vi.mocked(notifyGstResubmitted).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'NEEDS_MORE_INFO' }),
      );
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      expect(vi.mocked(notifyGstResubmitted)).toHaveBeenCalledOnce();
    });
  });

  describe('provider check — emits provider_check.completed event', () => {
    it('emits notifyProviderCheckCompleted after provider runs', async () => {
      vi.mocked(notifyProviderCheckCompleted).mockClear();

      const mockAdapter: GstProviderAdapter = {
        name: 'deepvue',
        verifyGstin: vi.fn().mockResolvedValue({
          ok: false,
          reason: 'PROVIDER_ERROR',
        }),
      };

      const db = makeDb();
      const svc = new GstVerificationService(db, mockAdapter);
      db.gst_verifications.findUnique
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValueOnce(makeTenantDbRecord({ provider_result: 'PROVIDER_ERROR' })); // after update
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
      db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      expect(vi.mocked(notifyProviderCheckCompleted)).toHaveBeenCalledOnce();
      const callArg = vi.mocked(notifyProviderCheckCompleted).mock.calls[0][0];
      expect(callArg.providerResult).toBe('PROVIDER_ERROR');
      expect(callArg.providerName).toBe('deepvue');
      expect(callArg.autoApproved).toBe(false);
    });

    it('provider check payload does NOT contain provider_request_id', async () => {
      vi.mocked(notifyProviderCheckCompleted).mockClear();
      const mockAdapter: GstProviderAdapter = {
        name: 'noop',
        verifyGstin: vi.fn().mockResolvedValue({ ok: false, reason: 'TIMEOUT' }),
      };

      const db = makeDb();
      const svc = new GstVerificationService(db, mockAdapter);
      db.gst_verifications.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeTenantDbRecord());
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());
      db.gst_verifications.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company Pvt Ltd',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      const callArg = vi.mocked(notifyProviderCheckCompleted).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('provider_request_id');
      expect(callArg).not.toHaveProperty('provider_verified_at');
      expect(callArg).not.toHaveProperty('raw_verification_json');
    });

    it('does NOT emit provider_check event when no provider is configured', async () => {
      vi.mocked(notifyProviderCheckCompleted).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db); // no provider
      db.gst_verifications.findUnique.mockResolvedValueOnce(null);
      db.gst_verifications.upsert.mockResolvedValueOnce(makeTenantDbRecord());

      await svc.submitVerification(ORG_ID, {
        gstin: VALID_GSTIN,
        legal_name_on_gst: 'Test Company',
        state_code: '29',
        registration_type: 'Regular',
      });

      await drainTick();
      expect(vi.mocked(notifyProviderCheckCompleted)).not.toHaveBeenCalled();
    });
  });

  describe('adminReviewVerification — emits correct admin review event', () => {
    it('emits notifyAdminReviewedApproved on APPROVED outcome', async () => {
      vi.mocked(notifyAdminReviewedApproved).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord({ id: 'rec-1' }));
      db.gst_verifications.update.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'APPROVED', reviewed_by_admin_id: ADMIN_ID }),
      );
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.adminReviewVerification(ORG_ID, ADMIN_ID, { review_outcome: 'APPROVED' });

      await drainTick();
      expect(vi.mocked(notifyAdminReviewedApproved)).toHaveBeenCalledOnce();
      expect(vi.mocked(notifyAdminReviewedRejected)).not.toHaveBeenCalled();
      expect(vi.mocked(notifyAdminReviewedNeedsMoreInfo)).not.toHaveBeenCalled();
    });

    it('emits notifyAdminReviewedRejected on REJECTED outcome', async () => {
      vi.mocked(notifyAdminReviewedRejected).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord({ id: 'rec-2' }));
      db.gst_verifications.update.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'REJECTED', reviewed_by_admin_id: ADMIN_ID }),
      );
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.adminReviewVerification(ORG_ID, ADMIN_ID, {
        review_outcome: 'REJECTED',
        review_notes: 'Invalid docs',
      });

      await drainTick();
      expect(vi.mocked(notifyAdminReviewedRejected)).toHaveBeenCalledOnce();
      // Raw review_notes must NOT appear in the CRM call args
      const callArg = vi.mocked(notifyAdminReviewedRejected).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('review_notes');
      expect(callArg).not.toHaveProperty('reviewed_by_admin_id');
    });

    it('emits notifyAdminReviewedNeedsMoreInfo on NEEDS_MORE_INFO outcome', async () => {
      vi.mocked(notifyAdminReviewedNeedsMoreInfo).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord({ id: 'rec-3' }));
      db.gst_verifications.update.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'NEEDS_MORE_INFO', reviewed_by_admin_id: ADMIN_ID }),
      );
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.adminReviewVerification(ORG_ID, ADMIN_ID, {
        review_outcome: 'NEEDS_MORE_INFO',
        review_notes: 'Please provide GST certificate',
      });

      await drainTick();
      expect(vi.mocked(notifyAdminReviewedNeedsMoreInfo)).toHaveBeenCalledOnce();
      // Raw review_notes must NOT appear in the CRM call args
      const callArg = vi.mocked(notifyAdminReviewedNeedsMoreInfo).mock.calls[0][0];
      expect(callArg).not.toHaveProperty('review_notes');
    });

    it('admin approved CRM call passes org_id and tenant_id', async () => {
      vi.mocked(notifyAdminReviewedApproved).mockClear();
      const db = makeDb();
      const svc = new GstVerificationService(db);
      db.gst_verifications.findUnique.mockResolvedValueOnce(makeTenantDbRecord({ id: 'rec-4' }));
      db.gst_verifications.update.mockResolvedValueOnce(
        makeTenantDbRecord({ review_outcome: 'APPROVED' }),
      );
      db.organizations.updateMany.mockResolvedValueOnce({ count: 1 });

      await svc.adminReviewVerification(ORG_ID, ADMIN_ID, { review_outcome: 'APPROVED' });

      await drainTick();
      const callArg = vi.mocked(notifyAdminReviewedApproved).mock.calls[0][0];
      expect(callArg.orgId).toBe(ORG_ID);
      expect(callArg.tenantId).toBe(ORG_ID);
    });
  });
});
