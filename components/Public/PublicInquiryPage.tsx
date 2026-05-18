/**
 * PublicInquiryPage — PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001
 *
 * Authority:  PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001
 * Route:      /inquiry  (optionally /inquiry?supplierSlug=<slug>)
 * AppState:   PUBLIC_INQUIRY
 *
 * PURPOSE
 * -------
 * Standalone public inquiry intent capture page. Phase 1: supplier-context
 * mode only. When no valid supplierSlug is present, a safe no-context landing
 * is shown instead.
 *
 * MODES
 * -----
 *   NO_CONTEXT   — supplierSlug absent or invalid → safe copy + "Find suppliers" CTA
 *   FORM         — supplierSlug valid → inquiry form (category required; geo/volume optional)
 *   SUCCESS      — post-submit → acknowledgment + auth handoff CTA
 *   ERROR        — submit error → categorised error message
 *
 * GOVERNANCE RULES
 * ----------------
 * - No PII collection (no email, phone, buyer name, org UUID).
 * - inquiry_category is required before submit is enabled.
 * - Slug validation: /^[a-z0-9-]+$/ — fail-closed to NO_CONTEXT on mismatch.
 * - geo_band and volume_band are free-text, max 100 chars.
 * - Rate-limit 429 → specific message; 404 → supplier unavailable message.
 * - SEO metadata is applied via applyPublicPageMeta in App.tsx, not here.
 * - No D2C, finance, or tenant-scoped imports.
 */

import React, { useState } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  submitPublicInquiry,
  type PublicInquiryCategory,
} from '../../services/publicB2BService';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageMode = 'NO_CONTEXT' | 'FORM' | 'SUCCESS' | 'ERROR';

export interface PublicInquiryPageProps {
  readonly supplierSlug: string;
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_SLUG_RE = /^[a-z0-9-]+$/;

const CATEGORY_OPTIONS: ReadonlyArray<{ value: PublicInquiryCategory; label: string }> = [
  { value: 'GENERAL', label: 'General enquiry' },
  { value: 'CAPABILITY_FIT', label: 'Capability fit — can they supply what I need?' },
  { value: 'OFFERING_PREVIEW', label: 'Offering preview — what do they make?' },
  { value: 'SOURCING_INTENT', label: 'Sourcing intent — I am actively looking to source' },
  { value: 'QUALIFICATION_CHECK', label: 'Qualification check — certifications and compliance' },
];

// ── Error classification ───────────────────────────────────────────────────────

function classifySubmitError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
      return 'Too many submissions. Please wait a moment and try again.';
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return 'This supplier is not currently available for inquiry.';
    }
  }
  return 'We could not record your inquiry right now. Please try again.';
}

// ── No-context landing ─────────────────────────────────────────────────────────

function NoContextLanding({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[#2f8094]">
        No supplier selected
      </p>
      <h1 className="mt-4 max-w-lg text-2xl font-semibold text-[#0a2036]">
        Looking for a specific supplier to enquire about?
      </h1>
      <p className="mt-3 max-w-md text-[15px] text-slate-600">
        Browse the TexQtic B2B supplier network to find the right partner, then express
        your interest directly from their profile.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
      >
        Find suppliers
      </button>
    </div>
  );
}

// ── Inquiry form ───────────────────────────────────────────────────────────────

interface InquiryFormProps {
  readonly supplierSlug: string;
  readonly onSuccess: () => void;
  readonly onError: (msg: string) => void;
}

function InquiryForm({ supplierSlug, onSuccess, onError }: InquiryFormProps) {
  const [category, setCategory] = useState<PublicInquiryCategory | ''>('');
  const [geoBand, setGeoBand] = useState('');
  const [volumeBand, setVolumeBand] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setSubmitting(true);
    try {
      await submitPublicInquiry({
        supplier_slug: supplierSlug,
        inquiry_category: category,
        ...(geoBand.trim() ? { geo_band: geoBand.trim().slice(0, 100) } : {}),
        ...(volumeBand.trim() ? { volume_band: volumeBand.trim().slice(0, 100) } : {}),
      });
      onSuccess();
    } catch (err) {
      onError(classifySubmitError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Submit an inquiry"
      className="w-full max-w-lg rounded-2xl border border-[#d6e4e8] bg-white p-8 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-[#0a2036]">Express your interest</h2>
      <p className="mt-2 text-[14px] text-slate-500">
        No account required. Your interest will be forwarded to the supplier for context.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="inquiry-category"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Inquiry type{' '}
            <span aria-hidden="true" className="text-rose-500">
              *
            </span>
          </label>
          <select
            id="inquiry-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as PublicInquiryCategory | '')}
            required
            className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 focus:border-[#2f8094] focus:outline-none"
          >
            <option value="">— Select inquiry type —</option>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="inquiry-geo"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Geography{' '}
            <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            id="inquiry-geo"
            type="text"
            value={geoBand}
            onChange={(e) => setGeoBand(e.target.value)}
            placeholder="e.g. South Asia, EU, Global"
            maxLength={100}
            className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="inquiry-volume"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Volume range{' '}
            <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            id="inquiry-volume"
            type="text"
            value={volumeBand}
            onChange={(e) => setVolumeBand(e.target.value)}
            placeholder="e.g. 500–1000 units, 5,000 metres"
            maxLength={100}
            className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!category || submitting}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send inquiry'}
        </button>
      </form>
    </section>
  );
}

// ── Success panel ──────────────────────────────────────────────────────────────

function SuccessPanel({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f7f0]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="#2f8094"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-[#0a2036]">
        Your interest has been recorded.
      </h2>
      <p className="mt-3 max-w-sm text-[15px] text-slate-600">
        Your inquiry has been received. Create an account to follow up, track responses, and
        connect with suppliers.
      </p>
      <button
        type="button"
        onClick={onSignIn}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
      >
        Create account to follow up
      </button>
    </div>
  );
}

// ── Error panel ────────────────────────────────────────────────────────────────

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-rose-500">
        Inquiry not submitted
      </p>
      <p className="mt-4 max-w-sm text-[15px] text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-8 inline-flex items-center justify-center rounded-full border border-[#d1dee3] px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036]"
      >
        Try again
      </button>
    </div>
  );
}

// ── PublicInquiryPage ──────────────────────────────────────────────────────────

export function PublicInquiryPage({
  supplierSlug,
  nav,
  onBack,
  onSignIn,
}: PublicInquiryPageProps) {
  const isValidSlug = VALID_SLUG_RE.test(supplierSlug);
  const [mode, setMode] = useState<PageMode>(isValidSlug ? 'FORM' : 'NO_CONTEXT');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSuccess = () => setMode('SUCCESS');
  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setMode('ERROR');
  };
  const handleRetry = () => setMode('FORM');

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f8fb] font-sans text-slate-900">
      <PublicNavbar {...nav} />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {mode === 'NO_CONTEXT' && <NoContextLanding onBack={onBack} />}
        {mode === 'FORM' && isValidSlug && (
          <InquiryForm
            supplierSlug={supplierSlug}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
        {mode === 'SUCCESS' && <SuccessPanel onSignIn={onSignIn} />}
        {mode === 'ERROR' && (
          <ErrorPanel message={errorMessage} onRetry={handleRetry} />
        )}
      </main>
      {/* Public boundary disclosure */}
      <footer className="px-6 py-8 text-center text-[11px] text-slate-400">
        This page is a public information surface. No payments or binding commitments are made here.
        <br />
        All interactions are subject to TexQtic&apos;s{' '}
        <a href="/trust" className="underline hover:text-slate-600">
          trust and verification framework
        </a>
        .
      </footer>
    </div>
  );
}
