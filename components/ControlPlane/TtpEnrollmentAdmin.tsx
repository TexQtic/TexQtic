/**
 * TtpEnrollmentAdmin — Control Plane (TTP Slice 7: TTP Summary + Enrollment)
 *
 * Lists all TTP enrollments and provides an approve/reject/suspend/cancel
 * review dialog for SUPER_ADMIN.
 *
 * Approval enforces server-side gates:
 *   1. Seller GST review_outcome = APPROVED
 *   2. TTP eligibility assessment exists
 *   3. Eligibility not expired
 *
 * Boundary enforcement:
 *   - NO VPC generation button.
 *   - NO partner routing button.
 *   - NO PSP / payment / escrow actions.
 *   - No money-movement implication in any label or UI element.
 *
 * Governance: TTP Slice 7, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminListTtpEnrollments,
  adminReviewTtpEnrollment,
  type AdminEnrollmentRecord,
  type TtpEnrollmentReviewOutcome,
} from '../../services/ttpEnrollmentService';
import { APIError } from '../../services/apiClient';

// ─── Review dialog ────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  record: AdminEnrollmentRecord;
  onComplete: () => void;
  onCancel: () => void;
}

type OutcomeOption = {
  value: TtpEnrollmentReviewOutcome;
  label: string;
  cls: string;
};

const OUTCOME_OPTIONS: OutcomeOption[] = [
  { value: 'APPROVED',  label: 'Approve',  cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'REJECTED',  label: 'Reject',   cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
  { value: 'SUSPENDED', label: 'Suspend',  cls: 'bg-orange-600 hover:bg-orange-700 text-white' },
  { value: 'CANCELLED', label: 'Cancel',   cls: 'bg-slate-600 hover:bg-slate-700 text-white' },
];

const GATE_NOTES: Record<string, string> = {
  APPROVED: 'Approval requires: seller GST ✓ APPROVED, eligibility assessment present and not expired.',
};

function ReviewDialog({ record, onComplete, onCancel }: ReviewDialogProps) {
  const [outcome, setOutcome] = useState<TtpEnrollmentReviewOutcome | null>(null);
  const [notes, setNotes]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminReviewTtpEnrollment(record.trade_id, {
        outcome,
        notes: notes.trim() || undefined,
      });
      onComplete();
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message ?? 'Review failed. Check gate requirements.');
      } else {
        setError('Unexpected error. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">
          Review TTP Enrollment — {record.trade_reference}
        </h2>

        <div className="text-xs text-slate-500 space-y-0.5">
          <p><span className="font-medium text-slate-700">Trade ID:</span> {record.trade_id}</p>
          <p><span className="font-medium text-slate-700">Seller Org:</span> {record.seller_org_id}</p>
          <p>
            <span className="font-medium text-slate-700">Current State:</span>{' '}
            {record.enrollment_state ?? 'None'}
          </p>
        </div>

        {outcome === 'APPROVED' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            {GATE_NOTES['APPROVED']}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Outcome</p>
            <div className="flex flex-wrap gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  disabled={submitting}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    outcome === opt.value
                      ? opt.cls + ' ring-2 ring-offset-1 ring-slate-400'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!outcome || submitting}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── State badge ──────────────────────────────────────────────────────────────

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  REQUESTED:  { label: 'Requested',  cls: 'bg-amber-100 text-amber-700' },
  APPROVED:   { label: 'Approved',   cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-rose-100 text-rose-600' },
  SUSPENDED:  { label: 'Suspended',  cls: 'bg-orange-100 text-orange-700' },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-slate-100 text-slate-500' },
};

// ─── Main component ───────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All States' },
  { value: 'REQUESTED',  label: 'Requested' },
  { value: 'APPROVED',   label: 'Approved' },
  { value: 'REJECTED',   label: 'Rejected' },
  { value: 'SUSPENDED',  label: 'Suspended' },
  { value: 'CANCELLED',  label: 'Cancelled' },
];

export default function TtpEnrollmentAdmin() {
  const [records, setRecords]             = useState<AdminEnrollmentRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [statusFilter, setStatusFilter]   = useState('');
  const [reviewing, setReviewing]         = useState<AdminEnrollmentRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListTtpEnrollments(statusFilter ? { status: statusFilter } : undefined);
      setRecords(data);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message ?? 'Failed to load enrollments.');
      } else {
        setError('Failed to load enrollments.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Review dialog */}
      {reviewing && (
        <ReviewDialog
          record={reviewing}
          onComplete={() => { setReviewing(null); load(); }}
          onCancel={() => setReviewing(null)}
        />
      )}

      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">TTP Enrollment Queue</h2>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && <p className="text-xs text-slate-400 animate-pulse">Loading enrollments…</p>}

      {/* Error */}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Empty state */}
      {!loading && !error && records.length === 0 && (
        <p className="text-xs text-slate-400">No enrollments found.</p>
      )}

      {/* Table */}
      {!loading && records.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-2">Trade</th>
                <th className="px-4 py-2">Seller Org</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2">Last Updated</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => {
                const badge = rec.enrollment_state
                  ? (STATE_BADGE[rec.enrollment_state] ?? { label: rec.enrollment_state, cls: 'bg-slate-100 text-slate-500' })
                  : { label: 'None', cls: 'bg-slate-100 text-slate-500' };
                return (
                  <tr key={rec.trade_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-medium">{rec.trade_reference}</td>
                    <td className="px-4 py-2 text-slate-500 font-mono text-[10px]">
                      {rec.seller_org_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {rec.last_updated_at
                        ? new Date(rec.last_updated_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setReviewing(rec)}
                        className="rounded bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
