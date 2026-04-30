import React, { useEffect, useState } from 'react';

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
    aiExtractedClaimsCount: number;
  };
  qr: {
    payloadUrl: string;
    format: 'url';
  };
  exportedAt: string;
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

  return (
    <div
      data-testid="public-passport-page"
      className="min-h-screen bg-[#f3f8fb] font-sans text-slate-900"
    >
      {/* Header */}
      <header className="border-b border-[#d6e4e8] bg-white px-6 py-4">
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

        {/* Evidence summary */}
        <section
          data-testid="public-passport-evidence-summary"
          className="mt-8 rounded-2xl border border-[#d6e4e8] bg-white p-6"
        >
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Evidence Summary
          </h2>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div>
              <dt className="text-xs text-slate-500">Approved Certs</dt>
              <dd
                data-testid="public-passport-approved-cert-count"
                className="mt-1 text-2xl font-bold text-slate-900"
              >
                {passport.evidenceSummary.approvedCertCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Lineage Depth</dt>
              <dd
                data-testid="public-passport-lineage-depth"
                className="mt-1 text-2xl font-bold text-slate-900"
              >
                {passport.lineageSummary.lineageDepth}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">AI Claims</dt>
              <dd
                data-testid="public-passport-ai-claims-count"
                className="mt-1 text-2xl font-bold text-slate-900"
              >
                {passport.evidenceSummary.aiExtractedClaimsCount}
              </dd>
            </div>
          </dl>
        </section>

        {/* Certifications */}
        {passport.certifications.length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Certifications
            </h2>
            <ul className="divide-y divide-slate-100">
              {passport.certifications.map((cert, idx) => (
                <li key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {cert.certificationType}
                    </p>
                    <p className="text-xs text-slate-500">{cert.lifecycleStateName}</p>
                  </div>
                  {cert.expiryDate && (
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      Expires {new Date(cert.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* QR / Payload URL */}
        {passport.qr.payloadUrl && (
          <section className="mt-6 rounded-2xl border border-[#d6e4e8] bg-white p-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Passport Reference
            </h2>
            <a
              data-testid="public-passport-qr-url"
              href={passport.qr.payloadUrl}
              className="break-all text-sm text-[#2f8094] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {passport.qr.payloadUrl}
            </a>
          </section>
        )}

        {/* Privacy note */}
        <p
          data-testid="public-passport-privacy-note"
          className="mt-8 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4 text-xs text-slate-500"
        >
          This public passport shows limited verified information only. Sensitive supplier,
          buyer, pricing, and internal workflow data are not public.
        </p>
      </main>
    </div>
  );
}
