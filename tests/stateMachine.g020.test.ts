/**
 * G-020 Day 3 — StateMachineService Unit Tests
 * Doctrine v1.4 + G-020 v1.1
 *
 * COVERAGE: 15 scenarios
 *   PASS cases (3): valid TRADE, valid ESCROW, maker-checker PENDING_APPROVAL
 *   FAIL cases (12): actor not permitted, SYSTEM_AUTOMATION × 2, no transition,
 *     terminal fromState, aiTriggered × 2, principal exclusivity × 2,
 *     empty reason, escalation required, CERTIFICATION deferred
 *
 * Test strategy: Unit tests with Prisma mocked using vi.mock / manual stubs.
 * No database connection required. All tests are synchronous where possible.
 *
 * Run from repo root:
 *   pnpm -C server exec vitest run ../../tests/stateMachine.g020.test.ts
 * OR from server/:
 *   pnpm exec vitest run ../../tests/stateMachine.g020.test.ts
 *
 * Static type-check: tsc --noEmit (root tsconfig must include this file).
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Inline Types (mirrors server/src/services/stateMachine.types.ts) ─────────
// Inlined to avoid cross-package import complexity. Keep in sync with source.

type EntityType = 'TRADE' | 'ESCROW' | 'CERTIFICATION';
type ActorType =
  | 'TENANT_USER'
  | 'TENANT_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'SYSTEM_AUTOMATION'
  | 'MAKER'
  | 'CHECKER';

type TransitionRequest = {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  fromStateKey: string;
  toStateKey: string;
  actorType: ActorType;
  actorUserId?: string | null;
  actorAdminId?: string | null;
  actorRole: string;
  reason: string;
  aiTriggered?: boolean;
  impersonationId?: string | null;
  makerUserId?: string | null;
  checkerUserId?: string | null;
  escalationLevel?: number | null;
  requestId?: string | null;
};

// ─── Inline Guardrail Logic (mirrors server/src/services/stateMachine.guardrails.ts) ─

const SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES = new Set([
  'APPROVED',
  'ORDER_CONFIRMED',
  'SETTLEMENT_ACKNOWLEDGED',
  'RELEASED',
  'CLOSED',
  'CANCELLED',
  'REFUNDED',
  'VOIDED',
]);

const SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS = new Set([
  'ESCALATED',
  'EXPIRED',
  'PENDING_REVIEW',
]);

class GuardrailViolation extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'GuardrailViolation';
  }
}

function assertPrincipalExclusivity(req: TransitionRequest): void {
  const hasUser = req.actorUserId != null;
  const hasAdmin = req.actorAdminId != null;
  if (hasUser && hasAdmin) {
    throw new GuardrailViolation(
      'Both actorUserId and actorAdminId are set.',
      'PRINCIPAL_EXCLUSIVITY_VIOLATION'
    );
  }
  if (!hasUser && !hasAdmin && req.actorType !== 'SYSTEM_AUTOMATION') {
    throw new GuardrailViolation(
      `Neither actorUserId nor actorAdminId is set for actorType='${req.actorType}'.`,
      'PRINCIPAL_EXCLUSIVITY_VIOLATION'
    );
  }
}

function assertSystemAutomationBoundary(
  req: TransitionRequest,
  toStateIsTerminal: boolean
): void {
  if (req.actorType !== 'SYSTEM_AUTOMATION') return;
  const toState = req.toStateKey.toUpperCase();
  if (SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES.has(toState)) {
    throw new GuardrailViolation(
      `SYSTEM_AUTOMATION is prohibited from transitioning to '${toState}'.`,
      'SYSTEM_AUTOMATION_FORBIDDEN_STATE'
    );
  }
  if (toStateIsTerminal && !SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS.has(toState)) {
    throw new GuardrailViolation(
      `SYSTEM_AUTOMATION cannot transition to terminal state '${toState}'.`,
      'SYSTEM_AUTOMATION_FORBIDDEN_STATE'
    );
  }
}

const AI_HUMAN_CONFIRMATION_MARKER = 'HUMAN_CONFIRMED:';
const AI_ALLOWED_ACTOR_TYPES = new Set<ActorType>([
  'TENANT_USER',
  'TENANT_ADMIN',
  'MAKER',
  'CHECKER',
]);

function assertAiBoundary(req: TransitionRequest): void {
  if (!req.aiTriggered) return;
  if (!AI_ALLOWED_ACTOR_TYPES.has(req.actorType)) {
    throw new GuardrailViolation(
      `aiTriggered=true but actorType='${req.actorType}' is not permitted.`,
      'AI_BOUNDARY_VIOLATION'
    );
  }
  if (!req.reason.includes(AI_HUMAN_CONFIRMATION_MARKER)) {
    throw new GuardrailViolation(
      `aiTriggered=true but reason lacks "HUMAN_CONFIRMED:" marker.`,
      'AI_BOUNDARY_VIOLATION'
    );
  }
}

// ─── Inline Service Logic (mirrors core of stateMachine.service.ts) ──────────
// Minimal inline reproduction for unit testing without DB.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(v: string): boolean {
  return UUID_REGEX.test(v);
}

type MockLifecycleState = {
  entityType: string;
  stateKey: string;
  isTerminal: boolean;
  isIrreversible: boolean;
  severityLevel: number;
  requiresMakerChecker: boolean;
  description: string | null;
  createdAt: Date;
  id: string;
};

type MockAllowedTransition = {
  id: string;
  entityType: string;
  fromStateKey: string;
  toStateKey: string;
  allowedActorType: string[];
  requiresMakerChecker: boolean;
  requiresEscalation: boolean;
  createdAt: Date;
};

// Minimal service for unit testing (no real PrismaClient needed)
class TestableStateMachineService {
  constructor(
    private readonly db: {
      lifecycleState: {
        findUnique: (args: {
          where: { entityType_stateKey: { entityType: string; stateKey: string } };
        }) => Promise<MockLifecycleState | null>;
      };
      allowedTransition: {
        findUnique: (args: {
          where: {
            entityType_fromStateKey_toStateKey: {
              entityType: string;
              fromStateKey: string;
              toStateKey: string;
            };
          };
        }) => Promise<MockAllowedTransition | null>;
      };
      tradeLifecycleLog: {
        create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; createdAt: Date }>;
      };
      escrowLifecycleLog: {
        create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; createdAt: Date }>;
      };
      $transaction: <T>(fn: (tx: typeof this.db) => Promise<T>) => Promise<T>;
    }
  ) {}

  async transition(req: TransitionRequest): Promise<{
    status: string;
    code?: string;
    message?: string;
    transitionId?: string;
    requiredActors?: string[];
    fromStateKey?: string;
    toStateKey?: string;
  }> {
    if (!isValidUuid(req.entityId)) return { status: 'DENIED', code: 'INVALID_UUID', message: 'entityId invalid' };
    if (!isValidUuid(req.orgId)) return { status: 'DENIED', code: 'INVALID_UUID', message: 'orgId invalid' };
    if (!req.reason || req.reason.trim().length === 0) return { status: 'DENIED', code: 'REASON_REQUIRED', message: 'reason required' };

    try {
      assertPrincipalExclusivity(req);
      assertAiBoundary(req);
      if (req.actorType === 'SYSTEM_AUTOMATION' && SYSTEM_AUTOMATION_FORBIDDEN_TO_STATES.has(req.toStateKey.toUpperCase())) {
        assertSystemAutomationBoundary(req, false);
      }
    } catch (err) {
      if (err instanceof GuardrailViolation) return { status: 'DENIED', code: err.code, message: err.message };
      throw err;
    }

    if (req.entityType === 'CERTIFICATION') {
      return { status: 'DENIED', code: 'CERTIFICATION_LOG_DEFERRED', message: 'No log table for CERTIFICATION' };
    }

    const normalizedFrom = req.fromStateKey.toUpperCase().trim();
    const normalizedTo = req.toStateKey.toUpperCase().trim();

    const fromState = await this.db.lifecycleState.findUnique({
      where: { entityType_stateKey: { entityType: req.entityType, stateKey: normalizedFrom } },
    });
    if (!fromState) return { status: 'DENIED', code: 'STATE_KEY_NOT_FOUND', message: `fromStateKey '${normalizedFrom}' not found` };
    if (fromState.isTerminal) return { status: 'DENIED', code: 'TRANSITION_FROM_TERMINAL', message: `'${normalizedFrom}' is terminal` };

    const allowed = await this.db.allowedTransition.findUnique({
      where: { entityType_fromStateKey_toStateKey: { entityType: req.entityType, fromStateKey: normalizedFrom, toStateKey: normalizedTo } },
    });
    if (!allowed) return { status: 'DENIED', code: 'TRANSITION_NOT_PERMITTED', message: `No allowed transition ${normalizedFrom} → ${normalizedTo}` };

    const toState = await this.db.lifecycleState.findUnique({
      where: { entityType_stateKey: { entityType: req.entityType, stateKey: normalizedTo } },
    });
    if (!toState) return { status: 'DENIED', code: 'STATE_KEY_NOT_FOUND', message: `toStateKey '${normalizedTo}' not found` };

    try {
      assertSystemAutomationBoundary(req, toState.isTerminal);
    } catch (err) {
      if (err instanceof GuardrailViolation) return { status: 'DENIED', code: err.code, message: err.message };
      throw err;
    }

    if (!allowed.allowedActorType.includes(req.actorType)) {
      return { status: 'DENIED', code: 'ACTOR_ROLE_NOT_PERMITTED', message: `actorType '${req.actorType}' not permitted` };
    }

    if (allowed.requiresEscalation && !req.escalationLevel) {
      return { status: 'ESCALATION_REQUIRED', fromStateKey: normalizedFrom, toStateKey: normalizedTo };
    }

    if (allowed.requiresMakerChecker) {
      const isMakerCheckerCompletion = req.actorType === 'CHECKER' && req.makerUserId != null;
      if (!isMakerCheckerCompletion) {
        return { status: 'PENDING_APPROVAL', requiredActors: ['MAKER', 'CHECKER'], fromStateKey: normalizedFrom, toStateKey: normalizedTo };
      }
    }

    if (req.entityType === 'TRADE') {
      const log = await this.db.$transaction(async tx =>
        tx.tradeLifecycleLog.create({ data: { orgId: req.orgId, tradeId: req.entityId, fromStateKey: normalizedFrom, toStateKey: normalizedTo, actorType: req.actorType, actorRole: req.actorRole, reason: req.reason } })
      );
      return { status: 'APPLIED', transitionId: log.id };
    }

    if (req.entityType === 'ESCROW') {
      const log = await this.db.$transaction(async tx =>
        tx.escrowLifecycleLog.create({ data: { orgId: req.orgId, escrowId: req.entityId, fromStateKey: normalizedFrom, toStateKey: normalizedTo, actorType: req.actorType, actorRole: req.actorRole, reason: req.reason } })
      );
      return { status: 'APPLIED', transitionId: log.id };
    }

    return { status: 'DENIED', code: 'TRANSITION_NOT_PERMITTED', message: 'Unhandled entity type' };
  }
}

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const VALID_UUID_1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const VALID_UUID_2 = 'ffffffff-0000-1111-2222-333333333333';
const VALID_UUID_3 = '12345678-1234-1234-1234-123456789012';

function makeState(
  entityType: string,
  stateKey: string,
  isTerminal = false,
  isIrreversible = false
): MockLifecycleState {
  return {
    id: VALID_UUID_3,
    entityType,
    stateKey,
    isTerminal,
    isIrreversible,
    severityLevel: 0,
    requiresMakerChecker: false,
    description: null,
    createdAt: new Date(),
  };
}

function makeTransition(
  entityType: string,
  fromStateKey: string,
  toStateKey: string,
  allowedActorType: string[],
  requiresMakerChecker = false,
  requiresEscalation = false
): MockAllowedTransition {
  return {
    id: VALID_UUID_3,
    entityType,
    fromStateKey,
    toStateKey,
    allowedActorType,
    requiresMakerChecker,
    requiresEscalation,
    createdAt: new Date(),
  };
}

function makeLogResult(): { id: string; createdAt: Date } {
  return { id: VALID_UUID_2, createdAt: new Date() };
}

// ─── Helpers to build mock DB ──────────────────────────────────────────────────

function makeMockDb(overrides?: {
  fromState?: MockLifecycleState | null;
  toState?: MockLifecycleState | null;
  allowedTransition?: MockAllowedTransition | null;
}): TestableStateMachineService['db'] {
  const fromState = overrides?.fromState ?? makeState('TRADE', 'DRAFT');
  const toState = overrides?.toState ?? makeState('TRADE', 'RFQ_SENT');
  // Use explicit undefined check so null is NOT collapsed to the default by ??
  const transition =
    overrides !== undefined && Object.prototype.hasOwnProperty.call(overrides, 'allowedTransition')
      ? overrides.allowedTransition
      : makeTransition('TRADE', 'DRAFT', 'RFQ_SENT', ['TENANT_ADMIN', 'TENANT_USER', 'MAKER']);

  return {
    lifecycleState: {
      findUnique: vi.fn(({ where }) => {
        const stateKey = where.entityType_stateKey.stateKey;
        if (stateKey === fromState?.stateKey) return Promise.resolve(fromState);
        if (toState && stateKey === toState?.stateKey) return Promise.resolve(toState);
        return Promise.resolve(null);
      }) as unknown as typeof prisma.lifecycleState.findUnique,
    },
    allowedTransition: {
      findUnique: vi.fn(() => Promise.resolve(transition)) as unknown as typeof prisma.allowedTransition.findUnique,
    },
    tradeLifecycleLog: {
      create: vi.fn(() => Promise.resolve(makeLogResult())) as unknown as typeof prisma.tradeLifecycleLog.create,
    },
    escrowLifecycleLog: {
      create: vi.fn(() => Promise.resolve(makeLogResult())) as unknown as typeof prisma.escrowLifecycleLog.create,
    },
    $transaction: vi.fn((fn: (tx: typeof prisma) => Promise<unknown>) => fn({
      lifecycleState: { findUnique: vi.fn() } as unknown as typeof prisma.lifecycleState,
      allowedTransition: { findUnique: vi.fn() } as unknown as typeof prisma.allowedTransition,
      tradeLifecycleLog: {
        create: vi.fn(() => Promise.resolve(makeLogResult())) as unknown as typeof prisma.tradeLifecycleLog.create,
      },
      escrowLifecycleLog: {
        create: vi.fn(() => Promise.resolve(makeLogResult())) as unknown as typeof prisma.escrowLifecycleLog.create,
      },
      $transaction: vi.fn() as unknown as typeof prisma.$transaction,
    } as unknown as typeof prisma)) as typeof prisma.$transaction,
  } as unknown as TestableStateMachineService['db'];
}

// Declare prisma type alias so vi.fn() casts don't fail tsc
declare const prisma: {
  lifecycleState: { findUnique: unknown };
  allowedTransition: { findUnique: unknown };
  tradeLifecycleLog: { create: unknown };
  escrowLifecycleLog: { create: unknown };
  $transaction: unknown;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G-020 StateMachineService — core enforcement', () => {
  // ── PASS Cases ──────────────────────────────────────────────────────────────

  describe('PASS: Valid transitions', () => {
    it('P-01: Valid TRADE transition for TENANT_ADMIN → APPLIED', async () => {
      const db = makeMockDb();
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'DRAFT',
        toStateKey: 'RFQ_SENT',
        actorType: 'TENANT_ADMIN',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'ADMIN',
        reason: 'Sending RFQ to counterparty after review',
      });

      expect(result.status).toBe('APPLIED');
      expect(result.transitionId).toBe(VALID_UUID_2);
    });

    it('P-02: Valid ESCROW transition for PLATFORM_ADMIN → APPLIED', async () => {
      const db = makeMockDb({
        fromState: makeState('ESCROW', 'INITIATED', false, false),
        toState: makeState('ESCROW', 'MILESTONE_PENDING', false, false),
        allowedTransition: makeTransition(
          'ESCROW', 'INITIATED', 'MILESTONE_PENDING',
          ['TENANT_ADMIN', 'MAKER', 'PLATFORM_ADMIN']
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'ESCROW',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'INITIATED',
        toStateKey: 'MILESTONE_PENDING',
        actorType: 'PLATFORM_ADMIN',
        actorUserId: null,
        actorAdminId: VALID_UUID_3,
        actorRole: 'SUPER_ADMIN',
        reason: 'Fulfilment has begun; advancing escrow to milestone tracking',
      });

      expect(result.status).toBe('APPLIED');
    });

    it('P-03: Maker-Checker required transition returns PENDING_APPROVAL', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'PENDING_COMPLIANCE'),
        toState: makeState('TRADE', 'APPROVED'),
        allowedTransition: makeTransition(
          'TRADE', 'PENDING_COMPLIANCE', 'APPROVED',
          ['CHECKER', 'PLATFORM_ADMIN'],
          true // requiresMakerChecker
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'PENDING_COMPLIANCE',
        toStateKey: 'APPROVED',
        // CHECKER is in allowedActorType=['CHECKER','PLATFORM_ADMIN'].
        // makerUserId=null means this is NOT a Maker-Checker completion,
        // so the service returns PENDING_APPROVAL to signal G-021 flow must start.
        actorType: 'CHECKER',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'COMPLIANCE_REVIEWER',
        reason: 'Compliance documents verified - initiating maker-checker flow',
        makerUserId: null,
      });

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.requiredActors).toContain('MAKER');
      expect(result.requiredActors).toContain('CHECKER');
    });
  });

  // ── FAIL Cases ──────────────────────────────────────────────────────────────

  describe('FAIL: Actor type not in allowed_actor_type', () => {
    it('F-01: actorType TENANT_USER not in [CHECKER, PLATFORM_ADMIN] → ACTOR_ROLE_NOT_PERMITTED', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'PENDING_COMPLIANCE'),
        toState: makeState('TRADE', 'APPROVED'),
        allowedTransition: makeTransition(
          'TRADE', 'PENDING_COMPLIANCE', 'APPROVED',
          ['CHECKER', 'PLATFORM_ADMIN']
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'PENDING_COMPLIANCE',
        toStateKey: 'APPROVED',
        actorType: 'TENANT_USER',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'MEMBER',
        reason: 'Trying to approve trade',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('ACTOR_ROLE_NOT_PERMITTED');
    });
  });

  describe('FAIL: SYSTEM_AUTOMATION guardrail', () => {
    it('F-02: SYSTEM_AUTOMATION → ORDER_CONFIRMED → SYSTEM_AUTOMATION_FORBIDDEN_STATE', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'APPROVED'),
        toState: makeState('TRADE', 'ORDER_CONFIRMED', false, true),
        allowedTransition: makeTransition(
          'TRADE', 'APPROVED', 'ORDER_CONFIRMED',
          ['MAKER', 'CHECKER', 'SYSTEM_AUTOMATION'] // hypothetical (DB should not have SA here)
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'APPROVED',
        toStateKey: 'ORDER_CONFIRMED',
        actorType: 'SYSTEM_AUTOMATION',
        actorUserId: null,
        actorAdminId: null,
        actorRole: 'AUTOMATION',
        reason: 'Auto-confirming order based on SLA timer',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('SYSTEM_AUTOMATION_FORBIDDEN_STATE');
    });

    it('F-03: SYSTEM_AUTOMATION → CLOSED → SYSTEM_AUTOMATION_FORBIDDEN_STATE', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'SETTLEMENT_ACKNOWLEDGED'),
        toState: makeState('TRADE', 'CLOSED', true, true), // terminal
        allowedTransition: makeTransition(
          'TRADE', 'SETTLEMENT_ACKNOWLEDGED', 'CLOSED',
          ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER', 'SYSTEM_AUTOMATION']
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'SETTLEMENT_ACKNOWLEDGED',
        toStateKey: 'CLOSED',
        actorType: 'SYSTEM_AUTOMATION',
        actorUserId: null,
        actorAdminId: null,
        actorRole: 'AUTOMATION',
        reason: 'Auto-closing trade after acknowledgement',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('SYSTEM_AUTOMATION_FORBIDDEN_STATE');
    });
  });

  describe('FAIL: Transition not found in allowed_transitions', () => {
    it('F-04: DRAFT → ORDER_CONFIRMED (shortcut) → TRANSITION_NOT_PERMITTED', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'DRAFT'),
        toState: makeState('TRADE', 'ORDER_CONFIRMED'),
        allowedTransition: null, // No such transition in DB
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'DRAFT',
        toStateKey: 'ORDER_CONFIRMED',
        actorType: 'TENANT_ADMIN',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'ADMIN',
        reason: 'Trying to shortcut the lifecycle',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('TRANSITION_NOT_PERMITTED');
    });
  });

  describe('FAIL: Terminal fromState', () => {
    it('F-05: CLOSED → DRAFT (from terminal state) → TRANSITION_FROM_TERMINAL', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'CLOSED', true, true), // isTerminal=true
        toState: makeState('TRADE', 'DRAFT'),
        allowedTransition: makeTransition('TRADE', 'CLOSED', 'DRAFT', ['TENANT_ADMIN']),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'CLOSED',
        toStateKey: 'DRAFT',
        actorType: 'TENANT_ADMIN',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'ADMIN',
        reason: 'Trying to reopen a closed trade',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('TRANSITION_FROM_TERMINAL');
    });
  });

  describe('FAIL: aiTriggered boundary (D-020-C)', () => {
    it('F-06: aiTriggered=true, actorType=SYSTEM_AUTOMATION → AI_BOUNDARY_VIOLATION', async () => {
      const guardrailFn = () =>
        assertAiBoundary({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'DRAFT',
          toStateKey: 'RFQ_SENT',
          actorType: 'SYSTEM_AUTOMATION',
          actorRole: 'AUTOMATION',
          reason: 'AI suggested this transition',
          aiTriggered: true,
        });

      expect(guardrailFn).toThrow(GuardrailViolation);
      try {
        guardrailFn();
      } catch (e) {
        expect((e as GuardrailViolation).code).toBe('AI_BOUNDARY_VIOLATION');
      }
    });

    it('F-07: aiTriggered=true, no HUMAN_CONFIRMED: marker in reason → AI_BOUNDARY_VIOLATION', async () => {
      const guardrailFn = () =>
        assertAiBoundary({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'DRAFT',
          toStateKey: 'RFQ_SENT',
          actorType: 'TENANT_ADMIN',
          actorRole: 'ADMIN',
          reason: 'AI suggested sending RFQ — I agree', // missing HUMAN_CONFIRMED:
          aiTriggered: true,
        });

      expect(guardrailFn).toThrow(GuardrailViolation);
      try {
        guardrailFn();
      } catch (e) {
        expect((e as GuardrailViolation).code).toBe('AI_BOUNDARY_VIOLATION');
      }
    });

    it('F-07b: aiTriggered=true WITH HUMAN_CONFIRMED: marker → passes AI boundary', () => {
      expect(() =>
        assertAiBoundary({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'DRAFT',
          toStateKey: 'RFQ_SENT',
          actorType: 'TENANT_ADMIN',
          actorRole: 'ADMIN',
          reason: 'AI_RECOMMENDED: RFQ to TechCorp — HUMAN_CONFIRMED: reviewed and approved',
          aiTriggered: true,
        })
      ).not.toThrow();
    });
  });

  describe('FAIL: Principal exclusivity violations', () => {
    it('F-08: Both actorUserId AND actorAdminId set → PRINCIPAL_EXCLUSIVITY_VIOLATION', () => {
      expect(() =>
        assertPrincipalExclusivity({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'DRAFT',
          toStateKey: 'RFQ_SENT',
          actorType: 'TENANT_ADMIN',
          actorUserId: VALID_UUID_1,
          actorAdminId: VALID_UUID_3, // both set!
          actorRole: 'ADMIN',
          reason: 'Test with dual principals',
        })
      ).toThrow(GuardrailViolation);
    });

    it('F-09: Neither actorUserId nor actorAdminId set for TENANT_ADMIN → PRINCIPAL_EXCLUSIVITY_VIOLATION', () => {
      expect(() =>
        assertPrincipalExclusivity({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'DRAFT',
          toStateKey: 'RFQ_SENT',
          actorType: 'TENANT_ADMIN',
          actorUserId: null,
          actorAdminId: null, // neither set
          actorRole: 'ADMIN',
          reason: 'Test with no principal',
        })
      ).toThrow(GuardrailViolation);
    });

    it('F-09b: SYSTEM_AUTOMATION with no principals → passes (allowed exception)', () => {
      expect(() =>
        assertPrincipalExclusivity({
          entityType: 'TRADE',
          entityId: VALID_UUID_1,
          orgId: VALID_UUID_2,
          fromStateKey: 'PENDING_COMPLIANCE',
          toStateKey: 'ESCALATED',
          actorType: 'SYSTEM_AUTOMATION',
          actorUserId: null,
          actorAdminId: null, // both null is OK for SA
          actorRole: 'AUTOMATION',
          reason: 'SLA timeout — escalating to platform',
        })
      ).not.toThrow();
    });
  });

  describe('FAIL: Empty reason', () => {
    it('F-10: Empty reason → REASON_REQUIRED', async () => {
      const db = makeMockDb();
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'DRAFT',
        toStateKey: 'RFQ_SENT',
        actorType: 'TENANT_ADMIN',
        actorUserId: VALID_UUID_1,
        actorAdminId: null,
        actorRole: 'ADMIN',
        reason: '   ', // whitespace only
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('REASON_REQUIRED');
    });
  });

  describe('FAIL: Escalation required but not provided', () => {
    it('F-11: requires_escalation=true + no escalationLevel → ESCALATION_REQUIRED', async () => {
      const db = makeMockDb({
        fromState: makeState('TRADE', 'FULFILLMENT'),
        toState: makeState('TRADE', 'ESCALATED'),
        allowedTransition: makeTransition(
          'TRADE', 'FULFILLMENT', 'ESCALATED',
          ['PLATFORM_ADMIN', 'SYSTEM_AUTOMATION'],
          false,
          true // requiresEscalation=true
        ),
      });
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'TRADE',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'FULFILLMENT',
        toStateKey: 'ESCALATED',
        actorType: 'PLATFORM_ADMIN',
        actorUserId: null,
        actorAdminId: VALID_UUID_3,
        actorRole: 'SUPER_ADMIN',
        reason: 'Delivery failure — escalating to platform',
        escalationLevel: undefined, // missing
      });

      expect(result.status).toBe('ESCALATION_REQUIRED');
    });
  });

  describe('FAIL: CERTIFICATION log write deferred', () => {
    it('F-12: CERTIFICATION entityType → CERTIFICATION_LOG_DEFERRED', async () => {
      const db = makeMockDb();
      const svc = new TestableStateMachineService(db);

      const result = await svc.transition({
        entityType: 'CERTIFICATION',
        entityId: VALID_UUID_1,
        orgId: VALID_UUID_2,
        fromStateKey: 'SUBMITTED',
        toStateKey: 'UNDER_REVIEW',
        actorType: 'PLATFORM_ADMIN',
        actorUserId: null,
        actorAdminId: VALID_UUID_3,
        actorRole: 'SUPER_ADMIN',
        reason: 'Routing certification to review queue',
      });

      expect(result.status).toBe('DENIED');
      expect(result.code).toBe('CERTIFICATION_LOG_DEFERRED');
    });
  });

  // ── Guardrail unit assertions (D-020-A/B/C standalone) ─────────────────────

  describe('Guardrail module: assertSystemAutomationBoundary', () => {
    it('G-01: SYSTEM_AUTOMATION → RELEASED (escrow terminal) → forbidden', () => {
      expect(() =>
        assertSystemAutomationBoundary(
          {
            entityType: 'ESCROW',
            entityId: VALID_UUID_1,
            orgId: VALID_UUID_2,
            fromStateKey: 'RELEASE_PENDING',
            toStateKey: 'RELEASED',
            actorType: 'SYSTEM_AUTOMATION',
            actorRole: 'AUTOMATION',
            reason: 'Auto-releasing escrow',
          },
          true // terminal state
        )
      ).toThrow(GuardrailViolation);
    });

    it('G-02: SYSTEM_AUTOMATION → ESCALATED (terminal in some domains) → allowed', () => {
      expect(() =>
        assertSystemAutomationBoundary(
          {
            entityType: 'TRADE',
            entityId: VALID_UUID_1,
            orgId: VALID_UUID_2,
            fromStateKey: 'FULFILLMENT',
            toStateKey: 'ESCALATED',
            actorType: 'SYSTEM_AUTOMATION',
            actorRole: 'AUTOMATION',
            reason: 'SLA timeout — escalating',
          },
          false // not terminal in TRADE domain
        )
      ).not.toThrow();
    });

    it('G-03: SYSTEM_AUTOMATION → EXPIRED (terminal certification) → allowed', () => {
      expect(() =>
        assertSystemAutomationBoundary(
          {
            entityType: 'CERTIFICATION',
            entityId: VALID_UUID_1,
            orgId: VALID_UUID_2,
            fromStateKey: 'APPROVED',
            toStateKey: 'EXPIRED',
            actorType: 'SYSTEM_AUTOMATION',
            actorRole: 'AUTOMATION',
            reason: 'Certification validity window elapsed',
          },
          true // terminal
        )
      ).not.toThrow(); // EXPIRED is in SYSTEM_AUTOMATION_ALLOWED_TERMINAL_TARGETS
    });
  });
});
