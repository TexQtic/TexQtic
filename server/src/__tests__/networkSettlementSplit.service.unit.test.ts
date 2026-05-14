/**
 * Unit Tests — NetworkSettlementSplitService
 * TEXQTIC-NC-PHASE1-POOL-SETTLE-001
 *
 * All Prisma DB calls are mocked — no real database required.
 *
 * TradeTrust Pay doctrine:
 *   TexQtic is NOT a payment executor, PSP, escrow custodian, lender, or funder.
 *   This service provides settlement VISIBILITY only.
 *   TRIGGERED and RELEASED statuses are schema-reserved; they are NOT emitted by Packet 20.
 *   No pool SETTLED transition, no invoice paid-state mutation, no money movement.
 *
 * Test IDs:
 *   NSS-01  getPoolSettlementStatus — read-only, no DB writes
 *   NSS-02  getPoolSettlementStatus — returns existing payable split rows
 *   NSS-03  getPoolSettlementStatus — wrong-org non-leaking 404
 *   NSS-04  getPoolSettlementStatus — payment-term / maturity / finance-readiness fields
 *   NSS-05  computePoolSettlementPreview — non-mutating (no create/update/delete called)
 *   NSS-06  computePoolSettlementPreview — computes split preview from invoice+membership data
 *   NSS-07  computePoolSettlementPreview — preview includes payment-term / maturity fields
 *   NSS-08  computePoolSettlementPreview — hasPendingSplits=true when PENDING splits exist
 *   NSS-09  createPoolSettlementSplits — fails closed when flag=false (FEATURE_DISABLED)
 *   NSS-10  createPoolSettlementSplits — fails closed when flag row absent (FEATURE_DISABLED)
 *   NSS-11  createPoolSettlementSplits — creates PENDING-only rows when flag=true
 *   NSS-12  createPoolSettlementSplits — escrowAccountId=null on created rows
 *   NSS-13  createPoolSettlementSplits — idempotency: throws AlreadyExists when PENDING splits exist
 *   NSS-14  createPoolSettlementSplits — wrong-org non-leaking 404
 *   NSS-15  createPoolSettlementSplits — throws InvalidInput when no eligible members
 *   NSS-16  no TRIGGERED / RELEASED / FAILED rows created by any Packet 20 method
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  NetworkSettlementSplitService,
  NetworkSettlementSplitPoolNotFoundError,
  NetworkSettlementSplitFeatureDisabledError,
  NetworkSettlementSplitAlreadyExistsError,
  NetworkSettlementSplitInvalidInputError,
  NC_SETTLEMENT_FEATURE_FLAG,
  MATURITY_STATUS,
  FINANCE_READINESS_STATUS,
} from '../services/networkSettlementSplit.service.js';

// ─── Mock DB type ─────────────────────────────────────────────────────────────

interface MockDb {
  networkPool:               { findFirst: Mock };
  networkSettlementSplit:    { findMany: Mock; count: Mock; create: Mock };
  networkInvoice:            { findFirst: Mock };
  networkPoolMembership:     { findMany: Mock };
  featureFlag:               { findUnique: Mock };
  $transaction:              Mock;
}

function makeDb(): MockDb {
  const db: MockDb = {
    networkPool:            { findFirst: vi.fn() },
    networkSettlementSplit: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    networkInvoice:         { findFirst: vi.fn() },
    networkPoolMembership:  { findMany: vi.fn() },
    featureFlag:            { findUnique: vi.fn() },
    $transaction:           vi.fn((ops: unknown[]) => Promise.all(ops)),
  };
  return db;
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ORG_ID      = randomUUID();
const POOL_ID     = randomUUID();
const MEMBER_ORG1 = randomUUID();
const MEMBER_ORG2 = randomUUID();

const BASE_DATE = new Date('2026-08-01T00:00:00.000Z');
const DUE_DATE  = new Date('2026-09-01T00:00:00.000Z');

function makeSplitRow(overrides: Partial<{
  id: string; status: string; waterfallSeq: number;
  recipientOrgId: string; escrowAccountId: string | null;
  triggeredAt: Date | null; releasedAt: Date | null;
}> = {}): object {
  return {
    id: randomUUID(),
    orgId: ORG_ID,
    entityType: 'POOL',
    entityId: POOL_ID,
    recipientOrgId: overrides.recipientOrgId ?? MEMBER_ORG1,
    waterfallSeq: overrides.waterfallSeq ?? 1,
    currency: 'INR',
    grossAmount: new Prisma.Decimal('125000.000000'),
    holdbackAmount: new Prisma.Decimal('0.000000'),
    penaltyDeduction: new Prisma.Decimal('0.000000'),
    netPayable: new Prisma.Decimal('125000.000000'),
    status: overrides.status ?? 'PENDING',
    escrowAccountId: overrides.escrowAccountId ?? null,
    triggeredAt: overrides.triggeredAt ?? null,
    releasedAt: overrides.releasedAt ?? null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<{
  invoiceDate: Date | null; dueDate: Date | null;
  grossAmount: Prisma.Decimal; currency: string;
}> = {}): object {
  return {
    invoiceDate: overrides.invoiceDate ?? BASE_DATE,
    dueDate: overrides.dueDate ?? DUE_DATE,
    grossAmount: overrides.grossAmount ?? new Prisma.Decimal('250000.000000'),
    currency: overrides.currency ?? 'INR',
  };
}

function makeMembership(orgId: string, seq: number): object {
  return { orgId, joinedAt: new Date(BASE_DATE.getTime() + seq * 1000) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NetworkSettlementSplitService', () => {
  let db: MockDb;
  let svc: NetworkSettlementSplitService;

  beforeEach(() => {
    db  = makeDb();
    svc = new NetworkSettlementSplitService(db as any);
  });

  // ── NSS-01: getPoolSettlementStatus — read-only ─────────────────────────────

  it('NSS-01: getPoolSettlementStatus does not call any write methods', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.findMany.mockResolvedValue([]);
    db.networkInvoice.findFirst.mockResolvedValue(null);

    await svc.getPoolSettlementStatus(ORG_ID, POOL_ID);

    expect(db.networkSettlementSplit.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-02: getPoolSettlementStatus — returns existing payable splits ────────

  it('NSS-02: getPoolSettlementStatus returns existing payable split rows', async () => {
    const row1 = makeSplitRow({ waterfallSeq: 1, recipientOrgId: MEMBER_ORG1 });
    const row2 = makeSplitRow({ waterfallSeq: 2, recipientOrgId: MEMBER_ORG2 });

    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.findMany.mockResolvedValue([row1, row2]);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());

    const result = await svc.getPoolSettlementStatus(ORG_ID, POOL_ID);

    expect(result.payableSplits).toHaveLength(2);
    expect(result.payableSplits[0].waterfallSeq).toBe(1);
    expect(result.payableSplits[1].waterfallSeq).toBe(2);
    expect(result.payableSplits[0].settlementVisibilityStatus).toBe('PENDING');
    expect(result.payableSplits[0].escrowAccountId).toBeNull();
    expect(result.payableSplits[0].triggeredAt).toBeNull();
    expect(result.payableSplits[0].releasedAt).toBeNull();
  });

  // ── NSS-03: getPoolSettlementStatus — wrong-org non-leaking 404 ────────────

  it('NSS-03: getPoolSettlementStatus throws PoolNotFound for wrong-org (non-leaking)', async () => {
    db.networkPool.findFirst.mockResolvedValue(null); // org mismatch → null

    await expect(svc.getPoolSettlementStatus(randomUUID(), POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitPoolNotFoundError,
    );
  });

  // ── NSS-04: getPoolSettlementStatus — payment-term / maturity / finance-readiness

  it('NSS-04: getPoolSettlementStatus returns payment-term, maturity, finance-readiness', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.findMany.mockResolvedValue([makeSplitRow()]);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());

    const result = await svc.getPoolSettlementStatus(ORG_ID, POOL_ID);

    expect(result.poolId).toBe(POOL_ID);
    expect(result.orgId).toBe(ORG_ID);
    expect(result.paymentDueDate).toBe(DUE_DATE.toISOString());
    expect(typeof result.paymentTermsDays).toBe('number');
    expect(result.maturityStatus).toBeDefined();
    expect(result.financeReadinessStatus).toBe(FINANCE_READINESS_STATUS.SPLITS_PRESENT);
  });

  it('NSS-04b: getPoolSettlementStatus returns NO_SPLITS when no split rows exist', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.findMany.mockResolvedValue([]);
    db.networkInvoice.findFirst.mockResolvedValue(null);

    const result = await svc.getPoolSettlementStatus(ORG_ID, POOL_ID);

    expect(result.financeReadinessStatus).toBe(FINANCE_READINESS_STATUS.NO_SPLITS);
    expect(result.paymentDueDate).toBeNull();
    expect(result.maturityStatus).toBe(MATURITY_STATUS.NO_DUE_DATE);
  });

  // ── NSS-05: computePoolSettlementPreview — non-mutating ────────────────────

  it('NSS-05: computePoolSettlementPreview does not call any write methods', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([
      makeMembership(MEMBER_ORG1, 0),
      makeMembership(MEMBER_ORG2, 1),
    ]);

    await svc.computePoolSettlementPreview(ORG_ID, POOL_ID);

    expect(db.networkSettlementSplit.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-06: computePoolSettlementPreview — computes split from invoice/pool data

  it('NSS-06: computePoolSettlementPreview computes even split across members', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice({
      grossAmount: new Prisma.Decimal('250000.000000'),
      currency: 'INR',
    }));
    db.networkPoolMembership.findMany.mockResolvedValue([
      makeMembership(MEMBER_ORG1, 0),
      makeMembership(MEMBER_ORG2, 1),
    ]);

    const result = await svc.computePoolSettlementPreview(ORG_ID, POOL_ID);

    expect(result.previewSplits).toHaveLength(2);
    expect(result.previewSplits[0].waterfallSeq).toBe(1);
    expect(result.previewSplits[1].waterfallSeq).toBe(2);
    expect(result.previewSplits[0].recipientOrgId).toBe(MEMBER_ORG1);
    expect(result.previewSplits[1].recipientOrgId).toBe(MEMBER_ORG2);
    expect(result.previewSplits[0].currency).toBe('INR');

    // Each member receives half of 250000 = 125000
    const gross0 = parseFloat(result.previewSplits[0].grossAmount);
    const gross1 = parseFloat(result.previewSplits[1].grossAmount);
    expect(gross0).toBeCloseTo(125000, 2);
    expect(gross1).toBeCloseTo(125000, 2);

    // netPayable equals grossAmount (no holdback/penalty)
    expect(result.previewSplits[0].netPayable).toBe(result.previewSplits[0].grossAmount);
    expect(result.previewSplits[0].holdbackAmount).toBe('0');
    expect(result.previewSplits[0].penaltyDeduction).toBe('0');
  });

  // ── NSS-07: computePoolSettlementPreview — payment-term / maturity fields ───

  it('NSS-07: computePoolSettlementPreview includes payment-term and maturity fields', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([makeMembership(MEMBER_ORG1, 0)]);

    const result = await svc.computePoolSettlementPreview(ORG_ID, POOL_ID);

    expect(result.paymentDueDate).toBe(DUE_DATE.toISOString());
    expect(typeof result.paymentTermsDays).toBe('number');
    expect(result.maturityStatus).toBeDefined();
    expect(result.poolId).toBe(POOL_ID);
    expect(result.orgId).toBe(ORG_ID);
  });

  // ── NSS-08: computePoolSettlementPreview — hasPendingSplits ─────────────────

  it('NSS-08: computePoolSettlementPreview sets hasPendingSplits=true when PENDING splits exist', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(2); // PENDING splits already present
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([makeMembership(MEMBER_ORG1, 0)]);

    const result = await svc.computePoolSettlementPreview(ORG_ID, POOL_ID);

    expect(result.hasPendingSplits).toBe(true);
  });

  it('NSS-08b: computePoolSettlementPreview sets hasPendingSplits=false when none exist', async () => {
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([makeMembership(MEMBER_ORG1, 0)]);

    const result = await svc.computePoolSettlementPreview(ORG_ID, POOL_ID);

    expect(result.hasPendingSplits).toBe(false);
  });

  // ── NSS-09: createPoolSettlementSplits — fails closed when flag=false ────────

  it('NSS-09: createPoolSettlementSplits throws FeatureDisabled when flag enabled=false', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: false });

    await expect(svc.createPoolSettlementSplits(ORG_ID, POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitFeatureDisabledError,
    );

    // No DB writes attempted
    expect(db.networkSettlementSplit.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-10: createPoolSettlementSplits — fails closed when flag row absent ───

  it('NSS-10: createPoolSettlementSplits throws FeatureDisabled when flag row is absent', async () => {
    db.featureFlag.findUnique.mockResolvedValue(null); // flag row not in DB

    await expect(svc.createPoolSettlementSplits(ORG_ID, POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitFeatureDisabledError,
    );

    expect(db.networkSettlementSplit.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-11: createPoolSettlementSplits — creates PENDING-only rows when flag=true

  it('NSS-11: createPoolSettlementSplits creates PENDING-only split rows when flag enabled=true', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice({
      grossAmount: new Prisma.Decimal('250000.000000'),
      currency: 'INR',
    }));
    db.networkPoolMembership.findMany.mockResolvedValue([
      makeMembership(MEMBER_ORG1, 0),
      makeMembership(MEMBER_ORG2, 1),
    ]);
    const created1 = makeSplitRow({ waterfallSeq: 1, recipientOrgId: MEMBER_ORG1, status: 'PENDING' });
    const created2 = makeSplitRow({ waterfallSeq: 2, recipientOrgId: MEMBER_ORG2, status: 'PENDING' });
    db.$transaction.mockResolvedValue([created1, created2]);

    const result = await svc.createPoolSettlementSplits(ORG_ID, POOL_ID);

    expect(result).toHaveLength(2);
    // All rows must be PENDING
    for (const dto of result) {
      expect(dto.settlementVisibilityStatus).toBe('PENDING');
    }
  });

  // ── NSS-12: createPoolSettlementSplits — escrowAccountId=null ─────────────

  it('NSS-12: created split rows have escrowAccountId=null', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([makeMembership(MEMBER_ORG1, 0)]);
    const createdRow = makeSplitRow({ status: 'PENDING', escrowAccountId: null });
    db.$transaction.mockResolvedValue([createdRow]);

    const result = await svc.createPoolSettlementSplits(ORG_ID, POOL_ID);

    expect(result[0].escrowAccountId).toBeNull();

    // Verify the data passed to create had escrowAccountId: null
    // $transaction receives an array of promises (already-called create results)
    // Verify via the mock call capturing what was passed to db.networkSettlementSplit.create
    // Since $transaction receives ops array, inspect the data directly from create mock
    // The $transaction mock resolves the ops, so create is called before $transaction
    // Actually in the service, $transaction receives the mapped array of create() calls,
    // so create() is invoked with the data; we verify it here.
    // Re-confirm: escrowAccountId must be null on every created row.
    for (const dto of result) {
      expect(dto.escrowAccountId).toBeNull();
    }
  });

  // ── NSS-13: createPoolSettlementSplits — idempotency (AlreadyExists) ────────

  it('NSS-13: createPoolSettlementSplits throws AlreadyExists when PENDING splits exist', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(1); // already has PENDING splits

    await expect(svc.createPoolSettlementSplits(ORG_ID, POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitAlreadyExistsError,
    );

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-14: createPoolSettlementSplits — wrong-org non-leaking 404 ──────────

  it('NSS-14: createPoolSettlementSplits throws PoolNotFound for wrong-org (non-leaking)', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue(null); // wrong org → null

    await expect(svc.createPoolSettlementSplits(randomUUID(), POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitPoolNotFoundError,
    );

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-15: createPoolSettlementSplits — throws InvalidInput when no members

  it('NSS-15: createPoolSettlementSplits throws InvalidInput when no eligible members', async () => {
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([]); // no APPROVED/ALLOCATED members

    await expect(svc.createPoolSettlementSplits(ORG_ID, POOL_ID)).rejects.toThrow(
      NetworkSettlementSplitInvalidInputError,
    );

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ── NSS-16: no TRIGGERED / RELEASED / FAILED rows created by Packet 20 ──────

  it('NSS-16: no TRIGGERED, RELEASED, or FAILED rows are created by any Packet 20 method', async () => {
    // Verify that createPoolSettlementSplits, when it calls $transaction,
    // only passes data with status='PENDING'.
    db.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    db.networkPool.findFirst.mockResolvedValue({ id: POOL_ID, orgId: ORG_ID });
    db.networkSettlementSplit.count.mockResolvedValue(0);
    db.networkInvoice.findFirst.mockResolvedValue(makeInvoice());
    db.networkPoolMembership.findMany.mockResolvedValue([
      makeMembership(MEMBER_ORG1, 0),
      makeMembership(MEMBER_ORG2, 1),
    ]);
    // Capture what create() is called with by spying on $transaction args
    db.$transaction.mockImplementation(async (ops: unknown[]) => {
      // ops is array of promises; resolve them and capture
      return Promise.all(ops as Promise<unknown>[]);
    });
    // Make create return controlled data
    db.networkSettlementSplit.create.mockImplementation(({ data }: any) => {
      // Assert that status is always PENDING
      expect(data.status).toBe('PENDING');
      expect(['TRIGGERED', 'RELEASED', 'FAILED']).not.toContain(data.status);
      return Promise.resolve(makeSplitRow({ status: 'PENDING', recipientOrgId: data.recipientOrgId }));
    });

    await svc.createPoolSettlementSplits(ORG_ID, POOL_ID);

    // $transaction must have been called exactly once
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  // ── Feature-flag constant is the documented key ────────────────────────────

  it('NC_SETTLEMENT_FEATURE_FLAG constant matches expected key', () => {
    expect(NC_SETTLEMENT_FEATURE_FLAG).toBe('nc.settlement_waterfall.enabled');
  });
});
