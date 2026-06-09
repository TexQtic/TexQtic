/**
 * GstVerificationQueue — Control Plane (TTP Slice 2: GST Verification Gate)
 *
 * Lists all pending GST verifications (review_outcome IS NULL) and provides
 * a review dialog for SUPER_ADMIN to record APPROVED / REJECTED / NEEDS_MORE_INFO.
 *
 * Note: GST verification is manual in this phase.
 *       No live GST portal verification is performed.
 *
 * Governance: TTP Slice 2, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminListPendingGstVerifications,
  adminReviewGstVerification,
  type GstVerificationAdminRecord,
  type AdminReviewInput,
} from '../../services/gstVerificationService';
import { APIError } from '../../services/apiClient';

// ─── Review dialog ────────────────────────────────────────────────────────────

type ReviewOutcome = 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO';

const OUTCOME_OPTIONS: { value: ReviewOutcome; label: string; cls: string }[] = [
  { value: 'APPROVED',        label: 'Approve',         cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'REJECTED',        label: 'Reject',          cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
  { value: 'NEEDS_MORE_INFO', label: 'Needs More Info', cls: 'bg-sky-600 hover:bg-sky-700 text-white' },
];

// ─── Provider evidence helpers ────────────────────────────────────────────────

const PROVIDER_RESULT_LABELS: Record<string, string> = {
  AUTO_APPROVED:  'Auto approved',
  TIMEOUT:        'Provider timeout',
  MISMATCH:       'Name / state mismatch',
  INACTIVE_GSTIN: 'Inactive GSTIN',
  INVALID_GSTIN:  'Invalid GSTIN',
  PROVIDER_ERROR: 'Provider error',
  DUPLICATE_GSTIN:'Duplicate GSTIN',
};

const PROVIDER_RESULT_BADGE_CLS: Record<string, string> = {
  AUTO_APPROVED:  'bg-emerald-100 text-emerald-700',
  TIMEOUT:        'bg-amber-100 text-amber-700',
  MISMATCH:       'bg-orange-100 text-orange-700',
  INACTIVE_GSTIN: 'bg-slate-100 text-slate-600',
  INVALID_GSTIN:  'bg-rose-100 text-rose-700',
  PROVIDER_ERROR: 'bg-rose-100 text-rose-700',
  DUPLICATE_GSTIN:'bg-violet-100 text-violet-700',
};

function formatProviderResult(result: string | null | undefined): string {
  if (!result) return 'Not checked — manual review';
  return PROVIDER_RESULT_LABELS[result] ?? result;
}

function providerResultBadgeCls(result: string | null | undefined): string {
  if (!result) return 'bg-slate-100 text-slate-500';
  return PROVIDER_RESULT_BADGE_CLS[result] ?? 'bg-slate-100 text-slate-600';
}

function formatProviderName(name: string | null | undefined): string {
  if (!name) return 'Not configured';
  if (name === 'deepvue') return 'Deepvue';
  if (name === 'noop') return 'Noop (sandbox)';
  return name;
}

function formatReviewRoute(result: string | null | undefined): string {
  if (result === 'AUTO_APPROVED') return 'Auto-approved';
  if (!result) return 'Manual review required';
  return 'Admin fallback required';
}

interface ReviewDialogProps {
  record: GstVerificationAdminRecord;
  onComplete: () => void;
  onCancel: () => void;
}

function ReviewDialog({ record, onComplete, onCancel }: ReviewDialogProps) {
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return;
    setError(null);
    setSubmitting(true);

    const input: AdminReviewInput = {
      review_outcome: outcome,
      review_notes: notes.trim() || null,
    };

    try {
      await adminReviewGstVerification(record.org_id, input);
      onComplete();
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message || 'Review submission failed. Please try again.');
      } else {
        setError('Review submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Dialog header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Review GST Verification</h3>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Record details */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Org ID</dt>
              <dd className="text-slate-800 font-mono text-xs mt-0.5 break-all">{record.org_id}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">GSTIN</dt>
              <dd className="text-slate-800 font-mono mt-0.5">{record.gstin}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Legal Name on GST</dt>
              <dd className="text-slate-800 mt-0.5">{record.legal_name_on_gst}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">State Code</dt>
              <dd className="text-slate-800 mt-0.5">{record.state_code}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Registration Type</dt>
              <dd className="text-slate-800 mt-0.5">{record.registration_type}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Filing Status</dt>
              <dd className="text-slate-800 mt-0.5">{record.filing_status}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500 font-medium">Submitted At</dt>
              <dd className="text-slate-800 mt-0.5">
                {new Date(record.submitted_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Provider evidence */}
        <div className="px-5 py-4 bg-indigo-50 border-b border-slate-100">
          <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
            Provider Evidence (advisory context)
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Provider</dt>
              <dd className="text-slate-800 mt-0.5">{formatProviderName(record.provider_name)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Review route</dt>
              <dd className="text-slate-800 mt-0.5">{formatReviewRoute(record.provider_result)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Provider result</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${providerResultBadgeCls(record.provider_result)}`}>
                  {formatProviderResult(record.provider_result)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Verified at</dt>
              <dd className="text-slate-800 mt-0.5 text-xs">
                {record.provider_verified_at
                  ? new Date(record.provider_verified_at).toLocaleString()
                  : 'Not verified'}
              </dd>
            </div>
          </dl>
          <div className="mt-3 rounded bg-white border border-indigo-100 p-2.5 text-xs text-indigo-600 space-y-1">
            <p>Provider result is advisory evidence only. Non-approved provider outcomes require manual admin review.</p>
            <p>Do not reject automatically based only on provider result.</p>
            <p>Raw provider response and sensitive identity fields are hidden for privacy and security.</p>
          </div>
        </div>

        {/* Review form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Outcome <span className="text-rose-500">*</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {OUTCOME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-opacity ${
                    outcome === opt.value ? opt.cls : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes visible to platform admins…"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-400">{notes.length}/2000</p>
          </div>

          {error && (
            <div className="rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!outcome || submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const GstVerificationQueue: React.FC = () => {
  const [records, setRecords] = useState<GstVerificationAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<GstVerificationAdminRecord | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await adminListPendingGstVerifications();
      setRecords(response.gst_verifications);
    } catch {
      setLoadError('Failed to load pending GST verifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  function handleReviewComplete() {
    setSelectedRecord(null);
    void loadPending();
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-800">GST Verification Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pending manual review — no live GST portal verification
          </p>
        </div>
        <button
          onClick={() => void loadPending()}
          disabled={loading}
          className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {loadError && (
          <div className="rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 mb-4">
            {loadError}
          </div>
        )}

        {!loading && records.length === 0 && !loadError && (
          <p className="text-sm text-slate-500 py-4 text-center">
            No pending GST verifications.
          </p>
        )}

        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-600">Org ID</th>
                  <th className="pb-2 pr-4 font-medium text-slate-600">GSTIN</th>
                  <th className="pb-2 pr-4 font-medium text-slate-600">Legal Name</th>
                  <th className="pb-2 pr-4 font-medium text-slate-600">State</th>
                  <th className="pb-2 pr-4 font-medium text-slate-600">Submitted</th>
                  <th className="pb-2 pr-4 font-medium text-slate-600">Provider</th>
                  <th className="pb-2 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500 max-w-[140px] truncate">
                      {rec.org_id}
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-800">{rec.gstin}</td>
                    <td className="py-3 pr-4 text-slate-800 max-w-[200px] truncate">
                      {rec.legal_name_on_gst}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{rec.state_code}</td>
                    <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(rec.submitted_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${providerResultBadgeCls(rec.provider_result)}`}>
                        {formatProviderResult(rec.provider_result)}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="text-sm text-indigo-600 hover:underline font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review dialog */}
      {selectedRecord && (
        <ReviewDialog
          record={selectedRecord}
          onComplete={handleReviewComplete}
          onCancel={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default GstVerificationQueue;
