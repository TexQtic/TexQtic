/**
 * GstVerificationCard — Tenant Plane (TTP Slice 2: GST Verification Gate)
 *
 * Displays GST verification status and provides submission form.
 *
 * View states:
 *   not_submitted  — no record exists; show submission form
 *   pending        — submitted, review_outcome IS NULL
 *   approved       — review_outcome = APPROVED
 *   rejected       — review_outcome = REJECTED; tenant may re-submit
 *   needs_more_info — review_outcome = NEEDS_MORE_INFO; tenant may re-submit
 *
 * D-017-A: tenantId / org_id is NEVER sent in any request body.
 *          The server derives org scope from JWT claims exclusively.
 *
 * Note: GST verification is manual in this phase.
 *       No live GST portal verification is performed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getGstVerification,
  submitGstVerification,
  type GstVerificationRecord,
  type GstSubmitInput,
} from '../../services/gstVerificationService';
import { APIError } from '../../services/apiClient';

// ─── View state ───────────────────────────────────────────────────────────────

type ViewState = 'loading' | 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'needs_more_info' | 'error';

function resolveViewState(record: GstVerificationRecord | null): ViewState {
  if (!record) return 'not_submitted';
  if (!record.review_outcome) return 'pending';
  if (record.review_outcome === 'APPROVED') return 'approved';
  if (record.review_outcome === 'REJECTED') return 'rejected';
  if (record.review_outcome === 'NEEDS_MORE_INFO') return 'needs_more_info';
  return 'pending';
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:         { label: 'Pending Review',    cls: 'bg-amber-100 text-amber-700' },
  approved:        { label: 'Approved',          cls: 'bg-emerald-100 text-emerald-700' },
  rejected:        { label: 'Rejected',          cls: 'bg-rose-100 text-rose-700' },
  needs_more_info: { label: 'Needs More Info',   cls: 'bg-sky-100 text-sky-700' },
  not_submitted:   { label: 'Not Submitted',     cls: 'bg-slate-100 text-slate-500' },
};

function StatusBadge({ state }: { state: ViewState }) {
  const badge = STATUS_BADGE[state] ?? STATUS_BADGE.not_submitted;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

// ─── Submission form ──────────────────────────────────────────────────────────

interface FormState {
  gstin: string;
  legal_name_on_gst: string;
  state_code: string;
  registration_type: string;
}

const EMPTY_FORM: FormState = {
  gstin: '',
  legal_name_on_gst: '',
  state_code: '',
  registration_type: '',
};

interface SubmitFormProps {
  initial?: Partial<FormState>;
  onSuccess: (record: GstVerificationRecord) => void;
}

function SubmitForm({ initial, onSuccess }: SubmitFormProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const input: GstSubmitInput = {
      gstin: form.gstin.trim().toUpperCase(),
      legal_name_on_gst: form.legal_name_on_gst.trim(),
      state_code: form.state_code.trim(),
      registration_type: form.registration_type.trim(),
    };

    try {
      const response = await submitGstVerification(input);
      if (response.gst_verification) {
        onSuccess(response.gst_verification);
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message || 'Submission failed. Please check your details and try again.');
      } else {
        setError('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          GSTIN <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          maxLength={15}
          value={form.gstin}
          onChange={e => handleChange('gstin', e.target.value)}
          placeholder="e.g. 29ABCDE1234F1Z5"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
        />
        <p className="mt-1 text-xs text-slate-500">15-character GST Identification Number</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Legal Name on GST Certificate <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          maxLength={500}
          value={form.legal_name_on_gst}
          onChange={e => handleChange('legal_name_on_gst', e.target.value)}
          placeholder="As registered with GST authority"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          State Code <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          maxLength={10}
          value={form.state_code}
          onChange={e => handleChange('state_code', e.target.value)}
          placeholder="e.g. 29"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Registration Type <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          maxLength={50}
          value={form.registration_type}
          onChange={e => handleChange('registration_type', e.target.value)}
          placeholder="e.g. Regular, Composition"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div className="rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
        GST verification is manual in this phase. No live GST portal verification is performed.
        A platform administrator will review your submission.
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit for Verification'}
      </button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
}

export const GstVerificationCard: React.FC<Props> = ({ onBack }) => {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [record, setRecord] = useState<GstVerificationRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const loadVerification = useCallback(async () => {
    setViewState('loading');
    setLoadError(null);
    try {
      const response = await getGstVerification();
      const rec = response.gst_verification ?? null;
      setRecord(rec);
      setViewState(resolveViewState(rec));
    } catch {
      setLoadError('Failed to load GST verification status.');
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  function handleSubmitSuccess(newRecord: GstVerificationRecord) {
    setRecord(newRecord);
    setViewState(resolveViewState(newRecord));
    setShowResubmitForm(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (viewState === 'loading') {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-sm text-slate-500">Loading GST verification status…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (viewState === 'error') {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-sm text-rose-600">{loadError}</p>
        <button
          onClick={() => void loadVerification()}
          className="mt-3 text-sm text-indigo-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-800">GST Verification</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Required for TradeTrust Pay eligibility
            </p>
          </div>
        </div>
        <StatusBadge state={viewState} />
      </div>

      <div className="px-6 py-5">
        {/* Not submitted — show form */}
        {viewState === 'not_submitted' && (
          <SubmitForm onSuccess={handleSubmitSuccess} />
        )}

        {/* Pending review */}
        {viewState === 'pending' && record && (
          <div className="space-y-4">
            <div className="rounded bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              Your GST details have been submitted and are pending review by a platform administrator.
              No live GST portal verification is performed in this phase.
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
                <dt className="text-slate-500 font-medium">Submitted At</dt>
                <dd className="text-slate-800 mt-0.5">
                  {new Date(record.submitted_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Approved */}
        {viewState === 'approved' && record && (
          <div className="space-y-4">
            <div className="rounded bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              Your GST verification has been approved.
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
            </dl>
          </div>
        )}

        {/* Rejected — allow re-submission */}
        {viewState === 'rejected' && record && (
          <div className="space-y-4">
            <div className="rounded bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
              Your GST verification was rejected.
              {record.review_notes && (
                <p className="mt-2 font-medium">Note: {record.review_notes}</p>
              )}
              You may correct your details and re-submit.
            </div>
            {!showResubmitForm && (
              <button
                onClick={() => setShowResubmitForm(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Re-submit with updated details
              </button>
            )}
            {showResubmitForm && (
              <SubmitForm
                initial={{
                  gstin: record.gstin,
                  legal_name_on_gst: record.legal_name_on_gst,
                  state_code: record.state_code,
                  registration_type: record.registration_type,
                }}
                onSuccess={handleSubmitSuccess}
              />
            )}
          </div>
        )}

        {/* Needs more info — allow re-submission */}
        {viewState === 'needs_more_info' && record && (
          <div className="space-y-4">
            <div className="rounded bg-sky-50 border border-sky-200 p-4 text-sm text-sky-800">
              Additional information is required for your GST verification.
              {record.review_notes && (
                <p className="mt-2 font-medium">Note: {record.review_notes}</p>
              )}
              Please update your details and re-submit.
            </div>
            {!showResubmitForm && (
              <button
                onClick={() => setShowResubmitForm(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Update and re-submit
              </button>
            )}
            {showResubmitForm && (
              <SubmitForm
                initial={{
                  gstin: record.gstin,
                  legal_name_on_gst: record.legal_name_on_gst,
                  state_code: record.state_code,
                  registration_type: record.registration_type,
                }}
                onSuccess={handleSubmitSuccess}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GstVerificationCard;
