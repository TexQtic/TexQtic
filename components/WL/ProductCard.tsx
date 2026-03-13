/**
 * ProductCard — WL Storefront (PW5-WL1 / PW5-WL3)
 *
 * Renders a single tenant catalog item in the white-label storefront grid.
 *
 * Constitutional compliance:
 *   tenantId is NEVER accepted or rendered from the client.
 *   Tenant scope is derived exclusively from the JWT on the server.
 *   NO data fetching in this component — WLStorefront is the exclusive
 *   catalog data owner.
 *
 * Scope (PW5-WL1 / PW5-WL3):
 *   ✅ Display: name, SKU, price, MOQ, active status
 *   ✅ onSelect callback — triggers detail view in WLStorefront (PW5-WL3)
 *   ❌ category  — missing in current schema; safely omitted from grid card
 *   ❌ currency  — missing in current schema; safely omitted
 *   ❌ imageUrl  — optional; safely omitted
 *   ❌ cart / checkout — out of scope (PW5-WL3+)
 */

import React from 'react';
import { CatalogItem } from '../../services/catalogService';

interface ProductCardProps {
  item: CatalogItem;
  /** PW5-WL3: callback to open product detail view (owned by WLStorefront). */
  onSelect?: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function ProductCard({ item, onSelect }: ProductCardProps) {
  return (
    <article
      className={`bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); } : undefined}
      aria-label={onSelect ? `View details for ${item.name}` : undefined}
    >
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
}
