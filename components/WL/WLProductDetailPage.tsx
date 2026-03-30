/**
 * WLProductDetailPage — WL Storefront Product Detail View (PW5-WL3 / PW5-WL5)
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
 * Scope (PW5-WL3 / PW5-WL5 / PW5-WL6):
 *   ✅ Product name, SKU, category (fallback: Uncategorised)
 *   ✅ Description (if present in existing item shape)
 *   ✅ Price, MOQ, active status
 *   ✅ Add to Cart — live via onAddToCart prop (PW5-WL5)
 *   ✅ Quantity selector respecting MOQ if present (PW5-WL5)
 *   ✅ Brief success/error feedback on add (PW5-WL5)
 *   ✅ Back navigation to storefront grid/category context
 *   ✅ imageUrl rendering — primary image from existing CatalogItem field (PW5-WL6)
 *              Graceful placeholder shown when field absent or image fails to load.
 *              No additional fetch; travels via item prop from WLStorefront state.
 *   ❌ Checkout — delegated to existing Cart drawer (CartProvider/EXPERIENCE)
 *   ❌ Full gallery — out of scope; single primary image only
 */

import React, { useState, useCallback } from 'react';
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
  /** Opens the existing App-level RFQ orchestration for this product. */
  onRequestQuote?: () => void;
  /**
   * PW5-WL5: Live add-to-cart handler provided by WLStorefront via CartContext.
   * When absent the button is suppressed (backwards-compatible).
   * tenantId is NEVER a parameter — backend derives scope from JWT.
   */
  onAddToCart?: (catalogItemId: string, quantity: number) => Promise<void>;
}

export function WLProductDetailPage({ item, onBack, onRequestQuote, onAddToCart }: Readonly<WLProductDetailPageProps>) {
  const category = resolveCategory(item);
  const inactiveItemTitle = item.active ? undefined : 'This product is not currently available';

  // PW5-WL5: quantity state. Defaults to MOQ (min order qty) if present, else 1.
  const minQty = item.moq != null && item.moq > 1 ? item.moq : 1;
  const [quantity, setQuantity] = useState(minQty);
  const [adding, setAdding] = useState(false);
  // PW5-WL6: track broken image without additional fetching.
  const [imgError, setImgError] = useState(false);
  // Brief success banner: auto-clears after 2 s
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddToCart = useCallback(async () => {
    if (!onAddToCart || adding) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      await onAddToCart(item.id, quantity);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add to cart.';
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  }, [onAddToCart, adding, item.id, quantity]);

  // PW5-WL5: Derive button label without nested ternary (satisfies no-nested-ternary rule)
  let addButtonLabel = 'Add to Cart';
  if (adding) addButtonLabel = 'Adding…';
  else if (addSuccess) addButtonLabel = '✓ Added!';

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
        {/* PW5-WL6: Primary product image — sourced from existing CatalogItem.imageUrl field.
             No additional fetch. Item prop is derived from WLStorefront's catalog state.
             Placeholder shown when imageUrl is absent or the image fails to load. */}
        <div className="w-full h-64 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center text-slate-300">
          {item.imageUrl && !imgError ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="eager"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={0.75}
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

          {/* PW5-WL5: Live Add to Cart — handler provided by WLStorefront via CartContext */}
          {onAddToCart || onRequestQuote ? (
            <div className="flex flex-col items-end gap-2">
              {onAddToCart && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(minQty, q - 1))}
                    disabled={adding || quantity <= minQty}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors text-slate-700"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-slate-800 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    disabled={adding}
                    className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors text-slate-700"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {onRequestQuote && (
                  <button
                    type="button"
                    onClick={onRequestQuote}
                    disabled={!item.active || adding}
                    title={inactiveItemTitle}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Request Quote
                  </button>
                )}
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => void handleAddToCart()}
                    disabled={adding || !item.active}
                    title={inactiveItemTitle}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {addButtonLabel}
                  </button>
                )}
              </div>
              {onAddToCart && addError && (
                <p className="text-xs text-rose-600">{addError}</p>
              )}
            </div>
          ) : (
            /* Backward-compatible: if no handler supplied, show disabled placeholder */
            <button
              type="button"
              disabled
              title="Cart not available"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold opacity-40 cursor-not-allowed"
              aria-disabled="true"
            >
              Add to Cart
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
