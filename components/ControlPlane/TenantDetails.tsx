
import React, { useState } from 'react';
import { TenantConfig, TenantStatus } from '../../types';

interface TenantDetailsProps {
  tenant: TenantConfig;
  onBack: () => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

export const TenantDetails: React.FC<TenantDetailsProps> = ({ tenant, onBack, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLAN' | 'FEATURES' | 'BILLING' | 'RISK' | 'AUDIT'>('OVERVIEW');

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview' },
    { id: 'PLAN', label: 'Plan & Quotas' },
    { id: 'FEATURES', label: 'Feature Flags' },
    { id: 'BILLING', label: 'Billing' },
    { id: 'RISK', label: 'Risk & Compliance' },
    { id: 'AUDIT', label: 'Audit Log' },
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
                  <DetailItem label="Created At" value="2024-01-12 08:30 UTC" />
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
                  <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs uppercase transition">Reinstate Tenant</button>
                  <button className="w-full py-2 bg-amber-600/10 border border-amber-600/30 text-amber-500 hover:bg-amber-600/20 rounded font-bold text-xs uppercase transition">Suspend Tenant</button>
                  <button className="w-full py-2 bg-rose-600/10 border border-rose-600/30 text-rose-500 hover:bg-rose-600/20 rounded font-bold text-xs uppercase transition">Delete Tenant (Safeguarded)</button>
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                 <div className={`text-4xl font-black mb-1 ${tenant.riskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{tenant.riskScore}</div>
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Risk Score</div>
                 <button className="mt-4 text-blue-400 text-[10px] font-bold uppercase hover:underline">View Risk Report</button>
              </div>
            </div>
          </div>
        );
      case 'BILLING':
        return (
          <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 space-y-8 animate-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-center">
               <div className="text-xl font-bold">Billing Status: <span className={tenant.billingStatus === 'CURRENT' ? 'text-emerald-400' : 'text-rose-500'}>{tenant.billingStatus}</span></div>
               <button className="text-xs font-bold text-blue-400 border border-blue-400/30 px-3 py-1 rounded">Generate Statement</button>
             </div>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">MTR</div>
                  <div className="text-xl font-bold">$1,450.00</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Last Invoice</div>
                  <div className="text-xl font-bold text-slate-400">Paid</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Unbilled Usage</div>
                  <div className="text-xl font-bold text-amber-400">$215.10</div>
                </div>
             </div>
          </div>
        );
      default:
        return (
          <div className="h-64 flex flex-center items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-600 font-mono text-sm">
            Detailed view for "{activeTab}" under construction.
          </div>
        );
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
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-rose-600 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {tab.label}
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
