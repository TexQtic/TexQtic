/**
 * G-017 — TradeService (Day 2)
 * Task ID: G-017-DAY2-TRADE-SERVICE-LIFECYCLE
 *
 * Implements trade creation and lifecycle transition enforcement using:
 *   - G-020 StateMachineService (lifecycle enforcement)
 *   - G-021 Maker-Checker compatibility (PENDING_APPROVAL passthrough)
 *   - G-022 Escalation freeze gate (D-022-B/C doctrine)
 *   - G-023 Reasoning log optional linkage
 *
 * Day 2 scope: no routes, no RLS changes, no schema changes.
 * All mutations reside inside db.$transaction callbacks for atomicity.
 *
 * Enforcement pipeline for transitionTrade (exact order):
 *  1. Load trade (tenant-scoped via tenantId; do not bypass RLS context)
 *  2. Escalation freeze gate — throws GovError if frozen (D-022-B/C)
 *  3. Validate reason is non-empty
 *  4. AI boundary gate — if aiTriggered=true, require "HUMAN_CONFIRMED:" in reason (D-020-C)
 *  5. Resolve fromStateKey from current trade.lifecycleStateId
 *  6. Call StateMachineService.transition()
 *  7. Interpret result: APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED / DENIED
 */

import type { PrismaClient } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';
import type { EscalationService } from './escalation.service.js';
import type { MakerCheckerService } from './makerChecker.service.js';
import { GovError } from './escalation.types.js';
import type { SanctionsService } from './sanctions.service.js';
import { SanctionBlockError } from './sanctions.service.js';
import type {
  TradeCreateInput,
  TradeCreateResult,
  TradeTransitionInput,
  TradeTransitionResult,
} from './trade.g017.types.js';

// ─── TradeService ─────────────────────────────────────────────────────────────

export class TradeService {
  /**
   * @param db            - Prisma client. Injected for testability.
   *                        In production, pass the singleton from src/db/prisma.ts,
   *                        already wrapped by withDbContext at the route/caller level.
   * @param stateMachine  - StateMachineService. Injected for testability.
   * @param escalation    - EscalationService. Injected for testability.
   * @param makerChecker  - MakerCheckerService. Optional — G-021 MC flows are
   *                        handled via StateMachineService PENDING_APPROVAL status.
   *                        Not directly invoked in Day 2 scope.
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
    private readonly escalation: EscalationService,
    // G-021 Fix A: makerChecker is now stored and used — creates pending_approvals row
    // when StateMachineService returns PENDING_APPROVAL. Non-fatal if absent or throws.
    private readonly makerChecker?: MakerCheckerService,
    // G-024: SanctionsService for buyer/seller sanction checks before trade creation.
    // Optional for backward compat; should be injected in all production routes.
    private readonly sanctions?: SanctionsService | null,
  ) {}

  // ─── Method 1: createTrade ──────────────────────────────────────────────────

  /**
   * Create a new trade in DRAFT state.
   *
   * Writes atomically within a single db.$transaction:
   *   1. trades row with lifecycle_state_id = DRAFT.id
   *   2. trade_events row: event_type='TRADE_CREATED'
   *
   * The org/tenant context is established by the caller via withDbContext before
   * invoking this method. tenantId is accepted as an explicit param (not from body).
   *
   * @returns TradeCreateResult — never throws.
   */
  async createTrade(input: TradeCreateInput): Promise<TradeCreateResult> {
    // ── Input validation (before any DB call) ─────────────────────────────────
    if (!input.tradeReference || input.tradeReference.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'tradeReference is required and must be non-empty.',
      };
    }

    if (!input.currency || input.currency.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'currency is required and must be non-empty.',
      };
    }

    if (typeof input.grossAmount !== 'number' || input.grossAmount <= 0) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'grossAmount must be a number greater than 0.',
      };
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message: 'reason is required for trade creation. Provide an explicit justification.',
      };
    }

    try {      // ── G-024: Sanction check — buyer + seller orgs BEFORE any DB writes ────────
      // Both buyer and seller are checked independently. Either sanctioned party blocks.
      if (this.sanctions) {
        try {
          await this.sanctions.checkOrgSanction(input.buyerOrgId);
          await this.sanctions.checkOrgSanction(input.sellerOrgId);
        } catch (err) {
          if (err instanceof SanctionBlockError) {
            return {
              status: 'ERROR',
              code: 'DB_ERROR',
              message: err.message,
            };
          }
          throw err;
        }
      }
      // ── Resolve DRAFT lifecycle state (stop condition if missing) ─────────
      const draftState = await this.db.lifecycleState.findFirst({
        where: { entityType: 'TRADE', stateKey: 'DRAFT' },
        select: { id: true },
      });

      if (!draftState) {
        // Stop condition: lifecycle_states row for TRADE/DRAFT is absent.
        return {
          status: 'ERROR',
          code: 'INVALID_LIFECYCLE_STATE',
          message:
            "Stop condition: lifecycle_states row for entityType='TRADE' stateKey='DRAFT' not found. " +
            'Run the G-020 seed migration before using TradeService.',
        };
      }

      // ── Atomic write: trade + first trade_events row ──────────────────────
      const created = await this.db.$transaction(async (tx) => {
        const trade = await (tx as unknown as PrismaClient).trade.create({
          data: {
            tenantId: input.tenantId,
            buyerOrgId: input.buyerOrgId,
            sellerOrgId: input.sellerOrgId,
            lifecycleStateId: draftState.id,
            tradeReference: input.tradeReference.trim(),
            currency: input.currency.trim(),
            grossAmount: input.grossAmount,
            reasoningLogId: input.reasoningLogId ?? null,
            createdByUserId: input.createdByUserId ?? null,
          },
          select: { id: true, tradeReference: true },
        });

        await (tx as unknown as PrismaClient).tradeEvent.create({
          data: {
            tenantId: input.tenantId,
            tradeId: trade.id,
            eventType: 'TRADE_CREATED',
            metadata: {
              tradeReference: trade.tradeReference,
              grossAmount: input.grossAmount,
              currency: input.currency.trim(),
              reasoningLogId: input.reasoningLogId ?? null,
              reason: input.reason,
            },
            createdByUserId: input.createdByUserId ?? null,
          },
        });

        return trade;
      });

      return {
        status: 'CREATED',
        tradeId: created.id,
        tradeReference: created.tradeReference,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB write failed: ${err.message}`
            : 'Unknown error during createTrade.',
      };
    }
  }

  // ─── Method 2: transitionTrade ──────────────────────────────────────────────

  /**
   * Enforce a lifecycle state transition on a trade.
   *
   * Enforcement pipeline (exact order — see module header):
   *  1. Load trade (tenant-scoped)
   *  2. Escalation freeze gate
   *  3. Reason validation
   *  4. AI boundary gate (D-020-C)
   *  5. Resolve fromStateKey
   *  6. StateMachineService.transition()
   *  7. Interpret result
   *
   * Atomicity: for APPLIED status, trade.lifecycleStateId update and
   * trade_events INSERT are executed inside a single db.$transaction.
   *
   * @returns TradeTransitionResult — never throws.
   */
  async transitionTrade(input: TradeTransitionInput): Promise<TradeTransitionResult> {
    // ── Step 1: Load trade (tenant-scoped; do not bypass RLS context) ─────────
    let trade: { id: string; tenantId: string; lifecycleStateId: string } | null;

    try {
      trade = await this.db.trade.findFirst({
        where: { id: input.tradeId, tenantId: input.tenantId },
        select: { id: true, tenantId: true, lifecycleStateId: true },
      });
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `DB error loading trade: ${err.message}`
            : 'Unknown DB error loading trade.',
      };
    }

    if (!trade) {
      return {
        status: 'ERROR',
        code: 'NOT_FOUND',
        message: `Trade ${input.tradeId} not found for tenant ${input.tenantId}.`,
      };
    }

    // ── Step 2: Escalation freeze gate (D-022-B/C) ────────────────────────────
    // checkEntityFreeze throws GovError('ENTITY_FROZEN') if severity >= 3 OPEN.
    // We catch and map; never call StateMachineService if frozen.
    try {
      await this.escalation.checkEntityFreeze('TRADE', trade.id);
    } catch (err) {
      if (err instanceof GovError && err.code === 'ENTITY_FROZEN') {
        return {
          status: 'ERROR',
          code: 'FROZEN_BY_ESCALATION',
          message: err.message,
        };
      }
      // Unexpected DB error from escalation check
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message:
          err instanceof Error
            ? `Escalation freeze check failed: ${err.message}`
            : 'Unknown error during escalation freeze check.',
      };
    }

    // ── Step 3: Validate reason (D-020-D) ─────────────────────────────────────
    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message: 'reason is required for lifecycle transitions. Provide an explicit justification.',
      };
    }

    // ── Step 4: AI boundary gate (D-020-C) ────────────────────────────────────
    // If aiTriggered=true, reason MUST contain "HUMAN_CONFIRMED:" prefix.
    // actorType restrictions are enforced by StateMachineService guardrails.
    if (input.aiTriggered === true && !input.reason.includes('HUMAN_CONFIRMED:')) {
      return {
        status: 'ERROR',
        code: 'STATE_MACHINE_ERROR',
        message:
          'AI_BOUNDARY_VIOLATION: aiTriggered=true requires reason to contain the ' +
          '"HUMAN_CONFIRMED:" prefix to prove a human confirmed the AI suggestion. ' +
          '[D-020-C] No transition attempted.',
      };
    }

    // ── Step 5: Resolve fromStateKey from current lifecycleStateId ────────────
    let fromState: { stateKey: string } | null;

    try {
      fromState = await this.db.lifecycleState.findFirst({
        where: { id: trade.lifecycleStateId },
        select: { stateKey: true },
      });
    } catch {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'Failed to resolve current trade lifecycle state from lifecycle_states.',
      };
    }

    if (!fromState) {
      return {
        status: 'ERROR',
        code: 'INVALID_LIFECYCLE_STATE',
        message:
          `Current lifecycleStateId ${trade.lifecycleStateId} not found in lifecycle_states. ` +
          'Schema integrity issue — check G-017 Day 1 migration.',
      };
    }

    // ── Steps 6–7 (atomic): SM transition + entity update in single transaction ──
    // G-020 Atomicity requirement: the SM lifecycle log INSERT and the
    // trade.lifecycleStateId UPDATE must succeed or fail together.
    // opts.db passes the shared transaction client into StateMachineService so the
    // log write uses the same Prisma $transaction as the entity state update.
    // If PENDING_APPROVAL / DENIED / ESCALATION_REQUIRED: no writes occur; tx commits cleanly.
    //
    let smResult!: Awaited<ReturnType<typeof this.stateMachine['transition']>>;
    let atomicError: Error | null = null;

    try {
      await this.db.$transaction(async (tx) => {
        const txDb = tx as unknown as PrismaClient;

        // SM with shared tx — lifecycle log INSERT uses txDb (same tx as entity UPDATE below)
        smResult = await this.stateMachine.transition(
          {
            entityType: 'TRADE',
            entityId: trade.id,
            // orgId === tenantId per TexQtic schema (organizations.id = tenants.id)
            orgId: input.tenantId,
            fromStateKey: fromState.stateKey,
            toStateKey: input.toStateKey,
            actorType: input.actorType,
            actorUserId: input.actorUserId ?? null,
            actorAdminId: input.actorAdminId ?? null,
            actorRole: input.actorRole,
            reason: input.reason,
            aiTriggered: input.aiTriggered ?? false,
            escalationLevel: input.escalationLevel ?? null,
            makerUserId: input.makerUserId ?? null,
            checkerUserId: input.checkerUserId ?? null,
            impersonationId: input.impersonationId ?? null,
            requestId: input.requestId ?? null,
          },
          { db: txDb },
        );

        // Non-APPLIED: no entity mutations — return from callback (tx commits cleanly, no writes).
        if (smResult.status !== 'APPLIED') return;

        // APPLIED: resolve toState UUID inside the same tx, then update entity + emit event.
        const toState = await txDb.lifecycleState.findFirst({
          where: { entityType: 'TRADE', stateKey: input.toStateKey },
          select: { id: true },
        });
        if (!toState) {
          throw new Error(
            `Target state '${input.toStateKey}' not found in lifecycle_states ` +
            "for entityType='TRADE'. Schema integrity issue — check G-020 seed data.",
          );
        }

        // Atomic: trade lifecycle state update + audit event — all in same tx as SM log
        await txDb.trade.update({
          where: { id: trade.id },
          data: { lifecycleStateId: toState.id },
        });

        await txDb.tradeEvent.create({
          data: {
            tenantId: input.tenantId,
            tradeId: trade.id,
            eventType: 'TRADE_TRANSITION_APPLIED',
            metadata: {
              from: fromState.stateKey,
              to: input.toStateKey,
              transitionId: smResult.transitionId,
              reason: input.reason,
            },
            createdByUserId: input.actorUserId ?? input.actorAdminId ?? null,
          },
        });
      });
    } catch (err) {
      // Transaction failed — SM log write + entity update atomically rolled back.
      atomicError = err instanceof Error ? err : new Error(String(err));
    }

    if (atomicError !== null) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: `Failed to complete lifecycle transition atomically: ${atomicError.message}`,
      };
    }

    // ── Step 7: Interpret SM result (smResult is set; atomicError === null) ───

    // ── G-021 Maker-Checker: PENDING_APPROVAL ─────────────────────────────────
    if (smResult.status === 'PENDING_APPROVAL') {
      // SM did not write a log (returns before log write for PENDING_APPROVAL).
      // Emit informational event — trade.lifecycleStateId is NOT updated.
      try {
        await this.db.tradeEvent.create({
          data: {
            tenantId: input.tenantId,
            tradeId: trade.id,
            eventType: 'TRADE_TRANSITION_PENDING',
            metadata: {
              fromStateKey: fromState.stateKey,
              toStateKey: input.toStateKey,
              requiredActors: smResult.requiredActors,
              reason: input.reason,
            },
            createdByUserId: input.actorUserId ?? input.actorAdminId ?? null,
          },
        });
      } catch {
        // Non-fatal: event write failure must not block PENDING_APPROVAL return.
      }

      // G-021 Fix A: Create pending_approvals row when MakerCheckerService is injected.
      // Non-fatal: if MC write fails, PENDING_APPROVAL status is still returned.
      // approvalId remains undefined — caller handles absent approvalId gracefully.
      let approvalId: string | undefined;
      if (this.makerChecker) {
        try {
          const frozenPayload: Record<string, unknown> = {
            tradeId: trade.id,
            toStateKey: input.toStateKey,
            actorType: input.actorType,
            actorRole: input.actorRole,
            reason: input.reason,
            aiTriggered: input.aiTriggered ?? false,
          };

          const mcResult = await this.makerChecker.createApprovalRequest({
            orgId:                input.tenantId,
            entityType:           'TRADE',
            entityId:             trade.id,
            fromStateKey:         fromState.stateKey,
            toStateKey:           input.toStateKey,
            requestedByActorType: input.actorType,
            requestedByUserId:    input.actorUserId ?? null,
            requestedByAdminId:   input.actorAdminId ?? null,
            requestedByRole:      input.actorRole,
            requestReason:        input.reason,
            frozenPayload,
            severityLevel:        input.escalationLevel ?? 1,
            aiTriggered:          input.aiTriggered ?? false,
            impersonationId:      input.impersonationId ?? null,
            requestId:            input.requestId ?? null,
          });

          if (mcResult.status === 'CREATED') {
            approvalId = mcResult.approvalId;
          }
        } catch {
          // MakerChecker write failure is non-fatal.
        }
      }

      return {
        status: 'PENDING_APPROVAL',
        tradeId: trade.id,
        fromStateKey: fromState.stateKey,
        toStateKey: input.toStateKey,
        requiredActors: smResult.requiredActors,
        approvalId,
      };
    }

    // ── APPLIED ───────────────────────────────────────────────────────────────
    if (smResult.status === 'APPLIED') {
      return {
        status: 'APPLIED',
        tradeId: trade.id,
        fromStateKey: fromState.stateKey,
        toStateKey: input.toStateKey,
        transitionId: smResult.transitionId,
      };
    }

    // ── ESCALATION_REQUIRED ───────────────────────────────────────────────────
    if (smResult.status === 'ESCALATION_REQUIRED') {
      return {
        status: 'ERROR',
        code: 'STATE_MACHINE_ERROR',
        message:
          `Transition ${fromState.stateKey} → ${input.toStateKey} requires an escalation record ` +
          '(D-022). Provide escalationLevel in the transition input and try again.',
      };
    }

    // ── DENIED: map SM error code to STATE_MACHINE_ERROR ─────────────────────
    const deniedCode = (smResult as { status: 'DENIED'; code: string; message: string }).code;
    const deniedMsg = (smResult as { status: 'DENIED'; code: string; message: string }).message;

    return {
      status: 'ERROR',
      code: 'STATE_MACHINE_ERROR',
      message: `Transition denied [${deniedCode}]: ${deniedMsg}`,
    };
  }
}
