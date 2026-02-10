/**
 * LoadingState Component
 *
 * Standardized loading indicator with optional message
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-indigo-600 border-t-transparent`}
      ></div>
      {message && <p className="text-slate-500 mt-4">{message}</p>}
    </div>
  );
};
