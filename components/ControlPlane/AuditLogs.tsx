import React, { useState, useEffect } from 'react';
import { getAuditLogs, AuditLog } from '../../services/controlPlaneService';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAuditLogs({ limit: 50 });
        setLogs(response.logs);
      } catch (err: any) {
        console.error('Failed to load audit logs:', err);
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Audit Logs</h1>
        <p className="text-slate-400 text-sm">Immutable history of all platform-level operations.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex gap-4">
          <input
            type="text"
            placeholder="Search by admin or action..."
            disabled
            className="bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs text-slate-100 flex-1 focus:outline-none focus:ring-1 focus:ring-rose-600 opacity-50 cursor-not-allowed"
            title="Search functionality will be enabled in Wave 5"
          />
          <button
            disabled
            className="px-4 py-2 bg-slate-800 rounded text-xs font-bold text-slate-300 opacity-50 cursor-not-allowed"
            title="Filter functionality will be enabled in Wave 5"
          >
            Filter
          </button>
        </div>

        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
            <p className="text-slate-400 mt-4">Loading audit logs...</p>
          </div>
        )}

        {error && (
          <div className="p-12 text-center">
            <p className="text-rose-400 font-bold">Failed to load audit logs</p>
            <p className="text-slate-400 text-sm mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="p-12 text-center text-slate-500">No audit logs found</div>
        )}

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
