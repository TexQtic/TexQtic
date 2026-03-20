import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import controlRoutes from '../routes/control.js';
import { prisma } from '../db/prisma.js';
import { hasDb } from './helpers/dbGate.js';

const JWT_ADMIN_SECRET =
  process.env.JWT_ADMIN_SECRET ?? 'test-admin-secret-key-min-32-chars-long';

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  await server.register(fastifyCookie);
  await server.register(fastifyJwt, {
    secret: JWT_ADMIN_SECRET,
    namespace: 'admin',
    jwtVerify: 'adminJwtVerify',
    jwtSign: 'adminJwtSign',
    cookie: { cookieName: 'adminRefreshToken', signed: false },
  });

  await server.register(controlRoutes, { prefix: '/api/control' });
  await server.ready();
  return server;
}

function makeAdminToken(adminId: string, role: 'SUPER_ADMIN' | 'SUPPORT' | 'ANALYST'): string {
  return jwt.sign({ adminId, role, type: 'access' }, JWT_ADMIN_SECRET, {
    expiresIn: '15m',
  });
}

describe.skipIf(!hasDb)(
  'TECS-FBW-ADMINRBAC-REGISTRY-READ-001 — control-plane admin access registry route',
  () => {
    let server: FastifyInstance;
    const seededAdminIds: string[] = [];
    const seededPasswordHash = `seeded-hash-${randomUUID()}`;

    beforeAll(async () => {
      server = await buildServer();

      const superAdminId = randomUUID();
      const analystId = randomUUID();
      seededAdminIds.push(superAdminId, analystId);

      await prisma.adminUser.createMany({
        data: [
          {
            id: superAdminId,
            email: `adminrbac-super-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'SUPER_ADMIN',
          },
          {
            id: analystId,
            email: `adminrbac-analyst-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'ANALYST',
          },
        ],
      });
    });

    afterAll(async () => {
      if (seededAdminIds.length > 0) {
        await prisma.refreshToken.deleteMany({ where: { adminId: { in: seededAdminIds } } });
        await prisma.adminUser.deleteMany({ where: { id: { in: seededAdminIds } } });
      }
      await server.close();
    });

    it('returns bounded control-plane admin identities and role posture for SUPER_ADMIN', async () => {
      const token = makeAdminToken(randomUUID(), 'SUPER_ADMIN');

      const res = await server.inject({
        method: 'GET',
        url: '/api/control/admin-access-registry',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      expect(Array.isArray(body.data.admins)).toBe(true);
      expect(body.data.count).toBeGreaterThanOrEqual(2);
      expect(body.data.admins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: seededAdminIds[0],
            role: 'SUPER_ADMIN',
            accessClass: 'SUPER_ADMIN',
          }),
          expect.objectContaining({
            id: seededAdminIds[1],
            role: 'ANALYST',
            accessClass: 'PLATFORM_ADMIN',
          }),
        ]),
      );
      expect(JSON.stringify(body.data.admins)).not.toContain('passwordHash');
    });

    it('forbids SUPPORT from reading the admin access registry', async () => {
      const token = makeAdminToken(randomUUID(), 'SUPPORT');

      const res = await server.inject({
        method: 'GET',
        url: '/api/control/admin-access-registry',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
    });
  },
);