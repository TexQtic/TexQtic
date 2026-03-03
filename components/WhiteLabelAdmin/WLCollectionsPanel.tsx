/**
 * WLCollectionsPanel — WL_ADMIN Collections panel (WL-COLLECTIONS-PANEL-001)
 *
 * Shell constraint: WL_ADMIN only. This component must never be imported by
 * the EXPERIENCE shell or any non-WL_ADMIN surface.
 *
 * Scope: display-only. No mutations, no backend changes, no schema changes,
 * no RLS changes. Read-only view of catalog items grouped by their `category`
 * field. Items without a category fall into the "Uncategorised" group.
 *
 * Data source: GET /api/tenant/catalog/items via getCatalogItems()
 * (existing catalogService — no new endpoints introduced).
 *
 * Wave 4 · GOVERNANCE-SYNC-066
 */

import { useState, useEffect, useCallback } from 'react';
import { getCatalogItems, CatalogItem } from '../../services/catalogService';

// ─── Grouping logic ──────────────────────────────────────────────────────────

const UNCATEGORISED = 'Uncategorised';

interface CollectionGroup {
  name: string;
  items: CatalogItem[];
}

function groupByCategory(items: CatalogItem[]): CollectionGroup[] {
  const map = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const key = (item.category ?? '').trim() || UNCATEGORISED;
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  // Stable sort: named categories first (alpha), then Uncategorised last
  const entries = [...map.entries()];
  entries.sort(([a], [b]) => {
    if (a === UNCATEGORISED) return 1;
    if (b === UNCATEGORISED) return -1;
    return a.localeCompare(b);
  });
  return entries.map(([name, groupItems]) => ({ name, items: groupItems }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ItemCard({ item }: { item: CatalogItem }) {
  const displayPrice = item.basePrice ?? item.price;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
      <div className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</div>
      {item.sku && (
        <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</div>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-emerald-700 font-bold text-sm">
          ${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}
        </span>
        {item.moq != null && item.moq > 1 && (
          <span className="text-[10px] text-slate-400 font-medium">MOQ: {item.moq}</span>
        )}
      </div>
      {item.active === false && (
        <div className="inline-flex items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
          Inactive
        </div>
      )}
    </div>
  );
}

function CollectionSection({ group }: { group: CollectionGroup }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🗂️</span>
          <h3 className="font-bold text-slate-800 text-base">{group.name}</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {group.items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-in fade-in duration-500">
      <div className="text-5xl mb-6">🗂️</div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">No collections yet</h2>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
        Add products to your catalog and assign them a category — they will
        appear here as collections automatically.
      </p>
      <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-300 border border-slate-200 px-5 py-2 rounded-full">
        No items in catalog
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function WLCollectionsPanel() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalogItems({ limit: 100 });
      setItems(res.items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load catalog items.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const groups = groupByCategory(items);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Collections</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Products grouped by category. Assign a category in your Product Catalog to organise collections.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full">
          Read-only
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 mx-auto" />
          <p className="mt-4 text-slate-500 text-sm">Loading collections…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && <EmptyState />}

      {/* Collections */}
      {!loading && !error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map(group => (
            <CollectionSection key={group.name} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
