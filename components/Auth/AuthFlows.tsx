/**
 * AuthFlows — tenant and admin login forms.
 *
 * TECS-FBW-AUTH-001 (2026-03-13):
 *   Removed hardcoded SEEDED_TENANTS picker.
 *   Tenant login resolves tenantId from slug via GET /api/public/tenants/resolve.
 *
 * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14):
 *   Removed mandatory slug field from tenant login.
 *   Tenant context is now resolved server-side from email membership via
 *   GET /api/public/tenants/by-email. If a single tenant membership exists it is
 *   auto-selected. If multiple memberships exist the user selects from a
 *   server-driven list. No slug is entered, stored, or trusted by the client.
 */
import React, { useState } from 'react';
import { login, resolveTenantsByEmail } from '../../services/authService';
import type { ResolvedTenant } from '../../services/authService';
import type { AuthRealm } from '../../services/apiClient';

interface AuthFormProps {
  realm: 'TENANT' | 'CONTROL_PLANE';
  onSuccess: (data: any) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ realm, onSuccess }) => {
  const isAdminRealm = realm === 'CONTROL_PLANE';
  const accentColor = isAdminRealm ? 'rose-600' : 'indigo-600';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN: server-driven tenant state replaces free-text slug.
  // null  = lookup not yet triggered
  // []    = lookup done, no memberships found
  // [...] = one or more tenant options returned from server
  const [tenantOptions, setTenantOptions] = useState<ResolvedTenant[] | null>(null);
  const [tenantLookupState, setTenantLookupState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve tenant memberships by email — triggered on email field blur.
  // Resets on email change so stale options are never displayed.
  const lookupTenantsByEmail = async (emailValue: string) => {
    const clean = emailValue.trim().toLowerCase();
    // Basic format guard — avoids server round-trips for clearly incomplete input.
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

    setTenantLookupState('loading');
    setTenantOptions(null);
    setSelectedTenantId(null);

    try {
      const options = await resolveTenantsByEmail(clean);
      setTenantOptions(options);
      setTenantLookupState('done');
      // Auto-select when exactly one membership exists — no manual choice required.
      if (options.length === 1) {
        setSelectedTenantId(options[0].tenantId);
      }
    } catch {
      // Network or unexpected server error: treat as no options found.
      // The login call itself will surface a more specific error.
      setTenantOptions([]);
      setTenantLookupState('done');
    }
  };

  // Core login logic — called from both button onClick and form onSubmit.
  const doLogin = async () => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    if (!isAdminRealm && !selectedTenantId) {
      if (tenantOptions !== null && tenantOptions.length === 0) {
        setError('No account was found for this email address. Contact your administrator.');
      } else if (tenantOptions !== null && tenantOptions.length > 1) {
        setError('Please select your organisation before signing in.');
      } else {
        setError('Please enter your email address to identify your organisation.');
      }
      setLoading(false);
      return;
    }

    try {
      const response = await login(
        { email: cleanEmail, password, tenantId: selectedTenantId ?? undefined },
        realm as AuthRealm
      );
      onSuccess(response);
    } catch (err: any) {
      if (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED') {
        setError('Too many attempts. Wait 10 minutes.');
      } else if (err.status === 401) {
        setError('Invalid credentials.');
      } else {
        setError(`Login failed: ${err.message || 'Unknown error.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Thin shim so pressing Enter in any field still submits.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin();
  };

  // Derive the selected tenant object for the confirmation label.
  const selectedTenant = tenantOptions?.find(t => t.tenantId === selectedTenantId) ?? null;

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`h-2 bg-${accentColor}`}></div>
      <div className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tighter">
            {isAdminRealm ? '🛡️ TexQtic Admin' : '🚀 TexQtic'}
          </div>
          <p className="text-slate-500 text-sm">
            Sign in to your {isAdminRealm ? 'admin' : 'account'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="name@company.com"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                // Reset tenant resolution whenever the email changes.
                setTenantOptions(null);
                setTenantLookupState('idle');
                setSelectedTenantId(null);
              }}
              onBlur={() => {
                if (!isAdminRealm) lookupTenantsByEmail(email);
              }}
              disabled={loading}
              required
            />
            {/* Tenant lookup inline feedback — tenant realm only */}
            {!isAdminRealm && tenantLookupState === 'loading' && (
              <p className="text-[10px] text-slate-400 pt-1">Finding your organisation…</p>
            )}
            {!isAdminRealm && tenantLookupState === 'done' && tenantOptions?.length === 0 && (
              <p className="text-[10px] text-rose-500 pt-1">
                No account found for this email. Contact your administrator.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              title="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN: server-driven organisation display / selection */}
          {!isAdminRealm && tenantOptions !== null && tenantOptions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                Organisation
              </p>
              {tenantOptions.length === 1 ? (
                // Single membership — auto-selected, show confirmation only.
                <p className="text-xs text-emerald-600 pt-1">✓ {selectedTenant?.name}</p>
              ) : (
                // Multiple memberships — explicit server-driven selection required.
                <div className="flex flex-col gap-2 pt-1">
                  {tenantOptions.map(t => (
                    <label
                      key={t.tenantId}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                        selectedTenantId === t.tenantId
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tenant-select"
                        value={t.tenantId}
                        checked={selectedTenantId === t.tenantId}
                        onChange={() => setSelectedTenantId(t.tenantId)}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm font-medium">{t.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={doLogin}
            disabled={loading}
            className={`w-full py-4 bg-${accentColor} text-white rounded-xl font-bold shadow-lg shadow-indigo-900/10 hover:opacity-90 transition active:scale-95 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'AUTHENTICATING...' : 'Secure Login'}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
          <div className="text-xs text-slate-400 text-center">
            No account? Contact your administrator for an invite.
          </div>
          {isAdminRealm && (
            <div className="flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              Admin MFA Required
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
