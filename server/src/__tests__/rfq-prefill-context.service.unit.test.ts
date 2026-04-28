import { describe, expect, it } from 'vitest';

import type { PriceDisclosureMetadata } from '../types/index.js';
import {
  buildCatalogRfqPrefillContext,
  type BuildCatalogRfqPrefillContextInput,
} from '../services/pricing/rfqPrefillContext.service.js';

const FORBIDDEN_KEYS = [
  'price',
  'amount',
  'unitPrice',
  'basePrice',
  'listPrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'internalMargin',
  'margin',
  'commercialTerms',
  'price_disclosure_policy_mode',
  'supplierPolicy',
  'policyId',
  'policyAudit',
  'approvedBy',
  'risk_score',
  'publicationPosture',
  'buyerScore',
  'supplierScore',
  'ranking',
] as const;

function disclosure(state: PriceDisclosureMetadata['price_visibility_state']): PriceDisclosureMetadata {
  return {
    price_visibility_state: state,
    price_display_policy: state === 'PUBLIC_VISIBLE' ? 'SHOW_VALUE' : 'SUPPRESS_VALUE',
    price_value_visible: state === 'PUBLIC_VISIBLE',
    price_label: state === 'PUBLIC_VISIBLE' ? 'Request quote' : 'Price available on request',
    cta_type: state === 'PUBLIC_VISIBLE' ? 'VIEW_PRICE' : 'REQUEST_QUOTE',
    eligibility_reason: null,
    supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
    rfq_required: state === 'RFQ_ONLY' || state === 'PRICE_ON_REQUEST',
  };
}

function baseInput(): BuildCatalogRfqPrefillContextInput {
  return {
    buyerOrgId: 'buyer-org-001',
    authenticatedBuyerOrgId: 'buyer-org-001',
    isAuthenticated: true,
    item: {
      itemId: 'item-001',
      productName: 'Cotton Twill',
      supplierOrgId: 'supplier-org-001',
      supplierIsPublished: true,
      supplierIsActive: true,
      isPublished: true,
      isActive: true,
      category: 'FABRIC_WOVEN',
      material: 'Cotton',
      specSummary: '3/1 twill, 180 GSM',
      moq: 100,
      leadTimeDays: 14,
      complianceRefs: ['GOTS', 'OEKO-TEX'],
      publishedDppRef: 'dpp-passport-001',
      isPublishedDppRefSafe: true,
    },
    draftInput: {
      selectedQuantity: 250,
      buyerNotes: 'Need delivery in 2 batches',
    },
    priceDisclosure: disclosure('RFQ_ONLY'),
  };
}

function assertNoForbiddenKeys(serialized: string) {
  for (const key of FORBIDDEN_KEYS) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(serialized).not.toMatch(new RegExp(`"${escaped}"\\s*:`, 'i'));
  }
}

describe('buildCatalogRfqPrefillContext', () => {
  it('builds safe prefill context for valid item and buyer org', () => {
    const result = buildCatalogRfqPrefillContext(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        itemId: 'item-001',
        productName: 'Cotton Twill',
        buyerOrgId: 'buyer-org-001',
        supplierOrgId: 'supplier-org-001',
        priceVisibilityState: 'RFQ_ONLY',
        priceVisible: false,
      });
      assertNoForbiddenKeys(JSON.stringify(result.data));
    }
  });

  it('builds RFQ intent prefill for RFQ_ONLY without price amounts', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      priceDisclosure: disclosure('RFQ_ONLY'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rfqEntryReason).toBe('RFQ_ONLY');
      assertNoForbiddenKeys(JSON.stringify(result.data));
    }
  });

  it('builds RFQ intent prefill for PRICE_ON_REQUEST without price amounts', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      priceDisclosure: disclosure('PRICE_ON_REQUEST'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rfqEntryReason).toBe('PRICE_ON_REQUEST');
      assertNoForbiddenKeys(JSON.stringify(result.data));
    }
  });

  it('returns AUTH_REQUIRED for LOGIN_REQUIRED disclosure', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      isAuthenticated: false,
      priceDisclosure: disclosure('LOGIN_REQUIRED'),
    });

    expect(result).toEqual({ ok: false, reason: 'AUTH_REQUIRED' });
  });

  it('returns ELIGIBILITY_REQUIRED for ELIGIBILITY_REQUIRED disclosure', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      priceDisclosure: disclosure('ELIGIBILITY_REQUIRED'),
    });

    expect(result).toEqual({ ok: false, reason: 'ELIGIBILITY_REQUIRED' });
  });

  it('returns safe suppression for HIDDEN disclosure', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      priceDisclosure: disclosure('HIDDEN'),
    });

    expect(result).toEqual({ ok: false, reason: 'RFQ_PREFILL_NOT_AVAILABLE' });
  });

  it('returns BUYER_ORG_REQUIRED when buyer org is missing', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      buyerOrgId: null,
    });

    expect(result).toEqual({ ok: false, reason: 'BUYER_ORG_REQUIRED' });
  });

  it('returns SUPPLIER_NOT_AVAILABLE when supplier org is missing', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        supplierOrgId: null,
      },
    });

    expect(result).toEqual({ ok: false, reason: 'SUPPLIER_NOT_AVAILABLE' });
  });

  it('returns TENANT_SCOPE_DENIED on buyer org mismatch', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      authenticatedBuyerOrgId: 'buyer-org-other',
    });

    expect(result).toEqual({ ok: false, reason: 'TENANT_SCOPE_DENIED' });
  });

  it('returns ITEM_NOT_AVAILABLE for unpublished or inactive item', () => {
    const unpublished = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        isPublished: false,
      },
    });
    const inactive = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        isActive: false,
      },
    });

    expect(unpublished).toEqual({ ok: false, reason: 'ITEM_NOT_AVAILABLE' });
    expect(inactive).toEqual({ ok: false, reason: 'ITEM_NOT_AVAILABLE' });
  });

  it('returns SUPPLIER_NOT_AVAILABLE for unpublished or inactive supplier', () => {
    const unpublished = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        supplierIsPublished: false,
      },
    });
    const inactive = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        supplierIsActive: false,
      },
    });

    expect(unpublished).toEqual({ ok: false, reason: 'SUPPLIER_NOT_AVAILABLE' });
    expect(inactive).toEqual({ ok: false, reason: 'SUPPLIER_NOT_AVAILABLE' });
  });

  it('does not expose supplier policy internals or price-like keys in result', () => {
    const result = buildCatalogRfqPrefillContext(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      const serialized = JSON.stringify(result.data);
      assertNoForbiddenKeys(serialized);
      expect(serialized).not.toMatch(/"supplier_policy_source"\s*:/i);
      expect(serialized).not.toMatch(/"priceDisclosurePolicyMode"\s*:/i);
    }
  });

  it('omits unpublished/unsafe DPP and AI draft/extraction-like fields', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      item: {
        ...baseInput().item,
        publishedDppRef: 'draft-dpp-hidden',
        isPublishedDppRefSafe: false,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.publishedDppRef).toBeNull();
      const serialized = JSON.stringify(result.data);
      expect(serialized).not.toMatch(/"ai"\s*:/i);
      expect(serialized).not.toMatch(/"extraction"\s*:/i);
      expect(serialized).not.toMatch(/"evidence"\s*:/i);
    }
  });

  it('preserves safe draft quantity/notes only after sanitization', () => {
    const result = buildCatalogRfqPrefillContext({
      ...baseInput(),
      draftInput: {
        selectedQuantity: 12.9,
        buyerNotes: '  Need low-shrink treatment.  ',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selectedQuantity).toBe(12);
      expect(result.data.buyerNotes).toBe('Need low-shrink treatment.');
    }
  });

  it('does not create RFQ records or mutation metadata in prefill output', () => {
    const result = buildCatalogRfqPrefillContext(baseInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      const serialized = JSON.stringify(result.data);
      expect(serialized).not.toMatch(/"rfqId"\s*:/i);
      expect(serialized).not.toMatch(/"status"\s*:/i);
      expect(serialized).not.toMatch(/"submittedAt"\s*:/i);
      expect(serialized).not.toMatch(/"createdAt"\s*:/i);
    }
  });
});
