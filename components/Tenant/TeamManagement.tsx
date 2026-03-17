
import React, { useEffect, useState, useCallback } from 'react';
import { getMemberships, updateMembershipRole, type Membership } from '../../services/tenantService';
import { getCurrentUser } from '../../services/authService';
import { APIError } from '../../services/apiClient';

type EditableRole = 'OWNER' | 'ADMIN' | 'MEMBER';
const ALL_EDITABLE_ROLES: EditableRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

interface TeamManagementProps {
  onInvite?: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ onInvite }) => {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [selectedRole, setSelectedRole] = useState<EditableRole | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, meRes] = await Promise.all([
        getMemberships(),
        getCurrentUser().catch(() => null),
      ]);
      setMembers(membersRes.memberships);
      setUserRole(meRes?.role ?? null);
      setCurrentUserId(meRes?.user?.id ?? null);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load team members. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const ownerCount = members.filter(m => m.role === 'OWNER').length;

  // Returns the roles this member can be moved to (empty = no edit button).
  // VIEWER source: VIEWER_TRANSITION_OUT_OF_SCOPE on backend; we hide early.
  // Peer-OWNER target: PEER_OWNER_DEMOTION_FORBIDDEN on backend; we hide early.
  const getValidNextRoles = (target: Membership): EditableRole[] => {
    if (target.role === 'VIEWER') return [];
    if (target.role === 'OWNER' && target.userId !== currentUserId) return [];
    return ALL_EDITABLE_ROLES.filter(r => r !== (target.role as EditableRole));
  };

  const openEditModal = (m: Membership) => {
    const valid = getValidNextRoles(m);
    if (valid.length === 0) return;
    setEditTarget(m);
    setSelectedRole(valid[0]);
    setMutationError(null);
    setMutating(false);
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setSelectedRole(null);
    setMutationError(null);
    setMutating(false);
  };

  const handleRoleUpdate = async () => {
    if (!editTarget || !selectedRole) return;
    setMutating(true);
    setMutationError(null);
    try {
      await updateMembershipRole(editTarget.id, selectedRole);
      closeEditModal();
      await fetchMembers();
    } catch (err) {
      if (err instanceof APIError) {
        setMutationError(err.message);
      } else {
        setMutationError('Failed to update role. Please try again.');
      }
      setMutating(false);
    }
  };

  const isSelf = editTarget?.userId === currentUserId;
  const isSelfDowngrade =
    isSelf &&
    editTarget?.role === 'OWNER' &&
    (selectedRole === 'ADMIN' || selectedRole === 'MEMBER');
  const isSoleOwnerSelfDowngrade = isSelfDowngrade && ownerCount <= 1;
  const isPromoteToOwner = selectedRole === 'OWNER';
  const validNextRoles = editTarget ? getValidNextRoles(editTarget) : [];

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
              {members.map((m) => {
                const isEditable = userRole === 'OWNER' && getValidNextRoles(m).length > 0;
                return (
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
                      {isEditable ? (
                        <button
                          className="text-indigo-600 font-bold text-[10px] uppercase hover:underline"
                          onClick={() => openEditModal(m)}
                        >
                          Edit Access
                        </button>
                      ) : (
                        <span className="text-slate-300 font-bold text-[10px] uppercase cursor-not-allowed select-none">
                          Edit Access
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Change Access Role</h2>
              <p className="text-sm text-slate-500 mt-1">
                Update the role for <span className="font-semibold text-slate-700">{editTarget.user.email}</span>.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Current role</span>
                <span className="font-bold text-slate-700">{editTarget.role}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Role</p>
              <div className="flex flex-col gap-2">
                {validNextRoles.map((r) => (
                  <label
                    key={r}
                    htmlFor={`role-option-${r}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedRole === r
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      id={`role-option-${r}`}
                      type="radio"
                      name="role"
                      value={r}
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                      className="accent-indigo-600"
                    />
                    <span className="font-bold text-slate-800 text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {isPromoteToOwner && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
                This will give <span className="font-bold">{editTarget.user.email}</span> full ownership access to this organization.
              </div>
            )}
            {isSoleOwnerSelfDowngrade && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs">
                You are the sole Owner of this organization. Assign another Owner before reducing your own access.
              </div>
            )}
            {isSelfDowngrade && !isSoleOwnerSelfDowngrade && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
                You are reducing your own access. You will lose Owner privileges immediately upon saving.
              </div>
            )}

            {mutationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs">
                {mutationError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={closeEditModal}
                disabled={mutating}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={mutating || isSoleOwnerSelfDowngrade || !selectedRole}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutating ? 'Saving…' : 'Save Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
