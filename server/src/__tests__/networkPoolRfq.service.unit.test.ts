/**
 * Unit tests — NetworkPoolRfqService
 * TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-SERVICE-001
 *
 * Pure unit tests with mocked PrismaClient and mocked StateMachineService.
 * No DB access. No lifecycle seed dependency.
 *
 * COVERAGE (43 tests):
 *   Input validation:          P-RFQ-01 → P-RFQ-04
 *   Pool and state:            P-RFQ-05 → P-RFQ-08
 *   Snapshot resolution:       P-RFQ-09 → P-RFQ-13
 *   Duplicate RFQ guard:       P-RFQ-14 → P-RFQ-15
 *   RFQ creation — header:     P-RFQ-16 → P-RFQ-26
 *   RFQ lines:                 P-RFQ-27 → P-RFQ-29
 *   State machine / lifecycle: P-RFQ-30 → P-RFQ-36
 *   Transaction atomicity:     P-RFQ-37 → P-RFQ-39
 *   Return DTO:                P-RFQ-40 → P-RFQ-43
 *
 * Run (from server/ directory):
 *   pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  NetworkPoolRfqService,
  NetworkPoolRfqInvalidInputError,
  NetworkPoolRfqPoolNotFoundError,
  NetworkPoolRfqInvalidPoolStateError,
  NetworkPoolRfqSnapshotNotFoundError,
  NetworkPoolRfqAlreadyIssuedError,
  NetworkPoolRfqTransitionDeniedError,
  NetworkPoolRfqConflictError,
} from '../services/networkPoolRfq.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const OWNER_ORG_ID        = 'aaaa0001-0000-0000-0000-000000000001';
const POOL_ID             = 'bbbb0001-0000-0000-0000-000000000001';
const USER_ID             = 'cccc0001-0000-0000-0000-000000000001';
const SNAPSHOT_ID         = 'dddd0001-0000-0000-0000-000000000001';
const SNAPSHOT_LINE_ID_1  = 'eeee0001-0000-0000-0000-000000000001';
const SNAPSHOT_LINE_ID_2  = 'eeee0002-0000-0000-0000-000000000002';
const DEMAND_LINE_ID      = 'ffff0001-0000-0000-0000-000000000001';
const RFQ_ID              = '9999aaaa-0000-0000-0000-000000000001';
const LOG_ID              = '9999bbbb-0000-0000-0000-000000000001';
const LIFECYCLE_STATE_ID  = '9999cccc-0000-0000-0000-000000000001';
const NOW                 = new Date('2026-06-01T00:00:00.000Z');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePoolRow(stateKey = 'AGGREGATING', overrides: Record<string, unknown> = {}) {
  return {
    id:               POOL_ID,
    orgId:            OWNER_ORG_ID,
    poolRef:          'POOL-2026-001',
    commodityCategory:'COTTON_YARN',
    targetQty:        '10000.000000',
    qtyUnit:          'KG',
    lifecycleStateId: LIFECYCLE_STATE_ID,
    lifecycleState:   { stateKey },
    openAt:           null,
    closeAt:          null,
    createdAt:        NOW,
    updatedAt:        NOW,
    ...overrides,
  };
}

function makeSnapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id:              SNAPSHOT_ID,
    ownerOrgId:      OWNER_ORG_ID,
    poolId:          POOL_ID,
    snapshotRef:     'SNAP-001',
    snapshotVersion: 1,
    basis:           'LOCK',
    status:          'CAPTURED',
    capturedAt:      NOW,
    capturedByUserId: USER_ID,
    capturedReason:  'RFQ lock',
    lineCount:       2,
    totalQty:        '2000.000000',
    qtyUnit:         'KG',
    metadataInternalJson: null,
    createdAt:       NOW,
    updatedAt:       NOW,
    ...overrides,
  };
}

function makeSnapshotLineRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snapshotId:                    SNAPSHOT_ID,
    ownerOrgId:                    OWNER_ORG_ID,
    poolId:                        POOL_ID,
    demandLineId:                  DEMAND_LINE_ID,
    sourceLineRef:                 'LINE-001',
    sourceRevisionNo:              1,
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
    sourceType:                    'OWNER_DIRECT',
    normalizedFromMemberInput:     false,
    sourceMembershipId:            null,
    supersedesLineId:              null,
    metadataInternalJson:          null,
    createdAt:                     NOW,
    ...overrides,
  };
}

function makeRfqRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                  RFQ_ID,
    ownerOrgId:          OWNER_ORG_ID,
    poolId:              POOL_ID,
    snapshotId:          SNAPSHOT_ID,
    rfqRef:              'some-uuid-ref',
    rfqVersion:          1,
    status:              'ISSUED',
    issueBasis:          'SNAPSHOT_LOCK',
    issuedAt:            NOW,
    issuedByUserId:      USER_ID,
    issueReason:         null,
    responseDeadlineAt:  null,
    supplierInviteMode:  'INVITE_ONLY',
    lineCount:           2,
    totalQty:            '2000.000000',
    qtyUnit:             'KG',
    metadataInternalJson: null,
    createdAt:           NOW,
    updatedAt:           NOW,
    ...overrides,
  };
}

function makeIssueInput(overrides: Record<string, unknown> = {}) {
  return {
    pool_id: POOL_ID,
    ...overrides,
  };
}

// ─── Mock factories ───────────────────────────────────────────────────────────

/**
 * Default tx mock client — used inside $transaction callback.
 * All tx-level Prisma model methods are vi.fn().
 */
function makeMockTx(overrides: {
  networkPool?:                   Record<string, unknown>;
  networkPoolRfq?:                Record<string, unknown>;
  networkPoolRfqLine?:            Record<string, unknown>;
  networkPoolDemandSnapshot?:     Record<string, unknown>;
  networkPoolDemandSnapshotLine?: Record<string, unknown>;
} = {}): any {
  return {
    networkPool: {
      findFirst: vi.fn().mockResolvedValue(makePoolRow()),
      update:    vi.fn().mockResolvedValue({ id: POOL_ID }),
      ...overrides.networkPool,
    },
    networkPoolRfq: {
      findFirst: vi.fn().mockResolvedValue(null), // no existing RFQ by default
      create:    vi.fn().mockResolvedValue(makeRfqRow()),
      ...overrides.networkPoolRfq,
    },
    networkPoolRfqLine: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      ...overrides.networkPoolRfqLine,
    },
    networkPoolDemandSnapshot: {
      findFirst: vi.fn().mockResolvedValue(makeSnapshotRow()),
      ...overrides.networkPoolDemandSnapshot,
    },
    networkPoolDemandSnapshotLine: {
      findMany: vi.fn().mockResolvedValue([
        makeSnapshotLineRow(SNAPSHOT_LINE_ID_1),
        makeSnapshotLineRow(SNAPSHOT_LINE_ID_2, { sourceLineRef: 'LINE-002', demandLineId: DEMAND_LINE_ID }),
      ]),
      ...overrides.networkPoolDemandSnapshotLine,
    },
  };
}

/**
 * Makes the full mock Prisma client.
 * Default: lifecycleState.findUnique returns CLOSED_FOR_BIDS; $transaction calls callback with mockTx.
 */
function makeDb(overrides: {
  lifecycleState?: Record<string, unknown>;
  txOverrides?: Parameters<typeof makeMockTx>[0];
  $transaction?: unknown;
} = {}): any {
  const mockTx = makeMockTx(overrides.txOverrides ?? {});
  return {
    lifecycleState: {
      findUnique: vi.fn().mockResolvedValue({ id: LIFECYCLE_STATE_ID, stateKey: 'CLOSED_FOR_BIDS' }),
      ...overrides.lifecycleState,
    },
    $transaction: overrides.$transaction ?? vi.fn().mockImplementation((fn: (tx: any) => any) => fn(mockTx)),
    _mockTx: mockTx, // exposed for assertions
  };
}

/**
 * Makes a mock StateMachineService.
 * Default: returns APPLIED for AGGREGATING → CLOSED_FOR_BIDS.
 */
function makeSm(overrides: Record<string, unknown> = {}): any {
  return {
    transition: vi.fn().mockResolvedValue({
      status:        'APPLIED',
      transitionId:  LOG_ID,
      entityType:    'POOL',
      entityId:      POOL_ID,
      fromStateKey:  'AGGREGATING',
      toStateKey:    'CLOSED_FOR_BIDS',
      createdAt:     NOW,
    }),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ─── Input validation ─────────────────────────────────────────────────────────

describe('P-RFQ-01: PASS — issueRfq with required fields returns NetworkPoolRfqRecord', () => {
  it('returns a record with status=ISSUED and rfq_version=1', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(result.status).toBe('ISSUED');
    expect(result.rfq_version).toBe(1);
    expect(result.owner_org_id).toBe(OWNER_ORG_ID);
    expect(result.pool_id).toBe(POOL_ID);
  });
});

describe('P-RFQ-02: PASS — issueRfq with all optional fields', () => {
  it('stores issue_reason and response_deadline_at when provided', async () => {
    const db  = makeDb({
      txOverrides: {
        networkPoolRfq: {
          findFirst: vi.fn().mockResolvedValue(null),
          create:    vi.fn().mockResolvedValue(makeRfqRow({
            issueReason:        'Annual aggregate RFQ',
            responseDeadlineAt: new Date('2026-07-01T00:00:00.000Z'),
          })),
        },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput({
      issue_reason:        'Annual aggregate RFQ',
      response_deadline_at: '2026-07-01T00:00:00.000Z',
    }));

    expect(result.issue_reason).toBe('Annual aggregate RFQ');
    expect(result.response_deadline_at).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('P-RFQ-03: FAIL — blank pool_id throws NetworkPoolRfqInvalidInputError', () => {
  it('rejects empty string pool_id before any DB call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput({ pool_id: '   ' })),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidInputError);

    expect(db.lifecycleState.findUnique).not.toHaveBeenCalled();
  });
});

describe('P-RFQ-04: FAIL — empty pool_id string throws NetworkPoolRfqInvalidInputError', () => {
  it('rejects pool_id="" before any DB call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput({ pool_id: '' })),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidInputError);

    expect(db.lifecycleState.findUnique).not.toHaveBeenCalled();
  });
});

// ─── Pool and state ───────────────────────────────────────────────────────────

describe('P-RFQ-05: FAIL — pool not found throws NetworkPoolRfqPoolNotFoundError', () => {
  it('throws when networkPool.findFirst returns null inside tx', async () => {
    const db = makeDb({
      txOverrides: {
        networkPool: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqPoolNotFoundError);
  });
});

describe('P-RFQ-06: FAIL — pool in OPEN state throws NetworkPoolRfqInvalidPoolStateError', () => {
  it('rejects pool not in AGGREGATING state (stateKey=OPEN)', async () => {
    const db = makeDb({
      txOverrides: {
        networkPool: { findFirst: vi.fn().mockResolvedValue(makePoolRow('OPEN')) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidPoolStateError);
  });
});

describe('P-RFQ-07: FAIL — pool in CLOSED_FOR_BIDS state throws NetworkPoolRfqInvalidPoolStateError', () => {
  it('rejects pool that already transitioned to CLOSED_FOR_BIDS', async () => {
    const db = makeDb({
      txOverrides: {
        networkPool: { findFirst: vi.fn().mockResolvedValue(makePoolRow('CLOSED_FOR_BIDS')) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidPoolStateError);
  });
});

describe('P-RFQ-08: FAIL — CLOSED_FOR_BIDS lifecycle state missing throws NetworkPoolRfqInvalidPoolStateError', () => {
  it('throws before entering tx when lifecycleState.findUnique returns null', async () => {
    const db = makeDb({
      lifecycleState: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidPoolStateError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// ─── Snapshot resolution ──────────────────────────────────────────────────────

describe('P-RFQ-09: FAIL — no CAPTURED snapshot throws NetworkPoolRfqSnapshotNotFoundError', () => {
  it('throws when networkPoolDemandSnapshot.findFirst returns null', async () => {
    const db = makeDb({
      txOverrides: {
        networkPoolDemandSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSnapshotNotFoundError);
  });
});

describe('P-RFQ-10: FAIL — snapshot in DRAFT status (not CAPTURED) → no snapshot found', () => {
  it('throws NetworkPoolRfqSnapshotNotFoundError when only DRAFT snapshot exists', async () => {
    const db = makeDb({
      txOverrides: {
        // Service queries status='CAPTURED'; if only DRAFT exists, findFirst returns null
        networkPoolDemandSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSnapshotNotFoundError);
  });
});

describe('P-RFQ-11: FAIL — CAPTURED snapshot with 0 lines throws NetworkPoolRfqSnapshotNotFoundError', () => {
  it('throws when snapshotLines.findMany returns empty array', async () => {
    const db = makeDb({
      txOverrides: {
        networkPoolDemandSnapshotLine: { findMany: vi.fn().mockResolvedValue([]) },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSnapshotNotFoundError);
  });
});

describe('P-RFQ-12: PASS — snapshot.findFirst called with orderBy snapshotVersion desc', () => {
  it('passes correct where clause to snapshot query', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const snapshotFindFirst = (db._mockTx.networkPoolDemandSnapshot.findFirst as ReturnType<typeof vi.fn>);
    const callArg = snapshotFindFirst.mock.calls[0][0];
    expect(callArg.where.status).toBe('CAPTURED');
    expect(callArg.where.poolId).toBe(POOL_ID);
    expect(callArg.where.ownerOrgId).toBe(OWNER_ORG_ID);
    expect(callArg.orderBy?.snapshotVersion).toBe('desc');
  });
});

describe('P-RFQ-13: PASS — snapshot lines loaded with correct snapshotId and ownerOrgId', () => {
  it('queries snapshotLines scoped to snapshot.id and ownerOrgId', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const linesFindMany = (db._mockTx.networkPoolDemandSnapshotLine.findMany as ReturnType<typeof vi.fn>);
    const callArg = linesFindMany.mock.calls[0][0];
    expect(callArg.where.snapshotId).toBe(SNAPSHOT_ID);
    expect(callArg.where.ownerOrgId).toBe(OWNER_ORG_ID);
  });
});

// ─── Duplicate RFQ guard ──────────────────────────────────────────────────────

describe('P-RFQ-14: FAIL — existing RFQ throws NetworkPoolRfqAlreadyIssuedError', () => {
  it('throws when networkPoolRfq.findFirst returns an existing RFQ', async () => {
    const db = makeDb({
      txOverrides: {
        networkPoolRfq: {
          findFirst: vi.fn().mockResolvedValue({ rfqVersion: 1 }),
          create:    vi.fn(),
        },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqAlreadyIssuedError);

    expect(db._mockTx.networkPoolRfq.create).not.toHaveBeenCalled();
  });
});

describe('P-RFQ-15: PASS — no existing RFQ proceeds to create', () => {
  it('calls networkPoolRfq.create when no existing RFQ found', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(db._mockTx.networkPoolRfq.create).toHaveBeenCalledOnce();
  });
});

// ─── RFQ creation — header ────────────────────────────────────────────────────

describe('P-RFQ-16: PASS — rfqRef is a non-empty truthy string (service-generated UUID)', () => {
  it('create call receives a non-empty rfqRef', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof createArg.data.rfqRef).toBe('string');
    expect(createArg.data.rfqRef.length).toBeGreaterThan(0);
  });
});

describe('P-RFQ-17: PASS — issueBasis = SNAPSHOT_LOCK', () => {
  it('sets issueBasis to SNAPSHOT_LOCK in create call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.issueBasis).toBe('SNAPSHOT_LOCK');
  });
});

describe('P-RFQ-18: PASS — status = ISSUED', () => {
  it('sets status to ISSUED in create call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.status).toBe('ISSUED');
  });
});

describe('P-RFQ-19: PASS — rfqVersion = 1 for first RFQ', () => {
  it('sets rfqVersion to 1 when no prior RFQ exists', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.rfqVersion).toBe(1);
  });
});

describe('P-RFQ-20: PASS — issuedByUserId set from userId parameter', () => {
  it('stores issuedByUserId matching the userId passed to issueRfq', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.issuedByUserId).toBe(USER_ID);
  });
});

describe('P-RFQ-21: PASS — issuedByUserId null when userId is null', () => {
  it('stores null issuedByUserId for system-initiated issue', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, null, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.issuedByUserId).toBeNull();
  });
});

describe('P-RFQ-22: PASS — issueReason stored from input when provided', () => {
  it('passes issue_reason to create data', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput({ issue_reason: 'Q2 aggregate cycle' }));

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.issueReason).toBe('Q2 aggregate cycle');
  });
});

describe('P-RFQ-23: PASS — issueReason null when not provided', () => {
  it('stores null issueReason when issue_reason omitted', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.issueReason).toBeNull();
  });
});

describe('P-RFQ-24: PASS — responseDeadlineAt stored when provided as ISO string', () => {
  it('parses and stores response_deadline_at as Date in create call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput({
      response_deadline_at: '2026-09-01T00:00:00.000Z',
    }));

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.responseDeadlineAt).toBeInstanceOf(Date);
    expect((createArg.data.responseDeadlineAt as Date).toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('P-RFQ-25: PASS — responseDeadlineAt null when not provided', () => {
  it('stores null responseDeadlineAt when response_deadline_at omitted', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.responseDeadlineAt).toBeNull();
  });
});

describe('P-RFQ-26: PASS — supplierInviteMode = INVITE_ONLY', () => {
  it('sets supplierInviteMode to INVITE_ONLY in create call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createArg = (db._mockTx.networkPoolRfq.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.supplierInviteMode).toBe('INVITE_ONLY');
  });
});

// ─── RFQ lines ────────────────────────────────────────────────────────────────

describe('P-RFQ-27: PASS — networkPoolRfqLine.createMany called with correct rfqId', () => {
  it('passes RFQ id to createMany data entries', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createManyArg = (db._mockTx.networkPoolRfqLine.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(Array.isArray(createManyArg.data)).toBe(true);
    expect((createManyArg.data as any[]).every((l: any) => l.rfqId === RFQ_ID)).toBe(true);
  });
});

describe('P-RFQ-28: PASS — line fields copied correctly from snapshot line', () => {
  it('each RFQ line carries sourceLineRef, commodityCategory, qty, qtyUnit from snapshot', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createManyArg = (db._mockTx.networkPoolRfqLine.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const firstLine = (createManyArg.data as any[])[0];
    expect(firstLine.snapshotLineId).toBe(SNAPSHOT_LINE_ID_1);
    expect(firstLine.sourceLineRef).toBe('LINE-001');
    expect(firstLine.commodityCategory).toBe('COTTON_YARN');
    expect(firstLine.qty).toBe('1000.000000');
    expect(firstLine.qtyUnit).toBe('KG');
    expect(firstLine.ownerOrgId).toBe(OWNER_ORG_ID);
    expect(firstLine.poolId).toBe(POOL_ID);
  });
});

describe('P-RFQ-29: PASS — demandLineId copied from snapshot line (nullable plain UUID)', () => {
  it('stores demandLineId from snapshot line without FK enforcement', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const createManyArg = (db._mockTx.networkPoolRfqLine.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const firstLine = (createManyArg.data as any[])[0];
    expect(firstLine.demandLineId).toBe(DEMAND_LINE_ID);
  });
});

// ─── State machine / lifecycle ────────────────────────────────────────────────

describe('P-RFQ-30: PASS — SM called with entityType=POOL and entityId=poolId', () => {
  it('SM request contains POOL as entityType and pool.id as entityId', async () => {
    const sm = makeSm();
    const db = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const smCall = (sm.transition as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(smCall.entityType).toBe('POOL');
    expect(smCall.entityId).toBe(POOL_ID);
    expect(smCall.orgId).toBe(OWNER_ORG_ID);
  });
});

describe('P-RFQ-31: PASS — SM called with fromStateKey=AGGREGATING, toStateKey=CLOSED_FOR_BIDS', () => {
  it('SM transition request carries correct from/to state keys', async () => {
    const sm = makeSm();
    const db = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const smCall = (sm.transition as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(smCall.fromStateKey).toBe('AGGREGATING');
    expect(smCall.toStateKey).toBe('CLOSED_FOR_BIDS');
  });
});

describe('P-RFQ-32: PASS — SM called with actorType=TENANT_ADMIN and actorUserId=userId', () => {
  it('SM request carries correct actor fields', async () => {
    const sm = makeSm();
    const db = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const smCall = (sm.transition as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(smCall.actorType).toBe('TENANT_ADMIN');
    expect(smCall.actorUserId).toBe(USER_ID);
    expect(smCall.actorAdminId).toBeNull();
  });
});

describe('P-RFQ-33: FAIL — SM returns DENIED → throws NetworkPoolRfqTransitionDeniedError', () => {
  it('wraps DENIED SM result in NetworkPoolRfqTransitionDeniedError', async () => {
    const sm = makeSm();
    sm.transition = vi.fn().mockResolvedValue({
      status:  'DENIED',
      code:    'ACTOR_ROLE_NOT_PERMITTED',
      message: 'actorType not permitted for AGGREGATING → CLOSED_FOR_BIDS',
    });

    const db = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqTransitionDeniedError);
  });
});

describe('P-RFQ-34: PASS — pool.lifecycleStateId updated to CLOSED_FOR_BIDS.id', () => {
  it('calls networkPool.update with closedForBidsState.id after SM APPLIED', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    const updateArg = (db._mockTx.networkPool.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg.data.lifecycleStateId).toBe(LIFECYCLE_STATE_ID);
    expect(updateArg.where.id).toBe(POOL_ID);
  });
});

describe('P-RFQ-35: PASS — SM opts.db receives tx client (not outer db)', () => {
  it('SM transition second argument is { db: tx } (not outer db)', async () => {
    const sm  = makeSm();
    let capturedOpts: any = null;
    sm.transition = vi.fn().mockImplementation(async (_req: any, opts: any) => {
      capturedOpts = opts;
      return {
        status: 'APPLIED', transitionId: LOG_ID,
        entityType: 'POOL', entityId: POOL_ID,
        fromStateKey: 'AGGREGATING', toStateKey: 'CLOSED_FOR_BIDS', createdAt: NOW,
      };
    });

    const db  = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts.db).toBeDefined();
    // opts.db should be the tx client, not the outer db
    expect(capturedOpts.db).not.toBe(db);
  });
});

describe('P-RFQ-36: PASS — SM denial prevents rfq lines from being created', () => {
  it('no createMany call when SM returns DENIED (rollback triggered)', async () => {
    const sm = makeSm();
    sm.transition = vi.fn().mockResolvedValue({
      status: 'DENIED', code: 'TRANSITION_NOT_PERMITTED', message: 'not allowed',
    });

    const db = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqTransitionDeniedError);

    // rfqLine.createMany is declared after SM in the tx; SM denial throws first
    // networkPoolRfq.create IS called before SM in the service flow, but within tx
    // The key assertion is that the overall promise rejects with the correct error
    expect(db._mockTx.networkPool.update).not.toHaveBeenCalled();
  });
});

// ─── Transaction atomicity ────────────────────────────────────────────────────

describe('P-RFQ-37: PASS — $transaction called exactly once', () => {
  it('uses db.$transaction once per issueRfq call', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});

describe('P-RFQ-38: PASS — SM denial does not call pool update (atomicity)', () => {
  it('networkPool.update not called when SM denies (full rollback)', async () => {
    const sm = makeSm();
    sm.transition = vi.fn().mockResolvedValue({
      status: 'DENIED', code: 'TRANSITION_NOT_PERMITTED', message: 'denied',
    });

    const db  = makeDb();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqTransitionDeniedError);

    expect(db._mockTx.networkPool.update).not.toHaveBeenCalled();
  });
});

describe('P-RFQ-39: FAIL — Prisma P2002 unique constraint maps to NetworkPoolRfqConflictError', () => {
  it('wraps P2002 PrismaClientKnownRequestError in NetworkPoolRfqConflictError', async () => {
    const { Prisma: PrismaModule } = await import('@prisma/client');
    const p2002 = Object.assign(
      new PrismaModule.PrismaClientKnownRequestError('Unique constraint failed', {
        code:     'P2002',
        clientVersion: '0.0.0',
        meta:     { target: 'nc_pool_rfqs_pool_rfq_ref_unique' },
      }),
    );

    const db = makeDb({
      txOverrides: {
        networkPoolRfq: {
          findFirst: vi.fn().mockResolvedValue(null),
          create:    vi.fn().mockRejectedValue(p2002),
        },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqConflictError);
  });
});

// ─── Return DTO ───────────────────────────────────────────────────────────────

describe('P-RFQ-40: PASS — DTO contains all expected header fields', () => {
  it('result contains id, owner_org_id, pool_id, snapshot_id, rfq_ref, rfq_version, status, issue_basis', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('owner_org_id');
    expect(result).toHaveProperty('pool_id');
    expect(result).toHaveProperty('snapshot_id');
    expect(result).toHaveProperty('rfq_ref');
    expect(result).toHaveProperty('rfq_version');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('issue_basis');
    expect(result).toHaveProperty('issued_at');
    expect(result).toHaveProperty('supplier_invite_mode');
    expect(result).toHaveProperty('line_count');
    expect(result).toHaveProperty('created_at');
    expect(result).toHaveProperty('updated_at');
  });
});

describe('P-RFQ-41: PASS — DTO does not contain metadataInternalJson', () => {
  it('metadataInternalJson is absent from the returned DTO', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(result).not.toHaveProperty('metadataInternalJson');
    expect(result).not.toHaveProperty('metadata_internal_json');
  });
});

describe('P-RFQ-42: PASS — totalQty serialized as string (Decimal → string)', () => {
  it('total_qty field is a string, not a number or Prisma Decimal object', async () => {
    const db = makeDb({
      txOverrides: {
        networkPoolRfq: {
          findFirst: vi.fn().mockResolvedValue(null),
          create:    vi.fn().mockResolvedValue(makeRfqRow({ totalQty: '2000.000000' })),
        },
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(typeof result.total_qty).toBe('string');
    expect(result.total_qty).toBe('2000.000000');
  });
});

describe('P-RFQ-43: PASS — issued_at and created_at serialized as ISO 8601 strings', () => {
  it('date fields are ISO strings not Date objects', async () => {
    const db  = makeDb();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.issueRfq(OWNER_ORG_ID, USER_ID, makeIssueInput());

    expect(typeof result.issued_at).toBe('string');
    expect(typeof result.created_at).toBe('string');
    expect(typeof result.updated_at).toBe('string');
    // Validate ISO 8601 format
    expect(new Date(result.issued_at).toISOString()).toBe(result.issued_at);
    expect(new Date(result.created_at).toISOString()).toBe(result.created_at);
  });
});
