import React from 'react';
import { PLATFORM_TENANTS } from '../../constants';
import { TenantStatus, TenantConfig } from '../../types';

interface TenantRegistryProps {
  onSelectTenant: (tenant: TenantConfig) => void;
  onImpersonate: (tenant: TenantConfig) => void;
}

export const TenantRegistry: React.FC<TenantRegistryProps> = ({
  onSelectTenant,
  onImpersonate,
}) => {
  const tenants = Object.values(PLATFORM_TENANTS);

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case TenantStatus.ACTIVE:
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case TenantStatus.SUSPENDED:
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case TenantStatus.TRIAL:
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenant Registry</h1>
          <p className="text-slate-400 text-sm">Manage global tenant lifecycle and governance.</p>
        </div>
        <button className="bg-slate-100 text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tight">
          Provision New Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: '452' },
          { label: 'Active (Paid)', value: '381' },
          { label: 'Pending Compliance', value: '14' },
          { label: 'Trialing', value: '57' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {stat.label}
            </div>
            <div className="text-xl font-bold text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

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
            {tenants.map(tenant => (
              <tr
                key={tenant.id}
                className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                onClick={() => onSelectTenant(tenant)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tenant.theme.logo}</span>
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
                      className={`h-full ${tenant.aiUsage / tenant.aiBudget > 0.8 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${(tenant.aiUsage / tenant.aiBudget) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {Math.round((tenant.aiUsage / tenant.aiBudget) * 100)}% cap
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectTenant(tenant)}
                      title="Config"
                      className="p-1 hover:text-white text-slate-500"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={() => onImpersonate(tenant)}
                      title="Impersonate"
                      className="p-1 hover:text-blue-500 text-slate-500"
                    >
                      👤
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
