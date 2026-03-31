/**
 * TradesPanel — Tenant Plane lifecycle exposure (EXC-ENABLER-004)
 *
 * Surfaces the existing tenant trade routes for list, detail, and lifecycle
 * transition actions without changing backend lifecycle logic.
 *
 * Constitutional compliance:
 *   D-017-A  No orgId / tenantId sent by client — tenantGet() TENANT realm guard is sufficient.
 *            Server derives tenant scope exclusively from JWT claims (orgId).
 *   D-020-B  No balance or financial totals displayed (read-only trade list surface only).
 *
 * Scope (EXC-ENABLER-004):
 *   ✅ Trade list
 *   ✅ Trade detail view
 *   ✅ Existing lifecycle transition route exposure
 *   ❌ New lifecycle rules
 *   ❌ Backend contract changes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIError } from '../../services/apiClient';
import { getCurrentUser } from '../../services/authService';
import {
  createTradeEscrow,
  getTenantTradeDetail,
  listTenantTrades,
  transitionTenantTrade,
  type TenantTrade,
} from '../../services/tradeService';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  onBack: () => void;
  initialTradeId?: string | null;
  onInitialTradeHandled?: () => void;
}

// ─── Lifecycle State → Badge color map ───────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  RFQ_SENT: 'bg-sky-100 text-sky-700',
  NEGOTIATION: 'bg-indigo-100 text-indigo-700',
  PENDING_COMPLIANCE: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  ORDER_CONFIRMED: 'bg-cyan-100 text-cyan-700',
  FULFILLMENT: 'bg-blue-100 text-blue-700',
  SETTLEMENT_PENDING: 'bg-violet-100 text-violet-700',
  SETTLEMENT_ACKNOWLEDGED: 'bg-fuchsia-100 text-fuchsia-700',
  ACTIVE:    'bg-blue-100 text-blue-700',
  SETTLED:   'bg-emerald-100 text-emerald-700',
  DISPUTED:  'bg-rose-100 text-rose-700',
  ESCALATED: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-amber-100 text-amber-700',
};

const ELEVATED_TENANT_ROLES = new Set(['OWNER', 'ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN']);

// Mirrors the seeded TRADE transitions that include TENANT_ADMIN as an allowed actor.
const TENANT_VISIBLE_TRANSITIONS: Record<string, Array<{ toStateKey: string; label: string; tone: string }>> = {
  DRAFT: [
    { toStateKey: 'CANCELLED', label: 'Cancel', tone: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
  ],
  RFQ_SENT: [
    { toStateKey: 'NEGOTIATION', label: 'Move to Negotiation', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
    { toStateKey: 'REJECTED', label: 'Reject', tone: 'bg-slate-700 text-white hover:bg-slate-800' },
    { toStateKey: 'CANCELLED', label: 'Cancel', tone: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
  ],
  NEGOTIATION: [
    { toStateKey: 'PENDING_COMPLIANCE', label: 'Send to Compliance', tone: 'bg-amber-600 text-white hover:bg-amber-700' },
    { toStateKey: 'REJECTED', label: 'Reject', tone: 'bg-slate-700 text-white hover:bg-slate-800' },
    { toStateKey: 'CANCELLED', label: 'Cancel', tone: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
  ],
  ORDER_CONFIRMED: [
    { toStateKey: 'FULFILLMENT', label: 'Start Fulfillment', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
    { toStateKey: 'DISPUTED', label: 'Mark Disputed', tone: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' },
  ],
  FULFILLMENT: [
    { toStateKey: 'SETTLEMENT_PENDING', label: 'Mark Settlement Pending', tone: 'bg-violet-600 text-white hover:bg-violet-700' },
    { toStateKey: 'DISPUTED', label: 'Mark Disputed', tone: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' },
  ],
  SETTLEMENT_PENDING: [
    { toStateKey: 'DISPUTED', label: 'Mark Disputed', tone: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' },
  ],
  SETTLEMENT_ACKNOWLEDGED: [
    { toStateKey: 'CLOSED', label: 'Close Trade', tone: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  ],
  DISPUTED: [
    { toStateKey: 'NEGOTIATION', label: 'Return to Negotiation', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
    { toStateKey: 'ESCALATED', label: 'Escalate', tone: 'bg-orange-600 text-white hover:bg-orange-700' },
  ],
};

type PanelView = 'LIST' | 'DETAIL';

type TransitionOutcome =
  | { kind: 'APPLIED'; fromStateKey: string; toStateKey: string }
  | { kind: 'PENDING_APPROVAL'; fromStateKey: string; requiredActors: string[] }
  | { kind: 'ERROR'; message: string };

function StatusBadge({ stateKey }: Readonly<{ stateKey: string }>) {
  const classes = STATUS_COLORS[stateKey] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {stateKey}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatAmount(amount: number | string, currency: string): string {
  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(numericAmount)) {
    return `${currency} —`;
  }

  return `${currency} ${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof APIError) {
    return err.message;
  }

  return err instanceof Error ? err.message : 'Request failed.';
}

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 break-all">{value}</span>
    </div>
  );
}

// ─── TradesPanel ─────────────────────────────────────────────────────────────

export function TradesPanel({ onBack, initialTradeId = null, onInitialTradeHandled }: Readonly<Props>) {
  const [panelView, setPanelView] = useState<PanelView>('LIST');
  const [trades, setTrades] = useState<TenantTrade[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TenantTrade | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionLoading, setTransitionLoading] = useState<string | null>(null);
  const [transitionOutcome, setTransitionOutcome] = useState<TransitionOutcome | null>(null);
  const [escrowReason, setEscrowReason] = useState('');
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowOutcome, setEscrowOutcome] = useState<string | null>(null);
  const initialTradeHandledRef = useRef<string | null>(null);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, meRes] = await Promise.all([
        listTenantTrades({ limit: 50 }),
        getCurrentUser().catch(() => null),
      ]);
      setTrades(res.trades);
      setCount(res.count);
      setUserRole(meRes?.role ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTradeDetail = useCallback(async (tradeId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const trade = await getTenantTradeDetail(tradeId);
      setSelectedTrade(trade);
      setTrades(current => current.map(item => item.id === trade.id ? trade : item));
    } catch (err) {
      setDetailError(friendlyError(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (!initialTradeId || initialTradeHandledRef.current === initialTradeId) {
      return;
    }

    initialTradeHandledRef.current = initialTradeId;
    setPanelView('DETAIL');
    setSelectedTradeId(initialTradeId);
    setTransitionReason('');
    setTransitionOutcome(null);
    setEscrowReason('');
    setEscrowOutcome(null);
    void loadTradeDetail(initialTradeId);
    onInitialTradeHandled?.();
  }, [initialTradeId, loadTradeDetail, onInitialTradeHandled]);

  const openTradeDetail = async (tradeId: string) => {
    setPanelView('DETAIL');
    setSelectedTradeId(tradeId);
    setTransitionReason('');
    setTransitionOutcome(null);
    setEscrowReason('');
    setEscrowOutcome(null);
    await loadTradeDetail(tradeId);
  };

  const goBackToList = async () => {
    setPanelView('LIST');
    setSelectedTradeId(null);
    setSelectedTrade(null);
    setDetailError(null);
    setTransitionReason('');
    setTransitionOutcome(null);
    setEscrowReason('');
    setEscrowOutcome(null);
    await loadTrades();
  };

  const availableTransitions = selectedTrade
    ? TENANT_VISIBLE_TRANSITIONS[selectedTrade.lifecycleState?.stateKey ?? ''] ?? []
    : [];

  const canTransitionTrade = ELEVATED_TENANT_ROLES.has(userRole ?? '') && availableTransitions.length > 0;

  const handleTransition = async (toStateKey: string) => {
    if (!selectedTrade || !selectedTradeId || !userRole) {
      return;
    }
    if (!transitionReason.trim()) {
      setTransitionOutcome({ kind: 'ERROR', message: 'Reason is required before transitioning a trade.' });
      return;
    }

    setTransitionLoading(toStateKey);
    setTransitionOutcome(null);
    try {
      const result = await transitionTenantTrade(selectedTradeId, {
        toStateKey,
        reason: transitionReason.trim(),
        actorRole: userRole,
      });

      if (result.status === 'APPLIED') {
        setTransitionOutcome({ kind: 'APPLIED', fromStateKey: result.fromStateKey, toStateKey: result.toStateKey });
      } else {
        setTransitionOutcome({ kind: 'PENDING_APPROVAL', fromStateKey: result.fromStateKey, requiredActors: result.requiredActors });
      }

      await loadTradeDetail(selectedTradeId);
    } catch (err) {
      setTransitionOutcome({ kind: 'ERROR', message: friendlyError(err) });
    } finally {
      setTransitionLoading(null);
    }
  };

  const handleCreateEscrow = async () => {
    if (!selectedTrade || !selectedTradeId) {
      return;
    }

    if (selectedTrade.escrowId) {
      setEscrowOutcome(`Trade already linked to escrow ${selectedTrade.escrowId}.`);
      return;
    }

    if (!escrowReason.trim()) {
      setEscrowOutcome('Reason is required before creating escrow from a trade.');
      return;
    }

    setEscrowLoading(true);
    setEscrowOutcome(null);
    try {
      const result = await createTradeEscrow(selectedTradeId, { reason: escrowReason.trim() });
      setEscrowReason('');
      setEscrowOutcome(`Escrow ${result.escrowId} created and linked to this trade.`);
      await loadTradeDetail(selectedTradeId);
    } catch (err) {
      setEscrowOutcome(friendlyError(err));
    } finally {
      setEscrowLoading(false);
    }
  };

  if (panelView === 'DETAIL') {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => void goBackToList()}
              className="text-sm text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
              type="button"
            >
              ← Back to Trades
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Trade Detail</h1>
              <p className="text-sm text-slate-500 mt-0.5">Review the current trade state and trigger existing lifecycle actions.</p>
            </div>
          </div>
          {selectedTradeId && (
            <button
              type="button"
              onClick={() => void loadTradeDetail(selectedTradeId)}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              ↻ Refresh Detail
            </button>
          )}
        </div>

        {detailLoading && <LoadingState />}
        {detailError && !detailLoading && (
          <ErrorState error={{ message: detailError }} onRetry={() => selectedTradeId ? void loadTradeDetail(selectedTradeId) : undefined} />
        )}
        {!detailLoading && !detailError && selectedTrade && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailRow label="Trade Reference" value={selectedTrade.tradeReference} />
              <DetailRow label="Status" value={selectedTrade.lifecycleState ? <StatusBadge stateKey={selectedTrade.lifecycleState.stateKey} /> : '—'} />
              <DetailRow label="Gross Amount" value={formatAmount(selectedTrade.grossAmount, selectedTrade.currency)} />
              <DetailRow label="Buyer Org" value={<span className="font-mono text-xs">{selectedTrade.buyerOrgId}</span>} />
              <DetailRow label="Seller Org" value={<span className="font-mono text-xs">{selectedTrade.sellerOrgId}</span>} />
              <DetailRow label="Currency" value={selectedTrade.currency} />
              <DetailRow
                label="Escrow"
                value={selectedTrade.escrowId ? <span className="font-mono text-xs">{selectedTrade.escrowId}</span> : 'Not linked'}
              />
              <DetailRow label="Created" value={formatDateTime(selectedTrade.createdAt)} />
              <DetailRow label="Updated" value={formatDateTime(selectedTrade.updatedAt)} />
              <DetailRow label="Trade ID" value={<span className="font-mono text-xs">{selectedTrade.id}</span>} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Escrow Continuity</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Create and attach an escrow directly from this trade context. Currency is derived from the trade on the server.
                </p>
              </div>

              {selectedTrade.escrowId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  This trade is already linked to escrow <span className="font-mono text-xs">{selectedTrade.escrowId}</span>.
                </div>
              ) : (
                <>
                  <label className="block space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escrow Creation Reason</span>
                    <textarea
                      value={escrowReason}
                      onChange={event => setEscrowReason(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                      placeholder="Provide the mandatory reason for creating escrow from this trade"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={escrowLoading}
                    onClick={() => void handleCreateEscrow()}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {escrowLoading ? 'Creating Escrow…' : 'Create Escrow'}
                  </button>
                </>
              )}

              {escrowOutcome && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {escrowOutcome}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lifecycle Actions</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Actions shown here mirror the seeded trade transitions that are valid for the existing tenant transition route.
                </p>
              </div>

              {!ELEVATED_TENANT_ROLES.has(userRole ?? '') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Lifecycle actions are limited to elevated tenant roles (OWNER / ADMIN posture).
                </div>
              )}

              {ELEVATED_TENANT_ROLES.has(userRole ?? '') && availableTransitions.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No tenant-triggerable transitions are available from the current state.
                </div>
              )}

              {availableTransitions.length > 0 && (
                <>
                  <label className="block space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Transition Reason</span>
                    <textarea
                      value={transitionReason}
                      onChange={event => setTransitionReason(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                      placeholder="Provide the mandatory reason for this lifecycle change"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {availableTransitions.map(action => (
                      <button
                        key={action.toStateKey}
                        type="button"
                        disabled={!canTransitionTrade || transitionLoading !== null}
                        onClick={() => void handleTransition(action.toStateKey)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                      >
                        {transitionLoading === action.toStateKey ? 'Processing…' : action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {transitionOutcome?.kind === 'APPLIED' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  State transitioned from <strong>{transitionOutcome.fromStateKey}</strong> to <strong>{transitionOutcome.toStateKey}</strong>.
                </div>
              )}

              {transitionOutcome?.kind === 'PENDING_APPROVAL' && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                  Transition request recorded from <strong>{transitionOutcome.fromStateKey}</strong>. Awaiting approval from <strong>{transitionOutcome.requiredActors.join(', ')}</strong>.
                </div>
              )}

              {transitionOutcome?.kind === 'ERROR' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {transitionOutcome.message}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700 transition flex items-center gap-1"
          type="button"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trades</h1>
          <p className="text-sm text-slate-500 mt-0.5">G-017 trade records for your organisation with bounded lifecycle exposure.</p>
        </div>
      </div>

      {/* States */}
      {loading && <LoadingState />}
      {error && !loading && (
        <ErrorState error={{ message: error }} onRetry={loadTrades} />
      )}
      {!loading && !error && trades.length === 0 && (
        <EmptyState title="No trades found" message="No trade records found for your organisation." />
      )}

      {/* Table */}
      {!loading && !error && trades.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {count} trade{count === 1 ? '' : 's'} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Trade ID</th>
                  <th className="px-6 py-3 text-left">Reference</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Gross Amount</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600" title={trade.id}>
                      {truncateId(trade.id)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {trade.tradeReference}
                    </td>
                    <td className="px-6 py-4">
                      {trade.lifecycleState ? (
                        <StatusBadge stateKey={trade.lifecycleState.stateKey} />
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatAmount(trade.grossAmount, trade.currency)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(trade.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void openTradeDetail(trade.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
