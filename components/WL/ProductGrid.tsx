/**
 * ProductGrid — WL Storefront (PW5-WL1)
 *
 * Fetches tenant catalog items and renders them in a responsive grid
 * of ProductCard components.
 *
 * Constitutional compliance:
 *   tenantId is NEVER passed by the client.
 *   getCatalogItems() calls tenantGet() which derives tenant scope
 *   exclusively from the JWT claims on the server.
 *
 * Scope (PW5-WL1):
 *   ✅ Fetch + render catalog items
 *   ✅ Responsive grid layout (1 → 2 → 3 → 4 columns)
 *   ✅ Loading state
 *   ✅ Empty state
 *   ✅ Error state
 *   ❌ Pagination — out of scope (PW5-WL1)
 *   ❌ Search / filter — out of scope (PW5-WL1)
 *   ❌ Cart / checkout — out of scope (PW5-WL2+)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCatalogItems, CatalogItem } from '../../services/catalogService';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  /** Optional cap on items rendered (default: all returned by the endpoint). */
  limit?: number;
}

export function ProductGrid({ limit }: ProductGridProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = limit ? { limit } : {};
      const res = await getCatalogItems(params);
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load catalog items.'
      );
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
        Loading products…
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-rose-600 text-sm font-medium">{error}</p>
        <button
          onClick={() => void loadItems()}
          className="text-xs font-semibold text-slate-500 underline hover:text-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
        No products available
      </div>
    );
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  return (
    <section aria-label="Product catalogue">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-300 text-right">
        {items.length} item{items.length !== 1 ? 's' : ''}
      </p>
    </section>
  );
}
