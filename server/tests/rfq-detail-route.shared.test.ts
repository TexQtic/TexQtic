import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { config } from '../src/config/index.js';
import { prisma } from '../src/db/prisma.js';
import {
  withBypassForSeed,
  withDbContext,
  type DatabaseContext,
} from '../src/lib/database-context.js';
import tenantRoutes from '../src/routes/tenant.js';
import { databaseContextMiddleware } from '../src/middleware/database-context.middleware.js';
import { hasDb } from '../src/__tests__/helpers/dbGate.js';
import { seedTenantForTest } from '../src/__tests__/helpers/seedRls.js';

type Fixture = {
  server: FastifyInstance;
  testRunId: string;
  enterpriseBuyerOrgId: string;
  whiteLabelBuyerOrgId: string;
  supplierOrgId: string;
  enterpriseBuyerUserId: string;
  whiteLabelBuyerUserId: string;
  supplierUserId: string;
  enterpriseBuyerToken: string;
  whiteLabelBuyerToken: string;
  supplierToken: string;
  catalogItemId: string;
  enterpriseRespondedRfqId: string;
  whiteLabelRespondedRfqId: string;
  eventFallbackRfqId: string;
  enterpriseTradeId: string;
  eventFallbackTradeId: string;
};

async function makeFixture(): Promise<Fixture> {
  const testRunId = randomUUID();
  const enterpriseBuyerOrgId = randomUUID();
  const whiteLabelBuyerOrgId = randomUUID();
  const supplierOrgId = randomUUID();

  let enterpriseBuyerUserId = '';
  let whiteLabelBuyerUserId = '';
  let supplierUserId = '';
  let catalogItemId = '';
  let enterpriseRespondedRfqId = '';
  let whiteLabelRespondedRfqId = '';
  let eventFallbackRfqId = '';
  let enterpriseTradeId = '';
  let eventFallbackTradeId = '';

  await seedTenantForTest(enterpriseBuyerOrgId, testRunId);
  await seedTenantForTest(whiteLabelBuyerOrgId, testRunId);
  await seedTenantForTest(supplierOrgId, testRunId);

  await withBypassForSeed(prisma, async tx => {
    const passwordHash = await bcrypt.hash('test-password', 10);

    await tx.tenant.update({
      where: { id: whiteLabelBuyerOrgId },
      data: {
        isWhiteLabel: true,
        name: `White Label Buyer [tag:${testRunId}]`,
      },
    });

    await tx.organizations.updateMany({
      where: { id: whiteLabelBuyerOrgId },
      data: { is_white_label: true },
    });

    const enterpriseBuyerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: `enterprise-buyer-${testRunId}@test.local`,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    enterpriseBuyerUserId = enterpriseBuyerUser.id;

    const whiteLabelBuyerUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: `wl-buyer-${testRunId}@test.local`,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    whiteLabelBuyerUserId = whiteLabelBuyerUser.id;

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
        { tenantId: enterpriseBuyerOrgId, userId: enterpriseBuyerUserId, role: 'OWNER' },
        { tenantId: whiteLabelBuyerOrgId, userId: whiteLabelBuyerUserId, role: 'OWNER' },
        { tenantId: supplierOrgId, userId: supplierUserId, role: 'OWNER' },
      ],
    });

    const catalogItem = await tx.catalogItem.create({
      data: {
        id: randomUUID(),
        tenantId: supplierOrgId,
        name: `Shared RFQ Item [tag:${testRunId}]`,
        sku: `RFQ-SHARED-${testRunId}`,
        description: `Shared RFQ detail route fixture for ${testRunId}`,
        price: 42,
        active: true,
      },
    });
    catalogItemId = catalogItem.id;

    const enterpriseRespondedRfq = await tx.rfq.create({
      data: {
        id: randomUUID(),
        orgId: enterpriseBuyerOrgId,
        supplierOrgId,
        catalogItemId,
        quantity: 4,
        buyerMessage: 'Enterprise buyer needs confirmed lead time.',
        status: 'RESPONDED',
        createdByUserId: enterpriseBuyerUserId,
      },
    });
    enterpriseRespondedRfqId = enterpriseRespondedRfq.id;

    const whiteLabelRespondedRfq = await tx.rfq.create({
      data: {
        id: randomUUID(),
        orgId: whiteLabelBuyerOrgId,
        supplierOrgId,
        catalogItemId,
        quantity: 6,
        buyerMessage: 'White-label buyer needs allocation confirmation.',
        status: 'RESPONDED',
        createdByUserId: whiteLabelBuyerUserId,
      },
    });
    whiteLabelRespondedRfqId = whiteLabelRespondedRfq.id;

    const eventFallbackRfq = await tx.rfq.create({
      data: {
        id: randomUUID(),
        orgId: enterpriseBuyerOrgId,
        supplierOrgId,
        catalogItemId,
        quantity: 2,
        buyerMessage: 'Fallback linkage proof RFQ.',
        status: 'RESPONDED',
        createdByUserId: enterpriseBuyerUserId,
      },
    });
    eventFallbackRfqId = eventFallbackRfq.id;

    await tx.rfqSupplierResponse.createMany({
      data: [
        {
          rfqId: enterpriseRespondedRfqId,
          supplierOrgId,
          message: 'Enterprise buyer response is visible.',
          createdByUserId: supplierUserId,
        },
        {
          rfqId: whiteLabelRespondedRfqId,
          supplierOrgId,
          message: 'White-label buyer response is visible.',
          createdByUserId: supplierUserId,
        },
        {
          rfqId: eventFallbackRfqId,
          supplierOrgId,
          message: 'Fallback RFQ response is visible.',
          createdByUserId: supplierUserId,
        },
      ],
    });

    const draftTradeState = await tx.lifecycleState.findFirst({
      where: { entityType: 'TRADE', stateKey: 'DRAFT' },
      select: { id: true },
    });
    assert.ok(draftTradeState, 'Missing TRADE/DRAFT lifecycle state for shared RFQ detail route verifier.');

    enterpriseTradeId = randomUUID();
    await tx.$queryRaw`
      INSERT INTO public.trades (
        id,
        tenant_id,
        buyer_org_id,
        seller_org_id,
        lifecycle_state_id,
        trade_reference,
        currency,
        gross_amount,
        created_by_user_id
      )
      VALUES (
        CAST(${enterpriseTradeId} AS uuid),
        CAST(${enterpriseBuyerOrgId} AS uuid),
        CAST(${enterpriseBuyerOrgId} AS uuid),
        CAST(${supplierOrgId} AS uuid),
        CAST(${draftTradeState.id} AS uuid),
        ${`TRD-DETAIL-${testRunId}`},
        'USD',
        1200,
        CAST(${enterpriseBuyerUserId} AS uuid)
      )
    `;

    await tx.tradeEvent.create({
      data: {
        tenantId: enterpriseBuyerOrgId,
        tradeId: enterpriseTradeId,
        eventType: 'TRADE_CREATED_FROM_RFQ',
        metadata: { rfqId: enterpriseRespondedRfqId },
        createdByUserId: enterpriseBuyerUserId,
      },
    });

    eventFallbackTradeId = randomUUID();
    await tx.$queryRaw`
      INSERT INTO public.trades (
        id,
        tenant_id,
        buyer_org_id,
        seller_org_id,
        lifecycle_state_id,
        trade_reference,
        currency,
        gross_amount,
        created_by_user_id
      )
      VALUES (
        CAST(${eventFallbackTradeId} AS uuid),
        CAST(${enterpriseBuyerOrgId} AS uuid),
        CAST(${enterpriseBuyerOrgId} AS uuid),
        CAST(${supplierOrgId} AS uuid),
        CAST(${draftTradeState.id} AS uuid),
        ${`TRD-EVENT-${testRunId}`},
        'USD',
        800,
        CAST(${enterpriseBuyerUserId} AS uuid)
      )
    `;

    await tx.tradeEvent.create({
      data: {
        tenantId: enterpriseBuyerOrgId,
        tradeId: eventFallbackTradeId,
        eventType: 'TRADE_CREATED_FROM_RFQ',
        metadata: { rfqId: eventFallbackRfqId },
        createdByUserId: enterpriseBuyerUserId,
      },
    });
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
    testRunId,
    enterpriseBuyerOrgId,
    whiteLabelBuyerOrgId,
    supplierOrgId,
    enterpriseBuyerUserId,
    whiteLabelBuyerUserId,
    supplierUserId,
    enterpriseBuyerToken: jwt.sign(
      { userId: enterpriseBuyerUserId, tenantId: enterpriseBuyerOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    ),
    whiteLabelBuyerToken: jwt.sign(
      { userId: whiteLabelBuyerUserId, tenantId: whiteLabelBuyerOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    ),
    supplierToken: jwt.sign(
      { userId: supplierUserId, tenantId: supplierOrgId },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' },
    ),
    catalogItemId,
    enterpriseRespondedRfqId,
    whiteLabelRespondedRfqId,
    eventFallbackRfqId,
    enterpriseTradeId,
    eventFallbackTradeId,
  };
}

async function cleanupFixture(fixture: Fixture | null) {
  if (!fixture) {
    return;
  }

  await fixture.server.close().catch(() => {});

  await withBypassForSeed(prisma, async tx => {
    await tx.tradeEvent.deleteMany({
      where: { tradeId: { in: [fixture.enterpriseTradeId, fixture.eventFallbackTradeId] } },
    });

    await tx.trade.deleteMany({
      where: { id: { in: [fixture.enterpriseTradeId, fixture.eventFallbackTradeId] } },
    });

    await tx.rfqSupplierResponse.deleteMany({
      where: {
        supplierOrgId: fixture.supplierOrgId,
      },
    });

    await tx.rfq.deleteMany({
      where: {
        OR: [
          { orgId: fixture.enterpriseBuyerOrgId },
          { orgId: fixture.whiteLabelBuyerOrgId },
          { supplierOrgId: fixture.supplierOrgId },
        ],
      },
    });

    await tx.catalogItem.deleteMany({ where: { id: fixture.catalogItemId } });

    await tx.membership.deleteMany({
      where: {
        OR: [
          { tenantId: fixture.enterpriseBuyerOrgId },
          { tenantId: fixture.whiteLabelBuyerOrgId },
          { tenantId: fixture.supplierOrgId },
        ],
      },
    });

    await tx.user.deleteMany({
      where: {
        id: {
          in: [
            fixture.enterpriseBuyerUserId,
            fixture.whiteLabelBuyerUserId,
            fixture.supplierUserId,
          ],
        },
      },
    });

    await tx.tenant.deleteMany({
      where: {
        id: {
          in: [
            fixture.enterpriseBuyerOrgId,
            fixture.whiteLabelBuyerOrgId,
            fixture.supplierOrgId,
          ],
        },
      },
    });
  });
}

async function main() {
  if (!hasDb) {
    console.log('SKIP: DATABASE_URL is not configured, shared RFQ detail verifier not run.');
    return;
  }

  let fixture: Fixture | null = null;

  try {
    fixture = await makeFixture();

    const enterpriseDetail = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${fixture.enterpriseRespondedRfqId}`,
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
    });
    assert.equal(enterpriseDetail.statusCode, 200);

    const enterpriseDetailBody = JSON.parse(enterpriseDetail.body);
    assert.equal(enterpriseDetailBody.data.rfq.supplier_response.message, 'Enterprise buyer response is visible.');
    assert.deepEqual(enterpriseDetailBody.data.rfq.trade_continuity, {
      trade_id: fixture.enterpriseTradeId,
      trade_reference: `TRD-DETAIL-${fixture.testRunId}`,
    });

    const whiteLabelDetail = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${fixture.whiteLabelRespondedRfqId}`,
      headers: { Authorization: `Bearer ${fixture.whiteLabelBuyerToken}` },
    });
    assert.equal(whiteLabelDetail.statusCode, 200);

    const whiteLabelDetailBody = JSON.parse(whiteLabelDetail.body);
    assert.equal(whiteLabelDetailBody.data.rfq.supplier_response.message, 'White-label buyer response is visible.');
    assert.equal(whiteLabelDetailBody.data.rfq.trade_continuity, null);

    const createdRfq = await fixture.server.inject({
      method: 'POST',
      url: '/api/tenant/rfqs',
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
      payload: {
        catalogItemId: fixture.catalogItemId,
        quantity: 7,
        buyerMessage: 'Create route should remain healthy.',
      },
    });
    assert.equal(createdRfq.statusCode, 201);

    const createdRfqBody = JSON.parse(createdRfq.body);
    const createdRfqId = createdRfqBody.data.rfq.id as string;

    const supplierInboxDetail = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/inbox/${createdRfqId}`,
      headers: { Authorization: `Bearer ${fixture.supplierToken}` },
    });
    assert.equal(supplierInboxDetail.statusCode, 200);

    const supplierFirstResponse = await fixture.server.inject({
      method: 'POST',
      url: `/api/tenant/rfqs/inbox/${createdRfqId}/respond`,
      headers: { Authorization: `Bearer ${fixture.supplierToken}` },
      payload: {
        message: 'Supplier response remains healthy after the shared detail fix.',
      },
    });
    assert.equal(supplierFirstResponse.statusCode, 201);

    const buyerReadAfterResponse = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${createdRfqId}`,
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
    });
    assert.equal(buyerReadAfterResponse.statusCode, 200);

    const buyerReadAfterResponseBody = JSON.parse(buyerReadAfterResponse.body);
    assert.equal(
      buyerReadAfterResponseBody.data.rfq.supplier_response.message,
      'Supplier response remains healthy after the shared detail fix.',
    );

    const createTradeFromRfq = await fixture.server.inject({
      method: 'POST',
      url: '/api/tenant/trades/from-rfq',
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
      payload: {
        rfqId: createdRfqId,
        tradeReference: `TRD-BRIDGE-${fixture.testRunId}`,
        currency: 'USD',
        grossAmount: 700,
        reason: 'Bridge responded RFQ into existing trade continuity.',
      },
    });
    assert.equal(createTradeFromRfq.statusCode, 201);

    const createTradeFromRfqBody = JSON.parse(createTradeFromRfq.body);
    const createdTradeId = createTradeFromRfqBody.data.tradeId as string;

    const duplicateTradeFromRfq = await fixture.server.inject({
      method: 'POST',
      url: '/api/tenant/trades/from-rfq',
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
      payload: {
        rfqId: createdRfqId,
        tradeReference: `TRD-BRIDGE-DUP-${fixture.testRunId}`,
        currency: 'USD',
        grossAmount: 700,
        reason: 'Duplicate bridge attempt should be blocked.',
      },
    });
    assert.equal(duplicateTradeFromRfq.statusCode, 409);

    const buyerReadAfterTradeBridge = await fixture.server.inject({
      method: 'GET',
      url: `/api/tenant/rfqs/${createdRfqId}`,
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
    });
    assert.equal(buyerReadAfterTradeBridge.statusCode, 200);

    const buyerReadAfterTradeBridgeBody = JSON.parse(buyerReadAfterTradeBridge.body);
    assert.deepEqual(buyerReadAfterTradeBridgeBody.data.rfq.trade_continuity, {
      trade_id: createdTradeId,
      trade_reference: `TRD-BRIDGE-${fixture.testRunId}`,
    });

    const tradesList = await fixture.server.inject({
      method: 'GET',
      url: '/api/tenant/trades?limit=50',
      headers: { Authorization: `Bearer ${fixture.enterpriseBuyerToken}` },
    });
    assert.equal(tradesList.statusCode, 200);

    await withBypassForSeed(prisma, async tx => {
      await tx.tradeEvent.deleteMany({ where: { tradeId: createdTradeId } });
      await tx.trade.deleteMany({ where: { id: createdTradeId } });
      await tx.rfqSupplierResponse.deleteMany({ where: { rfqId: createdRfqId } });
      await tx.rfq.deleteMany({ where: { id: createdRfqId } });
    });

    const dbContext: DatabaseContext = {
      orgId: fixture.enterpriseBuyerOrgId,
      actorId: fixture.enterpriseBuyerUserId,
      realm: 'tenant',
      requestId: randomUUID(),
    };

    const rows = await withDbContext(prisma, dbContext, async tx => {
      return tx.$queryRaw<Array<{ id: string; trade_reference: string }>>`
        SELECT t.id, t.trade_reference
        FROM public.trade_events te
        INNER JOIN public.trades t ON t.id = te.trade_id
        WHERE t.tenant_id = CAST(${fixture.enterpriseBuyerOrgId} AS uuid)
          AND te.event_type = 'TRADE_CREATED_FROM_RFQ'
          AND te.metadata ->> 'rfqId' = CAST(${fixture.eventFallbackRfqId} AS text)
        ORDER BY te.created_at DESC
        LIMIT 1
      `;
    });

    assert.deepEqual(rows, [
      {
        id: fixture.eventFallbackTradeId,
        trade_reference: `TRD-EVENT-${fixture.testRunId}`,
      },
    ]);

    console.log('PASS: shared RFQ detail verifier completed successfully.');
  } finally {
    await cleanupFixture(fixture);
  }
}

await main();