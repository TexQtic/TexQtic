/**
 * EscalationOversight — Control Plane (TECS-FBW-006-B)
 *
 * Surfaces GET /api/control/escalations plus the approved control-plane mutation subset:
 *   - upgrade severity via POST /api/control/escalations/:id/upgrade
 *   - resolve via POST /api/control/escalations/:id/resolve (RESOLVED)
 *   - override via POST /api/control/escalations/:id/resolve (OVERRIDDEN)
 *
 * Critical constraint: orgId is a MANDATORY query parameter on this endpoint.
 * The API returns 400 if orgId is absent. This component gates all fetches behind
 * a non-empty orgId input — no API call is attempted until orgId is provided.
 */

import React, { useState, useCallback } from 'react';
import { getCurrentUser } from '../../services/authService';
import { APIError } from '../../services/apiClient';
import {
  getEscalations,
  type ControlPlaneEscalationEvent,
  resolveControlEscalation,
  upgradeEscalation,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

type BannerTone = 'SUCCESS' | 'ERROR';

interface BannerState {
  tone: BannerTone;
  message: string;
}

type ActionDialogState =
  | {
      kind: 'UPGRADE';
      escalation: ControlPlaneEscalationEvent;
      newSeverityLevel: 1 | 2 | 3 | 4;
      reason: string;
    }
  | {
      kind: 'RESOLVE' | 'OVERRIDE';
      escalation: ControlPlaneEscalationEvent;
      reason: string;
    };

// ─── Severity → Badge color map ───────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  0: 'bg-slate-700 text-slate-300',
  1: 'bg-yellow-900/50 text-yellow-300',
  2: 'bg-orange-900/50 text-orange-300',
  3: 'bg-rose-900/60 text-rose-200',
  4: 'bg-rose-700 text-white',
};

function SeverityBadge({ level }: Readonly<{ level: number }>) {
  const classes = SEVERITY_COLORS[level] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${classes}`}>
      L{level}
    </span>
  );
}

// ─── Status → Badge color map ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  OPEN:       'bg-rose-900/50 text-rose-300',
  RESOLVED:   'bg-emerald-900/50 text-emerald-300',
  OVERRIDDEN: 'bg-slate-700 text-slate-400',
};

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const classes = STATUS_COLORS[status] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

function Banner({ tone, message }: Readonly<BannerState>) {
  const classes =
    tone === 'SUCCESS'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300';

  return <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>{message}</div>;
}

function friendlyEscalationError(err: unknown, fallback: string): string {
  if (err instanceof APIError) {
    if (err.status === 403 || err.code === 'FORBIDDEN') {
      return 'This escalation action is restricted to SUPER_ADMIN posture.';
    }
    if (err.code === 'ESCALATION_NOT_FOUND' || err.status === 404) {
      return 'The escalation could not be found for the selected organisation.';
    }
    if (err.code === 'ESCALATION_NOT_OPEN') {
      return 'This escalation is no longer open.';
    }
    if (err.code === 'OVERRIDE_LEVEL_TOO_LOW') {
      return 'Override is only allowed for escalations at severity LEVEL_2 or higher.';
    }
    return err.message || fallback;
  }

  return err instanceof Error ? err.message : fallback;
}

// ─── EscalationOversight ─────────────────────────────────────────────────────

export const EscalationOversight: React.FC = () => {
  const [orgIdInput, setOrgIdInput]         = useState('');
  const [orgId, setOrgId]                   = useState('');
  const [escalations, setEscalations]       = useState<ControlPlaneEscalationEvent[]>([]);
  const [count, setCount]                   = useState(0);
  const [fetchState, setFetchState]         = useState<FetchState>('IDLE');
  const [error, setError]                   = useState<string | null>(null);
  const [adminRole, setAdminRole]           = useState<string | null>(null);
  const [banner, setBanner]                 = useState<BannerState | null>(null);
  const [actionDialog, setActionDialog]     = useState<ActionDialogState | null>(null);
  const [actionError, setActionError]       = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const isSuperAdmin = adminRole === 'SUPER_ADMIN';

  const handleFetch = useCallback(async (targetOrgId: string) => {
    if (!targetOrgId.trim()) return;
    setOrgId(targetOrgId.trim());
    setFetchState('LOADING');
    setError(null);
    try {
      const [res, meRes] = await Promise.all([
        getEscalations(targetOrgId.trim(), { limit: 100 }),
        getCurrentUser().catch(() => null),
      ]);
      setEscalations(res.escalations);
      setCount(res.count);
      setAdminRole(meRes?.role ?? null);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations.');
      setFetchState('ERROR');
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch(orgIdInput);
  };

  const openUpgradeDialog = (escalation: ControlPlaneEscalationEvent) => {
    const nextLevel = Math.min(4, escalation.severityLevel + 1) as 1 | 2 | 3 | 4;
    setActionError(null);
    setActionDialog({ kind: 'UPGRADE', escalation, newSeverityLevel: nextLevel, reason: '' });
  };

  const openResolveDialog = (escalation: ControlPlaneEscalationEvent) => {
    setActionError(null);
    setActionDialog({ kind: 'RESOLVE', escalation, reason: '' });
  };

  const openOverrideDialog = (escalation: ControlPlaneEscalationEvent) => {
    setActionError(null);
    setActionDialog({ kind: 'OVERRIDE', escalation, reason: '' });
  };

  const handleConfirmAction = async () => {
    if (!actionDialog) return;

    if (!actionDialog.reason.trim()) {
      setActionError('A reason is required for this escalation action.');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      if (actionDialog.kind === 'UPGRADE') {
        await upgradeEscalation(actionDialog.escalation.id, {
          newSeverityLevel: actionDialog.newSeverityLevel,
          reason: actionDialog.reason.trim(),
        });
        setBanner({ tone: 'SUCCESS', message: 'Escalation upgraded successfully.' });
      } else {
        const resolutionStatus = actionDialog.kind === 'OVERRIDE' ? 'OVERRIDDEN' : 'RESOLVED';
        await resolveControlEscalation(actionDialog.escalation.id, {
          resolutionStatus,
          reason: actionDialog.reason.trim(),
        });
        setBanner({
          tone: 'SUCCESS',
          message: actionDialog.kind === 'OVERRIDE' ? 'Escalation override recorded successfully.' : 'Escalation resolved successfully.',
        });
      }

      setActionDialog(null);
      await handleFetch(orgId);
    } catch (err) {
      setActionError(friendlyEscalationError(err, 'Failed to update escalation.'));
      setBanner(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const renderActionDialog = () => {
    if (!actionDialog) return null;

    const escalationLabel = truncateId(actionDialog.escalation.id);
    const isOverride = actionDialog.kind === 'OVERRIDE';
    let title = 'Confirm Resolve Action';
    let actionButtonClass = 'bg-emerald-600 hover:bg-emerald-700';
    let actionButtonLabel = 'Confirm Resolve';
    let actionDescription = ' will be resolved.';

    if (actionDialog.kind === 'UPGRADE') {
      title = 'Confirm Escalation Upgrade';
      actionButtonClass = 'bg-amber-600 hover:bg-amber-700';
      actionButtonLabel = 'Confirm Upgrade';
      actionDescription = ' will be upgraded to a higher severity.';
    } else if (isOverride) {
      title = 'Confirm Override Action';
      actionButtonClass = 'bg-rose-600 hover:bg-rose-700';
      actionButtonLabel = 'Confirm Override';
      actionDescription = ' will be marked as Override.';
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Escalation <span className="font-mono text-xs text-slate-300">{escalationLabel}</span>
            {actionDescription}
          </p>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300 space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Current severity</span>
              <span className="font-semibold">LEVEL_{actionDialog.escalation.severityLevel}</span>
            </div>
            {actionDialog.kind === 'UPGRADE' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="control-escalation-level">
                  New Severity
                </label>
                <select
                  id="control-escalation-level"
                  value={actionDialog.newSeverityLevel}
                  onChange={event => {
                    setActionError(null);
                    setActionDialog(prev => prev?.kind === 'UPGRADE'
                      ? { ...prev, newSeverityLevel: Number(event.target.value) as 1 | 2 | 3 | 4 }
                      : prev);
                  }}
                  className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {[1, 2, 3, 4]
                    .filter(level => level > actionDialog.escalation.severityLevel)
                    .map(level => (
                      <option key={level} value={level}>LEVEL_{level}</option>
                    ))}
                </select>
              </div>
            )}
            {isOverride && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                Override remains distinct from ordinary resolve and is only available where the escalation severity threshold permits it.
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="control-escalation-reason">
              Reason
            </label>
            <textarea
              id="control-escalation-reason"
              value={actionDialog.reason}
              onChange={event => {
                setActionError(null);
                setActionDialog(prev => prev ? { ...prev, reason: event.target.value } : prev);
              }}
              rows={4}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder={isOverride ? 'Explain why the escalation is being overridden.' : 'Explain the rationale for this action.'}
            />
          </div>

          {actionError && <div className="mt-4"><Banner tone="ERROR" message={actionError} /></div>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActionDialog(null)}
              disabled={actionSubmitting}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={actionSubmitting}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${actionButtonClass}`}
            >
              {actionSubmitting ? 'Submitting…' : actionButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Escalation Oversight</h1>
        <p className="text-sm text-slate-400 mt-1">
          G-022 escalation events with approved control-plane upgrade, resolve, and override actions.
        </p>
      </div>

      {banner && <Banner tone={banner.tone} message={banner.message} />}

      {/* orgId filter — required before any fetch */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="esc-org-id">
          Organisation ID <span className="text-rose-400">(required)</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="esc-org-id"
            type="text"
            value={orgIdInput}
            onChange={e => setOrgIdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
          />
          <button
            type="button"
            onClick={() => handleFetch(orgIdInput)}
            disabled={!orgIdInput.trim() || fetchState === 'LOADING'}
            className="px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {fetchState === 'LOADING' ? 'Loading…' : 'Load Escalations'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          GET /api/control/escalations requires orgId — results are scoped to the specified organisation.
        </p>
        {fetchState !== 'IDLE' && !isSuperAdmin && adminRole && (
          <div className="mt-4">
            <Banner tone="ERROR" message="Mutation controls are visible only to SUPER_ADMIN posture. Read access remains available." />
          </div>
        )}
      </div>

      {/* Idle state */}
      {fetchState === 'IDLE' && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🚨</div>
          <p className="text-slate-400 text-sm">Enter an organisation ID above to load escalation events.</p>
        </div>
      )}

      {/* Loading */}
      {fetchState === 'LOADING' && <LoadingState />}

      {/* Error */}
      {fetchState === 'ERROR' && error && (
        <ErrorState error={{ message: error }} onRetry={() => handleFetch(orgId)} />
      )}

      {/* Empty */}
      {fetchState === 'DONE' && escalations.length === 0 && (
        <EmptyState title="No escalations found" message={`No escalation events found for org ${truncateId(orgId)}.`} />
      )}

      {/* Results table */}
      {fetchState === 'DONE' && escalations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-200">
                {count} escalation{count === 1 ? '' : 's'}
              </span>
              <span className="ml-2 text-xs text-slate-500 font-mono">org: {truncateId(orgId)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Escalation ID</th>
                  <th className="px-5 py-3 text-left">Entity Type</th>
                  <th className="px-5 py-3 text-left">Entity ID</th>
                  <th className="px-5 py-3 text-left">Severity</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Source</th>
                  <th className="px-5 py-3 text-left">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {escalations.map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400" title={esc.id}>
                      {truncateId(esc.id)}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">
                      {esc.entityType}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400" title={esc.entityId}>
                      {truncateId(esc.entityId)}
                    </td>
                    <td className="px-5 py-4">
                      <SeverityBadge level={esc.severityLevel} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={esc.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {esc.source}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(esc.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isSuperAdmin && esc.status === 'OPEN' ? (
                        <div className="flex justify-end gap-2">
                          {esc.severityLevel < 4 && (
                            <button
                              type="button"
                              onClick={() => openUpgradeDialog(esc)}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                            >
                              Upgrade
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openResolveDialog(esc)}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            Resolve
                          </button>
                          {esc.severityLevel >= 2 && (
                            <button
                              type="button"
                              onClick={() => openOverrideDialog(esc)}
                              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:bg-rose-500/20"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renderActionDialog()}
    </div>
  );
};
