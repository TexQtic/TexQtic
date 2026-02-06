
import React from 'react';
import { SYSTEM_HEALTH } from '../../constants';

export const SystemHealth: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">System Status</h1>
        <p className="text-slate-400 text-sm">Real-time health of core platform microservices.</p>
      </div>
      <button className="text-xs font-bold text-blue-400 hover:underline">Refresh Vitals</button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SYSTEM_HEALTH.map(s => (
        <div key={s.service} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.service}</span>
            <span className={`w-2 h-2 rounded-full ${s.status === 'UP' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </div>
          <div className="text-xl font-bold text-slate-100">{s.status}</div>
          <div className="text-xs text-slate-500 mt-1">Latency: {s.latency}</div>
        </div>
      ))}
    </div>

    <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center space-y-4">
      <div className="text-slate-500 text-sm">Queue Depths (Global)</div>
      <div className="flex justify-center gap-8">
        <div>
          <div className="text-2xl font-mono">0</div>
          <div className="text-[10px] uppercase text-slate-600">DLQ (Dead Letter)</div>
        </div>
        <div className="h-10 w-px bg-slate-800"></div>
        <div>
          <div className="text-2xl font-mono text-blue-400">1,244</div>
          <div className="text-[10px] uppercase text-slate-600">Pending Events</div>
        </div>
      </div>
    </div>
  </div>
);
