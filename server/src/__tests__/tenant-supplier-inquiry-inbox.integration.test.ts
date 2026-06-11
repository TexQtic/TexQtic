import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import tenantRoutes from '../routes/tenant.js';
import { prisma } from '../db/prisma.js';
import { hasDb } from './helpers/dbGate.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long';

function tokenFor(userId: string, tenantId: string) {
  return jwt.sign({ userId, tenantId, type: 'access' }, JWT_SECRET, { expiresIn: '15m' });
}

describe.skipIf(!hasDb)('Tenant Supplier Inquiry Inbox', () => {
  let server: FastifyInstance;
  let tenantId: string;
  let otherTenantId: string;

  let ownerUserId: string;
  let adminUserId: string;
  let memberUserId: string;
  let viewerUserId: string;

  beforeEach(async () => {
    tenantId = randomUUID();
    otherTenantId = randomUUID();

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: `Inquiry Inbox Org ${Date.now()}`,
        slug: `inquiry-inbox-org-${Date.now()}`,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    await prisma.tenant.create({
      data: {
        id: otherTenantId,
        name: `Other Inquiry Org ${Date.now()}`,
        slug: `other-inquiry-org-${Date.now()}`,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    ownerUserId = randomUUID();
    adminUserId = randomUUID();
    memberUserId = randomUUID();
    viewerUserId = randomUUID();

    const passwordHash = await bcrypt.hash('password', 10);

    await prisma.user.createMany({
      data: [
        { id: ownerUserId, email: `owner-${Date.now()}@test.local`, passwordHash, emailVerified: true },
        { id: adminUserId, email: `admin-${Date.now()}@test.local`, passwordHash, emailVerified: true },
        { id: memberUserId, email: `member-${Date.now()}@test.local`, passwordHash, emailVerified: true },
        { id: viewerUserId, email: `viewer-${Date.now()}@test.local`, passwordHash, emailVerified: true },
      ],
    });

    await prisma.membership.createMany({
      data: [
        { tenantId, userId: ownerUserId, role: 'OWNER' },
        { tenantId, userId: adminUserId, role: 'ADMIN' },
        { tenantId, userId: memberUserId, role: 'MEMBER' },
        { tenantId, userId: viewerUserId, role: 'VIEWER' },
      ],
    });

    const qaTimestamp = '2026-06-11T05:31:37.111Z';

    await prisma.auditLog.createMany({
      data: [
        {
          id: randomUUID(),
          realm: 'TENANT',
          tenantId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.created',
          entity: 'organization',
          entityId: tenantId,
          afterJson: {
            supplier_slug: 'shraddha-industries',
            inquiry_category: 'SOURCING_INTENT',
            source_surface: 'SUPPLIER_PROFILE',
            geo_band: 'India',
            volume_band: 'pilot',
            timestamp: qaTimestamp,
            inquiry_message: 'QA runtime verification inquiry',
          },
          createdAt: new Date(qaTimestamp),
        },
        {
          id: randomUUID(),
          realm: 'TENANT',
          tenantId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.created',
          entity: 'organization',
          entityId: tenantId,
          afterJson: {
            supplier_slug: 'lt-b2b-001',
            inquiry_category: 'GENERAL',
            source_surface: 'SUPPLIER_PROFILE',
            timestamp: '2026-06-11T07:00:00.000Z',
          },
          createdAt: new Date('2026-06-11T07:00:00.000Z'),
        },
        {
          id: randomUUID(),
          realm: 'TENANT',
          tenantId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.created',
          entity: 'organization',
          entityId: tenantId,
          afterJson: {
            supplier_slug: 'shraddha-industries',
            inquiry_category: 'CAPABILITY_FIT',
            source_surface: 'PRODUCT_DETAIL',
            geo_band: 'India',
            volume_band: 'bulk',
            timestamp: '2026-06-11T08:00:00.000Z',
            inquiry_message: 'Real buyer interest inquiry',
          },
          createdAt: new Date('2026-06-11T08:00:00.000Z'),
        },
        {
          id: randomUUID(),
          realm: 'ADMIN',
          tenantId: null,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.general.created',
          entity: 'platform_inquiry',
          entityId: null,
          afterJson: {
            inquiry_category: 'GENERAL',
            source_surface: 'GENERAL_PUBLIC',
          },
          createdAt: new Date('2026-06-11T09:00:00.000Z'),
        },
        {
          id: randomUUID(),
          realm: 'TENANT',
          tenantId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'catalog.item.updated',
          entity: 'catalog_item',
          entityId: randomUUID(),
          afterJson: { note: 'not an inquiry row' },
          createdAt: new Date('2026-06-11T10:00:00.000Z'),
        },
        {
          id: randomUUID(),
          realm: 'TENANT',
          tenantId: otherTenantId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'public.buyer.inquiry.created',
          entity: 'organization',
          entityId: otherTenantId,
          afterJson: {
            supplier_slug: 'other-supplier',
            inquiry_category: 'GENERAL',
            source_surface: 'SUPPLIER_PROFILE',
            timestamp: '2026-06-11T11:00:00.000Z',
          },
          createdAt: new Date('2026-06-11T11:00:00.000Z'),
        },
      ],
    });

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;

    server = Fastify({ logger: false });
    await server.register(fastifyCookie);
    await server.register(fastifyJwt, {
      secret: JWT_SECRET,
      namespace: 'tenant',
      jwtVerify: 'tenantJwtVerify',
      jwtSign: 'tenantJwtSign',
      cookie: { cookieName: 'refreshToken', signed: false },
    });
    await server.register(tenantRoutes, { prefix: '/api' });
    await server.ready();
  });

  afterEach(async () => {
    await server.close();

    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    await prisma.auditLog.deleteMany({ where: { OR: [{ tenantId }, { tenantId: otherTenantId }, { action: 'public.buyer.inquiry.general.created' }] } });
    await prisma.membership.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, adminUserId, memberUserId, viewerUserId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } });
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
  });

  it('allows OWNER, ADMIN, and MEMBER roles to read supplier inquiry inbox', async () => {
    const roles: Array<{ userId: string; role: string }> = [
      { userId: ownerUserId, role: 'OWNER' },
      { userId: adminUserId, role: 'ADMIN' },
      { userId: memberUserId, role: 'MEMBER' },
    ];

    for (const role of roles) {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tenant/inquiries/supplier-inbox',
        headers: {
          authorization: `Bearer ${tokenFor(role.userId, tenantId)}`,
        },
      });

      expect(response.statusCode, role.role).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(3);
    }
  });

  it('denies VIEWER role for supplier inquiry inbox route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/tenant/inquiries/supplier-inbox',
      headers: {
        authorization: `Bearer ${tokenFor(viewerUserId, tenantId)}`,
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns only supplier inquiry rows for tenant and maps classifications without raw JSON fields', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/tenant/inquiries/supplier-inbox',
      headers: {
        authorization: `Bearer ${tokenFor(memberUserId, tenantId)}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);

    const inquiries = body.data.inquiries as Array<Record<string, unknown>>;
    expect(inquiries).toHaveLength(3);

    const classifications = new Set(inquiries.map(item => item.classification));
    expect(classifications.has('QA_RUNTIME_VERIFICATION')).toBe(true);
    expect(classifications.has('DEMO_PILOT')).toBe(true);
    expect(classifications.has('REAL_BUYER_INTEREST')).toBe(true);

    for (const inquiry of inquiries) {
      expect(inquiry).not.toHaveProperty('afterJson');
      expect(inquiry).not.toHaveProperty('after_json');
      expect(inquiry).not.toHaveProperty('buyer_email');
      expect(inquiry).not.toHaveProperty('buyer_phone');
    }
  });
});
