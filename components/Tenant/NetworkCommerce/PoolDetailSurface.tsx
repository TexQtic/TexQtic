import React, { useState, useEffect } from 'react';
import {
  getPoolDetail,
  openPool,
  getPoolMembership,
  type NetworkPool,
  type NetworkPoolMembership,
  type OpenNetworkPoolInput,
} from '../../../services/networkCommerceService';

type PoolDetailSurfaceProps = Readonly<{
  poolId: string;
  onBack: () => void;
  onNavigateToDemandLines?: () => void;
  onNavigateToRfqIssue?: () => void;
}>;

type UIState = 'loading' | 'ready' | 'error' | 'feature-disabled';

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStateColor(stateKey: string | null): string {
  if (!stateKey) return 'border-slate-200 bg-slate-50 text-slate-700';

  switch (stateKey.toUpperCase()) {
    case 'DRAFT':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    case 'OPEN':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'AGGREGATING':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'ALLOCATED':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'SETTLED':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
}

function OpenPoolForm({
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: Readonly<{
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}>) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Open Pool for Member Declarations</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Reason for Opening</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Explain the business reason for opening this pool..."
            rows={3}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Opening...' : 'Open Pool'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PoolDetailSurface({
  poolId,
  onBack,
  onNavigateToDemandLines,
  onNavigateToRfqIssue,
}: PoolDetailSurfaceProps) {
  const [state, setState] = useState<UIState>('loading');
  const [pool, setPool] = useState<NetworkPool | null>(null);
  const [membership, setMembership] = useState<NetworkPoolMembership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [isOpeningPool, setIsOpeningPool] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setState('loading');
        const [poolData, membershipData] = await Promise.all([
          getPoolDetail(poolId),
          getPoolMembership(poolId).catch(() => null),
        ]);
        if (isMounted) {
          setPool(poolData);
          setMembership(membershipData);
          setState('ready');
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load pool details';
          if (message.includes('FEATURE_DISABLED') || message.includes('feature')) {
            setState('feature-disabled');
          } else {
            setError(message);
            setState('error');
          }
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [poolId]);

  const handleOpenPool = async (reason: string) => {
    if (!pool) return;
    setOpenError(null);
    setIsOpeningPool(true);

    try {
      const input: OpenNetworkPoolInput = { reason };
      const updated = await openPool(poolId, input);
      setPool(updated);
      setShowOpenForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open pool';
      setOpenError(message);
    } finally {
      setIsOpeningPool(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pool Details</h1>
          <p className="mt-2 text-sm text-slate-500">Loading pool information.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          Retrieving pool detail and status.
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (state === 'feature-disabled') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pool Details</h1>
          <p className="mt-2 text-sm text-slate-500">Feature not available.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-800">
          <p className="font-medium">Feature Disabled</p>
          <p className="mt-2 text-xs">Network Commerce pools are not currently enabled.</p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error' || !pool) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pool Details</h1>
          <p className="mt-2 text-sm text-slate-500">Unable to load pool details right now.</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-sm text-rose-700">
          {error}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const canOpen = pool.lifecycle_state_key?.toUpperCase() === 'DRAFT';
  const stateBadge = getStateColor(pool.lifecycle_state_key);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pool: {pool.pool_ref}</h1>
          <p className="mt-2 text-sm text-slate-500">Manage pool lifecycle, members, and procurement process.</p>
        </div>
      </div>

      {/* Pool Status Badge */}
      <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${stateBadge}`}>
        Status: {pool.lifecycle_state_key || 'Unknown'}
      </div>

      {/* Pool Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Pool Overview</h2>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool Reference</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{pool.pool_ref}</dd>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Commodity</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{pool.commodity_category}</dd>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target Quantity</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">
              {pool.target_qty} {pool.qty_unit}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Created</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(pool.created_at)}</dd>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Last Updated</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(pool.updated_at)}</dd>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool ID</dt>
            <dd className="mt-2 text-xs font-mono text-slate-600 break-all">{pool.id}</dd>
          </div>
        </dl>
      </div>

      {/* Open Pool Action */}
      {canOpen && !showOpenForm && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-5">
          <p className="text-sm text-blue-900">This pool is in DRAFT state and ready to be opened for member declarations.</p>
          <button
            type="button"
            onClick={() => setShowOpenForm(true)}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Open Pool for Members
          </button>
        </div>
      )}

      {showOpenForm && (
        <OpenPoolForm
          isSubmitting={isOpeningPool}
          error={openError}
          onSubmit={handleOpenPool}
          onCancel={() => {
            setShowOpenForm(false);
            setOpenError(null);
          }}
        />
      )}

      {/* Current Membership Status */}
      {membership && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Your Membership</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Declared Quantity</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {membership.declared_qty} {membership.qty_unit}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{membership.status}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Joined</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(membership.joined_at)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Allocated</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {membership.allocated_qty ? `${membership.allocated_qty} ${membership.qty_unit}` : 'Pending'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Deferred FE-4+ Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Next Steps</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {onNavigateToDemandLines ? (
            <button
              onClick={onNavigateToDemandLines}
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left hover:border-emerald-300 hover:bg-emerald-50 transition"
            >
              <h3 className="text-base font-bold text-slate-900">Demand Lines</h3>
              <p className="mt-2 text-sm text-slate-600">FE-4: Manage member demand visibility and aggregation.</p>
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 opacity-50">
              <h3 className="text-base font-bold text-slate-900">Demand Lines</h3>
              <p className="mt-2 text-sm text-slate-600">FE-4: Manage member demand visibility and aggregation.</p>
            </div>
          )}

          {onNavigateToRfqIssue ? (
            <button
              onClick={onNavigateToRfqIssue}
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <h3 className="text-base font-bold text-slate-900">Issue RFQ</h3>
              <p className="mt-2 text-sm text-slate-600">FE-5: Create procurement requests and manage supplier responses.</p>
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 opacity-50">
              <h3 className="text-base font-bold text-slate-900">Issue RFQ</h3>
              <p className="mt-2 text-sm text-slate-600">FE-5: Create procurement requests and manage supplier responses.</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 opacity-50">
            <h3 className="text-base font-bold text-slate-900">Supplier Invites</h3>
            <p className="mt-2 text-sm text-slate-600">FE-6: Invite suppliers and manage their participation.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 opacity-50">
            <h3 className="text-base font-bold text-slate-900">Quotes & Awards</h3>
            <p className="mt-2 text-sm text-slate-600">FE-8+: Supplier quotes, awards, and settlement.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}
