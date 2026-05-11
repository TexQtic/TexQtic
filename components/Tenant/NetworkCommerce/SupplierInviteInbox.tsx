import React, { useCallback, useEffect, useState, type ReactElement } from 'react';
import { APIError } from '../../../services/apiClient';
import {
  acceptIncomingSupplierInvite,
  declineIncomingSupplierInvite,
  listIncomingSupplierInvites,
  viewIncomingSupplierInvite,
  type SupplierInviteInboxItem,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';

type SupplierInviteInboxProps = Readonly<{
  onBack?: () => void;
}>;

type UiState =
  | 'loading'
  | 'empty'
  | 'ready'
  | 'feature-disabled'
  | 'not-found'
  | 'invalid-state'
  | 'error';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function classifyError(error: unknown): { state: UiState; message: string } {
  if (error instanceof APIError) {
    if (error.code === 'FEATURE_DISABLED' || error.status === 503) {
      return {
        state: 'feature-disabled',
        message: 'Supplier invite inbox is currently disabled for this tenant.',
      };
    }

    if (
      error.code === 'INVALID_STATE' ||
      error.code === 'INVALID_TRANSITION' ||
      error.status === 422
    ) {
      return {
        state: 'invalid-state',
        message: error.message || 'This invite action is not allowed in the current state.',
      };
    }

    if (
      error.code === 'SUPPLIER_INVITE_NOT_FOUND' ||
      error.status === 404
    ) {
      return {
        state: 'not-found',
        message: error.message || 'Invite not found.',
      };
    }

    return {
      state: 'error',
      message: error.message || 'Unable to process invite request.',
    };
  }

  if (error instanceof Error) {
    return { state: 'error', message: error.message };
  }

  return { state: 'error', message: 'Unable to process invite request.' };
}

function statusBadgeClass(status: string): string {
  const key = status.toUpperCase();
  if (key === 'PENDING') return 'border-amber-300 bg-amber-50 text-amber-900';
  if (key === 'ACCEPTED') return 'border-emerald-300 bg-emerald-50 text-emerald-900';
  if (key === 'DECLINED') return 'border-rose-300 bg-rose-50 text-rose-900';
  if (key === 'CANCELLED') return 'border-slate-300 bg-slate-50 text-slate-700';
  if (key === 'EXPIRED') return 'border-orange-300 bg-orange-50 text-orange-900';
  return 'border-slate-300 bg-slate-50 text-slate-700';
}

export function SupplierInviteInbox({ onBack }: SupplierInviteInboxProps): ReactElement {
  const [uiState, setUiState] = useState<UiState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invites, setInvites] = useState<SupplierInviteInboxItem[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<SupplierInviteInboxItem | null>(null);
  const [actionBusyInviteId, setActionBusyInviteId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');

  const refreshInvites = useCallback(async () => {
    setUiState('loading');
    setErrorMessage(null);

    try {
      const rows = await listIncomingSupplierInvites();
      setInvites(rows);
      setSelectedInvite((current) => {
        if (!current) return null;
        return rows.find((row) => row.id === current.id) ?? null;
      });
      setUiState(rows.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      const resolution = classifyError(error);
      setInvites([]);
      setSelectedInvite(null);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    }
  }, []);

  useEffect(() => {
    void refreshInvites();
  }, [refreshInvites]);

  const handleViewInvite = useCallback(async (inviteId: string) => {
    setErrorMessage(null);
    try {
      const detail = await viewIncomingSupplierInvite(inviteId);
      setSelectedInvite(detail);
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    }
  }, []);

  const handleAccept = useCallback(async (inviteId: string) => {
    setActionBusyInviteId(inviteId);
    setErrorMessage(null);

    try {
      await acceptIncomingSupplierInvite(inviteId);
      await refreshInvites();
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    } finally {
      setActionBusyInviteId(null);
    }
  }, [refreshInvites]);

  const handleDecline = useCallback(async (inviteId: string) => {
    setActionBusyInviteId(inviteId);
    setErrorMessage(null);

    try {
      await declineIncomingSupplierInvite(inviteId, {
        declineReason: declineReason.trim() ? declineReason.trim() : null,
      });
      setDeclineReason('');
      await refreshInvites();
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    } finally {
      setActionBusyInviteId(null);
    }
  }, [declineReason, refreshInvites]);

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading supplier invite inbox..." />
      </div>
    );
  }

  const statusCard =
    uiState === 'feature-disabled' ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-lg font-bold">Supplier Invite Inbox Disabled</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Supplier invite inbox is currently disabled.'}</p>
      </div>
    ) : uiState === 'invalid-state' ? (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
        <h2 className="text-lg font-bold">Invalid Invite Action</h2>
        <p className="mt-2 text-sm">{errorMessage || 'This invite action is not allowed in the current state.'}</p>
      </div>
    ) : uiState === 'not-found' ? (
      <div className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900">
        <h2 className="text-lg font-bold">Invite Not Found</h2>
        <p className="mt-2 text-sm">{errorMessage || 'The selected invite was not found.'}</p>
      </div>
    ) : uiState === 'error' ? (
      <div className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900">
        <h2 className="text-lg font-bold">Unable to Load Inbox</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Unexpected error while loading invite inbox.'}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Supplier Invite Inbox</h1>
              <p className="mt-2 text-sm text-slate-600">
                Incoming RFQ invitations from pool owners. Review, accept, or decline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void refreshInvites();
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Refresh
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  Back
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Total: {invites.length}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Pending: {invites.filter((inv) => inv.status.toUpperCase() === 'PENDING').length}
            </span>
          </div>
        </header>

        {statusCard}

        {uiState === 'empty' && !statusCard && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-600">No pending invitations found.</p>
            <p className="mt-1 text-xs text-slate-400">
              When a pool owner sends you an RFQ invite it will appear here.
            </p>
          </div>
        )}

        {invites.length > 0 && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-slate-900">Invitations ({invites.length})</h2>
              {invites.map((invite) => {
                const status = invite.status.toUpperCase();
                const isPending = status === 'PENDING';
                const isBusy = actionBusyInviteId === invite.id;
                const isSelected = selectedInvite?.id === invite.id;
                return (
                  <article
                    key={invite.id}
                    className={`rounded-2xl border px-4 py-4 transition ${isSelected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(status)}`}>
                        {status}
                      </span>
                      <span className="text-xs text-slate-500">Ref: {invite.invite_ref}</span>
                    </div>

                    {invite.rfq_ref && (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">RFQ:</span> {invite.rfq_ref}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-500">
                      Invited {formatTimestamp(invite.invited_at)}
                      {invite.expires_at && ` · Expires ${formatTimestamp(invite.expires_at)}`}
                    </p>

                    {invite.supplier_message && (
                      <p className="mt-2 text-xs italic text-slate-600">
                        &ldquo;{invite.supplier_message}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleViewInvite(invite.id);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition"
                      >
                        View Detail
                      </button>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              void handleAccept(invite.id);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                          >
                            {isBusy ? 'Processing...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              void handleDecline(invite.id);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                          >
                            {isBusy ? 'Processing...' : 'Decline'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Decline Reason (optional — applies to next decline action)</span>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    placeholder="Reason for declining (optional)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                  />
                </label>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Invite Detail</h2>
              {!selectedInvite ? (
                <p className="mt-3 text-sm text-slate-600">Select an invite to view RFQ details.</p>
              ) : (
                <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invite Ref</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900 break-all">{selectedInvite.invite_ref}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</dt>
                    <dd className="mt-1">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(selectedInvite.status)}`}>
                        {selectedInvite.status.toUpperCase()}
                      </span>
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invited At</dt>
                    <dd className="mt-1 text-sm text-slate-700">{formatTimestamp(selectedInvite.invited_at)}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Expires At</dt>
                    <dd className="mt-1 text-sm text-slate-700">{formatTimestamp(selectedInvite.expires_at)}</dd>
                  </div>
                  {selectedInvite.accepted_at && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Accepted At</dt>
                      <dd className="mt-1 text-sm text-emerald-800">{formatTimestamp(selectedInvite.accepted_at)}</dd>
                    </div>
                  )}
                  {selectedInvite.declined_at && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-rose-600">Declined At</dt>
                      <dd className="mt-1 text-sm text-rose-800">{formatTimestamp(selectedInvite.declined_at)}</dd>
                    </div>
                  )}
                  {selectedInvite.supplier_message && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Message</dt>
                      <dd className="mt-1 text-sm text-slate-700 italic">&ldquo;{selectedInvite.supplier_message}&rdquo;</dd>
                    </div>
                  )}
                  {selectedInvite.rfq_ref && (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                        <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RFQ Reference</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{selectedInvite.rfq_ref}</dd>
                      </div>
                      {selectedInvite.rfq_status && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RFQ Status</dt>
                          <dd className="mt-1 text-sm text-slate-700">{selectedInvite.rfq_status}</dd>
                        </div>
                      )}
                      {selectedInvite.rfq_version != null && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RFQ Version</dt>
                          <dd className="mt-1 text-sm text-slate-700">v{selectedInvite.rfq_version}</dd>
                        </div>
                      )}
                      {selectedInvite.response_deadline_at && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Response Deadline</dt>
                          <dd className="mt-1 text-sm font-semibold text-amber-900">{formatTimestamp(selectedInvite.response_deadline_at)}</dd>
                        </div>
                      )}
                      {selectedInvite.issued_at && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RFQ Issued At</dt>
                          <dd className="mt-1 text-sm text-slate-700">{formatTimestamp(selectedInvite.issued_at)}</dd>
                        </div>
                      )}
                      {selectedInvite.line_count != null && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Line Count</dt>
                          <dd className="mt-1 text-sm text-slate-700">{selectedInvite.line_count}</dd>
                        </div>
                      )}
                      {selectedInvite.total_qty != null && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Qty</dt>
                          <dd className="mt-1 text-sm text-slate-700">{selectedInvite.total_qty} {selectedInvite.qty_unit ?? ''}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              )}
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
