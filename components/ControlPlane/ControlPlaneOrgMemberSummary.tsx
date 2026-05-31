/**
 * ControlPlaneOrgMemberSummary
 *
 * Read-only control-plane panel showing org membership summary for a tenant.
 *
 * UNIT: CONTROL-PLANE-ORG-MEMBER-VISIBILITY-HARDENING-002
 * SCOPE: Read-only display only.
 *
 * GUARDRAIL: No mutation controls. No invite / revoke / remove / role-change actions.
 * No AdminRBAC mutation coupling. No backend/API/schema changes.
 */

import React from 'react';

export interface ControlPlaneMembershipEntry {
  id: string;
  role: string;
  status?: string | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

const resolveMembershipStatusPresentation = (status: string | null | undefined) => {
  const normalized = status?.trim().toUpperCase() ?? '';

  if (!normalized) {
    return {
      isActive: false,
      label: 'Not specified',
    };
  }

  return {
    isActive: normalized === 'ACTIVE',
    label: normalized,
  };
};

interface ControlPlaneOrgMemberSummaryProps {
  memberships?: ControlPlaneMembershipEntry[];
  loading?: boolean;
}

export const ControlPlaneOrgMemberSummary: React.FC<ControlPlaneOrgMemberSummaryProps> = ({
  memberships,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          Org &amp; Member Summary
        </h3>
        <div className="text-xs text-slate-500">Loading membership records...</div>
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Org &amp; Member Summary
          </h3>
          <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Read-only
          </span>
        </div>
        <div className="rounded border border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-400">
          No membership records available for this tenant.
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
          Read-only — no membership management from this surface.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Org &amp; Member Summary
        </h3>
        <span className="rounded border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Read-only
        </span>
      </div>
      <div className="mb-3 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        Member visibility only. No invite, revoke, or role-change actions are available from this surface.
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        {memberships.length} member{memberships.length === 1 ? '' : 's'} on record
      </div>
      <div className="space-y-2">
        {memberships.map(membership => {
          const statusPresentation = resolveMembershipStatusPresentation(membership.status);

          return (
            <div
              key={membership.id}
              className="rounded border border-slate-800 bg-slate-950/40 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-slate-200">{membership.user.email}</span>
                {membership.user.emailVerified ? (
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    Verified
                  </span>
                ) : (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    Unverified
                  </span>
                )}
                <span className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  {membership.role}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    statusPresentation.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-900/60 text-slate-400'
                  }`}
                >
                  {statusPresentation.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
        Read-only — no membership management from this surface.
      </div>
    </div>
  );
};
