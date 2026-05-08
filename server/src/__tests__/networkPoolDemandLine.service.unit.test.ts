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
  DemandLineNoActiveLinesError,
  DemandLineSetChangedError,
  DemandLineSnapshotConflictError,
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

// ─── lockDemandLinesForRfq helpers ────────────────────────────────────────────

const SNAP_ID  = 'eeee0001-0000-0000-0000-000000000001';
const LINE_ID2 = 'cccc0002-0000-0000-0000-000000000002';

function makeActiveLineRow(overrides: Record<string, unknown> = {}) {
  return makeLineRow({ status: 'ACTIVE', ...overrides });
}

function makeSnapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                  SNAP_ID,
    ownerOrgId:          OWNER_ORG_ID,
    poolId:              POOL_ID,
    snapshotRef:         'snap-ref-uuid',
    snapshotVersion:     1,
    basis:               'RFQ_ISSUE',
    status:              'CAPTURED',
    capturedAt:          NOW,
    capturedByUserId:    USER_ID,
    capturedReason:      null,
    lineCount:           1,
    totalQty:            '1000.000000',
    qtyUnit:             'KG',
    metadataInternalJson: null,
    createdAt:           NOW,
    updatedAt:           NOW,
    ...overrides,
  };
}

function makeLockInput(overrides: Record<string, unknown> = {}) {
  return {
    pool_id: POOL_ID,
    ...overrides,
  };
}

/**
 * Build a db mock wired for lockDemandLinesForRfq.
 * The $transaction mock calls the callback with `tx` (same shape as db).
 * All sub-mocks can be overridden per-test.
 */
function makeLockDb(overrides: {
  poolFindFirst?:       ReturnType<typeof vi.fn>;
  lineFindMany?:        ReturnType<typeof vi.fn>;
  snapAggregate?:       ReturnType<typeof vi.fn>;
  snapCreate?:          ReturnType<typeof vi.fn>;
  snapLineCreateMany?:  ReturnType<typeof vi.fn>;
  lineUpdateMany?:      ReturnType<typeof vi.fn>;
} = {}): any {
  const tx: any = {
    networkPool: {
      findFirst: overrides.poolFindFirst ?? vi.fn().mockResolvedValue(makePoolRow('AGGREGATING')),
    },
    networkPoolDemandLine: {
      findMany:    overrides.lineFindMany    ?? vi.fn().mockResolvedValue([makeActiveLineRow()]),
      updateMany:  overrides.lineUpdateMany  ?? vi.fn().mockResolvedValue({ count: 1 }),
    },
    networkPoolDemandSnapshot: {
      aggregate: overrides.snapAggregate   ?? vi.fn().mockResolvedValue({ _max: { snapshotVersion: 0 } }),
      create:    overrides.snapCreate      ?? vi.fn().mockResolvedValue(makeSnapshotRow()),
    },
    networkPoolDemandSnapshotLine: {
      createMany: overrides.snapLineCreateMany ?? vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return {
    ...tx,
    $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<unknown>) => cb(tx)),
  };
}

// ─── lockDemandLinesForRfq ────────────────────────────────────────────────────

describe('NetworkPoolDemandLineService — lockDemandLinesForRfq', () => {

  describe('P-DL-31: PASS — locks ACTIVE lines, creates snapshot, returns DemandSnapshotRecord', () => {
    it('returns snapshot header with correct fields; does not include lines or metadataInternalJson', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(result.id).toBe(SNAP_ID);
      expect(result.owner_org_id).toBe(OWNER_ORG_ID);
      expect(result.pool_id).toBe(POOL_ID);
      expect(result.basis).toBe('RFQ_ISSUE');
      expect(result.status).toBe('CAPTURED');
      expect(result.line_count).toBe(1);
      expect(result.snapshot_version).toBe(1);
      expect('lines' in result).toBe(false);
      expect('metadata_internal_json' in result).toBe(false);
    });
  });

  describe('P-DL-32: PASS — snapshotVersion increments by 1 over max existing version', () => {
    it('passes snapshotVersion=3 to create when max existing is 2', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ snapshotVersion: 3 }));
      const db = makeLockDb({
        snapAggregate: vi.fn().mockResolvedValue({ _max: { snapshotVersion: 2 } }),
        snapCreate,
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const createArg = snapCreate.mock.calls[0][0];
      expect(createArg.data.snapshotVersion).toBe(3);
      expect(result.snapshot_version).toBe(3);
    });
  });

  describe('P-DL-33: PASS — first snapshot gets snapshotVersion=1 when no prior snapshots exist', () => {
    it('passes snapshotVersion=1 to create when aggregate max is null', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ snapshotVersion: 1 }));
      const db = makeLockDb({
        snapAggregate: vi.fn().mockResolvedValue({ _max: { snapshotVersion: null } }),
        snapCreate,
      });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const createArg = snapCreate.mock.calls[0][0];
      expect(createArg.data.snapshotVersion).toBe(1);
    });
  });

  describe('P-DL-34: PASS — qty summary set when all active lines share the same qtyUnit', () => {
    it('totalQty is sum of all line qty values; qtyUnit is the common unit', async () => {
      const line1 = makeActiveLineRow({ qty: '500.000000', qtyUnit: 'KG' });
      const line2 = makeActiveLineRow({ id: LINE_ID2, lineRef: 'LINE-002', qty: '300.000000', qtyUnit: 'KG' });
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ totalQty: '800.000000', qtyUnit: 'KG', lineCount: 2 }));
      const db = makeLockDb({
        lineFindMany:   vi.fn().mockResolvedValue([line1, line2]),
        snapCreate,
        snapLineCreateMany: vi.fn().mockResolvedValue({ count: 2 }),
        lineUpdateMany:     vi.fn().mockResolvedValue({ count: 2 }),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const createArg = snapCreate.mock.calls[0][0];
      expect(parseFloat(createArg.data.totalQty)).toBeCloseTo(800, 3);
      expect(createArg.data.qtyUnit).toBe('KG');
    });
  });

  describe('P-DL-35: PASS — qty summary is null when active lines have mixed qtyUnit', () => {
    it('totalQty and qtyUnit are null when units differ', async () => {
      const line1 = makeActiveLineRow({ qty: '500.000000', qtyUnit: 'KG' });
      const line2 = makeActiveLineRow({ id: LINE_ID2, lineRef: 'LINE-002', qty: '300.000000', qtyUnit: 'MT' });
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ totalQty: null, qtyUnit: null, lineCount: 2 }));
      const db = makeLockDb({
        lineFindMany:       vi.fn().mockResolvedValue([line1, line2]),
        snapCreate,
        snapLineCreateMany: vi.fn().mockResolvedValue({ count: 2 }),
        lineUpdateMany:     vi.fn().mockResolvedValue({ count: 2 }),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const createArg = snapCreate.mock.calls[0][0];
      expect(createArg.data.totalQty).toBeNull();
      expect(createArg.data.qtyUnit).toBeNull();
    });
  });

  describe('P-DL-36: PASS — createMany called with one snapshot line per active demand line', () => {
    it('createMany receives correct demandLineId and sourceLineRef', async () => {
      const snapLineCreateMany = vi.fn().mockResolvedValue({ count: 1 });
      const db = makeLockDb({ snapLineCreateMany });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const createManyArg = snapLineCreateMany.mock.calls[0][0];
      expect(createManyArg.data).toHaveLength(1);
      expect(createManyArg.data[0].demandLineId).toBe(LINE_ID);
      expect(createManyArg.data[0].sourceLineRef).toBe('LINE-001');
      expect(createManyArg.data[0].snapshotId).toBe(SNAP_ID);
    });
  });

  describe('P-DL-37: PASS — updateMany called with LOCKED_FOR_RFQ and lockedAt', () => {
    it('updateMany data has status=LOCKED_FOR_RFQ and lockedAt is a Date', async () => {
      const lineUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const db = makeLockDb({ lineUpdateMany });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      const updateArg = lineUpdateMany.mock.calls[0][0];
      expect(updateArg.data.status).toBe('LOCKED_FOR_RFQ');
      expect(updateArg.data.lockedAt).toBeInstanceOf(Date);
      expect(updateArg.where.id.in).toContain(LINE_ID);
    });
  });

  describe('P-DL-38: PASS — optional expected_line_ids matches current ACTIVE set → succeeds', () => {
    it('does not throw when expected_line_ids exactly matches current ACTIVE line ids', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput({ expected_line_ids: [LINE_ID] })),
      ).resolves.toBeDefined();
    });
  });

  describe('P-DL-39: FAIL — expected_line_ids set mismatch throws DemandLineSetChangedError', () => {
    it('throws when expected_line_ids contains an id not in ACTIVE set', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(
          OWNER_ORG_ID,
          USER_ID,
          makeLockInput({ expected_line_ids: [LINE_ID, LINE_ID2] }),
        ),
      ).rejects.toBeInstanceOf(DemandLineSetChangedError);
    });
  });

  describe('P-DL-40: FAIL — pool not found throws DemandLinePoolNotFoundError', () => {
    it('throws when networkPool.findFirst returns null', async () => {
      const db = makeLockDb({
        poolFindFirst: vi.fn().mockResolvedValue(null),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolNotFoundError);
    });
  });

  describe('P-DL-41: FAIL — pool state is not AGGREGATING throws DemandLinePoolStateError', () => {
    it('throws when pool stateKey=OPEN (only AGGREGATING is allowed)', async () => {
      const db = makeLockDb({
        poolFindFirst: vi.fn().mockResolvedValue(makePoolRow('OPEN')),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolStateError);
    });
  });

  describe('P-DL-42: FAIL — zero ACTIVE lines throws DemandLineNoActiveLinesError', () => {
    it('throws and does not call create when findMany returns empty array', async () => {
      const snapCreate = vi.fn();
      const db = makeLockDb({
        lineFindMany: vi.fn().mockResolvedValue([]),
        snapCreate,
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLineNoActiveLinesError);
      expect(snapCreate).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-43: FAIL — updateMany count < expected throws DemandLineSetChangedError (concurrent race)', () => {
    it('throws when updateMany.count is less than active lines length', async () => {
      const db = makeLockDb({
        lineUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLineSetChangedError);
    });
  });

  describe('P-DL-44: FAIL — blank pool_id throws DemandLineInvalidInputError', () => {
    it('rejects before entering transaction when pool_id is empty', async () => {
      const db = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput({ pool_id: '  ' })),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-45: FAIL — captured_reason over 1000 chars throws DemandLineInvalidInputError', () => {
    it('rejects before entering transaction when captured_reason exceeds 1000 chars', async () => {
      const db = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(
          OWNER_ORG_ID,
          USER_ID,
          makeLockInput({ captured_reason: 'x'.repeat(1001) }),
        ),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-46: FAIL — P2002 Prisma error wraps to DemandLineSnapshotConflictError', () => {
    it('catches P2002 from transaction and throws DemandLineSnapshotConflictError', async () => {
      const p2002 = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
        name: 'PrismaClientKnownRequestError',
        clientVersion: '6.0.0',
        meta: {},
        batchRequestIdx: undefined,
      });
      // Override constructor name so instanceof check works
      Object.setPrototypeOf(p2002, (await import('@prisma/client')).Prisma.PrismaClientKnownRequestError.prototype);

      const db = makeLockDb({
        snapCreate: vi.fn().mockRejectedValue(p2002),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLineSnapshotConflictError);
    });
  });

  describe('P-DL-47: PASS — snapshot basis is always RFQ_ISSUE', () => {
    it('snapshot create call carries basis=RFQ_ISSUE', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow());
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.basis).toBe('RFQ_ISSUE');
    });
  });

  describe('P-DL-48: PASS — snapshot status is CAPTURED on insert', () => {
    it('snapshot create call carries status=CAPTURED', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow());
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.status).toBe('CAPTURED');
    });
  });

  describe('P-DL-49: PASS — capturedByUserId is set from userId arg', () => {
    it('snapshot create receives capturedByUserId matching the userId arg', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow());
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.capturedByUserId).toBe(USER_ID);
    });
  });

  describe('P-DL-50: PASS — capturedReason null when not supplied', () => {
    it('snapshot create receives capturedReason=null when input.captured_reason is omitted', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow());
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.capturedReason).toBeNull();
    });
  });

  describe('P-DL-51: PASS — capturedReason forwarded when supplied', () => {
    it('snapshot create receives capturedReason from input', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ capturedReason: 'Q3 RFQ batch' }));
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput({ captured_reason: 'Q3 RFQ batch' }));

      expect(snapCreate.mock.calls[0][0].data.capturedReason).toBe('Q3 RFQ batch');
    });
  });

  describe('P-DL-52: PASS — metadataInternalJson is not present in returned DemandSnapshotRecord', () => {
    it('result object has no metadataInternalJson key', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(Object.keys(result)).not.toContain('metadata_internal_json');
    });
  });

  describe('P-DL-53: PASS — metadataInternalJson from source line is copied to snapshot line', () => {
    it('createMany data carries metadataInternalJson from the source demand line', async () => {
      const meta = { foo: 'bar' };
      const lineWithMeta = makeActiveLineRow({ metadataInternalJson: meta });
      const snapLineCreateMany = vi.fn().mockResolvedValue({ count: 1 });
      const db = makeLockDb({
        lineFindMany: vi.fn().mockResolvedValue([lineWithMeta]),
        snapLineCreateMany,
      });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapLineCreateMany.mock.calls[0][0].data[0].metadataInternalJson).toEqual(meta);
    });
  });

  describe('P-DL-54: FAIL — empty string ownerOrgId throws DemandLineInvalidInputError', () => {
    it('rejects before transaction when ownerOrgId is blank', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq('', USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLineInvalidInputError);
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('P-DL-55: PASS — expected_line_ids omitted → locks all ACTIVE lines without set comparison', () => {
    it('succeeds and calls updateMany when expected_line_ids is not supplied', async () => {
      const lineUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const db = makeLockDb({ lineUpdateMany });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, { pool_id: POOL_ID }),
      ).resolves.toBeDefined();
      expect(lineUpdateMany).toHaveBeenCalledOnce();
    });
  });

  describe('P-DL-56: PASS — expected_line_ids null → same as omitted (locks all ACTIVE lines)', () => {
    it('succeeds when expected_line_ids is explicitly null', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput({ expected_line_ids: null })),
      ).resolves.toBeDefined();
    });
  });

  describe('P-DL-57: FAIL — non-AGGREGATING pool state CLOSED throws DemandLinePoolStateError', () => {
    it('throws when pool stateKey=CLOSED_FOR_BIDS', async () => {
      const db = makeLockDb({
        poolFindFirst: vi.fn().mockResolvedValue(makePoolRow('CLOSED_FOR_BIDS')),
      });
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput()),
      ).rejects.toBeInstanceOf(DemandLinePoolStateError);
    });
  });

  describe('P-DL-58: PASS — lineCount in snapshot header matches number of active lines', () => {
    it('snapshot header line_count equals the number of active lines fetched', async () => {
      const line2 = makeActiveLineRow({ id: LINE_ID2, lineRef: 'LINE-002', qty: '500.000000' });
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ lineCount: 2 }));
      const db = makeLockDb({
        lineFindMany:       vi.fn().mockResolvedValue([makeActiveLineRow(), line2]),
        snapCreate,
        snapLineCreateMany: vi.fn().mockResolvedValue({ count: 2 }),
        lineUpdateMany:     vi.fn().mockResolvedValue({ count: 2 }),
      });
      const svc = new NetworkPoolDemandLineService(db);

      const result = await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.lineCount).toBe(2);
      expect(result.line_count).toBe(2);
    });
  });

  describe('P-DL-59: PASS — userId null is forwarded as capturedByUserId null', () => {
    it('snapshot create receives capturedByUserId=null when userId arg is null', async () => {
      const snapCreate = vi.fn().mockResolvedValue(makeSnapshotRow({ capturedByUserId: null }));
      const db = makeLockDb({ snapCreate });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, null, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.capturedByUserId).toBeNull();
    });
  });

  describe('P-DL-60: FAIL — expected_line_ids empty array throws DemandLineSetChangedError', () => {
    it('empty expected_line_ids does not match non-empty ACTIVE set', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await expect(
        svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput({ expected_line_ids: [] })),
      ).rejects.toBeInstanceOf(DemandLineSetChangedError);
    });
  });

  describe('P-DL-61: PASS — ownerOrgId is passed to all write operations (tenant isolation)', () => {
    it('snapshot create and updateMany carry the correct ownerOrgId', async () => {
      const snapCreate    = vi.fn().mockResolvedValue(makeSnapshotRow());
      const lineUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const db = makeLockDb({ snapCreate, lineUpdateMany });
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(snapCreate.mock.calls[0][0].data.ownerOrgId).toBe(OWNER_ORG_ID);
      expect(lineUpdateMany.mock.calls[0][0].where.ownerOrgId).toBe(OWNER_ORG_ID);
    });
  });

  describe('P-DL-62: PASS — $transaction is called exactly once', () => {
    it('wraps entire operation in a single transaction', async () => {
      const db  = makeLockDb();
      const svc = new NetworkPoolDemandLineService(db);

      await svc.lockDemandLinesForRfq(OWNER_ORG_ID, USER_ID, makeLockInput());

      expect(db.$transaction).toHaveBeenCalledOnce();
    });
  });

});
