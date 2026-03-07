/**
 * EscalationsPanel — Tenant Plane, Read-Only (TECS-FBW-006-A)
 *
 * Surfaces GET /api/tenant/escalations — the authenticated tenant's own escalation events.
 *
 * Constitutional compliance:
 *   D-017-A  No orgId / tenantId sent by client — tenantGet() TENANT realm guard is sufficient.
 *            Server derives tenant scope exclusively from JWT claims (orgId).
 *   D-022-A  Severity monotonicity is server-enforced; this panel displays existing rows only.
 *   D-022-C  freezeRecommendation is shown informational only — no UI action wired to it.
 *
 * Scope (TECS-FBW-006-A):
 *   ✅ Read-only escalation list
 *   ❌ Create escalation — out of scope (TECS-FBW-006-B)
 *   ❌ Upgrade severity — out of scope (TECS-FBW-006-B, control-plane only)
 *   ❌ Resolve / override — out of scope (TECS-FBW-006-B)
 *   ❌ Escalation detail drill-down — out of scope (TECS-FBW-006-B)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listEscalations, type EscalationEvent } from '../../services/escalationService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  onBack: () => void;
}

// ─── Severity → Badge color map ───────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  0: 'bg-slate-100 text-slate-600',
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-rose-100 text-rose-700',
  4: 'bg-rose-200 text-rose-900',
};

function SeverityBadge({ level }: { level: number }) {
  const classes = SEVERITY_COLORS[level] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${classes}`}>
      L{level}
    </span>
  );
}

// ─── Status → Badge color map ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  OPEN:       'bg-rose-100 text-rose-700',
  RESOLVED:   'bg-emerald-100 text-emerald-700',
  OVERRIDDEN: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_COLORS[status] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {status}
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

// ─── EscalationsPanel ────────────────────────────────────────────────────────

export function EscalationsPanel({ onBack }: Props) {
  const [escalations, setEscalations] = useState<EscalationEvent[]>([]);
  const [count, setCount]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEscalations({ limit: 50 });
      setEscalations(res.escalations);
      setCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

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
          <h1 className="text-2xl font-bold text-slate-900">Escalations</h1>
          <p className="text-sm text-slate-500 mt-0.5">G-022 escalation events for your organisation (read-only)</p>
        </div>
      </div>

      {/* States */}
      {loading && <LoadingState />}
      {error && !loading && (
        <ErrorState error={{ message: error }} onRetry={loadEscalations} />
      )}
      {!loading && !error && escalations.length === 0 && (
        <EmptyState title="No escalations found" message="No escalation events found for your organisation." />
      )}

      {/* Table */}
      {!loading && !error && escalations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {count} escalation{count !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Escalation ID</th>
                  <th className="px-6 py-3 text-left">Entity Type</th>
                  <th className="px-6 py-3 text-left">Entity ID</th>
                  <th className="px-6 py-3 text-left">Severity</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escalations.map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600" title={esc.id}>
                      {truncateId(esc.id)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {esc.entityType}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600" title={esc.entityId}>
                      {truncateId(esc.entityId)}
                    </td>
                    <td className="px-6 py-4">
                      <SeverityBadge level={esc.severityLevel} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={esc.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
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
