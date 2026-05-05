/**
 * ttp-score-snapshot-read-admin.unit.test.ts
 * Unit: TTP-SCORE-SNAPSHOT-READ-ADMIN-001 (Slice 6)
 *       TTP-TEXQTICSCORE-V2-ADMIN-READ-001 (score_version filter extension)
 *
 * Tests querySnapshotList, querySnapshotDetail, SNAPSHOT_SELECT, and
 * snapshotListQuerySchema exported from
 * server/src/routes/control/ttp-score-snapshots.ts
 *
 * Pure unit tests with vi.fn() mocks. No DB access, no Fastify HTTP layer.
 * Verifies: org scoping, ordering, limit, filter propagation, safe field
 * projection (no score_detail_json), null-return for not-found, and absence
 * of all write-method calls.
 *
 * Test cases:
 *   TC-RSA-001: querySnapshotList — scopes where clause to orgId
 *   TC-RSA-002: querySnapshotList — orders by created_at desc
 *   TC-RSA-003: querySnapshotList — respects limit parameter
 *   TC-RSA-004: querySnapshotList — passes trigger_event filter when provided
 *   TC-RSA-005: querySnapshotList — passes optional id filters (trade_id, vpc_id, invoice_id, enrollment_id)
 *   TC-RSA-006: querySnapshotList — omits undefined optional filters from where clause
 *   TC-RSA-007: SNAPSHOT_SELECT — does not include score_detail_json (safe field projection)
 *   TC-RSA-008: SNAPSHOT_SELECT — includes core identity and score fields
 *   TC-RSA-009: querySnapshotDetail — calls findUnique with snapshotId as id filter
 *   TC-RSA-010: querySnapshotDetail — returns null when not found
 *   TC-RSA-011: querySnapshotList — does not call any write method
 *   TC-RSA-012: querySnapshotDetail — does not call any write method
 *   TC-RSA-013: querySnapshotList — score_version=TTP_V1 filter propagated to where clause
 *   TC-RSA-014: querySnapshotList — score_version=TEXQTICSCORE_V2 filter propagated to where clause
 *   TC-RSA-015: querySnapshotList — score_version absent from where when not provided
 *   TC-RSA-016: snapshotListQuerySchema — rejects invalid score_version value
 *   TC-RSA-017: querySnapshotList — score_version and trigger_event both in where (composite filter)
 *   TC-RSA-018: SNAPSHOT_SELECT — includes score_version field
 *   TC-RSA-019: SNAPSHOT_SELECT — still excludes score_detail_json after admin-read-001 extension
 *   TC-RSA-020: querySnapshotDetail — row's score_version passes through to result
 *
 * Run: pnpm -C server exec vitest run src/__tests__/ttp-score-snapshot-read-admin.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  querySnapshotList,
  querySnapshotDetail,
  SNAPSHOT_SELECT,
  snapshotListQuerySchema,
} from '../routes/control/ttp-score-snapshots.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID      = 'aaaa1111-0000-0000-0000-000000000001';
const SNAPSHOT_ID = 'bbbb2222-0000-0000-0000-000000000002';
const TRADE_ID    = 'cccc3333-0000-0000-0000-000000000003';
const VPC_ID      = 'dddd4444-0000-0000-0000-000000000004';
const INVOICE_ID  = 'eeee5555-0000-0000-0000-000000000005';
const ENROLL_ID   = 'ffff6666-0000-0000-0000-000000000006';

// ─── Mock DB factory ──────────────────────────────────────────────────────────

function makeDb() {
  return {
    ttp_score_snapshots: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
      upsert:     vi.fn(),
    },
  };
}

function makeSnapshotRow(id = SNAPSHOT_ID) {
  return {
    id,
    org_id:                ORG_ID,
    trade_id:              TRADE_ID,
    invoice_id:            null,
    vpc_id:                null,
    enrollment_id:         null,
    score_value:           750,
    score_band:            'HIGH',
    score_version:         'TTP_V1',
    trigger_event:         'VPC_ISSUED',
    source_event_id:       null,
    actor_id:              null,
    score_disclaimer_hash: 'abc123',
    route_disclaimer_hash: 'def456',
    metadata_json:         null,
    created_at:            new Date('2026-05-01T00:00:00.000Z'),
  };
}

// ─── Tests: querySnapshotList ─────────────────────────────────────────────────

describe('querySnapshotList', () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
    vi.clearAllMocks();
  });

  it('TC-RSA-001: scopes where clause to provided orgId', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50 });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ org_id: ORG_ID }),
      }),
    );
  });

  it('TC-RSA-002: orders results by created_at descending', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50 });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: 'desc' } }),
    );
  });

  it('TC-RSA-003: respects the limit parameter', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 25 });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 }),
    );
  });

  it('TC-RSA-004: includes trigger_event filter when provided', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50, trigger_event: 'VPC_ISSUED' });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ trigger_event: 'VPC_ISSUED' }),
      }),
    );
  });

  it('TC-RSA-005: includes optional id filters when provided', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, {
      limit:         50,
      trade_id:      TRADE_ID,
      vpc_id:        VPC_ID,
      invoice_id:    INVOICE_ID,
      enrollment_id: ENROLL_ID,
    });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trade_id:      TRADE_ID,
          vpc_id:        VPC_ID,
          invoice_id:    INVOICE_ID,
          enrollment_id: ENROLL_ID,
        }),
      }),
    );
  });

  it('TC-RSA-006: omits undefined optional filters from where clause', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50 });
    const [call] = db.ttp_score_snapshots.findMany.mock.calls;
    const where = (call[0] as { where: Record<string, unknown> }).where;
    expect(where).not.toHaveProperty('trigger_event');
    expect(where).not.toHaveProperty('trade_id');
    expect(where).not.toHaveProperty('vpc_id');
    expect(where).not.toHaveProperty('invoice_id');
    expect(where).not.toHaveProperty('enrollment_id');
  });

  it('TC-RSA-011: does not call any write method', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([makeSnapshotRow()]);
    await querySnapshotList(db, ORG_ID, { limit: 50 });
    expect(db.ttp_score_snapshots.create).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.update).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.delete).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.upsert).not.toHaveBeenCalled();
  });
});

// ─── Tests: querySnapshotDetail ──────────────────────────────────────────────

describe('querySnapshotDetail', () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
    vi.clearAllMocks();
  });

  it('TC-RSA-009: calls findUnique with snapshotId as id filter', async () => {
    db.ttp_score_snapshots.findUnique.mockResolvedValue(makeSnapshotRow());
    await querySnapshotDetail(db, SNAPSHOT_ID);
    expect(db.ttp_score_snapshots.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SNAPSHOT_ID } }),
    );
  });

  it('TC-RSA-010: returns null when snapshot is not found', async () => {
    db.ttp_score_snapshots.findUnique.mockResolvedValue(null);
    const result = await querySnapshotDetail(db, SNAPSHOT_ID);
    expect(result).toBeNull();
  });

  it('TC-RSA-012: does not call any write method', async () => {
    db.ttp_score_snapshots.findUnique.mockResolvedValue(makeSnapshotRow());
    await querySnapshotDetail(db, SNAPSHOT_ID);
    expect(db.ttp_score_snapshots.create).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.update).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.delete).not.toHaveBeenCalled();
    expect(db.ttp_score_snapshots.upsert).not.toHaveBeenCalled();
  });
});

// ─── Tests: SNAPSHOT_SELECT ───────────────────────────────────────────────────

describe('SNAPSHOT_SELECT', () => {
  it('TC-RSA-007: does not include score_detail_json (safe field projection)', () => {
    expect(SNAPSHOT_SELECT).not.toHaveProperty('score_detail_json');
  });

  it('TC-RSA-008: includes core identity and score fields', () => {
    expect(SNAPSHOT_SELECT).toMatchObject({
      id:          true,
      org_id:      true,
      score_value: true,
      score_band:  true,
      created_at:  true,
    });
  });
});

// ─── Tests: score_version filter (TTP-TEXQTICSCORE-V2-ADMIN-READ-001) ────────

describe('querySnapshotList — score_version filter (TTP-TEXQTICSCORE-V2-ADMIN-READ-001)', () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
    vi.clearAllMocks();
  });

  it('TC-RSA-013: includes score_version=TTP_V1 in where clause when provided', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50, score_version: 'TTP_V1' });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ score_version: 'TTP_V1' }),
      }),
    );
  });

  it('TC-RSA-014: includes score_version=TEXQTICSCORE_V2 in where clause when provided', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50, score_version: 'TEXQTICSCORE_V2' });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ score_version: 'TEXQTICSCORE_V2' }),
      }),
    );
  });

  it('TC-RSA-015: omits score_version from where clause when not provided', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, { limit: 50 });
    const [call] = db.ttp_score_snapshots.findMany.mock.calls;
    const where = (call[0] as { where: Record<string, unknown> }).where;
    expect(where).not.toHaveProperty('score_version');
  });

  it('TC-RSA-017: includes both score_version and trigger_event when both provided (composite filter)', async () => {
    db.ttp_score_snapshots.findMany.mockResolvedValue([]);
    await querySnapshotList(db, ORG_ID, {
      limit:         50,
      score_version: 'TEXQTICSCORE_V2',
      trigger_event: 'VPC_ISSUED',
    });
    expect(db.ttp_score_snapshots.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          score_version: 'TEXQTICSCORE_V2',
          trigger_event: 'VPC_ISSUED',
        }),
      }),
    );
  });
});

describe('snapshotListQuerySchema — score_version validation (TTP-TEXQTICSCORE-V2-ADMIN-READ-001)', () => {
  it('TC-RSA-016: rejects an invalid score_version string', () => {
    const result = snapshotListQuerySchema.safeParse({
      limit:         50,
      score_version: 'INVALID_VERSION',
    });
    expect(result.success).toBe(false);
  });
});

describe('SNAPSHOT_SELECT — score_version field (TTP-TEXQTICSCORE-V2-ADMIN-READ-001)', () => {
  it('TC-RSA-018: includes score_version', () => {
    expect(SNAPSHOT_SELECT).toHaveProperty('score_version', true);
  });

  it('TC-RSA-019: still excludes score_detail_json after admin-read-001 extension', () => {
    expect(SNAPSHOT_SELECT).not.toHaveProperty('score_detail_json');
  });
});

describe('querySnapshotDetail — score_version passthrough (TTP-TEXQTICSCORE-V2-ADMIN-READ-001)', () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
    vi.clearAllMocks();
  });

  it('TC-RSA-020: result carries score_version from the mocked row', async () => {
    const row = { ...makeSnapshotRow(), score_version: 'TEXQTICSCORE_V2' };
    db.ttp_score_snapshots.findUnique.mockResolvedValue(row);
    const result = await querySnapshotDetail(db, SNAPSHOT_ID) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result['score_version']).toBe('TEXQTICSCORE_V2');
  });
});
