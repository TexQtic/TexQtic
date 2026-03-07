/**
 * FinanceOps — Financial Oversight panel (control-plane, admin-only)
 *
 * TECS-FBW-001 (Finance sub-unit, 2026-03-07):
 *   Added Approve / Reject per-row actions with confirm-before-submit dialog,
 *   idempotency-key generation, optional reason input, inline error handling,
 *   and success re-fetch. Read-only list rendering preserved.
 *
 *   IMPORTANT: Approve/Reject actions record authority decisions only.
 *   They do NOT execute, release, or initiate any payout or money movement.
 *   Backend: SUPER_ADMIN-only — non-SUPER_ADMIN receives 403 (surfaced as dialog error).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  approvePayoutDecision,
  rejectPayoutDecision,
  FinanceAuthorityBody,
  getPayouts,
  PayoutDecision,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Pending-action state shape ──────────────────────────────────────────────

type ActionType = 'APPROVE' | 'REJECT';

interface PendingAction {
  type: ActionType;
  payoutId: string;
  payoutLabel: string;
  idempotencyKey: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const FinanceOps: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // ── List fetch ──────────────────────────────────────────────────────────────

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPayouts();
      setPayouts(response.payouts);
    } catch (err) {
      console.error('Failed to load payouts:', err);
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleAction(type: ActionType, payout: PayoutDecision): void {
    // Generate idempotency key at click time, before dialog opens.
    // If admin cancels and reopens, a new key is generated.
    setPendingAction({
      type,
      payoutId: payout.id,
      payoutLabel: payout.id.slice(0, 8) + '...',
      idempotencyKey: window.crypto.randomUUID(),
    });
    setReason('');
    setDialogError(null);
  }

  function handleCancel(): void {
    setPendingAction(null);
    setReason('');
    setDialogError(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!pendingAction) return;

    setSubmitting(true);
    setDialogError(null);

    const body: FinanceAuthorityBody = {
      reason: reason.trim() || undefined,
    };

    try {
      if (pendingAction.type === 'APPROVE') {
        await approvePayoutDecision(pendingAction.payoutId, body, pendingAction.idempotencyKey);
      } else {
        await rejectPayoutDecision(pendingAction.payoutId, body, pendingAction.idempotencyKey);
      }
      // Success — 201 (new decision) and 200 (idempotent replay) treated equally
      setPendingAction(null);
      setReason('');
      await loadPayouts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
      setDialogError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading finance operations..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Oversight</h1>
          <p className="text-slate-400 text-sm">
            Commission rules, fee adjustments, and payout approvals.
          </p>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-xs uppercase">
          Adjust Fee Rules
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Decided Payouts</h3>
          <div className="text-3xl font-bold">{payouts.length}</div>
          <div className="text-xs text-slate-400 mt-2">Authority decisions recorded</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Approved</h3>
          <div className="text-3xl font-bold text-emerald-400">
            {payouts.filter(p => p.status === 'APPROVED').length}
          </div>
          <div className="text-xs text-slate-400 mt-2">Payout approvals</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-4">Rejected</h3>
          <div className="text-3xl font-bold text-rose-400">
            {payouts.filter(p => p.status === 'REJECTED').length}
          </div>
          <div className="text-xs text-slate-400 mt-2">Payout rejections</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
          Payout Authority Decisions
        </div>
        {payouts.length === 0 ? (
          <EmptyState title="No payout decisions" message="No payout decisions recorded yet" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Payout ID</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Decision</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Decided At</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Reason</th>
                <th className="px-6 py-3 font-bold uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payouts.map(p => (
                <tr key={p.eventId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {p.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                    >
                      {p.decision}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(p.decidedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{p.reason || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('APPROVE', p)}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('REJECT', p)}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────────────── */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-1">
              {pendingAction.type === 'APPROVE'
                ? 'Record Approval Decision'
                : 'Record Rejection Decision'}
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Payout{' '}
              <span className="font-mono text-slate-300">{pendingAction.payoutLabel}</span>{' '}
              authority decision will be{' '}
              {pendingAction.type === 'APPROVE' ? 'recorded as approved' : 'recorded as rejected'}.
              This records an intent only — no funds are moved or released.
            </p>

            <div className="mb-4">
              <label htmlFor="finance-reason" className="text-slate-400 text-xs mb-1 block">
                Reason (optional)
              </label>
              <input
                id="finance-reason"
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                placeholder="Enter reason..."
                disabled={submitting}
              />
            </div>

            {dialogError && <p className="text-rose-400 text-xs mb-3">{dialogError}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="px-4 py-2 rounded text-sm text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={`px-4 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50 ${
                  pendingAction.type === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {(() => {
                  if (submitting) return 'Processing...';
                  return pendingAction.type === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};