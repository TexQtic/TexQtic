/**
 * G-017 — TradeService Unit Tests (Day 2)
 * Task ID: G-017-DAY2-TRADE-SERVICE-LIFECYCLE
 *
 * Unit tests for TradeService.createTrade() and TradeService.transitionTrade().
 * All Prisma DB calls are mocked — no real database required.
 * EscalationService and StateMachineService are injected as mocks.
 *
 * Test count: 12 (meets minimum requirement)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { TradeService } from './trade.g017.service.js';
import { GovError } from './escalation.types.js';

// ─── Mock DB type ────────────────────────────────────────────────────────────

interface MockDb {
  lifecycleState: { findFirst: Mock };
  trade: { findFirst: Mock; create: Mock; update: Mock };
  tradeEvent: { create: Mock };
  $queryRaw: Mock;
  $transaction: Mock;
}

// ─── Mock factory helpers ─────────────────────────────────────────────────────

function makeDb(): MockDb {
  const db: MockDb = {
    lifecycleState: {
      findFirst: vi.fn(),
    },
    trade: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tradeEvent: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    // $transaction calls the callback with db itself (same mock handles all methods)
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

// ── G-021 MakerCheckerService mock ────────────────────────────────────────────

function makeMakerChecker() {
  return {
    createApprovalRequest: vi.fn().mockResolvedValue({
      status: 'CREATED' as const,
      approvalId: 'approval-uuid-g021-000000000001',
      expiresAt: new Date(),
    }),
  };
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const DRAFT_STATE = { id: 'draft-state-uuid-0000-000000000001' };
const TRADE_ROW = {
  id: 'trade-uuid-0000-0000-000000000001',
  tenantId: 'tenant-uuid-0000-0000-000000000001',
  lifecycleStateId: 'draft-state-uuid-0000-000000000001',
};
const TO_STATE = { id: 'confirmed-state-uuid-000000000001' };
const SM_APPLIED = {
  status: 'APPLIED' as const,
  transitionId: 'log-uuid-0000-0000-000000000001',
  entityType: 'TRADE' as const,
  entityId: TRADE_ROW.id,
  fromStateKey: 'DRAFT',
  toStateKey: 'ORDER_CONFIRMED',
  createdAt: new Date(),
};
const SM_PENDING = {
  status: 'PENDING_APPROVAL' as const,
  requiredActors: ['MAKER', 'CHECKER'] as ('MAKER' | 'CHECKER')[],
  entityType: 'TRADE' as const,
  fromStateKey: 'DRAFT',
  toStateKey: 'ORDER_CONFIRMED',
};
const SM_DENIED = {
  status: 'DENIED' as const,
  code: 'TRANSITION_NOT_PERMITTED',
  message: 'No allowed transition exists for this edge.',
};

const VALID_CREATE_INPUT = {
  tenantId: TRADE_ROW.tenantId,
  buyerOrgId: 'buyer-org-uuid-0000-000000000001',
  sellerOrgId: 'seller-org-uuid-000000000001',
  tradeReference: 'TRD-2026-001',
  currency: 'USD',
  grossAmount: 50000,
  reason: 'New trade initiated by account manager',
};

const VALID_TRANSITION_INPUT = {
  tradeId: TRADE_ROW.id,
  tenantId: TRADE_ROW.tenantId,
  toStateKey: 'ORDER_CONFIRMED',
  actorType: 'TENANT_ADMIN' as const,
  actorAdminId: 'admin-uuid-0000-0000-000000000001',
  actorRole: 'TENANT_ADMIN',
  reason: 'Buyer and seller have agreed on terms.',
};

const VALID_CREATE_ESCROW_INPUT = {
  tradeId: TRADE_ROW.id,
  tenantId: TRADE_ROW.tenantId,
  reason: 'Escrow required before fulfillment starts.',
  createdByUserId: 'user-uuid-0000-0000-000000000001',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TradeService', () => {
  let db: ReturnType<typeof makeDb>;
  let sm: ReturnType<typeof makeStateMachine>;
  let esc: ReturnType<typeof makeEscalation>;
  let svc: TradeService;

  beforeEach(() => {
    db = makeDb();
    sm = makeStateMachine();
    esc = makeEscalation();
    svc = new TradeService(
      db as never,
      sm as never,
      esc as never,
    );
  });

  // ── createTrade tests ────────────────────────────────────────────────────────

  it('T-01: createTrade success — writes Trade + TradeEvent inside transaction', async () => {
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(DRAFT_STATE);
    (db.trade.create as Mock).mockResolvedValueOnce({
      id: TRADE_ROW.id,
      tradeReference: VALID_CREATE_INPUT.tradeReference,
    });
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-001' });

    const result = await svc.createTrade(VALID_CREATE_INPUT);

    expect(result.status).toBe('CREATED');
    expect((result as { status: 'CREATED'; tradeId: string }).tradeId).toBe(TRADE_ROW.id);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.trade.create).toHaveBeenCalledOnce();
    expect(db.tradeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRADE_CREATED' }),
      }),
    );
  });

  it('T-02: createTrade rejects grossAmount <= 0', async () => {
    const result = await svc.createTrade({ ...VALID_CREATE_INPUT, grossAmount: 0 });

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('DB_ERROR');
    expect(db.trade.create).not.toHaveBeenCalled();
  });

  it('T-03: createTrade rejects negative grossAmount', async () => {
    const result = await svc.createTrade({ ...VALID_CREATE_INPUT, grossAmount: -100 });

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('DB_ERROR');
  });

  it('T-04: createTrade rejects missing reason', async () => {
    const result = await svc.createTrade({ ...VALID_CREATE_INPUT, reason: '' });

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('REASON_REQUIRED');
    expect(db.lifecycleState.findFirst).not.toHaveBeenCalled();
  });

  it('T-05: createTrade returns INVALID_LIFECYCLE_STATE when DRAFT state is missing', async () => {
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(null); // DRAFT not found

    const result = await svc.createTrade(VALID_CREATE_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('INVALID_LIFECYCLE_STATE');
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('T-05b: createEscrowForTrade creates escrow and links trade atomically', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce({
      id: TRADE_ROW.id,
      tenantId: TRADE_ROW.tenantId,
      currency: 'USD',
      escrow_id: null,
    });
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ id: 'escrow-draft-state-uuid-001' });
    (db.$queryRaw as Mock).mockResolvedValueOnce([{ id: 'escrow-uuid-0000-0000-000000000001' }]);
    (db.trade.update as Mock).mockResolvedValueOnce({});
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-escrow-001' });

    const result = await svc.createEscrowForTrade(VALID_CREATE_ESCROW_INPUT);

    expect(result.status).toBe('CREATED');
    expect(result).toMatchObject({
      status: 'CREATED',
      tradeId: TRADE_ROW.id,
      escrowId: 'escrow-uuid-0000-0000-000000000001',
      currency: 'USD',
    });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.trade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TRADE_ROW.id },
        data: { escrow_id: 'escrow-uuid-0000-0000-000000000001' },
      }),
    );
    expect(db.tradeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRADE_ESCROW_LINKED' }),
      }),
    );
  });

  it('T-05c: createEscrowForTrade rejects trades that already have an escrow linked', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce({
      id: TRADE_ROW.id,
      tenantId: TRADE_ROW.tenantId,
      currency: 'USD',
      escrow_id: 'escrow-uuid-existing-0001',
    });

    const result = await svc.createEscrowForTrade(VALID_CREATE_ESCROW_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('ESCROW_ALREADY_LINKED');
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── transitionTrade tests ────────────────────────────────────────────────────

  it('T-06: transitionTrade returns NOT_FOUND when trade does not exist', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(null);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('NOT_FOUND');
    expect(esc.checkEntityFreeze).not.toHaveBeenCalled();
    expect(sm.transition).not.toHaveBeenCalled();
  });

  it('T-07: transitionTrade blocks when entity is frozen (FROZEN_BY_ESCALATION)', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (esc.checkEntityFreeze as Mock).mockRejectedValueOnce(
      new GovError(
        'ENTITY_FROZEN',
        'Entity TRADE:trade-uuid is frozen — open escalation at severity LEVEL_3.',
        'esc-event-uuid-001',
      ),
    );

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('FROZEN_BY_ESCALATION');
    // StateMachineService MUST NOT be called when frozen
    expect(sm.transition).not.toHaveBeenCalled();
  });

  it('T-08: transitionTrade rejects missing reason', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    // escalation passes (default mock: not frozen)

    const result = await svc.transitionTrade({
      ...VALID_TRANSITION_INPUT,
      reason: '   ',
    });

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('REASON_REQUIRED');
    expect(sm.transition).not.toHaveBeenCalled();
  });

  it('T-09: transitionTrade calls StateMachineService when trade is not frozen', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' }); // fromState
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE); // toState
    (db.trade.update as Mock).mockResolvedValueOnce({});
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-002' });
    sm.transition.mockResolvedValueOnce(SM_APPLIED);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(sm.transition).toHaveBeenCalledOnce();
    expect(sm.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'TRADE',
        entityId: TRADE_ROW.id,
        fromStateKey: 'DRAFT',
        toStateKey: 'ORDER_CONFIRMED',
      }),
      // G-020: SM is now called with { db: txDb } so log + entity update share one tx
      expect.objectContaining({ db: expect.anything() }),
    );
    expect(result.status).toBe('APPLIED');
  });

  it('T-10: transitionTrade APPLIED — updates lifecycleStateId + writes TRADE_TRANSITION_APPLIED event', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE);
    (db.trade.update as Mock).mockResolvedValueOnce({});
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-003' });
    sm.transition.mockResolvedValueOnce(SM_APPLIED);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('APPLIED');
    // trade.update must have been called with the toState id
    expect(db.trade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TRADE_ROW.id },
        data: { lifecycleStateId: TO_STATE.id },
      }),
    );
    // tradeEvent must be TRADE_TRANSITION_APPLIED
    expect(db.tradeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRADE_TRANSITION_APPLIED' }),
      }),
    );
    // The two writes happen inside a transaction
    expect(db.$transaction).toHaveBeenCalled();
  });

  it('T-11: transitionTrade PENDING_APPROVAL — does NOT update lifecycleStateId, writes PENDING event', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-004' });
    sm.transition.mockResolvedValueOnce(SM_PENDING);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('PENDING_APPROVAL');
    const pending = result as { status: 'PENDING_APPROVAL'; requiredActors: string[] };
    expect(pending.requiredActors).toContain('MAKER');
    expect(pending.requiredActors).toContain('CHECKER');
    // trade.update MUST NOT have been called
    expect(db.trade.update).not.toHaveBeenCalled();
    // trade_events must record PENDING
    expect(db.tradeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'TRADE_TRANSITION_PENDING' }),
      }),
    );
  });

  it('T-12: transitionTrade maps StateMachine DENIED to STATE_MACHINE_ERROR', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    sm.transition.mockResolvedValueOnce(SM_DENIED);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    expect(result.status).toBe('ERROR');
    expect((result as { status: 'ERROR'; code: string }).code).toBe('STATE_MACHINE_ERROR');
    expect((result as { status: 'ERROR'; message: string }).message).toContain(
      'TRANSITION_NOT_PERMITTED',
    );
    expect(db.trade.update).not.toHaveBeenCalled();
  });

  it('T-13: transitionTrade — AI triggered without HUMAN_CONFIRMED prefix returns STATE_MACHINE_ERROR', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    // escalation: not frozen (default)

    const result = await svc.transitionTrade({
      ...VALID_TRANSITION_INPUT,
      aiTriggered: true,
      reason: 'AI suggested this transition.', // missing HUMAN_CONFIRMED:
    });

    expect(result.status).toBe('ERROR');
    const err = result as { status: 'ERROR'; code: string; message: string };
    expect(err.code).toBe('STATE_MACHINE_ERROR');
    expect(err.message).toContain('AI_BOUNDARY_VIOLATION');
    // StateMachine must NOT be called — TradeService catches this first
    expect(sm.transition).not.toHaveBeenCalled();
  });

  it('T-14: transitionTrade — AI triggered WITH HUMAN_CONFIRMED prefix proceeds to StateMachine', async () => {
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE);
    (db.trade.update as Mock).mockResolvedValueOnce({});
    (db.tradeEvent.create as Mock).mockResolvedValueOnce({ id: 'event-uuid-005' });
    sm.transition.mockResolvedValueOnce(SM_APPLIED);

    const result = await svc.transitionTrade({
      ...VALID_TRANSITION_INPUT,
      aiTriggered: true,
      reason: 'HUMAN_CONFIRMED: Trade confirmed by account manager after AI recommendation.',
    });

    expect(sm.transition).toHaveBeenCalledOnce();
    expect(result.status).toBe('APPLIED');
  });

  it(
    'T-15: transitionTrade atomicity — if trade.update throws inside $transaction, returns DB_ERROR (SM log rolled back)',
    async () => {
      (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' }); // fromState
      (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce(TO_STATE);              // toState inside tx
      sm.transition.mockResolvedValueOnce(SM_APPLIED);
      // Simulate atomic failure: trade.update throws → $transaction rolls back SM log too
      (db.trade.update as Mock).mockRejectedValueOnce(new Error('unique constraint violation'));

      const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

      // Must return DB_ERROR; SM log + trade.update share the same tx — both rolled back
      expect(result.status).toBe('ERROR');
      const err = result as { status: 'ERROR'; code: string; message: string };
      expect(err.code).toBe('DB_ERROR');
      expect(err.message).toContain('unique constraint violation');
    },
  );

  // ── G-021 tests (T1, T2) ──────────────────────────────────────────────────

  it('T-G021-1: transitionTrade PENDING_APPROVAL with MC injected — creates approvalId', async () => {
    const mc = makeMakerChecker();
    const svcWithMc = new TradeService(
      db as never,
      sm as never,
      esc as never,
      mc as never,
    );

    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    (db.tradeEvent.create as Mock).mockResolvedValue({ id: 'event-pending-001' });
    sm.transition.mockResolvedValueOnce(SM_PENDING);

    const result = await svcWithMc.transitionTrade(VALID_TRANSITION_INPUT);

    // Status must be PENDING_APPROVAL
    expect(result.status).toBe('PENDING_APPROVAL');
    const r = result as Extract<typeof result, { status: 'PENDING_APPROVAL' }>;
    // approvalId must be set (MC injected + createApprovalRequest returned CREATED)
    expect(r.approvalId).toBe('approval-uuid-g021-000000000001');
    // MC must have been called with correct entity data
    expect(mc.createApprovalRequest).toHaveBeenCalledOnce();
    expect(mc.createApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'TRADE',
        entityId:   TRADE_ROW.id,
        orgId:      TRADE_ROW.tenantId,
        fromStateKey: 'DRAFT',
      }),
    );
    // trade.update MUST NOT have been called (no lifecycle change for PENDING_APPROVAL)
    expect(db.trade.update).not.toHaveBeenCalled();
  });

  it('T-G021-2: transitionTrade PENDING_APPROVAL without MC injection — returns PENDING_APPROVAL, approvalId absent', async () => {
    // svc constructed without mcSvc (in beforeEach) — documented fallback
    (db.trade.findFirst as Mock).mockResolvedValueOnce(TRADE_ROW);
    (db.lifecycleState.findFirst as Mock).mockResolvedValueOnce({ stateKey: 'DRAFT' });
    (db.tradeEvent.create as Mock).mockResolvedValue({ id: 'event-pending-002' });
    sm.transition.mockResolvedValueOnce(SM_PENDING);

    const result = await svc.transitionTrade(VALID_TRANSITION_INPUT);

    // Status must still be PENDING_APPROVAL
    expect(result.status).toBe('PENDING_APPROVAL');
    const r = result as Extract<typeof result, { status: 'PENDING_APPROVAL' }>;
    // Without MC, approvalId must be undefined (no pending_approvals row created)
    expect(r.approvalId).toBeUndefined();
    // trade.update MUST NOT have been called
    expect(db.trade.update).not.toHaveBeenCalled();
  });
});
