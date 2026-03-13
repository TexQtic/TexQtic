/**
 * WLStorefront — White-Label Storefront Page (PW5-WL1 + PW5-WL2)
 *
 * Single data-owner for the WL storefront. Catalog items are fetched
 * exactly once here; category grouping and filtering are performed
 * client-side from the already-fetched dataset.
 *
 * Constitutional compliance:
 *   tenantId is NEVER passed by the client.
 *   Tenant identity is resolved exclusively from the JWT on the server.
 *   getCatalogItems() → tenantGet() → requireTenantRealm() (JWT-scoped).
 *
 * Data flow (PW5-WL2 / PW5-WL3 / PW5-WL4):
 *   WLStorefront
 *    ├ fetches catalog items once via getCatalogItems()
 *    ├ stores items in state
 *    ├ derives CategoryCount[] from items
 *    ├ manages activeCategory state
 *    ├ manages selectedItemId state (PW5-WL3)
 *    ├ manages searchQuery state (PW5-WL4)
 *    ├ derives selectedItem from items (PW5-WL3 — no secondary fetch)
 *    ├ derives categoryFilteredItems from items + activeCategory
 *    ├ derives searchFilteredItems from categoryFilteredItems + searchQuery (PW5-WL4)
 *    ├ passes categories + activeCategory + onSelectCategory to WLCollectionsPanel
 *    ├ passes searchFilteredItems + onSelectItem to ProductGrid
 *    ├ renders WLSearchBar (PW5-WL4 — client-side only; no fetch on keystroke)
 *    └ renders WLProductDetailPage when selectedItemId is set (PW5-WL3)
 *
 * Category fallback:
 *   Items without a category value resolve to "Uncategorised".
 *   This is expected while the catalog schema lacks a category column.
 *   All products will group under "Uncategorised" by default.
 *
 * Scope (PW5-WL3 / PW5-WL4 additions):
 *   ✅ Single catalog fetch (unchanged)
 *   ✅ Category grouping derived client-side (unchanged)
 *   ✅ Category navigation via WLCollectionsPanel (unchanged)
 *   ✅ Client-side filtering (no additional API calls) (unchanged)
 *   ✅ Loading / empty / error states owned here (unchanged)
 *   ✅ Product detail view via selectedItemId state (PW5-WL3)
 *   ✅ Selected item derived from existing items state — no new fetch
 *   ✅ Product search via searchQuery state — client-side derived (PW5-WL4)
 *   ✅ Search composes with category filtering via chained useMemo (PW5-WL4)
 *   ❌ Cart / checkout — out of scope
 *   ❌ Remote / debounced search — architectural guardrail; not implemented
 *
 * WLStorefront remains the only owner of catalog fetching.
 * No child component may independently fetch catalog data.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCatalogItems, CatalogItem } from '../../services/catalogService';
import { WLCollectionsPanel, CategoryCount } from './WLCollectionsPanel';
import { ProductGrid } from './ProductGrid';
import { WLProductDetailPage } from './WLProductDetailPage';
import { WLSearchBar } from './WLSearchBar';

// ─── Category helpers ────────────────────────────────────────────────────────

const UNCATEGORISED = 'Uncategorised';

function resolveCategory(item: CatalogItem): string {
  return (item.category ?? '').trim() || UNCATEGORISED;
}

function deriveCategories(items: CatalogItem[]): CategoryCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = resolveCategory(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const entries = [...map.entries()];
  // Stable sort: named categories alpha-first, then Uncategorised last
  entries.sort(([a], [b]) => {
    if (a === UNCATEGORISED) return 1;
    if (b === UNCATEGORISED) return -1;
    return a.localeCompare(b);
  });
  return entries.map(([name, count]) => ({ name, count }));
}

// ─── WLStorefront ────────────────────────────────────────────────────────────

export function WLStorefront() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // PW5-WL3: selected product for detail view.
  // Derived item comes from already-fetched `items` — no secondary fetch occurs.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // PW5-WL4: search query — drives client-side derived filtering only.
  // No API call is triggered by changes to this value.
  const [searchQuery, setSearchQuery] = useState('');

  // ── Single catalog fetch ─────────────────────────────────────────────────
  // tenantId is NEVER passed — tenant scope resolved from JWT on the server.
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalogItems();
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load catalog items.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // ── Derived state (client-side only — no API calls) ──────────────────────
  const categories = useMemo(() => deriveCategories(items), [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === null) return items;
    return items.filter((i) => resolveCategory(i) === activeCategory);
  }, [items, activeCategory]);

  // PW5-WL4: search filtering — derived from category-filtered items.
  // Client-side only. Never mutates `items` or `filteredItems`.
  // Empty query short-circuits to return filteredItems unchanged.
  const searchFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredItems;
    return filteredItems.filter((item) => {
      const fields = [
        item.name,
        item.sku,
        item.description ?? '',
        item.category ?? '',
      ];
      return fields.some((f) => f.toLowerCase().includes(q));
    });
  }, [filteredItems, searchQuery]);

  // PW5-WL3: derive selected product from already-fetched items — no new fetch.
  // WLStorefront remains the exclusive owner of catalog data.
  const selectedItem = useMemo(
    () => (selectedItemId !== null ? (items.find((i) => i.id === selectedItemId) ?? null) : null),
    [items, selectedItemId]
  );

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId(id);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Browse the catalogue</p>
        </div>
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          Loading products…
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Browse the catalogue</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-rose-600 text-sm font-medium">{error}</p>
          <button
            onClick={() => void loadItems()}
            className="text-xs font-semibold text-slate-500 underline hover:text-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Loaded — product detail view (PW5-WL3) ──────────────────────────────
  // Triggered when a shopper selects a product card. selectedItem is derived
  // from already-fetched items — WLStorefront remains the only fetch owner.
  if (selectedItemId !== null) {
    if (selectedItem === null) {
      // Product ID in state but not found in items (edge case: item removed).
      return (
        <div className="animate-in fade-in duration-300">
          <button
            type="button"
            onClick={handleBackFromDetail}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
          >
            ← Products
          </button>
          <p className="text-sm text-slate-500">
            Product not found. It may have been removed from the catalogue.
          </p>
        </div>
      );
    }
    return (
      <WLProductDetailPage
        item={selectedItem}
        onBack={handleBackFromDetail}
      />
    );
  }

  // ── Loaded — storefront grid ─────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Products
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse the catalogue
        </p>
      </div>

      {/* Search input — PW5-WL4. Client-side only; no fetch on keystroke. */}
      <WLSearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Category navigation — no API calls; selection filters filteredItems client-side */}
      <WLCollectionsPanel
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Product grid — receives search+category-filtered items; no internal fetch */}
      <ProductGrid
        items={searchFilteredItems}
        onSelectItem={handleSelectItem}
        emptyMessage={
          searchQuery.trim()
            ? `No products match "${searchQuery.trim()}". Try a different term or clear the search.`
            : undefined
        }
      />
    </div>
  );
}
