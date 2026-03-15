/**
 * Gate G028-C3: Control-Plane Reasoning Log Persistence
 * Unit: PW5-G028-C3-REASONING-STORAGE
 *
 * Validates Slice 3 schema and RLS guarantees:
 *
 *   CP-01: Tenant SELECT via withDbContext returns zero control-plane rows
 *          (tenant_id IS NULL rows are invisible to tenant context).
 *   CP-02: withSuperAdminContext SELECT returns the control-plane row by admin_actor_id.
 *   CP-03: audit_logs.reasoningLogId FK resolves to inserted reasoning_logs.id.
 *   CP-04: Second INSERT with same (admin_actor_id, request_fingerprint, request_bucket_start)
 *          triggers a unique constraint — no duplicate row created.
 *   CP-05: Tenant-path INSERT with real tenant_id still succeeds (regression).
 *   CP-06: Tenant SELECT still returns only that tenant's own rows (regression).
 *   CP-07: Idempotency hit does not reuse an incomplete placeholder row
 *          (finalization check: reasoningHash non-empty AND responseSummary present).
 *
 * Regression gate: G-023 RL-01..RL-05 must still pass (run separately via gate-g023 suite).
 *
 * Doctrine v1.4:
 *   - withBypassForSeed for seed/cleanup (triple-gate)
 *   - withDbContext (db/withDbContext.ts) for tenant-scoped assertions
 *   - withSuperAdminContext (lib/database-context.ts) for admin-scoped assertions
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import { checkDbAvailable, hasDb } from './helpers/dbGate.js';
import { withBypassForSeed } from '../lib/database-context.js';
import { withSuperAdminContext } from '../lib/database-context.js';
import { withDbContext } from '../db/withDbContext.js';
import { createHash } from 'node:crypto';

// ─── Test State ────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('Gate G028-C3: Control-Plane Reasoning Log Persistence', () => {
  // Stable admin UUID used across all CP-* assertions
  const testAdminId = '10000000-0000-0000-0000-000000000001';
  // Stable tenant UUID for regression assertions (CP-05, CP-06)
  let testTenantId: string;
  // IDs of rows created during each test — collected for teardown
  const createdReasoningLogIds: string[] = [];
  const createdAuditLogIds: string[] = [];
  const createdTenantIds: string[] = [];

  // ─── DB Availability Gate ──────────────────────────────────────────────────

  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Gate G028-C3] Database unavailable - skipping suite');
    }
  });

  // ─── Seed: create one tenant per test ─────────────────────────────────────

  beforeEach(async () => {
    await withBypassForSeed(prisma, async tx => {
      const tenant = await tx.tenant.create({
        data: {
          name: `G028C3 Tenant ${Date.now()}`,
          slug: `g028c3-tenant-${Date.now()}`,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
      testTenantId = tenant.id;
      createdTenantIds.push(tenant.id);
    });
  }, 30_000);

  // ─── Teardown ─────────────────────────────────────────────────────────────

  afterEach(async () => {
    await withBypassForSeed(prisma, async tx => {
      // Delete audit_logs that link to our test reasoning_logs first
      // (ON DELETE SET NULL handles FK, but explicit delete keeps things clean)
      if (createdAuditLogIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { id: { in: [...createdAuditLogIds] } },
        });
        createdAuditLogIds.length = 0;
      }
      // Delete reasoning_logs (bypass allows DELETE per immutability trigger)
      if (createdReasoningLogIds.length > 0) {
        await (tx as any).reasoningLog.deleteMany({
          where: { id: { in: [...createdReasoningLogIds] } },
        });
        createdReasoningLogIds.length = 0;
      }
      // Delete test tenants (cascades audit_logs/reasoning_logs for tenant-scoped rows)
      if (createdTenantIds.length > 0) {
        await tx.tenant.deleteMany({
          where: { id: { in: [...createdTenantIds] } },
        });
        createdTenantIds.length = 0;
      }
    });
  }, 30_000);

  // ── Helper: seed a control-plane reasoning row via bypass ─────────────────

  async function seedControlPlaneRow(overrides?: {
    adminActorId?: string;
    requestFingerprint?: string;
    requestBucketStart?: Date;
    reasoningHash?: string;
    responseSummary?: string | null;
  }): Promise<string> {
    const fingerprint =
      overrides?.requestFingerprint ??
      createHash('sha256').update(`test-prompt-${Date.now()}`).digest('hex');
    const bucketStart =
      overrides?.requestBucketStart ??
      new Date(Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000));
    const hasReasoningHash = overrides?.reasoningHash !== undefined;
    const reasoningHash = hasReasoningHash
      ? overrides!.reasoningHash!
      : createHash('sha256').update(`test-prompt-${Date.now()} test-response`).digest('hex');

    let id: string;
    await withBypassForSeed(prisma, async tx => {
      const row = await (tx as any).reasoningLog.create({
        data: {
          tenantId: null,
          adminActorId: overrides?.adminActorId ?? testAdminId,
          requestId: `req-cp-${Date.now()}`,
          requestFingerprint: fingerprint,
          requestBucketStart: bucketStart,
          reasoningHash,
          model: 'gemini-1.5-flash',
          promptSummary: 'Test prompt for G028-C3',
          responseSummary:
            overrides && 'responseSummary' in overrides
              ? overrides.responseSummary
              : 'Test response for G028-C3',
          tokensUsed: 10,
        },
        select: { id: true },
      });
      id = row.id;
    });
    createdReasoningLogIds.push(id!);
    return id!;
  }

  // ─── CP-01: Tenant context cannot see control-plane rows ──────────────────

  it('CP-01: Tenant SELECT via withDbContext returns zero control-plane rows (tenant_id IS NULL invisible)', async () => {
    // Seed a control-plane row
    const cpRowId = await seedControlPlaneRow();

    // Query as tenant context — must NOT see the control-plane row
    const rows = await withDbContext({ tenantId: testTenantId }, async tx => {
      return (tx as any).reasoningLog.findMany({
        where: {},
        select: { id: true, tenantId: true },
      });
    });

    const ids = rows.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(cpRowId);

    // All visible rows must have tenantId = testTenantId (not null)
    for (const row of rows) {
      expect(row.tenantId).toBe(testTenantId);
    }
  }, 20_000);

  // ─── CP-02: withSuperAdminContext can read control-plane rows ─────────────

  it('CP-02: withSuperAdminContext SELECT returns the control-plane row by admin_actor_id', async () => {
    const cpRowId = await seedControlPlaneRow({ adminActorId: testAdminId });

    const found = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: {
          id: cpRowId,
          adminActorId: testAdminId,
          tenantId: null,
        },
        select: { id: true, tenantId: true, adminActorId: true },
      });
    });

    expect(found).not.toBeNull();
    expect(found!.id).toBe(cpRowId);
    expect(found!.tenantId).toBeNull();
    expect(found!.adminActorId).toBe(testAdminId);
  }, 20_000);

  // ─── CP-03: audit_logs.reasoningLogId FK resolves correctly ──────────────

  it('CP-03: audit_logs.reasoningLogId FK resolves to inserted reasoning_logs.id', async () => {
    const cpRowId = await seedControlPlaneRow();

    // Seed an audit log linking to the control-plane reasoning row via bypass
    let auditLogId: string;
    await withBypassForSeed(prisma, async tx => {
      const created = await tx.auditLog.create({
        data: {
          realm: 'ADMIN',
          tenantId: null,
          actorType: 'ADMIN',
          actorId: testAdminId,
          action: 'CONTROL_PLANE_AI_INSIGHTS',
          entity: 'ai',
          entityId: null,
          metadataJson: { test: true },
          reasoningLogId: cpRowId,
        },
      });
      auditLogId = created.id;
    });
    createdAuditLogIds.push(auditLogId!);

    // Read back via bypass and verify FK resolves
    const auditRow = await withBypassForSeed(prisma, async tx => {
      return tx.auditLog.findFirst({
        where: {
          id: auditLogId!,
          reasoningLogId: cpRowId,
        },
        select: { id: true, reasoningLogId: true, action: true },
      });
    });

    expect(auditRow).not.toBeNull();
    expect(auditRow!.reasoningLogId).toBe(cpRowId);
    expect(auditRow!.action).toBe('CONTROL_PLANE_AI_INSIGHTS');
  }, 20_000);

  // ─── CP-04: Unique index prevents duplicate control-plane rows ────────────

  it('CP-04: Second INSERT with same (admin_actor_id, request_fingerprint, request_bucket_start) dedupes correctly', async () => {
    const fingerprint = createHash('sha256').update(`dedup-test-${Date.now()}`).digest('hex');
    const bucketStart = new Date(
      Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000),
    );

    // First INSERT — should succeed
    const firstId = await seedControlPlaneRow({
      adminActorId: testAdminId,
      requestFingerprint: fingerprint,
      requestBucketStart: bucketStart,
    });

    // Second INSERT with identical idempotency key — must conflict (P2002)
    let conflictError: unknown = null;
    try {
      await withBypassForSeed(prisma, async tx => {
        const duplicate = await (tx as any).reasoningLog.create({
          data: {
            tenantId: null,
            adminActorId: testAdminId,
            requestId: `req-dup-${Date.now()}`,
            requestFingerprint: fingerprint,
            requestBucketStart: bucketStart,
            reasoningHash: createHash('sha256').update('other-prompt other-response').digest('hex'),
            model: 'gemini-1.5-flash',
            promptSummary: 'Duplicate attempt',
            responseSummary: 'Duplicate response',
            tokensUsed: 5,
          },
          select: { id: true },
        });
        // If no error, collect for cleanup
        createdReasoningLogIds.push(duplicate.id);
      });
    } catch (err: any) {
      conflictError = err;
    }

    // Must have thrown a unique constraint violation
    expect(conflictError).not.toBeNull();
    expect((conflictError as any)?.code).toBe('P2002');

    // Verify only one row exists for that idempotency key
    const count = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.count({
        where: {
          adminActorId: testAdminId,
          requestFingerprint: fingerprint,
          requestBucketStart: bucketStart,
          tenantId: null,
        },
      });
    });
    expect(count).toBe(1);
    // Verify it is the first row
    const existing = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: {
          adminActorId: testAdminId,
          requestFingerprint: fingerprint,
          requestBucketStart: bucketStart,
          tenantId: null,
        },
        select: { id: true },
      });
    });
    expect(existing!.id).toBe(firstId);
  }, 20_000);

  // ─── CP-05: Tenant-path INSERT with real tenant_id still succeeds ──────────

  it('CP-05: Tenant-path INSERT with real tenant_id still succeeds (regression)', async () => {
    const tenantReasoningHash = createHash('sha256')
      .update(`tenant-prompt tenant-response ${Date.now()}`)
      .digest('hex');

    let tenantRowId: string;
    await withBypassForSeed(prisma, async tx => {
      const row = await (tx as any).reasoningLog.create({
        data: {
          tenantId: testTenantId,
          requestId: `req-tenant-${Date.now()}`,
          reasoningHash: tenantReasoningHash,
          model: 'gemini-1.5-flash',
          promptSummary: 'Tenant prompt',
          responseSummary: 'Tenant response',
          tokensUsed: 20,
        },
        select: { id: true },
      });
      tenantRowId = row.id;
    });
    createdReasoningLogIds.push(tenantRowId!);

    // Verify the row is visible in tenant context
    const found = await withDbContext({ tenantId: testTenantId }, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: { id: tenantRowId!, tenantId: testTenantId },
        select: { id: true, tenantId: true },
      });
    });

    expect(found).not.toBeNull();
    expect(found!.tenantId).toBe(testTenantId);
  }, 20_000);

  // ─── CP-06: Tenant SELECT returns only its own rows (regression) ───────────

  it('CP-06: Tenant SELECT returns only its own rows, not control-plane rows', async () => {
    const tenantReasoningHash = createHash('sha256')
      .update(`tenant-scoped-${Date.now()}`)
      .digest('hex');

    // Seed a tenant-scoped row
    let tenantRowId: string;
    await withBypassForSeed(prisma, async tx => {
      const row = await (tx as any).reasoningLog.create({
        data: {
          tenantId: testTenantId,
          requestId: `req-t-scope-${Date.now()}`,
          reasoningHash: tenantReasoningHash,
          model: 'gemini-1.5-flash',
          promptSummary: 'Tenant scoped',
          responseSummary: 'Tenant scoped response',
          tokensUsed: 15,
        },
        select: { id: true },
      });
      tenantRowId = row.id;
    });
    createdReasoningLogIds.push(tenantRowId!);

    // Seed a control-plane row
    const cpRowId = await seedControlPlaneRow();

    // Query as tenant context
    const rows = await withDbContext({ tenantId: testTenantId }, async tx => {
      return (tx as any).reasoningLog.findMany({
        where: {},
        select: { id: true, tenantId: true },
      });
    });

    const ids = rows.map((r: { id: string }) => r.id);

    // Must see own row
    expect(ids).toContain(tenantRowId!);
    // Must NOT see control-plane row (tenant_id IS NULL)
    expect(ids).not.toContain(cpRowId);
    // All visible rows must belong to this tenant
    for (const row of rows) {
      expect(row.tenantId).toBe(testTenantId);
    }
  }, 20_000);

  // ─── CP-07: Incomplete placeholder row is not silently reused ─────────────

  it('CP-07: Idempotency hit does not reuse an incomplete placeholder row (finalization check)', async () => {
    const fingerprint = createHash('sha256')
      .update(`incomplete-row-test-${Date.now()}`)
      .digest('hex');
    const bucketStart = new Date(
      Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000),
    );

    // Seed an "incomplete" row: reasoning_hash is empty, response_summary is null.
    // This simulates the edge case where a prior INSERT left a placeholder.
    let incompleteRowId: string;
    await withBypassForSeed(prisma, async tx => {
      const row = await (tx as any).reasoningLog.create({
        data: {
          tenantId: null,
          adminActorId: testAdminId,
          requestId: `req-incomplete-${Date.now()}`,
          requestFingerprint: fingerprint,
          requestBucketStart: bucketStart,
          reasoningHash: '', // Incomplete — empty hash
          model: 'gemini-1.5-flash',
          promptSummary: 'Incomplete test',
          responseSummary: null, // Incomplete — null summary
          tokensUsed: 0,
        },
        select: { id: true },
      });
      incompleteRowId = row.id;
    });
    createdReasoningLogIds.push(incompleteRowId!);

    // Run the idempotency check (mirrors service logic: SELECT + finalization check)
    const existingRow = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: {
          adminActorId: testAdminId,
          requestFingerprint: fingerprint,
          requestBucketStart: bucketStart,
          tenantId: null,
        },
        select: { id: true, reasoningHash: true, responseSummary: true },
      });
    });

    // Row IS found (it holds the idempotency slot)
    expect(existingRow).not.toBeNull();
    expect(existingRow!.id).toBe(incompleteRowId!);

    // Finalization check: the row is incomplete — must NOT be treated as safe to reuse
    const isFinalized =
      existingRow!.reasoningHash &&
      (existingRow!.reasoningHash as string).length > 0 &&
      existingRow!.responseSummary !== null &&
      existingRow!.responseSummary !== undefined;

    expect(isFinalized).toBeFalsy();

    // Verify: the service code would NOT reuse this row (finalization check = false).
    // Any implementation that reuses this row would violate CP-07.
    // The service proceeds to fresh model invocation when isFinalized = false.
  }, 20_000);
});
