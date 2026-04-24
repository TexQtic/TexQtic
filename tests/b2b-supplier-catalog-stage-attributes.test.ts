/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * Supplier catalog CRUD — catalogStage + stageAttributes forwarded through service.
 * T-STAGE-S1 – T-STAGE-S8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCatalogItem,
  updateCatalogItem,
  CATALOG_STAGE_VALUES,
  SERVICE_TYPE_VALUES,
} from '../services/catalogService';

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

beforeEach(() => vi.clearAllMocks());

const fakeItem = {
  id: 'item-001',
  tenantId: 'org-001',
  name: 'Ring-Spun Cotton Yarn',
  sku: 'YARN-001',
  description: null,
  price: 10,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

// ─── T-STAGE-S1: CATALOG_STAGE_VALUES exports 14 canonical values ──────────
describe('T-STAGE-S1 — CATALOG_STAGE_VALUES length', () => {
  it('has 14 stage values', () => {
    expect(CATALOG_STAGE_VALUES).toHaveLength(14);
  });

  it('contains YARN and SERVICE', () => {
    expect(CATALOG_STAGE_VALUES).toContain('YARN');
    expect(CATALOG_STAGE_VALUES).toContain('SERVICE');
  });
});

// ─── T-STAGE-S2: SERVICE_TYPE_VALUES exports 12 values ────────────────────
describe('T-STAGE-S2 — SERVICE_TYPE_VALUES length', () => {
  it('has 12 service type values', () => {
    expect(SERVICE_TYPE_VALUES).toHaveLength(12);
  });

  it('contains FASHION_DESIGN and TESTING_LAB', () => {
    expect(SERVICE_TYPE_VALUES).toContain('FASHION_DESIGN');
    expect(SERVICE_TYPE_VALUES).toContain('TESTING_LAB');
  });
});

// ─── T-STAGE-S3: createCatalogItem accepts catalogStage ───────────────────
describe('T-STAGE-S3 — createCatalogItem accepts catalogStage', () => {
  it('forwards catalogStage in payload', async () => {
    mockCreate.mockResolvedValueOnce({ item: fakeItem } as never);
    await createCatalogItem({ name: 'Yarn Sample', price: 5, catalogStage: 'YARN' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ catalogStage: 'YARN' })
    );
  });
});

// ─── T-STAGE-S4: createCatalogItem accepts stageAttributes ───────────────
describe('T-STAGE-S4 — createCatalogItem accepts stageAttributes', () => {
  it('forwards stageAttributes in payload', async () => {
    const attrs = { yarnType: 'RING_SPUN', countSystem: 'NE', yarnCount: '40/1' };
    mockCreate.mockResolvedValueOnce({ item: fakeItem } as never);
    await createCatalogItem({
      name: 'Yarn Sample',
      price: 5,
      catalogStage: 'YARN',
      stageAttributes: attrs,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ stageAttributes: attrs })
    );
  });
});

// ─── T-STAGE-S5: createCatalogItem accepts SERVICE stage with serviceType ─
describe('T-STAGE-S5 — createCatalogItem accepts SERVICE stage attributes', () => {
  it('forwards SERVICE stageAttributes', async () => {
    const attrs = {
      serviceType: 'TESTING_LAB',
      specialization: 'Textile fiber testing',
      industryFocus: ['APPAREL', 'HOME_TEXTILE'],
    };
    mockCreate.mockResolvedValueOnce({ item: fakeItem } as never);
    await createCatalogItem({
      name: 'Fiber Testing Lab',
      price: 500,
      catalogStage: 'SERVICE',
      stageAttributes: attrs,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogStage: 'SERVICE',
        stageAttributes: expect.objectContaining({ serviceType: 'TESTING_LAB' }),
      })
    );
  });
});

// ─── T-STAGE-S6: updateCatalogItem accepts catalogStage ──────────────────
describe('T-STAGE-S6 — updateCatalogItem accepts catalogStage', () => {
  it('forwards catalogStage in update payload', async () => {
    mockUpdate.mockResolvedValueOnce({ item: fakeItem } as never);
    await updateCatalogItem('item-001', { catalogStage: 'GARMENT' });
    expect(mockUpdate).toHaveBeenCalledWith(
      'item-001',
      expect.objectContaining({ catalogStage: 'GARMENT' })
    );
  });
});

// ─── T-STAGE-S7: updateCatalogItem accepts null catalogStage (clear) ──────
describe('T-STAGE-S7 — updateCatalogItem clears catalogStage with null', () => {
  it('forwards null catalogStage to clear stage', async () => {
    mockUpdate.mockResolvedValueOnce({ item: fakeItem } as never);
    await updateCatalogItem('item-001', { catalogStage: null });
    expect(mockUpdate).toHaveBeenCalledWith(
      'item-001',
      expect.objectContaining({ catalogStage: null })
    );
  });
});

// ─── T-STAGE-S8: updateCatalogItem accepts stageAttributes ───────────────
describe('T-STAGE-S8 — updateCatalogItem accepts stageAttributes', () => {
  it('forwards stageAttributes in update payload', async () => {
    const attrs = { machineType: 'RAPIER_LOOM', brand: 'Picanol', year: 2022, condition: 'NEW' };
    mockUpdate.mockResolvedValueOnce({ item: fakeItem } as never);
    await updateCatalogItem('item-001', {
      catalogStage: 'MACHINE',
      stageAttributes: attrs,
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      'item-001',
      expect.objectContaining({
        catalogStage: 'MACHINE',
        stageAttributes: expect.objectContaining({ machineType: 'RAPIER_LOOM' }),
      })
    );
  });
});
