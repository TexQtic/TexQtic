/**
 * G-018 — EscrowService (Day 2)
 * Task ID: G-018-DAY2-ESCROW-SERVICE
 * Doctrine v1.4 + D-020-B (Escrow Neutrality) + D-020-C (AI boundary, escrow-strict)
 * + D-022-B/C (Escalation freeze gate) + G-021 (Maker-Checker integration)
 *
 * Implements four public methods:
 *   1. createEscrowAccount    — Insert into escrow_accounts; resolves DRAFT lifecycle state.
 *   2. recordTransaction      — Append-only insert into escrow_transactions; currency + idempotency checks.
 *   3. computeDerivedBalance  — Pure read: SUM(CREDIT) - SUM(DEBIT) from ledger.
 *   4. transitionEscrow       — Lifecycle transition via StateMachineService with full governance pipeline.
 *
 * DB schema note:
 *   escrow_accounts and escrow_transactions do NOT have Prisma model definitions in
 *   schema.prisma (G-018 Day 1 was applied to the DB without a `prisma db pull`).
 *   This service uses $queryRaw / $executeRaw tagged template literals for those tables.
 *   lifecycle_states, pending_approvals, and other G-020/G-021 tables use standard
 *   Prisma model APIs (they ARE in schema.prisma).
 *
 * Constitutional guarantees (Layer 1 — service layer):
 *   D-020-B: No balance column is ever written; balance is always derived.
 *   D-020-C: AI boundary checked before state machine call; escrow-strict (no exemptions).
 *   D-021-C: MakerChecker.createApprovalRequest() called on PENDING_APPROVAL (if injected).
 *   D-022-B/C: Freeze gate checked before state machine call (escalation.checkEntityFreeze).
 *   P0005 (DB trigger): Layer 2 escrow_transactions immutability backstop.
 *   RLS UPDATE/DELETE USING false: Layer 3 immutability backstop.
 *
 * Enforcement pipeline for transitionEscrow (exact order):
 *   1. Load escrow account (tenant-scoped)
 *   2. Escalation freeze gate (D-022-B/C) — throws GovError if frozen
 *   3. Reason validation (D-020-D)
 *   4. AI boundary (D-020-C, escrow-strict)
 *   5. Resolve fromStateKey from current lifecycleStateId
 *   6. StateMachineService.transition()
 *   7. Interpret result: APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED / DENIED
 */

import type { PrismaClient } from '@prisma/client';
import type { StateMachineService } from './stateMachine.service.js';
import type { EscalationService } from './escalation.service.js';
import type { MakerCheckerService } from './makerChecker.service.js';
import { GovError } from './escalation.types.js';
import {
  isValidAmount,
  isValidCurrency,
  isValidDirection,
  isValidEntryType,
  checkEscrowAiBoundary,
} from './escrow.guardrails.js';
import type {
  CreateEscrowAccountInput,
  CreateEscrowAccountResult,
  RecordTransactionInput,
  RecordTransactionResult,
  ComputeBalanceResult,
  TransitionEscrowInput,
  TransitionEscrowResult,
  EscrowServiceErrorCode,
  ListEscrowAccountsInput,
  ListEscrowAccountsResult,
  GetEscrowAccountDetailResult,
} from './escrow.types.js';

// ─── Internal Raw Query Row Types ─────────────────────────────────────────────
// These types use snake_case to match Postgres column names returned by $queryRaw.
// They are NOT exported — internal to EscrowService only.

type RawEscrowAccountRow = {
  id: string;
  tenant_id: string;
  currency: string;
  lifecycle_state_id: string;
};

type RawNewIdRow = {
  id: string;
};

type RawBalanceRow = {
  balance: string;
};

type RawDuplicateRow = {
  id: string;
};

type RawEscrowAccountListRow = {
  id: string;
  tenant_id: string;
  currency: string;
  lifecycle_state_id: string;
  lifecycle_state_key: string;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type RawEscrowTransactionListRow = {
  id: string;
  tenant_id: string;
  escrow_id: string;
  entry_type: string;
  direction: string;
  amount: string;
  currency: string;
  reference_id: string | null;
  metadata: unknown;
  created_by_user_id: string | null;
  created_at: Date;
};

// ─── Internal Error Builder ───────────────────────────────────────────────────

function dbError(
  code: EscrowServiceErrorCode,
  err: unknown,
  fallback: string,
): { status: 'ERROR'; code: EscrowServiceErrorCode; message: string } {
  return {
    status: 'ERROR',
    code,
    message: err instanceof Error ? err.message : fallback,
  };
}

// ─── EscrowService ────────────────────────────────────────────────────────────

export class EscrowService {
  /**
   * @param db           - Prisma client. Injected for testability.
   *                       In production, pass the singleton from src/db/prisma.ts.
   *                       Used for: $queryRaw / $executeRaw (escrow tables) and
   *                       lifecycleState model API (in schema.prisma).
   * @param stateMachine - StateMachineService. Injected for testability.
   *                       Handles lifecycle log writes and transition enforcement.
   * @param escalation   - EscalationService. injected for testability.
   *                       Used for freeze gate checks (D-022-B/C) in transitionEscrow.
   * @param makerChecker - MakerCheckerService. Optional — injected for G-021 flows.
   *                       When provided, called after PENDING_APPROVAL to persist the
   *                       approval request. When null, PENDING_APPROVAL still returns
   *                       correctly but no pending_approvals row is written.
   */
  constructor(
    private readonly db: PrismaClient,
    private readonly stateMachine: StateMachineService,
    private readonly escalation: EscalationService,
    private readonly makerChecker?: MakerCheckerService | null,
  ) {}

  // ─── Method 1: createEscrowAccount ─────────────────────────────────────────

  /**
   * Create a new escrow account in DRAFT lifecycle state.
   *
   * Steps:
   *   1. Validate currency (non-empty).
   *   2. Validate reason (non-empty — D-020-D).
   *   3. Resolve ESCROW DRAFT lifecycle_state_id from lifecycle_states (stop condition if absent).
   *   4. INSERT into escrow_accounts, RETURNING id.
   *
   * The caller must set tenantId from an authenticated session context —
   * never from a request body.
   *
   * @returns CreateEscrowAccountResult — never throws.
   */
  async createEscrowAccount(
    input: CreateEscrowAccountInput,
  ): Promise<CreateEscrowAccountResult> {
    if (!isValidCurrency(input.currency)) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'currency is required and must be a non-empty string (e.g. "USD").',
      };
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message:
          'reason is required for escrow account creation. Provide an explicit justification.',
      };
    }

    // ── Resolve DRAFT lifecycle state (stop condition if absent) ──────────────
    let draftState: { id: string } | null;
    try {
      draftState = await this.db.lifecycleState.findFirst({
        where: { entityType: 'ESCROW', stateKey: 'DRAFT' },
        select: { id: true },
      });
    } catch (err) {
      return dbError(
        'DB_ERROR',
        err,
        'DB error resolving ESCROW DRAFT lifecycle state.',
      );
    }

    if (!draftState) {
      return {
        status: 'ERROR',
        code: 'INVALID_LIFECYCLE_STATE',
        message:
          "Stop condition: lifecycle_states row for entityType='ESCROW' stateKey='DRAFT' not found. " +
          'Run the G-020 seed migration before using EscrowService.',
      };
    }

    // ── INSERT escrow_accounts, RETURNING id ──────────────────────────────────
    try {
      const inserted = (await this.db.$queryRaw`
        INSERT INTO public.escrow_accounts
          (tenant_id, lifecycle_state_id, currency, created_by_user_id)
        VALUES
          (${input.tenantId}::uuid,
           ${draftState.id}::uuid,
           ${input.currency.trim()},
           ${input.createdByUserId ?? null})
        RETURNING id
      `) as RawNewIdRow[];

      if (inserted.length === 0) {
        return {
          status: 'ERROR',
          code: 'DB_ERROR',
          message: 'INSERT into escrow_accounts returned no id — unexpected DB behaviour.',
        };
      }

      return { status: 'CREATED', escrowId: inserted[0].id };
    } catch (err) {
      return dbError('DB_ERROR', err, 'DB write failed during createEscrowAccount.');
    }
  }

  // ─── Method 2: recordTransaction ───────────────────────────────────────────

  /**
   * Append an immutable ledger entry to escrow_transactions.
   *
   * Three-layer immutability:
   *   Layer 1 (this method):  No update/delete methods exist on EscrowService.
   *   Layer 2 (DB trigger):   prevent_escrow_transaction_mutation() → SQLSTATE P0005.
   *   Layer 3 (RLS):          UPDATE/DELETE USING (false) on escrow_transactions.
   *
   * Steps:
   *   1. Validate amount, direction, entry_type (service-layer mirror of DB CHECKs).
   *   2. Validate currency (non-empty).
   *   3. Load escrow account (tenant-scoped) — confirms existence + reads currency.
   *   4. Validate currency match (input.currency === escrow.currency).
   *   5. If referenceId provided: check for existing (escrow_id, reference_id) duplicate.
   *   6. INSERT into escrow_transactions, RETURNING id.
   *
   * @returns RecordTransactionResult — never throws.
   */
  async recordTransaction(
    input: RecordTransactionInput,
  ): Promise<RecordTransactionResult> {
    // ── Step 1: Field validation (mirrors DB CHECK constraints) ───────────────
    if (!isValidAmount(input.amount)) {
      return {
        status: 'ERROR',
        code: 'INVALID_AMOUNT',
        message:
          `amount must be a finite positive number greater than 0. ` +
          `Received: ${JSON.stringify(input.amount)}. [DB CHECK: amount > 0]`,
      };
    }

    if (!isValidDirection(input.direction)) {
      return {
        status: 'ERROR',
        code: 'INVALID_DIRECTION',
        message:
          `direction must be one of ${['CREDIT', 'DEBIT'].join(' | ')}. ` +
          `Received: ${JSON.stringify(input.direction)}.`,
      };
    }

    if (!isValidEntryType(input.entryType)) {
      return {
        status: 'ERROR',
        code: 'INVALID_ENTRY_TYPE',
        message:
          `entryType must be one of ${['HOLD', 'RELEASE', 'REFUND', 'ADJUSTMENT'].join(' | ')}. ` +
          `Received: ${JSON.stringify(input.entryType)}.`,
      };
    }

    if (!isValidCurrency(input.currency)) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: 'currency is required and must be a non-empty string.',
      };
    }

    // ── Step 2: Load escrow account (tenant-scoped) ───────────────────────────
    let escrowRows: RawEscrowAccountRow[];
    try {
      escrowRows = (await this.db.$queryRaw`
        SELECT id, tenant_id, currency, lifecycle_state_id
        FROM public.escrow_accounts
        WHERE id = ${input.escrowId}::uuid
          AND tenant_id = ${input.tenantId}::uuid
        LIMIT 1
      `) as RawEscrowAccountRow[];
    } catch (err) {
      return dbError('DB_ERROR', err, 'DB error loading escrow account for recordTransaction.');
    }

    if (escrowRows.length === 0) {
      return {
        status: 'ERROR',
        code: 'ESCROW_NOT_FOUND',
        message:
          `Escrow account ${input.escrowId} not found for tenant ${input.tenantId}.`,
      };
    }

    const escrow = escrowRows[0];

    // ── Step 3: Currency match ────────────────────────────────────────────────
    if (escrow.currency !== input.currency) {
      return {
        status: 'ERROR',
        code: 'CURRENCY_MISMATCH',
        message:
          `Transaction currency '${input.currency}' does not match escrow account ` +
          `currency '${escrow.currency}'. ` +
          'All ledger entries for an escrow must use the escrow denomination. [D-020-B]',
      };
    }

    // ── Step 4: Idempotency check (service-layer; DB index is the backstop) ───
    if (input.referenceId) {
      let dupeRows: RawDuplicateRow[];
      try {
        dupeRows = (await this.db.$queryRaw`
          SELECT id
          FROM public.escrow_transactions
          WHERE escrow_id = ${input.escrowId}::uuid
            AND reference_id = ${input.referenceId}
          LIMIT 1
        `) as RawDuplicateRow[];
      } catch (err) {
        return dbError('DB_ERROR', err, 'DB error during idempotency check.');
      }

      if (dupeRows.length > 0) {
        return { status: 'DUPLICATE_REFERENCE', existingTransactionId: dupeRows[0].id };
      }
    }

    // ── Step 5: INSERT (append-only; trigger + RLS are Layer 2/3 backstops) ───
    try {
      const metadataJson = JSON.stringify(input.metadata ?? {});
      const inserted = (await this.db.$queryRaw`
        INSERT INTO public.escrow_transactions
          (tenant_id, escrow_id, entry_type, direction, amount, currency,
           reference_id, metadata, created_by_user_id)
        VALUES
          (${input.tenantId}::uuid,
           ${input.escrowId}::uuid,
           ${input.entryType},
           ${input.direction},
           ${input.amount}::numeric,
           ${input.currency},
           ${input.referenceId ?? null},
           ${metadataJson}::jsonb,
           ${input.createdByUserId ?? null})
        RETURNING id
      `) as RawNewIdRow[];

      if (inserted.length === 0) {
        return {
          status: 'ERROR',
          code: 'DB_ERROR',
          message: 'INSERT into escrow_transactions returned no id — unexpected DB behaviour.',
        };
      }

      return { status: 'RECORDED', transactionId: inserted[0].id };
    } catch (err) {
      return dbError('DB_ERROR', err, 'DB write failed during recordTransaction.');
    }
  }

  // ─── Method 3: computeDerivedBalance ───────────────────────────────────────

  /**
   * Compute the derived ledger balance for an escrow account.
   *
   * D-020-B: No balance column exists anywhere. Balance is derived from ledger:
   *   balance = SUM(CREDIT amounts) − SUM(DEBIT amounts)
   *
   * Positive balance → net credit (more held than released/refunded).
   * Negative balance → net debit (should not occur in a well-governed flow).
   * Zero balance → fully released or no transactions yet.
   *
   * This method is pure / read-only — it writes nothing.
   *
   * @param escrowId - UUID of the escrow account.
   * @returns ComputeBalanceResult — never throws.
   */
  async computeDerivedBalance(escrowId: string): Promise<ComputeBalanceResult> {
    try {
      const balanceRows = (await this.db.$queryRaw`
        SELECT COALESCE(
          SUM(
            CASE
              WHEN direction = 'CREDIT' THEN amount
              WHEN direction = 'DEBIT'  THEN -amount
              ELSE 0
            END
          )::TEXT,
          '0'
        ) AS balance
        FROM public.escrow_transactions
        WHERE escrow_id = ${escrowId}::uuid
      `) as RawBalanceRow[];

      const raw = balanceRows[0]?.balance ?? '0';
      const balance = parseFloat(raw);

      if (!Number.isFinite(balance)) {
        return {
          status: 'ERROR',
          code: 'DB_ERROR',
          message: `computeDerivedBalance returned a non-finite value: '${raw}'.`,
        };
      }

      return { status: 'OK', balance };
    } catch (err) {
      return dbError('DB_ERROR', err, 'DB error during computeDerivedBalance.');
    }
  }

  // ─── Method 4: transitionEscrow ────────────────────────────────────────────

  /**
   * Perform a lifecycle transition on an escrow account.
   *
   * Enforcement pipeline (order is mandatory — must not be reordered):
   *   1. Load escrow account (tenant-scoped via tenantId)
   *   2. Escalation freeze gate — checkEntityFreeze('ESCROW', escrowId) (D-022-B/C)
   *   3. Reason validation (D-020-D)
   *   4. AI boundary (escrow-strict D-020-C)
   *   5. Resolve fromStateKey from current lifecycle_state_id
   *   6. StateMachineService.transition() — writes escrow_lifecycle_log if APPLIED
   *   7. Interpret result:
   *      APPLIED          → update escrow_accounts.lifecycle_state_id; return APPLIED
   *      PENDING_APPROVAL → do NOT update lifecycle_state_id; call MakerCheckerService; return PENDING_APPROVAL
   *      ESCALATION_REQUIRED → return STATE_MACHINE_DENIED
   *      DENIED           → return STATE_MACHINE_DENIED
   *
   * Note: escrow lifecycle logs are acknowledgements only — no financial settlement
   * or fund movement occurs during transitions (G-018 §2, D-020-B).
   *
   * @returns TransitionEscrowResult — never throws.
   */
  async transitionEscrow(input: TransitionEscrowInput): Promise<TransitionEscrowResult> {
    // ── Step 1: Load escrow account (tenant-scoped) ───────────────────────────
    let escrowRows: RawEscrowAccountRow[];
    try {
      escrowRows = (await this.db.$queryRaw`
        SELECT id, tenant_id, currency, lifecycle_state_id
        FROM public.escrow_accounts
        WHERE id = ${input.escrowId}::uuid
          AND tenant_id = ${input.tenantId}::uuid
        LIMIT 1
      `) as RawEscrowAccountRow[];
    } catch (err) {
      return dbError('DB_ERROR', err, 'DB error loading escrow account for transitionEscrow.');
    }

    if (escrowRows.length === 0) {
      return {
        status: 'ERROR',
        code: 'ESCROW_NOT_FOUND',
        message:
          `Escrow account ${input.escrowId} not found for tenant ${input.tenantId}.`,
      };
    }

    const escrow = escrowRows[0];

    // ── Step 2: Escalation freeze gate (D-022-B/C) ────────────────────────────
    // checkEntityFreeze throws GovError('ENTITY_FROZEN') when severity >= 3 OPEN.
    // Must run BEFORE state machine call — never call SM when entity is frozen.
    try {
      await this.escalation.checkEntityFreeze('ESCROW', escrow.id);
    } catch (err) {
      if (err instanceof GovError && err.code === 'ENTITY_FROZEN') {
        return { status: 'ERROR', code: 'ENTITY_FROZEN', message: err.message };
      }
      return dbError('DB_ERROR', err, 'Escalation freeze check failed for escrow account.');
    }

    // ── Step 3: Reason validation (D-020-D) ───────────────────────────────────
    if (!input.reason || input.reason.trim().length === 0) {
      return {
        status: 'ERROR',
        code: 'REASON_REQUIRED',
        message:
          'reason is required for escrow lifecycle transitions. ' +
          'Provide an explicit justification. [D-020-D]',
      };
    }

    // ── Step 4: AI boundary (D-020-C, escrow-strict) ──────────────────────────
    // Escrow is stricter than baseline: no actor type is exempt; even SYSTEM_AUTOMATION
    // must not set aiTriggered=true without "HUMAN_CONFIRMED:" in reason.
    const aiBoundaryError = checkEscrowAiBoundary(input.aiTriggered ?? false, input.reason);
    if (aiBoundaryError !== null) {
      return {
        status: 'ERROR',
        code: 'AI_HUMAN_CONFIRMATION_REQUIRED',
        message: aiBoundaryError,
      };
    }

    // ── Step 5: Resolve fromStateKey ──────────────────────────────────────────
    let fromState: { stateKey: string } | null;
    try {
      fromState = await this.db.lifecycleState.findFirst({
        where: { id: escrow.lifecycle_state_id },
        select: { stateKey: true },
      });
    } catch (err) {
      return dbError(
        'DB_ERROR',
        err,
        'DB error resolving current escrow lifecycle state key.',
      );
    }

    if (!fromState) {
      return {
        status: 'ERROR',
        code: 'INVALID_LIFECYCLE_STATE',
        message:
          `Current lifecycleStateId ${escrow.lifecycle_state_id} not found in lifecycle_states. ` +
          'Schema integrity issue — check G-018 Day 1 migration and G-020 seed data.',
      };
    }

    // ── Step 6: StateMachineService.transition() ──────────────────────────────
    // SM validates allowed_transitions, actor permissions, escalation requirements,
    // maker-checker requirements, and writes escrow_lifecycle_log on APPLIED.
    // orgId === tenantId per TexQtic schema (organizations.id = tenants.id).
    let smResult;
    try {
      smResult = await this.stateMachine.transition({
        entityType: 'ESCROW',
        entityId: escrow.id,
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
      });
    } catch (err) {
      return dbError(
        'STATE_MACHINE_DENIED',
        err,
        'StateMachineService.transition() threw an unexpected error.',
      );
    }

    // ── Step 7: Interpret TransitionResult ────────────────────────────────────

    // ── G-021: PENDING_APPROVAL ───────────────────────────────────────────────
    if (smResult.status === 'PENDING_APPROVAL') {
      // Constitutional constraint: DO NOT update escrow_accounts.lifecycle_state_id.
      // The pending_approvals record captures the intent; state is updated only on replay.
      let approvalId: string | undefined;

      if (this.makerChecker) {
        try {
          // Construct frozenPayload without internal IDs to avoid hash instability.
          const frozenPayload: Record<string, unknown> = {
            escrowId: escrow.id,
            toStateKey: input.toStateKey,
            actorType: input.actorType,
            actorRole: input.actorRole,
            reason: input.reason,
            aiTriggered: input.aiTriggered ?? false,
          };

          const mcResult = await this.makerChecker.createApprovalRequest({
            orgId: input.tenantId,
            entityType: 'ESCROW',
            entityId: escrow.id,
            fromStateKey: fromState.stateKey,
            toStateKey: input.toStateKey,
            requestedByActorType: input.actorType,
            requestedByUserId: input.actorUserId ?? null,
            requestedByAdminId: input.actorAdminId ?? null,
            requestedByRole: input.actorRole,
            requestReason: input.reason,
            frozenPayload,
            severityLevel: input.escalationLevel ?? 1,
            aiTriggered: input.aiTriggered ?? false,
            impersonationId: input.impersonationId ?? null,
            requestId: input.requestId ?? null,
          });

          if (mcResult.status === 'CREATED') {
            approvalId = mcResult.approvalId;
          }
        } catch {
          // MakerChecker write failure is non-fatal: PENDING_APPROVAL status is still
          // returned to the caller so the UI can surface the pending state.
          // approvalId remains undefined — caller should handle absent approvalId.
        }
      }

      return {
        status: 'PENDING_APPROVAL',
        escrowId: escrow.id,
        fromStateKey: fromState.stateKey,
        toStateKey: input.toStateKey,
        requiredActors: smResult.requiredActors,
        approvalId,
      };
    }

    // ── APPLIED: update lifecycle_state_id ────────────────────────────────────
    if (smResult.status === 'APPLIED') {
      // Resolve target lifecycle_state_id UUID (need it for the UPDATE).
      let toState: { id: string } | null;
      try {
        toState = await this.db.lifecycleState.findFirst({
          where: { entityType: 'ESCROW', stateKey: input.toStateKey },
          select: { id: true },
        });
      } catch (err) {
        return dbError(
          'DB_ERROR',
          err,
          'DB error resolving target lifecycle state after APPLIED.',
        );
      }

      if (!toState) {
        return {
          status: 'ERROR',
          code: 'INVALID_LIFECYCLE_STATE',
          message:
            `Target state '${input.toStateKey}' not found in lifecycle_states for ` +
            "entityType='ESCROW'. Schema integrity issue — check G-020 seed data.",
        };
      }

      // Update escrow_accounts.lifecycle_state_id to reflect the applied transition.
      // The escrow_lifecycle_log was already written atomically by StateMachineService.
      try {
        await this.db.$executeRaw`
          UPDATE public.escrow_accounts
          SET lifecycle_state_id = ${toState.id}::uuid
          WHERE id = ${escrow.id}::uuid
        `;
      } catch (err) {
        return dbError(
          'DB_ERROR',
          err,
          'DB error updating escrow_accounts.lifecycle_state_id after APPLIED transition.',
        );
      }

      return {
        status: 'APPLIED',
        escrowId: escrow.id,
        fromStateKey: fromState.stateKey,
        toStateKey: input.toStateKey,
        transitionId: smResult.transitionId,
      };
    }

    // ── ESCALATION_REQUIRED ───────────────────────────────────────────────────
    if (smResult.status === 'ESCALATION_REQUIRED') {
      return {
        status: 'ERROR',
        code: 'STATE_MACHINE_DENIED',
        message:
          `Transition ${fromState.stateKey} → ${input.toStateKey} requires an escalation ` +
          'record (D-022). Provide escalationLevel in the transition input and retry.',
      };
    }

    // ── DENIED ────────────────────────────────────────────────────────────────
    const denied = smResult as { status: 'DENIED'; code: string; message: string };
    return {
      status: 'ERROR',
      code: 'STATE_MACHINE_DENIED',
      message: `Transition denied [${denied.code}]: ${denied.message}`,
    };
  }

  // ─── Method 5: listEscrowAccounts ─────────────────────────────────────────

  /**
   * List escrow accounts for a tenant (control plane: cross-tenant when orgId empty).
   * Joins lifecycle_states for the human-readable stateKey.
   * D-020-B: balance is NOT returned here — use getEscrowAccountDetail.
   */
  async listEscrowAccounts(
    input: ListEscrowAccountsInput,
  ): Promise<ListEscrowAccountsResult> {
    const { tenantId, limit = 20, offset = 0 } = input;
    try {
      let rows: RawEscrowAccountListRow[];
      if (tenantId) {
        rows = (await this.db.$queryRaw`
          SELECT ea.id, ea.tenant_id, ea.currency, ea.lifecycle_state_id,
                 ls.state_key AS lifecycle_state_key,
                 ea.created_by_user_id, ea.created_at, ea.updated_at
          FROM public.escrow_accounts ea
          LEFT JOIN public.lifecycle_states ls ON ls.id = ea.lifecycle_state_id
          WHERE ea.tenant_id = ${tenantId}::uuid
          ORDER BY ea.created_at DESC
          LIMIT ${BigInt(limit)} OFFSET ${BigInt(offset)}
        `) as RawEscrowAccountListRow[];
      } else {
        rows = (await this.db.$queryRaw`
          SELECT ea.id, ea.tenant_id, ea.currency, ea.lifecycle_state_id,
                 ls.state_key AS lifecycle_state_key,
                 ea.created_by_user_id, ea.created_at, ea.updated_at
          FROM public.escrow_accounts ea
          LEFT JOIN public.lifecycle_states ls ON ls.id = ea.lifecycle_state_id
          ORDER BY ea.created_at DESC
          LIMIT ${BigInt(limit)} OFFSET ${BigInt(offset)}
        `) as RawEscrowAccountListRow[];
      }

      const accounts = rows.map(r => ({
        id:               r.id,
        tenantId:         r.tenant_id,
        currency:         r.currency,
        lifecycleStateId: r.lifecycle_state_id,
        lifecycleStateKey: r.lifecycle_state_key,
        createdByUserId:  r.created_by_user_id ?? null,
        createdAt:        r.created_at.toISOString(),
        updatedAt:        r.updated_at.toISOString(),
      }));

      return { status: 'OK', escrows: accounts, count: accounts.length };
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'DB error listing escrow accounts.',
      };
    }
  }

  // ─── Method 6: getEscrowAccountDetail ────────────────────────────────────

  /**
   * Load a single escrow account plus its last 20 transactions and derived balance.
   * Tenant-scoped (tenant_id must match) unless tenantId is omitted (admin cross-tenant access).
   * When called from the control plane, admin RLS bypass (SET LOCAL app.is_admin='true') must
   * already be in effect before this method is invoked.
   */
  async getEscrowAccountDetail(
    escrowId: string,
    tenantId?: string,
  ): Promise<GetEscrowAccountDetailResult> {
    // Load account
    let accountRows: RawEscrowAccountListRow[];
    try {
      if (tenantId) {
        accountRows = (await this.db.$queryRaw`
          SELECT ea.id, ea.tenant_id, ea.currency, ea.lifecycle_state_id,
                 ls.state_key AS lifecycle_state_key,
                 ea.created_by_user_id, ea.created_at, ea.updated_at
          FROM public.escrow_accounts ea
          LEFT JOIN public.lifecycle_states ls ON ls.id = ea.lifecycle_state_id
          WHERE ea.id = ${escrowId}::uuid
            AND ea.tenant_id = ${tenantId}::uuid
          LIMIT 1
        `) as RawEscrowAccountListRow[];
      } else {
        accountRows = (await this.db.$queryRaw`
          SELECT ea.id, ea.tenant_id, ea.currency, ea.lifecycle_state_id,
                 ls.state_key AS lifecycle_state_key,
                 ea.created_by_user_id, ea.created_at, ea.updated_at
          FROM public.escrow_accounts ea
          LEFT JOIN public.lifecycle_states ls ON ls.id = ea.lifecycle_state_id
          WHERE ea.id = ${escrowId}::uuid
          LIMIT 1
        `) as RawEscrowAccountListRow[];
      }
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'DB error loading escrow account.',
      };
    }

    if (accountRows.length === 0) {
      return {
        status: 'ERROR',
        code: 'ESCROW_NOT_FOUND',
        message: `Escrow account ${escrowId} not found${tenantId ? ` for tenant ${tenantId}` : ''}.`,
      };
    }

    const r = accountRows[0];
    const account = {
      id:                r.id,
      tenantId:          r.tenant_id,
      currency:          r.currency,
      lifecycleStateId:  r.lifecycle_state_id,
      lifecycleStateKey: r.lifecycle_state_key,
      createdByUserId:   r.created_by_user_id ?? null,
      createdAt:         r.created_at.toISOString(),
      updatedAt:         r.updated_at.toISOString(),
    };

    // Load last 20 transactions
    let txRows: RawEscrowTransactionListRow[];
    const resolvedTenantId = r.tenant_id;
    try {
      txRows = (await this.db.$queryRaw`
        SELECT id, tenant_id, escrow_id, entry_type, direction,
               amount::TEXT AS amount, currency, reference_id, metadata,
               created_by_user_id, created_at
        FROM public.escrow_transactions
        WHERE escrow_id = ${escrowId}::uuid
          AND tenant_id = ${resolvedTenantId}::uuid
        ORDER BY created_at DESC
        LIMIT ${BigInt(20)}
      `) as RawEscrowTransactionListRow[];
    } catch (err) {
      return {
        status: 'ERROR',
        code: 'DB_ERROR',
        message: err instanceof Error ? err.message : 'DB error loading escrow transactions.',
      };
    }

    const transactions = txRows.map(t => ({
      id:              t.id,
      tenantId:        t.tenant_id,
      escrowId:        t.escrow_id,
      entryType:       t.entry_type,
      direction:       t.direction,
      amount:          t.amount,
      currency:        t.currency,
      referenceId:     t.reference_id ?? null,
      metadata:        t.metadata as Record<string, unknown>,
      createdByUserId: t.created_by_user_id ?? null,
      createdAt:       t.created_at.toISOString(),
    }));

    // Derived balance
    const balanceResult = await this.computeDerivedBalance(escrowId);
    const balance = balanceResult.status === 'OK' ? balanceResult.balance : 0;

    return { status: 'OK', escrow: account, recentTransactions: transactions, balance };
  }
}
