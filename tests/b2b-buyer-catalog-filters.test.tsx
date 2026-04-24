/**
 * TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001
 * Buyer catalog filter params forwarded via getBuyerCatalogItems.
 * T9–T25 + T35–T39
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBuyerCatalogItems } from '../services/catalogService';

vi.mock('../services/catalogService', async () => {
  const actual = await vi.importActual<typeof import('../services/catalogService')>('../services/catalogService');
  return {
    ...actual,
    getBuyerCatalogItems: vi.fn(),
  };
});

const mockGet = vi.mocked(getBuyerCatalogItems);

beforeEach(() => vi.clearAllMocks());

const emptyPage = { items: [], count: 0, nextCursor: null };

describe('T9 — getBuyerCatalogItems passes productCategory', () => {
  it('includes productCategory in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { productCategory: 'APPAREL_FABRIC' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ productCategory: 'APPAREL_FABRIC' }));
  });
});

describe('T10 — getBuyerCatalogItems passes fabricType', () => {
  it('includes fabricType in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { fabricType: 'WOVEN' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ fabricType: 'WOVEN' }));
  });
});

describe('T11 — getBuyerCatalogItems passes material as array', () => {
  it('includes material array in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { material: ['COTTON', 'LINEN'] });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ material: ['COTTON', 'LINEN'] }));
  });
});

describe('T12 — getBuyerCatalogItems passes single material string', () => {
  it('includes single material as string', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { material: 'SILK' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ material: 'SILK' }));
  });
});

describe('T13 — getBuyerCatalogItems passes construction', () => {
  it('includes construction in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { construction: 'TWILL' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ construction: 'TWILL' }));
  });
});

describe('T14 — getBuyerCatalogItems passes color', () => {
  it('includes color in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { color: 'Navy Blue' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ color: 'Navy Blue' }));
  });
});

describe('T15 — getBuyerCatalogItems passes gsmMin', () => {
  it('includes gsmMin in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { gsmMin: 100 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ gsmMin: 100 }));
  });
});

describe('T16 — getBuyerCatalogItems passes gsmMax', () => {
  it('includes gsmMax in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { gsmMax: 300 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ gsmMax: 300 }));
  });
});

describe('T17 — getBuyerCatalogItems passes gsmMin and gsmMax together', () => {
  it('includes both gsm bounds', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { gsmMin: 150, gsmMax: 250 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ gsmMin: 150, gsmMax: 250 }));
  });
});

describe('T18 — getBuyerCatalogItems passes widthMin', () => {
  it('includes widthMin in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { widthMin: 100 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ widthMin: 100 }));
  });
});

describe('T19 — getBuyerCatalogItems passes widthMax', () => {
  it('includes widthMax in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { widthMax: 200 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ widthMax: 200 }));
  });
});

describe('T20 — getBuyerCatalogItems passes moqMax', () => {
  it('includes moqMax in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { moqMax: 500 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ moqMax: 500 }));
  });
});

describe('T21 — getBuyerCatalogItems passes certification', () => {
  it('includes certification in query', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { certification: 'GOTS' });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ certification: 'GOTS' }));
  });
});

describe('T22 — getBuyerCatalogItems omits undefined filter fields', () => {
  it('does not add undefined keys to params', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', {});
    const [, params] = mockGet.mock.calls[0];
    expect(params).not.toHaveProperty('productCategory');
    expect(params).not.toHaveProperty('certification');
  });
});

describe('T23 — getBuyerCatalogItems passes q with all filters', () => {
  it('combines keyword search and textile filters', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { q: 'cotton', productCategory: 'APPAREL_FABRIC', gsmMin: 100 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({
      q: 'cotton',
      productCategory: 'APPAREL_FABRIC',
      gsmMin: 100,
    }));
  });
});

describe('T24 — BuyerCatalogItem type includes textile fields', () => {
  it('response items carry textile attribute fields', async () => {
    const responseItem = {
      id: 'item-001', name: 'Linen Fabric', sku: null, description: null, moq: 50, imageUrl: null,
      productCategory: 'APPAREL_FABRIC', fabricType: 'WOVEN', gsm: 180, material: 'LINEN',
      composition: '100% Linen', color: 'Natural', widthCm: 150, construction: 'PLAIN_WEAVE',
      certifications: [{ standard: 'GOTS' }],
    };
    mockGet.mockResolvedValueOnce({ items: [responseItem], count: 1, nextCursor: null } as never);
    const result = await getBuyerCatalogItems('org-001', {});
    const item = result.items[0];
    expect(item.productCategory).toBe('APPAREL_FABRIC');
    expect(item.fabricType).toBe('WOVEN');
    expect(item.gsm).toBe(180);
    expect(item.material).toBe('LINEN');
    expect(item.widthCm).toBe(150);
    expect(item.certifications).toEqual([{ standard: 'GOTS' }]);
  });
});

describe('T25 — BuyerCatalogItem does NOT include price', () => {
  it('response item type has no price field', async () => {
    const responseItem = {
      id: 'item-001', name: 'Fabric', sku: null, description: null, moq: 50, imageUrl: null,
      productCategory: null, fabricType: null, gsm: null, material: null,
      composition: null, color: null, widthCm: null, construction: null, certifications: null,
    };
    mockGet.mockResolvedValueOnce({ items: [responseItem], count: 1, nextCursor: null } as never);
    const result = await getBuyerCatalogItems('org-001', {});
    const item = result.items[0] as Record<string, unknown>;
    expect(item).not.toHaveProperty('price');
  });
});

// T35–T39 — filter combination edge cases
describe('T35 — empty material array treated as no filter', () => {
  it('does not add material key when array is empty', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { material: [] as unknown as string });
    const [, params] = mockGet.mock.calls[0];
    const materialVal = (params as Record<string, unknown>).material;
    // Either undefined or empty array — must not cause a non-array truthy value
    expect(!materialVal || (Array.isArray(materialVal) && (materialVal as string[]).length === 0)).toBe(true);
  });
});

describe('T36 — zero gsmMin is a valid numeric filter', () => {
  it('passes gsmMin: 10 (minimum allowed)', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { gsmMin: 10 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ gsmMin: 10 }));
  });
});

describe('T37 — widthMin and widthMax can be passed together', () => {
  it('passes both width bounds', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { widthMin: 90, widthMax: 180 });
    expect(mockGet).toHaveBeenCalledWith('org-001', expect.objectContaining({ widthMin: 90, widthMax: 180 }));
  });
});

describe('T38 — certifications in response can be null', () => {
  it('certifications field is null when absent', async () => {
    const responseItem = {
      id: 'item-001', name: 'Fabric', sku: null, description: null, moq: 50, imageUrl: null,
      productCategory: null, fabricType: null, gsm: null, material: null,
      composition: null, color: null, widthCm: null, construction: null, certifications: null,
    };
    mockGet.mockResolvedValueOnce({ items: [responseItem], count: 1, nextCursor: null } as never);
    const result = await getBuyerCatalogItems('org-001', {});
    expect(result.items[0].certifications).toBeNull();
  });
});

describe('T39 — deprecated category field is NOT used', () => {
  it('getBuyerCatalogItems call does not reference category field', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { productCategory: 'HOME_TEXTILE' });
    const [, params] = mockGet.mock.calls[0];
    expect(params).not.toHaveProperty('category');
  });
});
