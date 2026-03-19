import React from 'react';
import { BuyerRfqDetail } from '../../services/catalogService';

type BuyerRfqDetailSurfaceProps = Readonly<{
  rfq: BuyerRfqDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
}>;

type RfqStatusTone = {
  badge: string;
  text: string;
};

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

function getStatusTone(status: BuyerRfqDetail['status']): RfqStatusTone {
  switch (status) {
    case 'RESPONDED':
      return {
        badge: 'border-emerald-200 bg-emerald-50',
        text: 'text-emerald-700',
      };
    case 'OPEN':
      return {
        badge: 'border-amber-200 bg-amber-50',
        text: 'text-amber-700',
      };
    case 'CLOSED':
      return {
        badge: 'border-slate-300 bg-slate-100',
        text: 'text-slate-700',
      };
    default:
      return {
        badge: 'border-sky-200 bg-sky-50',
        text: 'text-sky-700',
      };
  }
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900 break-words">{value}</p>
    </div>
  );
}

export function BuyerRfqDetailSurface({
  rfq,
  loading,
  error,
  onBack,
  onClose,
}: BuyerRfqDetailSurfaceProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            Loading the submitted RFQ detail and any available supplier response visibility.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Preparing the RFQ summary, timestamps, and supplier response section.
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            The current RFQ detail view is unavailable, but no RFQ workflow state has changed.
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            No RFQ detail is available to show for this view.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          RFQ detail is not available right now.
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const statusTone = getStatusTone(rfq.status);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">RFQ Detail</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review the submitted RFQ summary and bounded supplier response visibility. This surface remains read-only and pre-negotiation.
            </p>
          </div>
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone.badge} ${statusTone.text}`}>
            Status: {rfq.status}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label="RFQ Reference" value={rfq.id} />
        <DetailRow label="Catalog Item" value={rfq.item_name} />
        <DetailRow label="Item Name" value={rfq.item_name} />
        <DetailRow label="Item SKU" value={rfq.item_sku} />
        <DetailRow label="Quantity" value={String(rfq.quantity)} />
        <DetailRow label="Supplier Organization ID" value={rfq.supplier_org_id} />
        <DetailRow label="Submitted On" value={formatTimestamp(rfq.created_at)} />
        <DetailRow label="Last Updated" value={formatTimestamp(rfq.updated_at)} />
      </dl>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Buyer Submission Notes</h4>
          <p className="mt-1 text-xs text-slate-500">
            Original context captured at RFQ submission. This is reference-only and does not change supplier response rules.
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap">
          {rfq.buyer_message?.trim() ? rfq.buyer_message : 'No buyer submission notes were provided for this RFQ.'}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Supplier Response</h4>
          <p className="mt-1 text-xs text-slate-500">
            Read-only visibility into the supplier’s first response artifact when one has been submitted.
          </p>
        </div>
        {rfq.supplier_response ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Response ID" value={rfq.supplier_response.id} />
              <DetailRow label="Response Received" value={formatTimestamp(rfq.supplier_response.submitted_at)} />
            </dl>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Response Message</p>
              <div className="text-sm text-slate-800 whitespace-pre-wrap">
                {rfq.supplier_response.message}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            No supplier response has been shared yet. If the supplier replies later, the response will appear here without changing the current RFQ workflow.
          </div>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}