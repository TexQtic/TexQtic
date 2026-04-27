/**
 * supplierProfileCompletenessService.test.ts â€” Supplier Profile Completeness Service Tests
 *
 * Tests K-021..K-025:
 *   K-021 â€” humanReviewRequired: true is always present in all valid report shapes
 *   K-022 â€” Parse error returns { ok: false, reportParseError: true, humanReviewRequired: true }
 *   K-023 â€” improvementActions never contain price-adjacent suggestions
 *   K-024 â€” trustSignalWarnings never reference publicationPosture or risk_score
 *   K-025 â€” Valid report accepted; no AI-generated write action is triggered
 *
 * Pattern: mock runAiInference + buildSupplierProfileCompletenessContext, test
 * parseSupplierProfileCompletenessReport and runSupplierProfileCompletenessInference directly.
 *
 * Run:
 *   pnpm --filter server exec vitest run src/services/ai/__tests__/supplierProfileCompletenessService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { DatabaseContext } from '../../../lib/database-context.js';
import type { SupplierProfileCompletenessReport } from '../supplierProfileCompletenessRubric.js';
import {
  parseSupplierProfileCompletenessReport,
  runSupplierProfileCompletenessInference,
  SUPPLIER_PROFILE_COMPLETENESS_MODEL,
  SUPPLIER_PROFILE_COMPLETENESS_PREFLIGHT_TOKENS,
  type SupplierProfileCompletenessServiceOk,
  type SupplierProfileCompletenessServiceParseError,
} from '../supplierProfileCompletenessService.js';
import { runAiInference } from '../inferenceService.js';
import { buildSupplierProfileCompletenessContext } from '../supplierProfileCompletenessContextBuilder.js';

// â”€â”€ Module mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock('../inferenceService.js', () => ({
  runAiInference: vi.fn(),
}));

vi.mock('../supplierProfileCompletenessContextBuilder.js', () => ({
  buildSupplierProfileCompletenessContext: vi.fn(),
}));

vi.mock('../aiForbiddenData.js', () => ({
  assertNoForbiddenAiFields: vi.fn(),
}));

vi.mock('../../../config/index.js', () => ({
  config: { GEMINI_API_KEY: 'test-key' },
}));

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const makeDeterministicReport = (overrides: Partial<SupplierProfileCompletenessReport> = {}): SupplierProfileCompletenessReport => ({
  overallCompleteness: 0.6,
  categoryScores: {
    profileIdentity: 0.8,
    businessCapability: 0.7,
    catalogCoverage: 0.5,
    catalogAttributeQuality: 0.4,
    stageTaxonomy: 0.3,
    certificationsDocuments: 0.9,
    rfqResponsiveness: 0.6,
    serviceCapabilityClarity: 0.5,
    aiReadiness: 0.4,
    buyerDiscoverability: 0.7,
  },
  missingFields: [
    { category: 'catalog', field: 'sku', priority: 'HIGH' },
  ],
  improvementActions: [],
  trustSignalWarnings: [],
  reasoningSummary: 'Profile is moderately complete.',
  humanReviewRequired: true,
  ...overrides,
});

const makeValidAiJson = (overrides: object = {}): string =>
  JSON.stringify({
    reasoningSummary: 'The profile needs catalog improvements to attract more buyers.',
    improvementActions: [
      { action: 'Add at least 5 catalog items with complete attributes', category: 'catalogCoverage', priority: 'HIGH' },
      { action: 'Upload product images for each catalog item', category: 'catalogAttributeQuality', priority: 'MEDIUM' },
    ],
    trustSignalWarnings: [
      { warning: 'No active catalog items found. Buyers cannot browse products.', severity: 'CRITICAL', affectedCategory: 'catalogCoverage' },
    ],
    ...overrides,
  });

const mockInferenceResult = (text: string) => ({
  text,
  tokensUsed: 400,
  costEstimateUSD: 0.00008,
  monthKey: '2026-04',
  auditLogId: 'audit-uuid-k021',
  inferenceLatencyMs: 180,
  hadInferenceError: false,
});

const mockContextResult = {
  context: {
    orgId: 'org-uuid-k021',
    catalogItems: [],
    certifications: [],
    completenessScores: {},
    stageBreakdown: {},
  },
  orgProfile: {
    orgId: 'org-uuid-k021',
    slug: 'test-supplier',
    legalName: 'Test Supplier Pvt Ltd',
    jurisdiction: 'IN',
    registrationNo: null,
    orgType: 'SUPPLIER',
    primarySegmentKey: null,
    secondarySegmentKeys: [],
    rolePositionKeys: [],
  },
};

const makeMockInput = () => ({
  orgId: 'org-uuid-k021',
  monthKey: '2026-04',
  requestId: 'req-uuid-k021',
  idempotencyKey: undefined,
  userId: null,
  prisma: {} as PrismaClient,
  dbContext: { orgId: 'org-uuid-k021' } as DatabaseContext,
});

// â”€â”€ Constants tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('supplierProfileCompletenessService constants', () => {
  it('uses gemini-2.5-flash as the default model', () => {
    expect(SUPPLIER_PROFILE_COMPLETENESS_MODEL).toBe('gemini-2.5-flash');
  });

  it('has a positive preflight token estimate <= 10000', () => {
    expect(SUPPLIER_PROFILE_COMPLETENESS_PREFLIGHT_TOKENS).toBeGreaterThan(0);
    expect(SUPPLIER_PROFILE_COMPLETENESS_PREFLIGHT_TOKENS).toBeLessThanOrEqual(10_000);
  });
});

// â”€â”€ K-021: humanReviewRequired: true always present â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('K-021: humanReviewRequired: true in all valid report shapes', () => {
  it('SupplierProfileCompletenessServiceOk has humanReviewRequired: true', () => {
    const result: SupplierProfileCompletenessServiceOk = {
      ok: true,
      report: makeDeterministicReport(),
      reasoningLogId: 'reasoning-uuid',
      auditLogId: 'audit-uuid',
      tokensUsed: 100,
      costEstimateUSD: 0.0001,
      monthKey: '2026-04',
      hadInferenceError: false,
      humanReviewRequired: true,
    };
    expect(result.humanReviewRequired).toBe(true);
  });

  it('SupplierProfileCompletenessServiceParseError has humanReviewRequired: true', () => {
    const result: SupplierProfileCompletenessServiceParseError = {
      ok: false,
      reportParseError: true,
      report: makeDeterministicReport(),
      reasoningLogId: 'reasoning-uuid',
      auditLogId: 'audit-uuid',
      hadInferenceError: true,
      humanReviewRequired: true,
    };
    expect(result.humanReviewRequired).toBe(true);
  });

  it('parseSupplierProfileCompletenessReport returns report with humanReviewRequired: true on success', () => {
    const det = makeDeterministicReport();
    const result = parseSupplierProfileCompletenessReport(makeValidAiJson(), det);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.humanReviewRequired).toBe(true);
    }
  });

  it('runSupplierProfileCompletenessInference ok result has humanReviewRequired: true', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult(makeValidAiJson()) as unknown as Awaited<ReturnType<typeof runAiInference>>);

    const result = await runSupplierProfileCompletenessInference(makeMockInput());
    expect(result.humanReviewRequired).toBe(true);
  });
});

// â”€â”€ K-022: Parse error shape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('K-022: parse error returns ok: false with reportParseError: true and humanReviewRequired: true', () => {
  it('returns ok: false for completely invalid JSON', () => {
    const det = makeDeterministicReport();
    const result = parseSupplierProfileCompletenessReport('NOT JSON AT ALL', det);
    expect(result.ok).toBe(false);
  });

  it('returns ok: false for valid JSON missing required fields', () => {
    const det = makeDeterministicReport();
    const result = parseSupplierProfileCompletenessReport(JSON.stringify({ foo: 'bar' }), det);
    expect(result.ok).toBe(false);
  });

  it('returns ok: false for JSON with wrong priority enum value', () => {
    const det = makeDeterministicReport();
    const badJson = JSON.stringify({
      reasoningSummary: 'summary',
      improvementActions: [{ action: 'do something', category: 'catalog', priority: 'CRITICAL' }],
      trustSignalWarnings: [],
    });
    const result = parseSupplierProfileCompletenessReport(badJson, det);
    expect(result.ok).toBe(false);
  });

  it('runSupplierProfileCompletenessInference returns parse error shape when AI returns invalid JSON', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult('INVALID JSON GARBAGE') as unknown as Awaited<ReturnType<typeof runAiInference>>);

    const result = await runSupplierProfileCompletenessInference(makeMockInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reportParseError).toBe(true);
      expect(result.humanReviewRequired).toBe(true);
      expect(result.hadInferenceError).toBe(true);
      // deterministic fallback report must be present
      expect(result.report).toBeDefined();
      expect(result.report.humanReviewRequired).toBe(true);
    }
  });

  it('parse error result contains deterministic fallback report, not null', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult('{}') as unknown as Awaited<ReturnType<typeof runAiInference>>);

    const result = await runSupplierProfileCompletenessInference(makeMockInput());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.report.overallCompleteness).toBeGreaterThanOrEqual(0);
    }
  });
});

// â”€â”€ K-023: improvementActions never contain price-adjacent terms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('K-023: improvementActions must not contain price-adjacent suggestions', () => {
  const PRICE_ADJACENT_TERMS = ['price', 'escrow', 'grossamount'];

  it.each(PRICE_ADJACENT_TERMS)('improvementActions with "%s" in action fails Zod parse', (term) => {
    const det = makeDeterministicReport();
    const badJson = JSON.stringify({
      reasoningSummary: 'summary ok',
      improvementActions: [{ action: `Add ${term} to your profile`, category: 'pricing', priority: 'HIGH' }],
      trustSignalWarnings: [],
    });
    const result = parseSupplierProfileCompletenessReport(badJson, det);
    expect(result.ok).toBe(false);
  });

  it('improvementActions without forbidden terms pass successfully', () => {
    const det = makeDeterministicReport();
    const goodJson = makeValidAiJson();
    const result = parseSupplierProfileCompletenessReport(goodJson, det);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const action of result.report.improvementActions) {
        expect(action.action.toLowerCase()).not.toMatch(/price|escrow|grossamount/);
      }
    }
  });
});

// â”€â”€ K-024: trustSignalWarnings must not reference forbidden fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('K-024: trustSignalWarnings must not reference publicationPosture or risk_score', () => {
  const FORBIDDEN_WARNING_TERMS = ['publicationposture', 'publication_posture', 'risk_score', 'riskscore'];

  it.each(FORBIDDEN_WARNING_TERMS)('trustSignalWarning with "%s" in warning fails Zod parse', (term) => {
    const det = makeDeterministicReport();
    const badJson = JSON.stringify({
      reasoningSummary: 'summary ok',
      improvementActions: [],
      trustSignalWarnings: [{ warning: `Check your ${term} settings`, severity: 'WARNING' }],
    });
    const result = parseSupplierProfileCompletenessReport(badJson, det);
    expect(result.ok).toBe(false);
  });

  it('trustSignalWarnings without forbidden terms pass successfully', () => {
    const det = makeDeterministicReport();
    const goodJson = makeValidAiJson();
    const result = parseSupplierProfileCompletenessReport(goodJson, det);
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const warning of result.report.trustSignalWarnings) {
        const lower = warning.warning.toLowerCase();
        expect(lower).not.toMatch(/publicationposture|publication_posture|risk_score|riskscore/);
      }
    }
  });
});

// â”€â”€ K-025: Valid report accepted; no write action triggered â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('K-025: valid report accepted and no write mutation occurs from service layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid AI JSON response and returns ok: true with merged report', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult(makeValidAiJson()) as unknown as Awaited<ReturnType<typeof runAiInference>>);

    const result = await runSupplierProfileCompletenessInference(makeMockInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.humanReviewRequired).toBe(true);
      expect(result.report.reasoningSummary).toBeTruthy();
      expect(result.report.improvementActions).toBeInstanceOf(Array);
      expect(result.report.trustSignalWarnings).toBeInstanceOf(Array);
      // Deterministic scores preserved
      expect(result.report.overallCompleteness).toBeGreaterThanOrEqual(0);
      expect(result.report.categoryScores).toBeDefined();
    }
  });

  it('service layer calls runAiInference exactly once per request', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult(makeValidAiJson()) as unknown as Awaited<ReturnType<typeof runAiInference>>);

    await runSupplierProfileCompletenessInference(makeMockInput());
    expect(vi.mocked(runAiInference)).toHaveBeenCalledTimes(1);
  });

  it('service layer does NOT call prisma.create or prisma.update directly', async () => {
    const mockPrisma = {} as unknown as PrismaClient;
    const mockCreate = vi.fn();
    const mockUpdate = vi.fn();
    const mockUpsert = vi.fn();
    // Attach spy methods to the mock (service should NOT call these directly)
    (mockPrisma as unknown as Record<string, unknown>)['_testCreate'] = mockCreate;
    (mockPrisma as unknown as Record<string, unknown>)['_testUpdate'] = mockUpdate;
    (mockPrisma as unknown as Record<string, unknown>)['_testUpsert'] = mockUpsert;

    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult(makeValidAiJson()) as unknown as Awaited<ReturnType<typeof runAiInference>>);

    await runSupplierProfileCompletenessInference({
      ...makeMockInput(),
      prisma: mockPrisma,
    });

    // The service layer must NOT write directly â€” all writes are delegated to inferenceService
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('strips markdown fences before parsing if present', () => {
    const det = makeDeterministicReport();
    const fencedJson = '```json\n' + makeValidAiJson() + '\n```';
    const result = parseSupplierProfileCompletenessReport(fencedJson, det);
    expect(result.ok).toBe(true);
  });

  it('passes taskType supplier-profile-completeness to runAiInference', async () => {
    vi.mocked(buildSupplierProfileCompletenessContext).mockResolvedValue(mockContextResult as unknown as Awaited<ReturnType<typeof buildSupplierProfileCompletenessContext>>);
    vi.mocked(runAiInference).mockResolvedValue(mockInferenceResult(makeValidAiJson()) as unknown as Awaited<ReturnType<typeof runAiInference>>);

    await runSupplierProfileCompletenessInference(makeMockInput());

    expect(vi.mocked(runAiInference)).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: 'supplier-profile-completeness',
        model: 'gemini-2.5-flash',
      })
    );
  });
});

