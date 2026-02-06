
import React from 'react';
import { AUDIT_LOGS } from '../../constants';

export const AuditLogs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Audit Logs</h1>
        <p className="text-slate-400 text-sm">Immutable history of all platform-level operations.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex gap-4">
          <input type="text" placeholder="Search by admin or action..." className="bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs text-slate-100 flex-1 focus:outline-none focus:ring-1 focus:ring-rose-600" />
          <button className="px-4 py-2 bg-slate-800 rounded text-xs font-bold text-slate-300">Filter</button>
        </div>
        <div className="divide-y divide-slate-800 font-mono text-[11px]">
          {AUDIT_LOGS.map(log => (
            <div key={log.id} className="p-4 flex gap-6 hover:bg-slate-800/20">
              <div className="text-slate-600 whitespace-nowrap">{log.timestamp}</div>
              <div className="text-rose-400 font-bold whitespace-nowrap">[{log.action}]</div>
              <div className="text-blue-400 whitespace-nowrap">{log.adminUser}</div>
              <div className="text-slate-300 flex-1 italic">"{log.details}"</div>
              <div className="text-slate-600">tenant:{log.tenantId}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
