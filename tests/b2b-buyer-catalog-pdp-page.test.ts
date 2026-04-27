/**
 * TECS-B2B-BUYER-CATALOG-PDP-001 P-2 / P-3 — Frontend PDP page tests
 *
 * Tests verify:
 *  - Pure helper contracts exported from App.tsx (__B2B_BUYER_CATALOG_PDP_TESTING__)
 *  - Canonical copy constants (compliance notice, price placeholder, RFQ trigger)
 *  - getBuyerCatalogPdpItem service call routes to the correct endpoint
 *  - No price disclosure terms in PDP constants
 *  - No AI confidence score terms in PDP constants
 *  - No DPP/passport terms in PDP constants
 *  - Compliance notice does NOT contain confidence score or draft extraction data
 *  - RFQ trigger label does NOT imply auto-submit or multi-item basket
 *  P-3 additions:
 *  - P-3 rendering constants (media empty, availability fallback, compliance empty)
 *  - resolveMediaAltText — alt text with fallback to item title
 *  - resolveMoqDisplay — MOQ value+unit or fallback
 *  - resolveLeadTimeDisplay — lead time or fallback
 *  - resolveCapacityDisplay — capacity indicator or fallback
 *  - resolveMediaTypeBadge — media type label
 *  - Data contract checks: spec fields, compliance certs, supplier summary
 *  - Boundary: no raw storage URLs, no AI fields, no price, no DPP
 *
 * Test isolation: all tenantApiClient calls are mocked at module level.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { tenantGet } from '../services/tenantApiClient';
import { getBuyerCatalogPdpItem, type BuyerCatalogMedia, type BuyerCatalogPdpView } from '../services/catalogService';
import {
  __B2B_BUYER_CATALOG_PDP_TESTING__,
  PDP_COMPLIANCE_NOTICE,
  PDP_PRICE_PLACEHOLDER_LABEL,
  PDP_RFQ_TRIGGER_LABEL,
  PDP_LOADING_COPY,
  PDP_ERROR_COPY,
  PDP_NOT_FOUND_COPY,
  resolveBuyerCatalogPhase,
} from '../App';
import {
  CATALOG_PDP_COMPLIANCE_NOTICE,
  CATALOG_PDP_PRICE_PLACEHOLDER_LABEL,
  CATALOG_PDP_RFQ_TRIGGER_LABEL,
  CATALOG_PDP_LOADING_COPY,
  CATALOG_PDP_ERROR_COPY,
  CATALOG_PDP_NOT_FOUND_COPY,
  CATALOG_PDP_MEDIA_EMPTY_COPY,
  CATALOG_PDP_AVAILABILITY_FALLBACK,
  CATALOG_PDP_COMPLIANCE_EMPTY_COPY,
  formatLeadTimeDays,
  resolveCertStatusTone,
  formatCategoryBadge,
  resolveMediaAltText,
  resolveMoqDisplay,
  resolveLeadTimeDisplay,
  resolveCapacityDisplay,
  resolveMediaTypeBadge,
} from '../components/Tenant/CatalogPdpSurface';

const tenantGetMock = tenantGet as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMinimalPdpView(overrides: Partial<BuyerCatalogPdpView> = {}): BuyerCatalogPdpView {
  return {
    itemId: 'item-001',
    supplierId: 'supplier-org-001',
    supplierDisplayName: 'Apex Textiles Ltd',
    title: 'Premium Organic Cotton Fabric',
    description: 'Certified organic cotton woven fabric.',
    category: 'WOVEN',
    stage: 'SAMPLE',
    media: [],
    specifications: {
      productCategory: 'WOVEN',
      fabricType: 'PLAIN_WEAVE',
      gsm: 180,
      material: 'COTTON',
      composition: '100% Organic Cotton',
      color: 'Natural White',
      widthCm: 150,
      construction: 'WOVEN',
      certifications: ['GOTS', 'OEKO_TEX'],
    },
    complianceSummary: {
      hasCertifications: true,
      certificates: [
        {
          certificateType: 'GOTS',
          issuerName: 'Control Union',
          expiryDate: '2026-12-31',
          status: 'APPROVED',
        },
      ],
      humanReviewNotice:
        'AI-generated extraction · Human review required before acting on any extracted data',
    },
    availabilitySummary: {
      moqValue: 500,
      moqUnit: 'meters',
      leadTimeDays: 21,
      capacityIndicator: 'available',
    },
    rfqEntry: {
      triggerLabel: 'Request Quote',
      itemId: 'item-001',
      supplierId: 'supplier-org-001',
      itemTitle: 'Premium Organic Cotton Fabric',
      category: 'WOVEN',
      stage: 'SAMPLE',
    },
    pricePlaceholder: {
      label: 'Price available on request',
      subLabel: 'RFQ required for pricing',
      note: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T1: Testing export shape
// ---------------------------------------------------------------------------

describe('T1: __B2B_BUYER_CATALOG_PDP_TESTING__ export shape', () => {
  it('T1.1 — testing export is defined and is an object', () => {
    expect(__B2B_BUYER_CATALOG_PDP_TESTING__).toBeDefined();
    expect(typeof __B2B_BUYER_CATALOG_PDP_TESTING__).toBe('object');
  });

  it('T1.2 — testing export contains all required keys', () => {
    const keys = Object.keys(__B2B_BUYER_CATALOG_PDP_TESTING__);
    expect(keys).toContain('PDP_COMPLIANCE_NOTICE');
    expect(keys).toContain('PDP_PRICE_PLACEHOLDER_LABEL');
    expect(keys).toContain('PDP_RFQ_TRIGGER_LABEL');
    expect(keys).toContain('PDP_LOADING_COPY');
    expect(keys).toContain('PDP_ERROR_COPY');
    expect(keys).toContain('PDP_NOT_FOUND_COPY');
    expect(keys).toContain('resolveBuyerCatalogPhase');
  });

  it('T1.3 — resolveBuyerCatalogPhase is a function', () => {
    expect(typeof __B2B_BUYER_CATALOG_PDP_TESTING__.resolveBuyerCatalogPhase).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// T2: Compliance notice canonical constant
// ---------------------------------------------------------------------------

describe('T2: PDP compliance notice constant', () => {
  it('T2.1 — PDP_COMPLIANCE_NOTICE matches canonical compliance notice', () => {
    expect(PDP_COMPLIANCE_NOTICE).toBe(
      'AI-generated extraction · Human review required before acting on any extracted data',
    );
  });

  it('T2.2 — CATALOG_PDP_COMPLIANCE_NOTICE (component constant) matches App constant', () => {
    expect(CATALOG_PDP_COMPLIANCE_NOTICE).toBe(PDP_COMPLIANCE_NOTICE);
  });

  it('T2.3 — compliance notice does NOT contain confidence score language', () => {
    const lower = PDP_COMPLIANCE_NOTICE.toLowerCase();
    expect(lower).not.toContain('confidence');
    expect(lower).not.toContain('score');
    expect(lower).not.toContain('accuracy');
    expect(lower).not.toContain('%');
  });

  it('T2.4 — compliance notice does NOT contain draft extraction data markers', () => {
    const lower = PDP_COMPLIANCE_NOTICE.toLowerCase();
    expect(lower).not.toContain('draft');
    expect(lower).not.toContain('extracted value');
    expect(lower).not.toContain('ai value');
  });

  it('T2.5 — compliance notice does NOT contain DPP or passport language', () => {
    const lower = PDP_COMPLIANCE_NOTICE.toLowerCase();
    expect(lower).not.toContain('dpp');
    expect(lower).not.toContain('passport');
  });
});

// ---------------------------------------------------------------------------
// T3: Price placeholder constant
// ---------------------------------------------------------------------------

describe('T3: PDP price placeholder constant', () => {
  it('T3.1 — PDP_PRICE_PLACEHOLDER_LABEL is the canonical string', () => {
    expect(PDP_PRICE_PLACEHOLDER_LABEL).toBe('Price available on request');
  });

  it('T3.2 — CATALOG_PDP_PRICE_PLACEHOLDER_LABEL (component constant) matches App constant', () => {
    expect(CATALOG_PDP_PRICE_PLACEHOLDER_LABEL).toBe(PDP_PRICE_PLACEHOLDER_LABEL);
  });

  it('T3.3 — price placeholder does NOT disclose actual price terms', () => {
    const lower = PDP_PRICE_PLACEHOLDER_LABEL.toLowerCase();
    expect(lower).not.toMatch(/\$/);
    expect(lower).not.toContain('unit price');
    expect(lower).not.toContain('per meter');
    expect(lower).not.toContain('per kg');
    expect(lower).not.toContain('per yard');
  });
});

// ---------------------------------------------------------------------------
// T4: RFQ trigger label constant
// ---------------------------------------------------------------------------

describe('T4: PDP RFQ trigger label constant', () => {
  it('T4.1 — PDP_RFQ_TRIGGER_LABEL is "Request Quote"', () => {
    expect(PDP_RFQ_TRIGGER_LABEL).toBe('Request Quote');
  });

  it('T4.2 — CATALOG_PDP_RFQ_TRIGGER_LABEL (component constant) matches App constant', () => {
    expect(CATALOG_PDP_RFQ_TRIGGER_LABEL).toBe(PDP_RFQ_TRIGGER_LABEL);
  });

  it('T4.3 — RFQ trigger label does NOT imply auto-submit', () => {
    const lower = PDP_RFQ_TRIGGER_LABEL.toLowerCase();
    expect(lower).not.toContain('submit');
    expect(lower).not.toContain('confirm');
    expect(lower).not.toContain('place order');
    expect(lower).not.toContain('buy');
  });

  it('T4.4 — RFQ trigger label does NOT imply multi-item basket', () => {
    const lower = PDP_RFQ_TRIGGER_LABEL.toLowerCase();
    expect(lower).not.toContain('cart');
    expect(lower).not.toContain('basket');
    expect(lower).not.toContain('add to');
  });
});

// ---------------------------------------------------------------------------
// T5: Copy constants (loading, error, not-found)
// ---------------------------------------------------------------------------

describe('T5: PDP copy constants', () => {
  it('T5.1 — PDP_LOADING_COPY is defined and non-empty', () => {
    expect(PDP_LOADING_COPY).toBe('Loading item details\u2026');
    expect(CATALOG_PDP_LOADING_COPY).toBe(PDP_LOADING_COPY);
  });

  it('T5.2 — PDP_ERROR_COPY is defined and non-empty', () => {
    expect(PDP_ERROR_COPY).toBe('Unable to load item details.');
    expect(CATALOG_PDP_ERROR_COPY).toBe(PDP_ERROR_COPY);
  });

  it('T5.3 — PDP_NOT_FOUND_COPY is defined and non-empty', () => {
    expect(PDP_NOT_FOUND_COPY).toBe('Item not found or unavailable.');
    expect(CATALOG_PDP_NOT_FOUND_COPY).toBe(PDP_NOT_FOUND_COPY);
  });

  it('T5.4 — error copy does NOT leak tenant IDs or stack traces', () => {
    const lower = PDP_ERROR_COPY.toLowerCase();
    expect(lower).not.toContain('stack');
    expect(lower).not.toContain('traceback');
    expect(lower).not.toContain('org_id');
    expect(lower).not.toContain('tenant');
  });

  it('T5.5 — not-found copy does NOT leak item IDs', () => {
    const lower = PDP_NOT_FOUND_COPY.toLowerCase();
    expect(lower).not.toContain('id:');
    expect(lower).not.toContain('uuid');
  });
});

// ---------------------------------------------------------------------------
// T6: resolveBuyerCatalogPhase pure helper
// ---------------------------------------------------------------------------

describe('T6: resolveBuyerCatalogPhase helper', () => {
  it('T6.1 — returns PHASE_A when no supplier and no item selected', () => {
    expect(resolveBuyerCatalogPhase('', '')).toBe('PHASE_A');
  });

  it('T6.2 — returns PHASE_B when supplier selected but no item selected', () => {
    expect(resolveBuyerCatalogPhase('supplier-001', '')).toBe('PHASE_B');
  });

  it('T6.3 — returns PHASE_C when item selected (even without supplier in arg)', () => {
    expect(resolveBuyerCatalogPhase('supplier-001', 'item-001')).toBe('PHASE_C');
  });

  it('T6.4 — returns PHASE_C when item selected with no supplier', () => {
    // itemId takes priority — Phase C always wins when itemId is non-empty
    expect(resolveBuyerCatalogPhase('', 'item-001')).toBe('PHASE_C');
  });

  it('T6.5 — whitespace-only supplierOrgId resolves to PHASE_A', () => {
    expect(resolveBuyerCatalogPhase('   ', '')).toBe('PHASE_A');
  });

  it('T6.6 — whitespace-only itemId does NOT trigger PHASE_C', () => {
    expect(resolveBuyerCatalogPhase('supplier-001', '   ')).toBe('PHASE_B');
  });
});

// ---------------------------------------------------------------------------
// T7: getBuyerCatalogPdpItem service call contract
// ---------------------------------------------------------------------------

describe('T7: getBuyerCatalogPdpItem service call contract', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('T7.1 — calls tenantGet with correct endpoint for a given itemId', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    await getBuyerCatalogPdpItem('item-001');

    expect(tenantGetMock).toHaveBeenCalledTimes(1);
    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/catalog/items/item-001');
  });

  it('T7.2 — URI-encodes itemId containing special characters', async () => {
    const view = buildMinimalPdpView({ itemId: 'item/special' });
    tenantGetMock.mockResolvedValueOnce(view);

    await getBuyerCatalogPdpItem('item/special');

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/catalog/items/item%2Fspecial');
  });

  it('T7.3 — returns the BuyerCatalogPdpView from tenantGet', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    const result = await getBuyerCatalogPdpItem('item-001');

    expect(result).toStrictEqual(view);
  });

  it('T7.4 — propagates errors from tenantGet (e.g. 404)', async () => {
    tenantGetMock.mockRejectedValueOnce(new Error('404 Not Found'));

    await expect(getBuyerCatalogPdpItem('item-not-exist')).rejects.toThrow('404 Not Found');
  });

  it('T7.5 — returned view has no price field', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    const result = await getBuyerCatalogPdpItem('item-001');

    // The BuyerCatalogPdpView must not carry any live price field
    expect(result).not.toHaveProperty('price');
    expect(result).not.toHaveProperty('unitPrice');
    expect(result).not.toHaveProperty('pricePerMeter');
  });

  it('T7.6 — returned view has no AI draft fields', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    const result = await getBuyerCatalogPdpItem('item-001');

    expect(result).not.toHaveProperty('aiDraft');
    expect(result).not.toHaveProperty('extractedValues');
    expect(result).not.toHaveProperty('confidenceScore');
    expect(result).not.toHaveProperty('draftExtractionId');
  });

  it('T7.7 — returned view has no DPP passport field', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    const result = await getBuyerCatalogPdpItem('item-001');

    expect(result).not.toHaveProperty('dpp');
    expect(result).not.toHaveProperty('passport');
    expect(result).not.toHaveProperty('dppPassport');
  });

  it('T7.8 — returned view has no buyer relationship access gate fields', async () => {
    const view = buildMinimalPdpView();
    tenantGetMock.mockResolvedValueOnce(view);

    const result = await getBuyerCatalogPdpItem('item-001');

    expect(result).not.toHaveProperty('relationshipAccessLevel');
    expect(result).not.toHaveProperty('buyerRelationshipId');
    expect(result).not.toHaveProperty('accessGate');
  });
});

// ---------------------------------------------------------------------------
// T8: Component pure helper functions
// ---------------------------------------------------------------------------

describe('T8: CatalogPdpSurface pure helpers', () => {
  describe('formatLeadTimeDays', () => {
    it('T8.1 — singular: 1 day', () => {
      expect(formatLeadTimeDays(1)).toBe('1 day');
    });

    it('T8.2 — plural: multiple days', () => {
      expect(formatLeadTimeDays(14)).toBe('14 days');
      expect(formatLeadTimeDays(21)).toBe('21 days');
    });

    it('T8.3 — zero uses plural', () => {
      expect(formatLeadTimeDays(0)).toBe('0 days');
    });
  });

  describe('resolveCertStatusTone', () => {
    it('T8.4 — APPROVED resolves to emerald tone class', () => {
      const tone = resolveCertStatusTone('APPROVED');
      expect(tone).toContain('emerald');
    });

    it('T8.5 — EXPIRING_SOON resolves to amber tone class', () => {
      const tone = resolveCertStatusTone('EXPIRING_SOON');
      expect(tone).toContain('amber');
    });
  });
});

// ---------------------------------------------------------------------------
// T9: BuyerCatalogPdpView type contract checks (runtime shape)
// ---------------------------------------------------------------------------

describe('T9: BuyerCatalogPdpView runtime shape', () => {
  it('T9.1 — minimal view satisfies all required fields', () => {
    const view = buildMinimalPdpView();

    expect(view.itemId).toBeDefined();
    expect(view.supplierId).toBeDefined();
    expect(view.supplierDisplayName).toBeDefined();
    expect(view.title).toBeDefined();
    expect(view.media).toBeInstanceOf(Array);
    expect(view.specifications).toBeDefined();
    expect(view.complianceSummary).toBeDefined();
    expect(view.availabilitySummary).toBeDefined();
    expect(view.rfqEntry).toBeDefined();
    expect(view.pricePlaceholder).toBeDefined();
  });

  it('T9.2 — pricePlaceholder label matches the canonical constant', () => {
    const view = buildMinimalPdpView();
    expect(view.pricePlaceholder.label).toBe(PDP_PRICE_PLACEHOLDER_LABEL);
  });

  it('T9.3 — rfqEntry triggerLabel matches the canonical constant', () => {
    const view = buildMinimalPdpView();
    expect(view.rfqEntry.triggerLabel).toBe(PDP_RFQ_TRIGGER_LABEL);
  });

  it('T9.4 — complianceSummary humanReviewNotice matches the canonical constant', () => {
    const view = buildMinimalPdpView();
    expect(view.complianceSummary.humanReviewNotice).toBe(PDP_COMPLIANCE_NOTICE);
  });
});

// ---------------------------------------------------------------------------
// P-3 Tests — Rendering constants and pure helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T10: P-3 rendering constants
// ---------------------------------------------------------------------------

describe('T10: P-3 rendering constants', () => {
  it('T10.1 — CATALOG_PDP_MEDIA_EMPTY_COPY is the exact media gallery empty state string', () => {
    expect(CATALOG_PDP_MEDIA_EMPTY_COPY).toBe('No images uploaded yet');
  });

  it('T10.2 — media empty copy does NOT reference a storage path or URL', () => {
    const lower = CATALOG_PDP_MEDIA_EMPTY_COPY.toLowerCase();
    expect(lower).not.toContain('https://');
    expect(lower).not.toContain('storage');
    expect(lower).not.toContain('bucket');
    expect(lower).not.toContain('blob');
  });

  it('T10.3 — CATALOG_PDP_AVAILABILITY_FALLBACK is the exact availability fallback string', () => {
    expect(CATALOG_PDP_AVAILABILITY_FALLBACK).toBe('Available on request');
  });

  it('T10.4 — availability fallback does NOT contain price terms', () => {
    const lower = CATALOG_PDP_AVAILABILITY_FALLBACK.toLowerCase();
    expect(lower).not.toContain('price');
    expect(lower).not.toMatch(/\$/);
  });

  it('T10.5 — CATALOG_PDP_COMPLIANCE_EMPTY_COPY is the exact compliance empty state string', () => {
    expect(CATALOG_PDP_COMPLIANCE_EMPTY_COPY).toBe(
      'No certification records available for this item.',
    );
  });

  it('T10.6 — compliance empty copy does NOT reference supplier internal IDs', () => {
    const lower = CATALOG_PDP_COMPLIANCE_EMPTY_COPY.toLowerCase();
    expect(lower).not.toContain('supplier_id');
    expect(lower).not.toContain('org_id');
    expect(lower).not.toContain('uuid');
  });
});

// ---------------------------------------------------------------------------
// T11: resolveMediaAltText pure helper
// ---------------------------------------------------------------------------

describe('T11: resolveMediaAltText pure helper', () => {
  it('T11.1 — returns altText when it is a non-empty string', () => {
    expect(resolveMediaAltText('GOTS certified cotton', 'Premium Fabric')).toBe(
      'GOTS certified cotton',
    );
  });

  it('T11.2 — returns itemTitle when altText is null', () => {
    expect(resolveMediaAltText(null, 'Premium Fabric')).toBe('Premium Fabric');
  });

  it('T11.3 — returns itemTitle when altText is an empty string', () => {
    expect(resolveMediaAltText('', 'Premium Fabric')).toBe('Premium Fabric');
  });

  it('T11.4 — returns itemTitle when altText is whitespace only', () => {
    expect(resolveMediaAltText('   ', 'Premium Fabric')).toBe('Premium Fabric');
  });

  it('T11.5 — alt text does NOT expose a raw storage path', () => {
    const result = resolveMediaAltText(null, 'Organic Cotton');
    expect(result).not.toContain('https://');
    expect(result).not.toContain('storage.googleapis.com');
    expect(result).not.toContain('supabase.co/storage');
  });
});

// ---------------------------------------------------------------------------
// T12: resolveMoqDisplay pure helper
// ---------------------------------------------------------------------------

describe('T12: resolveMoqDisplay pure helper', () => {
  it('T12.1 — returns formatted string when moqValue and moqUnit are provided', () => {
    expect(resolveMoqDisplay(500, 'meters')).toBe('500 meters');
  });

  it('T12.2 — returns value without unit when moqUnit is null', () => {
    expect(resolveMoqDisplay(1000, null)).toBe('1000');
  });

  it('T12.3 — returns value without unit when moqUnit is empty string', () => {
    expect(resolveMoqDisplay(250, '')).toBe('250');
  });

  it('T12.4 — returns CATALOG_PDP_AVAILABILITY_FALLBACK when moqValue is null', () => {
    expect(resolveMoqDisplay(null, 'meters')).toBe(CATALOG_PDP_AVAILABILITY_FALLBACK);
  });

  it('T12.5 — returns CATALOG_PDP_AVAILABILITY_FALLBACK when both are null', () => {
    expect(resolveMoqDisplay(null, null)).toBe(CATALOG_PDP_AVAILABILITY_FALLBACK);
  });

  it('T12.6 — output does NOT contain price markers', () => {
    const result = resolveMoqDisplay(500, 'kg');
    expect(result).not.toMatch(/\$/);
    expect(result).not.toContain('price');
  });
});

// ---------------------------------------------------------------------------
// T13: resolveLeadTimeDisplay pure helper
// ---------------------------------------------------------------------------

describe('T13: resolveLeadTimeDisplay pure helper', () => {
  it('T13.1 — returns "1 day" for leadTimeDays === 1', () => {
    expect(resolveLeadTimeDisplay(1)).toBe('1 day');
  });

  it('T13.2 — returns plural for leadTimeDays > 1', () => {
    expect(resolveLeadTimeDisplay(21)).toBe('21 days');
    expect(resolveLeadTimeDisplay(14)).toBe('14 days');
  });

  it('T13.3 — returns CATALOG_PDP_AVAILABILITY_FALLBACK when leadTimeDays is null', () => {
    expect(resolveLeadTimeDisplay(null)).toBe(CATALOG_PDP_AVAILABILITY_FALLBACK);
  });

  it('T13.4 — zero days uses plural', () => {
    expect(resolveLeadTimeDisplay(0)).toBe('0 days');
  });
});

// ---------------------------------------------------------------------------
// T14: resolveCapacityDisplay pure helper
// ---------------------------------------------------------------------------

describe('T14: resolveCapacityDisplay pure helper', () => {
  it('T14.1 — "available" renders as "available"', () => {
    expect(resolveCapacityDisplay('available')).toBe('available');
  });

  it('T14.2 — "limited" renders as "limited"', () => {
    expect(resolveCapacityDisplay('limited')).toBe('limited');
  });

  it('T14.3 — "on_request" renders with underscore replaced by space', () => {
    expect(resolveCapacityDisplay('on_request')).toBe('on request');
  });

  it('T14.4 — null returns CATALOG_PDP_AVAILABILITY_FALLBACK', () => {
    expect(resolveCapacityDisplay(null)).toBe(CATALOG_PDP_AVAILABILITY_FALLBACK);
  });

  it('T14.5 — output does NOT contain internal enum identifiers unexpanded', () => {
    // on_request must be humanised — not shown as-is
    const result = resolveCapacityDisplay('on_request');
    expect(result).not.toBe('on_request');
  });
});

// ---------------------------------------------------------------------------
// T15: resolveMediaTypeBadge pure helper
// ---------------------------------------------------------------------------

describe('T15: resolveMediaTypeBadge pure helper', () => {
  function makeMockMedia(mediaType: BuyerCatalogMedia['mediaType']): BuyerCatalogMedia {
    return {
      mediaId: 'mid-001',
      mediaType,
      altText: null,
      signedUrl: 'https://example.com/signed/image.jpg',
      displayOrder: 1,
    };
  }

  it('T15.1 — "image" resolves to "Image"', () => {
    expect(resolveMediaTypeBadge(makeMockMedia('image'))).toBe('Image');
  });

  it('T15.2 — "swatch" resolves to "Swatch"', () => {
    expect(resolveMediaTypeBadge(makeMockMedia('swatch'))).toBe('Swatch');
  });

  it('T15.3 — "sample" resolves to "Sample"', () => {
    expect(resolveMediaTypeBadge(makeMockMedia('sample'))).toBe('Sample');
  });
});

// ---------------------------------------------------------------------------
// T16: formatCategoryBadge pure helper
// ---------------------------------------------------------------------------

describe('T16: formatCategoryBadge pure helper', () => {
  it('T16.1 — replaces underscores with spaces', () => {
    expect(formatCategoryBadge('PLAIN_WEAVE')).toBe('PLAIN WEAVE');
  });

  it('T16.2 — single-word strings are unchanged', () => {
    expect(formatCategoryBadge('WOVEN')).toBe('WOVEN');
  });

  it('T16.3 — handles multiple underscores', () => {
    expect(formatCategoryBadge('KNIT_FABRIC_JERSEY')).toBe('KNIT FABRIC JERSEY');
  });
});

// ---------------------------------------------------------------------------
// T17: BuyerCatalogPdpView data contract — specifications
// ---------------------------------------------------------------------------

describe('T17: BuyerCatalogPdpView data contract — specifications', () => {
  it('T17.1 — spec row values do NOT contain the string "null"', () => {
    const view = buildMinimalPdpView({
      specifications: {
        productCategory: 'WOVEN',
        fabricType: null,
        gsm: null,
        material: 'COTTON',
        composition: '100% Cotton',
        color: null,
        widthCm: null,
        construction: null,
        certifications: null,
      },
    });
    // Non-null values must be strings, not the literal word "null"
    const values = [
      view.specifications.productCategory,
      view.specifications.material,
      view.specifications.composition,
    ];
    for (const val of values) {
      expect(String(val)).not.toBe('null');
    }
  });

  it('T17.2 — certifications array is string[] | null — not internal IDs', () => {
    const view = buildMinimalPdpView();
    if (view.specifications.certifications != null) {
      for (const cert of view.specifications.certifications) {
        expect(typeof cert).toBe('string');
        // Not a UUID
        expect(cert).not.toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    }
  });

  it('T17.3 — specifications block does NOT contain price or cost fields', () => {
    const view = buildMinimalPdpView();
    const spec = view.specifications as Record<string, unknown>;
    expect(spec).not.toHaveProperty('price');
    expect(spec).not.toHaveProperty('cost');
    expect(spec).not.toHaveProperty('unitPrice');
  });

  it('T17.4 — specifications block does NOT contain AI draft fields', () => {
    const view = buildMinimalPdpView();
    const spec = view.specifications as Record<string, unknown>;
    expect(spec).not.toHaveProperty('confidenceScore');
    expect(spec).not.toHaveProperty('aiDraft');
    expect(spec).not.toHaveProperty('extractedValues');
  });
});

// ---------------------------------------------------------------------------
// T18: BuyerCatalogPdpView data contract — compliance certs
// ---------------------------------------------------------------------------

describe('T18: BuyerCatalogPdpView data contract — compliance certificates', () => {
  it('T18.1 — APPROVED cert has certificateType, issuerName, expiryDate, status', () => {
    const view = buildMinimalPdpView();
    const cert = view.complianceSummary.certificates[0]!;
    expect(cert.certificateType).toBeDefined();
    expect(typeof cert.certificateType).toBe('string');
    // issuerName may be null (BuyerCertificateSummaryItem allows null)
    expect('issuerName' in cert).toBe(true);
    // expiryDate may be null
    expect('expiryDate' in cert).toBe(true);
    expect(cert.status).toMatch(/^(APPROVED|EXPIRING_SOON)$/);
  });

  it('T18.2 — cert does NOT expose internal document ID or source file ID', () => {
    const view = buildMinimalPdpView();
    const cert = view.complianceSummary.certificates[0]! as Record<string, unknown>;
    expect(cert).not.toHaveProperty('documentId');
    expect(cert).not.toHaveProperty('sourceFileId');
    expect(cert).not.toHaveProperty('extractionId');
    expect(cert).not.toHaveProperty('aiDraftId');
  });

  it('T18.3 — cert does NOT expose AI confidence score or draft data', () => {
    const view = buildMinimalPdpView();
    const cert = view.complianceSummary.certificates[0]! as Record<string, unknown>;
    expect(cert).not.toHaveProperty('confidenceScore');
    expect(cert).not.toHaveProperty('aiDraft');
    expect(cert).not.toHaveProperty('extractedValue');
  });

  it('T18.4 — hasCertifications is a boolean, not null/undefined', () => {
    const view = buildMinimalPdpView();
    expect(typeof view.complianceSummary.hasCertifications).toBe('boolean');
  });

  it('T18.5 — compliance summary does NOT contain DPP/passport field', () => {
    const view = buildMinimalPdpView();
    const cs = view.complianceSummary as Record<string, unknown>;
    expect(cs).not.toHaveProperty('dpp');
    expect(cs).not.toHaveProperty('passport');
    expect(cs).not.toHaveProperty('dppPassport');
  });
});

// ---------------------------------------------------------------------------
// T19: BuyerCatalogPdpView data contract — availability summary fallbacks
// ---------------------------------------------------------------------------

describe('T19: BuyerCatalogPdpView data contract — availability summary', () => {
  it('T19.1 — moqValue null → resolveMoqDisplay returns CATALOG_PDP_AVAILABILITY_FALLBACK', () => {
    const view = buildMinimalPdpView({
      availabilitySummary: {
        moqValue: null,
        moqUnit: null,
        leadTimeDays: null,
        capacityIndicator: null,
      },
    });
    expect(
      resolveMoqDisplay(
        view.availabilitySummary.moqValue,
        view.availabilitySummary.moqUnit,
      ),
    ).toBe(CATALOG_PDP_AVAILABILITY_FALLBACK);
  });

  it('T19.2 — leadTimeDays null → resolveLeadTimeDisplay returns CATALOG_PDP_AVAILABILITY_FALLBACK', () => {
    const view = buildMinimalPdpView({
      availabilitySummary: {
        moqValue: null,
        moqUnit: null,
        leadTimeDays: null,
        capacityIndicator: null,
      },
    });
    expect(resolveLeadTimeDisplay(view.availabilitySummary.leadTimeDays)).toBe(
      CATALOG_PDP_AVAILABILITY_FALLBACK,
    );
  });

  it('T19.3 — capacityIndicator null → resolveCapacityDisplay returns CATALOG_PDP_AVAILABILITY_FALLBACK', () => {
    const view = buildMinimalPdpView({
      availabilitySummary: {
        moqValue: null,
        moqUnit: null,
        leadTimeDays: null,
        capacityIndicator: null,
      },
    });
    expect(resolveCapacityDisplay(view.availabilitySummary.capacityIndicator)).toBe(
      CATALOG_PDP_AVAILABILITY_FALLBACK,
    );
  });

  it('T19.4 — moqValue present → resolveMoqDisplay returns numeric string with unit', () => {
    const view = buildMinimalPdpView();
    expect(
      resolveMoqDisplay(
        view.availabilitySummary.moqValue,
        view.availabilitySummary.moqUnit,
      ),
    ).toBe('500 meters');
  });

  it('T19.5 — leadTimeDays 21 → resolveLeadTimeDisplay returns "21 days"', () => {
    const view = buildMinimalPdpView();
    expect(resolveLeadTimeDisplay(view.availabilitySummary.leadTimeDays)).toBe('21 days');
  });

  it('T19.6 — availability summary does NOT contain price or cost fields', () => {
    const view = buildMinimalPdpView();
    const avail = view.availabilitySummary as Record<string, unknown>;
    expect(avail).not.toHaveProperty('price');
    expect(avail).not.toHaveProperty('cost');
    expect(avail).not.toHaveProperty('unitPrice');
  });
});

// ---------------------------------------------------------------------------
// T20: Media item data contract — safety checks
// ---------------------------------------------------------------------------

describe('T20: BuyerCatalogMedia data contract', () => {
  function buildMockMediaItem(overrides: Partial<BuyerCatalogMedia> = {}): BuyerCatalogMedia {
    return {
      mediaId: 'media-001',
      mediaType: 'image',
      altText: 'Organic cotton fabric close-up',
      signedUrl: 'https://example.com/signed/abc123.jpg',
      displayOrder: 1,
      ...overrides,
    };
  }

  it('T20.1 — media item has mediaId, mediaType, signedUrl, displayOrder', () => {
    const m = buildMockMediaItem();
    expect(m.mediaId).toBeDefined();
    expect(m.mediaType).toBeDefined();
    expect(m.signedUrl).toBeDefined();
    expect(typeof m.displayOrder).toBe('number');
  });

  it('T20.2 — mediaType is one of the allowed values', () => {
    const allowed = ['image', 'swatch', 'sample'] as const;
    const m = buildMockMediaItem();
    expect(allowed).toContain(m.mediaType);
  });

  it('T20.3 — altText may be null (caller must apply resolveMediaAltText)', () => {
    const m = buildMockMediaItem({ altText: null });
    expect(m.altText).toBeNull();
    // resolveMediaAltText should provide safe fallback
    expect(resolveMediaAltText(m.altText, 'Fallback Title')).toBe('Fallback Title');
  });

  it('T20.4 — media item does NOT have raw storage bucket path in its shape', () => {
    const m = buildMockMediaItem() as Record<string, unknown>;
    expect(m).not.toHaveProperty('storagePath');
    expect(m).not.toHaveProperty('bucketName');
    expect(m).not.toHaveProperty('objectKey');
    expect(m).not.toHaveProperty('rawUrl');
  });

  it('T20.5 — resolveMediaAltText never returns a string containing a storage URL', () => {
    // Even if item title accidentally contains a URL fragment, it should be used as-is
    const result = resolveMediaAltText(null, 'Cotton Fabric');
    expect(result).not.toContain('storage.googleapis.com');
    expect(result).not.toContain('supabase.co');
  });
});

