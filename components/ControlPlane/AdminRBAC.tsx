
import React, { useEffect, useState } from 'react';
import {
  getAdminAccessRegistry,
  type ControlPlaneAdminRegistryEntry,
} from '../../services/controlPlaneService';
import { APIError } from '../../services/apiClient';
import { EmptyState, ErrorState } from '../shared';

interface AdminRbacRegistrySurfaceProps {
  admins: ControlPlaneAdminRegistryEntry[];
  loading: boolean;
  error: APIError | null;
  onRetry: () => void;
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
          This slice is read-only. It does not authorize invite, revoke, role-change mutation, self-elevation, or blanket read-everything posture.
        </p>
      </div>

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

  useEffect(() => {
    fetchRegistry();
  }, []);

  return (
    <AdminRbacRegistrySurface
      admins={admins}
      loading={loading}
      error={error}
      onRetry={fetchRegistry}
    />
  );
};
