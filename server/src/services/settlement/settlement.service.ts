/**
 * G-019 — SettlementService (Day 1)
 * Task ID: G-019-DAY1-SETTLEMENT-SERVICE
 * Doctrine v1.4 + D-020-B + D-020-C + D-022-B/C
 *
 * Toggles locked:
 *   TOGGLE_A = A1  USE_EXISTING lifecycle keys:
 *                  Trade  "settled" := SETTLEMENT_ACKNOWLEDGED (→ CLOSED terminal)
 *                  Escrow "settled" := RELEASED (terminal)
 *   TOGGLE_B = B1  LEDGER_ONLY — monetary truth = escrow_transactions SUM; no settlement table.
 *                  ledger entry_type = RELEASE (within DB CHECK: HOLD|RELEASE|REFUND|ADJUSTMENT)
 *                  Justification: RELEASE is the canonical type for escrow disbursement.
 *                  HOLD is inflow; RELEASE is outflow to counterparty; REFUND is buyer return;
 *                  ADJUSTMENT is correction. Settlement → counterparty = RELEASE.
 *   TOGGLE_C = C3  BOTH: DISPUTED semantic gate (Step 3) + escalation freeze gate (Step 2).
 *                  Dual-enforcement: missing either still blocks.
 *
 * SettlementService is a PURE ORCHESTRATOR:
 *   - Zero direct DB writes ($queryRaw / $executeRaw). No table ownership.
 *   - Delegates ALL mutations to EscrowService (ledger + escrow lifecycle)
 *     and TradeService (trade lifecycle).
 *   - All injected services share the SAME Prisma TransactionClient (db).
 *   - Caller must establish RLS context (withDbContext) before constructing this service.
 *   - This service MUST NOT call db.$transaction internally — it expects to be invoked
 *     within the caller's existing transaction boundary.
 *
 * Enforcement pipeline for settleTrade (exact order — must never be reordered):
 *   Step 1:  Input validation (fast-fail; no DB round-trip)
 *   Step 2:  Load trade + escrow detail (read)
 *   Step 3:  Freeze gate [TOGGLE_C=C3, Layer 2]
 *              escalation.checkEntityFreeze('TRADE', tradeId)
 *              escalation.checkEntityFreeze('ESCROW', escrowId)
 *   Step 4:  Dispute gate [TOGGLE_C=C3, Layer 1]
 *              enforceDisputePolicy(trade.lifecycleStateKey)
 *   Step 5:  AI boundary gate [D-020-C]
 *              enforceAiBoundary(aiTriggered, reason)
 *   Step 6:  Maker-checker pre-check [G-021]
 *              Query allowed_transitions; if requiresMakerChecker=true and actor not MAKER|CHECKER
 *              → return PENDING_APPROVAL WITHOUT any ledger writes or state changes.
 *   Step 7:  Balance sufficiency [TOGGLE_B=B1, D-020-B]
 *              escrowSvc.computeDerivedBalance(escrowId) < amount → INSUFFICIENT_ESCROW_FUNDS
 *   Step 8:  Ledger insert — append-only [TOGGLE_B=B1]
 *              escrowSvc.recordTransaction({ entryType: 'RELEASE', direction: 'DEBIT', ... })
 *              DUPLICATE_REFERENCE → return ERROR immediately (no state changes).
 *   Step 9:  State transitions [TOGGLE_A=A1]
 *              9a. Trade → SETTLEMENT_ACKNOWLEDGED via TradeService.transitionTrade
 *              9b. Escrow → RELEASED via EscrowService.transitionEscrow
 *              9c. ONLY if escrow RELEASED: Trade → CLOSED via TradeService.transitionTrade
 *   Step 10: Audit emission — writeAuditLog() in SAME tx as mutations [D-022]
 */

import type { PrismaClient } from '@prisma/client';
import type { TradeService } from '../trade.g017.service.js';
import type { EscrowService } from '../escrow.service.js';
import type { EscalationService } from '../escalation.service.js';
import { GovError } from '../escalation.types.js';
import type { AuditEntry } from '../../lib/auditLog.js';
import {
  validateAmount,
  validateCurrency,
  validateReferenceId,
  enforceAiBoundary,
  enforceDisputePolicy,
} from './settlement.guardrails.js';
import type {
  SettlementErrorCode,
  SettleTradeInput,
  SettleTradeResult,
  PreviewSettlementInput,
  PreviewSettlementResult,
} from './settlement.types.js';

// ─── Audit injection type ─────────────────────────────────────────────────────

/**
 * Injectable audit-write function.
 * Matches the signature of writeAuditLog from src/lib/auditLog.ts.
 * Injected into SettlementService for testability (avoids module-level import mocking).
 */
export type WriteAuditLogFn = (db: PrismaClient, entry: AuditEntry) => Promise<void>;

// ─── SettlementService ────────────────────────────────────────────────────────

export class SettlementService {
  /**
   * @param db           - PrismaClient (or tx-bound from withDbContext).
   *                       ALL sub-service calls share this client.
   *                       Caller must establish RLS context before constructing.
   * @param tradeSvc     - TradeService. Must be constructed with the same db tx.
   * @param escrowSvc    - EscrowService. Must be constructed with the same db tx.
   * @param escalation   - EscalationService. Must be constructed with the same db tx.
   * @param writeAudit   - Bound writeAuditLog function for the current tx.
   *                       Injected to enable isolated unit testing (S-06).
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly tradeSvc: TradeService,
    private readonly escrowSvc: EscrowService,
    private readonly escalation: EscalationService,
    private readonly writeAudit: WriteAuditLogFn,
  ) {}

  private async loadTradeAndEscrowPair(
    tradeId: string,
    escrowId: string,
    tenantId: string,
  ): Promise<
    | {
        status: 'OK';
        trade: {
          id: string;
          tenantId: string;
          lifecycleStateId: string;
          lifecycleStateKey: string;
          escrowId: string | null;
        };
        escrow: Awaited<ReturnType<EscrowService['getEscrowAccountDetail']>> extends { status: 'OK'; escrow: infer T }
          ? T
          : never;
      }
    | { status: 'ERROR'; code: SettlementErrorCode; message: string }
  > {
    let trade: {
      id: string;
      tenantId: string;
      lifecycleStateId: string;
      lifecycleStateKey: string;
      escrowId: string | null;
    } | null;

    try {
      const tradeRow = await this.db.trade.findFirst({
        where: { id: tradeId, tenantId },
        select: {
          id: true,
          tenantId: true,
          lifecycleStateId: true,
          escrow_id: true,
          lifecycleState: { select: { stateKey: true } },
        },
      });

      trade = tradeRow
        ? {
            id: tradeRow.id,
            tenantId: tradeRow.tenantId,
            lifecycleStateId: tradeRow.lifecycleStateId,
            lifecycleStateKey: tradeRow.lifecycleState.stateKey,
            escrowId: tradeRow.escrow_id,
          }
        : null;
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error
          ? `DB error loading trade: ${err.message}`
          : 'Unknown DB error loading trade.',
      };
    }

    if (!trade) {
      return {
        status: 'ERROR',
        code: 'TRADE_NOT_FOUND',
        message: `Trade ${tradeId} not found for tenant ${tenantId}.`,
      };
    }

    const escrowDetail = await this.escrowSvc.getEscrowAccountDetail(escrowId, tenantId);
    if (escrowDetail.status !== 'OK') {
      return {
        status: 'ERROR',
        code: 'ESCROW_NOT_FOUND',
        message: escrowDetail.message,
      };
    }

    if (trade.escrowId !== escrowId) {
      return {
        status: 'ERROR',
        code: 'TRADE_ESCROW_MISMATCH',
        message: `Escrow ${escrowId} is not linked to trade ${tradeId}.`,
      };
    }

    return {
      status: 'OK',
      trade,
      escrow: escrowDetail.escrow,
    };
  }

  // ─── Method 1: previewSettlement ─────────────────────────────────────────────

  /**
   * Read-only preview: compute the escrow balance before and after a hypothetical
   * settlement debit.
   *
   * TOGGLE_B = B1: computeDerivedBalance is the canonical balance calculation.
   * D-020-B: balance is never stored on any table — always derived from the ledger SUM.
   *
   * @returns PreviewSettlementResult — never throws.
   */
  async previewSettlement(input: PreviewSettlementInput): Promise<PreviewSettlementResult> {
    if (!validateAmount(input.amount)) {
      return {
        status: 'ERROR',
        code:   'INVALID_AMOUNT',
        message: `amount must be a finite positive number. Received: ${JSON.stringify(input.amount)}.`,
      };
    }

    if (!validateCurrency(input.currency)) {
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: 'currency is required and must be a non-empty string.',
      };
    }

    if (input.tradeId) {
      const pairResult = await this.loadTradeAndEscrowPair(input.tradeId, input.escrowId, input.tenantId);
      if (pairResult.status !== 'OK') {
        return pairResult;
      }
    }

    const balanceResult = await this.escrowSvc.computeDerivedBalance(input.escrowId);
    if (balanceResult.status !== 'OK') {
      return {
        status: 'ERROR',
        code:    balanceResult.code as SettlementErrorCode,
        message: balanceResult.message,
      };
    }

    const currentBalance   = balanceResult.balance;
    const projectedBalance = currentBalance - input.amount;
    const wouldSucceed     = projectedBalance >= 0;

    return { status: 'OK', currentBalance, projectedBalance, wouldSucceed };
  }

  // ─── Method 2: settleTrade ─────────────────────────────────────────────────

  /**
   * Orchestrate a complete settlement:
   *   1. Gate checks (freeze → dispute → AI → maker-checker → balance)
   *   2. Ledger RELEASE DEBIT (escrow_transactions, append-only)
   *   3. Lifecycle transitions (trade → SETTLEMENT_ACKNOWLEDGED [→ CLOSED]; escrow → RELEASED)
   *   4. Audit emission (in same tx as mutations)
   *
   * Caller must wrap this method in a withDbContext / db.$transaction callback.
   * This method MUST NOT create its own $transaction internally.
   *
   * @returns SettleTradeResult — never throws.
   */
  async settleTrade(input: SettleTradeInput): Promise<SettleTradeResult> {

    // ── Step 1: Input validation (fast-fail; no DB round-trip) ────────────────
    if (!validateAmount(input.amount)) {
      return {
        status: 'ERROR',
        code:    'INVALID_AMOUNT',
        message: `amount must be a finite positive number greater than 0. Received: ${JSON.stringify(input.amount)}.`,
      };
    }

    if (!validateCurrency(input.currency)) {
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: 'currency is required and must be a non-empty string.',
      };
    }

    if (!validateReferenceId(input.referenceId)) {
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: 'referenceId is required and must be a non-empty string. [G-019 B1 idempotency]',
      };
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: 'reason is required for settlement. Provide an explicit justification. [D-020-D]',
      };
    }

    // ── Step 2: Load trade + escrow detail (read) ─────────────────────────────
    const pairResult = await this.loadTradeAndEscrowPair(input.tradeId, input.escrowId, input.tenantId);
    if (pairResult.status !== 'OK') {
      return pairResult;
    }

    const { trade, escrow } = pairResult;

    // ── Step 3: Freeze gate [TOGGLE_C=C3, Layer 2] ────────────────────────────
    // checkEntityFreeze throws GovError('ENTITY_FROZEN') if severity >= 3 OPEN.
    // Must run BEFORE dispute check, AI check, and any state machine call.
    // TRADE freeze checked first; ESCROW freeze checked second.
    try {
      await this.escalation.checkEntityFreeze('TRADE', trade.id);
    } catch (err) {
      if (err instanceof GovError && err.code === 'ENTITY_FROZEN') {
        return { status: 'ERROR', code: 'ENTITY_FROZEN', message: err.message };
      }
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: err instanceof Error
          ? `Trade freeze check failed: ${err.message}`
          : 'Trade escalation freeze check encountered an unexpected error.',
      };
    }

    try {
      await this.escalation.checkEntityFreeze('ESCROW', escrow.id);
    } catch (err) {
      if (err instanceof GovError && err.code === 'ENTITY_FROZEN') {
        return { status: 'ERROR', code: 'ENTITY_FROZEN', message: err.message };
      }
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: err instanceof Error
          ? `Escrow freeze check failed: ${err.message}`
          : 'Escrow escalation freeze check encountered an unexpected error.',
      };
    }

    // ── Step 4: Dispute gate [TOGGLE_C=C3, Layer 1] ──────────────────────────
    // Semantic blocker: DISPUTED state prevents all settlement progress.
    // Runs after freeze (frozen entities may also be disputed — freeze blocks first).
    const disputeError = enforceDisputePolicy(trade.lifecycleStateKey);
    if (disputeError !== null) {
      return { status: 'ERROR', code: 'TRADE_DISPUTED', message: disputeError };
    }

    // ── Step 5: AI boundary gate [D-020-C] ────────────────────────────────────
    const aiError = enforceAiBoundary(input.aiTriggered ?? false, input.reason);
    if (aiError !== null) {
      return { status: 'ERROR', code: 'AI_HUMAN_CONFIRMATION_REQUIRED', message: aiError };
    }

    // ── Step 6: Maker-checker pre-check [G-021] ───────────────────────────────
    // If the SETTLEMENT_PENDING → SETTLEMENT_ACKNOWLEDGED transition requires
    // maker-checker and the actor is not MAKER or CHECKER, return PENDING_APPROVAL
    // immediately — NO ledger inserts, NO state changes.
    //
    // This pre-flight check avoids a partial write scenario where the ledger insert
    // succeeds but the SM then blocks the state transition with PENDING_APPROVAL.
    let settlementEdgeRequiresMc = false;
    try {
      const edge = await this.db.allowedTransition.findFirst({
        where: {
          entityType:   'TRADE',
          fromStateKey: trade.lifecycleStateKey,
          toStateKey:   'SETTLEMENT_ACKNOWLEDGED',
        },
        select: { requiresMakerChecker: true },
      });
      settlementEdgeRequiresMc = edge?.requiresMakerChecker ?? false;
    } catch {
      // Non-fatal: if the edge lookup fails, the SM will enforce MC at transition time.
      settlementEdgeRequiresMc = false;
    }

    if (settlementEdgeRequiresMc) {
      const isMcActor = input.actorType === 'MAKER' || input.actorType === 'CHECKER';
      if (!isMcActor) {
        return {
          status:         'PENDING_APPROVAL',
          requiredActors: ['MAKER', 'CHECKER'],
        };
      }
    }

    // ── Step 7: Balance sufficiency [TOGGLE_B=B1, D-020-B] ───────────────────
    // D-020-B: balance is NEVER stored; always derived from ledger SUM.
    // Block settlement if the computed balance is less than the requested amount.
    const balanceResult = await this.escrowSvc.computeDerivedBalance(input.escrowId);
    if (balanceResult.status !== 'OK') {
      return {
        status: 'ERROR',
        code:    'DB_ERROR',
        message: `Failed to compute escrow balance: ${balanceResult.message}`,
      };
    }

    if (balanceResult.balance < input.amount) {
      return {
        status: 'ERROR',
        code:    'INSUFFICIENT_ESCROW_FUNDS',
        message:
          `Escrow derived balance (${balanceResult.balance}) is less than settlement amount ` +
          `(${input.amount}). Insufficient funds. [G-019 B1, D-020-B]`,
      };
    }

    // ── Step 8: Ledger insert — append-only [TOGGLE_B=B1] ────────────────────
    // entry_type = RELEASE: canonical ledger type for escrow disbursement to counterparty.
    //   HOLD       = funds entering escrow (initial CREDIT by buyer)
    //   RELEASE    = funds leaving escrow to seller (DEBIT — settlement disbursement) ← HERE
    //   REFUND     = funds returning to buyer (DEBIT — dispute resolution or cancellation)
    //   ADJUSTMENT = correction entry
    // direction = DEBIT: the escrow balance decreases.
    // DB CHECK constraint (migration.sql line 335):
    //   entry_type IN ('HOLD', 'RELEASE', 'REFUND', 'ADJUSTMENT') — RELEASE is valid.
    const ledgerResult = await this.escrowSvc.recordTransaction({
      tenantId:        input.tenantId,
      escrowId:        input.escrowId,
      entryType:       'RELEASE',
      direction:       'DEBIT',
      amount:          input.amount,
      currency:        input.currency,
      referenceId:     input.referenceId,
      metadata: {
        settlementReason: input.reason,
        tradeId:          input.tradeId,
        actorType:        input.actorType,
        actorUserId:      input.actorUserId ?? null,
      },
      createdByUserId: input.actorUserId ?? null,
    });

    if (ledgerResult.status === 'DUPLICATE_REFERENCE') {
      return {
        status: 'ERROR',
        code:    'DUPLICATE_REFERENCE',
        message:
          `referenceId '${input.referenceId}' already exists for escrow ${input.escrowId}. ` +
          'Double-settlement blocked by ledger idempotency guard. [G-019 B1]',
      };
    }

    if (ledgerResult.status !== 'RECORDED') {
      return {
        status: 'ERROR',
        code:    ledgerResult.code as SettlementErrorCode,
        message: ledgerResult.message,
      };
    }

    const transactionId = ledgerResult.transactionId;

    // ── Step 9: State transitions [TOGGLE_A=A1] ───────────────────────────────

    // 9a. Trade: current state → SETTLEMENT_ACKNOWLEDGED
    //     Expected from-state: SETTLEMENT_PENDING (seed: requiresMakerChecker=true, MAKER/CHECKER)
    //     If SM returns PENDING_APPROVAL here, the ledger write has already occurred —
    //     emit PENDING audit and surface to caller.
    let tradeSettledOk = false;

    const tradeSettleResult = await this.tradeSvc.transitionTrade({
      tradeId:     trade.id,
      tenantId:    trade.tenantId,
      toStateKey:  'SETTLEMENT_ACKNOWLEDGED',
      actorType:   input.actorType,
      actorUserId: input.actorUserId ?? null,
      actorRole:   input.actorRole,
      reason:      input.reason,
      aiTriggered: input.aiTriggered,
    });

    if (tradeSettleResult.status === 'APPLIED') {
      tradeSettledOk = true;
    } else if (tradeSettleResult.status === 'PENDING_APPROVAL') {
      // Ledger write already committed. Emit pending-approval audit and return.
      await this.writeAudit(this.db, {
        realm:        'TENANT',
        tenantId:     input.tenantId,
        actorType:    'USER',
        actorId:      input.actorUserId ?? null,
        action:       'SETTLEMENT_PENDING_APPROVAL',
        entity:       'trade',
        entityId:     trade.id,
        metadataJson: {
          tradeId:        input.tradeId,
          escrowId:       input.escrowId,
          transactionId,
          referenceId:    input.referenceId,
          amount:         input.amount,
          requiredActors: tradeSettleResult.requiredActors,
          reason:         input.reason,
        },
      });
      return {
        status:         'PENDING_APPROVAL',
        requiredActors: tradeSettleResult.requiredActors ?? ['MAKER', 'CHECKER'],
      };
    }
    // Note: if SM denied (state was not SETTLEMENT_PENDING or actor not allowed),
    // tradeSettledOk remains false; we still proceed to escrow + audit.

    // 9b. Escrow: current state → RELEASED (terminal, isIrreversible=true)
    //     Expected from-state: RELEASE_PENDING
    //     (seed: RELEASE_PENDING → RELEASED, requiresMakerChecker=true, MAKER/CHECKER)
    let escrowReleased = false;

    const escrowReleaseResult = await this.escrowSvc.transitionEscrow({
      escrowId:    escrow.id,
      tenantId:    input.tenantId,
      toStateKey:  'RELEASED',
      actorType:   input.actorType,
      actorUserId: input.actorUserId ?? null,
      actorAdminId: null,
      actorRole:   input.actorRole,
      reason:      input.reason,
      aiTriggered: input.aiTriggered,
    });

    if (escrowReleaseResult.status === 'APPLIED') {
      escrowReleased = true;
    }

    // 9c. Trade: SETTLEMENT_ACKNOWLEDGED → CLOSED — ONLY if escrow is now RELEASED.
    //     Gate: must have successfully reached SETTLEMENT_ACKNOWLEDGED (tradeSettledOk)
    //           AND escrow must have been released (escrowReleased) in this call.
    let tradeClosed = false;

    if (escrowReleased && tradeSettledOk) {
      const tradeCloseResult = await this.tradeSvc.transitionTrade({
        tradeId:     trade.id,
        tenantId:    trade.tenantId,
        toStateKey:  'CLOSED',
        actorType:   input.actorType,
        actorUserId: input.actorUserId ?? null,
        actorRole:   input.actorRole,
        // Auto-close is system-driven; no AI marker — the escrow RELEASED event is the trigger.
        reason:      `${input.reason} [AUTO-CLOSE: escrow RELEASED in same settlement batch]`,
        aiTriggered: false,
      });

      if (tradeCloseResult.status === 'APPLIED') {
        tradeClosed = true;
      }
    }

    // ── Step 10: Audit emission (SAME tx as mutations) ────────────────────────
    // writeAudit receives this.db (the tx-bound client shared by all mutations above).
    // This guarantees atomicity: if the tx rolls back, the audit row rolls back too.
    await this.writeAudit(this.db, {
      realm:        'TENANT',
      tenantId:     input.tenantId,
      actorType:    'USER',
      actorId:      input.actorUserId ?? null,
      action:       'SETTLEMENT_APPLIED',
      entity:       'trade',
      entityId:     trade.id,
      metadataJson: {
        tradeId:       input.tradeId,
        escrowId:      input.escrowId,
        transactionId,
        referenceId:   input.referenceId,
        amount:        input.amount,
        currency:      input.currency,
        escrowReleased,
        tradeClosed,
        reason:        input.reason,
        actorType:     input.actorType,
        actorUserId:   input.actorUserId ?? null,
      },
    });

    return {
      status:         'APPLIED',
      transactionId,
      escrowReleased,
      tradeClosed,
    };
  }
}
