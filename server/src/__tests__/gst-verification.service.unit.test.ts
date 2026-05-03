/**
 * Unit tests — GstVerificationService (TTP Slice 2)
 *
 * Pure unit tests with mocked Prisma. No DB access.
 * All service methods are tested against: happy path, edge cases, error throws.
 *
 * Run: pnpm exec vitest run src/__tests__/gst-verification.service.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  GstVerificationService,
  GstAlreadyApprovedError,
  GstNotFoundError,
} from '../services/gstVerification.service.js';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    gst_verifications: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
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
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
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
  it('returns full admin record including raw_verification_json', async () => {
    const db = makeDb();
    const svc = new GstVerificationService(db);
    db.gst_verifications.findUnique.mockResolvedValueOnce(
      makeTenantDbRecord({ raw_verification_json: { gstin_status: 'ACTIVE' } }),
    );

    const result = await svc.getVerificationByOrgIdAdmin(ORG_ID);

    expect(result).not.toBeNull();
    expect((result as any).raw_verification_json).toEqual({ gstin_status: 'ACTIVE' });
    expect(result!.reviewed_by_admin_id).toBeNull();
    expect(result!.reviewed_at).toBeNull();
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
    // organizations.updateMany must NOT be called on REJECTED
    expect(db.organizations.updateMany).not.toHaveBeenCalled();
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

  it('does NOT call organizations.updateMany when outcome is NEEDS_MORE_INFO', async () => {
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

    expect(db.organizations.updateMany).not.toHaveBeenCalled();
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
