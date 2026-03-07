/**
 * CertificationsAdmin — Control Plane, Read-Only (TECS-FBW-005)
 *
 * Surfaces GET /api/control/certifications — cross-tenant certification list for
 * super-admin review.
 *
 * Constitutional compliance:
 *   D-017-A  orgId is an optional query-param FILTER only — not derived from auth here;
 *            the server uses admin sentinel + is_admin='true' RLS override.
 *   D-022-C  This panel is strictly read-only. No create, transition, or patch controls
 *            are present or may be added without explicit approval.
 *
 * Scope (TECS-FBW-005):
 *   ✅ Cross-tenant certification list (GET /api/control/certifications)
 *   ✅ Optional orgId filter (scopes to one tenant)
 *   ✅ Optional stateKey filter
 *   ❌ Create — out of scope (D-022-C: control admin is read-only)
 *   ❌ Transition — out of scope (D-022-C)
 *   ❌ Metadata update — out of scope (D-022-C)
 */

import React, { useState, useCallback } from 'react';
import {
  adminListCertifications,
  type AdminCertificationListItem,
} from '../../services/certificationService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

// ─── State key → badge color (dark theme) ────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  SUBMITTED:        'bg-sky-900/50 text-sky-300',
  UNDER_REVIEW:     'bg-amber-900/50 text-amber-300',
  APPROVED:         'bg-emerald-900/50 text-emerald-300',
  REJECTED:         'bg-rose-900/60 text-rose-200',
  REVOKED:          'bg-red-800/60 text-red-200',
  EXPIRED:          'bg-slate-700 text-slate-400',
  PENDING_APPROVAL: 'bg-violet-900/50 text-violet-300',
};

function StateKeyBadge({ stateKey }: { stateKey: string }) {
  const cls = STATE_COLORS[stateKey] ?? 'bg-amber-900/50 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {stateKey}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type FetchState = 'IDLE' | 'LOADING' | 'ERROR' | 'DONE';

// ─── CertificationsAdmin ──────────────────────────────────────────────────────

export const CertificationsAdmin: React.FC = () => {
  const [orgIdInput, setOrgIdInput]         = useState('');
  const [stateKeyInput, setStateKeyInput]   = useState('');
  const [certs, setCerts]                   = useState<AdminCertificationListItem[]>([]);
  const [count, setCount]                   = useState(0);
  const [fetchState, setFetchState]         = useState<FetchState>('IDLE');
  const [error, setError]                   = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setFetchState('LOADING');
    setError(null);
    try {
      const res = await adminListCertifications({
        orgId:    orgIdInput.trim() || undefined,
        stateKey: stateKeyInput.trim().toUpperCase() || undefined,
        limit:    100,
        offset:   0,
      });
      setCerts(res.certifications);
      setCount(res.count);
      setFetchState('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certifications.');
      setFetchState('ERROR');
    }
  }, [orgIdInput, stateKeyInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Certifications</h1>
        <p className="text-sm text-slate-400 mt-1">
          G-019 certification lifecycle — admin cross-tenant read surface (read-only · D-022-C)
        </p>
      </div>

      {/* Filter panel */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* orgId (optional) */}
          <div>
            <label
              className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"
              htmlFor="cert-admin-org-id"
            >
              Organisation ID{' '}
              <span className="text-slate-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="cert-admin-org-id"
              type="text"
              value={orgIdInput}
              onChange={e => setOrgIdInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* stateKey (optional) */}
          <div>
            <label
              className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"
              htmlFor="cert-admin-state-key"
            >
              State Key{' '}
              <span className="text-slate-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="cert-admin-state-key"
              type="text"
              value={stateKeyInput}
              onChange={e => setStateKeyInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. SUBMITTED, APPROVED, REVOKED"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetchState === 'LOADING'}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {fetchState === 'LOADING' ? 'Loading…' : 'Load Certifications'}
          </button>
          {fetchState !== 'IDLE' && (
            <button
              type="button"
              onClick={() => {
                setOrgIdInput('');
                setStateKeyInput('');
                setCerts([]);
                setCount(0);
                setFetchState('IDLE');
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600">
          Leave both fields empty to list all certifications across all tenants (limited to 100 rows).
          Filter by Org ID to scope to a single tenant. D-022-C: this surface is read-only.
        </p>
      </div>

      {/* States */}
      {fetchState === 'IDLE' && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm">Apply filters and click Load Certifications.</p>
        </div>
      )}

      {fetchState === 'LOADING' && <LoadingState />}

      {fetchState === 'ERROR' && error && (
        <ErrorState error={{ message: error }} onRetry={handleFetch} />
      )}

      {fetchState === 'DONE' && certs.length === 0 && (
        <EmptyState
          title="No certifications found"
          message="No certification records match the applied filters."
        />
      )}

      {/* Table */}
      {fetchState === 'DONE' && certs.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {count} certification{count !== 1 ? 's' : ''} returned
            </p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border border-slate-700 px-2 py-0.5 rounded">
              READ-ONLY · D-022-C
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40">
                <tr>
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Org ID</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">State</th>
                  <th className="px-6 py-3 text-left">Issued</th>
                  <th className="px-6 py-3 text-left">Expires</th>
                  <th className="px-6 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {certs.map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {truncateId(cert.id)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {truncateId(cert.orgId)}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">
                      {cert.certificationType}
                    </td>
                    <td className="px-6 py-4">
                      <StateKeyBadge stateKey={cert.stateKey} />
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formatDate(cert.issuedAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formatDate(cert.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {formatDate(cert.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
