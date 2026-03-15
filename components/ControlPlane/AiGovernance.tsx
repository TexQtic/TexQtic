import React, { useEffect, useState } from 'react';
import {
  getTenants,
  Tenant,
  requestControlPlaneAiInsights,
  ControlPlaneAiInsightsResponse,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export const AiGovernance: React.FC = () => {
  // Page-level tenant data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Insights panel state
  const [targetOrgId, setTargetOrgId] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<{
    status?: number;
    message?: string;
    code?: string;
  } | null>(null);
  const [insightResult, setInsightResult] = useState<ControlPlaneAiInsightsResponse | null>(null);

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

  const handleRequestInsights = async () => {
    setInsightLoading(true);
    setInsightError(null);
    setInsightResult(null);
    try {
      const payload = targetOrgId.trim() ? { targetOrgId: targetOrgId.trim() } : {};
      const result = await requestControlPlaneAiInsights(payload);
      setInsightResult(result);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message ?? 'Failed to fetch AI insights';
      const code = err?.code;
      setInsightError({ status, message, code });
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading AI governance data..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Governance Center</h1>
          <p className="text-slate-400 text-sm">
            Monitor token usage, manage prompts, and enforce budgets.
          </p>
        </div>
      </div>

      {/* G-028-C5: Control-Plane AI Insights */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div>
          <h3 className="font-bold text-white">Control-Plane AI Insights</h3>
          <p className="text-slate-400 text-xs mt-1">
            Request platform-wide or org-targeted AI insights. SUPER_ADMIN only.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="ai-target-org-id"
              className="block text-[10px] font-bold uppercase text-slate-500 mb-1"
            >
              Target Org ID (optional)
            </label>
            <input
              id="ai-target-org-id"
              type="text"
              value={targetOrgId}
              onChange={e => setTargetOrgId(e.target.value)}
              placeholder="Leave blank for platform-global insights"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              disabled={insightLoading}
            />
          </div>
          <button
            onClick={handleRequestInsights}
            disabled={insightLoading}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {insightLoading ? 'Requesting…' : 'Request Insights'}
          </button>
        </div>

        {insightLoading && <LoadingState message="Fetching AI insights..." size="sm" />}

        {insightError && !insightLoading && (
          <ErrorState error={insightError} onRetry={handleRequestInsights} />
        )}

        {insightResult && !insightLoading && (
          <div className="space-y-3">
            {insightResult.targetOrg && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>
                  Org:{' '}
                  <span className="text-slate-200 font-semibold">{insightResult.targetOrg.name}</span>
                </span>
                <span>·</span>
                <span>
                  Type: <span className="text-slate-300">{insightResult.targetOrg.type}</span>
                </span>
                <span>·</span>
                <span>
                  Status: <span className="text-slate-300">{insightResult.targetOrg.status}</span>
                </span>
              </div>
            )}
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">AI Insight</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {insightResult.insight}
              </p>
            </div>
            {insightResult.generatedAt && (
              <p className="text-[10px] text-slate-600">
                Generated: {new Date(insightResult.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
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
          <EmptyState title="No tenants found" message="No tenants available to display" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Tenant</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Monthly Limit</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Current Usage</th>
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
                    {t.aiBudget ? `${t.aiBudget.currentUsage.toLocaleString()} used` : '—'}
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
