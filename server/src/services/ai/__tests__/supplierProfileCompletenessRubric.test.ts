/**
 * supplierProfileCompletenessRubric.test.ts — Unit tests K-011 through K-023
 *
 * Tests the deterministic 10-category rubric scorer (Slice 2).
 * No Prisma mock needed — the rubric is a pure function.
 *
 * CONTEXT DEVIATION NOTE (from module header):
 * - description field: NOT in CatalogItemSummary → catalogCoverage and
 *   buyerDiscoverability are scored from 3 signals (not 4).
 * - issuedAt: NOT in CertificationSummary → certificationsDocuments from 3 signals.
 * - item-level certifications JSONB: NOT in CatalogItemSummary → aiReadiness from 3 signals.
 *
 * For K-016 (stage taxonomy zero when all items have null catalogStage):
 * The rubric receives CatalogItemSummary.catalogStage as a string. In production,
 * the context builder maps null → 'FABRIC_WOVEN'. Here, we use catalogStage: '' to
 * represent a missing/null stage in the unit-test fixture, exercising the rubric's
 * hasMeaningfulStage() guard in isolation.
 */

import { describe, expect, it } from 'vitest';
import {
  buildSupplierProfileCompletenessRubric,
} from '../supplierProfileCompletenessRubric.js';
import type { SupplierProfileCompletenessResult, SupplierOrgProfileForContext } from '../supplierProfileCompletenessContextBuilder.js';
import type { CatalogItemSummary, CertificationSummary } from '../aiContextPacks.js';

// ─── Test fixture helpers ─────────────────────────────────────────────────────

const BASE_ORG_PROFILE: SupplierOrgProfileForContext = {
  orgId: 'org-001',
  slug: 'acme-textiles',
  legalName: 'Acme Textiles Ltd',
  jurisdiction: 'IND',
  registrationNo: 'MH2024REG001',
  orgType: 'B2B',
  primarySegmentKey: 'TEXTILE_YARN',
  secondarySegmentKeys: ['TEXTILE_FABRIC'],
  rolePositionKeys: ['MANUFACTURER'],
};

const makeItem = (overrides: Partial<CatalogItemSummary> = {}): CatalogItemSummary => ({
  id: `item-${Math.random().toString(36).slice(2, 8)}`,
  sku: 'SKU-001',
  name: 'Cotton Yarn',
  catalogStage: 'YARN',
  stageAttributes: {
    yarnType: 'Combed',
    yarnCount: '40s',
    countSystem: 'English',
    ply: 'Single',
    fiber: 'Cotton',
    spinningType: 'Ring',
    coneWeight: '1kg',
    endUse: 'Weaving',
  },
  material: null,
  composition: '100% Cotton',
  moq: 500,
  ...overrides,
});

const makeCert = (overrides: Partial<CertificationSummary> = {}): CertificationSummary => ({
  id: `cert-${Math.random().toString(36).slice(2, 8)}`,
  certificationType: 'GOTS',
  expiresAt: null,
  ...overrides,
});

const makeResult = (
  overrides: Partial<{
    catalogItems: CatalogItemSummary[];
    certifications: CertificationSummary[];
    completenessScores: Record<string, number>;
    stageBreakdown: Record<string, number>;
    orgProfile: SupplierOrgProfileForContext;
  }> = {},
): SupplierProfileCompletenessResult => {
  const catalogItems = overrides.catalogItems ?? [makeItem()];
  const completenessScores: Record<string, number> =
    overrides.completenessScores ??
    Object.fromEntries(catalogItems.map((i) => [i.id, 0.8]));
  const stageBreakdown: Record<string, number> =
    overrides.stageBreakdown ??
    catalogItems.reduce(
      (acc, i) => ({ ...acc, [i.catalogStage]: (acc[i.catalogStage] ?? 0) + 1 }),
      {} as Record<string, number>,
    );

  return {
    context: {
      orgId: 'org-001',
      catalogItems,
      certifications: overrides.certifications ?? [makeCert()],
      completenessScores,
      stageBreakdown,
    },
    orgProfile: overrides.orgProfile ?? { ...BASE_ORG_PROFILE },
  };
};

// ─── K-011: profileIdentity full score ───────────────────────────────────────

describe('K-011: profileIdentity full score', () => {
  it('scores 1.0 when all 4 signals are present', () => {
    const result = makeResult();
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.profileIdentity).toBe(1.0);
  });
});

// ─── K-012: profileIdentity low score ────────────────────────────────────────

describe('K-012: profileIdentity low score with UNKNOWN jurisdiction and missing registrationNo', () => {
  it('scores 0.5 when jurisdiction=UNKNOWN and registrationNo=null (legalName + slug present)', () => {
    const result = makeResult({
      orgProfile: {
        ...BASE_ORG_PROFILE,
        jurisdiction: 'UNKNOWN',
        registrationNo: null,
      },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    // 2 of 4 signals: legalName ✓, jurisdiction ✗, registrationNo ✗, slug ✓
    expect(report.categoryScores.profileIdentity).toBe(0.5);
  });

  it('emits missing entries for jurisdiction and registrationNo', () => {
    const result = makeResult({
      orgProfile: {
        ...BASE_ORG_PROFILE,
        jurisdiction: 'UNKNOWN',
        registrationNo: null,
      },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    const fields = report.missingFields.map((m) => m.field);
    expect(fields).toContain('jurisdiction');
    expect(fields).toContain('registrationNo');
  });
});

// ─── K-013: businessCapability zero ──────────────────────────────────────────

describe('K-013: businessCapability zero when no segments or role positions', () => {
  it('scores 0 when primarySegmentKey=null, no secondary segments, no role positions', () => {
    const result = makeResult({
      orgProfile: {
        ...BASE_ORG_PROFILE,
        primarySegmentKey: null,
        secondarySegmentKeys: [],
        rolePositionKeys: [],
      },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.businessCapability).toBe(0);
  });

  it('emits missing entry for primarySegmentKey', () => {
    const result = makeResult({
      orgProfile: {
        ...BASE_ORG_PROFILE,
        primarySegmentKey: null,
        secondarySegmentKeys: [],
        rolePositionKeys: [],
      },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.missingFields.some((m) => m.field === 'primarySegmentKey')).toBe(true);
  });
});

// ─── K-014: catalogCoverage zero with no active items ────────────────────────

describe('K-014: catalogCoverage zero with no active items', () => {
  it('scores 0 when catalogItems is empty', () => {
    const result = makeResult({ catalogItems: [], certifications: [makeCert()] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.catalogCoverage).toBe(0);
  });

  it('emits CRITICAL warning for no active catalog items', () => {
    const result = makeResult({ catalogItems: [], certifications: [makeCert()] });
    const report = buildSupplierProfileCompletenessRubric(result);
    const criticals = report.trustSignalWarnings.filter((w) => w.severity === 'CRITICAL');
    expect(criticals.length).toBeGreaterThan(0);
    expect(criticals.some((w) => w.affectedCategory === 'catalogCoverage')).toBe(true);
  });
});

// ─── K-015: catalogAttributeQuality = mean of completenessScores ─────────────

describe('K-015: catalogAttributeQuality equals mean of completenessScores', () => {
  it('scores the mean of the provided completenessScores map', () => {
    const item1 = makeItem({ id: 'i1' });
    const item2 = makeItem({ id: 'i2' });
    const result = makeResult({
      catalogItems: [item1, item2],
      completenessScores: { i1: 0.4, i2: 0.8 },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.catalogAttributeQuality).toBeCloseTo(0.6, 10);
  });

  it('scores 0 when no catalog items', () => {
    const result = makeResult({ catalogItems: [], certifications: [makeCert()] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.catalogAttributeQuality).toBe(0);
  });
});

// ─── K-016: stageTaxonomy zero when all items have null catalogStage ──────────

describe('K-016: stageTaxonomy zero when all items have null/empty catalogStage', () => {
  it('scores 0 when all items have catalogStage=""  (represents null/unassigned stage)', () => {
    // In production, null catalogStage → 'FABRIC_WOVEN' via context builder.
    // Here we use '' to unit-test the rubric's hasMeaningfulStage() guard in isolation.
    const item1 = makeItem({ id: 'i1', catalogStage: '', stageAttributes: {} });
    const item2 = makeItem({ id: 'i2', catalogStage: '', stageAttributes: {} });
    const result = makeResult({
      catalogItems: [item1, item2],
      completenessScores: { i1: 0, i2: 0 },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.stageTaxonomy).toBe(0);
  });

  it('emits a WARNING trust signal for missing stage classification', () => {
    const item = makeItem({ id: 'i1', catalogStage: '', stageAttributes: {} });
    const result = makeResult({
      catalogItems: [item],
      completenessScores: { i1: 0 },
    });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(
      report.trustSignalWarnings.some(
        (w) => w.severity === 'WARNING' && w.affectedCategory === 'stageTaxonomy',
      ),
    ).toBe(true);
  });
});

// ─── K-017: certificationsDocuments warning emitted for expired cert ──────────

describe('K-017: certificationsDocuments trust signal warning for expired cert', () => {
  it('emits a WARNING for each expired certification', () => {
    const expiredCert = makeCert({
      id: 'cert-expired',
      certificationType: 'GOTS',
      expiresAt: new Date('2020-01-01'), // far in the past
    });
    const result = makeResult({ certifications: [expiredCert] });
    const report = buildSupplierProfileCompletenessRubric(result);
    const expiredWarnings = report.trustSignalWarnings.filter(
      (w) =>
        w.severity === 'WARNING' &&
        w.affectedCategory === 'certificationsDocuments' &&
        w.warning.includes('expired'),
    );
    expect(expiredWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it('includes the cert type name in the warning text', () => {
    const expiredCert = makeCert({
      certificationType: 'OEKO_TEX',
      expiresAt: new Date('2019-06-01'),
    });
    const result = makeResult({ certifications: [expiredCert] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(
      report.trustSignalWarnings.some((w) => w.warning.includes('OEKO_TEX')),
    ).toBe(true);
  });

  it('does not emit an expired warning when expiresAt is in the future', () => {
    const futureCert = makeCert({
      certificationType: 'GOTS',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year ahead
    });
    const result = makeResult({ certifications: [futureCert] });
    const report = buildSupplierProfileCompletenessRubric(result);
    const expiredWarnings = report.trustSignalWarnings.filter(
      (w) => w.warning.includes('expired') && w.affectedCategory === 'certificationsDocuments',
    );
    expect(expiredWarnings.length).toBe(0);
  });
});

// ─── K-018: rfqResponsiveness fixed at 0.5 ───────────────────────────────────

describe('K-018: rfqResponsiveness is always 0.5 in MVP', () => {
  it('returns rfqResponsiveness = 0.5 regardless of catalog state', () => {
    const full = makeResult();
    const empty = makeResult({ catalogItems: [], certifications: [] });
    expect(buildSupplierProfileCompletenessRubric(full).categoryScores.rfqResponsiveness).toBe(0.5);
    expect(buildSupplierProfileCompletenessRubric(empty).categoryScores.rfqResponsiveness).toBe(0.5);
  });
});

// ─── K-019: serviceCapabilityClarity = 1.0 when no SERVICE items ─────────────

describe('K-019: serviceCapabilityClarity = 1.0 when no SERVICE items', () => {
  it('scores 1.0 (N/A) when no items have catalogStage=SERVICE', () => {
    const result = makeResult(); // default fixture uses YARN stage
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.serviceCapabilityClarity).toBe(1.0);
  });

  it('scores < 1.0 when SERVICE items exist but lack attributes', () => {
    const serviceItem = makeItem({
      catalogStage: 'SERVICE',
      stageAttributes: {}, // no serviceType, specialization, turnaroundTimeDays
    });
    const result = makeResult({ catalogItems: [serviceItem] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.serviceCapabilityClarity).toBeLessThan(1.0);
  });

  it('scores 1.0 when SERVICE items have all 3 required attributes', () => {
    const serviceItem = makeItem({
      catalogStage: 'SERVICE',
      stageAttributes: {
        serviceType: 'Dyeing',
        specialization: 'Reactive dyeing for cotton',
        turnaroundTimeDays: 7,
      },
    });
    const result = makeResult({ catalogItems: [serviceItem] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.serviceCapabilityClarity).toBe(1.0);
  });
});

// ─── K-020: buyerDiscoverability penalized when no SKUs ──────────────────────

describe('K-020: buyerDiscoverability penalized when no SKUs are set', () => {
  it('scores lower when all items have empty sku', () => {
    const item = makeItem({ id: 'i1', sku: '', moq: 500 }); // sku absent, moq set
    const result = makeResult({ catalogItems: [item], completenessScores: { i1: 0.8 } });
    const report = buildSupplierProfileCompletenessRubric(result);
    // Signal 1: hasItems ✓, Signal 2: hasMoqSet ✓ (500 ≠ 1), Signal 3: hasSkuSet ✗ → 2/3
    expect(report.categoryScores.buyerDiscoverability).toBeCloseTo(2 / 3, 10);
  });

  it('emits a missing entry for sku when no SKUs are present', () => {
    const item = makeItem({ sku: '', moq: 500 });
    const result = makeResult({ catalogItems: [item] });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.missingFields.some((m) => m.field === 'sku')).toBe(true);
  });

  it('scores 1.0 when all 3 available signals are present', () => {
    const item = makeItem({ id: 'i1', sku: 'FABRIC-001', moq: 200 });
    const result = makeResult({ catalogItems: [item], completenessScores: { i1: 0.9 } });
    const report = buildSupplierProfileCompletenessRubric(result);
    expect(report.categoryScores.buyerDiscoverability).toBe(1.0);
  });
});

// ─── K-021: overallCompleteness = mean of 10 category scores ─────────────────

describe('K-021: overallCompleteness equals mean of all 10 category scores', () => {
  it('computes overallCompleteness as the arithmetic mean of all 10 category scores', () => {
    const result = makeResult(); // arbitrary valid result
    const report = buildSupplierProfileCompletenessRubric(result);

    const categoryValues = Object.values(report.categoryScores);
    expect(categoryValues).toHaveLength(10);

    const expectedMean =
      categoryValues.reduce((sum, s) => sum + s, 0) / categoryValues.length;
    expect(report.overallCompleteness).toBeCloseTo(expectedMean, 10);
  });

  it('has exactly 10 keys in categoryScores', () => {
    const report = buildSupplierProfileCompletenessRubric(makeResult());
    expect(Object.keys(report.categoryScores)).toHaveLength(10);
    expect(report.categoryScores).toHaveProperty('profileIdentity');
    expect(report.categoryScores).toHaveProperty('businessCapability');
    expect(report.categoryScores).toHaveProperty('catalogCoverage');
    expect(report.categoryScores).toHaveProperty('catalogAttributeQuality');
    expect(report.categoryScores).toHaveProperty('stageTaxonomy');
    expect(report.categoryScores).toHaveProperty('certificationsDocuments');
    expect(report.categoryScores).toHaveProperty('rfqResponsiveness');
    expect(report.categoryScores).toHaveProperty('serviceCapabilityClarity');
    expect(report.categoryScores).toHaveProperty('aiReadiness');
    expect(report.categoryScores).toHaveProperty('buyerDiscoverability');
  });

  it('overallCompleteness is between 0 and 1', () => {
    const report = buildSupplierProfileCompletenessRubric(makeResult());
    expect(report.overallCompleteness).toBeGreaterThanOrEqual(0);
    expect(report.overallCompleteness).toBeLessThanOrEqual(1);
  });
});

// ─── K-022: humanReviewRequired is true ──────────────────────────────────────

describe('K-022: humanReviewRequired is always true', () => {
  it('includes humanReviewRequired: true in the report', () => {
    const report = buildSupplierProfileCompletenessRubric(makeResult());
    expect(report.humanReviewRequired).toBe(true);
  });

  it('humanReviewRequired is true even for a minimal/empty profile', () => {
    const emptyResult = makeResult({ catalogItems: [], certifications: [] });
    const report = buildSupplierProfileCompletenessRubric(emptyResult);
    expect(report.humanReviewRequired).toBe(true);
  });
});

// ─── K-023: no price/publicationPosture/risk_score language in output ─────────

describe('K-023: output contains no price/publicationPosture/risk_score language', () => {
  const FORBIDDEN_TERMS = [
    'price',
    'publicationPosture',
    'publication_posture',
    'risk_score',
    'riskScore',
    'escrow',
    'grossAmount',
  ];

  it('improvementActions contain no forbidden terms', () => {
    const result = makeResult({
      orgProfile: {
        ...BASE_ORG_PROFILE,
        primarySegmentKey: null,
        secondarySegmentKeys: [],
        rolePositionKeys: [],
        jurisdiction: 'UNKNOWN',
        registrationNo: null,
      },
      catalogItems: [],
      certifications: [],
    });
    const report = buildSupplierProfileCompletenessRubric(result);

    for (const action of report.improvementActions) {
      for (const term of FORBIDDEN_TERMS) {
        expect(action.action.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });

  it('trustSignalWarnings contain no forbidden terms', () => {
    const result = makeResult({
      catalogItems: [],
      certifications: [],
    });
    const report = buildSupplierProfileCompletenessRubric(result);

    for (const warning of report.trustSignalWarnings) {
      for (const term of FORBIDDEN_TERMS) {
        expect(warning.warning.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });

  it('reasoningSummary contains no forbidden terms', () => {
    const result = makeResult({ catalogItems: [], certifications: [] });
    const report = buildSupplierProfileCompletenessRubric(result);

    for (const term of FORBIDDEN_TERMS) {
      expect(report.reasoningSummary.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it('missingFields contain no forbidden terms in field or note', () => {
    const result = makeResult({ catalogItems: [], certifications: [] });
    const report = buildSupplierProfileCompletenessRubric(result);

    for (const mf of report.missingFields) {
      for (const term of FORBIDDEN_TERMS) {
        expect(mf.field.toLowerCase()).not.toContain(term.toLowerCase());
        if (mf.note) {
          expect(mf.note.toLowerCase()).not.toContain(term.toLowerCase());
        }
      }
    }
  });
});
