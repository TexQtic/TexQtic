import { useState } from 'react';
import { LoadingState, ErrorState, EmptyState } from '../shared';
import type { ApiError } from '../../services/apiClient';
import { forgotPassword } from '../../services/authService';

/**
 * Forgot Password Component
 *
 * Allows users to request a password reset link via email.
 * Uses Wave 7 UX patterns: Loading/Error/Success states
 */
export const ForgotPassword: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-emerald-600"></div>
        <div className="p-8">
          <EmptyState
            icon="✉️"
            title="Check Your Email"
            message="If an account with that email exists, we've sent a password reset link. The link will expire in 30 minutes."
            action={{
              label: 'Back to Login',
              onClick: onBack,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="h-2 bg-indigo-600"></div>
      <div className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tighter">🔑 Recovery</div>
          <p className="text-slate-500 text-sm">
            Enter your email to reset your platform password.
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorState error={error} onRetry={handleRetry} />
          </div>
        )}

        {isLoading ? (
          <LoadingState message="Sending reset link..." />
        ) : (
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
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="name@company.com"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <button
          onClick={onBack}
          className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};
