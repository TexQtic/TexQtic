import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { APIError } from '../../../services/apiClient';
import {
  cancelSupplierInvite,
  getSupplierInvite,
  listSupplierInvitesForRfq,
  sendSupplierInvite,
  type CancelSupplierInviteInput,
  type NetworkPoolRfqSupplierInvite,
  type SendSupplierInviteInput,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';

type SupplierInviteOwnerSurfaceProps = Readonly<{
  poolId: string;
  rfqId?: string | null;
  rfqRef?: string | null;
  onBack?: () => void;
}>;

type UiState =
  | 'context-required'
  | 'loading'
  | 'empty'
  | 'ready'
  | 'feature-disabled'
  | 'forbidden'
  | 'invalid-state'
  | 'duplicate'
  | 'not-found'
  | 'error';

type SendFormState = Readonly<{
  supplier_org_id: string;
  expires_at: string;
  supplier_message: string;
}>;

const DEFAULT_SEND_FORM: SendFormState = {
  supplier_org_id: '',
  expires_at: '',
  supplier_message: '',
};

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
        message: 'Supplier invites are currently disabled for this tenant.',
      };
    }

    if (error.status === 403 || error.code === 'FORBIDDEN') {
      return {
        state: 'forbidden',
        message: error.message || 'Only pool owners/admins can manage supplier invites.',
      };
    }

    if (error.code === 'SUPPLIER_INVITE_ALREADY_SENT') {
      return {
        state: 'duplicate',
        message: error.message || 'An invite for this supplier already exists for this RFQ.',
      };
    }

    if (
      error.code === 'INVALID_STATE' ||
      error.code === 'INVALID_TRANSITION' ||
      error.code === 'SUPPLIER_INVITE_CONFLICT'
    ) {
      return {
        state: 'invalid-state',
        message: error.message || 'This invite action is not allowed in the current state.',
      };
    }

    if (
      error.code === 'POOL_NOT_FOUND' ||
      error.code === 'RFQ_NOT_FOUND' ||
      error.code === 'SUPPLIER_INVITE_NOT_FOUND' ||
      error.status === 404
    ) {
      return {
        state: 'not-found',
        message: error.message || 'Pool/RFQ/invite context is not available.',
      };
    }

    return {
      state: 'error',
      message: error.message || 'Unable to process supplier invite request.',
    };
  }

  if (error instanceof Error) {
    return { state: 'error', message: error.message };
  }

  return { state: 'error', message: 'Unable to process supplier invite request.' };
}

function toIsoOrNull(datetimeLocalValue: string): string | null {
  if (!datetimeLocalValue.trim()) {
    return null;
  }

  const parsed = new Date(datetimeLocalValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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

export function SupplierInviteOwnerSurface({
  poolId,
  rfqId,
  rfqRef,
  onBack,
}: SupplierInviteOwnerSurfaceProps): ReactElement {
  const [uiState, setUiState] = useState<UiState>(rfqId ? 'loading' : 'context-required');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invites, setInvites] = useState<NetworkPoolRfqSupplierInvite[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<NetworkPoolRfqSupplierInvite | null>(null);
  const [sendForm, setSendForm] = useState<SendFormState>(DEFAULT_SEND_FORM);
  const [sendBusy, setSendBusy] = useState(false);
  const [cancelBusyInviteId, setCancelBusyInviteId] = useState<string | null>(null);

  const pendingInviteCount = useMemo(
    () => invites.filter((invite) => invite.status.toUpperCase() === 'PENDING').length,
    [invites],
  );

  const refreshInvites = useCallback(async () => {
    if (!rfqId) {
      setUiState('context-required');
      setErrorMessage('RFQ context required. Issue or select an RFQ first.');
      setInvites([]);
      setSelectedInvite(null);
      return;
    }

    setUiState('loading');
    setErrorMessage(null);

    try {
      const rows = await listSupplierInvitesForRfq(poolId, rfqId);
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
  }, [poolId, rfqId]);

  useEffect(() => {
    void refreshInvites();
  }, [refreshInvites]);

  const handleSendInvite = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rfqId) {
      setUiState('context-required');
      setErrorMessage('RFQ context required. Issue or select an RFQ first.');
      return;
    }

    if (!sendForm.supplier_org_id.trim()) {
      setUiState('invalid-state');
      setErrorMessage('supplier_org_id is required.');
      return;
    }

    const payload: SendSupplierInviteInput = {
      supplier_org_id: sendForm.supplier_org_id.trim(),
      expires_at: toIsoOrNull(sendForm.expires_at),
      supplier_message: sendForm.supplier_message.trim() ? sendForm.supplier_message.trim() : null,
    };

    setSendBusy(true);
    setErrorMessage(null);

    try {
      await sendSupplierInvite(poolId, rfqId, payload);
      setSendForm(DEFAULT_SEND_FORM);
      await refreshInvites();
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    } finally {
      setSendBusy(false);
    }
  }, [poolId, refreshInvites, rfqId, sendForm]);

  const handleViewInvite = useCallback(async (inviteId: string) => {
    if (!rfqId) {
      setUiState('context-required');
      setErrorMessage('RFQ context required.');
      return;
    }

    setErrorMessage(null);
    try {
      const detail = await getSupplierInvite(poolId, rfqId, inviteId);
      setSelectedInvite(detail);
      setUiState(invites.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    }
  }, [invites.length, poolId, rfqId]);

  const handleCancelInvite = useCallback(async (inviteId: string) => {
    if (!rfqId) {
      setUiState('context-required');
      setErrorMessage('RFQ context required.');
      return;
    }

    setCancelBusyInviteId(inviteId);
    setErrorMessage(null);

    const input: CancelSupplierInviteInput = {
      cancel_reason: 'Cancelled from FE-6 owner UI',
    };

    try {
      await cancelSupplierInvite(poolId, rfqId, inviteId, input);
      await refreshInvites();
      if (selectedInvite?.id === inviteId) {
        setSelectedInvite(null);
      }
    } catch (error) {
      const resolution = classifyError(error);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    } finally {
      setCancelBusyInviteId(null);
    }
  }, [poolId, refreshInvites, rfqId, selectedInvite?.id]);

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading supplier invites..." />
      </div>
    );
  }

  const contextRequiredCard = uiState === 'context-required' ? (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-900">
      <h2 className="text-lg font-bold">RFQ Context Required</h2>
      <p className="mt-2 text-sm text-slate-600">
        Issue or select an RFQ first, then open Supplier Invite Owner UI.
      </p>
    </div>
  ) : null;

  const statusCard =
    uiState === 'feature-disabled' ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-lg font-bold">Supplier Invite Disabled</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Supplier invites are currently disabled.'}</p>
      </div>
    ) : uiState === 'forbidden' ? (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900">
        <h2 className="text-lg font-bold">Not Authorized</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Only owners/admins can manage supplier invites.'}</p>
      </div>
    ) : uiState === 'invalid-state' ? (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
        <h2 className="text-lg font-bold">Invalid Invite State</h2>
        <p className="mt-2 text-sm">{errorMessage || 'This invite action is not allowed.'}</p>
      </div>
    ) : uiState === 'duplicate' ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-lg font-bold">Duplicate Invite</h2>
        <p className="mt-2 text-sm">{errorMessage || 'A supplier invite already exists for this RFQ.'}</p>
      </div>
    ) : uiState === 'not-found' ? (
      <div className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900">
        <h2 className="text-lg font-bold">Invite Context Not Found</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Pool, RFQ, or invite was not found.'}</p>
      </div>
    ) : uiState === 'error' ? (
      <div className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900">
        <h2 className="text-lg font-bold">Unable to Load Invites</h2>
        <p className="mt-2 text-sm">{errorMessage || 'Unexpected error while loading invite data.'}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Supplier Invite Owner Panel</h1>
              <p className="mt-2 text-sm text-slate-600">
                Owner/admin workflow: send, review, and cancel supplier invites for a selected RFQ.
              </p>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Back to RFQ
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Pool: {poolId}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">RFQ: {rfqRef || rfqId || 'Required'}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Invites: {invites.length}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Pending: {pendingInviteCount}</span>
          </div>
        </header>

        {contextRequiredCard}
        {statusCard}

        {rfqId && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <form className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm" onSubmit={handleSendInvite}>
              <h2 className="text-lg font-bold text-slate-900">Send Supplier Invite</h2>
              <p className="mt-1 text-sm text-slate-600">
                Only supplier_org_id, expires_at, and supplier_message are sent.
              </p>

              <div className="mt-5 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Supplier Org ID</span>
                  <input
                    name="supplier_org_id"
                    value={sendForm.supplier_org_id}
                    onChange={(event) => setSendForm((current) => ({ ...current, supplier_org_id: event.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    disabled={sendBusy}
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Expires At (optional)</span>
                  <input
                    type="datetime-local"
                    name="expires_at"
                    value={sendForm.expires_at}
                    onChange={(event) => setSendForm((current) => ({ ...current, expires_at: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    disabled={sendBusy}
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Supplier Message (optional)</span>
                  <textarea
                    name="supplier_message"
                    rows={4}
                    maxLength={2000}
                    value={sendForm.supplier_message}
                    onChange={(event) => setSendForm((current) => ({ ...current, supplier_message: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    disabled={sendBusy}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                disabled={sendBusy}
              >
                {sendBusy ? 'Sending...' : 'Send Invite'}
              </button>
            </form>

            <div className="flex flex-col gap-6">
              <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Invite List</h2>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshInvites();
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition"
                  >
                    Refresh
                  </button>
                </div>

                {(uiState === 'empty' || invites.length === 0) ? (
                  <p className="mt-3 text-sm text-slate-600">No supplier invites created for this RFQ yet.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {invites.map((invite) => {
                      const status = invite.status.toUpperCase();
                      const cancellable = status === 'PENDING';
                      const cancelBusy = cancelBusyInviteId === invite.id;
                      return (
                        <article key={invite.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(status)}`}>
                              {status}
                            </span>
                            <span className="text-xs text-slate-500">Invite: {invite.invite_ref}</span>
                          </div>

                          <p className="mt-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Supplier Org:</span> {invite.supplier_org_id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Invited {formatTimestamp(invite.invited_at)} · Expires {formatTimestamp(invite.expires_at)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handleViewInvite(invite.id);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white transition"
                            >
                              View Detail
                            </button>
                            <button
                              type="button"
                              disabled={!cancellable || cancelBusy}
                              onClick={() => {
                                void handleCancelInvite(invite.id);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                            >
                              {cancelBusy ? 'Cancelling...' : 'Cancel Invite'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Invite Detail</h2>
                {!selectedInvite ? (
                  <p className="mt-3 text-sm text-slate-600">Select an invite to view detail status.</p>
                ) : (
                  <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invite Ref</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 break-all">{selectedInvite.invite_ref}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">{selectedInvite.status}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Supplier Org</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 break-all">{selectedInvite.supplier_org_id}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invited At</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">{formatTimestamp(selectedInvite.invited_at)}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Accepted At</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">{formatTimestamp(selectedInvite.accepted_at)}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Declined At</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">{formatTimestamp(selectedInvite.declined_at)}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Message</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedInvite.supplier_message || 'No message provided'}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
