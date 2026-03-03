/**
 * G-020 — StateMachineService Types
 * Doctrine v1.4 + G-020 v1.1 + D-020-A/B/C/D constitutional directives
 *
 * These types define the public API contract for StateMachineService.transition().
 * No schema references here — types only.
 */

// ─── Domain & Actor Enumerations ──────────────────────────────────────────────

/**
 * Canonical domain discriminant. Matches entity_type column in lifecycle_states
 * and allowed_transitions tables.
 * GAP-ORDER-LC-001-SM-SERVICE-001: ORDER added (B3) — log table order_lifecycle_logs live.
 */
export type EntityType = 'TRADE' | 'ESCROW' | 'CERTIFICATION' | 'ORDER';

/**
 * D-020-A: Actor type classification.
 *
 * Priority for ambiguous role assessment (D-020-A doctrine):
 *   CHECKER > MAKER > TENANT_ADMIN > TENANT_USER
 *
 * PLATFORM_ADMIN and SYSTEM_AUTOMATION are independent tracks.
 * AI is NOT a valid actor type — see aiTriggered field + D-020-C.
 */
export type ActorType =
  | 'TENANT_USER'
  | 'TENANT_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'SYSTEM_AUTOMATION'
  | 'MAKER'
  | 'CHECKER';

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * Input to StateMachineService.transition().
 * All fields except optionals are required.
 *
 * Principal exclusivity rule (D-020-A):
 *   Exactly one of actorUserId OR actorAdminId must be non-null.
 *   Exception: SYSTEM_AUTOMATION may have both null.
 *
 * AI boundary rule (D-020-C):
 *   If aiTriggered=true, actorType must be TENANT_USER | TENANT_ADMIN | MAKER | CHECKER.
 *   reason must contain the marker "HUMAN_CONFIRMED:" to prove a human confirmed the AI suggestion.
 */
export type TransitionRequest = {
  /** Domain discriminant: TRADE | ESCROW | CERTIFICATION | ORDER */
  entityType: EntityType;
  /** UUID of the entity being transitioned. Soft reference for TRADE (G-017) and ESCROW (G-018). */
  entityId: string;
  /** Organization ID. Must match the RLS context of the calling service. */
  orgId: string;
  /** Current state key. Must match an existing lifecycle_states row for entityType. */
  fromStateKey: string;
  /** Target state key. Must match an existing allowed_transitions row for (entityType, from, to). */
  toStateKey: string;
  /** D-020-A: Actor type classification. */
  actorType: ActorType;

  /**
   * D-020-A: UUID of the user triggering the transition.
   * Null for PLATFORM_ADMIN or SYSTEM_AUTOMATION tracks.
   * Mutually exclusive with actorAdminId.
   */
  actorUserId?: string | null;
  /**
   * D-020-A: UUID of the admin triggering the transition.
   * Null for user/system tracks.
   * Mutually exclusive with actorUserId.
   */
  actorAdminId?: string | null;

  /** Membership role or admin role snapshot at time of call (not a live FK). */
  actorRole: string;
  /** D-020-D: Mandatory justification. Non-empty. If aiTriggered, must contain "HUMAN_CONFIRMED:". */
  reason: string;

  /**
   * D-020-C: true if an AI recommendation preceded this transition.
   * Does NOT grant AI any direct authority.
   * Requires: actorType ∈ {TENANT_USER, TENANT_ADMIN, MAKER, CHECKER}
   * Requires: reason contains "HUMAN_CONFIRMED:"
   */
  aiTriggered?: boolean;

  /** UUID of the ImpersonationSession if transition is during platform impersonation. */
  impersonationId?: string | null;

  /** G-021: UUID of the Maker in a Maker-Checker flow. */
  makerUserId?: string | null;
  /** G-021: UUID of the Checker in a Maker-Checker flow. */
  checkerUserId?: string | null;

  /** G-022: Escalation severity level (1–4). Required when allowedTransition.requires_escalation=true. */
  escalationLevel?: number | null;

  /** Fastify request ID for correlation. Pass from route context where available. */
  requestId?: string | null;
};

// ─── Result Types ─────────────────────────────────────────────────────────────

/**
 * Transition successfully applied. Log record created.
 */
export type TransitionSuccessResult = {
  status: 'APPLIED';
  transitionId: string; // lifecycle log row ID
  entityType: EntityType;
  entityId: string;
  fromStateKey: string;
  toStateKey: string;
  createdAt: Date;
};

/**
 * Transition requires Maker-Checker approval before it can be applied.
 * No log record written yet. G-021 compatibility stub.
 * The calling service must create a pending approval record (G-021 scope).
 */
export type TransitionPendingResult = {
  status: 'PENDING_APPROVAL';
  requiredActors: ('MAKER' | 'CHECKER')[];
  entityType: EntityType;
  fromStateKey: string;
  toStateKey: string;
};

/**
 * Transition requires an escalation record to be provided.
 * G-022 compatibility stub.
 */
export type TransitionEscalationResult = {
  status: 'ESCALATION_REQUIRED';
  entityType: EntityType;
  fromStateKey: string;
  toStateKey: string;
};

/**
 * Transition was denied. No state change. No log written.
 */
export type TransitionDeniedResult = {
  status: 'DENIED';
  code: TransitionErrorCode;
  message: string;
};

export type TransitionResult =
  | TransitionSuccessResult
  | TransitionPendingResult
  | TransitionEscalationResult
  | TransitionDeniedResult;

// ─── Error Codes ──────────────────────────────────────────────────────────────

/**
 * Typed error codes returned in TransitionDeniedResult.
 * These are stable API codes — do not rename without migrating callers.
 */
export type TransitionErrorCode =
  /** No row in allowed_transitions for (entityType, fromStateKey, toStateKey). */
  | 'TRANSITION_NOT_PERMITTED'
  /** fromState.is_terminal=true — no outbound transitions allowed. */
  | 'TRANSITION_FROM_TERMINAL'
  /** fromState.is_irreversible=true and the request is a backward transition. */
  | 'TRANSITION_FROM_IRREVERSIBLE'
  /** allowedTransition.requires_maker_checker=true but actorType is not MAKER/CHECKER flow. */
  | 'MAKER_CHECKER_REQUIRED'
  /** actorType is not listed in allowed_actor_type[] for this transition. */
  | 'ACTOR_ROLE_NOT_PERMITTED'
  /** reason is empty or whitespace-only. */
  | 'REASON_REQUIRED'
  /** fromStateKey or toStateKey not found in lifecycle_states for the given entityType. */
  | 'STATE_KEY_NOT_FOUND'
  /** entityId UUID is malformed. */
  | 'INVALID_UUID'
  /** Cross-tenant transition attempted (orgId mismatch). */
  | 'CROSS_TENANT_DENIED'
  /** SYSTEM_AUTOMATION attempted to transition to a value-bearing or decisional state. */
  | 'SYSTEM_AUTOMATION_FORBIDDEN_STATE'
  /** Principal exclusivity violated: both or neither actorUserId/actorAdminId set. */
  | 'PRINCIPAL_EXCLUSIVITY_VIOLATION'
  /** aiTriggered=true but actorType or reason violates D-020-C boundary. */
  | 'AI_BOUNDARY_VIOLATION'
  /** CERTIFICATION entityType has no log table (deferred to G-023). */
  | 'CERTIFICATION_LOG_DEFERRED'
  /** requires_escalation=true but escalationLevel not provided. */
  | 'ESCALATION_REQUIRED_BUT_MISSING';
