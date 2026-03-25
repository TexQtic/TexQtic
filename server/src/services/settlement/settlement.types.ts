/**
 * G-019 — SettlementService Types (Day 1)
 * Task ID: G-019-DAY1-SETTLEMENT-SERVICE
 * Doctrine v1.4 + D-020-C (AI boundary) + D-022-B/C (freeze gate)
 *
 * Public API contract for SettlementService — types only, no DB imports.
 * All methods return typed result objects; none throw to the caller.
 *
 * Toggles locked:
 *   TOGGLE_A = A1 (USE_EXISTING: SETTLEMENT_ACKNOWLEDGED / CLOSED / RELEASED)
 *   TOGGLE_B = B1 (LEDGER_ONLY — no settlement tables; truth is escrow_transactions SUM)
 *   TOGGLE_C = C3 (BOTH: DISPUTED semantic + escalation freeze enforcement)
 */

export type { ActorType } from '../stateMachine.types.js';

// ─── Error Codes ──────────────────────────────────────────────────────────────

/**
 * Structured error codes returned by SettlementService methods.
 * Stable API — do not rename without migrating callers.
 */
export type SettlementErrorCode =
  /** Requested trade not found (tenant-scoped). */
  | 'TRADE_NOT_FOUND'
  /** Requested escrow account not found (tenant-scoped). */
  | 'ESCROW_NOT_FOUND'
  /** The supplied escrow does not belong to the supplied trade. */
  | 'TRADE_ESCROW_MISMATCH'
  /** D-022-B/C: Trade or escrow has an OPEN escalation at severity >= 3. */
  | 'ENTITY_FROZEN'
  /** TOGGLE_C = C3: Trade is in DISPUTED state — settlement is blocked. */
  | 'TRADE_DISPUTED'
  /** D-020-C: aiTriggered=true but reason lacks "HUMAN_CONFIRMED:" marker. */
  | 'AI_HUMAN_CONFIRMATION_REQUIRED'
  /**
   * G-021: Target transition requires Maker-Checker approval.
   * Returned BEFORE any ledger writes; no settlement state changes occur.
   */
  | 'MAKER_CHECKER_REQUIRED'
  /**
   * TOGGLE_B = B1: Derived escrow balance (SUM) is less than the settlement amount.
   * D-020-B: balance is always computed from ledger, never stored.
   */
  | 'INSUFFICIENT_ESCROW_FUNDS'
  /** Settlement amount is not a positive finite number. */
  | 'INVALID_AMOUNT'
  /**
   * TOGGLE_B = B1: referenceId already exists for this escrow account.
   * Double-settlement blocked by ledger idempotency guard (G-018 §referenceId).
   */
  | 'DUPLICATE_REFERENCE'
  /** StateMachineService returned DENIED or ESCALATION_REQUIRED. */
  | 'STATE_MACHINE_DENIED'
  /** Prisma/DB write or read failed; cause included in message. */
  | 'DB_ERROR';

// ─── previewSettlement ────────────────────────────────────────────────────────

/**
 * Input to SettlementService.previewSettlement().
 *
 * Read-only operation — no DB writes. Shows what balance would look like
 * if settlement is applied.
 */
export type PreviewSettlementInput = {
  /** UUID of the trade being previewed when pair validation is required. */
  tradeId?: string;
  /** UUID of the escrow account to preview. */
  escrowId: string;
  /** RLS boundary — set by caller from authenticated session; never from request body. */
  tenantId: string;
  /** Amount to be settled (RELEASE DEBIT). Must be > 0. */
  amount: number;
  /** ISO 4217 currency code. Must match the escrow account denomination. */
  currency: string;
};

export type PreviewSettlementResult =
  | {
      status: 'OK';
      /** Current ledger balance: SUM(CREDIT) - SUM(DEBIT). D-020-B: never stored. */
      currentBalance: number;
      /** What balance would be after this settlement debit (currentBalance - amount). */
      projectedBalance: number;
      /** true if currentBalance >= amount (ledger can support the settlement). */
      wouldSucceed: boolean;
    }
  | { status: 'ERROR'; code: SettlementErrorCode; message: string };

// ─── settleTrade ─────────────────────────────────────────────────────────────

/**
 * Input to SettlementService.settleTrade().
 *
 * Enforcement pipeline (exact order — must not be reordered):
 *  1. Input validation (fast-fail)
 *  2. Load trade + escrow (read)
 *  3. Freeze gate — checkEntityFreeze('TRADE') + checkEntityFreeze('ESCROW') [TOGGLE_C=C3]
 *  4. Dispute gate — DISPUTED state blocks [TOGGLE_C=C3]
 *  5. AI boundary — HUMAN_CONFIRMED marker required if aiTriggered [D-020-C]
 *  6. Maker-checker pre-check — PENDING_APPROVAL before any ledger write if MC required
 *  7. Balance sufficiency — computeDerivedBalance < amount → INSUFFICIENT_ESCROW_FUNDS [B1]
 *  8. Ledger insert — escrowSvc.recordTransaction(entryType=RELEASE, direction=DEBIT) [B1]
 *  9. State transitions — Trade→SETTLEMENT_ACKNOWLEDGED; Escrow→RELEASED; Trade→CLOSED if released
 * 10. Audit emission — writeAuditLog() in SAME tx as mutations
 */
export type SettleTradeInput = {
  /** UUID of the trade to settle. */
  tradeId: string;
  /** UUID of the escrow account linked to this trade. */
  escrowId: string;
  /** RLS boundary — set by caller from authenticated session; never from request body. */
  tenantId: string;
  /**
   * Amount to debit from the escrow (RELEASE DEBIT).
   * Must be > 0. Validated before any DB write.
   */
  amount: number;
  /** ISO 4217 currency code. Must match escrow account denomination. */
  currency: string;
  /**
   * Idempotency / reconciliation key (TOGGLE_B = B1).
   * Unique per ledger entry across (escrow_id, reference_id).
   * Convention: "SETTLEMENT:{batchId}" (full) or "SETTLEMENT:{batchId}:{partIdx}" (partial).
   * DUPLICATE_REFERENCE is returned without any mutations if already present.
   */
  referenceId: string;
  /**
   * D-020-D: Mandatory justification.
   * If aiTriggered=true, must contain "HUMAN_CONFIRMED:" marker.
   */
  reason: string;
  /**
   * D-020-C: true if an AI recommendation preceded this settlement action.
   * Does NOT grant AI any authority. Requires "HUMAN_CONFIRMED:" in reason.
   */
  aiTriggered?: boolean;
  /** D-020-A: Actor type classification. */
  actorType: ActorType;
  /** D-020-A: UUID of the acting user. Soft reference — no FK at service layer. */
  actorUserId?: string | null;
  /** Role snapshot at time of call (not a live FK). */
  actorRole: string;
};

export type SettleTradeResult =
  | {
      status: 'APPLIED';
      /** UUID of the escrow_transactions ledger row inserted. */
      transactionId: string;
      /** true if EscrowService.transitionEscrow → RELEASED succeeded. */
      escrowReleased: boolean;
      /**
       * true if TradeService.transitionTrade → CLOSED succeeded.
       * Only true when escrowReleased=true AND trade reached SETTLEMENT_ACKNOWLEDGED.
       */
      tradeClosed: boolean;
    }
  | {
      status: 'PENDING_APPROVAL';
      /** Actors required to approve the transition (from SM or MC pre-check). */
      requiredActors: ('MAKER' | 'CHECKER')[];
    }
  | { status: 'ERROR'; code: SettlementErrorCode; message: string };
