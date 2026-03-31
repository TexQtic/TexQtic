
import React, { useState } from 'react';
import { TenantConfig } from '../../types';
import { activateApprovedOnboarding } from '../../services/controlPlaneService';

type TenantDetailsTabId = 'OVERVIEW' | 'PLAN' | 'FEATURES' | 'BILLING' | 'RISK' | 'AUDIT';

type TenantDetailsTabState = 'FULL' | 'LIMITED' | 'PREVIEW' | 'SEPARATE';

interface TenantDetailsProps {
  tenant: TenantConfig;
  onBack: () => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

export const TenantDetails: React.FC<TenantDetailsProps> = ({ tenant, onBack, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<TenantDetailsTabId>('OVERVIEW');
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(tenant.onboarding_status ?? null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationNotice, setActivationNotice] = useState<string | null>(null);
  const tenantCreatedAt = getTenantCreatedAtDisplay(tenant);

  const canActivateApproved = onboardingStatus === 'VERIFICATION_APPROVED';

  const handleActivateApproved = async () => {
    setActivationLoading(true);
    setActivationError(null);
    setActivationNotice(null);

    try {
      const result = await activateApprovedOnboarding(tenant.id);
      setOnboardingStatus(result.tenant.status);
      setActivationNotice(
        'Approved onboarding activation recorded. Tenant is now ACTIVE. The provisioned primary owner should now use tenant sign-in with the provisioned credentials; invite-token activation remains a separate invite-based path.'
      );
    } catch (error: any) {
      setActivationError(error?.message || 'Failed to activate approved onboarding state.');
    } finally {
      setActivationLoading(false);
    }
  };

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', state: 'FULL', note: 'Live' },
    { id: 'PLAN', label: 'Plan & Quotas', state: 'LIMITED', note: 'Limited' },
    { id: 'FEATURES', label: 'Feature Flags', state: 'LIMITED', note: 'Limited' },
    { id: 'BILLING', label: 'Billing', state: 'PREVIEW', note: 'Preview' },
    { id: 'RISK', label: 'Risk & Compliance', state: 'PREVIEW', note: 'Preview' },
    { id: 'AUDIT', label: 'Audit Log', state: 'SEPARATE', note: 'Separate' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Core Identity</h3>
                <div className="space-y-4 text-sm">
                  <DetailItem label="Full Name" value={tenant.name} />
                  <DetailItem label="Slug" value={tenant.slug} />
                  <DetailItem label="Tenant ID" value={tenant.id} />
                  <DetailItem label="Onboarding Status" value={onboardingStatus ?? 'N/A'} />
                  {tenantCreatedAt && <DetailItem label="Created At" value={tenantCreatedAt} />}
                </div>
                <div className="mt-4 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                  This overview supports tenant inspection, approved activation when eligible, and bounded impersonation entry only.
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Branding Config</h3>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-4xl border border-slate-700">
                    {tenant.theme.logo}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: tenant.theme.primaryColor }}></div>
                      <span className="text-xs font-mono">{tenant.theme.primaryColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: tenant.theme.secondaryColor }}></div>
                      <span className="text-xs font-mono">{tenant.theme.secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Lifecycle Management</h3>
                <div className="space-y-3">
                  {canActivateApproved && (
                    <button
                      onClick={handleActivateApproved}
                      disabled={activationLoading}
                      className="w-full py-2 bg-emerald-600 text-white rounded font-bold text-xs uppercase transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-700"
                    >
                      {activationLoading ? 'Activating Approved Tenant...' : 'Activate Approved Tenant'}
                    </button>
                  )}
                  <div className="space-y-2 rounded border border-dashed border-slate-700/80 bg-slate-950/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Other lifecycle actions are not available in this surface.
                    </div>
                    <button
                      disabled
                      aria-disabled="true"
                      className="w-full cursor-not-allowed rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 opacity-70"
                    >
                      Reinstate Tenant
                    </button>
                    <button
                      disabled
                      aria-disabled="true"
                      className="w-full cursor-not-allowed rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 opacity-70"
                    >
                      Suspend Tenant
                    </button>
                    <button
                      disabled
                      aria-disabled="true"
                      className="w-full cursor-not-allowed rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 opacity-70"
                    >
                      Delete Tenant
                    </button>
                  </div>
                </div>
                {activationError && (
                  <div className="mt-4 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {activationError}
                  </div>
                )}
                {activationNotice && (
                  <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    {activationNotice}
                  </div>
                )}
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                 <div className={`text-4xl font-black mb-1 ${tenant.riskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{tenant.riskScore}</div>
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Score Preview</div>
                 <div className="mt-4 text-[11px] text-slate-400">Detailed risk reporting is not available in this surface.</div>
              </div>
            </div>
          </div>
        );
      case 'PLAN':
        return renderTabNoticePanel({
          title: 'Plan & Quotas',
          state: 'Limited',
          message: 'Plan and quota depth is not launch-ready in this tenant deep-dive.',
          detail: 'Use this view as an overview only; deeper plan administration is outside this surface.',
        });
      case 'FEATURES':
        return renderTabNoticePanel({
          title: 'Feature Flags',
          state: 'Limited',
          message: 'Feature-flag management is not exposed as a complete operator workflow here.',
          detail: 'This tenant deep-dive does not provide launch-cleared feature flag administration depth.',
        });
      case 'BILLING':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-8 animate-in slide-in-from-right-4 duration-300">
             <div className="space-y-3">
               <div className="flex flex-wrap items-center gap-3">
                 <div className="text-xl font-bold">Billing Snapshot: <span className={tenant.billingStatus === 'CURRENT' ? 'text-emerald-400' : 'text-rose-500'}>{tenant.billingStatus}</span></div>
                 <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</span>
               </div>
               <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                 Billing values shown here are a tenant-detail snapshot only. Statement generation and invoice workflow handling are not available in this surface.
               </div>
             </div>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Displayed MTR</div>
                  <div className="text-xl font-bold">$1,450.00</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Displayed Invoice State</div>
                  <div className="text-xl font-bold text-slate-400">Paid</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Displayed Usage</div>
                  <div className="text-xl font-bold text-amber-400">$215.10</div>
                </div>
             </div>
          </div>
        );
      case 'RISK':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-white">Risk Snapshot</h3>
              <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</span>
            </div>
            <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              This tenant deep-dive shows a limited risk snapshot only. Detailed risk reporting and follow-up actions are not available in this surface.
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
              <div className={`text-4xl font-black mb-2 ${tenant.riskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{tenant.riskScore}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Displayed Risk Score</div>
            </div>
          </div>
        );
      case 'AUDIT':
        return renderTabNoticePanel({
          title: 'Audit Scope',
          state: 'Separate Surface',
          message: 'Detailed audit review lives in the separate Audit Logs area.',
          detail: 'This tenant deep-dive does not provide parity with the dedicated read-only audit surface.',
        });
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition">← Back</button>
        <div className="h-4 w-px bg-slate-800"></div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          {tenant.theme.logo} {tenant.name}
          <span className="text-xs font-normal text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{tenant.id}</span>
        </h1>
        <button onClick={() => onImpersonate(tenant)} className="ml-auto bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-blue-700 transition">Impersonate Tenant</button>
      </div>

      <div className="flex border-b border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TenantDetailsTabId)}
            className={`flex flex-col items-start gap-1 px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-rose-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <span>{tab.label}</span>
            {tab.id !== 'OVERVIEW' && (
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${getTabBadgeClass(tab.state as TenantDetailsTabState)}`}>
                {tab.note}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-500">{label}</span>
    <span className="font-mono text-slate-300">{value}</span>
  </div>
);

const getTenantCreatedAtDisplay = (tenant: TenantConfig) => {
  const createdAt = (tenant as TenantConfig & { createdAt?: string | null }).createdAt;

  if (!createdAt) {
    return null;
  }

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return createdAt;
  }

  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const getTabBadgeClass = (state: TenantDetailsTabState) => {
  switch (state) {
    case 'FULL':
      return 'border-emerald-500/30 text-emerald-300';
    case 'LIMITED':
      return 'border-amber-500/30 text-amber-300';
    case 'PREVIEW':
      return 'border-sky-500/30 text-sky-300';
    case 'SEPARATE':
      return 'border-slate-600 text-slate-300';
    default:
      return 'border-slate-700 text-slate-400';
  }
};

const renderTabNoticePanel = ({
  title,
  state,
  message,
  detail,
}: {
  title: string;
  state: string;
  message: string;
  detail: string;
}) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 animate-in slide-in-from-right-4 duration-300">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{state}</span>
    </div>
    <div className="mt-4 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
      {message}
    </div>
    <div className="mt-3 text-sm text-slate-400">{detail}</div>
  </div>
);
