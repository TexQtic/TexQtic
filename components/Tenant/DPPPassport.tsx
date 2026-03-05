/**
 * DPPPassport — Digital Product Passport read-only UI (G-025 TECS 4D + 5C2)
 *
 * TECS ID: G-025-DPP-SNAPSHOT-UI-EXPORT-001 / G-025-DPP-API-UI-MANUFACTURER-ENABLE-001
 * GOVERNANCE-SYNC-083 / GOVERNANCE-SYNC-087
 *
 * Consumes: GET /api/tenant/dpp/:nodeId (TECS 4C)
 * Views backing the API: dpp_snapshot_products_v1 / lineage_v1 / certifications_v1 (TECS 4B)
 *
 * Hard constraints:
 *   - No backend routes added (read-only consumer of TECS 4C route)
 *   - G-025-ORGS-RLS-001 ✅ VALIDATED (commit afcf47e) — manufacturer fields now returned
 *   - Export: Copy JSON + Download JSON (client-side only; no new server endpoints)
 *   - UUID validation client-side before fetch
 *   - Lineage rendering capped at 200 rows (safety)
 */

import { useState, useCallback } from 'react';
import { tenantGet } from '../../services/tenantApiClient';
import { APIError } from '../../services/apiClient';

// ─── Response types (mirrors server/src/routes/tenant.ts DPP route) ────────────

interface DppProduct {
  nodeId: string;
  orgId: string;
  batchId: string | null;
  nodeType: string | null;
  meta: unknown;
  geoHash: string | null;
  visibility: string | null;
  createdAt: string;
  updatedAt: string;
  manufacturerName: string | null;
  manufacturerJurisdiction: string | null;
  manufacturerRegistrationNo: string | null;
}

interface DppLineageRow {
  rootNodeId: string;
  nodeId: string;
  parentNodeId: string | null;
  depth: number;
  edgeType: string | null;
  createdAt: string;
}

interface DppCertRow {
  nodeId: string | null;
  certificationId: string | null;
  certificationType: string | null;
  lifecycleStateId: string | null;
  expiryDate: string | null;
  orgId: string;
}

interface DppSnapshot {
  nodeId: string;
  product: DppProduct;
  lineage: DppLineageRow[];
  certifications: DppCertRow[];
  meta: Record<string, unknown>;
}

// ─── UUID validation ──────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the user navigates back to the storefront home view. */
  onBack: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DPPPassport({ onBack }: Props) {
  const [nodeIdInput, setNodeIdInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DppSnapshot | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async () => {
    const trimmed = nodeIdInput.trim();

    setValidationError(null);
    setFetchError(null);
    setSnapshot(null);

    if (!trimmed) {
      setValidationError('Node ID is required.');
      return;
    }
    if (!isValidUuid(trimmed)) {
      setValidationError('Invalid UUID format. Expected xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.');
      return;
    }

    setLoading(true);
    try {
      const data = await tenantGet<DppSnapshot>(`/api/tenant/dpp/${encodeURIComponent(trimmed)}`);
      setSnapshot(data);
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setFetchError("Not found, or you don\u2019t have access (RLS).");
      } else if (err instanceof APIError) {
        setFetchError(`Error ${err.status}: ${err.message}`);
      } else {
        setFetchError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [nodeIdInput]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleCopyJson = useCallback(async () => {
    if (!snapshot) return;
    try {
      await window.navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('Copy failed — check browser permissions.');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  }, [snapshot]);

  const handleDownloadJson = useCallback(() => {
    if (!snapshot) return;
    const blob = new window.Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpp_${snapshot.nodeId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [snapshot]);

  // ── Lineage display (cap at 200 rows) ────────────────────────────────────
  const lineageRows = snapshot ? snapshot.lineage.slice(0, 200) : [];
  const lineageTruncated = snapshot ? snapshot.lineage.length > 200 : false;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-300 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-700 transition text-sm font-medium"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">DPP Passport</h1>
          <p className="text-slate-500 text-sm mt-0.5">Digital Product Passport — Supply Chain Snapshot</p>
        </div>
      </div>

      {/* ── Node ID input ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <label htmlFor="dpp-node-id-input" className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">
          Traceability Node ID
        </label>
        <div className="flex gap-3">
          <input
            id="dpp-node-id-input"
            type="text"
            value={nodeIdInput}
            onChange={e => { setNodeIdInput(e.target.value); setValidationError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') void handleLoad(); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-slate-500"
            disabled={loading}
          />
          <button
            onClick={() => void handleLoad()}
            disabled={loading}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
        {validationError && (
          <p className="text-red-600 text-sm">{validationError}</p>
        )}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{fetchError}</div>
        )}
      </div>

      {/* ── Snapshot content ── */}
      {snapshot && (
        <>
          {/* Export actions */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => void handleCopyJson()}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              {copyFeedback ?? '📋 Copy JSON'}
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              ⬇ Download JSON
            </button>
          </div>

          {/* ── Product section ── */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Product Identity</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-400 font-medium">Node ID</dt>
                <dd className="font-mono text-slate-700 text-xs break-all">{snapshot.product.nodeId}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Org ID</dt>
                <dd className="font-mono text-slate-700 text-xs break-all">{snapshot.product.orgId}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Batch ID</dt>
                <dd className="text-slate-700">{snapshot.product.batchId ?? <span className="text-slate-400 italic">—</span>}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Node Type</dt>
                <dd className="text-slate-700">{snapshot.product.nodeType ?? <span className="text-slate-400 italic">—</span>}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Visibility</dt>
                <dd className="text-slate-700">{snapshot.product.visibility ?? <span className="text-slate-400 italic">—</span>}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Geo Hash</dt>
                <dd className="text-slate-700 font-mono text-xs">{snapshot.product.geoHash ?? <span className="text-slate-400 italic">—</span>}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Created At</dt>
                <dd className="text-slate-700 text-xs">{new Date(snapshot.product.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium">Updated At</dt>
                <dd className="text-slate-700 text-xs">{new Date(snapshot.product.updatedAt).toLocaleString()}</dd>
              </div>
              {/* Manufacturer fields (G-025-ORGS-RLS-001 ✅ VALIDATED) */}
              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-medium">Manufacturer</dt>
                <dd className="text-slate-700">
                  {snapshot.product.manufacturerName ?? <span className="text-slate-400 italic">Manufacturer details unavailable</span>}
                </dd>
              </div>
              {snapshot.product.manufacturerJurisdiction && (
                <div>
                  <dt className="text-slate-400 font-medium">Jurisdiction</dt>
                  <dd className="text-slate-700">{snapshot.product.manufacturerJurisdiction}</dd>
                </div>
              )}
              {snapshot.product.manufacturerRegistrationNo && (
                <div>
                  <dt className="text-slate-400 font-medium">Registration No.</dt>
                  <dd className="text-slate-700 font-mono text-xs">{snapshot.product.manufacturerRegistrationNo}</dd>
                </div>
              )}
            </dl>
            {/* Meta (JSONB passthrough) */}
            {!!snapshot.product.meta && Object.keys(snapshot.product.meta as object).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-800">Meta (JSONB)</summary>
                <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-100 rounded p-3 overflow-auto max-h-40 text-slate-700">
                  {JSON.stringify(snapshot.product.meta, null, 2)}
                </pre>
              </details>
            )}
          </section>

          {/* ── Certifications section ── */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Certifications</h2>
            {snapshot.certifications.length === 0 ? (
              <p className="text-slate-400 text-sm italic">No certifications linked.</p>
            ) : (
              <div className="space-y-2">
                {snapshot.certifications.map((cert, i) => (
                  <div key={cert.certificationId ?? i} className="flex flex-wrap gap-x-6 gap-y-1 text-sm border-b border-slate-50 pb-2 last:border-0">
                    <span>
                      <span className="text-slate-400 font-medium">Type: </span>
                      <span className="text-slate-700">{cert.certificationType ?? <span className="text-slate-400 italic">—</span>}</span>
                    </span>
                    <span>
                      <span className="text-slate-400 font-medium">State ID: </span>
                      <span className="font-mono text-xs text-slate-600">{cert.lifecycleStateId ?? '—'}</span>
                    </span>
                    <span>
                      <span className="text-slate-400 font-medium">Expires: </span>
                      <span className="text-slate-700">
                        {cert.expiryDate
                          ? new Date(cert.expiryDate).toLocaleDateString()
                          : <span className="text-slate-400 italic">—</span>
                        }
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Lineage section ── */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
              Supply Chain Lineage
              {snapshot.lineage.length > 0 && (
                <span className="ml-2 font-normal normal-case text-slate-400">
                  ({lineageTruncated ? `showing 200 of ${snapshot.lineage.length}` : snapshot.lineage.length} hops)
                </span>
              )}
            </h2>
            {snapshot.lineage.length === 0 ? (
              <p className="text-slate-400 text-sm italic">No lineage edges found for this node.</p>
            ) : (
              <div className="space-y-1 text-xs font-mono">
                {lineageTruncated && (
                  <div className="text-amber-600 text-[11px] mb-2 font-sans">
                    Truncated — showing first 200 rows of {snapshot.lineage.length} lineage hops.
                  </div>
                )}
                <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-x-4 gap-y-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100 font-sans">
                  <span>Depth</span>
                  <span>Node ID</span>
                  <span>Parent Node ID</span>
                  <span>Edge Type</span>
                  <span>Created</span>
                </div>
                {lineageRows.map((row, i) => (
                  <div
                    key={`${row.nodeId}-${i}`}
                    className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-x-4 gap-y-0 text-[11px] text-slate-600 even:bg-slate-50/50"
                  >
                    <span className="text-slate-400 font-bold">{row.depth}</span>
                    <span className="truncate">{row.nodeId}</span>
                    <span className="truncate text-slate-400">{row.parentNodeId ?? '—'}</span>
                    <span className="text-slate-500">{row.edgeType ?? '—'}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(row.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default DPPPassport;
