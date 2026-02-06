
import React from 'react';

export const BackendSkeleton: React.FC = () => {
  const domains = [
    {
      name: 'CatalogDomain',
      files: ['catalog.service.ts', 'product.entity.ts', 'catalog.resolver.ts', 'events/catalog-updated.event.ts'],
      desc: 'Master product registry with tenant-specific overrides.'
    },
    {
      name: 'CommerceDomain',
      files: ['negotiation.service.ts', 'order.entity.ts', 'pricing.engine.ts', 'rfq.controller.ts'],
      desc: 'Transaction workflows, MOQs, and negotiation logic.'
    },
    {
      name: 'IdentityDomain',
      files: ['tenant.service.ts', 'rbac.guard.ts', 'organization.entity.ts', 'auth.module.ts'],
      desc: 'Strict multi-tenant isolation and user permissions.'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Domain Skeletons</h1>
        <p className="text-slate-400 text-sm">Modular backend architecture with clean domain boundaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {domains.map((dom, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50">
              <h3 className="font-bold text-white">{dom.name}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{dom.desc}</p>
            </div>
            <div className="p-4 flex-1 space-y-2">
              {dom.files.map(f => (
                <div key={f} className="flex items-center gap-3 text-[11px] font-mono text-blue-400 group">
                  <span className="text-slate-600">📄</span>
                  <span className="group-hover:text-blue-300 transition-colors cursor-pointer">{f}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-950/50 text-center border-t border-slate-800">
               <button className="text-[10px] font-black uppercase text-rose-500 tracking-widest hover:text-rose-400">View Module Contract</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
