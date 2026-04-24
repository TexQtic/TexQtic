/**
 * TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001
 * Buyer catalog keyword search MVP — focused test coverage.
 *
 * Test strategy:
 * - T1  (service contract):  getBuyerCatalogItems appends `q` param when provided
 * - T2  (service contract):  getBuyerCatalogItems omits `q` when empty string
 * - T3  (service contract):  getBuyerCatalogItems omits `q` when undefined
 * - T4  (service contract):  q param is trimmed before being sent
 * - T5  (service contract):  q, cursor, and limit coexist correctly in query string
 * - T6  (service contract):  getBuyerCatalogItems rejects on error (no cross-contamination)
 * - T7  (pure helper):       resolveSearchEmptyState returns true only when search active + zero items + not loading
 * - T8  (pure helper):       resolveSearchEmptyState returns false when items present
 * - T9  (pure helper):       resolveSearchEmptyState returns false when loading
 * - T10 (pure helper):       resolveSearchEmptyState returns false when search is empty
 * - T11 (pure helper):       resolveEmptyCatalogState returns true only when no search + zero items + not loading
 * - T12 (pure descriptor):   PHASE_B_SEARCH_EMPTY_STATE_LINE is distinct from PHASE_B_EMPTY_STATE_LINES copy
 *
 * Deviations from design:
 * - T13 (debounce): render-level — requires render testing of inline App.tsx onChange block.
 *   Covered by manual verification M-SEARCH-1.
 * - T14 (Enter/Escape keyboard): render-level — requires render testing of onKeyDown block.
 *   Covered by manual verification M-SEARCH-2.
 * - T15 (Load More passes active q): requires render-level testing of handleLoadMoreBuyerCatalog
 *   closure over buyerCatalogSearch. Covered by manual verification M-SEARCH-3.
 * - T16 (Retry preserves q): requires render-level testing of Retry button onClick.
 *   Covered by manual verification M-SEARCH-4.
 * - T17 (supplier change clears search): requires render-level testing of Phase A card onClick.
 *   Covered by manual verification M-SEARCH-5.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import {
  getBuyerCatalogItems,
  type BuyerCatalogItem,
} from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';
import {
  __B2B_BUYER_CATALOG_SEARCH_TESTING__,
  __B2B_BUYER_CATALOG_LISTING_TESTING__,
} from '../App';

const {
  PHASE_B_SEARCH_EMPTY_STATE_LINE,
  resolveSearchEmptyState,
  resolveEmptyCatalogState,
} = __B2B_BUYER_CATALOG_SEARCH_TESTING__;

const { PHASE_B_EMPTY_STATE_LINES } = __B2B_BUYER_CATALOG_LISTING_TESTING__;

const tenantGetMock = vi.mocked(tenantGet);

const SUPPLIER_ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// T1 — service appends q param when provided
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T1: service appends q param when provided', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('calls the catalog endpoint with q in the query string', async () => {
    const item = makeCatalogItem();
    tenantGetMock.mockResolvedValue({ items: [item], count: 1, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: 'cotton' });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=cotton');
    expect(calledUrl).toContain(`/api/tenant/catalog/supplier/${SUPPLIER_ORG_ID}/items`);
  });
});

// ---------------------------------------------------------------------------
// T2 — service omits q when empty string
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T2: service omits q when empty string', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('does not append q param when q is empty string', async () => {
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: '' });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('q=');
  });
});

// ---------------------------------------------------------------------------
// T3 — service omits q when undefined
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T3: service omits q when undefined', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('does not append q param when q is undefined', async () => {
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: undefined });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('q=');
  });
});

// ---------------------------------------------------------------------------
// T4 — q param is trimmed before sending
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T4: q param is trimmed before sending', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('sends trimmed q and omits whitespace-only q', async () => {
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: '  cotton  ' });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=cotton');
    expect(calledUrl).not.toContain('q=++');
  });

  it('omits q when value is whitespace only', async () => {
    tenantGetMock.mockReset();
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: '   ' });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('q=');
  });
});

// ---------------------------------------------------------------------------
// T5 — q, cursor, and limit coexist in query string
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T5: q coexists with cursor and limit', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('includes q, cursor, and limit in the same request', async () => {
    const cursor = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    tenantGetMock.mockResolvedValue({ items: [], count: 0, nextCursor: null });

    await getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: 'twill', cursor, limit: 10 });

    const calledUrl: string = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=twill');
    expect(calledUrl).toContain(`cursor=${cursor}`);
    expect(calledUrl).toContain('limit=10');
  });
});

// ---------------------------------------------------------------------------
// T6 — service rejects on network error (no cross-state contamination)
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T6: service rejects on error', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('propagates network error as rejection', async () => {
    tenantGetMock.mockRejectedValue(new Error('Network failure'));

    await expect(getBuyerCatalogItems(SUPPLIER_ORG_ID, { q: 'cotton' })).rejects.toThrow(
      'Network failure',
    );
  });
});

// ---------------------------------------------------------------------------
// T7 — resolveSearchEmptyState: true when search active + zero items + not loading
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T7: resolveSearchEmptyState affirmative path', () => {
  it('returns true when search non-empty, itemCount zero, not loading', () => {
    expect(resolveSearchEmptyState('cotton', 0, false)).toBe(true);
  });

  it('returns true for single-char search term', () => {
    expect(resolveSearchEmptyState('c', 0, false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T8 — resolveSearchEmptyState: false when items present
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T8: resolveSearchEmptyState false when items present', () => {
  it('returns false when items are present', () => {
    expect(resolveSearchEmptyState('cotton', 3, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T9 — resolveSearchEmptyState: false when loading
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T9: resolveSearchEmptyState false when loading', () => {
  it('returns false while loading is true', () => {
    expect(resolveSearchEmptyState('cotton', 0, true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T10 — resolveSearchEmptyState: false when search is empty
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T10: resolveSearchEmptyState false when search empty', () => {
  it('returns false when search is empty string', () => {
    expect(resolveSearchEmptyState('', 0, false)).toBe(false);
  });

  it('returns false when search is whitespace only', () => {
    expect(resolveSearchEmptyState('   ', 0, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T11 — resolveEmptyCatalogState: true only when no search + zero items + not loading
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T11: resolveEmptyCatalogState', () => {
  it('returns true when no search, zero items, not loading', () => {
    expect(resolveEmptyCatalogState('', 0, false)).toBe(true);
  });

  it('returns false when search is active', () => {
    expect(resolveEmptyCatalogState('cotton', 0, false)).toBe(false);
  });

  it('returns false when loading', () => {
    expect(resolveEmptyCatalogState('', 0, true)).toBe(false);
  });

  it('returns false when items are present', () => {
    expect(resolveEmptyCatalogState('', 2, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T12 — PHASE_B_SEARCH_EMPTY_STATE_LINE is distinct from catalog-empty copy
// ---------------------------------------------------------------------------

describe('TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 — T12: search-empty copy is distinct from catalog-empty copy', () => {
  it('PHASE_B_SEARCH_EMPTY_STATE_LINE is a non-empty string', () => {
    expect(typeof PHASE_B_SEARCH_EMPTY_STATE_LINE).toBe('string');
    expect(PHASE_B_SEARCH_EMPTY_STATE_LINE.length).toBeGreaterThan(0);
  });

  it('search-empty copy differs from both catalog-empty state lines', () => {
    expect(PHASE_B_SEARCH_EMPTY_STATE_LINE).not.toBe(PHASE_B_EMPTY_STATE_LINES[0]);
    expect(PHASE_B_SEARCH_EMPTY_STATE_LINE).not.toBe(PHASE_B_EMPTY_STATE_LINES[1]);
  });
});
