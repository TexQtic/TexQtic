/**
 * Unit Tests — NetworkLifecycleLogService
 * TEXQTIC-NC-PHASE1-LIFECYCLE-LOG-READ-001
 *
 * All Prisma DB calls are mocked — no real database required.
 *
 * D-017-A: orgId always from JWT/dbContext. Wrong-org returns non-leaking PoolNotFound.
 * No mutation. No feature-flag gating. No payment / money movement.
 *
 * Test IDs:
 *   NLL-SVC-01  listPoolLifecycleLogs — pool not found for org → LifecycleLogPoolNotFoundError
 *   NLL-SVC-02  listPoolLifecycleLogs — wrong-org non-leaking (same error class as NLL-SVC-01)
 *   NLL-SVC-03  listPoolLifecycleLogs — pool exists, no logs → empty items, total=0
 *   NLL-SVC-04  listPoolLifecycleLogs — pool with 3 logs → 3 DTOs, correct field mapping
 *   NLL-SVC-05  listPoolLifecycleLogs — pagination: limit/offset forwarded to findMany
 *   NLL-SVC-06  listPoolLifecycleLogs — pagination total matches count result
 *   NLL-SVC-07  listPoolLifecycleLogs — createdAt is ISO 8601 string in DTO
 *   NLL-SVC-08  listPoolLifecycleLogs — actorAdminId NOT present in DTO (security gate)
 *   NLL-SVC-09  listPoolLifecycleLogs — impersonationId NOT present in DTO (security gate)
 *   NLL-SVC-10  listPoolLifecycleLogs — no DB write methods called (read-only)
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import {
  NetworkLifecycleLogService,
  LifecycleLogPoolNotFoundError,
} from '../services/networkLifecycleLog.service.js';

// ─── Mock DB type ─────────────────────────────────────────────────────────────

interface MockDb {
  networkPool:          { findFirst: Mock };
  networkLifecycleLog:  { count: Mock; findMany: Mock; create: Mock; update: Mock; delete: Mock };
}

function makeDb(): MockDb {
  return {
    networkPool:         { findFirst: vi.fn() },
    networkLifecycleLog: {
      count:   vi.fn(),
      findMany: vi.fn(),
      create:  vi.fn(),
      update:  vi.fn(),
      delete:  vi.fn(),
    },
  };
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ORG_ID   = randomUUID();
const POOL_ID  = randomUUID();
const USER_ID  = randomUUID();

const BASE_DATE = new Date('2026-07-05T10:00:00.000Z');

function makeLogRow(overrides: Partial<{
  id:            string;
  orgId:         string;
  entityType:    string;
  entityId:      string;
  fromStateKey:  string;
  toStateKey:    string;
  actorType:     string;
  actorRole:     string;
  actorUserId:   string | null;
  actorAdminId:  string | null;
  aiTriggered:   boolean;
  reason:        string;
  createdAt:     Date;
  // internal fields deliberately included to verify they are stripped
  impersonationId: string | null;
  makerUserId:     string | null;
  checkerUserId:   string | null;
  escalationLevel: number | null;
  requestId:       string | null;
}> = {}): {
  id: string;
  entityType: string;
  entityId: string;
  fromStateKey: string;
  toStateKey: string;
  actorType: string;
  actorRole: string;
  actorUserId: string | null;
  aiTriggered: boolean;
  reason: string;
  createdAt: Date;
} {
  return {
    id:           overrides.id ?? randomUUID(),
    entityType:   overrides.entityType ?? 'POOL',
    entityId:     overrides.entityId ?? POOL_ID,
    fromStateKey: overrides.fromStateKey ?? 'DRAFT',
    toStateKey:   overrides.toStateKey ?? 'OPEN',
    actorType:    overrides.actorType ?? 'TENANT_ADMIN',
    actorRole:    overrides.actorRole ?? 'ORG_ADMIN',
    actorUserId:  overrides.actorUserId !== undefined ? overrides.actorUserId : USER_ID,
    aiTriggered:  overrides.aiTriggered ?? false,
    reason:       overrides.reason ?? 'Test transition reason',
    createdAt:    overrides.createdAt ?? BASE_DATE,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NetworkLifecycleLogService', () => {
  let db:  MockDb;
  let svc: NetworkLifecycleLogService;

  beforeEach(() => {
    db  = makeDb();
    svc = new NetworkLifecycleLogService(db as any);
  });

  // ── NLL-SVC-01: pool not found → LifecycleLogPoolNotFoundError ─────────────

  it('NLL-SVC-01: listPoolLifecycleLogs throws LifecycleLogPoolNotFoundError when pool absent', async () => {
    db.networkPool.findFirst.mockResolvedValue(null);

    await expect(
      svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 }),
    ).rejects.toThrow(LifecycleLogPoolNotFoundError);

    // Verify the findFirst was scoped by orgId (non-leaking ownership check)
    expect(db.networkPool.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: POOL_ID, orgId: ORG_ID } }),
    );
  });

  // ── NLL-SVC-02: wrong-org non-leaking (same error class) ───────────────────

  it('NLL-SVC-02: listPoolLifecycleLogs non-leaking for wrong-org — same PoolNotFound error', async () => {
    db.networkPool.findFirst.mockResolvedValue(null); // different org → null

    const wrongOrg = randomUUID();
    await expect(
      svc.listPoolLifecycleLogs(wrongOrg, POOL_ID, { limit: 20, offset: 0 }),
    ).rejects.toThrow(LifecycleLogPoolNotFoundError);

    // Log rows should NOT be queried when pool is not confirmed
    expect(db.networkLifecycleLog.findMany).not.toHaveBeenCalled();
    expect(db.networkLifecycleLog.count).not.toHaveBeenCalled();
  });

  // ── NLL-SVC-03: pool exists, no logs → empty items, total=0 ───────────────

  it('NLL-SVC-03: returns empty items and total=0 when no lifecycle log entries exist', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(0);
    db.networkLifecycleLog.findMany.mockResolvedValue([]);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.offset).toBe(0);
  });

  // ── NLL-SVC-04: pool with 3 logs → 3 DTOs with correct field mapping ───────

  it('NLL-SVC-04: returns 3 DTOs with correctly mapped fields', async () => {
    const rows = [
      makeLogRow({ fromStateKey: 'DRAFT',      toStateKey: 'OPEN' }),
      makeLogRow({ fromStateKey: 'OPEN',       toStateKey: 'AGGREGATING' }),
      makeLogRow({ fromStateKey: 'AGGREGATING', toStateKey: 'CLOSED_FOR_BIDS' }),
    ];

    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(3);
    db.networkLifecycleLog.findMany.mockResolvedValue(rows);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.items).toHaveLength(3);

    const dto = result.items[0];
    expect(dto.id).toBe(rows[0].id);
    expect(dto.entity_type).toBe('POOL');
    expect(dto.entity_id).toBe(POOL_ID);
    expect(dto.from_state_key).toBe('DRAFT');
    expect(dto.to_state_key).toBe('OPEN');
    expect(dto.actor_type).toBe('TENANT_ADMIN');
    expect(dto.actor_role).toBe('ORG_ADMIN');
    expect(dto.actor_user_id).toBe(USER_ID);
    expect(dto.ai_triggered).toBe(false);
    expect(dto.reason).toBe('Test transition reason');
    expect(typeof dto.created_at).toBe('string');
  });

  // ── NLL-SVC-05: pagination limit/offset forwarded to findMany ──────────────

  it('NLL-SVC-05: pagination opts are forwarded to networkLifecycleLog.findMany', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(50);
    db.networkLifecycleLog.findMany.mockResolvedValue([]);

    await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 10, offset: 30 });

    expect(db.networkLifecycleLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 30 }),
    );
  });

  // ── NLL-SVC-06: pagination total matches count result ─────────────────────

  it('NLL-SVC-06: pagination.total reflects networkLifecycleLog.count result', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(42);
    db.networkLifecycleLog.findMany.mockResolvedValue([]);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.pagination.total).toBe(42);
  });

  // ── NLL-SVC-07: createdAt is ISO 8601 string in DTO ──────────────────────

  it('NLL-SVC-07: DTO.created_at is an ISO 8601 string', async () => {
    const row = makeLogRow({ createdAt: new Date('2026-07-05T10:00:00.000Z') });

    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(1);
    db.networkLifecycleLog.findMany.mockResolvedValue([row]);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.items[0].created_at).toBe('2026-07-05T10:00:00.000Z');
  });

  // ── NLL-SVC-08: actorAdminId NOT in DTO ───────────────────────────────────

  it('NLL-SVC-08: DTO does not contain actor_admin_id (platform-internal field)', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(1);
    db.networkLifecycleLog.findMany.mockResolvedValue([makeLogRow()]);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.items[0]).not.toHaveProperty('actor_admin_id');
  });

  // ── NLL-SVC-09: impersonationId NOT in DTO ────────────────────────────────

  it('NLL-SVC-09: DTO does not contain impersonation_id (internal audit field)', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(1);
    db.networkLifecycleLog.findMany.mockResolvedValue([makeLogRow()]);

    const result = await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(result.items[0]).not.toHaveProperty('impersonation_id');
  });

  // ── NLL-SVC-10: no DB write methods called ────────────────────────────────

  it('NLL-SVC-10: listPoolLifecycleLogs does not call any write methods', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID });
    db.networkLifecycleLog.count.mockResolvedValue(0);
    db.networkLifecycleLog.findMany.mockResolvedValue([]);

    await svc.listPoolLifecycleLogs(ORG_ID, POOL_ID, { limit: 20, offset: 0 });

    expect(db.networkLifecycleLog.create).not.toHaveBeenCalled();
    expect(db.networkLifecycleLog.update).not.toHaveBeenCalled();
    expect(db.networkLifecycleLog.delete).not.toHaveBeenCalled();
  });
});
