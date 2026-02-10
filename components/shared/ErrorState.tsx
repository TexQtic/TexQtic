/**
 * ErrorState Component
 *
 * Standardized error display with status-specific messages and retry option
 */

import React from 'react';

interface ErrorStateProps {
  error: {
    status?: number;
    message?: string;
    code?: string;
  };
  onRetry?: () => void;
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(error: ErrorStateProps['error']): string {
  const status = error.status || 0;
  const message = error.message;

  // Standardized messages per Wave 7 requirements
  switch (status) {
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return "You don't have access to this action.";
    case 404:
      return 'Not found.';
    case 422:
      return message || 'Invalid request. Please check your input.';
    case 429:
      if (error.code === 'AI_BUDGET_EXCEEDED') {
        return 'AI budget limit reached for this month.';
      }
      return 'Rate limit exceeded. Please try again later.';
    case 0:
      return 'Network error. Please check your connection.';
    default:
      if (status >= 500) {
        return 'Service temporarily unavailable. Try again.';
      }
      return message || 'An unexpected error occurred.';
  }
}

/**
 * Get additional help text for specific errors
 */
function getErrorHelp(error: ErrorStateProps['error']): string | null {
  if (error.status === 429 && error.code === 'AI_BUDGET_EXCEEDED') {
    return 'Contact your administrator to increase limits.';
  }
  return null;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const message = getErrorMessage(error);
  const help = getErrorHelp(error);
  const canRetry = onRetry && error.status !== 401 && error.status !== 403 && error.status !== 404;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 max-w-md w-full">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-lg font-bold text-rose-900 mb-2">
          {error.status ? `Error ${error.status}` : 'Error'}
        </h3>
        <p className="text-rose-700 mb-4">{message}</p>
        {help && <p className="text-sm text-rose-600 mb-4">{help}</p>}
        {canRetry && (
          <button
            onClick={onRetry}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
