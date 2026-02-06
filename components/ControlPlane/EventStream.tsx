
import React, { useState, useEffect } from 'react';

interface PlatformEvent {
  id: string;
  type: string;
  domain: string;
  payload: string;
  timestamp: string;
}

export const EventStream: React.FC = () => {
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  useEffect(() => {
    const eventTypes = [
      { type: 'TENANT_PROVISIONED', domain: 'Identity' },
      { type: 'ORDER_PLACED', domain: 'Commerce' },
      { type: 'CATALOG_UPDATED', domain: 'Catalog' },
      { type: 'LOGISTICS_TRACKING_SYNC', domain: 'SupplyChain' },
      { type: 'AI_INSIGHT_GENERATED', domain: 'Intelligence' },
      { type: 'COMPLIANCE_APPROVED', domain: 'Trust' },
    ];

    const interval = setInterval(() => {
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const newEvent: PlatformEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: randomType.type,
        domain: randomType.domain,
        payload: JSON.stringify({ tenantId: 't' + Math.floor(Math.random() * 10), action: 'SystemUpdate' }),
        timestamp: new Date().toLocaleTimeString(),
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 15));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Event Stream</h1>
          <p className="text-slate-400 text-sm">Real-time trace of the platform's event-driven backbone.</p>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-full animate-pulse uppercase">
          Live Monitoring
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
        <div className="bg-slate-800/50 p-3 border-b border-slate-800 flex justify-between text-slate-500">
          <span>EVENT_ID</span>
          <span>DOMAIN</span>
          <span>TYPE</span>
          <span>PAYLOAD</span>
          <span>TIMESTAMP</span>
        </div>
        <div className="divide-y divide-slate-800 h-[500px] overflow-y-auto">
          {events.map(ev => (
            <div key={ev.id} className="p-3 flex justify-between hover:bg-slate-800/30 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-slate-500 w-24">{ev.id}</span>
              <span className="text-blue-400 w-24">[{ev.domain}]</span>
              <span className="text-rose-400 w-48 font-bold">{ev.type}</span>
              <span className="text-slate-300 flex-1 truncate px-4">{ev.payload}</span>
              <span className="text-slate-500 w-24 text-right">{ev.timestamp}</span>
            </div>
          ))}
          {events.length === 0 && <div className="p-12 text-center text-slate-600">Waiting for incoming event signals...</div>}
        </div>
      </div>
    </div>
  );
};
