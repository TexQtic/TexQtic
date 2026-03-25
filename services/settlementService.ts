/**
 * TexQtic Settlement Service — Tenant Plane (TECS-FBW-004)
 *
 * Wires the two G-019 settlement endpoints for the tenant-facing preview-confirm flow:
 *   1. POST /api/tenant/settlements/preview  — balance check, non-mutating
 *   2. POST /api/tenant/settlements          — execute settlement, state-mutating
 *
 * D-017-A: tenantId (orgId) is NEVER sent by the client in any request body.
 *           tenantPost() enforces the TENANT realm guard and sets X-Texqtic-Realm: tenant.
 *           The server derives tenant scope exclusively from JWT claims.
 *
 * D-020-B: Balance values (currentBalance, projectedBalance) are always ledger-derived.
 *           They are never stored server-side; the client must not cache or synthesize them.
 *
 * Out of scope (TECS-FBW-004):
 *   ❌ aiTriggered=true path — requires HUMAN_CONFIRMED: prefix; excluded from this unit
 *   ❌ Maker/checker role selection UI
 *   ❌ Control-plane settlement (POST /api/control/settlements)
 */

import { tenantPost } from './tenantApiClient';

// ─── Preview ─────────────────────────────────────────────────────────────────

/** Input to POST /api/tenant/settlements/preview. */
export interface PreviewSettlementInput {
  /** UUID of the trade to preview settlement for. */
  tradeId: string;
  /** UUID of the escrow account linked to this trade. */
  escrowId: string;
  /** Amount to check against the escrow balance. Must be > 0. */
  amount: number;
  /** ISO 4217 currency code. Must match escrow account denomination. */
  currency: string;
}

/**
 * Successful preview response.
 * D-020-B: currentBalance and projectedBalance are ledger-derived SUM values — never stored.
 */
export interface PreviewOkResult {
  status: 'OK';
  /** Ledger SUM balance at time of preview (D-020-B: never stored server-side). */
  currentBalance: number;
  /** Projected balance after this settlement debit (currentBalance − amount). */
  projectedBalance: number;
  /** true if currentBalance >= amount; false otherwise (insufficient funds). */
  wouldSucceed: boolean;
}

/** Error response from either endpoint — mirrors SettlementErrorCode from server. */
export interface SettlementErrorResult {
  status: 'ERROR';
  code: string;
  message: string;
}

export type PreviewSettlementResponse = PreviewOkResult | SettlementErrorResult;

// ─── Settle ──────────────────────────────────────────────────────────────────

/**
 * Input to POST /api/tenant/settlements.
 *
 * D-017-A: tenantId must NOT be sent by the client — server derives from JWT.
 * Actor posture is derived server-side from the authenticated tenant session.
 * aiTriggered is intentionally omitted — AI-triggered path is out of scope.
 */
export interface SettleEscrowInput {
  tradeId: string;
  escrowId: string;
  amount: number;
  currency: string;
  /**
   * Idempotency/reconciliation key. Unique per (escrow_id, reference_id).
   * Convention: e.g. "SETTLEMENT:batchId" or "SETTLEMENT:batchId:partIdx".
   * DUPLICATE_REFERENCE is returned without mutations if already present.
   */
  referenceId: string;
  /**
   * Mandatory justification. D-020-D: must describe the reason for settlement.
   * AI-triggered path (HUMAN_CONFIRMED: prefix) is out of scope for this unit.
   */
  reason: string;
}

export interface SettleAppliedResult {
  status: 'APPLIED';
  /** UUID of the escrow_transactions ledger row inserted. */
  transactionId: string;
  /** true if escrow transitioned to RELEASED state. */
  escrowReleased: boolean;
  /** true if trade transitioned to CLOSED state (only when escrowReleased=true). */
  tradeClosed: boolean;
}

export interface SettlePendingResult {
  status: 'PENDING_APPROVAL';
  /** Actors required to approve the transition (Maker-Checker pre-check). */
  requiredActors: ('MAKER' | 'CHECKER')[];
}

export type SettleEscrowResponse = SettleAppliedResult | SettlePendingResult | SettlementErrorResult;

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Submit a non-mutating settlement preview.
 *
 * D-017-A: No orgId / tenantId sent — TENANT realm guard on tenantPost() is sufficient.
 * D-020-B: Balance values in the response are ledger-derived; do not cache or re-use.
 *
 * @param input - tradeId, escrowId, amount, currency
 */
export async function previewSettlement(
  input: PreviewSettlementInput,
): Promise<PreviewSettlementResponse> {
  return tenantPost<PreviewSettlementResponse>('/api/tenant/settlements/preview', input);
}

/**
 * Execute a settlement (state-mutating).
 *
 * Precondition (D-020-B): A successful preview (wouldSucceed: true) must be obtained
 * and explicitly confirmed by the user before this function is called.
 * The UI enforces this via the two-phase flow.
 *
 * D-017-A: No orgId / tenantId sent — server derives from JWT.
 *
 * @param input - Full settle payload including referenceId and reason
 */
export async function settleEscrow(
  input: SettleEscrowInput,
): Promise<SettleEscrowResponse> {
  return tenantPost<SettleEscrowResponse>('/api/tenant/settlements', input);
}
