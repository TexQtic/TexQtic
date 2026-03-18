/**
 * EscrowPanel — Tenant Plane (TECS-FBW-003-A + TECS-FBW-003-B)
 *
 * TECS-FBW-003-A: Read-only escrow list — VERIFIED_COMPLETE.
 * TECS-FBW-003-B: Mutation surfaces — create, record transaction, lifecycle transition.
 *
 * Constitutional compliance:
 *   D-017-A  No tenantId sent by client. tenantPost/tenantGet enforce TENANT realm.
 *            Server derives tenant scope exclusively from JWT claims (orgId).
 *   D-020-B  Derived balance displayed from GET /:escrowId server response only.
 *            No balance in list view. No client-side balance computation.
 *   D-020-C  aiTriggered is always false in TECS-FBW-003-B. Not exposed in UI.
 *   D-022-B/C ENTITY_FROZEN surfaced with an explicit named message.
 *   G-021    PENDING_APPROVAL transition result surfaces "awaiting approval"
 *            with maker-checker context.
 *
 * Role gating:
 *   ADJUSTMENT entry type restricted to OWNER / ADMIN roles only
 *   (PRODUCT-DEC-ESCROW-MUTATIONS). Follows EXPOrdersPanel pattern:
 *   getCurrentUser() fetched in parallel with list; safe-fail defaults to null
 *   → ADJUSTMENT option hidden.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  listEscrows,
  getEscrowDetail,
  createEscrow,
  recordEscrowTransaction,
  transitionEscrow,
  type EscrowAccount,
  type EscrowListParams,
  type EscrowDetailResponse,
  type TransactionEntryType,
  type TransactionDirection,
} from '../../services/escrowService';
import { getCurrentUser } from '../../services/authService';
import { APIError } from '../../services/apiClient';

interface Props {
  onBack: () => void;
}

// ─── Panel view state ─────────────────────────────────────────────────────────

type PanelView = 'LIST' | 'CREATE' | 'DETAIL';

// ─── Transaction two-phase confirm state ──────────────────────────────────────

type TxPhase = 'IDLE' | 'CONFIRMING' | 'SUBMITTING' | 'RESULT' | 'ERROR';

// ─── Transition outcome discriminated union (for UI rendering) ────────────────

type TransitionOutcome =
  | { kind: 'APPLIED'; fromStateKey: string; toStateKey: string }
  | { kind: 'PENDING_APPROVAL'; fromStateKey: string; requiredActors: string[] }
  | { kind: 'ESCALATION_REQUIRED'; message: string }
  | { kind: 'DENIED'; message: string }
  | { kind: 'FROZEN'; message: string };

type TransitionPhase = 'IDLE' | 'SUBMITTING' | 'RESULT' | 'ERROR';

// ─── State key → badge color ─────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  ACTIVE:    'bg-blue-100 text-blue-700',
  SETTLED:   'bg-emerald-100 text-emerald-700',
  CLOSED:    'bg-slate-200 text-slate-500',
  DISPUTED:  'bg-rose-100 text-rose-700',
};

function StateBadge({ stateKey }: { stateKey: string | null }) {
  const label = stateKey ?? '—';
  const classes = stateKey
    ? (STATE_COLORS[stateKey] ?? 'bg-amber-100 text-amber-700')
    : 'bg-slate-100 text-slate-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  );
}

// ─── Transition outcome display config ───────────────────────────────────────

const TRANSITION_CONFIG: Record<string, { bg: string; icon: string; title: string }> = {
  APPLIED:             { bg: 'bg-emerald-50 border-emerald-200', icon: '✅', title: 'Transition Applied' },
  PENDING_APPROVAL:    { bg: 'bg-violet-50 border-violet-200',   icon: '⏳', title: 'Pending Approval' },
  ESCALATION_REQUIRED: { bg: 'bg-amber-50 border-amber-200',     icon: '⚠️', title: 'Escalation Required' },
  DENIED:              { bg: 'bg-rose-50 border-rose-200',       icon: '🚫', title: 'Transition Denied' },
  FROZEN:              { bg: 'bg-red-50 border-red-200',         icon: '🔒', title: 'Entity Frozen' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof APIError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── Transaction entry type → badge color ────────────────────────────────────

const TX_ENTRY_COLORS: Record<string, string> = {
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
  HOLD:       'bg-blue-100 text-blue-700',
  REFUND:     'bg-rose-100 text-rose-700',
  RELEASE:    'bg-emerald-100 text-emerald-700',
};

// ─── EscrowPanel ─────────────────────────────────────────────────────────────

export function EscrowPanel({ onBack }: Props) {

  // ── Navigation ──
  const [panelView, setPanelView]           = useState<PanelView>('LIST');
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);

  // ── Role gating (TECS-FBW-AT-006 pattern) ──
  // getCurrentUser() fetched in parallel; safe-fail → null → ADJUSTMENT hidden.
  const [userRole, setUserRole]             = useState<string | null>(null);
  const canUseAdjustment = userRole === 'OWNER' || userRole === 'ADMIN';

  // ── LIST state ──
  const [escrows, setEscrows]               = useState<EscrowAccount[]>([]);
  const [count, setCount]                   = useState(0);
  const [listLoading, setListLoading]       = useState(true);
  const [listError, setListError]           = useState<string | null>(null);

  // ── DETAIL state ──
  const [detail, setDetail]                 = useState<EscrowDetailResponse | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [detailError, setDetailError]       = useState<string | null>(null);

  // ── CREATE form state ──
  const [createCurrency, setCreateCurrency] = useState('');
  const [createReason, setCreateReason]     = useState('');
  const [createLoading, setCreateLoading]   = useState(false);
  const [createError, setCreateError]       = useState<string | null>(null);
  const [createSuccess, setCreateSuccess]   = useState<string | null>(null);

  // ── RECORD TRANSACTION state ──
  const [txEntryType, setTxEntryType]       = useState<TransactionEntryType>('HOLD');
  const [txDirection, setTxDirection]       = useState<TransactionDirection>('CREDIT');
  const [txAmount, setTxAmount]             = useState('');
  const [txCurrency, setTxCurrency]         = useState('');
  const [txReason, setTxReason]             = useState('');
  const [txRefId, setTxRefId]               = useState('');
  const [txPhase, setTxPhase]               = useState<TxPhase>('IDLE');
  const [txResultMsg, setTxResultMsg]       = useState<string | null>(null);
  const [txError, setTxError]               = useState<string | null>(null);

  // ── LIFECYCLE TRANSITION state ──
  const [transToState, setTransToState]     = useState('');
  const [transReason, setTransReason]       = useState('');
  const [transActorRole, setTransActorRole] = useState('');
  const [transPhase, setTransPhase]         = useState<TransitionPhase>('IDLE');
  const [transOutcome, setTransOutcome]     = useState<TransitionOutcome | null>(null);
  const [transError, setTransError]         = useState<string | null>(null);

  // ── Load list (+ role in parallel) ──
  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params: EscrowListParams = { limit: 50, offset: 0 };
      // TECS-FBW-AT-006: getCurrentUser() fetched in parallel for role-gating; safe-fail
      // ensures escrows still load if /api/me is temporarily unavailable.
      const [res, meRes] = await Promise.all([
        listEscrows(params),
        getCurrentUser().catch(() => null),
      ]);
      setEscrows(res.escrows);
      setCount(res.count);
      setUserRole(meRes?.role ?? null);
    } catch (err) {
      setListError(friendlyError(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  // ── Load detail ──
  const loadDetail = useCallback(async (escrowId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await getEscrowDetail(escrowId);
      setDetail(res);
    } catch (err) {
      setDetailError(friendlyError(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Navigation handlers ──

  const openDetail = (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    // Reset transaction form
    setTxPhase('IDLE');
    setTxError(null);
    setTxResultMsg(null);
    setTxAmount('');
    setTxCurrency('');
    setTxReason('');
    setTxRefId('');
    setTxEntryType('HOLD');
    setTxDirection('CREDIT');
    // Reset transition form
    setTransPhase('IDLE');
    setTransOutcome(null);
    setTransError(null);
    setTransToState('');
    setTransReason('');
    setTransActorRole('');
    setPanelView('DETAIL');
    loadDetail(escrowId);
  };

  const openCreate = () => {
    setCreateCurrency('');
    setCreateReason('');
    setCreateLoading(false);
    setCreateError(null);
    setCreateSuccess(null);
    setPanelView('CREATE');
  };

  const goToList = () => {
    setPanelView('LIST');
    setSelectedEscrowId(null);
    loadList();
  };

  // ── Create escrow ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const currency = createCurrency.trim().toUpperCase();
    if (currency.length !== 3) {
      setCreateError('Currency must be an ISO 4217 3-letter code (e.g. USD).');
      return;
    }
    if (!createReason.trim()) {
      setCreateError('Reason is required.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await createEscrow({ currency, reason: createReason.trim() });
      setCreateSuccess(res.escrowId);
    } catch (err) {
      setCreateError(friendlyError(err));
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Record transaction — Phase 1: validate → CONFIRMING ──

  const handleTxValidate = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    const currency = txCurrency.trim().toUpperCase();
    if (currency.length !== 3) {
      setTxError('Currency must be a valid ISO 4217 3-letter code.');
      return;
    }
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      setTxError('Amount must be a positive number.');
      return;
    }
    if (!txReason.trim()) {
      setTxError('Reason is required.');
      return;
    }
    setTxPhase('CONFIRMING');
  };

  // ── Record transaction — Phase 2: confirmed submit ──

  const handleTxSubmit = async () => {
    if (!selectedEscrowId) return;
    setTxPhase('SUBMITTING');
    try {
      const res = await recordEscrowTransaction(selectedEscrowId, {
        entryType:   txEntryType,
        direction:   txDirection,
        amount:      parseFloat(txAmount),
        currency:    txCurrency.trim().toUpperCase(),
        reason:      txReason.trim(),
        referenceId: txRefId.trim() || null,
      });
      const msg = res.status === 'DUPLICATE_REFERENCE'
        ? `Duplicate detected — existing transaction ID: ${res.transactionId}`
        : `Transaction recorded — ID: ${res.transactionId}`;
      setTxResultMsg(msg);
      setTxPhase('RESULT');
      // Reload detail to reflect updated balance and transaction list
      loadDetail(selectedEscrowId);
    } catch (err) {
      setTxError(friendlyError(err));
      setTxPhase('ERROR');
    }
  };

  // ── Lifecycle transition ──

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscrowId) return;
    setTransError(null);
    if (!transToState.trim()) { setTransError('Target state key is required.'); return; }
    if (!transReason.trim())  { setTransError('Reason is required.'); return; }
    if (!transActorRole.trim()) { setTransError('Actor role is required.'); return; }
    setTransPhase('SUBMITTING');
    try {
      const res = await transitionEscrow(selectedEscrowId, {
        toStateKey: transToState.trim().toUpperCase(),
        reason:     transReason.trim(),
        actorRole:  transActorRole.trim(),
      });
      // Narrow discriminated union for safe property access
      if (res.status === 'APPLIED') {
        setTransOutcome({ kind: 'APPLIED', fromStateKey: res.fromStateKey, toStateKey: res.toStateKey });
      } else {
        // PENDING_APPROVAL (HTTP 202)
        setTransOutcome({ kind: 'PENDING_APPROVAL', fromStateKey: res.fromStateKey, requiredActors: res.requiredActors });
      }
      setTransPhase('RESULT');
      loadDetail(selectedEscrowId);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.code === 'ENTITY_FROZEN') {
          // D-022-B/C: freeze gate surfaced with explicit named state
          setTransOutcome({ kind: 'FROZEN', message: err.message });
          setTransPhase('RESULT');
        } else if (err.code === 'STATE_MACHINE_DENIED') {
          // ESCALATION_REQUIRED and DENIED both arrive as STATE_MACHINE_DENIED (HTTP 422).
          // Distinguish by message pattern from escrow.service.ts.
          if (err.message.includes('escalation record')) {
            setTransOutcome({ kind: 'ESCALATION_REQUIRED', message: err.message });
          } else {
            setTransOutcome({ kind: 'DENIED', message: err.message });
          }
          setTransPhase('RESULT');
        } else {
          setTransError(err.message);
          setTransPhase('ERROR');
        }
      } else {
        setTransError(friendlyError(err));
        setTransPhase('ERROR');
      }
    }
  };

  // ── RENDER: LIST ──────────────────────────────────────────────────────────

  if (panelView === 'LIST') {
    return (
      <div className="p-6 space-y-6 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-700 transition text-sm font-medium"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Escrow Accounts</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tenant escrow lifecycle. Click a row to view detail and manage.
              </p>
            </div>
          </div>
          {!listLoading && !listError && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">{count} account{count !== 1 ? 's' : ''}</span>
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
              >
                + New Escrow
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {listLoading && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-3xl mb-3">⏳</div>
            <p className="text-sm">Loading escrow accounts…</p>
          </div>
        )}

        {/* Error */}
        {!listLoading && listError && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
            <strong>Error loading escrow accounts:</strong> {listError}
          </div>
        )}

        {/* Empty */}
        {!listLoading && !listError && escrows.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-sm font-medium">No escrow accounts found.</p>
            <p className="text-xs mt-1">Create your first escrow account to get started.</p>
            <button
              onClick={openCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
            >
              + New Escrow
            </button>
          </div>
        )}

        {/* Table */}
        {!listLoading && !listError && escrows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Escrow ID</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Currency</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">State</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {escrows.map(esc => (
                    <tr
                      key={esc.id}
                      onClick={() => openDetail(esc.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700" title={esc.id}>
                          {truncateId(esc.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700 uppercase text-xs">{esc.currency}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StateBadge stateKey={esc.lifecycleStateKey} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(esc.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-blue-600 font-medium">View →</span>
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

  // ── RENDER: CREATE ────────────────────────────────────────────────────────

  if (panelView === 'CREATE') {
    return (
      <div className="p-6 max-w-lg space-y-6 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={goToList} className="text-slate-400 hover:text-slate-700 transition text-sm font-medium">
            ← Back to list
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Escrow Account</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              New accounts start in DRAFT state. D-017-A: no tenant identifier sent.
            </p>
          </div>
        </div>

        {/* Success state */}
        {createSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-bold text-emerald-800">✅ Escrow account created</p>
            <p className="text-xs text-emerald-700 font-mono">Escrow ID: {createSuccess}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => openDetail(createSuccess)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition"
              >
                View Detail
              </button>
              <button
                onClick={goToList}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium border border-slate-200 rounded-lg transition"
              >
                Back to list
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">

            <div>
              <label htmlFor="create-currency" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                Currency <span className="text-rose-500">*</span>
              </label>
              <input
                id="create-currency"
                type="text"
                maxLength={3}
                value={createCurrency}
                onChange={e => setCreateCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">ISO 4217 3-letter code</p>
            </div>

            <div>
              <label htmlFor="create-reason" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="create-reason"
                value={createReason}
                onChange={e => setCreateReason(e.target.value)}
                rows={3}
                placeholder="Justification for creating this escrow account"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {createError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
                {createError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {createLoading ? 'Creating…' : 'Create Escrow Account'}
              </button>
              <button
                type="button"
                onClick={goToList}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium border border-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ── RENDER: DETAIL ────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={goToList} className="text-slate-400 hover:text-slate-700 transition text-sm font-medium">
          ← Back to list
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Escrow Detail</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedEscrowId}</p>
        </div>
      </div>

      {/* Detail loading */}
      {detailLoading && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-3xl mb-3">⏳</div>
          <p className="text-sm">Loading escrow detail…</p>
        </div>
      )}

      {/* Detail error */}
      {!detailLoading && detailError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
          <strong>Error:</strong> {detailError}
        </div>
      )}

      {/* Detail content */}
      {!detailLoading && detail && (
        <div className="space-y-6">

          {/* ── Identity / context card ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Escrow ID</p>
                <p className="text-xs font-mono text-slate-700" title={detail.escrow.id}>{truncateId(detail.escrow.id)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Currency</p>
                <p className="text-sm font-bold text-slate-800 uppercase">{detail.escrow.currency}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">State</p>
                <StateBadge stateKey={detail.escrow.lifecycleStateKey} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Created</p>
                <p className="text-xs text-slate-600">{formatDate(detail.escrow.createdAt)}</p>
              </div>
            </div>

            {/* Derived balance — D-020-B */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
                Derived Balance <span className="normal-case font-normal">(server-computed · D-020-B)</span>
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {detail.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
                <span className="text-sm font-semibold text-slate-500 uppercase">{detail.escrow.currency}</span>
              </p>
            </div>
          </div>

          {/* ── Recent transactions ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Recent Transactions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Up to 20 most recent ledger entries</p>
            </div>

            {detail.recentTransactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left text-slate-500 uppercase tracking-wide px-4 py-2 font-semibold">Type</th>
                      <th className="text-left text-slate-500 uppercase tracking-wide px-4 py-2 font-semibold">Direction</th>
                      <th className="text-right text-slate-500 uppercase tracking-wide px-4 py-2 font-semibold">Amount</th>
                      <th className="text-left text-slate-500 uppercase tracking-wide px-4 py-2 font-semibold">Reference</th>
                      <th className="text-left text-slate-500 uppercase tracking-wide px-4 py-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detail.recentTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${
                            TX_ENTRY_COLORS[tx.entryType] ?? 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {tx.entryType}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={tx.direction === 'CREDIT' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                            {tx.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-700">
                          {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="px-4 py-2 text-slate-400 font-mono">{tx.referenceId ?? '—'}</td>
                        <td className="px-4 py-2 text-slate-500">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Record Transaction ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Record Transaction</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Append an immutable ledger entry.
                {!canUseAdjustment && (
                  <span className="ml-1 text-amber-600">ADJUSTMENT requires elevated role (OWNER/ADMIN).</span>
                )}
              </p>
            </div>

            {/* Result */}
            {txPhase === 'RESULT' && txResultMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                ✅ {txResultMsg}
                <button
                  onClick={() => { setTxPhase('IDLE'); setTxResultMsg(null); setTxAmount(''); setTxCurrency(''); setTxReason(''); setTxRefId(''); setTxEntryType('HOLD'); setTxDirection('CREDIT'); }}
                  className="ml-3 text-xs text-emerald-600 hover:text-emerald-800 font-medium underline"
                >
                  Record another
                </button>
              </div>
            )}

            {/* API error */}
            {txPhase === 'ERROR' && txError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                {txError}
                <button
                  onClick={() => { setTxPhase('IDLE'); setTxError(null); }}
                  className="ml-3 text-xs text-rose-600 hover:text-rose-800 font-medium underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Confirmation step (two-phase — immutability gate) */}
            {(txPhase === 'CONFIRMING' || txPhase === 'SUBMITTING') && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-amber-800">⚠️ Confirm Ledger Entry</p>
                <p className="text-xs text-amber-700">
                  Ledger entries are <strong>immutable</strong> once recorded. Please verify before submitting.
                </p>
                <div className="bg-white rounded-lg border border-amber-200 p-3 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-semibold">{txEntryType}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Direction</span><span className="font-semibold">{txDirection}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-mono font-semibold">{txAmount} {txCurrency.toUpperCase()}</span></div>
                  {txRefId && <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono">{txRefId}</span></div>}
                  <div className="pt-1 border-t border-amber-100">
                    <span className="text-slate-500">Reason</span>
                    <p className="mt-0.5 text-slate-700">{txReason}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleTxSubmit}
                    disabled={txPhase === 'SUBMITTING'}
                    className="flex-1 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    {txPhase === 'SUBMITTING' ? 'Submitting…' : 'Confirm & Record'}
                  </button>
                  <button
                    onClick={() => setTxPhase('IDLE')}
                    disabled={txPhase === 'SUBMITTING'}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium border border-slate-200 rounded-lg transition disabled:opacity-50"
                  >
                    Go back
                  </button>
                </div>
              </div>
            )}

            {/* Transaction form */}
            {txPhase === 'IDLE' && (
              <form onSubmit={handleTxValidate} className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tx-entry-type" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                      Entry Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="tx-entry-type"
                      value={txEntryType}
                      onChange={e => setTxEntryType(e.target.value as TransactionEntryType)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="HOLD">HOLD</option>
                      <option value="RELEASE">RELEASE</option>
                      <option value="REFUND">REFUND</option>
                      {/* ADJUSTMENT restricted to elevated roles — PRODUCT-DEC-ESCROW-MUTATIONS */}
                      {canUseAdjustment && <option value="ADJUSTMENT">ADJUSTMENT</option>}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tx-direction" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                      Direction <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="tx-direction"
                      value={txDirection}
                      onChange={e => setTxDirection(e.target.value as TransactionDirection)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CREDIT">CREDIT (funds in)</option>
                      <option value="DEBIT">DEBIT (funds out)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tx-amount" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                      Amount <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="tx-amount"
                      type="number"
                      min="0.000001"
                      step="any"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="tx-currency" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                      Currency <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="tx-currency"
                      type="text"
                      maxLength={3}
                      value={txCurrency}
                      onChange={e => setTxCurrency(e.target.value.toUpperCase())}
                      placeholder={detail.escrow.currency}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Must match escrow ({detail.escrow.currency})</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="tx-reason" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="tx-reason"
                    value={txReason}
                    onChange={e => setTxReason(e.target.value)}
                    rows={2}
                    placeholder="Justification for this ledger entry"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="tx-ref-id" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Reference ID <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    id="tx-ref-id"
                    type="text"
                    maxLength={500}
                    value={txRefId}
                    onChange={e => setTxRefId(e.target.value)}
                    placeholder="External reference for idempotency"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {txError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
                    {txError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Review &amp; Confirm
                </button>
              </form>
            )}
          </div>

          {/* ── Lifecycle Transition ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Lifecycle Transition</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Request a state change for this escrow account. Current state:{' '}
                <span className="font-semibold">{detail.escrow.lifecycleStateKey ?? '—'}</span>
              </p>
            </div>

            {/* Transition outcome — all four named states + frozen */}
            {transPhase === 'RESULT' && transOutcome && (
              <div className={`rounded-xl border p-4 space-y-2 ${TRANSITION_CONFIG[transOutcome.kind]?.bg ?? 'bg-slate-50 border-slate-200'}`}>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span>{TRANSITION_CONFIG[transOutcome.kind]?.icon}</span>
                  <span>{TRANSITION_CONFIG[transOutcome.kind]?.title}</span>
                </p>

                {transOutcome.kind === 'APPLIED' && (
                  <p className="text-xs text-slate-700">
                    State transitioned from <strong>{transOutcome.fromStateKey}</strong> to <strong>{transOutcome.toStateKey}</strong>.
                  </p>
                )}

                {transOutcome.kind === 'PENDING_APPROVAL' && (
                  <div className="text-xs text-slate-700 space-y-1">
                    <p>The transition requires maker-checker approval before taking effect (G-021).</p>
                    <p>Awaiting approval from: <strong>{transOutcome.requiredActors.join(', ')}</strong></p>
                  </div>
                )}

                {transOutcome.kind === 'ESCALATION_REQUIRED' && (
                  <p className="text-xs text-amber-800">
                    {transOutcome.message} No state change was applied. Contact your administrator.
                  </p>
                )}

                {transOutcome.kind === 'DENIED' && (
                  <p className="text-xs text-rose-700">{transOutcome.message}</p>
                )}

                {transOutcome.kind === 'FROZEN' && (
                  <p className="text-xs text-red-700">
                    This entity is frozen due to an active escalation (D-022-B/C).
                    Lifecycle transitions are blocked until the freeze is lifted by an administrator.
                  </p>
                )}

                <button
                  onClick={() => { setTransPhase('IDLE'); setTransOutcome(null); }}
                  className="mt-1 text-xs text-slate-500 hover:text-slate-700 font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Transition non-outcome error */}
            {transPhase === 'ERROR' && transError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                {transError}
                <button
                  onClick={() => { setTransPhase('IDLE'); setTransError(null); }}
                  className="ml-3 text-xs text-rose-600 hover:text-rose-800 font-medium underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Transition form */}
            {(transPhase === 'IDLE' || transPhase === 'ERROR' || transPhase === 'SUBMITTING') && (
              <form onSubmit={handleTransition} className="space-y-4">

                <div>
                  <label htmlFor="trans-to-state" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Target State Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="trans-to-state"
                    type="text"
                    value={transToState}
                    onChange={e => setTransToState(e.target.value.toUpperCase())}
                    placeholder="e.g. ACTIVE"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="trans-actor-role" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Actor Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="trans-actor-role"
                    type="text"
                    value={transActorRole}
                    onChange={e => setTransActorRole(e.target.value)}
                    placeholder="e.g. tenant-admin"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="trans-reason" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="trans-reason"
                    value={transReason}
                    onChange={e => setTransReason(e.target.value)}
                    rows={2}
                    placeholder="Justification for this lifecycle transition"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {transError && transPhase === 'IDLE' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
                    {transError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={transPhase === 'SUBMITTING'}
                  className="w-full py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
                >
                  {transPhase === 'SUBMITTING' ? 'Transitioning…' : 'Request Transition'}
                </button>
              </form>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

