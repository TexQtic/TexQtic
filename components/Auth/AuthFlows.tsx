import React, { useState } from 'react';
import { login } from '../../services/authService';
import type { AuthRealm } from '../../services/apiClient';

// Flip to true locally to inspect login payloads without exposing tokens
const AUTH_DEBUG = false;

// TODO: Replace with dynamic GET /api/public/tenants/resolve?slug=<slug> once that endpoint exists.
const SEEDED_TENANTS = [
  { slug: 'acme-corp', id: 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80', label: 'Acme Corporation' },
  { slug: 'white-label-co', id: '960c2e3b-64cf-4ba8-88d1-4e8f72d61782', label: 'White Label Co' },
] as const;

interface AuthFormProps {
  realm: 'TENANT' | 'CONTROL_PLANE';
  onSuccess: (data: any) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ realm, onSuccess }) => {
  const isAdminRealm = realm === 'CONTROL_PLANE';
  const accentColor = isAdminRealm ? 'rose-600' : 'indigo-600';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Explicit <string> type so onChange (e.target.value: string) is assignable to the setter
  const [selectedTenantId, setSelectedTenantId] = useState<string>(SEEDED_TENANTS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core login logic — called from both button onClick and form onSubmit.
  // Decoupled from the event so it cannot be silently swallowed by browser
  // form validation or event-capture from third-party scripts on the page.
  const doLogin = async () => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    if (!isAdminRealm && !selectedTenantId) {
      setError('Please select a tenant.');
      setLoading(false);
      return;
    }

    try {
      const response = await login(
        { email: cleanEmail, password, tenantId: isAdminRealm ? undefined : selectedTenantId },
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
                htmlFor="tenant"
                className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
              >
                Tenant
              </label>
              {/* TODO: Replace with dynamic tenant resolver once GET /api/public/tenants/resolve exists */}
              <select
                id="tenant"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                disabled={loading}
              >
                {SEEDED_TENANTS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
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
