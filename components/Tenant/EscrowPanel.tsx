/**
 * EscrowPanel — Tenant Plane, Read-Only (TECS-FBW-003-A)
 *
 * Surfaces GET /api/tenant/escrows — the tenant's own escrow account list.
 *
 * Constitutional compliance:
 *   D-017-A  No tenantId sent by client — tenantGet() TENANT realm guard is sufficient.
 *            Server derives tenant scope exclusively from JWT claims (orgId).
 *   D-020-B  No balance displayed. Balance is NOT present in the list response and
 *            must not be synthesized by calling the detail endpoint per-row.
 *
 * Scope (TECS-FBW-003-A):
 *   ✅ Read-only list panel
 *   ❌ Create escrow — out of scope (TECS-FBW-003-B)
 *   ❌ Record transaction — out of scope (TECS-FBW-003-B)
 *   ❌ Lifecycle transition — out of scope (TECS-FBW-003-B)
 *   ❌ Escrow detail drill-down — out of scope (TECS-FBW-003-B)
 *   ❌ Balance column — forbidden (D-020-B)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listEscrows, EscrowAccount, EscrowListParams } from '../../services/escrowService';

interface Props {
  onBack: () => void;
}

// ─── State Key → Badge color map ─────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  ACTIVE:    'bg-blue-100 text-blue-700',
  SETTLED:   'bg-emerald-100 text-emerald-700',
  CLOSED:    'bg-slate-200 text-slate-500',
  DISPUTED:  'bg-rose-100 text-rose-700',
};

function StateBadge({ stateKey }: { stateKey: string | null }) {
  const label = stateKey ?? '—';
  const classes = stateKey ? (STATE_COLORS[stateKey] ?? 'bg-amber-100 text-amber-700') : 'bg-slate-100 text-slate-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {label}
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

// ─── EscrowPanel ─────────────────────────────────────────────────────────────

export function EscrowPanel({ onBack }: Props) {
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEscrows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: EscrowListParams = { limit: 50, offset: 0 };
      const res = await listEscrows(params);
      setEscrows(res.escrows);
      setCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrow accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEscrows(); }, [loadEscrows]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-700 transition text-sm font-medium"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Escrow Accounts</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only view of your tenant escrow accounts. No balance shown (D-020-B).
            </p>
          </div>
        </div>
        {!loading && !error && (
          <span className="text-xs text-slate-400 font-mono">{count} account{count !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-3xl mb-3">⏳</div>
          <p className="text-sm">Loading escrow accounts…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
          <strong>Error loading escrow accounts:</strong> {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && escrows.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm font-medium">No escrow accounts found.</p>
          <p className="text-xs mt-1">Escrow accounts created for your organisation will appear here.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && escrows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                    Escrow ID
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                    Currency
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                    State
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escrows.map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs text-slate-700 cursor-default"
                        title={esc.id}
                      >
                        {truncateId(esc.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700 uppercase text-xs">
                        {esc.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StateBadge stateKey={esc.lifecycleStateKey} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDate(esc.createdAt)}
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
