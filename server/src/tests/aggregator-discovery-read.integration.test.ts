import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import { config } from '../config/index.js';
import { hasDb } from '../__tests__/helpers/dbGate.js';
import { prisma } from '../db/prisma.js';
import { withBypassForSeed } from '../lib/database-context.js';
import tenantRoutes from '../routes/tenant.js';
import { databaseContextMiddleware } from '../middleware/database-context.middleware.js';
import { seedTenantForTest } from '../__tests__/helpers/seedRls.js';

describe.skipIf(!hasDb)('AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS — discovery read route', () => {
  let server: FastifyInstance | null = null;
  let testRunId: string;
  let aggregatorOrgId: string;
  let supplierOrgId: string;
  let aggregatorUserId: string;
  let supplierUserId: string;
  let aggregatorToken: string;
  let supplierToken: string;

  beforeEach(async () => {
    testRunId = randomUUID();
    aggregatorOrgId = randomUUID();
    supplierOrgId = randomUUID();

    await seedTenantForTest(aggregatorOrgId, testRunId);
    await seedTenantForTest(supplierOrgId, testRunId);

    await withBypassForSeed(prisma, async tx => {
      await tx.organizations.update({
        where: { id: aggregatorOrgId },
        data: {
          legal_name: `Aggregator Hub [tag:${testRunId}]`,
          slug: `aggregator-${testRunId}`,
          org_type: 'AGGREGATOR',
          status: 'ACTIVE',
          is_white_label: false,
          jurisdiction: 'AE',
        },
      });

      await tx.organizations.update({
        where: { id: supplierOrgId },
        data: {
          legal_name: `Supplier Network [tag:${testRunId}]`,
          slug: `supplier-${testRunId}`,
          org_type: 'B2B',
          status: 'ACTIVE',
          is_white_label: false,
          jurisdiction: 'DE',
        },
      });

      const passwordHash = await bcrypt.hash('test-password', 10);

      const aggregatorUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `aggregator-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      aggregatorUserId = aggregatorUser.id;

      const supplierUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: `supplier-${testRunId}@test.local`,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      supplierUserId = supplierUser.id;

      await tx.membership.createMany({
        data: [
          {
            tenantId: aggregatorOrgId,
            userId: aggregatorUserId,
            role: 'OWNER',
          },
          {
            tenantId: supplierOrgId,
            userId: supplierUserId,
            role: 'OWNER',
          },
        ],
      });
    });

    server = Fastify({ logger: false });
    await server.register(fastifyCookie, { secret: 'test-secret' });
    await server.register(fastifyJwt, {
      secret: config.JWT_ACCESS_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
    });

    await server.register(async fastify => {
      fastify.addHook('onRequest', async (request, reply) => {
        try {
          await request.tenantJwtVerify({ onlyCookie: false });
          const payload = request.user as { userId?: string; tenantId?: string };

          if (!payload.userId || !payload.tenantId) {
            return reply.code(401).send({ success: false, error: 'Invalid token payload' });
          }

          request.userId = payload.userId;
          request.tenantId = payload.tenantId;
        } catch {
          return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
        }
      });

      fastify.addHook('onRequest', databaseContextMiddleware);
      await fastify.register(tenantRoutes, { prefix: '/api' });
    });

    await server.ready();

    aggregatorToken = jwt.sign(
      { userId: aggregatorUserId, tenantId: aggregatorOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    );
    supplierToken = jwt.sign(
      { userId: supplierUserId, tenantId: supplierOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    );
  }, 30000);

  afterEach(async () => {
    if (server) {
      await server.close().catch(() => {});
      server = null;
    }

    await withBypassForSeed(prisma, async tx => {
      await tx.membership.deleteMany({
        where: {
          OR: [{ tenantId: aggregatorOrgId }, { tenantId: supplierOrgId }],
        },
      });

      await tx.user.deleteMany({
        where: {
          id: { in: [aggregatorUserId, supplierUserId] },
        },
      });

      await tx.tenant.deleteMany({
        where: {
          name: { contains: testRunId },
        },
      });
    });
  });

  it('returns curated discovery entries for an Aggregator tenant', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/aggregator/discovery?limit=6',
      headers: {
        Authorization: `Bearer ${aggregatorToken}`,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as {
      success: boolean;
      data: {
        items: Array<{
          orgId: string;
          slug: string;
          legalName: string;
          orgType: string;
          jurisdiction: string;
          status: string;
        }>;
        count: number;
      };
    };

    expect(body.success).toBe(true);
    expect(body.data.count).toBeGreaterThanOrEqual(1);
    expect(body.data.items.some(item => item.orgId === supplierOrgId)).toBe(true);
    expect(body.data.items.some(item => item.orgId === aggregatorOrgId)).toBe(false);
  });

  it('rejects the discovery route for non-Aggregator tenants', async () => {
    const response = await server!.inject({
      method: 'GET',
      url: '/api/tenant/aggregator/discovery',
      headers: {
        Authorization: `Bearer ${supplierToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});