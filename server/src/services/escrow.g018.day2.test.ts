/**
 * G-018 — EscrowService Unit Tests (Day 2)
 * Task ID: G-018-DAY2-ESCROW-SERVICE
 *
 * Unit tests for EscrowService (ledger + lifecycle governance).
 * All Prisma DB calls are mocked — no real database required.
 * EscalationService, StateMachineService, and MakerCheckerService are injected as mocks.
 *
 * Test count: 8 (meets minimum requirement per G-018 Day 2 spec)
 * Coverage areas:
 *   Ledger (4): HOLD CREDIT, RELEASE DEBIT, duplicate referenceId, currency mismatch
 *   Lifecycle (4): freeze gate, aiTriggered violation, PENDING_APPROVAL, APPLIED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { EscrowService } from './escrow.service.js';
import { GovError } from './escalation.types.js';

// ─── Mock DB Type ─────────────────────────────────────────────────────────────

interface MockDb {
  lifecycleState: { findFirst: Mock };
  $queryRaw: Mock;
  $executeRaw: Mock;
  $transaction: Mock;
}

// ─── Mock Factory Helpers ─────────────────────────────────────────────────────

function makeDb(): MockDb {
  const db: MockDb = {
    lifecycleState: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    // G-020: $transaction calls the callback with db itself so both SM log and
    // $executeRaw UPDATE share the same mock instance (atomic boundary simulation)
    $transaction: vi.fn((cb: (tx: MockDb) => unknown) => cb(db)),
  };
  return db;
}

function makeStateMachine() {
  return {
    transition: vi.fn(),
  };
}

function makeEscalation() {
  return {
    checkEntityFreeze: vi.fn().mockResolvedValue(undefined), // default: not frozen
    checkOrgFreeze: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMakerChecker() {
  return {
    createApprovalRequest: vi.fn(),
  };
}

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-0000-0000-000000000001';
const ESCROW_ID = 'escrow-uuid-0000-0000-000000000001';
const APPROVAL_ID = 'approval-uuid-000-0000-000000000001';

/** Raw row returned by $queryRaw for escrow_accounts (snake_case = DB column names). */
const ESCROW_ROW = {
  id: ESCROW_ID,
  tenant_id: TENANT_ID,
  currency: 'USD',
  lifecycle_state_id: 'draft-state-uuid-0000-000000000001',
};

const FROM_STATE = { stateKey: 'DRAFT' };
const TO_STATE = { id: 'confirmed-state-uuid-000000000001' };

const SM_APPLIED = {
  status: 'APPLIED' as const,
  transitionId: 'log-uuid-0000-0000-0000-000000000001',
  entityType: 'ESCROW' as const,
  entityId: ESCROW_ID,
  fromStateKey: 'DRAFT',
  toStateKey: 'ACTIVE',
  createdAt: new Date(),
};

const SM_PENDING = {
  status: 'PENDING_APPROVAL' as const,
  requiredActors: ['MAKER', 'CHECKER'] as ('MAKER' | 'CHECKER')[],
  entityType: 'ESCROW' as const,
  fromStateKey: 'DRAFT',
  toStateKey: 'ACTIVE',
};

const VALID_TRANSITION_INPUT = {
  escrowId: ESCROW_ID,
  tenantId: TENANT_ID,
  toStateKey: 'ACTIVE',
  actorType: 'TENANT_ADMIN' as const,
  actorAdminId: 'admin-uuid-0000-0000-000000000001',
  actorRole: 'TENANT_ADMIN',
  reason: 'Escrow activated after KYC clearance by compliance team.',
};

const VALID_RECORD_INPUT = {
  escrowId: ESCROW_ID,
  tenantId: TENANT_ID,
  amount: 10000,
  direction: 'CREDIT' as const,
  entryType: 'HOLD' as const,
  currency: 'USD',
  metadata: { note: 'Initial hold' },
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('EscrowService', () => {
  let db: ReturnType<typeof makeDb>;
  let sm: ReturnType<typeof makeStateMachine>;
  let esc: ReturnType<typeof makeEscalation>;
  let mc: ReturnType<typeof makeMakerChecker>;
  let svc: EscrowService;

  beforeEach(() => {
    db = makeDb();
    sm = makeStateMachine();
    esc = makeEscalation();
    mc = makeMakerChecker();
    svc = new EscrowService(db as never, sm as never, esc as never, mc as never);
  });

  // ── Ledger Tests ─────────────────────────────────────────────────────────────

  it('E-01: HOLD CREDIT — inserts successfully and returns RECORDED', async () => {
    // $queryRaw call 1: load escrow account
    (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
    // $queryRaw call 2: INSERT … RETURNING id
    (db.$queryRaw as Mock).mockResolvedValueOnce([{ id: 'tx-uuid-hold-001' }]);

    const result = await svc.recordTransaction(VALID_RECORD_INPUT);

    expect(result.status).toBe('RECORDED');
    expect(
      (result as { status: 'RECORDED'; transactionId: string }).transactionId,
    ).toBe('tx-uuid-hold-001');
    // $queryRaw called twice: once for escrow load, once for INSERT RETURNING
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('E-02: RELEASE DEBIT — inserts successfully and returns RECORDED', async () => {
    (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
    (db.$queryRaw as Mock).mockResolvedValueOnce([{ id: 'tx-uuid-release-002' }]);

    const result = await svc.recordTransaction({
      ...VALID_RECORD_INPUT,
      direction: 'DEBIT',
      entryType: 'RELEASE',
      amount: 5000,
      metadata: { note: 'Release to seller' },
    });

    expect(result.status).toBe('RECORDED');
    expect(
      (result as { status: 'RECORDED'; transactionId: string }).transactionId,
    ).toBe('tx-uuid-release-002');
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('E-03: Duplicate referenceId — returns DUPLICATE_REFERENCE and does NOT insert', async () => {
    const referenceId = 'ext-ref-idempotency-001';

    // Call 1: load escrow account
    (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
    // Call 2: duplicate check — returns existing transaction row
    (db.$queryRaw as Mock).mockResolvedValueOnce([{ id: 'existing-tx-uuid-0001' }]);

    const result = await svc.recordTransaction({
      ...VALID_RECORD_INPUT,
      referenceId,
    });

    expect(result.status).toBe('DUPLICATE_REFERENCE');
    expect(
      (result as { status: 'DUPLICATE_REFERENCE'; existingTransactionId: string })
        .existingTransactionId,
    ).toBe('existing-tx-uuid-0001');

    // $queryRaw called twice (escrow load + duplicate check), NOT a third time (INSERT)
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('E-04: Currency mismatch — blocks insert before DB write', async () => {
    // Escrow account is denominated in EUR, but input requests USD
    (db.$queryRaw as Mock).mockResolvedValueOnce([{ ...ESCROW_ROW, currency: 'EUR' }]);

    const result = await svc.recordTransaction({ ...VALID_RECORD_INPUT, currency: 'USD' });

    expect(result.status).toBe('ERROR');
    expect(
      (result as { status: 'ERROR'; code: string }).code,
    ).toBe('CURRENCY_MISMATCH');
    // Only one $queryRaw call (escrow load); no duplicate check or INSERT should occur
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  // ── Lifecycle Transition Tests ─────────────────────────────────────────────

  it('E-05: Freeze gate — blocks transition; StateMachineService.transition NOT called', async () => {
    // Load escrow account succeeds
    (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
    // Freeze gate fires before SM call
    (esc.checkEntityFreeze as Mock).mockRejectedValueOnce(
      new GovError('ENTITY_FROZEN', 'Escrow escrow-uuid-001 is frozen (severity >= 3).'),
    );

    const result = await svc.transitionEscrow(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('ENTITY_FROZEN');
    // StateMachineService must NOT have been called when frozen (D-022-C enforcement)
    expect(sm.transition).not.toHaveBeenCalled();
  });

  it(
    'E-06: aiTriggered without HUMAN_CONFIRMED — blocks before StateMachineService call',
    async () => {
      // Load escrow account succeeds
      (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
      // Freeze gate passes
      (esc.checkEntityFreeze as Mock).mockResolvedValueOnce(undefined);

      const result = await svc.transitionEscrow({
        ...VALID_TRANSITION_INPUT,
        aiTriggered: true,
        // reason does NOT contain "HUMAN_CONFIRMED:" — AI boundary violation
        reason: 'AI recommended activating escrow based on risk model output.',
      });

      expect(result.status).toBe('ERROR');
      expect(
        (result as { status: 'ERROR'; code: string }).code,
      ).toBe('AI_HUMAN_CONFIRMATION_REQUIRED');
      // StateMachineService must NOT have been called (D-020-C gate precedes SM)
      expect(sm.transition).not.toHaveBeenCalled();
    },
  );

  it(
    'E-07: PENDING_APPROVAL — lifecycle_state_id NOT updated; MakerCheckerService called',
    async () => {
      // Load escrow account
      (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
      // Freeze gate passes
      (esc.checkEntityFreeze as Mock).mockResolvedValueOnce(undefined);
      // fromState resolution
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(FROM_STATE);
      // SM returns PENDING_APPROVAL (maker-checker required for this transition)
      (sm.transition as Mock).mockResolvedValueOnce(SM_PENDING);
      // MakerChecker creates approval request
      (mc.createApprovalRequest as Mock).mockResolvedValueOnce({
        status: 'CREATED',
        approvalId: APPROVAL_ID,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await svc.transitionEscrow(VALID_TRANSITION_INPUT);

      expect(result.status).toBe('PENDING_APPROVAL');
      const pending = result as {
        status: 'PENDING_APPROVAL';
        escrowId: string;
        fromStateKey: string;
        toStateKey: string;
        requiredActors: string[];
        approvalId?: string;
      };
      expect(pending.escrowId).toBe(ESCROW_ID);
      expect(pending.fromStateKey).toBe('DRAFT');
      expect(pending.requiredActors).toContain('MAKER');
      expect(pending.approvalId).toBe(APPROVAL_ID);

      // lifecycle_state_id must NOT be mutated — no $executeRaw call (no UPDATE)
      expect(db.$executeRaw).not.toHaveBeenCalled();

      // MakerCheckerService.createApprovalRequest must have been called
      expect(mc.createApprovalRequest).toHaveBeenCalledOnce();
      expect(mc.createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: TENANT_ID,
          entityType: 'ESCROW',
          entityId: ESCROW_ID,
          fromStateKey: 'DRAFT',
          toStateKey: 'ACTIVE',
        }),
      );
    },
  );

  it(
    'E-08: APPLIED — lifecycle_state_id updated via $executeRaw; returns APPLIED',
    async () => {
      // Load escrow account
      (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
      // Freeze gate passes
      (esc.checkEntityFreeze as Mock).mockResolvedValueOnce(undefined);
      // fromState resolution (first lifecycleState.findFirst call)
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(FROM_STATE);
      // SM returns APPLIED; lifecycle log written by SM internally
      (sm.transition as Mock).mockResolvedValueOnce(SM_APPLIED);
      // toState resolution (second lifecycleState.findFirst call)
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE);
      // $executeRaw for UPDATE escrow_accounts success
      (db.$executeRaw as Mock).mockResolvedValueOnce(1);

      const result = await svc.transitionEscrow(VALID_TRANSITION_INPUT);

      expect(result.status).toBe('APPLIED');
      const applied = result as {
        status: 'APPLIED';
        escrowId: string;
        fromStateKey: string;
        toStateKey: string;
        transitionId?: string;
      };
      expect(applied.escrowId).toBe(ESCROW_ID);
      expect(applied.fromStateKey).toBe('DRAFT');
      expect(applied.toStateKey).toBe('ACTIVE');
      expect(applied.transitionId).toBe(SM_APPLIED.transitionId);

      // $executeRaw must have been called exactly once (UPDATE lifecycle_state_id)
      expect(db.$executeRaw).toHaveBeenCalledOnce();

      // MakerCheckerService must NOT have been called for APPLIED path
      expect(mc.createApprovalRequest).not.toHaveBeenCalled();
    },
  );

  it(
    'E-09: APPLIED atomicity — if $executeRaw throws inside $transaction, returns DB_ERROR (SM log rolled back)',
    async () => {
      (db.$queryRaw as Mock).mockResolvedValueOnce([ESCROW_ROW]);
      (esc.checkEntityFreeze as Mock).mockResolvedValueOnce(undefined);
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(FROM_STATE); // fromState (outside tx)
      (sm.transition as Mock).mockResolvedValueOnce(SM_APPLIED);               // SM returns APPLIED (inside tx)
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE);   // toState (inside tx)
      // Simulate atomic failure: $executeRaw throws → $transaction rolls back SM log too
      (db.$executeRaw as Mock).mockRejectedValueOnce(new Error('escrow update DB error'));

      const result = await svc.transitionEscrow(VALID_TRANSITION_INPUT);

      // Must return DB_ERROR — SM log write + $executeRaw share same tx → both rolled back
      expect(result.status).toBe('ERROR');
      const err = result as { status: 'ERROR'; code: string; message: string };
      expect(err.code).toBe('DB_ERROR');
      expect(err.message).toContain('escrow update DB error');
    },
  );
});
