/**
 * EscalationsPanel — Tenant Plane (TECS-FBW-006-B)
 *
 * Surfaces tenant escalation reads plus the approved mutation subset:
 *   - create escalation via POST /api/tenant/escalations
 *   - resolve own escalation via POST /api/tenant/escalations/:id/resolve
 *
 * Constitutional compliance:
 *   D-017-A  No orgId / tenantId sent by client — tenant routes derive org scope from JWT.
 *   D-022-C  freezeRecommendation remains informational only — no kill-switch UI is exposed.
 *   Tenant plane only: no tenant upgrade, no tenant override, no ORG / GLOBAL create options.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../../services/authService';
import { APIError } from '../../services/apiClient';
import {
  createEscalation,
  listEscalations,
  resolveEscalation,
  type EscalationEvent,
  type TenantEscalationEntityType,
} from '../../services/escalationService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  onBack: () => void;
}

type BannerTone = 'SUCCESS' | 'ERROR';

interface BannerState {
  tone: BannerTone;
  message: string;
}

interface CreateDraft {
  entityType: TenantEscalationEntityType;
  entityId: string;
  severityLevel: 0 | 1;
  reason: string;
}

interface ResolveDialogState {
  escalationId: string;
  escalationLabel: string;
  severityLevel: number;
  reason: string;
}

const TENANT_ENTITY_OPTIONS: Array<{ value: TenantEscalationEntityType; label: string }> = [
  { value: 'TRADE', label: 'Trade' },
  { value: 'ESCROW', label: 'Escrow' },
  { value: 'APPROVAL', label: 'Approval' },
  { value: 'LIFECYCLE_LOG', label: 'Lifecycle Log' },
];

const ELEVATED_TENANT_ROLES = new Set(['OWNER', 'ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN']);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Severity → Badge color map ───────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  0: 'bg-slate-100 text-slate-600',
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-rose-100 text-rose-700',
  4: 'bg-rose-200 text-rose-900',
};

function SeverityBadge({ level }: { level: number }) {
  const classes = SEVERITY_COLORS[level] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${classes}`}>
      L{level}
    </span>
  );
}

// ─── Status → Badge color map ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  OPEN:       'bg-rose-100 text-rose-700',
  RESOLVED:   'bg-emerald-100 text-emerald-700',
  OVERRIDDEN: 'bg-slate-100 text-slate-600',
};

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_COLORS[status] ?? 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function friendlyEscalationError(err: unknown, fallback: string): string {
  if (err instanceof APIError) {
    if (err.code === 'TENANT_ESCALATION_RESOLVE_LEVEL_FORBIDDEN') {
      return 'Tenant resolve is limited to LEVEL_0 and LEVEL_1 escalations.';
    }
    if (err.code === 'ESCALATION_NOT_FOUND' || err.status === 404) {
      return 'The escalation was not found in your tenant scope.';
    }
    if (err.code === 'ESCALATION_NOT_OPEN') {
      return 'This escalation is no longer open.';
    }
    if (err.code === 'VALIDATION_ERROR' || err.status === 422) {
      return err.message || 'Check the escalation form and try again.';
    }
    return err.message || fallback;
  }

  return err instanceof Error ? err.message : fallback;
}

function validateCreateDraft(draft: CreateDraft): string | null {
  if (!UUID_PATTERN.test(draft.entityId.trim())) {
    return 'Entity ID must be a valid UUID.';
  }

  if (!draft.reason.trim()) {
    return 'Reason is required.';
  }

  return null;
}

function Banner({ tone, message }: BannerState) {
  const classes =
    tone === 'SUCCESS'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';

  return <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>{message}</div>;
}

// ─── EscalationsPanel ────────────────────────────────────────────────────────

export function EscalationsPanel({ onBack }: Props) {
  const [escalations, setEscalations] = useState<EscalationEvent[]>([]);
  const [count, setCount]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [userRole, setUserRole]       = useState<string | null>(null);
  const [banner, setBanner]           = useState<BannerState | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    entityType: 'TRADE',
    entityId: '',
    severityLevel: 0,
    reason: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState<CreateDraft | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<ResolveDialogState | null>(null);
  const [resolveError, setResolveError]   = useState<string | null>(null);
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  const canResolveEscalations = ELEVATED_TENANT_ROLES.has(userRole ?? '');

  const loadEscalations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, meRes] = await Promise.all([
        listEscalations({ limit: 50 }),
        getCurrentUser().catch(() => null),
      ]);
      setEscalations(res.escalations);
      setCount(res.count);
      setUserRole(meRes?.role ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  const openCreateConfirmation = () => {
    const validationMessage = validateCreateDraft(createDraft);
    if (validationMessage) {
      setCreateError(validationMessage);
      return;
    }

    setCreateError(null);
    setCreatePending({
      ...createDraft,
      entityId: createDraft.entityId.trim(),
      reason: createDraft.reason.trim(),
    });
  };

  const handleCreateConfirm = async () => {
    if (!createPending) return;

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createEscalation(createPending);
      setCreatePending(null);
      setCreateDraft({ entityType: 'TRADE', entityId: '', severityLevel: 0, reason: '' });
      setBanner({ tone: 'SUCCESS', message: 'Escalation created successfully.' });
      await loadEscalations();
    } catch (err) {
      setCreateError(friendlyEscalationError(err, 'Failed to create escalation.'));
      setBanner(null);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openResolveDialog = (escalation: EscalationEvent) => {
    setResolveError(null);
    setResolveDialog({
      escalationId: escalation.id,
      escalationLabel: truncateId(escalation.id),
      severityLevel: escalation.severityLevel,
      reason: '',
    });
  };

  const handleResolveConfirm = async () => {
    if (!resolveDialog) return;

    if (!resolveDialog.reason.trim()) {
      setResolveError('Resolution reason is required.');
      return;
    }

    setResolveSubmitting(true);
    setResolveError(null);
    try {
      await resolveEscalation(resolveDialog.escalationId, { reason: resolveDialog.reason.trim() });
      setResolveDialog(null);
      setBanner({ tone: 'SUCCESS', message: 'Escalation resolved successfully.' });
      await loadEscalations();
    } catch (err) {
      setResolveError(friendlyEscalationError(err, 'Failed to resolve escalation.'));
      setBanner(null);
    } finally {
      setResolveSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
          type="button"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escalations</h1>
          <p className="text-sm text-slate-500 mt-0.5">G-022 escalation events for your organisation with approved tenant create and resolve actions.</p>
        </div>
      </div>

      {banner && <Banner tone={banner.tone} message={banner.message} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create Escalation</h2>
            <p className="text-sm text-slate-500 mt-1">
              Tenant create is limited to LEVEL_0 and LEVEL_1 with approved tenant entity types only.
            </p>
          </div>

          {createError && <Banner tone="ERROR" message={createError} />}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="tenant-escalation-entity-type">
              Entity Type
            </label>
            <select
              id="tenant-escalation-entity-type"
              value={createDraft.entityType}
              onChange={event => {
                setCreateError(null);
                setCreateDraft(prev => ({ ...prev, entityType: event.target.value as TenantEscalationEntityType }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {TENANT_ENTITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="tenant-escalation-entity-id">
              Entity ID
            </label>
            <input
              id="tenant-escalation-entity-id"
              type="text"
              value={createDraft.entityId}
              onChange={event => {
                setCreateError(null);
                setCreateDraft(prev => ({ ...prev, entityId: event.target.value }));
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <p className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Severity</p>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map(level => {
                const selected = createDraft.severityLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setCreateError(null);
                      setCreateDraft(prev => ({ ...prev, severityLevel: level as 0 | 1 }));
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="text-sm font-semibold">LEVEL_{level}</div>
                    <div className={`mt-1 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {level === 0 ? 'Informational escalation.' : 'Operational escalation without upgrade authority.'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="tenant-escalation-reason">
              Reason
            </label>
            <textarea
              id="tenant-escalation-reason"
              value={createDraft.reason}
              onChange={event => {
                setCreateError(null);
                setCreateDraft(prev => ({ ...prev, reason: event.target.value }));
              }}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Describe why this escalation is required."
            />
          </div>

          <button
            type="button"
            onClick={openCreateConfirmation}
            disabled={createSubmitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createSubmitting ? 'Submitting…' : 'Review Create'}
          </button>

          <p className="text-xs text-slate-500">
            Submit requires two phases: complete the form, then confirm the mutation before it is sent.
          </p>
        </section>

        <section className="space-y-4">
          {!canResolveEscalations && userRole && (
            <Banner tone="ERROR" message="Resolve actions are limited to elevated tenant roles (OWNER / ADMIN posture)." />
          )}

          {/* States */}
          {loading && <LoadingState />}
          {error && !loading && (
            <ErrorState error={{ message: error }} onRetry={loadEscalations} />
          )}
          {!loading && !error && escalations.length === 0 && (
            <EmptyState title="No escalations found" message="No escalation events found for your organisation." />
          )}

          {/* Table */}
          {!loading && !error && escalations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {count} escalation{count !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Escalation ID</th>
                      <th className="px-6 py-3 text-left">Entity Type</th>
                      <th className="px-6 py-3 text-left">Entity ID</th>
                      <th className="px-6 py-3 text-left">Severity</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {escalations.map(esc => (
                      <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-600" title={esc.id}>
                          {truncateId(esc.id)}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {esc.entityType}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600" title={esc.entityId}>
                          {truncateId(esc.entityId)}
                        </td>
                        <td className="px-6 py-4">
                          <SeverityBadge level={esc.severityLevel} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={esc.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(esc.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {esc.status === 'OPEN' && canResolveEscalations ? (
                            <button
                              type="button"
                              onClick={() => openResolveDialog(esc)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {createPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Escalation Create</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review the tenant escalation details below. This is the required second confirmation step before submit.
            </p>

            <dl className="mt-5 space-y-3 text-sm text-slate-700">
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Entity Type</dt>
                <dd>{createPending.entityType}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Entity ID</dt>
                <dd className="font-mono text-xs">{createPending.entityId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Severity</dt>
                <dd>LEVEL_{createPending.severityLevel}</dd>
              </div>
              <div className="space-y-1">
                <dt className="font-medium text-slate-500">Reason</dt>
                <dd className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{createPending.reason}</dd>
              </div>
            </dl>

            {createError && <div className="mt-4"><Banner tone="ERROR" message={createError} /></div>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreatePending(null)}
                disabled={createSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateConfirm}
                disabled={createSubmitting}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {createSubmitting ? 'Creating…' : 'Confirm Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resolveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Tenant Resolve</h2>
            <p className="mt-1 text-sm text-slate-500">
              Resolve escalation <span className="font-mono text-xs text-slate-700">{resolveDialog.escalationLabel}</span>. A non-empty reason is required.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Severity: <span className="font-semibold">LEVEL_{resolveDialog.severityLevel}</span>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5" htmlFor="tenant-resolve-reason">
                Resolution Reason
              </label>
              <textarea
                id="tenant-resolve-reason"
                value={resolveDialog.reason}
                onChange={event => {
                  setResolveError(null);
                  setResolveDialog(prev => (prev ? { ...prev, reason: event.target.value } : prev));
                }}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Explain how the escalation was resolved."
              />
            </div>

            {resolveError && <div className="mt-4"><Banner tone="ERROR" message={resolveError} /></div>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResolveDialog(null)}
                disabled={resolveSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveConfirm}
                disabled={resolveSubmitting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {resolveSubmitting ? 'Resolving…' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
