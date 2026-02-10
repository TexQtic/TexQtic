import React, { useEffect, useState } from 'react';
import { getDisputes, DisputeDecision } from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export const DisputeCases: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisputes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getDisputes();
        setDisputes(response.disputes);
      } catch (err) {
        console.error('Failed to load disputes:', err);
        setError('Failed to load dispute data');
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
  }, []);

  if (loading) return <LoadingState message="Loading disputes..." />;
  if (error) return <ErrorState message={error} />;

  if (disputes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Risk & Disputes</h1>
            <p className="text-slate-400 text-sm">
              Mediate conflicts between buyers and suppliers.
            </p>
          </div>
        </div>
        <EmptyState message="No dispute decisions recorded yet" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Risk & Disputes</h1>
          <p className="text-slate-400 text-sm">Mediate conflicts between buyers and suppliers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {disputes.map(c => (
          <div
            key={c.eventId}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${c.status === 'RESOLVED' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}
              >
                {c.decision}
              </div>
              <div className="text-xs text-slate-500 font-mono">{c.id.slice(0, 8)}...</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-100">Dispute {c.id.slice(0, 8)}</h3>
              {c.resolution && (
                <p className="text-sm text-slate-400 leading-relaxed italic">"{c.resolution}"</p>
              )}
              {c.notes && <p className="text-sm text-slate-500">{c.notes}</p>}
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${c.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                ></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                {new Date(c.decidedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
