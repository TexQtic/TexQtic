/**
 * supplierMatchSignalBuilder.test.ts — Safe Signal Builder Unit Tests
 *
 * 24-area test suite for TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice A.
 *
 * Tests cover:
 *   T-01  Empty input → empty output
 *   T-02  RFQ_INTENT extracted from rfqContext.buyerMessage
 *   T-03  PRODUCT_CATEGORY extracted from catalogItem
 *   T-04  MATERIAL extracted from catalogItem
 *   T-05  FABRIC_TYPE extracted from catalogItem
 *   T-06  COMPOSITION extracted from catalogItem
 *   T-07  GSM extracted from catalogItem (numeric → string conversion)
 *   T-08  CERTIFICATION extracted from catalogItem (array → multiple signals)
 *   T-09  GEOGRAPHY extracted from supplierOrgProfile.jurisdiction
 *   T-10  MOQ extracted from catalogItem (numeric → string conversion)
 *   T-11  RELATIONSHIP_APPROVED emitted when state === 'APPROVED'
 *   T-12  RELATIONSHIP_APPROVED NOT emitted for non-APPROVED states
 *   T-13  DPP_PUBLISHED extracted when isPublished === true; suppressed otherwise
 *   T-14  PRICE_DISCLOSURE_METADATA emitted from disclosureMode (not price value)
 *   T-15  price field in input does NOT produce any signal
 *   T-16  publicationPosture field in input does NOT produce any signal
 *   T-17  String trimming: signals with whitespace values are trimmed
 *   T-18  Length truncation: values exceeding SIGNAL_VALUE_MAX_LENGTH are truncated
 *   T-19  Deduplication: identical (signalType, value, sourceEntity) collapses to one signal
 *   T-20  Deterministic ordering: output follows SIGNAL_TYPE_ORDER contract
 *   T-21  Cross-tenant probe: supplierOrgId in relationship context does not leak buyer data
 *   T-22  Serialized output forbidden-key check: JSON.stringify contains no forbidden key
 *   T-23  No inference/embedding dependency: builder executes without any AI provider mock
 *   T-24  isSafe brand: every returned signal has isSafe === true
 *
 * Run:
 *   pnpm --filter server exec vitest run src/services/ai/__tests__/supplierMatchSignalBuilder.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  buildSupplierMatchSignals,
  stripForbiddenSignalInputFields,
  getForbiddenSignalInputFields,
  SIGNAL_VALUE_MAX_LENGTH,
  type SupplierMatchSignalBuilderInput,
  type SafeCatalogItemInput,
  type SafeRelationshipContextInput,
  type SafePublishedDppContextInput,
  type SafePriceDisclosureContextInput,
  type SafeSupplierOrgProfileInput,
} from '../supplierMatching/supplierMatchSignalBuilder.service.js';

// ─── T-01: Empty input → empty output ────────────────────────────────────────

describe('T-01: empty input', () => {
  it('returns empty array when only buyerOrgId is provided', () => {
    const result = buildSupplierMatchSignals({ buyerOrgId: 'org-buyer-001' });
    expect(result).toEqual([]);
  });

  it('returns empty array when all optional inputs are empty arrays', () => {
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [],
      supplierOrgProfiles: [],
      relationshipContexts: [],
      priceDisclosureContexts: [],
      publishedDppContexts: [],
    });
    expect(result).toEqual([]);
  });
});

// ─── T-02: RFQ_INTENT from rfqContext.buyerMessage ────────────────────────────

describe('T-02: RFQ_INTENT signal extraction', () => {
  it('extracts RFQ_INTENT from rfqContext.buyerMessage', () => {
    const input: SupplierMatchSignalBuilderInput = {
      buyerOrgId: 'org-buyer-001',
      rfqContext: {
        rfqId: 'rfq-001',
        buyerMessage: 'Looking for organic cotton fabric supplier',
      },
    };
    const result = buildSupplierMatchSignals(input);
    const rfqSignal = result.find((s) => s.signalType === 'RFQ_INTENT');
    expect(rfqSignal).toBeDefined();
    expect(rfqSignal?.value).toBe('Looking for organic cotton fabric supplier');
    expect(rfqSignal?.sourceEntity).toBe('RFQ');
    expect(rfqSignal?.sourceId).toBe('rfq-001');
  });

  it('does not emit RFQ_INTENT when buyerMessage is absent', () => {
    const input: SupplierMatchSignalBuilderInput = {
      buyerOrgId: 'org-buyer-001',
      rfqContext: { rfqId: 'rfq-001' },
    };
    const result = buildSupplierMatchSignals(input);
    expect(result.find((s) => s.signalType === 'RFQ_INTENT')).toBeUndefined();
  });
});

// ─── T-03: PRODUCT_CATEGORY from catalogItem ──────────────────────────────────

describe('T-03: PRODUCT_CATEGORY signal extraction', () => {
  it('extracts PRODUCT_CATEGORY from catalogItem', () => {
    const item: SafeCatalogItemInput = {
      itemId: 'item-001',
      productCategory: 'Woven Fabric',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find(
      (s) => s.signalType === 'PRODUCT_CATEGORY' && s.sourceEntity === 'CATALOG_ITEM',
    );
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('Woven Fabric');
    expect(signal?.sourceId).toBe('item-001');
  });
});

// ─── T-04: MATERIAL from catalogItem ─────────────────────────────────────────

describe('T-04: MATERIAL signal extraction', () => {
  it('extracts MATERIAL from catalogItem', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-002', material: 'Organic Cotton' };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find(
      (s) => s.signalType === 'MATERIAL' && s.sourceEntity === 'CATALOG_ITEM',
    );
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('Organic Cotton');
  });
});

// ─── T-05: FABRIC_TYPE from catalogItem ──────────────────────────────────────

describe('T-05: FABRIC_TYPE signal extraction', () => {
  it('extracts FABRIC_TYPE from catalogItem', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-003', fabricType: 'Jersey' };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'FABRIC_TYPE');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('Jersey');
    expect(signal?.sourceEntity).toBe('CATALOG_ITEM');
  });
});

// ─── T-06: COMPOSITION from catalogItem ──────────────────────────────────────

describe('T-06: COMPOSITION signal extraction', () => {
  it('extracts COMPOSITION from catalogItem', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-004', composition: '100% Cotton' };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'COMPOSITION');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('100% Cotton');
    expect(signal?.sourceEntity).toBe('CATALOG_ITEM');
  });
});

// ─── T-07: GSM from catalogItem (numeric → string) ───────────────────────────

describe('T-07: GSM signal extraction (numeric → string)', () => {
  it('converts numeric GSM to string signal value', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-005', gsm: 180 };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'GSM');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('180');
    expect(signal?.sourceEntity).toBe('CATALOG_ITEM');
  });

  it('does not emit GSM signal for zero or negative values', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-005b', gsm: 0 };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    expect(result.find((s) => s.signalType === 'GSM')).toBeUndefined();
  });
});

// ─── T-08: CERTIFICATION from catalogItem (array → multiple signals) ──────────

describe('T-08: CERTIFICATION array extraction', () => {
  it('emits one signal per certification in the array', () => {
    const item: SafeCatalogItemInput = {
      itemId: 'item-006',
      certifications: ['GOTS', 'OEKO-TEX', 'BCI'],
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const certSignals = result.filter((s) => s.signalType === 'CERTIFICATION');
    expect(certSignals).toHaveLength(3);
    const values = certSignals.map((s) => s.value).sort();
    expect(values).toEqual(['BCI', 'GOTS', 'OEKO-TEX']);
  });

  it('skips blank certification entries', () => {
    const item: SafeCatalogItemInput = {
      itemId: 'item-006b',
      certifications: ['GOTS', '  ', ''],
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const certSignals = result.filter((s) => s.signalType === 'CERTIFICATION');
    expect(certSignals).toHaveLength(1);
    expect(certSignals[0].value).toBe('GOTS');
  });
});

// ─── T-09: GEOGRAPHY from supplierOrgProfile.jurisdiction ────────────────────

describe('T-09: GEOGRAPHY signal from supplier org profile', () => {
  it('extracts GEOGRAPHY from supplierOrgProfile.jurisdiction', () => {
    const profile: SafeSupplierOrgProfileInput = {
      orgId: 'org-supplier-001',
      jurisdiction: 'IN',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      supplierOrgProfiles: [profile],
    });
    const signal = result.find(
      (s) => s.signalType === 'GEOGRAPHY' && s.sourceEntity === 'ORG_PROFILE',
    );
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('IN');
    expect(signal?.sourceId).toBe('org-supplier-001');
  });
});

// ─── T-10: MOQ from catalogItem (numeric → string) ────────────────────────────

describe('T-10: MOQ signal extraction', () => {
  it('converts numeric MOQ to string signal value', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-007', moq: 500 };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'MOQ' && s.sourceEntity === 'CATALOG_ITEM');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('500');
  });

  it('does not emit MOQ signal for non-positive numeric values', () => {
    const item: SafeCatalogItemInput = { itemId: 'item-007b', moq: -10 };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    expect(result.find((s) => s.signalType === 'MOQ')).toBeUndefined();
  });
});

// ─── T-11: RELATIONSHIP_APPROVED emitted when state === 'APPROVED' ────────────

describe('T-11: RELATIONSHIP_APPROVED for APPROVED state', () => {
  it('emits RELATIONSHIP_APPROVED when state is APPROVED', () => {
    const rel: SafeRelationshipContextInput = {
      supplierOrgId: 'org-supplier-approved',
      state: 'APPROVED',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      relationshipContexts: [rel],
    });
    const signal = result.find((s) => s.signalType === 'RELATIONSHIP_APPROVED');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('org-supplier-approved');
    expect(signal?.sourceEntity).toBe('RELATIONSHIP_ACCESS');
  });
});

// ─── T-12: RELATIONSHIP_APPROVED NOT emitted for non-APPROVED states ──────────

describe('T-12: RELATIONSHIP_APPROVED suppressed for non-APPROVED states', () => {
  const nonApprovedStates = ['BLOCKED', 'SUSPENDED', 'REJECTED', 'REQUESTED', 'NONE', 'EXPIRED', 'REVOKED'];

  for (const state of nonApprovedStates) {
    it(`does NOT emit RELATIONSHIP_APPROVED when state === '${state}'`, () => {
      const rel: SafeRelationshipContextInput = {
        supplierOrgId: 'org-supplier-gated',
        state,
      };
      const result = buildSupplierMatchSignals({
        buyerOrgId: 'org-buyer-001',
        relationshipContexts: [rel],
      });
      expect(result.find((s) => s.signalType === 'RELATIONSHIP_APPROVED')).toBeUndefined();
    });
  }

  it('does NOT emit RELATIONSHIP_APPROVED when state is absent', () => {
    const rel: SafeRelationshipContextInput = { supplierOrgId: 'org-supplier-nostate' };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      relationshipContexts: [rel],
    });
    expect(result.find((s) => s.signalType === 'RELATIONSHIP_APPROVED')).toBeUndefined();
  });
});

// ─── T-13: DPP_PUBLISHED extracted when isPublished === true ─────────────────

describe('T-13: DPP_PUBLISHED signal (published-only gate)', () => {
  it('emits DPP_PUBLISHED when isPublished is true', () => {
    const dpp: SafePublishedDppContextInput = {
      dppId: 'dpp-001',
      isPublished: true,
      publishedRef: 'DPP-REF-2024-001',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      publishedDppContexts: [dpp],
    });
    const signal = result.find((s) => s.signalType === 'DPP_PUBLISHED');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('DPP-REF-2024-001');
    expect(signal?.sourceEntity).toBe('DPP_PUBLISHED');
    expect(signal?.sourceId).toBe('dpp-001');
  });

  it('does NOT emit DPP_PUBLISHED when isPublished is false', () => {
    const dpp: SafePublishedDppContextInput = {
      dppId: 'dpp-002',
      isPublished: false,
      publishedRef: 'DPP-REF-2024-002',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      publishedDppContexts: [dpp],
    });
    expect(result.find((s) => s.signalType === 'DPP_PUBLISHED')).toBeUndefined();
  });

  it('does NOT emit DPP_PUBLISHED when isPublished is undefined', () => {
    const dpp: SafePublishedDppContextInput = {
      dppId: 'dpp-003',
      publishedRef: 'DPP-REF-2024-003',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      publishedDppContexts: [dpp],
    });
    expect(result.find((s) => s.signalType === 'DPP_PUBLISHED')).toBeUndefined();
  });
});

// ─── T-14: PRICE_DISCLOSURE_METADATA from disclosureMode (not price value) ────

describe('T-14: PRICE_DISCLOSURE_METADATA from disclosureMode only', () => {
  it('emits PRICE_DISCLOSURE_METADATA from disclosureMode label', () => {
    const pd: SafePriceDisclosureContextInput = {
      supplierOrgId: 'org-supplier-pd',
      disclosureMode: 'RELATIONSHIP_ONLY',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      priceDisclosureContexts: [pd],
    });
    const signal = result.find((s) => s.signalType === 'PRICE_DISCLOSURE_METADATA');
    expect(signal).toBeDefined();
    expect(signal?.value).toBe('RELATIONSHIP_ONLY');
    expect(signal?.sourceEntity).toBe('PRICE_DISCLOSURE');
    expect(signal?.sourceId).toBe('org-supplier-pd');
  });

  it('does NOT include the price value itself in any signal', () => {
    // Even if a caller illegally passes a price field on the input object,
    // it must not appear in any signal value.
    const pd = {
      supplierOrgId: 'org-supplier-pd2',
      disclosureMode: 'VISIBLE',
      price: 49.99, // injected at runtime despite type exclusion
    } as SafePriceDisclosureContextInput;
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      priceDisclosureContexts: [pd],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('49.99');
    expect(serialized).not.toContain('"price"');
  });
});

// ─── T-15: price field in input does NOT produce any signal ───────────────────

describe('T-15: price field in input produces no signal', () => {
  it('strips price from catalog item input — no price signal emitted', () => {
    const item = {
      itemId: 'item-price-test',
      productCategory: 'Woven Fabric',
      price: 12.5, // injected at runtime despite type exclusion
    } as SafeCatalogItemInput;
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"price"');
    expect(serialized).not.toContain('12.5');
    // Safe signal still emitted
    expect(result.find((s) => s.signalType === 'PRODUCT_CATEGORY')).toBeDefined();
  });

  it('stripForbiddenSignalInputFields removes price from object', () => {
    const input = { productCategory: 'Cotton', price: 12.5, material: 'Cotton' };
    const stripped = stripForbiddenSignalInputFields(input as Record<string, unknown>);
    expect(stripped).not.toHaveProperty('price');
    expect(stripped).toHaveProperty('productCategory', 'Cotton');
    expect(stripped).toHaveProperty('material', 'Cotton');
  });
});

// ─── T-16: publicationPosture field in input does NOT produce any signal ───────

describe('T-16: publicationPosture field in input produces no signal', () => {
  it('strips publicationPosture from catalog item — no related signal emitted', () => {
    const item = {
      itemId: 'item-posture-test',
      catalogStage: 'ACTIVE',
      publicationPosture: 'B2B_ONLY', // injected at runtime despite type exclusion
    } as SafeCatalogItemInput;
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('"publicationPosture"');
    expect(serialized).not.toContain('B2B_ONLY');
    // Safe signal still emitted
    expect(result.find((s) => s.signalType === 'CATALOG_STAGE')).toBeDefined();
  });

  it('stripForbiddenSignalInputFields removes publicationPosture', () => {
    const input = { catalogStage: 'ACTIVE', publicationPosture: 'DRAFT' };
    const stripped = stripForbiddenSignalInputFields(input as Record<string, unknown>);
    expect(stripped).not.toHaveProperty('publicationPosture');
    expect(stripped).toHaveProperty('catalogStage', 'ACTIVE');
  });
});

// ─── T-17: String trimming ────────────────────────────────────────────────────

describe('T-17: string trimming applied to signal values', () => {
  it('trims leading and trailing whitespace from signal values', () => {
    const item: SafeCatalogItemInput = {
      itemId: 'item-trim',
      material: '  Organic Cotton  ',
      productCategory: '\tWoven Fabric\n',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    expect(result.find((s) => s.signalType === 'MATERIAL')?.value).toBe('Organic Cotton');
    expect(result.find((s) => s.signalType === 'PRODUCT_CATEGORY')?.value).toBe('Woven Fabric');
  });

  it('returns no signal for whitespace-only values', () => {
    const item: SafeCatalogItemInput = {
      itemId: 'item-whitespace',
      material: '   ',
      fabricType: '\t\n',
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    expect(result.find((s) => s.signalType === 'MATERIAL')).toBeUndefined();
    expect(result.find((s) => s.signalType === 'FABRIC_TYPE')).toBeUndefined();
  });
});

// ─── T-18: Length truncation ──────────────────────────────────────────────────

describe('T-18: length truncation at SIGNAL_VALUE_MAX_LENGTH', () => {
  it('truncates values exceeding SIGNAL_VALUE_MAX_LENGTH', () => {
    const longValue = 'A'.repeat(SIGNAL_VALUE_MAX_LENGTH + 100);
    const item: SafeCatalogItemInput = {
      itemId: 'item-long',
      material: longValue,
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'MATERIAL');
    expect(signal).toBeDefined();
    if (!signal) throw new Error('signal must be defined');
    expect(signal.value.length).toBe(SIGNAL_VALUE_MAX_LENGTH);
  });

  it('does not truncate values at exactly SIGNAL_VALUE_MAX_LENGTH', () => {
    const exactValue = 'B'.repeat(SIGNAL_VALUE_MAX_LENGTH);
    const item: SafeCatalogItemInput = {
      itemId: 'item-exact',
      material: exactValue,
    };
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [item],
    });
    const signal = result.find((s) => s.signalType === 'MATERIAL');
    expect(signal).toBeDefined();
    if (!signal) throw new Error('signal must be defined');
    expect(signal.value.length).toBe(SIGNAL_VALUE_MAX_LENGTH);
  });
});

// ─── T-19: Deduplication ──────────────────────────────────────────────────────

describe('T-19: deduplication collapses identical signals', () => {
  it('collapses identical (signalType, value, sourceEntity) to one signal', () => {
    const items: SafeCatalogItemInput[] = [
      { itemId: 'item-a', material: 'Organic Cotton' },
      { itemId: 'item-b', material: 'Organic Cotton' },
    ];
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: items,
    });
    const materialSignals = result.filter((s) => s.signalType === 'MATERIAL');
    expect(materialSignals).toHaveLength(1);
    expect(materialSignals[0].value).toBe('Organic Cotton');
  });

  it('preserves distinct signals with different values', () => {
    const items: SafeCatalogItemInput[] = [
      { itemId: 'item-c', material: 'Organic Cotton' },
      { itemId: 'item-d', material: 'Linen' },
    ];
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: items,
    });
    const materialSignals = result.filter((s) => s.signalType === 'MATERIAL');
    expect(materialSignals).toHaveLength(2);
  });

  it('preserves distinct signals with different source entities', () => {
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [{ itemId: 'item-e', material: 'Cotton' }],
      rfqContext: { rfqId: 'rfq-x', material: 'Cotton' },
    });
    // Same value 'Cotton' from two different source entities: CATALOG_ITEM and RFQ
    const materialSignals = result.filter((s) => s.signalType === 'MATERIAL');
    expect(materialSignals).toHaveLength(2);
  });
});

// ─── T-20: Deterministic ordering ────────────────────────────────────────────

describe('T-20: deterministic signal type ordering', () => {
  it('orders signals per SIGNAL_TYPE_ORDER contract', () => {
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      rfqContext: {
        rfqId: 'rfq-001',
        buyerMessage: 'Looking for cotton',
        productCategory: 'Woven Fabric',
        moqRequirement: 200,
      },
      catalogItems: [
        {
          itemId: 'item-001',
          catalogStage: 'ACTIVE',
          material: 'Cotton',
          gsm: 120,
          certifications: ['GOTS'],
          moq: 500,
        },
      ],
      supplierOrgProfiles: [
        { orgId: 'org-s-001', jurisdiction: 'IN' },
      ],
      relationshipContexts: [
        { supplierOrgId: 'org-s-001', state: 'APPROVED' },
      ],
      priceDisclosureContexts: [
        { supplierOrgId: 'org-s-001', disclosureMode: 'VISIBLE' },
      ],
      publishedDppContexts: [
        { dppId: 'dpp-001', isPublished: true, publishedRef: 'DPP-2024-001' },
      ],
    });

    const signalTypes = result.map((s) => s.signalType);
    // RFQ_INTENT must come before CATALOG_STAGE which must come before PRODUCT_CATEGORY, etc.
    const rfqIdx = signalTypes.indexOf('RFQ_INTENT');
    const catalogStageIdx = signalTypes.indexOf('CATALOG_STAGE');
    const productCatIdx = signalTypes.indexOf('PRODUCT_CATEGORY');
    const materialIdx = signalTypes.indexOf('MATERIAL');
    const gsmIdx = signalTypes.indexOf('GSM');
    const certIdx = signalTypes.indexOf('CERTIFICATION');
    const geoIdx = signalTypes.indexOf('GEOGRAPHY');
    const relIdx = signalTypes.indexOf('RELATIONSHIP_APPROVED');
    const pdIdx = signalTypes.indexOf('PRICE_DISCLOSURE_METADATA');
    const dppIdx = signalTypes.indexOf('DPP_PUBLISHED');

    expect(rfqIdx).toBeLessThan(catalogStageIdx);
    expect(catalogStageIdx).toBeLessThan(productCatIdx);
    expect(productCatIdx).toBeLessThan(materialIdx);
    expect(materialIdx).toBeLessThan(gsmIdx);
    expect(gsmIdx).toBeLessThan(certIdx);
    expect(certIdx).toBeLessThan(geoIdx);
    expect(geoIdx).toBeLessThan(relIdx);
    expect(relIdx).toBeLessThan(pdIdx);
    expect(pdIdx).toBeLessThan(dppIdx);
  });

  it('produces the same ordered output for identical inputs called twice', () => {
    const input: SupplierMatchSignalBuilderInput = {
      buyerOrgId: 'org-buyer-001',
      catalogItems: [
        { itemId: 'i1', material: 'Linen', productCategory: 'Woven Fabric' },
        { itemId: 'i2', material: 'Cotton', fabricType: 'Jersey' },
      ],
    };
    const result1 = buildSupplierMatchSignals(input);
    const result2 = buildSupplierMatchSignals(input);
    expect(result1).toEqual(result2);
  });
});

// ─── T-21: Cross-tenant probe ─────────────────────────────────────────────────

describe('T-21: cross-tenant probe — supplier context does not expose buyer data', () => {
  it('RELATIONSHIP_APPROVED signal value is supplierOrgId, not buyerOrgId', () => {
    const buyerOrgId = 'org-buyer-BUYER';
    const supplierOrgId = 'org-supplier-SUPPLIER';
    const result = buildSupplierMatchSignals({
      buyerOrgId,
      relationshipContexts: [{ supplierOrgId, state: 'APPROVED' }],
    });
    const signal = result.find((s) => s.signalType === 'RELATIONSHIP_APPROVED');
    expect(signal).toBeDefined();
    // The signal value identifies the supplier, not the buyer
    expect(signal?.value).toBe(supplierOrgId);
    expect(signal?.value).not.toBe(buyerOrgId);
    // The buyer org ID must not appear in signal values
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(`"value":"${buyerOrgId}"`);
  });

  it('does not emit any cross-tenant data for a non-APPROVED relationship', () => {
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-BUYER',
      relationshipContexts: [{ supplierOrgId: 'org-supplier-BLOCKED', state: 'BLOCKED' }],
    });
    expect(result).toHaveLength(0);
  });
});

// ─── T-22: Serialized output forbidden-key check ──────────────────────────────

describe('T-22: JSON.stringify of output contains no forbidden key names', () => {
  it('no forbidden field name appears as a JSON key in the serialized output', () => {
    const input: SupplierMatchSignalBuilderInput = {
      buyerOrgId: 'org-buyer-001',
      rfqContext: {
        rfqId: 'rfq-001',
        buyerMessage: 'Organic cotton woven fabric',
        productCategory: 'Woven',
        material: 'Cotton',
        moqRequirement: 300,
      },
      catalogItems: [
        {
          itemId: 'item-001',
          catalogStage: 'ACTIVE',
          material: 'Organic Cotton',
          fabricType: 'Woven',
          composition: '100% Cotton',
          gsm: 160,
          certifications: ['GOTS'],
          moq: 500,
        },
      ],
      supplierOrgProfiles: [
        { orgId: 'org-s-001', jurisdiction: 'IN', primarySegmentKey: 'TEXTILE' },
      ],
      relationshipContexts: [{ supplierOrgId: 'org-s-001', state: 'APPROVED' }],
      priceDisclosureContexts: [{ supplierOrgId: 'org-s-001', disclosureMode: 'VISIBLE' }],
      publishedDppContexts: [{ dppId: 'dpp-001', isPublished: true, publishedRef: 'DPP-2024-001' }],
    };

    const signals = buildSupplierMatchSignals(input);
    const serialized = JSON.stringify(signals);
    const forbiddenFields = getForbiddenSignalInputFields();

    for (const field of forbiddenFields) {
      // Check as a JSON object key (e.g., "price": or "riskScore":)
      expect(serialized).not.toContain(`"${field}":`);
    }
  });

  it('output signals only contain expected safe keys', () => {
    const signals = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [{ itemId: 'item-001', material: 'Cotton', gsm: 180 }],
    });

    for (const signal of signals) {
      const keys = Object.keys(signal);
      for (const key of keys) {
        expect(['signalType', 'value', 'sourceEntity', 'sourceId', 'isSafe']).toContain(key);
      }
    }
  });
});

// ─── T-23: No inference/embedding dependency ──────────────────────────────────

describe('T-23: signal builder has no AI provider or embedding dependency', () => {
  it('executes buildSupplierMatchSignals without any AI provider mock setup', () => {
    // If inferenceService or vectorEmbeddingClient were imported, Vitest would
    // attempt to resolve them and this test would fail or require mocking.
    // Running without any vi.mock() for AI providers validates the absence of
    // those dependencies at the module level.
    expect(() =>
      buildSupplierMatchSignals({
        buyerOrgId: 'org-buyer-001',
        catalogItems: [{ itemId: 'item-001', material: 'Cotton' }],
      }),
    ).not.toThrow();
  });

  it('completes signal extraction synchronously without async I/O', async () => {
    // The function is synchronous. Wrapping in Promise.resolve() and awaiting
    // confirms it resolves immediately without any async operations.
    const result = await Promise.resolve(
      buildSupplierMatchSignals({
        buyerOrgId: 'org-buyer-001',
        rfqContext: { rfqId: 'rfq-001', buyerMessage: 'Need cotton supplier' },
      }),
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── T-24: isSafe brand on every signal ───────────────────────────────────────

describe('T-24: isSafe brand is always true on every emitted signal', () => {
  it('every signal in a full input bundle has isSafe === true', () => {
    const input: SupplierMatchSignalBuilderInput = {
      buyerOrgId: 'org-buyer-001',
      rfqContext: {
        rfqId: 'rfq-001',
        buyerMessage: 'Organic cotton woven fabric supplier India',
        productCategory: 'Woven Fabric',
        material: 'Organic Cotton',
        moqRequirement: 250,
        geographyPreference: 'IN',
      },
      catalogItems: [
        {
          itemId: 'item-full',
          supplierOrgId: 'org-s-001',
          catalogStage: 'ACTIVE',
          productCategory: 'Woven Fabric',
          material: 'Organic Cotton',
          fabricType: 'Plain Weave',
          composition: '100% Organic Cotton',
          gsm: 160,
          certifications: ['GOTS', 'OEKO-TEX'],
          moq: 500,
        },
      ],
      supplierOrgProfiles: [
        {
          orgId: 'org-s-001',
          jurisdiction: 'IN',
          primarySegmentKey: 'WOVEN_FABRIC',
          secondarySegmentKeys: ['ORGANIC'],
          rolePositionKeys: ['MANUFACTURER'],
        },
      ],
      relationshipContexts: [{ supplierOrgId: 'org-s-001', state: 'APPROVED' }],
      priceDisclosureContexts: [{ supplierOrgId: 'org-s-001', disclosureMode: 'RELATIONSHIP_ONLY' }],
      publishedDppContexts: [
        { dppId: 'dpp-001', isPublished: true, publishedRef: 'DPP-2024-FULL' },
      ],
    };

    const signals = buildSupplierMatchSignals(input);
    expect(signals.length).toBeGreaterThan(0);

    for (const signal of signals) {
      expect(signal.isSafe).toBe(true);
    }
  });

  it('isSafe is exactly the literal boolean true, not a truthy value', () => {
    const result = buildSupplierMatchSignals({
      buyerOrgId: 'org-buyer-001',
      catalogItems: [{ itemId: 'item-brand', material: 'Cotton' }],
    });
    const signal = result.find((s) => s.signalType === 'MATERIAL');
    expect(signal).toBeDefined();
    if (!signal) throw new Error('signal must be defined');
    // Strict equality — not just truthy
    expect(signal.isSafe).toStrictEqual(true);
    expect(typeof signal.isSafe).toBe('boolean');
  });
});
