/**
 * QuoteReviewPanel.tsx — FE-9 pool owner quote review / award allocation surface
 *
 * Renders one of:
 * - loading state (fetching quotes)
 * - feature-disabled state (503 FEATURE_DISABLED — nc.procurement_pools.rfq.award.enabled=false)
 * - empty state (no quotes submitted yet)
 * - ready state (list of quotes with accept/reject controls for SUBMITTED quotes)
 * - error state (generic)
 *
 * Security:
 * - Never renders metadataInternalJson (QD-5/ops-only).
 * - Never renders withdrawReason (supplier-internal).
 * - Never renders member demand breakdown.
 * - Accept/reject controls are hidden when feature-disabled (503).
 * - Accept/reject controls are shown only for SUBMITTED quotes.
 */
import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { APIError } from '../../../services/apiClient';
import { getCurrentUser } from '../../../services/authService';
import {
  approveAwardApproval,
  getOwnerQuotesForRfq,
  getPendingAwardApprovalsForRfq,
  rejectAwardApproval,
  rejectQuoteForRfq,
  requestAwardApprovalForQuote,
  type AwardApprovalRequest,
  type OwnerQuote,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';

export type QuoteReviewPanelProps = Readonly<{
  poolId: string;
  rfqId: string;
  onBack: () => void;
}>;

type ReviewUiState = 'loading' | 'feature-disabled' | 'empty' | 'ready' | 'error';

type RejectDialogState = Readonly<{
  quoteId: string;
  reason: string;
  submitting: boolean;
  error: string | null;
}>;

type RequestAwardDialogState = Readonly<{
  quoteId: string;
  reason: string;
  submitting: boolean;
  error: string | null;
}>;

type RejectApprovalDialogState = Readonly<{
  approvalId: string;
  reason: string;
  submitting: boolean;
  error: string | null;
}>;

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function formatAmount(amount: string, currency: string): string {
  const parsed = parseFloat(amount);
  if (Number.isNaN(parsed)) return `${amount} ${currency}`;
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(parsed)} ${currency}`;
}

function quoteStatusBadge(status: string): ReactElement {
  const upper = status.toUpperCase();
  if (upper === 'ACCEPTED') {
    return (
      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-emerald-800">
        Accepted
      </span>
    );
  }
  if (upper === 'REJECTED') {
    return (
      <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-rose-700">
        Rejected
      </span>
    );
  }
  if (upper === 'WITHDRAWN') {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Withdrawn
      </span>
    );
  }
  // SUBMITTED
  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-sky-700">
      Submitted
    </span>
  );
}

function classifyLoadError(error: unknown): { state: ReviewUiState; message: string } {
  if (error instanceof APIError) {
    if (error.code === 'FEATURE_DISABLED' || error.status === 503) {
      return {
        state: 'feature-disabled',
        message: 'Award review is not yet active (nc.procurement_pools.rfq.award.enabled=false).',
      };
    }
    return { state: 'error', message: error.message || 'Unable to load quotes.' };
  }
  if (error instanceof Error) return { state: 'error', message: error.message };
  return { state: 'error', message: 'Unable to load quotes.' };
}

function classifyMcError(error: unknown): string {
  if (error instanceof APIError) {
    const code = error.code ?? '';
    if (code === 'AWARD_REQUEST_ALREADY_PENDING') return 'An approval is already pending for this quote.';
    if (code === 'APPROVAL_NOT_FOUND') return 'Approval record not found.';
    if (code === 'APPROVAL_ALREADY_DECIDED') return 'This approval has already been decided.';
    if (code === 'APPROVAL_EXPIRED') return 'This approval request has expired.';
    if (code === 'MAKER_CHECKER_SAME_ACTOR') return 'The same person cannot both request and approve an award.';
    if (code === 'QUOTE_NO_LONGER_SUBMITTED') return 'This quote is no longer in a submitted state.';
    return error.message || 'Action failed.';
  }
  if (error instanceof Error) return error.message;
  return 'Action failed.';
}

export function QuoteReviewPanel({ poolId, rfqId, onBack }: QuoteReviewPanelProps): ReactElement {
  const [uiState, setUiState] = useState<ReviewUiState>('loading');
  const [quotes, setQuotes] = useState<OwnerQuote[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<AwardApprovalRequest[]>([]);
  const [requestingAwardId, setRequestingAwardId] = useState<string | null>(null);
  const [mcActionError, setMcActionError] = useState<string | null>(null);
  const [requestAwardDialog, setRequestAwardDialog] = useState<RequestAwardDialogState | null>(null);
  const [approvingApprovalId, setApprovingApprovalId] = useState<string | null>(null);
  const [rejectApprovalDialog, setRejectApprovalDialog] = useState<RejectApprovalDialogState | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);

  const loadData = useCallback(async () => {
    setUiState('loading');
    setErrorMessage(null);
    setMcActionError(null);
    setRejectDialog(null);
    setRequestAwardDialog(null);
    try {
      const data = await getOwnerQuotesForRfq(poolId, rfqId);
      const [approvalsResult, userResult] = await Promise.allSettled([
        getPendingAwardApprovalsForRfq(poolId, rfqId),
        getCurrentUser({ retry: false, dedupe: true }),
      ]);
      setQuotes(data);
      setPendingApprovals(approvalsResult.status === 'fulfilled' ? approvalsResult.value : []);
      setCurrentUserId(userResult.status === 'fulfilled' ? userResult.value.user.id : null);
      setUiState(data.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      const resolution = classifyLoadError(error);
      setQuotes([]);
      setPendingApprovals([]);
      setUiState(resolution.state);
      setErrorMessage(resolution.message || null);
    }
  }, [poolId, rfqId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenRequestAwardDialog = useCallback((quoteId: string) => {
    setRequestAwardDialog({ quoteId, reason: '', submitting: false, error: null });
  }, []);

  const handleRequestAwardSubmit = useCallback(async () => {
    if (!requestAwardDialog) return;
    setRequestAwardDialog((prev) => (prev ? { ...prev, submitting: true, error: null } : null));
    try {
      await requestAwardApprovalForQuote(poolId, rfqId, requestAwardDialog.quoteId, {
        request_reason: requestAwardDialog.reason.trim(),
        request_id: null,
      });
      setRequestAwardDialog(null);
      await loadData();
    } catch (error) {
      const msg = classifyMcError(error);
      setRequestAwardDialog((prev) => (prev ? { ...prev, submitting: false, error: msg } : null));
    }
  }, [poolId, rfqId, requestAwardDialog, loadData]);

  const handleApproveAward = useCallback(
    async (approvalId: string) => {
      setApprovingApprovalId(approvalId);
      setMcActionError(null);
      try {
        await approveAwardApproval(poolId, rfqId, approvalId, {
          approve_reason: '',
          request_id: null,
        });
        await loadData();
      } catch (error) {
        setMcActionError(classifyMcError(error));
      } finally {
        setApprovingApprovalId(null);
      }
    },
    [poolId, rfqId, loadData],
  );

  const handleOpenRejectApprovalDialog = useCallback((approvalId: string) => {
    setRejectApprovalDialog({ approvalId, reason: '', submitting: false, error: null });
  }, []);

  const handleRejectApprovalSubmit = useCallback(async () => {
    if (!rejectApprovalDialog) return;
    setRejectApprovalDialog((prev) => (prev ? { ...prev, submitting: true, error: null } : null));
    try {
      await rejectAwardApproval(poolId, rfqId, rejectApprovalDialog.approvalId, {
        reject_reason: rejectApprovalDialog.reason.trim(),
        request_id: null,
      });
      setRejectApprovalDialog(null);
      await loadData();
    } catch (error) {
      const msg = classifyMcError(error);
      setRejectApprovalDialog((prev) => (prev ? { ...prev, submitting: false, error: msg } : null));
    }
  }, [poolId, rfqId, rejectApprovalDialog, loadData]);

  const handleOpenRejectDialog = useCallback((quoteId: string) => {
    setRejectDialog({ quoteId, reason: '', submitting: false, error: null });
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectDialog) return;
    setRejectDialog((prev) => (prev ? { ...prev, submitting: true, error: null } : null));
    try {
      await rejectQuoteForRfq(poolId, rfqId, rejectDialog.quoteId, rejectDialog.reason.trim() || null);
      setRejectDialog(null);
      await loadData();
    } catch (error) {
      const msg =
        error instanceof APIError
          ? error.message || 'Failed to reject quote.'
          : error instanceof Error
            ? error.message
            : 'Failed to reject quote.';
      setRejectDialog((prev) => (prev ? { ...prev, submitting: false, error: msg } : null));
    }
  }, [poolId, rfqId, rejectDialog, loadData]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading quote review panel..." />
      </div>
    );
  }

  // ── Feature-disabled ─────────────────────────────────────────────────────────

  if (uiState === 'feature-disabled') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">RFQ Award Review Disabled</h1>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Back
              </button>
            </div>
          </header>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6 shadow-sm">
            <h2 className="text-lg font-bold text-amber-900">Award Review Not Active</h2>
            <p className="mt-3 text-sm text-amber-800">
              The RFQ Award Review surface is currently disabled.
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Feature flag{' '}
              <code className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-xs font-mono">
                nc.procurement_pools.rfq.award.enabled
              </code>{' '}
              is set to{' '}
              <code className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-xs font-mono">
                false
              </code>
              . Accept and reject controls will be available once this flag is activated by an
              authorized operator.
            </p>
            <p className="mt-3 text-xs text-amber-700">
              {errorMessage || 'No action required. This is an expected feature-gated state.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (uiState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Quote Review Panel</h1>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Back
              </button>
            </div>
          </header>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 shadow-sm">
            <h2 className="text-base font-bold text-rose-900">Failed to Load Quotes</h2>
            <p className="mt-2 text-sm text-rose-800">{errorMessage || 'An unexpected error occurred.'}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-50 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty + Ready ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">

        {/* Header */}
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Quote Review Panel</h1>
              <p className="mt-2 text-sm text-slate-600">
                Review submitted quotes and accept or reject individual quotes for this RFQ.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Back
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Pool: {poolId.slice(0, 8)}…
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              RFQ: {rfqId.slice(0, 8)}…
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </header>

        {/* MC action error banner */}
        {mcActionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <span className="font-semibold">Action failed: </span>{mcActionError}
          </div>
        )}

        {/* Empty state */}
        {uiState === 'empty' && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm text-center">
            <p className="text-lg font-semibold text-slate-700">No Quotes Yet</p>
            <p className="mt-2 text-sm text-slate-500">
              No supplier quotes have been submitted for this RFQ. Quotes will appear here once
              suppliers respond to their invites.
            </p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Quote list */}
        {uiState === 'ready' && quotes.map((quote) => {
          const isSubmitted = quote.status.toUpperCase() === 'SUBMITTED';
          const isAccepted = quote.status.toUpperCase() === 'ACCEPTED';
          const pendingApproval = pendingApprovals.find((a) => a.entity_id === quote.id) ?? null;
          const isRequestingThis = requestingAwardId === quote.id;
          const isCheckerEligible =
            pendingApproval !== null &&
            currentUserId !== null &&
            currentUserId !== pendingApproval.requested_by_user_id;
          const isApprovingThis = approvingApprovalId === (pendingApproval?.id ?? '');

          return (
            <article
              key={quote.id}
              className={`rounded-3xl border px-6 py-6 shadow-sm ${
                isAccepted
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Quote header row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900 break-all">
                    {quote.quote_ref}
                  </span>
                  {quoteStatusBadge(quote.status)}
                  {isAccepted && (
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-emerald-900">
                      Winning Quote
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {formatAmount(quote.quote_amount, quote.currency)}
                </span>
              </div>

              {/* Quote details */}
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Submitted</dt>
                  <dd className="mt-1 text-slate-700">{formatTimestamp(quote.submitted_at)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Valid Until</dt>
                  <dd className="mt-1 text-slate-700">{formatTimestamp(quote.validity_until)}</dd>
                </div>
                {isAccepted && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Accepted At</dt>
                    <dd className="mt-1 text-emerald-800">{formatTimestamp(quote.accepted_at)}</dd>
                  </div>
                )}
                {quote.status.toUpperCase() === 'REJECTED' && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-rose-500">Rejected At</dt>
                    <dd className="mt-1 text-rose-700">{formatTimestamp(quote.rejected_at)}</dd>
                  </div>
                )}
              </dl>

              {/* Supplier note */}
              {quote.supplier_note && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Supplier Note</p>
                  <p className="mt-1 text-sm text-slate-700">{quote.supplier_note}</p>
                </div>
              )}

              {/* Reject reason (if present) */}
              {quote.reject_reason && (
                <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-rose-500">Reject Reason</p>
                  <p className="mt-1 text-sm text-rose-700">{quote.reject_reason}</p>
                </div>
              )}

              {/* Maker-Checker award controls — SUBMITTED quotes only */}
              {isSubmitted && (
                <div className="mt-5">
                  {pendingApproval ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600">Award Approval Pending</p>
                      <p className="mt-2 text-sm text-sky-800">
                        <span className="font-semibold">Reason:</span>{' '}
                        {pendingApproval.request_reason || '—'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-sky-700">
                        <span>Requested: {formatTimestamp(pendingApproval.created_at)}</span>
                        <span>Expires: {formatTimestamp(pendingApproval.expires_at)}</span>
                      </div>
                      {isCheckerEligible && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={isApprovingThis}
                            onClick={() => { void handleApproveAward(pendingApproval.id); }}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                            aria-label={`Approve award for quote ${quote.quote_ref}`}
                          >
                            {isApprovingThis ? 'Approving…' : 'Approve Award'}
                          </button>
                          <button
                            type="button"
                            disabled={isApprovingThis}
                            onClick={() => handleOpenRejectApprovalDialog(pendingApproval.id)}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                            aria-label={`Reject approval for quote ${quote.quote_ref}`}
                          >
                            Reject Approval
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isRequestingThis}
                        onClick={() => handleOpenRequestAwardDialog(quote.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                        aria-label={`Request award approval for quote ${quote.quote_ref}`}
                      >
                        {isRequestingThis ? 'Requesting…' : 'Request Award Approval'}
                      </button>
                      <button
                        type="button"
                        disabled={isRequestingThis}
                        onClick={() => handleOpenRejectDialog(quote.id)}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                        aria-label={`Reject quote ${quote.quote_ref}`}
                      >
                        Reject Quote
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {/* Reject dialog */}
        {rejectDialog && (
          <div
            role="dialog"
            aria-label="Reject quote"
            className="rounded-3xl border border-rose-200 bg-white px-6 py-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-rose-900">Reject Quote</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provide an optional reason for rejecting this quote. This will be stored for audit
              purposes.
            </p>
            <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
              <span>Reject Reason (optional)</span>
              <textarea
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                rows={3}
                maxLength={1000}
                disabled={rejectDialog.submitting}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400"
                placeholder="Optional reason for rejection"
              />
            </label>

            {rejectDialog.error && (
              <p className="mt-2 text-sm text-rose-700">{rejectDialog.error}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={rejectDialog.submitting}
                onClick={() => { void handleRejectSubmit(); }}
                className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                {rejectDialog.submitting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                type="button"
                disabled={rejectDialog.submitting}
                onClick={() => setRejectDialog(null)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Request award approval dialog */}
        {requestAwardDialog && (
          <div
            role="dialog"
            aria-label="Request award approval"
            className="rounded-3xl border border-emerald-200 bg-white px-6 py-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-emerald-900">Request Award Approval</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provide an optional reason for this award request. A checker will review and approve
              or reject it.
            </p>
            <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
              <span>Request Reason (optional)</span>
              <textarea
                value={requestAwardDialog.reason}
                onChange={(e) =>
                  setRequestAwardDialog((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                rows={3}
                maxLength={1000}
                disabled={requestAwardDialog.submitting}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                placeholder="Optional reason for award request"
              />
            </label>

            {requestAwardDialog.error && (
              <p className="mt-2 text-sm text-rose-700">{requestAwardDialog.error}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={requestAwardDialog.submitting}
                onClick={() => { void handleRequestAwardSubmit(); }}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                {requestAwardDialog.submitting ? 'Requesting…' : 'Confirm Request'}
              </button>
              <button
                type="button"
                disabled={requestAwardDialog.submitting}
                onClick={() => setRequestAwardDialog(null)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reject approval dialog */}
        {rejectApprovalDialog && (
          <div
            role="dialog"
            aria-label="Reject approval"
            className="rounded-3xl border border-amber-200 bg-white px-6 py-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-amber-900">Reject Award Approval</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provide an optional reason for rejecting this award approval request.
            </p>
            <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
              <span>Reject Reason (optional)</span>
              <textarea
                value={rejectApprovalDialog.reason}
                onChange={(e) =>
                  setRejectApprovalDialog((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                }
                rows={3}
                maxLength={1000}
                disabled={rejectApprovalDialog.submitting}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400"
                placeholder="Optional reason for rejecting the approval"
              />
            </label>

            {rejectApprovalDialog.error && (
              <p className="mt-2 text-sm text-rose-700">{rejectApprovalDialog.error}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={rejectApprovalDialog.submitting}
                onClick={() => { void handleRejectApprovalSubmit(); }}
                className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                {rejectApprovalDialog.submitting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                type="button"
                disabled={rejectApprovalDialog.submitting}
                onClick={() => setRejectApprovalDialog(null)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
