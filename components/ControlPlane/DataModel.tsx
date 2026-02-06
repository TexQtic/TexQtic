
import React from 'react';

export const DataModel: React.FC = () => {
  const entities = [
    {
      name: 'Tenant',
      fields: [
        { name: 'id', type: 'UUID', meta: 'Primary Key' },
        { name: 'slug', type: 'STRING', meta: 'Unique' },
        { name: 'config', type: 'JSONB', meta: 'Themes, Overrides' },
        { name: 'status', type: 'ENUM', meta: 'Active, Suspended' },
      ]
    },
    {
      name: 'AuditLog',
      fields: [
        { name: 'id', type: 'BIGSERIAL', meta: 'Primary Key' },
        { name: 'admin_id', type: 'UUID', meta: 'FK AdminUser' },
        { name: 'payload', type: 'JSONB', meta: 'Immutable Event' },
        { name: 'created_at', type: 'TIMESTAMPTZ', meta: 'Partition Key' },
      ]
    },
    {
      name: 'AiBudget',
      fields: [
        { name: 'tenant_id', type: 'UUID', meta: 'FK Tenant (Unique)' },
        { name: 'quota', type: 'INTEGER', meta: 'Monthly Tokens' },
        { name: 'usage', type: 'INTEGER', meta: 'Counter' },
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Model Skeleton</h1>
        <p className="text-slate-400 text-sm">Platform persistence layer and tenant isolation schemas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map((entity, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-lg">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <span className="font-bold text-white font-mono">{entity.name}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Table</span>
            </div>
            <div className="p-4 space-y-4 flex-1">
               {entity.fields.map((field, i) => (
                 <div key={i} className="flex justify-between items-start text-xs border-b border-slate-800 pb-2 last:border-0">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-300">{field.name}</div>
                      <div className="text-[10px] text-slate-500">{field.meta}</div>
                    </div>
                    <div className="font-mono text-[10px] text-blue-400 px-1.5 py-0.5 bg-blue-500/5 rounded border border-blue-500/10 h-fit">
                      {field.type}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
