
import React, { useState } from 'react';
import { TenantConfig, TenantStatus } from '../../types';
import { activateApprovedOnboarding, archiveTenant } from '../../services/controlPlaneService';

type TenantDetailsTabId = 'OVERVIEW' | 'PLAN' | 'FEATURES' | 'BILLING' | 'RISK' | 'AUDIT';

type TenantDetailsTabState = 'FULL' | 'LIMITED' | 'PREVIEW' | 'SEPARATE';

interface TenantDetailsTab {
  id: TenantDetailsTabId;
  label: string;
  state: TenantDetailsTabState;
  note: string;
}

interface TenantDetailsProps {
  tenant: TenantConfig;
  onBack: () => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

export const TenantDetails: React.FC<TenantDetailsProps> = ({ tenant, onBack, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<TenantDetailsTabId>('OVERVIEW');
  const [tenantStatus, setTenantStatus] = useState<TenantStatus>(tenant.status);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(tenant.onboarding_status ?? null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationNotice, setActivationNotice] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveSlugConfirmation, setArchiveSlugConfirmation] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const tenantCreatedAt = getTenantCreatedAtDisplay(tenant);
  const aiUsagePercent = tenant.aiBudget > 0
    ? Math.min((tenant.aiUsage / tenant.aiBudget) * 100, 100)
    : 0;
  const remainingAiBudget = Math.max(tenant.aiBudget - tenant.aiUsage, 0);
  const lifecycleTenant: TenantConfig = {
    ...tenant,
    status: tenantStatus,
    onboarding_status: onboardingStatus,
  };
  const isProtectedArchiveTarget = isProtectedTenantArchiveTarget(lifecycleTenant);
  const canEnterTenantContext = tenantStatus === TenantStatus.ACTIVE;
  const canActivateApproved = tenantStatus !== TenantStatus.CLOSED && onboardingStatus === 'VERIFICATION_APPROVED';
  const canArchiveTenant =
    !isProtectedArchiveTarget &&
    tenantStatus !== TenantStatus.CLOSED &&
    archiveReason.trim().length > 0 &&
    archiveSlugConfirmation.trim().toLowerCase() === tenant.slug.trim().toLowerCase();

  const handleActivateApproved = async () => {
    setActivationLoading(true);
    setActivationError(null);
    setActivationNotice(null);
    setArchiveError(null);
    setArchiveNotice(null);

    try {
      await activateApprovedOnboarding(tenant.id);
      setTenantStatus(TenantStatus.ACTIVE);
      setOnboardingStatus('ACTIVE');
      setActivationNotice(
        'Approved onboarding activation recorded. Tenant is now ACTIVE. The provisioned primary owner should now use tenant sign-in with the provisioned credentials; invite-token activation remains a separate invite-based path.'
      );
    } catch (error: any) {
      setActivationError(error?.message || 'Failed to activate approved onboarding state.');
    } finally {
      setActivationLoading(false);
    }
  };

  const handleArchiveTenant = async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    setArchiveNotice(null);
    setActivationError(null);
    setActivationNotice(null);

    try {
      const response = await archiveTenant(tenant.id, {
        expectedSlug: tenant.slug,
        reason: archiveReason.trim(),
      });

      setTenantStatus(TenantStatus.CLOSED);
      setOnboardingStatus(response.tenant.onboarding_status ?? 'CLOSED');
      setArchiveNotice(
        `Tenant ${response.tenant.slug} archived. Runtime access and org lifecycle are now CLOSED while audit history remains intact.`
      );
      setArchiveSlugConfirmation(response.tenant.slug);
    } catch (error: any) {
      setArchiveError(error?.message || 'Failed to archive tenant.');
    } finally {
      setArchiveLoading(false);
    }
  };

  let archivePanelContent: React.ReactNode;

  if (isProtectedArchiveTarget) {
    archivePanelContent = (
      <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-200">
        This tenant is on the protected keep-set and cannot be archived from this surface.
      </div>
    );
  } else if (tenantStatus === TenantStatus.CLOSED) {
    archivePanelContent = (
      <div className="rounded border border-slate-700 bg-slate-950/70 px-3 py-3 text-xs text-slate-300">
        This tenant is already archived with runtime and lifecycle state CLOSED.
      </div>
    );
  } else {
    archivePanelContent = (
      <>
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Archive Reason</span>
          <textarea
            value={archiveReason}
            onChange={event => setArchiveReason(event.target.value)}
            rows={3}
            className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-rose-500/60"
            placeholder="Document why this tenant should be archived."
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Type Slug To Confirm</span>
          <input
            value={archiveSlugConfirmation}
            onChange={event => setArchiveSlugConfirmation(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-rose-500/60"
            placeholder={tenant.slug}
          />
        </label>
        <button
          onClick={handleArchiveTenant}
          disabled={!canArchiveTenant || archiveLoading}
          className="w-full rounded bg-rose-700 py-2 text-xs font-bold uppercase text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {archiveLoading ? 'Archiving Tenant...' : 'Archive Tenant To CLOSED'}
        </button>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Confirmation must match <span className="font-mono text-slate-300">{tenant.slug}</span>.
        </div>
      </>
    );
  }

  const tabs: TenantDetailsTab[] = [
    { id: 'OVERVIEW', label: 'Overview', state: 'FULL', note: 'Live' },
    { id: 'PLAN', label: 'Plan & AI Budget', state: 'LIMITED', note: 'Live data' },
    { id: 'FEATURES', label: 'Feature Flags', state: 'LIMITED', note: 'Limited' },
    { id: 'BILLING', label: 'Billing Scope', state: 'LIMITED', note: 'Boundary' },
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
                  <DetailItem label="Runtime Status" value={tenantStatus} />
                  <DetailItem label="Lifecycle Status" value={onboardingStatus ?? 'N/A'} />
                  {tenantCreatedAt && <DetailItem label="Created At" value={tenantCreatedAt} />}
                </div>
                <div className="mt-4 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                  This overview supports tenant inspection, approved activation when eligible, bounded archival to CLOSED, and tenant-context entry only for ACTIVE tenants.
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Branding Snapshot</h3>
                  <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Partial</span>
                </div>
                <div className="mb-4 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                  This panel shows a lightweight branding snapshot only. Displayed logo and colors may include fallback values and do not represent a full branding configuration workflow.
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-4xl border border-slate-700">
                    {tenant.theme.logo}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: tenant.theme.primaryColor }}></div>
                      <span className="text-xs text-slate-500">Displayed primary color</span>
                      <span className="text-xs font-mono text-slate-300">{tenant.theme.primaryColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: tenant.theme.secondaryColor }}></div>
                      <span className="text-xs text-slate-500">Displayed secondary color</span>
                      <span className="text-xs font-mono text-slate-300">{tenant.theme.secondaryColor}</span>
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
                  <div className="rounded border border-slate-700 bg-slate-950/60 p-4 space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Archive Tenant</div>
                    <div className="text-xs text-slate-400">
                      Archive is a bounded control-plane action. It sets both runtime and organization lifecycle state to CLOSED, removing the tenant from ACTIVE sign-in, impersonation, and domain resolution flows without deleting audit history.
                    </div>
                    {archivePanelContent}
                  </div>
                  <div className="space-y-3 rounded border border-dashed border-slate-700/80 bg-slate-950/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Other lifecycle actions are not available in this surface.
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-950/70 px-3 py-3 text-[11px] text-slate-400">
                      <div className="font-semibold uppercase tracking-wide text-slate-500">Unavailable here</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['Reinstate tenant', 'Suspend tenant', 'Delete tenant'].map(action => (
                          <span
                            key={action}
                            className="rounded border border-slate-800 px-2 py-1 font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                        No broad lifecycle suite is available from this deep-dive.
                      </div>
                    </div>
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
                {archiveError && (
                  <div className="mt-4 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {archiveError}
                  </div>
                )}
                {archiveNotice && (
                  <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    {archiveNotice}
                  </div>
                )}
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 text-center">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Visibility</div>
                 <div className="mt-4 rounded border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-5">
                   <div className="text-sm font-bold text-slate-200">Detailed risk scoring is not presented here.</div>
                   <div className="mt-2 text-[11px] text-slate-400">
                     This tenant deep-dive does not provide a tenant-real risk score or launch-ready risk workflow depth.
                   </div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 'PLAN':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-white">Plan & AI Budget</h3>
              <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Limited</span>
            </div>
            <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              This tab shows the current control-plane commercial metadata available in runtime today: canonical plan identity plus AI usage against the configured cap. It does not imply billing-complete administration.
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Commercial Identity</div>
                <div className="mt-4 space-y-4 text-sm">
                  <DetailItem label="Commercial plan" value={tenant.plan} />
                  <DetailItem label="Runtime status" value={tenantStatus} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Budget Visibility</div>
                <div className="mt-4 space-y-4 text-sm">
                  <DetailItem label="Configured cap" value={`${tenant.aiBudget.toLocaleString()} units`} />
                  <DetailItem label="Current usage" value={`${tenant.aiUsage.toLocaleString()} units`} />
                  <DetailItem label="Remaining headroom" value={`${remainingAiBudget.toLocaleString()} units`} />
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${aiUsagePercent > 80 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${aiUsagePercent}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                    {Math.round(aiUsagePercent)}% of configured cap in use
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-6 text-sm text-slate-400">
              Deeper plan administration, billing operations, statements, invoices, and fee-ledger workflows remain outside this surface.
            </div>
          </div>
        );
      case 'FEATURES':
        return renderTabNoticePanel({
          title: 'Feature Flags',
          state: 'Limited',
          message: 'Feature-flag management is not exposed as a complete operator workflow here.',
          detail: 'This tenant deep-dive does not provide launch-cleared feature flag administration depth.',
        });
      case 'BILLING':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="flex flex-wrap items-center gap-3">
               <h3 className="text-xl font-bold text-white">Billing Scope</h3>
               <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Limited</span>
             </div>
             <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
               This tenant deep-dive does not expose tenant-real billing operations, invoice state handling, statement generation, fee-ledger truth, or usage-backed financial workflows.
             </div>
             <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-6 space-y-3">
               <div className="text-sm font-bold text-slate-200">Billing remains outside this surface.</div>
               <div className="text-sm text-slate-400">
                 Use Plan & AI Budget for the currently supported commercial metadata. Treat this tab as a boundary reminder only, not as a billing console.
               </div>
             </div>
          </div>
        );
      case 'RISK':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-bold text-white">Risk Snapshot</h3>
              <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Limited</span>
            </div>
            <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              This tenant deep-dive preserves risk-surface topology only. Detailed risk scoring, reporting, and follow-up actions are not available in this surface.
            </div>
            <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-6 text-center">
              <div className="text-sm font-bold text-slate-200">No tenant-real risk score is presented here.</div>
              <div className="mt-2 text-sm text-slate-400">
                This tab does not certify launch-ready risk workflow depth and should not be read as a complete operator risk surface.
              </div>
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
        <div className="ml-auto flex flex-col items-end gap-1">
          <button
            onClick={() => onImpersonate(lifecycleTenant)}
            disabled={!canEnterTenantContext}
            className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Enter Tenant Context
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {canEnterTenantContext ? 'ACTIVE tenants only' : 'Unavailable outside ACTIVE'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Deep-dive boundary
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Overview is the live inspection surface. Other tabs preserve topology with limited, preview, or separate-surface framing only.
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={getTabClass(tab, activeTab === tab.id)}
          >
            <span>{tab.label}</span>
            {tab.id !== 'OVERVIEW' && (
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${getTabBadgeClass(tab.state)}`}>
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

const protectedArchiveSlugs = new Set<string>([
  'qa-b2b',
  'qa-b2c',
  'qa-wl',
  'qa-agg',
  'qa-pend',
  'white-label-co',
]);

const protectedArchiveNames = new Set<string>([
  'WHITE LABEL CO',
]);

const isProtectedTenantArchiveTarget = (tenant: TenantConfig) => {
  const normalizedSlug = tenant.slug.trim().toLowerCase();
  const normalizedName = tenant.name.trim().toUpperCase();

  return protectedArchiveSlugs.has(normalizedSlug) || protectedArchiveNames.has(normalizedName);
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

const getTabClass = (tab: TenantDetailsTab, isActive: boolean) => {
  if (tab.id === 'OVERVIEW') {
    return `flex min-w-[10rem] flex-col items-start gap-1 rounded-t-lg border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${isActive ? 'border-rose-600/60 bg-slate-900 text-white shadow-[0_0_0_1px_rgba(225,29,72,0.15)]' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`;
  }

  return `flex min-w-[10rem] flex-col items-start gap-1 rounded-t-lg border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${isActive ? 'border-slate-700 bg-slate-900/70 text-slate-200' : 'border-slate-900 bg-slate-950/20 text-slate-600 hover:border-slate-800 hover:text-slate-400'} opacity-85`;
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
