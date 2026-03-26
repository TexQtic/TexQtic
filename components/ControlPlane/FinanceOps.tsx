/**
 * FinanceOps — Financial Oversight panel (control-plane, admin-only)
 *
 * Re-anchored to durable settlement provenance for OPS-CASEWORK-001.
 * The operator entry surface now reads canonical RELEASE_DEBIT settlement rows
 * instead of payout-intent EventLog entries. Action-path changes remain out of scope.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getFinanceRecords,
  FinanceRecord,
  recordFinanceSupervisionOutcome,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

export interface FinanceEscrowBridgeTarget {
  financeRecordId: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FinanceOpsProps {
  onOpenEscrowScope?: (_target: FinanceEscrowBridgeTarget) => void;
}

export const FinanceOps: React.FC<FinanceOpsProps> = ({ onOpenEscrowScope }) => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogRecord, setDialogRecord] = useState<FinanceRecord | null>(null);
  const [dialogOutcome, setDialogOutcome] = useState<'VERIFIED' | 'FOLLOW_UP_REQUIRED'>('VERIFIED');
  const [dialogReason, setDialogReason] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);

  // ── List fetch ──────────────────────────────────────────────────────────────

  const loadFinanceRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFinanceRecords();
      setRecords(response.records);
    } catch (err) {
      console.error('Failed to load finance records:', err);
      setError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceRecords();
  }, [loadFinanceRecords]);

  const appliedCount = records.filter(record => record.status === 'APPLIED').length;
  const reviewedCount = records.filter(record => record.supervision !== null).length;
  const distinctEscrowCount = new Set(records.map(record => record.escrowId)).size;
  const distinctTenantCount = new Set(records.map(record => record.tenantId)).size;

  const openOutcomeDialog = (record: FinanceRecord) => {
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
      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${dialogRecord.id}-${Date.now()}`;
      await recordFinanceSupervisionOutcome(
        dialogRecord.id,
        {
          outcome: dialogOutcome,
          reason: trimmedReason,
        },
        idempotencyKey,
      );
      await loadFinanceRecords();
      resetOutcomeDialog();
    } catch (err) {
      console.error('Failed to record finance supervision outcome:', err);
      setDialogError(err instanceof Error ? err.message : 'Failed to record supervision outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  const renderSupervisionBadge = (record: FinanceRecord) => {
    if (!record.supervision) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">UNREVIEWED</span>;
    }

    if (record.supervision.status === 'VERIFIED') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">VERIFIED</span>;
    }

    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300">FOLLOW_UP_REQUIRED</span>;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading finance operations..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Oversight</h1>
          <p className="text-slate-400 text-sm">
            Review durable finance records and record bounded supervision outcomes.
          </p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">
          Adjust Fee Rules
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Finance Records</h3>
          <div className="text-3xl font-bold">{records.length}</div>
          <div className="text-xs text-slate-400 mt-2">Durable settlement ledger rows</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Applied Settlements</h3>
          <div className="text-3xl font-bold text-emerald-400">{appliedCount}</div>
          <div className="text-xs text-slate-400 mt-2">Canonical RELEASE_DEBIT entries</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Casework Coverage</h3>
          <div className="text-3xl font-bold text-sky-300">{reviewedCount}</div>
          <div className="text-xs text-slate-400 mt-2">Reviewed across {distinctEscrowCount} escrows in {distinctTenantCount} tenant{distinctTenantCount === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100">
        Finance now reads durable settlement provenance from RELEASE_DEBIT ledger rows. Supervision outcomes recorded here are control-plane casework only and do not move funds or mutate escrow or settlement truth.
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
          Durable Finance Records
        </div>
        {records.length === 0 ? (
          <EmptyState title="No finance records" message="No durable settlement ledger rows recorded yet" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Settlement ID</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Status</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Tenant</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Escrow</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Reference</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Amount</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Recorded At</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Casework</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Follow-Through</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {record.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs" title={record.tenantId}>
                    {record.tenantId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs" title={record.escrowId}>
                    {record.escrowId.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{record.referenceId || '—'}</td>
                  <td className="px-6 py-4 text-slate-200 text-xs">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: record.currency,
                      minimumFractionDigits: 2,
                    }).format(Number(record.amount))}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2">
                      <div>{renderSupervisionBadge(record)}</div>
                      {record.supervision && (
                        <div className="space-y-1 text-[10px] text-slate-400">
                          <p>{record.supervision.reason || 'No reason recorded'}</p>
                          <p>{new Date(record.supervision.recordedAt).toLocaleString()}</p>
                        </div>
                      )}
                      <button
                        onClick={() => openOutcomeDialog(record)}
                        className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-500/20"
                      >
                        {record.supervision ? 'Update Outcome' : 'Record Outcome'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {onOpenEscrowScope ? (
                      <button
                        onClick={() => onOpenEscrowScope({
                          financeRecordId: record.id,
                          tenantId: record.tenantId,
                          escrowId: record.escrowId,
                          referenceId: record.referenceId,
                        })}
                        className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300 transition-colors hover:bg-sky-500/20"
                      >
                        Open Escrow
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
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
              <h2 className="text-lg font-bold text-white">Record Finance Supervision Outcome</h2>
              <p className="mt-1 text-xs text-slate-400">
                This records supervision outcome only for finance record <span className="font-mono">{dialogRecord.id}</span>. It moves no funds and does not mutate escrow or settlement truth.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400 md:grid-cols-2">
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-500">Tenant</p>
                  <p className="mt-1 font-mono">{dialogRecord.tenantId}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-500">Escrow</p>
                  <p className="mt-1 font-mono">{dialogRecord.escrowId}</p>
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
                    <p className="mt-1 text-xs">Record that the finance record has been reviewed and verified.</p>
                  </button>
                  <button
                    onClick={() => setDialogOutcome('FOLLOW_UP_REQUIRED')}
                    className={`rounded-lg border px-4 py-3 text-left transition ${dialogOutcome === 'FOLLOW_UP_REQUIRED' ? 'border-amber-500/50 bg-amber-500/10 text-amber-100' : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'}`}
                  >
                    <p className="text-sm font-bold">FOLLOW_UP_REQUIRED</p>
                    <p className="mt-1 text-xs">Record that the finance record needs further operator follow-up.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="finance-supervision-reason">
                  Reason
                </label>
                <textarea
                  id="finance-supervision-reason"
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