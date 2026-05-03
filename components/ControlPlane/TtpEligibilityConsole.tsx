/**
 * TtpEligibilityConsole — Control Plane (TTP Slice 3: CIBIL Eligibility Gate)
 *
 * Displays the latest eligibility assessment and full assessment history for an org.
 * Provides a form modal for SUPER_ADMIN to create a new eligibility assessment.
 *
 * WARNING: Manual assessment only. No live CIBIL or credit bureau pull is performed
 *          in this phase. This console records a human admin's judgment.
 *
 * Tier defaults (shown in UI):
 *   Tier 1 (Low)    → ₹2,50,000 max invoice
 *   Tier 2 (Medium) → ₹5,00,000 max invoice
 *   Tier 3 (High)   → ₹10,00,000 max invoice
 *   Tier 0 (Thin)   → No cap / not eligible for VPC
 *
 * Note: Not wired into navigation — available for direct import by ControlPlane routes.
 *
 * Governance: TTP Slice 3, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  adminCreateTtpEligibilityAssessment,
  adminGetTtpEligibilityAssessments,
  type TtpEligibilityAssessmentRecord,
  type TtpEligibilityOutcome,
  type CreateTtpEligibilityAssessmentInput,
} from '../../services/ttpEligibilityService';
import { APIError } from '../../services/apiClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_TIER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tier 0 — Thin-file (no VPC eligibility)' },
  { value: 1, label: 'Tier 1 — Low risk (₹2,50,000 cap)' },
  { value: 2, label: 'Tier 2 — Medium risk (₹5,00,000 cap)' },
  { value: 3, label: 'Tier 3 — High / trusted (₹10,00,000 cap)' },
];

const OUTCOME_OPTIONS: { value: TtpEligibilityOutcome; label: string; cls: string }[] = [
  { value: 'ELIGIBLE',      label: 'Eligible',      cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'INELIGIBLE',    label: 'Ineligible',    cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
  { value: 'MANUAL_REVIEW', label: 'Manual Review', cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
];

function outcomeBadge(outcome: string) {
  if (outcome === 'ELIGIBLE')
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
        Eligible
      </span>
    );
  if (outcome === 'INELIGIBLE')
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
        Ineligible
      </span>
    );
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
      Manual Review
    </span>
  );
}

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return '—';
  return `${currency} ${amount.toLocaleString('en-IN')}`;
}

// ─── New assessment dialog ────────────────────────────────────────────────────

interface NewAssessmentDialogProps {
  orgId: string;
  onComplete: () => void;
  onCancel: () => void;
}

function NewAssessmentDialog({ orgId, onComplete, onCancel }: NewAssessmentDialogProps) {
  const [riskTier, setRiskTier] = useState<number>(1);
  const [outcome, setOutcome] = useState<TtpEligibilityOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (outcome === null) return;
    setError(null);
    setSubmitting(true);

    const input: CreateTtpEligibilityAssessmentInput = {
      risk_tier: riskTier,
      eligibility_outcome: outcome,
      assessment_notes: notes.trim() || null,
    };

    try {
      await adminCreateTtpEligibilityAssessment(orgId, input);
      onComplete();
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message || 'Assessment submission failed. Please try again.');
      } else {
        setError('Assessment submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">New Eligibility Assessment</h3>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Warning banner */}
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 font-medium">
            Manual assessment only. No live CIBIL or credit bureau pull is performed in this phase.
          </p>
        </div>

        {/* Org context */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <dl className="text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Org ID</dt>
              <dd className="text-slate-800 font-mono text-xs mt-0.5 break-all">{orgId}</dd>
            </div>
          </dl>
        </div>

        {/* Tier caps reference */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-500 font-medium mb-1">Default Invoice Caps by Tier</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            <li>Tier 1 (Low): ₹2,50,000</li>
            <li>Tier 2 (Medium): ₹5,00,000</li>
            <li>Tier 3 (High / Trusted): ₹10,00,000</li>
            <li>Tier 0 (Thin-file): No cap — requires Manual Review, not eligible for VPC</li>
          </ul>
          <p className="text-xs text-slate-400 mt-1">
            Caps are resolved from feature flags at assessment time (default 180-day validity).
          </p>
        </div>

        {/* Assessment form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Risk tier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Risk Tier <span className="text-rose-500">*</span>
            </label>
            <select
              value={riskTier}
              onChange={e => setRiskTier(Number(e.target.value))}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RISK_TIER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome */}
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
                    outcome === opt.value
                      ? opt.cls
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {riskTier === 0 && (
              <p className="mt-1.5 text-xs text-amber-600 font-medium">
                Tier 0 (thin-file) requires MANUAL_REVIEW outcome.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assessment Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add assessment rationale visible to platform admins…"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-400">{notes.length}/5000</p>
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
              disabled={outcome === null || submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {submitting ? 'Submitting…' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TtpEligibilityConsoleProps {
  orgId: string;
}

export const TtpEligibilityConsole: React.FC<TtpEligibilityConsoleProps> = ({ orgId }) => {
  const [assessments, setAssessments] = useState<TtpEligibilityAssessmentRecord[]>([]);
  const [latest, setLatest] = useState<TtpEligibilityAssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await adminGetTtpEligibilityAssessments(orgId);
      setAssessments(response.assessments);
      setLatest(response.latest);
    } catch {
      setLoadError('Failed to load eligibility assessments.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  function handleAssessmentComplete() {
    setShowNewDialog(false);
    void loadAssessments();
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-800">TTP Eligibility Console</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manual assessment only — no live CIBIL or credit bureau pull in this phase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadAssessments()}
            disabled={loading}
            className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowNewDialog(true)}
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            New Assessment
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-6">
        {loadError && (
          <div className="rounded bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {/* Latest assessment summary */}
        {latest ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Latest Assessment
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500 font-medium">Outcome</dt>
                <dd className="mt-0.5">{outcomeBadge(latest.eligibility_outcome)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Risk Tier</dt>
                <dd className="text-slate-800 mt-0.5">Tier {latest.risk_tier}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Max Invoice</dt>
                <dd className="text-slate-800 mt-0.5">
                  {formatCurrency(latest.max_invoice_amount, latest.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Assessed At</dt>
                <dd className="text-slate-800 mt-0.5 text-xs">
                  {new Date(latest.assessed_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Valid Until</dt>
                <dd className="text-slate-800 mt-0.5 text-xs">
                  {latest.valid_until ? new Date(latest.valid_until).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Admin ID</dt>
                <dd className="text-slate-500 mt-0.5 font-mono text-xs truncate">
                  {latest.assessed_by_admin_id ?? '—'}
                </dd>
              </div>
              {latest.assessment_notes && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-slate-500 font-medium">Notes</dt>
                  <dd className="text-slate-700 mt-0.5">{latest.assessment_notes}</dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          !loading && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm text-slate-500">No eligibility assessment on record for this org.</p>
              <p className="text-xs text-slate-400 mt-1">
                GST verification must be approved before creating an assessment.
              </p>
            </div>
          )
        )}

        {/* Assessment history table */}
        {assessments.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Assessment History ({assessments.length})
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-2 pr-4 font-medium text-slate-600">Assessed At</th>
                    <th className="pb-2 pr-4 font-medium text-slate-600">Outcome</th>
                    <th className="pb-2 pr-4 font-medium text-slate-600">Tier</th>
                    <th className="pb-2 pr-4 font-medium text-slate-600">Max Invoice</th>
                    <th className="pb-2 pr-4 font-medium text-slate-600">Valid Until</th>
                    <th className="pb-2 font-medium text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map(rec => (
                    <tr
                      key={rec.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(rec.assessed_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">{outcomeBadge(rec.eligibility_outcome)}</td>
                      <td className="py-3 pr-4 text-slate-700">Tier {rec.risk_tier}</td>
                      <td className="py-3 pr-4 text-slate-700">
                        {formatCurrency(rec.max_invoice_amount, rec.currency)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {rec.valid_until ? new Date(rec.valid_until).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 text-slate-600 max-w-[200px] truncate">
                        {rec.assessment_notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New assessment dialog */}
      {showNewDialog && (
        <NewAssessmentDialog
          orgId={orgId}
          onComplete={handleAssessmentComplete}
          onCancel={() => setShowNewDialog(false)}
        />
      )}
    </div>
  );
};

export default TtpEligibilityConsole;
