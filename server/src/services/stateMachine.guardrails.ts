/**
 * G-020 — StateMachineService Guardrails
 * Doctrine v1.4 + D-020-A (actor classification) + D-020-C (AI boundary)
 * G-020 Session Governance Note 2026-02-24: SYSTEM_AUTOMATION service guardrail
 *
 * This module encodes the three hard enforcement boundaries that the service
 * checks BEFORE any DB lookup. These are stateless, synchronous, and therefore
 * testable without a database connection.
 *
 * A) Principal exclusivity — exactly one principal must be set.
 * B) SYSTEM_AUTOMATION prohibition — no value-bearing or decisional states.
 * C) AI boundary — aiTriggered=true requires human-confirmed reason + valid actor type.
 *
 * Throwing GuardrailViolation maps to TransitionDeniedResult in the service.
 */

import type { ActorType, TransitionRequest } from './stateMachine.types.js';

// ─── Guardrail Violation Error ────────────────────────────────────────────────

/**
 * Thrown by guardrail assertion functions.
 * Caught by StateMachineService.transition() and converted to TransitionDeniedResult.
 */
export class GuardrailViolation extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'GuardrailViolation';
  }
}

// ─── B) SYSTEM_AUTOMATION Prohibition Sets ────────────────────────────────────

/**
 * Explicit deny set for SYSTEM_AUTOMATION.
 *
 * SYSTEM_AUTOMATION represents automated background jobs (SLA timers, cron tasks).
 * It MUST NOT perform any transition that:
 *   - Approves or confirms a trade (APPROVED, ORDER_CONFIRMED)
 *   - Acknowledges settlement (SETTLEMENT_ACKNOWLEDGED)
 *   - Releases or closes an escrow arrangement (RELEASED)
 *   - Terminally closes or cancels any entity (CLOSED, CANCELLED, REFUNDED, VOIDED)
 *
 * These are "decisional" or "value-bearing close" states — they require a human
 * actor in the Maker or Checker role, or a PLATFORM_ADMIN authorization.
 *
 * Session governance note (2026-02-24): This guardrail is a service-layer control.
 * The schema does NOT encode this restriction (allowed_actor_type arrays do, but
 * this guard provides defence-in-depth above the DB layer).
 */
export const SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES = new Set<string>([
  'APPROVED',            // compliance gate clearance — requires human Checker
  'ORDER_CONFIRMED',     // mutual commitment — requires Maker+Checker
  'SETTLEMENT_ACKNOWLEDGED', // settlement acceptance — requires Maker+Checker
  'RELEASED',            // escrow release acknowledgement — requires Maker+Checker
  'CLOSED',              // terminal clean resolution — requires human actor
  'CANCELLED',           // terminal cancellation — may require Maker+Checker
  'REFUNDED',            // terminal escrow unwind — requires Maker+Checker
  'VOIDED',              // terminal platform void — requires SuperAdmin escalation
]);

/**
 * Terminal states SYSTEM_AUTOMATION IS permitted to target.
 * These are mechanical, non-decisional outcomes:
 *   ESCALATED — timeout or SLA breach triggers escalation (no value judgment)
 *   EXPIRED   — certification validity window elapsed (calendar/cron)
 *   PENDING_REVIEW — reserved for future SLA-triggered review routing
 */
export const SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS = new Set<string>([
  'ESCALATED',
  'EXPIRED',
  'PENDING_REVIEW',
]);

// ─── Actor Types for AI Boundary ──────────────────────────────────────────────

/** D-020-C: Actor types that may accompany aiTriggered=true. */
const AI_ALLOWED_ACTOR_TYPES = new Set<ActorType>([
  'TENANT_USER',
  'TENANT_ADMIN',
  'MAKER',
  'CHECKER',
]);

/** D-020-C: Human confirmation marker required in reason when aiTriggered=true. */
export const AI_HUMAN_CONFIRMATION_MARKER = 'HUMAN_CONFIRMED:' as const;

// ─── A) Principal Exclusivity ─────────────────────────────────────────────────

/**
 * Guardrail A: Exactly one of actorUserId OR actorAdminId must be non-null.
 *
 * Exception: SYSTEM_AUTOMATION may have both null (no principal is attached to
 * automated background transitions).
 *
 * @throws {GuardrailViolation} code: PRINCIPAL_EXCLUSIVITY_VIOLATION
 */
export function assertPrincipalExclusivity(req: TransitionRequest): void {
  const hasUser = req.actorUserId != null;
  const hasAdmin = req.actorAdminId != null;

  if (hasUser && hasAdmin) {
    throw new GuardrailViolation(
      `Both actorUserId and actorAdminId are set. ` +
        `Exactly one principal must be present per transition. ` +
        `This indicates a caller bug or a cross-realm context bleed.`,
      'PRINCIPAL_EXCLUSIVITY_VIOLATION'
    );
  }

  // SYSTEM_AUTOMATION is the only actor type that may have no principal.
  if (!hasUser && !hasAdmin && req.actorType !== 'SYSTEM_AUTOMATION') {
    throw new GuardrailViolation(
      `Neither actorUserId nor actorAdminId is set for actorType='${req.actorType}'. ` +
        `Non-SYSTEM_AUTOMATION actors must provide exactly one principal UUID.`,
      'PRINCIPAL_EXCLUSIVITY_VIOLATION'
    );
  }
}

// ─── B) SYSTEM_AUTOMATION Boundary ───────────────────────────────────────────

/**
 * Guardrail B: SYSTEM_AUTOMATION is restricted to non-decisional transitions only.
 *
 * Two checks:
 *   1. If toStateKey is in the explicit forbidden set → deny always.
 *   2. If toStateKey is terminal AND not in the allowed terminal set → deny.
 *
 * @param toStateIsTerminal — derived from lifecycle_states.is_terminal for the toState.
 *                            Pass false if the state hasn't been fetched yet (pre-DB check).
 * @throws {GuardrailViolation} code: SYSTEM_AUTOMATION_FORBIDDEN_STATE
 */
export function assertSystemAutomationBoundary(
  req: TransitionRequest,
  toStateIsTerminal: boolean
): void {
  if (req.actorType !== 'SYSTEM_AUTOMATION') return;

  const toState = req.toStateKey.toUpperCase();

  // Check 1: Explicit forbidden set (value-bearing / decisional states)
  if (SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES.has(toState)) {
    throw new GuardrailViolation(
      `SYSTEM_AUTOMATION is prohibited from transitioning to '${toState}'. ` +
        `'${toState}' is a value-bearing or decisional state that requires a human actor ` +
        `(MAKER, CHECKER, or PLATFORM_ADMIN). ` +
        `SYSTEM_AUTOMATION may only target: ESCALATED, EXPIRED, PENDING_REVIEW, ` +
        `or non-terminal intermediate states where it is listed in allowed_actor_type[].`,
      'SYSTEM_AUTOMATION_FORBIDDEN_STATE'
    );
  }

  // Check 2: Terminal states not in the allowed terminal set
  if (toStateIsTerminal && !SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS.has(toState)) {
    throw new GuardrailViolation(
      `SYSTEM_AUTOMATION cannot transition to terminal state '${toState}'. ` +
        `SYSTEM_AUTOMATION may only target these terminal states: ` +
        `${[...SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS].join(', ')}. ` +
        `All other terminal states require a human decision.`,
      'SYSTEM_AUTOMATION_FORBIDDEN_STATE'
    );
  }
}

// ─── C) AI Boundary ──────────────────────────────────────────────────────────

/**
 * Guardrail C (D-020-C): AI-triggered transitions must have human confirmation.
 *
 * TexQtic doctrine: AI systems are advisory only. No AI system has direct
 * authority to change entity state. When an AI recommendation precedes a
 * transition, a human must:
 *   1. Be the actorType (TENANT_USER, TENANT_ADMIN, MAKER, or CHECKER).
 *   2. Include the marker "HUMAN_CONFIRMED: <summary>" in the reason field.
 *
 * This means the audit log will always contain evidence of the human decision,
 * regardless of what AI tool was involved upstream.
 *
 * @throws {GuardrailViolation} code: AI_BOUNDARY_VIOLATION
 */
export function assertAiBoundary(req: TransitionRequest): void {
  if (!req.aiTriggered) return;

  // Check 1: Actor type must be a human type
  if (!AI_ALLOWED_ACTOR_TYPES.has(req.actorType)) {
    throw new GuardrailViolation(
      `aiTriggered=true but actorType='${req.actorType}' is not a permitted human actor. ` +
        `Permitted actor types when aiTriggered=true: ${[...AI_ALLOWED_ACTOR_TYPES].join(', ')}. ` +
        `AI has no direct authority over state transitions (D-020-C).`,
      'AI_BOUNDARY_VIOLATION'
    );
  }

  // Check 2: Reason must contain human confirmation marker
  if (!req.reason.includes(AI_HUMAN_CONFIRMATION_MARKER)) {
    throw new GuardrailViolation(
      `aiTriggered=true but reason does not contain the required human confirmation marker. ` +
        `Required: reason must include "${AI_HUMAN_CONFIRMATION_MARKER}" followed by a human description. ` +
        `Example: "AI_RECOMMENDED: approve trade based on credit score — HUMAN_CONFIRMED: reviewed and agree". ` +
        `This ensures the audit log records the human decision, not just the AI suggestion (D-020-C).`,
      'AI_BOUNDARY_VIOLATION'
    );
  }
}

// ─── Pre-DB Guardrail Bundle ──────────────────────────────────────────────────

/**
 * Run all stateless (pre-DB) guardrails in order.
 * Called by StateMachineService.transition() before any database query.
 *
 * @throws {GuardrailViolation} on first violation encountered.
 */
export function runPreDbGuardrails(req: TransitionRequest): void {
  assertPrincipalExclusivity(req);
  assertAiBoundary(req);
  // Note: assertSystemAutomationBoundary is called post-DB (needs toState.is_terminal).
  // A preliminary check against the forbidden set is done pre-DB.
  if (
    req.actorType === 'SYSTEM_AUTOMATION' &&
    SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES.has(req.toStateKey.toUpperCase())
  ) {
    assertSystemAutomationBoundary(req, false); // toStateIsTerminal=false (preliminary)
  }
}
