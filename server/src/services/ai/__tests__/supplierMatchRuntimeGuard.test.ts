/**
 * supplierMatchRuntimeGuard.test.ts — Runtime Guard Tests
 *
 * Unit tests for SupplierMatchRuntimeGuard (Slice D).
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 §15 test requirements T-14–T-29, T-30.
 *
 * Constitutional verification:
 * - Guard blocks candidates with forbidden JSON keys.
 * - Guard blocks candidates with forbidden text in explanation labels.
 * - Violation records contain field NAMES only — never raw hidden values.
 * - Safe candidates pass through in original order.
 * - Empty input → passed=true.
 * - Deterministic: same input → same output.
 * - No model/inference imports are used by the service.
 */

import { describe, it, expect } from 'vitest';
import {
  guardSupplierMatchOutput,
  getForbiddenGuardFields,
  getForbiddenExplanationFragments,
  GUARD_VERSION,
} from '../supplierMatching/supplierMatchRuntimeGuard.service.js';
import type {
  SupplierMatchCandidate,
  SupplierMatchRuntimeGuardInput,
} from '../supplierMatching/supplierMatch.types.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/** Build a minimal safe buyer-facing candidate (no forbidden fields). */
function makeSafeCandidate(
  supplierOrgId: string,
  overrides?: Partial<SupplierMatchCandidate>,
): SupplierMatchCandidate {
  return {
    supplierOrgId,
    matchCategories: ['MATERIAL_FIT'],
    ...overrides,
  };
}

/** Build a guard input with a single candidate. */
function makeInput(
  candidates: SupplierMatchCandidate[],
  buyerOrgId = 'buyer-org-001',
): SupplierMatchRuntimeGuardInput {
  return { buyerOrgId, candidates };
}

/**
 * Cast an arbitrary object as SupplierMatchCandidate for guard injection testing.
 * Only for use in tests that deliberately inject forbidden fields to verify blocking.
 */
function injectFields(
  base: SupplierMatchCandidate,
  extra: Record<string, unknown>,
): SupplierMatchCandidate {
  return { ...base, ...extra } as unknown as SupplierMatchCandidate;
}

// ─── T-14 — Guard passes safe candidates ─────────────────────────────────────

describe('T-14: Guard passes safe candidates without violations', () => {
  it('single safe candidate passes', () => {
    const result = guardSupplierMatchOutput(
      makeInput([makeSafeCandidate('sup-001')]),
    );
    expect(result.passed).toBe(true);
    expect(result.sanitizedCandidates).toHaveLength(1);
    const first = result.sanitizedCandidates[0];
    if (!first) throw new Error('Expected sanitizedCandidates[0]');
    expect(first.supplierOrgId).toBe('sup-001');
    expect(result.violations).toHaveLength(0);
    expect(result.blockedCandidateCount).toBe(0);
  });

  it('multiple safe candidates all pass', () => {
    const candidates = [
      makeSafeCandidate('sup-001'),
      makeSafeCandidate('sup-002'),
      makeSafeCandidate('sup-003'),
    ];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.passed).toBe(true);
    expect(result.sanitizedCandidates).toHaveLength(3);
    expect(result.blockedCandidateCount).toBe(0);
  });

  it('candidate with safe explanation passes', () => {
    const candidate = makeSafeCandidate('sup-001', {
      explanation: {
        primaryLabel: 'Matches requested material',
        supportingLabels: ['Geography fit'],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── T-15 — Blocks price-like field ──────────────────────────────────────────

describe('T-15: Guard blocks candidates containing price-related fields', () => {
  it('blocks candidate with "price" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { price: 99.5 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    expect(result.sanitizedCandidates).toHaveLength(0);
    expect(result.blockedCandidateCount).toBe(1);
    const v = result.violations.find((v) => v.fieldName === 'price');
    if (v === undefined) throw new Error('Expected violation for fieldName price');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "internalMargin" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { internalMargin: 0.3 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'internalMargin');
    if (v === undefined) throw new Error('Expected violation for fieldName internalMargin');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "costPrice" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-003'), { costPrice: 50 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'costPrice');
    if (v === undefined) throw new Error('Expected violation for fieldName costPrice');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "negotiatedPrice" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-004'), { negotiatedPrice: 45 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'negotiatedPrice');
    if (v === undefined) throw new Error('Expected violation for fieldName negotiatedPrice');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "commercialTerms" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-005'), { commercialTerms: 'NET30' });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'commercialTerms');
    if (v === undefined) throw new Error('Expected violation for fieldName commercialTerms');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });
});

// ─── T-16 — Blocks relationshipState field ────────────────────────────────────

describe('T-16: Guard blocks candidates containing relationshipState field', () => {
  it('blocks candidate with "relationshipState" field', () => {
    const candidate = injectFields(
      makeSafeCandidate('sup-001'),
      { relationshipState: 'APPROVED' },
    );
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'relationshipState');
    if (v === undefined) throw new Error('Expected violation for fieldName relationshipState');
    expect(v.violationReason).toBe('RELATIONSHIP_STATE_LEAK');
  });

  it('blocks candidate with "blockedReason" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { blockedReason: 'FRAUD' });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'blockedReason');
    if (v === undefined) throw new Error('Expected violation for fieldName blockedReason');
    expect(v.violationReason).toBe('RELATIONSHIP_STATE_LEAK');
  });

  it('blocks candidate with "publicationPosture" field', () => {
    const candidate = injectFields(
      makeSafeCandidate('sup-003'),
      { publicationPosture: 'PUBLIC' },
    );
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'publicationPosture');
    if (v === undefined) throw new Error('Expected violation for fieldName publicationPosture');
    expect(v.violationReason).toBe('RELATIONSHIP_STATE_LEAK');
  });
});

// ─── T-17 — Blocks allowlist/graph fields ────────────────────────────────────

describe('T-17: Guard blocks candidates containing allowlist or graph fields', () => {
  it('blocks candidate with "allowlistGraph" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { allowlistGraph: ['org-x'] });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'allowlistGraph');
    if (v === undefined) throw new Error('Expected violation for fieldName allowlistGraph');
    expect(v.violationReason).toBe('ALLOWLIST_GRAPH_LEAK');
  });

  it('blocks candidate with "relationshipGraph" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { relationshipGraph: {} });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'relationshipGraph');
    if (v === undefined) throw new Error('Expected violation for fieldName relationshipGraph');
    expect(v.violationReason).toBe('ALLOWLIST_GRAPH_LEAK');
  });

  it('blocks candidate with "allowlistEntries" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-003'), { allowlistEntries: [] });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'allowlistEntries');
    if (v === undefined) throw new Error('Expected violation for fieldName allowlistEntries');
    expect(v.violationReason).toBe('ALLOWLIST_GRAPH_LEAK');
  });
});

// ─── T-18 — Blocks risk_score / publicationPosture ───────────────────────────

describe('T-18: Guard blocks candidates containing risk or posture fields', () => {
  it('blocks candidate with "risk_score" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { risk_score: 0.7 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'risk_score');
    if (v === undefined) throw new Error('Expected violation for fieldName risk_score');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });

  it('blocks candidate with "riskScore" (camelCase) field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { riskScore: 0.8 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'riskScore');
    if (v === undefined) throw new Error('Expected violation for fieldName riskScore');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });
});

// ─── T-19 — Blocks score/rank/confidence fields ───────────────────────────────

describe('T-19: Guard blocks candidates containing internal score/rank/confidence fields', () => {
  it('blocks candidate with "score" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { score: 42 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'score');
    if (v === undefined) throw new Error('Expected violation for fieldName score');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });

  it('blocks candidate with "rank" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { rank: 1 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'rank');
    if (v === undefined) throw new Error('Expected violation for fieldName rank');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });

  it('blocks candidate with "confidenceScore" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-003'), { confidenceScore: 0.95 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'confidenceScore');
    if (v === undefined) throw new Error('Expected violation for fieldName confidenceScore');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });

  it('blocks candidate with "aiConfidence" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-004'), { aiConfidence: 0.87 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'aiConfidence');
    if (v === undefined) throw new Error('Expected violation for fieldName aiConfidence');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });
});

// ─── T-20 — Blocks AI draft / unpublished evidence fields ────────────────────

describe('T-20: Guard blocks candidates containing AI draft or unpublished DPP fields', () => {
  it('blocks candidate with "aiExtractionDraft" field', () => {
    const candidate = injectFields(
      makeSafeCandidate('sup-001'),
      { aiExtractionDraft: { raw: 'draft text' } },
    );
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'aiExtractionDraft');
    if (v === undefined) throw new Error('Expected violation for fieldName aiExtractionDraft');
    expect(v.violationReason).toBe('AI_DRAFT_LEAK');
  });

  it('blocks candidate with "draftExtraction" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { draftExtraction: 'draft' });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'draftExtraction');
    if (v === undefined) throw new Error('Expected violation for fieldName draftExtraction');
    expect(v.violationReason).toBe('AI_DRAFT_LEAK');
  });

  it('blocks candidate with "unpublishedEvidence" field', () => {
    const candidate = injectFields(
      makeSafeCandidate('sup-003'),
      { unpublishedEvidence: 'cert-draft' },
    );
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'unpublishedEvidence');
    if (v === undefined) throw new Error('Expected violation for fieldName unpublishedEvidence');
    expect(v.violationReason).toBe('UNPUBLISHED_DPP_LEAK');
  });
});

// ─── T-21 — Blocks unsafe explanation: hidden price text ─────────────────────

describe('T-21: Guard blocks candidates with hidden price text in explanation labels', () => {
  it('blocks candidate whose primaryLabel contains "hidden price"', () => {
    const candidate = makeSafeCandidate('sup-001', {
      explanation: {
        primaryLabel: 'Supplier with hidden price advantage',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'explanation.primaryLabel');
    if (v === undefined) throw new Error('Expected violation for fieldName explanation.primaryLabel');
    expect(v.violationReason).toBe('UNSAFE_EXPLANATION');
  });

  it('blocks candidate whose supportingLabel contains "internal margin"', () => {
    const candidate = makeSafeCandidate('sup-002', {
      explanation: {
        primaryLabel: 'Matches requested material',
        supportingLabels: ['High internal margin supplier'],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.labelIndex === 0);
    if (v === undefined) throw new Error('Expected violation for labelIndex 0');
    expect(v.violationReason).toBe('UNSAFE_EXPLANATION');
  });

  it('blocks candidate whose label contains "negotiated price" (case-insensitive)', () => {
    const candidate = makeSafeCandidate('sup-003', {
      explanation: {
        primaryLabel: 'NEGOTIATED PRICE available',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });
});

// ─── T-22 — Blocks unsafe explanation: blocked/rejected/suspended text ────────

describe('T-22: Guard blocks candidates with status state wording in explanation labels', () => {
  it('blocks candidate whose label contains "blocked"', () => {
    const candidate = makeSafeCandidate('sup-001', {
      explanation: {
        primaryLabel: 'Supplier account blocked',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'explanation.primaryLabel');
    if (v === undefined) throw new Error('Expected violation for fieldName explanation.primaryLabel (blocked)');
    expect(v.violationReason).toBe('UNSAFE_EXPLANATION');
  });

  it('blocks candidate whose label contains "rejected"', () => {
    const candidate = makeSafeCandidate('sup-002', {
      explanation: {
        primaryLabel: 'Relationship rejected',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
  });

  it('blocks candidate whose label contains "suspended"', () => {
    const candidate = makeSafeCandidate('sup-003', {
      explanation: {
        primaryLabel: 'Account suspended supplier',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
  });
});

// ─── T-23 — Blocks unsafe explanation: internal score/confidence text ─────────

describe('T-23: Guard blocks candidates with internal score or confidence text in labels', () => {
  it('blocks label containing "score:" text', () => {
    const candidate = makeSafeCandidate('sup-001', {
      explanation: {
        primaryLabel: 'Match score: 0.94',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.violationReason === 'UNSAFE_EXPLANATION');
    expect(v).toBeDefined();
  });

  it('blocks label containing "rank:" text', () => {
    const candidate = makeSafeCandidate('sup-002', {
      explanation: {
        primaryLabel: 'Rank: 1 out of 10',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
  });

  it('blocks label containing "ai confidence" text', () => {
    const candidate = makeSafeCandidate('sup-003', {
      explanation: {
        primaryLabel: 'High AI confidence match',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
  });

  it('blocks label containing "risk score" text', () => {
    const candidate = makeSafeCandidate('sup-004', {
      explanation: {
        primaryLabel: 'Low risk score supplier',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
  });
});

// ─── T-24 — Blocks payment/credit fields ─────────────────────────────────────

describe('T-24: Guard blocks candidates containing payment or credit fields', () => {
  it('blocks candidate with "payment" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { payment: 'net30' });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'payment');
    if (v === undefined) throw new Error('Expected violation for fieldName payment');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "credit" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-002'), { credit: 5000 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'credit');
    if (v === undefined) throw new Error('Expected violation for fieldName credit');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });

  it('blocks candidate with "escrow" field', () => {
    const candidate = injectFields(makeSafeCandidate('sup-003'), { escrow: true });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'escrow');
    if (v === undefined) throw new Error('Expected violation for fieldName escrow');
    expect(v.violationReason).toBe('HIDDEN_PRICE_LEAK');
  });
});

// ─── T-25 — Violation output does not include raw hidden value ────────────────

describe('T-25: Violation records contain fieldName only — never raw field value', () => {
  it('price violation does not expose the price value', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), { price: 123456.78 });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    const violation = result.violations.find((v) => v.fieldName === 'price');
    if (violation === undefined) {
      throw new Error('Expected a price violation but found none');
    }
    // Serialize violation and check no raw price value appears
    const serialized = JSON.stringify(violation);
    expect(serialized).not.toContain('123456');
    expect(serialized).not.toContain('123456.78');
  });

  it('relationshipState violation does not expose the state value', () => {
    const candidate = injectFields(
      makeSafeCandidate('sup-002'),
      { relationshipState: 'BLOCKED' },
    );
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    const violation = result.violations.find((v) => v.fieldName === 'relationshipState');
    if (violation === undefined) {
      throw new Error('Expected a relationshipState violation but found none');
    }
    const serialized = JSON.stringify(violation);
    // The violation reason may contain 'LEAK' but not the raw value 'BLOCKED'
    // (Note: 'RELATIONSHIP_STATE_LEAK' contains 'LEAK', not 'BLOCKED')
    expect(serialized).not.toContain('"BLOCKED"');
  });

  it('explanation label violation does not expose the label text', () => {
    const candidate = makeSafeCandidate('sup-003', {
      explanation: {
        primaryLabel: 'INTERNAL_SECRET_score: 0.99_DO_NOT_SURFACE',
        supportingLabels: [],
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    const violation = result.violations.find((v) => v.fieldName === 'explanation.primaryLabel');
    if (violation === undefined) {
      throw new Error('Expected an explanation label violation but found none');
    }
    const serialized = JSON.stringify(violation);
    expect(serialized).not.toContain('INTERNAL_SECRET');
    expect(serialized).not.toContain('0.99');
  });
});

// ─── T-26 — Preserves order of safe candidates ────────────────────────────────

describe('T-26: Safe candidates are returned in original input order', () => {
  it('three safe candidates in correct order', () => {
    const candidates = [
      makeSafeCandidate('sup-A'),
      makeSafeCandidate('sup-B'),
      makeSafeCandidate('sup-C'),
    ];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.sanitizedCandidates.map((c) => c.supplierOrgId)).toEqual([
      'sup-A',
      'sup-B',
      'sup-C',
    ]);
  });

  it('mixed candidates: blocked ones removed; safe ones retain relative order', () => {
    const candidates = [
      makeSafeCandidate('sup-A'),
      injectFields(makeSafeCandidate('sup-B'), { price: 100 }), // blocked
      makeSafeCandidate('sup-C'),
      injectFields(makeSafeCandidate('sup-D'), { score: 99 }),  // blocked
      makeSafeCandidate('sup-E'),
    ];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.sanitizedCandidates.map((c) => c.supplierOrgId)).toEqual([
      'sup-A',
      'sup-C',
      'sup-E',
    ]);
    expect(result.blockedCandidateCount).toBe(2);
  });
});

// ─── T-27 — Deterministic violation order ─────────────────────────────────────

describe('T-27: Violation order is deterministic for the same input', () => {
  it('same mixed input produces the same violations in the same order', () => {
    const candidates = [
      injectFields(makeSafeCandidate('sup-A'), { price: 50 }),
      makeSafeCandidate('sup-B'),
      injectFields(makeSafeCandidate('sup-C'), { relationshipState: 'BLOCKED' }),
    ];
    const r1 = guardSupplierMatchOutput(makeInput(candidates));
    const r2 = guardSupplierMatchOutput(makeInput(candidates));

    expect(r1.violations.map((v) => v.fieldName)).toEqual(
      r2.violations.map((v) => v.fieldName),
    );
    expect(r1.violations.map((v) => v.violationReason)).toEqual(
      r2.violations.map((v) => v.violationReason),
    );
  });
});

// ─── T-28 — Empty input returns passed=true ───────────────────────────────────

describe('T-28: Empty candidates input returns passed=true with empty output', () => {
  it('empty candidates array', () => {
    const result = guardSupplierMatchOutput(makeInput([]));
    expect(result.passed).toBe(true);
    expect(result.sanitizedCandidates).toHaveLength(0);
    expect(result.blockedCandidateCount).toBe(0);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── T-29 — Determinism guarantee ────────────────────────────────────────────

describe('T-29: Same input always produces identical output (determinism)', () => {
  it('safe candidates: identical result on repeated calls', () => {
    const candidates = [
      makeSafeCandidate('sup-001', {
        explanation: { primaryLabel: 'Matches requested material', supportingLabels: [] },
      }),
      makeSafeCandidate('sup-002'),
    ];
    const input = makeInput(candidates);
    const r1 = guardSupplierMatchOutput(input);
    const r2 = guardSupplierMatchOutput(input);
    expect(r1).toEqual(r2);
  });

  it('blocked candidates: identical violations on repeated calls', () => {
    const candidates = [
      injectFields(makeSafeCandidate('sup-001'), { price: 75, score: 10 }),
    ];
    const input = makeInput(candidates);
    const r1 = guardSupplierMatchOutput(input);
    const r2 = guardSupplierMatchOutput(input);
    expect(r1.violations.length).toBe(r2.violations.length);
    expect(r1.blockedCandidateCount).toBe(r2.blockedCandidateCount);
  });
});

// ─── T-30 — No model/inference imports ───────────────────────────────────────

describe('T-30: Service does not depend on AI provider or embedding infrastructure', () => {
  it('GUARD_VERSION constant is defined (smoke test for import health)', () => {
    expect(GUARD_VERSION).toBeDefined();
    expect(typeof GUARD_VERSION).toBe('string');
  });

  it('guardSupplierMatchOutput is a synchronous function (no async/promise path)', () => {
    const result = guardSupplierMatchOutput(makeInput([]));
    expect(typeof result).toBe('object');
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.passed).toBe(true);
  });
});

// ─── T-31 — Forbidden fields list is complete and accessible ──────────────────

describe('T-31: getForbiddenGuardFields returns populated set of known forbidden keys', () => {
  it('includes price fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('price')).toBe(true);
    expect(fields.has('costPrice')).toBe(true);
    expect(fields.has('negotiatedPrice')).toBe(true);
    expect(fields.has('internalMargin')).toBe(true);
  });

  it('includes relationship/policy fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('relationshipState')).toBe(true);
    expect(fields.has('blockedReason')).toBe(true);
    expect(fields.has('publicationPosture')).toBe(true);
  });

  it('includes allowlist/graph fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('allowlistGraph')).toBe(true);
    expect(fields.has('relationshipGraph')).toBe(true);
  });

  it('includes score/confidence fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('score')).toBe(true);
    expect(fields.has('rank')).toBe(true);
    expect(fields.has('risk_score')).toBe(true);
    expect(fields.has('riskScore')).toBe(true);
    expect(fields.has('aiConfidence')).toBe(true);
  });

  it('includes AI draft and DPP fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('aiExtractionDraft')).toBe(true);
    expect(fields.has('unpublishedEvidence')).toBe(true);
  });

  it('includes payment/financial fields', () => {
    const fields = getForbiddenGuardFields();
    expect(fields.has('payment')).toBe(true);
    expect(fields.has('credit')).toBe(true);
    expect(fields.has('escrow')).toBe(true);
  });
});

// ─── T-32 — Explanation fragments list is accessible ─────────────────────────

describe('T-32: getForbiddenExplanationFragments returns the deny-list', () => {
  it('returns a non-empty array', () => {
    const fragments = getForbiddenExplanationFragments();
    expect(Array.isArray(fragments)).toBe(true);
    expect(fragments.length).toBeGreaterThan(0);
  });

  it('contains key policy state fragments', () => {
    const fragments = getForbiddenExplanationFragments();
    expect(fragments).toContain('blocked');
    expect(fragments).toContain('rejected');
    expect(fragments).toContain('suspended');
  });

  it('contains financial fragments', () => {
    const fragments = getForbiddenExplanationFragments();
    expect(fragments).toContain('hidden price');
    expect(fragments).toContain('internal margin');
    expect(fragments).toContain('negotiated price');
  });

  it('contains score/rank fragments', () => {
    const fragments = getForbiddenExplanationFragments();
    expect(fragments).toContain('score:');
    expect(fragments).toContain('rank:');
    expect(fragments).toContain('ai confidence');
    expect(fragments).toContain('risk score');
  });
});

// ─── T-33 — blockedCandidateCount accuracy ────────────────────────────────────

describe('T-33: blockedCandidateCount matches actual blocked candidates', () => {
  it('is 0 for all-safe input', () => {
    const candidates = [makeSafeCandidate('sup-A'), makeSafeCandidate('sup-B')];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.blockedCandidateCount).toBe(0);
    expect(result.sanitizedCandidates).toHaveLength(2);
  });

  it('is 1 when exactly one candidate is blocked', () => {
    const candidates = [
      makeSafeCandidate('sup-A'),
      injectFields(makeSafeCandidate('sup-B'), { price: 99 }),
    ];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.blockedCandidateCount).toBe(1);
    expect(result.sanitizedCandidates).toHaveLength(1);
  });

  it('is N when all N candidates are blocked', () => {
    const candidates = [
      injectFields(makeSafeCandidate('sup-A'), { score: 1 }),
      injectFields(makeSafeCandidate('sup-B'), { price: 50 }),
    ];
    const result = guardSupplierMatchOutput(makeInput(candidates));
    expect(result.blockedCandidateCount).toBe(2);
    expect(result.sanitizedCandidates).toHaveLength(0);
    expect(result.passed).toBe(false);
  });
});

// ─── T-34 — Nested forbidden field detection ──────────────────────────────────

describe('T-34: Guard detects forbidden fields nested in object properties', () => {
  it('detects forbidden field nested inside a nested object', () => {
    const candidate = injectFields(makeSafeCandidate('sup-001'), {
      metadata: {
        internalData: {
          score: 99, // nested forbidden key
        },
      },
    });
    const result = guardSupplierMatchOutput(makeInput([candidate]));
    expect(result.passed).toBe(false);
    const v = result.violations.find((v) => v.fieldName === 'score');
    if (v === undefined) throw new Error('Expected violation for fieldName score (nested)');
    expect(v.violationReason).toBe('INTERNAL_SCORE_LEAK');
  });
});
