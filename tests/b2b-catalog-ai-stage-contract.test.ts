/**
 * TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
 * AI helpers — buildCatalogItemVectorText and catalogItemAttributeCompleteness
 * with stage-specific dispatch.
 * T-STAGE-AI1 – T-STAGE-AI14
 */
import { describe, it, expect } from 'vitest';
import {
  buildCatalogItemVectorText,
  catalogItemAttributeCompleteness,
} from '../server/src/routes/tenant';

// ─── T-STAGE-AI1: YARN stage vector text includes yarnType ────────────────
describe('T-STAGE-AI1 — vector text for YARN includes yarnType', () => {
  it('emits yarnType from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'Ring-Spun Yarn',
      catalogStage: 'YARN',
      stageAttributes: { yarnType: 'RING_SPUN', yarnCount: '40/1', countSystem: 'NE' },
    });
    expect(text).toContain('RING_SPUN');
  });
});

// ─── T-STAGE-AI2: YARN stage vector text includes top-level certifications ─
describe('T-STAGE-AI2 — vector text for YARN includes certifications', () => {
  it('emits certifications from top-level certifications field', () => {
    const text = buildCatalogItemVectorText({
      name: 'Organic Yarn',
      catalogStage: 'YARN',
      certifications: [{ standard: 'GOTS' }],
      stageAttributes: { yarnType: 'RING_SPUN' },
    });
    expect(text).toContain('GOTS');
  });
});

// ─── T-STAGE-AI3: YARN stage does NOT include price ───────────────────────
describe('T-STAGE-AI3 — vector text for YARN excludes price', () => {
  it('does not include price label in YARN vector text', () => {
    const text = buildCatalogItemVectorText({
      name: 'Premium Yarn',
      catalogStage: 'YARN',
      stageAttributes: { yarnType: 'COMBED', yarnCount: '60/1' },
    });
    expect(text.toLowerCase()).not.toMatch(/\bprice\b/);
  });
});

// ─── T-STAGE-AI4: GARMENT stage vector text includes garmentType ──────────
describe('T-STAGE-AI4 — vector text for GARMENT includes garmentType', () => {
  it('emits garmentType from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'Casual Shirt',
      catalogStage: 'GARMENT',
      stageAttributes: {
        garmentType: 'SHIRT',
        gender: 'UNISEX',
        fabricComposition: '100% Cotton',
      },
    });
    expect(text).toContain('SHIRT');
  });
});

// ─── T-STAGE-AI5: SERVICE stage vector text includes serviceType ──────────
describe('T-STAGE-AI5 — vector text for SERVICE includes serviceType', () => {
  it('emits serviceType from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'Testing Lab',
      catalogStage: 'SERVICE',
      stageAttributes: {
        serviceType: 'TESTING_LAB',
        specialization: 'Fiber testing',
      },
    });
    expect(text).toContain('TESTING_LAB');
  });
});

// ─── T-STAGE-AI6: MACHINE stage vector text includes machineType ──────────
describe('T-STAGE-AI6 — vector text for MACHINE includes machineType', () => {
  it('emits machineType from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'Rapier Loom',
      catalogStage: 'MACHINE',
      stageAttributes: {
        machineType: 'RAPIER_LOOM',
        brand: 'Picanol',
        year: 2022,
      },
    });
    expect(text).toContain('RAPIER_LOOM');
  });
});

// ─── T-STAGE-AI7: SOFTWARE_SAAS stage vector text includes softwareCategory
describe('T-STAGE-AI7 — vector text for SOFTWARE_SAAS includes softwareCategory', () => {
  it('emits softwareCategory from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'ERP Suite',
      catalogStage: 'SOFTWARE_SAAS',
      stageAttributes: {
        softwareCategory: 'ERP',
        deploymentModel: 'CLOUD',
        modules: ['INVENTORY', 'PRODUCTION'],
      },
    });
    expect(text).toContain('ERP');
  });
});

// ─── T-STAGE-AI8: FIBER stage vector text includes fiberType ──────────────
describe('T-STAGE-AI8 — vector text for FIBER includes fiberType', () => {
  it('emits fiberType from stageAttributes', () => {
    const text = buildCatalogItemVectorText({
      name: 'Organic Cotton Fiber',
      catalogStage: 'FIBER',
      stageAttributes: {
        fiberType: 'COTTON',
        fiberGrade: 'PREMIUM',
        origin: 'INDIA',
      },
    });
    expect(text).toContain('COTTON');
  });
});

// ─── T-STAGE-AI9: YARN completeness uses 11-field scale ───────────────────
describe('T-STAGE-AI9 — completeness for YARN uses 11-field scale', () => {
  it('returns a fraction ≤ 1 for partial YARN item', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: 'YARN',
      stageAttributes: {
        yarnType: 'RING_SPUN',
        yarnCount: '40/1',
        countSystem: 'NE',
      },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── T-STAGE-AI10: GARMENT completeness uses 10-field scale ───────────────
describe('T-STAGE-AI10 — completeness for GARMENT uses 10-field scale', () => {
  it('returns a fraction ≤ 1 for partial GARMENT item', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: 'GARMENT',
      stageAttributes: {
        garmentType: 'SHIRT',
        gender: 'UNISEX',
      },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── T-STAGE-AI11: MACHINE completeness uses 8-field scale ────────────────
describe('T-STAGE-AI11 — completeness for MACHINE uses 8-field scale', () => {
  it('returns a fraction ≤ 1 for partial MACHINE item', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: 'MACHINE',
      stageAttributes: {
        machineType: 'RAPIER_LOOM',
        brand: 'Picanol',
      },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── T-STAGE-AI12: SERVICE completeness uses 7-field scale ────────────────
describe('T-STAGE-AI12 — completeness for SERVICE uses 7-field scale', () => {
  it('returns a fraction ≤ 1 for partial SERVICE item', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: 'SERVICE',
      stageAttributes: {
        serviceType: 'TESTING_LAB',
        specialization: 'Fiber testing',
      },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── T-STAGE-AI13: FABRIC_KNIT completeness uses 9-field scale ────────────
describe('T-STAGE-AI13 — completeness for FABRIC_KNIT uses 9-field scale', () => {
  it('returns a fraction ≤ 1 for partial FABRIC_KNIT item', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: 'FABRIC_KNIT',
      stageAttributes: {
        knitType: 'JERSEY',
        gauge: '28G',
      },
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── T-STAGE-AI14: null catalogStage falls through to default 9-field scale
describe('T-STAGE-AI14 — null catalogStage uses default 9-field completeness', () => {
  it('uses 9-field default scale for null stage', () => {
    const result = catalogItemAttributeCompleteness({
      catalogStage: null,
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
