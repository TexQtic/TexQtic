
import React from 'react';
import { ADMIN_USERS } from '../../constants';

export const AdminRBAC: React.FC = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin RBAC</h1>
        <p className="text-slate-400 text-sm">Manage internal access levels and platform administrators.</p>
      </div>
      <button className="bg-slate-100 text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tight">Invite Admin</button>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
          <tr>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">User</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Role</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Department</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Last Active</th>
            <th className="px-6 py-4 font-bold uppercase text-[10px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {ADMIN_USERS.map(user => (
            <tr key={user.id} className="hover:bg-slate-800/30">
              <td className="px-6 py-4 font-bold text-slate-200">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter ${user.role === 'SuperAdmin' ? 'bg-rose-600/10 text-rose-500 border border-rose-600/20' : 'bg-slate-800 text-slate-400'}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-400 text-xs">{user.department}</td>
              <td className="px-6 py-4 text-slate-500 text-xs">{user.lastLogin}</td>
              <td className="px-6 py-4">
                <button className="text-blue-400 font-bold text-[10px] uppercase hover:underline">Revoke</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-xl text-center">
      <div className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">Platform Policy</div>
      <p className="mt-2 text-slate-500 text-xs max-w-md mx-auto italic leading-relaxed">
        "All admin actions are subject to strict dual-approval workflows for production environment mutations."
      </p>
    </div>
  </div>
);
