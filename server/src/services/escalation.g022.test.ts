/**
 * G-022 — EscalationService + Integration Tests
 * Task ID: G-022-DAY2-SCHEMA-SERVICE
 * Doctrine: v1.4 + G-022 Design v1.1 (APPROVED 2026-02-24)
 * Directives: D-022-A · D-022-B · D-022-C · D-022-D
 *
 * 23 test scenarios:
 *
 * Freeze Tests (F-*)
 *   F-01 LEVEL_3 OPEN entity escalation blocks transition (checkEntityFreeze)
 *   F-02 LEVEL_2 OPEN entity escalation does NOT block (below freeze threshold)
 *   F-03 LEVEL_3 entity escalation with RESOLVED child does NOT block
 *   F-04 ORG-level OPEN escalation (entity_type=ORG) blocks checkOrgFreeze
 *   F-05 ORG-level escalation with OVERRIDDEN child does NOT block checkOrgFreeze
 *   F-06 SM.transition() returns DENIED when EscalationService throws GovError (entity freeze)
 *   F-07 MC.verifyAndReplay returns ERROR when EscalationService throws GovError (org freeze)
 *
 * Upgrade Tests (U-*)
 *   U-01 Valid upgrade (LEVEL_1 → LEVEL_3) succeeds (layer 1 check)
 *   U-02 Equal severity upgrade rejected (LEVEL_2 → LEVEL_2)
 *   U-03 Downgrade rejected (LEVEL_3 → LEVEL_1)
 *   U-04 Upgrade on non-existent parent rejected
 *   U-05 Upgrade on RESOLVED parent rejected (E-022-PARENT-NOT-OPEN at layer 1)
 *   U-06 DB trigger fires [E-022-SEVERITY-DOWNGRADE] → DB_TRIGGER_VIOLATION result
 *
 * Override Tests (O-*)
 *   O-01 Override without escalation record (not found) → OVERRIDE_NO_ESCALATION_RECORD
 *   O-02 Override with severity LEVEL_1 → OVERRIDE_LEVEL_TOO_LOW (D-022-D)
 *   O-03 Override with severity LEVEL_2 → OVERRIDDEN (minimum valid level)
 *
 * Immutability Tests (I-*)
 *   I-01 createEscalation — SYSTEM_AUTOMATION cannot create LEVEL_2+ escalation
 *   I-02 createEscalation — empty reason rejected at service layer
 *   I-03 resolveEscalation — service always sets parentEscalationId (no orphan RESOLVED row possible)
 *
 * RLS Tests (R-*)
 *   R-01 checkEntityFreeze uses entity_type + entity_id predicate (no cross-org scope leak)
 *   R-02 checkOrgFreeze uses entity_type='ORG' + entity_id=orgId predicate (D-022-B)
 *
 * Run from repo root:
 *   pnpm -C server exec vitest run src/services/escalation.g022.test.ts
 * OR from server/:
 *   pnpm exec vitest run src/services/escalation.g022.test.ts
 *
 * Static type-check:
 *   pnpm -C server exec tsc --noEmit
 */

import { describe, it, expect, vi } from 'vitest';
import { EscalationService } from './escalation.service.js';
import { StateMachineService } from './stateMachine.service.js';
import { MakerCheckerService } from './makerChecker.service.js';
import { GovError } from './escalation.types.js';
import type {
  CreateEscalationInput,
  UpgradeEscalationInput,
} from './escalation.types.js';
import { computePayloadHash, computeMakerFingerprint, computeExpiresAt } from './makerChecker.guardrails.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID        = 'aaaaaaaa-0000-0000-0000-000000000001';
const ENTITY_ID     = 'bbbbbbbb-0000-0000-0000-000000000002';
const ESC_ID        = 'cccccccc-0000-0000-0000-000000000003';
const ESC_ID_2      = 'dddddddd-0000-0000-0000-000000000004';
const APPROVAL_ID   = 'eeeeeeee-0000-0000-0000-000000000005';
const SIG_ID        = 'ffffffff-0000-0000-0000-000000000006';
const USER_MAKER    = '11111111-0000-0000-0000-000000000007';
const USER_CHECKER  = '22222222-0000-0000-0000-000000000008';

function makeEscRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                    ESC_ID,
    orgId:                 ORG_ID,
    entityType:            'TRADE',
    entityId:              ENTITY_ID,
    parentEscalationId:    null,
    source:                'MANUAL',
    severityLevel:         3,
    freezeRecommendation:  false,
    triggeredByActorType:  'PLATFORM_ADMIN',
    triggeredByPrincipal:  'admin-sub-001',
    reason:                'Critical governance violation detected',
    status:                'OPEN',
    resolvedByPrincipal:   null,
    resolutionReason:      null,
    resolvedAt:            null,
    createdAt:             new Date(),
    children:              [],
    ...overrides,
  };
}

// ─── Mock Prisma for EscalationService ───────────────────────────────────────

type MockEscDb = {
  escalationEvent: {
    create:     ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst:  ReturnType<typeof vi.fn>;
  };
};

function makeMockEscDb(overrides: Partial<MockEscDb> = {}): MockEscDb {
  return {
    escalationEvent: {
      create:     vi.fn(() => Promise.resolve(makeEscRow())),
      findUnique: vi.fn(() => Promise.resolve(makeEscRow())),
      findFirst:  vi.fn(() => Promise.resolve(null)), // no freeze by default
      ...overrides.escalationEvent,
    },
  };
}

// ─── Mock Prisma for StateMachineService ──────────────────────────────────────

function makeMockSmDb() {
  return {
    lifecycleState: {
      findUnique: vi.fn(() => Promise.resolve({
        entityType: 'TRADE', stateKey: 'DRAFT', isTerminal: false,
      })),
    },
    allowedTransition: {
      findUnique: vi.fn(() => Promise.resolve({
        entityType:          'TRADE',
        fromStateKey:        'DRAFT',
        toStateKey:          'SUBMITTED',
        allowedActorType:    ['TENANT_USER'],
        requiresMakerChecker: false,
        requiresEscalation:  false,
      })),
    },
    tradeLifecycleLog: {
      create: vi.fn(() => Promise.resolve({ id: 'log-001', createdAt: new Date() })),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      tradeLifecycleLog: { create: vi.fn(() => Promise.resolve({ id: 'log-001', createdAt: new Date() })) },
    })),
  };
}

// ─── Mock Prisma for MakerCheckerService ─────────────────────────────────────

function makeMockMcDb() {
  const BASE_MC_INPUT = {
    orgId:                ORG_ID,
    entityType:           'TRADE' as const,
    entityId:             ENTITY_ID,
    fromStateKey:         'DRAFT',
    toStateKey:           'SUBMITTED',
    requestedByActorType: 'TENANT_USER' as const,
    requestedByUserId:    USER_MAKER,
    requestedByAdminId:   null,
    requestedByRole:      'TRADER',
    requestReason:        'Ready for review',
    frozenPayload:        { entityType: 'TRADE', entityId: ENTITY_ID, fromStateKey: 'DRAFT', toStateKey: 'SUBMITTED' },
    severityLevel:        1,
    aiTriggered:          false,
    impersonationId:      null,
    requestId:            'req-test',
  };
  const expiresAt = computeExpiresAt(1);
  const approvalRow = {
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
    requestReason:             'Ready for review',
    status:                    'APPROVED',
    expiresAt,
    frozenPayloadHash:         computePayloadHash(BASE_MC_INPUT),
    makerPrincipalFingerprint: computeMakerFingerprint(BASE_MC_INPUT),
    frozenPayload:             BASE_MC_INPUT.frozenPayload,
    attemptCount:              1,
    escalationId:              null,
    aiTriggered:               false,
    impersonationId:           null,
    requestId:                 'req-test',
    createdAt:                 new Date(),
    updatedAt:                 new Date(),
    signatures: [{
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
    }],
  };

  const db = {
    pendingApproval: {
      create:     vi.fn(() => Promise.resolve(approvalRow)),
      findUnique: vi.fn(() => Promise.resolve(approvalRow)),
      update:     vi.fn(() => Promise.resolve(approvalRow)),
      findMany:   vi.fn(() => Promise.resolve([])),
    },
    approvalSignature: {
      create: vi.fn(() => Promise.resolve({ id: SIG_ID })),
    },
    tradeLifecycleLog: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    $queryRaw:    vi.fn(() => Promise.resolve([])),
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({
      pendingApproval:    { findUnique: vi.fn(() => Promise.resolve(approvalRow)) },
      tradeLifecycleLog:  { findFirst: vi.fn(() => Promise.resolve(null)) },
      $queryRaw:          vi.fn(() => Promise.resolve([])),
    })),
  };
  return db;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('G-022 EscalationService — constitutional invariants', () => {

  // ─── F-01: LEVEL_3 OPEN blocks checkEntityFreeze ───────────────────────────
  describe('F-01: LEVEL_3 OPEN entity escalation blocks checkEntityFreeze', () => {
    it('throws GovError ENTITY_FROZEN when open severity >= 3 escalation exists', async () => {
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(),
          findFirst:  vi.fn(() => Promise.resolve(makeEscRow({ severityLevel: 3, status: 'OPEN' }))),
        },
      });
      const svc = new EscalationService(db as never);

      await expect(svc.checkEntityFreeze('TRADE', ENTITY_ID))
        .rejects
        .toThrow(GovError);

      try {
        await svc.checkEntityFreeze('TRADE', ENTITY_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(GovError);
        if (err instanceof GovError) {
          expect(err.code).toBe('ENTITY_FROZEN');
          expect(err.message).toContain('E-022-ENTITY-FREEZE');
          expect(err.escalationEventId).toBe(ESC_ID);
        }
      }
    });
  });

  // ─── F-02: LEVEL_2 does NOT block ──────────────────────────────────────────
  describe('F-02: LEVEL_2 OPEN entity escalation does NOT block', () => {
    it('resolves without throwing when severity < 3', async () => {
      const db = makeMockEscDb(); // findFirst returns null by default = no freeze
      const svc = new EscalationService(db as never);

      // Should not throw — LEVEL_2 is below the freeze threshold (>= 3)
      await expect(svc.checkEntityFreeze('TRADE', ENTITY_ID)).resolves.toBeUndefined();

      // Verify the query includes severity_level >= 3 constraint
      expect(db.escalationEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severityLevel: { gte: 3 } }),
        }),
      );
    });
  });

  // ─── F-03: LEVEL_3 with RESOLVED child does NOT block ──────────────────────
  describe('F-03: LEVEL_3 entity escalation with RESOLVED child does NOT block', () => {
    it('resolves without throwing when open escalation has resolution child', async () => {
      // findFirst returns null when children.none filter matches (Prisma handles this
      // server-side). Mock: simulate service correctly querying with children.none filter.
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(),
          // Simulates Prisma returning null because the children.none filter excluded the row
          findFirst: vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      await expect(svc.checkEntityFreeze('TRADE', ENTITY_ID)).resolves.toBeUndefined();

      // Verify the query includes children.none filter (D-022-A append-only resolution check)
      expect(db.escalationEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            children: { none: { status: { in: ['RESOLVED', 'OVERRIDDEN'] } } },
          }),
        }),
      );
    });
  });

  // ─── F-04: ORG-level freeze blocks checkOrgFreeze ──────────────────────────
  describe('F-04: ORG-level OPEN escalation blocks checkOrgFreeze (D-022-B)', () => {
    it('throws GovError ORG_FROZEN for entity_type=ORG severity >= 3', async () => {
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(),
          findFirst:  vi.fn(() => Promise.resolve(
            makeEscRow({ entityType: 'ORG', entityId: ORG_ID, severityLevel: 3, status: 'OPEN' }),
          )),
        },
      });
      const svc = new EscalationService(db as never);

      try {
        await svc.checkOrgFreeze(ORG_ID);
        expect.fail('Should have thrown GovError');
      } catch (err) {
        expect(err).toBeInstanceOf(GovError);
        if (err instanceof GovError) {
          expect(err.code).toBe('ORG_FROZEN');
          expect(err.message).toContain('E-022-ORG-FREEZE');
        }
      }

      // D-022-B: verify entity_type='ORG' AND entity_id=orgId are used (not organizations table)
      expect(db.escalationEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'ORG',
            entityId:   ORG_ID,
          }),
        }),
      );
    });
  });

  // ─── F-05: ORG-level with OVERRIDDEN child does NOT block ──────────────────
  describe('F-05: ORG-level escalation with OVERRIDDEN child does NOT block', () => {
    it('resolves without throwing when org freeze has override child', async () => {
      const db = makeMockEscDb(); // findFirst = null = no active freeze
      const svc = new EscalationService(db as never);
      await expect(svc.checkOrgFreeze(ORG_ID)).resolves.toBeUndefined();
    });
  });

  // ─── F-06: SM.transition() returns DENIED on entity freeze ─────────────────
  describe('F-06: StateMachineService returns DENIED when entity is frozen', () => {
    it('transition is blocked with TRANSITION_NOT_PERMITTED when GovError thrown', async () => {
      const smDb = makeMockSmDb();
      const mockEscSvc = {
        checkOrgFreeze:    vi.fn(() => Promise.resolve()),
        checkEntityFreeze: vi.fn(() => Promise.reject(
          new GovError('ENTITY_FROZEN', 'Entity TRADE:X is frozen [E-022-ENTITY-FREEZE]', ESC_ID),
        )),
      };
      const sm = new StateMachineService(smDb as never, mockEscSvc as never);

      const result = await sm.transition({
        orgId:       ORG_ID,
        entityType:  'TRADE',
        entityId:    ENTITY_ID,
        fromStateKey: 'DRAFT',
        toStateKey:  'SUBMITTED',
        actorType:   'TENANT_USER',
        actorUserId: USER_MAKER,
        actorRole:   'TRADER',
        reason:      'Attempting transition on frozen entity',
      });

      expect(result.status).toBe('DENIED');
      if (result.status === 'DENIED') {
        expect(result.code).toBe('TRANSITION_NOT_PERMITTED');
        expect(result.message).toContain('G-022 Freeze');
      }
    });
  });

  // ─── F-07: MC.verifyAndReplay returns ERROR on org freeze ──────────────────
  describe('F-07: MakerCheckerService returns ERROR when org is frozen during replay', () => {
    it('verifyAndReplay is blocked with REPLAY_TRANSITION_DENIED when GovError thrown', async () => {
      const mcDb = makeMockMcDb();
      const mockSm = { transition: vi.fn(() => Promise.resolve({ status: 'APPLIED' })) };
      const mockEscSvc = {
        checkOrgFreeze:    vi.fn(() => Promise.reject(
          new GovError('ORG_FROZEN', 'Org is frozen [E-022-ORG-FREEZE]', ESC_ID),
        )),
        checkEntityFreeze: vi.fn(() => Promise.resolve()),
      };
      const mc = new MakerCheckerService(mcDb as never, mockSm as never, mockEscSvc as never);

      const result = await mc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('REPLAY_TRANSITION_DENIED');
        expect(result.message).toContain('G-022 Freeze');
      }
      // SM should NOT have been called
      expect(mockSm.transition).not.toHaveBeenCalled();
    });
  });

  // ─── U-01: Valid upgrade succeeds ──────────────────────────────────────────
  describe('U-01: Valid severity upgrade (LEVEL_1 → LEVEL_3) succeeds', () => {
    it('returns UPGRADED with new escalation event ID', async () => {
      const parentRow = makeEscRow({ severityLevel: 1, status: 'OPEN' });
      const upgradedRow = makeEscRow({ id: ESC_ID_2, severityLevel: 3, parentEscalationId: ESC_ID });

      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(() => Promise.resolve(upgradedRow)),
          findUnique: vi.fn(() => Promise.resolve(parentRow)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const input: UpgradeEscalationInput = {
        parentEscalationId:  ESC_ID,
        severityLevel:       3,
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Severity upgraded: additional violation detected',
        source:              'MANUAL',
      };
      const result = await svc.upgradeEscalation(input);

      expect(result.status).toBe('UPGRADED');
      if (result.status === 'UPGRADED') {
        expect(result.escalationEventId).toBe(ESC_ID_2);
      }
    });
  });

  // ─── U-02: Equal severity upgrade rejected ─────────────────────────────────
  describe('U-02: Equal severity upgrade (LEVEL_2 → LEVEL_2) is rejected', () => {
    it('returns SEVERITY_DOWNGRADE_FORBIDDEN at service layer (D-022-A)', async () => {
      const parentRow = makeEscRow({ severityLevel: 2, status: 'OPEN' });
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(parentRow)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const input: UpgradeEscalationInput = {
        parentEscalationId:  ESC_ID,
        severityLevel:       2, // same as parent — forbidden
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Attempting same-level severity insert',
        source:              'MANUAL',
      };
      const result = await svc.upgradeEscalation(input);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('SEVERITY_DOWNGRADE_FORBIDDEN');
        expect(result.message).toContain('E-022-SEVERITY-DOWNGRADE');
      }
    });
  });

  // ─── U-03: Downgrade rejected ──────────────────────────────────────────────
  describe('U-03: Downgrade (LEVEL_3 → LEVEL_1) is rejected', () => {
    it('returns SEVERITY_DOWNGRADE_FORBIDDEN at service layer (D-022-A)', async () => {
      const parentRow = makeEscRow({ severityLevel: 3, status: 'OPEN' });
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(parentRow)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const input: UpgradeEscalationInput = {
        parentEscalationId:  ESC_ID,
        severityLevel:       1, // lower than parent — forbidden
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Attempting severity downgrade',
        source:              'MANUAL',
      };
      const result = await svc.upgradeEscalation(input);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('SEVERITY_DOWNGRADE_FORBIDDEN');
      }
    });
  });

  // ─── U-04: Upgrade on non-existent parent rejected ─────────────────────────
  describe('U-04: Upgrade on non-existent parent rejected', () => {
    it('returns ESCALATION_NOT_FOUND when parent does not exist', async () => {
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(null)), // parent not found
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.upgradeEscalation({
        parentEscalationId:  'nonexistent-uuid-0000-0000-000000000000',
        severityLevel:       4,
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Upgrade attempt',
        source:              'MANUAL',
      });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('ESCALATION_NOT_FOUND');
      }
    });
  });

  // ─── U-05: Upgrade on RESOLVED parent rejected ─────────────────────────────
  describe('U-05: Upgrade on RESOLVED parent rejected (E-022-PARENT-NOT-OPEN, layer 1)', () => {
    it('returns ESCALATION_NOT_OPEN when parent is already RESOLVED', async () => {
      const resolvedParent = makeEscRow({ severityLevel: 2, status: 'RESOLVED' });
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(resolvedParent)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.upgradeEscalation({
        parentEscalationId:  ESC_ID,
        severityLevel:       3,
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Attempting upgrade on resolved escalation',
        source:              'MANUAL',
      });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('ESCALATION_NOT_OPEN');
        expect(result.message).toContain('E-022-PARENT-NOT-OPEN');
      }
    });
  });

  // ─── U-06: DB trigger fires [E-022-SEVERITY-DOWNGRADE] ─────────────────────
  describe('U-06: DB trigger fires for severity downgrade attempt', () => {
    it('returns DB_TRIGGER_VIOLATION when trigger raises [E-022-SEVERITY-DOWNGRADE]', async () => {
      const parentRow = makeEscRow({ severityLevel: 2, status: 'OPEN' });
      const db = makeMockEscDb({
        escalationEvent: {
          // Layer 1 passes (using severity 3 > 2), but DB trigger rejects (simulated)
          create: vi.fn(() => Promise.reject(
            new Error('D-022-A violation: new severity_level 3 is not strictly greater [E-022-SEVERITY-DOWNGRADE]'),
          )),
          findUnique: vi.fn(() => Promise.resolve(parentRow)), // same parent
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      // Note: layer 1 check passes (4 > 2), DB trigger fires (simulated)
      const result = await svc.upgradeEscalation({
        parentEscalationId:  ESC_ID,
        severityLevel:       4, // passes layer 1 (>2), but DB trigger simulated to reject
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:              'Upgrade - DB trigger simulated rejection',
        source:              'MANUAL',
      });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('DB_TRIGGER_VIOLATION');
        expect(result.message).toContain('E-022-SEVERITY-DOWNGRADE');
      }
    });
  });

  // ─── O-01: Override without escalation record ──────────────────────────────
  describe('O-01: Override without escalation record → OVERRIDE_NO_ESCALATION_RECORD', () => {
    it('returns error when escalation_event_id does not exist', async () => {
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(null)), // not found
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.overrideEscalation({
        escalationEventId:  'nonexistent-id',
        resolvedByPrincipal: 'admin-sub-001',
        resolutionReason:   'Platform admin override — justified reason',
      });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('OVERRIDE_NO_ESCALATION_RECORD');
      }
    });
  });

  // ─── O-02: Override with severity LEVEL_1 → OVERRIDE_LEVEL_TOO_LOW ─────────
  describe('O-02: Override with severity LEVEL_1 rejected (D-022-D)', () => {
    it('returns OVERRIDE_LEVEL_TOO_LOW when severity < 2', async () => {
      const level1Row = makeEscRow({ severityLevel: 1, status: 'OPEN' });
      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(),
          findUnique: vi.fn(() => Promise.resolve(level1Row)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.overrideEscalation({
        escalationEventId:  ESC_ID,
        resolvedByPrincipal: 'admin-sub-001',
        resolutionReason:   'Attempted override on LEVEL_1',
      });

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.code).toBe('OVERRIDE_LEVEL_TOO_LOW');
        expect(result.message).toContain('D-022-D-LEVEL-TOO-LOW');
      }
    });
  });

  // ─── O-03: Override with severity LEVEL_2 succeeds ─────────────────────────
  describe('O-03: Override with severity LEVEL_2 succeeds (minimum valid level)', () => {
    it('returns OVERRIDDEN with new escalation event ID', async () => {
      const level2Row = makeEscRow({ severityLevel: 2, status: 'OPEN' });
      const overriddenRow = makeEscRow({ id: ESC_ID_2, severityLevel: 2, status: 'OVERRIDDEN' });

      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(() => Promise.resolve(overriddenRow)),
          findUnique: vi.fn(() => Promise.resolve(level2Row)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.overrideEscalation({
        escalationEventId:  ESC_ID,
        resolvedByPrincipal: 'admin-sub-001',
        resolutionReason:   'Platform admin override with explicit justification',
      });

      expect(result.status).toBe('OVERRIDDEN');
      if (result.status === 'OVERRIDDEN') {
        expect(result.escalationEventId).toBe(ESC_ID_2);
      }

      // Verify the override row was created with status='OVERRIDDEN' and correct linkage
      const createCall = db.escalationEvent.create.mock.calls[0][0].data;
      expect(createCall.status).toBe('OVERRIDDEN');
      expect(createCall.parentEscalationId).toBe(ESC_ID);
      expect(createCall.resolvedByPrincipal).toBe('admin-sub-001');
    });
  });

  // ─── I-01: SYSTEM_AUTOMATION cannot create LEVEL_2+ escalation ─────────────
  describe('I-01: SYSTEM_AUTOMATION may not create LEVEL_2+ escalation', () => {
    it('returns ERROR when SYSTEM_AUTOMATION attempts to create severity >= 2', async () => {
      const db = makeMockEscDb();
      const svc = new EscalationService(db as never);

      const input: CreateEscalationInput = {
        orgId:                ORG_ID,
        entityType:           'TRADE',
        entityId:             ENTITY_ID,
        source:               'SYSTEM',
        severityLevel:        2,
        triggeredByActorType: 'SYSTEM_AUTOMATION',
        triggeredByPrincipal: 'system-worker-01',
        reason:               'Automated severity 2 attempt',
      };
      const result = await svc.createEscalation(input);

      expect(result.status).toBe('ERROR');
      if (result.status === 'ERROR') {
        expect(result.message).toContain('SYSTEM_AUTOMATION');
        expect(result.message).toContain('LEVEL_0 or LEVEL_1');
      }
      expect(db.escalationEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─── I-02: Empty reason rejected at service layer ──────────────────────────
  describe('I-02: Empty reason rejected by service layer', () => {
    it('returns ERROR when reason is empty string', async () => {
      const db = makeMockEscDb();
      const svc = new EscalationService(db as never);

      const result = await svc.createEscalation({
        orgId:                ORG_ID,
        entityType:           'TRADE',
        entityId:             ENTITY_ID,
        source:               'MANUAL',
        severityLevel:        0,
        triggeredByActorType: 'PLATFORM_ADMIN',
        triggeredByPrincipal: 'admin-sub-001',
        reason:               '   ', // whitespace only = effectively empty
      });

      expect(result.status).toBe('ERROR');
      expect(db.escalationEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─── I-03: resolveEscalation always passes parentEscalationId (no orphan row) ──
  describe('I-03: resolveEscalation never creates orphan RESOLVED row (layer 1 + DB guard)', () => {
    it('create call always includes parentEscalationId = original escalation id', async () => {
      const originalRow = makeEscRow({ severityLevel: 2, status: 'OPEN' });
      const resolvedRow = makeEscRow({ id: ESC_ID_2, status: 'RESOLVED', parentEscalationId: ESC_ID });

      const db = makeMockEscDb({
        escalationEvent: {
          create:     vi.fn(() => Promise.resolve(resolvedRow)),
          findUnique: vi.fn(() => Promise.resolve(originalRow)),
          findFirst:  vi.fn(() => Promise.resolve(null)),
        },
      });
      const svc = new EscalationService(db as never);

      const result = await svc.resolveEscalation({
        escalationEventId:   ESC_ID,
        resolvedByPrincipal: 'admin-sub-001',
        resolutionReason:    'Resolved: root cause addressed',
      });

      expect(result.status).toBe('RESOLVED');

      // Layer 1 invariant: service always sets parentEscalationId = original.id
      // This means the DB-level [E-022-ORPHAN-RESOLUTION] guard should never fire
      // in normal service usage — it is a defense-in-depth DB safeguard.
      const createCall = db.escalationEvent.create.mock.calls[0][0].data;
      expect(createCall.parentEscalationId).toBe(ESC_ID);
      expect(createCall.status).toBe('RESOLVED');
      expect(createCall.resolvedByPrincipal).toBe('admin-sub-001');
    });
  });

  // ─── R-01: checkEntityFreeze scope is entity-specific ──────────────────────
  describe('R-01: checkEntityFreeze scopes query to entity_type + entity_id', () => {
    it('queries with exact entity_type and entity_id predicates (no cross-org scope leak)', async () => {
      const db = makeMockEscDb();
      const svc = new EscalationService(db as never);

      await svc.checkEntityFreeze('ESCROW', ENTITY_ID);

      expect(db.escalationEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'ESCROW',
            entityId:   ENTITY_ID,
            status:     'OPEN',
            severityLevel: { gte: 3 },
          }),
        }),
      );
    });
  });

  // ─── R-02: checkOrgFreeze scopes query to entity_type='ORG' + entity_id=orgId ────
  describe('R-02: checkOrgFreeze uses entity_type=ORG + entity_id=orgId (D-022-B)', () => {
    it('queries with entity_type=ORG and entity_id=orgId — no organizations table read', async () => {
      const db = makeMockEscDb();
      const svc = new EscalationService(db as never);

      await svc.checkOrgFreeze(ORG_ID);

      // D-022-B: org freeze is stored in escalation_events, not organizations table
      expect(db.escalationEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'ORG',
            entityId:   ORG_ID,
          }),
        }),
      );
    });
  });

  // ─── Backward compat: SM without escalation service still works ─────────────
  describe('Backward compat: SM.transition() without escalation service skips freeze check', () => {
    it('proceeds normally when no escalation service is injected', async () => {
      const smDb = makeMockSmDb();
      const sm = new StateMachineService(smDb as never); // no escalation service

      const result = await sm.transition({
        orgId:        ORG_ID,
        entityType:   'TRADE',
        entityId:     ENTITY_ID,
        fromStateKey: 'DRAFT',
        toStateKey:   'SUBMITTED',
        actorType:    'TENANT_USER',
        actorUserId:  USER_MAKER,
        actorRole:    'TRADER',
        reason:       'Normal transition without freeze guard',
      });

      expect(result.status).toBe('APPLIED');
    });
  });

  // ─── Backward compat: MC without escalation service still works ─────────────
  describe('Backward compat: MC.verifyAndReplay() without escalation service proceeds', () => {
    it('replays successfully when no escalation service is injected', async () => {
      const mcDb = makeMockMcDb();
      const mockSm = { transition: vi.fn(() => Promise.resolve({ status: 'APPLIED', transitionId: 'log-abc' })) };
      const mc = new MakerCheckerService(mcDb as never, mockSm as never); // no escalation service

      const result = await mc.verifyAndReplay({ approvalId: APPROVAL_ID, orgId: ORG_ID });

      expect(result.status).toBe('APPLIED');
      expect(mockSm.transition).toHaveBeenCalled();
    });
  });

});
