import { useState, useEffect } from 'react';
import { LoadingState, ErrorState, EmptyState } from '../shared';
import type { ApiError } from '../../services/apiClient';
import { verifyEmail, resetPassword, resendVerification } from '../../services/authService';

/**
 * Verify Email Component
 *
 * Dual-purpose component:
 * - Verifies email using JWT token from URL query param
 * - Allows resending verification email
 *
 * Uses Wave 7 UX patterns: Loading/Error/Success states
 */
export const VerifyEmail: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsResending(true);
    setResendSuccess(false);

    try {
      await resendVerification(email);
      setResendSuccess(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsResending(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setResendSuccess(false);
  };

  if (resendSuccess) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <EmptyState
          icon="✉️"
          title="Verification Email Sent"
          message="If an unverified account exists, we've sent a verification link. The link will expire in 30 minutes."
          action={{
            label: 'Done',
            onClick: onVerified,
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="text-5xl">✉️</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Verify your Email</h2>
        <p className="text-sm text-slate-500">
          Enter your email to receive a verification link. Check your email and click the link to
          activate your account.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState error={error} onRetry={handleRetry} />
        </div>
      )}

      {isResending ? (
        <LoadingState message="Sending verification link..." />
      ) : (
        <form onSubmit={handleResend} className="space-y-4">
          <div className="space-y-1 text-left">
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
              disabled={isResending}
            />
          </div>

          <button
            type="submit"
            disabled={isResending || !email}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            Send Verification Link
          </button>
        </form>
      )}

      <button
        onClick={onVerified}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        Back to Login
      </button>
    </div>
  );
};
