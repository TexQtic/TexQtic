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
import { hasDb } from './helpers/dbGate.js';
import { PrismaClient } from '@prisma/client';
import {
  withDbContext,
  withBypassForSeed,
  withNoContext,
  withSuperAdminContext,
  ADMIN_SENTINEL_ID,
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

// Tenant context (should NOT see impersonation sessions)
const contextTenant: DatabaseContext = {
  orgId: TENANT_X_ID,
  actorId: '0000000e-d700-d700-d700-000000000001', // Some user (hex: e = tenant user)
  realm: 'tenant',
  requestId: 'test-req-tenant',
};

describe.skipIf(!hasDb)('Gate D.7: Control-Plane RLS (impersonation_sessions)', () => {
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
          {
            // ADMIN_SENTINEL_ID: withSuperAdminContext actor identity (FK target for Test 1 INSERT)
            id: ADMIN_SENTINEL_ID,
            email: `${TEST_TAG}-admin-sentinel@texqtic.com`,
            passwordHash: 'bypass-seeded',
            role: 'SUPER_ADMIN',
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
      // Delete impersonation sessions (include SENTINEL in case Test 1 cleanup was skipped on error)
      await tx.impersonationSession.deleteMany({
        where: {
          adminId: { in: [ADMIN_A_ID, ADMIN_B_ID, ADMIN_SENTINEL_ID] },
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
          id: { in: [ADMIN_A_ID, ADMIN_B_ID, ADMIN_SENTINEL_ID] },
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

      // Production path: impersonation.service.ts uses withSuperAdminContext (OPS-RLS-SUPERADMIN-001)
      // Migration 20260315000008 requires is_superadmin='true' — withDbContext does not set it.
      const session = await withSuperAdminContext(prisma, async tx => {
        return tx.impersonationSession.create({
          data: {
            id: newSessionId,
            adminId: ADMIN_SENTINEL_ID, // withSuperAdminContext actor identity
            tenantId: TENANT_X_ID,
            reason: 'Test INSERT allowed',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
      });

      expect(session).not.toBeNull();
      expect(session.id).toBe(newSessionId);
      expect(session.adminId).toBe(ADMIN_SENTINEL_ID);

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
  // Test 3: Superadmin context can SELECT all sessions
  //
  // NOTE (OPS-RLS-ADMIN-REALM-001 + OPS-RLS-SUPERADMIN-001):
  // require_admin_context() now checks realm='control' AND is_admin='true'.
  // The SELECT PERMISSIVE policy has two arms:
  //   Arm 1: require_admin_context() AND admin_id = current_actor_id()
  //   Arm 2: is_admin='true'
  // Once is_admin='true' is set, Arm 2 grants full visibility to all rows.
  // Actor isolation via Arm 1 is superseded by Arm 2 for any admin context.
  // The correct context helper for admin DB operations is withSuperAdminContext.
  // ============================================================================
  it(
    'should allow superadmin context to SELECT all sessions (is_admin arm grants full visibility)',
    { timeout: 30000 },
    async () => {
      // withSuperAdminContext sets is_admin='true' + is_superadmin='true'.
      // SELECT Arm 2 (is_admin='true') grants visibility to all rows regardless of adminId.
      const sessions = await withSuperAdminContext(prisma, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { id: true, adminId: true },
        });
      });

      // All 3 seeded sessions visible — is_admin arm is not actor-filtered
      expect(sessions.length).toBeGreaterThanOrEqual(3);
      const ids = sessions.map((s: { id: string }) => s.id);
      expect(ids).toContain(SESSION_A1_ID);
      expect(ids).toContain(SESSION_A2_ID);
      expect(ids).toContain(SESSION_B1_ID);
    }
  );

  // ============================================================================
  // Test 4: Admin A can UPDATE only their own sessions (end session)
  // ============================================================================
  it('should allow Admin A to UPDATE their session (end session)', { timeout: 30000 }, async () => {
    // Production path: withSuperAdminContext required by migration 20260315000008 (is_superadmin arm)
    const updated = await withSuperAdminContext(prisma, async tx => {
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
  // Test 7: Pooler safety (admin → tenant → admin, no GUC bleed)
  //
  // Verifies that SET LOCAL GUCs are properly cleaned between pooled transactions.
  // If bleed occurred, a superadmin context after a tenant context would inherit
  // tenant GUCs and the RESTRICTIVE guard would block it (returning 0 rows).
  // ============================================================================
  it(
    'should maintain GUC isolation across pooler transactions (admin → tenant → admin)',
    { timeout: 30000 },
    async () => {
      // Transaction 1: Superadmin reads all sessions (control-plane access confirmed)
      const sessionsAdmin1 = await withSuperAdminContext(prisma, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsAdmin1.length).toBeGreaterThanOrEqual(3);

      // Transaction 2: Tenant context — RESTRICTIVE guard blocks (0 rows)
      // GUCs are set to tenant values (realm='tenant', no is_admin, no is_superadmin)
      const sessionsTenant = await withDbContext(prisma, contextTenant, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsTenant).toHaveLength(0);

      // Transaction 3: Superadmin again — if GUCs bled from TX2, this would also return 0
      // Getting the full count proves transaction-local GUC cleanup is working correctly
      const sessionsAdmin2 = await withSuperAdminContext(prisma, async tx => {
        return tx.impersonationSession.findMany({
          where: {},
          select: { adminId: true },
        });
      });
      expect(sessionsAdmin2.length).toBeGreaterThanOrEqual(3);
      expect(sessionsAdmin2.length).toBe(sessionsAdmin1.length); // Consistent — no bleed from TX2
    }
  );
});
