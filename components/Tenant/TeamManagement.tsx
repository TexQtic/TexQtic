
import React from 'react';
import { UserRole } from '../../types';

export const TeamManagement: React.FC = () => {
  const members = [
    { name: 'Sarah Miller', email: 'sarah@acme.com', role: UserRole.TENANT_OWNER, status: 'Active' },
    { name: 'James Chen', email: 'james@acme.com', role: UserRole.TENANT_ADMIN, status: 'Active' },
    { name: 'Elena Rodriguez', email: 'elena@acme.com', role: UserRole.SELLER, status: 'Invited' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-slate-500 text-sm">Manage your organization's members and their access levels.</p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/10">Invite Member</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider">Member</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider">Role</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m.role === UserRole.TENANT_OWNER ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <span className="text-xs text-slate-600">{m.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 font-bold text-[10px] uppercase hover:underline">Edit Access</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
