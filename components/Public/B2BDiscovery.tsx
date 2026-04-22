import React, { useEffect, useState } from 'react';
import {
  getPublicB2BSuppliers,
  type PublicB2BSupplierEntry,
} from '../../services/publicB2BService';

interface B2BDiscoveryPageProps {
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

export function B2BDiscoveryPage({ onBack, onSignIn }: B2BDiscoveryPageProps) {
  const [items, setItems] = useState<PublicB2BSupplierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicB2BSuppliers()
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load supplier listings. Please try again.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f8fb] font-sans">
      {/* Nav */}
      <header className="border-b border-[#d6e4e8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <img
            src="/brand/texqtic-logo.png"
            alt="TexQtic"
            className="h-10 w-auto"
            loading="eager"
          />
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Page heading */}
      <div className="bg-[#071a2f] px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
            Verified suppliers
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            B2B Supplier Discovery
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Discover verified textile manufacturers, traders, and suppliers. Browse capabilities and
            sourcing profiles before starting a structured workflow.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d6e4e8] border-t-[#7fd5de]" />
              <p className="text-sm text-slate-500">Loading suppliers…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-16 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              No suppliers listed yet
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              Supplier listings are coming soon
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Verified suppliers will appear here once they publish their public profiles.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((supplier) => (
              <SupplierCard key={supplier.slug} supplier={supplier} />
            ))}
          </div>
        )}

        {/* Sign-in CTA */}
        {!loading && !error && (
          <div className="mt-14 rounded-[32px] border border-[#d9e5ea] bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(7,26,47,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
              Ready to connect?
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#0a2036]">
              Sign in to start a sourcing workflow
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Structured RFQs, verified supplier profiles, and full sourcing continuity require an
              authenticated session.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
            >
              Sign in to continue
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

interface SupplierCardProps {
  readonly supplier: PublicB2BSupplierEntry;
}

function SupplierCard({ supplier }: SupplierCardProps) {
  const taxonomy = supplier.taxonomy;
  const previewItems = supplier.offeringPreview.slice(0, 3);

  return (
    <article className="rounded-[28px] border border-[#d9e5ea] bg-white p-6 shadow-[0_8px_28px_rgba(7,26,47,0.07)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#2f8094]">
            {supplier.orgType}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-[#0a2036]">
            {supplier.legalName}
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-[#d6e4e8] bg-[#f0f8fb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f8094]">
          {supplier.jurisdiction}
        </span>
      </div>

      {/* Taxonomy */}
      {taxonomy && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-semibold text-[#0a2036]">{taxonomy.primarySegment}</p>
          {taxonomy.secondarySegments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {taxonomy.secondarySegments.map((seg) => (
                <span
                  key={seg}
                  className="rounded-full border border-[#d9e5ea] bg-[#f5fafb] px-2.5 py-0.5 text-[10px] font-medium text-[#2f8094]"
                >
                  {seg}
                </span>
              ))}
            </div>
          )}
          {taxonomy.rolePositions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {taxonomy.rolePositions.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-[#e2ebee] bg-white px-2.5 py-0.5 text-[10px] font-medium capitalize text-slate-500"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trust signals */}
      <div className="mt-4 flex flex-wrap gap-2">
        {supplier.certificationCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            {supplier.certificationCount} cert{supplier.certificationCount === 1 ? '' : 's'}
          </span>
        )}
        {supplier.hasTraceabilityEvidence && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d6e4e8] bg-[#eef7fa] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2f8094]">
            Traceability evidence
          </span>
        )}
      </div>

      {/* Offering preview */}
      {previewItems.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Offering preview
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {previewItems.map((item) => (
              <div
                key={item.name}
                className="shrink-0 w-28 rounded-[16px] border border-[#e0ebee] bg-[#f8fbfc] overflow-hidden"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-20 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="px-2 py-2">
                  <p className="truncate text-[10px] font-semibold text-[#0a2036]">{item.name}</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">MOQ {item.moq}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
