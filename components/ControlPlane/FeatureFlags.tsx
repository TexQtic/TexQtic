
import React from 'react';
import { FEATURE_FLAGS } from '../../constants';

export const FeatureFlags: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Governance</h1>
        <p className="text-slate-400 text-sm">Control platform capabilities and staged rollouts.</p>
      </div>
      <button className="bg-rose-600 text-white px-4 py-2 rounded font-bold text-xs uppercase shadow-lg shadow-rose-900/20">Create Flag</button>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Flag Key</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Scope</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Environment</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Toggle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {FEATURE_FLAGS.map(ff => (
            <tr key={ff.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="font-mono text-blue-400 font-bold">{ff.key}</div>
                <div className="text-[10px] text-slate-500 mt-1">{ff.description}</div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ff.global ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>
                  {ff.global ? 'GLOBAL' : 'PER-TENANT'}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-slate-400 font-mono text-[10px]">Production</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ff.status === 'PRODUCTION' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ff.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <button className="w-10 h-5 bg-slate-700 rounded-full relative p-0.5 transition-colors">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-emerald-500 rounded-full shadow-sm shadow-emerald-900/40"></div>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
