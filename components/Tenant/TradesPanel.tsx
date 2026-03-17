/**
 * TradesPanel — Tenant Plane, Read-Only (TECS-FBW-002-B)
 *
 * Surfaces GET /api/tenant/trades — the authenticated tenant's own trades.
 *
 * Constitutional compliance:
 *   D-017-A  No orgId / tenantId sent by client — tenantGet() TENANT realm guard is sufficient.
 *            Server derives tenant scope exclusively from JWT claims (orgId).
 *   D-020-B  No balance or financial totals displayed (read-only trade list surface only).
 *
 * Scope (TECS-FBW-002-B):
 *   ✅ Read-only trade list
 *   ❌ Create trade — out of scope
 *   ❌ Lifecycle transitions — out of scope (control-plane only)
 *   ❌ Trade detail drill-down — out of scope
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listTenantTrades, type TenantTrade } from '../../services/tradeService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  onBack: () => void;
}

// ─── Lifecycle State → Badge color map ───────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  ACTIVE:    'bg-blue-100 text-blue-700',
  SETTLED:   'bg-emerald-100 text-emerald-700',
  DISPUTED:  'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-amber-100 text-amber-700',
};

function StatusBadge({ stateKey }: { stateKey: string }) {
  const classes = STATUS_COLORS[stateKey] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {stateKey}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── TradesPanel ─────────────────────────────────────────────────────────────

export function TradesPanel({ onBack }: Props) {
  const [trades, setTrades]   = useState<TenantTrade[]>([]);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTenantTrades({ limit: 50 });
      setTrades(res.trades);
      setCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
          type="button"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trades</h1>
          <p className="text-sm text-slate-500 mt-0.5">G-017 trade records for your organisation (read-only)</p>
        </div>
      </div>

      {/* States */}
      {loading && <LoadingState />}
      {error && !loading && (
        <ErrorState error={{ message: error }} onRetry={loadTrades} />
      )}
      {!loading && !error && trades.length === 0 && (
        <EmptyState title="No trades found" message="No trade records found for your organisation." />
      )}

      {/* Table */}
      {!loading && !error && trades.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {count} trade{count !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Trade ID</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600" title={trade.id}>
                      {truncateId(trade.id)}
                    </td>
                    <td className="px-6 py-4">
                      {trade.lifecycleState ? (
                        <StatusBadge stateKey={trade.lifecycleState.stateKey} />
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(trade.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
