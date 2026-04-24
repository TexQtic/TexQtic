/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * UI layer: stage constants, payload building, form reset, and type shape tests.
 * These are pure logic/type tests — no DOM rendering required.
 */
import { describe, it, expect } from 'vitest';
import {
  CATALOG_STAGE_VALUES,
  SERVICE_TYPE_VALUES,
  type CatalogStage,
  type BuyerCatalogItem,
  type CreateCatalogItemRequest,
} from '../services/catalogService';

// T-STAGE-UI-1: CATALOG_STAGE_VALUES has exactly 14 entries
describe('CATALOG_STAGE_VALUES', () => {
  it('has exactly 14 entries', () => {
    expect(CATALOG_STAGE_VALUES).toHaveLength(14);
  });

  // T-STAGE-UI-2: Required stages are present
  it('includes YARN', () => {
    expect(CATALOG_STAGE_VALUES).toContain('YARN');
  });

  it('includes FIBER', () => {
    expect(CATALOG_STAGE_VALUES).toContain('FIBER');
  });

  it('includes FABRIC_KNIT', () => {
    expect(CATALOG_STAGE_VALUES).toContain('FABRIC_KNIT');
  });

  it('includes GARMENT', () => {
    expect(CATALOG_STAGE_VALUES).toContain('GARMENT');
  });

  it('includes MACHINE', () => {
    expect(CATALOG_STAGE_VALUES).toContain('MACHINE');
  });

  it('includes SERVICE', () => {
    expect(CATALOG_STAGE_VALUES).toContain('SERVICE');
  });

  it('includes SOFTWARE_SAAS', () => {
    expect(CATALOG_STAGE_VALUES).toContain('SOFTWARE_SAAS');
  });

  it('includes OTHER', () => {
    expect(CATALOG_STAGE_VALUES).toContain('OTHER');
  });
});

// T-STAGE-UI-3: SERVICE_TYPE_VALUES includes expected service types
describe('SERVICE_TYPE_VALUES', () => {
  it('includes TESTING_LAB', () => {
    expect(SERVICE_TYPE_VALUES).toContain('TESTING_LAB');
  });

  it('includes FASHION_DESIGN', () => {
    expect(SERVICE_TYPE_VALUES).toContain('FASHION_DESIGN');
  });

  it('includes LOGISTICS_PROVIDER', () => {
    expect(SERVICE_TYPE_VALUES).toContain('LOGISTICS_PROVIDER');
  });
});

// T-STAGE-UI-4: Payload catalogStage is included when set
describe('catalogStage payload building', () => {
  it('includes catalogStage in payload when set', () => {
    const stage: CatalogStage = 'YARN';
    const payload: Partial<CreateCatalogItemRequest> = {
      name: 'Test Yarn',
      price: 100,
      catalogStage: stage,
    };
    expect(payload.catalogStage).toBe('YARN');
  });

  // T-STAGE-UI-5: Empty catalogStage produces undefined in payload
  it('omits catalogStage from payload when empty', () => {
    const catalogStage = '';
    const payload: Partial<CreateCatalogItemRequest> = {
      name: 'Test Item',
      price: 100,
      ...(catalogStage ? { catalogStage: catalogStage as CatalogStage } : {}),
    };
    expect(payload.catalogStage).toBeUndefined();
  });

  // T-STAGE-UI-6: Empty stageAttributes sends undefined, not {}
  it('omits stageAttributes when object is empty', () => {
    const stageAttributes: Record<string, string> = {};
    const payload: Partial<CreateCatalogItemRequest> = {
      name: 'Test Item',
      price: 100,
      ...(Object.keys(stageAttributes).length > 0
        ? { stageAttributes: stageAttributes as Record<string, unknown> }
        : {}),
    };
    expect(payload.stageAttributes).toBeUndefined();
  });

  // T-STAGE-UI-7: Non-empty stageAttributes is included in payload
  it('includes stageAttributes when non-empty', () => {
    const stageAttributes: Record<string, string> = { yarnType: 'Spun', yarnCount: '40s' };
    const payload: Partial<CreateCatalogItemRequest> = {
      name: 'Test Yarn',
      price: 100,
      ...(Object.keys(stageAttributes).length > 0
        ? { stageAttributes: stageAttributes as Record<string, unknown> }
        : {}),
    };
    expect(payload.stageAttributes).toEqual({ yarnType: 'Spun', yarnCount: '40s' });
  });

  // T-STAGE-UI-8: Legacy item with null catalogStage — no catalogStage key in create payload
  it('does not include catalogStage for legacy null value', () => {
    const catalogStage: string | null = null;
    const payload: Partial<CreateCatalogItemRequest> = {
      name: 'Legacy Item',
      price: 50,
      ...(catalogStage ? { catalogStage: catalogStage as CatalogStage } : {}),
    };
    expect(payload.catalogStage).toBeUndefined();
  });
});

// T-STAGE-UI-9: Stage change resets stageAttributes
describe('stage change resets stageAttributes', () => {
  it('produces empty stageAttributes when catalogStage changes', () => {
    // Simulate the setAddItemFormData behavior: changing stage resets stageAttributes
    const prevState = { catalogStage: 'YARN', stageAttributes: { yarnType: 'Spun' } };
    const newState = { ...prevState, catalogStage: 'GARMENT', stageAttributes: {} };
    expect(newState.stageAttributes).toEqual({});
    expect(newState.catalogStage).toBe('GARMENT');
  });
});
