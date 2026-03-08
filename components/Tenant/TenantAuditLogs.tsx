/**
 * TenantAuditLogs — Tenant Plane, Read-Only (TECS-FBW-016)
 *
 * EXPERIENCE-ONLY: Must never be imported by WL_ADMIN shell or ControlPlane components.
 * Architectural boundary: tenant-plane surface only (mirrors EXPOrdersPanel, EscalationsPanel pattern).
 *
 * Surfaces GET /api/tenant/audit-logs — the 50 most recent audit entries for the
 * authenticated tenant. Tenant isolation is enforced server-side via RLS (app.org_id).
 * No tenant ID is sent by the client — tenantGet() TENANT-realm guard is sufficient.
 *
 * Backend truth (verified 2026-03-08):
 *   Route:    GET /api/tenant/audit-logs
 *   Auth:     tenantAuthMiddleware + databaseContextMiddleware
 *   Response: { logs: AuditLogRow[], count: number }
 *   Order:    newest-first (createdAt DESC)
 *   Limit:    hardcoded take: 50 — no cursor/filter/pagination params exist server-side
 *
 * Scope (TECS-FBW-016):
 *   ✅ Read-only audit trail list (createdAt, action, entity, entityId, actorType, realm)
 *   ❌ Filters / pagination — backend exposes none; must not be implied
 *   ❌ Mutation controls — audit_logs is append-only by RLS policy
 *   ❌ Raw beforeJson / afterJson / metadataJson inline dump — omitted for safety
 *   ❌ Control-plane audit log access — separate future unit
 *   ❌ Audit log detail drill-down — out of scope for this unit
 */

import React, { useState, useEffect, useCallback } from 'react';
import { tenantGet } from '../../services/tenantApiClient';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string;
  realm: string;
  tenantId: string | null;
  actorId: string | null;
  actorType: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  // beforeJson / afterJson / metadataJson intentionally omitted from display
}

interface AuditLogsResponse {
  logs: AuditLogRow[];
  count: number;
}

interface Props {
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
}

// ─── Realm Badge ─────────────────────────────────────────────────────────────

const REALM_COLORS: Record<string, string> = {
  TENANT: 'bg-blue-100 text-blue-700',
  ADMIN:  'bg-purple-100 text-purple-700',
};

function RealmBadge({ realm }: { realm: string }) {
  const classes = REALM_COLORS[realm] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {realm}
    </span>
  );
}

// ─── Actor Type Badge ─────────────────────────────────────────────────────────

const ACTOR_COLORS: Record<string, string> = {
  OWNER:  'bg-emerald-100 text-emerald-700',
  ADMIN:  'bg-amber-100 text-amber-700',
  MEMBER: 'bg-slate-100 text-slate-600',
  VIEWER: 'bg-slate-50 text-slate-400',
  SYSTEM: 'bg-indigo-100 text-indigo-700',
};

function ActorTypeBadge({ actorType }: { actorType: string }) {
  const classes = ACTOR_COLORS[actorType] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {actorType}
    </span>
  );
}

// ─── TenantAuditLogs ─────────────────────────────────────────────────────────

export function TenantAuditLogs({ onBack }: Props) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantGet<AuditLogsResponse>('/api/tenant/audit-logs');
      setLogs(data.logs);
      setCount(data.count);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 transition text-sm font-medium flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Most recent {count > 0 ? count : 'up to 50'} tenant-scoped activity entries — read-only
            </p>
          </div>
        </div>
        <button
          onClick={() => void fetchLogs()}
          disabled={loading}
          className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition disabled:opacity-40 border border-slate-200 px-3 py-1.5 rounded-lg"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* States */}
      {loading && <LoadingState message="Loading audit log entries…" />}

      {!loading && error && (
        <ErrorState
          error={{ message: error }}
          onRetry={() => void fetchLogs()}
        />
      )}

      {!loading && !error && logs.length === 0 && (
        <EmptyState
          title="No audit entries found"
          message="Activity in this workspace will appear here once events are recorded."
        />
      )}

      {/* Table */}
      {!loading && !error && logs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Timestamp
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Action
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Entity
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Entity ID
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Actor
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 py-3">
                    Realm
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {log.entity}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {log.entityId ? truncateId(log.entityId) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ActorTypeBadge actorType={log.actorType} />
                    </td>
                    <td className="px-4 py-3">
                      <RealmBadge realm={log.realm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Showing {logs.length} of latest entries · Server limit: 50 · Read-only
          </div>
        </div>
      )}
    </div>
  );
}
