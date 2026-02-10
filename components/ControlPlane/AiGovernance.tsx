import React, { useEffect, useState } from 'react';
import { getTenants, Tenant } from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export const AiGovernance: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTenants();
        setTenants(response.tenants);
      } catch (err) {
        console.error('Failed to load tenants:', err);
        setError('Failed to load tenant data');
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  if (loading) return <LoadingState message="Loading AI governance data..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Governance Center</h1>
          <p className="text-slate-400 text-sm">
            Monitor token usage, manage prompts, and enforce budgets.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-rose-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">
            AI Kill Switch
          </button>
          <button className="bg-slate-100 text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase">
            Registry
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h3 className="font-bold">Prompt Versioning Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Product Enrichment v4.2',
            'Negotiation Strategist v1.1',
            'Logistics Optimizer v3.0',
          ].map(p => (
            <div
              key={p}
              className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center"
            >
              <span className="text-sm font-mono text-blue-400">{p}</span>
              <span className="text-[10px] bg-slate-800 px-2 py-1 rounded">ACTIVE</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
          Tenant Usage & Budgets
        </div>
        {tenants.length === 0 ? (
          <EmptyState message="No tenants found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Tenant</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Monthly Limit</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Hard Stop</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-bold text-slate-200">{t.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-400">
                    {t.aiBudget ? t.aiBudget.monthlyLimit.toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">
                    {t.aiBudget ? (t.aiBudget.hardStop ? 'Yes' : 'No') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-slate-400 hover:text-white text-xs uppercase font-bold">
                      Adjust Cap
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
