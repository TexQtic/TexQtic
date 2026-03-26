/**
 * ComplianceQueue — Trust & Compliance panel (control-plane, admin-only)
 *
 * Re-anchored to canonical certification-backed records for OPS-CASEWORK-001.
 * The control-plane compliance surface now supervises durable certification
 * identity and lifecycle state rather than synthetic compliance.request events.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ComplianceRecord,
  getComplianceRequests,
  recordComplianceSupervisionOutcome,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

const STATE_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-sky-900/50 text-sky-300',
  UNDER_REVIEW: 'bg-amber-900/50 text-amber-300',
  APPROVED: 'bg-emerald-900/50 text-emerald-300',
  REJECTED: 'bg-rose-900/60 text-rose-200',
  REVOKED: 'bg-red-900/60 text-red-200',
  EXPIRED: 'bg-slate-700 text-slate-400',
  PENDING_APPROVAL: 'bg-violet-900/50 text-violet-300',
};

function StateBadge({ stateKey }: Readonly<{ stateKey: string }>) {
  const cls = STATE_COLORS[stateKey] ?? 'bg-slate-700 text-slate-300';
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${cls}`}>
      {stateKey}
    </span>
  );
}

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ComplianceQueue: React.FC = () => {
  const [requests, setRequests] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogRecord, setDialogRecord] = useState<ComplianceRecord | null>(null);
  const [dialogOutcome, setDialogOutcome] = useState<'VERIFIED' | 'FOLLOW_UP_REQUIRED'>('VERIFIED');
  const [dialogReason, setDialogReason] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);

  // ── List fetch ──────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getComplianceRequests();
      setRequests(response.requests);
    } catch (err) {
      console.error('Failed to load compliance requests:', err);
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openOutcomeDialog = (record: ComplianceRecord) => {
    setDialogRecord(record);
    setDialogOutcome(record.supervision?.status ?? 'VERIFIED');
    setDialogReason(record.supervision?.reason ?? '');
    setDialogError(null);
  };

  const resetOutcomeDialog = () => {
    setDialogRecord(null);
    setDialogOutcome('VERIFIED');
    setDialogReason('');
    setDialogError(null);
  };

  const closeOutcomeDialog = () => {
    if (savingOutcome) {
      return;
    }

    resetOutcomeDialog();
  };

  const handleRecordOutcome = async () => {
    if (!dialogRecord) {
      return;
    }

    const trimmedReason = dialogReason.trim();
    if (!trimmedReason) {
      setDialogError('Reason is required.');
      return;
    }

    setSavingOutcome(true);
    setDialogError(null);
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${dialogRecord.certificationId}-${Date.now()}`;
      await recordComplianceSupervisionOutcome(
        dialogRecord.certificationId,
        {
          outcome: dialogOutcome,
          reason: trimmedReason,
        },
        idempotencyKey,
      );
      await loadRequests();
      resetOutcomeDialog();
    } catch (err) {
      console.error('Failed to record compliance supervision outcome:', err);
      setDialogError(err instanceof Error ? err.message : 'Failed to record supervision outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  const renderSupervisionBadge = (record: ComplianceRecord) => {
    if (!record.supervision) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">UNREVIEWED</span>;
    }

    if (record.supervision.status === 'VERIFIED') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">VERIFIED</span>;
    }

    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300">FOLLOW_UP_REQUIRED</span>;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading compliance data..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Trust & Compliance</h1>
          <p className="text-slate-400 text-sm">
            Review durable certification-backed compliance records.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100">
        Compliance now reads canonical certification records as the primary supervised object. Legacy compliance request decisions are not the primary read surface in this tranche.
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
        Supervision outcomes recorded here are control-plane casework only. They attach to certificationId, do not redesign certification lifecycle semantics, and do not revive compliance.request as the primary supervised object.
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            title="No compliance records"
            message="No certification-backed compliance records returned yet"
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Certification ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Org ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Type</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">State</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Issued</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Expires</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Casework</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(req => (
                <tr key={req.certificationId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {truncateId(req.certificationId)}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                    {truncateId(req.orgId)}
                  </td>
                  <td className="px-6 py-4 text-slate-200 text-xs">
                    {req.certificationType}
                  </td>
                  <td className="px-6 py-4">
                    <StateBadge stateKey={req.stateKey} />
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatDateTime(req.issuedAt)}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatDateTime(req.expiresAt)}</td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2">
                      <div>{renderSupervisionBadge(req)}</div>
                      {req.supervision && (
                        <div className="space-y-1 text-[10px] text-slate-400">
                          <p>{req.supervision.reason || 'No reason recorded'}</p>
                          <p>{formatDateTime(req.supervision.recordedAt)}</p>
                        </div>
                      )}
                      <button
                        onClick={() => openOutcomeDialog(req)}
                        className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-500/20"
                      >
                        {req.supervision ? 'Update Outcome' : 'Record Outcome'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Record Compliance Supervision Outcome</h2>
              <p className="mt-1 text-xs text-slate-400">
                This records control-plane casework only for certification <span className="font-mono">{dialogRecord.certificationId}</span>. It does not mutate certification lifecycle truth.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400 md:grid-cols-2">
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-500">Org</p>
                  <p className="mt-1 font-mono">{dialogRecord.orgId}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-500">Type</p>
                  <p className="mt-1">{dialogRecord.certificationType}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Outcome</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() => setDialogOutcome('VERIFIED')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${dialogOutcome === 'VERIFIED' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'}`}
                  >
                    <p className="text-sm font-bold">VERIFIED</p>
                    <p className="mt-1 text-xs">Record that the certification-backed compliance record has been reviewed and verified.</p>
                  </button>
                  <button
                    onClick={() => setDialogOutcome('FOLLOW_UP_REQUIRED')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${dialogOutcome === 'FOLLOW_UP_REQUIRED' ? 'border-amber-500/50 bg-amber-500/10 text-amber-100' : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'}`}
                  >
                    <p className="text-sm font-bold">FOLLOW_UP_REQUIRED</p>
                    <p className="mt-1 text-xs">Record that the certification-backed compliance record needs further operator follow-up.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="compliance-supervision-reason">
                  Reason
                </label>
                <textarea
                  id="compliance-supervision-reason"
                  value={dialogReason}
                  onChange={event => setDialogReason(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Required. Explain the supervision outcome."
                />
              </div>

              {dialogError && (
                <div className="rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-sm text-rose-300">
                  {dialogError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
              <button
                onClick={closeOutcomeDialog}
                disabled={savingOutcome}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleRecordOutcome();
                }}
                disabled={savingOutcome}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {savingOutcome ? 'Recording…' : 'Confirm Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

