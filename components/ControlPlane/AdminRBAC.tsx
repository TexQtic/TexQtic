
import React, { useEffect, useState } from 'react';
import {
  getAdminAccessRegistry,
  revokeControlPlaneAdminAccess,
  type ControlPlaneAdminRegistryEntry,
} from '../../services/controlPlaneService';
import { APIError } from '../../services/apiClient';
import { EmptyState, ErrorState } from '../shared';

interface AdminRbacRegistrySurfaceProps {
  admins: ControlPlaneAdminRegistryEntry[];
  loading: boolean;
  error: APIError | null;
  onRetry: () => void;
  onRevoke?: (admin: ControlPlaneAdminRegistryEntry) => void;
  revokingAdminId?: string | null;
  actionError?: string | null;
  actionNotice?: string | null;
}

function formatAccessClass(accessClass: ControlPlaneAdminRegistryEntry['accessClass']): string {
  return accessClass === 'SUPER_ADMIN' ? 'SuperAdmin' : 'PlatformAdmin';
}

function formatRole(role: ControlPlaneAdminRegistryEntry['role']): string {
  return role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const AdminRbacRegistrySurface: React.FC<AdminRbacRegistrySurfaceProps> = ({
  admins,
  loading,
  error,
  onRetry,
  onRevoke,
  revokingAdminId,
  actionError,
  actionNotice,
}) => {
  if (error && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Access Registry</h1>
            <p className="text-slate-400 text-sm">Bounded read-only control-plane visibility for current internal admin access.</p>
          </div>
        </div>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Access Registry</h1>
          <p className="text-slate-400 text-sm">Read-only control-plane visibility for who currently holds internal admin access and what bounded role they hold.</p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 px-5 py-4 text-sm text-sky-100">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Bounded Scope</div>
        <p className="mt-2 text-sky-100/80">
          This slice authorizes bounded revoke/remove for existing non-SuperAdmin control-plane admins only. It does not authorize invite, role-change mutation, self-revoke, peer-SuperAdmin revoke, or blanket authority expansion.
        </p>
      </div>

      {actionNotice && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-100">
          {actionNotice}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-5 py-4 text-sm text-rose-100">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Registry Entries</div>
          <div className="text-xl font-bold text-slate-100">{loading ? '...' : admins.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">SuperAdmin</div>
          <div className="text-xl font-bold text-slate-100">{loading ? '...' : admins.filter(admin => admin.accessClass === 'SUPER_ADMIN').length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">PlatformAdmin</div>
          <div className="text-xl font-bold text-slate-100">{loading ? '...' : admins.filter(admin => admin.accessClass === 'PLATFORM_ADMIN').length}</div>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
          Loading control-plane admin registry…
        </div>
      )}

      {!loading && admins.length === 0 && (
        <EmptyState
          title="No control-plane admin identities found"
          message="No internal control-plane admins are currently visible in the bounded registry surface. No access posture has changed."
        />
      )}

      {!loading && admins.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Identity</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Access Class</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Bounded Role</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Added</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{admin.email}</div>
                    <div className="text-xs text-slate-500 font-mono">{admin.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight border ${
                        admin.accessClass === 'SUPER_ADMIN'
                          ? 'bg-rose-600/10 text-rose-400 border-rose-500/30'
                          : 'bg-sky-600/10 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {formatAccessClass(admin.accessClass)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{formatRole(admin.role)}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatTimestamp(admin.createdAt)}</td>
                  <td className="px-6 py-4">
                    {admin.accessClass === 'SUPER_ADMIN' ? (
                      <span className="inline-flex rounded border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Protected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRevoke?.(admin)}
                        disabled={!onRevoke || revokingAdminId === admin.id}
                        className="rounded border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 transition-colors hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revokingAdminId === admin.id ? 'Revoking...' : 'Revoke Access'}
                      </button>
                    )}
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

export const AdminRBAC: React.FC = () => {
  const [admins, setAdmins] = useState<ControlPlaneAdminRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ControlPlaneAdminRegistryEntry | null>(null);
  const [revokingAdminId, setRevokingAdminId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchRegistry = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminAccessRegistry();
      setAdmins(response.admins);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('REALM_MISMATCH')) {
        setError({
          status: 403,
          message: 'This control-plane registry requires control-plane access.',
          code: 'REALM_MISMATCH',
        } as APIError);
      } else if (err instanceof APIError) {
        setError(err);
      } else {
        setError({
          status: 0,
          message: 'Failed to load the control-plane admin registry. Please try again.',
          code: 'UNKNOWN_ERROR',
        } as APIError);
      }
    } finally {
      setLoading(false);
    }
  };

  const openRevokeDialog = (admin: ControlPlaneAdminRegistryEntry) => {
    setPendingRevoke(admin);
    setActionError(null);
  };

  const closeRevokeDialog = () => {
    setPendingRevoke(null);
    setActionError(null);
  };

  const confirmRevoke = async () => {
    if (!pendingRevoke) {
      return;
    }

    setRevokingAdminId(pendingRevoke.id);
    setActionError(null);

    try {
      await revokeControlPlaneAdminAccess(pendingRevoke.id);
      setPendingRevoke(null);
      setActionNotice(`Removed control-plane access for ${pendingRevoke.email}.`);
      await fetchRegistry();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke control-plane access.';
      setActionError(message);
    } finally {
      setRevokingAdminId(null);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  return (
    <>
      <AdminRbacRegistrySurface
        admins={admins}
        loading={loading}
        error={error}
        onRetry={fetchRegistry}
        onRevoke={openRevokeDialog}
        revokingAdminId={revokingAdminId}
        actionError={actionError}
        actionNotice={actionNotice}
      />

      {pendingRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Revoke Control-Plane Access</h2>
            <p className="mt-3 text-sm text-slate-400">
              This removes existing control-plane admin access for{' '}
              <span className="font-mono text-slate-200">{pendingRevoke.email}</span> and invalidates any active refresh-token renewal path.
            </p>
            {actionError && (
              <div className="mt-4 rounded-lg border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
                {actionError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRevokeDialog}
                disabled={revokingAdminId === pendingRevoke.id}
                className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRevoke()}
                disabled={revokingAdminId === pendingRevoke.id}
                className="rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {revokingAdminId === pendingRevoke.id ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
