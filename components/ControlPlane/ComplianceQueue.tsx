
import React from 'react';
import { COMPLIANCE_QUEUE } from '../../constants';

export const ComplianceQueue: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Trust & Compliance</h1>
        <p className="text-slate-400 text-sm">Review merchant credentials and business certifications.</p>
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Tenant Name</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Certification</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Submitted</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Status</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {COMPLIANCE_QUEUE.map(req => (
            <tr key={req.id} className="hover:bg-slate-800/30">
              <td className="px-6 py-4 font-bold text-slate-200">{req.tenantName}</td>
              <td className="px-6 py-4">
                <span className="text-blue-400 font-mono text-xs">{req.type}</span>
              </td>
              <td className="px-6 py-4 text-slate-500 text-xs">{req.submittedAt}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-4">
                  <button className="text-emerald-500 hover:text-white text-[10px] font-bold uppercase tracking-tighter">Approve</button>
                  <button className="text-rose-500 hover:text-white text-[10px] font-bold uppercase tracking-tighter">Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
