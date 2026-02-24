
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { createMembership } from '../../services/tenantService';
import { APIError } from '../../services/apiClient';

export const InviteMemberForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Map display roles to API roles
  const roleOptions: { label: string; value: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' }[] = [
    { label: 'Tenant Admin', value: 'ADMIN' },
    { label: 'Seller / Sales Rep', value: 'MEMBER' },
    { label: 'Procurement / Buyer', value: 'MEMBER' },
    { label: 'General Staff', value: 'VIEWER' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createMembership({ email, role });
      setSuccess(true);
      // Navigate back after brief success display
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to send invite. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-in zoom-in-95 duration-300 text-center">
        <div className="text-4xl">✉️</div>
        <div>
          <h2 className="text-xl font-bold text-emerald-600">Invite Sent!</h2>
          <p className="text-sm text-slate-500 mt-1">
            An invitation has been sent to <strong>{email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8 animate-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Invite Member</h2>
        <p className="text-sm text-slate-500">Send an invitation link to a new team member.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="invite-email" className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
          <input
            id="invite-email"
            type="email"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="colleague@company.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-role" className="text-[10px] font-bold uppercase text-slate-400">Assign Role</label>
          <select
            id="invite-role"
            title="role"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            value={role}
            onChange={e => setRole(e.target.value as typeof role)}
          >
            {roleOptions.map(opt => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
            <strong>Note:</strong> Invited users will receive an email to set their password. They will only have access to <strong>{document.title}</strong> data.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="flex-1 py-4 font-bold text-slate-500 uppercase text-xs tracking-widest disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 shadow-lg shadow-indigo-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </div>
  );
};
