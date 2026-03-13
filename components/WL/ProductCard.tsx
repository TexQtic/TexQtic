/**
 * ProductCard — WL Storefront (PW5-WL1 / PW5-WL3 / PW5-WL6 / PW5-WL7)
 *
 * Renders a single tenant catalog item in the white-label storefront grid.
 *
 * Constitutional compliance:
 *   tenantId is NEVER accepted or rendered from the client.
 *   Tenant scope is derived exclusively from the JWT on the server.
 *   NO data fetching in this component — WLStorefront is the exclusive
 *   catalog data owner.
 *
 * Scope (PW5-WL1 / PW5-WL3 / PW5-WL6 / PW5-WL7):
 *   ✅ Display: name, SKU, price, MOQ, active status
 *   ✅ onSelect callback — triggers detail view in WLStorefront (PW5-WL3)
 *              Accepts item id; ProductGrid passes the stable WLStorefront
 *              handler directly without per-render wrapper (PW5-WL7).
 *   ✅ imageUrl  — rendered from existing CatalogItem field (PW5-WL6)
 *              Graceful placeholder shown when field is absent or broken.
 *              No additional fetch; field travels via existing catalog state.
 *   ✅ React.memo — prevents re-render when parent re-renders but props are
 *              unchanged (PW5-WL7). Effective because ProductGrid now passes
 *              the stable handleSelectItem reference directly.
 *   ❌ category  — missing in current schema; safely omitted from grid card
 *   ❌ currency  — missing in current schema; safely omitted
 *   ❌ cart / checkout — out of scope (PW5-WL3+)
 */

import React, { memo, useState } from 'react';
import { CatalogItem } from '../../services/catalogService';

interface ProductCardProps {
  item: CatalogItem;
  /**
   * PW5-WL3: callback to open product detail view (owned by WLStorefront).
   * PW5-WL7: accepts item id so ProductGrid can pass the stable
   * handleSelectItem reference without creating a per-render wrapper.
   */
  onSelect?: (id: string) => void;
}

// PW5-WL7: Module-level singleton avoids reconstructing Intl.NumberFormat
// on every render. Locale is system-default (undefined) — same as before.
const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

// PW5-WL7: React.memo prevents re-render when ProductGrid re-renders but
// this card's props (item reference + onSelect reference) are unchanged.
// Effective because ProductGrid passes the stable handleSelectItem directly.
export const ProductCard = memo(function ProductCard({ item, onSelect }: ProductCardProps) {
  // PW5-WL6: track broken image without additional fetching.
  // imgError set true only if <img> fires onError (network/404/etc).
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className={`bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect ? () => onSelect(item.id) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(item.id); } : undefined}
      aria-label={onSelect ? `View details for ${item.name}` : undefined}
    >
      {/* PW5-WL6: Product image — sourced from existing CatalogItem.imageUrl field.
           No additional fetch. WLStorefront remains sole catalog data owner.
           Placeholder shown when imageUrl is absent or the image fails to load. */}
      <div className="w-full h-40 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center text-slate-300 -mx-0 mb-1">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      {/* Active / Inactive badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-slate-900 font-semibold text-sm leading-snug flex-1 line-clamp-2">
          {item.name}
        </h3>
        <span
          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
            item.active
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {item.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* SKU */}
      <p className="text-[11px] font-mono text-slate-400 truncate">
        SKU: {item.sku}
      </p>

      {/* Description (optional) */}
      {item.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
        {/* Price */}
        <span className="text-slate-900 font-bold text-base tabular-nums">
          {formatPrice(item.price)}
        </span>

        {/* MOQ badge */}
        {item.moq != null && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold uppercase tracking-wide">
            MOQ&nbsp;{item.moq}
          </span>
        )}
      </div>
    </article>
  );
});
