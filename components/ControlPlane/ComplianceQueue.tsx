/**
 * ComplianceQueue — Trust & Compliance panel (control-plane, admin-only)
 *
 * TECS-FBW-001 (Compliance sub-unit, 2026-03-07):
 *   Added Approve / Reject per-row actions with confirm-before-submit dialog,
 *   idempotency-key generation, optional reason / notes inputs, inline error
 *   handling, and success re-fetch. Read-only list rendering preserved.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  approveComplianceRequest,
  rejectComplianceRequest,
  ComplianceAuthorityBody,
  ComplianceDecision,
  getComplianceRequests,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── Pending-action state shape ──────────────────────────────────────────────

type ActionType = 'APPROVE' | 'REJECT';

interface PendingAction {
  type: ActionType;
  requestId: string;
  requestLabel: string;
  idempotencyKey: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ComplianceQueue: React.FC = () => {
  const [requests, setRequests] = useState<ComplianceDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

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

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleAction(type: ActionType, req: ComplianceDecision): void {
    // Generate idempotency key at click time, before dialog opens.
    // If admin cancels and reopens, a new key is generated.
    setPendingAction({
      type,
      requestId: req.id,
      requestLabel: req.id.slice(0, 8) + '...',
      idempotencyKey: window.crypto.randomUUID(),
    });
    setReason('');
    setNotes('');
    setDialogError(null);
  }

  function handleCancel(): void {
    setPendingAction(null);
    setReason('');
    setNotes('');
    setDialogError(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!pendingAction) return;

    setSubmitting(true);
    setDialogError(null);

    const body: ComplianceAuthorityBody = {
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (pendingAction.type === 'APPROVE') {
        await approveComplianceRequest(pendingAction.requestId, body, pendingAction.idempotencyKey);
      } else {
        await rejectComplianceRequest(pendingAction.requestId, body, pendingAction.idempotencyKey);
      }
      // Success (201 created or 200 replay both treated as success)
      setPendingAction(null);
      setReason('');
      setNotes('');
      await loadRequests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
      setDialogError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading compliance data..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Trust & Compliance</h1>
          <p className="text-slate-400 text-sm">
            Review merchant credentials and business certifications.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            title="No compliance decisions"
            message="No compliance decisions recorded yet"
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Request ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Decision</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Decided At</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Reason</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(req => (
                <tr key={req.eventId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {req.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                    >
                      {req.decision}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(req.decidedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{req.reason || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('APPROVE', req)}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('REJECT', req)}
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
              {pendingAction.type === 'APPROVE' ? 'Approve' : 'Reject'} Compliance Request
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Request{' '}
              <span className="font-mono text-slate-300">{pendingAction.requestLabel}</span> will be{' '}
              {pendingAction.type === 'APPROVE' ? 'approved' : 'rejected'}.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="compliance-reason" className="text-slate-400 text-xs mb-1 block">Reason (optional)</label>
                <input
                  id="compliance-reason"
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  placeholder="Enter reason..."
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="compliance-notes" className="text-slate-400 text-xs mb-1 block">Notes (optional)</label>
                <textarea
                  id="compliance-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 resize-none"
                  rows={3}
                  placeholder="Enter notes..."
                  disabled={submitting}
                />
              </div>
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
                  return pendingAction.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

