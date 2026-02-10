import React, { useState, useEffect, useCallback } from 'react';
import { getEvents, EventLog } from '../../services/controlPlaneService';
import { LoadingState, EmptyState, ErrorState } from '../shared';
import { APIError } from '../../services/apiClient';

export const EventStream: React.FC = () => {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const fetchEvents = useCallback(async () => {
    // Don't fetch if document is hidden (tab inactive) - save resources
    if (document.hidden) {
      return;
    }

    try {
      const response = await getEvents({ limit: 30 });
      setEvents(response.events);
      setLoading(false);
      setError(null);
      setFailedAttempts(0);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Failed to load events:', err);
      
      const failureCount = failedAttempts + 1;
      setFailedAttempts(failureCount);
      
      if (loading) {
        // First load failed - show error state
        if (err instanceof APIError) {
          setError(err);
        } else {
          setError({
            status: 0,
            message: 'Failed to load events. Please try again.',
            code: 'UNKNOWN_ERROR',
          } as APIError);
        }
        setLoading(false);
      } else {
        // Polling failed - show disconnected indicator but keep existing data
        setError({
          status: 0,
          message: 'Disconnected. Retrying...',
          code: 'POLLING_FAILED',
        } as APIError);
      }
    }
  }, [loading, failedAttempts]);

  useEffect(() => {
    // Initial fetch
    fetchEvents();

    // Poll for new events every 5 seconds
    const interval = setInterval(fetchEvents, 5000);

    // Pause polling when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPolling(false);
      } else {
        setIsPolling(true);
        // Fetch immediately when tab becomes visible again
        fetchEvents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchEvents]);

  // Initial loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Event Stream</h1>
          <p className="text-slate-400 text-sm">
            Real-time trace of the platform's event-driven backbone.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <LoadingState message="Connecting to event stream..." />
        </div>
      </div>
    );
  }

  // Error state (first load)
  if (error && events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Event Stream</h1>
          <p className="text-slate-400 text-sm">
            Real-time trace of the platform's event-driven backbone.
          </p>
        </div>
        <ErrorState error={error} onRetry={fetchEvents} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Event Stream</h1>
          <p className="text-slate-400 text-sm">
            Real-time trace of the platform's event-driven backbone.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetchTime && (
            <span className="text-slate-500 text-xs">
              Last update: {lastFetchTime.toLocaleTimeString()}
            </span>
          )}
          {!document.hidden && isPolling && !error && (
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-full animate-pulse uppercase">
              Live Monitoring
            </div>
          )}
          {!isPolling && (
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold rounded-full uppercase">
              Paused (Tab Inactive)
            </div>
          )}
          {error && error.code === 'POLLING_FAILED' && (
            <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold rounded-full uppercase">
              Disconnected • Retrying...
            </div>
          )}
        </div>
      </div>
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
