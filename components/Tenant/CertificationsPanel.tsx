/**
 * CertificationsPanel — Tenant Plane, G-019 (TECS-FBW-005)
 *
 * Surfaces certification lifecycle management for the authenticated tenant:
 *   - List view : GET /api/tenant/certifications
 *   - Create form: POST /api/tenant/certifications
 *   - Detail view: GET /api/tenant/certifications/:id
 *   - Transition form: POST /api/tenant/certifications/:id/transition
 *
 * Constitutional compliance:
 *   D-017-A  No orgId / tenantId in any request body — tenantPost/tenantGet
 *            enforce TENANT realm; server derives org scope from JWT.
 *   D-020-C  aiTriggered flag NOT exposed. If ESCALATION_REQUIRED is returned,
 *            surface as a named result state only — do not re-submit.
 *   D-020-D  reason is mandatory for create and transition; form blocks empty submit.
 *
 * Scope (TECS-FBW-005):
 *   ✅ List certifications
 *   ✅ Create certification (SUBMITTED state)
 *   ✅ View certification detail
 *   ✅ Lifecycle transition — APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED
 *   ❌ Metadata PATCH editing — deferred
 *   ❌ aiTriggered path — excluded (D-020-C)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  listCertifications,
  getCertification,
  createCertification,
  transitionCertification,
  type CertificationListItem,
  type CertificationDetail,
  type TransitionStatus,
  type CreateCertificationResult,
  type TransitionCertificationResult,
} from '../../services/certificationService';
import { APIError } from '../../services/apiClient';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

// ─── Panel view state machine ─────────────────────────────────────────────────

type PanelView = 'LIST' | 'CREATE' | 'DETAIL';
type CreatePhase = 'IDLE' | 'SUBMITTING' | 'CREATED' | 'ERROR';
type TransitionPhase = 'IDLE' | 'SUBMITTING' | 'RESULT' | 'ERROR';

// ─── State key → badge color ─────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  SUBMITTED:         'bg-sky-100 text-sky-700',
  UNDER_REVIEW:      'bg-amber-100 text-amber-700',
  APPROVED:          'bg-emerald-100 text-emerald-700',
  REJECTED:          'bg-rose-100 text-rose-700',
  REVOKED:           'bg-red-100 text-red-800',
  EXPIRED:           'bg-slate-100 text-slate-500',
  PENDING_APPROVAL:  'bg-violet-100 text-violet-700',
};

function StateKeyBadge({ stateKey }: { stateKey: string }) {
  const cls = STATE_COLORS[stateKey] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {stateKey}
    </span>
  );
}

// ─── Transition outcome → display config ─────────────────────────────────────

const TRANSITION_OUTCOME_CONFIG: Record<
  TransitionStatus,
  { icon: string; bg: string; title: string; desc: string }
> = {
  APPLIED: {
    icon: '✅',
    bg: 'bg-emerald-50 border-emerald-200',
    title: 'Transition Applied',
    desc: 'The certification lifecycle state has been updated successfully.',
  },
  PENDING_APPROVAL: {
    icon: '⏳',
    bg: 'bg-violet-50 border-violet-200',
    title: 'Pending Approval',
    desc: 'The transition requires maker-checker approval before it takes effect.',
  },
  ESCALATION_REQUIRED: {
    icon: '⚠️',
    bg: 'bg-amber-50 border-amber-200',
    title: 'Escalation Required',
    desc: 'The transition triggered an escalation. No state change was applied — contact your administrator.',
  },
};

// ─── Known error code → readable message ─────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED:            'Unauthorised — please re-authenticate.',
  FORBIDDEN:               'You do not have permission to perform this action.',
  NOT_FOUND:               'Certification not found.',
  INVALID_LIFECYCLE_STATE: 'The certification is in an invalid lifecycle state.',
  INVALID_INPUT:           'Invalid input — check all required fields.',
  TRANSITION_NOT_APPLIED:  'The requested lifecycle transition is not permitted from the current state.',
  STATE_MACHINE_ERROR:     'A state machine error occurred. Please contact support.',
  DB_ERROR:                'A database error occurred. Please try again.',
  REASON_REQUIRED:         'A reason is required for this action.',
};

function friendlyError(err: unknown): string {
  if (err instanceof APIError) {
    const code = err.code as string | undefined;
    return (code !== undefined && code in ERROR_MESSAGES)
      ? ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]
      : err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Back link shared by sub-views
function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
    >
      ← {label}
    </button>
  );
}

// ─── CertificationsPanel ─────────────────────────────────────────────────────

export function CertificationsPanel({ onBack }: Props) {
  // ── Panel navigation ──
  const [panelView, setPanelView]       = useState<PanelView>('LIST');
  const [selectedId, setSelectedId]     = useState<string | null>(null);

  // ── LIST state ──
  const [items, setItems]               = useState<CertificationListItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [listLoading, setListLoading]   = useState(true);
  const [listError, setListError]       = useState<string | null>(null);

  // ── DETAIL state ──
  const [detail, setDetail]             = useState<CertificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]   = useState<string | null>(null);

  // ── CREATE form state ──
  const [createType, setCreateType]     = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createIssuedAt, setCreateIssuedAt]   = useState('');
  const [createExpiresAt, setCreateExpiresAt] = useState('');
  const [createPhase, setCreatePhase]   = useState<CreatePhase>('IDLE');
  const [createResult, setCreateResult] = useState<CreateCertificationResult | null>(null);
  const [createError, setCreateError]   = useState<string | null>(null);

  // ── TRANSITION form state ──
  const [txToState, setTxToState]       = useState('');
  const [txReason, setTxReason]         = useState('');
  const [txActorRole, setTxActorRole]   = useState('');
  const [txPhase, setTxPhase]           = useState<TransitionPhase>('IDLE');
  const [txResult, setTxResult]         = useState<TransitionCertificationResult | null>(null);
  const [txError, setTxError]           = useState<string | null>(null);

  // ── Load list ──
  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await listCertifications({ limit: 50 });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setListError(friendlyError(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ── Load detail ──
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await getCertification(id);
      setDetail(res.certification);
    } catch (err) {
      setDetailError(friendlyError(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Navigate to detail ──
  const openDetail = (id: string) => {
    setSelectedId(id);
    setTxPhase('IDLE');
    setTxResult(null);
    setTxError(null);
    setTxToState('');
    setTxReason('');
    setTxActorRole('');
    setPanelView('DETAIL');
    loadDetail(id);
  };

  // ── Navigate to create ──
  const openCreate = () => {
    setCreateType('');
    setCreateReason('');
    setCreateIssuedAt('');
    setCreateExpiresAt('');
    setCreatePhase('IDLE');
    setCreateResult(null);
    setCreateError(null);
    setPanelView('CREATE');
  };

  // ── Back to list ──
  const goToList = () => {
    setPanelView('LIST');
    setSelectedId(null);
    loadList();
  };

  // ── Create submit ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createType.trim()) { setCreateError('Certification type is required.'); return; }
    if (!createReason.trim()) { setCreateError('Reason is required (D-020-D).'); return; }
    setCreatePhase('SUBMITTING');
    setCreateError(null);
    try {
      const res = await createCertification({
        certificationType: createType.trim(),
        reason:            createReason.trim(),
        issuedAt:          createIssuedAt || null,
        expiresAt:         createExpiresAt || null,
      });
      setCreateResult(res);
      setCreatePhase('CREATED');
    } catch (err) {
      setCreateError(friendlyError(err));
      setCreatePhase('ERROR');
    }
  };

  // ── Transition submit ──
  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!txToState.trim()) { setTxError('Target state key is required.'); return; }
    if (!txReason.trim())  { setTxError('Reason is required (D-020-D).'); return; }
    if (!txActorRole.trim()) { setTxError('Actor role is required.'); return; }
    setTxPhase('SUBMITTING');
    setTxError(null);
    try {
      const res = await transitionCertification(selectedId, {
        toStateKey: txToState.trim().toUpperCase(),
        reason:     txReason.trim(),
        actorRole:  txActorRole.trim(),
      });
      setTxResult(res);
      setTxPhase('RESULT');
      // Reload detail to reflect updated state
      loadDetail(selectedId);
    } catch (err) {
      setTxError(friendlyError(err));
      setTxPhase('ERROR');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: LIST
  // ─────────────────────────────────────────────────────────────

  if (panelView === 'LIST') {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackLink label="Back" onClick={onBack} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Certifications</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              G-019 certification lifecycle management (tenant-scoped)
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
          >
            + New Certification
          </button>
        </div>

        {/* States */}
        {listLoading && <LoadingState />}
        {listError && !listLoading && (
          <ErrorState error={{ message: listError }} onRetry={loadList} />
        )}
        {!listLoading && !listError && items.length === 0 && (
          <EmptyState
            title="No certifications"
            message="No certifications found. Create your first certification to get started."
          />
        )}

        {/* Table */}
        {!listLoading && !listError && items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {total} certification{total !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={loadList}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">State</th>
                    <th className="px-6 py-3 text-left">Issued</th>
                    <th className="px-6 py-3 text-left">Expires</th>
                    <th className="px-6 py-3 text-left">Created</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(cert => (
                    <tr key={cert.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {truncateId(cert.id)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {cert.certificationType}
                      </td>
                      <td className="px-6 py-4">
                        <StateKeyBadge stateKey={cert.stateKey} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(cert.issuedAt)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(cert.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {formatDate(cert.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => openDetail(cert.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold transition"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: CREATE
  // ─────────────────────────────────────────────────────────────

  if (panelView === 'CREATE') {
    // Success outcome
    if (createPhase === 'CREATED' && createResult) {
      return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
          <BackLink label="Back to Certifications" onClick={goToList} />
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-emerald-800">Certification Created</h2>
            <div className="text-sm text-emerald-700 space-y-1">
              <p>
                <span className="font-semibold">Type:</span>{' '}
                {createResult.certificationType}
              </p>
              <p>
                <span className="font-semibold">State:</span>{' '}
                <StateKeyBadge stateKey={createResult.stateKey} />
              </p>
              <p className="font-mono text-xs text-emerald-600 mt-2">
                ID: {createResult.certificationId}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => openDetail(createResult.certificationId)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition"
              >
                View Certification
              </button>
              <button
                type="button"
                onClick={goToList}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackLink label="Back to Certifications" onClick={goToList} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Certification</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Submit a certification in SUBMITTED state
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5"
        >
          {/* certificationType */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="cert-type">
              Certification Type <span className="text-rose-500">*</span>
            </label>
            <input
              id="cert-type"
              type="text"
              value={createType}
              onChange={e => setCreateType(e.target.value)}
              placeholder="e.g. GOTS, ISO_9001, OEKO_TEX"
              disabled={createPhase === 'SUBMITTING'}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* reason (D-020-D: mandatory) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="cert-reason">
              Reason <span className="text-rose-500">*</span>
              <span className="ml-2 text-slate-400 normal-case font-normal">(D-020-D — required)</span>
            </label>
            <textarea
              id="cert-reason"
              value={createReason}
              onChange={e => setCreateReason(e.target.value)}
              placeholder="Mandatory justification for creating this certification"
              rows={3}
              disabled={createPhase === 'SUBMITTING'}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-y"
            />
          </div>

          {/* issuedAt (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="cert-issued-at">
              Issued At <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="cert-issued-at"
              type="datetime-local"
              value={createIssuedAt}
              onChange={e => setCreateIssuedAt(e.target.value)}
              disabled={createPhase === 'SUBMITTING'}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* expiresAt (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="cert-expires-at">
              Expires At <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="cert-expires-at"
              type="datetime-local"
              value={createExpiresAt}
              onChange={e => setCreateExpiresAt(e.target.value)}
              disabled={createPhase === 'SUBMITTING'}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Inline error */}
          {createError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
              {createError}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={createPhase === 'SUBMITTING'}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPhase === 'SUBMITTING' ? 'Submitting…' : 'Submit Certification'}
            </button>
            <button
              type="button"
              onClick={goToList}
              disabled={createPhase === 'SUBMITTING'}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: DETAIL
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackLink label="Back to Certifications" onClick={goToList} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certification Detail</h1>
          <p className="text-sm text-slate-500 mt-0.5">G-019 certification lifecycle</p>
        </div>
      </div>

      {/* Detail loading / error */}
      {detailLoading && <LoadingState />}
      {detailError && !detailLoading && (
        <ErrorState
          error={{ message: detailError }}
          onRetry={() => selectedId && loadDetail(selectedId)}
        />
      )}

      {/* Detail card */}
      {!detailLoading && !detailError && detail && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detail.certificationType}</h2>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{detail.id}</p>
              </div>
              <StateKeyBadge stateKey={detail.stateKey} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Organisation</span>
                <p className="font-mono text-xs text-slate-700 mt-0.5 truncate">{detail.orgId}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Created By</span>
                <p className="font-mono text-xs text-slate-700 mt-0.5">
                  {detail.createdByUserId ? truncateId(detail.createdByUserId) : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Issued At</span>
                <p className="text-slate-700 mt-0.5">{formatDate(detail.issuedAt)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Expires At</span>
                <p className="text-slate-700 mt-0.5">{formatDate(detail.expiresAt)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Created</span>
                <p className="text-slate-700 mt-0.5">{formatDate(detail.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Updated</span>
                <p className="text-slate-700 mt-0.5">{formatDate(detail.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* ── Transition result (rendered when txPhase === 'RESULT') ── */}
          {txPhase === 'RESULT' && txResult && (
            <div className={`rounded-2xl border p-6 space-y-3 ${TRANSITION_OUTCOME_CONFIG[txResult.status].bg}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{TRANSITION_OUTCOME_CONFIG[txResult.status].icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {TRANSITION_OUTCOME_CONFIG[txResult.status].title}
                  </h3>
                  <p className="text-sm text-slate-700">
                    {TRANSITION_OUTCOME_CONFIG[txResult.status].desc}
                  </p>
                </div>
              </div>
              {txResult.newStateKey && (
                <div className="text-sm text-slate-700">
                  New state:{' '}
                  <StateKeyBadge stateKey={txResult.newStateKey} />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setTxPhase('IDLE');
                  setTxResult(null);
                  setTxError(null);
                  setTxToState('');
                  setTxReason('');
                  setTxActorRole('');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 underline"
              >
                Perform another transition
              </button>
            </div>
          )}

          {/* ── Transition error ── */}
          {txPhase === 'ERROR' && txError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
              <p className="font-semibold text-rose-800 mb-1">Transition Failed</p>
              <p className="text-sm text-rose-700">{txError}</p>
              <button
                type="button"
                onClick={() => {
                  setTxPhase('IDLE');
                  setTxError(null);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline mt-3"
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Transition form (shown when IDLE or SUBMITTING) ── */}
          {(txPhase === 'IDLE' || txPhase === 'SUBMITTING') && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lifecycle Transition</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Advance this certification to a new lifecycle state.
                </p>
              </div>

              <form onSubmit={handleTransition} className="space-y-5">
                {/* toStateKey */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="tx-to-state">
                    Target State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-to-state"
                    type="text"
                    value={txToState}
                    onChange={e => setTxToState(e.target.value)}
                    placeholder="e.g. APPROVED, REJECTED, REVOKED"
                    disabled={txPhase === 'SUBMITTING'}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* reason (D-020-D: mandatory) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="tx-reason">
                    Reason <span className="text-rose-500">*</span>
                    <span className="ml-2 text-slate-400 normal-case font-normal">(D-020-D — required)</span>
                  </label>
                  <textarea
                    id="tx-reason"
                    value={txReason}
                    onChange={e => setTxReason(e.target.value)}
                    placeholder="Mandatory justification for this lifecycle transition"
                    rows={3}
                    disabled={txPhase === 'SUBMITTING'}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-y"
                  />
                </div>

                {/* actorRole (required) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5" htmlFor="tx-actor-role">
                    Actor Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-actor-role"
                    type="text"
                    value={txActorRole}
                    onChange={e => setTxActorRole(e.target.value)}
                    placeholder="e.g. TENANT_ADMIN, AUDITOR, COMPLIANCE_OFFICER"
                    disabled={txPhase === 'SUBMITTING'}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Inline transition error */}
                {txError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
                    {txError}
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={txPhase === 'SUBMITTING'}
                    className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {txPhase === 'SUBMITTING' ? 'Submitting…' : 'Submit Transition'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
