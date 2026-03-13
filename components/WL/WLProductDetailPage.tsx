/**
 * WLProductDetailPage — WL Storefront Product Detail View (PW5-WL3)
 *
 * Presentational component. Receives an already-fetched CatalogItem
 * from WLStorefront and renders a richer product detail surface.
 *
 * Constitutional compliance:
 *   NO data fetching in this component.
 *   WLStorefront is the exclusive owner of catalog data.
 *   tenantId is NEVER used or referenced from the client.
 *   Item is derived from WLStorefront's already-held catalog state.
 *
 * Scope (PW5-WL3):
 *   ✅ Product name, SKU, category (fallback: Uncategorised)
 *   ✅ Description (if present in existing item shape)
 *   ✅ Price, MOQ, active status
 *   ✅ Cart foundation button stub (non-destructive; not wired to cart API)
 *   ✅ Back navigation to storefront grid/category context
 *   ❌ imageUrl rendering — not required (field absent in current schema)
 *   ❌ Real cart mutations — out of scope for PW5-WL3
 *   ❌ Checkout — out of scope
 */

import React from 'react';
import { CatalogItem } from '../../services/catalogService';

const UNCATEGORISED = 'Uncategorised';

function resolveCategory(item: CatalogItem): string {
  return (item.category ?? '').trim() || UNCATEGORISED;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

interface WLProductDetailPageProps {
  /** Item derived from WLStorefront catalog state — no fetch occurs here. */
  item: CatalogItem;
  /** Returns the shopper to the storefront grid/category context. */
  onBack: () => void;
}

export function WLProductDetailPage({ item, onBack }: WLProductDetailPageProps) {
  const category = resolveCategory(item);

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
        aria-label="Back to products"
      >
        ← Products
      </button>

      {/* Detail card */}
      <article className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col gap-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-900 leading-snug">
            {item.name}
          </h1>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
              item.active
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {item.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-6 text-xs text-slate-500">
          {/* SKU */}
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400">
              SKU
            </span>
            <span className="font-mono text-slate-700">{item.sku}</span>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400">
              Category
            </span>
            <span className="text-slate-700">{category}</span>
          </div>

          {/* MOQ */}
          {item.moq != null && (
            <div className="flex flex-col gap-0.5">
              <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400">
                Min. Order
              </span>
              <span className="text-slate-700">{item.moq} units</span>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description ? (
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Description
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No description available for this product.
          </p>
        )}

        {/* Price + actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
              Price
            </span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatPrice(item.price)}
            </span>
          </div>

          {/* Cart foundation — stub button (PW5-WL3 non-destructive placeholder) */}
          <button
            type="button"
            disabled
            title="Cart coming soon"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold opacity-40 cursor-not-allowed"
            aria-disabled="true"
          >
            Add to Cart
          </button>
        </div>
      </article>
    </div>
  );
}
