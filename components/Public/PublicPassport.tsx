import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

type DppMaturity = 'LOCAL_TRUST' | 'TRADE_READY' | 'COMPLIANCE' | 'GLOBAL_DPP';

interface PassportCertification {
  certificationType: string;
  lifecycleStateName: string;
  expiryDate: string | null;
  issuedAt: string | null;
}

interface PassportData {
  publicPassportId: string;
  passportStatus: 'PUBLISHED';
  passportMaturity: DppMaturity;
  product: {
    nodeType: string;
    batchId: string | null;
    manufacturerName: string | null;
    manufacturerJurisdiction: string | null;
  };
  lineageSummary: {
    lineageDepth: number;
    nodeCount: number;
  };
  certifications: PassportCertification[];
  evidenceSummary: {
    approvedCertCount: number;
  };
  qr: {
    payloadUrl: string;
    format: 'url';
  };
  exportedAt: string;
  labelConfig?: {
    publicTitle: string | null;
    buyerFacingLabel: string;
    subtitle: string | null;
    showTexqticBrand: boolean;
  };
}

const MATURITY_LABELS: Record<
  DppMaturity,
  { badge: string; desc: string; color: string }
> = {
  LOCAL_TRUST: {
    badge: 'Bronze — Verified Local',
    desc: 'Verified local product information.',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  TRADE_READY: {
    badge: 'Silver — Trade Ready',
    desc: 'Trade-ready supplier evidence is available.',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  COMPLIANCE: {
    badge: 'Gold — Certified',
    desc: 'Certified and buyer-ready evidence is available.',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  GLOBAL_DPP: {
    badge: 'Platinum — Export Ready',
    desc: 'Export-ready product with a verified public passport.',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
  },
};

function buildProductStory(passport: PassportData): string {
  const { product, certifications } = passport;
  const parts: string[] = [];
  if (product.manufacturerName && product.manufacturerJurisdiction) {
    parts.push(`Made by ${product.manufacturerName} in ${product.manufacturerJurisdiction}.`);
  } else if (product.manufacturerName) {
    parts.push(`Made by ${product.manufacturerName}.`);
  } else if (product.manufacturerJurisdiction) {
    parts.push(`Origin: ${product.manufacturerJurisdiction}.`);
  }
  parts.push(`Product type: ${product.nodeType}.`);
  if (product.batchId) {
    parts.push(`Batch reference: ${product.batchId}.`);
  }
  const approvedCerts = certifications.filter(c => c.lifecycleStateName === 'APPROVED');
  if (approvedCerts.length > 0) {
    const uniqueTypes = [...new Set(approvedCerts.map(c => c.certificationType))].slice(0, 3);
    parts.push(
      `Holds ${approvedCerts.length} approved certification${approvedCerts.length !== 1 ? 's' : ''} including ${uniqueTypes.join(', ')}.`
    );
  } else if (certifications.length > 0) {
    parts.push(
      `${certifications.length} certification${certifications.length !== 1 ? 's' : ''} on record.`
    );
  }
  return parts.join(' ');
}

function certVisualState(lifecycleStateName: string): {
  label: string;
  cardClass: string;
  dotClass: string;
} {
  const normalized = lifecycleStateName.toUpperCase();
  if (normalized === 'APPROVED') {
    return { label: 'Approved', cardClass: 'bg-green-50 border-green-200', dotClass: 'bg-green-500' };
  }
  if (normalized === 'EXPIRED') {
    return { label: 'Expired', cardClass: 'bg-amber-50 border-amber-200', dotClass: 'bg-amber-400' };
  }
  if (normalized === 'REVOKED') {
    return { label: 'Revoked', cardClass: 'bg-red-50 border-red-200', dotClass: 'bg-red-400' };
  }
  const label = lifecycleStateName.charAt(0).toUpperCase() + lifecycleStateName.slice(1).toLowerCase();
  return { label, cardClass: 'bg-slate-50 border-slate-200', dotClass: 'bg-slate-400' };
}

interface PublicPassportProps {
  readonly publicPassportId: string;
}

export function PublicPassport({ publicPassportId }: PublicPassportProps) {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicPassportId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    fetch(`/api/public/dpp/${encodeURIComponent(publicPassportId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError('This passport could not be loaded. Please try again later.');
          setLoading(false);
          return;
        }
        const json = (await res.json()) as { success: boolean; data: PassportData };
        if (!cancelled) {
          setPassport(json.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to reach the passport service. Please check your connection.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicPassportId]);

  if (loading) {
    return (
      <div
        data-testid="public-passport-page"
        className="min-h-screen bg-[#f3f8fb] font-sans flex flex-col items-center justify-center p-6"
      >
        <div data-testid="public-passport-loading" className="text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
          <p className="text-sm text-slate-500">Loading passport…</p>
        </div>
      </div>
    );
  }

  if (notFound || error) {
    return (
      <div
        data-testid="public-passport-page"
        className="min-h-screen bg-[#f3f8fb] font-sans flex flex-col items-center justify-center p-6"
      >
        <div data-testid="public-passport-error" className="text-center max-w-md">
          <p className="text-lg font-semibold text-slate-800">
            {notFound ? 'Passport not found' : 'Unable to load passport'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {notFound
              ? 'This public passport does not exist or is no longer published.'
              : error}
          </p>
        </div>
      </div>
    );
  }

  if (!passport) {
    return null;
  }

  const maturity = MATURITY_LABELS[passport.passportMaturity] ?? MATURITY_LABELS.LOCAL_TRUST;
  const buyerPageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/passport/${encodeURIComponent(publicPassportId)}`
    : `/passport/${encodeURIComponent(publicPassportId)}`;
  const productStory = buildProductStory(passport);

  return (
    <div
      data-testid="public-passport-page"
      className="min-h-screen bg-[#f3f8fb] font-sans text-slate-900"
    >
      {/* Header */}
      <header data-testid="public-passport-header" className="border-b border-[#d6e4e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <img
            src="/brand/texqtic-logo.png"
            alt="TexQtic"
            className="h-10 w-auto"
            loading="eager"
          />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Public Product Passport
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Passport status */}
        <div className="mb-3">
          <span
            data-testid="public-passport-status-badge"
            className="inline-block rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-700 border border-green-200"
          >
            {passport.passportStatus}
          </span>
        </div>

        {/* Product identifier */}
        <h1
          data-testid="public-passport-product-name"
          className="text-2xl font-bold text-slate-900"
        >
          {passport.product.manufacturerName
            ? `${passport.product.manufacturerName} — ${passport.product.nodeType}`
            : passport.product.nodeType}
        </h1>
        {passport.product.manufacturerJurisdiction && (
          <p className="mt-1 text-sm text-slate-500">
            {passport.product.manufacturerJurisdiction}
          </p>
        )}

        {/* Maturity badge */}
        <div
          data-testid="public-passport-maturity-badge"
          className={`mt-5 inline-flex flex-col gap-1 rounded-2xl border px-5 py-4 ${maturity.color}`}
        >
          <span className="text-sm font-bold">{maturity.badge}</span>
          <span className="text-xs">{maturity.desc}</span>
        </div>

        {/* [2] Product Story */}
        <section
          data-testid="public-passport-product-story"
          className="mt-8 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Product Story
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">{productStory}</p>
        </section>

        {/* [3] Product Identity Summary */}
        <section
          data-testid="public-passport-identity-summary"
          className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Product Identity
          </h2>
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Product Type</dt>
              <dd className="font-medium text-slate-900">{passport.product.nodeType}</dd>
            </div>
            {passport.product.manufacturerName && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Manufacturer</dt>
                <dd className="font-medium text-slate-900">{passport.product.manufacturerName}</dd>
              </div>
            )}
            {passport.product.manufacturerJurisdiction && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Country of Origin</dt>
                <dd className="font-medium text-slate-900">{passport.product.manufacturerJurisdiction}</dd>
              </div>
            )}
            {passport.product.batchId && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Batch Reference</dt>
                <dd className="font-medium text-slate-900">{passport.product.batchId}</dd>
              </div>
            )}
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Published</dt>
              <dd className="font-medium text-slate-900">
                {new Date(passport.exportedAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </section>

        {/* [4] Supply Chain Traceability Timeline */}
        <section
          data-testid="public-passport-traceability-timeline"
          className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Supply Chain Traceability
          </h2>
          <div className="flex items-start gap-8">
            <div className="text-center">
              <p
                data-testid="public-passport-lineage-depth"
                className="text-3xl font-bold text-slate-900"
              >
                {passport.lineageSummary.lineageDepth}
              </p>
              <p className="mt-1 text-xs text-slate-500">Supply chain tiers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">
                {passport.lineageSummary.nodeCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Nodes traced</p>
            </div>
          </div>
          {passport.lineageSummary.lineageDepth > 0 ? (
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
              {Array.from({ length: Math.min(passport.lineageSummary.lineageDepth, 6) }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2f8094] text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  {i < Math.min(passport.lineageSummary.lineageDepth, 6) - 1 && (
                    <div className="h-0.5 w-6 flex-shrink-0 bg-[#d6e4e8]" />
                  )}
                </React.Fragment>
              ))}
              {passport.lineageSummary.lineageDepth > 6 && (
                <span className="ml-1 text-xs text-slate-400">+{passport.lineageSummary.lineageDepth - 6} more</span>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No supply chain traceability recorded for this passport.</p>
          )}
        </section>

        {/* [5] Evidence Summary */}
        <section
          data-testid="public-passport-evidence-summary"
          className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Evidence Summary
          </h2>
          <dl className="flex gap-4 text-center">
            <div>
              <dt className="text-xs text-slate-500">Approved Certs</dt>
              <dd
                data-testid="public-passport-approved-cert-count"
                className="mt-1 text-2xl font-bold text-slate-900"
              >
                {passport.evidenceSummary.approvedCertCount}
              </dd>
            </div>
          </dl>
        </section>

        {/* [6] Certification Evidence Cards */}
        <section
          data-testid="public-passport-certification-cards"
          className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Certifications
          </h2>
          {passport.certifications.length === 0 ? (
            <div
              data-testid="public-passport-certification-empty"
              className="rounded-xl border border-dashed border-slate-200 p-6 text-center"
            >
              <p className="text-sm text-slate-400">No certifications recorded for this passport.</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {passport.certifications.map((cert, idx) => {
                const state = certVisualState(cert.lifecycleStateName);
                return (
                  <li
                    key={idx}
                    data-testid="public-passport-certification-card"
                    className={`rounded-xl border p-4 ${state.cardClass}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${state.dotClass}`} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {state.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{cert.certificationType}</p>
                    {cert.expiryDate && (
                      <p className="mt-1 text-xs text-slate-500">
                        Expires {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                    {cert.issuedAt && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Issued {new Date(cert.issuedAt).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* [7] QR Verification Label — TECS-DPP-PASSPORT-NETWORK-008 Slice F */}
        <section
          data-testid="public-passport-qr-label"
          className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            QR Verification Label
          </h2>
          <div
            data-testid="public-passport-print-label"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              <span data-testid="public-passport-buyer-label">
                {passport.labelConfig?.buyerFacingLabel ?? 'Verified Supply Chain Passport'}
              </span>
            </p>
            <div className={`mb-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${maturity.color}`}>
              {maturity.badge}
            </div>
            {buyerPageUrl && (
              <div
                data-testid="public-passport-qr-image"
                className="flex justify-center py-3"
              >
                <QRCode
                  value={buyerPageUrl}
                  size={160}
                  aria-label={`QR code for ${buyerPageUrl}`}
                />
              </div>
            )}
            <p className="mb-2 text-xs text-slate-500">
              Scan or open this link to verify the public passport.
            </p>
            <a
              data-testid="public-passport-qr-payload-url"
              href={buyerPageUrl}
              className="break-all text-sm font-mono text-[#2f8094] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {buyerPageUrl}
            </a>
          </div>
        </section>

        {/* Passport Reference (API-provided URL — preserved from Slice E) */}
        {/* Removed: passport.qr.payloadUrl secondary link was displaying the raw API path.
            The canonical buyer page URL is already shown in the QR Verification Label above. */}

        {/* Privacy note */}
        <p
          data-testid="public-passport-privacy-note"
          className="mt-8 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4 text-xs text-slate-500"
        >
          This public passport shows limited verified information only. Sensitive supplier,
          buyer, pricing, document, and internal workflow data are not public.
        </p>
      </main>
    </div>
  );
}
