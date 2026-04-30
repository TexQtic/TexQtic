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

// ─── D-3: Passport Foundation types ──────────────────────────────────────────

type DppMaturityLevel = 'LOCAL_TRUST' | 'TRADE_READY' | 'COMPLIANCE' | 'GLOBAL_DPP';
type DppPassportStatus = 'DRAFT' | 'INTERNAL' | 'TRADE_READY' | 'PUBLISHED';

interface DppPassportView {
  nodeId: string;
  passportStatus: DppPassportStatus;
  passportMaturity: DppMaturityLevel;
  passportEvidenceSummary: {
    aiExtractedClaimsCount: number;
    approvedCertCount: number;
    lineageDepth: number;
  };
}

const PASSPORT_STATUS_CLASSES: Record<DppPassportStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  INTERNAL: 'bg-blue-50 text-blue-700 border-blue-200',
  TRADE_READY: 'bg-green-50 text-green-700 border-green-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PASSPORT_MATURITY_CLASSES: Record<DppMaturityLevel, string> = {
  LOCAL_TRUST: 'bg-slate-100 text-slate-600 border-slate-200',
  TRADE_READY: 'bg-green-50 text-green-700 border-green-200',
  COMPLIANCE: 'bg-blue-50 text-blue-700 border-blue-200',
  GLOBAL_DPP: 'bg-purple-50 text-purple-700 border-purple-200',
};

// ─── D-NETWORK-003 Slice A: Passport Network UI label maps ───────────────────

interface PassportStatusLabel {
  badgeLabel: string;
  helperLabel: string;
}

interface PassportMaturityLabel {
  badgeLabel: string;
  productLabel: string;
  scoreTier: string;
  sellerCta: string;
}

const PASSPORT_STATUS_LABELS: Record<DppPassportStatus, PassportStatusLabel> = {
  DRAFT:       { badgeLabel: 'In Progress',       helperLabel: 'Complete product details and submit for review.' },
  INTERNAL:    { badgeLabel: 'In Review',          helperLabel: 'Internal review is in progress before trade access.' },
  TRADE_READY: { badgeLabel: 'Trade Access',       helperLabel: 'Approved for authenticated B2B trade use.' },
  PUBLISHED:   { badgeLabel: 'Published — Public', helperLabel: 'Public passport is available through the public passport URL.' },
};

const PASSPORT_MATURITY_LABELS: Record<DppMaturityLevel, PassportMaturityLabel> = {
  LOCAL_TRUST: {
    badgeLabel:   'Bronze — Verified Local',
    productLabel: 'Product Trust Profile',
    scoreTier:    'Bronze',
    sellerCta:    'Add a QC report or link your supplier to reach Silver.',
  },
  TRADE_READY: {
    badgeLabel:   'Silver — Trade Ready',
    productLabel: 'Trade Ready Passport',
    scoreTier:    'Silver',
    sellerCta:    'Upload your certification bundle to reach Gold.',
  },
  COMPLIANCE: {
    badgeLabel:   'Gold — Certified',
    productLabel: 'Certified Passport',
    scoreTier:    'Gold',
    sellerCta:    'Add full traceability to reach Platinum and unlock export markets.',
  },
  GLOBAL_DPP: {
    badgeLabel:   'Platinum — Export Ready',
    productLabel: 'Global DPP Passport',
    scoreTier:    'Platinum',
    sellerCta:    'Highest tier reached. Keep your evidence current.',
  },
};

// ─── D-NETWORK-004 Slice B: Passport maturity ladder ─────────────────────────

const MATURITY_ORDER: readonly DppMaturityLevel[] = [
  'LOCAL_TRUST',
  'TRADE_READY',
  'COMPLIANCE',
  'GLOBAL_DPP',
];

interface MaturityTierInfo {
  description: string;
  requirements: readonly string[];
  /** Note shown to users at lower tiers — frames advanced tiers as optional growth paths. */
  advancedContext: string | null;
}

const MATURITY_TIER_INFO: Record<DppMaturityLevel, MaturityTierInfo> = {
  LOCAL_TRUST: {
    description: 'Basic product and business details verified.',
    requirements: [
      'Product details and photos',
      'Basic business identity',
      'Product category and material',
    ],
    advancedContext: null,
  },
  TRADE_READY: {
    description: 'Ready for B2B trade conversations.',
    requirements: [
      'At least one approved certificate or evidence item',
      'At least one supply-chain lineage link',
    ],
    advancedContext: null,
  },
  COMPLIANCE: {
    description: 'Certified and buyer-ready.',
    requirements: [
      'Approved certification evidence',
      'Valid certificate dates and issuing body',
      'Stronger buyer evidence bundle',
    ],
    advancedContext: 'Optional next growth step — for larger buyers and enterprise trade.',
  },
  GLOBAL_DPP: {
    description: 'Export-ready public passport.',
    requirements: [
      'Published public passport',
      'Full supply-chain traceability',
      'Export-grade evidence bundle',
    ],
    advancedContext: 'Optional export path — not required for local or domestic trade.',
  },
};

// ─── UUID validation ──────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

// ─── D-NETWORK-009 Slice G: Passport Assistant helper ────────────────────────
// Assistant guidance is advisory only; it must not mutate passport status,
// evidence, maturity, or publication state.

type GuidanceSeverity = 'high' | 'medium' | 'info';

interface GuidanceItem {
  text: string;
  severity: GuidanceSeverity;
}

interface PassportGuidance {
  expiryWarnings: GuidanceItem[];
  recommendations: GuidanceItem[];
  buyerReadiness: string;
  statusGuidance: string;
}

function buildPassportGuidance(
  passportData: DppPassportView,
  certifications: readonly DppCertRow[],
): PassportGuidance {
  const now = new Date();
  const expiryWarnings: GuidanceItem[] = [];

  // Check expiry: expired → high; within 30d → high; within 60d → medium
  let hasExpired = false;
  let within30 = false;
  let within60 = false;
  for (const cert of certifications) {
    if (!cert.expiryDate) continue;
    const daysLeft = Math.floor(
      (new Date(cert.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0) { hasExpired = true; break; }
    if (daysLeft <= 30) within30 = true;
    else if (daysLeft <= 60) within60 = true;
  }
  if (hasExpired) {
    expiryWarnings.push({
      text: 'One or more certificates appear expired. Update certificate evidence before relying on this passport for buyer review.',
      severity: 'high',
    });
  } else if (within30) {
    expiryWarnings.push({
      text: 'A certificate expires within 30 days. Renew it to keep buyer trust high.',
      severity: 'high',
    });
  } else if (within60) {
    expiryWarnings.push({
      text: 'A certificate expires within 60 days. Plan renewal to avoid losing readiness.',
      severity: 'medium',
    });
  }

  const maturityRecommendations: Record<DppMaturityLevel, GuidanceItem[]> = {
    LOCAL_TRUST: [
      { text: 'Add a QC report or certificate to improve buyer confidence.', severity: 'info' },
      { text: 'Link at least one supplier or production step to build supply-chain trust.', severity: 'info' },
      { text: 'For local trade, your profile can stay simple — export details are optional.', severity: 'info' },
    ],
    TRADE_READY: [
      { text: 'Upload a stronger certification bundle to move toward Gold.', severity: 'info' },
      { text: 'Add or update certificate validity dates.', severity: 'info' },
      { text: 'Add more traceability depth for larger buyers.', severity: 'info' },
    ],
    COMPLIANCE: [
      { text: 'Your passport is certified and buyer-ready. Add public publication readiness to move toward Platinum.', severity: 'info' },
      { text: 'Confirm certificates are current before publishing.', severity: 'info' },
      { text: 'Add full supply-chain traceability for export readiness.', severity: 'info' },
    ],
    GLOBAL_DPP: [
      { text: 'Your passport is export-ready. Keep evidence and certificates current.', severity: 'info' },
      { text: 'Review public passport URL and QR label before sharing with buyers.', severity: 'info' },
      { text: 'Monitor certificate expiry to avoid losing readiness.', severity: 'info' },
    ],
  };

  const statusGuidanceMap: Record<DppPassportStatus, string> = {
    DRAFT:       'Submit this passport for internal review when product details are ready.',
    INTERNAL:    'Complete review and evidence checks to unlock trade access.',
    TRADE_READY: 'This passport is approved for trade access. Publish only when it is ready for public buyer verification.',
    PUBLISHED:   'This passport is public. Keep evidence current because buyers can verify it.',
  };

  const buyerReadinessMap: Record<DppMaturityLevel, string> = {
    LOCAL_TRUST: 'Ready for basic local buyer discovery.',
    TRADE_READY: 'Ready for stronger B2B trade conversations.',
    COMPLIANCE:  'Ready for enterprise buyer review, subject to buyer-specific requirements.',
    GLOBAL_DPP:  'Ready for public buyer verification and export-oriented review, subject to buyer and jurisdiction requirements.',
  };

  return {
    expiryWarnings,
    recommendations: maturityRecommendations[passportData.passportMaturity],
    buyerReadiness:  buyerReadinessMap[passportData.passportMaturity],
    statusGuidance:  statusGuidanceMap[passportData.passportStatus],
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the user navigates back to the storefront home view. */
  onBack: () => void;
  title?: string;
  subtitle?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DPPPassport({ onBack, title = 'DPP Passport', subtitle = 'Digital Product Passport — Supply Chain Snapshot' }: Readonly<Props>) {
  const [nodeIdInput, setNodeIdInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DppSnapshot | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  // D-3: Passport Foundation state (non-blocking fetch; null = unavailable or not yet loaded)
  const [passportData, setPassportData] = useState<DppPassportView | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async () => {
    const trimmed = nodeIdInput.trim();

    setValidationError(null);
    setFetchError(null);
    setSnapshot(null);
    setPassportData(null);

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
      // D-3: Non-blocking passport fetch — failure does not affect existing snapshot display
      tenantGet<{ passport: DppPassportView }>(`/api/tenant/dpp/${encodeURIComponent(trimmed)}/passport`)
        .then(result => { setPassportData(result.passport); })
        .catch(() => { setPassportData(null); });
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
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
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

          {/* ── Passport Foundation section (D-3 additive) ── */}
          {passportData && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Maturity &amp; Trust Score</h2>

              {/* Status + Maturity badges */}
              <div className="flex flex-wrap gap-3">
                <span
                  data-testid="dpp-passport-status-badge"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${PASSPORT_STATUS_CLASSES[passportData.passportStatus]}`}
                >
                  {PASSPORT_STATUS_LABELS[passportData.passportStatus].badgeLabel}
                </span>
                <span
                  data-testid="dpp-maturity-indicator"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${PASSPORT_MATURITY_CLASSES[passportData.passportMaturity]}`}
                >
                  {PASSPORT_MATURITY_LABELS[passportData.passportMaturity].badgeLabel}
                </span>
              </div>

              {/* Product label + seller CTA */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  {PASSPORT_MATURITY_LABELS[passportData.passportMaturity].productLabel}
                </p>
                <p className="text-[11px] text-slate-500">
                  {PASSPORT_MATURITY_LABELS[passportData.passportMaturity].sellerCta}
                </p>
              </div>

              {/* Maturity Progression Ladder — Slice B */}
              {(() => {
                const currentIndex = MATURITY_ORDER.indexOf(passportData.passportMaturity);
                return (
                  <div data-testid="dpp-maturity-ladder" className="space-y-1.5 border-t border-slate-100 pt-3">
                    {MATURITY_ORDER.map((tier, index) => {
                      const state: 'completed' | 'current' | 'upcoming' =
                        index < currentIndex ? 'completed' :
                        index === currentIndex ? 'current' :
                        'upcoming';
                      const info = MATURITY_TIER_INFO[tier];
                      const lbl  = PASSPORT_MATURITY_LABELS[tier];

                      if (state === 'completed') {
                        return (
                          <div
                            key={tier}
                            data-testid={`dpp-maturity-tier-${tier}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <span className="text-green-600 text-xs" aria-hidden="true">✓</span>
                            <span className="text-xs font-semibold text-slate-600">{lbl.badgeLabel}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">Completed</span>
                          </div>
                        );
                      }

                      if (state === 'current') {
                        return (
                          <div
                            key={tier}
                            data-testid={`dpp-maturity-tier-${tier}`}
                            data-current="true"
                            className="px-3 py-3 rounded-lg bg-white border-2 border-green-300 shadow-sm"
                          >
                            <div
                              data-testid="dpp-maturity-tier-current"
                              className="flex items-center gap-2 mb-2"
                            >
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                Current
                              </span>
                              <span className="text-xs font-bold text-slate-800">{lbl.badgeLabel}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mb-2">{info.description}</p>
                            <ul className="space-y-1 mb-2" aria-label="Requirements">
                              {info.requirements.map((req) => (
                                <li key={req} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                  <span className="text-green-500 mt-0.5" aria-hidden="true">·</span>
                                  {req}
                                </li>
                              ))}
                            </ul>
                            <p
                              data-testid="dpp-maturity-next-step"
                              className="text-[11px] text-slate-600 font-medium mt-2 pt-2 border-t border-slate-100"
                            >
                              {lbl.sellerCta}
                            </p>
                          </div>
                        );
                      }

                      // upcoming
                      const isAdvanced = tier === 'COMPLIANCE' || tier === 'GLOBAL_DPP';
                      const isLocalUser = currentIndex <= 1;
                      return (
                        <div
                          key={tier}
                          data-testid={`dpp-maturity-tier-${tier}`}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-dashed border-slate-200"
                        >
                          <span className="text-slate-300 text-xs mt-0.5" aria-hidden="true">○</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">{lbl.badgeLabel}</span>
                              <span className="text-[10px] text-slate-400">—&nbsp;{lbl.productLabel}</span>
                            </div>
                            {isAdvanced && isLocalUser && info.advancedContext !== null && (
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">
                                {info.advancedContext}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">Upcoming</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Evidence summary */}
              <div data-testid="dpp-evidence-summary" className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Approved Certs</dt>
                  <dd data-testid="dpp-approved-cert-count" className="text-slate-800 font-bold text-2xl mt-1">
                    {passportData.passportEvidenceSummary.approvedCertCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Lineage Depth</dt>
                  <dd data-testid="dpp-lineage-depth" className="text-slate-800 font-bold text-2xl mt-1">
                    {passportData.passportEvidenceSummary.lineageDepth}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">AI Claims</dt>
                  <dd data-testid="dpp-ai-claims-count" className="text-slate-400 font-bold text-2xl mt-1">
                    {passportData.passportEvidenceSummary.aiExtractedClaimsCount}
                  </dd>
                </div>
              </div>
            </section>
          )}

          {/* ── D-NETWORK-009 Slice G: Passport Assistant ── */}
          {passportData && (() => {
            const guidance = buildPassportGuidance(passportData, snapshot.certifications);
            return (
              <section
                data-testid="dpp-passport-assistant"
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
              >
                <h2 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Passport Assistant</h2>
                <p
                  data-testid="dpp-passport-assistant-summary"
                  className="text-sm text-slate-600"
                >
                  Guidance is advisory only. Review these suggestions to strengthen buyer readiness.
                </p>

                {guidance.expiryWarnings.length > 0 && (
                  <div data-testid="dpp-passport-assistant-expiry-warning" className="space-y-2">
                    {guidance.expiryWarnings.map((warn) => (
                      <div
                        key={warn.text}
                        className={`px-4 py-3 rounded-lg text-sm border ${
                          warn.severity === 'high'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {warn.text}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  data-testid="dpp-passport-assistant-status-guidance"
                  className="text-sm text-slate-600 border-l-2 border-slate-200 pl-3 italic"
                >
                  {guidance.statusGuidance}
                </div>

                <div
                  data-testid="dpp-passport-assistant-buyer-readiness"
                  className="text-sm font-medium text-slate-700"
                >
                  {guidance.buyerReadiness}
                </div>

                <div data-testid="dpp-passport-assistant-recommendations" className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Improvement Suggestions</p>
                  <ul className="space-y-2" aria-label="Improvement suggestions">
                    {guidance.recommendations.map((rec) => (
                      <li
                        key={rec.text}
                        data-testid="dpp-passport-assistant-recommendation"
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true">→</span>
                        {rec.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}

export default DPPPassport;
