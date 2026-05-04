/**
 * TtpTradeSummaryCard — Tenant Plane (TTP Slice 7: TTP Summary + Enrollment)
 *
 * Read-only card showing all TradeTtpSummary readiness indicators.
 * Displays: GST readiness, eligibility readiness, invoice readiness,
 * VPC readiness, routing readiness, enrollment state.
 *
 * Actor-sensitive: shows SELLER vs BUYER label.
 * Blockers displayed in amber callout.
 *
 * Boundary enforcement:
 *   - No raw data (raw_bureau_json, raw_verification_json) ever displayed.
 *   - No admin notes or internal risk details.
 *   - Read-only: no mutations.
 *   - No payment, escrow, or partner routing actions.
 *
 * D-017-A: org_id is NEVER sent in any request body. Server derives from JWT.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  tenantGetTradeTtpSummary,
  type TradeTtpSummary,
} from '../../services/ttpSummaryService';
import { APIError } from '../../services/apiClient';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tradeId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ReadinessBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
      }`}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TtpTradeSummaryCard({ tradeId }: Props) {
  const [summary, setSummary] = useState<TradeTtpSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantGetTradeTtpSummary(tradeId);
      setSummary(data);
    } catch (err) {
      if (err instanceof APIError && err.status === 403) {
        setError('You do not have access to this trade.');
      } else if (err instanceof APIError && err.status === 404) {
        setError('Trade not found.');
      } else {
        setError('Failed to load TTP summary.');
      }
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-400 animate-pulse">Loading TTP summary…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <p className="text-xs text-rose-600">{error ?? 'Unknown error.'}</p>
      </div>
    );
  }

  const roleBadge = summary.actor_role === 'SELLER'
    ? 'bg-indigo-100 text-indigo-700'
    : 'bg-sky-100 text-sky-700';

  const enrollmentBadge: Record<string, string> = {
    APPROVED:  'bg-emerald-100 text-emerald-700',
    REQUESTED: 'bg-amber-100 text-amber-700',
    REJECTED:  'bg-rose-100 text-rose-600',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">TradeTrust Pay Summary</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge}`}>
          {summary.actor_role}
        </span>
      </div>

      {/* Trade meta */}
      <div className="text-xs text-slate-500 space-y-0.5">
        <p><span className="font-medium text-slate-700">Trade:</span> {summary.trade_reference}</p>
        <p><span className="font-medium text-slate-700">Currency:</span> {summary.currency}</p>
        <p>
          <span className="font-medium text-slate-700">Trade State:</span>{' '}
          {summary.trade_lifecycle_state}
        </p>
      </div>

      {/* Enrollment state */}
      <Section title="Enrollment">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            summary.enrollment_state
              ? (enrollmentBadge[summary.enrollment_state] ?? 'bg-slate-100 text-slate-500')
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {summary.enrollment_state ?? 'Not Enrolled'}
        </span>
      </Section>

      {/* Readiness indicators */}
      <Section title="GST Readiness">
        <ReadinessBadge ok={summary.gst_readiness.is_approved} label="GST Verified" />
        {summary.gst_readiness.review_outcome && (
          <span className="text-xs text-slate-500">{summary.gst_readiness.review_outcome}</span>
        )}
      </Section>

      <Section title="Eligibility">
        <ReadinessBadge
          ok={summary.eligibility_readiness.is_eligible && !summary.eligibility_readiness.is_expired}
          label={
            summary.eligibility_readiness.is_expired
              ? 'Expired'
              : summary.eligibility_readiness.is_eligible
              ? 'Eligible'
              : 'Not Assessed'
          }
        />
        {summary.eligibility_readiness.risk_tier !== null && (
          <span className="text-xs text-slate-500">
            Risk Tier {summary.eligibility_readiness.risk_tier}
          </span>
        )}
      </Section>

      <Section title="Invoice">
        <ReadinessBadge ok={summary.invoice_readiness.is_verified} label={summary.invoice_readiness.state_key ?? 'No Invoice'} />
      </Section>

      <Section title="VPC">
        <ReadinessBadge ok={summary.vpc_readiness.is_active} label={summary.vpc_readiness.vpc_state ?? 'No VPC'} />
      </Section>

      <Section title="Routing">
        <ReadinessBadge
          ok={summary.routing_readiness.found}
          label={summary.routing_readiness.routing_state ?? 'Not Routed'}
        />
      </Section>

      {/* Blockers */}
      {summary.blockers.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-700">Readiness blockers:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {summary.blockers.map((b) => (
              <li key={b} className="text-xs text-amber-700">{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
