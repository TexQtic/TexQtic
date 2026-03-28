import React from 'react';

export const ApiDocs: React.FC = () => {
  const archivedExamples = [
    {
      name: 'Identity & Org (IAM)',
      endpoints: [
        { method: 'GET', path: '/tenants', desc: 'List all platform tenants' },
        { method: 'POST', path: '/tenants', desc: 'Provision a new multi-tenant environment' },
        {
          method: 'PATCH',
          path: '/tenants/:id/status',
          desc: 'Modify lifecycle status (active, suspend)',
        },
      ],
    },
    {
      name: 'Commerce Engine',
      endpoints: [
        { method: 'POST', path: '/commerce/rfq', desc: 'Initiate a Request for Quote' },
        {
          method: 'GET',
          path: '/commerce/negotiations/:id',
          desc: 'Fetch real-time negotiation state',
        },
        {
          method: 'POST',
          path: '/commerce/payouts',
          desc: 'Trigger financial settlement workflow',
        },
      ],
    },
    {
      name: 'Governance & AI',
      endpoints: [
        { method: 'GET', path: '/ai/budgets', desc: 'Fetch token consumption metrics' },
        {
          method: 'POST',
          path: '/ai/kill-switch',
          desc: 'Instant emergency disable of AI features',
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Preserved API Placeholder</h1>
        <p className="text-slate-400 text-sm">
          Retained historical shell only. This panel is not live API or contract authority.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="font-semibold uppercase tracking-widest text-[11px] text-amber-300">
          Non-Authoritative Surface
        </p>
        <p className="mt-2 text-amber-50/90">
          The entries below are preserved placeholder examples kept for traceability only. They are
          hardcoded, not runtime-backed, and should not be treated as current platform API truth.
        </p>
      </div>

      {archivedExamples.map((domain, idx) => (
        <div key={idx} className="space-y-4">
          <h2 className="text-sm font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Archived Placeholder: {domain.name}
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
            {domain.endpoints.map((ep, i) => {
              const METHOD_STYLE: Record<string, string> = {
                GET: 'bg-blue-500/10 text-blue-400 border-blue-400/20',
                POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20',
              };
              const DEFAULT_METHOD_STYLE = 'bg-amber-500/10 text-amber-400 border-amber-400/20';
              const methodStyle = METHOD_STYLE[ep.method] ?? DEFAULT_METHOD_STYLE;

              return (
                <div key={i} className="p-4 flex items-center gap-6">
                  <div
                    className={`w-16 text-[10px] font-black text-center py-1 rounded border ${methodStyle}`}
                  >
                    {ep.method}
                  </div>
                  <div className="font-mono text-sm text-slate-300">{ep.path}</div>
                  <div className="text-xs text-slate-500 ml-auto">
                    Placeholder example: {ep.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
