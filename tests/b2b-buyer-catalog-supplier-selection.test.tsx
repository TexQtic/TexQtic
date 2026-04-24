/**
 * TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001
 * Buyer catalog supplier-selection test coverage.
 *
 * Test strategy (per design artifact §G Slice 4):
 * - T1, T6 (data contract): service layer tests — mock tenantGet, verify endpoint + shape
 * - T2, T10 (phase guard): pure function resolveSupplierCatalogPhase
 * - T7 (Phase B guard): resolveSupplierCatalogPhase with non-empty org ID
 * - T12, T13 (name resolution): resolveSupplierDisplayName
 * - T5-adjacent (route registration): buyer_catalog registered in B2B workspace manifest
 *
 * T3, T4, T8, T9, T11: require render-level testing of inline App.tsx blocks.
 * These are not coverable via the project's renderToStaticMarkup pattern without
 * standalone component extraction (excluded per design constraints). Covered by
 * manual verification steps M3–M9 in the design artifact.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import {
  getBuyerCatalogItems,
  getEligibleSuppliers,
  type BuyerCatalogItem,
  type SupplierPickerEntry,
} from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';
import {
  createTenantSessionRuntimeDescriptor,
  getRuntimeLocalRouteRegistration,
  resolveRuntimeManifestEntryFromDescriptor,
  resolveRuntimeLocalRouteSelection,
} from '../runtime/sessionRuntimeDescriptor';
import { __B2B_BUYER_CATALOG_TESTING__ } from '../App';

const { resolveSupplierDisplayName, resolveSupplierCatalogPhase } = __B2B_BUYER_CATALOG_TESTING__;

const tenantGetMock = vi.mocked(tenantGet);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSupplierEntry(overrides: Partial<SupplierPickerEntry> = {}): SupplierPickerEntry {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    slug: 'qa-b2b',
    legalName: 'QA Supplier B2B',
    primarySegment: 'INDUSTRIAL_GOODS',
    ...overrides,
  };
}

function makeCatalogItem(overrides: Partial<BuyerCatalogItem> = {}): BuyerCatalogItem {
  return {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Premium Cotton Twill',
    sku: 'COT-TWL-001',
    description: 'Durable cotton twill suitable for industrial use.',
    moq: 100,
    imageUrl: null,
    ...overrides,
  };
}

const SUPPLIER_ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ---------------------------------------------------------------------------
// T1 — getEligibleSuppliers service contract
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — T1: getEligibleSuppliers service contract', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('calls the eligible suppliers endpoint and returns items + total', async () => {
    const entry = makeSupplierEntry();
    tenantGetMock.mockResolvedValue({ items: [entry], total: 1 });

    const result = await getEligibleSuppliers();

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/b2b/eligible-suppliers');
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: SUPPLIER_ORG_ID,
      slug: 'qa-b2b',
      legalName: 'QA Supplier B2B',
      primarySegment: 'INDUSTRIAL_GOODS',
    });
  });

  it('returns empty items list when no eligible suppliers are available', async () => {
    tenantGetMock.mockResolvedValue({ items: [], total: 0 });

    const result = await getEligibleSuppliers();

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns supplier with null primarySegment when segment is not configured', async () => {
    tenantGetMock.mockResolvedValue({
      items: [makeSupplierEntry({ primarySegment: null })],
      total: 1,
    });

    const result = await getEligibleSuppliers();

    expect(result.items[0].primarySegment).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T6 — getBuyerCatalogItems service contract
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — T6: getBuyerCatalogItems service contract', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('calls the correct supplier-scoped items endpoint', async () => {
    const item = makeCatalogItem();
    tenantGetMock.mockResolvedValue({ items: [item], count: 1, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID);

    expect(tenantGetMock).toHaveBeenCalledWith(
      `/api/tenant/catalog/supplier/${SUPPLIER_ORG_ID}/items`,
    );
  });

  it('returns catalog items with expected fields; no price field in response', async () => {
    const item = makeCatalogItem();
    tenantGetMock.mockResolvedValue({ items: [item], count: 1, nextCursor: null });

    const result = await getBuyerCatalogItems(SUPPLIER_ORG_ID);

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    const returned = result.items[0];
    expect(returned).toMatchObject({
      id: item.id,
      name: 'Premium Cotton Twill',
      sku: 'COT-TWL-001',
      moq: 100,
    });
    // Price intentionally excluded from Phase 1 buyer catalog response
    expect(returned).not.toHaveProperty('price');
    expect(returned).not.toHaveProperty('publicationPosture');
  });

  it('passes cursor query param when provided', async () => {
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { cursor: 'cursor-xyz' });

    const callArg: string = tenantGetMock.mock.calls[0][0] as string;
    expect(callArg).toContain('cursor=cursor-xyz');
  });

  it('returns nextCursor when more pages are available', async () => {
    tenantGetMock.mockResolvedValue({
      items: [makeCatalogItem()],
      count: 2,
      nextCursor: 'next-page-cursor',
    });

    const result = await getBuyerCatalogItems(SUPPLIER_ORG_ID);

    expect(result.nextCursor).toBe('next-page-cursor');
  });
});

// ---------------------------------------------------------------------------
// T2, T7, T10 — resolveSupplierCatalogPhase (phase guard)
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — T2/T7/T10: Phase A / Phase B guard', () => {
  it('T2: resolves PHASE_A when no supplier is selected (empty string)', () => {
    expect(resolveSupplierCatalogPhase('')).toBe('PHASE_A');
  });

  it('T7: resolves PHASE_B when a supplier org ID is set', () => {
    expect(resolveSupplierCatalogPhase(SUPPLIER_ORG_ID)).toBe('PHASE_B');
  });

  it('T10: returns PHASE_A when supplier org ID is cleared (simulates ← All Suppliers)', () => {
    // Phase B is active when orgId is set
    expect(resolveSupplierCatalogPhase(SUPPLIER_ORG_ID)).toBe('PHASE_B');
    // After clear (← All Suppliers sets supplierOrgId to ''), phase returns to A
    expect(resolveSupplierCatalogPhase('')).toBe('PHASE_A');
  });
});

// ---------------------------------------------------------------------------
// T12, T13 — resolveSupplierDisplayName (supplier name resolution)
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — T12/T13: supplier display name resolution', () => {
  const supplierList: Array<{ id: string; legalName: string }> = [
    { id: SUPPLIER_ORG_ID, legalName: 'QA Supplier B2B' },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', legalName: 'Another Supplier Ltd' },
  ];

  it('T12: resolves supplier legal name when org ID is in picker list', () => {
    expect(resolveSupplierDisplayName(supplierList, SUPPLIER_ORG_ID)).toBe('QA Supplier B2B');
  });

  it('T12: resolves correct name when multiple suppliers are present', () => {
    expect(
      resolveSupplierDisplayName(supplierList, 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ).toBe('Another Supplier Ltd');
  });

  it('T13: falls back to "Supplier Catalog" when org ID is not in picker list', () => {
    expect(
      resolveSupplierDisplayName(supplierList, 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ).toBe('Supplier Catalog');
  });

  it('T13: falls back to "Supplier Catalog" when picker list is empty', () => {
    expect(resolveSupplierDisplayName([], SUPPLIER_ORG_ID)).toBe('Supplier Catalog');
  });

  it('T13: falls back to "Supplier Catalog" when org ID is empty string', () => {
    expect(resolveSupplierDisplayName(supplierList, '')).toBe('Supplier Catalog');
  });
});

// ---------------------------------------------------------------------------
// T5-adjacent — buyer_catalog route is registered in B2B workspace manifest
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-SUPPLIER-SELECTION-UX-REFINE-001 — T5-adjacent: buyer_catalog route registration', () => {
  const makeB2BDescriptor = () =>
    createTenantSessionRuntimeDescriptor({
      tenantId: 'qa-buyer-tenant',
      tenantSlug: 'qa-buyer',
      tenantName: 'QA Buyer',
      tenantCategory: 'B2B',
      whiteLabelCapability: false,
      commercialPlan: 'PROFESSIONAL',
      authenticatedRole: 'OWNER',
    });

  it('B2B workspace manifest includes the buyer_catalog route in catalog_browse group', () => {
    const descriptor = makeB2BDescriptor();
    const entry = resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE');

    expect(entry?.allowedRouteGroups).toContain('catalog_browse');

    const registration = getRuntimeLocalRouteRegistration(entry ?? null, 'buyer_catalog');
    expect(registration).not.toBeNull();
    expect(registration?.routeGroupKey).toBe('catalog_browse');
  });

  it('buyer_catalog expView binding resolves to the buyer catalog route key', () => {
    const descriptor = makeB2BDescriptor();
    const entry = resolveRuntimeManifestEntryFromDescriptor(descriptor ?? null, 'EXPERIENCE');

    const selection = resolveRuntimeLocalRouteSelection(entry ?? null, { expView: 'BUYER_CATALOG' });
    expect(selection?.routeKey).toBe('buyer_catalog');
    expect(selection?.routeGroupKey).toBe('catalog_browse');
  });
});
