/**
 * TtpEnrollmentBanner — Tenant Plane (TTP Slice 7: TTP Summary + Enrollment)
 *
 * Displays current TTP enrollment state for the seller org of a trade.
 * Shows a "Request TTP Enrollment" button only when enrollment is null,
 * REJECTED, or CANCELLED.
 *
 * Disclaimer: TradeTrust Pay is a verified trade readiness layer.
 *   It is NOT a payment guarantee or financing commitment.
 *
 * D-017-A: org_id is NEVER sent in request body. Server derives from JWT.
 *
 * Boundary enforcement:
 *   - No PSP, payment, escrow, or partner routing buttons.
 *   - No VPC generation actions.
 *   - Read-only for buyer role.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  tenantGetTtpEnrollment,
  tenantRequestTtpEnrollment,
  type TtpEnrollmentRecord,
} from '../../services/ttpEnrollmentService';
import { APIError } from '../../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  tradeId: string;
  actorRole: 'BUYER' | 'SELLER';
  blockers?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  REQUESTED:  { label: 'Enrollment Requested',  cls: 'bg-amber-100 text-amber-700' },
  APPROVED:   { label: 'Enrolled',              cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:   { label: 'Enrollment Rejected',   cls: 'bg-rose-100 text-rose-700' },
  SUSPENDED:  { label: 'Enrollment Suspended',  cls: 'bg-orange-100 text-orange-700' },
  CANCELLED:  { label: 'Enrollment Cancelled',  cls: 'bg-slate-100 text-slate-500' },
};

function canRequest(state: string | null): boolean {
  return state === null || state === 'REJECTED' || state === 'CANCELLED';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TtpEnrollmentBanner({ tradeId, actorRole, blockers = [] }: Props) {
  const [record, setRecord]         = useState<TtpEnrollmentRecord | null>(null);
  const [loading, setLoading]       = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [reason, setReason]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantGetTtpEnrollment(tradeId);
      setRecord(data);
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setRecord(null);
      } else {
        setError('Failed to load TTP enrollment status.');
      }
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async () => {
    setRequesting(true);
    setError(null);
    try {
      const data = await tenantRequestTtpEnrollment(tradeId, reason ? { reason } : undefined);
      setRecord(data);
      setReason('');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message ?? 'Enrollment request failed.');
      } else {
        setError('Enrollment request failed.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const enrollmentState = record?.enrollment_state ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">TradeTrust Pay Enrollment</h3>
        {!loading && enrollmentState && STATE_BADGE[enrollmentState] && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_BADGE[enrollmentState].cls}`}>
            {STATE_BADGE[enrollmentState].label}
          </span>
        )}
        {!loading && !enrollmentState && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
            Not Enrolled
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-500 italic">
        TradeTrust Pay is a verified trade readiness layer. It is not a payment guarantee or
        financing commitment.
      </p>

      {/* Loading state */}
      {loading && (
        <p className="text-xs text-slate-400 animate-pulse">Loading enrollment status…</p>
      )}

      {/* Blockers */}
      {!loading && blockers.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-700">Readiness blockers:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {blockers.map((b) => (
              <li key={b} className="text-xs text-amber-700">{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      {/* Request form — shown only for seller when can request */}
      {!loading && actorRole === 'SELLER' && canRequest(enrollmentState) && (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            rows={2}
            placeholder="Reason for enrollment request (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={requesting}
          />
          <button
            type="button"
            onClick={handleRequest}
            disabled={requesting}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {requesting ? 'Submitting…' : 'Request TTP Enrollment'}
          </button>
        </div>
      )}

      {/* Read-only for buyer */}
      {!loading && actorRole === 'BUYER' && enrollmentState === 'APPROVED' && (
        <p className="text-xs text-emerald-700">
          The seller is enrolled in TradeTrust Pay for this trade.
        </p>
      )}
    </div>
  );
}
