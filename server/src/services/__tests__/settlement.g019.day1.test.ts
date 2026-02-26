/**
 * G-019 — SettlementService Unit Tests (Day 1)
 * Task ID: G-019-DAY1-SETTLEMENT-SERVICE
 *
 * Tests S-01 through S-06 verify the 10-step enforcement pipeline.
 * All DB and service dependencies are fully mocked — no real Prisma client.
 *
 * Toggle invariants under test:
 *   TOGGLE_A = A1  lifecycle keys: SETTLEMENT_ACKNOWLEDGED, CLOSED, RELEASED
 *   TOGGLE_B = B1  ledger-only: recordTransaction(entryType='RELEASE', direction='DEBIT')
 *   TOGGLE_C = C3  dual enforcement: freeze gate (Step 3) + dispute gate (Step 4)
 *
 * Doctrine v1.4 Safe-Write assertions:
 *   S-01: Freeze gate blocks BEFORE ledger insert (recordTransaction NOT called)
 *   S-02: DISPUTED blocks BEFORE ledger insert (recordTransaction NOT called)
 *   S-03: AI boundary blocks without "HUMAN_CONFIRMED:" marker
 *   S-04: Insufficient funds blocks BEFORE ledger insert (recordTransaction NOT called)
 *   S-05: DUPLICATE_REFERENCE blocks AFTER ledger (transitionTrade NOT called)
 *   S-06: Happy path — writeAudit called with (mockDb, { action: 'SETTLEMENT_APPLIED' })
 */

import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient }    from '@prisma/client';
import type { TradeService }    from '../trade.g017.service.js';
import type { EscrowService }   from '../escrow.service.js';
import type { EscalationService } from '../escalation.service.js';
import { GovError }             from '../escalation.types.js';
import { SettlementService }    from '../settlement/settlement.service.js';
import type { WriteAuditLogFn } from '../settlement/settlement.service.js';
import type { SettleTradeInput } from '../settlement/settlement.types.js';

// ─── Shared fixture constants ─────────────────────────────────────────────────

const TRADE_ID  = 'trade-uuid-0000-0000-000000000001';
const ESCROW_ID = 'escrow-uuid-0000-0000-000000000001';
const TENANT_ID = 'tenant-uuid-0000-0000-000000000001';
const TXN_ID    = 'txn-settle-uuid-000000000001';

/** Minimal trade row shape returned by db.trade.findFirst with lifecycleState select. */
const makeTradeRow = (stateKey: string) => ({
  id:               TRADE_ID,
  tenantId:         TENANT_ID,
  lifecycleStateId: 'state-uuid-001',
  lifecycleState:   { stateKey },
});

/** Minimal escrow detail shape (status='OK'). */
const ESCROW_DETAIL_OK = {
  status:             'OK' as const,
  escrow: {
    id:                ESCROW_ID,
    tenantId:          TENANT_ID,
    currency:          'USD',
    lifecycleStateId:  'escrow-state-001',
    lifecycleStateKey: 'RELEASE_PENDING',
    createdByUserId:   null,
    createdAt:         '2026-01-01T00:00:00.000Z',
    updatedAt:         '2026-01-01T00:00:00.000Z',
  },
  balance:            1000,
  recentTransactions: [],
  message:            '',
};

/** Base valid input — all guardrails pass when used as-is. */
const VALID_INPUT: SettleTradeInput = {
  tradeId:     TRADE_ID,
  escrowId:    ESCROW_ID,
  tenantId:    TENANT_ID,
  amount:      500,
  currency:    'USD',
  referenceId: 'SETTLEMENT:batch-s06-001',
  reason:      'Settlement authorised by trade desk.',
  aiTriggered: false,
  actorType:   'MAKER',
  actorUserId: 'user-maker-001',
  actorRole:   'MAKER',
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function buildMocks() {
  const mockDb = {
    trade: {
      findFirst: vi.fn(),
    },
    allowedTransition: {
      findFirst: vi.fn(),
    },
  } as unknown as PrismaClient;

  const mockTradeSvc = {
    transitionTrade: vi.fn(),
  } as unknown as TradeService;

  const mockEscrowSvc = {
    getEscrowAccountDetail: vi.fn(),
    computeDerivedBalance:  vi.fn(),
    recordTransaction:      vi.fn(),
    transitionEscrow:       vi.fn(),
  } as unknown as EscrowService;

  const mockEscalationSvc = {
    checkEntityFreeze: vi.fn(),
  } as unknown as EscalationService;

  const mockWriteAudit: WriteAuditLogFn = vi.fn().mockResolvedValue(undefined);

  const svc = new SettlementService(
    mockDb,
    mockTradeSvc,
    mockEscrowSvc,
    mockEscalationSvc,
    mockWriteAudit,
  );

  return { mockDb, mockTradeSvc, mockEscrowSvc, mockEscalationSvc, mockWriteAudit, svc };
}

// ─── Helper: configure "pass-through" mocks for all gates before a given step ─

function configureGatesUpToLedger(
  mockDb: PrismaClient,
  mockEscrowSvc: EscrowService,
  mockEscalationSvc: EscalationService,
  overrides: {
    stateKey?: string;
    balance?: number;
  } = {},
) {
  const stateKey = overrides.stateKey ?? 'SETTLEMENT_PENDING';
  const balance  = overrides.balance  ?? 1000;

  // Step 2: load trade
  (mockDb.trade.findFirst as ReturnType<typeof vi.fn>)
    .mockResolvedValue(makeTradeRow(stateKey));

  // Step 2: load escrow
  (mockEscrowSvc.getEscrowAccountDetail as ReturnType<typeof vi.fn>)
    .mockResolvedValue(ESCROW_DETAIL_OK);

  // Step 3: freeze gate — resolves (no throw)
  (mockEscalationSvc.checkEntityFreeze as ReturnType<typeof vi.fn>)
    .mockResolvedValue(undefined);

  // Step 6: MC pre-check — no MC required
  (mockDb.allowedTransition.findFirst as ReturnType<typeof vi.fn>)
    .mockResolvedValue({ requiresMakerChecker: false });

  // Step 7: balance
  (mockEscrowSvc.computeDerivedBalance as ReturnType<typeof vi.fn>)
    .mockResolvedValue({ status: 'OK', balance });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettlementService.settleTrade [G-019 Day 1]', () => {

  // ── S-01: Freeze gate blocks before ledger ──────────────────────────────────

  describe('S-01: freeze gate (TOGGLE_C=C3 Layer 2)', () => {
    it('returns ENTITY_FROZEN and does NOT call recordTransaction', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, svc } = buildMocks();

      // Step 2: trade + escrow load succeed
      (mockDb.trade.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValue(makeTradeRow('SETTLEMENT_PENDING'));
      (mockEscrowSvc.getEscrowAccountDetail as ReturnType<typeof vi.fn>)
        .mockResolvedValue(ESCROW_DETAIL_OK);

      // Step 3: TRADE freeze check throws GovError
      (mockEscalationSvc.checkEntityFreeze as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(
          new GovError('ENTITY_FROZEN', 'Trade is frozen due to open escalation of severity 3.'),
        );

      const result = await svc.settleTrade(VALID_INPUT);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('ENTITY_FROZEN');
      }
      // Ledger must NOT have been touched
      expect(mockEscrowSvc.recordTransaction).not.toHaveBeenCalled();
    });
  });

  // ── S-02: DISPUTED gate blocks before ledger ────────────────────────────────

  describe('S-02: dispute gate (TOGGLE_C=C3 Layer 1)', () => {
    it('returns TRADE_DISPUTED and does NOT call recordTransaction', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, svc } = buildMocks();

      // Trade is in DISPUTED state
      (mockDb.trade.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValue(makeTradeRow('DISPUTED'));
      (mockEscrowSvc.getEscrowAccountDetail as ReturnType<typeof vi.fn>)
        .mockResolvedValue(ESCROW_DETAIL_OK);
      // Freeze gate passes (not frozen)
      (mockEscalationSvc.checkEntityFreeze as ReturnType<typeof vi.fn>)
        .mockResolvedValue(undefined);

      const result = await svc.settleTrade(VALID_INPUT);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('TRADE_DISPUTED');
        expect(result.message).toContain('DISPUTED');
      }
      expect(mockEscrowSvc.recordTransaction).not.toHaveBeenCalled();
    });
  });

  // ── S-03: AI boundary blocks without HUMAN_CONFIRMED marker ────────────────

  describe('S-03: AI boundary gate (D-020-C)', () => {
    it('returns AI_HUMAN_CONFIRMATION_REQUIRED when aiTriggered=true and reason lacks HUMAN_CONFIRMED', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, svc } = buildMocks();

      configureGatesUpToLedger(mockDb, mockEscrowSvc, mockEscalationSvc);

      const aiInput: SettleTradeInput = {
        ...VALID_INPUT,
        aiTriggered: true,
        reason:      'Settlement authorised by trade desk.', // no "HUMAN_CONFIRMED:" marker
      };

      const result = await svc.settleTrade(aiInput);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('AI_HUMAN_CONFIRMATION_REQUIRED');
        expect(result.message).toContain('HUMAN_CONFIRMED:');
      }
      expect(mockEscrowSvc.recordTransaction).not.toHaveBeenCalled();
    });
  });

  // ── S-04: Insufficient funds blocks before ledger insert ────────────────────

  describe('S-04: balance sufficiency gate (TOGGLE_B=B1, D-020-B)', () => {
    it('returns INSUFFICIENT_ESCROW_FUNDS when balance < amount, does NOT call recordTransaction', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, svc } = buildMocks();

      // balance = 100, amount = 500 → insufficient
      configureGatesUpToLedger(mockDb, mockEscrowSvc, mockEscalationSvc, { balance: 100 });

      const result = await svc.settleTrade({ ...VALID_INPUT, amount: 500 });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('INSUFFICIENT_ESCROW_FUNDS');
        expect(result.message).toContain('100');
        expect(result.message).toContain('500');
      }
      expect(mockEscrowSvc.recordTransaction).not.toHaveBeenCalled();
    });
  });

  // ── S-05: DUPLICATE_REFERENCE blocks state transitions ──────────────────────

  describe('S-05: ledger idempotency guard (TOGGLE_B=B1)', () => {
    it('returns DUPLICATE_REFERENCE and does NOT call transitionTrade', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, mockTradeSvc, svc } = buildMocks();

      configureGatesUpToLedger(mockDb, mockEscrowSvc, mockEscalationSvc);

      // Ledger insert blocked: duplicate referenceId already exists
      (mockEscrowSvc.recordTransaction as ReturnType<typeof vi.fn>)
        .mockResolvedValue({
          status:                'DUPLICATE_REFERENCE',
          existingTransactionId: 'txn-already-exists-001',
          message:               'referenceId already used.',
        });

      const result = await svc.settleTrade(VALID_INPUT);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('DUPLICATE_REFERENCE');
      }
      // State machine must NOT have been invoked — no partial writes
      expect(mockTradeSvc.transitionTrade).not.toHaveBeenCalled();
      expect(mockEscrowSvc.transitionEscrow).not.toHaveBeenCalled();
    });
  });

  // ── S-06: Happy path — WriteAuditLog called with correct args ───────────────

  describe('S-06: audit emission (D-022, Step 10)', () => {
    it('emits SETTLEMENT_APPLIED audit with mockDb as first argument and returns APPLIED', async () => {
      const { mockDb, mockEscrowSvc, mockEscalationSvc, mockTradeSvc, mockWriteAudit, svc } =
        buildMocks();

      // All gates pass
      configureGatesUpToLedger(mockDb, mockEscrowSvc, mockEscalationSvc);

      // Ledger insert succeeds
      (mockEscrowSvc.recordTransaction as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ status: 'RECORDED', transactionId: TXN_ID });

      // 9a: Trade → SETTLEMENT_ACKNOWLEDGED
      (mockTradeSvc.transitionTrade as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ status: 'APPLIED' });

      // 9b: Escrow → RELEASED
      (mockEscrowSvc.transitionEscrow as ReturnType<typeof vi.fn>)
        .mockResolvedValue({ status: 'APPLIED' });

      // 9c: Trade → CLOSED (second transitionTrade call)
      (mockTradeSvc.transitionTrade as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ status: 'APPLIED' });

      const result = await svc.settleTrade(VALID_INPUT);

      // Result must be APPLIED
      expect(result.status).toBe('APPLIED');
      if (result.status === 'APPLIED') {
        expect(result.transactionId).toBe(TXN_ID);
        expect(result.escrowReleased).toBe(true);
        expect(result.tradeClosed).toBe(true);
      }

      // writeAuditLog MUST have been called exactly once (Step 10)
      expect(mockWriteAudit).toHaveBeenCalledTimes(1);

      // First arg MUST be the injected mockDb (not a different client)
      expect(mockWriteAudit).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ action: 'SETTLEMENT_APPLIED' }),
      );

      // Audit entry must include key settlement identifiers
      const [, auditEntry] = (mockWriteAudit as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(auditEntry.entity).toBe('trade');
      expect(auditEntry.entityId).toBe(TRADE_ID);
      expect(auditEntry.tenantId).toBe(TENANT_ID);
      expect(auditEntry.metadataJson).toMatchObject({
        tradeId:        TRADE_ID,
        escrowId:       ESCROW_ID,
        transactionId:  TXN_ID,
        escrowReleased: true,
        tradeClosed:    true,
      });
    });
  });
});
