/**
 * Unit tests — NetworkPoolDemandLineService
 * TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SERVICE-FOUNDATION-001
 *
 * Pure unit tests with mocked PrismaClient. No DB access. No lifecycle seed dependency.
 *
 * COVERAGE (30 tests):
 *   createDemandLine:  P-DL-01 → P-DL-10
 *   updateDemandLine:  P-DL-11 → P-DL-18
 *   listDemandLines:   P-DL-19 → P-DL-25
 *   cancelDemandLine:  P-DL-26 → P-DL-30
 *
 * Run (from server/ directory):
 *   pnpm exec vitest run src/__tests__/networkPoolDemandLine.service.unit.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  NetworkPoolDemandLineService,
  DemandLineNotFoundError,
  DemandLineInvalidInputError,
  DemandLineInvalidStateError,
  DemandLineDuplicateRefError,
  DemandLinePoolNotFoundError,
  DemandLinePoolStateError,
} from '../services/networkPoolDemandLine.service.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const OWNER_ORG_ID = 'aaaa0001-0000-0000-0000-000000000001';
const POOL_ID      = 'bbbb0001-0000-0000-0000-000000000001';
const LINE_ID      = 'cccc0001-0000-0000-0000-000000000001';
const USER_ID      = 'dddd0001-0000-0000-0000-000000000001';
const NOW          = new Date('2026-06-01T00:00:00.000Z');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePoolRow(stateKey = 'OPEN', overrides: Record<string, unknown> = {}) {
  return {
    id:               POOL_ID,
    orgId:            OWNER_ORG_ID,
    poolRef:          'POOL-2026-001',
    commodityCategory:'COTTON_YARN',
    targetQty:        '10000.000000',
    qtyUnit:          'KG',
    lifecycleStateId: 'eeee0001-0000-0000-0000-000000000001',
    lifecycleState:   { stateKey },
    openAt:           null,
    closeAt:          null,
    allocatedAt:      null,
    settledAt:        null,
    metadata:         null,
    createdByUserId:  USER_ID,
    createdAt:        NOW,
    updatedAt:        NOW,
    ...overrides,
  };
}

function makeLineRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                            LINE_ID,
    ownerOrgId:                    OWNER_ORG_ID,
    poolId:                        POOL_ID,
    lineRef:                       'LINE-001',
    commodityCategory:             'COTTON_YARN',
    productCategory:               null,
    productSpecSummary:            null,
    qty:                           '1000.000000',
    qtyUnit:                       'KG',
    qualityRequirementsJson:       null,
    certificationRequirementsJson: null,
    packagingRequirementsJson:     null,
    deliveryLocation:              null,
    deliveryWindowStart:           null,
    deliveryWindowEnd:             null,
    tolerancePct:                  null,
    priority:                      null,
    status:                        'DRAFT',
    sourceType:                    'OWNER_DIRECT',
    sourceMembershipId:            null,
    normalizedFromMemberInput:     false,
    revisionNo:                    1,
    supersedesLineId:              null,
    metadataInternalJson:          null,
    createdAt:                     NOW,
    updatedAt:                     NOW,
    lockedAt:                      null,
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    pool_id:            POOL_ID,
    line_ref:           'LINE-001',
    commodity_category: 'COTTON_YARN',
    qty:                1000,
    qty_unit:           'KG',
    ...overrides,
  };
}

function makeUpdateInput(overrides: Record<string, unknown> = {}) {
  return {
    qty: 2000,
    ...overrides,
  };
}

// ─── Mock factory ──────────────────────────────────────────────────────────────

/**
 * Default db state:
 *   networkPool.findFirst      → OPEN pool
 *   networkPoolDemandLine.findUnique → null (no duplicate)
 *   networkPoolDemandLine.findFirst  → null (use case-specific overrides for line-level ops)
 *   networkPoolDemandLine.create     → makeLineRow()
 *   networkPoolDemandLine.findMany   → [makeLineRow()]
 *   networkPoolDemandLine.count      → 1
 *   networkPoolDemandLine.update     → makeLineRow({ status: 'CANCELLED' })
 */
function makeDb(overrides: {
  networkPool?: Record<string, unknown>;
  networkPoolDemandLine?: Record<string, unknown>;
} = {}): any {
  return {
    networkPool: {
      findFirst: vi.fn().mockResolvedValue(makePoolRow()),
      ...overrides.networkPool,
    },
    networkPoolDemandLine: {
      create:     vi.fn().mockResolvedValue(makeLineRow()),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst:  vi.fn().mockResolvedValue(null),
      findMany:   vi.fn().mockResolvedValue([makeLineRow()]),
      count:      vi.fn().mockResolvedValue(1),
      update:     vi.fn().mockResolvedValue(makeLineRow({ status: 'CANCELLED' })),
      ...overrides.networkPoolDemandLine,
    },
  };
}

// ─── createDemandLine ─────────────────────────────────────────────────────────

describe('NetworkPoolDemandLineService — createDemandLine', () => {

  describe('P-DL-01: PASS — creates DRAFT demand line with required fields only', () => {
    it('creates the row, sets status=DRAFT, revisionNo=1, sourceType=OWNER_DIRECT', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput());

      expect(result.status).toBe('DRAFT');
      expect(result.revision_no).toBe(1);
      expect(result.source_type).toBe('OWNER_DIRECT');
      expect(result.owner_org_id).toBe(OWNER_ORG_ID);
      expect(db.networkPoolDemandLine.create).toHaveBeenCalledOnce();
    });
  });

  describe('P-DL-02: PASS — creates demand line with all optional fields populated', () => {
    it('stores delivery window and optional categorical fields', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      const fullInput = makeCreateInput({
        product_category:    'RING_SPUN',
        delivery_window_start: '2026-08-01T00:00:00.000Z',
        delivery_window_end:   '2026-09-01T00:00:00.000Z',
        tolerance_pct: 5,
        priority: 1,
        source_type: 'OWNER_NORMALIZED',
      });

      const result = await svc.createDemandLine(OWNER_ORG_ID, USER_ID, fullInput);

      expect(result.owner_org_id).toBe(OWNER_ORG_ID);
      expect(db.networkPoolDemandLine.create).toHaveBeenCalledOnce();
      const createArg = (db.networkPoolDemandLine.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createArg.data.sourceType).toBe('OWNER_NORMALIZED');
    });
  });

  describe('P-DL-03: FAIL — blank line_ref throws DemandLineInvalidInputError', () => {
    it('rejects empty string line_ref before touching the DB', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput({ line_ref: '   ' })),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.networkPool.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-04: FAIL — qty=0 throws DemandLineInvalidInputError', () => {
    it('rejects zero qty', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput({ qty: 0 })),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
    });
  });

  describe('P-DL-05: FAIL — invalid source_type throws DemandLineInvalidInputError', () => {
    it('rejects unknown source_type value', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput({ source_type: 'INVALID_SOURCE' })),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
    });
  });

  describe('P-DL-06: FAIL — pool not found throws DemandLinePoolNotFoundError', () => {
    it('throws when networkPool.findFirst returns null', async () => {
      const db = makeDb({
        networkPool: { findFirst: vi.fn().mockResolvedValue(null) },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolNotFoundError);
      expect(db.networkPoolDemandLine.create).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-07: FAIL — pool in CLOSED state throws DemandLinePoolStateError', () => {
    it('rejects create when pool stateKey=CLOSED', async () => {
      const db = makeDb({
        networkPool: { findFirst: vi.fn().mockResolvedValue(makePoolRow('CLOSED')) },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolStateError);
      expect(db.networkPoolDemandLine.create).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-08: FAIL — duplicate lineRef (revisionNo=1) throws DemandLineDuplicateRefError', () => {
    it('throws when findUnique returns an existing row for the same poolId+lineRef+revisionNo=1', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findUnique: vi.fn().mockResolvedValue(makeLineRow()),
          create:     vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput()),
      ).rejects.toBeInstanceOf(DemandLineDuplicateRefError);
      expect(db.networkPoolDemandLine.create).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-09: FAIL — delivery_window_start after delivery_window_end throws DemandLineInvalidInputError', () => {
    it('rejects when start > end', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput({
          delivery_window_start: '2026-10-01T00:00:00.000Z',
          delivery_window_end:   '2026-09-01T00:00:00.000Z',
        })),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
    });
  });

  describe('P-DL-10: PASS — ownerOrgId sourced from arg, not input body; create sets DRAFT defaults', () => {
    it('create data carries ownerOrgId, status=DRAFT, revisionNo=1, normalizedFromMemberInput=false', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await svc.createDemandLine(OWNER_ORG_ID, USER_ID, makeCreateInput());

      const createCall = (db.networkPoolDemandLine.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createCall.data.ownerOrgId).toBe(OWNER_ORG_ID);
      expect(createCall.data.status).toBe('DRAFT');
      expect(createCall.data.revisionNo).toBe(1);
      expect(createCall.data.normalizedFromMemberInput).toBe(false);
      expect(createCall.data.sourceMembershipId).toBeNull();
    });
  });

});

// ─── updateDemandLine ─────────────────────────────────────────────────────────

describe('NetworkPoolDemandLineService — updateDemandLine', () => {

  describe('P-DL-11: PASS — updates qty on a DRAFT line', () => {
    it('calls update with new qty and returns updated record', async () => {
      const updatedRow = makeLineRow({ qty: '2000.000000' });
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow()),
          update:    vi.fn().mockResolvedValue(updatedRow),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, makeUpdateInput());

      expect(db.networkPoolDemandLine.update).toHaveBeenCalledOnce();
      expect(result.qty).toBe('2000.000000');
    });
  });

  describe('P-DL-12: FAIL — no update fields provided throws DemandLineInvalidInputError', () => {
    it('throws before touching the DB when input is empty', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, {}),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.networkPoolDemandLine.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-13: FAIL — line not found throws DemandLineNotFoundError', () => {
    it('throws when findFirst returns null (non-existent or wrong-org)', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, makeUpdateInput()),
      ).rejects.toBeInstanceOf(DemandLineNotFoundError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-14: FAIL — CANCELLED line throws DemandLineInvalidStateError', () => {
    it('rejects update on a line with status=CANCELLED', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ status: 'CANCELLED' })),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, makeUpdateInput()),
      ).rejects.toBeInstanceOf(DemandLineInvalidStateError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-15: PASS — partial delivery-window update with only start provided, valid against stored end', () => {
    it('succeeds when new start (Aug 1) is before stored end (Sep 1)', async () => {
      const storedEnd  = new Date('2026-09-01T00:00:00.000Z');
      const updatedRow = makeLineRow({ deliveryWindowStart: new Date('2026-08-01T00:00:00.000Z'), deliveryWindowEnd: storedEnd });
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ deliveryWindowEnd: storedEnd })),
          update:    vi.fn().mockResolvedValue(updatedRow),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, {
        delivery_window_start: '2026-08-01T00:00:00.000Z',
      });

      expect(db.networkPoolDemandLine.update).toHaveBeenCalledOnce();
      expect(result.delivery_window_end).toBe(storedEnd.toISOString());
    });
  });

  describe('P-DL-16: FAIL — partial delivery-window update: new start after stored end throws DemandLineInvalidInputError', () => {
    it('throws when new start (Oct 1) > stored end (Sep 1)', async () => {
      const storedEnd = new Date('2026-09-01T00:00:00.000Z');
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ deliveryWindowEnd: storedEnd })),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, {
          delivery_window_start: '2026-10-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-17: FAIL — pool in CLOSED state throws DemandLinePoolStateError', () => {
    it('rejects update when pool stateKey=CLOSED', async () => {
      const db = makeDb({
        networkPool: {
          findFirst: vi.fn().mockResolvedValue(makePoolRow('CLOSED')),
        },
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow()),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, makeUpdateInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolStateError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-18: PASS — updates ACTIVE line (ACTIVE is editable)', () => {
    it('allows qty update on a line with status=ACTIVE', async () => {
      const updatedRow = makeLineRow({ status: 'ACTIVE', qty: '3000.000000' });
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ status: 'ACTIVE' })),
          update:    vi.fn().mockResolvedValue(updatedRow),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.updateDemandLine(OWNER_ORG_ID, LINE_ID, { qty: 3000 });

      expect(db.networkPoolDemandLine.update).toHaveBeenCalledOnce();
      expect(result.status).toBe('ACTIVE');
    });
  });

});

// ─── listDemandLines ──────────────────────────────────────────────────────────

describe('NetworkPoolDemandLineService — listDemandLines', () => {

  describe('P-DL-19: PASS — lists demand lines with default pagination', () => {
    it('returns items and pagination with limit=20, offset=0 by default', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.listDemandLines(OWNER_ORG_ID, POOL_ID, {});

      expect(result.items).toHaveLength(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.count).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('P-DL-20: PASS — filters by status', () => {
    it('passes status filter to findMany where clause', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await svc.listDemandLines(OWNER_ORG_ID, POOL_ID, { status: 'ACTIVE' });

      const findManyCall = (db.networkPoolDemandLine.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('ACTIVE');
    });
  });

  describe('P-DL-21: FAIL — pool not found throws DemandLinePoolNotFoundError', () => {
    it('throws when networkPool.findFirst returns null (Decision 8: no silent empty list)', async () => {
      const db = makeDb({
        networkPool: { findFirst: vi.fn().mockResolvedValue(null) },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.listDemandLines(OWNER_ORG_ID, POOL_ID, {}),
      ).rejects.toBeInstanceOf(DemandLinePoolNotFoundError);
      expect(db.networkPoolDemandLine.findMany).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-22: FAIL — limit > 100 throws DemandLineInvalidInputError', () => {
    it('rejects limit=101', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.listDemandLines(OWNER_ORG_ID, POOL_ID, { limit: 101 }),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
    });
  });

  describe('P-DL-23: FAIL — negative offset throws DemandLineInvalidInputError', () => {
    it('rejects offset=-1', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.listDemandLines(OWNER_ORG_ID, POOL_ID, { offset: -1 }),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
    });
  });

  describe('P-DL-24: PASS — returns correct pagination metadata', () => {
    it('pagination.total comes from count, pagination.count from items.length', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findMany: vi.fn().mockResolvedValue([makeLineRow(), makeLineRow({ id: 'cccc0002-0000-0000-0000-000000000002', lineRef: 'LINE-002' })]),
          count:    vi.fn().mockResolvedValue(5),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.listDemandLines(OWNER_ORG_ID, POOL_ID, { limit: 2, offset: 0 });

      expect(result.pagination.count).toBe(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.limit).toBe(2);
    });
  });

  describe('P-DL-25: PASS — explicit limit=50 is respected in findMany', () => {
    it('passes take=50 to findMany', async () => {
      const db  = makeDb();
      const svc = new NetworkPoolDemandLineService(db);

      await svc.listDemandLines(OWNER_ORG_ID, POOL_ID, { limit: 50 });

      const findManyCall = (db.networkPoolDemandLine.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(findManyCall.take).toBe(50);
    });
  });

});

// ─── cancelDemandLine ─────────────────────────────────────────────────────────

describe('NetworkPoolDemandLineService — cancelDemandLine', () => {

  describe('P-DL-26: PASS — cancels a DRAFT line, returns CANCELLED record', () => {
    it('calls update with status=CANCELLED and returns the cancelled record', async () => {
      const cancelledRow = makeLineRow({ status: 'CANCELLED' });
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow()),
          update:    vi.fn().mockResolvedValue(cancelledRow),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.cancelDemandLine(OWNER_ORG_ID, LINE_ID);

      expect(db.networkPoolDemandLine.update).toHaveBeenCalledOnce();
      const updateCall = (db.networkPoolDemandLine.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.data.status).toBe('CANCELLED');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('P-DL-27: PASS — cancels an ACTIVE line', () => {
    it('allows cancel when line status=ACTIVE', async () => {
      const cancelledRow = makeLineRow({ status: 'CANCELLED' });
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ status: 'ACTIVE' })),
          update:    vi.fn().mockResolvedValue(cancelledRow),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.cancelDemandLine(OWNER_ORG_ID, LINE_ID);

      expect(db.networkPoolDemandLine.update).toHaveBeenCalledOnce();
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('P-DL-28: FAIL — line not found throws DemandLineNotFoundError', () => {
    it('throws when findFirst returns null (non-leaking: covers missing and wrong-org)', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(null),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.cancelDemandLine(OWNER_ORG_ID, LINE_ID),
      ).rejects.toBeInstanceOf(DemandLineNotFoundError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-29: FAIL — CANCELLED line throws DemandLineInvalidStateError', () => {
    it('rejects cancel on a line already CANCELLED', async () => {
      const db = makeDb({
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow({ status: 'CANCELLED' })),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.cancelDemandLine(OWNER_ORG_ID, LINE_ID),
      ).rejects.toBeInstanceOf(DemandLineInvalidStateError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-30: FAIL — pool in SETTLED state throws DemandLinePoolStateError', () => {
    it('rejects cancel when pool stateKey=SETTLED', async () => {
      const db = makeDb({
        networkPool: {
          findFirst: vi.fn().mockResolvedValue(makePoolRow('SETTLED')),
        },
        networkPoolDemandLine: {
          findFirst: vi.fn().mockResolvedValue(makeLineRow()),
          update:    vi.fn(),
        },
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.cancelDemandLine(OWNER_ORG_ID, LINE_ID),
      ).rejects.toBeInstanceOf(DemandLinePoolStateError);
      expect(db.networkPoolDemandLine.update).not.toHaveBeenCalled();
    });
  });

});
