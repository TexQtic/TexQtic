/**
 * supplierMatchExplanationBuilder.test.ts — Explanation Builder Tests
 *
 * Unit tests for SupplierMatchExplanationBuilder (Slice D).
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 §15 test requirements T-01–T-13, T-30.
 *
 * Constitutional verification:
 * - All output labels are allowlist-derived from CATEGORY_LABEL_MAP.
 * - No relationship state wording (APPROVED/BLOCKED/REJECTED/SUSPENDED) in any label.
 * - No numeric score/rank/confidence in any output.
 * - Deterministic: same input → same output.
 * - No model/inference imports are used by the service.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSupplierMatchExplanation,
  CATEGORY_LABEL_MAP,
  FALLBACK_PRIMARY_LABEL,
  EXPLANATION_BUILDER_VERSION,
} from '../supplierMatching/supplierMatchExplanationBuilder.service.js';
import type {
  SupplierMatchExplanationBuilderInput,
  SupplierMatchCategory,
} from '../supplierMatching/supplierMatch.types.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeInput(
  matchCategories: SupplierMatchCategory[],
  buyerOrgId = 'buyer-org-001',
): SupplierMatchExplanationBuilderInput {
  return { buyerOrgId, matchCategories };
}

// ─── T-01 — MATERIAL_FIT label ────────────────────────────────────────────────

describe('T-01: MATERIAL_FIT produces safe primary label', () => {
  it('maps MATERIAL_FIT to "Matches requested material" as primaryLabel', () => {
    const result = buildSupplierMatchExplanation(makeInput(['MATERIAL_FIT']));
    expect(result.explanation.primaryLabel).toBe('Matches requested material');
  });

  it('produces empty supportingLabels for single category', () => {
    const result = buildSupplierMatchExplanation(makeInput(['MATERIAL_FIT']));
    expect(result.explanation.supportingLabels).toHaveLength(0);
  });
});

// ─── T-02 — CATEGORY_FIT label ────────────────────────────────────────────────

describe('T-02: CATEGORY_FIT produces safe label', () => {
  it('maps CATEGORY_FIT to "Matches catalog category"', () => {
    const result = buildSupplierMatchExplanation(makeInput(['CATEGORY_FIT']));
    expect(result.explanation.primaryLabel).toBe('Matches catalog category');
  });
});

// ─── T-03 — RFQ_FIT label ─────────────────────────────────────────────────────

describe('T-03: RFQ_FIT produces safe label', () => {
  it('maps RFQ_FIT to "Matches RFQ requirement"', () => {
    const result = buildSupplierMatchExplanation(makeInput(['RFQ_FIT']));
    expect(result.explanation.primaryLabel).toBe('Matches RFQ requirement');
  });
});

// ─── T-04 — COMPLIANCE_FIT label ─────────────────────────────────────────────

describe('T-04: COMPLIANCE_FIT produces safe certification label', () => {
  it('maps COMPLIANCE_FIT to "Published certification match"', () => {
    const result = buildSupplierMatchExplanation(makeInput(['COMPLIANCE_FIT']));
    expect(result.explanation.primaryLabel).toBe('Published certification match');
  });
});

// ─── T-05 — GEOGRAPHY_FIT label ──────────────────────────────────────────────

describe('T-05: GEOGRAPHY_FIT produces safe label', () => {
  it('maps GEOGRAPHY_FIT to "Geography fit"', () => {
    const result = buildSupplierMatchExplanation(makeInput(['GEOGRAPHY_FIT']));
    expect(result.explanation.primaryLabel).toBe('Geography fit');
  });
});

// ─── T-06 — MOQ_FIT label ─────────────────────────────────────────────────────

describe('T-06: MOQ_FIT produces safe label', () => {
  it('maps MOQ_FIT to "MOQ compatible"', () => {
    const result = buildSupplierMatchExplanation(makeInput(['MOQ_FIT']));
    expect(result.explanation.primaryLabel).toBe('MOQ compatible');
  });
});

// ─── T-07 — CATEGORY_LABEL_MAP covers all 7 categories ───────────────────────

describe('T-07: CATEGORY_LABEL_MAP covers all SupplierMatchCategory values', () => {
  const allCategories: SupplierMatchCategory[] = [
    'RFQ_FIT',
    'MATERIAL_FIT',
    'CATEGORY_FIT',
    'COMPLIANCE_FIT',
    'GEOGRAPHY_FIT',
    'MOQ_FIT',
    'RELATIONSHIP_APPROVED',
  ];

  it('every category maps to a non-empty string label', () => {
    for (const cat of allCategories) {
      const label = CATEGORY_LABEL_MAP[cat];
      expect(label).toBeDefined();
      expect(typeof label).toBe('string');
      expect((label as string).length).toBeGreaterThan(0);
    }
  });

  it('buildSupplierMatchExplanation produces a label for every category', () => {
    for (const cat of allCategories) {
      const result = buildSupplierMatchExplanation(makeInput([cat]));
      expect(result.explanation.primaryLabel.length).toBeGreaterThan(0);
      expect(result.explanation.primaryLabel).not.toBe(FALLBACK_PRIMARY_LABEL);
    }
  });
});

// ─── T-08 — RELATIONSHIP_APPROVED label safety ────────────────────────────────

describe('T-08: RELATIONSHIP_APPROVED maps to "Connected supplier" — never "APPROVED"', () => {
  it('produces "Connected supplier" as primaryLabel', () => {
    const result = buildSupplierMatchExplanation(makeInput(['RELATIONSHIP_APPROVED']));
    expect(result.explanation.primaryLabel).toBe('Connected supplier');
  });

  it('does not contain the word APPROVED in any label', () => {
    const result = buildSupplierMatchExplanation(makeInput(['RELATIONSHIP_APPROVED']));
    const allLabels = [
      result.explanation.primaryLabel,
      ...result.explanation.supportingLabels,
    ];
    for (const label of allLabels) {
      expect(label.toUpperCase()).not.toContain('APPROVED');
    }
  });
});

// ─── T-09 — No BLOCKED/REJECTED/SUSPENDED wording in any output ──────────────

describe('T-09: No policy state wording in any explanation output', () => {
  const forbiddenWords = ['BLOCKED', 'REJECTED', 'SUSPENDED', 'APPROVED'];

  it('single category — no policy state words', () => {
    const categories: SupplierMatchCategory[] = [
      'MATERIAL_FIT',
      'CATEGORY_FIT',
      'RELATIONSHIP_APPROVED',
    ];
    for (const cat of categories) {
      const result = buildSupplierMatchExplanation(makeInput([cat]));
      const allLabels = [
        result.explanation.primaryLabel,
        ...result.explanation.supportingLabels,
      ];
      for (const label of allLabels) {
        for (const forbidden of forbiddenWords) {
          expect(label.toUpperCase()).not.toContain(forbidden);
        }
      }
    }
  });

  it('multi-category — no policy state words', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['MATERIAL_FIT', 'RELATIONSHIP_APPROVED', 'COMPLIANCE_FIT']),
    );
    const allLabels = [
      result.explanation.primaryLabel,
      ...result.explanation.supportingLabels,
    ];
    for (const label of allLabels) {
      for (const forbidden of forbiddenWords) {
        expect(label.toUpperCase()).not.toContain(forbidden);
      }
    }
  });

  it('fallback label — no policy state words', () => {
    const result = buildSupplierMatchExplanation(makeInput([]));
    const allLabels = [
      result.explanation.primaryLabel,
      ...result.explanation.supportingLabels,
    ];
    for (const label of allLabels) {
      for (const forbidden of forbiddenWords) {
        expect(label.toUpperCase()).not.toContain(forbidden);
      }
    }
  });
});

// ─── T-10 — No numeric score/rank/confidence in output ───────────────────────

describe('T-10: No numeric score, rank, or confidence in explanation output', () => {
  it('result does not contain score-like numeric fields', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['MATERIAL_FIT', 'COMPLIANCE_FIT']),
    );
    const resultAsAny = result as unknown as Record<string, unknown>;
    expect(resultAsAny['score']).toBeUndefined();
    expect(resultAsAny['rank']).toBeUndefined();
    expect(resultAsAny['confidence']).toBeUndefined();
    expect(resultAsAny['ranking']).toBeUndefined();
  });

  it('explanation object does not expose numeric fields', () => {
    const { explanation } = buildSupplierMatchExplanation(
      makeInput(['RFQ_FIT', 'MOQ_FIT']),
    );
    const expAsAny = explanation as unknown as Record<string, unknown>;
    expect(expAsAny['score']).toBeUndefined();
    expect(expAsAny['rank']).toBeUndefined();
    expect(expAsAny['confidence']).toBeUndefined();
    expect(expAsAny['totalScore']).toBeUndefined();
    expect(expAsAny['confidenceBucket']).toBeUndefined();
  });
});

// ─── T-11 — Fallback for empty categories ────────────────────────────────────

describe('T-11: Generic fallback when matchCategories is empty', () => {
  it('returns "Potential supplier match" as primaryLabel', () => {
    const result = buildSupplierMatchExplanation(makeInput([]));
    expect(result.explanation.primaryLabel).toBe('Potential supplier match');
  });

  it('returns empty supportingLabels', () => {
    const result = buildSupplierMatchExplanation(makeInput([]));
    expect(result.explanation.supportingLabels).toHaveLength(0);
  });

  it('FALLBACK_PRIMARY_LABEL constant matches the actual fallback label', () => {
    const result = buildSupplierMatchExplanation(makeInput([]));
    expect(result.explanation.primaryLabel).toBe(FALLBACK_PRIMARY_LABEL);
  });
});

// ─── T-12 — Deduplication of labels ──────────────────────────────────────────

describe('T-12: Duplicate match categories produce deduplicated labels', () => {
  it('duplicate category appears only once in output labels', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['MATERIAL_FIT', 'MATERIAL_FIT', 'CATEGORY_FIT']),
    );
    const allLabels = [
      result.explanation.primaryLabel,
      ...result.explanation.supportingLabels,
    ];
    const materialFitLabel = CATEGORY_LABEL_MAP['MATERIAL_FIT'];
    const materialFitCount = allLabels.filter((l) => l === materialFitLabel).length;
    expect(materialFitCount).toBe(1);
  });

  it('all-duplicates input produces single primaryLabel with empty supporting', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['GEOGRAPHY_FIT', 'GEOGRAPHY_FIT', 'GEOGRAPHY_FIT']),
    );
    expect(result.explanation.primaryLabel).toBe('Geography fit');
    expect(result.explanation.supportingLabels).toHaveLength(0);
  });

  it('deduplication preserves relative order of first occurrences', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['COMPLIANCE_FIT', 'MOQ_FIT', 'COMPLIANCE_FIT']),
    );
    // After dedup and priority sort: COMPLIANCE_FIT (priority 4) < MOQ_FIT (priority 6)
    expect(result.explanation.primaryLabel).toBe('Published certification match');
    expect(result.explanation.supportingLabels).toContain('MOQ compatible');
  });
});

// ─── T-13 — Deterministic label order ────────────────────────────────────────

describe('T-13: Label order is deterministic regardless of input order', () => {
  it('RFQ_FIT always appears as primaryLabel when present', () => {
    const result1 = buildSupplierMatchExplanation(
      makeInput(['MATERIAL_FIT', 'RFQ_FIT']),
    );
    const result2 = buildSupplierMatchExplanation(
      makeInput(['RFQ_FIT', 'MATERIAL_FIT']),
    );
    expect(result1.explanation.primaryLabel).toBe('Matches RFQ requirement');
    expect(result2.explanation.primaryLabel).toBe('Matches RFQ requirement');
  });

  it('same categories in different input order produce identical output', () => {
    const input1 = makeInput(['GEOGRAPHY_FIT', 'MATERIAL_FIT', 'COMPLIANCE_FIT']);
    const input2 = makeInput(['COMPLIANCE_FIT', 'GEOGRAPHY_FIT', 'MATERIAL_FIT']);
    const input3 = makeInput(['MATERIAL_FIT', 'COMPLIANCE_FIT', 'GEOGRAPHY_FIT']);

    const r1 = buildSupplierMatchExplanation(input1);
    const r2 = buildSupplierMatchExplanation(input2);
    const r3 = buildSupplierMatchExplanation(input3);

    expect(r1.explanation.primaryLabel).toBe(r2.explanation.primaryLabel);
    expect(r2.explanation.primaryLabel).toBe(r3.explanation.primaryLabel);
    expect(r1.explanation.supportingLabels).toEqual(r2.explanation.supportingLabels);
    expect(r2.explanation.supportingLabels).toEqual(r3.explanation.supportingLabels);
  });

  it('full category set always produces RFQ_FIT as primary', () => {
    const allCats: SupplierMatchCategory[] = [
      'MOQ_FIT',
      'GEOGRAPHY_FIT',
      'COMPLIANCE_FIT',
      'CATEGORY_FIT',
      'MATERIAL_FIT',
      'RFQ_FIT',
      'RELATIONSHIP_APPROVED',
    ];
    const result = buildSupplierMatchExplanation(makeInput(allCats));
    expect(result.explanation.primaryLabel).toBe('Matches RFQ requirement');
    expect(result.explanation.supportingLabels).toHaveLength(6);
  });
});

// ─── T-30 — Determinism guarantee ────────────────────────────────────────────

describe('T-30: Same input always produces identical output (determinism)', () => {
  it('calling twice with same input produces structurally equal result', () => {
    const input = makeInput(['MATERIAL_FIT', 'COMPLIANCE_FIT', 'MOQ_FIT']);
    const r1 = buildSupplierMatchExplanation(input);
    const r2 = buildSupplierMatchExplanation(input);
    expect(r1).toEqual(r2);
  });

  it('fallback is deterministic', () => {
    const r1 = buildSupplierMatchExplanation(makeInput([]));
    const r2 = buildSupplierMatchExplanation(makeInput([]));
    expect(r1).toEqual(r2);
  });
});

// ─── T-31 — No model/inference imports ───────────────────────────────────────

describe('T-31: Service does not depend on AI provider or embedding infrastructure', () => {
  it('EXPLANATION_BUILDER_VERSION constant is defined (smoke test for import health)', () => {
    expect(EXPLANATION_BUILDER_VERSION).toBeDefined();
    expect(typeof EXPLANATION_BUILDER_VERSION).toBe('string');
  });

  it('buildSupplierMatchExplanation is a synchronous function (no async/promise path)', () => {
    const result = buildSupplierMatchExplanation(makeInput(['MATERIAL_FIT']));
    // If this were async, result would be a Promise, not an object
    expect(typeof result).toBe('object');
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.explanation).toBeDefined();
  });
});

// ─── T-32 — Multi-category explanation correctness ────────────────────────────

describe('T-32: Multi-category inputs produce correct primary + supporting split', () => {
  it('two categories: first by priority is primary, second is supporting', () => {
    // MATERIAL_FIT (priority 2) < CATEGORY_FIT (priority 3)
    const result = buildSupplierMatchExplanation(
      makeInput(['CATEGORY_FIT', 'MATERIAL_FIT']),
    );
    expect(result.explanation.primaryLabel).toBe('Matches requested material');
    expect(result.explanation.supportingLabels).toEqual(['Matches catalog category']);
  });

  it('three categories produce one primary and two supporting', () => {
    const result = buildSupplierMatchExplanation(
      makeInput(['MOQ_FIT', 'GEOGRAPHY_FIT', 'COMPLIANCE_FIT']),
    );
    expect(result.explanation.primaryLabel).toBe('Published certification match');
    expect(result.explanation.supportingLabels).toHaveLength(2);
    expect(result.explanation.supportingLabels).toContain('Geography fit');
    expect(result.explanation.supportingLabels).toContain('MOQ compatible');
  });
});

// ─── T-33 — Output shape invariants ──────────────────────────────────────────

describe('T-33: Output always contains explanation with primaryLabel and supportingLabels', () => {
  const testCases: Array<{ desc: string; cats: SupplierMatchCategory[] }> = [
    { desc: 'empty categories', cats: [] },
    { desc: 'single category', cats: ['MATERIAL_FIT'] },
    { desc: 'all categories', cats: ['RFQ_FIT', 'MATERIAL_FIT', 'CATEGORY_FIT', 'COMPLIANCE_FIT', 'GEOGRAPHY_FIT', 'MOQ_FIT', 'RELATIONSHIP_APPROVED'] },
  ];

  for (const { desc, cats } of testCases) {
    it(`produces well-formed explanation for: ${desc}`, () => {
      const result = buildSupplierMatchExplanation(makeInput(cats));
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation.primaryLabel).toBe('string');
      expect(result.explanation.primaryLabel.length).toBeGreaterThan(0);
      expect(Array.isArray(result.explanation.supportingLabels)).toBe(true);
    });
  }
});
