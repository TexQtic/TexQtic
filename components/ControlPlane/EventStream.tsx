import React, { useState, useEffect } from 'react';
import { getEvents, EventLog } from '../../services/controlPlaneService';

export const EventStream: React.FC = () => {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await getEvents({ limit: 30 });
        setEvents(response.events);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load events:', err);
        setError(err.message || 'Failed to load events');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchEvents();

    // Poll for new events every 5 seconds
    const interval = setInterval(fetchEvents, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Event Stream</h1>
          <p className="text-slate-400 text-sm">
            Real-time trace of the platform's event-driven backbone.
          </p>
        </div>
        {!loading && !error && (
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-full animate-pulse uppercase">
            Live Monitoring
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading event stream...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-900/20 border border-rose-800 rounded-xl p-6 text-center">
          <p className="text-rose-400 font-bold">Failed to load events</p>
          <p className="text-slate-400 text-sm mt-2">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
          <div className="bg-slate-800/50 p-3 border-b border-slate-800 flex justify-between text-slate-500">
            <span className="w-32">EVENT_ID</span>
            <span className="w-32">AGGREGATE</span>
            <span className="w-48">NAME</span>
            <span className="flex-1 px-4">PAYLOAD</span>
            <span className="w-40">OCCURRED_AT</span>
          </div>
          <div className="divide-y divide-slate-800 h-[500px] overflow-y-auto">
            {events.map(ev => (
              <div
                key={ev.id}
                className="p-3 flex justify-between hover:bg-slate-800/30 animate-in fade-in duration-200"
              >
                <span className="text-slate-500 w-32 truncate" title={ev.id}>
                  {ev.id.substring(0, 12)}...
                </span>
                <span className="text-blue-400 w-32 truncate">[{ev.aggregateType}]</span>
                <span className="text-rose-400 w-48 font-bold truncate">{ev.name}</span>
                <span className="text-slate-300 flex-1 truncate px-4">
                  {JSON.stringify(ev.payload).substring(0, 80)}...
                </span>
                <span className="text-slate-500 w-40 text-right">
                  {new Date(ev.occurredAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <div className="p-12 text-center text-slate-600">
                Waiting for incoming event signals...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
