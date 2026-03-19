import React from 'react';
import { BuyerRfqDetail } from '../../services/catalogService';

type BuyerRfqDetailSurfaceProps = Readonly<{
  rfq: BuyerRfqDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onClose: () => void;
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

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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
          <p className="mt-2 text-sm text-slate-500">Loading the submitted RFQ detail.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Loading RFQ detail...
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
          <p className="mt-2 text-sm text-slate-500">The requested RFQ detail could not be displayed.</p>
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
          <p className="mt-2 text-sm text-slate-500">No RFQ detail is available for display.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          No RFQ detail is available.
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">RFQ Detail</h3>
        <p className="mt-2 text-sm text-slate-500">
          Submitted RFQ details and bounded supplier response visibility.
        </p>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label="Reference ID" value={rfq.id} />
        <DetailRow label="Status" value={rfq.status} />
        <DetailRow label="Item Name" value={rfq.item_name} />
        <DetailRow label="Item SKU" value={rfq.item_sku} />
        <DetailRow label="Quantity" value={String(rfq.quantity)} />
        <DetailRow label="Supplier Org ID" value={rfq.supplier_org_id} />
        <DetailRow label="Submitted" value={formatTimestamp(rfq.created_at)} />
        <DetailRow label="Updated" value={formatTimestamp(rfq.updated_at)} />
      </dl>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Buyer Message</h4>
          <p className="mt-1 text-xs text-slate-500">Original submission context from the buyer.</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap">
          {rfq.buyer_message?.trim() ? rfq.buyer_message : 'No buyer message was provided for this RFQ.'}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Supplier Response</h4>
          <p className="mt-1 text-xs text-slate-500">Read-only supplier response visibility when a response has been submitted.</p>
        </div>
        {rfq.supplier_response ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Response ID" value={rfq.supplier_response.id} />
              <DetailRow label="Submitted" value={formatTimestamp(rfq.supplier_response.submitted_at)} />
            </dl>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-slate-800 whitespace-pre-wrap">
              {rfq.supplier_response.message}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            No supplier response has been shared yet.
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