/**
 * ZohoBooksOps — SuperAdmin Zoho Books Operations Surface (Phase 1: Read-Only)
 *
 * Surfaces three read-only sections:
 *   1. Integration Status Panel      — config posture tokens, no raw env values
 *   2. Contact Sync Monitor          — cross-tenant organization_integrations read
 *   3. Backfill Candidates           — approved orgs with no Zoho contact row
 *
 * Additionally shows two static informational sections:
 *   4. Failed Sync Visibility        — filtered view of Contact Sync Monitor (SYNC_FAILED)
 *   5. COA / Taxonomy Readiness Gate — static panel, contact sync LIVE, accounting BLOCKED
 *
 * Constitutional compliance:
 *   - No raw externalId returned or displayed — only PRESENT / MISSING
 *   - No metadataJson, GSTIN, PAN, Aadhaar, OAuth tokens, or env values displayed
 *   - No backfill execution, retry, cleanup, or mutation actions in Phase 1
 *   - No accounting sync actions (COA/taxonomy blocked pending CA/accountant approval)
 *
 * Phase 1 scope:
 *   ✅ Integration status tokens
 *   ✅ Contact sync table (paginated, filterable)
 *   ✅ Backfill candidates (read-only, with warning)
 *   ✅ COA/taxonomy static informational gate
 *   ❌ Retry, backfill execute, cleanup, accounting sync — deferred
 *
 * Implementation unit: IMPL-SUPERADMIN-ZOHO-BOOKS-CONTACT-SYNC-MONITORING-READONLY-01
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  getZohoBooksStatus,
  listZohoBooksContacts,
  getZohoBooksBackfillCandidates,
  type ZohoBooksStatusResponse,
  type ZohoBooksContactRow,
  type ZohoBooksContactsParams,
  type ZohoBooksBackfillCandidateRow,
} from '../../services/controlPlaneService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function truncateId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…` : id;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const colorMap: Record<string, string> = {
    ENABLED: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    DISABLED: 'bg-slate-800 text-slate-400 border border-slate-700',
    LIVE: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    OFF: 'bg-slate-800 text-slate-400 border border-slate-700',
    DEGRADED: 'bg-amber-900/40 text-amber-300 border border-amber-700',
    READY: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    MISSING_REQUIRED_ENV: 'bg-amber-900/40 text-amber-300 border border-amber-700',
    MISSING: 'bg-slate-800 text-slate-400 border border-slate-700',
    PRESENT: 'bg-sky-900/40 text-sky-300 border border-sky-700',
    SYNC_SUCCESS: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
    SYNC_FAILED: 'bg-red-900/40 text-red-300 border border-red-700',
    NOT_SYNCED: 'bg-slate-800 text-slate-400 border border-slate-700',
    SYNTHETIC: 'bg-violet-900/40 text-violet-300 border border-violet-700',
    REAL: 'bg-sky-900/40 text-sky-300 border border-sky-700',
  };
  const cls = colorMap[value] ?? 'bg-slate-800 text-slate-300 border border-slate-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>
      {value}
    </span>
  );
};

// ─── Section 1: Integration Status Panel ─────────────────────────────────────

interface StatusPanelProps {
  status: ZohoBooksStatusResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const IntegrationStatusPanel: React.FC<StatusPanelProps> = ({ status, loading, error, onRefresh }) => (
  <section className="bg-slate-900 border border-slate-800 rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-slate-100">Integration Status</h2>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {error && (
      <div className="mb-4 rounded bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">{error}</div>
    )}

    {status?.deprecatedFlagWarning && (
      <div className="mb-4 rounded bg-amber-900/30 border border-amber-700 px-3 py-2 text-xs text-amber-300">
        ⚠️ Deprecated flag <code className="font-mono">ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED</code> is active.
        Migrate to <code className="font-mono">ZOHO_BOOKS_INTEGRATION_ENABLED</code>.
      </div>
    )}

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[
        { label: 'Integration Gate', value: status?.integrationEnabled },
        { label: 'Contact Sync Flag', value: status?.contactSyncEnabled },
        { label: 'Config Readiness', value: status?.configReadiness },
        { label: 'Contact Sync Posture', value: status?.contactSyncPosture },
      ].map(({ label, value }) => (
        <div key={label} className="bg-slate-800/50 rounded p-3">
          <div className="text-xs text-slate-500 mb-1">{label}</div>
          {value ? <StatusBadge value={value} /> : <span className="text-slate-600 text-xs">—</span>}
        </div>
      ))}

      {status?.missingKeys && status.missingKeys.length > 0 && (
        <div className="col-span-2 sm:col-span-3 bg-amber-900/20 border border-amber-800 rounded p-3">
          <div className="text-xs text-amber-400 font-medium mb-1">Missing required env keys:</div>
          <div className="flex flex-wrap gap-1">
            {status.missingKeys.map(key => (
              <span key={key} className="font-mono text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-amber-800">{key}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  </section>
);

// ─── Section 2: Contact Sync Monitor ─────────────────────────────────────────

interface ContactMonitorProps {
  rows: ZohoBooksContactRow[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  summary: { total: number; synced: number; failed: number; pending: number; synthetic: number; real: number } | null;
  filters: ZohoBooksContactsParams;
  onFilterChange: (f: ZohoBooksContactsParams) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
}

const ContactSyncMonitor: React.FC<ContactMonitorProps> = ({
  rows, loading, error, hasMore, nextCursor, summary,
  filters, onFilterChange, onLoadMore, onRefresh,
}) => (
  <section className="bg-slate-900 border border-slate-800 rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Contact Sync Monitor</h2>
        {summary && (
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.total} rows — {summary.synced} synced · {summary.failed} failed · {summary.pending} pending · {summary.real} real · {summary.synthetic} synthetic
          </p>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {/* Filters */}
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500">Sync Status</label>
        <select
          value={filters.syncStatus ?? ''}
          onChange={e => onFilterChange({ ...filters, syncStatus: (e.target.value as ZohoBooksContactsParams['syncStatus']) || undefined, cursor: undefined })}
          className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="SYNC_SUCCESS">SYNC_SUCCESS</option>
          <option value="SYNC_FAILED">SYNC_FAILED</option>
          <option value="NOT_SYNCED">NOT_SYNCED</option>
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500">Org Type</label>
        <select
          value={filters.orgType ?? ''}
          onChange={e => onFilterChange({ ...filters, orgType: (e.target.value as ZohoBooksContactsParams['orgType']) || undefined, cursor: undefined })}
          className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1"
        >
          <option value="">All</option>
          <option value="real">Real</option>
          <option value="synthetic">Synthetic</option>
        </select>
      </div>
    </div>

    {error && (
      <div className="mb-4 rounded bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">{error}</div>
    )}

    {!loading && rows.length === 0 && (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <div className="text-3xl mb-2">🔗</div>
        <p className="text-sm font-medium">No contact sync rows found.</p>
        <p className="text-xs mt-1">Rows appear here when orgs transition to VERIFICATION_APPROVED with Zoho sync enabled.</p>
      </div>
    )}

    {rows.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-2 pr-4 font-medium">Org</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Plan</th>
              <th className="pb-2 pr-4 font-medium">Sync Status</th>
              <th className="pb-2 pr-4 font-medium">External ID</th>
              <th className="pb-2 pr-4 font-medium">Attempts</th>
              <th className="pb-2 pr-4 font-medium">Last Attempted</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 font-medium">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2 pr-4">
                  <div className="font-mono text-slate-200">{row.organizationSlug}</div>
                  <div className="text-slate-500 text-xs">{truncateId(row.organizationId)}</div>
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge value={row.organizationStatus} />
                </td>
                <td className="py-2 pr-4 text-slate-400">{row.organizationPlan ?? '—'}</td>
                <td className="py-2 pr-4">
                  <StatusBadge value={row.syncStatus} />
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge value={row.externalIdStatus} />
                </td>
                <td className="py-2 pr-4 text-slate-400 tabular-nums">{row.attemptCount}</td>
                <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{formatDate(row.lastAttemptedAt)}</td>
                <td className="py-2 pr-4">
                  <StatusBadge value={row.orgType} />
                </td>
                <td className="py-2 text-slate-500 max-w-xs truncate">
                  {row.lastErrorSummary ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {hasMore && (
      <div className="mt-4 flex justify-center">
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-1.5 rounded transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      </div>
    )}
  </section>
);

// ─── Section 3: Backfill Candidates ──────────────────────────────────────────

interface BackfillCandidatesProps {
  rows: ZohoBooksBackfillCandidateRow[];
  count: number;
  realCount: number;
  syntheticCount: number;
  warning: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const BackfillCandidatesPanel: React.FC<BackfillCandidatesProps> = ({
  rows, count, realCount, syntheticCount, warning,
  loading, error, onRefresh,
}) => (
  <section className="bg-slate-900 border border-slate-800 rounded-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Backfill Candidates</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Approved orgs with no Zoho Books contact row — {count} total · {realCount} real · {syntheticCount} synthetic
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {/* Authorization warning — always shown */}
    <div className="mb-4 rounded bg-amber-900/20 border border-amber-800 px-3 py-2.5 text-xs text-amber-300">
      ⚠️ {warning}
    </div>

    {error && (
      <div className="mb-4 rounded bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">{error}</div>
    )}

    {!loading && rows.length === 0 && (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-medium">No backfill candidates.</p>
        <p className="text-xs mt-1">All approved orgs already have a Zoho Books contact row.</p>
      </div>
    )}

    {rows.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="pb-2 pr-4 font-medium">Org</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Plan</th>
              <th className="pb-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map(row => (
              <tr key={row.organizationId} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2 pr-4">
                  <div className="font-mono text-slate-200">{row.organizationSlug}</div>
                  <div className="text-slate-500">{truncateId(row.organizationId)}</div>
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge value={row.organizationStatus} />
                </td>
                <td className="py-2 pr-4 text-slate-400">{row.organizationPlan ?? '—'}</td>
                <td className="py-2">
                  <StatusBadge value={row.orgType} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

// ─── Section 4: COA / Taxonomy Readiness Gate (static) ───────────────────────

const CoaTaxonomyGate: React.FC = () => (
  <section className="bg-slate-900 border border-slate-800 rounded-lg p-6">
    <h2 className="text-base font-semibold text-slate-100 mb-1">COA / Taxonomy Readiness Gate</h2>
    <p className="text-xs text-slate-500 mb-4">
      Accounting-impacting sync operations are blocked pending COA/taxonomy mapping and CA/accountant approval.
      This is an informational panel only — no actions are available here.
    </p>

    <div className="space-y-2">
      {[
        { label: 'Contact Sync', status: 'LIVE' },
        { label: 'Invoice Sync', status: 'BLOCKED' },
        { label: 'Payment Sync', status: 'BLOCKED' },
        { label: 'Tax Invoice Sync', status: 'BLOCKED' },
        { label: 'Credit Notes', status: 'BLOCKED' },
        { label: 'Subscription Accounting', status: 'BLOCKED' },
        { label: 'Marketplace Fees / Commissions', status: 'BLOCKED' },
        { label: 'Payouts', status: 'BLOCKED' },
        { label: 'Journals', status: 'BLOCKED' },
      ].map(({ label, status }) => (
        <div key={label} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
          <span className="text-slate-400">{label}</span>
          {status === 'LIVE'
            ? <StatusBadge value="LIVE" />
            : (
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <span className="text-slate-700">BLOCKED</span>
                <span className="text-slate-700 text-xs">— COA/taxonomy + CA approval required</span>
              </span>
            )
          }
        </div>
      ))}
    </div>
  </section>
);

// ─── Main component ───────────────────────────────────────────────────────────

type ActiveTab = 'status' | 'contacts' | 'backfill' | 'coa';

export const ZohoBooksOps: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');

  // Status
  const [status, setStatus] = useState<ZohoBooksStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Contacts
  const [contactRows, setContactRows] = useState<ZohoBooksContactRow[]>([]);
  const [contactFilters, setContactFilters] = useState<ZohoBooksContactsParams>({ limit: 25 });
  const [contactPagination, setContactPagination] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const [contactSummary, setContactSummary] = useState<{ total: number; synced: number; failed: number; pending: number; synthetic: number; real: number } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Backfill candidates
  const [backfillData, setBackfillData] = useState<{ rows: ZohoBooksBackfillCandidateRow[]; count: number; realCount: number; syntheticCount: number; warning: string } | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const result = await getZohoBooksStatus();
      setStatus(result);
    } catch {
      setStatusError('Failed to load integration status.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async (params: ZohoBooksContactsParams, append = false) => {
    setContactLoading(true);
    setContactError(null);
    try {
      const result = await listZohoBooksContacts(params);
      setContactRows(prev => append ? [...prev, ...result.rows] : result.rows);
      setContactPagination({ hasMore: result.pagination.hasMore, nextCursor: result.pagination.nextCursor });
      setContactSummary(result.summary);
    } catch {
      setContactError('Failed to load contact sync rows.');
    } finally {
      setContactLoading(false);
    }
  }, []);

  const fetchBackfill = useCallback(async () => {
    setBackfillLoading(true);
    setBackfillError(null);
    try {
      const result = await getZohoBooksBackfillCandidates();
      setBackfillData(result);
    } catch {
      setBackfillError('Failed to load backfill candidates.');
    } finally {
      setBackfillLoading(false);
    }
  }, []);

  // Fetch on tab switch
  useEffect(() => {
    if (activeTab === 'status' && !status) {
      fetchStatus();
    }
    if (activeTab === 'contacts' && contactRows.length === 0) {
      fetchContacts(contactFilters);
    }
    if (activeTab === 'backfill' && !backfillData) {
      fetchBackfill();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContactFilterChange = useCallback((newFilters: ZohoBooksContactsParams) => {
    setContactFilters(newFilters);
    setContactRows([]);
    fetchContacts(newFilters);
  }, [fetchContacts]);

  const handleLoadMore = useCallback(() => {
    if (contactPagination.nextCursor) {
      fetchContacts({ ...contactFilters, cursor: contactPagination.nextCursor }, true);
    }
  }, [contactPagination.nextCursor, contactFilters, fetchContacts]);

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'status',   label: 'Integration Status', icon: '🔌' },
    { id: 'contacts', label: 'Contact Sync',        icon: '📋' },
    { id: 'backfill', label: 'Backfill Candidates', icon: '🔍' },
    { id: 'coa',      label: 'COA / Taxonomy Gate', icon: '📊' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Zoho Books Ops</h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only Phase 1 — Contact sync monitoring, integration status, backfill candidates.
          No mutations, backfill execution, retry, or accounting sync available here.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-slate-100 border-sky-500'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'status' && (
        <IntegrationStatusPanel
          status={status}
          loading={statusLoading}
          error={statusError}
          onRefresh={fetchStatus}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactSyncMonitor
          rows={contactRows}
          loading={contactLoading}
          error={contactError}
          hasMore={contactPagination.hasMore}
          nextCursor={contactPagination.nextCursor}
          summary={contactSummary}
          filters={contactFilters}
          onFilterChange={handleContactFilterChange}
          onLoadMore={handleLoadMore}
          onRefresh={() => {
            setContactRows([]);
            fetchContacts({ ...contactFilters, cursor: undefined });
          }}
        />
      )}

      {activeTab === 'backfill' && backfillData && (
        <BackfillCandidatesPanel
          rows={backfillData.rows}
          count={backfillData.count}
          realCount={backfillData.realCount}
          syntheticCount={backfillData.syntheticCount}
          warning={backfillData.warning}
          loading={backfillLoading}
          error={backfillError}
          onRefresh={fetchBackfill}
        />
      )}

      {activeTab === 'backfill' && !backfillData && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          {backfillLoading && (
            <div className="text-xs text-slate-500 text-center py-8">Loading candidates…</div>
          )}
          {backfillError && (
            <div className="rounded bg-red-900/30 border border-red-800 px-3 py-2 text-xs text-red-300">{backfillError}</div>
          )}
          {!backfillLoading && !backfillError && (
            <button
              onClick={fetchBackfill}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-4 py-1.5 rounded"
            >
              Load candidates
            </button>
          )}
        </div>
      )}

      {activeTab === 'coa' && <CoaTaxonomyGate />}
    </div>
  );
};
