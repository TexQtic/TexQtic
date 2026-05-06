/**
 * Unit tests — NetworkPoolService (TEXQTIC-NC-PHASE1-POOL-SERVICE-FOUNDATION-001)
 *
 * Pure unit tests with mocked Prisma and mocked StateMachineService.
 * No DB access. No lifecycle seed dependency.
 *
 * COVERAGE (15 tests):
 *   P-NP-01  createNetworkPool — DRAFT pool created with valid input
 *   P-NP-02  createNetworkPool — rejects non-positive targetQty (zero)
 *   P-NP-03  createNetworkPool — rejects invalid openAt/closeAt ordering
 *   P-NP-04  createNetworkPool — throws if POOL DRAFT lifecycle state is missing
 *   P-NP-05  openNetworkPool   — transitions DRAFT → OPEN via StateMachineService
 *   P-NP-06  openNetworkPool   — SM call carries correct entityId, orgId, and reason
 *   P-NP-07  openNetworkPool   — rejects opening a non-existent pool
 *   P-NP-08  openNetworkPool   — rejects opening a pool not in DRAFT state
 *   P-NP-09  openNetworkPool   — wraps SM DENIED result in NetworkPoolTransitionDeniedError
 *   P-NP-10  joinNetworkPool   — creates PENDING membership for valid member + quantity
 *   P-NP-11  joinNetworkPool   — rejects joining a non-existent pool
 *   P-NP-12  joinNetworkPool   — rejects non-positive declaredQty (zero)
 *   P-NP-13  joinNetworkPool   — rejects duplicate membership (same pool + org)
 *   P-NP-14  joinNetworkPool   — rejects join when pool is not in OPEN or AGGREGATING
 *   P-NP-15  getNetworkPoolMembership — query is scoped to member org only
 *
 * Run (from server/ directory):
 *   pnpm exec vitest run src/__tests__/network-pool.service.unit.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  NetworkPoolService,
  NetworkPoolNotFoundError,
  NetworkPoolInvalidInputError,
  NetworkPoolInvalidStateError,
  NetworkPoolDuplicateMembershipError,
  NetworkPoolTransitionDeniedError,
  NetworkPoolLifecycleStateMissingError,
} from '../services/networkPool.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_ORG_ID    = 'aaaa0001-0000-0000-0000-000000000001';
const MEMBER_ORG_ID   = 'aaaa0002-0000-0000-0000-000000000002';
const POOL_ID         = 'bbbb0001-0000-0000-0000-000000000001';
const DRAFT_STATE_ID  = 'cccc0001-0000-0000-0000-000000000001';
const OPEN_STATE_ID   = 'cccc0002-0000-0000-0000-000000000002';
const MEMBERSHIP_ID   = 'dddd0001-0000-0000-0000-000000000001';
const USER_ID         = 'eeee0001-0000-0000-0000-000000000001';
const LOG_ID          = 'ffff0001-0000-0000-0000-000000000001';
const NOW             = new Date('2026-06-01T00:00:00.000Z');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePoolRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                 POOL_ID,
    org_id:             OWNER_ORG_ID,
    pool_ref:           'POOL-2026-001',
    commodity_category: 'COTTON_YARN',
    target_qty:         '10000.000000',
    qty_unit:           'KG',
    lifecycle_state_id: DRAFT_STATE_ID,
    lifecycleState:     { stateKey: 'DRAFT' },
    open_at:            null,
    close_at:           null,
    allocated_at:       null,
    settled_at:         null,
    metadata:           null,
    created_by_user_id: USER_ID,
    created_at:         NOW,
    updated_at:         NOW,
    ...overrides,
  };
}

function makeMembershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id:             MEMBERSHIP_ID,
    pool_id:        POOL_ID,
    org_id:         MEMBER_ORG_ID,
    declared_qty:   '500.000000',
    qty_unit:       'KG',
    allocated_qty:  null,
    allocation_pct: null,
    status:         'PENDING',
    joined_at:      NOW,
    approved_at:    null,
    withdrawn_at:   null,
    created_at:     NOW,
    updated_at:     NOW,
    ...overrides,
  };
}

function makeBaseCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    pool_ref:           'POOL-2026-001',
    commodity_category: 'COTTON_YARN',
    target_qty:         10000,
    qty_unit:           'KG',
    ...overrides,
  };
}

function makeOpenInput(overrides: Record<string, unknown> = {}) {
  return {
    pool_id:       POOL_ID,
    actor_type:    'TENANT_ADMIN' as const,
    actor_user_id: USER_ID,
    actor_role:    'ORG_ADMIN',
    reason:        'Opening pool for member declarations — authorized by Paresh Patel',
    ...overrides,
  };
}

// ─── Mock factories ───────────────────────────────────────────────────────────

/**
 * Makes a minimal mock transaction client used by the $transaction callback.
 * Contains only the Prisma model methods that openNetworkPool calls inside the tx.
 */
function makeMockTx(overrides: Record<string, unknown> = {}) {
  return {
    network_pools: {
      update: vi.fn().mockResolvedValue(
        makePoolRow({ lifecycle_state_id: OPEN_STATE_ID, lifecycleState: { stateKey: 'OPEN' } }),
      ),
    },
    ...overrides,
  };
}

/**
 * Makes the full mock Prisma client.
 * Default state: DRAFT pool exists, DRAFT+OPEN lifecycle states exist, no existing membership.
 */
function makeDb(overrides: Record<string, unknown> = {}): any {
  const mockTx = makeMockTx();
  return {
    lifecycleState: {
      findUnique: vi.fn().mockImplementation(({ where }: any) => {
        const { entityType, stateKey } = where.entityType_stateKey;
        if (entityType === 'POOL' && stateKey === 'DRAFT') {
          return Promise.resolve({ id: DRAFT_STATE_ID, stateKey: 'DRAFT' });
        }
        if (entityType === 'POOL' && stateKey === 'OPEN') {
          return Promise.resolve({ id: OPEN_STATE_ID, stateKey: 'OPEN' });
        }
        return Promise.resolve(null);
      }),
    },
    network_pools: {
      create:    vi.fn().mockResolvedValue(makePoolRow()),
      findFirst: vi.fn().mockResolvedValue(makePoolRow()),
      update:    vi.fn().mockResolvedValue(
        makePoolRow({ lifecycle_state_id: OPEN_STATE_ID, lifecycleState: { stateKey: 'OPEN' } }),
      ),
    },
    network_pool_memberships: {
      create:    vi.fn().mockResolvedValue(makeMembershipRow()),
      findFirst: vi.fn().mockResolvedValue(null), // no duplicate by default
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(mockTx)),
    ...overrides,
  };
}

/**
 * Makes a mock StateMachineService.
 * Default: returns APPLIED for DRAFT → OPEN.
 */
function makeSm(overrides: Record<string, unknown> = {}): any {
  return {
    transition: vi.fn().mockResolvedValue({
      status:        'APPLIED',
      transitionId:  LOG_ID,
      entityType:    'POOL',
      entityId:      POOL_ID,
      fromStateKey:  'DRAFT',
      toStateKey:    'OPEN',
      createdAt:     NOW,
    }),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NetworkPoolService', () => {

  // ── createNetworkPool ──────────────────────────────────────────────────────

  describe('P-NP-01: PASS — creates a DRAFT pool with valid input', () => {
    it('creates pool row and does not call StateMachineService', async () => {
      const db = makeDb();
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      const result = await svc.createNetworkPool(OWNER_ORG_ID, USER_ID, makeBaseCreateInput());

      expect(result.org_id).toBe(OWNER_ORG_ID);
      expect(result.lifecycle_state_id).toBe(DRAFT_STATE_ID);
      expect(result.lifecycle_state_key).toBe('DRAFT');
      expect(db.network_pools.create).toHaveBeenCalledOnce();
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  describe('P-NP-02: FAIL — createNetworkPool rejects non-positive targetQty', () => {
    it('throws NetworkPoolInvalidInputError when target_qty is zero', async () => {
      const db = makeDb();
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.createNetworkPool(OWNER_ORG_ID, USER_ID, makeBaseCreateInput({ target_qty: 0 })),
      ).rejects.toBeInstanceOf(NetworkPoolInvalidInputError);
    });
  });

  describe('P-NP-03: FAIL — createNetworkPool rejects invalid openAt/closeAt ordering', () => {
    it('throws NetworkPoolInvalidInputError when open_at >= close_at', async () => {
      const db = makeDb();
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.createNetworkPool(OWNER_ORG_ID, USER_ID, makeBaseCreateInput({
          open_at:  '2026-07-15T00:00:00.000Z',
          close_at: '2026-07-01T00:00:00.000Z', // before open_at
        })),
      ).rejects.toBeInstanceOf(NetworkPoolInvalidInputError);
    });
  });

  describe('P-NP-04: FAIL — createNetworkPool throws when DRAFT lifecycle state is missing', () => {
    it('throws NetworkPoolLifecycleStateMissingError when seed is absent', async () => {
      const db = makeDb({
        lifecycleState: { findUnique: vi.fn().mockResolvedValue(null) },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.createNetworkPool(OWNER_ORG_ID, USER_ID, makeBaseCreateInput()),
      ).rejects.toBeInstanceOf(NetworkPoolLifecycleStateMissingError);
    });
  });

  // ── openNetworkPool ────────────────────────────────────────────────────────

  describe('P-NP-05: PASS — openNetworkPool transitions DRAFT → OPEN', () => {
    it('calls StateMachineService.transition and returns OPEN pool', async () => {
      const sm = makeSm();
      const db = makeDb();
      db.$transaction = vi.fn().mockImplementation((fn: any) => fn(makeMockTx()));

      const svc = new NetworkPoolService(db, sm);
      const result = await svc.openNetworkPool(OWNER_ORG_ID, makeOpenInput());

      expect(sm.transition).toHaveBeenCalledOnce();
      const smCall = (sm.transition as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(smCall.entityType).toBe('POOL');
      expect(smCall.fromStateKey).toBe('DRAFT');
      expect(smCall.toStateKey).toBe('OPEN');
      expect(result.lifecycle_state_key).toBe('OPEN');
    });
  });

  describe('P-NP-06: PASS — openNetworkPool SM call carries correct entityId, orgId, reason', () => {
    it('SM request contains pool_id as entityId and owner orgId', async () => {
      const sm = makeSm();
      let capturedReq: any = null;
      sm.transition = vi.fn().mockImplementation(async (req: any) => {
        capturedReq = req;
        return {
          status: 'APPLIED', transitionId: LOG_ID,
          entityType: 'POOL', entityId: POOL_ID,
          fromStateKey: 'DRAFT', toStateKey: 'OPEN', createdAt: NOW,
        };
      });

      const db = makeDb();
      db.$transaction = vi.fn().mockImplementation((fn: any) => fn(makeMockTx()));

      const svc = new NetworkPoolService(db, sm);
      await svc.openNetworkPool(OWNER_ORG_ID, makeOpenInput());

      expect(capturedReq.entityId).toBe(POOL_ID);
      expect(capturedReq.orgId).toBe(OWNER_ORG_ID);
      expect(capturedReq.reason).toContain('authorized by Paresh Patel');
    });
  });

  describe('P-NP-07: FAIL — openNetworkPool rejects non-existent pool', () => {
    it('throws NetworkPoolNotFoundError when pool is not found', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          update:    vi.fn(),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.openNetworkPool(OWNER_ORG_ID, makeOpenInput()),
      ).rejects.toBeInstanceOf(NetworkPoolNotFoundError);
    });
  });

  describe('P-NP-08: FAIL — openNetworkPool rejects pool not in DRAFT state', () => {
    it('throws NetworkPoolInvalidStateError when pool is already OPEN', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(
            makePoolRow({ lifecycle_state_id: OPEN_STATE_ID, lifecycleState: { stateKey: 'OPEN' } }),
          ),
          update: vi.fn(),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.openNetworkPool(OWNER_ORG_ID, makeOpenInput()),
      ).rejects.toBeInstanceOf(NetworkPoolInvalidStateError);
    });
  });

  describe('P-NP-09: FAIL — openNetworkPool wraps SM DENIED in typed error', () => {
    it('throws NetworkPoolTransitionDeniedError when SM returns DENIED', async () => {
      const sm = makeSm();
      sm.transition = vi.fn().mockResolvedValue({
        status:  'DENIED',
        code:    'ACTOR_ROLE_NOT_PERMITTED',
        message: 'actorType not permitted for this transition',
      });

      const db = makeDb();
      db.$transaction = vi.fn().mockImplementation((fn: any) =>
        fn({ network_pools: { update: vi.fn() } }),
      );

      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.openNetworkPool(OWNER_ORG_ID, makeOpenInput()),
      ).rejects.toBeInstanceOf(NetworkPoolTransitionDeniedError);
    });
  });

  // ── joinNetworkPool ────────────────────────────────────────────────────────

  describe('P-NP-10: PASS — joinNetworkPool creates PENDING membership', () => {
    it('creates membership row in PENDING status without calling StateMachineService', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(
            makePoolRow({ lifecycle_state_id: OPEN_STATE_ID, lifecycleState: { stateKey: 'OPEN' } }),
          ),
          update: vi.fn(),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      const result = await svc.joinNetworkPool(MEMBER_ORG_ID, USER_ID, {
        pool_id:      POOL_ID,
        declared_qty: 500,
        qty_unit:     'KG',
      });

      expect(result.status).toBe('PENDING');
      expect(result.pool_id).toBe(POOL_ID);
      expect(result.org_id).toBe(MEMBER_ORG_ID);
      expect(sm.transition).not.toHaveBeenCalled();
    });
  });

  describe('P-NP-11: FAIL — joinNetworkPool rejects non-existent pool', () => {
    it('throws NetworkPoolNotFoundError when pool_id is not found', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          update:    vi.fn(),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.joinNetworkPool(MEMBER_ORG_ID, USER_ID, {
          pool_id: POOL_ID, declared_qty: 500, qty_unit: 'KG',
        }),
      ).rejects.toBeInstanceOf(NetworkPoolNotFoundError);
    });
  });

  describe('P-NP-12: FAIL — joinNetworkPool rejects non-positive declaredQty', () => {
    it('throws NetworkPoolInvalidInputError when declared_qty is zero', async () => {
      const db = makeDb();
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.joinNetworkPool(MEMBER_ORG_ID, USER_ID, {
          pool_id: POOL_ID, declared_qty: 0, qty_unit: 'KG',
        }),
      ).rejects.toBeInstanceOf(NetworkPoolInvalidInputError);
    });
  });

  describe('P-NP-13: FAIL — joinNetworkPool rejects duplicate membership', () => {
    it('throws NetworkPoolDuplicateMembershipError when membership already exists', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(
            makePoolRow({ lifecycle_state_id: OPEN_STATE_ID, lifecycleState: { stateKey: 'OPEN' } }),
          ),
          update: vi.fn(),
        },
        network_pool_memberships: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue({ id: MEMBERSHIP_ID }), // duplicate
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.joinNetworkPool(MEMBER_ORG_ID, USER_ID, {
          pool_id: POOL_ID, declared_qty: 500, qty_unit: 'KG',
        }),
      ).rejects.toBeInstanceOf(NetworkPoolDuplicateMembershipError);
    });
  });

  describe('P-NP-14: FAIL — joinNetworkPool rejects pool not in OPEN or AGGREGATING', () => {
    it('throws NetworkPoolInvalidStateError when pool is in DRAFT', async () => {
      const db = makeDb({
        network_pools: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(
            makePoolRow({ lifecycle_state_id: DRAFT_STATE_ID, lifecycleState: { stateKey: 'DRAFT' } }),
          ),
          update: vi.fn(),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      await expect(
        svc.joinNetworkPool(MEMBER_ORG_ID, USER_ID, {
          pool_id: POOL_ID, declared_qty: 500, qty_unit: 'KG',
        }),
      ).rejects.toBeInstanceOf(NetworkPoolInvalidStateError);
    });
  });

  // ── getNetworkPoolMembership ───────────────────────────────────────────────

  describe('P-NP-15: PASS — getNetworkPoolMembership returns own-org membership only', () => {
    it('queries network_pool_memberships scoped to memberOrgId + poolId', async () => {
      const db = makeDb({
        network_pool_memberships: {
          create:    vi.fn(),
          findFirst: vi.fn().mockResolvedValue(makeMembershipRow()),
        },
      });
      const sm = makeSm();
      const svc = new NetworkPoolService(db, sm);

      const result = await svc.getNetworkPoolMembership(MEMBER_ORG_ID, POOL_ID);

      expect(result).not.toBeNull();
      expect(result!.org_id).toBe(MEMBER_ORG_ID);
      expect(result!.pool_id).toBe(POOL_ID);
      expect(db.network_pool_memberships.findFirst).toHaveBeenCalledWith({
        where: { pool_id: POOL_ID, org_id: MEMBER_ORG_ID },
      });
    });
  });

});
