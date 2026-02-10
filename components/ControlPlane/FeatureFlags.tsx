import React, { useState, useEffect } from 'react';
import {
  getFeatureFlags,
  upsertFeatureFlag,
  type FeatureFlag,
} from '../../services/controlPlaneService';

export const FeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFeatureFlags();
      setFlags(response.flags);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      setError('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    if (toggling[flag.key]) return; // Prevent concurrent toggles

    setToggling(prev => ({ ...prev, [flag.key]: true }));

    try {
      await upsertFeatureFlag(flag.key, {
        enabled: !flag.enabled,
        description: flag.description || undefined,
      });

      // Update local state
      setFlags(prev => prev.map(f => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f)));
    } catch (err) {
      console.error('Failed to toggle feature flag:', err);
      setError(`Failed to toggle ${flag.key}`);
    } finally {
      setToggling(prev => ({ ...prev, [flag.key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Feature Governance</h1>
        <div className="text-slate-400">Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Governance</h1>
          <p className="text-slate-400 text-sm">
            Control platform capabilities and staged rollouts.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Flag Key</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Description</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px]">Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {flags.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No feature flags found
                </td>
              </tr>
            ) : (
              flags.map(flag => (
                <tr key={flag.key} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-blue-400 font-bold">{flag.key}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-slate-400">{flag.description || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        flag.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {flag.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(flag)}
                      disabled={toggling[flag.key]}
                      className={`w-10 h-5 rounded-full relative p-0.5 transition-colors ${
                        flag.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                      } ${toggling[flag.key] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={flag.enabled ? 'Disable flag' : 'Enable flag'}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${
                          flag.enabled ? 'right-0.5 bg-white' : 'left-0.5 bg-slate-500'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
