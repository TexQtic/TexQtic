/**
 * MakerCheckerConsole — Control Plane, Read-Only (PW5-W4)
 *
 * Surfaces GET /api/control/internal/gov/approvals — cross-tenant pending-approval
 * queue for super-admin inspection.
 *
 * Route: GET /api/control/internal/gov/approvals
 *   Requires X-Texqtic-Internal: true + admin JWT (enforced by internalOnlyGuard +
 *   adminAuthMiddleware server-side; adminGetWithHeaders sends both headers).
 *
 * Constitutional compliance:
 *   D-021-A/B/C enforced by MakerCheckerService on the server.
 *   This panel is read-only — no sign/replay actions are wired in this tranche.
 *   Decision endpoints (POST .../sign, POST .../replay) exist on the backend
 *   and are classified for a future wiring unit if approved.
 *
 * PW5-W4 scope (2026-03-10):
 *   ✅ Approval queue read  (GET /api/control/internal/gov/approvals)
 *   ✅ Optional orgId / status / entityType filters
 *   ✅ Status badge rendering; expiry display
 *   ❌ Sign/replay actions — out of scope (read-only tranche)
 */

import React, { useState, useCallback } from 'react';
import {
  adminListApprovals,
  type AdminPendingApproval,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { EmptyState } from '../shared/EmptyState';

// ─── Status badge colours ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:  'bg-amber-900/50 text-amber-300',
  APPROVED:   'bg-emerald-900/50 text-emerald-300',
  REJECTED:   'bg-rose-900/60 text-rose-200',
  EXPIRED:    'bg-slate-700 text-slate-400',
  CANCELLED:  'bg-slate-700 text-slate-400',
  ESCALATED:  'bg-violet-900/50 text-violet-300',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

// ─── Entity type badge colours ────────────────────────────────────────────────

const ENTITY_COLORS: Record<string, string> = {
  TRADE:          'bg-sky-900/50 text-sky-300',
  ESCROW:         'bg-indigo-900/50 text-indigo-300',
  CERTIFICATION:  'bg-teal-900/50 text-teal-300',
};

function EntityTypeBadge({ entityType }: { entityType: string }) {
  const cls = ENTITY_COLORS[entityType] ?? 'bg-slate-700 text-slate-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {entityType}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
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

function isExpiringSoon(expiresAt: string): boolean {
  try {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 30 * 60 * 1000; // within 30 min
  } catch {
    return false;
  }
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

type StatusFilter =
  | ''
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ESCALATED';

type EntityTypeFilter = '' | 'TRADE' | 'ESCROW' | 'CERTIFICATION';

// ─── MakerCheckerConsole ─────────────────────────────────────────────────────

export const MakerCheckerConsole: React.FC = () => {
  const [orgIdInput, setOrgIdInput]           = useState('');
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>('REQUESTED');
  const [entityFilter, setEntityFilter]       = useState<EntityTypeFilter>('');
  const [approvals, setApprovals]             = useState<AdminPendingApproval[]>([]);
  const [count, setCount]                     = useState(0);
  const [fetchState, setFetchState]           = useState<FetchState>('IDLE');
  const [error, setError]                     = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setFetchState('LOADING');
    setError(null);
    try {
      const res = await adminListApprovals({
        orgId:      orgIdInput.trim() || undefined,
        status:     statusFilter || undefined,
        entityType: entityFilter || undefined,
      });
      setApprovals(res.approvals);
      setCount(res.count);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval queue.');
      setFetchState('ERROR');
    }
  }, [orgIdInput, statusFilter, entityFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Maker-Checker Console</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Cross-tenant approval queue — G-021
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
          PW5-W4 · Read-Only
        </span>
      </div>

      {/* Read-only notice */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-slate-400 text-xs leading-relaxed">
        This panel displays the approval queue read-only. Decision actions (APPROVE / REJECT)
        and replay are out of scope for this tranche. Backend sign and replay endpoints exist
        and are classified for future wiring.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="mc-org-filter"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
          >
            Org ID (optional)
          </label>
          <input
            id="mc-org-filter"
            type="text"
            placeholder="UUID — leave blank for all tenants"
            value={orgIdInput}
            onChange={e => setOrgIdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-72 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="mc-status-filter"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
          >
            Status
          </label>
          <select
            id="mc-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All statuses</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="mc-entity-filter"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
          >
            Entity Type
          </label>
          <select
            id="mc-entity-filter"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value as EntityTypeFilter)}
            className="h-9 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All types</option>
            <option value="TRADE">TRADE</option>
            <option value="ESCROW">ESCROW</option>
            <option value="CERTIFICATION">CERTIFICATION</option>
          </select>
        </div>

        <button
          onClick={handleFetch}
          disabled={fetchState === 'LOADING'}
          className="h-9 px-5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 text-sm font-semibold rounded-lg transition"
        >
          {fetchState === 'LOADING' ? 'Loading…' : 'Fetch Queue'}
        </button>
      </div>

      {/* Result count */}
      {fetchState === 'DONE' && (
        <p className="text-slate-400 text-xs">
          {count === 0
            ? 'No approvals found for the current filter.'
            : `Showing ${approvals.length} of ${count} approval${count !== 1 ? 's' : ''}.`}
        </p>
      )}

      {/* States */}
      {fetchState === 'IDLE' && (
        <EmptyState title="Queue not loaded" message="Select filters and click Fetch Queue to load approvals." />
      )}
      {fetchState === 'LOADING' && <LoadingState message="Loading approval queue…" />}
      {fetchState === 'ERROR' && error && (
        <div className="rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-rose-400 text-sm">
          {error}
          <button
            onClick={handleFetch}
            className="ml-3 underline text-rose-300 hover:text-rose-200 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {fetchState === 'DONE' && approvals.length === 0 && (
        <EmptyState title="No approvals" message="No approvals match the current filter." />
      )}
      {fetchState === 'DONE' && approvals.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="px-4 py-3">Approval ID</th>
                <th className="px-4 py-3">Org ID</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Transition</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">AI</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {approvals.map(approval => {
                const expiring = approval.status === 'REQUESTED' && isExpiringSoon(approval.expiresAt);
                return (
                  <tr
                    key={approval.id}
                    className={`transition ${expiring ? 'bg-amber-900/10' : 'hover:bg-slate-800/30'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={approval.id}>
                      {truncateId(approval.id)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" title={approval.orgId}>
                      {truncateId(approval.orgId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <EntityTypeBadge entityType={approval.entityType} />
                        <span className="font-mono text-xs text-slate-500" title={approval.entityId}>
                          {truncateId(approval.entityId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <span className="font-mono">{approval.fromStateKey}</span>
                      <span className="mx-1 text-slate-600">→</span>
                      <span className="font-mono font-semibold">{approval.toStateKey}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={approval.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {approval.aiTriggered ? (
                        <span className="text-violet-400 text-xs font-semibold">AI</span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${expiring ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                      {formatDateTime(approval.expiresAt)}
                      {expiring && <span className="ml-1 text-[9px] uppercase tracking-wide">(soon)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {formatDateTime(approval.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
