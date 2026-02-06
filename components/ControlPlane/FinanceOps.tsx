
import React from 'react';
import { PAYOUT_QUEUE } from '../../constants';

export const FinanceOps: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Oversight</h1>
        <p className="text-slate-400 text-sm">Commission rules, fee adjustments, and payout approvals.</p>
      </div>
      <button className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">Adjust Fee Rules</button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Commission (Avg)</h3>
        <div className="text-3xl font-bold">3.2%</div>
        <div className="text-xs text-emerald-500 mt-2">+0.2% vs prev month</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Pending Payouts</h3>
        <div className="text-3xl font-bold">$1.2M</div>
        <div className="text-xs text-slate-400 mt-2">124 requests pending</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Platform Revenue (MTD)</h3>
        <div className="text-3xl font-bold">$428K</div>
        <div className="text-xs text-slate-400 mt-2">Projection: $610K</div>
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">Payout Queue</div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
          <tr>
            <th className="px-6 py-3 font-bold uppercase text-[10px]">Tenant</th>
            <th className="px-6 py-3 font-bold uppercase text-[10px]">Amount</th>
            <th className="px-6 py-3 font-bold uppercase text-[10px]">Status</th>
            <th className="px-6 py-3 font-bold uppercase text-[10px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {PAYOUT_QUEUE.map(p => (
            <tr key={p.id} className="hover:bg-slate-800/30">
              <td className="px-6 py-4 font-bold text-slate-200">{p.tenantName}</td>
              <td className="px-6 py-4 font-mono text-emerald-400">{p.amount.toLocaleString()} {p.currency}</td>
              <td className="px-6 py-4">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{p.status}</span>
              </td>
              <td className="px-6 py-4">
                <button className="text-blue-400 font-bold text-xs uppercase hover:underline">Approve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
