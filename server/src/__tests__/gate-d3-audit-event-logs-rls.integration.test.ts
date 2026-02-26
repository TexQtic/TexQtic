/**
 * GATE D.3: Constitutional RLS Verification — audit_logs + event_logs
 *
 * Tests ledger-adjacent immutability + isolation enforcement for audit/event logs.
 *
 * DOCTRINE v1.4 ENFORCEMENT:
 * - Org boundary: tenant_id = app.current_org_id() (uuid match)
 * - Fail-closed: Access denied without proper org context
 * - Immutability: UPDATE/DELETE operations are DENIED by policy absence
 * - Pooler-safe: Context isolation across sequential transactions
 * - Bypass: Test-only triple-gated (NODE_ENV=test + bypass_rls=on + realm=test + roles=TEST_SEED)
 *
 * TABLE COVERAGE:
 * - audit_logs: Immutable audit trail (tenant boundary: tenant_id)
 * - event_logs: Immutable event stream (tenant boundary: tenant_id)
 *
 * TEST STRUCTURE:
 * - Deterministic: Unique UUIDs per test run (testRunId-based)
 * - Bypass-gated seeding: withBypassForSeed (triple-gate verified)
 * - Tag-based cleanup: testRunId prefix enables multi-run safety
 * - Sequential execution: --no-file-parallelism --maxWorkers=1 (required)
 *
 * VERIFICATION PROTOCOL:
 * - Run 3 consecutive times (all tests must pass)
 * - Run C.2 regression once (tenants remain conformant)
 * - No .env modifications allowed
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb } from './helpers/dbGate.js';
import { prisma } from '../db/prisma.js';
import { randomUUID } from 'node:crypto';
import { withDbContext, withBypassForSeed, type DatabaseContext } from '../lib/database-context.js';

// Test run ID (unique per execution)
const testRunId = randomUUID();

// Deterministic IDs (constructed with test-run prefix for cleanup and uniqueness)
// Use proper UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (hex chars only: 0-9, a-f)
const orgAId = `0000aa${testRunId.slice(6)}`; // Org A UUID (hex chars only)
const orgBId = `0000bb${testRunId.slice(6)}`; // Org B UUID
const userAId = `00000a${testRunId.slice(6)}`; // User A UUID (hex-compliant)
const userBId = `00000b${testRunId.slice(6)}`; // User B UUID (hex-compliant)
const auditLogAId = `aaaa01${testRunId.slice(6)}`; // Audit log A UUID
const auditLogBId = `bbbb01${testRunId.slice(6)}`; // Audit log B UUID
const eventLogAId = `0eee01${testRunId.slice(6)}`; // Event log A UUID
const eventLogBId = `0eee02${testRunId.slice(6)}`; // Event log B UUID

// Tracking created records for cleanup
const createdIds = {
  tenants: new Set<string>(),
  users: new Set<string>(),
  auditLogs: new Set<string>(),
  eventLogs: new Set<string>(),
};

describe.skipIf(!hasDb)('Gate D.3: RLS Enforcement — audit_logs + event_logs', () => {
  beforeAll(async () => {
    console.log(`[Gate D.3] Test run ID: ${testRunId}`);
    console.log(`[Gate D.3] Org A: ${orgAId}, Org B: ${orgBId}`);
  });

  afterAll(async () => {
    // Cleanup: Delete all created records (bypass-gated)
    await withBypassForSeed(prisma, async tx => {
      // Delete event logs first (no FK dependencies)
      if (createdIds.eventLogs.size > 0) {
        await tx.eventLog.deleteMany({
          where: { id: { in: Array.from(createdIds.eventLogs) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.eventLogs.size} event logs`);
      }

      // Delete audit logs
      if (createdIds.auditLogs.size > 0) {
        await tx.auditLog.deleteMany({
          where: { id: { in: Array.from(createdIds.auditLogs) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.auditLogs.size} audit logs`);
      }

      // Delete users
      if (createdIds.users.size > 0) {
        await tx.user.deleteMany({
          where: { id: { in: Array.from(createdIds.users) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.users.size} users`);
      }

      // Delete tenants
      if (createdIds.tenants.size > 0) {
        await tx.tenant.deleteMany({
          where: { id: { in: Array.from(createdIds.tenants) } },
        });
        console.log(`[Cleanup] Deleted ${createdIds.tenants.size} tenants`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Test Group: Tenant Isolation — audit_logs
  // --------------------------------------------------------------------------

  describe('Tenant Isolation — audit_logs', () => {
    it('should isolate Org A audit logs from Org B', async () => {
      // Seed: Create Org A + B with audit logs
      await withBypassForSeed(prisma, async tx => {
        await tx.tenant.createMany({
          data: [
            {
              id: orgAId,
              slug: `org-a-${testRunId.slice(0, 8)}`,
              name: 'Org A',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
            {
              id: orgBId,
              slug: `org-b-${testRunId.slice(0, 8)}`,
              name: 'Org B',
              type: 'B2B',
              status: 'ACTIVE',
              plan: 'FREE',
            },
          ],
        });
        createdIds.tenants.add(orgAId);
        createdIds.tenants.add(orgBId);

        await tx.user.createMany({
          data: [
            {
              id: userAId,
              email: `d3-a-${testRunId.slice(0, 8)}@test.local`,
              passwordHash: 'hash',
            },
            {
              id: userBId,
              email: `d3-b-${testRunId.slice(0, 8)}@test.local`,
              passwordHash: 'hash',
            },
          ],
        });
        createdIds.users.add(userAId);
        createdIds.users.add(userBId);

        await tx.auditLog.createMany({
          data: [
            {
              id: auditLogAId,
              realm: 'TENANT',
              tenantId: orgAId,
              actorId: userAId,
              actorType: 'USER',
              action: 'TEST_ACTION_A',
              entity: 'test',
            },
            {
              id: auditLogBId,
              realm: 'TENANT',
              tenantId: orgBId,
              actorId: userBId,
              actorType: 'USER',
              action: 'TEST_ACTION_B',
              entity: 'test',
            },
          ],
        });
        createdIds.auditLogs.add(auditLogAId);
        createdIds.auditLogs.add(auditLogBId);
      });

      // Query as Org A: Should see only Org A audit log
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const logsA = await withDbContext(prisma, contextA, async tx => {
        return await tx.auditLog.findMany({
          where: { action: { startsWith: 'TEST_ACTION' } },
        });
      });

      expect(logsA).toHaveLength(1);
      expect(logsA[0].id).toBe(auditLogAId);
      expect(logsA[0].tenantId).toBe(orgAId);

      // Query as Org B: Should see only Org B audit log
      const contextB: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const logsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.auditLog.findMany({
          where: { action: { startsWith: 'TEST_ACTION' } },
        });
      });

      expect(logsB).toHaveLength(1);
      expect(logsB[0].id).toBe(auditLogBId);
      expect(logsB[0].tenantId).toBe(orgBId);
    }, 30000);

    it('should deny INSERT with wrong tenant context', async () => {
      // Seed: Org A already exists from previous test
      const wrongLogId = `aaaa99${testRunId.slice(6)}`;

      // Attempt: Insert Org A log with Org B context
      const contextB: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextB, async tx => {
          return await tx.auditLog.create({
            data: {
              id: wrongLogId,
              realm: 'TENANT',
              tenantId: orgAId, // Trying to insert Org A log with Org B context
              actorId: userBId,
              actorType: 'USER',
              action: 'CROSS_TENANT_ATTEMPT',
              entity: 'test',
            },
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Test Group: Tenant Isolation — event_logs
  // --------------------------------------------------------------------------

  describe('Tenant Isolation — event_logs', () => {
    it('should isolate Org A event logs from Org B', async () => {
      // Seed: Create event logs for Org A + B
      await withBypassForSeed(prisma, async tx => {
        await tx.eventLog.createMany({
          data: [
            {
              id: eventLogAId,
              version: 'v1',
              name: 'test.EVENT_A',
              occurredAt: new Date(),
              tenantId: orgAId,
              realm: 'TENANT',
              actorType: 'USER',
              actorId: userAId,
              entityType: 'test',
              entityId: orgAId,
              auditLogId: auditLogAId,
            },
            {
              id: eventLogBId,
              version: 'v1',
              name: 'test.EVENT_B',
              occurredAt: new Date(),
              tenantId: orgBId,
              realm: 'TENANT',
              actorType: 'USER',
              actorId: userBId,
              entityType: 'test',
              entityId: orgBId,
              auditLogId: auditLogBId,
            },
          ],
        });
        createdIds.eventLogs.add(eventLogAId);
        createdIds.eventLogs.add(eventLogBId);
      });

      // Query as Org A: Should see only Org A event
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const eventsA = await withDbContext(prisma, contextA, async tx => {
        return await tx.eventLog.findMany({
          where: { name: { startsWith: 'test.EVENT' } },
        });
      });

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].id).toBe(eventLogAId);
      expect(eventsA[0].tenantId).toBe(orgAId);

      // Query as Org B: Should see only Org B event
      const contextB: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const eventsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.eventLog.findMany({
          where: { name: { startsWith: 'test.EVENT' } },
        });
      });

      expect(eventsB).toHaveLength(1);
      expect(eventsB[0].id).toBe(eventLogBId);
      expect(eventsB[0].tenantId).toBe(orgBId);
    }, 30000);

    it('should deny INSERT event log to tenant owned by different tenant', async () => {
      const wrongEventId = `0eee99${testRunId.slice(6)}`;

      // Attempt: Insert Org A event with Org B context
      const contextB: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextB, async tx => {
          return await tx.eventLog.create({
            data: {
              id: wrongEventId,
              version: 'v1',
              name: 'test.CROSS_TENANT',
              occurredAt: new Date(),
              tenantId: orgAId, // Trying to insert Org A event with Org B context
              realm: 'TENANT',
              actorType: 'USER',
              actorId: userBId,
              entityType: 'test',
              entityId: orgAId,
              auditLogId: auditLogAId,
            },
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Test Group: Immutability Enforcement (UPDATE/DELETE denied)
  // --------------------------------------------------------------------------

  describe('Immutability Enforcement', () => {
    it('should deny UPDATE on audit_logs (immutable ledger)', async () => {
      // Attempt: Update existing audit log (should be denied)
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextA, async tx => {
          return await tx.auditLog.update({
            where: { id: auditLogAId },
            data: { action: 'MODIFIED_ACTION' }, // Attempt to modify
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);

    it('should deny DELETE on audit_logs (immutable ledger)', async () => {
      // Attempt: Delete existing audit log (should be denied)
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextA, async tx => {
          return await tx.auditLog.delete({
            where: { id: auditLogAId },
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);

    it('should deny UPDATE on event_logs (immutable event stream)', async () => {
      // Attempt: Update existing event log (should be denied)
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextA, async tx => {
          return await tx.eventLog.update({
            where: { id: eventLogAId },
            data: { name: 'test.MODIFIED_EVENT' }, // Attempt to modify
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);

    it('should deny DELETE on event_logs (immutable event stream)', async () => {
      // Attempt: Delete existing event log (should be denied)
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      await expect(
        withDbContext(prisma, contextA, async tx => {
          return await tx.eventLog.delete({
            where: { id: eventLogAId },
          });
        })
      ).rejects.toThrow(/violates row-level security policy|permission denied/i);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Test Group: Fail-Closed Enforcement
  // --------------------------------------------------------------------------

  describe('Fail-Closed Enforcement', () => {
    it('should return zero rows when querying with non-existent tenant context', async () => {
      const nonExistentOrgId = `9999ff${testRunId.slice(6)}`;
      const nonExistentUserId = `9999uu${testRunId.slice(6)}`;

      // Attempt: Query with non-existent tenant context
      const contextNonExistent: DatabaseContext = {
        orgId: nonExistentOrgId,
        actorId: nonExistentUserId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      const auditLogs = await withDbContext(prisma, contextNonExistent, async tx => {
        return await tx.auditLog.findMany();
      });

      const eventLogs = await withDbContext(prisma, contextNonExistent, async tx => {
        return await tx.eventLog.findMany();
      });

      // RLS denies: no rows visible when tenant context doesn't match any data
      expect(auditLogs).toHaveLength(0);
      expect(eventLogs).toHaveLength(0);
    }, 30000);
  });

  // --------------------------------------------------------------------------
  // Test Group: Pooler Safety — Context Isolation
  // --------------------------------------------------------------------------

  describe('Pooler Safety — Context Isolation', () => {
    it('should isolate context between sequential transactions (Org A → Org B → Org A)', async () => {
      // Context for Org A
      const contextA: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      // Context for Org B
      const contextB: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: randomUUID(),
      };

      // Transaction 1: Org A - Should see only Org A logs
      const logsA1 = await withDbContext(prisma, contextA, async tx => {
        return await tx.auditLog.findMany({
          where: { action: { startsWith: 'TEST_ACTION' } },
        });
      });

      expect(logsA1).toHaveLength(1);
      expect(logsA1[0].tenantId).toBe(orgAId);

      // Transaction 2: Org B - Should see only Org B logs (no context bleed from Org A)
      const logsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.auditLog.findMany({
          where: { action: { startsWith: 'TEST_ACTION' } },
        });
      });

      expect(logsB).toHaveLength(1);
      expect(logsB[0].tenantId).toBe(orgBId);

      // Transaction 3: Org A again - Should still see only Org A logs (no context bleed from Org B)
      const logsA2 = await withDbContext(prisma, contextA, async tx => {
        return await tx.auditLog.findMany({
          where: { action: { startsWith: 'TEST_ACTION' } },
        });
      });

      expect(logsA2).toHaveLength(1);
      expect(logsA2[0].tenantId).toBe(orgAId);

      // Verify event logs as well
      const eventsA = await withDbContext(prisma, contextA, async tx => {
        return await tx.eventLog.findMany({
          where: { name: { startsWith: 'test.EVENT' } },
        });
      });

      const eventsB = await withDbContext(prisma, contextB, async tx => {
        return await tx.eventLog.findMany({
          where: { name: { startsWith: 'test.EVENT' } },
        });
      });

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].tenantId).toBe(orgAId);
      expect(eventsB).toHaveLength(1);
      expect(eventsB[0].tenantId).toBe(orgBId);
    }, 30000);
  });
});
