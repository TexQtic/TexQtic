
import React from 'react';

export const ApiDocs: React.FC = () => {
  const domains = [
    {
      name: 'Identity & Org (IAM)',
      endpoints: [
        { method: 'GET', path: '/tenants', desc: 'List all platform tenants' },
        { method: 'POST', path: '/tenants', desc: 'Provision a new multi-tenant environment' },
        { method: 'PATCH', path: '/tenants/:id/status', desc: 'Modify lifecycle status (active, suspend)' },
      ]
    },
    {
      name: 'Commerce Engine',
      endpoints: [
        { method: 'POST', path: '/commerce/rfq', desc: 'Initiate a Request for Quote' },
        { method: 'GET', path: '/commerce/negotiations/:id', desc: 'Fetch real-time negotiation state' },
        { method: 'POST', path: '/commerce/payouts', desc: 'Trigger financial settlement workflow' },
      ]
    },
    {
      name: 'Governance & AI',
      endpoints: [
        { method: 'GET', path: '/ai/budgets', desc: 'Fetch token consumption metrics' },
        { method: 'POST', path: '/ai/kill-switch', desc: 'Instant emergency disable of AI features' },
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">API Contract Skeleton</h1>
        <p className="text-slate-400 text-sm">Concise definition of platform-level domain endpoints.</p>
      </div>

      {domains.map((domain, idx) => (
        <div key={idx} className="space-y-4">
          <h2 className="text-sm font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {domain.name}
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
            {domain.endpoints.map((ep, i) => (
              <div key={i} className="p-4 flex items-center gap-6 hover:bg-slate-800/20 transition-colors group">
                <div className={`w-16 text-[10px] font-black text-center py-1 rounded border ${ep.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border-blue-400/20' : ep.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' : 'bg-amber-500/10 text-amber-400 border-amber-400/20'}`}>
                  {ep.method}
                </div>
                <div className="font-mono text-sm text-slate-200">{ep.path}</div>
                <div className="text-xs text-slate-500 ml-auto group-hover:text-slate-300 transition-colors">{ep.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
