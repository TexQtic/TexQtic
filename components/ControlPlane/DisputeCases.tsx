/**
 * DisputeCases — Risk & Disputes Panel (Control Plane)
 *
 * TECS-FBW-001 Disputes sub-unit (2026-03-07):
 *   Added Resolve / Escalate per-card actions with confirm-before-submit dialog,
 *   idempotency-key generation at click time, optional resolution / notes inputs,
 *   inline error display, and success re-fetch. Actions suppressed for RESOLVED
 *   disputes. Local copy-pattern from ComplianceQueue; no shared abstraction.
 *   Route gating: any-admin (adminAuthMiddleware); no SUPER_ADMIN preHandler.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  getDisputes,
  resolveDispute,
  escalateDispute,
  type DisputeDecision,
  type DisputeAuthorityBody,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

type ActionType = 'resolve' | 'escalate';

interface PendingAction {
  type: ActionType;
  entityId: string;
  disputeLabel: string;
  idempotencyKey: string;
}

export const DisputeCases: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDisputes();
      setDisputes(response.disputes);
    } catch (err) {
      console.error('Failed to load disputes:', err);
      setError('Failed to load dispute data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // Generate UUID at click time; stored in pendingAction so confirm uses the same key.
  // If admin cancels and re-clicks, a new UUID is generated.
  function handleAction(type: ActionType, dispute: DisputeDecision): void {
    setPendingAction({
      type,
      entityId: dispute.entityId,
      disputeLabel: dispute.tradeReference || `Trade ${dispute.entityId.slice(0, 8)}`,
      idempotencyKey: globalThis.crypto.randomUUID(),
    });
    setResolution('');
    setNotes('');
    setDialogError(null);
  }

  function handleCancel(): void {
    setPendingAction(null);
    setResolution('');
    setNotes('');
    setDialogError(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!pendingAction) return;
    setSubmitting(true);
    setDialogError(null);

    const body: DisputeAuthorityBody = {
      resolution: resolution.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const fn = pendingAction.type === 'resolve' ? resolveDispute : escalateDispute;
      // 200 (replay) and 201 (new write) are both treated as success.
      await fn(pendingAction.entityId, body, pendingAction.idempotencyKey);
      setPendingAction(null);
      setResolution('');
      setNotes('');
      setDialogError(null);
      await loadDisputes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed. Please try again.';
      setDialogError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading disputes..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  const isResolveAction = pendingAction?.type === 'resolve';
  const dialogTitle = isResolveAction ? 'Record Resolution Decision' : 'Record Escalation Decision';
  const dialogVerb = isResolveAction ? 'Resolve' : 'Escalate';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Risk & Disputes</h1>
          <p className="text-slate-400 text-sm">Mediate conflicts between buyers and suppliers.</p>
        </div>
      </div>

      {disputes.length === 0 ? (
        <EmptyState title="No disputes" message="No dispute decisions recorded yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {disputes.map(c => (
            <div
              key={c.entityId}
              className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${c.status === 'RESOLVED' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}
                >
                  {c.decision ?? c.status}
                </div>
                <div className="text-xs text-slate-500 font-mono">{c.entityId.slice(0, 8)}...</div>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100">{c.tradeReference}</h3>
                <p className="text-xs text-slate-500 font-mono">Trade {c.entityId}</p>
                {c.resolution && (
                  <p className="text-sm text-slate-400 leading-relaxed italic">"{c.resolution}"</p>
                )}
                {c.notes && <p className="text-sm text-slate-500">{c.notes}</p>}
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${c.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  ></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {c.decidedAt ? new Date(c.decidedAt).toLocaleDateString() : 'No operator action yet'}
                </div>
              </div>
              {/* Action row — additive only; suppressed for already-resolved disputes */}
              {c.status !== 'RESOLVED' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction('resolve', c)}
                    className="flex-1 text-xs font-semibold px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleAction('escalate', c)}
                    className="flex-1 text-xs font-semibold px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    Escalate
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm-before-submit dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white">{dialogTitle}</h2>
            <p className="text-sm text-slate-400">
              Target:{' '}
              <span className="font-mono text-slate-300">{pendingAction.disputeLabel}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="dispute-resolution"
                  className="block text-xs font-semibold text-slate-400 mb-1"
                >
                  Resolution <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  id="dispute-resolution"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  rows={3}
                  placeholder="Describe the resolution..."
                  className="w-full rounded bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 focus:outline-none focus:border-slate-500 resize-none"
                />
              </div>
              <div>
                <label
                  htmlFor="dispute-notes"
                  className="block text-xs font-semibold text-slate-400 mb-1"
                >
                  Notes <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  id="dispute-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full rounded bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 focus:outline-none focus:border-slate-500 resize-none"
                />
              </div>
            </div>

            {dialogError && (
              <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">
                {dialogError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 text-sm font-semibold px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={`flex-1 text-sm font-semibold px-4 py-2 rounded text-white transition-colors disabled:opacity-50 ${isResolveAction ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
              >
                {submitting ? 'Submitting...' : dialogVerb}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
