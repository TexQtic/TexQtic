/**
 * ComplianceQueue — Trust & Compliance panel (control-plane, admin-only)
 *
 * Re-anchored to canonical certification-backed records for OPS-CASEWORK-001.
 * The control-plane compliance surface now supervises durable certification
 * identity and lifecycle state rather than synthetic compliance.request events.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ComplianceDecision,
  getComplianceRequests,
} from '../../services/controlPlaneService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

const STATE_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-sky-900/50 text-sky-300',
  UNDER_REVIEW: 'bg-amber-900/50 text-amber-300',
  APPROVED: 'bg-emerald-900/50 text-emerald-300',
  REJECTED: 'bg-rose-900/60 text-rose-200',
  REVOKED: 'bg-red-900/60 text-red-200',
  EXPIRED: 'bg-slate-700 text-slate-400',
  PENDING_APPROVAL: 'bg-violet-900/50 text-violet-300',
};

function StateBadge({ stateKey }: Readonly<{ stateKey: string }>) {
  const cls = STATE_COLORS[stateKey] ?? 'bg-slate-700 text-slate-300';
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${cls}`}>
      {stateKey}
    </span>
  );
}

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ComplianceQueue: React.FC = () => {
  const [requests, setRequests] = useState<ComplianceDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── List fetch ──────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getComplianceRequests();
      setRequests(response.requests);
    } catch (err) {
      console.error('Failed to load compliance requests:', err);
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading compliance data..." />;
  if (error) return <ErrorState error={{ message: error }} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Trust & Compliance</h1>
          <p className="text-slate-400 text-sm">
            Review durable certification-backed compliance records.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-100">
        Compliance now reads canonical certification records as the primary supervised object. Legacy compliance request decisions are not the primary read surface in this tranche.
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
        This re-anchor step is read-only. Compliance action redesign remains out of scope until a certification-anchored follow-through path is defined.
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            title="No compliance records"
            message="No certification-backed compliance records returned yet"
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Certification ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Org ID</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Type</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">State</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Issued</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Expires</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px]">Latest Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(req => (
                <tr key={req.certificationId} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                    {truncateId(req.certificationId)}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                    {truncateId(req.orgId)}
                  </td>
                  <td className="px-6 py-4 text-slate-200 text-xs">
                    {req.certificationType}
                  </td>
                  <td className="px-6 py-4">
                    <StateBadge stateKey={req.stateKey} />
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatDateTime(req.issuedAt)}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatDateTime(req.expiresAt)}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {req.latestDecision ? `${req.latestDecision.status} · ${formatDateTime(req.latestDecision.decidedAt)}` : 'Not surfaced on certification id'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

