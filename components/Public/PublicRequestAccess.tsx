/**
 * PublicRequestAccess — IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01
 *
 * Authority:  DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01
 * Route:      /request-access
 * AppState:   PUBLIC_REQUEST_ACCESS
 * API:        POST /api/public/tier0/request-access
 *
 * DESIGN RULES
 * ------------
 * - Fully public — no authentication required.
 * - No account created, no access granted on submit.
 * - roleIntent enum values: 'supplier' | 'buyer' | 'service_provider' | 'unknown'
 *   — taken from server Zod schema (routes/public.ts line 1604).
 * - firstTouchTimestamp: captured ONCE at mount via useRef; never recaptured.
 * - URL params captured at mount: utm_source, utm_medium, utm_campaign, utm_term,
 *   utm_content, source (→ sourceChannel), ref (→ referralCode), context, cid.
 * - Forbidden fields NEVER sent: inviteToken, mainAppSessionToken, sessionToken,
 *   authToken, accessToken, refreshToken, idToken, privateInviteUrl, inviteUrl,
 *   token, tokenHash, mainAppTier0RequestId.
 * - h_trap honeypot hidden from users; non-empty → server silently discards.
 * - Notes: max 200 chars; PII checked server-side.
 * - Copy must NOT imply account activation, GSTIN, membership, or transactional access.
 */

import React, { useState, useRef } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import {
  submitTier0RequestAccess,
  type Tier0RoleIntent,
} from '../../services/tier0Service';
import { APIError } from '../../services/apiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageMode = 'FORM' | 'SUCCESS' | 'ERROR';

export interface PublicRequestAccessProps {
  readonly nav: PublicNavbarProps;
  readonly onBack: () => void;
  readonly onSignIn: () => void;
  readonly referralCode?: string; // from App.tsx query param or referral landing
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Exact values from server Zod schema: z.enum(['supplier','buyer','service_provider','unknown'])
const ROLE_OPTIONS: ReadonlyArray<{
  value: Tier0RoleIntent;
  label: string;
  description: string;
}> = [
  { value: 'supplier', label: 'Supplier', description: 'Manufacturer, mill, processor, exporter' },
  { value: 'buyer', label: 'Buyer', description: 'Brand, retailer, sourcing agent, importer' },
  { value: 'service_provider', label: 'Service Provider', description: 'Testing lab, certification body, logistics, fintech' },
  { value: 'unknown', label: 'Other / Not sure', description: 'Tell us more in the notes' },
];

const ROLE_CTA: Record<Tier0RoleIntent, string> = {
  supplier: 'Request Supplier Access',
  buyer: 'Request Buyer Access',
  service_provider: 'Request Service Provider Access',
  unknown: 'Request Access',
};

const ROLE_HEADLINE: Record<Tier0RoleIntent | '', string> = {
  supplier: 'List your business on TexQtic',
  buyer: 'Find verified textile partners',
  service_provider: 'Join as a service provider',
  unknown: 'Join the TexQtic ecosystem',
  '': 'Request access to TexQtic',
};

// Normalize a raw ?source= URL param into the sourceChannel field.
// Unknown/unrecognized values are forwarded as-is; the server normalizes to UNKNOWN.
const SAFE_SOURCE_RE = /^[A-Z0-9_]{1,30}$/;
function resolveSourceChannel(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (SAFE_SOURCE_RE.test(upper)) return upper;
  // Alias normalization (mirrors server TIER0_SOURCE_ALIAS_MAP)
  const aliases: Record<string, string> = {
    web: 'WEB',
    organic: 'WEB',
    direct: 'DIRECT_INVITE',
    invite: 'DIRECT_INVITE',
    referral: 'REFERRAL',
    qr: 'REFERRAL',
    campaign: 'CRM_CAMPAIGN',
  };
  return aliases[raw.toLowerCase()] ?? undefined;
}

// Capture safe URL params at mount — no secrets, no tokens.
function captureUrlParams(): {
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  campaignId?: string;
  acquisitionContext?: string;
  referralCodeFromUrl?: string;
  landingPage?: string;
  referrerUrl?: string;
} {
  if (globalThis.window === undefined) return {};
  const p = new URLSearchParams(globalThis.window.location.search);

  // Forbidden params are explicitly excluded — never forwarded.
  const referralCodeRaw = p.get('ref') ?? p.get('referralCode') ?? '';
  const referralCodeFromUrl = /^[a-zA-Z0-9_-]{1,80}$/.test(referralCodeRaw)
    ? referralCodeRaw
    : undefined;

  return {
    sourceChannel: resolveSourceChannel(p.get('source') ?? p.get('sourceChannel')),
    utmSource: (p.get('utm_source') ?? '').slice(0, 200) || undefined,
    utmMedium: (p.get('utm_medium') ?? '').slice(0, 200) || undefined,
    utmCampaign: (p.get('utm_campaign') ?? '').slice(0, 200) || undefined,
    campaignId: (p.get('cid') ?? p.get('campaign') ?? '').slice(0, 200) || undefined,
    acquisitionContext: (p.get('context') ?? '').slice(0, 200) || undefined,
    referralCodeFromUrl,
    landingPage: globalThis.window.location.href.slice(0, 500) || undefined,
    referrerUrl: (globalThis.document?.referrer ?? '').slice(0, 500) || undefined,
  };
}

// ── Error classification ───────────────────────────────────────────────────────

function classifySubmitError(err: unknown): string {
  if (err instanceof APIError) {
    if (err.status === 409) {
      return 'It looks like a request may already exist for this contact. Our team will follow up if applicable.';
    }
    if (err.status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (err.status === 400) {
      const code = err.code;
      if (code === 'VALIDATION_ERROR') {
        return 'Please check your details — something looks incorrect.';
      }
      if (code === 'INVALID_PAYLOAD') {
        return 'Your submission could not be processed. Please try again.';
      }
    }
    if (err.status === 503) {
      return "We're having trouble connecting right now. Please try again in a moment.";
    }
    if (err.status === 500) {
      return 'Something went wrong. Please try again or contact support.';
    }
  }
  return "We couldn't record your request right now. Please try again.";
}

// ── Success panel ─────────────────────────────────────────────────────────────

interface SuccessPanelProps {
  readonly requestId: string | undefined;
  readonly onSignIn: () => void;
}

function SuccessPanel({ requestId, onSignIn }: SuccessPanelProps) {
  const shortRef = requestId ? requestId.slice(0, 8) : null;
  return (
    <section
      aria-label="Request received"
      className="w-full max-w-lg rounded-2xl border border-[#c6e0e5] bg-white p-10 shadow-sm text-center"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef8fa] text-[#2f8094] text-2xl" aria-hidden="true">
        ✓
      </div>
      <h2 className="text-xl font-semibold text-[#0a2036]">You&apos;re on the list</h2>
      <p className="mt-3 text-[15px] text-slate-600 leading-relaxed">
        We&apos;ve received your request. Our team will review your details and be in touch shortly.
      </p>
      <p className="mt-2 text-[13px] text-slate-500">
        No account has been created. Submitting this request does not grant platform access.
      </p>
      {shortRef && (
        <p className="mt-4 text-[12px] text-slate-400">
          Reference: <span className="font-mono text-slate-600">{shortRef}</span>
        </p>
      )}
      <button
        type="button"
        onClick={onSignIn}
        className="mt-8 inline-flex items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.2em] text-[#0a2036] transition hover:bg-[#f3f8fb]"
      >
        Already have access? Sign in
      </button>
    </section>
  );
}

// ── Error panel ───────────────────────────────────────────────────────────────

interface ErrorPanelProps {
  readonly message: string;
  readonly onRetry: () => void;
}

function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <section
      aria-label="Submission error"
      role="alert"
      className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-10 shadow-sm text-center"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600" aria-hidden="true">
        !
      </div>
      <h2 className="text-xl font-semibold text-[#0a2036]">Something went wrong</h2>
      <p className="mt-3 text-[14px] text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-7 inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
      >
        Try again
      </button>
    </section>
  );
}

// ── Request form ──────────────────────────────────────────────────────────────

interface RequestFormProps {
  readonly firstTouchTimestamp: string;
  readonly referralCode: string;
  readonly urlParams: ReturnType<typeof captureUrlParams>;
  readonly onSuccess: (requestId: string | undefined) => void;
  readonly onError: (msg: string) => void;
}

function RequestForm({ firstTouchTimestamp, referralCode, urlParams, onSuccess, onError }: RequestFormProps) {
  const [roleIntent, setRoleIntent] = useState<Tier0RoleIntent | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Field-level validation errors
  const [nameError, setNameError] = useState('');
  const [contactError, setContactError] = useState('');
  const [roleError, setRoleError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    if (!roleIntent) {
      setRoleError('Please select your role.');
      valid = false;
    } else {
      setRoleError('');
    }
    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    } else {
      setNameError('');
    }
    if (!email.trim() && !phone.trim()) {
      setContactError('Please provide at least one: email or phone number.');
      valid = false;
    } else {
      setContactError('');
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!roleIntent) return;

    setSubmitting(true);
    try {
      const payload = {
        roleIntent,
        name: name.trim(),
        firstTouchTimestamp,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(state.trim() ? { state: state.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim().slice(0, 200) } : {}),
        // Derived from URL params (not user-entered)
        ...(urlParams.sourceChannel ? { sourceChannel: urlParams.sourceChannel } : {}),
        ...(urlParams.utmSource ? { utmSource: urlParams.utmSource } : {}),
        ...(urlParams.utmMedium ? { utmMedium: urlParams.utmMedium } : {}),
        ...(urlParams.utmCampaign ? { utmCampaign: urlParams.utmCampaign } : {}),
        ...(urlParams.campaignId ? { campaignId: urlParams.campaignId } : {}),
        ...(urlParams.acquisitionContext ? { acquisitionContext: urlParams.acquisitionContext } : {}),
        ...(urlParams.landingPage ? { landingPage: urlParams.landingPage } : {}),
        ...(urlParams.referrerUrl ? { referrerUrl: urlParams.referrerUrl } : {}),
        // Referral code: prop takes precedence over URL param
        ...(referralCode || urlParams.referralCodeFromUrl
          ? { referralCode: (referralCode || urlParams.referralCodeFromUrl)!.slice(0, 80) }
          : {}),
        // Honeypot — always empty for real users
        h_trap: '',
      };

      const result = await submitTier0RequestAccess(payload);
      onSuccess(result.requestId);
    } catch (err) {
      onError(classifySubmitError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRole = roleIntent as Tier0RoleIntent | '';
  const submitLabel = selectedRole ? ROLE_CTA[selectedRole] : 'Request Access';
  const headline = ROLE_HEADLINE[selectedRole];

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#0a2036] sm:text-3xl">{headline}</h1>
        <p className="mt-3 text-[15px] text-slate-600">
          TexQtic is opening early access for suppliers, buyers, brands, manufacturers,
          service providers, and textile ecosystem partners.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-[#d6e4e8] bg-white p-8 shadow-sm"
        aria-label="Request access form"
      >
        {/* ── Role intent ──────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            I am a…{' '}
            <span aria-hidden="true" className="text-rose-500">*</span>
          </legend>
          {roleError && (
            <p id="role-error" role="alert" className="mt-1 text-[12px] text-rose-600">
              {roleError}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-describedby={roleError ? 'role-error' : undefined}>
            {ROLE_OPTIONS.map(({ value, label, description }) => (
              <label
                key={value}
                className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition
                  ${roleIntent === value
                    ? 'border-[#2f8094] bg-[#eef8fa] ring-1 ring-[#2f8094]'
                    : 'border-[#d6e4e8] bg-[#f8fbfc] hover:border-[#a8cdd5]'
                  }`}
              >
                <input
                  type="radio"
                  name="roleIntent"
                  value={value}
                  checked={roleIntent === value}
                  onChange={() => { setRoleIntent(value); setRoleError(''); }}
                  className="sr-only"
                  aria-describedby={`role-${value}-desc`}
                />
                <span className="text-[14px] font-semibold text-[#0a2036]">{label}</span>
                <span id={`role-${value}-desc`} className="mt-1 text-[12px] text-slate-500">{description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Name ────────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-col gap-1.5">
          <label
            htmlFor="tier0-name"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Name{' '}
            <span aria-hidden="true" className="text-rose-500">*</span>
          </label>
          <input
            id="tier0-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
            placeholder="Your name or business contact name"
            maxLength={200}
            aria-required="true"
            aria-describedby={nameError ? 'name-error' : undefined}
            aria-invalid={Boolean(nameError)}
            className={`rounded-xl border px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none
              ${nameError ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-[#d6e4e8] bg-[#f8fbfc] focus:border-[#2f8094]'}`}
          />
          {nameError && (
            <p id="name-error" role="alert" className="text-[12px] text-rose-600">
              {nameError}
            </p>
          )}
        </div>

        {/* ── Email ────────────────────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-1.5">
          <label
            htmlFor="tier0-email"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Email{' '}
            <span className="font-normal normal-case text-slate-400">(required if no phone)</span>
          </label>
          <input
            id="tier0-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (e.target.value.trim() || phone.trim()) setContactError(''); }}
            placeholder="you@example.com"
            maxLength={254}
            aria-describedby={contactError ? 'contact-error' : undefined}
            aria-invalid={Boolean(contactError && !email.trim())}
            className={`rounded-xl border px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none
              ${contactError && !email.trim() ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-[#d6e4e8] bg-[#f8fbfc] focus:border-[#2f8094]'}`}
          />
        </div>

        {/* ── Phone ────────────────────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-1.5">
          <label
            htmlFor="tier0-phone"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Phone number{' '}
            <span className="font-normal normal-case text-slate-400">(required if no email)</span>
          </label>
          <input
            id="tier0-phone"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (e.target.value.trim() || email.trim()) setContactError(''); }}
            placeholder="+91 98765 43210"
            maxLength={20}
            aria-describedby={contactError ? 'contact-error' : undefined}
            aria-invalid={Boolean(contactError && !phone.trim())}
            className={`rounded-xl border px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none
              ${contactError && !phone.trim() ? 'border-rose-400 bg-rose-50 focus:border-rose-500' : 'border-[#d6e4e8] bg-[#f8fbfc] focus:border-[#2f8094]'}`}
          />
          {contactError && (
            <p id="contact-error" role="alert" className="text-[12px] text-rose-600">
              {contactError}
            </p>
          )}
        </div>

        {/* ── Company ──────────────────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-1.5">
          <label
            htmlFor="tier0-company"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Company or business name{' '}
            <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            id="tier0-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Textiles Pvt. Ltd."
            maxLength={200}
            className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
          />
        </div>

        {/* ── City + State ─────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tier0-city"
              className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
            >
              City{' '}
              <span className="font-normal normal-case text-slate-400">(opt.)</span>
            </label>
            <input
              id="tier0-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Surat"
              maxLength={100}
              className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tier0-state"
              className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
            >
              State{' '}
              <span className="font-normal normal-case text-slate-400">(opt.)</span>
            </label>
            <input
              id="tier0-state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Gujarat"
              maxLength={100}
              className="rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
            />
          </div>
        </div>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-1.5">
          <label
            htmlFor="tier0-notes"
            className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600"
          >
            Anything you&apos;d like us to know?{' '}
            <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <textarea
            id="tier0-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Brief context about your business or interest."
            maxLength={200}
            rows={3}
            aria-describedby="notes-hint"
            className="resize-none rounded-xl border border-[#d6e4e8] bg-[#f8fbfc] px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-[#2f8094] focus:outline-none"
          />
          <p id="notes-hint" className="text-[11px] text-slate-400">
            Max 200 characters. Do not include contact details here.
          </p>
        </div>

        {/* ── Honeypot (hidden from users, traps bots) ─────────────────── */}
        {/* aria-hidden + tabIndex=-1 + visually removed; real users never fill this */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
          <label htmlFor="tier0-h-trap">Leave this field empty</label>
          <input
            id="tier0-h-trap"
            name="h_trap"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            readOnly
            defaultValue=""
          />
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-8 w-full inline-flex items-center justify-center rounded-full bg-[#071a2f] px-6 py-4 text-[13px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Sending…' : submitLabel}
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Submitting this form does not create an account or grant platform access.
        </p>
      </form>
    </div>
  );
}

// ── PublicRequestAccess ────────────────────────────────────────────────────────

export function PublicRequestAccess({
  nav,
  onBack: _onBack,
  onSignIn,
  referralCode = '',
}: PublicRequestAccessProps) {
  // firstTouchTimestamp: captured ONCE at mount; immutable after that.
  const firstTouchTimestamp = useRef(new Date().toISOString());

  // URL params captured once at mount; stable across re-renders.
  const urlParams = useRef(captureUrlParams());

  const [mode, setMode] = useState<PageMode>('FORM');
  const [errorMessage, setErrorMessage] = useState('');
  const [successRequestId, setSuccessRequestId] = useState<string | undefined>(undefined);

  const handleSuccess = (requestId: string | undefined) => {
    setSuccessRequestId(requestId);
    setMode('SUCCESS');
  };
  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setMode('ERROR');
  };
  const handleRetry = () => setMode('FORM');

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f8fb] font-sans text-slate-900">
      <PublicNavbar {...nav} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {mode === 'FORM' && (
          <RequestForm
            firstTouchTimestamp={firstTouchTimestamp.current}
            referralCode={referralCode}
            urlParams={urlParams.current}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}
        {mode === 'SUCCESS' && (
          <SuccessPanel requestId={successRequestId} onSignIn={onSignIn} />
        )}
        {mode === 'ERROR' && (
          <ErrorPanel message={errorMessage} onRetry={handleRetry} />
        )}
      </main>
    </div>
  );
}
