import React, { useMemo, useRef, useState } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';
import { APIError } from '../../services/apiClient';
import {
  submitPublicRegister,
  type PublicRegisterAttribution,
  type PublicRegisterPayload,
  type PublicRegisterResponse,
  type PublicRegisterRoleIntent,
} from '../../services/publicRegisterService';

interface PublicRegisterProps {
  readonly nav: PublicNavbarProps;
  readonly onSignIn: () => void;
  readonly onRequestAccess: () => void;
  readonly onBack: () => void;
  readonly initialRoleIntent?: PublicRegisterRoleIntent | null;
}

const ROLE_OPTIONS: ReadonlyArray<{
  value: PublicRegisterRoleIntent;
  label: string;
  description: string;
}> = [
  {
    value: 'supplier',
    label: 'Supplier',
    description: 'List your textile business, products, and capabilities for B2B discovery.',
  },
  {
    value: 'buyer',
    label: 'Buyer',
    description: 'Discover qualified suppliers, compare options, and prepare sourcing workflows.',
  },
  {
    value: 'service_provider',
    label: 'Service Provider',
    description: 'Offer labs, certification, logistics, fintech, and related ecosystem services.',
  },
];

const SAFE_SOURCE_RE = /^[A-Z0-9_]{1,30}$/;
const TOKEN_LIKE_QUERY_KEY_RE = /(token|secret|jwt|auth|session|password|apikey|api_key|key)/i;
const ALLOWED_QUERY_KEYS = new Set([
  'source',
  'sourceChannel',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'cid',
  'campaign',
  'ref',
  'referralCode',
  'context',
]);

const normalizeSourceChannel = (raw: string | null): string | undefined => {
  if (!raw) return undefined;

  const upper = raw.toUpperCase();
  if (SAFE_SOURCE_RE.test(upper)) return upper;

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
};

const toSafeUrlForAttribution = (rawUrl: string): string | undefined => {
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl, globalThis.window.location.origin);
    const safe = new URL(`${parsed.origin}${parsed.pathname}`);

    for (const [key, value] of parsed.searchParams.entries()) {
      if (!ALLOWED_QUERY_KEYS.has(key)) continue;
      if (TOKEN_LIKE_QUERY_KEY_RE.test(key)) continue;
      safe.searchParams.set(key, value);
    }

    return safe.toString().slice(0, 500) || undefined;
  } catch {
    return undefined;
  }
};

const captureAttribution = (): PublicRegisterAttribution => {
  if (globalThis.window === undefined) {
    return {};
  }

  const params = new URLSearchParams(globalThis.window.location.search);

  const referralRaw = params.get('ref') ?? params.get('referralCode') ?? '';
  const referralCode = /^[a-zA-Z0-9_-]{1,80}$/.test(referralRaw) ? referralRaw : undefined;

  return {
    sourceChannel: normalizeSourceChannel(params.get('source') ?? params.get('sourceChannel')),
    utmSource: (params.get('utm_source') ?? '').slice(0, 200) || undefined,
    utmMedium: (params.get('utm_medium') ?? '').slice(0, 200) || undefined,
    utmCampaign: (params.get('utm_campaign') ?? '').slice(0, 200) || undefined,
    campaignId: (params.get('cid') ?? params.get('campaign') ?? '').slice(0, 200) || undefined,
    referralCode,
    acquisitionContext: (params.get('context') ?? '').slice(0, 200) || undefined,
    landingPage: toSafeUrlForAttribution(globalThis.window.location.href),
    referrerUrl: toSafeUrlForAttribution(globalThis.document?.referrer ?? ''),
  };
};

const formatRoleIntentLabel = (intent: PublicRegisterRoleIntent) => {
  if (intent === 'service_provider') {
    return 'Service Provider';
  }

  return intent.charAt(0).toUpperCase() + intent.slice(1);
};

export function PublicRegister({
  nav,
  onSignIn,
  onRequestAccess,
  onBack,
  initialRoleIntent = null,
}: PublicRegisterProps) {
  const firstTouchTimestamp = useRef(new Date().toISOString());
  const attribution = useMemo(() => captureAttribution(), []);
  const [selectedRoleIntent, setSelectedRoleIntent] = useState<PublicRegisterRoleIntent | null>(
    initialRoleIntent,
  );
  const [stage, setStage] = useState<'ROLE_CHOOSER' | 'FORM' | 'SUCCESS'>('ROLE_CHOOSER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [country, setCountry] = useState('India');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PublicRegisterResponse | null>(null);

  const roleDescription = useMemo(() => {
    if (!selectedRoleIntent) return null;
    return ROLE_OPTIONS.find(option => option.value === selectedRoleIntent)?.description ?? null;
  }, [selectedRoleIntent]);

  const handleContinue = () => {
    if (!selectedRoleIntent) {
      return;
    }

    setSubmitError(null);
    setStage('FORM');
  };

  const buildPayload = (): PublicRegisterPayload | null => {
    if (!selectedRoleIntent) return null;
    if (!name.trim() || !email.trim() || !password.trim() || !companyName.trim()) return null;

    return {
      roleIntent: selectedRoleIntent,
      name: name.trim(),
      email: email.trim(),
      password,
      companyName: companyName.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(stateValue.trim() ? { state: stateValue.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      attribution: {
        ...attribution,
        firstTouchTimestamp: firstTouchTimestamp.current,
      },
    };
  };

  const classifyError = (error: unknown): string => {
    if (error instanceof APIError) {
      if (error.status === 409 && error.code === 'DUPLICATE_EMAIL') {
        return 'This email is already registered. Try signing in or recovering your account.';
      }
      if (error.status === 400) {
        return 'Please review your details and try again.';
      }
      if (error.status >= 500) {
        return 'Service is temporarily unavailable. Please try again shortly.';
      }
    }

    return 'Unable to complete registration right now. Please try again.';
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) {
      setSubmitError('Name, email, password, and company are required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitPublicRegister(payload);
      setResult(response);
      setStage('SUCCESS');
    } catch (error: unknown) {
      setSubmitError(classifyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f8fb] font-sans text-slate-900">
      <PublicNavbar {...nav} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-4xl rounded-3xl border border-[#d9e5ea] bg-white p-8 shadow-[0_20px_55px_rgba(7,26,47,0.07)] sm:p-10">
          {stage === 'ROLE_CHOOSER' && (
            <div className="space-y-8">
              <header className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094]">Direct Registration</p>
                <h1 className="text-3xl font-bold tracking-tight text-[#071a2f] sm:text-4xl">Join TexQtic</h1>
                <p className="max-w-2xl text-[15px] leading-7 text-slate-600">Choose how you want to join. This step captures your role intent and prepares account creation for the next implementation slice.</p>
              </header>

              <div className="grid gap-4 md:grid-cols-3">
                {ROLE_OPTIONS.map(option => {
                  const active = selectedRoleIntent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedRoleIntent(option.value)}
                      className={`rounded-2xl border px-5 py-5 text-left transition ${
                        active
                          ? 'border-[#2f8094] bg-[#eef8fa] shadow-[0_10px_24px_rgba(47,128,148,0.14)]'
                          : 'border-[#d9e5ea] bg-white hover:border-[#a6c8d1]'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Role Intent
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[#071a2f]">{option.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                    </button>
                  );
                })}
              </div>

              {!selectedRoleIntent && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Select a role to continue.
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedRoleIntent}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0f2a46] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-full border border-[#c9dbe1] bg-white px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:bg-[#f5fafb]"
                >
                  Back to Home
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Need help or enterprise onboarding support?{' '}
                <button
                  type="button"
                  onClick={onRequestAccess}
                  className="font-semibold text-[#0f5463] underline decoration-[#7ab0bc] decoration-2 underline-offset-4"
                >
                  Request Access
                </button>
              </p>
            </div>
          )}

          {stage === 'FORM' && selectedRoleIntent && (
            <div className="space-y-6">
              <header className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094]">Registration Intent Captured</p>
                <h2 className="text-3xl font-bold tracking-tight text-[#071a2f] sm:text-4xl">Create Your Account</h2>
                <p className="max-w-2xl text-[15px] leading-7 text-slate-600">
                  Submit your core details to create a provisional workspace. Transactional actions remain locked until verification is approved.
                </p>
              </header>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 rounded-2xl border border-[#d9e5ea] bg-[#f8fcfd] p-5 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Role Intent</div>
                    <div className="mt-2 text-lg font-semibold text-[#071a2f]">{formatRoleIntentLabel(selectedRoleIntent)}</div>
                    <div className="mt-1 text-xs text-slate-500">roleIntent: {selectedRoleIntent}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">First Touch Timestamp</div>
                    <div className="mt-2 font-mono text-sm text-slate-700">{firstTouchTimestamp.current}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Role Summary</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{roleDescription}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Name</span>
                    <input
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Company Name</span>
                    <input
                      value={companyName}
                      onChange={event => setCompanyName(event.target.value)}
                      placeholder="Business name"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                      minLength={8}
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Phone (optional)</span>
                    <input
                      value={phone}
                      onChange={event => setPhone(event.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>City (optional)</span>
                    <input
                      value={city}
                      onChange={event => setCity(event.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>State (optional)</span>
                    <input
                      value={stateValue}
                      onChange={event => setStateValue(event.target.value)}
                      placeholder="State"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Country (optional)</span>
                    <input
                      value={country}
                      onChange={event => setCountry(event.target.value)}
                      placeholder="Country"
                      className="w-full rounded-xl border border-[#cbdde3] px-3 py-2"
                    />
                  </label>
                </div>

                {submitError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                    {submitError}
                  </p>
                )}

                <div className="rounded-2xl border border-[#d9e5ea] bg-white p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Attribution Context (Sanitized)</div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div>sourceChannel: {attribution.sourceChannel ?? 'N/A'}</div>
                    <div>utmSource: {attribution.utmSource ?? 'N/A'}</div>
                    <div>utmMedium: {attribution.utmMedium ?? 'N/A'}</div>
                    <div>utmCampaign: {attribution.utmCampaign ?? 'N/A'}</div>
                    <div>campaignId: {attribution.campaignId ?? 'N/A'}</div>
                    <div>referralCode: {attribution.referralCode ?? 'N/A'}</div>
                    <div>acquisitionContext: {attribution.acquisitionContext ?? 'N/A'}</div>
                    <div>landingPage: {attribution.landingPage ?? 'N/A'}</div>
                    <div className="sm:col-span-2">referrerUrl: {attribution.referrerUrl ?? 'N/A'}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0f2a46] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting...' : 'Create Provisional Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage('ROLE_CHOOSER')}
                    className="inline-flex items-center justify-center rounded-full border border-[#c9dbe1] bg-white px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:bg-[#f5fafb]"
                  >
                    Change Role
                  </button>
                  <button
                    type="button"
                    onClick={onRequestAccess}
                    className="inline-flex items-center justify-center rounded-full border border-[#e0d7c5] bg-[#fffaf1] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-[#8c6b2f] transition hover:bg-[#fff4df]"
                  >
                    Need Help? Request Access
                  </button>
                </div>
              </form>
            </div>
          )}

          {stage === 'SUCCESS' && result && (
            <div className="space-y-6">
              <header className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094]">Provisional Account Created</p>
                <h2 className="text-3xl font-bold tracking-tight text-[#071a2f] sm:text-4xl">Registration Submitted</h2>
                <p className="max-w-2xl text-[15px] leading-7 text-slate-600">
                  Your provisional workspace was created. Next step is GST/KYC verification before transactional access is unlocked.
                </p>
              </header>

              <div className="rounded-2xl border border-[#d9e5ea] bg-[#f8fcfd] p-5 text-sm text-slate-700">
                <div>roleIntent: {result.roleIntent}</div>
                <div>tenantSlug: {result.tenantSlug}</div>
                <div>organizationStatus: {result.organizationStatus}</div>
                <div>membershipRole: {result.membershipRole}</div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0f2a46]"
                >
                  Continue to Sign In
                </button>
                <button
                  type="button"
                  onClick={onRequestAccess}
                  className="inline-flex items-center justify-center rounded-full border border-[#c9dbe1] bg-white px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:bg-[#f5fafb]"
                >
                  Request Access Support
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}