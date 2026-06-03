import React, { useState } from 'react';
import { normalizeCommercialPlan } from '../../types';
import { PlanBadge } from '../shared/PlanBadge';
import {
  ENTITLEMENT_DISPLAY_ROWS,
  UPGRADE_CTA_MAILTO,
  TIER_UPGRADE_COPY,
  type EntitlementRow,
  type AvailabilityLabel,
} from '../../config/entitlementDisplay';

interface PlanAndUsagePanelProps {
  plan: string | null | undefined;
  aiBudget: number;
  tenantName: string;
}

const AVAILABILITY_BADGE: Record<AvailabilityLabel, { label: string; className: string }> = {
  Included: {
    label: 'Included',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'Coming soon': {
    label: 'Coming soon',
    className: 'bg-slate-50 text-slate-500 border-slate-200',
  },
  'Contact us': {
    label: 'Contact us',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'Available in STARTER': {
    label: 'STARTER',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'Available in PROFESSIONAL': {
    label: 'PROFESSIONAL',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  'Available in ENTERPRISE': {
    label: 'ENTERPRISE',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

function AvailabilityCell({ value }: { value: AvailabilityLabel }) {
  const badge = AVAILABILITY_BADGE[value];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function groupRowsByCategory(rows: readonly EntitlementRow[]) {
  const groups: Record<string, EntitlementRow[]> = {};
  for (const row of rows) {
    if (!groups[row.category]) groups[row.category] = [];
    groups[row.category].push(row);
  }
  return groups;
}

export function PlanAndUsagePanel({ plan, aiBudget, tenantName: _tenantName }: PlanAndUsagePanelProps) {
  const normalized = normalizeCommercialPlan(plan);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const categoryGroups = groupRowsByCategory(ENTITLEMENT_DISPLAY_ROWS);

  const tierCopy = TIER_UPGRADE_COPY[normalized] ?? TIER_UPGRADE_COPY['FREE'];
  const aiBudgetDisplay = aiBudget > 0 ? aiBudget.toLocaleString() : '50,000';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Plan &amp; Features
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900">Your current plan</h2>
            <PlanBadge plan={plan} />
          </div>
          <p className="text-sm leading-6 text-slate-600 max-w-xl">
            {tierCopy}
          </p>
        </div>

        {/* Upgrade CTA — only shown for FREE */}
        {normalized === 'FREE' && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:max-w-xs shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 mb-2">
              Interested in upgrading?
            </div>
            <p className="text-sm leading-6 text-slate-700 mb-3">
              Paid tiers will open later. Reach out to be among the first to access STARTER or PROFESSIONAL.
            </p>
            <a
              href={UPGRADE_CTA_MAILTO}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Contact us to upgrade
            </a>
          </div>
        )}
      </div>

      {/* AI usage — static display, no fake progress bar */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          AI Document Intelligence
        </div>
        <div className="text-base font-semibold text-slate-900">
          {normalized === 'FREE' ? 'FREE' : normalized} plan AI limit: {aiBudgetDisplay} tokens/month
        </div>
        <p className="text-sm leading-6 text-slate-500">
          Usage tracking display coming soon.
        </p>
      </div>

      {/* Feature matrix — collapsible */}
      <div>
        <button
          onClick={() => setMatrixOpen(prev => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
          aria-expanded={matrixOpen}
        >
          <span className="text-base leading-none">{matrixOpen ? '▾' : '▸'}</span>
          {matrixOpen ? 'Hide' : 'Show'} feature availability
        </button>

        {matrixOpen && (
          <div className="mt-5 space-y-6 animate-in fade-in duration-300">
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 min-w-[180px]">
                      Feature
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                      FREE
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                      STARTER
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                      PROFESSIONAL
                    </th>
                    <th className="text-center py-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                      ENTERPRISE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categoryGroups).map(([category, rows]) => (
                    <React.Fragment key={category}>
                      <tr>
                        <td
                          colSpan={5}
                          className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400"
                        >
                          {category}
                        </td>
                      </tr>
                      {rows.map(row => (
                        <tr key={row.feature} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-4 text-slate-700 font-medium">
                            {row.feature}
                            {row.note && (
                              <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                                {row.note}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <AvailabilityCell value={row.FREE} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <AvailabilityCell value={row.STARTER} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <AvailabilityCell value={row.PROFESSIONAL} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <AvailabilityCell value={row.ENTERPRISE} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400 leading-5">
              Feature availability is indicative and subject to change. Paid tiers will open after early-access
              completion. No checkout or payment is available at this time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
