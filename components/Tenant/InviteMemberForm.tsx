
import React from 'react';
import { UserRole } from '../../types';

export const InviteMemberForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8 animate-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Invite Member</h2>
        <p className="text-sm text-slate-500">Send an invitation link to a new team member.</p>
      </div>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onBack(); }}>
        <div className="space-y-1">
          <label htmlFor="invite-email" className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
          <input id="invite-email" type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="colleague@company.com" required />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-role" className="text-[10px] font-bold uppercase text-slate-400">Assign Role</label>
          <select id="invite-role" title="role" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
            <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
            <option value={UserRole.SELLER}>Seller / Sales Rep</option>
            <option value={UserRole.BUYER}>Procurement / Buyer</option>
            <option value={UserRole.STAFF}>General Staff</option>
          </select>
        </div>
        
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
            <strong>Note:</strong> Invited users will receive an email to set their password. They will only have access to <strong>{document.title}</strong> data.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onBack} className="flex-1 py-4 font-bold text-slate-500 uppercase text-xs tracking-widest">Cancel</button>
          <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 shadow-lg shadow-indigo-900/10">Send Invite</button>
        </div>
      </form>
    </div>
  );
};
