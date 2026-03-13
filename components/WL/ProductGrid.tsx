/**
 * ProductGrid — WL Storefront (PW5-WL1 / PW5-WL2)
 *
 * Pure presentational grid component. Receives pre-fetched, pre-filtered
 * items from WLStorefront.
 *
 * Constitutional compliance:
 *   NO data fetching in this component (PW5-WL2 architectural constraint).
 *   Catalog data is owned exclusively by WLStorefront. This prevents
 *   duplicate API calls, UI flicker, and inconsistent category counts.
 *   tenantId is NEVER passed from any client component.
 *
 * Scope (PW5-WL2):
 *   ✅ Render items array as responsive grid of ProductCard components
 *   ✅ Responsive grid layout (1 → 2 → 3 → 4 columns)
 *   ✅ Empty state
 *   ❌ Internal data fetching — moved to WLStorefront (PW5-WL2)
 *   ❌ Pagination — out of scope
 *   ❌ Cart / checkout — out of scope
 */

import React from 'react';
import { CatalogItem } from '../../services/catalogService';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  /** Pre-fetched, pre-filtered items from WLStorefront. */
  items: CatalogItem[];
}

export function ProductGrid({ items }: ProductGridProps) {
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
