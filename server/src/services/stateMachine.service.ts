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
 *   - The log tables (trade_lifecycle_logs, escrow_lifecycle_logs, order_lifecycle_logs)
 *     are append-only. This service exposes NO update or delete methods — Layer 1 of D-020-D.
 *   - CERTIFICATION writes are persisted in certification_lifecycle_logs.
 *   - ORDER log writes use simplified schema (order_lifecycle_logs): actor_id (single field),
 *     realm ('tenant'|'admin'|'system'), tenant_id (denormalised from orgId). See B1 design.
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
import type { EscalationService } from './escalation.service.js';
import { GovError } from './escalation.types.js';
import type { SanctionsService } from './sanctions.service.js';
import { SanctionBlockError } from './sanctions.service.js';

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
   * @param db                - Prisma client. Injected for testability.
   *                            In production, pass the singleton from src/db/prisma.ts.
   *                            In tests, pass a mocked PrismaClient.
   * @param escalationService - EscalationService (optional). When provided, freeze checks
   *                            run before every transition (G-022 Gate D integration).
   *                            When null/undefined, freeze checks are skipped (backward compat).
   * @param sanctionsService  - SanctionsService (optional, G-024). When provided, org-level
   *                            and entity-level sanction checks run BEFORE escalation freeze
   *                            checks (step 3.5a/b). When null/undefined, sanction checks
   *                            are skipped (backward compat). Should be injected in production.
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly escalationService?: EscalationService | null,
    private readonly sanctionsService?: SanctionsService | null,
  ) {}

  /**
   * transition() — Enforce a lifecycle state change.
   *
   * Execution steps (in order):
   *  1.  Validate UUID formats.
   *  2.  Validate reason is non-empty.
   *  3.  Run pre-DB guardrails (principal exclusivity, AI boundary, SYSTEM_AUTOMATION pre-check).
   *  4.  Normalize state keys to uppercase.
   *  5.  Fetch fromState from lifecycle_states.
   *  6.  If fromState not found → STATE_KEY_NOT_FOUND.
   *  7.  If fromState.isTerminal → TRANSITION_FROM_TERMINAL.
   *  8.  Fetch allowed transition from allowed_transitions.
   *  9.  If not found → TRANSITION_NOT_PERMITTED.
   *  10. Run post-DB SYSTEM_AUTOMATION boundary check (checks toState.isTerminal).
   *  11. Fetch toState to get isTerminal (needed for guardrail B post-DB).
   *  12. Check actorType in allowedActorType → ACTOR_ROLE_NOT_PERMITTED.
   *  13. Handle escalation requirement (G-022 compatibility).
   *  14. Handle maker-checker requirement (G-021 compatibility).
   *  15. Write log record in a transaction.
   *  16. Return TransitionSuccessResult.
   *
   * @returns TransitionResult — never throws (all errors become DENIED results).
   */
  async transition(req: TransitionRequest, opts?: { db?: PrismaClient }): Promise<TransitionResult> {
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

    // ── Step 3.5a: G-024 Sanctions Checks (highest-priority precondition) ─
    // If SanctionsService is injected, run org-level and entity-level sanction checks
    // BEFORE escalation freeze checks. SanctionBlockError is thrown on violation.
    // Uses SECURITY DEFINER DB functions (bypass RLS) — runs in the active transaction.
    if (this.sanctionsService) {
      try {
        await this.sanctionsService.checkOrgSanction(req.orgId);
        await this.sanctionsService.checkEntitySanction(req.entityType, req.entityId);
      } catch (err) {
        if (err instanceof SanctionBlockError) {
          return denied(
            'TRANSITION_NOT_PERMITTED',
            `G-024 Sanction: ${err.message}`,
          );
        }
        throw err; // unexpected DB error — re-throw
      }
    }

    // ── Step 3.5b: G-022 Freeze Checks (precondition hooks) ─────────────
    // If EscalationService is injected, run org-level and entity-level freeze checks.
    // Both checks throw GovError if a freeze is active.
    // This runs BEFORE any DB read/write — cheap pre-condition guard.
    if (this.escalationService) {
      try {
        await this.escalationService.checkOrgFreeze(req.orgId);
        await this.escalationService.checkEntityFreeze(req.entityType, req.entityId);
      } catch (err) {
        if (err instanceof GovError) {
          return denied(
            'TRANSITION_NOT_PERMITTED',
            `G-022 Freeze: ${err.message}`,
          );
        }
        throw err; // unexpected DB error — re-throw
      }
    }

    // ── Step 4: Normalize state keys ──────────────────────────────────────────
    const normalizedEntityType = req.entityType; // already typed; not DB-sensitive
    const normalizedFromState = req.fromStateKey.toUpperCase().trim();
    const normalizedToState = req.toStateKey.toUpperCase().trim();

    // ── Steps 5–6: Fetch fromState ────────────────────────────────────────────
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

    // ── Step 7: Terminal state check ──────────────────────────────────────────
    if (fromState.isTerminal) {
      return denied(
        'TRANSITION_FROM_TERMINAL',
        `State '${normalizedFromState}' (entityType: '${normalizedEntityType}') is terminal. ` +
          `No outbound transitions are permitted from terminal states. ` +
          `The entity lifecycle for this record is closed.`
      );
    }

    // ── Step 8: Fetch allowed transition ──────────────────────────────────────
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

    // ── Steps 9–10: Post-DB SYSTEM_AUTOMATION + toState terminal check ───────
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

    // ── Step 11: Actor type check ─────────────────────────────────────────────
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

    // ── Step 12: Escalation requirement (G-022 compatibility) ────────────────
    if (allowedTransition.requiresEscalation && !req.escalationLevel) {
      return {
        status: 'ESCALATION_REQUIRED',
        entityType: req.entityType,
        fromStateKey: normalizedFromState,
        toStateKey: normalizedToState,
      };
    }

    // ── Step 13: Maker-Checker requirement (G-021 compatibility) ─────────────
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

    // ── Step 14: Write log record ─────────────────────────────────────────────
    // Uses $transaction for atomic write.
    // Note: We do NOT update entity tables (trades / escrow_accounts) here —
    // those tables don't exist until G-017/G-018. This service records the
    // INTENT of the transition as an immutable audit record.
    try {
      if (normalizedEntityType === 'TRADE') {
        // G-020 Atomicity: when opts.db is provided, we are inside a caller-managed
        // transaction — write the log directly (no nested $transaction) so the
        // SM log INSERT and the caller's entity UPDATE share one atomic boundary.
        // When opts.db is absent, wrap in own $transaction for standalone atomicity.
        const logData = {
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
        };
        const log = opts?.db
          ? await opts.db.tradeLifecycleLog.create({ data: logData })
          : await this.db.$transaction(async tx => tx.tradeLifecycleLog.create({ data: logData }));

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
        // Same shared-tx pattern as TRADE: write directly when inside caller's tx.
        const logData = {
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
        };
        const log = opts?.db
          ? await opts.db.escrowLifecycleLog.create({ data: logData })
          : await this.db.$transaction(async tx => tx.escrowLifecycleLog.create({ data: logData }));

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

      if (normalizedEntityType === 'CERTIFICATION') {
        const logData = {
          orgId: req.orgId,
          certificationId: req.entityId,
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
        };
        const log = opts?.db
          ? await opts.db.certificationLifecycleLog.create({ data: logData })
          : await this.db.$transaction(async tx => tx.certificationLifecycleLog.create({ data: logData }));

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

      if (normalizedEntityType === 'ORDER') {
        // ORDER lifecycle log — order_lifecycle_logs (created by GAP-ORDER-LC-001 B1 migration).
        // Schema: simplified vs trade/escrow — (order_id, tenant_id, from_state, to_state,
        // actor_id, realm, request_id). No reason/actorType/escalationLevel/makerUserId etc.
        //
        // tenant_id = orgId: denormalised for RLS canonical arm (B1 design decision).
        // actor_id: single consolidated UUID — actorAdminId takes priority over actorUserId;
        //   both null for SYSTEM_AUTOMATION (schema allows null).
        // realm: 'admin'  → PLATFORM_ADMIN actor or actorAdminId set
        //        'system' → SYSTEM_AUTOMATION
        //        'tenant' → all other actor types (TENANT_USER, TENANT_ADMIN, MAKER, CHECKER)
        // from_state: always a non-empty normalised string at this point (STATE_KEY_NOT_FOUND
        //   would have short-circuited before here if fromStateKey was missing/unknown).
        // opts.db shared-tx pattern: same as TRADE/ESCROW — use caller tx when provided.
        const realm =
          req.actorType === 'PLATFORM_ADMIN' || req.actorAdminId != null
            ? 'admin'
            : req.actorType === 'SYSTEM_AUTOMATION'
              ? 'system'
              : 'tenant';

        const logData = {
          order_id: req.entityId,
          tenant_id: req.orgId,
          from_state: normalizedFromState,
          to_state: normalizedToState,
          actor_id: req.actorAdminId ?? req.actorUserId ?? null,
          realm,
          request_id: req.requestId ?? null,
        };

        // G-027: morgue entry data — prepared unconditionally, written only when
        // toState.isTerminal === true (FULFILLED or CANCELLED for ORDER).
        // snapshot is jsonb NOT NULL in DB; always pass a complete object.
        const morgueCreate = {
          entity_type: req.entityType,
          entity_id: req.entityId,
          tenant_id: req.orgId,
          final_state: normalizedToState,
          resolved_by: req.actorAdminId ?? req.actorUserId ?? null,
          resolution_reason: req.reason ?? null,
          snapshot: {
            entityType: req.entityType,
            entityId: req.entityId,
            fromState: normalizedFromState,
            toState: normalizedToState,
            realm,
            requestId: req.requestId ?? null,
            occurredAt: new Date().toISOString(),
            notes: 'canonical terminal resolution ledger',
          },
        };

        // Both paths (opts.db shared-tx and standalone $transaction) write:
        //   1. order_lifecycle_logs row (always)
        //   2. morgue_entries row (only when terminal, deduplicated by entity+finalState)
        const log = opts?.db
          ? await (async () => {
              const _log = await opts.db!.order_lifecycle_logs.create({ data: logData });
              if (toState.isTerminal) {
                const existing = await opts.db!.morgue_entries.findFirst({
                  where: {
                    entity_type: req.entityType,
                    entity_id: req.entityId,
                    final_state: normalizedToState,
                  },
                  select: { id: true },
                });
                if (!existing) {
                  await opts.db!.morgue_entries.create({ data: morgueCreate });
                }
              }
              return _log;
            })()
          : await this.db.$transaction(async tx => {
              const _log = await tx.order_lifecycle_logs.create({ data: logData });
              if (toState.isTerminal) {
                const existing = await tx.morgue_entries.findFirst({
                  where: {
                    entity_type: req.entityType,
                    entity_id: req.entityId,
                    final_state: normalizedToState,
                  },
                  select: { id: true },
                });
                if (!existing) {
                  await tx.morgue_entries.create({ data: morgueCreate });
                }
              }
              return _log;
            });

        return {
          status: 'APPLIED',
          transitionId: log.id,
          entityType: req.entityType,
          entityId: req.entityId,
          fromStateKey: normalizedFromState,
          toStateKey: normalizedToState,
          createdAt: log.created_at,
        };
      }

      // Guard against future entity type skeletons that skip the write branch.
      return denied(
        'TRANSITION_NOT_PERMITTED',
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
