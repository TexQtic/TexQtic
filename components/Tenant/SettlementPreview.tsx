/**
 * SettlementPreview — Tenant Plane (TECS-FBW-004)
 *
 * Implements the G-019 two-phase settlement preview-confirm flow:
 *   Phase 1: Input form → POST /api/tenant/settlements/preview → display balance result
 *   Phase 2: Confirm form → POST /api/tenant/settlements → display outcome
 *
 * Constitutional compliance:
 *   D-017-A  No tenantId sent by client — tenantPost() TENANT realm guard is sufficient.
 *            Server derives tenant scope exclusively from JWT claims.
 *            Actor posture is also derived server-side from the authenticated session.
 *   D-020-B  Preview step is mandatory before commit. The confirm form is only presented
 *            after a successful preview with wouldSucceed=true. Balance values are used
 *            as-is from the API response — never cached, synthesized, or re-used.
 *
 * Scope (TECS-FBW-004):
 *   ✅ Settlement preview (POST /api/tenant/settlements/preview)
 *   ✅ Settlement confirm (POST /api/tenant/settlements)
 *   ✅ APPLIED / PENDING_APPROVAL / ERROR outcome handling
 *   ❌ aiTriggered=true path — out of scope; AI_HUMAN_CONFIRMATION_REQUIRED surfaced if returned
 *   ❌ Maker/checker role selection UI — out of scope
 *   ❌ Control-plane settlement — out of scope
 */

import React, { useState } from 'react';
import {
  previewSettlement,
  settleEscrow,
  type PreviewOkResult,
  type SettleAppliedResult,
  type SettlePendingResult,
} from '../../services/settlementService';
import { LoadingState } from '../shared/LoadingState';
import { APIError } from '../../services/apiClient';

interface Props {
  onBack: () => void;
}

// ─── Phase state machine ──────────────────────────────────────────────────────

type Phase =
  | 'INPUT'
  | 'PREVIEW_LOADING'
  | 'PREVIEW_DONE'
  | 'CONFIRM_LOADING'
  | 'SETTLED';

// ─── Error code → user-friendly message ──────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_ESCROW_FUNDS:
    'Insufficient funds in the escrow account to cover this settlement amount.',
  ENTITY_FROZEN:
    'This trade or escrow account is currently frozen and cannot be settled.',
  DUPLICATE_REFERENCE:
    'A settlement with this reference ID already exists. Use a unique reference ID.',
  STATE_MACHINE_DENIED:
    'This trade is not in a state that allows settlement.',
  TRADE_DISPUTED:
    'This trade is under active dispute and cannot be settled.',
  AI_HUMAN_CONFIRMATION_REQUIRED:
    'This settlement was flagged for an AI-triggered flow. Contact your administrator — this path is not supported in this interface.',
  TRADE_NOT_FOUND:
    'Trade not found. Verify the trade ID and try again.',
  ESCROW_NOT_FOUND:
    'Escrow account not found. Verify the escrow ID and try again.',
  TRADE_ESCROW_MISMATCH:
    'The selected escrow account is not linked to the supplied trade. Check the pair and try again.',
  INVALID_AMOUNT:
    'The settlement amount is invalid. Amount must be greater than zero.',
  MAKER_CHECKER_REQUIRED:
    'This settlement requires maker-checker approval via an authorised administrator.',
  DB_ERROR:
    'A server error occurred. Please try again.',
};

function resolveErrorMessage(code: string | undefined, fallback: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatBalance(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── SettlementPreview ────────────────────────────────────────────────────────

export function SettlementPreview({ onBack }: Readonly<Props>) {
  // Phase 1 form fields
  const [tradeId, setTradeId]   = useState('');
  const [escrowId, setEscrowId] = useState('');
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState('USD');

  // Phase 2 form fields
  const [referenceId, setReferenceId] = useState('');
  const [reason, setReason]           = useState('');

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('INPUT');

  // Preview results
  const [previewResult, setPreviewResult] = useState<PreviewOkResult | null>(null);
  const [previewError, setPreviewError]   = useState<string | null>(null);

  // Settle results
  const [settleApplied, setSettleApplied] = useState<SettleAppliedResult | null>(null);
  const [settlePending, setSettlePending] = useState<SettlePendingResult | null>(null);
  const [settleError, setSettleError]     = useState<string | null>(null);

  const parsedAmount = Number.parseFloat(amount);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  // D-020-B: confirm is only available when preview explicitly reported wouldSucceed=true
  const canConfirm = previewResult?.wouldSucceed === true;

  // ─── Phase 1: Submit preview ────────────────────────────────────────────────
  const handlePreview = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tradeId.trim() || !escrowId.trim() || !isValidAmount || !currency.trim()) return;

    setPhase('PREVIEW_LOADING');
    setPreviewResult(null);
    setPreviewError(null);

    try {
      const res = await previewSettlement({
        tradeId:  tradeId.trim(),
        escrowId: escrowId.trim(),
        amount:   parsedAmount,
        currency: currency.trim().toUpperCase(),
      });
      if (res.status === 'ERROR') {
        setPreviewError(resolveErrorMessage(res.code, res.message));
      } else {
        setPreviewResult(res);
      }
      setPhase('PREVIEW_DONE');
    } catch (err) {
      const code = err instanceof APIError ? err.code : undefined;
      const msg  = err instanceof Error ? err.message : 'Preview request failed.';
      setPreviewError(resolveErrorMessage(code, msg));
      setPhase('PREVIEW_DONE');
    }
  };

  // ─── Phase 2: Submit confirm ────────────────────────────────────────────────
  const handleConfirm = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!referenceId.trim() || !reason.trim()) return;

    setPhase('CONFIRM_LOADING');
    setSettleApplied(null);
    setSettlePending(null);
    setSettleError(null);

    try {
      const res = await settleEscrow({
        tradeId:     tradeId.trim(),
        escrowId:    escrowId.trim(),
        amount:      parsedAmount,
        currency:    currency.trim().toUpperCase(),
        referenceId: referenceId.trim(),
        reason:      reason.trim(),
      });
      setPhase('SETTLED');
      if (res.status === 'APPLIED') {
        setSettleApplied(res);
      } else if (res.status === 'PENDING_APPROVAL') {
        setSettlePending(res);
      } else {
        setSettleError(resolveErrorMessage(res.code, res.message));
      }
    } catch (err) {
      const code = err instanceof APIError ? err.code : undefined;
      const msg  = err instanceof Error ? err.message : 'Settlement request failed.';
      setSettleError(resolveErrorMessage(code, msg));
      setPhase('SETTLED');
    }
  };

  // ─── Reset to INPUT phase ────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('INPUT');
    setPreviewResult(null);
    setPreviewError(null);
    setSettleApplied(null);
    setSettlePending(null);
    setSettleError(null);
    setReferenceId('');
    setReason('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={phase === 'CONFIRM_LOADING'}
          className="text-slate-400 hover:text-slate-700 transition text-sm font-medium disabled:opacity-40"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Settlement</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preview the validated trade and escrow pair before confirming a settlement (D-020-B).
          </p>
        </div>
        {(phase === 'PREVIEW_DONE' || phase === 'SETTLED') && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-700 transition font-medium"
          >
            ↺ Start over
          </button>
        )}
      </div>

      {/* ── Phase: INPUT — preview form ─────────────────────────────────────── */}
      {phase === 'INPUT' && (
        <form
          onSubmit={handlePreview}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
        >
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            Step 1 — Preview
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="s-tradeId"
                className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
              >
                Trade ID (UUID)
              </label>
              <input
                id="s-tradeId"
                type="text"
                required
                value={tradeId}
                onChange={e => setTradeId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="s-escrowId"
                className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
              >
                Escrow ID (UUID)
              </label>
              <input
                id="s-escrowId"
                type="text"
                required
                value={escrowId}
                onChange={e => setEscrowId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="s-amount"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Amount
                </label>
                <input
                  id="s-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="s-currency"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Currency (ISO 4217)
                </label>
                <input
                  id="s-currency"
                  type="text"
                  required
                  maxLength={3}
                  value={currency}
                  onChange={e => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!tradeId.trim() || !escrowId.trim() || !isValidAmount || !currency.trim()}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Preview Settlement
          </button>
        </form>
      )}

      {/* ── Phase: PREVIEW_LOADING ──────────────────────────────────────────── */}
      {phase === 'PREVIEW_LOADING' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <LoadingState message="Checking escrow balance…" />
        </div>
      )}

      {/* ── Phase: PREVIEW_DONE ─────────────────────────────────────────────── */}
      {phase === 'PREVIEW_DONE' && (
        <div className="space-y-4">

          {/* Preview error */}
          {previewError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <span>⚠️</span> Preview Failed
              </div>
              <p className="text-rose-700 text-sm">{previewError}</p>
              <button
                onClick={handleReset}
                className="text-sm text-rose-600 font-medium hover:text-rose-800 transition"
              >
                ← Try again
              </button>
            </div>
          )}

          {/* Preview result card */}
          {previewResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                Preview Result
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Current Balance
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {formatBalance(previewResult.currentBalance, currency.trim().toUpperCase())}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    After Settlement
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      previewResult.projectedBalance < 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {formatBalance(previewResult.projectedBalance, currency.trim().toUpperCase())}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    Outcome
                  </div>
                  {previewResult.wouldSucceed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      ✓ Would succeed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                      ✗ Insufficient funds
                    </span>
                  )}
                </div>
              </div>

              {/* Insufficient funds — block confirm */}
              {!previewResult.wouldSucceed && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
                  <strong>Cannot proceed:</strong>{' '}
                  {ERROR_MESSAGES.INSUFFICIENT_ESCROW_FUNDS}
                </div>
              )}
            </div>
          )}

          {/* Step 2: confirm form — only shown when wouldSucceed=true (D-020-B) */}
          {canConfirm && (
            <form
              onSubmit={handleConfirm}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm"
            >
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                Step 2 — Confirm Settlement
              </h2>
              <p className="text-xs text-slate-500">
                Confirming will execute the settlement. This action is state-mutating and cannot
                be undone.
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="s-refId"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Reference ID
                </label>
                <input
                  id="s-refId"
                  type="text"
                  required
                  value={referenceId}
                  onChange={e => setReferenceId(e.target.value)}
                  placeholder="SETTLEMENT:batch-001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-slate-500"
                />
                <p className="text-[10px] text-slate-400">
                  Unique idempotency key — e.g. SETTLEMENT:batchId or SETTLEMENT:batchId:partIdx
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="s-reason"
                  className="text-[10px] font-bold uppercase text-slate-400 tracking-widest"
                >
                  Reason
                </label>
                <textarea
                  id="s-reason"
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe the reason for this settlement…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!referenceId.trim() || !reason.trim()}
                className="w-full py-2.5 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Settlement
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Phase: CONFIRM_LOADING ──────────────────────────────────────────── */}
      {phase === 'CONFIRM_LOADING' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <LoadingState message="Processing settlement…" />
        </div>
      )}

      {/* ── Phase: SETTLED ──────────────────────────────────────────────────── */}
      {phase === 'SETTLED' && (
        <div className="space-y-4">

          {/* APPLIED */}
          {settleApplied && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <span>✅</span> Settlement Applied
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">
                    Transaction ID
                  </dt>
                  <dd className="font-mono text-slate-800 mt-0.5 text-xs break-all">
                    {settleApplied.transactionId}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">
                    Escrow Released
                  </dt>
                  <dd className="font-bold text-slate-800 mt-0.5">
                    {settleApplied.escrowReleased ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">
                    Trade Closed
                  </dt>
                  <dd className="font-bold text-slate-800 mt-0.5">
                    {settleApplied.tradeClosed ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* PENDING_APPROVAL */}
          {settlePending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <span>⏳</span> Pending Approval
              </div>
              <p className="text-amber-700 text-sm">
                This settlement has been queued and is awaiting approval from the required actors.
              </p>
              <div>
                <div className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-1">
                  Required Actors
                </div>
                <div className="flex gap-2 flex-wrap">
                  {settlePending.requiredActors.map(actor => (
                    <span
                      key={actor}
                      className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded"
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {settleError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <span>⚠️</span> Settlement Failed
              </div>
              <p className="text-rose-700 text-sm">{settleError}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            className="text-sm text-slate-500 font-medium hover:text-slate-800 transition"
          >
            ↺ Start a new settlement
          </button>
        </div>
      )}

    </div>
  );
}
