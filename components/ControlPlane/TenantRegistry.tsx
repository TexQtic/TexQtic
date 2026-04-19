import React, { useState, useEffect } from 'react';
import { getTenantById, getTenants, provisionTenant, Tenant } from '../../services/controlPlaneService';
import {
  TenantStatus,
  TenantConfig,
  normalizeCommercialPlan,
  type CommercialPlan,
} from '../../types';
import { EmptyState, ErrorState, TenantRowSkeleton } from '../shared';
import { APIError } from '../../services/apiClient';

interface TenantRegistryProps {
  lifecycleView: 'ACTIVE' | 'INVITED' | 'CLOSED';
  onSelectTenant: (tenant: TenantConfig) => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

interface ControlPlaneIdentityPresentation {
  baseFamilyOrInternalCategory: string;
  capabilityOrOverlayPosture: string;
}

const resolveControlPlaneTenantCategory = (
  tenantCategory: string | null | undefined,
  fallbackType?: string | null,
) => {
  const normalized = (tenantCategory ?? fallbackType ?? '').trim().toUpperCase();

  return normalized || null;
};

const buildControlPlaneIdentityPresentation = ({
  tenantCategory,
  fallbackType,
  isWhiteLabel,
}: {
  tenantCategory: string | null | undefined;
  fallbackType?: string | null;
  isWhiteLabel: boolean;
}): ControlPlaneIdentityPresentation => {
  const resolvedCategory = resolveControlPlaneTenantCategory(tenantCategory, fallbackType);
  const posture: string[] = [];

  if (resolvedCategory === 'AGGREGATOR') {
    posture.push('Aggregator workspace');
  }

  if (isWhiteLabel) {
    posture.push('White-label overlay');
  }

  return {
    baseFamilyOrInternalCategory:
      resolvedCategory === 'B2B' || resolvedCategory === 'B2C' || resolvedCategory === 'INTERNAL'
        ? resolvedCategory
        : 'Not surfaced in current control-plane read model',
    capabilityOrOverlayPosture:
      posture.length > 0 ? posture.join(' + ') : 'No additional capability or overlay surfaced',
  };
};

export const TenantRegistry: React.FC<TenantRegistryProps> = ({
  lifecycleView,
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
    plan: '' as '' | CommercialPlan,
    tenant_category: 'B2B' as 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL',
    is_white_label: false,
  });
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] = useState<{
    orgId: string;
    slug: string;
    inviteToken?: string;
  } | null>(null);
  const [detailLoadingTenantId, setDetailLoadingTenantId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  type TenantSelectionConfig = TenantConfig & {
    createdAt?: string;
    updatedAt?: string;
  };

  // RU-002: Handle provision form submission
  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!provisionForm.plan) {
      setProvisionError('Select a canonical plan.');
      return;
    }

    setProvisionLoading(true);
    setProvisionError(null);
    setProvisionResult(null);
    try {
      // Backend derives slug server-side from orgName via slugify() — no client slug needed.
      const result = await provisionTenant({
        orgName: provisionForm.orgName,
        primaryAdminEmail: provisionForm.primaryAdminEmail,
        primaryAdminPassword: provisionForm.primaryAdminPassword,
        plan: provisionForm.plan,
        tenant_category: provisionForm.tenant_category,
        is_white_label: provisionForm.is_white_label,
      });
      setProvisionResult({ orgId: result.orgId, slug: result.slug });
      setProvisionForm({
        orgName: '',
        primaryAdminEmail: '',
        primaryAdminPassword: '',
        plan: '',
        tenant_category: 'B2B',
        is_white_label: false,
      });
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
    setDetailError(null);

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

  const resolveRegistryTenantIdentity = (tenant: Tenant) => tenant.tenant_category ?? tenant.type;

  const mapToTenantConfig = (tenant: Tenant): TenantSelectionConfig => {
    const resolvedTenantIdentity = resolveRegistryTenantIdentity(tenant);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      type: resolvedTenantIdentity as TenantConfig['type'],
      status: (tenant.status?.toUpperCase() || 'ACTIVE') as TenantStatus,
      onboarding_status: tenant.onboarding_status ?? null,
      plan: normalizeCommercialPlan(tenant.plan),
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
      tenant_category: resolvedTenantIdentity,
      is_white_label: tenant.is_white_label ?? tenant.isWhiteLabel ?? false,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    setDetailLoadingTenantId(tenant.id);
    setDetailError(null);

    try {
      const response = await getTenantById(tenant.id);
      onSelectTenant(mapToTenantConfig(response.tenant));
    } catch (err: any) {
      console.error('Failed to load tenant detail:', err);
      setDetailError(err?.message || 'Failed to open tenant details. Please try again.');
    } finally {
      setDetailLoadingTenantId(current => (current === tenant.id ? null : current));
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
      case 'CLOSED':
        return 'text-slate-300 bg-slate-400/10 border-slate-400/20';
      case 'TRIAL':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  // Compute stats from actual tenant data
  const stats = {
    total: tenants.length,
    active: tenants.filter(
      t => t.status?.toUpperCase() !== 'CLOSED' && !t.has_pending_first_owner_preparation_invite
    ).length,
    invited: tenants.filter(t => t.has_pending_first_owner_preparation_invite === true).length,
    closed: tenants.filter(t => t.status?.toUpperCase() === 'CLOSED').length,
  };

  const activeTenants = tenants.filter(
    t => t.status?.toUpperCase() !== 'CLOSED' && !t.has_pending_first_owner_preparation_invite
  );
  const invitedTenants = tenants.filter(t => t.has_pending_first_owner_preparation_invite === true);
  const closedTenants = tenants.filter(t => t.status?.toUpperCase() === 'CLOSED');

  const currentView = (() => {
    switch (lifecycleView) {
      case 'INVITED':
        return {
          title: 'Invited Tenants',
          description:
            'Tenants that still satisfy the pending first-owner preparation invite classifier.',
          count: invitedTenants.length,
          tenantList: invitedTenants,
          emptyMessage: 'No invited tenants are currently visible.',
        };
      case 'CLOSED':
        return {
          title: 'Closed Tenants',
          description: 'Tenants whose lifecycle status is CLOSED.',
          count: closedTenants.length,
          tenantList: closedTenants,
          emptyMessage: 'No closed tenants are currently visible.',
        };
      default:
        return {
          title: 'Active Tenants',
          description:
            'Tenants whose lifecycle status is not CLOSED and that do not currently satisfy the invited classifier.',
          count: activeTenants.length,
          tenantList: activeTenants,
          emptyMessage: 'No active tenants are currently visible.',
        };
    }
  })();

  const renderTenantTable = (tenantList: Tenant[]) => (
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
          {tenantList.map(tenant => {
            const mappedTenant = mapToTenantConfig(tenant);
            const identityPresentation = buildControlPlaneIdentityPresentation({
              tenantCategory: tenant.tenant_category,
              fallbackType: tenant.type,
              isWhiteLabel: tenant.is_white_label ?? tenant.isWhiteLabel ?? false,
            });
            const aiUsagePercent = mappedTenant.aiBudget
              ? (mappedTenant.aiUsage / mappedTenant.aiBudget) * 100
              : 0;
            const isDetailLoading = detailLoadingTenantId === tenant.id;
            const canImpersonate = tenant.status?.toUpperCase() === 'ACTIVE';

            return (
              <tr
                key={tenant.id}
                className={`hover:bg-slate-800/30 transition-colors group ${isDetailLoading ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  void handleSelectTenant(tenant);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleSelectTenant(tenant);
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
                  <div className="text-xs text-slate-300 font-bold">{mappedTenant.plan}</div>
                  <div className="mt-1 space-y-1 text-[9px] text-slate-500">
                    <div>
                      <span className="font-bold uppercase tracking-[0.16em] text-slate-600">
                        Base/Internal
                      </span>{' '}
                      {identityPresentation.baseFamilyOrInternalCategory}
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-[0.16em] text-slate-600">
                        Capability/Overlay
                      </span>{' '}
                      {identityPresentation.capabilityOrOverlayPosture}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <svg
                    aria-hidden="true"
                    className="block h-1 w-full max-w-[100px]"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 1"
                  >
                    <rect className="fill-slate-800" height="1" rx="0.5" ry="0.5" width="100" x="0" y="0" />
                    <rect
                      className={aiUsagePercent > 80 ? 'fill-rose-500' : 'fill-blue-500'}
                      height="1"
                      rx="0.5"
                      ry="0.5"
                      width={Math.min(aiUsagePercent, 100)}
                      x="0"
                      y="0"
                    />
                  </svg>
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
                      onClick={() => {
                        void handleSelectTenant(tenant);
                      }}
                      title="Config"
                      className="p-1 hover:text-white text-slate-500"
                      disabled={isDetailLoading}
                    >
                      {isDetailLoading ? '…' : '⚙️'}
                    </button>
                    <button
                      onClick={() => onImpersonate(mappedTenant)}
                      title="Impersonate"
                      className="p-1 text-slate-500 hover:text-blue-500 disabled:cursor-not-allowed disabled:text-slate-700"
                      disabled={isDetailLoading || !canImpersonate}
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
  );

  // Error state
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentView.title}</h1>
            <p className="text-slate-400 text-sm">{currentView.description}</p>
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
          <h1 className="text-2xl font-bold text-white">{currentView.title}</h1>
          <p className="text-slate-400 text-sm">{currentView.description}</p>
        </div>
        <button
          onClick={() => {
            setShowProvisionModal(true);
            setProvisionResult(null);
            setProvisionError(null);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-tight hover:bg-indigo-700 transition"
        >
          Provision New Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Tenants', value: loading ? '...' : stats.total.toString() },
          { label: 'Active', value: loading ? '...' : stats.active.toString() },
          { label: 'Invited', value: loading ? '...' : stats.invited.toString() },
          { label: 'Closed', value: loading ? '...' : stats.closed.toString() },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {stat.label}
            </div>
            <div className="text-xl font-bold text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

      {detailError && !loading && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {detailError}
        </div>
      )}

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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
                {currentView.title}
              </h2>
              <p className="text-xs text-slate-500">{currentView.description}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
              {currentView.count}
            </div>
          </div>
          {currentView.tenantList.length > 0 ? (
            renderTenantTable(currentView.tenantList)
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">
              {currentView.emptyMessage}
            </div>
          )}
        </div>
      )}

      {/* RU-002: Provision New Tenant Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold">Provision New Tenant</h2>
              <p className="text-sm text-slate-500 mt-1">
                Creates a new tenant organisation and provisions the primary owner account with an
                OWNER membership.
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
                  <strong>Authoritative handoff:</strong> The provisioned primary owner should enter
                  through the tenant sign-in flow using the provisioned email and password once
                  onboarding has been approved and the tenant has been activated to{' '}
                  <code className="font-mono">ACTIVE</code>.
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
                  <strong>Separate path only:</strong> Invite-token activation remains available for
                  explicit invite-based membership flows, but it is not the default handoff for the
                  already provisioned primary owner.
                </div>
                <button
                  onClick={() => {
                    setShowProvisionModal(false);
                    setProvisionResult(null);
                  }}
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
                  <label htmlFor="prov-org-name" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Org Name *
                  </label>
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
                  <label htmlFor="prov-owner-email" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Owner Email *
                  </label>
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
                  <label htmlFor="prov-owner-pwd" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Owner Password *
                  </label>
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
                  <label htmlFor="prov-plan" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Commercial Plan *
                  </label>
                  <select
                    id="prov-plan"
                    required
                    value={provisionForm.plan}
                    onChange={e =>
                      setProvisionForm(f => ({
                        ...f,
                        plan: e.target.value as '' | CommercialPlan,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" disabled>
                      Select canonical plan
                    </option>
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="prov-tenant-category" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Tenant Category *
                  </label>
                  <select
                    id="prov-tenant-category"
                    required
                    value={provisionForm.tenant_category}
                    onChange={e =>
                      setProvisionForm(f => ({
                        ...f,
                        tenant_category: e.target.value as
                          | 'AGGREGATOR'
                          | 'B2B'
                          | 'B2C'
                          | 'INTERNAL',
                      }))
                    }
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
                  <label htmlFor="prov-is-white-label" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    White Label Deployment
                  </label>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProvisionModal(false);
                      setProvisionError(null);
                    }}
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