import React from 'react';
import { BuyerRfqDetail, SupplierRfqDetail, SupplierRfqResponse } from '../../services/catalogService';

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

type SupplierRfqDetailSurfaceProps = Readonly<{
  rfq: SupplierRfqDetail | null;
  response: SupplierRfqResponse | null;
  loading: boolean;
  error: string | null;
  submitLoading: boolean;
  submitError: string | null;
  onBack: () => void;
  onClose: () => void;
  onSubmitResponse: (message: string) => void;
}>;

type SupplierRfqResponseSectionProps = Readonly<{
  rfq: SupplierRfqDetail;
  response: SupplierRfqResponse | null;
  submitLoading: boolean;
  submitError: string | null;
  message: string;
  onMessageChange: (value: string) => void;
  onSubmitResponse: (message: string) => void;
}>;

function SupplierRfqResponseSection({
  rfq,
  response,
  submitLoading,
  submitError,
  message,
  onMessageChange,
  onSubmitResponse,
}: SupplierRfqResponseSectionProps) {
  const canRespond = rfq.status === 'OPEN' && !response;

  if (response) {
    return (
      <div className="space-y-3">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow label="Response ID" value={response.id} />
          <DetailRow label="Response Submitted" value={formatTimestamp(response.submitted_at)} />
        </dl>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Submitted Message</p>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">{response.message}</div>
        </div>
      </div>
    );
  }

  if (rfq.status === 'RESPONDED') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        A supplier response has already been recorded for this RFQ. Existing response message details are not exposed in this supplier detail read surface.
      </div>
    );
  }

  if (rfq.status === 'CLOSED') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        This RFQ is closed, so no supplier response can be submitted from this surface.
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={event => {
        event.preventDefault();
        onSubmitResponse(message.trim());
      }}
    >
      <div className="space-y-2">
        <label htmlFor="supplier-rfq-response-message" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Response Message
        </label>
        <textarea
          id="supplier-rfq-response-message"
          value={message}
          onChange={event => onMessageChange(event.target.value)}
          rows={5}
          maxLength={1000}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Confirm availability, timing, or next-step context for this buyer RFQ."
        />
        <p className="text-xs text-slate-500">
          This message records a first response only. It does not create a quote, price, or negotiation thread.
        </p>
      </div>

      {submitError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitLoading || !canRespond || message.trim().length === 0}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitLoading ? 'Submitting...' : 'Submit First Response'}
        </button>
      </div>
    </form>
  );
}

export function SupplierRfqDetailSurface({
  rfq,
  response,
  loading,
  error,
  submitLoading,
  submitError,
  onBack,
  onClose,
  onSubmitResponse,
}: SupplierRfqDetailSurfaceProps) {
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    setMessage('');
  }, [rfq?.id, response?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Supplier RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            Loading the supplier RFQ detail and first-response action state.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Preparing the buyer submission context and supplier response controls.
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
          <h3 className="text-lg font-bold text-slate-900">Supplier RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            The supplier RFQ detail view is unavailable, but no supplier response state has changed.
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
          <h3 className="text-lg font-bold text-slate-900">Supplier RFQ Detail</h3>
          <p className="mt-2 text-sm text-slate-500">
            No supplier RFQ detail is available to show for this view.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Supplier RFQ detail is not available right now.
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
            <h3 className="text-lg font-bold text-slate-900">Supplier RFQ Detail</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review the buyer submission and send one first response using the existing supplier route. This surface does not add negotiation semantics.
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
        <DetailRow label="Item SKU" value={rfq.item_sku?.trim() ? rfq.item_sku : 'SKU unavailable'} />
        <DetailRow label="Requested Quantity" value={String(rfq.quantity)} />
        <DetailRow label="Submitted On" value={formatTimestamp(rfq.created_at)} />
        <DetailRow label="Last Updated" value={formatTimestamp(rfq.updated_at)} />
      </dl>

      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-3 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Buyer Submission Notes</h4>
          <p className="mt-1 text-xs text-slate-500">
            Original request context from the buyer. This is reference-only and does not imply pricing or quote acceptance.
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
            Submit a single non-binding response message through the existing supplier response path.
          </p>
        </div>

        <SupplierRfqResponseSection
          rfq={rfq}
          response={response}
          submitLoading={submitLoading}
          submitError={submitError}
          message={message}
          onMessageChange={setMessage}
          onSubmitResponse={onSubmitResponse}
        />
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