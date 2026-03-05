/**
 * WLDomainsPanel — WL_ADMIN Custom Domains panel (OPS-WLADMIN-DOMAINS-001)
 *
 * Shell constraint: WL_ADMIN only. Must never be imported by the EXPERIENCE
 * shell or any non-WL_ADMIN surface.
 *
 * Scope (Path D6D-A — CRUD-lite):
 *   - Read:   GET  /api/tenant/domains
 *   - Add:    POST /api/tenant/domains   { domain: string }
 *   - Remove: DELETE /api/tenant/domains/:id
 *
 * Platform domain (<slug>.texqtic.app) is shown as a read-only badge.
 * After each mutation the domain list is refetched and the cache-invalidation
 * emitter fires (server-side, TECS 6D).
 *
 * Governance: GOVERNANCE-SYNC-093
 */

import { useState, useEffect, useCallback } from 'react';
import { tenantGet, tenantPost, tenantDelete } from '../../services/tenantApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantDomain {
  id: string;
  domain: string;
  verified: boolean;
  primary: boolean;
  createdAt: string;
}

interface DomainsResponse {
  domains: TenantDomain[];
}

// ─── Domain validation ────────────────────────────────────────────────────────
// Mirrors the backend Zod regex: lowercase labels only, no scheme, no path, no port.

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function validateDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return 'Domain is required';
  if (trimmed.includes('://')) return 'Remove the scheme (http:// / https://)';
  if (trimmed.includes('/')) return 'Domain must not contain a path';
  if (trimmed.includes(':')) return 'Domain must not include a port';
  if (!DOMAIN_REGEX.test(trimmed)) {
    return 'Invalid domain — use lowercase letters, digits, hyphens and dots only (e.g. shop.example.com)';
  }
  return null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
      {message}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  domain,
  deleting,
  onConfirm,
  onCancel,
}: {
  domain: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">Remove domain?</h3>
        <p className="text-slate-600 text-sm">
          <span className="font-semibold text-slate-800">{domain}</span> will be removed from your
          store. DNS records you configured externally are not affected.
        </p>
        <p className="text-red-600 text-xs">This cannot be undone.</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
          >
            {deleting ? 'Removing…' : 'Remove'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg font-bold text-sm text-slate-600 hover:text-slate-900 border border-slate-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface WLDomainsPanelProps {
  tenantSlug: string;
}

export function WLDomainsPanel({ tenantSlug }: WLDomainsPanelProps) {
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Delete flow
  const [confirmDomain, setConfirmDomain] = useState<TenantDomain | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  };

  // ─── Fetch domains ──────────────────────────────────────────────────────────

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantGet<DomainsResponse>('/api/tenant/domains');
      setDomains(data.domains);
    } catch {
      setError('Failed to load domains. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDomains();
  }, [fetchDomains]);

  // ─── Add domain ────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const normalised = addInput.trim().toLowerCase();
    const validationErr = validateDomain(normalised);
    if (validationErr) {
      setAddError(validationErr);
      return;
    }

    setAddError(null);
    setAdding(true);
    try {
      await tenantPost('/api/tenant/domains', { domain: normalised });
      setAddInput('');
      showToast(`Domain ${normalised} added`);
      await fetchDomains();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 409) {
        setAddError('This domain is already registered.');
      } else {
        setAddError('Failed to add domain. Please try again.');
      }
    } finally {
      setAdding(false);
    }
  }, [addInput, fetchDomains]);

  // ─── Remove domain ─────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDomain) return;
    setDeleting(true);
    try {
      await tenantDelete(`/api/tenant/domains/${confirmDomain.id}`);
      showToast(`Domain ${confirmDomain.domain} removed`);
      setConfirmDomain(null);
      await fetchDomains();
    } catch {
      showToast('Failed to remove domain. Please try again.');
      setConfirmDomain(null);
    } finally {
      setDeleting(false);
    }
  }, [confirmDomain, fetchDomains]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const platformDomain = `${tenantSlug}.texqtic.app`;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Domains</h2>
        <p className="text-sm text-slate-500 mt-1">
          Connect a custom domain and configure DNS for your white-label store.
        </p>
      </div>

      {/* Platform domain (read-only) */}
      <section className="bg-slate-50 rounded-2xl p-5 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Platform domain
        </p>
        <div className="flex items-center gap-3">
          <span className="text-base font-mono font-semibold text-slate-800">
            {platformDomain}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            Active
          </span>
        </div>
        <p className="text-xs text-slate-400">
          This domain is always available and cannot be removed.
        </p>
      </section>

      {/* Custom domains */}
      <section className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Custom domains
        </p>

        {loading && (
          <p className="text-sm text-slate-400 animate-pulse">Loading domains…</p>
        )}

        {!loading && error && (
          <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">
            {error}
            <button
              onClick={() => void fetchDomains()}
              className="ml-3 underline text-red-600 hover:text-red-800 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && domains.length === 0 && (
          <p className="text-sm text-slate-400">
            No custom domains yet. Add one below.
          </p>
        )}

        {!loading && !error && domains.length > 0 && (
          <ul className="space-y-2">
            {domains.map(d => (
              <li
                key={d.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm text-slate-800 truncate">
                    {d.domain}
                  </span>
                  {d.verified ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      Pending DNS
                    </span>
                  )}
                  {d.primary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      Primary
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDomain(d)}
                  className="ml-4 flex-shrink-0 text-slate-400 hover:text-red-600 transition text-xs font-medium"
                  aria-label={`Remove ${d.domain}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add domain form */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Add a custom domain</p>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={addInput}
              onChange={e => {
                setAddInput(e.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleAdd();
              }}
              placeholder="shop.example.com"
              disabled={adding}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={adding || !addInput.trim()}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition disabled:opacity-40"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {addError && (
          <p className="text-xs text-red-600">{addError}</p>
        )}

        <p className="text-xs text-slate-400">
          Point a CNAME record at <span className="font-mono">{platformDomain}</span> before adding.
        </p>
      </section>

      {/* Confirm delete dialog */}
      {confirmDomain && (
        <ConfirmDeleteDialog
          domain={confirmDomain.domain}
          deleting={deleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setConfirmDomain(null)}
        />
      )}

      {/* Toast */}
      <Toast message={toast} />
    </div>
  );
}
