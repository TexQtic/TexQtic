import React from 'react';
import { getCommercialPlanDisplayLabel, normalizeCommercialPlan } from '../../types';

interface PlanBadgeProps {
  plan: string | null | undefined;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const normalized = normalizeCommercialPlan(plan);
  const label = getCommercialPlanDisplayLabel(plan);

  const colorClass =
    normalized === 'FREE'
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : normalized === 'STARTER'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : normalized === 'PROFESSIONAL'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-violet-50 text-violet-700 border-violet-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${colorClass}${className ? ` ${className}` : ''}`}
      aria-label={`Current plan: ${label}`}
    >
      {label}
    </span>
  );
}
