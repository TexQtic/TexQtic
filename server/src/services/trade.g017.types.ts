/**
 * G-017 — TradeService Types (Day 2)
 * Task ID: G-017-DAY2-TRADE-SERVICE-LIFECYCLE
 *
 * Public API contract for TradeService — types only, no DB imports.
 * All methods return typed result objects; none throw to the caller.
 */

import type { ActorType } from './stateMachine.types.js';

// ─── Error Codes ──────────────────────────────────────────────────────────────

/**
 * Structured error codes returned by TradeService methods.
 * Stable API — do not rename without migrating callers.
 */
export type TradeServiceErrorCode =
  /** Actor has no valid session or identity. */
  | 'UNAUTHORIZED'
  /** Actor authenticated but lacks permission for this operation. */
  | 'FORBIDDEN'
  /** Requested trade not found (tenant-scoped). */
  | 'NOT_FOUND'
  /** D-022-B/C: Entity has an OPEN escalation at severity >= 3. Transition blocked. */
  | 'FROZEN_BY_ESCALATION'
  /** DRAFT or target state key not found in lifecycle_states. Stop condition. */
  | 'INVALID_LIFECYCLE_STATE'
  /** Transition was not applied (SM returned non-APPLIED non-PENDING status). */
  | 'TRANSITION_NOT_APPLIED'
  /** StateMachineService returned DENIED or threw unexpectedly. */
  | 'STATE_MACHINE_ERROR'
  /** Prisma/DB write or read failed. */
  | 'DB_ERROR'
  /** reason field is empty or whitespace-only. */
  | 'REASON_REQUIRED';

// ─── Create Trade ─────────────────────────────────────────────────────────────

/**
 * Input to TradeService.createTrade().
 *
 * tenantId is the RLS boundary and is set by the caller (route/withDbContext),
 * NOT accepted from the request body.
 */
export type TradeCreateInput = {
  /** RLS boundary — set by caller from authenticated session; never from request body. */
  tenantId: string;
  buyerOrgId: string;
  sellerOrgId: string;
  /** Human-readable external reference. Must be unique per tenant. */
  tradeReference: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Must be > 0. Stored as NUMERIC(18,6). */
  grossAmount: number;
  /** Mandatory justification for why this trade is being created. */
  reason: string;
  /** G-023: Optional link to an AI reasoning_logs row. */
  reasoningLogId?: string | null;
  /** Soft reference to the creating user. No FK enforced at service layer. */
  createdByUserId?: string | null;
};

export type TradeCreateResult =
  | { status: 'CREATED'; tradeId: string; tradeReference: string }
  | { status: 'ERROR'; code: TradeServiceErrorCode; message: string };

// ─── Transition Trade ─────────────────────────────────────────────────────────

/**
 * Input to TradeService.transitionTrade().
 *
 * Enforcement pipeline (exact order):
 *  1. Load trade (tenantId-scoped)
 *  2. Escalation freeze gate (D-022-B/C)
 *  3. Reason validation
 *  4. AI boundary check (D-020-C): aiTriggered=true requires "HUMAN_CONFIRMED:" in reason
 *  5. Resolve fromStateKey
 *  6. StateMachineService.transition()
 *  7. Interpret result (APPLIED / PENDING_APPROVAL / DENIED)
 */
export type TradeTransitionInput = {
  /** UUID of the trade to transition. */
  tradeId: string;
  /** RLS boundary — set by caller from authenticated session. */
  tenantId: string;
  /** Target state key (uppercase). Must exist in allowed_transitions for TRADE entity. */
  toStateKey: string;
  /** D-020-A: Actor type classification. */
  actorType: ActorType;
  /** D-020-A: UUID of the user actor. Mutually exclusive with actorAdminId. */
  actorUserId?: string | null;
  /** D-020-A: UUID of the admin actor. Mutually exclusive with actorUserId. */
  actorAdminId?: string | null;
  /** Role snapshot at time of call (not a live FK). */
  actorRole: string;
  /** D-020-D: Mandatory justification. If aiTriggered=true, must contain "HUMAN_CONFIRMED:". */
  reason: string;
  /**
   * D-020-C: true if an AI recommendation preceded this transition.
   * Does NOT grant AI any authority. Requires reason to contain "HUMAN_CONFIRMED:".
   * actorType must be TENANT_USER | TENANT_ADMIN | MAKER | CHECKER.
   */
  aiTriggered?: boolean;
  /** G-022: Escalation severity level, required when transition.requires_escalation=true. */
  escalationLevel?: number | null;
  /** G-021: UUID of the Maker in a Maker-Checker flow. */
  makerUserId?: string | null;
  /** G-021: UUID of the Checker in a Maker-Checker flow. */
  checkerUserId?: string | null;
  /** G-015: UUID of the ImpersonationSession if transition during platform impersonation. */
  impersonationId?: string | null;
  /** Fastify request ID for correlation. */
  requestId?: string | null;
};

export type TradeTransitionResult =
  | {
      status: 'APPLIED';
      tradeId: string;
      fromStateKey: string;
      toStateKey: string;
      /** lifecycle log row id from StateMachineService */
      transitionId?: string;
    }
  | {
      /** G-021: Transition requires Maker-Checker approval. No trade state update written. */
      status: 'PENDING_APPROVAL';
      tradeId: string;
      fromStateKey: string;
      toStateKey: string;
      requiredActors: ('MAKER' | 'CHECKER')[];
    }
  | { status: 'ERROR'; code: TradeServiceErrorCode; message: string };
