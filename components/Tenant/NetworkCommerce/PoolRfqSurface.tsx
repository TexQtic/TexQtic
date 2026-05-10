import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { APIError } from '../../../services/apiClient';
import {
  getPoolDetail,
  issueRfq,
  listDemandLines,
  lockDemandLinesForRfq,
  type DemandSnapshotRecord,
  type IssueRfqInput,
  type NetworkPool,
  type NetworkPoolDemandLine,
  type NetworkPoolRfq,
} from '../../../services/networkCommerceService';
import { LoadingState } from '../../shared/LoadingState';
import { SupplierInviteOwnerSurface } from './SupplierInviteOwnerSurface';

type PoolRfqSurfaceProps = Readonly<{
  poolId: string;
  onBack?: () => void;
}>;

type UiState =
  | 'loading'
  | 'empty'
  | 'ready'
  | 'locking'
  | 'issuing'
  | 'feature-disabled'
  | 'forbidden'
  | 'invalid-state'
  | 'error'
  | 'success';

type IssueFormState = Readonly<{
  issueReason: string;
  responseDeadlineAt: string;
}>;

const DEFAULT_FORM_STATE: IssueFormState = {
  issueReason: '',
  responseDeadlineAt: '',
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatQuantity(value: string | null): string {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(parsed);
}

function computeAggregateSummary(lines: NetworkPoolDemandLine[]): { quantity: string; unit: string } {
  if (lines.length === 0) {
    return { quantity: '0', unit: 'units' };
  }

  const units = new Set(lines.map((line) => line.qty_unit));
  if (units.size !== 1) {
    return { quantity: 'Mixed units', unit: 'See lines' };
  }

  const total = lines.reduce((sum, line) => sum + (Number.parseFloat(line.qty) || 0), 0);
  return { quantity: formatQuantity(total.toFixed(6)), unit: lines[0]?.qty_unit ?? 'units' };
}

function classifyError(err: unknown): { state: UiState; message: string } {
  if (err instanceof APIError) {
    if (err.code === 'FEATURE_DISABLED' || err.status === 503) {
      return {
        state: 'feature-disabled',
        message: 'RFQ issuance is currently disabled for this pool.',
      };
    }

    if (err.status === 403 || err.code === 'FORBIDDEN') {
      return {
        state: 'forbidden',
        message: err.message || 'You are not authorized to issue an RFQ for this pool.',
      };
    }

    if (
      err.code === 'INVALID_STATE' ||
      err.code === 'TRANSITION_DENIED' ||
      err.code === 'SNAPSHOT_NOT_READY' ||
      err.code === 'RFQ_ALREADY_ISSUED' ||
      err.code === 'RFQ_CONFLICT' ||
      err.code === 'NO_ACTIVE_DEMAND_LINES' ||
      err.code === 'DEMAND_SNAPSHOT_NOT_READY' ||
      err.code === 'DEMAND_LINE_SET_CHANGED'
    ) {
      return {
        state: 'invalid-state',
        message: err.message || 'This pool is not ready for RFQ issuance.',
      };
    }

    return {
      state: 'error',
      message: err.message || 'Failed to load RFQ issue panel.',
    };
  }

  if (err instanceof Error) {
    return { state: 'error', message: err.message };
  }

  return { state: 'error', message: 'Failed to load RFQ issue panel.' };
}

function isAggregatingPool(pool: NetworkPool | null): boolean {
  return (pool?.lifecycle_state_key ?? '').toUpperCase() === 'AGGREGATING';
}

export function PoolRfqSurface({ poolId, onBack }: PoolRfqSurfaceProps): ReactElement {
  const [uiState, setUiState] = useState<UiState>('loading');
  const [pool, setPool] = useState<NetworkPool | null>(null);
  const [demandLines, setDemandLines] = useState<NetworkPoolDemandLine[]>([]);
  const [snapshot, setSnapshot] = useState<DemandSnapshotRecord | null>(null);
  const [issuedRfq, setIssuedRfq] = useState<NetworkPoolRfq | null>(null);
  const [showInviteOwnerPanel, setShowInviteOwnerPanel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<IssueFormState>(DEFAULT_FORM_STATE);

  const activeLineCount = useMemo(
    () => demandLines.filter((line) => line.status === 'ACTIVE').length,
    [demandLines],
  );

  const lockedLineCount = useMemo(
    () => demandLines.filter((line) => line.locked_at != null).length,
    [demandLines],
  );

  const unlockedLineCount = Math.max(demandLines.length - lockedLineCount, 0);
  const aggregateSummary = useMemo(() => computeAggregateSummary(demandLines), [demandLines]);
  const issueReady = isAggregatingPool(pool) && lockedLineCount > 0;
  const lockReady = isAggregatingPool(pool) && activeLineCount > 0;

  const loadPanel = useCallback(async () => {
    setUiState('loading');
    setErrorMessage(null);

    try {
      const [poolDetail, demandResponse] = await Promise.all([
        getPoolDetail(poolId),
        listDemandLines(poolId, { limit: 100, offset: 0 }),
      ]);

      setPool(poolDetail);
      setDemandLines(demandResponse.items);
      setIssuedRfq(null);
      setShowInviteOwnerPanel(false);
      setSnapshot(null);

      if (demandResponse.items.length === 0) {
        setUiState('empty');
        return;
      }

      if (!isAggregatingPool(poolDetail)) {
        setUiState('invalid-state');
        setErrorMessage('This pool must be in AGGREGATING state before an RFQ can be issued.');
        return;
      }

      setUiState('ready');
    } catch (err) {
      const resolution = classifyError(err);
      setPool(null);
      setDemandLines([]);
      setSnapshot(null);
      setIssuedRfq(null);
      setShowInviteOwnerPanel(false);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    }
  }, [poolId]);

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  const refreshPanelAfterAction = useCallback(async () => {
    const [poolDetail, demandResponse] = await Promise.all([
      getPoolDetail(poolId),
      listDemandLines(poolId, { limit: 100, offset: 0 }),
    ]);

    setPool(poolDetail);
    setDemandLines(demandResponse.items);

    if (demandResponse.items.length === 0) {
      setUiState('empty');
      return;
    }

    if (!isAggregatingPool(poolDetail)) {
      setUiState('invalid-state');
      setErrorMessage('This pool must be in AGGREGATING state before an RFQ can be issued.');
      return;
    }

    setUiState('ready');
  }, [poolId]);

  const handleLockDemandLines = useCallback(async () => {
    setUiState('locking');
    setErrorMessage(null);

    try {
      const snapshotRecord = await lockDemandLinesForRfq(poolId);
      setSnapshot(snapshotRecord);
      await refreshPanelAfterAction();
    } catch (err) {
      const resolution = classifyError(err);
      setUiState(resolution.state);
      setErrorMessage(resolution.message);
    }
  }, [poolId, refreshPanelAfterAction]);

  const handleIssueSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!issueReady) {
        setUiState('invalid-state');
        setErrorMessage('Lock demand lines before issuing the RFQ.');
        return;
      }

      setUiState('issuing');
      setErrorMessage(null);

      try {
        const payload: IssueRfqInput = {
          issue_reason: formState.issueReason.trim() ? formState.issueReason.trim() : null,
          response_deadline_at: formState.responseDeadlineAt
            ? new Date(formState.responseDeadlineAt).toISOString()
            : null,
        };

        const record = await issueRfq(poolId, payload);
        setIssuedRfq(record);
        setShowInviteOwnerPanel(false);
        setUiState('success');
      } catch (err) {
        const resolution = classifyError(err);
        setUiState(resolution.state);
        setErrorMessage(resolution.message);
      }
    },
    [formState, issueReady, poolId],
  );

  if (showInviteOwnerPanel) {
    return (
      <SupplierInviteOwnerSurface
        poolId={poolId}
        rfqId={issuedRfq?.id ?? null}
        rfqRef={issuedRfq?.rfq_ref ?? null}
        onBack={() => setShowInviteOwnerPanel(false)}
      />
    );
  }

  if (uiState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8">
        <LoadingState message="Loading RFQ issue panel..." />
      </div>
    );
  }

  const statusCard =
    uiState === 'feature-disabled' ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-lg font-bold">RFQ Issue Disabled</h2>
        <p className="mt-2 text-sm">{errorMessage || 'This RFQ feature is currently disabled.'}</p>
      </div>
    ) : uiState === 'forbidden' ? (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900">
        <h2 className="text-lg font-bold">Not Authorized</h2>
        <p className="mt-2 text-sm">{errorMessage || 'You are not authorized to issue an RFQ for this pool.'}</p>
      </div>
    ) : uiState === 'invalid-state' ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-lg font-bold">Pool Not Ready for RFQ</h2>
        <p className="mt-2 text-sm">{errorMessage || 'This pool is not in a valid state for RFQ issuance.'}</p>
      </div>
    ) : uiState === 'error' ? (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900">
        <h2 className="text-lg font-bold">Unable to Load RFQ Panel</h2>
        <p className="mt-2 text-sm">{errorMessage || 'An unexpected error occurred.'}</p>
      </div>
    ) : null;

  const summaryBlock = pool ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool Lifecycle</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{pool.lifecycle_state_key || 'Unknown'}</p>
        <p className="mt-1 text-xs text-slate-500">{pool.pool_ref}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Demand Lines</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{demandLines.length}</p>
        <p className="mt-1 text-xs text-slate-500">Total lines returned by backend</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Locked / Unlocked</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {lockedLineCount} locked, {unlockedLineCount} unlocked
        </p>
        <p className="mt-1 text-xs text-slate-500">Snapshot readiness from current demand lines</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Aggregate Quantity</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {aggregateSummary.quantity} {aggregateSummary.unit}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {snapshot ? `Captured snapshot ${snapshot.snapshot_ref}` : 'No captured snapshot yet'}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Network Commerce</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">RFQ Issue Panel</h1>
              <p className="mt-2 text-sm text-slate-600">
                Issue an RFQ from a locked pool snapshot after demand lines are ready.
              </p>
            </div>
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
          {pool && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Pool: {pool.pool_ref}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Commodity: {pool.commodity_category}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">State: {pool.lifecycle_state_key || 'Unknown'}</span>
            </div>
          )}
        </header>

        {statusCard}

        {summaryBlock}

        {pool && uiState !== 'success' && uiState !== 'feature-disabled' && uiState !== 'forbidden' && uiState !== 'error' && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Demand-Line Readiness</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Lock active demand lines before issuing the RFQ. The backend captures the snapshot.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {issueReady ? 'Ready to issue' : 'Needs lock'}
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Lock Status</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900">
                    {issueReady ? 'Snapshot captured' : 'Snapshot not ready'}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool Status</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900">{pool.lifecycle_state_key || 'Unknown'}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Locked Lines</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900">{lockedLineCount}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Issue Deadline</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900">
                    {formState.responseDeadlineAt ? formatTimestamp(new Date(formState.responseDeadlineAt).toISOString()) : 'Not set'}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLockDemandLines}
                  disabled={!lockReady || uiState === 'locking'}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {uiState === 'locking' ? 'Locking...' : 'Lock for RFQ'}
                </button>
                <p className="text-xs text-slate-500 self-center">
                  {lockReady
                    ? 'Locking creates the RFQ snapshot used for issuance.'
                    : 'At least one active demand line is required before locking.'}
                </p>
              </div>
            </div>

            <form className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm" onSubmit={handleIssueSubmit}>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Issue RFQ</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Submit the RFQ header after the snapshot is ready. Only issue_reason and response_deadline_at are sent.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Issue Reason</span>
                  <textarea
                    value={formState.issueReason}
                    onChange={(event) => setFormState((current) => ({ ...current, issueReason: event.target.value }))}
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    placeholder="Optional reason for issuing this RFQ"
                    disabled={!issueReady || uiState === 'issuing'}
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Response Deadline</span>
                  <input
                    type="datetime-local"
                    value={formState.responseDeadlineAt}
                    onChange={(event) => setFormState((current) => ({ ...current, responseDeadlineAt: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    disabled={!issueReady || uiState === 'issuing'}
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!issueReady || uiState === 'issuing'}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  {uiState === 'issuing' ? 'Issuing...' : 'Issue RFQ'}
                </button>
                <p className="text-xs text-slate-500">
                  {issueReady
                    ? 'The backend will return the RFQ header once the snapshot is accepted.'
                    : 'Lock demand lines first before issuing the RFQ.'}
                </p>
              </div>
            </form>
          </section>
        )}

        {uiState === 'empty' && pool && (
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">No Demand Lines Available</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create demand lines first. The RFQ issue panel stays read-only until the pool has demand data to lock.
            </p>
          </section>
        )}

        {uiState === 'success' && issuedRfq && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-6 shadow-sm">
            <h2 className="text-xl font-bold text-emerald-950">RFQ Issued Successfully</h2>
            <p className="mt-2 text-sm text-emerald-900">
              The RFQ header has been created. The pool is now in closed-for-bids flow.
            </p>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">RFQ Reference</dt>
                <dd className="mt-2 text-sm font-semibold text-emerald-950 break-all">{issuedRfq.rfq_ref}</dd>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Status</dt>
                <dd className="mt-2 text-sm font-semibold text-emerald-950">{issuedRfq.status}</dd>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Lines Captured</dt>
                <dd className="mt-2 text-sm font-semibold text-emerald-950">{issuedRfq.line_count}</dd>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Issued At</dt>
                <dd className="mt-2 text-sm font-semibold text-emerald-950">{formatTimestamp(issuedRfq.issued_at)}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm text-emerald-950">
              <p><span className="font-semibold">Issue reason:</span> {issuedRfq.issue_reason || 'Not provided'}</p>
              <p className="mt-2"><span className="font-semibold">Response deadline:</span> {formatTimestamp(issuedRfq.response_deadline_at)}</p>
              <p className="mt-2"><span className="font-semibold">Issue basis:</span> {issuedRfq.issue_basis}</p>
              <p className="mt-2">
                <span className="font-semibold">Aggregate quantity:</span>{' '}
                {issuedRfq.total_qty ? `${issuedRfq.total_qty} ${issuedRfq.qty_unit ?? ''}`.trim() : 'Unavailable'}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowInviteOwnerPanel(true)}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition"
              >
                Manage Supplier Invites
              </button>
              <p className="self-center text-xs text-emerald-900/80">
                Owner/admin flow only. Supplier inbox remains a separate later packet.
              </p>
            </div>
          </section>
        )}

        {pool && uiState !== 'success' && (
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pool Detail Snapshot</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool Reference</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 break-all">{pool.pool_ref}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Commodity</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{pool.commodity_category}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target Quantity</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{pool.target_qty} {pool.qty_unit}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Open / Close</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatTimestamp(pool.open_at)}</p>
                <p className="mt-1 text-xs text-slate-500">Close: {formatTimestamp(pool.close_at)}</p>
              </div>
            </div>
          </section>
        )}

        {uiState === 'locking' && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
            Locking demand lines for RFQ snapshot...
          </div>
        )}

        {uiState === 'issuing' && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
            Issuing RFQ header...
          </div>
        )}

        <div className="flex justify-end">
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
    </div>
  );
}