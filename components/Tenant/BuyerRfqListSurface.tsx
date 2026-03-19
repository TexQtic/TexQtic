import React from 'react';
import { BuyerRfqListItem } from '../../services/catalogService';

type BuyerRfqListSurfaceProps = Readonly<{
  rfqs: BuyerRfqListItem[];
  loading: boolean;
  error: string | null;
  onViewDetail: (rfqId: string) => void;
  onBack: () => void;
}>;

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

function getStatusTone(status: BuyerRfqListItem['status']): string {
  switch (status) {
    case 'RESPONDED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'OPEN':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'CLOSED':
      return 'border-slate-300 bg-slate-100 text-slate-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
}

function BuyerRfqListCard({
  rfq,
  onViewDetail,
}: Readonly<{
  rfq: BuyerRfqListItem;
  onViewDetail: (rfqId: string) => void;
}>) {
  const statusTone = getStatusTone(rfq.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">RFQ Reference</p>
          <h3 className="text-base font-bold text-slate-900 break-all">{rfq.id}</h3>
          <p className="text-sm text-slate-600">{rfq.item_name}</p>
        </div>
        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
          Status: {rfq.status}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Catalog Item</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{rfq.item_name}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Item SKU</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{rfq.item_sku?.trim() ? rfq.item_sku : 'SKU unavailable'}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Quantity</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{rfq.quantity}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Last Updated</dt>
          <dd className="mt-2 text-sm font-medium text-slate-900">{formatTimestamp(rfq.updated_at)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Submitted {formatTimestamp(rfq.created_at)}. This discovery surface remains read-only and pre-negotiation.</p>
        <button
          type="button"
          onClick={() => onViewDetail(rfq.id)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
        >
          View Detail
        </button>
      </div>
    </article>
  );
}

export function BuyerRfqListSurface({
  rfqs,
  loading,
  error,
  onViewDetail,
  onBack,
}: BuyerRfqListSurfaceProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My RFQs</h1>
          <p className="mt-2 text-sm text-slate-500">Loading your buyer-owned RFQs from the existing read contract.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          Preparing the current RFQ list and bounded metadata for discovery.
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My RFQs</h1>
          <p className="mt-2 text-sm text-slate-500">Your RFQ discovery surface is unavailable right now, but no RFQ workflow state has changed.</p>
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

  if (rfqs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My RFQs</h1>
          <p className="mt-2 text-sm text-slate-500">Find and reopen your existing buyer-owned RFQs without expanding the workflow scope.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          No buyer RFQs are available yet. When you submit one, it will appear here for read-only discovery.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-5 py-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My RFQs</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Discover and reopen your submitted RFQs using the existing buyer read contract. This surface stays read-only and pre-negotiation.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          Back
        </button>
      </div>

      <div className="space-y-4">
        {rfqs.map(rfq => (
          <BuyerRfqListCard key={rfq.id} rfq={rfq} onViewDetail={onViewDetail} />
        ))}
      </div>
    </div>
  );
}