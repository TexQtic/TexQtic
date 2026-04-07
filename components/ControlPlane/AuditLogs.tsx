import React, { useState, useEffect } from 'react';
import { getAuditLogs, AuditLog, AuditLogsQueryParams } from '../../services/controlPlaneService';
import { EmptyState, ErrorState, AuditLogSkeleton } from '../shared';
import { APIError } from '../../services/apiClient';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const [count, setCount] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterTenantId, setFilterTenantId] = useState('');
  const [activeFilters, setActiveFilters] = useState<AuditLogsQueryParams>({ limit: 50 });

  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAuditLogs(activeFilters);
        if (cancelled) {
          return;
        }

        setLogs(response.logs);
        setCount(response.count);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error('Failed to load audit logs:', err);
        if (err instanceof APIError) {
          setError(err);
        } else {
          setError({
            status: 0,
            message: 'Failed to load audit logs. Please try again.',
            code: 'UNKNOWN_ERROR',
          } as APIError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [activeFilters]);

  const applyFilters = () => {
    const nextFilters: AuditLogsQueryParams = { limit: 50 };
    const trimmedAction = filterAction.trim();
    const trimmedTenantId = filterTenantId.trim();

    if (trimmedAction) {
      nextFilters.action = trimmedAction;
    }

    if (trimmedTenantId) {
      nextFilters.tenantId = trimmedTenantId;
    }

    setActiveFilters(nextFilters);
  };

  const clearFilters = () => {
    setFilterAction('');
    setFilterTenantId('');
    setActiveFilters({ limit: 50 });
  };

  const hasActiveFilters = Boolean(activeFilters.action || activeFilters.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Audit Logs</h1>
        <p className="text-slate-400 text-sm">
          Immutable history of all platform-level operations.
          {count > 0 && <span className="text-slate-500"> ({count} results)</span>}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label
                htmlFor="audit-action-filter"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1"
              >
                Filter by Action
                {' '}
                <span className="ml-1 text-slate-600 normal-case font-normal">(exact match)</span>
              </label>
              <input
                id="audit-action-filter"
                type="text"
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="e.g. ADMIN_AUDIT_LOG_VIEW"
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-600 placeholder:text-slate-600"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label
                htmlFor="audit-tenant-filter"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1"
              >
                Filter by Tenant ID
                {' '}
                <span className="ml-1 text-slate-600 normal-case font-normal">(admin query filter)</span>
              </label>
              <input
                id="audit-tenant-filter"
                type="text"
                value={filterTenantId}
                onChange={e => setFilterTenantId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="UUID (optional)"
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-600 placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={applyFilters}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 rounded text-xs font-bold text-slate-200 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Backend support is currently limited to exact-match <span className="font-mono">action</span> and <span className="font-mono">tenantId</span> filters.
          </p>
        </div>

        {/* Loading state with skeletons */}
        {loading && (
          <div className="p-4 space-y-3">
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
            <AuditLogSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && !loading && <ErrorState error={error} onRetry={applyFilters} />}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <EmptyState
            icon="📋"
            title="No audit logs found"
            message={hasActiveFilters
              ? 'No audit logs matched the current action/tenant filters.'
              : 'Audit logs will appear here as admin actions are performed'}
          />
        )}

        {/* Data state */}
        {!loading && !error && logs.length > 0 && (
          <div className="divide-y divide-slate-800 font-mono text-[11px]">
            {logs.map(log => (
              <div key={log.id} className="p-4 flex gap-6 hover:bg-slate-800/20">
                <div className="text-slate-600 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                <div className="text-rose-400 font-bold whitespace-nowrap">[{log.action}]</div>
                <div className="text-blue-400 whitespace-nowrap">
                  {log.actorType}:{log.actorId.substring(0, 8)}
                </div>
                <div className="text-slate-300 flex-1 italic">
                  {log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : 'No details'}
                </div>
                <div className="text-slate-600">
                  {log.tenant ? `${log.tenant.slug}` : log.tenantId.substring(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
