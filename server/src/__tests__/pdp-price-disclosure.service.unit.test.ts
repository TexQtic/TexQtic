import { describe, expect, it, vi } from 'vitest';

import type { BuyerCatalogPdpView } from '../types/index.js';
import * as resolverModule from '../services/pricing/priceDisclosureResolver.service.js';
import {
  attachPriceDisclosureToPdpView,
  type BuyerCatalogPdpViewBase,
} from '../services/pricing/pdpPriceDisclosure.service.js';

function makeBaseView(): BuyerCatalogPdpViewBase {
  return {
    itemId: 'item-001',
    supplierId: 'supplier-org-001',
    supplierDisplayName: 'Acme Textiles',
    title: 'Cotton Twill',
    description: 'Premium woven cotton',
    category: 'FABRIC_WOVEN',
    stage: 'FABRIC_WOVEN',
    media: [
      {
        mediaId: 'item-001_primary',
        mediaType: 'image',
        altText: null,
        signedUrl: 'https://cdn.example.com/image.jpg',
        displayOrder: 1,
      },
    ],
    specifications: {
      productCategory: 'FABRIC_WOVEN',
      fabricType: 'Twill',
      gsm: 180,
      material: 'Cotton',
      composition: '100% Cotton',
      color: 'Natural',
      widthCm: 150,
      construction: '3/1 Twill',
      certifications: ['GOTS'],
    },
    complianceSummary: {
      hasCertifications: true,
      certificates: [
        {
          certificateType: 'GOTS',
          issuerName: null,
          expiryDate: null,
          status: 'APPROVED',
        },
      ],
      humanReviewNotice:
        'Compliance data shown is supplier-attested and subject to human review',
    },
    availabilitySummary: {
      moqValue: 100,
      moqUnit: null,
      leadTimeDays: null,
      capacityIndicator: null,
    },
    rfqEntry: {
      triggerLabel: 'Request Quote',
      itemId: 'item-001',
      supplierId: 'supplier-org-001',
      itemTitle: 'Cotton Twill',
      category: 'FABRIC_WOVEN',
      stage: 'FABRIC_WOVEN',
    },
    pricePlaceholder: {
      label: 'Price available on request',
      subLabel: 'RFQ required for pricing',
      note: 'Pricing is confirmed through the quote process',
    },
  };
}

function assertForbiddenPriceKeysAbsent(serialized: string) {
  expect(serialized).not.toMatch(/"price"\s*:/i);
  expect(serialized).not.toMatch(/"amount"\s*:/i);
  expect(serialized).not.toMatch(/"unitPrice"\s*:/i);
  expect(serialized).not.toMatch(/"basePrice"\s*:/i);
  expect(serialized).not.toMatch(/"listPrice"\s*:/i);
  expect(serialized).not.toMatch(/"costPrice"\s*:/i);
  expect(serialized).not.toMatch(/"supplierPrice"\s*:/i);
  expect(serialized).not.toMatch(/"negotiatedPrice"\s*:/i);
}

describe('attachPriceDisclosureToPdpView', () => {
  it('includes priceDisclosure metadata with safe default when no supplier policy exists', () => {
    const result = attachPriceDisclosureToPdpView(makeBaseView(), {
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: null,
    });

    expect(result).toHaveProperty('priceDisclosure');
    expect(result.priceDisclosure).toMatchObject({
      price_visibility_state: 'PRICE_ON_REQUEST',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Price available on request',
      cta_type: 'REQUEST_QUOTE',
      supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
      rfq_required: true,
    });
  });

  it('preserves existing PDP identity/spec/media/compliance fields and RFQ handoff', () => {
    const base = makeBaseView();
    const result = attachPriceDisclosureToPdpView(base, {
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: null,
    });

    expect(result.itemId).toBe(base.itemId);
    expect(result.supplierId).toBe(base.supplierId);
    expect(result.media).toEqual(base.media);
    expect(result.specifications).toEqual(base.specifications);
    expect(result.complianceSummary).toEqual(base.complianceSummary);
    expect(result.rfqEntry).toEqual(base.rfqEntry);
    expect(result.pricePlaceholder).toEqual(base.pricePlaceholder);
  });

  it('suppressed state does not include raw price-like fields after serialization', () => {
    const contaminated = {
      ...makeBaseView(),
      price: 123,
      amount: 100,
      unitPrice: 99,
      basePrice: 90,
      listPrice: 120,
      costPrice: 60,
      supplierPrice: 80,
      negotiatedPrice: 75,
    } as unknown as BuyerCatalogPdpViewBase;

    const result = attachPriceDisclosureToPdpView(contaminated, {
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: null,
    });

    expect(result.priceDisclosure.price_value_visible).toBe(false);
    const serialized = JSON.stringify(result);
    assertForbiddenPriceKeysAbsent(serialized);
  });

  it('reuses Slice A resolver via shaping path (no ad hoc duplicated decision logic)', () => {
    const spy = vi.spyOn(resolverModule, 'resolvePriceDisclosureState');

    attachPriceDisclosureToPdpView(makeBaseView(), {
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: null,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('keeps safe suppression for relationship-only policy without relationship lookup', () => {
    const result = attachPriceDisclosureToPdpView(makeBaseView(), {
      buyer: {
        isAuthenticated: true,
        isEligible: true,
        buyerOrgId: 'buyer-org-001',
        supplierOrgId: 'supplier-org-001',
      },
      supplierPolicy: {
        mode: 'RELATIONSHIP_ONLY',
        source: 'SUPPLIER_DEFAULT',
      },
    });

    expect(result.priceDisclosure).toMatchObject({
      price_visibility_state: 'ELIGIBILITY_REQUIRED',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      cta_type: 'CHECK_ELIGIBILITY',
    });
  });

  it('does not change existing denial posture for cross-context access and stays suppressed', () => {
    const result = attachPriceDisclosureToPdpView(makeBaseView(), {
      buyer: {
        isAuthenticated: true,
        isEligible: true,
        buyerOrgId: 'buyer-org-A',
        supplierOrgId: 'supplier-org-B',
      },
      supplierPolicy: null,
    });

    expect(result.priceDisclosure.price_display_policy).toBe('SUPPRESS_VALUE');
    expect(result.priceDisclosure.price_value_visible).toBe(false);
  });

  it('returns a full BuyerCatalogPdpView contract with priceDisclosure', () => {
    const result: BuyerCatalogPdpView = attachPriceDisclosureToPdpView(makeBaseView(), {
      buyer: {
        isAuthenticated: true,
        isEligible: false,
      },
      supplierPolicy: null,
    });

    expect(result).toHaveProperty('priceDisclosure');
  });
});
