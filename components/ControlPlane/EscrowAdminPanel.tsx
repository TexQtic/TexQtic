/**
 * EscrowAdminPanel — Control Plane, Read-Only (PW5-W2)
 *
 * Surfaces GET /api/control/escrows — cross-tenant escrow account list
 * for super-admin inspection.
 *
 * Constitutional compliance:
 *   D-017-A  tenantId is an optional query-param FILTER only — admin provides it
 *            to narrow results. It is NOT a client identity assertion.
 *            The server uses admin sentinel + is_admin='true' RLS override.
 *   D-020-B  Balance is NOT derived from this panel. The list response contains
 *            no balance field — balance is derived from ledger SUM by the server.
 *   Read-only scope: No transition, create, or patch controls.
 *
 * PW5-W2 scope (2026-03-10):
 *   ✅ Cross-tenant escrow list (GET /api/control/escrows)
 *   ✅ Optional tenantId filter (narrows to one tenant)
 *   ✅ Pagination (limit/offset)
 *   ❌ Balance — out of scope (D-020-B)
 *   ❌ Transitions — out of scope (read-only tranche)
 */

import React, { useState, useCallback } from 'react';
import {
  adminGetEscrowDetail,
  adminListEscrows,
  type AdminEscrowAccount,
  type AdminEscrowDetailResponse,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { EmptyState } from '../shared/EmptyState';

interface EscrowAdminScopeBridge {
  financeRecordId: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
}

// ─── State key badge colours ──────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  DRAFT:            'bg-slate-700 text-slate-300',
  ACTIVE:           'bg-emerald-900/50 text-emerald-300',
  SETTLED:          'bg-sky-900/50 text-sky-300',
  CLOSED:           'bg-slate-700 text-slate-400',
  DISPUTED:         'bg-rose-900/60 text-rose-200',
  PENDING_APPROVAL: 'bg-violet-900/50 text-violet-300',
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  HOLD:       'bg-amber-900/40 text-amber-300',
  RELEASE:    'bg-sky-900/40 text-sky-300',
  REFUND:     'bg-emerald-900/40 text-emerald-300',
  ADJUSTMENT: 'bg-violet-900/40 text-violet-300',
};

function StateBadge({ stateKey }: Readonly<{ stateKey: string | null }>) {
  if (!stateKey) {
    return <span className="text-slate-500 text-xs">—</span>;
  }
  const cls = STATE_COLORS[stateKey] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {stateKey}
    </span>
  );
}

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatAmount(amount: number | string, currency: string): string {
  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value)) {
    return `${amount} ${currency}`;
  }
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency}`;
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

// ─── EscrowAdminPanel ────────────────────────────────────────────────────────

interface EscrowAdminPanelProps {
  initialScope?: EscrowAdminScopeBridge | null;
  onScopeConsumed?: () => void;
}

export const EscrowAdminPanel: React.FC<EscrowAdminPanelProps> = ({
  initialScope = null,
  onScopeConsumed,
}) => {
  const [tenantIdInput, setTenantIdInput] = useState('');
  const [escrows, setEscrows]             = useState<AdminEscrowAccount[]>([]);
  const [count, setCount]                 = useState(0);
  const [fetchState, setFetchState]       = useState<FetchState>('IDLE');
  const [error, setError]                 = useState<string | null>(null);
  const [bridgeScope, setBridgeScope]     = useState<EscrowAdminScopeBridge | null>(null);
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);
  const [detail, setDetail]                     = useState<AdminEscrowDetailResponse | null>(null);
  const [detailFetchState, setDetailFetchState] = useState<FetchState>('IDLE');
  const [detailError, setDetailError]           = useState<string | null>(null);

  const resetDetail = useCallback(() => {
    setSelectedEscrowId(null);
    setDetail(null);
    setDetailFetchState('IDLE');
    setDetailError(null);
  }, []);

  const handleFetch = useCallback(async (tenantOverride?: string, scopeOverride?: EscrowAdminScopeBridge | null) => {
    const targetTenantId = tenantOverride ?? tenantIdInput.trim();
    setFetchState('LOADING');
    setError(null);
    resetDetail();
    try {
      const res = await adminListEscrows({
        tenantId: targetTenantId || undefined,
        limit:    100,
        offset:   0,
      });
      setEscrows(res.escrows);
      setCount(res.count);
      setBridgeScope(scopeOverride ?? null);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrow accounts.');
      setFetchState('ERROR');
    }
  }, [resetDetail, tenantIdInput]);

  const handleOpenDetail = useCallback(async (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    setDetail(null);
    setDetailError(null);
    setDetailFetchState('LOADING');
    try {
      const response = await adminGetEscrowDetail(escrowId);
      setDetail(response);
      setDetailFetchState('DONE');
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load escrow detail.');
      setDetailFetchState('ERROR');
    }
  }, []);

  const handleClearScope = useCallback(() => {
    setBridgeScope(null);
    resetDetail();
  }, [resetDetail]);

  React.useEffect(() => {
    if (!initialScope) {
      return;
    }

    setTenantIdInput(initialScope.tenantId);
    void handleFetch(initialScope.tenantId, initialScope);
    onScopeConsumed?.();
  }, [handleFetch, initialScope, onScopeConsumed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch();
  };

  const visibleEscrows = bridgeScope
    ? escrows.filter(escrow => escrow.id === bridgeScope.escrowId)
    : escrows;

  const accountSuffix = count === 1 ? '' : 's';
  let resultSummary = `Showing ${visibleEscrows.length} of ${count} account${accountSuffix}.`;
  if (count === 0) {
    resultSummary = 'No escrow accounts found.';
  }
  if (bridgeScope) {
    if (visibleEscrows.length === 0) {
      resultSummary = 'Scoped escrow was not found in the current tenant result set.';
    } else {
      resultSummary = `Showing scoped escrow 1 of ${count} account${accountSuffix}.`;
    }
  }

  const financeContextBanner = bridgeScope ? (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">Scoped from finance record {bridgeScope.financeRecordId.slice(0, 8)}...</p>
          <p className="text-xs text-sky-200/80">
            Tenant <span className="font-mono">{bridgeScope.tenantId}</span> · Escrow <span className="font-mono">{bridgeScope.escrowId}</span>
          </p>
          {bridgeScope.referenceId && (
            <p className="text-xs text-sky-200/80">
              Reference <span className="font-mono">{bridgeScope.referenceId}</span>
            </p>
          )}
        </div>
        <button
          onClick={handleClearScope}
          className="rounded-lg border border-sky-400/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100 transition-colors hover:bg-sky-500/10"
        >
          Show All Tenant Escrows
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Escrow Accounts</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Cross-tenant read-only view — G-018
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
          PW5-W2 · Read-Only
        </span>
      </div>

      {/* D-020-B notice */}
      <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 px-4 py-2.5 text-amber-400 text-xs leading-relaxed">
        <strong>D-020-B:</strong> Balance is not displayed. Escrow balance is derived from the
        transaction ledger by the server and is only available on the detail endpoint.
      </div>

      {financeContextBanner}

      {selectedEscrowId ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={resetDetail}
              className="text-sm font-semibold text-sky-300 transition hover:text-sky-200"
            >
              ← Back to escrow list
            </button>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Escrow Detail</h3>
              <p className="text-xs font-mono text-slate-500">{selectedEscrowId}</p>
            </div>
          </div>

          {detailFetchState === 'LOADING' && <LoadingState message="Loading escrow detail…" />}

          {detailFetchState === 'ERROR' && detailError && (
            <div className="rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-rose-400 text-sm">
              {detailError}
              <button
                onClick={() => {
                  void handleOpenDetail(selectedEscrowId);
                }}
                className="ml-3 underline text-rose-300 hover:text-rose-200 text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {detailFetchState === 'DONE' && detail && (
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Escrow ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-300" title={detail.escrow.id}>{detail.escrow.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tenant ID</p>
                    <p className="mt-1 font-mono text-xs text-slate-300" title={detail.escrow.tenantId}>{detail.escrow.tenantId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Currency</p>
                    <p className="mt-1 text-sm font-bold uppercase text-slate-100">{detail.escrow.currency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">State</p>
                    <div className="mt-1">
                      <StateBadge stateKey={detail.escrow.lifecycleStateKey} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Derived Balance</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">{formatAmount(detail.balance, detail.escrow.currency)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 border-t border-slate-800 pt-4 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Created</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(detail.escrow.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Updated</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(detail.escrow.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Created By</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{detail.escrow.createdByUserId ?? '—'}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
                <div className="border-b border-slate-800 px-4 py-3">
                  <h4 className="text-sm font-bold text-slate-100">Recent Transactions</h4>
                  <p className="text-xs text-slate-500">Server-returned ledger entries for the selected escrow.</p>
                </div>
                {detail.recentTransactions.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">No ledger transactions recorded yet.</div>
                ) : (
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Direction</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Recorded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {detail.recentTransactions.map(transaction => (
                        <tr key={transaction.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ENTRY_TYPE_COLORS[transaction.entryType] ?? 'bg-slate-700 text-slate-300'}`}>
                              {transaction.entryType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-300">{transaction.direction}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">{formatAmount(transaction.amount, transaction.currency)}</td>
                          <td className="px-4 py-3 text-xs uppercase text-slate-400">{transaction.currency}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{transaction.referenceId ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(transaction.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="escrow-tenant-filter"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
              >
                Tenant ID (optional filter)
              </label>
              <input
                id="escrow-tenant-filter"
                type="text"
                placeholder="UUID — leave blank for all tenants"
                value={tenantIdInput}
                onChange={e => setTenantIdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-80 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <button
              onClick={() => {
                void handleFetch();
              }}
              disabled={fetchState === 'LOADING'}
              className="h-9 px-5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 text-sm font-semibold rounded-lg transition"
            >
              {fetchState === 'LOADING' ? 'Loading…' : 'Fetch Escrows'}
            </button>
          </div>

          {/* Result count */}
          {fetchState === 'DONE' && (
            <p className="text-slate-400 text-xs">{resultSummary}</p>
          )}

          {/* States */}
          {fetchState === 'IDLE' && (
            <EmptyState title="No data loaded" message="Enter optional filters and click Fetch Escrows." />
          )}
          {fetchState === 'LOADING' && <LoadingState message="Loading escrow accounts…" />}
          {fetchState === 'ERROR' && error && (
            <div className="rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-rose-400 text-sm">
              {error}
              <button
                onClick={() => {
                  void handleFetch();
                }}
                className="ml-3 underline text-rose-300 hover:text-rose-200 text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          {fetchState === 'DONE' && visibleEscrows.length === 0 && (
            <EmptyState title="No escrow accounts" message="No escrow accounts match the current filter." />
          )}
          {fetchState === 'DONE' && visibleEscrows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3">Escrow ID</th>
                    <th className="px-4 py-3">Tenant ID</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleEscrows.map(escrow => (
                    <tr key={escrow.id} className={`transition ${bridgeScope?.escrowId === escrow.id ? 'bg-sky-500/10' : 'hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400" title={escrow.id}>
                        {truncateId(escrow.id)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400" title={escrow.tenantId}>
                        {truncateId(escrow.tenantId)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-200 uppercase">
                        {escrow.currency}
                      </td>
                      <td className="px-4 py-3">
                        <StateBadge stateKey={escrow.lifecycleStateKey} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatDate(escrow.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatDate(escrow.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            void handleOpenDetail(escrow.id);
                          }}
                          className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300 transition-colors hover:bg-sky-500/20"
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
