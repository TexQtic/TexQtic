/**
 * G-021 Day 3 — MakerCheckerService Test Suite
 * Task ID: G-021-DAY3-REPLAY-QUEUES
 * Doctrine: v1.4 + G-021 v1.1 (APPROVED)
 *
 * 14 scenarios:
 *   R-01  verifyAndReplay APPROVED → APPLIED (transitionId propagated)
 *   R-02  verifyAndReplay reason format contains all three markers
 *   R-03  verifyAndReplay aiTriggered is unconditionally false
 *   R-04  verifyAndReplay hash mismatch → PAYLOAD_INTEGRITY_VIOLATION (SM not called)
 *   R-05  verifyAndReplay expired APPROVED → APPROVAL_EXPIRED (SM not called)
 *   R-06  verifyAndReplay REQUESTED status → APPROVAL_NOT_APPROVED
 *   R-07  verifyAndReplay REJECTED status → APPROVAL_NOT_APPROVED
 *   R-08  ALREADY_REPLAYED — lifecycle log marker found → replay blocked
 *   R-09  SYSTEM_AUTOMATION caller → REPLAY_TRANSITION_DENIED (before DB)
 *   R-10  Org mismatch → APPROVAL_NOT_FOUND (cross-tenant blocked)
 *   Q-01  getControlPlaneQueue TENANT scope scopes to orgId
 *   Q-02  getControlPlaneQueue CONTROL_PLANE scope no orgId filter (cross-org)
 *   Q-03  getApprovalById returns null when orgId mismatches
 *   Q-04  getApprovalById returns row when orgId matches
 */

import { describe, it, expect, vi } from 'vitest';
import { MakerCheckerService } from '../server/src/services/makerChecker.service.js';
import type { VerifyAndReplayInput, ApprovalQueueQuery } from '../server/src/services/makerChecker.types.js';
import {
  computePayloadHash,
  computeMakerFingerprint,
  computeExpiresAt,
} from '../server/src/services/makerChecker.guardrails.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_ID       = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000099';
const ENTITY_ID    = 'bbbbbbbb-0000-0000-0000-000000000002';
const APPROVAL_ID  = 'cccccccc-0000-0000-0000-000000000003';
const SIG_ID       = 'dddddddd-0000-0000-0000-000000000004';
const USER_MAKER   = 'eeeeeeee-0000-0000-0000-000000000005';
const USER_CHECKER = 'ffffffff-0000-0000-0000-000000000006';
const TRANSITION_ID = 'tx-day3-001';

// BASE_INPUT matches what was used to create the approval (for hash verification)
const BASE_INPUT = {
  orgId:                ORG_ID,
  entityType:           'TRADE' as const,
  entityId:             ENTITY_ID,
  fromStateKey:         'DRAFT',
  toStateKey:           'SUBMITTED',
  requestedByActorType: 'TENANT_USER' as const,
  requestedByUserId:    USER_MAKER,
  requestedByAdminId:   null,
  requestedByRole:      'TRADER',
  requestReason:        'Ready for compliance review',
  frozenPayload:        { entityType: 'TRADE', entityId: ENTITY_ID, fromStateKey: 'DRAFT', toStateKey: 'SUBMITTED' },
  severityLevel:        1,
  aiTriggered:          false,
  impersonationId:      null,
  requestId:            'req-day3-001',
} as const;

function makeSignatureRow(overrides?: Record<string, unknown>) {
  return {
    id:              SIG_ID,
    approvalId:      APPROVAL_ID,
    orgId:           ORG_ID,
    signerUserId:    USER_CHECKER,
    signerAdminId:   null,
    signerActorType: 'CHECKER',
    signerRole:      'SENIOR_TRADER',
    decision:        'APPROVE',
    reason:          'Reviewed and approved',
    impersonationId: null,
    createdAt:       new Date(),
    ...overrides,
  };
}

function makeApprovalRow(overrides?: Record<string, unknown>) {
  const expiresAt = computeExpiresAt(1);          // future expiry
  const frozenPayloadHash = computePayloadHash(BASE_INPUT);
  const makerPrincipalFingerprint = computeMakerFingerprint(BASE_INPUT);
  return {
    id:                        APPROVAL_ID,
    orgId:                     ORG_ID,
    entityType:                'TRADE',
    entityId:                  ENTITY_ID,
    fromStateKey:              'DRAFT',
    toStateKey:                'SUBMITTED',
    requestedByUserId:         USER_MAKER,
    requestedByAdminId:        null,
    requestedByActorType:      'TENANT_USER',
    requestedByRole:           'TRADER',
    requestReason:             'Ready for compliance review',
    status:                    'APPROVED',
    expiresAt,
    frozenPayloadHash,
    makerPrincipalFingerprint,
    frozenPayload:             BASE_INPUT.frozenPayload,
    attemptCount:              1,
    escalationId:              null,
    aiTriggered:               false,
    impersonationId:           null,
    requestId:                 'req-day3-001',
    createdAt:                 new Date(),
    updatedAt:                 new Date(),
    signatures:                [makeSignatureRow()],
    ...overrides,
  };
}

// ─── Mock factory ────────────────────────────────────────────────────────────

type MockDb = {
  pendingApproval: {
    create:     ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update:     ReturnType<typeof vi.fn>;
    findMany:   ReturnType<typeof vi.fn>;
  };
  approvalSignature: {
    create: ReturnType<typeof vi.fn>;
  };
  tradeLifecycleLog: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  escrowLifecycleLog: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw:    ReturnType<typeof vi.fn>;
};

function makeMockDb(overrides?: Partial<MockDb>): MockDb {
  const db: MockDb = {
    pendingApproval: {
      create:     vi.fn(() => Promise.resolve(makeApprovalRow())),
      findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())),
      update:     vi.fn(() => Promise.resolve(makeApprovalRow())),
      findMany:   vi.fn(() => Promise.resolve([])),
      ...overrides?.pendingApproval,
    },
    approvalSignature: {
      create: vi.fn(() => Promise.resolve(makeSignatureRow())),
      ...overrides?.approvalSignature,
    },
    tradeLifecycleLog: {
      findFirst: vi.fn(() => Promise.resolve(null)),   // default: no existing marker
      ...overrides?.tradeLifecycleLog,
    },
    escrowLifecycleLog: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      ...overrides?.escrowLifecycleLog,
    },
    $queryRaw: vi.fn(() => Promise.resolve([])),
    $transaction: vi.fn(),  // will self-reference db below
  };

  // $transaction calls the callback with the db itself (simulates tx = db in tests)
  db.$transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db));

  return db;
}

function makeMockStateMachine() {
  return {
    transition: vi.fn(() =>
      Promise.resolve({ status: 'APPLIED', logId: 'log-001', transitionId: TRANSITION_ID }),
    ),
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('G-021 Day 3 — verifyAndReplay idempotency, queues, and caller guards', () => {

  // ─── R-01: Happy path — APPROVED → APPLIED with transitionId ───────────────
  describe('R-01: verifyAndReplay APPROVED → APPLIED', () => {
    it('returns APPLIED with approvalId and transitionId propagated from SM', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const input: VerifyAndReplayInput = { approvalId: APPROVAL_ID, orgId: ORG_ID };
      const result = await svc.verifyAndReplay(input);

      expect(result.status).toBe('APPLIED');
      if (result.status !== 'APPLIED') return;
      expect(result.approvalId).toBe(APPROVAL_ID);
      expect(result.transitionId).toBe(TRANSITION_ID);

      // SM must have been called exactly once
      expect(sm.transition).toHaveBeenCalledOnce();
    });
  });

  // ─── R-02: Reason format — all three markers must be present ───────────────
  describe('R-02: verifyAndReplay reason format validation', () => {
    it('SM transition reason includes CHECKER_APPROVAL, APPROVAL_ID, FROZEN_HASH markers', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      const call = sm.transition.mock.calls[0][0] as { reason: string };
      expect(call.reason).toContain(`CHECKER_APPROVAL:${APPROVAL_ID}`);
      expect(call.reason).toContain(`APPROVAL_ID:${APPROVAL_ID}`);
      expect(call.reason).toContain('FROZEN_HASH:');
    });
  });

  // ─── R-03: aiTriggered unconditionally false ────────────────────────────────
  describe('R-03: aiTriggered is forced false in SM call', () => {
    it('SM transition called with aiTriggered: false regardless of approval row value', async () => {
      // Approval row has aiTriggered: true (e.g., AI created original request)
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow({ aiTriggered: true }))),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      const call = sm.transition.mock.calls[0][0] as { aiTriggered: boolean };
      expect(call.aiTriggered).toBe(false);
    });
  });

  // ─── R-04: Hash mismatch → PAYLOAD_INTEGRITY_VIOLATION ─────────────────────
  describe('R-04: verifyAndReplay hash mismatch', () => {
    it('returns PAYLOAD_INTEGRITY_VIOLATION and does NOT call SM', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(makeApprovalRow({ frozenPayloadHash: 'tampered-hash-0000000000000000' })),
          ),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('PAYLOAD_INTEGRITY_VIOLATION');
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── R-05: Expired APPROVED → APPROVAL_EXPIRED ─────────────────────────────
  describe('R-05: verifyAndReplay on expired APPROVED approval', () => {
    it('returns APPROVAL_EXPIRED and does NOT call SM', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(makeApprovalRow({ expiresAt: pastDate })),
          ),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_EXPIRED');
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── R-06: REQUESTED status → APPROVAL_NOT_APPROVED ───────────────────────
  describe('R-06: verifyAndReplay on REQUESTED status', () => {
    it('returns APPROVAL_NOT_APPROVED', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(makeApprovalRow({ status: 'REQUESTED', signatures: [] })),
          ),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_NOT_APPROVED');
    });
  });

  // ─── R-07: REJECTED status → APPROVAL_NOT_APPROVED ────────────────────────
  describe('R-07: verifyAndReplay on REJECTED status', () => {
    it('returns APPROVAL_NOT_APPROVED', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow({ status: 'REJECTED' }))),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_NOT_APPROVED');
    });
  });

  // ─── R-08: ALREADY_REPLAYED — lifecycle log marker found ───────────────────
  describe('R-08: ALREADY_REPLAYED when lifecycle log marker exists', () => {
    it('returns ALREADY_REPLAYED and does NOT call SM', async () => {
      const db = makeMockDb({
        // Simulate existing lifecycle log entry with the idempotency marker
        tradeLifecycleLog: {
          findFirst: vi.fn(() => Promise.resolve({ id: 'existing-log-entry' })),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('ALREADY_REPLAYED');
      expect(sm.transition).not.toHaveBeenCalled();
    });

    it('lifecycle log findFirst is called with the correct APPROVAL_ID marker', async () => {
      const db = makeMockDb({
        tradeLifecycleLog: {
          findFirst: vi.fn(() => Promise.resolve({ id: 'existing-log-entry' })),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      await svc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      const findArgs = (db.tradeLifecycleLog.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(findArgs.where.reason.contains).toBe(`APPROVAL_ID:${APPROVAL_ID}`);
    });
  });

  // ─── R-09: SYSTEM_AUTOMATION caller → REPLAY_TRANSITION_DENIED ─────────────
  describe('R-09: SYSTEM_AUTOMATION caller blocked before DB', () => {
    it('returns REPLAY_TRANSITION_DENIED without touching DB', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const input: VerifyAndReplayInput = {
        approvalId:       APPROVAL_ID,
        callerActorType:  'SYSTEM_AUTOMATION' as never, // unsafe cast — testing defense-in-depth
      };
      const result = await svc.verifyAndReplay(input);

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('REPLAY_TRANSITION_DENIED');
      // DB must NOT have been called (guard fires before Step 1)
      expect(db.pendingApproval.findUnique).not.toHaveBeenCalled();
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── R-10: Org mismatch → APPROVAL_NOT_FOUND ───────────────────────────────
  describe('R-10: org mismatch yields APPROVAL_NOT_FOUND (cross-tenant blocked)', () => {
    it('returns APPROVAL_NOT_FOUND when orgId does not match approval row', async () => {
      // Approval belongs to ORG_ID but caller claims OTHER_ORG_ID
      const db = makeMockDb(); // returns approval with ORG_ID
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.verifyAndReplay({
        approvalId: APPROVAL_ID,
        orgId:      OTHER_ORG_ID,
      });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_NOT_FOUND');
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── Q-01: getControlPlaneQueue TENANT scope ────────────────────────────────
  describe('Q-01: getControlPlaneQueue TENANT scope filters by orgId', () => {
    it('passes orgId in where clause and uses default statuses', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const query: ApprovalQueueQuery = { scope: 'TENANT', orgId: ORG_ID };
      await svc.getControlPlaneQueue(query);

      expect(db.pendingApproval.findMany).toHaveBeenCalledOnce();
      const args = (db.pendingApproval.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(args.where.orgId).toBe(ORG_ID);
      expect(args.where.status.in).toContain('REQUESTED');
      expect(args.where.status.in).toContain('ESCALATED');
    });
  });

  // ─── Q-02: getControlPlaneQueue CONTROL_PLANE scope (cross-org) ────────────
  describe('Q-02: getControlPlaneQueue CONTROL_PLANE scope without orgId', () => {
    it('does not include orgId filter when scope is CONTROL_PLANE and no orgId given', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const query: ApprovalQueueQuery = { scope: 'CONTROL_PLANE' };
      await svc.getControlPlaneQueue(query);

      expect(db.pendingApproval.findMany).toHaveBeenCalledOnce();
      const args = (db.pendingApproval.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(args.where.orgId).toBeUndefined();
      // Status filter still applies
      expect(args.where.status.in).toContain('REQUESTED');
    });
  });

  // ─── Q-03: getApprovalById returns null on orgId mismatch ──────────────────
  describe('Q-03: getApprovalById returns null when orgId mismatches', () => {
    it('returns null when the row belongs to a different org', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())), // row has ORG_ID
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.getApprovalById(APPROVAL_ID, OTHER_ORG_ID);

      expect(result).toBeNull();
    });
  });

  // ─── Q-04: getApprovalById returns row when orgId matches ──────────────────
  describe('Q-04: getApprovalById returns row when orgId matches', () => {
    it('returns the row with signatures when orgId matches', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())), // row has ORG_ID
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as never, sm as never);

      const result = await svc.getApprovalById(APPROVAL_ID, ORG_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(APPROVAL_ID);
      expect(result!.orgId).toBe(ORG_ID);
      expect(Array.isArray(result!.signatures)).toBe(true);
    });
  });
});
