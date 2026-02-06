
import React from 'react';
import { DISPUTE_CASES } from '../../constants';

export const DisputeCases: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Risk & Disputes</h1>
        <p className="text-slate-400 text-sm">Mediate conflicts between buyers and suppliers.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {DISPUTE_CASES.map(c => (
        <div key={c.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest">
              Priority: {c.priority}
            </div>
            <div className="text-xs text-slate-500 font-mono">{c.id}</div>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-100">{c.tenantName} vs {c.counterparty}</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">"{c.reason}"</p>
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.status}</span>
            </div>
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-[10px] font-bold uppercase transition">Investigate Case</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
