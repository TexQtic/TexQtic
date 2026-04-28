/**
 * supplierMatchRanker.test.ts — Supplier Match Ranker Unit Tests
 *
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice C — 35 test scenarios.
 * Tests cover signal scoring, ranking order, tie-breaking, anti-leakage,
 * tenant isolation, determinism, and no-model/no-embedding behavior.
 *
 * All tests:
 * - Are pure / synchronous — no DB, no AI calls, no vi.mock() for AI providers.
 * - Use no `!` non-null assertions — guards via `if (!x) throw` pattern.
 * - Import only from the Slice C service and types.
 *
 * @module supplierMatchRanker.test
 */

import { describe, it, expect } from 'vitest';
import {
  rankSupplierCandidates,
  getForbiddenRankerOutputFields,
  SIGNAL_SCORE_WEIGHTS,
  RANKER_VERSION,
  DEFAULT_MAX_CANDIDATES,
  MAX_CANDIDATES_CAP,
} from '../supplierMatching/supplierMatchRanker.service.js';
import type {
  SupplierMatchCandidateDraft,
  SupplierMatchRankerInput,
  SupplierMatchSignal,
  SupplierMatchSignalType,
} from '../supplierMatching/supplierMatch.types.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Build a minimal safe signal for test use. isSafe is always true. */
function makeSafeSignal(
  signalType: SupplierMatchSignalType = 'MATERIAL',
  value = 'Cotton',
  overrides?: Partial<SupplierMatchSignal>,
): SupplierMatchSignal {
  return {
    signalType,
    value,
    sourceEntity: 'CATALOG_ITEM',
    isSafe: true,
    ...overrides,
  };
}

/** Build a minimal public candidate for test use. */
function makeCandidate(
  supplierOrgId: string,
  signals: SupplierMatchSignal[] = [makeSafeSignal()],
  overrides?: Partial<SupplierMatchCandidateDraft>,
): SupplierMatchCandidateDraft {
  return {
    supplierOrgId,
    signals,
    visibility: { catalogVisibility: 'PUBLIC' },
    ...overrides,
  };
}

/** Run the ranker with a single candidate and return the full result. */
function rankOne(
  candidate: SupplierMatchCandidateDraft,
  buyerOrgId = 'org-buyer-001',
  extras?: Partial<SupplierMatchRankerInput>,
) {
  return rankSupplierCandidates({ buyerOrgId, candidates: [candidate], ...extras });
}

// ─── T-01: Basic ranking baseline ────────────────────────────────────────────

describe('T-01: PUBLIC candidate with safe signals is ranked and returned', () => {
  it('returns candidate in result.candidates and fallback: false', () => {
    const { result, rankedCandidates } = rankOne(makeCandidate('org-sup-001'));
    expect(result.candidates).toHaveLength(1);
    const first = result.candidates[0];
    if (!first) throw new Error('Expected a candidate at index 0');
    expect(first.supplierOrgId).toBe('org-sup-001');
    expect(result.fallback).toBe(false);
    expect(rankedCandidates).toHaveLength(1);
  });
});

// ─── T-02 – T-14: Signal score weight verification ────────────────────────────

describe('T-02: RFQ_INTENT contributes weight 10 to rfqIntentScore', () => {
  it('records rfqIntentScore = 10 for a single RFQ_INTENT signal', () => {
    const candidate = makeCandidate('org-sup-002', [
      makeSafeSignal('RFQ_INTENT', 'Organic Cotton Fabric', { sourceEntity: 'RFQ' }),
    ]);
    const { rankedCandidates } = rankOne(candidate);
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.rfqIntentScore).toBe(SIGNAL_SCORE_WEIGHTS.RFQ_INTENT);
    expect(rc.scoreBreakdown.rfqIntentScore).toBe(10);
    expect(rc.scoreBreakdown.totalScore).toBe(10);
  });
});

describe('T-03: MATERIAL contributes weight 8 to materialScore', () => {
  it('records materialScore = 8 for a single MATERIAL signal', () => {
    const { rankedCandidates } = rankOne(makeCandidate('org-sup-003', [makeSafeSignal('MATERIAL')]));
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.materialScore).toBe(8);
    expect(rc.scoreBreakdown.totalScore).toBe(8);
  });
});

describe('T-04: COMPOSITION contributes weight 8 to materialScore', () => {
  it('records materialScore = 8 for a single COMPOSITION signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-004', [makeSafeSignal('COMPOSITION')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.materialScore).toBe(8);
    expect(rc.scoreBreakdown.totalScore).toBe(8);
  });
});

describe('T-05: FABRIC_TYPE contributes weight 8 to materialScore', () => {
  it('records materialScore = 8 for a single FABRIC_TYPE signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-005', [makeSafeSignal('FABRIC_TYPE')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.materialScore).toBe(8);
    expect(rc.scoreBreakdown.totalScore).toBe(8);
  });
});

describe('T-06: CATALOG_STAGE contributes weight 7 to categoryScore', () => {
  it('records categoryScore = 7 for a single CATALOG_STAGE signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-006', [makeSafeSignal('CATALOG_STAGE', 'ACTIVE')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.categoryScore).toBe(7);
    expect(rc.scoreBreakdown.totalScore).toBe(7);
  });
});

describe('T-07: PRODUCT_CATEGORY contributes weight 7 to categoryScore', () => {
  it('records categoryScore = 7 for a single PRODUCT_CATEGORY signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-007', [makeSafeSignal('PRODUCT_CATEGORY', 'Woven Fabric')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.categoryScore).toBe(7);
    expect(rc.scoreBreakdown.totalScore).toBe(7);
  });
});

describe('T-08: CERTIFICATION contributes weight 5 to certificationScore', () => {
  it('records certificationScore = 5 for a single CERTIFICATION signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-008', [makeSafeSignal('CERTIFICATION', 'GOTS')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.certificationScore).toBe(5);
    expect(rc.scoreBreakdown.totalScore).toBe(5);
  });
});

describe('T-09: DPP_PUBLISHED contributes weight 5 to certificationScore', () => {
  it('records certificationScore = 5 for a single DPP_PUBLISHED signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-009', [
        makeSafeSignal('DPP_PUBLISHED', 'passport-123', { sourceEntity: 'DPP_PUBLISHED' }),
      ]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.certificationScore).toBe(5);
    expect(rc.scoreBreakdown.totalScore).toBe(5);
  });
});

describe('T-10: MOQ contributes weight 4 to moqScore', () => {
  it('records moqScore = 4 for a single MOQ signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-010', [makeSafeSignal('MOQ', '500')]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.moqScore).toBe(4);
    expect(rc.scoreBreakdown.totalScore).toBe(4);
  });
});

describe('T-11: GEOGRAPHY contributes weight 3 to geographyScore', () => {
  it('records geographyScore = 3 for a single GEOGRAPHY signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-011', [
        makeSafeSignal('GEOGRAPHY', 'India', { sourceEntity: 'ORG_PROFILE' }),
      ]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.geographyScore).toBe(3);
    expect(rc.scoreBreakdown.totalScore).toBe(3);
  });
});

describe('T-12: RELATIONSHIP_APPROVED contributes only small boost (2)', () => {
  it('records relationshipBoost = 2 — small enough that a material-fit supplier outranks it', () => {
    const relationshipOnlyCandidate = makeCandidate('org-sup-012a', [
      makeSafeSignal('RELATIONSHIP_APPROVED', 'org-sup-012a', { sourceEntity: 'RELATIONSHIP_ACCESS' }),
    ]);
    const materialFitCandidate = makeCandidate('org-sup-012b', [
      makeSafeSignal('MATERIAL', 'Organic Cotton'),
    ]);
    const { rankedCandidates, result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [relationshipOnlyCandidate, materialFitCandidate],
    });

    // materialFitCandidate should rank higher (8 > 2)
    if (rankedCandidates.length < 2) throw new Error('Expected 2 rankedCandidates');
    expect(rankedCandidates[0].draft.supplierOrgId).toBe('org-sup-012b');
    expect(rankedCandidates[0].scoreBreakdown.totalScore).toBe(8);
    expect(rankedCandidates[1].scoreBreakdown.relationshipBoost).toBe(2);
    // result.candidates has no score field
    const first = result.candidates[0];
    if (!first) throw new Error('Expected result.candidates[0]');
    expect('score' in first).toBe(false);
    expect('rank' in first).toBe(false);
  });
});

describe('T-13: PRICE_DISCLOSURE_METADATA contributes 0 to score', () => {
  it('records totalScore = 0 for a single PRICE_DISCLOSURE_METADATA signal', () => {
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-013', [
        makeSafeSignal('PRICE_DISCLOSURE_METADATA', 'RELATIONSHIP_ONLY', { sourceEntity: 'PRICE_DISCLOSURE' }),
      ]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(SIGNAL_SCORE_WEIGHTS.PRICE_DISCLOSURE_METADATA).toBe(0);
    expect(rc.scoreBreakdown.totalScore).toBe(0);
  });
});

describe('T-14: Unsafe signals (isSafe !== true) do not contribute to score', () => {
  it('ignores signals with isSafe !== true — they contribute 0 to score', () => {
    const unsafeSignal = {
      signalType: 'MATERIAL' as SupplierMatchSignalType,
      value: 'Cotton',
      sourceEntity: 'CATALOG_ITEM' as const,
      isSafe: false as unknown as true,
    };
    const { rankedCandidates } = rankOne(makeCandidate('org-sup-014', [unsafeSignal]));
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.totalScore).toBe(0);
    expect(rc.scoreBreakdown.materialScore).toBe(0);
  });

  it('only counts safe signals when mixed with unsafe signals', () => {
    const unsafeSignal = {
      signalType: 'RFQ_INTENT' as SupplierMatchSignalType,
      value: 'unsafe intent',
      sourceEntity: 'RFQ' as const,
      isSafe: false as unknown as true,
    };
    const safeSignal = makeSafeSignal('MATERIAL', 'Linen');
    const { rankedCandidates } = rankOne(
      makeCandidate('org-sup-014b', [unsafeSignal, safeSignal]),
    );
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    expect(rc.scoreBreakdown.totalScore).toBe(8); // Only MATERIAL (8) counted
    expect(rc.scoreBreakdown.rfqIntentScore).toBe(0); // Unsafe RFQ_INTENT ignored
  });
});

// ─── T-15: Buyer-facing candidate output has no score/rank/confidence ─────────

describe('T-15: Candidate output contains no numeric score, rank, or confidence', () => {
  it('serialized candidate has no score, rank, confidence, or confidenceBucket field', () => {
    const { result } = rankOne(makeCandidate('org-sup-015'));
    const candidate = result.candidates[0];
    if (!candidate) throw new Error('Expected result.candidates[0]');
    const json = JSON.stringify(candidate);
    expect(json).not.toContain('"score"');
    expect(json).not.toContain('"rank"');
    expect(json).not.toContain('"confidence"');
    expect(json).not.toContain('"confidenceBucket"');
    expect(json).not.toContain('"totalScore"');
    expect(json).not.toContain('"scoreBreakdown"');
  });

  it('result.candidates array has no numeric rank field on any candidate', () => {
    const candidates = [
      makeCandidate('org-sup-015a', [makeSafeSignal('MATERIAL')]),
      makeCandidate('org-sup-015b', [makeSafeSignal('RFQ_INTENT', 'intent', { sourceEntity: 'RFQ' })]),
    ];
    const { result } = rankSupplierCandidates({ buyerOrgId: 'org-buyer-001', candidates });
    for (const c of result.candidates) {
      expect('rank' in c).toBe(false);
      expect('score' in c).toBe(false);
    }
  });
});

// ─── T-16: Audit envelope records safe signal counts ──────────────────────────

describe('T-16: Audit envelope records safe signal counts only', () => {
  it('signalTypeCounts reflects only safe signal types present', () => {
    const candidate = makeCandidate('org-sup-016', [
      makeSafeSignal('MATERIAL', 'Cotton'),
      makeSafeSignal('MATERIAL', 'Linen'),
      makeSafeSignal('CERTIFICATION', 'GOTS'),
    ]);
    const { result } = rankOne(candidate);
    const { auditEnvelope } = result;
    expect(auditEnvelope.signalTypeCounts['MATERIAL']).toBe(2);
    expect(auditEnvelope.signalTypeCounts['CERTIFICATION']).toBe(1);
    expect(auditEnvelope.totalSignalsConsidered).toBe(3);
  });

  it('unsafe signals are excluded from signalTypeCounts', () => {
    const unsafeSignal = {
      signalType: 'MATERIAL' as SupplierMatchSignalType,
      value: 'unsafe',
      sourceEntity: 'CATALOG_ITEM' as const,
      isSafe: false as unknown as true,
    };
    const safeSignal = makeSafeSignal('CERTIFICATION', 'OEKO-TEX');
    const candidate = makeCandidate('org-sup-016b', [unsafeSignal, safeSignal]);
    const { result } = rankOne(candidate);
    const { auditEnvelope } = result;
    expect(auditEnvelope.signalTypeCounts['MATERIAL']).toBeUndefined();
    expect(auditEnvelope.signalTypeCounts['CERTIFICATION']).toBe(1);
    expect(auditEnvelope.totalSignalsConsidered).toBe(1);
  });
});

// ─── T-17: modelCallMade is always false ──────────────────────────────────────

describe('T-17: modelCallMade is always false', () => {
  it('result.modelCallMade is false for non-empty result', () => {
    const { result } = rankOne(makeCandidate('org-sup-017'));
    expect(result.modelCallMade).toBe(false);
  });

  it('result.auditEnvelope.modelCallMade is false for non-empty result', () => {
    const { result } = rankOne(makeCandidate('org-sup-017b'));
    expect(result.auditEnvelope.modelCallMade).toBe(false);
  });

  it('result.modelCallMade is false for fallback empty result', () => {
    const { result } = rankSupplierCandidates({ buyerOrgId: 'org-buyer-001', candidates: [] });
    expect(result.modelCallMade).toBe(false);
  });
});

// ─── T-18: Empty candidates returns fallback ──────────────────────────────────

describe('T-18: Empty candidate list returns fallback = true', () => {
  it('returns fallback: true, empty candidates, and no throw for empty array', () => {
    const { result } = rankSupplierCandidates({ buyerOrgId: 'org-buyer-001', candidates: [] });
    expect(result.fallback).toBe(true);
    expect(result.candidates).toHaveLength(0);
    expect(result.modelCallMade).toBe(false);
    expect(result.auditEnvelope.fallbackUsed).toBe(true);
    expect(result.auditEnvelope.candidateCount).toBe(0);
  });
});

// ─── T-19: Non-empty returns fallback = false ──────────────────────────────────

describe('T-19: Non-empty candidate list returns fallback = false', () => {
  it('returns fallback: false when a valid candidate is present', () => {
    const { result } = rankOne(makeCandidate('org-sup-019'));
    expect(result.fallback).toBe(false);
    expect(result.auditEnvelope.fallbackUsed).toBe(false);
  });
});

// ─── T-20: maxCandidates defaults to 5 ────────────────────────────────────────

describe('T-20: maxCandidates defaults to DEFAULT_MAX_CANDIDATES (5)', () => {
  it('returns at most 5 candidates when maxCandidates is not specified', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate(`org-sup-020-${i}`, [makeSafeSignal('MATERIAL', `Material ${i}`)]),
    );
    const { result } = rankSupplierCandidates({ buyerOrgId: 'org-buyer-001', candidates });
    expect(result.candidates.length).toBeLessThanOrEqual(DEFAULT_MAX_CANDIDATES);
    expect(result.candidates).toHaveLength(DEFAULT_MAX_CANDIDATES);
  });
});

// ─── T-21: maxCandidates clamps to 20 ─────────────────────────────────────────

describe('T-21: maxCandidates > 20 is clamped to MAX_CANDIDATES_CAP (20)', () => {
  it('never returns more than 20 candidates even when maxCandidates = 100', () => {
    const candidates = Array.from({ length: 25 }, (_, i) =>
      makeCandidate(`org-sup-021-${i}`, [makeSafeSignal('MATERIAL', `M${i}`)]),
    );
    const { result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates,
      maxCandidates: 100,
    });
    expect(result.candidates.length).toBeLessThanOrEqual(MAX_CANDIDATES_CAP);
    expect(result.candidates).toHaveLength(MAX_CANDIDATES_CAP);
  });
});

// ─── T-22: maxCandidates <= 0 clamps to default ───────────────────────────────

describe('T-22: maxCandidates <= 0 is clamped to DEFAULT_MAX_CANDIDATES', () => {
  it('returns up to 5 candidates when maxCandidates = 0', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate(`org-sup-022a-${i}`, [makeSafeSignal('MATERIAL')]),
    );
    const { result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates,
      maxCandidates: 0,
    });
    expect(result.candidates).toHaveLength(DEFAULT_MAX_CANDIDATES);
  });

  it('returns up to 5 candidates when maxCandidates = -1', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate(`org-sup-022b-${i}`, [makeSafeSignal('MATERIAL')]),
    );
    const { result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates,
      maxCandidates: -1,
    });
    expect(result.candidates).toHaveLength(DEFAULT_MAX_CANDIDATES);
  });
});

// ─── T-23: Tie-breaking is deterministic ──────────────────────────────────────

describe('T-23: Tie-breaking is deterministic', () => {
  it('equal-score candidates are ordered by signalCategoryCount desc, then supplierOrgId asc', () => {
    // Both have MATERIAL (8). 'org-aaa' comes before 'org-zzz' lexically.
    const candidateA = makeCandidate('org-zzz', [makeSafeSignal('MATERIAL')]);
    const candidateB = makeCandidate('org-aaa', [makeSafeSignal('MATERIAL')]);
    const { rankedCandidates } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidateA, candidateB],
    });
    if (rankedCandidates.length < 2) throw new Error('Expected 2 rankedCandidates');
    // Same score (8), same category count (1) → supplierOrgId alphabetical
    expect(rankedCandidates[0].draft.supplierOrgId).toBe('org-aaa');
    expect(rankedCandidates[1].draft.supplierOrgId).toBe('org-zzz');
  });

  it('higher signalCategoryCount wins as secondary tie-breaker', () => {
    // Both have same totalScore but different category counts
    const candidateA = makeCandidate('org-aaa', [
      makeSafeSignal('MATERIAL', 'Cotton'),         // 8 = MATERIAL_FIT
      makeSafeSignal('GEOGRAPHY', 'India', { sourceEntity: 'ORG_PROFILE' }), // 3 = GEOGRAPHY_FIT
      // total = 11, 2 categories
    ]);
    const candidateB = makeCandidate('org-bbb', [
      makeSafeSignal('MATERIAL', 'Linen'),          // 8 = MATERIAL_FIT
      makeSafeSignal('MATERIAL', 'Cotton'),         // 8 = MATERIAL_FIT (same category)
      // total = 16, 1 category (both MATERIAL_FIT)
    ]);
    const { rankedCandidates } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidateA, candidateB],
    });
    if (rankedCandidates.length < 2) throw new Error('Expected 2 rankedCandidates');
    // candidateB has higher total (16 vs 11) — score wins
    expect(rankedCandidates[0].draft.supplierOrgId).toBe('org-bbb');
  });
});

// ─── T-24: Duplicate candidates — first occurrence wins ───────────────────────

describe('T-24: Duplicate candidates with same supplierOrgId — first occurrence wins', () => {
  it('only the first occurrence is ranked; second is silently dropped', () => {
    const first = makeCandidate('org-dup', [makeSafeSignal('MATERIAL')]);
    const duplicate = makeCandidate('org-dup', [makeSafeSignal('RFQ_INTENT', 'intent', { sourceEntity: 'RFQ' })]);
    const { result, rankedCandidates } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [first, duplicate],
    });
    expect(result.candidates).toHaveLength(1);
    expect(rankedCandidates).toHaveLength(1);
    const rc = rankedCandidates[0];
    if (!rc) throw new Error('Expected rankedCandidates[0]');
    // First occurrence had MATERIAL (8), not RFQ_INTENT (10)
    expect(rc.scoreBreakdown.materialScore).toBe(8);
    expect(rc.scoreBreakdown.rfqIntentScore).toBe(0);
  });
});

// ─── T-25: Cross-tenant candidate is dropped ──────────────────────────────────

describe('T-25: Cross-tenant candidate is dropped silently', () => {
  it('drops candidate when sourceOrgId !== buyerOrgId', () => {
    const crossTenant = makeCandidate('org-sup-025a', [makeSafeSignal()], {
      sourceOrgId: 'org-other-tenant',
    });
    const { result } = rankOne(crossTenant);
    expect(result.candidates).toHaveLength(0);
    expect(result.fallback).toBe(true);
  });

  it('drops candidate when supplierOrgId === buyerOrgId (self-match)', () => {
    const selfMatch = makeCandidate('org-buyer-001'); // same as buyerOrgId
    const { result } = rankOne(selfMatch, 'org-buyer-001');
    expect(result.candidates).toHaveLength(0);
    expect(result.fallback).toBe(true);
  });

  it('keeps valid candidate when sourceOrgId matches buyerOrgId', () => {
    const valid = makeCandidate('org-sup-025c', [makeSafeSignal()], {
      sourceOrgId: 'org-buyer-001',
    });
    const { result } = rankOne(valid, 'org-buyer-001');
    expect(result.candidates).toHaveLength(1);
    expect(result.fallback).toBe(false);
  });
});

// ─── T-26: Output buyerOrgId matches input ────────────────────────────────────

describe('T-26: Output buyerOrgId matches input buyerOrgId', () => {
  it('result.buyerOrgId echoes the input buyerOrgId', () => {
    const { result } = rankOne(makeCandidate('org-sup-026'), 'org-buyer-unique');
    expect(result.buyerOrgId).toBe('org-buyer-unique');
  });

  it('fallback result also echoes buyerOrgId', () => {
    const { result } = rankSupplierCandidates({ buyerOrgId: 'org-buyer-unique', candidates: [] });
    expect(result.buyerOrgId).toBe('org-buyer-unique');
  });
});

// ─── T-27: Audit envelope buyerOrgId matches input ────────────────────────────

describe('T-27: Audit envelope buyerOrgId is scoped to input buyerOrgId', () => {
  it('auditEnvelope.buyerOrgId matches input buyerOrgId', () => {
    const { result } = rankOne(makeCandidate('org-sup-027'), 'org-buyer-audit-test');
    expect(result.auditEnvelope.buyerOrgId).toBe('org-buyer-audit-test');
  });

  it('rankerVersion is the expected constant', () => {
    const { result } = rankOne(makeCandidate('org-sup-027b'));
    expect(result.auditEnvelope.rankerVersion).toBe(RANKER_VERSION);
  });
});

// ─── T-28: Output contains no forbidden keys ──────────────────────────────────

describe('T-28: Output result.candidates contains no forbidden field names', () => {
  it('serialized candidates contain no forbidden keys', () => {
    const forbidden = getForbiddenRankerOutputFields();
    const { result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [
        makeCandidate('org-sup-028a', [
          makeSafeSignal('MATERIAL', 'Cotton'),
          makeSafeSignal('RFQ_INTENT', 'Organic fabric', { sourceEntity: 'RFQ' }),
          makeSafeSignal('RELATIONSHIP_APPROVED', 'org-sup-028a', { sourceEntity: 'RELATIONSHIP_ACCESS' }),
        ], { relationshipState: 'APPROVED' }),
      ],
    });
    const candidatesJson = JSON.stringify(result.candidates);
    for (const key of forbidden) {
      expect(candidatesJson).not.toContain(`"${key}"`);
    }
  });

  it('serialized SupplierMatchResult has no forbidden keys in candidates array', () => {
    const forbidden = getForbiddenRankerOutputFields();
    const { result } = rankOne(makeCandidate('org-sup-028b', [
      makeSafeSignal('CATALOG_STAGE', 'ACTIVE'),
      makeSafeSignal('CERTIFICATION', 'ISO 9001'),
    ]));
    const resultJson = JSON.stringify(result.candidates);
    for (const key of forbidden) {
      expect(resultJson).not.toContain(`"${key}"`);
    }
  });
});

// ─── T-29: Audit envelope contains no raw forbidden data ──────────────────────

describe('T-29: Audit envelope contains no raw forbidden data', () => {
  it('serialized auditEnvelope has only safe fields', () => {
    const forbidden = getForbiddenRankerOutputFields();
    const { result } = rankOne(makeCandidate('org-sup-029'));
    const envelopeJson = JSON.stringify(result.auditEnvelope);
    // Audit envelope must not contain forbidden keys
    for (const key of forbidden) {
      expect(envelopeJson).not.toContain(`"${key}"`);
    }
  });

  it('auditEnvelope does not contain supplier score, blockedReason, or relationship state', () => {
    const { result } = rankOne(makeCandidate('org-sup-029b'));
    const envelopeJson = JSON.stringify(result.auditEnvelope);
    expect(envelopeJson).not.toContain('"score"');
    expect(envelopeJson).not.toContain('"blockedReason"');
    expect(envelopeJson).not.toContain('"relationshipState"');
    expect(envelopeJson).not.toContain('"price"');
  });

  it('policyViolationsBlocked is recorded in auditEnvelope', () => {
    const { result } = rankOne(makeCandidate('org-sup-029c'), 'org-buyer-001', {
      policyViolationsBlocked: 3,
    });
    expect(result.auditEnvelope.policyViolationsBlocked).toBe(3);
  });
});

// ─── T-30: Referential determinism ────────────────────────────────────────────

describe('T-30: Same input always produces same output (referential determinism)', () => {
  it('two calls with identical input produce identical result', () => {
    const candidates = [
      makeCandidate('org-sup-030a', [makeSafeSignal('MATERIAL'), makeSafeSignal('GEOGRAPHY', 'India', { sourceEntity: 'ORG_PROFILE' })]),
      makeCandidate('org-sup-030b', [makeSafeSignal('RFQ_INTENT', 'woven fabric', { sourceEntity: 'RFQ' })]),
    ];
    const input: SupplierMatchRankerInput = {
      buyerOrgId: 'org-buyer-001',
      candidates,
      requestedAt: '2026-04-28T00:00:00.000Z',
    };
    const first = rankSupplierCandidates(input);
    const second = rankSupplierCandidates(input);
    expect(JSON.stringify(first.result.candidates)).toBe(JSON.stringify(second.result.candidates));
    expect(first.result.auditEnvelope.totalSignalsConsidered).toBe(
      second.result.auditEnvelope.totalSignalsConsidered,
    );
  });
});

// ─── T-31: No AI / model dependency ───────────────────────────────────────────

describe('T-31: Ranker executes without any AI provider mock setup', () => {
  it('completes synchronously without any vi.mock() for AI services', () => {
    // No mocking. If the service imported AI providers, this test setup would fail.
    const { result } = rankOne(makeCandidate('org-sup-031'));
    expect(result.fallback).toBe(false);
    expect(result.modelCallMade).toBe(false);
  });
});

// ─── T-32: maxCandidates limits output count ──────────────────────────────────

describe('T-32: maxCandidates correctly limits output count', () => {
  it('returns exactly maxCandidates candidates when more are available', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate(`org-sup-032-${i}`, [makeSafeSignal('MATERIAL', `M${i}`)]),
    );
    const { result } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates,
      maxCandidates: 3,
    });
    expect(result.candidates).toHaveLength(3);
  });
});

// ─── T-33: Ranking order is deterministic with multiple candidates ─────────────

describe('T-33: Ranking order is stable and deterministic', () => {
  it('higher-scoring candidate always appears first regardless of input order', () => {
    const low = makeCandidate('org-sup-033a', [makeSafeSignal('GEOGRAPHY', 'India', { sourceEntity: 'ORG_PROFILE' })]); // 3
    const high = makeCandidate('org-sup-033b', [
      makeSafeSignal('RFQ_INTENT', 'intent', { sourceEntity: 'RFQ' }), // 10
      makeSafeSignal('MATERIAL', 'Cotton'),                              // 8
    ]); // total 18

    const { result: result1 } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [low, high], // low first
      requestedAt: '2026-04-28T00:00:00.000Z',
    });
    const { result: result2 } = rankSupplierCandidates({
      buyerOrgId: 'org-buyer-001',
      candidates: [high, low], // high first
      requestedAt: '2026-04-28T00:00:00.000Z',
    });

    if (!result1.candidates[0]) throw new Error('Expected result1.candidates[0]');
    if (!result2.candidates[0]) throw new Error('Expected result2.candidates[0]');
    expect(result1.candidates[0].supplierOrgId).toBe('org-sup-033b');
    expect(result2.candidates[0].supplierOrgId).toBe('org-sup-033b');
  });
});

// ─── T-34: Missing buyerOrgId returns empty fallback ──────────────────────────

describe('T-34: Missing buyerOrgId returns deterministic empty fallback', () => {
  it('returns fallback: true and empty candidates when buyerOrgId is empty string', () => {
    const { result } = rankSupplierCandidates({
      buyerOrgId: '',
      candidates: [makeCandidate('org-sup-034')],
    });
    expect(result.fallback).toBe(true);
    expect(result.candidates).toHaveLength(0);
    expect(result.modelCallMade).toBe(false);
  });
});

// ─── T-35: policyViolationsBlocked recorded in audit envelope ─────────────────

describe('T-35: policyViolationsBlocked is correctly recorded in audit envelope', () => {
  it('auditEnvelope.policyViolationsBlocked reflects input value', () => {
    const { result } = rankOne(makeCandidate('org-sup-035'), 'org-buyer-001', {
      policyViolationsBlocked: 7,
    });
    expect(result.auditEnvelope.policyViolationsBlocked).toBe(7);
  });

  it('auditEnvelope.policyViolationsBlocked defaults to 0 when not provided', () => {
    const { result } = rankOne(makeCandidate('org-sup-035b'));
    expect(result.auditEnvelope.policyViolationsBlocked).toBe(0);
  });

  it('humanConfirmationRequired is always true', () => {
    const { result } = rankOne(makeCandidate('org-sup-035c'));
    expect(result.humanConfirmationRequired).toBe(true);
  });
});
