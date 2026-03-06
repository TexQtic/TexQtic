
import React, { useEffect, useState } from 'react';
import { getMemberships, type Membership } from '../../services/tenantService';
import { APIError } from '../../services/apiClient';

interface TeamManagementProps {
  onInvite?: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ onInvite }) => {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMemberships();
        setMembers(response.memberships);
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Failed to load team members. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-slate-500 text-sm">Manage your organization's members and their access levels.</p>
        </div>
        <button
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/10"
          onClick={onInvite}
        >Invite Member</button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-500 text-sm">Loading team members…</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">No team members found.</div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider">Member</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider">Role</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{m.user.email}</div>
                    <div className="text-xs text-slate-500 font-mono">{m.user.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      m.role === 'OWNER'
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 font-bold text-[10px] uppercase hover:underline">Edit Access</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
