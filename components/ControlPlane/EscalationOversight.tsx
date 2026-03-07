/**
 * EscalationOversight — Control Plane, Read-Only (TECS-FBW-006-A)
 *
 * Surfaces GET /api/control/escalations — admin cross-tenant escalation event list.
 *
 * Critical constraint: orgId is a MANDATORY query parameter on this endpoint.
 * The API returns 400 if orgId is absent. This component gates all fetches behind
 * a non-empty orgId input — no API call is attempted until orgId is provided.
 *
 * G-022 constitutional compliance:
 *   D-022-A  Severity monotonicity is server-enforced; this panel is display-only.
 *   D-022-B  Org freeze state is read via existing escalation_events rows.
 *   D-022-C  freezeRecommendation is informational only — no kill-switch UI here.
 *   D-022-D  Override path is SUPER_ADMIN only; no override controls in this read unit.
 *
 * Scope (TECS-FBW-006-A):
 *   ✅ Read-only escalation list, scoped to one org at a time
 *   ❌ Create escalation — out of scope (TECS-FBW-006-B)
 *   ❌ Upgrade severity — out of scope (TECS-FBW-006-B)
 *   ❌ Resolve / override — out of scope (TECS-FBW-006-B)
 */

import React, { useState, useCallback } from 'react';
import {
  getEscalations,
  type ControlPlaneEscalationEvent,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Severity → Badge color map ───────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  0: 'bg-slate-700 text-slate-300',
  1: 'bg-yellow-900/50 text-yellow-300',
  2: 'bg-orange-900/50 text-orange-300',
  3: 'bg-rose-900/60 text-rose-200',
  4: 'bg-rose-700 text-white',
};

function SeverityBadge({ level }: { level: number }) {
  const classes = SEVERITY_COLORS[level] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${classes}`}>
      L{level}
    </span>
  );
}

// ─── Status → Badge color map ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  OPEN:       'bg-rose-900/50 text-rose-300',
  RESOLVED:   'bg-emerald-900/50 text-emerald-300',
  OVERRIDDEN: 'bg-slate-700 text-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_COLORS[status] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

// ─── EscalationOversight ─────────────────────────────────────────────────────

export const EscalationOversight: React.FC = () => {
  const [orgIdInput, setOrgIdInput]         = useState('');
  const [orgId, setOrgId]                   = useState('');
  const [escalations, setEscalations]       = useState<ControlPlaneEscalationEvent[]>([]);
  const [count, setCount]                   = useState(0);
  const [fetchState, setFetchState]         = useState<FetchState>('IDLE');
  const [error, setError]                   = useState<string | null>(null);

  const handleFetch = useCallback(async (targetOrgId: string) => {
    if (!targetOrgId.trim()) return;
    setOrgId(targetOrgId.trim());
    setFetchState('LOADING');
    setError(null);
    try {
      const res = await getEscalations(targetOrgId.trim(), { limit: 100 });
      setEscalations(res.escalations);
      setCount(res.count);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations.');
      setFetchState('ERROR');
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch(orgIdInput);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Escalation Oversight</h1>
        <p className="text-sm text-slate-400 mt-1">
          G-022 escalation events — admin cross-tenant read surface (read-only)
        </p>
      </div>

      {/* orgId filter — required before any fetch */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="esc-org-id">
          Organisation ID <span className="text-rose-400">(required)</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="esc-org-id"
            type="text"
            value={orgIdInput}
            onChange={e => setOrgIdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          />
          <button
            type="button"
            onClick={() => handleFetch(orgIdInput)}
            disabled={!orgIdInput.trim() || fetchState === 'LOADING'}
            className="px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {fetchState === 'LOADING' ? 'Loading…' : 'Load Escalations'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          GET /api/control/escalations requires orgId — results are scoped to the specified organisation.
        </p>
      </div>

      {/* Idle state */}
      {fetchState === 'IDLE' && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🚨</div>
          <p className="text-slate-400 text-sm">Enter an organisation ID above to load escalation events.</p>
        </div>
      )}

      {/* Loading */}
      {fetchState === 'LOADING' && <LoadingState />}

      {/* Error */}
      {fetchState === 'ERROR' && error && (
        <ErrorState error={{ message: error }} onRetry={() => handleFetch(orgId)} />
      )}

      {/* Empty */}
      {fetchState === 'DONE' && escalations.length === 0 && (
        <EmptyState title="No escalations found" message={`No escalation events found for org ${truncateId(orgId)}.`} />
      )}

      {/* Results table */}
      {fetchState === 'DONE' && escalations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-200">
                {count} escalation{count !== 1 ? 's' : ''}
              </span>
              <span className="ml-2 text-xs text-slate-500 font-mono">org: {truncateId(orgId)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Escalation ID</th>
                  <th className="px-5 py-3 text-left">Entity Type</th>
                  <th className="px-5 py-3 text-left">Entity ID</th>
                  <th className="px-5 py-3 text-left">Severity</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Source</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {escalations.map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400" title={esc.id}>
                      {truncateId(esc.id)}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">
                      {esc.entityType}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400" title={esc.entityId}>
                      {truncateId(esc.entityId)}
                    </td>
                    <td className="px-5 py-4">
                      <SeverityBadge level={esc.severityLevel} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={esc.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {esc.source}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
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
};
