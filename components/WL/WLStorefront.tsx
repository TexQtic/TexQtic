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
 * Data flow (PW5-WL2):
 *   WLStorefront
 *    ├ fetchs catalog items once via getCatalogItems()
 *    ├ stores items in state
 *    ├ derives CategoryCount[] from items
 *    ├ manages activeCategory state
 *    ├ passes categories + activeCategory + onSelectCategory to WLCollectionsPanel
 *    └ passes filteredItems to ProductGrid
 *
 * Category fallback:
 *   Items without a category value resolve to "Uncategorised".
 *   This is expected while the catalog schema lacks a category column.
 *   All products will group under "Uncategorised" by default.
 *
 * Scope (PW5-WL2):
 *   ✅ Single catalog fetch
 *   ✅ Category grouping derived client-side
 *   ✅ Category navigation via WLCollectionsPanel
 *   ✅ Client-side filtering (no additional API calls)
 *   ✅ Loading / empty / error states owned here
 *   ❌ Cart / checkout — out of scope
 *   ❌ Search — out of scope
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCatalogItems, CatalogItem } from '../../services/catalogService';
import { WLCollectionsPanel, CategoryCount } from './WLCollectionsPanel';
import { ProductGrid } from './ProductGrid';

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

  // ── Loaded ───────────────────────────────────────────────────────────────
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

      {/* Category navigation — no API calls; selection filters filteredItems client-side */}
      <WLCollectionsPanel
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Product grid — receives pre-filtered items; no internal fetch */}
      <ProductGrid items={filteredItems} />
    </div>
  );
}
