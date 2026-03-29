
import React from 'react';

const ArchitectureDiagram: React.FC = () => {
  const layers = [
    { name: 'Experience Layer', items: ['Aggregator Web', 'B2B Portal', 'B2C Storefront', 'White-Label CMS'] },
    { name: 'Gateway / Orchestration', items: ['Tenant Resolution', 'Edge Routing', 'Auth/IAM Service'] },
    { name: 'Core Domains (Micro-Services)', items: ['Identity & Org', 'Global Catalog', 'Commerce Engine', 'Logistics & Supply Chain'] },
    { name: 'Intelligence & Events', items: ['Event Bus (Redis/Kafka)', 'AI Processing (Gemini)', 'Analytics Pipeline'] },
    { name: 'Persistence', items: ['Multi-Tenant RDBMS', 'Vector DB', 'Object Storage'] },
  ];

  return (
    <div className="bg-slate-900 text-slate-100 p-8 rounded-xl shadow-2xl space-y-6">
      <h3 className="text-xl font-bold border-b border-slate-700 pb-2 flex items-center gap-2">
        <span className="text-amber-400">🏗️</span> Preserved Architecture Reference
      </h3>
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Preserved reference only. This component is not current platform architecture authority and
        does not define active implementation, sequencing, or runtime truth.
      </div>
      <div className="space-y-4">
        {layers.map((layer, idx) => (
          <div key={idx} className="relative">
            <div className="text-xs text-slate-400 font-mono uppercase mb-1">{layer.name}</div>
            <div className="flex flex-wrap gap-2">
              {layer.items.map((item, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded text-sm hover:border-blue-500 transition-colors">
                  {item}
                </div>
              ))}
            </div>
            {idx < layers.length - 1 && (
              <div className="flex justify-center my-2">
                <div className="w-px h-4 bg-slate-700"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 font-mono italic">
          * Preserved historical/conceptual reference only. Current authority lives in the
          product-truth stack, not in this retained component.
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
