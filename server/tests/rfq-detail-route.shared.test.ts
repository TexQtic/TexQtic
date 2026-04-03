import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { config } from '../src/config/index.js';
import { prisma } from '../src/db/prisma.js';
import { withBypassForSeed } from '../src/lib/database-context.js';
import tenantRoutes from '../src/routes/tenant.js';
import { databaseContextMiddleware } from '../src/middleware/database-context.middleware.js';
import { hasDb } from '../src/__tests__/helpers/dbGate.js';
import { seedTenantForTest } from '../src/__tests__/helpers/seedRls.js';

type Fixture = {
  server: FastifyInstance;
  buyerOrgId: string;
  supplierOrgId: string;
  buyerUserId: string;
  supplierUserId: string;
  buyerToken: string;
  supplierToken: string;
  catalogItemId: string;
  rfqId: string;
};

async function makeFixture(): Promise<Fixture> {
  const testRunId = randomUUID();
  const buyerOrgId = randomUUID();
  const supplierOrgId = randomUUID();

  let buyerUserId = '';
  let supplierUserId = '';
  let catalogItemId = '';
  let rfqId = '';

  await seedTenantForTest(buyerOrgId, testRunId);
  await seedTenantForTest(supplierOrgId, testRunId);

  await withBypassForSeed(prisma, async tx => {
    const passwordHash = await bcrypt.hash('test-password', 10);

    const buyerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: `supplier-detail-buyer-${testRunId}@test.local`,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    buyerUserId = buyerUser.id;

    const supplierUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: `supplier-detail-supplier-${testRunId}@test.local`,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    supplierUserId = supplierUser.id;

    await tx.membership.createMany({
      data: [
        { tenantId: buyerOrgId, userId: buyerUserId, role: 'OWNER' },
        { tenantId: supplierOrgId, userId: supplierUserId, role: 'OWNER' },
      ],
    });

    const catalogItem = await tx.catalogItem.create({
      data: {
        id: randomUUID(),
        tenantId: supplierOrgId,
        name: `Supplier Detail Verifier Item [tag:${testRunId}]`,
        sku: `RFQ-SUPPLIER-DETAIL-${testRunId}`,
        description: `Supplier detail bounded verifier fixture for ${testRunId}`,
        price: 42,
        active: true,
      },
    });
    catalogItemId = catalogItem.id;

    const rfq = await tx.rfq.create({
      data: {
        id: randomUUID(),
        orgId: buyerOrgId,
        supplierOrgId,
        catalogItemId,
        quantity: 7,
        buyerMessage: 'Supplier detail bounded verifier request.',
        status: 'OPEN',
        createdByUserId: buyerUserId,
      },
    });
    rfqId = rfq.id;
  });

  const server = Fastify({ logger: false });
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

  return {
    server,
    buyerOrgId,
    supplierOrgId,
    buyerUserId,
    supplierUserId,
    buyerToken: jwt.sign(
      { userId: buyerUserId, tenantId: buyerOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    ),
    supplierToken: jwt.sign(
      { userId: supplierUserId, tenantId: supplierOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    ),
    catalogItemId,
    rfqId,
  };
}

async function cleanupFixture(fixture: Fixture | null) {
  if (!fixture) {
    return;
  }

  await fixture.server.close().catch(() => {});

  await withBypassForSeed(prisma, async tx => {
    await tx.rfqSupplierResponse.deleteMany({ where: { rfqId: fixture.rfqId } });
    await tx.rfq.deleteMany({ where: { id: fixture.rfqId } });
    await tx.catalogItem.deleteMany({ where: { id: fixture.catalogItemId } });

    await tx.membership.deleteMany({
      where: {
        OR: [
          { tenantId: fixture.buyerOrgId },
          { tenantId: fixture.supplierOrgId },
        ],
      },
    });

    await tx.user.deleteMany({
      where: {
        id: {
          in: [fixture.buyerUserId, fixture.supplierUserId],
        },
      },
    });

    await tx.tenant.deleteMany({
      where: {
        id: {
          in: [fixture.buyerOrgId, fixture.supplierOrgId],
        },
      },
    });
  });
}

const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('supplier RFQ detail buyer summary bounded verifier', () => {
  let fixture: Fixture | null = null;

  beforeAll(async () => {
    fixture = await makeFixture();
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
  });

  it('returns buyer summary and preserves supplier response continuity', async () => {
    assert.ok(fixture, 'Expected bounded supplier-detail verifier fixture to be initialized.');

    const supplierDetail = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/inbox/${fixture.rfqId}`,
      headers: { Authorization: `Bearer ${fixture.supplierToken}` },
    });
    assert.equal(supplierDetail.statusCode, 200);

    const supplierDetailBody = JSON.parse(supplierDetail.body);
    assert.equal(supplierDetailBody.data.rfq.id, fixture.rfqId);
    assert.equal(supplierDetailBody.data.rfq.status, 'OPEN');
    assert.equal(supplierDetailBody.data.rfq.buyer_message, 'Supplier detail bounded verifier request.');
    assert.equal(
      supplierDetailBody.data.rfq.buyer_counterparty_summary.orgId,
      fixture.buyerOrgId,
    );
    assert.notEqual(
      supplierDetailBody.data.rfq.buyer_counterparty_summary.orgId,
      fixture.supplierOrgId,
    );
    assert.equal(
      supplierDetailBody.data.rfq.buyer_counterparty_summary.identity.orgId,
      fixture.buyerOrgId,
    );
    assert.equal(
      typeof supplierDetailBody.data.rfq.buyer_counterparty_summary.identity.legalName,
      'string',
    );
    assert.ok(
      Array.isArray(supplierDetailBody.data.rfq.buyer_counterparty_summary.trustSummary.certifications),
    );
    assert.equal(
      typeof supplierDetailBody.data.rfq.buyer_counterparty_summary.evidenceSummary.hasTraceabilityEvidence,
      'boolean',
    );
    assert.ok(
      Array.isArray(supplierDetailBody.data.rfq.buyer_counterparty_summary.evidenceSummary.nodeTypePresence),
    );
    assert.ok(
      Array.isArray(supplierDetailBody.data.rfq.buyer_counterparty_summary.evidenceSummary.visibilityIndicators),
    );

    const supplierResponse = await fixture.server.inject({
      method: 'POST',
      url: `/api/tenant/rfqs/inbox/${fixture.rfqId}/respond`,
      headers: { Authorization: `Bearer ${fixture.supplierToken}` },
      payload: {
        message: 'Supplier bounded verifier response remains healthy.',
      },
    });
    assert.equal(supplierResponse.statusCode, 201);

    const supplierResponseBody = JSON.parse(supplierResponse.body);
    assert.equal(supplierResponseBody.data.rfq.id, fixture.rfqId);
    assert.equal(supplierResponseBody.data.rfq.status, 'RESPONDED');
    assert.equal(supplierResponseBody.data.non_binding, true);

    const supplierDetailAfterResponse = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/inbox/${fixture.rfqId}`,
      headers: { Authorization: `Bearer ${fixture.supplierToken}` },
    });
    assert.equal(supplierDetailAfterResponse.statusCode, 200);

    const supplierDetailAfterResponseBody = JSON.parse(supplierDetailAfterResponse.body);
    assert.equal(supplierDetailAfterResponseBody.data.rfq.status, 'RESPONDED');
    assert.equal(
      supplierDetailAfterResponseBody.data.rfq.buyer_counterparty_summary.orgId,
      fixture.buyerOrgId,
    );
  });
});