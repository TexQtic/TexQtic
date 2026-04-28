/**
 * supplierMatchPolicyFilter.test.ts — Supplier Match Policy Filter Unit Tests
 *
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice B — 35 test scenarios.
 * Tests cover all policy gates, signal stripping, tenant isolation, deduplication,
 * determinism, and constitutional output field guarantees.
 *
 * All tests:
 * - Are pure / synchronous — no DB, no AI calls, no vi.mock() for AI providers.
 * - Use no `!` non-null assertions — guards via `if (!x) throw` pattern.
 * - Import only from the Slice B service and types.
 *
 * @module supplierMatchPolicyFilter.test
 */

import { describe, it, expect } from 'vitest';
import {
  applySupplierMatchPolicyFilter,
  stripUnsafeSignals,
  getForbiddenPolicyFilterOutputFields,
} from '../supplierMatching/supplierMatchPolicyFilter.service.js';
import type {
  SupplierMatchCandidateDraft,
  SupplierMatchPolicyFilterInput,
  SupplierMatchSignal,
} from '../supplierMatching/supplierMatch.types.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Build a minimal safe signal for test use. isSafe is always true here. */
function makeSafeSignal(
  overrides?: Partial<SupplierMatchSignal>,
): SupplierMatchSignal {
  return {
    signalType: 'MATERIAL',
    value: 'Cotton',
    sourceEntity: 'CATALOG_ITEM',
    isSafe: true,
    ...overrides,
  };
}

/** Build a minimal public candidate for test use. */
function makePublicCandidate(
  supplierOrgId: string,
  overrides?: Partial<SupplierMatchCandidateDraft>,
): SupplierMatchCandidateDraft {
  return {
    supplierOrgId,
    signals: [makeSafeSignal()],
    visibility: { catalogVisibility: 'PUBLIC' },
    ...overrides,
  };
}

/** Run the filter with a single candidate and return the result. */
function filterOne(
  candidate: SupplierMatchCandidateDraft,
  buyerOrgId = 'org-buyer-001',
  policyContext?: SupplierMatchPolicyFilterInput['policyContext'],
) {
  return applySupplierMatchPolicyFilter({
    buyerOrgId,
    candidates: [candidate],
    policyContext,
  });
}

// ─── T-01 – T-02: Catalog access baseline ────────────────────────────────────

describe('T-01: PUBLIC candidate with safe signals is allowed', () => {
  it('returns candidate in safeCandidates and fallback: false', () => {
    const result = filterOne(makePublicCandidate('org-supplier-001'));
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.safeCandidates[0].supplierOrgId).toBe('org-supplier-001');
    expect(result.blocked).toHaveLength(0);
    expect(result.fallback).toBe(false);
  });
});

describe('T-02: AUTHENTICATED_ONLY candidate passes for valid buyerOrgId', () => {
  it('allows candidate with catalogVisibility AUTHENTICATED_ONLY', () => {
    const candidate = makePublicCandidate('org-supplier-002', {
      visibility: { catalogVisibility: 'AUTHENTICATED_ONLY' },
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.safeCandidates[0].supplierOrgId).toBe('org-supplier-002');
    expect(result.blocked).toHaveLength(0);
  });
});

// ─── T-03 – T-09: APPROVED_BUYER_ONLY catalog gate ──────────────────────────

describe('T-03: APPROVED_BUYER_ONLY + APPROVED relationship is allowed', () => {
  it('passes candidate when relationship state is APPROVED', () => {
    const candidate = makePublicCandidate('org-supplier-003', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'APPROVED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
  });
});

describe('T-04: APPROVED_BUYER_ONLY + NONE relationship is blocked', () => {
  it('blocks with RELATIONSHIP_REQUIRED when no relationship exists', () => {
    const candidate = makePublicCandidate('org-supplier-004', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'NONE',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    expect(result.blocked).toHaveLength(1);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_REQUIRED');
  });
});

describe('T-05: APPROVED_BUYER_ONLY + REQUESTED/PENDING relationship is blocked', () => {
  it('blocks with RELATIONSHIP_REQUIRED when relationship is REQUESTED', () => {
    const candidate = makePublicCandidate('org-supplier-005', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'REQUESTED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_REQUIRED');
  });
});

describe('T-06: APPROVED_BUYER_ONLY + REJECTED relationship is blocked', () => {
  it('blocks with RELATIONSHIP_REJECTED when relationship is REJECTED', () => {
    const candidate = makePublicCandidate('org-supplier-006', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'REJECTED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    // REJECTED relationship state fires before catalog gate
    expect(violation.blockedReason).toBe('RELATIONSHIP_REJECTED');
  });
});

describe('T-07: APPROVED_BUYER_ONLY + BLOCKED relationship is blocked', () => {
  it('blocks with RELATIONSHIP_BLOCKED when relationship is BLOCKED', () => {
    const candidate = makePublicCandidate('org-supplier-007', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'BLOCKED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_BLOCKED');
  });
});

describe('T-08: APPROVED_BUYER_ONLY + SUSPENDED relationship is blocked', () => {
  it('blocks with RELATIONSHIP_SUSPENDED when relationship is SUSPENDED', () => {
    const candidate = makePublicCandidate('org-supplier-008', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'SUSPENDED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_SUSPENDED');
  });
});

describe('T-09: APPROVED_BUYER_ONLY + EXPIRED/REVOKED relationship is blocked', () => {
  it('blocks EXPIRED with RELATIONSHIP_REQUIRED (catalog gate)', () => {
    const candidate = makePublicCandidate('org-supplier-009a', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'EXPIRED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_REQUIRED');
  });

  it('blocks REVOKED with RELATIONSHIP_REQUIRED (catalog gate)', () => {
    const candidate = makePublicCandidate('org-supplier-009b', {
      visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
      relationshipState: 'REVOKED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RELATIONSHIP_REQUIRED');
  });
});

// ─── T-10 – T-11: Hidden catalog gates ──────────────────────────────────────

describe('T-10: HIDDEN catalog blocks all relationship states including APPROVED', () => {
  it('blocks APPROVED relationship when catalog is HIDDEN', () => {
    const candidate = makePublicCandidate('org-supplier-010', {
      visibility: { catalogVisibility: 'HIDDEN' },
      relationshipState: 'APPROVED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('HIDDEN_CATALOG');
  });

  it('blocks with no relationship when catalog is HIDDEN', () => {
    const candidate = makePublicCandidate('org-supplier-010b', {
      visibility: { catalogVisibility: 'HIDDEN' },
    });
    const result = filterOne(candidate);
    expect(result.blocked[0]?.blockedReason).toBe('HIDDEN_CATALOG');
  });
});

describe('T-11: REGION_CHANNEL_SENSITIVE is blocked as future boundary', () => {
  it('blocks with HIDDEN_CATALOG reason for REGION_CHANNEL_SENSITIVE', () => {
    const candidate = makePublicCandidate('org-supplier-011', {
      visibility: { catalogVisibility: 'REGION_CHANNEL_SENSITIVE' },
      relationshipState: 'APPROVED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('HIDDEN_CATALOG');
  });
});

// ─── T-12 – T-15: Forbidden supplier / relationship state exclusions ─────────

describe('T-12: Silently excludes BLOCKED suppliers via forbiddenSupplierOrgIds', () => {
  it('records SUPPLIER_FORBIDDEN violation and excludes from safeCandidates', () => {
    const supplierOrgId = 'org-blocked-001';
    const candidate = makePublicCandidate(supplierOrgId);
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: {
        forbiddenSupplierOrgIds: new Set([supplierOrgId]),
      },
    });
    expect(result.safeCandidates).toHaveLength(0);
    expect(result.blocked).toHaveLength(1);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('SUPPLIER_FORBIDDEN');
    expect(violation.supplierOrgId).toBe(supplierOrgId);
  });
});

describe('T-13: Silently excludes SUSPENDED suppliers via forbiddenSupplierOrgIds', () => {
  it('records SUPPLIER_FORBIDDEN violation for suspended supplier in forbidden set', () => {
    const supplierOrgId = 'org-suspended-001';
    const candidate = makePublicCandidate(supplierOrgId);
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: {
        forbiddenSupplierOrgIds: new Set([supplierOrgId]),
      },
    });
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('SUPPLIER_FORBIDDEN');
  });
});

describe('T-14: Silently excludes REJECTED suppliers via forbiddenSupplierOrgIds', () => {
  it('records SUPPLIER_FORBIDDEN violation for rejected supplier in forbidden set', () => {
    const supplierOrgId = 'org-rejected-001';
    const candidate = makePublicCandidate(supplierOrgId);
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: {
        forbiddenSupplierOrgIds: new Set([supplierOrgId]),
      },
    });
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('SUPPLIER_FORBIDDEN');
  });
});

describe('T-15: Preserves APPROVED suppliers when all other gates pass', () => {
  it('allows APPROVED supplier with PUBLIC catalog when not in forbidden set', () => {
    const candidate = makePublicCandidate('org-approved-001', {
      visibility: { catalogVisibility: 'PUBLIC' },
      relationshipState: 'APPROVED',
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: {
        forbiddenSupplierOrgIds: new Set(['org-other-forbidden']),
      },
    });
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.safeCandidates[0].supplierOrgId).toBe('org-approved-001');
    expect(result.blocked).toHaveLength(0);
  });
});

// ─── T-16 – T-18: RFQ gate ───────────────────────────────────────────────────

describe('T-16: RFQ OPEN_TO_ALL candidate passes when other gates pass', () => {
  it('allows OPEN_TO_ALL rfqAcceptanceMode when isRfqContextual is true', () => {
    const candidate = makePublicCandidate('org-supplier-016', {
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'OPEN_TO_ALL',
      },
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
  });

  it('passes with no rfqAcceptanceMode set (open by default)', () => {
    const candidate = makePublicCandidate('org-supplier-016b');
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });
    expect(result.safeCandidates).toHaveLength(1);
  });
});

describe('T-17: RFQ APPROVED_BUYERS_ONLY passes only for APPROVED relationship', () => {
  it('allows APPROVED_BUYERS_ONLY rfqAcceptanceMode when relationship is APPROVED', () => {
    const candidate = makePublicCandidate('org-supplier-017', {
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      },
      relationshipState: 'APPROVED',
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
  });
});

describe('T-18: RFQ APPROVED_BUYERS_ONLY blocks non-approved states', () => {
  it('blocks NONE relationship with RFQ_NOT_ALLOWED', () => {
    const candidate = makePublicCandidate('org-supplier-018a', {
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      },
      relationshipState: 'NONE',
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('RFQ_NOT_ALLOWED');
  });

  it('blocks REQUESTED relationship with RFQ_NOT_ALLOWED', () => {
    const candidate = makePublicCandidate('org-supplier-018b', {
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      },
      relationshipState: 'REQUESTED',
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });
    expect(result.blocked[0]?.blockedReason).toBe('RFQ_NOT_ALLOWED');
  });

  it('does not apply RFQ gate when isRfqContextual is false', () => {
    // APPROVED_BUYERS_ONLY with non-APPROVED but NOT RFQ contextual — should pass catalog gate.
    const candidate = makePublicCandidate('org-supplier-018c', {
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      },
      relationshipState: 'NONE',
    });
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: false },
    });
    // RFQ gate inactive → candidate passes
    expect(result.safeCandidates).toHaveLength(1);
  });
});

// ─── T-19: Price metadata does not override catalog gate ─────────────────────

describe('T-19: Relationship-only price metadata does not override catalog gate', () => {
  it('blocks APPROVED_BUYER_ONLY with NONE relationship despite RELATIONSHIP_ONLY price policy', () => {
    const candidate = makePublicCandidate('org-supplier-019a', {
      visibility: {
        catalogVisibility: 'APPROVED_BUYER_ONLY',
        pricePolicy: 'RELATIONSHIP_ONLY',
      },
      relationshipState: 'NONE',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    // Catalog gate fires, price policy is irrelevant to catalog access
    expect(violation.blockedReason).toBe('RELATIONSHIP_REQUIRED');
  });

  it('blocks HIDDEN catalog despite APPROVED relationship with RELATIONSHIP_ONLY price policy', () => {
    const candidate = makePublicCandidate('org-supplier-019b', {
      visibility: {
        catalogVisibility: 'HIDDEN',
        pricePolicy: 'RELATIONSHIP_ONLY',
      },
      relationshipState: 'APPROVED',
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('HIDDEN_CATALOG');
  });
});

// ─── T-20: Hidden price / raw price signal stripping ─────────────────────────

describe('T-20: Hidden price / raw price signals are stripped', () => {
  it('strips signals with isSafe !== true (simulating a raw price injection)', () => {
    // Force isSafe to false to simulate a forged / non-builder signal at runtime.
    const unsafeSignal = {
      signalType: 'PRICE_DISCLOSURE_METADATA',
      value: '100.00',
      sourceEntity: 'PRICE_DISCLOSURE',
      isSafe: false,
    } as unknown as SupplierMatchSignal;

    const safeSignal = makeSafeSignal({ value: 'Cotton', signalType: 'MATERIAL' });

    const candidate = makePublicCandidate('org-supplier-020', {
      signals: [unsafeSignal, safeSignal],
    });
    const result = filterOne(candidate);

    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');

    // Unsafe signal stripped; only the safe material signal remains
    expect(safe.signals).toHaveLength(1);
    expect(safe.signals[0]?.isSafe).toBe(true);
    expect(safe.signals[0]?.signalType).toBe('MATERIAL');
  });
});

// ─── T-21 – T-23: DPP signal gating ─────────────────────────────────────────

describe('T-21: Published DPP signal passes when dppPublished is true', () => {
  it('retains DPP_PUBLISHED signal when visibility.dppPublished is true', () => {
    const dppSignal = makeSafeSignal({
      signalType: 'DPP_PUBLISHED',
      value: 'dpp-ref-001',
      sourceEntity: 'DPP_PUBLISHED',
    });
    const candidate = makePublicCandidate('org-supplier-021', {
      signals: [dppSignal],
      visibility: { catalogVisibility: 'PUBLIC', dppPublished: true },
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    expect(safe.signals).toHaveLength(1);
    expect(safe.signals[0]?.signalType).toBe('DPP_PUBLISHED');
  });
});

describe('T-22: Unpublished DPP signal is stripped', () => {
  it('strips DPP_PUBLISHED signal when dppPublished is false', () => {
    const dppSignal = makeSafeSignal({
      signalType: 'DPP_PUBLISHED',
      value: 'dpp-ref-unpublished',
      sourceEntity: 'DPP_PUBLISHED',
    });
    const otherSignal = makeSafeSignal({ value: 'Organic Cotton', signalType: 'MATERIAL' });
    const candidate = makePublicCandidate('org-supplier-022', {
      signals: [dppSignal, otherSignal],
      visibility: { catalogVisibility: 'PUBLIC', dppPublished: false },
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    // DPP signal stripped; other signal remains
    expect(safe.signals).toHaveLength(1);
    expect(safe.signals.some((s) => s.signalType === 'DPP_PUBLISHED')).toBe(false);
  });

  it('strips DPP_PUBLISHED signal when dppPublished is undefined', () => {
    const dppSignal = makeSafeSignal({
      signalType: 'DPP_PUBLISHED',
      value: 'dpp-ref-no-flag',
      sourceEntity: 'DPP_PUBLISHED',
    });
    const candidate = makePublicCandidate('org-supplier-022b', {
      signals: [dppSignal],
      visibility: { catalogVisibility: 'PUBLIC' }, // dppPublished not set
    });
    const result = filterOne(candidate);
    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    expect(safe.signals).toHaveLength(0); // DPP signal stripped
  });
});

describe('T-23: AI draft extraction signal is stripped', () => {
  it('strips signals with isSafe !== true (simulating AI draft extraction)', () => {
    // A signal that bypassed the Slice A builder (isSafe: false at runtime)
    // represents an AI draft extraction signal that must never reach the output.
    const aiDraftSignal = {
      signalType: 'PRODUCT_CATEGORY',
      value: 'AI-extracted: Sportswear',
      sourceEntity: 'CATALOG_ITEM',
      isSafe: false, // runtime simulation of unsafe / AI-extracted signal
    } as unknown as SupplierMatchSignal;

    const validSignal = makeSafeSignal({ signalType: 'GEOGRAPHY', value: 'EU' });

    const candidate = makePublicCandidate('org-supplier-023', {
      signals: [aiDraftSignal, validSignal],
    });
    const result = filterOne(candidate);

    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    expect(safe.signals).toHaveLength(1);
    // Only the valid safe signal survives
    expect(safe.signals[0]?.signalType).toBe('GEOGRAPHY');
    expect(safe.signals[0]?.isSafe).toBe(true);
  });
});

// ─── T-24 – T-26: Tenant isolation ───────────────────────────────────────────

describe('T-24: Cross-tenant candidate is blocked (sourceOrgId mismatch)', () => {
  it('blocks candidate with sourceOrgId !== buyerOrgId with CROSS_TENANT_SCOPE', () => {
    const candidate = makePublicCandidate('org-supplier-024', {
      sourceOrgId: 'org-other-buyer-999', // different buyer context
    });
    const result = filterOne(candidate, 'org-buyer-001');
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('CROSS_TENANT_SCOPE');
    expect(violation.supplierOrgId).toBe('org-supplier-024');
  });
});

describe('T-25: Cross-tenant signal is stripped (isSafe !== true)', () => {
  it('strips signals without the Slice A safety brand from cross-tenant sources', () => {
    // A signal assembled for buyer-B leaking into buyer-A context would
    // be detectable as isSafe !== true (the brand is set only by the Slice A builder
    // in the correct buyer context). Simulate with isSafe: false.
    const foreignSignal = {
      signalType: 'MATERIAL',
      value: 'Polyester (buyer-B context)',
      sourceEntity: 'CATALOG_ITEM',
      isSafe: false,
    } as unknown as SupplierMatchSignal;

    const ownSignal = makeSafeSignal({ value: 'Linen' });

    const candidate = makePublicCandidate('org-supplier-025', {
      signals: [foreignSignal, ownSignal],
    });
    const result = filterOne(candidate);

    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    expect(safe.signals).toHaveLength(1);
    expect(safe.signals[0]?.value).toBe('Linen');
  });
});

describe('T-26: Client-provided buyer/supplier override cannot grant access', () => {
  it('blocks self-match when supplierOrgId equals buyerOrgId (CROSS_TENANT_SCOPE)', () => {
    // A buyer attempting to match themselves as a supplier should be blocked.
    // This guards against client-controlled injection of the buyer org as a supplier.
    const candidate = makePublicCandidate('org-buyer-001'); // same as buyerOrgId
    const result = filterOne(candidate, 'org-buyer-001');
    expect(result.safeCandidates).toHaveLength(0);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    expect(violation.blockedReason).toBe('CROSS_TENANT_SCOPE');
  });

  it('correct sourceOrgId matching buyerOrgId is allowed (non-cross-tenant)', () => {
    // sourceOrgId === buyerOrgId is valid (same buyer context, different supplier).
    const candidate = makePublicCandidate('org-supplier-026', {
      sourceOrgId: 'org-buyer-001', // matches buyerOrgId — valid
    });
    const result = filterOne(candidate, 'org-buyer-001');
    expect(result.safeCandidates).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
  });
});

// ─── T-27: No forbidden keys in output ───────────────────────────────────────

describe('T-27: Output contains no forbidden keys', () => {
  it('serialized output does not contain any forbidden field names', () => {
    const candidate = makePublicCandidate('org-supplier-027', {
      signals: [
        makeSafeSignal({ signalType: 'MATERIAL', value: 'Bamboo' }),
        makeSafeSignal({ signalType: 'CERTIFICATION', value: 'GOTS' }),
      ],
      visibility: {
        catalogVisibility: 'APPROVED_BUYER_ONLY',
        pricePolicy: 'RELATIONSHIP_ONLY',
        rfqAcceptanceMode: 'OPEN_TO_ALL',
        dppPublished: true,
      },
      relationshipState: 'APPROVED',
    });

    const result = filterOne(candidate);
    const serialized = JSON.stringify(result);
    const forbiddenFields = getForbiddenPolicyFilterOutputFields();

    for (const key of forbiddenFields) {
      // Check that no JSON key matches the forbidden field name pattern.
      const pattern = `"${key}":`;
      expect(serialized).not.toContain(pattern);
    }
  });

  it('blocked violation records contain only supplierOrgId, candidateId, blockedReason', () => {
    const candidate = makePublicCandidate('org-supplier-027b', {
      visibility: { catalogVisibility: 'HIDDEN' },
    });
    const result = filterOne(candidate);
    expect(result.blocked).toHaveLength(1);
    const violation = result.blocked[0];
    if (!violation) throw new Error('Expected violation');
    const keys = Object.keys(violation);
    // Only allowed keys in violation
    expect(keys).not.toContain('price');
    expect(keys).not.toContain('riskScore');
    expect(keys).not.toContain('auditMetadata');
    expect(keys).toContain('supplierOrgId');
    expect(keys).toContain('blockedReason');
  });
});

// ─── T-28: Blocked entries isolation ────────────────────────────────────────

describe('T-28: Blocked entries are internal-only and not mixed into safeCandidates', () => {
  it('safeCandidates and blocked do not share supplier org IDs', () => {
    const allowed = makePublicCandidate('org-supplier-028-allowed');
    const blockedCandidate = makePublicCandidate('org-supplier-028-blocked', {
      visibility: { catalogVisibility: 'HIDDEN' },
    });

    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [allowed, blockedCandidate],
    });

    expect(result.safeCandidates).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);

    const safeIds = new Set(result.safeCandidates.map((c) => c.supplierOrgId));
    const blockedIds = new Set(result.blocked.map((v) => v.supplierOrgId));
    const overlap = [...safeIds].filter((id) => blockedIds.has(id));
    expect(overlap).toHaveLength(0);
  });

  it('policyViolationsBlocked matches the length of the blocked array', () => {
    const candidates = [
      makePublicCandidate('org-a', { visibility: { catalogVisibility: 'HIDDEN' } }),
      makePublicCandidate('org-b', { visibility: { catalogVisibility: 'HIDDEN' } }),
      makePublicCandidate('org-c'),
    ];
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates,
    });
    expect(result.policyViolationsBlocked).toBe(result.blocked.length);
    expect(result.policyViolationsBlocked).toBe(2);
  });
});

// ─── T-29: Empty input fallback ──────────────────────────────────────────────

describe('T-29: Empty input returns deterministic fallback empty result', () => {
  it('returns fallback: true and empty arrays for empty candidates', () => {
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [],
    });
    expect(result.safeCandidates).toHaveLength(0);
    expect(result.blocked).toHaveLength(0);
    expect(result.policyViolationsBlocked).toBe(0);
    expect(result.fallback).toBe(true);
    expect(result.buyerOrgId).toBe('org-buyer-001');
  });

  it('returns fallback: true and empty buyerOrgId when buyerOrgId is missing', () => {
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: '',
      candidates: [makePublicCandidate('org-supplier-029')],
    });
    expect(result.safeCandidates).toHaveLength(0);
    expect(result.fallback).toBe(true);
    expect(result.buyerOrgId).toBe('');
  });

  it('returns fallback: true when all candidates are blocked', () => {
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [
        makePublicCandidate('org-s-1', { visibility: { catalogVisibility: 'HIDDEN' } }),
        makePublicCandidate('org-s-2', { visibility: { catalogVisibility: 'HIDDEN' } }),
      ],
    });
    expect(result.safeCandidates).toHaveLength(0);
    expect(result.fallback).toBe(true);
  });
});

// ─── T-30 – T-32: Deduplication and determinism ──────────────────────────────

describe('T-30: Duplicate candidates are handled deterministically', () => {
  it('keeps only the first occurrence of a duplicate supplierOrgId', () => {
    const signal1 = makeSafeSignal({ value: 'Cotton' });
    const signal2 = makeSafeSignal({ value: 'Polyester' });

    const dup1 = makePublicCandidate('org-supplier-030', { signals: [signal1] });
    const dup2 = makePublicCandidate('org-supplier-030', { signals: [signal2] });

    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [dup1, dup2],
    });

    expect(result.safeCandidates).toHaveLength(1);
    const safe = result.safeCandidates[0];
    if (!safe) throw new Error('Expected safe candidate');
    // First occurrence wins
    expect(safe.signals[0]?.value).toBe('Cotton');
  });
});

describe('T-31: Candidate order in output is deterministic (sorted by supplierOrgId)', () => {
  it('outputs safe candidates sorted by supplierOrgId regardless of input order', () => {
    const candidates = [
      makePublicCandidate('org-zzz'),
      makePublicCandidate('org-aaa'),
      makePublicCandidate('org-mmm'),
    ];
    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates,
    });

    expect(result.safeCandidates).toHaveLength(3);
    const ids = result.safeCandidates.map((c) => c.supplierOrgId);
    expect(ids).toEqual(['org-aaa', 'org-mmm', 'org-zzz']);
  });
});

describe('T-32: Same input always produces same output (referential determinism)', () => {
  it('two calls with identical input produce identical results', () => {
    const candidates = [
      makePublicCandidate('org-c', {
        visibility: { catalogVisibility: 'APPROVED_BUYER_ONLY' },
        relationshipState: 'APPROVED',
      }),
      makePublicCandidate('org-a', {
        visibility: { catalogVisibility: 'PUBLIC' },
      }),
      makePublicCandidate('org-b', {
        visibility: { catalogVisibility: 'HIDDEN' },
      }),
    ];

    const input: SupplierMatchPolicyFilterInput = {
      buyerOrgId: 'org-buyer-001',
      candidates,
    };

    const r1 = applySupplierMatchPolicyFilter(input);
    const r2 = applySupplierMatchPolicyFilter(input);

    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

// ─── T-33: No AI/inference/embedding dependency ──────────────────────────────

describe('T-33: Policy filter does not depend on inference, embedding, or model services', () => {
  it('executes successfully without any vi.mock() setup for AI providers', () => {
    // If this test runs without mocking inferenceService, vectorEmbeddingClient,
    // gemini, or any AI provider, the module is confirmed to be AI-dependency-free.
    // The fact that no vi.mock() calls are present and the test passes is the proof.
    const candidate = makePublicCandidate('org-supplier-033', {
      signals: [makeSafeSignal({ signalType: 'CERTIFICATION', value: 'ISO-9001' })],
      visibility: {
        catalogVisibility: 'APPROVED_BUYER_ONLY',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        dppPublished: true,
      },
      relationshipState: 'APPROVED',
    });

    const result = applySupplierMatchPolicyFilter({
      buyerOrgId: 'org-buyer-001',
      candidates: [candidate],
      policyContext: { isRfqContextual: true },
    });

    expect(result.safeCandidates).toHaveLength(1);
    expect(result.fallback).toBe(false);
    // No AI mock needed — pure function confirmed
  });
});

// ─── T-34 – T-35: Cross-slice integration notes ──────────────────────────────

describe('T-34: stripUnsafeSignals helper is consistent with filter behavior', () => {
  it('stripUnsafeSignals strips isSafe !== true independently', () => {
    const safe = makeSafeSignal();
    const unsafe = { signalType: 'MATERIAL', value: 'X', sourceEntity: 'CATALOG_ITEM', isSafe: false } as unknown as SupplierMatchSignal;
    const result = stripUnsafeSignals([safe, unsafe]);
    expect(result).toHaveLength(1);
    expect(result[0]?.isSafe).toBe(true);
  });

  it('stripUnsafeSignals strips DPP_PUBLISHED when dppPublished is false', () => {
    const dpp = makeSafeSignal({ signalType: 'DPP_PUBLISHED', sourceEntity: 'DPP_PUBLISHED', value: 'ref-1' });
    const other = makeSafeSignal();
    const result = stripUnsafeSignals([dpp, other], false);
    expect(result).toHaveLength(1);
    expect(result[0]?.signalType).toBe('MATERIAL');
  });

  it('stripUnsafeSignals retains DPP_PUBLISHED when dppPublished is true', () => {
    const dpp = makeSafeSignal({ signalType: 'DPP_PUBLISHED', sourceEntity: 'DPP_PUBLISHED', value: 'ref-1' });
    const result = stripUnsafeSignals([dpp], true);
    expect(result).toHaveLength(1);
    expect(result[0]?.signalType).toBe('DPP_PUBLISHED');
  });
});

describe('T-35: getForbiddenPolicyFilterOutputFields returns non-empty set', () => {
  it('returns a ReadonlySet with well-known forbidden field names', () => {
    const fields = getForbiddenPolicyFilterOutputFields();
    expect(fields.size).toBeGreaterThan(0);
    expect(fields.has('price')).toBe(true);
    expect(fields.has('riskScore')).toBe(true);
    expect(fields.has('confidenceScore')).toBe(true);
    expect(fields.has('auditMetadata')).toBe(true);
    expect(fields.has('allowlistGraph')).toBe(true);
    expect(fields.has('relationshipGraph')).toBe(true);
    // Verify safe fields are NOT in the forbidden set
    expect(fields.has('supplierOrgId')).toBe(false);
    expect(fields.has('signals')).toBe(false);
    expect(fields.has('catalogVisibility')).toBe(false);
  });
});
