import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';

const { FAKE_TX, svcHolder } = vi.hoisted(() => {
  const FAKE_TX = {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  };
  const svcHolder = {
    transitionCertification: vi.fn() as ReturnType<typeof vi.fn>,
  };
  return { FAKE_TX, svcHolder };
});

vi.mock('../db/prisma.js', () => ({ prisma: {} }));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: typeof FAKE_TX) => Promise<unknown>) => cb(FAKE_TX),
  ),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/certification.g019.service.js', () => ({
  CertificationService: vi.fn(function () { return svcHolder; }),
}));

vi.mock('../services/stateMachine.service.js', () => ({
  StateMachineService: vi.fn(function () { return this; }),
}));

vi.mock('../services/escalation.service.js', () => ({
  EscalationService: vi.fn(function () { return this; }),
}));

vi.mock('../services/sanctions.service.js', () => ({
  SanctionsService: vi.fn(function () { return this; }),
}));

vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
}));

import tenantCertificationRoutes from '../routes/tenant/certifications.g019.js';
import { writeAuditLog } from '../lib/auditLog.js';

const TEST_TENANT_ID = '11111111-0000-0000-0000-111111111111';
const TEST_USER_ID = '22222222-0000-0000-0000-222222222222';
const TEST_CERT_ID = '33333333-0000-0000-0000-333333333333';

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, { secret: 'test-secret' });

  fastify.addHook('onRequest', async req => {
    (req as unknown as Record<string, unknown>).userId = TEST_USER_ID;
    (req as unknown as Record<string, unknown>).dbContext = {
      orgId: TEST_TENANT_ID,
      actorId: TEST_USER_ID,
      realm: 'tenant',
      requestId: 'cert-transition-test',
    };
  });

  await fastify.register(tenantCertificationRoutes, { prefix: '/tenant/certifications' });
  await fastify.ready();
  return fastify;
}

describe('tenant certification transition route', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    svcHolder.transitionCertification = vi.fn();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with APPLIED status for a valid certification transition', async () => {
    svcHolder.transitionCertification.mockResolvedValue({
      status: 'APPLIED',
      newStateKey: 'APPROVED',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/certifications/${TEST_CERT_ID}/transition`,
      payload: {
        toStateKey: 'approved',
        reason: 'Approve certification after review.',
        actorRole: 'tenant_admin',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual({
      certificationId: TEST_CERT_ID,
      status: 'APPLIED',
      newStateKey: 'APPROVED',
    });
    expect(writeAuditLog).toHaveBeenCalledOnce();
  });

  it('returns 422 when the certification transition is denied', async () => {
    svcHolder.transitionCertification.mockResolvedValue({
      status: 'ERROR',
      code: 'TRANSITION_NOT_APPLIED',
      message: 'Transition denied by policy.',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/certifications/${TEST_CERT_ID}/transition`,
      payload: {
        toStateKey: 'approved',
        reason: 'Approve certification after review.',
        actorRole: 'tenant_admin',
      },
    });

    expect(res.statusCode).toBe(422);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});