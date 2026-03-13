/**
 * AuthFlows — tenant and admin login forms.
 *
 * TECS-FBW-AUTH-001 (2026-03-13):
 *   Removed hardcoded SEEDED_TENANTS picker.
 *   Tenant login now resolves tenantId from user-entered slug via
 *   GET /api/public/tenants/resolve at submit time.
 *   No seeded tenant list remains in the production path.
 */
import React, { useState } from 'react';
import { login, resolveTenantBySlug } from '../../services/authService';
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
  // TECS-FBW-AUTH-001: slug entered by user; resolved to tenantId at submit time.
  const [tenantSlug, setTenantSlug] = useState('');
  const [resolvedTenant, setResolvedTenant] = useState<ResolvedTenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core login logic — called from both button onClick and form onSubmit.
  // Decoupled from the event so it cannot be silently swallowed by browser
  // form validation or event-capture from third-party scripts on the page.
  const doLogin = async () => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    if (!isAdminRealm && !tenantSlug.trim()) {
      setError('Please enter your organisation slug.');
      setLoading(false);
      return;
    }

    try {
      // TECS-FBW-AUTH-001: resolve slug → tenantId inline before login.
      // Inline resolution (not pre-cached) ensures a fresh lookup on every submit.
      let resolvedId: string | undefined;
      if (!isAdminRealm) {
        let resolved: ResolvedTenant;
        try {
          resolved = await resolveTenantBySlug(tenantSlug.trim());
        } catch {
          setError('Organisation not found. Check the slug and try again.');
          setLoading(false);
          return;
        }
        setResolvedTenant(resolved);
        resolvedId = resolved.tenantId;
      }

      const response = await login(
        { email: cleanEmail, password, tenantId: resolvedId },
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

  // Thin shim so pressing Enter in any field still submits
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin();
  };

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
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
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

          {!isAdminRealm && (
            <div className="space-y-1">
              <label
                htmlFor="tenant-slug"
                className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
              >
                Organisation Slug
              </label>
              <input
                id="tenant-slug"
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="e.g. acme-corp"
                value={tenantSlug}
                onChange={e => {
                  setTenantSlug(e.target.value);
                  setResolvedTenant(null);
                }}
                disabled={loading}
                autoComplete="organization"
              />
              {resolvedTenant && (
                <p className="text-xs text-emerald-600 pt-1">
                  ✓ {resolvedTenant.name}
                </p>
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
