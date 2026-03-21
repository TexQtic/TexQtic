import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { ProductGrid } from '../components/WL/ProductGrid';
import { WLCollectionsPanel, type CategoryCount } from '../components/WL/WLCollectionsPanel';
import { WLProductDetailPage } from '../components/WL/WLProductDetailPage';
import { WLSearchBar } from '../components/WL/WLSearchBar';
import { getCatalogItems, type CatalogItem } from '../services/catalogService';
import { tenantGet } from '../services/tenantApiClient';

const tenantGetMock = vi.mocked(tenantGet);

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    active: true,
    category: 'Cotton',
    createdAt: '2026-03-21T08:00:00.000Z',
    description: 'Premium cotton twill for enterprise buyers.',
    id: 'item-1',
    moq: 12,
    name: 'Premium Cotton Twill',
    price: 24.5,
    sku: 'COT-TWL-001',
    tenantId: 'tenant-1',
    updatedAt: '2026-03-21T09:00:00.000Z',
    ...overrides,
  };
}

function renderGrid(items: CatalogItem[], emptyMessage?: string) {
  return renderToStaticMarkup(
    <ProductGrid items={items} onSelectItem={() => undefined} emptyMessage={emptyMessage} />,
  );
}

function renderCollections(categories: CategoryCount[], activeCategory: string | null = null) {
  return renderToStaticMarkup(
    <WLCollectionsPanel
      categories={categories}
      activeCategory={activeCategory}
      onSelectCategory={() => undefined}
    />,
  );
}

function renderSearchBar(value: string) {
  return renderToStaticMarkup(
    <WLSearchBar value={value} onChange={() => undefined} />,
  );
}

function renderDetail(item: CatalogItem, onAddToCart?: (catalogItemId: string, quantity: number) => Promise<void>) {
  return renderToStaticMarkup(
    <WLProductDetailPage item={item} onBack={() => undefined} onAddToCart={onAddToCart} />,
  );
}

describe('runtime verification - white-label storefront catalog contract', () => {
  beforeEach(() => {
    tenantGetMock.mockReset();
  });

  it('uses the existing tenant catalog endpoint and preserves the storefront envelope', async () => {
    const item = makeCatalogItem();
    tenantGetMock.mockResolvedValue({ count: 1, items: [item], nextCursor: null });

    const result = await getCatalogItems();

    expect(tenantGetMock).toHaveBeenCalledWith('/api/tenant/catalog/items');
    expect(result.items).toEqual([item]);
    expect(result.count).toBe(1);
    expect(result.nextCursor).toBeNull();
  });
});

describe('runtime verification - white-label storefront surfaces', () => {
  it('renders visible catalog items and count metadata in the product grid', () => {
    const html = renderGrid([
      makeCatalogItem(),
      makeCatalogItem({ id: 'item-2', name: 'Organic Linen Blend', sku: 'LIN-BLD-002' }),
    ]);

    expect(html).toContain('Premium Cotton Twill');
    expect(html).toContain('Organic Linen Blend');
    expect(html).toContain('2 items');
    expect(html).toContain('Product catalogue');
  });

  it('renders a stable empty storefront state for filtered or unavailable catalog results', () => {
    const html = renderGrid([], 'No seeded storefront products are currently visible.');

    expect(html).toContain('No seeded storefront products are currently visible.');
  });

  it('renders category visibility with counts and an all-products reset control', () => {
    const html = renderCollections([
      { name: 'Cotton', count: 3 },
      { name: 'Uncategorised', count: 1 },
    ]);

    expect(html).toContain('All');
    expect(html).toContain('Cotton');
    expect(html).toContain('Uncategorised');
    expect(html).toContain('3');
    expect(html).toContain('1');
  });

  it('renders the category and search controls as storefront-owned filtering surfaces', () => {
    const categoriesHtml = renderCollections([{ name: 'Cotton', count: 3 }], 'Cotton');
    const searchHtml = renderSearchBar('cotton');

    expect(categoriesHtml).toContain('Product categories');
    expect(categoriesHtml).toContain('aria-pressed="true"');
    expect(searchHtml).toContain('wl-product-search');
    expect(searchHtml).toContain('placeholder="Search products…"');
    expect(searchHtml).toContain('Clear search');
  });

  it('renders storefront detail state with category fallback, MOQ, and live cart affordance', () => {
    const html = renderDetail(
      makeCatalogItem({
        category: '',
        imageUrl: undefined,
      }),
      async () => undefined,
    );

    expect(html).toContain('Premium Cotton Twill');
    expect(html).toContain('COT-TWL-001');
    expect(html).toContain('Uncategorised');
    expect(html).toContain('12 units');
    expect(html).toContain('24.50');
    expect(html).toContain('Add to Cart');
  });

  it('renders transaction failure-safe detail copy when cart wiring is absent', () => {
    const html = renderDetail(makeCatalogItem({ active: false }));

    expect(html).toContain('Add to Cart');
    expect(html).toContain('Cart not available');
    expect(html).toContain('Inactive');
  });

  it('renders the controlled search surface with the current query and clear affordance', () => {
    const html = renderSearchBar('linen');

    expect(html).toContain('value="linen"');
    expect(html).toContain('Search products');
    expect(html).toContain('Clear search');
  });
});