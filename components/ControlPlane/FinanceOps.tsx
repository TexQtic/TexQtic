import React, { useEffect, useState } from 'react';
import { getPayouts, PayoutDecision } from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export const FinanceOps: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getPayouts();
        setPayouts(response.payouts);
      } catch (err) {
        console.error('Failed to load payouts:', err);
        setError('Failed to load payout data');
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, []);

  if (loading) return <LoadingState message="Loading finance operations..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Oversight</h1>
          <p className="text-slate-400 text-sm">
            Commission rules, fee adjustments, and payout approvals.
          </p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">
          Adjust Fee Rules
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Decided Payouts</h3>
          <div className="text-3xl font-bold">{payouts.length}</div>
          <div className="text-xs text-slate-400 mt-2">Authority decisions recorded</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Approved</h3>
          <div className="text-3xl font-bold text-emerald-400">
            {payouts.filter(p => p.status === 'APPROVED').length}
          </div>
          <div className="text-xs text-slate-400 mt-2">Payout approvals</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Rejected</h3>
          <div className="text-3xl font-bold text-rose-400">
            {payouts.filter(p => p.status === 'REJECTED').length}
          </div>
          <div className="text-xs text-slate-400 mt-2">Payout rejections</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
          Payout Authority Decisions
        </div>
        {payouts.length === 0 ? (
          <EmptyState title="No payout decisions" message="No payout decisions recorded yet" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Payout ID</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Decision</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Decided At</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payouts.map(p => (
                <tr key={p.eventId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {p.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                    >
                      {p.decision}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(p.decidedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{p.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
