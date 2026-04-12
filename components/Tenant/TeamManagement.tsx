
import React, { useEffect, useState, useCallback } from 'react';
import {
  editPendingInvite,
  getMemberships,
  resendPendingInvite,
  revokePendingInvite,
  updateMembershipRole,
  type Membership,
  type PendingInvite,
} from '../../services/tenantService';
import { getCurrentUser } from '../../services/authService';
import { APIError } from '../../services/apiClient';

type EditableRole = 'OWNER' | 'ADMIN' | 'MEMBER';
const ALL_EDITABLE_ROLES: EditableRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

interface TeamManagementProps {
  readonly onInvite?: () => void;
}

interface TeamManagementPendingInvitesPanelProps {
  readonly pendingInvites: PendingInvite[];
  readonly canEdit?: boolean;
  readonly canRevoke?: boolean;
  readonly canResend?: boolean;
  readonly editingInviteId?: string | null;
  readonly revokingInviteId?: string | null;
  readonly resendingInviteId?: string | null;
  readonly inviteActionError?: string | null;
  readonly onEdit?: (invite: PendingInvite) => void;
  readonly onRevoke?: (invite: PendingInvite) => void;
  readonly onResend?: (invite: PendingInvite) => void;
}

export function canInviteMembers(userRole: string | null) {
  return userRole === 'OWNER' || userRole === 'ADMIN';
}

function formatPendingInviteExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function removePendingInviteById(pendingInvites: PendingInvite[], inviteId: string) {
  return pendingInvites.filter(invite => invite.id !== inviteId);
}

export function replacePendingInviteById(pendingInvites: PendingInvite[], updatedInvite: PendingInvite) {
  return pendingInvites.map(invite => (invite.id === updatedInvite.id ? updatedInvite : invite));
}

export function TeamManagementPendingInvitesPanel({
  pendingInvites,
  canEdit = false,
  canRevoke = false,
  canResend = false,
  editingInviteId = null,
  revokingInviteId = null,
  resendingInviteId = null,
  inviteActionError = null,
  onEdit,
  onRevoke,
  onResend,
}: TeamManagementPendingInvitesPanelProps) {
  if (pendingInvites.length === 0) {
    return null;
  }

  const hasPendingInviteMutation =
    editingInviteId !== null || revokingInviteId !== null || resendingInviteId !== null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div>
          <h2 className="font-bold uppercase text-[10px] tracking-wider text-slate-500">Pending Invitations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Newest invites appear first. Accepted and expired invites are not shown.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
          {pendingInvites.length}
        </span>
      </div>

      {inviteActionError && (
        <div className="px-6 py-3 border-b border-rose-200 bg-rose-50 text-xs text-rose-700">
          {inviteActionError}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {pendingInvites.map(invite => (
          <div key={invite.id} className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">{invite.email}</div>
              <div className="text-xs text-slate-500">
                Expires {formatPendingInviteExpiry(invite.expiresAt)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 border-slate-100 text-slate-500">
                {invite.role}
              </span>
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(invite)}
                  disabled={hasPendingInviteMutation}
                  className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-indigo-300"
                >
                  {editingInviteId === invite.id ? 'Saving…' : 'Edit Invite'}
                </button>
              )}
              {canResend && onResend && (
                <button
                  type="button"
                  onClick={() => onResend(invite)}
                  disabled={hasPendingInviteMutation}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {resendingInviteId === invite.id ? 'Resending…' : 'Resend Invite'}
                </button>
              )}
              {canRevoke && onRevoke && (
                <button
                  type="button"
                  onClick={() => onRevoke(invite)}
                  disabled={hasPendingInviteMutation}
                  className="text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-rose-300"
                >
                  {revokingInviteId === invite.id ? 'Cancelling…' : 'Cancel Invite'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamManagement({ onInvite }: TeamManagementProps) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [selectedRole, setSelectedRole] = useState<EditableRole | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editInviteTarget, setEditInviteTarget] = useState<PendingInvite | null>(null);
  const [selectedInviteRole, setSelectedInviteRole] = useState<EditableRole | null>(null);
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const [editInviteError, setEditInviteError] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [pendingInviteActionError, setPendingInviteActionError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPendingInviteActionError(null);
    try {
      const [membersRes, meRes] = await Promise.all([
        getMemberships(),
        getCurrentUser().catch(() => null),
      ]);
      setMembers(membersRes.memberships);
      setPendingInvites(membersRes.pendingInvites ?? []);
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
  const hasMembers = members.length > 0;
  const hasPendingInvites = pendingInvites.length > 0;
  const canInvite = canInviteMembers(userRole);

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

  const getValidInviteRoles = (invite: PendingInvite): EditableRole[] => {
    return ALL_EDITABLE_ROLES.filter(role => role !== invite.role);
  };

  const openEditInviteModal = (invite: PendingInvite) => {
    const valid = getValidInviteRoles(invite);
    if (valid.length === 0) return;
    setEditInviteTarget(invite);
    setSelectedInviteRole(valid[0]);
    setEditInviteError(null);
    setPendingInviteActionError(null);
  };

  const closeEditInviteModal = () => {
    setEditInviteTarget(null);
    setSelectedInviteRole(null);
    setEditInviteError(null);
    setEditingInviteId(null);
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

  const handlePendingInviteRevoke = async (invite: PendingInvite) => {
    setPendingInviteActionError(null);
    setRevokingInviteId(invite.id);

    try {
      await revokePendingInvite(invite.id);
      setPendingInvites(currentInvites => removePendingInviteById(currentInvites, invite.id));
    } catch (err) {
      if (err instanceof APIError) {
        setPendingInviteActionError(err.message);
      } else {
        setPendingInviteActionError('Failed to cancel invite. Please try again.');
      }
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handlePendingInviteResend = async (invite: PendingInvite) => {
    setPendingInviteActionError(null);
    setResendingInviteId(invite.id);

    try {
      const response = await resendPendingInvite(invite.id);
      setPendingInvites(currentInvites => replacePendingInviteById(currentInvites, response.invite));
    } catch (err) {
      if (err instanceof APIError) {
        setPendingInviteActionError(err.message);
      } else {
        setPendingInviteActionError('Failed to resend invite. Please try again.');
      }
    } finally {
      setResendingInviteId(null);
    }
  };

  const handlePendingInviteEdit = async () => {
    if (!editInviteTarget || !selectedInviteRole) return;

    setEditInviteError(null);
    setEditingInviteId(editInviteTarget.id);

    try {
      const response = await editPendingInvite(editInviteTarget.id, { role: selectedInviteRole });
      setPendingInvites(currentInvites => replacePendingInviteById(currentInvites, response.invite));
      closeEditInviteModal();
    } catch (err) {
      if (err instanceof APIError) {
        setEditInviteError(err.message);
      } else {
        setEditInviteError('Failed to edit invite. Please try again.');
      }
      setEditingInviteId(null);
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
  const isInvitePromoteToOwner = selectedInviteRole === 'OWNER';
  const validInviteRoles = editInviteTarget ? getValidInviteRoles(editInviteTarget) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-slate-500 text-sm">Manage your organization's members and their access levels.</p>
        </div>
        {canInvite && (
          <button
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/10"
            onClick={onInvite}
          >Invite Member</button>
        )}
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

      {!loading && !error && !hasMembers && !hasPendingInvites && (
        <div className="text-center py-12 text-slate-500 text-sm">No team members found.</div>
      )}

      {!loading && !error && hasMembers && (
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

      {!loading && !error && (
        <TeamManagementPendingInvitesPanel
          pendingInvites={pendingInvites}
          canEdit={canInvite}
          canRevoke={canInvite}
          canResend={canInvite}
          editingInviteId={editingInviteId}
          revokingInviteId={revokingInviteId}
          resendingInviteId={resendingInviteId}
          inviteActionError={pendingInviteActionError}
          onEdit={openEditInviteModal}
          onRevoke={handlePendingInviteRevoke}
          onResend={handlePendingInviteResend}
        />
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

      {editInviteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Edit Pending Invite</h2>
              <p className="text-sm text-slate-500 mt-1">
                Update the role for <span className="font-semibold text-slate-700">{editInviteTarget.email}</span>.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Current role</span>
                <span className="font-bold text-slate-700">{editInviteTarget.role}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Expiry</span>
                <span className="font-bold text-slate-700">{formatPendingInviteExpiry(editInviteTarget.expiresAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Role</p>
              <div className="flex flex-col gap-2">
                {validInviteRoles.map(role => (
                  <label
                    key={role}
                    htmlFor={`invite-role-option-${role}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedInviteRole === role
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      id={`invite-role-option-${role}`}
                      type="radio"
                      name="invite-role"
                      value={role}
                      checked={selectedInviteRole === role}
                      onChange={() => setSelectedInviteRole(role)}
                      className="accent-indigo-600"
                    />
                    <span className="font-bold text-slate-800 text-sm">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {isInvitePromoteToOwner && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
                This invite will create full ownership access if accepted.
              </div>
            )}

            {editInviteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs">
                {editInviteError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={closeEditInviteModal}
                disabled={editingInviteId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePendingInviteEdit}
                disabled={editingInviteId !== null || !selectedInviteRole}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingInviteId !== null ? 'Saving…' : 'Save Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
