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
  'TECS-FBW-ADMINRBAC-REVOKE-REMOVE-001 — bounded control-plane admin revoke/remove',
  () => {
    let server: FastifyInstance;
    const seededAdminIds: string[] = [];
    const seededPasswordHash = `seeded-hash-${randomUUID()}`;

    let actorSuperAdminId: string;
    let targetAnalystId: string;
    let peerSuperAdminId: string;
    let supportAdminId: string;

    beforeAll(async () => {
      server = await buildServer();

      actorSuperAdminId = randomUUID();
      targetAnalystId = randomUUID();
      peerSuperAdminId = randomUUID();
      supportAdminId = randomUUID();
      seededAdminIds.push(actorSuperAdminId, targetAnalystId, peerSuperAdminId, supportAdminId);

      await prisma.adminUser.createMany({
        data: [
          {
            id: actorSuperAdminId,
            email: `adminrbac-actor-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'SUPER_ADMIN',
          },
          {
            id: targetAnalystId,
            email: `adminrbac-target-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'ANALYST',
          },
          {
            id: peerSuperAdminId,
            email: `adminrbac-peer-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'SUPER_ADMIN',
          },
          {
            id: supportAdminId,
            email: `adminrbac-support-${Date.now()}@example.com`,
            passwordHash: seededPasswordHash,
            role: 'SUPPORT',
          },
        ],
      });

      await prisma.refreshToken.createMany({
        data: [
          {
            id: randomUUID(),
            adminId: targetAnalystId,
            tokenHash: `target-refresh-${randomUUID()}`,
            familyId: randomUUID(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
          {
            id: randomUUID(),
            adminId: targetAnalystId,
            tokenHash: `target-refresh-${randomUUID()}`,
            familyId: randomUUID(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorId: { in: seededAdminIds } },
            { entityId: { in: seededAdminIds } },
          ],
        },
      });
      await prisma.refreshToken.deleteMany({ where: { adminId: { in: seededAdminIds } } });
      await prisma.adminUser.deleteMany({ where: { id: { in: seededAdminIds } } });
      await server.close();
    });

    it('revokes a bounded non-SUPER_ADMIN target and makes the next control-plane request fail', async () => {
      const actorToken = makeAdminToken(actorSuperAdminId, 'SUPER_ADMIN');
      const targetToken = makeAdminToken(targetAnalystId, 'ANALYST');

      const beforeRes = await server.inject({
        method: 'GET',
        url: '/api/control/whoami',
        headers: { authorization: `Bearer ${targetToken}` },
      });

      expect(beforeRes.statusCode).toBe(200);

      const revokeRes = await server.inject({
        method: 'DELETE',
        url: `/api/control/admin-access-registry/${targetAnalystId}`,
        headers: { authorization: `Bearer ${actorToken}` },
      });

      expect(revokeRes.statusCode).toBe(200);
      expect(revokeRes.json().data).toMatchObject({
        revokedAdminId: targetAnalystId,
        refreshTokensInvalidated: 2,
      });

      const targetAdmin = await prisma.adminUser.findUnique({
        where: { id: targetAnalystId },
      });
      expect(targetAdmin).toBeNull();

      const remainingRefreshTokens = await prisma.refreshToken.count({
        where: { adminId: targetAnalystId },
      });
      expect(remainingRefreshTokens).toBe(0);

      const successAudit = await prisma.auditLog.findFirst({
        where: {
          actorId: actorSuperAdminId,
          action: 'control.admin_access_registry.revoke.succeeded',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(successAudit).not.toBeNull();
      expect(successAudit!.metadataJson).toMatchObject({
        actorRole: 'SUPER_ADMIN',
        targetAdminId: targetAnalystId,
        targetAdminRole: 'ANALYST',
        refreshTokensInvalidated: 2,
      });

      const afterRes = await server.inject({
        method: 'GET',
        url: '/api/control/whoami',
        headers: { authorization: `Bearer ${targetToken}` },
      });

      expect(afterRes.statusCode).toBe(401);
    });

    it('blocks self-revoke and audits the denied attempt', async () => {
      const actorToken = makeAdminToken(actorSuperAdminId, 'SUPER_ADMIN');

      const res = await server.inject({
        method: 'DELETE',
        url: `/api/control/admin-access-registry/${actorSuperAdminId}`,
        headers: { authorization: `Bearer ${actorToken}` },
      });

      expect(res.statusCode).toBe(403);

      const denialAudit = await prisma.auditLog.findFirst({
        where: {
          actorId: actorSuperAdminId,
          action: 'control.admin_access_registry.revoke.denied',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(denialAudit).not.toBeNull();
      expect(denialAudit!.metadataJson).toMatchObject({
        targetAdminId: actorSuperAdminId,
        reason: 'SELF_REVOKE_BLOCKED',
      });
    });

    it('blocks peer SUPER_ADMIN revoke/remove and audits the denied attempt', async () => {
      const actorToken = makeAdminToken(actorSuperAdminId, 'SUPER_ADMIN');

      const res = await server.inject({
        method: 'DELETE',
        url: `/api/control/admin-access-registry/${peerSuperAdminId}`,
        headers: { authorization: `Bearer ${actorToken}` },
      });

      expect(res.statusCode).toBe(403);

      const denialAudit = await prisma.auditLog.findFirst({
        where: {
          actorId: actorSuperAdminId,
          action: 'control.admin_access_registry.revoke.denied',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(denialAudit).not.toBeNull();
      expect(denialAudit!.metadataJson).toMatchObject({
        targetAdminId: peerSuperAdminId,
        targetAdminRole: 'SUPER_ADMIN',
        reason: 'PEER_SUPER_ADMIN_PROTECTED',
      });
    });

    it('blocks non-SUPER_ADMIN actor attempts and audits the denial', async () => {
      const supportToken = makeAdminToken(supportAdminId, 'SUPPORT');

      const res = await server.inject({
        method: 'DELETE',
        url: `/api/control/admin-access-registry/${peerSuperAdminId}`,
        headers: { authorization: `Bearer ${supportToken}` },
      });

      expect(res.statusCode).toBe(403);

      const denialAudit = await prisma.auditLog.findFirst({
        where: {
          actorId: supportAdminId,
          action: 'control.admin_access_registry.revoke.denied',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(denialAudit).not.toBeNull();
      expect(denialAudit!.metadataJson).toMatchObject({
        actorRole: 'SUPPORT',
        targetAdminId: peerSuperAdminId,
        reason: 'ACTOR_NOT_SUPER_ADMIN',
      });
    });
  },
);