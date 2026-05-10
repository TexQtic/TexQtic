import React from 'react';

export interface NetworkCommercePlaceholderSurfaceProps {
  title: string;
  description: string;
  status?: 'ready' | 'blocked' | 'coming-soon';
  blockedReason?: string;
  onBack?: () => void;
}

export const NetworkCommercePlaceholderSurface: React.FC<NetworkCommercePlaceholderSurfaceProps> = ({
  title,
  description,
  status = 'coming-soon',
  blockedReason,
  onBack,
}) => {
  const statusConfig = {
    ready: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      badgeColor: 'bg-blue-100 text-blue-800',
      badgeLabel: 'Foundation Ready',
    },
    blocked: {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-900',
      badgeColor: 'bg-amber-100 text-amber-800',
      badgeLabel: 'Backend Blocked',
    },
    'coming-soon': {
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeColor: 'bg-slate-100 text-slate-700',
      badgeLabel: 'Coming Soon',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`min-h-screen ${config.bgColor} p-6 md:p-8`}>
      <div className="max-w-2xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-2"
          >
            ← Back
          </button>
        )}

        <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-8`}>
          <div className="flex items-start gap-4 mb-6">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${config.badgeColor}`}>
              {config.badgeLabel}
            </div>
          </div>

          <h1 className={`text-3xl font-bold ${config.textColor} mb-4`}>{title}</h1>

          <p className={`text-lg ${config.textColor} mb-6 leading-relaxed`}>{description}</p>

          {status === 'blocked' && blockedReason && (
            <div className="mt-6 p-4 rounded-lg bg-white border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2">Blocked Until Backend Routes Ready</h3>
              <p className="text-sm text-amber-900">{blockedReason}</p>
            </div>
          )}

          <div className="mt-8 p-4 rounded-lg bg-white border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Network Commerce Phase 1 Status</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <li>✓ Frontend shell and navigation foundation (FE-2) implemented</li>
              <li>✓ Route descriptor and manifest entries configured</li>
              <li>✓ Shell navigation entries wired</li>
              {status === 'blocked' && (
                <li className="text-amber-900">⏳ Backend supplier route handlers not yet implemented — this surface remains blocked</li>
              )}
              {status !== 'blocked' && (
                <li>⏳ Full domain business screens implemented in subsequent FE packets (FE-3+)</li>
              )}
            </ul>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-slate-100 border border-slate-300">
            <h3 className="font-semibold text-slate-900 mb-2">Feature Gate Status</h3>
            <p className="text-sm text-slate-700">
              This surface respects backend feature gates. If disabled, requests will return 503 FEATURE_DISABLED with instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
