/**
 * WLCollectionsPanel — WL Storefront Category Navigation (PW5-WL2)
 *
 * Pure presentational component. Renders category navigation for the
 * WL storefront product grid.
 *
 * Constitutional compliance:
 *   NO data fetching in this component.
 *   All catalog data is owned by WLStorefront and passed as props.
 *   This prevents duplicate API calls and UI flicker.
 *
 * Props contract:
 *   categories   — derived from items already fetched by WLStorefront
 *   activeCategory — null = all products shown; string = filtered category
 *   onSelectCategory — callback to WLStorefront state
 *
 * Category fallback (CAT-SCHEMA-003 / PW5-WL2):
 *   Items with no category value resolve to "Uncategorised".
 *   This is the expected behaviour until the catalog schema is extended
 *   with a category column. All products will group under "Uncategorised"
 *   by default.
 *
 * Scope (PW5-WL2):
 *   ✅ Category navigation buttons
 *   ✅ Item counts per category
 *   ✅ "All products" reset button
 *   ❌ Cart / checkout — out of scope
 *   ❌ Search — out of scope
 */

import React from 'react';

export interface CategoryCount {
  name: string;
  count: number;
}

interface WLCollectionsPanelProps {
  categories: CategoryCount[];
  activeCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export function WLCollectionsPanel({
  categories,
  activeCategory,
  onSelectCategory,
}: WLCollectionsPanelProps) {
  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="Product categories"
      className="mb-7"
    >
      <div className="flex flex-wrap gap-2">
        {/* All products reset button */}
        <button
          onClick={() => onSelectCategory(null)}
          aria-pressed={activeCategory === null}
          className={[
            'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
            activeCategory === null
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ].join(' ')}
        >
          All
        </button>

        {/* One button per category */}
        {categories.map(({ name, count }) => (
          <button
            key={name}
            onClick={() => onSelectCategory(name)}
            aria-pressed={activeCategory === name}
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
              activeCategory === name
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {name}
            <span
              className={[
                'text-[10px] font-bold px-1.5 py-0 rounded-full',
                activeCategory === name
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-500',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
