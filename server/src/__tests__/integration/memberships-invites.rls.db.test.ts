/**
 * GATE D.1 — RLS Enforcement Tests: memberships + invites (DB-level)
 *
 * SCOPE: Verify RLS policies on memberships and invites tables
 * PATTERN: org-scoped isolation using app.current_org_id()
 * ENFORCEMENT: Transaction-local context via withDbContext
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withDbContext, withBypassForSeed, type DatabaseContext } from '../../lib/database-context.js';
import { randomUUID } from 'node:crypto';

describe('GATE D.1 — Memberships + Invites RLS (DB-level)', () => {
  let prisma: PrismaClient;
  const testRunId = `gate-d1-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Ensure clean connection state
    await prisma.$connect();
  });

  describe('Memberships RLS Isolation', () => {
    it('Org A sees only Org A memberships', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();

      // Seed data with bypass
      await withBypassForSeed(prisma, async (tx) => {
        // Create orgs (tenants)
        await tx.tenant.create({
          data: {
            id: orgAId,
            name: `Org A ${testRunId}`,
            slug: `org-a-${testRunId}`,
            type: 'B2B',
          },
        });

        await tx.tenant.create({
          data: {
            id: orgBId,
            name: `Org B ${testRunId}`,
            slug: `org-b-${testRunId}`,
            type: 'B2B',
          },
        });

        // Create users
        await tx.user.create({
          data: {
            id: userAId,
            email: `usera-${testRunId}@test.com`,
            passwordHash: 'hash',
          },
        });

        await tx.user.create({
          data: {
            id: userBId,
            email: `userb-${testRunId}@test.com`,
            passwordHash: 'hash',
          },
        });

        // Create memberships
        await tx.membership.create({
          data: {
            id: randomUUID(),
            userId: userAId,
            tenantId: orgAId,
            role: 'OWNER',
          },
        });

        await tx.membership.create({
          data: {
            id: randomUUID(),
            userId: userBId,
            tenantId: orgBId,
            role: 'MEMBER',
          },
        });
      });

      // Query as Org A (RLS-enforced)
      const orgAContext: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: `${testRunId}-org-a-query`,
      };

      const orgAMemberships = await withDbContext(prisma, orgAContext, async (tx) => {
        return await tx.membership.findMany();
      });

      expect(orgAMemberships.length).toBe(1);
      expect(orgAMemberships[0].tenantId).toBe(orgAId);
      expect(orgAMemberships[0].userId).toBe(userAId);

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.membership.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 20000);

    it('Org B sees only Org B memberships', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();

      // Seed data
      await withBypassForSeed(prisma, async (tx) => {
        await tx.tenant.create({
          data: { id: orgAId, name: `Org A ${testRunId}`, slug: `org-a2-${testRunId}`, type: 'B2B' },
        });

        await tx.tenant.create({
          data: { id: orgBId, name: `Org B ${testRunId}`, slug: `org-b2-${testRunId}`, type: 'B2B' },
        });

        await tx.user.create({
          data: { id: userAId, email: `usera2-${testRunId}@test.com`, passwordHash: 'hash' },
        });

        await tx.user.create({
          data: { id: userBId, email: `userb2-${testRunId}@test.com`, passwordHash: 'hash' },
        });

        await tx.membership.create({
          data: { id: randomUUID(), userId: userAId, tenantId: orgAId, role: 'OWNER' },
        });

        await tx.membership.create({
          data: { id: randomUUID(), userId: userBId, tenantId: orgBId, role: 'ADMIN' },
        });
      });

      // Query as Org B
      const orgBContext: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: `${testRunId}-org-b-query`,
      };

      const orgBMemberships = await withDbContext(prisma, orgBContext, async (tx) => {
        return await tx.membership.findMany();
      });

      expect(orgBMemberships.length).toBe(1);
      expect(orgBMemberships[0].tenantId).toBe(orgBId);
      expect(orgBMemberships[0].role).toBe('ADMIN');

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.membership.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 20000);

    it('Cross-tenant isolation: Org A cannot see Org B memberships', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();

      await withBypassForSeed(prisma, async (tx) => {
        await tx.tenant.createMany({
          data: [
            { id: orgAId, name: `Org A ${testRunId}`, slug: `org-a3-${testRunId}`, type: 'B2B' },
            { id: orgBId, name: `Org B ${testRunId}`, slug: `org-b3-${testRunId}`, type: 'B2B' },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: userAId, email: `usera3-${testRunId}@test.com`, passwordHash: 'hash' },
            { id: userBId, email: `userb3-${testRunId}@test.com`, passwordHash: 'hash' },
          ],
        });

        await tx.membership.createMany({
          data: [
            { id: randomUUID(), userId: userAId, tenantId: orgAId, role: 'OWNER' },
            { id: randomUUID(), userId: userBId, tenantId: orgBId, role: 'MEMBER' },
          ],
        });
      });

      // Query as Org A
      const orgAContext: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: `${testRunId}-cross-tenant`,
      };

      const orgAView = await withDbContext(prisma, orgAContext, async (tx) => {
        return await tx.membership.findMany();
      });

      // Verify no Org B data visible
      const orgBMembershipIds = orgAView.filter(m => m.tenantId === orgBId);
      expect(orgBMembershipIds.length).toBe(0);
      expect(orgAView.every(m => m.tenantId === orgAId)).toBe(true);

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.membership.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 20000);
  });

  describe('Invites RLS Isolation', () => {
    it('Org A sees only Org A invites', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();

      await withBypassForSeed(prisma, async (tx) => {
        await tx.tenant.createMany({
          data: [
            { id: orgAId, name: `Org A ${testRunId}`, slug: `org-a4-${testRunId}`, type: 'B2B' },
            { id: orgBId, name: `Org B ${testRunId}`, slug: `org-b4-${testRunId}`, type: 'B2B' },
          ],
        });

        await tx.invite.createMany({
          data: [
            {
              id: randomUUID(),
              tenantId: orgAId,
              email: `invitea-${testRunId}@test.com`,
              role: 'MEMBER',
              tokenHash: 'hash-a',
              expiresAt: new Date(Date.now() + 86400000),
            },
            {
              id: randomUUID(),
              tenantId: orgBId,
              email: `inviteb-${testRunId}@test.com`,
              role: 'VIEWER',
              tokenHash: 'hash-b',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        });
      });

      // Query as Org A
      const orgAContext: DatabaseContext = {
        orgId: orgAId,
        actorId: orgAId,
        realm: 'tenant',
        requestId: `${testRunId}-invite-org-a`,
      };

      const orgAInvites = await withDbContext(prisma, orgAContext, async (tx) => {
        return await tx.invite.findMany();
      });

      expect(orgAInvites.length).toBe(1);
      expect(orgAInvites[0].tenantId).toBe(orgAId);
      expect(orgAInvites[0].email).toBe(`invitea-${testRunId}@test.com`);

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.invite.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 20000);

    it('Org B cannot see Org A invites', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();

      await withBypassForSeed(prisma, async (tx) => {
        await tx.tenant.createMany({
          data: [
            { id: orgAId, name: `Org A ${testRunId}`, slug: `org-a5-${testRunId}`, type: 'B2B' },
            { id: orgBId, name: `Org B ${testRunId}`, slug: `org-b5-${testRunId}`, type: 'B2B' },
          ],
        });

        await tx.invite.createMany({
          data: [
            {
              id: randomUUID(),
              tenantId: orgAId,
              email: `invitea2-${testRunId}@test.com`,
              role: 'ADMIN',
              tokenHash: 'hash-a2',
              expiresAt: new Date(Date.now() + 86400000),
            },
            {
              id: randomUUID(),
              tenantId: orgBId,
              email: `inviteb2-${testRunId}@test.com`,
              role: 'MEMBER',
              tokenHash: 'hash-b2',
              expiresAt: new Date(Date.now() + 86400000),
            },
          ],
        });
      });

      // Query as Org B
      const orgBContext: DatabaseContext = {
        orgId: orgBId,
        actorId: orgBId,
        realm: 'tenant',
        requestId: `${testRunId}-invite-org-b`,
      };

      const orgBView = await withDbContext(prisma, orgBContext, async (tx) => {
        return await tx.invite.findMany();
      });

      // Verify no Org A invites visible
      const orgAInvites = orgBView.filter(i => i.tenantId === orgAId);
      expect(orgAInvites.length).toBe(0);
      expect(orgBView.every(i => i.tenantId === orgBId)).toBe(true);

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.invite.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 20000);
  });

  describe('Fail-Closed Behavior', () => {
    it('Missing context throws error for membership query', async () => {
      const incompleteContexts = [
        { actorId: 'actor1', realm: 'tenant', requestId: 'req1' }, // missing orgId
        { orgId: randomUUID(), realm: 'tenant', requestId: 'req1' }, // missing actorId
        { orgId: randomUUID(), actorId: 'actor1', requestId: 'req1' }, // missing realm
      ];

      for (const ctx of incompleteContexts) {
        await expect(
          // @ts-expect-error Testing invalid context
          withDbContext(prisma, ctx, async (tx) => {
            return tx.membership.findMany();
          })
        ).rejects.toThrow(/Invalid context/);
      }
    });

    it('Missing context throws error for invite query', async () => {
      const incompleteContexts = [
        { actorId: 'actor1', realm: 'tenant', requestId: 'req1' }, // missing orgId
        { orgId: randomUUID(), realm: 'tenant', requestId: 'req1' }, // missing actorId
      ];

      for (const ctx of incompleteContexts) {
        await expect(
          // @ts-expect-error Testing invalid context
          withDbContext(prisma, ctx, async (tx) => {
            return tx.invite.findMany();
          })
        ).rejects.toThrow(/Invalid context/);
      }
    });
  });

  describe('Pooler Safety (Sequential Context Switching)', () => {
    it('No context bleed across Org A → Org B → Org A transitions', async () => {
      const orgAId = randomUUID();
      const orgBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();

      await withBypassForSeed(prisma, async (tx) => {
        await tx.tenant.createMany({
          data: [
            { id: orgAId, name: `Org A ${testRunId}`, slug: `org-a-pool-${testRunId}`, type: 'B2B' },
            { id: orgBId, name: `Org B ${testRunId}`, slug: `org-b-pool-${testRunId}`, type: 'B2B' },
          ],
        });

        await tx.user.createMany({
          data: [
            { id: userAId, email: `usera-pool-${testRunId}@test.com`, passwordHash: 'hash' },
            { id: userBId, email: `userb-pool-${testRunId}@test.com`, passwordHash: 'hash' },
          ],
        });

        await tx.membership.createMany({
          data: [
            { id: randomUUID(), userId: userAId, tenantId: orgAId, role: 'OWNER' },
            { id: randomUUID(), userId: userBId, tenantId: orgBId, role: 'MEMBER' },
          ],
        });
      });

      // Query 1: Org A
      const orgAContext: DatabaseContext = {
        orgId: orgAId,
        actorId: userAId,
        realm: 'tenant',
        requestId: `${testRunId}-pool-1`,
      };

      const query1 = await withDbContext(prisma, orgAContext, async (tx) => {
        return await tx.membership.findMany();
      });

      expect(query1.length).toBe(1);
      expect(query1[0].tenantId).toBe(orgAId);

      // Query 2: Org B (immediately after)
      const orgBContext: DatabaseContext = {
        orgId: orgBId,
        actorId: userBId,
        realm: 'tenant',
        requestId: `${testRunId}-pool-2`,
      };

      const query2 = await withDbContext(prisma, orgBContext, async (tx) => {
        return await tx.membership.findMany();
      });

      expect(query2.length).toBe(1);
      expect(query2[0].tenantId).toBe(orgBId);

      // Query 3: Back to Org A
      const query3 = await withDbContext(prisma, orgAContext, async (tx) => {
        return await tx.membership.findMany();
      });

      expect(query3.length).toBe(1);
      expect(query3[0].tenantId).toBe(orgAId);

      // Cleanup
      await withBypassForSeed(prisma, async (tx) => {
        await tx.membership.deleteMany({ where: { tenantId: { in: [orgAId, orgBId] } } });
        await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
        await tx.tenant.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      });
    }, 25000);
  });
});
