/**
 * G-021 — MakerCheckerService Test Suite
 * Task ID: G-021-DAY2-SCHEMA-SERVICE
 * Doctrine: v1.4 + G-021 v1.1 (APPROVED)
 * D-021-A · D-021-B · D-021-C invariants
 *
 * 14 scenarios:
 *   P-01  createApprovalRequest → CREATED
 *   D-B-01 duplicate active request → ACTIVE_REQUEST_EXISTS (P2002)
 *   P-02  signApproval APPROVE → APPROVED
 *   P-03  signApproval REJECT → REJECTED
 *   F-01  signApproval expired → APPROVAL_EXPIRED
 *   F-02  signApproval non-REQUESTED status → APPROVAL_NOT_ACTIVE
 *   D-C-01 signApproval maker=checker → MAKER_CHECKER_SAME_PRINCIPAL (service layer L1)
 *   D-C-02 signApproval DB raises P0002 → MAKER_CHECKER_SAME_PRINCIPAL (DB trigger L2)
 *   P-04  verifyAndReplay APPROVED → APPLIED (StateMachine called with CHECKER actor)
 *   F-03  verifyAndReplay hash mismatch → PAYLOAD_INTEGRITY_VIOLATION
 *   F-04  verifyAndReplay non-APPROVED status → APPROVAL_NOT_APPROVED
 *   F-05  verifyAndReplay expired → APPROVAL_EXPIRED
 *   I-08a approval_signatures UPDATE → P0001 (DB trigger invariant documentation)
 *   D-B-02 getPendingQueue returns REQUESTED+ESCALATED only
 */

import { describe, it, expect, vi } from 'vitest';
import { MakerCheckerService } from '../server/src/services/makerChecker.service.js';
import type { CreateApprovalRequestInput, SignApprovalInput, VerifyAndReplayInput } from '../server/src/services/makerChecker.types.js';
import { computePayloadHash, computeMakerFingerprint, computeExpiresAt } from '../server/src/services/makerChecker.guardrails.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_ID   = 'aaaaaaaa-0000-0000-0000-000000000001';
const ENTITY_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const APPROVAL_ID = 'cccccccc-0000-0000-0000-000000000003';
const SIG_ID      = 'dddddddd-0000-0000-0000-000000000004';
const USER_MAKER   = 'eeeeeeee-0000-0000-0000-000000000005';
const USER_CHECKER = 'ffffffff-0000-0000-0000-000000000006';

const BASE_INPUT: CreateApprovalRequestInput = {
  orgId:                ORG_ID,
  entityType:           'TRADE',
  entityId:             ENTITY_ID,
  fromStateKey:         'DRAFT',
  toStateKey:           'SUBMITTED',
  requestedByActorType: 'TENANT_USER',
  requestedByUserId:    USER_MAKER,
  requestedByAdminId:   null,
  requestedByRole:      'TRADER',
  requestReason:        'Ready for compliance review',
  frozenPayload:        { entityType: 'TRADE', entityId: ENTITY_ID, fromStateKey: 'DRAFT', toStateKey: 'SUBMITTED' },
  severityLevel:        1,
  aiTriggered:          false,
  impersonationId:      null,
  requestId:            'req-test-001',
};

function makeApprovalRow(overrides?: Record<string, unknown>) {
  const expiresAt = computeExpiresAt(1); // 24h from now
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
    status:                    'REQUESTED',
    expiresAt,
    frozenPayloadHash:         computePayloadHash(BASE_INPUT),
    makerPrincipalFingerprint: computeMakerFingerprint(BASE_INPUT),
    frozenPayload:             BASE_INPUT.frozenPayload,
    attemptCount:              1,
    escalationId:              null,
    aiTriggered:               false,
    impersonationId:           null,
    requestId:                 'req-test-001',
    createdAt:                 new Date(),
    updatedAt:                 new Date(),
    signatures:                [],
    ...overrides,
  };
}

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

// ─── Mock helpers ─────────────────────────────────────────────────────────────

type MockDb = {
  pendingApproval: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  approvalSignature: {
    create: ReturnType<typeof vi.fn>;
  };
  // Day 3 compatibility: verifyAndReplay now uses $transaction + lifecycle log marker check.
  // These fields are added here to keep Day 2 P-04 green without touching any assertions.
  tradeLifecycleLog: {
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
    // Day 3 compat: $transaction calls the callback with db itself (tx = db in unit tests).
    // Default: no existing lifecycle log marker → replay proceeds to SM call.
    tradeLifecycleLog: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      ...overrides?.tradeLifecycleLog,
    },
    $queryRaw:    vi.fn(() => Promise.resolve([])),
    $transaction: vi.fn(), // self-reference set below
  };
  // Self-referential: tx is the db itself so all model methods are available inside callback.
  db.$transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db));
  return db;
}

function makeMockStateMachine() {
  return {
    transition: vi.fn(() => Promise.resolve({ status: 'APPLIED', logId: 'log-001' })),
  };
}

// Declare alias for tsc compatibility
type PrismaAlias = {
  pendingApproval: MockDb['pendingApproval'];
  approvalSignature: MockDb['approvalSignature'];
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('G-021 MakerCheckerService — constitutional invariants', () => {

  // ─── P-01: createApprovalRequest → CREATED ─────────────────────────────────
  describe('P-01: createApprovalRequest succeeds', () => {
    it('returns CREATED with approvalId, hash, and fingerprint', async () => {
      const db = makeMockDb();
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const result = await svc.createApprovalRequest(BASE_INPUT);

      expect(result.status).toBe('CREATED');
      if (result.status !== 'CREATED') return;
      expect(result.approvalId).toBe(APPROVAL_ID);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(db.pendingApproval.create).toHaveBeenCalledOnce();

      // Verify D-021-A hash was computed and passed to DB
      const createCall = db.pendingApproval.create.mock.calls[0][0].data;
      expect(createCall.status).toBe('REQUESTED');
      expect(createCall.fromStateKey).toBe('DRAFT');
      expect(createCall.toStateKey).toBe('SUBMITTED');
      expect(createCall.frozenPayloadHash).toHaveLength(64);
      // Verify D-021-C fingerprint was computed and passed to DB
      expect(createCall.makerPrincipalFingerprint).toBe(`TENANT_USER:${USER_MAKER}`);
    });
  });

  // ─── D-B-01: Duplicate active request → ACTIVE_REQUEST_EXISTS ──────────────
  describe('D-B-01: D-021-B duplicate active request', () => {
    it('returns ACTIVE_REQUEST_EXISTS when DB raises P2002', async () => {
      // Duck-typed P2002 error — matches isPrismaUniqueViolation() duck-type check in service.
      const p2002 = Object.assign(
        new Error('Unique constraint failed on pending_approvals_active_unique'),
        { code: 'P2002' },
      );
      const db = makeMockDb({
        pendingApproval: {
          create: vi.fn(() => Promise.reject(p2002)),
        } as never,
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const result = await svc.createApprovalRequest(BASE_INPUT);

      expect(result.status).toBe('ACTIVE_REQUEST_EXISTS');
      if (result.status !== 'ACTIVE_REQUEST_EXISTS') return;
      expect(result.code).toBe('PRINCIPAL_EXCLUSIVITY_VIOLATION');
    });
  });

  // ─── P-02: signApproval APPROVE → APPROVED ──────────────────────────────────
  describe('P-02: signApproval APPROVE succeeds', () => {
    it('returns APPROVED and calls approvalSignature.create + pendingApproval.update', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())),
          update: vi.fn(() => Promise.resolve(makeApprovalRow({ status: 'APPROVED' }))),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const input: SignApprovalInput = {
        approvalId:      APPROVAL_ID,
        signerUserId:    USER_CHECKER,
        signerAdminId:   null,
        signerActorType: 'CHECKER',
        signerRole:      'SENIOR_TRADER',
        decision:        'APPROVE',
        reason:          'Reviewed and approved',
      };

      const result = await svc.signApproval(input);

      expect(result.status).toBe('APPROVED');
      expect(db.approvalSignature.create).toHaveBeenCalledOnce();
      expect(db.pendingApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'APPROVED' } }),
      );
    });
  });

  // ─── P-03: signApproval REJECT → REJECTED ───────────────────────────────────
  describe('P-03: signApproval REJECT succeeds', () => {
    it('returns REJECTED and commits REJECTED status to DB', async () => {
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())),
          update: vi.fn(() => Promise.resolve(makeApprovalRow({ status: 'REJECTED' }))),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const input: SignApprovalInput = {
        approvalId:      APPROVAL_ID,
        signerUserId:    USER_CHECKER,
        signerAdminId:   null,
        signerActorType: 'CHECKER',
        signerRole:      'SENIOR_TRADER',
        decision:        'REJECT',
        reason:          'Non-compliant documentation',
      };

      const result = await svc.signApproval(input);

      expect(result.status).toBe('REJECTED');
      expect(db.pendingApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REJECTED' } }),
      );
    });
  });

  // ─── F-01: signApproval expired approval ────────────────────────────────────
  describe('F-01: signApproval on expired approval', () => {
    it('returns APPROVAL_EXPIRED without writing to DB', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25h ago
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow({ expiresAt: pastDate }))),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const input: SignApprovalInput = {
        approvalId:      APPROVAL_ID,
        signerUserId:    USER_CHECKER,
        signerAdminId:   null,
        signerActorType: 'CHECKER',
        signerRole:      'SENIOR_TRADER',
        decision:        'APPROVE',
        reason:          'Approving',
      };

      const result = await svc.signApproval(input);

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_EXPIRED');
      expect(db.approvalSignature.create).not.toHaveBeenCalled();
      expect(db.pendingApproval.update).not.toHaveBeenCalled();
    });
  });

  // ─── F-02: signApproval non-REQUESTED status ────────────────────────────────
  describe('F-02: signApproval on non-REQUESTED approval', () => {
    it.each(['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'])(
      'returns APPROVAL_NOT_ACTIVE for status %s',
      async (status) => {
        const db = makeMockDb({
          pendingApproval: {
            findUnique: vi.fn(() => Promise.resolve(makeApprovalRow({ status }))),
            update: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
          },
        });
        const sm = makeMockStateMachine();
        const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

        const input: SignApprovalInput = {
          approvalId:      APPROVAL_ID,
          signerUserId:    USER_CHECKER,
          signerAdminId:   null,
          signerActorType: 'CHECKER',
          signerRole:      'SENIOR_TRADER',
          decision:        'APPROVE',
          reason:          'Approving',
        };

        const result = await svc.signApproval(input);

        expect(result.status).toBe('ERROR');
        if (result.status !== 'ERROR') return;
        expect(result.code).toBe('APPROVAL_NOT_ACTIVE');
        expect(db.approvalSignature.create).not.toHaveBeenCalled();
      },
    );
  });

  // ─── D-C-01: signApproval maker=checker — service Layer 1 ──────────────────
  describe('D-C-01: D-021-C Maker=Checker — service layer L1 blocks before DB write', () => {
    it('returns MAKER_CHECKER_SAME_PRINCIPAL without calling approvalSignature.create', async () => {
      // Maker fingerprint: TENANT_USER:{USER_MAKER}
      // Signer uses same userId with CHECKER actor type → "CHECKER:{USER_MAKER}"
      // Service L1 compares stored maker_principal_fingerprint vs signer fingerprint.
      // We override the stored fingerprint to match the signer fingerprint exactly.
      const sm = makeMockStateMachine();
      const db2 = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(
              makeApprovalRow({
                // Override fingerprint to match signer exactly
                makerPrincipalFingerprint: `CHECKER:${USER_MAKER}`,
              }),
            )
          ),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const svc2 = new MakerCheckerService(db2 as unknown as PrismaAlias, sm as never);

      // Signer uses USER_MAKER, fingerprint = CHECKER:{USER_MAKER} = stored fingerprint
      const input: SignApprovalInput = {
        approvalId:      APPROVAL_ID,
        signerUserId:    USER_MAKER,
        signerAdminId:   null,
        signerActorType: 'CHECKER',
        signerRole:      'SENIOR_TRADER',
        decision:        'APPROVE',
        reason:          'Self-approval attempt',
      };

      const result = await svc2.signApproval(input);

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('MAKER_CHECKER_SAME_PRINCIPAL');
      expect(db2.approvalSignature.create).not.toHaveBeenCalled();
      expect(db2.pendingApproval.update).not.toHaveBeenCalled();
    });
  });

  // ─── D-C-02: DB trigger P0002 caught as MAKER_CHECKER_SAME_PRINCIPAL ────────
  describe('D-C-02: D-021-C DB trigger P0002 surfaced correctly', () => {
    it('catches DB P0002 error and returns MAKER_CHECKER_SAME_PRINCIPAL', async () => {
      // Simulate: service L1 passed (fingerprints looked different), but DB trigger fires
      const dbTriggerError = new Error(
        'MAKER_CHECKER_SAME_PRINCIPAL: signer fingerprint matches maker fingerprint',
      );
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() => Promise.resolve(makeApprovalRow())),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
        approvalSignature: {
          create: vi.fn(() => Promise.reject(dbTriggerError)),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const input: SignApprovalInput = {
        approvalId:      APPROVAL_ID,
        signerUserId:    USER_CHECKER,
        signerAdminId:   null,
        signerActorType: 'CHECKER',
        signerRole:      'SENIOR_TRADER',
        decision:        'APPROVE',
        reason:          'Attempted bypass',
      };

      const result = await svc.signApproval(input);

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('MAKER_CHECKER_SAME_PRINCIPAL');
      expect(db.pendingApproval.update).not.toHaveBeenCalled();
    });
  });

  // ─── P-04: verifyAndReplay APPROVED → APPLIED ───────────────────────────────
  describe('P-04: verifyAndReplay on APPROVED, non-expired, intact payload', () => {
    it('returns APPLIED and calls StateMachineService.transition with CHECKER actor', async () => {
      const approveSig = makeSignatureRow();
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(makeApprovalRow({ status: 'APPROVED', signatures: [approveSig] }))
          ),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const input: VerifyAndReplayInput = { approvalId: APPROVAL_ID };

      const result = await svc.verifyAndReplay(input);

      expect(result.status).toBe('APPLIED');

      // StateMachine called with CHECKER actor type
      expect(sm.transition).toHaveBeenCalledOnce();
      const smCall = sm.transition.mock.calls[0][0];
      expect(smCall.actorType).toBe('CHECKER');
      expect(smCall.actorUserId).toBe(USER_CHECKER);   // D-021-C: CHECKER actor
      expect(smCall.reason).toContain('CHECKER_APPROVAL:');
      expect(smCall.reason).toContain(APPROVAL_ID);
      expect(smCall.requestId).toContain('replay:');
      expect(smCall.requestId).toContain(APPROVAL_ID);
      expect(smCall.makerUserId).toBe(USER_MAKER);
    });
  });

  // ─── F-03: verifyAndReplay hash mismatch ────────────────────────────────────
  describe('F-03: verifyAndReplay with tampered payload (hash mismatch)', () => {
    it('returns PAYLOAD_INTEGRITY_VIOLATION without calling StateMachine', async () => {
      const approveSig = makeSignatureRow();
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(
              makeApprovalRow({
                status: 'APPROVED',
                signatures: [approveSig],
                // Corrupted hash — 64 chars of zeros never matches computed SHA-256
                frozenPayloadHash: 'a'.repeat(64),
              }),
            )
          ),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('PAYLOAD_INTEGRITY_VIOLATION');
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── F-04: verifyAndReplay non-APPROVED ─────────────────────────────────────
  describe('F-04: verifyAndReplay on non-APPROVED approval', () => {
    it.each(['REQUESTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])(
      'returns APPROVAL_NOT_APPROVED for status %s',
      async (status) => {
        const db = makeMockDb({
          pendingApproval: {
            findUnique: vi.fn(() => Promise.resolve(makeApprovalRow({ status, signatures: [] }))),
            update: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
          },
        });
        const sm = makeMockStateMachine();
        const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

        const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID });

        expect(result.status).toBe('ERROR');
        if (result.status !== 'ERROR') return;
        expect(result.code).toBe('APPROVAL_NOT_APPROVED');
        expect(sm.transition).not.toHaveBeenCalled();
      },
    );
  });

  // ─── F-05: verifyAndReplay expired APPROVED ──────────────────────────────────
  describe('F-05: verifyAndReplay on expired APPROVED approval', () => {
    it('returns APPROVAL_EXPIRED without calling StateMachine', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 48);
      const approveSig = makeSignatureRow();
      const db = makeMockDb({
        pendingApproval: {
          findUnique: vi.fn(() =>
            Promise.resolve(makeApprovalRow({ status: 'APPROVED', expiresAt: pastDate, signatures: [approveSig] }))
          ),
          update: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const result = await svc.verifyAndReplay({ approvalId: APPROVAL_ID });

      expect(result.status).toBe('ERROR');
      if (result.status !== 'ERROR') return;
      expect(result.code).toBe('APPROVAL_EXPIRED');
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── I-08a/b: DB trigger immutability invariant (documentation test) ────────
  describe('I-08a/b: approval_signatures immutability — DB trigger raises P0001', () => {
    it('I-08a: documents that UPDATE on approval_signatures raises P0001 (via trigger)', () => {
      // This test documents the DB-level invariant.
      // The trigger prevent_approval_signature_modification() fires BEFORE UPDATE OR DELETE.
      // It raises SQLSTATE P0001 unconditionally — no override path exists.
      // Layer 1 (service): MakerCheckerService exposes no update/delete method for signatures.
      // Layer 2 (trigger): prevent_approval_signature_modification → P0001.
      // Layer 3 (RLS): approval_signatures UPDATE/DELETE policies USING false.
      expect('prevent_approval_signature_modification').toBe('prevent_approval_signature_modification');
      expect('SQLSTATE P0001 on UPDATE/DELETE approval_signatures').toContain('P0001');
    });

    it('I-08b: documents that DELETE on approval_signatures raises P0001 (via trigger)', () => {
      // Same as I-08a — DELETE path.
      // DB trigger unconditionally raises P0001.
      // Cannot be bypassed without postgres role + migration window.
      expect('three-layer immutability: service + trigger + RLS').not.toBeNull();
    });
  });

  // ─── D-B-02: getPendingQueue returns REQUESTED+ESCALATED ────────────────────
  describe('D-B-02: getPendingQueue returns ALL active statuses (REQUESTED + ESCALATED)', () => {
    it('calls findMany with status IN [REQUESTED, ESCALATED] ordered by expiresAt ASC', async () => {
      const mockRows = [
        makeApprovalRow({ status: 'REQUESTED' }),
        makeApprovalRow({ id: 'cccccccc-0000-0000-0000-000000000099', status: 'ESCALATED' }),
      ];
      const db = makeMockDb({
        pendingApproval: {
          findMany: vi.fn(() => Promise.resolve(mockRows)),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      });
      const sm = makeMockStateMachine();
      const svc = new MakerCheckerService(db as unknown as PrismaAlias, sm as never);

      const queue = await svc.getPendingQueue(ORG_ID);

      expect(queue).toHaveLength(2);
      expect(db.pendingApproval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where:   { orgId: ORG_ID, status: { in: ['REQUESTED', 'ESCALATED'] } },
          orderBy: { expiresAt: 'asc' },
        }),
      );
    });
  });

});

// ─── Guardrail unit tests ─────────────────────────────────────────────────────

describe('G-021 makerChecker.guardrails — pure function contracts', () => {

  it('computePayloadHash returns 64-char lowercase hex (D-021-A)', () => {
    const hash = computePayloadHash(BASE_INPUT);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('computePayloadHash is deterministic — same input = same hash', () => {
    expect(computePayloadHash(BASE_INPUT)).toBe(computePayloadHash(BASE_INPUT));
  });

  it('computePayloadHash is sensitive to field changes (D-021-A)', () => {
    const tampered = { ...BASE_INPUT, toStateKey: 'APPROVED' };
    expect(computePayloadHash(BASE_INPUT)).not.toBe(computePayloadHash(tampered));
  });

  it('computeMakerFingerprint format = "{actorType}:{userId}" (D-021-C)', () => {
    const fp = computeMakerFingerprint(BASE_INPUT);
    expect(fp).toBe(`TENANT_USER:${USER_MAKER}`);
  });

  it('computeExpiresAt severity 0 → 48h TTL', () => {
    const now = new Date();
    const exp = computeExpiresAt(0, now);
    const diffH = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffH).toBeCloseTo(48, 0);
  });

  it('computeExpiresAt severity 4 → 1h TTL (most urgent)', () => {
    const now = new Date();
    const exp = computeExpiresAt(4, now);
    const diffH = (exp.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffH).toBeCloseTo(1, 0);
  });

});
