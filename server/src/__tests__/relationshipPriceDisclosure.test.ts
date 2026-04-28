/**
 * Slice E — RELATIONSHIP_ONLY Price Disclosure Integration Tests
 *
 * Verifies that price disclosure is governed by server-resolved relationship state.
 * APPROVED relationship → price visible; all other states → price suppressed.
 *
 * Trust model:
 *   - relationshipState is server-resolved from storage; clients cannot influence it.
 *   - buyerOrgId is from authenticated session context.
 *   - supplierOrgId is from trusted catalog/item server-side context.
 */

import { describe, expect, it } from 'vitest';

import {
  evaluateBuyerRelationshipPriceEligibility,
} from '../services/relationshipAccess.service.js';
import { resolvePriceDisclosureState } from '../services/pricing/priceDisclosureResolver.service.js';
import type { BuyerPriceDisclosureInput } from '../services/pricing/priceDisclosureResolver.service.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRelationshipOnlyInput(
  isEligible: boolean,
  overrides?: Partial<BuyerPriceDisclosureInput>,
): BuyerPriceDisclosureInput {
  return {
    buyer: {
      isAuthenticated: true,
      isEligible,
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
    },
    supplierPolicy: {
      mode: 'RELATIONSHIP_ONLY',
      source: 'SUPPLIER_DEFAULT',
    },
    ...overrides,
  };
}

// ─── evaluateBuyerRelationshipPriceEligibility ────────────────────────────────

describe('evaluateBuyerRelationshipPriceEligibility', () => {
  it('APPROVED relationship grants price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'APPROVED',
    });

    expect(result.isEligible).toBe(true);
  });

  it('NONE state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'NONE',
    });

    expect(result.isEligible).toBe(false);
  });

  it('REQUESTED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'REQUESTED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('REJECTED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'REJECTED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('BLOCKED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'BLOCKED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('SUSPENDED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'SUSPENDED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('EXPIRED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'EXPIRED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('REVOKED state suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'REVOKED',
    });

    expect(result.isEligible).toBe(false);
  });

  it('unknown/ambiguous relationship state suppresses price eligibility (fail-safe)', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'SOME_FUTURE_STATE',
    });

    expect(result.isEligible).toBe(false);
  });

  it('APPROVED with future expiry date grants eligibility', () => {
    const future = new Date(Date.now() + 86_400_000 * 365);
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'APPROVED',
      relationshipExpiresAt: future,
    });

    expect(result.isEligible).toBe(true);
  });

  it('APPROVED with past expiry date suppresses eligibility', () => {
    const past = new Date(Date.now() - 86_400_000);
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'APPROVED',
      relationshipExpiresAt: past,
    });

    expect(result.isEligible).toBe(false);
  });

  it('missing relationshipState defaults to NONE (suppressed)', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
    });

    expect(result.isEligible).toBe(false);
  });

  it('wrong buyer/supplier org tuple does not reveal eligibility', () => {
    // Ensures cross-org mismatch doesn't accidentally grant eligibility
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: null,
      supplierOrgId: 'supplier-org-002',
      relationshipState: 'APPROVED',
    });

    expect(result.isEligible).toBe(false);
  });
});

// ─── RELATIONSHIP_ONLY resolver integration ───────────────────────────────────

describe('resolvePriceDisclosureState with RELATIONSHIP_ONLY policy', () => {
  it('APPROVED relationship → full ELIGIBLE_VISIBLE price disclosure', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(true));

    expect(result.price_visibility_state).toBe('ELIGIBLE_VISIBLE');
    expect(result.price_display_policy).toBe('SHOW_VALUE');
    expect(result.price_value_visible).toBe(true);
    expect(result.rfq_required).toBe(false);
  });

  it('Non-approved relationship → suppressed price disclosure (ELIGIBILITY_REQUIRED)', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    expect(result.price_visibility_state).toBe('ELIGIBILITY_REQUIRED');
    expect(result.price_display_policy).toBe('SUPPRESS_VALUE');
    expect(result.price_value_visible).toBe(false);
    expect(result.cta_type).toBe('CHECK_ELIGIBILITY');
  });

  it('Suppressed RELATIONSHIP_ONLY label is safe and does not expose relationship internals', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    expect(result.price_label).toBe('Price available on request');
    // Must not expose the relationship state or approval status
    expect(result.price_label).not.toMatch(/relationship/i);
    expect(result.price_label).not.toMatch(/approved/i);
    expect(result.price_label).not.toMatch(/eligible/i);
  });

  it('HIDDEN_ALL policy remains hidden even for buyer with approved relationship', () => {
    const result = resolvePriceDisclosureState({
      buyer: {
        isAuthenticated: true,
        isEligible: true,
      },
      supplierPolicy: {
        mode: 'HIDDEN_ALL',
        source: 'SUPPLIER_DEFAULT',
      },
    });

    expect(result.price_visibility_state).toBe('HIDDEN');
    expect(result.price_value_visible).toBe(false);
  });

  it('ALWAYS_VISIBLE policy is visible regardless of eligibility (non-relationship policy is unaffected)', () => {
    const result = resolvePriceDisclosureState({
      buyer: {
        isAuthenticated: false,
        isEligible: false,
      },
      supplierPolicy: {
        mode: 'ALWAYS_VISIBLE',
        source: 'SUPPLIER_DEFAULT',
      },
    });

    expect(result.price_visibility_state).toBe('PUBLIC_VISIBLE');
    expect(result.price_value_visible).toBe(true);
  });

  it('Safe default (no policy) does not leak price regardless of eligibility', () => {
    const result = resolvePriceDisclosureState({
      buyer: {
        isAuthenticated: true,
        isEligible: true,
      },
      supplierPolicy: null,
    });

    expect(result.price_visibility_state).toBe('PRICE_ON_REQUEST');
    expect(result.price_value_visible).toBe(false);
  });

  it('Suppressed RELATIONSHIP_ONLY PDP response contains no raw price-like fields', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/"price"\s*:/i);
    expect(serialized).not.toMatch(/"amount"\s*:/i);
    expect(serialized).not.toMatch(/"unitPrice"\s*:/i);
    expect(serialized).not.toMatch(/"basePrice"\s*:/i);
    expect(serialized).not.toMatch(/"listPrice"\s*:/i);
    expect(serialized).not.toMatch(/"costPrice"\s*:/i);
    expect(serialized).not.toMatch(/"supplierPrice"\s*:/i);
  });

  it('PDP response does not expose relationship ID, state, or audit internals', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('relationshipId');
    expect(serialized).not.toContain('relationshipState');
    expect(serialized).not.toContain('approvedBy');
    expect(serialized).not.toContain('policyAudit');
  });
});

// ─── RFQ prefill isolation (ensure suppressed prices do not leak into RFQ path) ──

describe('RELATIONSHIP_ONLY price suppression — RFQ prefill isolation', () => {
  it('suppressed price disclosure eligibility_reason does not leak raw price data', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    expect(result.price_value_visible).toBe(false);
    // eligibility_reason is informational only — must not carry price values
    if (result.eligibility_reason != null) {
      expect(result.eligibility_reason).not.toMatch(/\d+(\.\d+)?/);
    }
  });

  it('RELATIONSHIP_ONLY suppressed state has rfq_required: false (RFQ not triggered by suppression)', () => {
    const result = resolvePriceDisclosureState(makeRelationshipOnlyInput(false));

    // Suppressed RELATIONSHIP_ONLY price → buyer should request relationship, not RFQ
    expect(result.rfq_required).toBe(false);
  });
});
