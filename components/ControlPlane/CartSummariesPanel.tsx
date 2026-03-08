/**
 * CartSummariesPanel — Control Plane, Read-Only (TECS-FBW-007)
 *
 * Surfaces the marketplace_cart_summaries projection for super-admin inspection.
 *   GET /api/control/marketplace/cart-summaries  — cursor-paginated list
 *   GET /api/control/marketplace/cart-summaries/:cart_id — single-record detail
 *
 * Constitutional compliance:
 *   Search-on-demand: no auto-fetch on mount; tenant_id is required before any request.
 *   Cursor pagination: uses next_cursor from CartSummariesResponse.
 *   Read-only: no mutation controls on any plane.
 *   Service layer: consumes existing controlPlaneService.ts functions unchanged.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  getCartSummaries,
  getCartSummaryByCartId,
  type MarketplaceCartSummary,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── SummaryRow ───────────────────────────────────────────────────────────────

const SummaryRow: React.FC<{
  summary: MarketplaceCartSummary;
  selected: boolean;
  onSelect: () => void;
}> = ({ summary, selected, onSelect }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onSelect();
    }}
    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
      selected
        ? 'border-indigo-500 bg-indigo-950/40'
        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-slate-200 font-mono truncate">Cart: {summary.cartId}</p>
        <p className="text-[10px] text-slate-500 font-mono">User: {summary.userId}</p>
        <p className="text-[10px] text-slate-500 font-mono">Tenant: {summary.tenantId}</p>
      </div>
      <div className="text-right flex-shrink-0 space-y-1">
        <p className="text-xs font-semibold text-slate-300">{summary.itemCount} items</p>
        <p className="text-[10px] text-slate-500">Qty: {summary.totalQuantity}</p>
        <p className="text-[10px] text-slate-500">v{summary.version}</p>
      </div>
    </div>
    <p className="text-[10px] text-slate-500 mt-2">Updated: {fmtDate(summary.lastUpdatedAt)}</p>
  </div>
);

// ─── DetailPanel ──────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{
  cartId: string;
  onClose: () => void;
}> = ({ cartId, onClose }) => {
  const [detail, setDetail] = useState<MarketplaceCartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCartSummaryByCartId(cartId);
      setDetail(res.summary);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [cartId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-900/60 p-6 space-y-4">
      {/* Detail header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200">Cart Detail</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {loading && <LoadingState message="Loading cart detail…" />}
      {error && (
        <ErrorState
          error={{ message: error }}
          onRetry={load}
        />
      )}

      {!loading && !error && detail && (
        <div className="space-y-3 text-sm">
          <Row label="Cart ID" value={detail.cartId} mono />
          <Row label="Summary ID" value={detail.id} mono />
          <Row label="Tenant ID" value={detail.tenantId} mono />
          <Row label="User ID" value={detail.userId} mono />
          <Row label="Item Count" value={String(detail.itemCount)} />
          <Row label="Total Quantity" value={String(detail.totalQuantity)} />
          <Row label="Version" value={String(detail.version)} />
          <Row label="Last Event ID" value={detail.lastEventId} mono />
          <Row label="Last Updated" value={fmtDate(detail.lastUpdatedAt)} />
          <Row label="Created At" value={fmtDate(detail.createdAt)} />
          <Row label="Updated At" value={fmtDate(detail.updatedAt)} />
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="flex gap-3">
    <span className="w-36 flex-shrink-0 text-slate-500 text-[11px] font-semibold uppercase tracking-wide leading-5">
      {label}
    </span>
    <span
      className={`text-slate-200 leading-5 break-all ${mono ? 'font-mono text-xs' : 'text-sm'}`}
    >
      {value}
    </span>
  </div>
);

// ─── ListView ─────────────────────────────────────────────────────────────────

const ListView: React.FC = () => {
  const [tenantId, setTenantId] = useState('');
  const [updatedAfter, setUpdatedAfter] = useState('');
  const [summaries, setSummaries] = useState<MarketplaceCartSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  // Initial search — resets list
  const handleSearch = useCallback(() => {
    const tid = tenantId.trim();
    if (!tid) return; // guard: tenant_id required

    setLoading(true);
    setError(null);
    setHasLoaded(false);
    setSummaries([]);
    setNextCursor(undefined);
    setHasMore(false);
    setSelectedCartId(null);

    getCartSummaries({ tenant_id: tid, limit: PAGE_SIZE, updated_after: updatedAfter.trim() || undefined })
      .then((res) => {
        setSummaries(res.items);
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
        setHasLoaded(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(friendlyError(err));
        setLoading(false);
      });
  }, [tenantId, updatedAfter]);

  // Append next page
  const handleLoadMore = useCallback(() => {
    const tid = tenantId.trim();
    if (!tid || !nextCursor) return;

    setLoadingMore(true);
    setError(null);

    getCartSummaries({
      tenant_id: tid,
      limit: PAGE_SIZE,
      cursor: nextCursor,
      updated_after: updatedAfter.trim() || undefined,
    })
      .then((res) => {
        setSummaries((prev) => [...prev, ...res.items]);
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
        setLoadingMore(false);
      })
      .catch((err: unknown) => {
        setError(friendlyError(err));
        setLoadingMore(false);
      });
  }, [tenantId, nextCursor, updatedAfter]);

  const tenantIdTrimmed = tenantId.trim();
  const canSearch = tenantIdTrimmed.length > 0;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="cs-tenant-id" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Tenant ID (required)
          </label>
          <input
            id="cs-tenant-id"
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSearch) handleSearch(); }}
            placeholder="UUID…"
            className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72 placeholder:text-slate-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cs-updated-after" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Updated After (optional)
          </label>
          <input
            id="cs-updated-after"
            type="datetime-local"
            value={updatedAfter}
            onChange={(e) => setUpdatedAfter(e.target.value)}
            className="border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!canSearch || loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </div>

      {!canSearch && !hasLoaded && (
        <p className="text-sm text-slate-500 italic">Enter a Tenant ID and press Search to inspect cart summaries.</p>
      )}

      {loading && <LoadingState message="Loading cart summaries…" />}
      {error && <ErrorState error={{ message: error }} onRetry={canSearch ? handleSearch : undefined} />}

      {!loading && !error && hasLoaded && summaries.length === 0 && (
        <EmptyState
          title="No cart summaries found"
          message="No marketplace cart summaries exist for this tenant and filter combination."
        />
      )}

      {!loading && !error && summaries.length > 0 && (
        <>
          <div className="space-y-2">
            {summaries.map((s) => (
              <SummaryRow
                key={s.id}
                summary={s}
                selected={selectedCartId === s.cartId}
                onSelect={() =>
                  setSelectedCartId((prev) => (prev === s.cartId ? null : s.cartId))
                }
              />
            ))}
          </div>

          {selectedCartId && (
            <DetailPanel
              cartId={selectedCartId}
              onClose={() => setSelectedCartId(null)}
            />
          )}

          {hasMore && (
            <div className="pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-2 border border-slate-700 text-slate-400 rounded-lg text-sm hover:border-slate-500 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── CartSummariesPanel (root) ────────────────────────────────────────────────

/**
 * TECS-FBW-007: Expose marketplace_cart_summaries projection as admin panel.
 * Control-plane only. Read-only. No mutation controls.
 */
export const CartSummariesPanel: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-100">🛒 Cart Summaries</h2>
        <p className="text-sm text-slate-400 mt-1">
          Marketplace cart projection — cross-tenant admin inspection. No mutation controls.
        </p>
      </div>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-700 text-slate-300 border border-slate-600">
        READ-ONLY
      </span>
    </div>

    {/* List view */}
    <ListView />
  </div>
);
