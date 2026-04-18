import React from 'react';

import { type AggregatorDiscoveryEntry } from '../../services/aggregatorDiscoveryService';
import { ErrorState } from '../shared/ErrorState';

interface AggregatorDiscoveryWorkspaceProps {
  tenantName: string;
  entries: AggregatorDiscoveryEntry[];
  loading: boolean;
  error: string | null;
  aiInsight?: string | null;
  onRetry?: () => void;
}

function formatCompanyType(orgType: string): string {
  return orgType.replaceAll('_', ' ');
}

function buildTrustSignals(entry: AggregatorDiscoveryEntry): string[] {
  const trustSignals: string[] = [];

  if (entry.certificationCount > 0) {
    trustSignals.push(
      `${entry.certificationCount} certification${entry.certificationCount === 1 ? '' : 's'}`
    );
  }

  if (entry.hasTraceabilityEvidence) {
    trustSignals.push('Traceability evidence');
  }

  if (entry.visibilityIndicators.length > 0) {
    trustSignals.push(
      `${entry.visibilityIndicators.length} visibility cue${entry.visibilityIndicators.length === 1 ? '' : 's'}`
    );
  }

  return trustSignals;
}

function renderEntryCard(entry: AggregatorDiscoveryEntry) {
  const trustSignals = buildTrustSignals(entry);

  return (
    <article key={entry.orgId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
            Read-only discovery record
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">{entry.legalName}</h2>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{formatCompanyType(entry.orgType)}</span>
            <span aria-hidden="true">•</span>
            <span>{entry.jurisdiction}</span>
          </div>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {entry.slug}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {trustSignals.length > 0 ? (
          trustSignals.map(signal => (
            <span
              key={`${entry.orgId}:${signal}`}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
            >
              {signal}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Limited trust data currently available
          </span>
        )}

        {entry.certificationTypes.slice(0, 2).map(certificationType => (
          <span
            key={`${entry.orgId}:${certificationType}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {certificationType}
          </span>
        ))}
      </div>
    </article>
  );
}

export const AggregatorDiscoveryWorkspace: React.FC<AggregatorDiscoveryWorkspaceProps> = ({
  tenantName,
  entries,
  loading,
  error,
  aiInsight,
  onRetry,
}) => {
  const totalTrustSignals = entries.reduce((count, entry) => count + buildTrustSignals(entry).length, 0);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
              Aggregator-owned discovery workspace
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Curated company discovery</h1>
            <p className="text-slate-600 text-lg leading-relaxed">
              {tenantName} can now review real counterparties already visible in TexQtic with bounded
              trust cues, rather than static promotional copy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 lg:min-w-[320px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Curated entries</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{loading ? '...' : entries.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Trust cues</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{loading ? '...' : totalTrustSignals}</div>
            </div>
          </div>
        </div>
      </section>

      {aiInsight && (
        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">Secondary AI insight</div>
          <h2 className="mt-2 text-xl font-semibold">AI Market Analysis</h2>
          <p className="mt-3 text-sm leading-7 text-slate-200">{aiInsight}</p>
        </section>
      )}

      {loading && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="h-48 rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" />
          ))}
        </section>
      )}

      {!loading && error && (
        <ErrorState
          error={{ message: error }}
          onRetry={onRetry}
        />
      )}

      {!loading && !error && entries.length === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Discovery pending</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">No curated companies are available yet.</h2>
          <p className="mt-3 text-sm text-slate-600">
            The discovery surface is now wired for real records, but there are no eligible counterparties
            to show for this tenant at the moment.
          </p>
        </section>
      )}

      {!loading && !error && entries.length > 0 && (
        <section className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Discovery list</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Curated companies with bounded trust context</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {entries.map(renderEntryCard)}
          </div>
        </section>
      )}
    </div>
  );
};