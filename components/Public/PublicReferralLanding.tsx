import React from 'react';

// REFERRAL-005 / MAIN-PLATFORM-REFERRAL-JOIN-LANDING-005
// Public referral join landing — unauthenticated, read-only.
// Rendered at /join/:referral_code via PUBLIC_REFERRAL_LANDING app state.
//
// PROHIBITED:
//   - network calls of any kind
//   - form submission or data capture
//   - contact field rendering (email, phone, inquiry)
//   - CRM / CAE calls
//   - backend referral validation
//   - dangerouslySetInnerHTML
//   - logging or forwarding the referral code to any service

const VALID_CODE_RE = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_DISPLAY_LENGTH = 24;

function safeTruncateCode(code: string): string {
  if (code.length <= MAX_DISPLAY_LENGTH) return code;
  return code.slice(0, MAX_DISPLAY_LENGTH) + '\u2026';
}

export interface PublicReferralLandingProps {
  readonly referralCode: string;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

export function PublicReferralLanding({
  referralCode,
  onBack,
  onSignIn,
}: PublicReferralLandingProps) {
  const isValid = VALID_CODE_RE.test(referralCode);

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

      {/* Invalid / unrecognized referral code state */}
      {!isValid && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#2f8094]">
            Referral link not recognised
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#071a2f]">
            This referral link is not valid.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-slate-500">
            The referral link may be incorrect or expired. Contact the person who shared it
            with you.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Explore TexQtic
          </button>
        </div>
      )}

      {/* Valid referral code — invitation landing */}
      {isValid && (
        <>
          {/* Hero */}
          <div className="bg-[#071a2f] px-6 py-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#7fd5de]">
                You have been invited
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-4xl">
                Join the TexQtic supplier network
              </h1>
              <p className="mt-4 mx-auto max-w-xl text-base text-slate-300">
                TexQtic is a B2B platform connecting verified suppliers with global buyers.
                Create your account to explore opportunities and manage your supplier profile.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7fd5de]">
                  Referral:
                </span>
                <span className="font-mono text-sm font-semibold text-white">
                  {safeTruncateCode(referralCode)}
                </span>
              </div>
            </div>
          </div>

          {/* CTA section */}
          <main className="mx-auto max-w-3xl px-6 py-12 text-center">
            <div className="rounded-2xl border border-[#d6e4e8] bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#071a2f]">
                Get started on TexQtic
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                Sign in or create an account to begin your supplier onboarding journey.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-[#2f8094] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#256d7e]"
                >
                  Sign in / Create account
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-full border border-[#d6e4e8] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
                >
                  Explore TexQtic
                </button>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
