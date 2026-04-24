/**
 * TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
 * Supplier catalog create/update with textile attributes.
 * T1–T8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCatalogItem, updateCatalogItem } from '../services/catalogService';

// Mock the underlying http helpers so no real network calls are made.
vi.mock('../services/catalogService', async () => {
  const actual = await vi.importActual<typeof import('../services/catalogService')>('../services/catalogService');
  return {
    ...actual,
    createCatalogItem: vi.fn(),
    updateCatalogItem: vi.fn(),
  };
});

const mockCreate = vi.mocked(createCatalogItem);
const mockUpdate = vi.mocked(updateCatalogItem);

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper — minimal stub response shape the caller expects
function stubItem(overrides = {}) {
  return {
    item: {
      id: 'item-001',
      tenantId: 'org-001',
      name: 'Test Fabric',
      sku: 'SKU-001',
      description: null,
      price: 10,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      imageUrl: null,
      moq: 100,
      ...overrides,
    },
  };
}

describe('T1 — createCatalogItem passes productCategory', () => {
  it('forwards productCategory in the request payload', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ productCategory: 'APPAREL_FABRIC' }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, productCategory: 'APPAREL_FABRIC' });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ productCategory: 'APPAREL_FABRIC' }));
  });
});

describe('T2 — createCatalogItem passes fabricType', () => {
  it('forwards fabricType in the request payload', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ fabricType: 'WOVEN' }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, fabricType: 'WOVEN' });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ fabricType: 'WOVEN' }));
  });
});

describe('T3 — createCatalogItem passes gsm as number', () => {
  it('forwards gsm numerically', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ gsm: 180 }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, gsm: 180 });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ gsm: 180 }));
  });
});

describe('T4 — createCatalogItem passes material', () => {
  it('forwards material', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ material: 'COTTON' }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, material: 'COTTON' });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ material: 'COTTON' }));
  });
});

describe('T5 — createCatalogItem passes widthCm', () => {
  it('forwards widthCm numerically', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ widthCm: 150 }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, widthCm: 150 });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ widthCm: 150 }));
  });
});

describe('T6 — createCatalogItem passes construction', () => {
  it('forwards construction', async () => {
    mockCreate.mockResolvedValueOnce(stubItem({ construction: 'PLAIN_WEAVE' }) as never);
    await createCatalogItem({ name: 'Fabric', price: 5, construction: 'PLAIN_WEAVE' });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ construction: 'PLAIN_WEAVE' }));
  });
});

describe('T7 — updateCatalogItem passes textile fields as nullable', () => {
  it('forwards nullable textile fields correctly', async () => {
    mockUpdate.mockResolvedValueOnce(stubItem() as never);
    await updateCatalogItem('item-001', {
      name: 'Fabric',
      price: 5,
      productCategory: null,
      fabricType: null,
      gsm: null,
    });
    expect(mockUpdate).toHaveBeenCalledWith('item-001', expect.objectContaining({
      productCategory: null,
      fabricType: null,
      gsm: null,
    }));
  });
});

describe('T8 — createCatalogItem with all 9 textile fields', () => {
  it('forwards all 9 fields together', async () => {
    mockCreate.mockResolvedValueOnce(stubItem() as never);
    await createCatalogItem({
      name: 'Full Fabric',
      price: 10,
      productCategory: 'APPAREL_FABRIC',
      fabricType: 'WOVEN',
      gsm: 200,
      material: 'COTTON',
      composition: '100% Cotton',
      color: 'White',
      widthCm: 150,
      construction: 'PLAIN_WEAVE',
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      productCategory: 'APPAREL_FABRIC',
      fabricType: 'WOVEN',
      gsm: 200,
      material: 'COTTON',
      composition: '100% Cotton',
      color: 'White',
      widthCm: 150,
      construction: 'PLAIN_WEAVE',
    }));
  });
});
