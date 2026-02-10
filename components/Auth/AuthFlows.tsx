import React, { useState } from 'react';
import { login } from '../../services/authService';
import type { AuthRealm } from '../../services/apiClient';

interface AuthFormProps {
  realm: 'TENANT' | 'CONTROL_PLANE';
  onSuccess: (data: any) => void;
  onSwitchMode: () => void;
  mode: 'LOGIN' | 'SIGNUP';
}

export const AuthForm: React.FC<AuthFormProps> = ({ realm, onSuccess, onSwitchMode, mode }) => {
  const isAdminRealm = realm === 'CONTROL_PLANE';
  const accentColor = isAdminRealm ? 'rose-600' : 'indigo-600';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'SIGNUP') {
      setError('Signup is not yet implemented. Please contact your administrator.');
      return;
    }

    setLoading(true);

    try {
      const response = await login(
        { email, password },
        realm as AuthRealm
      );
      onSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
            {mode === 'LOGIN'
              ? `Sign in to your ${realm.toLowerCase()} account`
              : 'Create your platform organization'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'SIGNUP' && (
            <div className="space-y-1">
              <label
                htmlFor="fullName"
                className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Alex Rivera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-${accentColor} text-white rounded-xl font-bold shadow-lg shadow-indigo-900/10 hover:opacity-90 transition active:scale-95 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'AUTHENTICATING...' : mode === 'LOGIN' ? 'Secure Login' : 'Start Onboarding'}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
          <button
            onClick={onSwitchMode}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            {mode === 'LOGIN'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </button>
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
