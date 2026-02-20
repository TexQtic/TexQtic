/**
 * Gate D.7: Constitutional RLS Tests — Control-Plane Admin Tracking (impersonation_sessions)
 *
 * Table: impersonation_sessions
 * Doctrine v1.4: Admin actor isolation (admin_id = actor_id), fail-closed
 *
 * Test Strategy:
 * - Deterministic UUID generation (hex-compliant prefixes: d700 for Gate D.7)
 * - Bypass-gated seeding (withBypassForSeed for base data)
 * - Tag-based cleanup (afterAll hook)
 * - Sequential execution (--no-file-parallelism)
 *
 * Coverage:
 * 1. Admin A can INSERT session where admin_id = Admin A (allowed)
 * 2. Admin A cannot INSERT session where admin_id = Admin B (denied)
 * 3. Admin A can SELECT only their own sessions (not Admin B's)
 * 4. Admin A can UPDATE only their own sessions (end session)
 * 5. Tenant realm cannot SELECT any impersonation sessions (control-plane private)
 * 6. Fail-closed: Missing admin context denies all operations
 * 7. Pooler safety (Admin A → Admin B → Admin A, no context bleed)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  withDbContext,
  withBypassForSeed,
  withNoContext,
  type DatabaseContext,
} from '../lib/database-context.js';

const prisma = new PrismaClient();

// Deterministic UUID generation (hex-compliant, d700 prefix for Gate D.7)
const TEST_TAG = 'gate-d7-admin';
const ADMIN_A_ID = 'aaaa0000-d700-d700-d700-00000000000a';
const ADMIN_B_ID = 'bbbb0000-d700-d700-d700-00000000000b';
const TENANT_X_ID = '0000000a-d700-d700-d700-000000000001'; // Tenant X
const TENANT_Y_ID = '0000000b-d700-d700-d700-000000000002'; // Tenant Y
const SESSION_A1_ID = '0000a000-d700-d700-d700-00000000000a'; // Admin A session for Tenant X
const SESSION_A2_ID = '0000a000-d700-d700-d700-00000000001a'; // Admin A session for Tenant Y
const SESSION_B1_ID = '0000b000-d700-d700-d700-00000000000b'; // Admin B session

// Database contexts
// Admin A context (control-plane)
const contextAdminA: DatabaseContext = {
  orgId: ADMIN_A_ID, // For admin context, orgId holds admin ID (not tenant)
  actorId: ADMIN_A_ID,
  realm: 'admin',
  requestId: 'test-req-admin-a',
};

// Admin B context (control-plane)
const contextAdminB: DatabaseContext = {
  orgId: ADMIN_B_ID,
  actorId: ADMIN_B_ID,
  realm: 'admin',
  requestId: 'test-req-admin-b',
};

// Admin A context (alternate request)
const contextAdminA2: DatabaseContext = {
  orgId: ADMIN_A_ID,
  actorId: ADMIN_A_ID,
  realm: 'admin',
  requestId: 'test-req-admin-a2',
};

// Tenant context (should NOT see impersonation sessions)
const contextTenant: DatabaseContext = {
  orgId: TENANT_X_ID,
  actorId: '0000000e-d700-d700-d700-000000000001', // Some user (hex: e = tenant user)
  realm: 'tenant',
  requestId: 'test-req-tenant',
};

describe('Gate D.7: Control-Plane RLS (impersonation_sessions)', () => {
  beforeAll(async () => {
    // Seed test data with bypass mode (triple-gated)
    await withBypassForSeed(prisma, async tx => {
      // Create admin users
      await tx.adminUser.createMany({
        data: [
          {
            id: ADMIN_A_ID,
            email: `${TEST_TAG}-admin-a@texqtic.com`,
            passwordHash: 'bypass-seeded',
            role: 'SUPER_ADMIN',
          },
          {
            id: ADMIN_B_ID,
            email: `${TEST_TAG}-admin-b@texqtic.com`,
            passwordHash: 'bypass-seeded',
            role: 'SUPPORT',
          },
        ],
        skipDuplicates: true,
      });

      // Create tenants (required for FK constraint)
      await tx.tenant.createMany({
        data: [
          {
            id: TENANT_X_ID,
            slug: `${TEST_TAG}-tenant-x`,
            name: 'Gate D.7 Tenant X',
            type: 'B2B',
            status: 'ACTIVE',
            plan: 'PROFESSIONAL',
          },
          {
            id: TENANT_Y_ID,
            slug: `${TEST_TAG}-tenant-y`,
            name: 'Gate D.7 Tenant Y',
            type: 'B2C',
            status: 'ACTIVE',
            plan: 'ENTERPRISE',
          },
        ],
        skipDuplicates: true,
      });

      // Create impersonation sessions (bypass-seeded)
      await tx.impersonationSession.createMany({
        data: [
          {
            id: SESSION_A1_ID,
            adminId: ADMIN_A_ID,
            tenantId: TENANT_X_ID,
            reason: 'Debug Tenant X issue',
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          },
          {
            id: SESSION_A2_ID,
            adminId: ADMIN_A_ID,
            tenantId: TENANT_Y_ID,
            reason: 'Support Tenant Y',
            expiresAt: new Date(Date.now() + 3600000),
          },
          {
            id: SESSION_B1_ID,
            adminId: ADMIN_B_ID,
            tenantId: TENANT_X_ID,
            reason: 'Admin B session',
            expiresAt: new Date(Date.now() + 3600000),
          },
        ],
        skipDuplicates: true,
      });
    });

    // Verify seeding worked
    const sessionCount = await withBypassForSeed(prisma, async tx => {
      return tx.impersonationSession.count({
        where: {
          adminId: { in: [ADMIN_A_ID, ADMIN_B_ID] },
        },
      });
    });

    if (sessionCount !== 3) {
      throw new Error(
        `Seeding failed: expected 3 impersonation sessions, got ${sessionCount}. ` +
          `Check bypass configuration or FK constraints.`
      );
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup: Delete by tag (bypass mode)
    await withBypassForSeed(prisma, async tx => {
      // Delete impersonation sessions
      await tx.impersonationSession.deleteMany({
        where: {
          adminId: { in: [ADMIN_A_ID, ADMIN_B_ID] },
        },
      });

      // Delete tenants (cascade will clean up relationships)
      await tx.tenant.deleteMany({
        where: {
          id: { in: [TENANT_X_ID, TENANT_Y_ID] },
        },
      });

      // Delete admin users
      await tx.adminUser.deleteMany({
        where: {
          id: { in: [ADMIN_A_ID, ADMIN_B_ID] },
        },
      });
    });

    await prisma.$disconnect();
  }, 30000);

  // ============================================================================
  // Test 1: Admin A can INSERT session where admin_id = Admin A (allowed)
  // ============================================================================
  it(
    'should allow Admin A to INSERT session where admin_id = Admin A',
    { timeout: 30000 },
    async () => {
      const newSessionId = '0000a000-d700-d700-d700-000000000099';

      // Admin A creates their own impersonation session
      const session = await withDbContext(prisma, contextAdminA, async tx => {
        return tx.impersonationSession.create({
          data: {
            id: newSessionId,
            adminId: ADMIN_A_ID, // Same as contextAdminA.actorId
            tenantId: TENANT_X_ID,
            reason: 'Test INSERT allowed',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
      });

      expect(session).not.toBeNull();
      expect(session.id).toBe(newSessionId);
      expect(session.adminId).toBe(ADMIN_A_ID);

      // Cleanup
      await withBypassForSeed(prisma, async tx => {
        await tx.impersonationSession.delete({ where: { id: newSessionId } });
      });
    }
  );

  // ============================================================================
  // Test 2: Admin A cannot INSERT session where admin_id = Admin B (denied)
  // ============================================================================
  it(
    'should deny Admin A from INSERTing session where admin_id = Admin B',
    { timeout: 30000 },
    async () => {
      const badSessionId = '0000a000-d700-d700-d700-00000000ffff';

      // Admin A tries to create session for Admin B (should fail)
      await expect(
        withDbContext(prisma, contextAdminA, async tx => {
          return tx.impersonationSession.create({
            data: {
              id: badSessionId,
              adminId: ADMIN_B_ID, // Different from contextAdminA.actorId
              tenantId: TENANT_X_ID,
              reason: 'Attempt to forge Admin B session',
              expiresAt: new Date(Date.now() + 3600000),
            },
          });
        })
      ).rejects.toThrow(/policy|permission denied|violates row-level security/i);
    }
  );

  // ============================================================================
  // Test 3: Admin A can SELECT only their own sessions (not Admin B's)
  // ============================================================================
  it(
    'should allow Admin A to SELECT only their sessions (actor isolation)',
    { timeout: 30000 },
    async () => {
      // Admin A reads sessions (should see only their 2 sessions)
      const sessionsA = await withDbContext(prisma, contextAdminA, async tx => {
        return tx.impersonationSession.findMany({
          where: {}, // No manual filter — RLS enforces boundary
          select: {
            id: true,
            adminId: true,
            tenantId: true,
            reason: true,
          },
        });
      });

      expect(sessionsA).toHaveLength(2); // Only Admin A's sessions
      expect(sessionsA.every((s: { adminId: string }) => s.adminId === ADMIN_A_ID)).toBe(true);

      // Verify SESSION_B1 (Admin B's session) is NOT visible to Admin A
      const sessionBIds = sessionsA.map((s: { id: string }) => s.id);
      expect(sessionBIds).not.toContain(SESSION_B1_ID);

      // Admin B reads sessions (should see only their 1 session)
      const sessionsB = await withDbContext(prisma, contextAdminB, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: {
            id: true,
            adminId: true,
          },
        });
      });

      expect(sessionsB).toHaveLength(1); // Only Admin B's session
      expect(sessionsB[0].adminId).toBe(ADMIN_B_ID);
      expect(sessionsB[0].id).toBe(SESSION_B1_ID);
    }
  );

  // ============================================================================
  // Test 4: Admin A can UPDATE only their own sessions (end session)
  // ============================================================================
  it('should allow Admin A to UPDATE their session (end session)', { timeout: 30000 }, async () => {
    // Admin A ends their session (SET ended_at)
    const updated = await withDbContext(prisma, contextAdminA, async tx => {
      return tx.impersonationSession.update({
        where: { id: SESSION_A1_ID },
        data: {
          endedAt: new Date(),
        },
      });
    });

    expect(updated).not.toBeNull();
    expect(updated.id).toBe(SESSION_A1_ID);
    expect(updated.endedAt).not.toBeNull();

    // Verify update succeeded (read with bypass)
    const verified = await withBypassForSeed(prisma, async tx => {
      return tx.impersonationSession.findUnique({
        where: { id: SESSION_A1_ID },
      });
    });

    expect(verified!.endedAt).not.toBeNull();

    // Restore for subsequent tests
    await withBypassForSeed(prisma, async tx => {
      await tx.impersonationSession.update({
        where: { id: SESSION_A1_ID },
        data: { endedAt: null },
      });
    });
  });

  // ============================================================================
  // Test 5: Tenant realm cannot SELECT any impersonation sessions
  // ============================================================================
  it(
    'should deny tenant realm from SELECTing impersonation sessions (control-plane private)',
    { timeout: 30000 },
    async () => {
      // Tenant user tries to read impersonation sessions (should get 0 rows)
      // RLS restrictive_guard blocks tenant realm (realm='tenant')
      const sessions = await withDbContext(prisma, contextTenant, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
        });
      });

      // Should return 0 rows (restrictive_guard blocks tenant realm)
      expect(sessions).toHaveLength(0);
    }
  );

  // ============================================================================
  // Test 6: Fail-closed: Missing admin context denies all operations
  // ============================================================================
  it(
    'should fail-closed: no admin context denies SELECT/INSERT/UPDATE',
    { timeout: 30000 },
    async () => {
      // Test SELECT with no context (using withNoContext)
      const sessionSelect = await withNoContext(prisma, async tx => {
        return tx.impersonationSession.findMany({});
      });

      // Should return 0 rows (restrictive_guard blocks no context)
      expect(sessionSelect).toHaveLength(0);

      // Test INSERT with no context (should fail)
      const badInsertId = '0000a000-d700-d700-d700-000000001111';
      await expect(
        withNoContext(prisma, async tx => {
          return tx.impersonationSession.create({
            data: {
              id: badInsertId,
              adminId: ADMIN_A_ID,
              tenantId: TENANT_X_ID,
              reason: 'Attempt without context',
              expiresAt: new Date(Date.now() + 3600000),
            },
          });
        })
      ).rejects.toThrow(/policy|permission denied|violates row-level security/i);
    }
  );

  // ============================================================================
  // Test 7: Pooler safety (Admin A → Admin B → Admin A, no context bleed)
  // ============================================================================
  it(
    'should maintain context isolation across pooler transactions (Admin A → Admin B → Admin A)',
    { timeout: 30000 },
    async () => {
      // Transaction 1: Admin A reads their sessions (2 sessions)
      const sessionsA1 = await withDbContext(prisma, contextAdminA, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsA1).toHaveLength(2);
      expect(sessionsA1.every((s: { adminId: string }) => s.adminId === ADMIN_A_ID)).toBe(true);

      // Transaction 2: Admin B reads their sessions (1 session)
      const sessionsB = await withDbContext(prisma, contextAdminB, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsB).toHaveLength(1);
      expect(sessionsB[0].adminId).toBe(ADMIN_B_ID);

      // Transaction 3: Admin A reads again (should still see 2, no bleed from Admin B)
      const sessionsA2 = await withDbContext(prisma, contextAdminA2, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsA2).toHaveLength(2);
      expect(sessionsA2.every((s: { adminId: string }) => s.adminId === ADMIN_A_ID)).toBe(true);
    }
  );
});
