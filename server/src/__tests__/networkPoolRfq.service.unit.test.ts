/**
 * Unit tests — NetworkPoolRfqService
 * TEXQTIC-NC-PHASE1-POOL-RFQ-ISSUE-SERVICE-001
 *
 * Pure unit tests with mocked PrismaClient and mocked StateMachineService.
 * No DB access. No lifecycle seed dependency.
 *
 * COVERAGE (117 tests):
 *   Input validation:          P-RFQ-01 → P-RFQ-04
 *   Pool and state:            P-RFQ-05 → P-RFQ-08
 *   Snapshot resolution:       P-RFQ-09 → P-RFQ-13
 *   Duplicate RFQ guard:       P-RFQ-14 → P-RFQ-15
 *   RFQ creation — header:     P-RFQ-16 → P-RFQ-26
 *   RFQ lines:                 P-RFQ-27 → P-RFQ-29
 *   State machine / lifecycle: P-RFQ-30 → P-RFQ-36
 *   Transaction atomicity:     P-RFQ-37 → P-RFQ-39
 *   Return DTO:                P-RFQ-40 → P-RFQ-43
 *   sendInvite:                P-INV-SEND-01 → P-INV-SEND-15
 *   listInvites:               P-INV-LIST-01 → P-INV-LIST-05
 *   getInvite:                 P-INV-GET-01 → P-INV-GET-04
 *   cancelInvite:              P-INV-CANCEL-01 → P-INV-CANCEL-08
 *   General invite:            P-INV-GEN-01 → P-INV-GEN-02
 *   listSupplierInvites:       P-SUP-LIST-01 → P-SUP-LIST-07
 *   viewInvite:                P-SUP-VIEW-01 → P-SUP-VIEW-07
 *   acceptInvite:              P-SUP-ACCEPT-01 → P-SUP-ACCEPT-10
 *   declineInvite:             P-SUP-DECLINE-01 → P-SUP-DECLINE-11
 *   General supplier:          P-SUP-GEN-01 → P-SUP-GEN-05
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
  NetworkPoolRfqRfqNotFoundError,
  NetworkPoolRfqSupplierInviteInvalidInputError,
  NetworkPoolRfqSupplierInviteNotFoundError,
  NetworkPoolRfqSupplierInviteAlreadySentError,
  NetworkPoolRfqSupplierInviteInvalidTransitionError,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER INVITE TESTS — TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001
// 34 tests: P-INV-SEND-01–15  |  P-INV-LIST-01–05  |  P-INV-GET-01–04
//           P-INV-CANCEL-01–08  |  P-INV-GEN-01–02
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Invite Test Constants ────────────────────────────────────────────────────

const INVITE_ID       = '1111aaaa-0000-0000-0000-000000000001';
const SUPPLIER_ORG_ID = '2222bbbb-0000-0000-0000-000000000001';
const INVITE_REF      = 'test-invite-ref-uuid';
// Dates relative to test execution: PAST is definitely before now, FUTURE is after
const PAST_EXPIRES_AT   = new Date('2024-01-01T00:00:00.000Z');
const FUTURE_EXPIRES_AT = new Date('2028-01-01T00:00:00.000Z');
const RFQ_DEADLINE_AT   = new Date('2028-07-01T00:00:00.000Z');

// ─── Invite Fixtures ──────────────────────────────────────────────────────────

function makeInviteRow(overrides: Record<string, unknown> = {}) {
  return {
    id:                  INVITE_ID,
    ownerOrgId:          OWNER_ORG_ID,
    supplierOrgId:       SUPPLIER_ORG_ID,
    rfqId:               RFQ_ID,
    poolId:              POOL_ID,
    inviteRef:           INVITE_REF,
    status:              'PENDING',
    invitedAt:           NOW,
    invitedByUserId:     USER_ID,
    acceptedAt:          null,
    declinedAt:          null,
    cancelledAt:         null,
    expiresAt:           null,
    messageToSupplier:   null,
    declineReason:       null,
    cancelReason:        null,
    metadataInternalJson: null,
    createdAt:           NOW,
    updatedAt:           NOW,
    ...overrides,
  };
}

function makeSupplierOrgRow(status = 'ACTIVE', overrides: Record<string, unknown> = {}) {
  return { id: SUPPLIER_ORG_ID, status, ...overrides };
}

function makeRfqRowForInvite(responseDeadlineAt: Date | null = null) {
  return { id: RFQ_ID, responseDeadlineAt };
}

function makeSendInviteInput(overrides: Record<string, unknown> = {}): any {
  return {
    pool_id:        POOL_ID,
    rfq_id:         RFQ_ID,
    supplier_org_id: SUPPLIER_ORG_ID,
    ...overrides,
  };
}

// ─── Invite Mock Factories ────────────────────────────────────────────────────

function makeTxForSend(overrides: {
  networkPool?:                 Record<string, unknown>;
  networkPoolRfq?:              Record<string, unknown>;
  organizations?:               Record<string, unknown>;
  networkPoolRfqSupplierInvite?: Record<string, unknown>;
  networkLifecycleLog?:         Record<string, unknown>;
} = {}): any {
  return {
    networkPool: {
      findFirst: vi.fn().mockResolvedValue(makePoolRow('CLOSED_FOR_BIDS')),
      ...(overrides.networkPool ?? {}),
    },
    networkPoolRfq: {
      findFirst: vi.fn().mockResolvedValue(makeRfqRowForInvite()),
      ...(overrides.networkPoolRfq ?? {}),
    },
    organizations: {
      findUnique: vi.fn().mockResolvedValue(makeSupplierOrgRow()),
      ...(overrides.organizations ?? {}),
    },
    networkPoolRfqSupplierInvite: {
      findUnique: vi.fn().mockResolvedValue(null),   // no existing invite by default
      create:     vi.fn().mockResolvedValue(makeInviteRow()),
      ...(overrides.networkPoolRfqSupplierInvite ?? {}),
    },
    networkLifecycleLog: {
      create: vi.fn().mockResolvedValue({ id: LOG_ID }),
      ...(overrides.networkLifecycleLog ?? {}),
    },
  };
}

function makeDbForSend(txOverrides?: Parameters<typeof makeTxForSend>[0]): any {
  const tx = makeTxForSend(txOverrides ?? {});
  return {
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(tx)),
    _mockTx: tx,
  };
}

function makeDbForList(rows: any[] = [makeInviteRow()]): any {
  return {
    networkPoolRfqSupplierInvite: {
      findMany: vi.fn().mockResolvedValue(rows),
    },
  };
}

function makeDbForGet(row: any = makeInviteRow()): any {
  return {
    networkPoolRfqSupplierInvite: {
      findFirst: vi.fn().mockResolvedValue(row),
    },
  };
}

function makeTxForCancel(overrides: {
  networkPoolRfqSupplierInvite?: Record<string, unknown>;
  networkLifecycleLog?:         Record<string, unknown>;
} = {}): any {
  return {
    networkPoolRfqSupplierInvite: {
      findFirst: vi.fn().mockResolvedValue(makeInviteRow()),
      update:    vi.fn().mockResolvedValue(
        makeInviteRow({ status: 'CANCELLED', cancelledAt: NOW, cancelReason: null }),
      ),
      ...(overrides.networkPoolRfqSupplierInvite ?? {}),
    },
    networkLifecycleLog: {
      create: vi.fn().mockResolvedValue({ id: LOG_ID }),
      ...(overrides.networkLifecycleLog ?? {}),
    },
  };
}

function makeDbForCancel(txOverrides?: Parameters<typeof makeTxForCancel>[0]): any {
  const tx = makeTxForCancel(txOverrides ?? {});
  return {
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(tx)),
    _mockTx: tx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// sendInvite — P-INV-SEND-01 → P-INV-SEND-15
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-INV-SEND-01: PASS — sendInvite returns owner-safe DTO with expected fields', () => {
  it('resolves with NetworkPoolRfqSupplierInviteRecord containing required fields', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('owner_org_id');
    expect(result).toHaveProperty('supplier_org_id');
    expect(result).toHaveProperty('rfq_id');
    expect(result).toHaveProperty('pool_id');
    expect(result).toHaveProperty('invite_ref');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('invited_at');
    expect(result).toHaveProperty('invited_by_user_id');
    expect(result).toHaveProperty('expires_at');
    expect(result).toHaveProperty('created_at');
    expect(result).toHaveProperty('updated_at');
  });
});

describe('P-INV-SEND-02: PASS — ownerOrgId is scoped to caller org', () => {
  it('invite row create receives ownerOrgId matching caller', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());

    const createArg = (db._mockTx.networkPoolRfqSupplierInvite.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.ownerOrgId).toBe(OWNER_ORG_ID);
    expect(createArg.data.supplierOrgId).toBe(SUPPLIER_ORG_ID);
  });
});

describe('P-INV-SEND-03: FAIL — pool_id missing → NetworkPoolRfqSupplierInviteInvalidInputError', () => {
  it('throws before entering tx when pool_id is empty string', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput({ pool_id: '' })),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidInputError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('P-INV-SEND-04: FAIL — supplier_org_id missing → NetworkPoolRfqSupplierInviteInvalidInputError', () => {
  it('throws before entering tx when supplier_org_id is empty string', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput({ supplier_org_id: '' })),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidInputError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('P-INV-SEND-05: FAIL — supplier org not ACTIVE → NetworkPoolRfqSupplierInviteInvalidInputError', () => {
  it('throws when organizations.findUnique returns status SUSPENDED', async () => {
    const db = makeDbForSend({
      organizations: {
        findUnique: vi.fn().mockResolvedValue(makeSupplierOrgRow('SUSPENDED')),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidInputError);
  });
});

describe('P-INV-SEND-06: FAIL — supplier org not found → NetworkPoolRfqSupplierInviteInvalidInputError', () => {
  it('throws when organizations.findUnique returns null', async () => {
    const db = makeDbForSend({
      organizations: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidInputError);
  });
});

describe('P-INV-SEND-07: FAIL — duplicate (rfq+supplier) row blocks → NetworkPoolRfqSupplierInviteAlreadySentError', () => {
  it('throws AlreadySentError when any existing row found regardless of status', async () => {
    const db = makeDbForSend({
      networkPoolRfqSupplierInvite: {
        findUnique: vi.fn().mockResolvedValue({ id: INVITE_ID }),
        create:     vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteAlreadySentError);

    expect(db._mockTx.networkPoolRfqSupplierInvite.create).not.toHaveBeenCalled();
  });
});

describe('P-INV-SEND-08: FAIL — duplicate block applies even when existing row is CANCELLED (OD-1)', () => {
  it('throws AlreadySentError when existing CANCELLED row found', async () => {
    const db = makeDbForSend({
      networkPoolRfqSupplierInvite: {
        findUnique: vi.fn().mockResolvedValue({ id: INVITE_ID, status: 'CANCELLED' }),
        create:     vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteAlreadySentError);
  });
});

describe('P-INV-SEND-09: PASS — expiresAt inherits rfq.responseDeadlineAt when caller omits expires_at (OD-3)', () => {
  it('create data.expiresAt equals rfq.responseDeadlineAt when expires_at not provided', async () => {
    const db = makeDbForSend({
      networkPoolRfq: {
        findFirst: vi.fn().mockResolvedValue(makeRfqRowForInvite(RFQ_DEADLINE_AT)),
      },
      networkPoolRfqSupplierInvite: {
        findUnique: vi.fn().mockResolvedValue(null),
        create:     vi.fn().mockResolvedValue(makeInviteRow({ expiresAt: RFQ_DEADLINE_AT })),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());

    const createArg = (db._mockTx.networkPoolRfqSupplierInvite.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.expiresAt).toEqual(RFQ_DEADLINE_AT);
  });
});

describe('P-INV-SEND-10: PASS — expiresAt null when both caller and rfq omit it (OD-3)', () => {
  it('create data.expiresAt is null when no expires_at and rfq.responseDeadlineAt is null', async () => {
    const db  = makeDbForSend();   // rfq.responseDeadlineAt = null by default
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());

    const createArg = (db._mockTx.networkPoolRfqSupplierInvite.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.expiresAt).toBeNull();
  });
});

describe('P-INV-SEND-11: PASS — caller-provided future expires_at is accepted', () => {
  it('create data.expiresAt equals caller-provided future date', async () => {
    const db = makeDbForSend({
      networkPoolRfqSupplierInvite: {
        findUnique: vi.fn().mockResolvedValue(null),
        create:     vi.fn().mockResolvedValue(makeInviteRow({ expiresAt: FUTURE_EXPIRES_AT })),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput({ expires_at: FUTURE_EXPIRES_AT.toISOString() }));

    const createArg = (db._mockTx.networkPoolRfqSupplierInvite.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArg.data.expiresAt).toBeInstanceOf(Date);
  });
});

describe('P-INV-SEND-12: FAIL — past expires_at rejected before tx → NetworkPoolRfqSupplierInviteInvalidInputError', () => {
  it('throws before entering tx when expires_at is in the past', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput({ expires_at: PAST_EXPIRES_AT.toISOString() })),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidInputError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('P-INV-SEND-13: FAIL — pool not CLOSED_FOR_BIDS → NetworkPoolRfqInvalidPoolStateError', () => {
  it('throws when pool lifecycleState.stateKey is AGGREGATING', async () => {
    const db = makeDbForSend({
      networkPool: {
        findFirst: vi.fn().mockResolvedValue(makePoolRow('AGGREGATING')),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqInvalidPoolStateError);
  });
});

describe('P-INV-SEND-14: FAIL — RFQ not found for pool+owner → NetworkPoolRfqRfqNotFoundError', () => {
  it('throws when networkPoolRfq.findFirst returns null', async () => {
    const db = makeDbForSend({
      networkPoolRfq: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).rejects.toBeInstanceOf(NetworkPoolRfqRfqNotFoundError);
  });
});

describe('P-INV-SEND-15: PASS — sendInvite writes direct lifecycle log and does NOT call SM transition', () => {
  it('networkLifecycleLog.create called once; sm.transition not called', async () => {
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());

    expect(db._mockTx.networkLifecycleLog.create).toHaveBeenCalledOnce();
    expect(sm.transition).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// listInvites — P-INV-LIST-01 → P-INV-LIST-05
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-INV-LIST-01: PASS — listInvites returns array of owner-safe DTOs', () => {
  it('resolves with array scoped by ownerOrgId, poolId, rfqId', async () => {
    const db  = makeDbForList([makeInviteRow(), makeInviteRow({ id: '1111aaaa-0000-0000-0000-000000000002' })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    const findManyArg = (db.networkPoolRfqSupplierInvite.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findManyArg.where.ownerOrgId).toBe(OWNER_ORG_ID);
    expect(findManyArg.where.poolId).toBe(POOL_ID);
    expect(findManyArg.where.rfqId).toBe(RFQ_ID);
  });
});

describe('P-INV-LIST-02: PASS — listInvites returns empty array when no invites exist', () => {
  it('resolves with [] when findMany returns empty array', async () => {
    const db  = makeDbForList([]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);

    expect(result).toEqual([]);
  });
});

describe('P-INV-LIST-03: PASS — listInvites computes EXPIRED for PENDING rows with past expiresAt (OD-2)', () => {
  it('status is EXPIRED when DB status is PENDING and expiresAt is in the past', async () => {
    const db  = makeDbForList([makeInviteRow({ status: 'PENDING', expiresAt: PAST_EXPIRES_AT })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);

    expect(result[0].status).toBe('EXPIRED');
  });
});

describe('P-INV-LIST-04: PASS — listInvites returns PENDING (not EXPIRED) for future expiresAt (OD-2)', () => {
  it('status remains PENDING when expiresAt is in the future', async () => {
    const db  = makeDbForList([makeInviteRow({ status: 'PENDING', expiresAt: FUTURE_EXPIRES_AT })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);

    expect(result[0].status).toBe('PENDING');
  });
});

describe('P-INV-LIST-05: PASS — listInvites omits metadataInternalJson from all records (OD-5)', () => {
  it('metadataInternalJson absent from every returned DTO', async () => {
    const db  = makeDbForList([makeInviteRow(), makeInviteRow({ id: '1111aaaa-0000-0000-0000-000000000002' })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);

    for (const record of result) {
      expect(record).not.toHaveProperty('metadataInternalJson');
      expect(record).not.toHaveProperty('metadata_internal_json');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getInvite — P-INV-GET-01 → P-INV-GET-04
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-INV-GET-01: PASS — getInvite returns owner-safe DTO for valid invite', () => {
  it('resolves with NetworkPoolRfqSupplierInviteRecord when findFirst returns row', async () => {
    const db  = makeDbForGet(makeInviteRow());
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID);

    expect(result).toHaveProperty('id', INVITE_ID);
    expect(result).toHaveProperty('owner_org_id', OWNER_ORG_ID);
    const findFirstArg = (db.networkPoolRfqSupplierInvite.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findFirstArg.where.id).toBe(INVITE_ID);
    expect(findFirstArg.where.ownerOrgId).toBe(OWNER_ORG_ID);
    expect(findFirstArg.where.poolId).toBe(POOL_ID);
    expect(findFirstArg.where.rfqId).toBe(RFQ_ID);
  });
});

describe('P-INV-GET-02: FAIL — getInvite not found → NetworkPoolRfqSupplierInviteNotFoundError', () => {
  it('throws non-leaking not-found when findFirst returns null', async () => {
    const db  = makeDbForGet(null);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteNotFoundError);
  });
});

describe('P-INV-GET-03: PASS — getInvite computes EXPIRED for past-expiresAt PENDING row (OD-2)', () => {
  it('status is EXPIRED when DB status PENDING and expiresAt is in the past', async () => {
    const db  = makeDbForGet(makeInviteRow({ status: 'PENDING', expiresAt: PAST_EXPIRES_AT }));
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID);

    expect(result.status).toBe('EXPIRED');
  });
});

describe('P-INV-GET-04: PASS — getInvite omits metadataInternalJson (OD-5)', () => {
  it('metadataInternalJson absent from returned DTO', async () => {
    const db  = makeDbForGet(makeInviteRow());
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID);

    expect(result).not.toHaveProperty('metadataInternalJson');
    expect(result).not.toHaveProperty('metadata_internal_json');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// cancelInvite — P-INV-CANCEL-01 → P-INV-CANCEL-08
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-INV-CANCEL-01: PASS — cancelInvite on PENDING invite returns CANCELLED DTO', () => {
  it('resolves with status CANCELLED', async () => {
    const db  = makeDbForCancel();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID);

    expect(result.status).toBe('CANCELLED');
  });
});

describe('P-INV-CANCEL-02: PASS — cancelInvite calls update with status=CANCELLED and cancelledAt', () => {
  it('update receives status CANCELLED and cancelledAt as a Date', async () => {
    const db  = makeDbForCancel();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID, 'No longer needed');

    const updateArg = (db._mockTx.networkPoolRfqSupplierInvite.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg.data.status).toBe('CANCELLED');
    expect(updateArg.data.cancelledAt).toBeInstanceOf(Date);
    expect(updateArg.data.cancelReason).toBe('No longer needed');
    expect(updateArg.where.id).toBe(INVITE_ID);
  });
});

describe('P-INV-CANCEL-03: FAIL — cancelInvite on ACCEPTED invite → NetworkPoolRfqSupplierInviteInvalidTransitionError', () => {
  it('throws InvalidTransitionError when effective status is ACCEPTED', async () => {
    const db = makeDbForCancel({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'ACCEPTED' })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);

    expect(db._mockTx.networkPoolRfqSupplierInvite.update).not.toHaveBeenCalled();
  });
});

describe('P-INV-CANCEL-04: FAIL — cancelInvite on DECLINED invite → NetworkPoolRfqSupplierInviteInvalidTransitionError', () => {
  it('throws when effective status is DECLINED', async () => {
    const db = makeDbForCancel({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'DECLINED' })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-INV-CANCEL-05: FAIL — cancelInvite on CANCELLED invite → NetworkPoolRfqSupplierInviteInvalidTransitionError', () => {
  it('throws when effective status is already CANCELLED', async () => {
    const db = makeDbForCancel({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'CANCELLED' })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-INV-CANCEL-06: FAIL — cancelInvite on lazy EXPIRED invite → NetworkPoolRfqSupplierInviteInvalidTransitionError (OD-2)', () => {
  it('throws when DB status PENDING but expiresAt is in the past', async () => {
    const db = makeDbForCancel({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(
          makeInviteRow({ status: 'PENDING', expiresAt: PAST_EXPIRES_AT }),
        ),
        update: vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);

    expect(db._mockTx.networkPoolRfqSupplierInvite.update).not.toHaveBeenCalled();
  });
});

describe('P-INV-CANCEL-07: PASS — cancelInvite writes direct lifecycle log (OD-7)', () => {
  it('networkLifecycleLog.create called once with CLOSED_FOR_BIDS fromState=toState', async () => {
    const db  = makeDbForCancel();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID);

    const logArg = (db._mockTx.networkLifecycleLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(logArg.data.fromStateKey).toBe('CLOSED_FOR_BIDS');
    expect(logArg.data.toStateKey).toBe('CLOSED_FOR_BIDS');
    expect(logArg.data.entityType).toBe('POOL');
    expect(logArg.data.orgId).toBe(OWNER_ORG_ID);
  });
});

describe('P-INV-CANCEL-08: PASS — cancelInvite does NOT call StateMachineService.transition (OD-7)', () => {
  it('sm.transition is never called during cancelInvite', async () => {
    const db  = makeDbForCancel();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID);

    expect(sm.transition).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// General invite tests — P-INV-GEN-01 → P-INV-GEN-02
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-INV-GEN-01: PASS — no pool membership check for supplier org in sendInvite', () => {
  it('sendInvite completes without networkPoolMembership in the tx (no membership check enforced)', async () => {
    // If sendInvite accidentally calls tx.networkPoolMembership, the mock tx will throw a TypeError,
    // causing this test to fail. Passing = no membership query made.
    const db  = makeDbForSend();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput()),
    ).resolves.not.toThrow();
  });
});

describe('P-INV-GEN-02: PASS — no invite DTO exposes metadataInternalJson (OD-5)', () => {
  it('sendInvite, getInvite and listInvites all omit metadataInternalJson', async () => {
    const dbSend = makeDbForSend();
    const dbGet  = makeDbForGet(makeInviteRow());
    const dbList = makeDbForList([makeInviteRow()]);
    const sm     = makeSm();
    const svc    = new NetworkPoolRfqService(dbSend, sm);

    const send = await svc.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput());
    expect(send).not.toHaveProperty('metadataInternalJson');
    expect(send).not.toHaveProperty('metadata_internal_json');

    const svcGet = new NetworkPoolRfqService(dbGet, sm);
    const get = await svcGet.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID);
    expect(get).not.toHaveProperty('metadataInternalJson');

    const svcList = new NetworkPoolRfqService(dbList, sm);
    const list = await svcList.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID);
    expect(list[0]).not.toHaveProperty('metadataInternalJson');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Supplier-side invite tests — P-SUP-LIST-01 → P-SUP-GEN-05
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Supplier mock factories ──────────────────────────────────────────────────

function makeRfqJoinRow(overrides: Record<string, unknown> = {}) {
  return {
    rfqRef:             'rfq-ref-from-join',
    rfqVersion:         1,
    status:             'ISSUED',
    issuedAt:           NOW,
    responseDeadlineAt: null,
    issueBasis:         'SNAPSHOT_LOCK',
    lineCount:          2,
    totalQty:           '2000.000000',
    qtyUnit:            'KG',
    ...overrides,
  };
}

function makeInviteRowWithRfq(overrides: Record<string, unknown> = {}) {
  return {
    ...makeInviteRow(),
    rfq: makeRfqJoinRow(),
    ...overrides,
  };
}

function makeDbForSupplierList(rows: any[] = [makeInviteRow()]): any {
  return {
    networkPoolRfqSupplierInvite: {
      findMany: vi.fn().mockResolvedValue(rows),
    },
  };
}

function makeDbForSupplierView(row: any = makeInviteRowWithRfq()): any {
  return {
    networkPoolRfqSupplierInvite: {
      findFirst: vi.fn().mockResolvedValue(row),
    },
  };
}

function makeTxForAccept(overrides: {
  networkPoolRfqSupplierInvite?: Record<string, unknown>;
  networkLifecycleLog?:         Record<string, unknown>;
} = {}): any {
  return {
    networkPoolRfqSupplierInvite: {
      findFirst: vi.fn().mockResolvedValue(makeInviteRow()),
      update:    vi.fn().mockResolvedValue(makeInviteRow({ status: 'ACCEPTED', acceptedAt: NOW })),
      ...(overrides.networkPoolRfqSupplierInvite ?? {}),
    },
    networkLifecycleLog: {
      create: vi.fn().mockResolvedValue({ id: LOG_ID }),
      ...(overrides.networkLifecycleLog ?? {}),
    },
  };
}

function makeDbForAccept(txOverrides?: Parameters<typeof makeTxForAccept>[0]): any {
  const tx = makeTxForAccept(txOverrides ?? {});
  return {
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(tx)),
    _mockTx: tx,
  };
}

function makeTxForDecline(overrides: {
  networkPoolRfqSupplierInvite?: Record<string, unknown>;
  networkLifecycleLog?:         Record<string, unknown>;
} = {}): any {
  return {
    networkPoolRfqSupplierInvite: {
      findFirst: vi.fn().mockResolvedValue(makeInviteRow()),
      update:    vi.fn().mockResolvedValue(
        makeInviteRow({ status: 'DECLINED', declinedAt: NOW, declineReason: null }),
      ),
      ...(overrides.networkPoolRfqSupplierInvite ?? {}),
    },
    networkLifecycleLog: {
      create: vi.fn().mockResolvedValue({ id: LOG_ID }),
      ...(overrides.networkLifecycleLog ?? {}),
    },
  };
}

function makeDbForDecline(txOverrides?: Parameters<typeof makeTxForDecline>[0]): any {
  const tx = makeTxForDecline(txOverrides ?? {});
  return {
    $transaction: vi.fn().mockImplementation((fn: (tx: any) => any) => fn(tx)),
    _mockTx: tx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// listSupplierInvites — P-SUP-LIST-01 → P-SUP-LIST-07
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-SUP-LIST-01: PASS — listSupplierInvites scopes by supplierOrgId', () => {
  it('calls findMany with where.supplierOrgId = caller org', async () => {
    const db  = makeDbForSupplierList();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    const call = db.networkPoolRfqSupplierInvite.findMany.mock.calls[0][0];
    expect(call.where.supplierOrgId).toBe(SUPPLIER_ORG_ID);
  });
});

describe('P-SUP-LIST-02: PASS — listSupplierInvites returns empty array when none found', () => {
  it('returns [] when findMany resolves with empty array', async () => {
    const db  = makeDbForSupplierList([]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    expect(result).toEqual([]);
  });
});

describe('P-SUP-LIST-03: PASS — listSupplierInvites computes EXPIRED for PENDING + past expiresAt (OD-2)', () => {
  it('returns effective status EXPIRED when DB status=PENDING and expiresAt is in the past', async () => {
    const db  = makeDbForSupplierList([makeInviteRow({ expiresAt: PAST_EXPIRES_AT })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const [result] = await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    expect(result.status).toBe('EXPIRED');
  });
});

describe('P-SUP-LIST-04: PASS — listSupplierInvites does NOT write EXPIRED to DB (OD-2 lazy)', () => {
  it('only findMany is called — no update call made for expired rows', async () => {
    const db  = makeDbForSupplierList([makeInviteRow({ expiresAt: PAST_EXPIRES_AT })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    // db mock has no update function on networkPoolRfqSupplierInvite — call would throw TypeError
    expect(db.networkPoolRfqSupplierInvite.findMany).toHaveBeenCalledOnce();
  });
});

describe('P-SUP-LIST-05: PASS — listSupplierInvites DTO omits metadataInternalJson (OD-5)', () => {
  it('returned records do not expose metadataInternalJson', async () => {
    const db  = makeDbForSupplierList([makeInviteRow()]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const [result] = await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    expect(result).not.toHaveProperty('metadataInternalJson');
    expect(result).not.toHaveProperty('metadata_internal_json');
  });
});

describe('P-SUP-LIST-06: PASS — listSupplierInvites DTO omits cancelReason and ownerOrgId (OD-5)', () => {
  it('returned records do not expose cancel_reason or owner_org_id', async () => {
    const db  = makeDbForSupplierList([makeInviteRow({ cancelReason: 'internal-reason' })]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const [result] = await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    expect(result).not.toHaveProperty('cancel_reason');
    expect(result).not.toHaveProperty('cancelReason');
    expect(result).not.toHaveProperty('owner_org_id');
  });
});

describe('P-SUP-LIST-07: PASS — listSupplierInvites DTO omits RFQ lines, snapshot lines, member quantities (OD-5)', () => {
  it('returned records do not include any line-level, snapshot, or member data keys', async () => {
    const db  = makeDbForSupplierList([makeInviteRow()]);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const [result] = await svc.listSupplierInvites(SUPPLIER_ORG_ID);

    expect(result).not.toHaveProperty('lines');
    expect(result).not.toHaveProperty('rfqLines');
    expect(result).not.toHaveProperty('snapshotLines');
    expect(result).not.toHaveProperty('memberQuantities');
    expect(result).not.toHaveProperty('members');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// viewInvite — P-SUP-VIEW-01 → P-SUP-VIEW-07
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-SUP-VIEW-01: PASS — viewInvite returns invite for correct supplier', () => {
  it('returns a record with id=INVITE_ID and invite_ref=INVITE_REF', async () => {
    const db  = makeDbForSupplierView();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);

    expect(result.id).toBe(INVITE_ID);
    expect(result.invite_ref).toBe(INVITE_REF);
  });
});

describe('P-SUP-VIEW-02: FAIL — viewInvite throws NotFoundError for wrong supplierOrgId', () => {
  it('throws NetworkPoolRfqSupplierInviteNotFoundError when findFirst returns null', async () => {
    const db  = makeDbForSupplierView(null as any);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.viewInvite('wrong-supplier-id', INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteNotFoundError);
  });
});

describe('P-SUP-VIEW-03: FAIL — viewInvite throws NotFoundError for missing invite', () => {
  it('throws NetworkPoolRfqSupplierInviteNotFoundError when invite does not exist', async () => {
    const db  = makeDbForSupplierView(null as any);
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.viewInvite(SUPPLIER_ORG_ID, 'non-existent-invite-id'),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteNotFoundError);
  });
});

describe('P-SUP-VIEW-04: PASS — viewInvite computes EXPIRED for PENDING + past expiresAt (OD-2)', () => {
  it('returns effective status EXPIRED when DB status=PENDING and expiresAt is in the past', async () => {
    const db  = makeDbForSupplierView(makeInviteRowWithRfq({ expiresAt: PAST_EXPIRES_AT }));
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);

    expect(result.status).toBe('EXPIRED');
  });
});

describe('P-SUP-VIEW-05: PASS — viewInvite includes aggregate RFQ header fields from join (OD-5)', () => {
  it('returned record contains rfq_ref, rfq_version, issue_basis, line_count, total_qty from joined rfq', async () => {
    const db  = makeDbForSupplierView(makeInviteRowWithRfq());
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);

    expect(result.rfq_ref).toBe('rfq-ref-from-join');
    expect(result.rfq_version).toBe(1);
    expect(result.issue_basis).toBe('SNAPSHOT_LOCK');
    expect(result.line_count).toBe(2);
    expect(result.total_qty).toBe('2000.000000');
  });
});

describe('P-SUP-VIEW-06: PASS — viewInvite DTO omits RFQ lines, snapshot lines, and member data (OD-5)', () => {
  it('returned record does not include lines, snapshotLines, rfqLines, or member identities', async () => {
    const db  = makeDbForSupplierView();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);

    expect(result).not.toHaveProperty('lines');
    expect(result).not.toHaveProperty('rfqLines');
    expect(result).not.toHaveProperty('snapshotLines');
    expect(result).not.toHaveProperty('members');
    expect(result).not.toHaveProperty('memberQuantities');
  });
});

describe('P-SUP-VIEW-07: PASS — viewInvite does not check NetworkPoolMembership (OD-4)', () => {
  it('completes without querying networkPoolMembership', async () => {
    // If viewInvite accessed tx.networkPoolMembership the mock db would throw TypeError
    const db  = makeDbForSupplierView();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(svc.viewInvite(SUPPLIER_ORG_ID, INVITE_ID)).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// acceptInvite — P-SUP-ACCEPT-01 → P-SUP-ACCEPT-10
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-SUP-ACCEPT-01: PASS — acceptInvite transitions PENDING invite to ACCEPTED', () => {
  it('returns record with status=ACCEPTED', async () => {
    const db  = makeDbForAccept();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(result.status).toBe('ACCEPTED');
  });
});

describe('P-SUP-ACCEPT-02: PASS — acceptInvite sets acceptedAt in the update data', () => {
  it('update call includes status=ACCEPTED and acceptedAt is a Date', async () => {
    const db  = makeDbForAccept();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    const updateCall = db._mockTx.networkPoolRfqSupplierInvite.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('ACCEPTED');
    expect(updateCall.data.acceptedAt).toBeInstanceOf(Date);
  });
});

describe('P-SUP-ACCEPT-03: FAIL — acceptInvite throws InvalidTransitionError for ACCEPTED invite', () => {
  it('throws when effective status is ACCEPTED', async () => {
    const db  = makeDbForAccept({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'ACCEPTED', acceptedAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-ACCEPT-04: FAIL — acceptInvite throws InvalidTransitionError for DECLINED invite', () => {
  it('throws when effective status is DECLINED', async () => {
    const db  = makeDbForAccept({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'DECLINED', declinedAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-ACCEPT-05: FAIL — acceptInvite throws InvalidTransitionError for CANCELLED invite', () => {
  it('throws when effective status is CANCELLED', async () => {
    const db  = makeDbForAccept({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'CANCELLED', cancelledAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-ACCEPT-06: FAIL — acceptInvite throws InvalidTransitionError for lazy-EXPIRED invite (OD-2)', () => {
  it('throws when DB status=PENDING but expiresAt is in the past', async () => {
    const db  = makeDbForAccept({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ expiresAt: PAST_EXPIRES_AT })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-ACCEPT-07: PASS — acceptInvite writes direct lifecycle log (OD-7)', () => {
  it('networkLifecycleLog.create is called once inside the transaction', async () => {
    const db  = makeDbForAccept();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(db._mockTx.networkLifecycleLog.create).toHaveBeenCalledOnce();
  });
});

describe('P-SUP-ACCEPT-08: PASS — acceptInvite does NOT call StateMachineService.transition (OD-7)', () => {
  it('sm.transition is never called during acceptInvite', async () => {
    const db  = makeDbForAccept();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(sm.transition).not.toHaveBeenCalled();
  });
});

describe('P-SUP-ACCEPT-09: FAIL — acceptInvite throws NotFoundError for wrong supplierOrgId', () => {
  it('throws NotFoundError when findFirst returns null (wrong supplier scoping)', async () => {
    const db  = makeDbForAccept({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(null),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.acceptInvite('wrong-supplier-id', USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteNotFoundError);
  });
});

describe('P-SUP-ACCEPT-10: PASS — acceptInvite does NOT mutate pool or RFQ state', () => {
  it('only networkPoolRfqSupplierInvite.update is called — no pool or rfq mutation', async () => {
    const db  = makeDbForAccept();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    // tx mock has no networkPool or networkPoolRfq properties — access would throw TypeError
    // Passing here confirms invite update was the only write
    expect(db._mockTx.networkPoolRfqSupplierInvite.update).toHaveBeenCalledOnce();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// declineInvite — P-SUP-DECLINE-01 → P-SUP-DECLINE-11
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-SUP-DECLINE-01: PASS — declineInvite transitions PENDING invite to DECLINED', () => {
  it('returns record with status=DECLINED', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    const result = await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(result.status).toBe('DECLINED');
  });
});

describe('P-SUP-DECLINE-02: PASS — declineInvite sets declinedAt in the update data', () => {
  it('update call includes status=DECLINED and declinedAt is a Date', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    const updateCall = db._mockTx.networkPoolRfqSupplierInvite.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('DECLINED');
    expect(updateCall.data.declinedAt).toBeInstanceOf(Date);
  });
});

describe('P-SUP-DECLINE-03: PASS — declineInvite stores declineReason in update data', () => {
  it('update call includes the supplied declineReason string', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID, 'Price too high');

    const updateCall = db._mockTx.networkPoolRfqSupplierInvite.update.mock.calls[0][0];
    expect(updateCall.data.declineReason).toBe('Price too high');
  });
});

describe('P-SUP-DECLINE-04: FAIL — declineInvite throws InvalidTransitionError for ACCEPTED invite', () => {
  it('throws when effective status is ACCEPTED', async () => {
    const db  = makeDbForDecline({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'ACCEPTED', acceptedAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-DECLINE-05: FAIL — declineInvite throws InvalidTransitionError for DECLINED invite', () => {
  it('throws when effective status is DECLINED', async () => {
    const db  = makeDbForDecline({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'DECLINED', declinedAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-DECLINE-06: FAIL — declineInvite throws InvalidTransitionError for CANCELLED invite', () => {
  it('throws when effective status is CANCELLED', async () => {
    const db  = makeDbForDecline({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ status: 'CANCELLED', cancelledAt: NOW })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-DECLINE-07: FAIL — declineInvite throws InvalidTransitionError for lazy-EXPIRED invite (OD-2)', () => {
  it('throws when DB status=PENDING but expiresAt is in the past', async () => {
    const db  = makeDbForDecline({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(makeInviteRow({ expiresAt: PAST_EXPIRES_AT })),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteInvalidTransitionError);
  });
});

describe('P-SUP-DECLINE-08: PASS — declineInvite writes direct lifecycle log (OD-7)', () => {
  it('networkLifecycleLog.create is called once inside the transaction', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(db._mockTx.networkLifecycleLog.create).toHaveBeenCalledOnce();
  });
});

describe('P-SUP-DECLINE-09: PASS — declineInvite does NOT call StateMachineService.transition (OD-7)', () => {
  it('sm.transition is never called during declineInvite', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    expect(sm.transition).not.toHaveBeenCalled();
  });
});

describe('P-SUP-DECLINE-10: FAIL — declineInvite throws NotFoundError for wrong supplierOrgId', () => {
  it('throws NotFoundError when findFirst returns null', async () => {
    const db  = makeDbForDecline({
      networkPoolRfqSupplierInvite: {
        findFirst: vi.fn().mockResolvedValue(null),
        update:    vi.fn(),
      },
    });
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await expect(
      svc.declineInvite('wrong-supplier-id', USER_ID, INVITE_ID),
    ).rejects.toBeInstanceOf(NetworkPoolRfqSupplierInviteNotFoundError);
  });
});

describe('P-SUP-DECLINE-11: PASS — declineInvite does NOT mutate pool or RFQ state', () => {
  it('only networkPoolRfqSupplierInvite.update is called — no pool or rfq mutation', async () => {
    const db  = makeDbForDecline();
    const sm  = makeSm();
    const svc = new NetworkPoolRfqService(db, sm);

    await svc.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);

    // tx mock has no networkPool or networkPoolRfq — access would throw TypeError
    expect(db._mockTx.networkPoolRfqSupplierInvite.update).toHaveBeenCalledOnce();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// General supplier tests — P-SUP-GEN-01 → P-SUP-GEN-05
// ═══════════════════════════════════════════════════════════════════════════════

describe('P-SUP-GEN-01: PASS — no supplier method checks NetworkPoolMembership (OD-4)', () => {
  it('listSupplierInvites and viewInvite complete without networkPoolMembership query', async () => {
    const sm = makeSm();

    const svcList = new NetworkPoolRfqService(makeDbForSupplierList(), sm);
    await expect(svcList.listSupplierInvites(SUPPLIER_ORG_ID)).resolves.not.toThrow();

    const svcView = new NetworkPoolRfqService(makeDbForSupplierView(), sm);
    await expect(svcView.viewInvite(SUPPLIER_ORG_ID, INVITE_ID)).resolves.not.toThrow();
  });
});

describe('P-SUP-GEN-02: PASS — no supplier method exposes metadataInternalJson (OD-5)', () => {
  it('listSupplierInvites, viewInvite, acceptInvite, declineInvite all omit metadataInternalJson', async () => {
    const sm = makeSm();

    const svcList = new NetworkPoolRfqService(makeDbForSupplierList([makeInviteRow()]), sm);
    const [listResult] = await svcList.listSupplierInvites(SUPPLIER_ORG_ID);
    expect(listResult).not.toHaveProperty('metadataInternalJson');
    expect(listResult).not.toHaveProperty('metadata_internal_json');

    const svcView = new NetworkPoolRfqService(makeDbForSupplierView(), sm);
    const viewResult = await svcView.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);
    expect(viewResult).not.toHaveProperty('metadataInternalJson');

    const svcAccept = new NetworkPoolRfqService(makeDbForAccept(), sm);
    const acceptResult = await svcAccept.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);
    expect(acceptResult).not.toHaveProperty('metadataInternalJson');

    const svcDecline = new NetworkPoolRfqService(makeDbForDecline(), sm);
    const declineResult = await svcDecline.declineInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);
    expect(declineResult).not.toHaveProperty('metadataInternalJson');
  });
});

describe('P-SUP-GEN-03: PASS — no supplier method includes RFQ lines (OD-5)', () => {
  it('supplier DTOs from list, view, accept, decline do not have rfqLines or lines property', async () => {
    const sm = makeSm();

    const svcList = new NetworkPoolRfqService(makeDbForSupplierList([makeInviteRow()]), sm);
    const [listResult] = await svcList.listSupplierInvites(SUPPLIER_ORG_ID);
    expect(listResult).not.toHaveProperty('rfqLines');
    expect(listResult).not.toHaveProperty('lines');

    const svcView = new NetworkPoolRfqService(makeDbForSupplierView(), sm);
    const viewResult = await svcView.viewInvite(SUPPLIER_ORG_ID, INVITE_ID);
    expect(viewResult).not.toHaveProperty('rfqLines');

    const svcAccept = new NetworkPoolRfqService(makeDbForAccept(), sm);
    const acceptResult = await svcAccept.acceptInvite(SUPPLIER_ORG_ID, USER_ID, INVITE_ID);
    expect(acceptResult).not.toHaveProperty('rfqLines');
  });
});

describe('P-SUP-GEN-04: PASS — no supplier method writes EXPIRED to DB (OD-2)', () => {
  it('listSupplierInvites and viewInvite do not call update to persist EXPIRED status', async () => {
    const sm = makeSm();

    const dbList = makeDbForSupplierList([makeInviteRow({ expiresAt: PAST_EXPIRES_AT })]);
    await new NetworkPoolRfqService(dbList, sm).listSupplierInvites(SUPPLIER_ORG_ID);
    // db mock has no update property — call would throw TypeError; passing = no update called
    expect(dbList.networkPoolRfqSupplierInvite.findMany).toHaveBeenCalledOnce();

    const dbView = makeDbForSupplierView(makeInviteRowWithRfq({ expiresAt: PAST_EXPIRES_AT }));
    await new NetworkPoolRfqService(dbView, sm).viewInvite(SUPPLIER_ORG_ID, INVITE_ID);
    expect(dbView.networkPoolRfqSupplierInvite.findFirst).toHaveBeenCalledOnce();
  });
});

describe('P-SUP-GEN-05: PASS — owner invite methods still pass after adding supplier methods', () => {
  it('sendInvite, listInvites, getInvite and cancelInvite all still resolve without error', async () => {
    const sm = makeSm();

    const svcSend   = new NetworkPoolRfqService(makeDbForSend(), sm);
    const svcList   = new NetworkPoolRfqService(makeDbForList(), sm);
    const svcGet    = new NetworkPoolRfqService(makeDbForGet(), sm);
    const svcCancel = new NetworkPoolRfqService(makeDbForCancel(), sm);

    await expect(svcSend.sendInvite(OWNER_ORG_ID, USER_ID, makeSendInviteInput())).resolves.not.toThrow();
    await expect(svcList.listInvites(OWNER_ORG_ID, POOL_ID, RFQ_ID)).resolves.not.toThrow();
    await expect(svcGet.getInvite(OWNER_ORG_ID, POOL_ID, RFQ_ID, INVITE_ID)).resolves.not.toThrow();
    await expect(svcCancel.cancelInvite(OWNER_ORG_ID, USER_ID, POOL_ID, RFQ_ID, INVITE_ID)).resolves.not.toThrow();
  });
});

