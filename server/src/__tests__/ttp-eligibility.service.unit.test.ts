/**
 * Unit tests — TtpEligibilityService (TTP Slice 3)
 *
 * Pure unit tests with mocked Prisma. No DB access.
 * All service methods tested: happy path, edge cases, error throws.
 *
 * Run: pnpm exec vitest run src/__tests__/ttp-eligibility.service.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  TtpEligibilityService,
  EligibilityGstPrerequisiteError,
  EligibilityTierOutcomeMismatchError,
} from '../services/ttpEligibility.service.js';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

function makeDb(overrides: Record<string, unknown> = {}): any {
  return {
    gst_verifications: {
      findUnique: vi.fn(),
    },
    ttp_eligibility_assessments: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    organizations: {
      update: vi.fn(),
    },
    featureFlag: {
      findUnique: vi.fn(),
    },
    ...overrides,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const NOW = new Date('2025-06-01T00:00:00.000Z');
const ASSESSMENT_ID = 'cccccccc-0000-0000-0000-000000000003';

function makeAssessmentDbRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSESSMENT_ID,
    org_id: ORG_ID,
    assessment_type: 'MANUAL',
    risk_tier: 1,
    eligibility_outcome: 'ELIGIBLE',
    max_invoice_amount: 250000,
    currency: 'INR',
    assessed_at: NOW,
    valid_until: new Date(NOW.getTime() + 180 * 24 * 60 * 60 * 1000),
    assessed_by_admin_id: ADMIN_ID,
    assessment_notes: null,
    raw_bureau_json: {},
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeGstApproved() {
  return { review_outcome: 'APPROVED' };
}

// ─── validateOutcomeTierCombination ──────────────────────────────────────────

describe('TtpEligibilityService.validateOutcomeTierCombination', () => {
  const db = makeDb();
  const svc = new TtpEligibilityService(db);

  it('accepts tier 1 + ELIGIBLE', () => {
    expect(() => svc.validateOutcomeTierCombination(1, 'ELIGIBLE')).not.toThrow();
  });

  it('accepts tier 2 + ELIGIBLE', () => {
    expect(() => svc.validateOutcomeTierCombination(2, 'ELIGIBLE')).not.toThrow();
  });

  it('accepts tier 3 + ELIGIBLE', () => {
    expect(() => svc.validateOutcomeTierCombination(3, 'ELIGIBLE')).not.toThrow();
  });

  it('accepts tier 0 + MANUAL_REVIEW', () => {
    expect(() => svc.validateOutcomeTierCombination(0, 'MANUAL_REVIEW')).not.toThrow();
  });

  it('accepts tier 1 + INELIGIBLE', () => {
    expect(() => svc.validateOutcomeTierCombination(1, 'INELIGIBLE')).not.toThrow();
  });

  it('throws EligibilityTierOutcomeMismatchError for tier 0 + INELIGIBLE', () => {
    // Tier 0 requires MANUAL_REVIEW for ALL outcomes — INELIGIBLE also throws.
    expect(() => svc.validateOutcomeTierCombination(0, 'INELIGIBLE')).toThrow(
      EligibilityTierOutcomeMismatchError,
    );
  });

  it('throws EligibilityTierOutcomeMismatchError for tier 0 + ELIGIBLE', () => {
    expect(() => svc.validateOutcomeTierCombination(0, 'ELIGIBLE')).toThrow(
      EligibilityTierOutcomeMismatchError,
    );
  });

  it('throws EligibilityTierOutcomeMismatchError for tier 0 + INELIGIBLE message references MANUAL_REVIEW', () => {
    // Tier 0 enforces MANUAL_REVIEW for ALL outcomes — INELIGIBLE message also says MANUAL_REVIEW.
    expect(() => svc.validateOutcomeTierCombination(0, 'INELIGIBLE')).toThrowError(
      /MANUAL_REVIEW/i,
    );
  });

  it('throws EligibilityTierOutcomeMismatchError for tier 0 + ELIGIBLE (not MANUAL_REVIEW)', () => {
    expect(() => svc.validateOutcomeTierCombination(0, 'ELIGIBLE')).toThrowError(
      /MANUAL_REVIEW/i,
    );
  });

  it('throws EligibilityTierOutcomeMismatchError for ELIGIBLE with tier 0 (< 1)', () => {
    let err: unknown;
    try {
      svc.validateOutcomeTierCombination(0, 'ELIGIBLE');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(EligibilityTierOutcomeMismatchError);
    expect((err as Error).message).toMatch(/tier 0/i);
  });
});

// ─── createAssessment ─────────────────────────────────────────────────────────

describe('TtpEligibilityService.createAssessment', () => {
  it('creates an ELIGIBLE assessment for tier 1 org with approved GST', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue(null); // use defaults
    const record = makeAssessmentDbRecord();
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);
    db.organizations.update.mockResolvedValueOnce({});

    const result = await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'ELIGIBLE',
    });

    expect(result.org_id).toBe(ORG_ID);
    expect(result.eligibility_outcome).toBe('ELIGIBLE');
    expect(result.risk_tier).toBe(1);
    expect(db.ttp_eligibility_assessments.create).toHaveBeenCalledOnce();
    // On ELIGIBLE tier>=1: organizations.update must be called
    expect(db.organizations.update).toHaveBeenCalledWith({
      where: { id: ORG_ID },
      data: { risk_score: 1 },
    });
  });

  it('throws EligibilityGstPrerequisiteError when GST record is missing', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(null);

    await expect(
      svc.createAssessment(ORG_ID, ADMIN_ID, {
        risk_tier: 1,
        eligibility_outcome: 'ELIGIBLE',
      }),
    ).rejects.toBeInstanceOf(EligibilityGstPrerequisiteError);

    expect(db.ttp_eligibility_assessments.create).not.toHaveBeenCalled();
  });

  it('throws EligibilityGstPrerequisiteError when GST outcome is REJECTED', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: 'REJECTED' });

    await expect(
      svc.createAssessment(ORG_ID, ADMIN_ID, {
        risk_tier: 1,
        eligibility_outcome: 'ELIGIBLE',
      }),
    ).rejects.toBeInstanceOf(EligibilityGstPrerequisiteError);
  });

  it('throws EligibilityGstPrerequisiteError when GST outcome is null (pending)', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce({ review_outcome: null });

    await expect(
      svc.createAssessment(ORG_ID, ADMIN_ID, {
        risk_tier: 1,
        eligibility_outcome: 'ELIGIBLE',
      }),
    ).rejects.toBeInstanceOf(EligibilityGstPrerequisiteError);
  });

  it('throws EligibilityTierOutcomeMismatchError for tier 0 + ELIGIBLE', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());

    await expect(
      svc.createAssessment(ORG_ID, ADMIN_ID, {
        risk_tier: 0,
        eligibility_outcome: 'ELIGIBLE',
      }),
    ).rejects.toBeInstanceOf(EligibilityTierOutcomeMismatchError);

    expect(db.ttp_eligibility_assessments.create).not.toHaveBeenCalled();
  });

  it('does NOT call organizations.update when outcome is INELIGIBLE', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue(null);
    const record = makeAssessmentDbRecord({ eligibility_outcome: 'INELIGIBLE' });
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);

    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'INELIGIBLE',
    });

    expect(db.organizations.update).not.toHaveBeenCalled();
  });

  it('does NOT call organizations.update when outcome is MANUAL_REVIEW', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue(null);
    const record = makeAssessmentDbRecord({
      risk_tier: 0,
      eligibility_outcome: 'MANUAL_REVIEW',
      max_invoice_amount: null,
    });
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);

    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 0,
      eligibility_outcome: 'MANUAL_REVIEW',
    });

    expect(db.organizations.update).not.toHaveBeenCalled();
  });

  it('uses caller-supplied max_invoice_amount over feature flag', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue({
      enabled: true,
      value: '300000',
    });
    const record = makeAssessmentDbRecord({ max_invoice_amount: 99999 });
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);
    db.organizations.update.mockResolvedValueOnce({});

    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'ELIGIBLE',
      max_invoice_amount: 99999,
    });

    const createCall = db.ttp_eligibility_assessments.create.mock.calls[0][0];
    expect(createCall.data.max_invoice_amount).toBe(99999);
  });

  it('falls back to tier default when feature flag is absent', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue(null); // flag absent
    const record = makeAssessmentDbRecord();
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);
    db.organizations.update.mockResolvedValueOnce({});

    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'ELIGIBLE',
    });

    const createCall = db.ttp_eligibility_assessments.create.mock.calls[0][0];
    // Tier 1 default = 250000
    expect(createCall.data.max_invoice_amount).toBe(250_000);
  });

  it('uses caller-supplied valid_until over feature flag', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    db.featureFlag.findUnique.mockResolvedValue(null);
    const suppliedDate = new Date('2030-01-01T00:00:00.000Z');
    const record = makeAssessmentDbRecord({ valid_until: suppliedDate });
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);
    db.organizations.update.mockResolvedValueOnce({});

    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'ELIGIBLE',
      valid_until: suppliedDate,
    });

    const createCall = db.ttp_eligibility_assessments.create.mock.calls[0][0];
    expect(createCall.data.valid_until).toEqual(suppliedDate);
  });

  it('resolves valid_until from feature flag when not supplied', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.gst_verifications.findUnique.mockResolvedValueOnce(makeGstApproved());
    // Service calls resolveTierCapFromFlag first (step 3), then resolveValidityDays (step 4).
    db.featureFlag.findUnique
      .mockResolvedValueOnce({ enabled: true, value: '250000' }) // tier cap flag (first)
      .mockResolvedValueOnce({ enabled: true, value: '365' });  // validity_days flag (second)
    const record = makeAssessmentDbRecord();
    db.ttp_eligibility_assessments.create.mockResolvedValueOnce(record);
    db.organizations.update.mockResolvedValueOnce({});

    const before = Date.now();
    await svc.createAssessment(ORG_ID, ADMIN_ID, {
      risk_tier: 1,
      eligibility_outcome: 'ELIGIBLE',
    });

    const createCall = db.ttp_eligibility_assessments.create.mock.calls[0][0];
    const validUntil: Date = createCall.data.valid_until;
    const diffDays = (validUntil.getTime() - before) / (24 * 60 * 60 * 1000);
    // Should be approximately 365 days (within ±1 day tolerance for test timing)
    expect(diffDays).toBeGreaterThan(364);
    expect(diffDays).toBeLessThan(366);
  });
});

// ─── listAssessments ─────────────────────────────────────────────────────────

describe('TtpEligibilityService.listAssessments', () => {
  it('returns assessments newest-first', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    const records = [
      makeAssessmentDbRecord({ id: 'id-2', assessed_at: new Date('2025-06-02') }),
      makeAssessmentDbRecord({ id: 'id-1', assessed_at: new Date('2025-06-01') }),
    ];
    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce(records);

    const result = await svc.listAssessments(ORG_ID);

    expect(result).toHaveLength(2);
    expect(db.ttp_eligibility_assessments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { org_id: ORG_ID },
        orderBy: { assessed_at: 'desc' },
      }),
    );
  });

  it('returns empty array when no assessments exist', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce([]);

    const result = await svc.listAssessments(ORG_ID);
    expect(result).toHaveLength(0);
  });
});

// ─── getLatestAssessment ──────────────────────────────────────────────────────

describe('TtpEligibilityService.getLatestAssessment', () => {
  it('returns the latest assessment when one exists', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce([makeAssessmentDbRecord()]);

    const result = await svc.getLatestAssessment(ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(ASSESSMENT_ID);
    expect(db.ttp_eligibility_assessments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { org_id: ORG_ID },
        orderBy: { assessed_at: 'desc' },
        take: 1,
      }),
    );
  });

  it('returns null when no assessments exist', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce([]);

    const result = await svc.getLatestAssessment(ORG_ID);
    expect(result).toBeNull();
  });
});

// ─── toRecord decimal coercion ────────────────────────────────────────────────

describe('TtpEligibilityService — decimal coercion in toRecord', () => {
  it('converts Prisma Decimal max_invoice_amount to number', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    // Prisma returns Decimal objects for Decimal fields
    const decimalLike = { toNumber: () => 250000, valueOf: () => 250000 } as any;
    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce([
      makeAssessmentDbRecord({ max_invoice_amount: decimalLike }),
    ]);

    const [result] = await svc.listAssessments(ORG_ID);
    expect(typeof result.max_invoice_amount).toBe('number');
    expect(result.max_invoice_amount).toBe(250000);
  });

  it('returns null for null max_invoice_amount', async () => {
    const db = makeDb();
    const svc = new TtpEligibilityService(db);

    db.ttp_eligibility_assessments.findMany.mockResolvedValueOnce([
      makeAssessmentDbRecord({ max_invoice_amount: null }),
    ]);

    const [result] = await svc.listAssessments(ORG_ID);
    expect(result.max_invoice_amount).toBeNull();
  });
});
