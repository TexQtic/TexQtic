import React, { useState, useEffect } from 'react';
import {
  listOwnedPools,
  createPool,
  type NetworkPoolListResponse,
  type OwnedPoolListItem,
  type CreateNetworkPoolInput,
} from '../../../services/networkCommerceService';
import { APIError } from '../../../services/apiClient';

type PoolListSurfaceProps = Readonly<{
  onSelectPool: (poolId: string) => void;
  onBack: () => void;
}>;

type UIState = 'loading' | 'ready' | 'error' | 'feature-disabled';

function formatTimestamp(value: string): string {
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

function PoolCard({
  pool,
  onViewDetail,
}: Readonly<{
  pool: OwnedPoolListItem;
  onViewDetail: (poolId: string) => void;
}>) {
  const stateBadge = getStateColor(pool.lifecycle_state_key);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pool Reference</p>
          <h3 className="text-base font-bold text-slate-900 break-all">{pool.pool_ref}</h3>
          <p className="text-sm text-slate-600">{pool.commodity_category}</p>
        </div>
        <div
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${stateBadge}`}
        >
          {pool.lifecycle_state_key || 'Unknown'}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target Quantity</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">
            {pool.target_qty} {pool.qty_unit}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Commodity</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{pool.commodity_category}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Created</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(pool.created_at)}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Last Updated</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(pool.updated_at)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Pool management interface. Invite members and track procurement.</p>
        <button
          type="button"
          onClick={() => onViewDetail(pool.id)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
        >
          View Detail
        </button>
      </div>
    </article>
  );
}

function CreatePoolForm({
  onCreated,
  onCancel,
}: Readonly<{
  onCreated: (poolId: string) => void;
  onCancel: () => void;
}>) {
  const [poolRef, setPoolRef] = useState('');
  const [commodity, setCommodity] = useState('');
  const [targetQty, setTargetQty] = useState('');
  const [qtyUnit, setQtyUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input: CreateNetworkPoolInput = {
        pool_ref: poolRef.trim(),
        commodity_category: commodity.trim(),
        target_qty: parseFloat(targetQty),
        qty_unit: qtyUnit.trim(),
      };

      const pool = await createPool(input);
      onCreated(pool.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create pool';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900">Create New Pool</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Pool Reference</label>
            <input
              type="text"
              value={poolRef}
              onChange={e => setPoolRef(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., COTTON_YARN_2025_Q1"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Commodity Category</label>
            <input
              type="text"
              value={commodity}
              onChange={e => setCommodity(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., COTTON_YARN"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Target Quantity</label>
              <input
                type="number"
                value={targetQty}
                onChange={e => setTargetQty(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1000"
                min="0.01"
                step="0.01"
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Unit</label>
              <input
                type="text"
                value={qtyUnit}
                onChange={e => setQtyUnit(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., KG"
                disabled={isSubmitting}
                required
              />
            </div>
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
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Pool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PoolListSurface({
  onSelectPool,
  onBack,
}: PoolListSurfaceProps) {
  const [state, setState] = useState<UIState>('loading');
  const [pools, setPools] = useState<OwnedPoolListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPools = async () => {
      try {
        setState('loading');
        const response = await listOwnedPools({ limit: 100, offset: 0 });
        if (isMounted) {
          setPools(response.data);
          setState('ready');
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof APIError && (err.code === 'FEATURE_DISABLED' || err.status === 503)) {
            setState('feature-disabled');
          } else {
            const message = err instanceof Error ? err.message : 'Failed to load pools';
            setError(message);
            setState('error');
          }
        }
      }
    };

    fetchPools();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePoolCreated = (poolId: string) => {
    setShowCreateForm(false);
    // Refresh list and navigate to the new pool
    listOwnedPools({ limit: 100, offset: 0 }).then(response => {
      setPools(response.data);
      onSelectPool(poolId);
    }).catch(() => {
      // Silently fail; user can refresh manually
    });
  };

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Commerce Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Loading your pool registry.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          Preparing your pool list and available actions.
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
          <h1 className="text-2xl font-bold text-slate-900">Network Commerce Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Feature not yet available for your organization.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-800">
          <p className="font-medium">Feature Disabled</p>
          <p className="mt-2 text-xs">Network Commerce pools are not currently enabled. Please contact support to request access.</p>
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

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Commerce Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Unable to load your pool registry right now.</p>
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

  if (pools.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Commerce Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Create and manage procurement pools with network members.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-center">
          <p className="text-sm text-slate-600">No pools yet. Create your first pool to get started.</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            + Create Pool
          </button>
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
        {showCreateForm && (
          <CreatePoolForm onCreated={handlePoolCreated} onCancel={() => setShowCreateForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Commerce Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Your procurement pools and active network collaborations.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          + Create Pool
        </button>
      </div>

      <div className="space-y-4">
        {pools.map(pool => (
          <PoolCard
            key={pool.id}
            pool={pool}
            onViewDetail={onSelectPool}
          />
        ))}
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

      {showCreateForm && (
        <CreatePoolForm onCreated={handlePoolCreated} onCancel={() => setShowCreateForm(false)} />
      )}
    </div>
  );
}
