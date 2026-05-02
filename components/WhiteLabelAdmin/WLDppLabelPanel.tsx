/**
 * WLDppLabelPanel — WL_ADMIN DPP Passport Label Config panel (TECS-DPP-PASSPORT-NETWORK-020)
 *
 * Shell constraint: WL_ADMIN only. Must never be imported by the EXPERIENCE
 * shell or any non-WL_ADMIN surface.
 *
 * Scope (Option C — naming only):
 *   - Read:   GET  /api/tenant/dpp/passport-label-config
 *   - Write:  PUT  /api/tenant/dpp/passport-label-config
 *
 * This panel configures the buyer-facing label displayed on public DPP
 * passport pages. It changes display text only — no branding, no data changes.
 *
 * Governance: TECS-DPP-PASSPORT-NETWORK-020
 */

import { useState, useEffect, useCallback } from 'react';
import { tenantGet, tenantPut } from '../../services/tenantApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabelConfig {
  publicTitle: string | null;
  buyerFacingLabel: string;
  subtitle: string | null;
  showTexqticBrand: boolean;
}

interface LabelConfigResponse {
  labelConfig: LabelConfig;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  kind: 'success' | 'error';
  onDismiss: () => void;
}

function Toast({ message, kind, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg text-sm font-medium transition-all ${
        kind === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 text-white/80 hover:text-white text-base leading-none"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LABEL = 'Verified Supply Chain Passport';

// ─── Main panel ───────────────────────────────────────────────────────────────

export function WLDppLabelPanel() {
  const [buyerFacingLabel, setBuyerFacingLabel] = useState('');
  const [publicTitle, setPublicTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const showToast = (message: string, kind: 'success' | 'error') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Fetch current config ──────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantGet<LabelConfigResponse>(
        '/api/tenant/dpp/passport-label-config',
      );
      setBuyerFacingLabel(data.labelConfig.buyerFacingLabel ?? DEFAULT_LABEL);
      setPublicTitle(data.labelConfig.publicTitle ?? '');
      setSubtitle(data.labelConfig.subtitle ?? '');
    } catch {
      setError('Failed to load label configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    const trimmedLabel = buyerFacingLabel.trim();
    if (!trimmedLabel) {
      setFieldError('Buyer-facing label is required.');
      return;
    }
    if (trimmedLabel.length > 80) {
      setFieldError('Buyer-facing label must be 80 characters or fewer.');
      return;
    }

    setSaving(true);
    try {
      const data = await tenantPut<LabelConfigResponse>(
        '/api/tenant/dpp/passport-label-config',
        {
          buyerFacingLabel: trimmedLabel,
          publicTitle: publicTitle.trim() || null,
          subtitle: subtitle.trim() || null,
          showTexqticBrand: true,
        },
      );
      setBuyerFacingLabel(data.labelConfig.buyerFacingLabel);
      setPublicTitle(data.labelConfig.publicTitle ?? '');
      setSubtitle(data.labelConfig.subtitle ?? '');
      showToast('Passport label saved.', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save label configuration.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div data-testid="wl-dpp-label-config-panel" className="p-6 text-slate-500 text-sm">
        Loading label configuration…
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="wl-dpp-label-config-panel" className="p-6 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div
      data-testid="wl-dpp-label-config-panel"
      className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl"
    >
      <h2 className="text-xl font-bold text-slate-900 mb-1">Passport Label</h2>
      <p className="text-slate-500 text-sm mb-5">
        Configure the label buyers see on public DPP passport pages. This changes display text
        only.
      </p>

      <p
        data-testid="wl-dpp-label-fallback-note"
        className="text-xs text-slate-400 mb-5 bg-slate-50 rounded-xl px-4 py-3"
      >
        Default label: <span className="font-medium text-slate-600">{DEFAULT_LABEL}</span>. Leave
        buyer-facing label as-is to keep the default.
      </p>

      <form onSubmit={(e) => { void handleSave(e); }} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="wl-buyer-facing-label"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Buyer-facing label <span className="text-red-500">*</span>
          </label>
          <input
            id="wl-buyer-facing-label"
            data-testid="wl-dpp-label-buyer-facing-input"
            type="text"
            value={buyerFacingLabel}
            onChange={e => {
              setBuyerFacingLabel(e.target.value);
              setFieldError(null);
            }}
            maxLength={80}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={DEFAULT_LABEL}
            disabled={saving}
          />
          {fieldError && (
            <p className="text-red-500 text-xs mt-1">{fieldError}</p>
          )}
          <p className="text-slate-400 text-xs mt-1">{buyerFacingLabel.length}/80</p>
        </div>

        <div>
          <label
            htmlFor="wl-public-title"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Public title <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="wl-public-title"
            data-testid="wl-dpp-label-public-title-input"
            type="text"
            value={publicTitle}
            onChange={e => setPublicTitle(e.target.value)}
            maxLength={120}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Product Transparency Report"
            disabled={saving}
          />
          <p className="text-slate-400 text-xs mt-1">{publicTitle.length}/120</p>
        </div>

        <div>
          <label
            htmlFor="wl-subtitle"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Subtitle <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="wl-subtitle"
            data-testid="wl-dpp-label-subtitle-input"
            type="text"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            maxLength={180}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Verified by TexQtic"
            disabled={saving}
          />
          <p className="text-slate-400 text-xs mt-1">{subtitle.length}/180</p>
        </div>

        <div className="pt-2">
          <button
            data-testid="wl-dpp-label-save"
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-6 py-2 transition-colors"
          >
            {saving ? 'Saving…' : 'Save label'}
          </button>
        </div>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
