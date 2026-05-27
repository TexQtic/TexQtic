/**
 * CONTROL-PLANE-IMPERSONATION-STATUS-PREHANDLER-HARDENING-008
 *
 * T-IMP-017: Non-SUPER_ADMIN admin cannot GET /impersonation/status/:impersonationId
 *
 * Authorization contract test proving:
 * - A non-SUPER_ADMIN admin (SUPPORT, ANALYST) attempting to read impersonation
 *   session status metadata is denied with 403 FORBIDDEN before the service is called.
 * - The getImpersonationStatus service is NOT called for denied requests.
 * - SUPER_ADMIN is still allowed (control case).
 *
 * Closes R-001 deferred under FTR-CP-001.
 * No product code, schema, DB, runtime, or secrets changes.
 * Family: FTR-CP-001 — OPEN, authorization-gated.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const {
  TEST_ADMIN_ID,
  TEST_ADMIN_ROLE,
  TEST_IMPERSONATION_ID,
  prismaHolder,
} = vi.hoisted(() => {
  const prismaHolder = {
    impersonationSession: {
      findUnique: vi.fn(),
    },
  };

  return {
    TEST_ADMIN_ID: '11111111-1111-1111-1111-111111111111',
    TEST_ADMIN_ROLE: { value: 'SUPER_ADMIN' as string },
    TEST_IMPERSONATION_ID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    prismaHolder,
  };
});

vi.mock('../db/prisma.js', () => ({ prisma: prismaHolder }));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn(
    (request: Record<string, unknown>, _reply: unknown, done: () => void) => {
      request.isAdmin = true;
      request.adminId = TEST_ADMIN_ID;
      request.adminRole = TEST_ADMIN_ROLE.value;
      done();
    },
  ),
  requireAdminRole: vi.fn(
    (...requiredRoles: string[]) =>
      (
        request: Record<string, unknown>,
        reply: { code: (statusCode: number) => { send: (body: unknown) => void } },
        done: () => void,
      ) => {
        if (!request.isAdmin || !request.adminRole) {
          reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' },
          });
          return;
        }

        if (!requiredRoles.includes(String(request.adminRole))) {
          reply.code(403).send({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Requires one of: ${requiredRoles.join(', ')}`,
            },
          });
          return;
        }

        done();
      },
  ),
}));

vi.mock('../services/impersonation.service.js', () => ({
  startImpersonation: vi.fn(),
  stopImpersonation: vi.fn(),
  getImpersonationStatus: vi.fn(),
  ImpersonationAbortError: class ImpersonationAbortError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'ImpersonationAbortError';
    }
  },
}));

import impersonationRoutes from '../routes/admin/impersonation.js';
import { getImpersonationStatus } from '../services/impersonation.service.js';

const getImpersonationStatusMock = vi.mocked(getImpersonationStatus);

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  await server.register(impersonationRoutes, { prefix: '/api/control' });
  await server.ready();
  return server;
}

function setAdminRole(role: string): void {
  TEST_ADMIN_ROLE.value = role;
}

describe('HARDENING-008 — T-IMP-017 — impersonation status SUPER_ADMIN preHandler contract', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    setAdminRole('SUPER_ADMIN');
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  // ── T-IMP-017 ─────────────────────────────────────────────────────────────

  it('T-IMP-017: denies SUPPORT admin from reading impersonation session status (403)', async () => {
    setAdminRole('SUPPORT');

    const response = await server.inject({
      method: 'GET',
      url: `/api/control/impersonation/status/${TEST_IMPERSONATION_ID}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toEqual(
      expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    );
    expect(getImpersonationStatusMock).not.toHaveBeenCalled();
  });

  it('T-IMP-017 (variant): denies ANALYST admin from reading impersonation session status (403)', async () => {
    setAdminRole('ANALYST');

    const response = await server.inject({
      method: 'GET',
      url: `/api/control/impersonation/status/${TEST_IMPERSONATION_ID}`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toEqual(
      expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    );
    expect(getImpersonationStatusMock).not.toHaveBeenCalled();
  });

  // ── Control case: SUPER_ADMIN allowed ─────────────────────────────────────

  it('SUPER_ADMIN control case: allows status lookup and invokes the service', async () => {
    getImpersonationStatusMock.mockResolvedValue({
      impersonationId: TEST_IMPERSONATION_ID,
      adminId: TEST_ADMIN_ID,
      orgId: 'org-001',
      startedAt: new Date('2026-05-27T10:00:00Z'),
      expiresAt: new Date('2026-05-27T10:30:00Z'),
      endedAt: null,
      active: true,
    });

    const response = await server.inject({
      method: 'GET',
      url: `/api/control/impersonation/status/${TEST_IMPERSONATION_ID}`,
    });

    expect(response.statusCode).toBe(200);
    expect(getImpersonationStatusMock).toHaveBeenCalledOnce();
    expect(getImpersonationStatusMock).toHaveBeenCalledWith(
      prismaHolder,
      TEST_ADMIN_ID,
      'SUPER_ADMIN',
      TEST_IMPERSONATION_ID,
    );
  });
});
