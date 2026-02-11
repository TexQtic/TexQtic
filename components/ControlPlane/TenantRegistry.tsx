import React, { useState, useEffect } from 'react';
import { getTenants, Tenant } from '../../services/controlPlaneService';
import { TenantStatus, TenantConfig } from '../../types';
import { LoadingState, EmptyState, ErrorState, TenantRowSkeleton } from '../shared';
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
          disabled
          className="bg-slate-100 text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tight opacity-50 cursor-not-allowed"
          title="Provision actions will be enabled in Wave 5"
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
    </div>
  );
};
