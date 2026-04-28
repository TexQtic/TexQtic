/**
 * supplierMatchRfqIntent.test.ts — Slice E: RFQ Intent Supplier Matching Service
 *
 * Tests TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice E.
 *
 * Coverage:
 * TC-01  RFQ intent signals built from safe rfqContext
 * TC-02  RFQ signals injected into candidate signals non-mutably
 * TC-03  Policy filter applied with isRfqContextual: true
 * TC-04  Forbidden supplier excluded via policyContext
 * TC-05  Explanation builder produces safe labels on ranked candidates
 * TC-06  Runtime guard runs — clean output produces no violations
 * TC-07  OPEN_TO_ALL candidate passes and appears in result
 * TC-08  APPROVED_BUYERS_ONLY RFQ requires APPROVED relationship
 * TC-09  BLOCKED supplier excluded
 * TC-10  SUSPENDED supplier excluded
 * TC-11  REJECTED supplier excluded
 * TC-12  APPROVED_BUYER_ONLY catalog requires APPROVED relationship
 * TC-13  HIDDEN catalog candidate excluded
 * TC-14  DPP_PUBLISHED signal stripped when dppPublished is false
 * TC-15  AI draft fields absent from result candidates
 * TC-16  Price and monetary fields absent from result candidates
 * TC-17  Relationship-only price does not grant eligibility gate bypass
 * TC-18  Cross-tenant candidate (sourceOrgId mismatch) excluded
 * TC-19  Buyer self-match excluded (supplierOrgId === buyerOrgId)
 * TC-20  Multiple candidates ranked — higher-signal candidate ranks first
 * TC-21  Empty candidateDrafts returns structured fallback result
 * TC-22  No safe candidates returns structured fallback result
 * TC-23  maxCandidates respected in ranked result
 * TC-24  Explanation primaryLabel is from safe allowlist only
 * TC-25  Audit envelope contains no forbidden fields
 * TC-26  modelCallMade is always false
 * TC-27  Result candidates contain no forbidden top-level keys
 * TC-28  Deterministic: same input with same requestedAt produces same output
 * TC-29  RFQ_INTENT_SERVICE_VERSION constant is exported and stable
 */

import { describe, it, expect } from 'vitest';
import {
  matchSuppliersForRfqIntent,
  RFQ_INTENT_SERVICE_VERSION,
} from '../services/ai/supplierMatching/supplierMatchRfqIntent.service.js';
import type {
  SupplierMatchRfqIntentInput,
  SupplierMatchCandidateDraft,
  SupplierMatchVisibilityContext,
  SupplierMatchSignal,
} from '../services/ai/supplierMatching/supplierMatch.types.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const BUYER = 'org-buyer-001';
const SUP_A = 'org-supplier-a';
const SUP_B = 'org-supplier-b';
const SUP_C = 'org-supplier-c';
const REQ_AT = '2025-01-01T00:00:00.000Z';

const OPEN_VIS: SupplierMatchVisibilityContext = {
  catalogVisibility: 'PUBLIC',
  rfqAcceptanceMode: 'OPEN_TO_ALL',
};

const APPROVED_ONLY_VIS: SupplierMatchVisibilityContext = {
  catalogVisibility: 'APPROVED_BUYER_ONLY',
  rfqAcceptanceMode: 'OPEN_TO_ALL',
};

const HIDDEN_VIS: SupplierMatchVisibilityContext = {
  catalogVisibility: 'HIDDEN',
};

const RFQ_APPROVED_ONLY_VIS: SupplierMatchVisibilityContext = {
  catalogVisibility: 'PUBLIC',
  rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
};


/** A safe CATALOG_STAGE signal that marks a supplier as active. */
function makeCatalogSignal(supplierOrgId: string): SupplierMatchSignal {
  return {
    signalType: 'CATALOG_STAGE',
    value: 'ACTIVE',
    sourceEntity: 'CATALOG_ITEM',
    sourceId: supplierOrgId,
    isSafe: true,
  };
}

/** A safe MATERIAL signal. */
function makeMaterialSignal(material: string): SupplierMatchSignal {
  return {
    signalType: 'MATERIAL',
    value: material,
    sourceEntity: 'CATALOG_ITEM',
    isSafe: true,
  };
}

/** A safe DPP_PUBLISHED signal. */
function makeDppSignal(): SupplierMatchSignal {
  return {
    signalType: 'DPP_PUBLISHED',
    value: 'dpp-ref-001',
    sourceEntity: 'DPP_PUBLISHED',
    isSafe: true,
  };
}

/** Build a minimal candidate draft with the given visibility. */
function makeDraft(
  supplierOrgId: string,
  visibility: SupplierMatchVisibilityContext,
  options: {
    signals?: SupplierMatchSignal[];
    relationshipState?: SupplierMatchCandidateDraft['relationshipState'];
    sourceOrgId?: string;
    candidateId?: string;
  } = {},
): SupplierMatchCandidateDraft {
  const draft: SupplierMatchCandidateDraft = {
    supplierOrgId,
    visibility,
    signals: options.signals ?? [makeCatalogSignal(supplierOrgId)],
  };
  if (options.relationshipState !== undefined) {
    draft.relationshipState = options.relationshipState;
  }
  if (options.sourceOrgId !== undefined) {
    draft.sourceOrgId = options.sourceOrgId;
  }
  if (options.candidateId !== undefined) {
    draft.candidateId = options.candidateId;
  }
  return draft;
}

/** Build a minimal service input. */
function makeInput(
  buyerOrgId: string,
  candidateDrafts: SupplierMatchCandidateDraft[],
  rfqOverrides: Partial<SupplierMatchRfqIntentInput['rfqContext']> = {},
  opts: Partial<Omit<SupplierMatchRfqIntentInput, 'buyerOrgId' | 'candidateDrafts' | 'rfqContext'>> = {},
): SupplierMatchRfqIntentInput {
  return {
    buyerOrgId,
    rfqContext: {
      rfqId: 'rfq-001',
      productCategory: 'Woven Fabric',
      material: 'Organic Cotton',
      deliveryRegion: 'EU',
      ...rfqOverrides,
    },
    candidateDrafts,
    requestedAt: REQ_AT,
    requestId: 'req-001',
    ...opts,
  };
}

// ─── Safe label allowlist (mirrors CATEGORY_LABEL_MAP from Slice D) ───────────
const SAFE_LABELS = new Set<string>([
  'Matches RFQ requirement',
  'Matches requested material',
  'Matches catalog category',
  'Published certification match',
  'Geography fit',
  'MOQ compatible',
  'Connected supplier',
  'Potential supplier match',
]);

// ─── Forbidden top-level keys for buyer-facing candidates ─────────────────────
const FORBIDDEN_CANDIDATE_KEYS = new Set<string>([
  'price', 'amount', 'unitPrice', 'basePrice', 'listPrice', 'costPrice',
  'supplierPrice', 'negotiatedPrice', 'internalMargin', 'margin', 'grossAmount',
  'commercialTerms', 'riskScore', 'risk_score', 'buyerScore', 'supplierScore',
  'aiMatchingScore', 'confidenceScore', 'score', 'rank', 'ranking',
  'blockedReason', 'rejectedReason', 'auditMetadata', 'privateNotes',
  'allowlistGraph', 'relationshipGraph', 'aiDraftData', 'aiExtractionDraft',
  'draftExtraction', 'unpublishedEvidence', 'escrow', 'paymentTerms', 'creditLimit',
  'relationshipState', 'confidenceBucket', 'scoreBreakdown',
]);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('matchSuppliersForRfqIntent — Slice E: RFQ intent supplier matching', () => {

  // ── TC-01 ─── RFQ intent signals built from safe rfqContext ──────────────
  it('TC-01: builds RFQ intent signals from safe rfqContext', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [
        makeMaterialSignal('Organic Cotton'),
        makeCatalogSignal(SUP_A),
      ],
    });
    const input = makeInput(BUYER, [draft], {
      material: 'Organic Cotton',
      productCategory: 'Woven Fabric',
      buyerMessage: 'Need GOTS certified organic cotton fabric',
    });
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.fallback).toBe(false);
    expect(result.matchResult.candidates.length).toBeGreaterThanOrEqual(1);
    // RFQ signals should boost the result — MATERIAL match contributes to ranking
    const first = result.matchResult.candidates[0];
    if (first === undefined) throw new Error('Expected at least one candidate');
    expect(first.matchCategories.length).toBeGreaterThan(0);
  });

  // ── TC-02 ─── RFQ signals injected into candidate signals (non-mutating) ─
  it('TC-02: RFQ signals injected into candidate signals without mutating original draft', () => {
    const originalSignals: SupplierMatchSignal[] = [makeCatalogSignal(SUP_A)];
    const draft = makeDraft(SUP_A, OPEN_VIS, { signals: originalSignals });
    const input = makeInput(BUYER, [draft], { material: 'Organic Cotton' });

    matchSuppliersForRfqIntent(input);

    // Original draft signals array must not be mutated
    expect(draft.signals).toHaveLength(1);
    expect(draft.signals[0]).not.toBeUndefined();
    const sig = draft.signals[0];
    if (sig === undefined) throw new Error('Expected signal');
    expect(sig.signalType).toBe('CATALOG_STAGE');
  });

  // ── TC-03 ─── Policy filter applied with isRfqContextual: true ───────────
  it('TC-03: APPROVED_BUYERS_ONLY supplier excluded when RFQ context active and no relationship', () => {
    const draft = makeDraft(SUP_A, RFQ_APPROVED_ONLY_VIS, { relationshipState: 'NONE' });
    const input = makeInput(BUYER, [draft]);
    const result = matchSuppliersForRfqIntent(input);

    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates).toHaveLength(0);
    expect(result.matchResult.fallback).toBe(true);
  });

  // ── TC-04 ─── Forbidden supplier excluded via policyContext ──────────────
  it('TC-04: supplier in forbiddenSupplierOrgIds is excluded', () => {
    const draftA = makeDraft(SUP_A, OPEN_VIS);
    const draftB = makeDraft(SUP_B, OPEN_VIS);
    const input = makeInput(BUYER, [draftA, draftB], {}, {
      policyContext: { forbiddenSupplierOrgIds: new Set([SUP_A]) },
    });
    const result = matchSuppliersForRfqIntent(input);

    expect(result.policyViolationsBlocked).toBe(1);
    const ids = result.matchResult.candidates.map((c) => c.supplierOrgId);
    expect(ids).not.toContain(SUP_A);
    expect(ids).toContain(SUP_B);
  });

  // ── TC-05 ─── Explanation builder produces safe labels ────────────────────
  it('TC-05: explanation builder produces non-empty safe labels on ranked candidates', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [makeMaterialSignal('Organic Cotton'), makeCatalogSignal(SUP_A)],
    });
    const input = makeInput(BUYER, [draft], { material: 'Organic Cotton' });
    const result = matchSuppliersForRfqIntent(input);

    const first = result.matchResult.candidates[0];
    if (first === undefined) throw new Error('Expected at least one candidate');
    expect(first.explanation).toBeDefined();
    if (first.explanation === undefined) throw new Error('Expected explanation');
    expect(typeof first.explanation.primaryLabel).toBe('string');
    expect(first.explanation.primaryLabel.length).toBeGreaterThan(0);
    expect(SAFE_LABELS.has(first.explanation.primaryLabel)).toBe(true);
  });

  // ── TC-06 ─── Runtime guard runs — clean path has zero violations ─────────
  it('TC-06: runtime guard runs and clean output produces zero guard violations', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [makeMaterialSignal('Cotton')],
    });
    const input = makeInput(BUYER, [draft]);
    const result = matchSuppliersForRfqIntent(input);

    expect(result.guardViolationsBlocked).toBe(0);
    expect(result.matchResult.candidates.length).toBeGreaterThanOrEqual(1);
  });

  // ── TC-07 ─── OPEN_TO_ALL PUBLIC candidate passes ────────────────────────
  it('TC-07: OPEN_TO_ALL PUBLIC catalog candidate is included in results', () => {
    const draft = makeDraft(SUP_A, {
      catalogVisibility: 'PUBLIC',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    const input = makeInput(BUYER, [draft]);
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.fallback).toBe(false);
    const ids = result.matchResult.candidates.map((c) => c.supplierOrgId);
    expect(ids).toContain(SUP_A);
  });

  // ── TC-08 ─── APPROVED_BUYERS_ONLY RFQ requires APPROVED relationship ─────
  it('TC-08a: APPROVED_BUYERS_ONLY RFQ excludes candidate without APPROVED relationship', () => {
    const draft = makeDraft(SUP_A, RFQ_APPROVED_ONLY_VIS, { relationshipState: 'REQUESTED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).not.toContain(SUP_A);
  });

  it('TC-08b: APPROVED_BUYERS_ONLY RFQ includes candidate with APPROVED relationship', () => {
    const draft = makeDraft(SUP_A, RFQ_APPROVED_ONLY_VIS, { relationshipState: 'APPROVED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).toContain(SUP_A);
  });

  // ── TC-09 ─── BLOCKED supplier excluded ──────────────────────────────────
  it('TC-09: BLOCKED relationship state causes supplier to be excluded', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, { relationshipState: 'BLOCKED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).not.toContain(SUP_A);
    expect(result.matchResult.fallback).toBe(true);
  });

  // ── TC-10 ─── SUSPENDED supplier excluded ────────────────────────────────
  it('TC-10: SUSPENDED relationship state causes supplier to be excluded', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, { relationshipState: 'SUSPENDED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates).toHaveLength(0);
  });

  // ── TC-11 ─── REJECTED supplier excluded ─────────────────────────────────
  it('TC-11: REJECTED relationship state causes supplier to be excluded', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, { relationshipState: 'REJECTED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates).toHaveLength(0);
  });

  // ── TC-12 ─── APPROVED_BUYER_ONLY catalog requires APPROVED relationship ──
  it('TC-12: APPROVED_BUYER_ONLY catalog excludes candidate without APPROVED relationship', () => {
    const draft = makeDraft(SUP_A, APPROVED_ONLY_VIS); // no relationship state
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).not.toContain(SUP_A);
  });

  // ── TC-13 ─── HIDDEN catalog excluded ────────────────────────────────────
  it('TC-13: HIDDEN catalog visibility causes supplier to be excluded', () => {
    const draft = makeDraft(SUP_A, HIDDEN_VIS);
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates).toHaveLength(0);
  });

  // ── TC-14 ─── DPP signal stripped when dppPublished is false ─────────────
  it('TC-14: DPP_PUBLISHED signal is stripped from candidate when dppPublished is false', () => {
    const draftWithDpp = makeDraft(SUP_A, {
      catalogVisibility: 'PUBLIC',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
      dppPublished: false,
    }, {
      signals: [makeDppSignal(), makeCatalogSignal(SUP_A)],
    });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draftWithDpp]));

    // Candidate should pass (catalog signal survives strip), but DPP category absent
    const first = result.matchResult.candidates[0];
    if (first === undefined) throw new Error('Expected candidate');
    // COMPLIANCE_FIT derived from DPP_PUBLISHED should be absent
    expect(first.matchCategories).not.toContain('COMPLIANCE_FIT');
  });

  // ── TC-15 ─── AI draft fields absent from result candidates ──────────────
  it('TC-15: result candidates do not contain AI draft extraction fields', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS);
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));

    for (const candidate of result.matchResult.candidates) {
      const keys = Object.keys(candidate);
      expect(keys).not.toContain('aiDraftData');
      expect(keys).not.toContain('aiExtractionDraft');
      expect(keys).not.toContain('draftExtraction');
      expect(keys).not.toContain('unpublishedEvidence');
    }
  });

  // ── TC-16 ─── Price / monetary fields absent from result candidates ───────
  it('TC-16: result candidates do not contain price or monetary fields', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS);
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));

    for (const candidate of result.matchResult.candidates) {
      const keys = Object.keys(candidate);
      expect(keys).not.toContain('price');
      expect(keys).not.toContain('amount');
      expect(keys).not.toContain('unitPrice');
      expect(keys).not.toContain('internalMargin');
      expect(keys).not.toContain('commercialTerms');
      expect(keys).not.toContain('paymentTerms');
    }
  });

  // ── TC-17 ─── RELATIONSHIP_ONLY price policy does not grant RFQ eligibility
  it('TC-17: RELATIONSHIP_ONLY price policy alone does not grant RFQ eligibility without relationship', () => {
    // Supplier has RELATIONSHIP_ONLY price policy but APPROVED_BUYERS_ONLY RFQ mode
    // and no approved relationship — should be blocked
    const draft = makeDraft(SUP_A, {
      catalogVisibility: 'PUBLIC',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      pricePolicy: 'RELATIONSHIP_ONLY',
    });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).not.toContain(SUP_A);
  });

  // ── TC-18 ─── Cross-tenant candidate (sourceOrgId mismatch) excluded ──────
  it('TC-18: candidate with sourceOrgId !== buyerOrgId is excluded as cross-tenant', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      sourceOrgId: 'org-other-tenant-999',
    });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates.map((c) => c.supplierOrgId)).not.toContain(SUP_A);
  });

  // ── TC-19 ─── Buyer self-match excluded ──────────────────────────────────
  it('TC-19: buyer cannot match themselves — supplierOrgId === buyerOrgId excluded', () => {
    const selfDraft = makeDraft(BUYER, OPEN_VIS); // supplierOrgId === buyerOrgId
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [selfDraft]));
    expect(result.policyViolationsBlocked).toBe(1);
    expect(result.matchResult.candidates).toHaveLength(0);
  });

  // ── TC-20 ─── Multiple candidates ranked — higher-signal candidate first ──
  it('TC-20: higher-signal candidate ranks above lower-signal candidate', () => {
    const highSignalDraft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [
        makeMaterialSignal('Organic Cotton'),
        makeCatalogSignal(SUP_A),
        { signalType: 'GEOGRAPHY', value: 'EU', sourceEntity: 'ORG_PROFILE', isSafe: true },
      ],
    });
    const lowSignalDraft = makeDraft(SUP_B, OPEN_VIS, {
      signals: [makeCatalogSignal(SUP_B)],
    });
    const input = makeInput(BUYER, [lowSignalDraft, highSignalDraft], {
      material: 'Organic Cotton',
      deliveryRegion: 'EU',
    });
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.candidates.length).toBeGreaterThanOrEqual(2);
    const first = result.matchResult.candidates[0];
    if (first === undefined) throw new Error('Expected candidates[0]');
    // SUP_A has more matching signals → should rank higher
    expect(first.supplierOrgId).toBe(SUP_A);
  });

  // ── TC-21 ─── Empty candidateDrafts returns fallback result ──────────────
  it('TC-21: empty candidateDrafts returns structured fallback result', () => {
    const input = makeInput(BUYER, []);
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.fallback).toBe(true);
    expect(result.matchResult.candidates).toHaveLength(0);
    expect(result.matchResult.modelCallMade).toBe(false);
    expect(result.matchResult.humanConfirmationRequired).toBe(true);
    expect(result.policyViolationsBlocked).toBe(0);
    expect(result.guardViolationsBlocked).toBe(0);
  });

  // ── TC-22 ─── No safe candidates returns fallback ─────────────────────────
  it('TC-22: all-blocked candidates returns structured fallback result', () => {
    const drafts = [
      makeDraft(SUP_A, OPEN_VIS, { relationshipState: 'BLOCKED' }),
      makeDraft(SUP_B, OPEN_VIS, { relationshipState: 'SUSPENDED' }),
      makeDraft(SUP_C, HIDDEN_VIS),
    ];
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, drafts));

    expect(result.matchResult.fallback).toBe(true);
    expect(result.matchResult.candidates).toHaveLength(0);
    expect(result.policyViolationsBlocked).toBe(3);
  });

  // ── TC-23 ─── maxCandidates respected ────────────────────────────────────
  it('TC-23: maxCandidates: 1 limits result to at most 1 candidate', () => {
    const drafts = [
      makeDraft(SUP_A, OPEN_VIS, { signals: [makeMaterialSignal('Cotton')] }),
      makeDraft(SUP_B, OPEN_VIS, { signals: [makeMaterialSignal('Linen')] }),
      makeDraft(SUP_C, OPEN_VIS, { signals: [makeCatalogSignal(SUP_C)] }),
    ];
    const input = makeInput(BUYER, drafts, {}, { maxCandidates: 1 });
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.candidates.length).toBeLessThanOrEqual(1);
  });

  // ── TC-24 ─── Explanation primaryLabel is safe (from allowlist only) ──────
  it('TC-24: explanation primaryLabel is from safe label allowlist only', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [makeMaterialSignal('Organic Cotton'), makeCatalogSignal(SUP_A)],
    });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft], { material: 'Organic Cotton' }));

    for (const candidate of result.matchResult.candidates) {
      if (candidate.explanation !== undefined) {
        expect(SAFE_LABELS.has(candidate.explanation.primaryLabel)).toBe(true);
        for (const label of candidate.explanation.supportingLabels) {
          expect(SAFE_LABELS.has(label)).toBe(true);
        }
      }
    }
  });

  // ── TC-25 ─── Audit envelope contains no forbidden fields ─────────────────
  it('TC-25: auditEnvelope does not contain forbidden fields (price, score, relationship)', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS);
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));
    const envelope = result.matchResult.auditEnvelope;
    const keys = Object.keys(envelope);

    const forbidden = [
      'price', 'score', 'rank', 'riskScore', 'blockedReason', 'allowlistGraph',
      'relationshipGraph', 'privateNotes', 'aiDraftData', 'unpublishedEvidence',
    ];
    for (const key of forbidden) {
      expect(keys).not.toContain(key);
    }
  });

  // ── TC-26 ─── modelCallMade is always false ────────────────────────────────
  it('TC-26: modelCallMade is false regardless of input', () => {
    const withCandidate = matchSuppliersForRfqIntent(makeInput(BUYER, [makeDraft(SUP_A, OPEN_VIS)]));
    const emptyInput    = matchSuppliersForRfqIntent(makeInput(BUYER, []));

    expect(withCandidate.matchResult.modelCallMade).toBe(false);
    expect(emptyInput.matchResult.modelCallMade).toBe(false);
    // Audit envelope also has modelCallMade: false
    expect(withCandidate.matchResult.auditEnvelope.modelCallMade).toBe(false);
  });

  // ── TC-27 ─── Result candidates contain no forbidden top-level keys ───────
  it('TC-27: result candidates do not contain any forbidden top-level keys', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [makeMaterialSignal('Cotton'), makeCatalogSignal(SUP_A)],
      relationshipState: 'APPROVED',
    });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft], { material: 'Cotton' }));

    for (const candidate of result.matchResult.candidates) {
      for (const key of FORBIDDEN_CANDIDATE_KEYS) {
        expect(
          Object.prototype.hasOwnProperty.call(candidate, key),
          `Candidate must not contain forbidden key: "${key}"`,
        ).toBe(false);
      }
    }
  });

  // ── TC-28 ─── Deterministic: same input → same output ─────────────────────
  it('TC-28: same input with same requestedAt/requestId produces identical output', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, {
      signals: [makeMaterialSignal('Organic Cotton'), makeCatalogSignal(SUP_A)],
    });
    const input = makeInput(BUYER, [draft], { material: 'Organic Cotton' });

    const resultA = matchSuppliersForRfqIntent(input);
    const resultB = matchSuppliersForRfqIntent(input);

    expect(resultA.matchResult.candidates.length).toBe(resultB.matchResult.candidates.length);
    expect(resultA.matchResult.fallback).toBe(resultB.matchResult.fallback);
    expect(resultA.policyViolationsBlocked).toBe(resultB.policyViolationsBlocked);

    if (resultA.matchResult.candidates.length > 0) {
      const firstA = resultA.matchResult.candidates[0];
      const firstB = resultB.matchResult.candidates[0];
      if (firstA === undefined || firstB === undefined) throw new Error('Expected candidates');
      expect(firstA.supplierOrgId).toBe(firstB.supplierOrgId);
      expect(firstA.matchCategories).toEqual(firstB.matchCategories);
    }
  });

  // ── TC-29 ─── Service version constant exported and stable ────────────────
  it('TC-29: RFQ_INTENT_SERVICE_VERSION constant is exported with expected stable value', () => {
    expect(typeof RFQ_INTENT_SERVICE_VERSION).toBe('string');
    expect(RFQ_INTENT_SERVICE_VERSION).toBe('mvp-rfq-intent-v1');
    expect(RFQ_INTENT_SERVICE_VERSION.length).toBeGreaterThan(0);
  });

  // ── TC-30 ─── buyerOrgId empty → structured fallback (no throw) ──────────
  it('TC-30: empty buyerOrgId returns structured fallback without throwing', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS);
    const input: SupplierMatchRfqIntentInput = {
      buyerOrgId: '',
      rfqContext: { rfqId: 'rfq-empty-buyer' },
      candidateDrafts: [draft],
      requestedAt: REQ_AT,
    };
    const result = matchSuppliersForRfqIntent(input);

    expect(result.matchResult.fallback).toBe(true);
    expect(result.matchResult.candidates).toHaveLength(0);
    expect(result.matchResult.modelCallMade).toBe(false);
    expect(result.matchResult.humanConfirmationRequired).toBe(true);
  });

  // ── TC-31 ─── humanConfirmationRequired always true ──────────────────────
  it('TC-31: humanConfirmationRequired is always true on both fallback and result paths', () => {
    const withCandidate = matchSuppliersForRfqIntent(makeInput(BUYER, [makeDraft(SUP_A, OPEN_VIS)]));
    const emptyInput    = matchSuppliersForRfqIntent(makeInput(BUYER, []));

    expect(withCandidate.matchResult.humanConfirmationRequired).toBe(true);
    expect(emptyInput.matchResult.humanConfirmationRequired).toBe(true);
  });

  // ── TC-32 ─── rfqId echoed in result for correlation ─────────────────────
  it('TC-32: rfqId from rfqContext is echoed in result for audit correlation', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS);
    const input = makeInput(BUYER, [draft], { rfqId: 'rfq-correlation-001' });
    const result = matchSuppliersForRfqIntent(input);

    expect(result.rfqId).toBe('rfq-correlation-001');
  });

  // ── TC-33 ─── APPROVED relationship produces REQUEST_QUOTE CTA ───────────
  it('TC-33: APPROVED relationship produces REQUEST_QUOTE CTA in buyer result', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS, { relationshipState: 'APPROVED' });
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));

    const candidate = result.matchResult.candidates.find((c) => c.supplierOrgId === SUP_A);
    if (candidate === undefined) throw new Error('Expected supplier A in candidates');
    expect(candidate.relationshipCta).toBe('REQUEST_QUOTE');
  });

  // ── TC-34 ─── No-relationship produces VIEW_PROFILE CTA ──────────────────
  it('TC-34: absent relationship state produces VIEW_PROFILE CTA', () => {
    const draft = makeDraft(SUP_A, OPEN_VIS); // no relationshipState
    const result = matchSuppliersForRfqIntent(makeInput(BUYER, [draft]));

    const candidate = result.matchResult.candidates.find((c) => c.supplierOrgId === SUP_A);
    if (candidate === undefined) throw new Error('Expected supplier A in candidates');
    expect(candidate.relationshipCta).toBe('VIEW_PROFILE');
  });

});
