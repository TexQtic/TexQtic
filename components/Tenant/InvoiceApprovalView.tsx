/**
 * InvoiceApprovalView — Tenant Plane, Buyer Context (TTP Slice 4: Invoice Domain)
 *
 * Buyer invoice view for a given trade:
 *   - View invoices raised against the trade (buyer-safe records only)
 *   - Acknowledge an invoice (audit log only, no state change)
 *   - Dispute an invoice (SUBMITTED/UNDER_REVIEW → DISPUTED)
 *
 * Buyer visibility constraint:
 *   Records are buyer-safe. No seller org_id, no internal notes, no credit/risk data.
 *
 * D-017-A: org_id is NEVER sent in request body.
 *
 * Finance surfaces: read-only amount display. No payment/money-movement actions.
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getBuyerInvoiceApproval,
  submitBuyerAction,
  type BuyerInvoiceRecord,
  type BuyerAction,
} from '../../services/invoiceService';
import { APIError } from '../../services/apiClient';

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvoiceApprovalViewProps {
  tradeId: string;
}

// ─── State badge ──────────────────────────────────────────────────────────────

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:        { label: 'Draft',        cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED:    { label: 'Submitted',    cls: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW: { label: 'Under Review', cls: 'bg-amber-100 text-amber-700' },
  VERIFIED:     { label: 'Verified',     cls: 'bg-emerald-100 text-emerald-700' },
  INELIGIBLE:   { label: 'Ineligible',   cls: 'bg-rose-100 text-rose-700' },
  DISPUTED:     { label: 'Disputed',     cls: 'bg-orange-100 text-orange-700' },
  WITHDRAWN:    { label: 'Withdrawn',    cls: 'bg-slate-100 text-slate-500' },
  EXPIRED:      { label: 'Expired',      cls: 'bg-slate-100 text-slate-500' },
  SUPERSEDED:   { label: 'Superseded',   cls: 'bg-slate-100 text-slate-500' },
};

function StateBadge({ stateKey }: { stateKey: string }) {
  const badge = STATE_BADGE[stateKey] ?? { label: stateKey, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${badge.cls}`}
    >
      {badge.label}
    </span>
  );
}

/** States from which a buyer can dispute. Matches §34 transition seeds. */
const BUYER_DISPUTABLE_FROM = new Set(['SUBMITTED', 'UNDER_REVIEW']);

/** States from which a buyer can acknowledge (audit only). */
const BUYER_ACKNOWLEDGEABLE_FROM = new Set(['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED']);

// ─── Action modal ─────────────────────────────────────────────────────────────

interface ActionModalProps {
  action: BuyerAction;
  invoiceId: string;
  onComplete: () => void;
  onClose: () => void;
}

function ActionModal({ action, invoiceId, onComplete, onClose }: ActionModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await submitBuyerAction(invoiceId, action, reason.trim());
      onComplete();
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = action === 'ACKNOWLEDGE' ? 'Acknowledge Invoice' : 'Dispute Invoice';
  const description =
    action === 'ACKNOWLEDGE'
      ? 'Acknowledging confirms you have reviewed this invoice. No state change will occur.'
      : 'Disputing this invoice will flag it for review. Please provide a clear reason.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>

        {error && (
          <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-sm rounded text-white disabled:opacity-50 ${
                action === 'DISPUTE'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting…' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceApprovalView({ tradeId }: InvoiceApprovalViewProps) {
  const [invoices, setInvoices] = useState<BuyerInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ action: BuyerAction; invoiceId: string } | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBuyerInvoiceApproval(tradeId);
      setInvoices(data);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleActionComplete = () => {
    setModal(null);
    fetchInvoices();
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-500 text-sm text-center">Loading invoice details…</div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-6 text-slate-500 text-sm text-center">
        No invoices have been raised for this trade yet.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Invoice Approval</h2>
      <p className="text-sm text-slate-500">
        Review invoices raised against this trade. You can acknowledge or dispute invoices where
        applicable.
      </p>

      <div className="space-y-4">
        {invoices.map(inv => {
          const canAcknowledge = BUYER_ACKNOWLEDGEABLE_FROM.has(inv.state_key);
          const canDispute = BUYER_DISPUTABLE_FROM.has(inv.state_key);

          return (
            <div key={inv.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-mono text-xs text-slate-500">Invoice #</span>
                  <span className="ml-1 font-semibold text-slate-800 text-sm">
                    {inv.invoice_number}
                  </span>
                </div>
                <StateBadge stateKey={inv.state_key} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Date</span>
                  <p className="text-slate-700">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                </div>
                {inv.due_date && (
                  <div>
                    <span className="text-slate-500 text-xs">Due</span>
                    <p className="text-slate-700">{new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 text-xs">Amount</span>
                  <p className="text-slate-800 font-semibold">
                    {inv.currency} {Number(inv.gross_amount).toLocaleString()}
                  </p>
                </div>
              </div>

              {inv.document_url && (
                <a
                  href={inv.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Document
                </a>
              )}

              <div className="flex gap-2 pt-1">
                {canAcknowledge && (
                  <button
                    onClick={() => setModal({ action: 'ACKNOWLEDGE', invoiceId: inv.id })}
                    className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Acknowledge
                  </button>
                )}
                {canDispute && (
                  <button
                    onClick={() => setModal({ action: 'DISPUTE', invoiceId: inv.id })}
                    className="text-xs px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600"
                  >
                    Dispute
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <ActionModal
          action={modal.action}
          invoiceId={modal.invoiceId}
          onComplete={handleActionComplete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
