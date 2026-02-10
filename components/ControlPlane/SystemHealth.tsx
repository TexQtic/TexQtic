import React, { useEffect, useState } from 'react';
import { getSystemHealth, SystemHealthResponse } from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSystemHealth();
      setHealth(response);
    } catch (err) {
      console.error('Failed to load system health:', err);
      setError('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) return <LoadingState message="Loading system health..." />;
  if (error) return <ErrorState message={error} />;
  if (!health) return <ErrorState message="No health data available" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">System Status</h1>
          <p className="text-slate-400 text-sm">Real-time health of core platform services.</p>
        </div>
        <button onClick={fetchHealth} className="text-xs font-bold text-blue-400 hover:underline">
          Refresh Vitals
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {health.services.map(s => (
          <div key={s.name} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {s.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${s.status === 'UP' ? 'bg-emerald-500' : 'bg-amber-500'}`}
              ></span>
            </div>
            <div className="text-xl font-bold text-slate-100">{s.status}</div>
            <div className="text-xs text-slate-500 mt-1">
              Last Check: {new Date(s.lastCheck).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center space-y-4">
        <div className="text-slate-500 text-sm">Overall System Status</div>
        <div className="flex justify-center gap-8">
          <div>
            <div
              className={`text-2xl font-mono ${health.overall === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {health.overall}
            </div>
            <div className="text-[10px] uppercase text-slate-600">Platform State</div>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div>
            <div className="text-2xl font-mono text-slate-400">
              {new Date(health.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-[10px] uppercase text-slate-600">Last Updated</div>
          </div>
        </div>
      </div>
    </div>
  );
};
