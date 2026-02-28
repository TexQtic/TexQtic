/**
 * G-021 — MakerCheckerService Unit Tests (Runtime Wiring — G-021 Fix C)
 * Task ID: G-021-RUNTIME-WIRING (GOVERNANCE-SYNC-022)
 *
 * Tests:
 *   T-G021-3: verifyAndReplay is blocked by escalation freeze (REPLAY_TRANSITION_DENIED)
 *             Verifies Fix C — EscalationService injection into buildService() means
 *             verifyAndReplay() performs freeze checks before SM.transition() is called.
 *
 * All DB calls are mocked — no real database required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { MakerCheckerService } from './makerChecker.service.js';
import { GovError } from './escalation.types.js';
import { recomputePayloadHash } from './makerChecker.guardrails.js';

// ─── Mock DB type ─────────────────────────────────────────────────────────────

interface MockDb {
  pendingApproval: { findUnique: Mock };
  tradeLifecycleLog: { findFirst: Mock };
  $transaction: Mock;
}

// ─── Mock factory helpers ─────────────────────────────────────────────────────

function makeDb(): MockDb {
  const db: MockDb = {
    pendingApproval: {
      findUnique: vi.fn(),
    },
    tradeLifecycleLog: {
      findFirst: vi.fn().mockResolvedValue(null), // no replay marker by default
    },
    // $transaction: runs the callback with a tx that has $queryRaw (no-op) + db methods
    $transaction: vi.fn(),
  };

  // Wire $transaction to call the callback with a mock tx client that includes
  // $queryRaw (simulating SELECT FOR UPDATE NOWAIT) and model methods for marker check.
  db.$transaction.mockImplementation((cb: (tx: unknown) => Promise<void>) => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),           // lock step: no-op
      tradeLifecycleLog: db.tradeLifecycleLog,            // marker check
      escrowLifecycleLog: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    return cb(mockTx);
  });

  return db;
}

function makeStateMachine() {
  return {
    transition: vi.fn(),
  };
}

function makeEscalation() {
  return {
    checkOrgFreeze:    vi.fn().mockResolvedValue(undefined),
    checkEntityFreeze: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const APPROVAL_ID   = 'approval-uuid-g021-000000000003';
const ORG_ID        = 'org-uuid-g021-0000-000000000003';
const TRADE_ENTITY_ID = 'trade-uuid-g021-000000000003';

// Build the hash that MakerCheckerService would have stored at request time.
const FROZEN_HASH = recomputePayloadHash({
  entityType:           'TRADE',
  entityId:             TRADE_ENTITY_ID,
  fromStateKey:         'DRAFT',
  toStateKey:           'ORDER_CONFIRMED',
  requestedByActorType: 'TENANT_ADMIN',
  principalId:          'maker-user-uuid-0000-000000000003',
  requestedByRole:      'TRADE_MAKER',
  requestReason:        'Buyer and seller have agreed on trade terms.',
});

const APPROVE_SIG = {
  id:              'sig-uuid-g021-00000000000003',
  approvalId:      APPROVAL_ID,
  orgId:           ORG_ID,
  signerUserId:    'checker-user-uuid-00000000000003',
  signerAdminId:   null,
  signerActorType: 'CHECKER',
  signerRole:      'TRADE_CHECKER',
  decision:        'APPROVE',
  reason:          'Verified trade terms with both parties.',
  impersonationId: null,
  createdAt:       new Date('2026-02-28T10:00:00.000Z'),
};

const APPROVED_APPROVAL = {
  id:                       APPROVAL_ID,
  orgId:                    ORG_ID,
  entityType:               'TRADE',
  entityId:                 TRADE_ENTITY_ID,
  fromStateKey:             'DRAFT',
  toStateKey:               'ORDER_CONFIRMED',
  requestedByUserId:        'maker-user-uuid-0000-000000000003',
  requestedByAdminId:       null,
  requestedByActorType:     'TENANT_ADMIN',
  requestedByRole:          'TRADE_MAKER',
  requestReason:            'Buyer and seller have agreed on trade terms.',
  status:                   'APPROVED',
  expiresAt:                new Date(Date.now() + 86_400_000), // +24 hours from now
  frozenPayloadHash:        FROZEN_HASH,                         // matches recomputePayloadHash
  makerPrincipalFingerprint: 'fp-maker-0001',
  frozenPayload:            {},
  attemptCount:             1,
  escalationId:             null,
  aiTriggered:              false,
  impersonationId:          null,
  requestId:                null,
  createdAt:                new Date('2026-02-28T09:00:00.000Z'),
  updatedAt:                new Date('2026-02-28T09:30:00.000Z'),
  signatures:               [APPROVE_SIG],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MakerCheckerService — G-021 Runtime Wiring (Fix C)', () => {
  let db: ReturnType<typeof makeDb>;
  let sm: ReturnType<typeof makeStateMachine>;
  let esc: ReturnType<typeof makeEscalation>;
  let svc: MakerCheckerService;

  beforeEach(() => {
    db  = makeDb();
    sm  = makeStateMachine();
    esc = makeEscalation();

    // MakerCheckerService with EscalationService injected (Fix C runtime wiring)
    svc = new MakerCheckerService(db as never, sm as never, esc as never);
  });

  // T-G021-3: Replay freeze guard enforced
  it(
    'T-G021-3: verifyAndReplay is denied when escalation freeze is active (REPLAY_TRANSITION_DENIED)',
    async () => {
      // Arrange: return an APPROVED approval with correct hash
      (db.pendingApproval.findUnique as Mock).mockResolvedValueOnce(APPROVED_APPROVAL);

      // Arrange: escalation throws GovError on entity-level freeze check
      (esc.checkEntityFreeze as Mock).mockRejectedValueOnce(
        new GovError(
          'ENTITY_FROZEN',
          `Entity TRADE:${TRADE_ENTITY_ID} is frozen — open escalation at severity LEVEL_3.`,
          'esc-event-uuid-0000-000000000003',
        ),
      );

      // Act: attempt replay on the APPROVED approval
      const result = await svc.verifyAndReplay({
        approvalId:      APPROVAL_ID,
        orgId:           ORG_ID,
        callerActorType: 'CHECKER',
        callerUserId:    APPROVE_SIG.signerUserId,
      });

      // Assert: replay denied due to freeze
      expect(result.status).toBe('ERROR');
      const err = result as { status: 'ERROR'; code: string; message: string };
      expect(err.code).toBe('REPLAY_TRANSITION_DENIED');
      expect(err.message).toContain('Freeze blocked replay');

      // Assert: StateMachineService MUST NOT be called (freeze check happens first)
      expect(sm.transition).not.toHaveBeenCalled();

      // Assert: freeze check was called with the correct entity
      expect(esc.checkEntityFreeze).toHaveBeenCalledWith('TRADE', TRADE_ENTITY_ID);
    },
  );

  it(
    'T-G021-3b: verifyAndReplay proceeds to SM when no freeze (escalation service present, entity not frozen)',
    async () => {
      // Arrange: return an APPROVED approval with correct hash
      (db.pendingApproval.findUnique as Mock).mockResolvedValueOnce(APPROVED_APPROVAL);

      // Arrange: SM returns APPLIED (replay succeeds)
      (sm.transition as Mock).mockResolvedValueOnce({
        status:       'APPLIED',
        transitionId: 'log-uuid-g021-0000000000003',
      });

      // Act
      const result = await svc.verifyAndReplay({
        approvalId:      APPROVAL_ID,
        orgId:           ORG_ID,
        callerActorType: 'CHECKER',
        callerUserId:    APPROVE_SIG.signerUserId,
      });

      // Assert: replay succeeded
      expect(result.status).toBe('APPLIED');
      // Assert: freeze check was called (proves escalationService is wired)
      expect(esc.checkEntityFreeze).toHaveBeenCalledOnce();
      expect(esc.checkOrgFreeze).toHaveBeenCalledOnce();
      // Assert: SM was called (no freeze blocked it)
      expect(sm.transition).toHaveBeenCalledOnce();
    },
  );
});
