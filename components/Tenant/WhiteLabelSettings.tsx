import React, { useState } from 'react';
import { TenantConfig } from '../../types';
import { updateBranding } from '../../services/tenantService';
import { APIError } from '../../services/apiClient';

export const WhiteLabelSettings: React.FC<{
  tenant: TenantConfig;
  /** TECS-FBW-008: optional callback to navigate to the real Domains panel.
   * When provided (WL_ADMIN BRANDING context), a "Manage Custom Domains" button is shown.
   * When absent (EXPERIENCE SETTINGS context), a static informational note is shown.
   * In both cases the dead non-wired Connect input is removed. */
  onNavigateDomains?: () => void;
  /** Optional entry from reachable shared-core settings into the existing WL admin overlay. */
  onEnterOverlay?: () => void;
}> = ({ tenant, onNavigateDomains, onEnterOverlay }) => {
  const [primaryColor, setPrimaryColor] = useState(tenant.theme.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(tenant.theme.secondaryColor);
  const [logoUrl, setLogoUrl] = useState(
    typeof tenant.theme.logo === 'string' && tenant.theme.logo.startsWith('http')
      ? tenant.theme.logo
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateBranding({
        logoUrl: logoUrl || null,
        themeJson: { primaryColor, secondaryColor },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to save settings. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold">Storefront Configuration</h1>
        <p className="text-slate-500 text-sm">
          Manage brand, domain, and theme controls for this tenant storefront from the white-label admin overlay.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900">Custom Domain</h3>
            {onNavigateDomains ? (
              /* WL_ADMIN BRANDING context: route to the real Domains panel */
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Add and verify custom domains for your storefront. Manage DNS records and
                  domain verification in this overlay's Domains view.
                </p>
                <button
                  onClick={onNavigateDomains}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition"
                >
                  Manage Custom Domains →
                </button>
              </div>
            ) : onEnterOverlay ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Continue into the White-Label Admin Overlay to manage custom domains and related
                  storefront controls.
                </p>
                <button
                  type="button"
                  onClick={onEnterOverlay}
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition"
                >
                  Open White-Label Admin Overlay →
                </button>
              </div>
            ) : (
              /* EXPERIENCE SETTINGS context: informational only; no dead CTA */
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-500">
                  Custom domain management is available in the{' '}
                  <span className="font-semibold text-slate-700">White-Label Admin Overlay</span>{' '}
                  under Domains. Contact your account owner if you need overlay access.
                </p>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-900">Visual Identity</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label htmlFor="primaryColor" className="text-[10px] font-bold uppercase text-slate-400">
                  Primary Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm font-mono text-slate-600 uppercase">
                    {primaryColor}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="secondaryColor" className="text-[10px] font-bold uppercase text-slate-400">
                  Secondary Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm font-mono text-slate-600 uppercase">
                    {secondaryColor}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="logoUrl" className="text-[10px] font-bold uppercase text-slate-400">Logo URL</label>
              <input
                id="logoUrl"
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="https://cdn.yourbrand.com/logo.png"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
            <h4 className="font-bold text-sm">Theme Preview</h4>
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div
                className="h-4 w-24 rounded"
                style={{ backgroundColor: primaryColor }}
              ></div>
              <div className="h-2 w-full bg-slate-100 rounded"></div>
              <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
              <div
                className="h-8 w-full rounded"
                style={{ backgroundColor: secondaryColor }}
              ></div>
            </div>
            <p className="text-[10px] opacity-70 italic text-center">
              Changes reflect instantly via CSS variable injection.
            </p>
          </div>

          {saveError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
              ✓ Settings saved successfully.
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
