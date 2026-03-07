/**
 * Trade Oversight Panel — Control Plane (Read-Only)
 * TECS-FBW-002-A (2026-03-07): first frontend surface for G-017 Trades.
 *
 * Displays a read-only admin view of all trades via GET /api/control/trades.
 *
 * D-017-A: tenantId in the filter input is an admin query parameter only —
 *           NOT a client identity assertion. It is never sent in a request body.
 *
 * STRICT SCOPE: read-only. No transition, mutation, or write controls of any kind.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  listTrades,
  type Trade,
  type TradesQueryParams,
} from '../../services/controlPlaneService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-700 text-slate-300',
  ACTIVE:    'bg-blue-900/50 text-blue-300',
  SETTLED:   'bg-emerald-900/50 text-emerald-300',
  DISPUTED:  'bg-rose-900/50 text-rose-300',
  CANCELLED: 'bg-amber-900/50 text-amber-400',
};

function StatusBadge({ stateKey }: { stateKey: string | undefined }) {
  const cls = STATUS_COLORS[stateKey ?? ''] ?? 'bg-slate-700 text-slate-400';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {stateKey ?? '—'}
    </span>
  );
}

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatAmount(amount: number | string, currency: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return `${currency} —`;
  return `${currency} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const TradeOversight: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // D-017-A: this value maps to ?tenantId= query param only — never to a request body.
  const [filterTenantId, setFilterTenantId] = useState('');

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: TradesQueryParams = { limit: 100, offset: 0 };
      const trimmed = filterTenantId.trim();
      if (trimmed) params.tenantId = trimmed;
      const result = await listTrades(params);
      setTrades(result.trades);
      setCount(result.count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load trades';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterTenantId]);

  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Trade Oversight</h2>
        <p className="text-sm text-slate-400 mt-1">
          Read-only view of all platform trades.{' '}
          {count > 0 && (
            <span className="text-slate-500">({count} total)</span>
          )}
        </p>
      </div>

      {/* Admin filter — query param only, D-017-A compliant */}
      <div className="mb-6 flex items-end gap-3 flex-wrap">
        <div className="flex-1 max-w-xs">
          <label
            htmlFor="trade-filter-tenant"
            className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1"
          >
            Filter by Tenant ID
            <span className="ml-1 text-slate-600 normal-case font-normal">(admin query filter)</span>
          </label>
          <input
            id="trade-filter-tenant"
            type="text"
            value={filterTenantId}
            onChange={e => setFilterTenantId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void loadTrades()}
            placeholder="UUID (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
          />
        </div>
        <button
          onClick={() => void loadTrades()}
          className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded transition"
        >
          Apply
        </button>
        {filterTenantId.trim() && (
          <button
            onClick={() => setFilterTenantId('')}
            className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-slate-400 text-sm py-8 text-center">Loading trades…</div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-rose-900/30 border border-rose-800 rounded p-4 text-rose-300 text-sm">
          Failed to load trades: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && trades.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-slate-600 text-4xl mb-3">↕️</div>
          <p className="text-slate-500 text-sm">
            No trades found
            {filterTenantId.trim() ? ' for the specified tenant' : ''}.
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Trades are created by tenants via the trade creation flow.
          </p>
        </div>
      )}

      {/* Read-only trade table */}
      {!loading && !error && trades.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Trade ID
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Tenant ID
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Reference
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Gross Amount
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-800/50 ${
                    idx % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                  }`}
                >
                  <td
                    className="px-4 py-3 font-mono text-xs text-slate-400"
                    title={t.id}
                  >
                    {truncateId(t.id)}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-slate-400"
                    title={t.tenantId}
                  >
                    {truncateId(t.tenantId)}
                  </td>
                  <td
                    className="px-4 py-3 text-slate-300 max-w-[220px] truncate"
                    title={t.tradeReference}
                  >
                    {t.tradeReference}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge stateKey={t.lifecycleState?.stateKey} />
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">
                    {formatAmount(t.grossAmount, t.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(t.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
