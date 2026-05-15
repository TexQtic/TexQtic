import React, { useEffect, useState } from 'react';
import {
  getPublicSupplierBySlug,
  type PublicB2BSupplierProfile as SupplierProfile,
} from '../../services/publicB2BService';

// ROUTE-001 / GAP-ACQ-001
// Public supplier profile page — unauthenticated, read-only.
// PROHIBITED: contact reveal, phone/email, buyer inquiry form, QR code UI, order actions.

interface PublicSupplierProfileProps {
  readonly slug: string;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

export function PublicSupplierProfile({ slug, onBack, onSignIn }: PublicSupplierProfileProps) {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublicSupplierBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status?: number }).status
              : undefined;
          setNotFound(status === 404);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

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

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#2f8094]" />
        </div>
      )}

      {/* Not found state */}
      {!loading && notFound && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#2f8094]">
            Supplier not found
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#071a2f]">
            This supplier profile is not available.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-slate-500">
            The supplier may not be publicly listed, or the link may be incorrect.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Back to platform entry
          </button>
        </div>
      )}

      {/* Error state (loaded but no profile and not 404) */}
      {!loading && !notFound && !profile && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Unable to load profile
          </p>
          <h2 className="mt-3 text-xl font-semibold text-[#071a2f]">
            Please try again shortly.
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
          >
            Back
          </button>
        </div>
      )}

      {/* Profile content */}
      {!loading && profile && (
        <>
          {/* Hero */}
          <div className="bg-[#071a2f] px-6 py-12">
            <div className="mx-auto max-w-5xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
                Verified supplier
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-4xl">
                {profile.legalName}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {profile.orgType}
                </span>
                {profile.jurisdiction && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                    {profile.jurisdiction}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
                  {profile.eligibilityPosture === 'PUBLICATION_ELIGIBLE' ? 'Verified' : profile.eligibilityPosture}
                </span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <main className="mx-auto max-w-5xl px-6 py-10">
            <div className="grid gap-6 md:grid-cols-2">

              {/* Taxonomy */}
              {profile.taxonomy && (
                <section className="rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                    Segment &amp; Role
                  </h2>
                  {profile.taxonomy.primarySegment && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Primary segment
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#071a2f]">
                        {profile.taxonomy.primarySegment}
                      </p>
                    </div>
                  )}
                  {profile.taxonomy.secondarySegments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Secondary segments
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.taxonomy.secondarySegments.map((seg) => (
                          <span
                            key={seg}
                            className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs text-slate-600"
                          >
                            {seg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.taxonomy.rolePositions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Role positions
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.taxonomy.rolePositions.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs text-slate-600"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Certifications + traceability */}
              <section className="rounded-2xl border border-[#d6e4e8] bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  Credentials
                </h2>
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Certifications
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#071a2f]">
                    {profile.certificationCount === 0
                      ? 'None on record'
                      : `${profile.certificationCount} verified`}
                  </p>
                  {profile.certificationTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.certificationTypes.map((ct) => (
                        <span
                          key={ct}
                          className="rounded-full border border-[#d6e4e8] px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {ct}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Traceability evidence
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#071a2f]">
                    {profile.hasTraceabilityEvidence ? 'Available' : 'Not published'}
                  </p>
                </div>
              </section>
            </div>

            {/* Offering preview */}
            {profile.offeringPreview.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#2f8094]">
                  Offering preview
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {profile.offeringPreview.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-2xl border border-[#d6e4e8] bg-white p-4 shadow-sm"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="mb-3 h-36 w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      )}
                      <p className="text-sm font-semibold text-[#071a2f]">{item.name}</p>
                      {item.moq != null && item.moq > 0 && (
                        <p className="mt-1 text-xs text-slate-500">MOQ: {item.moq}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sign-in CTA */}
            <div className="mt-10 rounded-2xl border border-[#d6e4e8] bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#071a2f]">
                Sign in to send a structured inquiry or access full supplier details.
              </p>
              <button
                type="button"
                onClick={onSignIn}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
              >
                Sign in to TexQtic
              </button>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
