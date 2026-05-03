/**
 * InvoiceOversight — Control Plane (TTP Slice 4: Invoice Domain)
 *
 * Admin invoice oversight console:
 *   - Cross-tenant invoice list with filtering (org_id, trade_id, state_key)
 *   - Invoice detail view
 *   - Admin lifecycle transition (SUPER_ADMIN only):
 *       SUBMITTED    → UNDER_REVIEW
 *       UNDER_REVIEW → VERIFIED  (requires maker/checker for high-value)
 *       UNDER_REVIEW → INELIGIBLE
 *       VERIFIED     → SUPERSEDED
 *       DISPUTED     → UNDER_REVIEW
 *       INELIGIBLE   → UNDER_REVIEW (reconsideration)
 *       Various      → WITHDRAWN
 *
 * UNDER_REVIEW→VERIFIED with maker-checker fields:
 *   Both maker_user_id and checker_user_id required when gross_amount
 *   >= ttp_maker_checker_threshold_inr feature flag.
 *
 * Finance surfaces: read-only. No money movement controls.
 *
 * Governance: TTP Slice 4, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminListInvoices,
  adminGetInvoice,
  adminTransitionInvoice,
  type AdminInvoiceRecord,
  type InvoiceStateKey,
  type AdminTransitionInput,
} from '../../services/invoiceService';
import { APIError } from '../../services/apiClient';

// ─── Badge helpers ─────────────────────────────────────────────────────────────

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

// ─── Admin-allowed transitions per current state (§34 seeds, PLATFORM_ADMIN) ──

const ADMIN_TRANSITIONS: Record<string, InvoiceStateKey[]> = {
  SUBMITTED:    ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['VERIFIED', 'INELIGIBLE', 'WITHDRAWN'],
  VERIFIED:     ['SUPERSEDED'],
  DISPUTED:     ['UNDER_REVIEW', 'WITHDRAWN'],
  INELIGIBLE:   ['UNDER_REVIEW'],
};

// ─── Transition Modal ─────────────────────────────────────────────────────────

interface TransitionModalProps {
  invoice: AdminInvoiceRecord;
  onComplete: () => void;
  onClose: () => void;
}

function TransitionModal({ invoice, onComplete, onClose }: TransitionModalProps) {
  const allowedTargets = ADMIN_TRANSITIONS[invoice.state_key] ?? [];
  const [toStateKey, setToStateKey] = useState<InvoiceStateKey>(
    allowedTargets[0] ?? 'UNDER_REVIEW',
  );
  const [reason, setReason] = useState('');
  const [makerId, setMakerId] = useState('');
  const [checkerId, setCheckerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsMakerChecker = toStateKey === 'VERIFIED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setSubmitting(true);
    setError(null);

    const input: AdminTransitionInput = {
      to_state_key: toStateKey,
      reason: reason.trim(),
      maker_user_id: needsMakerChecker && makerId.trim() ? makerId.trim() : null,
      checker_user_id: needsMakerChecker && checkerId.trim() ? checkerId.trim() : null,
    };

    try {
      await adminTransitionInvoice(invoice.id, input);
      onComplete();
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Transition failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (allowedTargets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">No Transitions Available</h3>
          <p className="text-sm text-slate-600">
            This invoice is in a terminal or locked state. No admin transitions are permitted.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Admin Transition</h3>
        <p className="text-sm text-slate-500">
          Invoice <span className="font-mono">{invoice.invoice_number}</span> — current state:{' '}
          <StateBadge stateKey={invoice.state_key} />
        </p>

        {error && (
          <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Transition to <span className="text-rose-500">*</span>
            </label>
            <select
              value={toStateKey}
              onChange={e => setToStateKey(e.target.value as InvoiceStateKey)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {allowedTargets.map(s => (
                <option key={s} value={s}>
                  {STATE_BADGE[s]?.label ?? s}
                </option>
              ))}
            </select>
          </div>

          {needsMakerChecker && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-xs font-semibold text-amber-700">
                Maker-Checker required for VERIFIED transition on high-value invoices.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Maker User ID (UUID)
                </label>
                <input
                  type="text"
                  value={makerId}
                  onChange={e => setMakerId(e.target.value)}
                  placeholder="UUID of maker admin"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Checker User ID (UUID)
                </label>
                <input
                  type="text"
                  value={checkerId}
                  onChange={e => setCheckerId(e.target.value)}
                  placeholder="UUID of checker admin"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
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
              className="px-4 py-2 text-sm rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {submitting ? 'Applying…' : 'Apply Transition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface Filters {
  org_id: string;
  trade_id: string;
  state_key: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceOversight() {
  const [invoices, setInvoices] = useState<AdminInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ org_id: '', trade_id: '', state_key: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminInvoiceRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [transitionModal, setTransitionModal] = useState<AdminInvoiceRecord | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.org_id.trim()) params.org_id = filters.org_id.trim();
      if (filters.trade_id.trim()) params.trade_id = filters.trade_id.trim();
      if (filters.state_key.trim()) params.state_key = filters.state_key.trim();
      const data = await adminListInvoices(Object.keys(params).length ? params : undefined);
      setInvoices(data);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await adminGetInvoice(id);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleTransitionComplete = () => {
    setTransitionModal(null);
    fetchInvoices();
    if (selectedId) loadDetail(selectedId);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Invoice Oversight</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Filter by Org ID (UUID)"
          value={filters.org_id}
          onChange={e => setFilters(f => ({ ...f, org_id: e.target.value }))}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Filter by Trade ID (UUID)"
          value={filters.trade_id}
          onChange={e => setFilters(f => ({ ...f, trade_id: e.target.value }))}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filters.state_key}
          onChange={e => setFilters(f => ({ ...f, state_key: e.target.value }))}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All States</option>
          {Object.keys(STATE_BADGE).map(s => (
            <option key={s} value={s}>
              {STATE_BADGE[s].label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">{error}</div>
      )}

      {/* Layout: list + detail side-by-side */}
      <div className="flex gap-4">
        {/* Invoice list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="text-slate-500 text-sm py-8 text-center">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3">Invoice #</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Currency</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr
                      key={inv.id}
                      className={`border-b cursor-pointer hover:bg-slate-50 ${
                        selectedId === inv.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => loadDetail(inv.id)}
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{inv.currency}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {Number(inv.gross_amount).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">
                        <StateBadge stateKey={inv.state_key} />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setTransitionModal(inv);
                          }}
                          className="text-xs px-2 py-1 rounded border text-blue-600 hover:bg-blue-50"
                        >
                          Transition
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="w-80 shrink-0 border-l pl-4">
            {loadingDetail ? (
              <div className="text-slate-500 text-sm py-4 text-center">Loading detail…</div>
            ) : detail ? (
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold text-slate-800">Invoice Detail</h3>
                <dl className="space-y-1">
                  {[
                    ['Invoice #', detail.invoice_number],
                    ['Status', <StateBadge key="s" stateKey={detail.state_key} />],
                    ['Org ID', <span key="o" className="font-mono text-xs">{detail.org_id}</span>],
                    ['Buyer Org', <span key="b" className="font-mono text-xs">{detail.buyer_org_id}</span>],
                    ['Trade ID', <span key="t" className="font-mono text-xs">{detail.trade_id}</span>],
                    ['Currency', detail.currency],
                    ['Gross Amount', Number(detail.gross_amount).toLocaleString()],
                    ['Invoice Date', new Date(detail.invoice_date).toLocaleDateString()],
                    detail.due_date ? ['Due Date', new Date(detail.due_date).toLocaleDateString()] : null,
                  ]
                    .filter((row): row is (string | React.ReactElement)[] => row !== null)
                    .map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between gap-2">
                        <dt className="text-slate-500 shrink-0">{label}</dt>
                        <dd className="text-slate-800 text-right truncate">{value as React.ReactNode}</dd>
                      </div>
                    ))}
                </dl>
                {detail.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{detail.notes}</p>
                  </div>
                )}
                {detail.document_url && (
                  <a
                    href={detail.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View Document
                  </a>
                )}
                <button
                  onClick={() => setTransitionModal(detail)}
                  className="w-full mt-2 text-xs px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800"
                >
                  Apply Transition
                </button>
              </div>
            ) : (
              <div className="text-slate-500 text-sm py-4 text-center">
                Invoice not found.
              </div>
            )}
          </div>
        )}
      </div>

      {transitionModal && (
        <TransitionModal
          invoice={transitionModal}
          onComplete={handleTransitionComplete}
          onClose={() => setTransitionModal(null)}
        />
      )}
    </div>
  );
}
