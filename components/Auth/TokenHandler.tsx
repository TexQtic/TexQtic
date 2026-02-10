import { useState, useEffect } from 'react';
import { LoadingState, ErrorState, EmptyState } from '../shared';
import type { ApiError } from '../../services/apiClient';
import { resetPassword, verifyEmail } from '../../services/authService';

/**
 * Reset Password / Verify Email Token Handler
 *
 * Handles token-based actions from email links:
 * - Password reset: shows form for new password
 * - Email verification: auto-verifies and shows success
 *
 * Uses Wave 7 UX patterns: Loading/Error/Success states
 */
export const TokenHandler: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [action, setAction] = useState<'reset-password' | 'verify-email' | null>(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  // Password reset form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Extract action and token from URL query params
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlAction = params.get('action'); // 'reset-password' or 'verify-email'

    if (!urlToken) {
      setError({
        status: 400,
        message: 'No token provided in URL',
        code: 'MISSING_TOKEN',
      });
      setIsLoading(false);
      return;
    }

    setToken(urlToken);

    // Determine action based on URL
    if (urlAction === 'reset-password' || window.location.pathname.includes('reset-password')) {
      setAction('reset-password');
      setIsLoading(false); // Show password form
    } else if (urlAction === 'verify-email' || window.location.pathname.includes('verify-email')) {
      setAction('verify-email');
      // Auto-verify email token
      handleEmailVerification(urlToken);
    } else {
      setError({
        status: 400,
        message: 'Invalid action. Expected reset-password or verify-email.',
        code: 'INVALID_ACTION',
      });
      setIsLoading(false);
    }
  }, []);

  const handleEmailVerification = async (emailToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await verifyEmail(emailToken);
      setSuccess(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError({
        status: 400,
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH',
      });
      return;
    }

    if (newPassword.length < 6) {
      setError({
        status: 400,
        message: 'Password must be at least 6 characters',
        code: 'PASSWORD_TOO_SHORT',
      });
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (action === 'verify-email') {
      handleEmailVerification(token);
    }
  };

  // Success state for email verification
  if (success && action === 'verify-email') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-emerald-600"></div>
        <div className="p-8">
          <EmptyState
            icon="✅"
            title="Email Verified!"
            message="Your email has been successfully verified. You can now access all features."
            action={{
              label: 'Continue to Login',
              onClick: onComplete,
            }}
          />
        </div>
      </div>
    );
  }

  // Success state for password reset
  if (success && action === 'reset-password') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-emerald-600"></div>
        <div className="p-8">
          <EmptyState
            icon="✅"
            title="Password Reset Complete!"
            message="Your password has been successfully reset. You can now log in with your new password."
            action={{
              label: 'Continue to Login',
              onClick: onComplete,
            }}
          />
        </div>
      </div>
    );
  }

  // Loading state for auto email verification
  if (isLoading && action === 'verify-email') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8">
        <LoadingState message="Verifying your email..." />
      </div>
    );
  }

  // Error state
  if (error && action === 'verify-email') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="h-2 bg-red-600"></div>
        <div className="p-8 space-y-6">
          <ErrorState error={error} onRetry={handleRetry} />
          <button
            onClick={onComplete}
            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Password reset form
  if (action === 'reset-password') {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-indigo-600"></div>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-3xl font-black tracking-tighter">🔐 New Password</div>
            <p className="text-slate-500 text-sm">Enter your new password below.</p>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorState error={error} />
            </div>
          )}

          {isResetting ? (
            <LoadingState message="Resetting your password..." />
          ) : (
            <form className="space-y-4" onSubmit={handlePasswordReset}>
              <div className="space-y-1">
                <label
                  htmlFor="newPassword"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="At least 6 characters"
                  disabled={isResetting}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Re-enter password"
                  disabled={isResetting}
                />
              </div>

              <button
                type="submit"
                disabled={isResetting || !newPassword || !confirmPassword}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Reset Password
              </button>
            </form>
          )}

          <button
            onClick={onComplete}
            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8">
      <LoadingState message="Processing..." />
    </div>
  );
};
