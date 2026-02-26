/**
 * G-018 — EscrowService Types (Day 2)
 * Task ID: G-018-DAY2-ESCROW-SERVICE
 * Doctrine v1.4 + D-020-B (Escrow Neutrality) + D-020-C (AI boundary)
 *
 * Public API contract for EscrowService — types only, no DB imports.
 * All methods return typed result objects; none throw to the caller.
 *
 * DB schema note: escrow_accounts and escrow_transactions do NOT have Prisma
 * model definitions in schema.prisma (G-018 Day 1 migration was applied to
 * the DB without a subsequent `prisma db pull`). The service uses $queryRaw
 * / $executeRaw for those tables. lifecycle_states, pending_approvals, etc.
 * use standard Prisma model APIs.
 */

import type { ActorType } from './stateMachine.types.js';

export type { ActorType };

// ─── Transaction Domain Values ────────────────────────────────────────────────

/**
 * Directional flow of an escrow ledger entry.
 * CREDIT: funds entering escrow (e.g., initial HOLD).
 * DEBIT:  funds leaving escrow (e.g., RELEASE to seller, REFUND to buyer).
 */
export type TransactionDirection = 'CREDIT' | 'DEBIT';

/**
 * Classification of an escrow ledger entry.
 * Must match the DB CHECK constraint on escrow_transactions.entry_type.
 */
export type TransactionEntryType = 'HOLD' | 'RELEASE' | 'REFUND' | 'ADJUSTMENT';

// ─── Error Codes ──────────────────────────────────────────────────────────────

/**
 * Structured error codes returned by EscrowService methods.
 * Stable API — do not rename without migrating callers.
 */
export type EscrowServiceErrorCode =
  /** Escrow account not found (tenant-scoped). */
  | 'ESCROW_NOT_FOUND'
  /** Input currency does not match the escrow account's denomination. */
  | 'CURRENCY_MISMATCH'
  /** amount is not a positive finite number. */
  | 'INVALID_AMOUNT'
  /** entry_type is not one of HOLD | RELEASE | REFUND | ADJUSTMENT. */
  | 'INVALID_ENTRY_TYPE'
  /** direction is not one of CREDIT | DEBIT. */
  | 'INVALID_DIRECTION'
  /** referenceId already exists for this escrow — idempotency guard. */
  | 'DUPLICATE_REFERENCE'
  /** D-022-B/C: Entity has an OPEN escalation at severity >= 3. */
  | 'ENTITY_FROZEN'
  /** D-020-C: aiTriggered=true but reason lacks "HUMAN_CONFIRMED:" marker. */
  | 'AI_HUMAN_CONFIRMATION_REQUIRED'
  /** StateMachineService returned PENDING_APPROVAL and MC record creation failed. */
  | 'MAKER_CHECKER_REQUIRED'
  /** StateMachineService returned DENIED or ESCALATION_REQUIRED. */
  | 'STATE_MACHINE_DENIED'
  /** Prisma/DB write or read failed; cause included in message. */
  | 'DB_ERROR'
  /** Lifecycle state key not found in lifecycle_states table (stop condition). */
  | 'INVALID_LIFECYCLE_STATE'
  /** reason field is empty or whitespace-only. */
  | 'REASON_REQUIRED';

// ─── createEscrowAccount ──────────────────────────────────────────────────────

/**
 * Input to EscrowService.createEscrowAccount().
 *
 * tenantId is the RLS boundary — set by the caller from authenticated session,
 * never from a request body.
 *
 * lifecycle_state_id is resolved by the service to the ESCROW DRAFT state;
 * callers do not supply it directly.
 */
export type CreateEscrowAccountInput = {
  /** RLS boundary — set by caller; never from request body. */
  tenantId: string;
  /** ISO 4217 currency code. D-020-B: denomination only; no balance stored. */
  currency: string;
  /** Mandatory justification for creating this escrow account. */
  reason: string;
  /** Optional link to the creating user. Soft reference — no FK at service layer. */
  createdByUserId?: string | null;
};

export type CreateEscrowAccountResult =
  | { status: 'CREATED'; escrowId: string }
  | { status: 'ERROR'; code: EscrowServiceErrorCode; message: string };

// ─── recordTransaction ────────────────────────────────────────────────────────

/**
 * Input to EscrowService.recordTransaction().
 *
 * Appends a ledger entry to escrow_transactions (append-only constitutional
 * guarantee: service never exposes update/delete; trigger + RLS backstops).
 */
export type RecordTransactionInput = {
  /** UUID of the target escrow account. */
  escrowId: string;
  /** RLS boundary — must match the escrow account's tenant_id. */
  tenantId: string;
  /** Must be > 0. */
  amount: number;
  /** CREDIT (funds in) or DEBIT (funds out). */
  direction: TransactionDirection;
  /** Ledger entry classification. Must match DB CHECK constraint. */
  entryType: TransactionEntryType;
  /**
   * ISO 4217 currency code. Must match the escrow account's currency.
   * Service validates this before inserting.
   */
  currency: string;
  /**
   * Optional external idempotency / reconciliation reference (TEXT).
   * If provided and a transaction with the same (escrow_id, reference_id) exists,
   * returns DUPLICATE_REFERENCE without inserting.
   */
  referenceId?: string | null;
  /** Arbitrary structured metadata for the ledger entry. */
  metadata?: Record<string, unknown>;
  /** Soft reference to the creating user. */
  createdByUserId?: string | null;
};

export type RecordTransactionResult =
  | { status: 'RECORDED'; transactionId: string }
  | { status: 'DUPLICATE_REFERENCE'; existingTransactionId: string }
  | { status: 'ERROR'; code: EscrowServiceErrorCode; message: string };

// ─── computeDerivedBalance ────────────────────────────────────────────────────

/**
 * Result of EscrowService.computeDerivedBalance().
 *
 * D-020-B: balance is always derived — SUM(CREDIT) - SUM(DEBIT) from ledger.
 * No balance column exists on escrow_accounts.
 */
export type ComputeBalanceResult =
  | { status: 'OK'; balance: number }
  | { status: 'ERROR'; code: EscrowServiceErrorCode; message: string };

// ─── transitionEscrow ─────────────────────────────────────────────────────────

/**
 * Input to EscrowService.transitionEscrow().
 *
 * Enforcement pipeline (exact order — see service implementation):
 *  1. Load escrow account (tenant-scoped)
 *  2. Escalation freeze gate (D-022-B/C)
 *  3. Reason validation (D-020-D)
 *  4. AI boundary (D-020-C, escrow-strict)
 *  5. Resolve fromStateKey from lifecycleStateId
 *  6. StateMachineService.transition()
 *  7. Interpret result: APPLIED | PENDING_APPROVAL | ESCALATION_REQUIRED | DENIED
 */
export type TransitionEscrowInput = {
  /** UUID of the escrow account to transition. */
  escrowId: string;
  /** RLS boundary — set by caller from authenticated session. */
  tenantId: string;
  /** Target state key (uppercase). Must exist in allowed_transitions for ESCROW entity. */
  toStateKey: string;
  /** D-020-A: Actor type classification. */
  actorType: ActorType;
  /** D-020-A: UUID of the user actor. Mutually exclusive with actorAdminId. */
  actorUserId?: string | null;
  /** D-020-A: UUID of the admin actor. Mutually exclusive with actorUserId. */
  actorAdminId?: string | null;
  /** Role snapshot at time of call (not a live FK). */
  actorRole: string;
  /**
   * D-020-D: Mandatory justification.
   * If aiTriggered=true, must contain "HUMAN_CONFIRMED:" (D-020-C escrow-strict).
   */
  reason: string;
  /**
   * D-020-C: true if an AI recommendation preceded this transition.
   * Escrow-strict: even SYSTEM_AUTOMATION cannot be aiTriggered for escrow.
   * Requires "HUMAN_CONFIRMED:" in reason without exception.
   */
  aiTriggered?: boolean;
  /** G-022: Escalation severity level when transition requires_escalation=true. */
  escalationLevel?: number | null;
  /** G-021: UUID of the Maker in a Maker-Checker flow. */
  makerUserId?: string | null;
  /** G-021: UUID of the Checker in a Maker-Checker flow. */
  checkerUserId?: string | null;
  /** G-015: UUID of the ImpersonationSession if transition during impersonation. */
  impersonationId?: string | null;
  /** Fastify request ID for correlation. */
  requestId?: string | null;
};

export type TransitionEscrowResult =
  | {
      status: 'APPLIED';
      escrowId: string;
      fromStateKey: string;
      toStateKey: string;
      /** escrow_lifecycle_log row id from StateMachineService. */
      transitionId?: string;
    }
  | {
      /**
       * G-021: Transition requires Maker-Checker approval.
       * escrow_accounts.lifecycle_state_id is NOT updated.
       * MakerCheckerService.createApprovalRequest() was called (if injected).
       */
      status: 'PENDING_APPROVAL';
      escrowId: string;
      fromStateKey: string;
      toStateKey: string;
      requiredActors: ('MAKER' | 'CHECKER')[];
      /** pending_approvals row id if MakerCheckerService was injected and succeeded. */
      approvalId?: string;
    }
  | { status: 'ERROR'; code: EscrowServiceErrorCode; message: string };
