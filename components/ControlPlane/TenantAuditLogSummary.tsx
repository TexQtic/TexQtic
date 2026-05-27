import React, { useState, useEffect } from 'react';
import { getAuditLogs, type AuditLog } from '../../services/controlPlaneService';
import { EmptyState, ErrorState, AuditLogSkeleton } from '../shared';
import { APIError } from '../../services/apiClient';

// ─── Local thin helpers (bounded to this component) ───────────────────────────

const MAX_ACTOR_ID_PREVIEW = 8;
const MAX_METADATA_PREVIEW = 120;

function formatAuditActor(log: AuditLog): string {
  const type =
    typeof log.actorType === 'string' && log.actorType.length > 0
      ? log.actorType
      : 'UNKNOWN';
  const idPreview =
    typeof log.actorId === 'string' && log.actorId.length > 0
      ? log.actorId.slice(0, MAX_ACTOR_ID_PREVIEW)
      : null;
  return idPreview ? `${type}:${idPreview}` : `${type}:(no actor)`;
}

function formatAuditAction(action: AuditLog['action']): string {
  return typeof action === 'string' && action.length > 0 ? action : 'UNKNOWN_ACTION';
}

function formatAuditCreatedAt(createdAt: AuditLog['createdAt']): string {
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    return '(unknown time)';
  }
  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? createdAt : parsed.toLocaleString();
}

function formatAuditMetadata(metadata: AuditLog['metadataJson']): string {
  if (!metadata) {
    return '';
  }
  if (typeof metadata === 'string') {
    return metadata.length > MAX_METADATA_PREVIEW
      ? `${metadata.slice(0, MAX_METADATA_PREVIEW)}…`
      : metadata;
  }
  try {
    const serialized = JSON.stringify(metadata);
    return serialized.length > MAX_METADATA_PREVIEW
      ? `${serialized.slice(0, MAX_METADATA_PREVIEW)}…`
      : serialized;
  } catch {
    return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TenantAuditLogSummaryProps {
  tenantId: string;
  limit?: number;
}

export const TenantAuditLogSummary: React.FC<TenantAuditLogSummaryProps> = ({
  tenantId,
  limit = 25,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchLogs = async () => {
      try {
        const response = await getAuditLogs({ tenantId, limit });
        if (cancelled) {
          return;
        }
        setLogs(response.logs);
        setCount(response.count);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof APIError) {
          setError(err);
        } else {
          setError({
            status: 0,
            message: 'Failed to load audit log for this tenant.',
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
  }, [tenantId, limit, refreshKey]);

  const handleRetry = () => setRefreshKey(k => k + 1);

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden animate-in slide-in-from-right-4 duration-300">
      <div className="flex flex-wrap items-center gap-3 p-6 border-b border-slate-800">
        <h3 className="text-xl font-bold text-white">Audit Log</h3>
        <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Read Only
        </span>
        {!loading && !error && count > 0 && (
          <span className="text-xs text-slate-500">{count} entries</span>
        )}
      </div>

      <div className="px-6 py-2 border-b border-slate-800/60 bg-slate-950/30">
        <p className="text-[11px] text-slate-500">
          Most recent audit entries for this tenant. Full platform audit history is available in the dedicated Audit Logs area.
        </p>
      </div>

      {loading && (
        <div className="p-4 space-y-3">
          <AuditLogSkeleton />
          <AuditLogSkeleton />
          <AuditLogSkeleton />
        </div>
      )}

      {error && !loading && (
        <ErrorState error={error} onRetry={handleRetry} />
      )}

      {!loading && !error && logs.length === 0 && (
        <EmptyState
          icon="📋"
          title="No audit entries found"
          message="No audit log entries have been recorded for this tenant yet."
        />
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="divide-y divide-slate-800 font-mono text-[11px]">
          {logs.map((log, index) => (
            <div
              key={log.id ?? `audit-entry-${index}`}
              className="p-4 flex gap-6 hover:bg-slate-800/20"
            >
              <div className="text-slate-600 whitespace-nowrap">
                {formatAuditCreatedAt(log.createdAt)}
              </div>
              <div className="text-rose-400 font-bold whitespace-nowrap">
                [{formatAuditAction(log.action)}]
              </div>
              <div className="text-blue-400 whitespace-nowrap">
                {formatAuditActor(log)}
              </div>
              <div className="text-slate-300 flex-1 italic">
                {formatAuditMetadata(log.metadataJson)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
