/**
 * TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
 * AI contract tests — vector text, completeness, buyer response contract.
 * T26–T34
 */
import { describe, it, expect } from 'vitest';
import {
  buildCatalogItemVectorText,
  catalogItemAttributeCompleteness,
} from '../server/src/routes/tenant';
import type { BuyerCatalogItem } from '../services/catalogService';

// ─── T26: vector text includes name ────────────────────────────────────────
describe('T26 — buildCatalogItemVectorText includes name', () => {
  it('puts item name in the vector text', () => {
    const text = buildCatalogItemVectorText({ name: 'Navy Linen' });
    expect(text).toContain('Navy Linen');
  });
});

// ─── T27: vector text includes fabricType ──────────────────────────────────
describe('T27 — buildCatalogItemVectorText includes fabricType', () => {
  it('includes Fabric type label', () => {
    const text = buildCatalogItemVectorText({ name: 'X', fabricType: 'WOVEN' });
    expect(text).toContain('Fabric type: WOVEN');
  });
});

// ─── T28: vector text includes material ────────────────────────────────────
describe('T28 — buildCatalogItemVectorText includes material', () => {
  it('includes Material label', () => {
    const text = buildCatalogItemVectorText({ name: 'X', material: 'COTTON' });
    expect(text).toContain('Material: COTTON');
  });
});

// ─── T29: vector text includes gsm ─────────────────────────────────────────
describe('T29 — buildCatalogItemVectorText includes gsm', () => {
  it('includes GSM value', () => {
    const text = buildCatalogItemVectorText({ name: 'X', gsm: 180 });
    expect(text).toContain('GSM: 180');
  });
});

// ─── T30: vector text includes certifications ──────────────────────────────
describe('T30 — buildCatalogItemVectorText includes certifications', () => {
  it('includes certification standards', () => {
    const text = buildCatalogItemVectorText({
      name: 'X',
      certifications: [{ standard: 'GOTS' }, { standard: 'BCI' }],
    });
    expect(text).toContain('Certifications: GOTS, BCI');
  });
});

// ─── T31: vector text does NOT include price ───────────────────────────────
describe('T31 — buildCatalogItemVectorText excludes price', () => {
  it('does not emit a price field in vector text', () => {
    const text = buildCatalogItemVectorText({
      name: 'X',
      fabricType: 'KNIT',
      material: 'POLYESTER',
    });
    // 'price' should not appear as a label in the vector text
    expect(text.toLowerCase()).not.toMatch(/\bprice\b/);
  });
});

// ─── T32: vector text does NOT include publicationPosture ──────────────────
describe('T32 — buildCatalogItemVectorText excludes publicationPosture', () => {
  it('does not include publicationPosture', () => {
    const text = buildCatalogItemVectorText({ name: 'X', material: 'WOOL' });
    expect(text.toLowerCase()).not.toContain('publicationposture');
    expect(text.toLowerCase()).not.toContain('publication_posture');
  });
});

// ─── T33: completeness = 0 when no attrs ───────────────────────────────────
describe('T33 — catalogItemAttributeCompleteness is 0 for empty item', () => {
  it('returns 0 when no textile fields are set', () => {
    expect(catalogItemAttributeCompleteness({ name: 'X' })).toBe(0);
  });
});

// ─── T34: completeness = 1 when all 9 attrs set ────────────────────────────
describe('T34 — catalogItemAttributeCompleteness is 1 for fully-populated item', () => {
  it('returns 1 when all 9 textile fields are non-null', () => {
    const result = catalogItemAttributeCompleteness({
      productCategory: 'APPAREL_FABRIC',
      fabricType: 'WOVEN',
      gsm: 180,
      material: 'COTTON',
      composition: '100% Cotton',
      color: 'White',
      widthCm: 150,
      construction: 'PLAIN_WEAVE',
      certifications: [{ standard: 'GOTS' }],
    });
    expect(result).toBe(1);
  });
});

// ─── BuyerCatalogItem type contract ────────────────────────────────────────
describe('BuyerCatalogItem type includes required fields', () => {
  it('object satisfying BuyerCatalogItem has textile attrs and no price', () => {
    const item: BuyerCatalogItem = {
      id: 'item-001',
      name: 'Fabric',
      sku: null,
      description: null,
      moq: 100,
      imageUrl: null,
      productCategory: 'APPAREL_FABRIC',
      fabricType: 'WOVEN',
      gsm: 180,
      material: 'COTTON',
      composition: null,
      color: null,
      widthCm: null,
      construction: null,
      certifications: null,
    };
    expect(item.productCategory).toBe('APPAREL_FABRIC');
    expect((item as Record<string, unknown>).price).toBeUndefined();
    expect((item as Record<string, unknown>).publicationPosture).toBeUndefined();
  });
});
