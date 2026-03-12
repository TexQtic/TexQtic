/**
 * SettlementAdminPanel — Control Plane, Read-Only (PW5-W3-FE)
 *
 * Surfaces GET /api/control/settlements — cross-tenant settlement list
 * for super-admin inspection.
 *
 * Constitutional compliance:
 *   D-017-A  tenantId is an optional query-param FILTER only — admin provides it
 *            to narrow results. It is NOT a client identity assertion.
 *   Read-only scope: No transition, create, or patch controls.
 *
 * PW5-W3-FE scope (2026-03-12):
 *   ✅ Cross-tenant settlement list (GET /api/control/settlements)
 *   ✅ Optional filters: tenantId, escrowId, referenceId, dateFrom, dateTo
 *   ✅ Cursor-based pagination (nextCursor / hasMore)
 *   ❌ Settlement detail — out of scope (not implemented in backend)
 *   ❌ Mutations — out of scope (read-only tranche)
 *
 * Parent units: PW5-W3 backend design · PW5-W3-IMPL (14aea49) · PW5-W3-GOV (de501e8)
 */

import React, { useState, useCallback } from 'react';
import {
  listSettlements,
  type AdminSettlement,
  type AdminSettlementListParams,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { EmptyState } from '../shared/EmptyState';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string | null | undefined): string {
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

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

// ─── SettlementAdminPanel ─────────────────────────────────────────────────────

export const SettlementAdminPanel: React.FC = () => {
  const [tenantIdInput,    setTenantIdInput]    = useState('');
  const [escrowIdInput,    setEscrowIdInput]    = useState('');
  const [referenceIdInput, setReferenceIdInput] = useState('');
  const [dateFromInput,    setDateFromInput]    = useState('');
  const [dateToInput,      setDateToInput]      = useState('');

  const [settlements,  setSettlements]  = useState<AdminSettlement[]>([]);
  const [nextCursor,   setNextCursor]   = useState<string | null>(null);
  const [hasMore,      setHasMore]      = useState(false);
  const [fetchState,   setFetchState]   = useState<FetchState>('IDLE');
  const [error,        setError]        = useState<string | null>(null);

  const buildParams = useCallback((cursor?: string): AdminSettlementListParams => ({
    tenantId:    tenantIdInput.trim()    || undefined,
    escrowId:    escrowIdInput.trim()    || undefined,
    referenceId: referenceIdInput.trim() || undefined,
    dateFrom:    dateFromInput.trim()    || undefined,
    dateTo:      dateToInput.trim()      || undefined,
    cursor,
    limit: 50,
  }), [tenantIdInput, escrowIdInput, referenceIdInput, dateFromInput, dateToInput]);

  const handleFetch = useCallback(async (append = false, cursor?: string) => {
    setFetchState('LOADING');
    setError(null);
    try {
      const res = await listSettlements(buildParams(cursor));
      const rows = res.data.settlements;
      setSettlements(prev => append ? [...prev, ...rows] : rows);
      setNextCursor(res.data.pagination.nextCursor);
      setHasMore(res.data.pagination.hasMore);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settlements.');
      setFetchState('ERROR');
    }
  }, [buildParams]);

  const handleSearch = useCallback(() => {
    setSettlements([]);
    setNextCursor(null);
    setHasMore(false);
    handleFetch(false);
  }, [handleFetch]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) handleFetch(true, nextCursor);
  }, [handleFetch, nextCursor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Settlement Admin</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Cross-tenant read-only view — PW5-W3
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
          PW5-W3-FE · Read-Only
        </span>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filters</p>
        <div className="flex flex-wrap gap-3">
          <FilterField
            id="settlement-tenant-filter"
            label="Tenant ID"
            placeholder="UUID — leave blank for all tenants"
            value={tenantIdInput}
            onChange={setTenantIdInput}
            onKeyDown={handleKeyDown}
            width="w-72"
          />
          <FilterField
            id="settlement-escrow-filter"
            label="Escrow ID"
            placeholder="UUID"
            value={escrowIdInput}
            onChange={setEscrowIdInput}
            onKeyDown={handleKeyDown}
            width="w-56"
          />
          <FilterField
            id="settlement-ref-filter"
            label="Reference ID"
            placeholder="Reference"
            value={referenceIdInput}
            onChange={setReferenceIdInput}
            onKeyDown={handleKeyDown}
            width="w-48"
          />
          <FilterField
            id="settlement-datefrom-filter"
            label="Date From"
            placeholder="YYYY-MM-DD"
            value={dateFromInput}
            onChange={setDateFromInput}
            onKeyDown={handleKeyDown}
            width="w-36"
          />
          <FilterField
            id="settlement-dateto-filter"
            label="Date To"
            placeholder="YYYY-MM-DD"
            value={dateToInput}
            onChange={setDateToInput}
            onKeyDown={handleKeyDown}
            width="w-36"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={fetchState === 'LOADING'}
          className="h-9 px-5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 text-sm font-semibold rounded-lg transition"
        >
          {fetchState === 'LOADING' ? 'Loading…' : 'Fetch Settlements'}
        </button>
      </div>

      {/* Result info */}
      {fetchState === 'DONE' && (
        <p className="text-slate-400 text-xs">
          {settlements.length === 0
            ? 'No settlements found.'
            : `Showing ${settlements.length} settlement${settlements.length !== 1 ? 's' : ''}${hasMore ? ' — more available below' : ''}.`}
        </p>
      )}

      {/* States */}
      {fetchState === 'IDLE' && (
        <EmptyState title="No data loaded" message="Enter optional filters and click Fetch Settlements." />
      )}
      {fetchState === 'LOADING' && settlements.length === 0 && (
        <LoadingState message="Loading settlements…" />
      )}
      {fetchState === 'ERROR' && error && (
        <div className="rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-rose-400 text-sm">
          {error}
          <button
            onClick={handleSearch}
            className="ml-3 underline text-rose-300 hover:text-rose-200 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {settlements.length === 0 && fetchState === 'DONE' && (
        <EmptyState title="No settlements" message="No settlement records match the current filters." />
      )}
      {settlements.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">Settlement ID</th>
                  <th className="px-4 py-3">Tenant ID</th>
                  <th className="px-4 py-3">Escrow ID</th>
                  <th className="px-4 py-3">Reference ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {settlements.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={s.id}>
                      {truncateId(s.id)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={s.tenantId}>
                      {truncateId(s.tenantId)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={s.escrowId}>
                      {truncateId(s.escrowId)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {s.referenceId ?? <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200 tabular-nums">
                      {formatAmount(s.amount, s.currency)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-200 uppercase">
                      {s.currency}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={s.createdByUserId ?? ''}>
                      {s.createdByUserId ? truncateId(s.createdByUserId) : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={fetchState === 'LOADING'}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold rounded-lg transition"
              >
                {fetchState === 'LOADING' ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── FilterField ──────────────────────────────────────────────────────────────

interface FilterFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  width: string;
}

const FilterField: React.FC<FilterFieldProps> = ({
  id, label, placeholder, value, onChange, onKeyDown, width,
}) => (
  <div className="flex flex-col gap-1">
    <label
      htmlFor={id}
      className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
    >
      {label}
    </label>
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={`${width} bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500`}
    />
  </div>
);
