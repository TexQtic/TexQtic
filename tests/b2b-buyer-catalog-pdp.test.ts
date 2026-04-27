/**
 * TECS-B2B-BUYER-CATALOG-PDP-001 P-1
 * Backend PDP read contract — buyer-safe service tests
 *
 * Test strategy:
 * - T1: getBuyerCatalogPdpItem calls the correct endpoint with itemId
 * - T2: response contains all required BuyerCatalogPdpView fields
 * - T3: response contains NO price field
 * - T4: response contains NO publicationPosture field
 * - T5: response contains NO AI draft fields (no confidence scores, no extraction IDs)
 * - T6: response contains NO raw storage URLs (only signedUrl from media array)
 * - T7: response contains pricePlaceholder with correct label
 * - T8: complianceSummary.humanReviewNotice is present (structural constant)
 * - T9: rfqEntry contains only safe handoff fields (no buyer_message, no price, no auth)
 * - T10: missing item (404) propagates rejection
 * - T11: out-of-scope item (404) propagates rejection
 * - T12: response contains BuyerCatalogMedia array (possibly empty)
 * - T13: specifications has all 9 textile fields + certifications label list (no raw JSONB IDs)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import {
  getBuyerCatalogPdpItem,
  type BuyerCatalogPdpView,
} from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);

const ITEM_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SUPPLIER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePdpView(overrides: Partial<BuyerCatalogPdpView> = {}): BuyerCatalogPdpView {
  return {
    itemId: ITEM_ID,
    supplierId: SUPPLIER_ID,
    supplierDisplayName: 'Acme Textiles Pvt Ltd',
    title: 'Premium Cotton Twill',
    description: 'Durable cotton twill suitable for industrial use.',
    category: 'FABRIC_WOVEN',
    stage: 'FABRIC_WOVEN',
    media: [],
    specifications: {
      productCategory: 'FABRIC_WOVEN',
      fabricType: 'Twill',
      gsm: 200,
      material: 'Cotton',
      composition: '100% Cotton',
      color: 'Natural',
      widthCm: 150,
      construction: '3/1 Twill',
      certifications: ['GOTS', 'OEKO-TEX'],
    },
    complianceSummary: {
      hasCertifications: true,
      certificates: [
        {
          certificateType: 'GOTS',
          issuerName: null,
          expiryDate: '2026-12-31T00:00:00.000Z',
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
      itemId: ITEM_ID,
      supplierId: SUPPLIER_ID,
      itemTitle: 'Premium Cotton Twill',
      category: 'FABRIC_WOVEN',
      stage: 'FABRIC_WOVEN',
    },
    pricePlaceholder: {
      label: 'Price available on request',
      subLabel: 'RFQ required for pricing',
      note: 'Pricing is confirmed through the quote process',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T1 — getBuyerCatalogPdpItem calls correct endpoint with itemId
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T1: calls correct endpoint', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('calls /api/tenant/catalog/items/:itemId with the correct item ID', async () => {
    tenantGetMock.mockResolvedValue(makePdpView());

    await getBuyerCatalogPdpItem(ITEM_ID);

    expect(tenantGetMock).toHaveBeenCalledWith(
      `/api/tenant/catalog/items/${ITEM_ID}`,
    );
  });

  it('URL-encodes special characters in itemId', async () => {
    tenantGetMock.mockResolvedValue(makePdpView());

    await getBuyerCatalogPdpItem('item/with/slashes');

    const callArg: string = tenantGetMock.mock.calls[0][0] as string;
    expect(callArg).toContain('item%2Fwith%2Fslashes');
  });
});

// ---------------------------------------------------------------------------
// T2 — response contains all required BuyerCatalogPdpView fields
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T2: response shape', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('returns all required top-level fields', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result).toMatchObject({
      itemId: ITEM_ID,
      supplierId: SUPPLIER_ID,
      supplierDisplayName: 'Acme Textiles Pvt Ltd',
      title: 'Premium Cotton Twill',
    });
    expect(result).toHaveProperty('media');
    expect(result).toHaveProperty('specifications');
    expect(result).toHaveProperty('complianceSummary');
    expect(result).toHaveProperty('availabilitySummary');
    expect(result).toHaveProperty('rfqEntry');
    expect(result).toHaveProperty('pricePlaceholder');
  });
});

// ---------------------------------------------------------------------------
// T3 — response contains NO price field
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T3: no price field', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('does not expose any price field on the top-level view', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result).not.toHaveProperty('price');
    expect(result).not.toHaveProperty('unitPrice');
    expect(result).not.toHaveProperty('pricePerMeter');
    expect(result).not.toHaveProperty('priceDisclosure');
  });

  it('does not expose price field in specifications', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.specifications).not.toHaveProperty('price');
  });

  it('pricePlaceholder label is always the placeholder string', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.pricePlaceholder.label).toBe('Price available on request');
  });
});

// ---------------------------------------------------------------------------
// T4 — response contains NO publicationPosture field
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T4: no publicationPosture', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('does not expose publicationPosture on the view', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result).not.toHaveProperty('publicationPosture');
  });
});

// ---------------------------------------------------------------------------
// T5 — response contains NO AI draft / extraction fields
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T5: no AI draft fields', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('does not expose AI extraction fields', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    // No top-level AI fields
    expect(result).not.toHaveProperty('extractedFields');
    expect(result).not.toHaveProperty('confidenceScore');
    expect(result).not.toHaveProperty('overallConfidence');
    expect(result).not.toHaveProperty('aiSuggestions');
    expect(result).not.toHaveProperty('documentExtractionDraftId');
    expect(result).not.toHaveProperty('extractionStatus');
  });

  it('certificates in complianceSummary do not expose internal IDs or confidence scores', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);
    const cert = result.complianceSummary.certificates[0];

    if (cert) {
      expect(cert).not.toHaveProperty('id');
      expect(cert).not.toHaveProperty('orgId');
      expect(cert).not.toHaveProperty('lifecycleStateId');
      expect(cert).not.toHaveProperty('confidence');
    }
  });
});

// ---------------------------------------------------------------------------
// T6 — media signedUrl is the only URL field; no raw storage URLs exposed
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T6: media structure', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('media is an array (possibly empty)', async () => {
    const view = makePdpView({ media: [] });
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(Array.isArray(result.media)).toBe(true);
  });

  it('media item has mediaId, mediaType, signedUrl, displayOrder', async () => {
    const view = makePdpView({
      media: [{
        mediaId: `${ITEM_ID}_primary`,
        mediaType: 'image',
        altText: null,
        signedUrl: 'https://storage.example.com/img.jpg',
        displayOrder: 1,
      }],
    });
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.media[0]).toMatchObject({
      mediaId: `${ITEM_ID}_primary`,
      mediaType: 'image',
      signedUrl: 'https://storage.example.com/img.jpg',
      displayOrder: 1,
    });
  });

  it('top-level response does not have a raw imageUrl field', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result).not.toHaveProperty('imageUrl');
  });
});

// ---------------------------------------------------------------------------
// T7 — pricePlaceholder is structurally present with correct shape
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T7: pricePlaceholder shape', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('pricePlaceholder has label, subLabel, note', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.pricePlaceholder).toMatchObject({
      label: 'Price available on request',
      subLabel: 'RFQ required for pricing',
    });
    expect(result.pricePlaceholder).toHaveProperty('note');
  });
});

// ---------------------------------------------------------------------------
// T8 — complianceSummary.humanReviewNotice is always present
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T8: humanReviewNotice structural constant', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('humanReviewNotice is a non-empty string', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(typeof result.complianceSummary.humanReviewNotice).toBe('string');
    expect(result.complianceSummary.humanReviewNotice.length).toBeGreaterThan(0);
  });

  it('humanReviewNotice is the canonical attestation string', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.complianceSummary.humanReviewNotice).toBe(
      'Compliance data shown is supplier-attested and subject to human review',
    );
  });

  it('hasCertifications is false when certificates array is empty', async () => {
    const view = makePdpView({
      complianceSummary: {
        hasCertifications: false,
        certificates: [],
        humanReviewNotice:
          'Compliance data shown is supplier-attested and subject to human review',
      },
    });
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.complianceSummary.hasCertifications).toBe(false);
    expect(result.complianceSummary.certificates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T9 — rfqEntry contains only safe handoff fields
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T9: rfqEntry safe fields', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('rfqEntry has itemId, supplierId, itemTitle, triggerLabel, category, stage', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.rfqEntry).toMatchObject({
      triggerLabel: 'Request Quote',
      itemId: ITEM_ID,
      supplierId: SUPPLIER_ID,
      itemTitle: 'Premium Cotton Twill',
    });
    expect(result.rfqEntry).toHaveProperty('category');
    expect(result.rfqEntry).toHaveProperty('stage');
  });

  it('rfqEntry does not expose price, buyer_message, auth tokens', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.rfqEntry).not.toHaveProperty('price');
    expect(result.rfqEntry).not.toHaveProperty('buyerMessage');
    expect(result.rfqEntry).not.toHaveProperty('authToken');
    expect(result.rfqEntry).not.toHaveProperty('orgId');
  });
});

// ---------------------------------------------------------------------------
// T10 — missing item (404) propagates rejection
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T10: missing item 404', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('rejects when server returns a 404-style error', async () => {
    tenantGetMock.mockRejectedValue(new Error('Not Found'));

    await expect(getBuyerCatalogPdpItem(ITEM_ID)).rejects.toThrow('Not Found');
  });
});

// ---------------------------------------------------------------------------
// T11 — out-of-scope item (not B2B_PUBLIC) propagates rejection
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T11: out-of-scope item 404', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('rejects when server returns 404 for non-publication-eligible item', async () => {
    tenantGetMock.mockRejectedValue(new Error('Catalog item not found'));

    await expect(getBuyerCatalogPdpItem('non-eligible-item-id')).rejects.toThrow(
      'Catalog item not found',
    );
  });
});

// ---------------------------------------------------------------------------
// T12 — media array is always present (possibly empty)
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T12: media array contract', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('media is an empty array when item has no imageUrl', async () => {
    const view = makePdpView({ media: [] });
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.media).toEqual([]);
  });

  it('media has exactly one entry when item has imageUrl', async () => {
    const view = makePdpView({
      media: [{
        mediaId: `${ITEM_ID}_primary`,
        mediaType: 'image',
        altText: null,
        signedUrl: 'https://storage.example.com/img.jpg',
        displayOrder: 1,
      }],
    });
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.media).toHaveLength(1);
    expect(result.media[0]!.mediaType).toBe('image');
  });
});

// ---------------------------------------------------------------------------
// T13 — specifications has all 9 textile fields + certifications label list
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-PDP-001 — T13: specifications structure', () => {
  beforeEach(() => { tenantGetMock.mockReset(); });

  it('specifications has all 9 textile fields', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);
    const spec = result.specifications;

    expect(spec).toHaveProperty('productCategory');
    expect(spec).toHaveProperty('fabricType');
    expect(spec).toHaveProperty('gsm');
    expect(spec).toHaveProperty('material');
    expect(spec).toHaveProperty('composition');
    expect(spec).toHaveProperty('color');
    expect(spec).toHaveProperty('widthCm');
    expect(spec).toHaveProperty('construction');
    expect(spec).toHaveProperty('certifications');
  });

  it('specifications.certifications is a string label list (not raw JSONB objects)', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    const certs = result.specifications.certifications;
    if (certs != null) {
      expect(Array.isArray(certs)).toBe(true);
      // Each entry must be a plain string (not an object with id, orgId, etc.)
      for (const c of certs) {
        expect(typeof c).toBe('string');
      }
    }
  });

  it('specifications does not expose price', async () => {
    const view = makePdpView();
    tenantGetMock.mockResolvedValue(view);

    const result = await getBuyerCatalogPdpItem(ITEM_ID);

    expect(result.specifications).not.toHaveProperty('price');
  });
});
