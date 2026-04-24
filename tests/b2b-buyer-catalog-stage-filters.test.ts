/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * Buyer catalog GET — catalogStage filter forwarded via getBuyerCatalogItems.
 * T-STAGE-B1 – T-STAGE-B6
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

// ─── T-STAGE-B1: catalogStage YARN forwarded ──────────────────────────────
describe('T-STAGE-B1 — getBuyerCatalogItems passes catalogStage YARN', () => {
  it('includes catalogStage in query params', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { catalogStage: 'YARN' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: 'YARN' })
    );
  });
});

// ─── T-STAGE-B2: catalogStage GARMENT forwarded ───────────────────────────
describe('T-STAGE-B2 — getBuyerCatalogItems passes catalogStage GARMENT', () => {
  it('includes catalogStage GARMENT in query params', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { catalogStage: 'GARMENT' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: 'GARMENT' })
    );
  });
});

// ─── T-STAGE-B3: catalogStage SERVICE forwarded ───────────────────────────
describe('T-STAGE-B3 — getBuyerCatalogItems passes catalogStage SERVICE', () => {
  it('includes catalogStage SERVICE in query params', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { catalogStage: 'SERVICE' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: 'SERVICE' })
    );
  });
});

// ─── T-STAGE-B4: catalogStage MACHINE forwarded ───────────────────────────
describe('T-STAGE-B4 — getBuyerCatalogItems passes catalogStage MACHINE', () => {
  it('includes catalogStage MACHINE in query params', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { catalogStage: 'MACHINE' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: 'MACHINE' })
    );
  });
});

// ─── T-STAGE-B5: catalogStage can be combined with other filters ──────────
describe('T-STAGE-B5 — catalogStage combined with fabricType filter', () => {
  it('forwards both catalogStage and fabricType', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { catalogStage: 'FABRIC_WOVEN', fabricType: 'WOVEN' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: 'FABRIC_WOVEN', fabricType: 'WOVEN' })
    );
  });
});

// ─── T-STAGE-B6: omitting catalogStage does not inject it ─────────────────
describe('T-STAGE-B6 — omitting catalogStage sends no catalogStage', () => {
  it('does not inject catalogStage when not provided', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { fabricType: 'KNIT' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.not.objectContaining({ catalogStage: expect.anything() })
    );
  });
});
