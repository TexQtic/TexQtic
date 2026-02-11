import React, { useEffect, useState } from 'react';
import { getComplianceRequests, ComplianceDecision } from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export const ComplianceQueue: React.FC = () => {
  const [requests, setRequests] = useState<ComplianceDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getComplianceRequests();
        setRequests(response.requests);
      } catch (err) {
        console.error('Failed to load compliance requests:', err);
        setError('Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (loading) return <LoadingState message="Loading compliance data..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Trust & Compliance</h1>
          <p className="text-slate-400 text-sm">
            Review merchant credentials and business certifications.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            title="No compliance decisions"
            message="No compliance decisions recorded yet"
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Request ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Decision</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Decided At</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(req => (
                <tr key={req.eventId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {req.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                    >
                      {req.decision}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(req.decidedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{req.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
