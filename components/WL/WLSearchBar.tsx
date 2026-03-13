/**
 * WLSearchBar — WL Storefront Product Search Input (PW5-WL4)
 *
 * Pure presentational controlled input component.
 *
 * Constitutional compliance:
 *   NO data fetching in this component.
 *   Search runs against the already-fetched catalog state owned by WLStorefront.
 *   No API call is initiated here — neither on keystroke, submit, nor mount.
 *   tenantId is NEVER passed from the client.
 *
 * Scope (PW5-WL4):
 *   ✅ Controlled search input bound to WLStorefront state
 *   ✅ Clear affordance when query is non-empty
 *   ✅ Accessible label (sr-only) and placeholder text
 *   ❌ Autocomplete / remote search — architectural guardrail; not implemented
 *   ❌ Debounced network fetch — architectural guardrail; not implemented
 *   ❌ Search analytics — out of scope for PW5-WL4
 */

import React, { memo } from 'react';

interface WLSearchBarProps {
  /** Current search query value — controlled by WLStorefront. */
  value: string;
  /** Handler to update search query in WLStorefront state. */
  onChange: (value: string) => void;
  placeholder?: string;
}

// PW5-WL7: React.memo prevents re-render when WLStorefront re-renders for state
// unrelated to search (e.g. activeCategory, selectedItemId changes).
// onChange is setSearchQuery from useState — stable across renders.
export const WLSearchBar = memo(function WLSearchBar({
  value,
  onChange,
  placeholder = 'Search products…',
}: WLSearchBarProps) {
  return (
    <div className="relative mb-5">
      <label htmlFor="wl-product-search" className="sr-only">
        Search products
      </label>

      {/* Search icon */}
      <span
        className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      <input
        id="wl-product-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
      />

      {/* Clear button — only visible when query is non-empty */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});
