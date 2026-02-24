/**
 * G-020 — StateMachineService
 * Doctrine v1.4 + G-020 v1.1 + D-020-A/B/C/D constitutional directives
 *
 * Implements StateMachineService.transition() — the single enforcement boundary
 * for all lifecycle state changes in the TexQtic platform.
 *
 * Principles:
 *   - No transition is valid without a row in allowed_transitions. No exceptions.
 *   - All guardrails run before any DB write.
 *   - The log tables (trade_lifecycle_logs, escrow_lifecycle_logs) are append-only.
 *     This service exposes NO update or delete methods — Layer 1 of D-020-D immutability.
 *   - CERTIFICATION log writes are deferred to G-023 (no schema table in Phase 3).
 *   - This service does NOT update entity tables (trades, escrow_accounts) — those
 *     tables don't exist yet (G-017, G-018). The log records the INTENT of the
 *     transition; entity state updates are a G-017/G-018 Day N concern.
 *
 * Deferred to G-021:
 *   - Maker-Checker approval record creation (pending_approvals table).
 *     Service returns PENDING_APPROVAL status; caller creates the G-021 record.
 *
 * Deferred to G-022:
 *   - Escalation record creation.
 *     Service returns ESCALATION_REQUIRED when level is absent; caller handles G-022 record.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  TransitionRequest,
  TransitionResult,
  TransitionErrorCode,
  TransitionDeniedResult,
} from './stateMachine.types.js';
import {
  GuardrailViolation,
  runPreDbGuardrails,
  assertSystemAutomationBoundary,
} from './stateMachine.guardrails.js';

// ─── UUID Validation ──────────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ─── Helper: Build Denied Result ──────────────────────────────────────────────

function denied(code: TransitionErrorCode, message: string): TransitionDeniedResult {
  return { status: 'DENIED', code, message };
}

// ─── StateMachineService ──────────────────────────────────────────────────────

export class StateMachineService {
  /**
   * @param db - Prisma client. Injected for testability.
   *             In production, pass the singleton from src/db/prisma.ts.
   *             In tests, pass a mocked PrismaClient.
   */
  constructor(private readonly db: PrismaClient) {}

  /**
   * transition() — Enforce a lifecycle state change.
   *
   * Execution steps (in order):
   *  1.  Validate UUID formats.
   *  2.  Validate reason is non-empty.
   *  3.  Run pre-DB guardrails (principal exclusivity, AI boundary, SYSTEM_AUTOMATION pre-check).
   *  4.  Normalize state keys to uppercase.
   *  5.  Check CERTIFICATION entityType → return CERTIFICATION_LOG_DEFERRED (no table yet).
   *  6.  Fetch fromState from lifecycle_states.
   *  7.  If fromState not found → STATE_KEY_NOT_FOUND.
   *  8.  If fromState.isTerminal → TRANSITION_FROM_TERMINAL.
   *  9.  Fetch allowed transition from allowed_transitions.
   *  10. If not found → TRANSITION_NOT_PERMITTED.
   *  11. Run post-DB SYSTEM_AUTOMATION boundary check (checks toState.isTerminal).
   *  12. Fetch toState to get isTerminal (needed for guardrail B post-DB).
   *  13. Check actorType in allowedActorType → ACTOR_ROLE_NOT_PERMITTED.
   *  14. Handle escalation requirement (G-022 compatibility).
   *  15. Handle maker-checker requirement (G-021 compatibility).
   *  16. Write log record in a transaction.
   *  17. Return TransitionSuccessResult.
   *
   * @returns TransitionResult — never throws (all errors become DENIED results).
   */
  async transition(req: TransitionRequest): Promise<TransitionResult> {
    // ── Step 1: UUID validation ───────────────────────────────────────────────
    if (!isValidUuid(req.entityId)) {
      return denied('INVALID_UUID', `entityId is not a valid UUID: '${req.entityId}'`);
    }
    if (!isValidUuid(req.orgId)) {
      return denied('INVALID_UUID', `orgId is not a valid UUID: '${req.orgId}'`);
    }
    if (req.actorUserId && !isValidUuid(req.actorUserId)) {
      return denied('INVALID_UUID', `actorUserId is not a valid UUID: '${req.actorUserId}'`);
    }
    if (req.actorAdminId && !isValidUuid(req.actorAdminId)) {
      return denied('INVALID_UUID', `actorAdminId is not a valid UUID: '${req.actorAdminId}'`);
    }

    // ── Step 2: Reason validation ─────────────────────────────────────────────
    if (!req.reason || req.reason.trim().length === 0) {
      return denied(
        'REASON_REQUIRED',
        `reason is required and must be non-empty (D-020-D). All transitions require an explicit justification.`
      );
    }

    // ── Step 3: Pre-DB guardrails ─────────────────────────────────────────────
    try {
      runPreDbGuardrails(req);
    } catch (err) {
      if (err instanceof GuardrailViolation) {
        return denied(err.code as TransitionErrorCode, err.message);
      }
      throw err; // unexpected — re-throw
    }

    // ── Step 4: Normalize state keys ──────────────────────────────────────────
    const normalizedEntityType = req.entityType; // already typed; not DB-sensitive
    const normalizedFromState = req.fromStateKey.toUpperCase().trim();
    const normalizedToState = req.toStateKey.toUpperCase().trim();

    // ── Step 5: CERTIFICATION deferral ────────────────────────────────────────
    if (normalizedEntityType === 'CERTIFICATION') {
      return denied(
        'CERTIFICATION_LOG_DEFERRED',
        `CERTIFICATION lifecycle log writes are deferred to G-023. ` +
          `No certification_lifecycle_logs table exists in the current schema (G-020 Phase 3). ` +
          `State validation is supported; log writes are not. ` +
          `Transition: ${normalizedFromState} → ${normalizedToState} was NOT recorded.`
      );
    }

    // ── Steps 6–7: Fetch fromState ────────────────────────────────────────────
    const fromState = await this.db.lifecycleState.findUnique({
      where: {
        entityType_stateKey: {
          entityType: normalizedEntityType,
          stateKey: normalizedFromState,
        },
      },
    });

    if (!fromState) {
      return denied(
        'STATE_KEY_NOT_FOUND',
        `fromStateKey '${normalizedFromState}' is not registered in lifecycle_states ` +
          `for entityType '${normalizedEntityType}'. ` +
          `Run the seed script to load canonical states.`
      );
    }

    // ── Step 8: Terminal state check ──────────────────────────────────────────
    if (fromState.isTerminal) {
      return denied(
        'TRANSITION_FROM_TERMINAL',
        `State '${normalizedFromState}' (entityType: '${normalizedEntityType}') is terminal. ` +
          `No outbound transitions are permitted from terminal states. ` +
          `The entity lifecycle for this record is closed.`
      );
    }

    // ── Step 9: Fetch allowed transition ──────────────────────────────────────
    const allowedTransition = await this.db.allowedTransition.findUnique({
      where: {
        entityType_fromStateKey_toStateKey: {
          entityType: normalizedEntityType,
          fromStateKey: normalizedFromState,
          toStateKey: normalizedToState,
        },
      },
    });

    if (!allowedTransition) {
      return denied(
        'TRANSITION_NOT_PERMITTED',
        `No allowed transition exists for ` +
          `${normalizedEntityType}: '${normalizedFromState}' → '${normalizedToState}'. ` +
          `This path is not declared in allowed_transitions. ` +
          `Shortcut transitions and undeclared paths are prohibited (G-020 §1.1 rule 1).`
      );
    }

    // ── Steps 10–11: Post-DB SYSTEM_AUTOMATION + toState terminal check ───────
    // Fetch toState to determine is_terminal for guardrail B
    const toState = await this.db.lifecycleState.findUnique({
      where: {
        entityType_stateKey: {
          entityType: normalizedEntityType,
          stateKey: normalizedToState,
        },
      },
    });

    if (!toState) {
      // Shouldn't happen if DB has composite FK intact — but guard defensively
      return denied(
        'STATE_KEY_NOT_FOUND',
        `toStateKey '${normalizedToState}' is not registered in lifecycle_states ` +
          `for entityType '${normalizedEntityType}'. Schema integrity issue — check migrations.`
      );
    }

    try {
      assertSystemAutomationBoundary(req, toState.isTerminal);
    } catch (err) {
      if (err instanceof GuardrailViolation) {
        return denied(err.code as TransitionErrorCode, err.message);
      }
      throw err;
    }

    // ── Step 12: Actor type check ─────────────────────────────────────────────
    // allowedTransition.allowedActorType is a TEXT[] (String[]) from the DB.
    const actorPermitted = allowedTransition.allowedActorType.includes(req.actorType);
    if (!actorPermitted) {
      return denied(
        'ACTOR_ROLE_NOT_PERMITTED',
        `actorType '${req.actorType}' is not permitted for the transition ` +
          `${normalizedEntityType}: '${normalizedFromState}' → '${normalizedToState}'. ` +
          `Permitted actor types: [${allowedTransition.allowedActorType.join(', ')}]. ` +
          `Check D-020-A classification if this actor should be allowed.`
      );
    }

    // ── Step 13: Escalation requirement (G-022 compatibility) ────────────────
    if (allowedTransition.requiresEscalation && !req.escalationLevel) {
      return {
        status: 'ESCALATION_REQUIRED',
        entityType: req.entityType,
        fromStateKey: normalizedFromState,
        toStateKey: normalizedToState,
      };
    }

    // ── Step 14: Maker-Checker requirement (G-021 compatibility) ─────────────
    // If requires_maker_checker=true, do NOT write the log yet.
    // Return PENDING_APPROVAL — the caller is responsible for creating the G-021
    // pending_approvals record (table is out of scope for G-020 Day 3).
    if (allowedTransition.requiresMakerChecker) {
      // Allow CHECKER to proceed directly if they are the actorType
      // (i.e., a CHECKER is approving a previously MAKER-submitted request)
      const isMakerCheckerCompletion =
        req.actorType === 'CHECKER' && req.makerUserId != null;

      if (!isMakerCheckerCompletion) {
        return {
          status: 'PENDING_APPROVAL',
          requiredActors: ['MAKER', 'CHECKER'],
          entityType: req.entityType,
          fromStateKey: normalizedFromState,
          toStateKey: normalizedToState,
        };
      }
    }

    // ── Step 15: Write log record ─────────────────────────────────────────────
    // Uses $transaction for atomic write.
    // Note: We do NOT update entity tables (trades / escrow_accounts) here —
    // those tables don't exist until G-017/G-018. This service records the
    // INTENT of the transition as an immutable audit record.
    try {
      if (normalizedEntityType === 'TRADE') {
        const log = await this.db.$transaction(async tx => {
          return tx.tradeLifecycleLog.create({
            data: {
              orgId: req.orgId,
              tradeId: req.entityId, // soft reference — no FK until G-017
              fromStateKey: normalizedFromState,
              toStateKey: normalizedToState,
              actorUserId: req.actorUserId ?? null,
              actorAdminId: req.actorAdminId ?? null,
              actorType: req.actorType,
              actorRole: req.actorRole,
              escalationLevel: req.escalationLevel ?? null,
              makerUserId: req.makerUserId ?? null,
              checkerUserId: req.checkerUserId ?? null,
              aiTriggered: req.aiTriggered ?? false,
              impersonationId: req.impersonationId ?? null,
              reason: req.reason,
              requestId: req.requestId ?? null,
            },
          });
        });

        return {
          status: 'APPLIED',
          transitionId: log.id,
          entityType: req.entityType,
          entityId: req.entityId,
          fromStateKey: normalizedFromState,
          toStateKey: normalizedToState,
          createdAt: log.createdAt,
        };
      }

      if (normalizedEntityType === 'ESCROW') {
        const log = await this.db.$transaction(async tx => {
          return tx.escrowLifecycleLog.create({
            data: {
              orgId: req.orgId,
              escrowId: req.entityId, // soft reference — no FK until G-018
              fromStateKey: normalizedFromState,
              toStateKey: normalizedToState,
              actorUserId: req.actorUserId ?? null,
              actorAdminId: req.actorAdminId ?? null,
              actorType: req.actorType,
              actorRole: req.actorRole,
              escalationLevel: req.escalationLevel ?? null,
              makerUserId: req.makerUserId ?? null,
              checkerUserId: req.checkerUserId ?? null,
              aiTriggered: req.aiTriggered ?? false,
              impersonationId: req.impersonationId ?? null,
              reason: req.reason,
              requestId: req.requestId ?? null,
            },
          });
        });

        return {
          status: 'APPLIED',
          transitionId: log.id,
          entityType: req.entityType,
          entityId: req.entityId,
          fromStateKey: normalizedFromState,
          toStateKey: normalizedToState,
          createdAt: log.createdAt,
        };
      }

      // Should be unreachable (CERTIFICATION handled at step 5)
      return denied(
        'CERTIFICATION_LOG_DEFERRED',
        `Unhandled entityType: '${normalizedEntityType}'. This is an implementation gap.`
      );
    } catch (dbErr) {
      // Surface DB errors as a structured denial rather than letting them propagate
      // unhandled — the DB trigger will also raise P0001 if someone attempts an
      // UPDATE/DELETE on a log row (D-020-D Layer 2).
      const msg =
        dbErr instanceof Error ? dbErr.message : String(dbErr);
      return denied(
        'TRANSITION_NOT_PERMITTED',
        `Database write failed for transition ` +
          `${normalizedEntityType}: '${normalizedFromState}' → '${normalizedToState}'. ` +
          `Error: ${msg}`
      );
    }
  }
}
