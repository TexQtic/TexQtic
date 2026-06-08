import React, { useMemo, useRef, useState } from 'react';
import { PublicNavbar, type PublicNavbarProps } from './PublicNavbar';

export type PublicRegisterRoleIntent = 'supplier' | 'buyer' | 'service_provider';

interface PublicRegisterAttribution {
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  campaignId?: string;
  referralCode?: string;
  acquisitionContext?: string;
  landingPage?: string;
  referrerUrl?: string;
}

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
    landingPage: globalThis.window.location.href.slice(0, 500) || undefined,
    referrerUrl: (globalThis.document?.referrer ?? '').slice(0, 500) || undefined,
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
  const [stage, setStage] = useState<'ROLE_CHOOSER' | 'NEXT_STEP'>('ROLE_CHOOSER');

  const roleDescription = useMemo(() => {
    if (!selectedRoleIntent) return null;
    return ROLE_OPTIONS.find(option => option.value === selectedRoleIntent)?.description ?? null;
  }, [selectedRoleIntent]);

  const handleContinue = () => {
    if (!selectedRoleIntent) {
      return;
    }

    setStage('NEXT_STEP');
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

          {stage === 'NEXT_STEP' && selectedRoleIntent && (
            <div className="space-y-6">
              <header className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094]">Registration Intent Captured</p>
                <h2 className="text-3xl font-bold tracking-tight text-[#071a2f] sm:text-4xl">Next Step Preparing</h2>
                <p className="max-w-2xl text-[15px] leading-7 text-slate-600">
                  Account creation and provisional workspace setup will be completed by the upcoming backend slice.
                </p>
              </header>

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

              <div className="rounded-2xl border border-[#d9e5ea] bg-white p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Attribution Context (Staged)</div>
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
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-7 py-3 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0f2a46]"
                >
                  Continue to Sign In
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}