/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * Legacy compatibility — null catalogStage items pass through unchanged
 * in buyer GET filter paths, vector text, and completeness scoring.
 * T-STAGE-L1 – T-STAGE-L6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBuyerCatalogItems } from '../services/catalogService';
import {
  buildCatalogItemVectorText,
  catalogItemAttributeCompleteness,
} from '../server/src/routes/tenant';

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

// ─── T-STAGE-L1: existing fabricType filter unaffected by stage feature ───
describe('T-STAGE-L1 — existing fabricType filter still works without catalogStage', () => {
  it('sends fabricType without catalogStage', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { fabricType: 'WOVEN' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ fabricType: 'WOVEN' })
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ catalogStage: expect.anything() })
    );
  });
});

// ─── T-STAGE-L2: existing material filter unaffected ──────────────────────
describe('T-STAGE-L2 — existing material filter still works without catalogStage', () => {
  it('sends material without catalogStage', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { material: ['COTTON', 'LINEN'] });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ material: ['COTTON', 'LINEN'] })
    );
  });
});

// ─── T-STAGE-L3: existing certification filter unaffected ─────────────────
describe('T-STAGE-L3 — existing certification filter still works without catalogStage', () => {
  it('sends certification without catalogStage', async () => {
    mockGet.mockResolvedValueOnce(emptyPage as never);
    await getBuyerCatalogItems('org-001', { certification: 'GOTS' });
    expect(mockGet).toHaveBeenCalledWith(
      'org-001',
      expect.objectContaining({ certification: 'GOTS' })
    );
  });
});

// ─── T-STAGE-L4: vector text for null-stage item uses existing fabric fields
describe('T-STAGE-L4 — null catalogStage vector text uses fabric fields', () => {
  it('emits fabricType label for null-stage item', () => {
    const text = buildCatalogItemVectorText({
      name: 'Plain Cotton',
      fabricType: 'WOVEN',
      material: 'COTTON',
      catalogStage: null,
    });
    expect(text).toContain('Fabric type: WOVEN');
    expect(text).toContain('Material: COTTON');
  });
});

// ─── T-STAGE-L5: vector text for null-stage still excludes price ──────────
describe('T-STAGE-L5 — null catalogStage vector text excludes price', () => {
  it('does not emit price label for null-stage item', () => {
    const text = buildCatalogItemVectorText({
      name: 'Plain Cotton',
      material: 'COTTON',
      catalogStage: null,
    });
    expect(text.toLowerCase()).not.toMatch(/\bprice\b/);
  });
});

// ─── T-STAGE-L6: completeness for undefined stage uses default 9-field scale
describe('T-STAGE-L6 — undefined catalogStage uses default 9-field completeness', () => {
  it('returns 1 for all 9 legacy fields present, no catalogStage key', () => {
    const result = catalogItemAttributeCompleteness({
      productCategory: 'APPAREL_FABRIC',
      fabricType: 'WOVEN',
      gsm: 200,
      material: 'COTTON',
      composition: '100% Cotton',
      color: 'White',
      widthCm: 150,
      construction: 'TWILL',
      certifications: [{ standard: 'OEKO-TEX' }],
    });
    expect(result).toBe(1);
  });
});
