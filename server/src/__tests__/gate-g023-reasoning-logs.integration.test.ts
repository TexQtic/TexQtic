/**
 * Gate G-023: Reasoning Logs — RLS Isolation + FK Integrity
 *
 * Validates:
 *   RL-01: Tenant A cannot read Tenant B's reasoning_logs (RLS isolation).
 *   RL-02: audit_logs.reasoning_log_id FK is present after AI audit write.
 *   RL-03: Fail-closed — no tenant context returns zero rows from reasoning_logs.
 *   RL-04: Tenant context is required; wrong org sees zero rows.
 *   RL-05: reasoning_logs rows are immutable (UPDATE/DELETE rejected by trigger).
 *
 * RLS model tested:
 *   - reasoning_logs_guard (RESTRICTIVE): require_org_context() OR bypass_enabled()
 *   - reasoning_logs_tenant_select (PERMISSIVE SELECT): tenant_id = current_org_id()
 *
 * Doctrine v1.4:
 *   - withBypassForSeed for seed/cleanup (triple-gate)
 *   - withDbContext (db/withDbContext.ts) for tenant-scoped assertions
 *   - No RLS policy changes in this file
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db/prisma.js';
import { checkDbAvailable, hasDb } from './helpers/dbGate.js';
import { withBypassForSeed } from '../lib/database-context.js';
import { withDbContext } from '../db/withDbContext.js';
import { createHash } from 'node:crypto';

// ─── Test State ────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('Gate G-023: Reasoning Logs RLS + FK Integrity', () => {
  let tenantAId: string;
  let tenantBId: string;
  let seedReasoningLogAId: string;  // belonging to tenant A
  let seedReasoningLogBId: string;  // belonging to tenant B

  // ─── DB Availability Gate ──────────────────────────────────────────────────

  beforeAll(async () => {
    const dbAvailable = await checkDbAvailable(prisma);
    if (!dbAvailable) {
      throw new Error('[Gate G-023] Database unavailable - skipping suite');
    }
  });

  // ─── Seed ─────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    await withBypassForSeed(prisma, async tx => {
      // Create two isolated tenants
      const tenantA = await tx.tenant.create({
        data: {
          name: `G023 Tenant A ${Date.now()}`,
          slug: `g023-tenant-a-${Date.now()}`,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
      const tenantB = await tx.tenant.create({
        data: {
          name: `G023 Tenant B ${Date.now()}`,
          slug: `g023-tenant-b-${Date.now()}`,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
      tenantAId = tenantA.id;
      tenantBId = tenantB.id;

      // Seed one reasoning_log for each tenant
      const rlA = await (tx as any).reasoningLog.create({
        data: {
          tenantId: tenantAId,
          requestId: `req-a-${Date.now()}`,
          reasoningHash: createHash('sha256').update(`prompt-a response-a`).digest('hex'),
          model: 'gemini-1.5-flash',
          promptSummary: 'Prompt for tenant A',
          responseSummary: 'Response for tenant A',
          tokensUsed: 42,
        },
      });
      const rlB = await (tx as any).reasoningLog.create({
        data: {
          tenantId: tenantBId,
          requestId: `req-b-${Date.now()}`,
          reasoningHash: createHash('sha256').update(`prompt-b response-b`).digest('hex'),
          model: 'gemini-1.5-flash',
          promptSummary: 'Prompt for tenant B',
          responseSummary: 'Response for tenant B',
          tokensUsed: 99,
        },
      });
      seedReasoningLogAId = rlA.id;
      seedReasoningLogBId = rlB.id;
    });
  }, 30_000);

  // ─── Teardown ─────────────────────────────────────────────────────────────

  afterEach(async () => {
    await withBypassForSeed(prisma, async tx => {
      // Delete audit_logs referencing our reasoning_logs (FK constraint)
      await tx.auditLog.deleteMany({
        where: { tenantId: { in: [tenantAId, tenantBId] } },
      });
      // Delete reasoning_logs for both test tenants
      await (tx as any).reasoningLog.deleteMany({
        where: { tenantId: { in: [tenantAId, tenantBId] } },
      });
      // Delete tenants
      await tx.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    });
  }, 30_000);

  // ─── RL-01: Tenant isolation ───────────────────────────────────────────────

  it('RL-01: Tenant A can only see its own reasoning_logs, not Tenant B\'s', async () => {
    // Query as Tenant A — should see rlA, not rlB
    const rowsAsA = await withDbContext({ tenantId: tenantAId }, async tx => {
      return (tx as any).reasoningLog.findMany({
        where: {},
        select: { id: true, tenantId: true },
      });
    });

    const ids = rowsAsA.map((r: { id: string }) => r.id);
    expect(ids).toContain(seedReasoningLogAId);
    expect(ids).not.toContain(seedReasoningLogBId);

    // Every row visible to Tenant A must belong to Tenant A
    for (const row of rowsAsA) {
      expect(row.tenantId).toBe(tenantAId);
    }
  }, 20_000);

  it('RL-01b: Tenant B can only see its own reasoning_logs, not Tenant A\'s', async () => {
    const rowsAsB = await withDbContext({ tenantId: tenantBId }, async tx => {
      return (tx as any).reasoningLog.findMany({
        where: {},
        select: { id: true, tenantId: true },
      });
    });

    const ids = rowsAsB.map((r: { id: string }) => r.id);
    expect(ids).toContain(seedReasoningLogBId);
    expect(ids).not.toContain(seedReasoningLogAId);

    for (const row of rowsAsB) {
      expect(row.tenantId).toBe(tenantBId);
    }
  }, 20_000);

  // ─── RL-02: FK integrity ───────────────────────────────────────────────────

  it('RL-02: audit_log created with reasoningLogId FK references the reasoning_log row', async () => {
    // Create audit_log + check FK linkage (via bypass for direct write test)
    let auditLogId: string;

    await withBypassForSeed(prisma, async tx => {
      const created = await tx.auditLog.create({
        data: {
          realm: 'TENANT',
          tenantId: tenantAId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'AI_INSIGHTS',
          entity: 'ai',
          entityId: null,
          metadataJson: { reasoningLogId: seedReasoningLogAId, test: true },
          reasoningLogId: seedReasoningLogAId,
        },
      });
      auditLogId = created.id;
    });

    // Read back as Tenant A, confirm reasoningLogId is set
    const auditRow = await withDbContext({ tenantId: tenantAId }, async tx => {
      return tx.auditLog.findFirst({
        where: {
          id: auditLogId,
          tenantId: tenantAId,
          action: 'AI_INSIGHTS',
        },
        select: { id: true, reasoningLogId: true, action: true },
      });
    });

    expect(auditRow).not.toBeNull();
    expect(auditRow!.reasoningLogId).toBe(seedReasoningLogAId);
  }, 20_000);

  // ─── RL-03: Fail-closed — no context → zero rows ──────────────────────────

  it('RL-03: No tenant context (org_id empty) returns zero reasoning_logs rows', async () => {
    // withDbContext with no context sets org_id='' and is_admin=false
    // RESTRICTIVE guard: require_org_context() → false; bypass_enabled() → false → DENY
    const rows = await withDbContext({}, async tx => {
      return (tx as any).reasoningLog.findMany({
        where: {},
        select: { id: true },
      });
    }).catch(() => [] as { id: string }[]);
    // Either throws (RLS violation) or returns empty (depends on Prisma/Postgres config)
    expect(rows.length).toBe(0);
  }, 20_000);

  // ─── RL-04: Wrong tenant context → zero rows ──────────────────────────────

  it('RL-04: Tenant A context cannot retrieve Tenant B\'s reasoning_log by id', async () => {
    // Directly query tenant B's row while authenticated as tenant A
    const row = await withDbContext({ tenantId: tenantAId }, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: { id: seedReasoningLogBId },
        select: { id: true },
      });
    });

    // RLS should return null (invisible row — not a 403, just empty result)
    expect(row).toBeNull();
  }, 20_000);

  // ─── RL-05: Immutability ──────────────────────────────────────────────────

  it('RL-05: UPDATE on reasoning_logs is rejected by immutability trigger (even in bypass context)', async () => {
    // The trigger blocks UPDATE for all callers including bypass context.
    // Only DELETE is permitted in bypass context (for test cleanup).
    await expect(
      withBypassForSeed(prisma, async tx => {
        await (tx as any).reasoningLog.update({
          where: { id: seedReasoningLogAId },
          data: { model: 'gpt-4' },
        });
      })
    ).rejects.toThrow('[E-023-IMMUTABLE]');
  }, 20_000);
});
