import React, { useState, useEffect } from 'react';
import { getTenants, provisionTenant, Tenant } from '../../services/controlPlaneService';
import { TenantStatus, TenantConfig } from '../../types';
import { EmptyState, ErrorState, TenantRowSkeleton } from '../shared';
import { APIError } from '../../services/apiClient';

interface TenantRegistryProps {
  onSelectTenant: (tenant: TenantConfig) => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

export const TenantRegistry: React.FC<TenantRegistryProps> = ({
  onSelectTenant,
  onImpersonate,
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  // RU-002: Provision modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    orgName: '',
    primaryAdminEmail: '',
    primaryAdminPassword: '',
    tenant_category: 'B2B' as 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL',
    is_white_label: false,
  });
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] = useState<{ orgId: string; slug: string; inviteToken?: string } | null>(null);

  // RU-002: Handle provision form submission
  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionLoading(true);
    setProvisionError(null);
    setProvisionResult(null);
    try {
      // Backend derives slug server-side from orgName via slugify() — no client slug needed.
      const result = await provisionTenant({
        orgName: provisionForm.orgName,
        primaryAdminEmail: provisionForm.primaryAdminEmail,
        primaryAdminPassword: provisionForm.primaryAdminPassword,
        tenant_category: provisionForm.tenant_category,
        is_white_label: provisionForm.is_white_label,
      });
      setProvisionResult({ orgId: result.orgId, slug: result.slug });
      setProvisionForm({ orgName: '', primaryAdminEmail: '', primaryAdminPassword: '', tenant_category: 'B2B', is_white_label: false });
      // Refresh tenant list to include newly provisioned tenant
      await fetchTenants();
    } catch (err: any) {
      setProvisionError(err?.message || 'Provisioning failed.');
    } finally {
      setProvisionLoading(false);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getTenants();
      setTenants(response.tenants);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      // Wave 0-A: Handle realm mismatch without network request
      if (err instanceof Error && err.message.startsWith('REALM_MISMATCH')) {
        setError({
          status: 403,
          message: 'This view requires admin privileges. Please log in as admin.',
          code: 'REALM_MISMATCH',
        } as APIError);
      } else if (err instanceof APIError) {
        setError(err);
      } else {
        setError({
          status: 0,
          message: 'Failed to load tenants. Please try again.',
          code: 'UNKNOWN_ERROR',
        } as APIError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const getStatusColor = (status: string) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case 'ACTIVE':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'SUSPENDED':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'TRIAL':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  // Compute stats from actual tenant data
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status?.toUpperCase() === 'ACTIVE').length,
    trial: tenants.filter(t => t.status?.toUpperCase() === 'TRIAL').length,
    suspended: tenants.filter(t => t.status?.toUpperCase() === 'SUSPENDED').length,
  };

  // Map backend Tenant to frontend TenantConfig format for compatibility
  const mapToTenantConfig = (tenant: Tenant): TenantConfig => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    type: tenant.type as any,
    status: (tenant.status?.toUpperCase() || 'ACTIVE') as TenantStatus,
    onboarding_status: tenant.onboarding_status ?? null,
    plan: (tenant.plan === 'BASIC' ? 'TRIAL' : tenant.plan || 'TRIAL') as
      | 'TRIAL'
      | 'PAID'
      | 'ENTERPRISE',
    theme: {
      primaryColor: tenant.branding?.primaryColor || '#4F46E5',
      secondaryColor: '#10B981',
      logo: '🏢',
    },
    features: [],
    aiUsage: tenant.aiBudget?.currentUsage || 0,
    aiBudget: tenant.aiBudget?.monthlyLimit || 1000,
    billingStatus: 'CURRENT',
    riskScore: 0,
  });

  // Error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Tenant Registry</h1>
            <p className="text-slate-400 text-sm">Manage global tenant lifecycle and governance.</p>
          </div>
        </div>
        <ErrorState error={error} onRetry={fetchTenants} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenant Registry</h1>
          <p className="text-slate-400 text-sm">Manage global tenant lifecycle and governance.</p>
        </div>
        <button
          onClick={() => { setShowProvisionModal(true); setProvisionResult(null); setProvisionError(null); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-tight hover:bg-indigo-700 transition"
        >
          Provision New Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: loading ? '...' : stats.total.toString() },
          { label: 'Active (Paid)', value: loading ? '...' : stats.active.toString() },
          { label: 'Suspended', value: loading ? '...' : stats.suspended.toString() },
          { label: 'Trialing', value: loading ? '...' : stats.trial.toString() },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {stat.label}
            </div>
            <div className="text-xl font-bold text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Loading state with skeletons */}
      {loading && (
        <div className="space-y-4">
          <TenantRowSkeleton />
          <TenantRowSkeleton />
          <TenantRowSkeleton />
          <TenantRowSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && tenants.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <EmptyState
            icon="🏢"
            title="No tenants found"
            message="Tenant provisioning will be enabled in Wave 5"
          />
        </div>
      )}

      {/* Data state */}
      {!loading && tenants.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Tenant</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Plan</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">AI Usage</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenants.map(tenant => {
                const mappedTenant = mapToTenantConfig(tenant);
                const aiUsagePercent = mappedTenant.aiBudget
                  ? (mappedTenant.aiUsage / mappedTenant.aiBudget) * 100
                  : 0;

                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTenant(mappedTenant)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTenant(mappedTenant);
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{mappedTenant.theme.logo}</span>
                        <div>
                          <div className="font-bold text-slate-100">{tenant.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {tenant.slug}.texqtic.com
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${getStatusColor(tenant.status)}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-300 font-bold">{tenant.plan}</div>
                      <div className="text-[9px] text-slate-500 uppercase">{tenant.type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full max-w-[100px] bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${aiUsagePercent > 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {Math.round(aiUsagePercent)}% cap
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="flex gap-3"
                        role="presentation"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onSelectTenant(mappedTenant)}
                          title="Config"
                          className="p-1 hover:text-white text-slate-500"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => onImpersonate(mappedTenant)}
                          title="Impersonate"
                          className="p-1 hover:text-blue-500 text-slate-500"
                        >
                          👤
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RU-002: Provision New Tenant Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold">Provision New Tenant</h2>
              <p className="text-sm text-slate-500 mt-1">
                Creates a new tenant organisation and owner account. The owner will receive an invite link.
              </p>
            </div>

            {provisionResult ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="text-emerald-800 font-bold text-sm">✓ Tenant provisioned</div>
                  <div className="text-xs text-slate-600 font-mono">Org ID: {provisionResult.orgId}</div>
                  <div className="text-xs text-slate-600 font-mono">Slug: {provisionResult.slug}.texqtic.com</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                  <strong>Next step:</strong> Use the Invite Member flow within the tenant to generate an invite link for the owner. Share the link:
                  <br /><code className="font-mono">?token={"<invite_token>"}&action=invite</code>
                </div>
                <button
                  onClick={() => { setShowProvisionModal(false); setProvisionResult(null); }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleProvision} className="space-y-4">
                {provisionError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                    {provisionError}
                  </div>
                )}
                <div className="space-y-1">
                  <label htmlFor="prov-org-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Org Name *</label>
                  <input
                    id="prov-org-name"
                    required
                    value={provisionForm.orgName}
                    onChange={e => setProvisionForm(f => ({ ...f, orgName: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Acme Global Inc."
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prov-owner-email" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Owner Email *</label>
                  <input
                    id="prov-owner-email"
                    required
                    type="email"
                    value={provisionForm.primaryAdminEmail}
                    onChange={e => setProvisionForm(f => ({ ...f, primaryAdminEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="owner@acme.com"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prov-owner-pwd" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Owner Password *</label>
                  <input
                    id="prov-owner-pwd"
                    required
                    type="password"
                    minLength={6}
                    value={provisionForm.primaryAdminPassword}
                    onChange={e => setProvisionForm(f => ({ ...f, primaryAdminPassword: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prov-tenant-category" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tenant Category *</label>
                  <select
                    id="prov-tenant-category"
                    required
                    value={provisionForm.tenant_category}
                    onChange={e => setProvisionForm(f => ({ ...f, tenant_category: e.target.value as 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL' }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="AGGREGATOR">AGGREGATOR</option>
                    <option value="INTERNAL">INTERNAL</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="prov-is-white-label"
                    type="checkbox"
                    checked={provisionForm.is_white_label}
                    onChange={e => setProvisionForm(f => ({ ...f, is_white_label: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="prov-is-white-label" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">White Label Deployment</label>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowProvisionModal(false); setProvisionError(null); }}
                    className="flex-1 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisionLoading}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {provisionLoading ? 'Provisioning...' : 'Provision Tenant'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
