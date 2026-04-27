/**
 * TECS-B2B-BUYER-CATALOG-PDP-001 P-2 — Frontend PDP page shell tests
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
 *
 * Boundaries (P-2):
 *  - No deep spec rendering tests (P-3)
 *  - No media gallery rendering tests (P-3)
 *  - No compliance doc deep rendering (P-5)
 *  - No RFQ prefill payload tests (P-4)
 *  - No DPP integration tests
 *
 * Test isolation: all tenantApiClient calls are mocked at module level.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { tenantGet } from '../services/tenantApiClient';
import { getBuyerCatalogPdpItem, type BuyerCatalogPdpView } from '../services/catalogService';
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
  formatLeadTimeDays,
  resolveCertStatusTone,
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
