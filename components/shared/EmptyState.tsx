/**
 * EmptyState Component
 *
 * Standardized empty state with icon, message, and optional CTA
 */

import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      {message && <p className="text-slate-500 mb-6">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
