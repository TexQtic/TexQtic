/**
 * InvoicesPanel — Tenant Plane (TTP Slice 4: Invoice Domain)
 *
 * Seller invoice management panel:
 *   - List invoices for the authenticated org
 *   - Create a new invoice (DRAFT)
 *   - Submit an invoice (DRAFT → SUBMITTED)
 *
 * D-017-A: org_id is NEVER sent in any request body.
 * Finance surfaces: read-only amount display only. No payment/money-movement actions.
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  listInvoices,
  createInvoice,
  transitionInvoice,
  type TenantInvoiceRecord,
  type CreateInvoiceInput,
} from '../../services/invoiceService';
import { APIError } from '../../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelView = 'list' | 'create';

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

// ─── Create Invoice Form ──────────────────────────────────────────────────────

const EMPTY_FORM: CreateInvoiceInput = {
  trade_id: '',
  invoice_number: '',
  invoice_date: '',
  due_date: null,
  currency: 'INR',
  gross_amount: 0,
  document_url: null,
  notes: null,
};

interface CreateFormProps {
  onCreated: (record: TenantInvoiceRecord) => void;
  onCancel: () => void;
}

function CreateInvoiceForm({ onCreated, onCancel }: CreateFormProps) {
  const [form, setForm] = useState<CreateInvoiceInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof CreateInvoiceInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.trade_id || !form.invoice_number || !form.invoice_date || !form.currency || !form.gross_amount) {
      setError('All required fields must be filled.');
      return;
    }
    setSubmitting(true);
    try {
      const record = await createInvoice({
        ...form,
        gross_amount: Number(form.gross_amount),
      });
      onCreated(record);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Create Invoice</h2>

      {error && (
        <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Trade ID <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.trade_id}
            onChange={e => setForm(p => ({ ...p, trade_id: e.target.value }))}
            placeholder="UUID"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Invoice Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.invoice_number}
            onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))}
            placeholder="INV-2024-001"
            maxLength={100}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Invoice Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.invoice_date}
            onChange={e => setForm(p => ({ ...p, invoice_date: new Date(e.target.value).toISOString() }))}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
          <input
            type="datetime-local"
            value={form.due_date ? form.due_date.slice(0, 16) : ''}
            onChange={e =>
              setForm(p => ({
                ...p,
                due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
              }))
            }
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Currency <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.currency}
            onChange={e => setForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
            maxLength={10}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Gross Amount <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={0.01}
            step="0.01"
            value={form.gross_amount}
            onChange={e => setForm(p => ({ ...p, gross_amount: parseFloat(e.target.value) || 0 }))}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Document URL</label>
          <input
            type="url"
            value={form.document_url ?? ''}
            onChange={set('document_url')}
            placeholder="https://..."
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={set('notes')}
            rows={3}
            maxLength={5000}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function InvoicesPanel() {
  const [view, setView] = useState<PanelView>('list');
  const [invoices, setInvoices] = useState<TenantInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null); // invoiceId being transitioned

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInvoices();
      setInvoices(data);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCreated = (record: TenantInvoiceRecord) => {
    setInvoices(prev => [record, ...prev]);
    setView('list');
  };

  const handleSubmit = async (invoice: TenantInvoiceRecord) => {
    setSubmitting(invoice.id);
    try {
      const updated = await transitionInvoice(invoice.id, 'SUBMITTED', 'Seller submitted invoice for review');
      setInvoices(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to submit invoice.');
    } finally {
      setSubmitting(null);
    }
  };

  if (view === 'create') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <CreateInvoiceForm onCreated={handleCreated} onCancel={() => setView('list')} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Invoices</h1>
        <button
          onClick={() => setView('create')}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Invoice
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center">No invoices yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="py-2 pr-4">Invoice #</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Currency</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-slate-50">
                  <td className="py-2 pr-4 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="py-2 pr-4 text-slate-600">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="py-2 pr-4 text-slate-600">{inv.currency}</td>
                  <td className="py-2 pr-4 text-slate-800 font-medium">
                    {Number(inv.gross_amount).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <StateBadge stateKey={inv.state_key} />
                  </td>
                  <td className="py-2 text-right">
                    {inv.state_key === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmit(inv)}
                        disabled={submitting === inv.id}
                        className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting === inv.id ? 'Submitting…' : 'Submit'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
