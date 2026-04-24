/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * UI layer: buyer catalog filter — catalogStage query param behaviour and type shape tests.
 * Uses vi.mock pattern (same as existing stage filter tests) to avoid browser-env deps.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CATALOG_STAGE_VALUES,
  getBuyerCatalogItems,
  type CatalogStage,
  type BuyerCatalogItem,
  type BuyerCatalogQueryParams,
} from '../services/catalogService';

vi.mock('../services/catalogService', async () => {
  const actual = await vi.importActual<typeof import('../services/catalogService')>('../services/catalogService');
  return {
    ...actual,
    getBuyerCatalogItems: vi.fn(),
  };
});

const mockGet = vi.mocked(getBuyerCatalogItems);
const emptyPage = { items: [], count: 0, nextCursor: null };

beforeEach(() => vi.clearAllMocks());

describe('getBuyerCatalogItems — catalogStage filter', () => {
  // T-STAGE-FILTER-UI-1: Passes catalogStage query param when set
  it('forwards catalogStage YARN param', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-123', { catalogStage: 'YARN' as CatalogStage });
    expect(mockGet).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({ catalogStage: 'YARN' })
    );
  });

  // T-STAGE-FILTER-UI-2: Does not pass catalogStage when absent
  it('does not include catalogStage when absent', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-123', { fabricType: 'WOVEN' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-123',
      expect.not.objectContaining({ catalogStage: expect.anything() })
    );
  });

  // T-STAGE-FILTER-UI-3: catalogStage composes with fabricType filter
  it('composes catalogStage with fabricType', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-123', {
      catalogStage: 'FABRIC_KNIT' as CatalogStage,
      fabricType: 'KNIT',
    });
    expect(mockGet).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({ catalogStage: 'FABRIC_KNIT', fabricType: 'KNIT' })
    );
  });

  // T-STAGE-FILTER-UI-4: BuyerCatalogItem type shape has catalogStage and stageAttributes
  it('BuyerCatalogItem shape includes catalogStage and stageAttributes', () => {
    const item: BuyerCatalogItem = {
      id: 'item-1',
      name: 'Test Yarn',
      sku: 'YARN-001',
      description: null,
      moq: 100,
      imageUrl: null,
      catalogStage: 'YARN',
      stageAttributes: { yarnType: 'Spun', yarnCount: '40s' },
      fabricType: null,
      material: null,
      gsm: null,
      widthCm: null,
      construction: null,
      color: null,
      composition: null,
      productCategory: null,
      certifications: null,
    };
    expect(item.catalogStage).toBe('YARN');
    expect(item.stageAttributes).toEqual({ yarnType: 'Spun', yarnCount: '40s' });
  });

  // T-STAGE-FILTER-UI-5: BuyerCatalogItem with null catalogStage is valid (legacy)
  it('BuyerCatalogItem shape allows null catalogStage (legacy)', () => {
    const item: BuyerCatalogItem = {
      id: 'x',
      name: 'n',
      sku: null,
      description: null,
      moq: 1,
      imageUrl: null,
      catalogStage: null,
      stageAttributes: null,
      fabricType: null,
      material: null,
      gsm: null,
      widthCm: null,
      construction: null,
      color: null,
      composition: null,
      productCategory: null,
      certifications: null,
    };
    expect(item.catalogStage).toBeNull();
    expect(item.stageAttributes).toBeNull();
  });

  // T-STAGE-FILTER-UI-6: BuyerCatalogQueryParams accepts catalogStage
  it('BuyerCatalogQueryParams accepts catalogStage', () => {
    const params: BuyerCatalogQueryParams = {
      catalogStage: 'GARMENT' as CatalogStage,
    };
    expect(params.catalogStage).toBe('GARMENT');
  });

  // T-STAGE-FILTER-UI-7: All CATALOG_STAGE_VALUES are valid filter values
  it('all CATALOG_STAGE_VALUES are valid as BuyerCatalogQueryParams.catalogStage', () => {
    CATALOG_STAGE_VALUES.forEach(stage => {
      const params: BuyerCatalogQueryParams = { catalogStage: stage };
      expect(params.catalogStage).toBe(stage);
    });
  });

  // T-STAGE-FILTER-UI-8: SERVICE stage forwarded correctly
  it('forwards catalogStage SERVICE', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-123', { catalogStage: 'SERVICE' as CatalogStage });
    expect(mockGet).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({ catalogStage: 'SERVICE' })
    );
  });
});
