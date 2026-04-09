import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const {
  TEST_ADMIN_ID,
  TEST_TENANT_ID,
  FAKE_TX,
  prismaHolder,
} = vi.hoisted(() => {
  const FAKE_TX = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    organizations: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const prismaHolder = {
    $transaction: vi.fn(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX)),
  };

  return {
    TEST_ADMIN_ID: '11111111-1111-1111-1111-111111111111',
    TEST_TENANT_ID: '22222222-2222-2222-2222-222222222222',
    FAKE_TX,
    prismaHolder,
  };
});

vi.mock('../db/prisma.js', () => ({ prisma: prismaHolder }));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn((request: Record<string, unknown>, _reply: unknown, done: () => void) => {
    request.isAdmin = true;
    request.adminId = TEST_ADMIN_ID;
    request.adminRole = 'SUPER_ADMIN';
    done();
  }),
  requireAdminRole: vi.fn(
    (_requiredRole: string) => (_request: unknown, _reply: unknown, done: () => void) => done(),
  ),
}));

vi.mock('../lib/auditLog.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/auditLog.js')>('../lib/auditLog.js');
  return {
    ...actual,
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../services/escalation.service.js', () => ({
  EscalationService: vi.fn(function (this: object) { return this; }),
}));

vi.mock('../routes/control/escalation.g022.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/control/trades.g017.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/control/escrow.g018.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/control/settlement.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/control/certifications.g019.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/admin/traceability.g016.js', () => ({
  default: async () => {},
}));

vi.mock('../routes/control/ai.g028.js', () => ({
  default: async () => {},
}));

import controlRoutes from '../routes/control.js';
import { writeAuditLog } from '../lib/auditLog.js';

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  await server.register(controlRoutes, { prefix: '/api/control' });
  await server.ready();
  return server;
}

describe('control onboarding outcome route', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaHolder.$transaction.mockImplementation(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX));
    FAKE_TX.$executeRawUnsafe.mockResolvedValue(undefined);
    FAKE_TX.organizations.findUnique.mockReset();
    FAKE_TX.organizations.update.mockReset();
    FAKE_TX.tenant.findUnique.mockReset();
    FAKE_TX.tenant.update.mockReset();
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('records a status transition and writes the audit entry inside the org-admin write context', async () => {
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Acme Textiles',
      status: 'PENDING_VERIFICATION',
    });
    FAKE_TX.organizations.update.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Acme Textiles',
      status: 'VERIFICATION_APPROVED',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/onboarding/outcome`,
      payload: {
        outcome: 'APPROVED',
        notes: 'Verified during control-plane review.',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(FAKE_TX.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TENANT_ID },
        data: { status: 'VERIFICATION_APPROVED' },
      }),
    );
    expect(writeAuditLog).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledWith(
      FAKE_TX,
      expect.objectContaining({
        action: 'control.tenants.onboarding_outcome.recorded',
        entity: 'organization',
        actorId: TEST_ADMIN_ID,
        metadataJson: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          previousStatus: 'PENDING_VERIFICATION',
          nextStatus: 'VERIFICATION_APPROVED',
          outcome: 'APPROVED',
        }),
      }),
    );

    expect(response.json().data.tenant).toEqual({
      id: TEST_TENANT_ID,
      name: 'Acme Textiles',
      status: 'VERIFICATION_APPROVED',
    });
  });

  it('rejects a duplicate onboarding outcome without writing a second audit entry', async () => {
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Acme Textiles',
      status: 'VERIFICATION_APPROVED',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/onboarding/outcome`,
      payload: {
        outcome: 'APPROVED',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(FAKE_TX.organizations.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
    expect(response.json().error).toEqual(
      expect.objectContaining({
        code: 'ONBOARDING_STATUS_CONFLICT',
      }),
    );
  });

  it('archives a tenant by moving both lifecycle records to CLOSED and auditing the action', async () => {
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'archive-me',
      legal_name: 'Archive Me LLC',
      status: 'ACTIVE',
    });
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'archive-me',
      name: 'Archive Me LLC',
      status: 'ACTIVE',
    });
    FAKE_TX.organizations.update.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'archive-me',
      legal_name: 'Archive Me LLC',
      status: 'CLOSED',
    });
    FAKE_TX.tenant.update.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'archive-me',
      name: 'Archive Me LLC',
      status: 'CLOSED',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/archive`,
      payload: {
        expectedSlug: 'archive-me',
        reason: 'Archive high-confidence test tenant residue.',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(FAKE_TX.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TENANT_ID },
        data: { status: 'CLOSED' },
      }),
    );
    expect(FAKE_TX.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TENANT_ID },
        data: { status: 'CLOSED' },
      }),
    );
    expect(writeAuditLog).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledWith(
      FAKE_TX,
      expect.objectContaining({
        action: 'control.tenants.archive.recorded',
        entity: 'tenant',
        actorId: TEST_ADMIN_ID,
        metadataJson: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          slug: 'archive-me',
          previousTenantStatus: 'ACTIVE',
          nextTenantStatus: 'CLOSED',
          previousOnboardingStatus: 'ACTIVE',
          nextOnboardingStatus: 'CLOSED',
          reason: 'Archive high-confidence test tenant residue.',
        }),
      }),
    );

    expect(response.json().data.tenant).toEqual({
      id: TEST_TENANT_ID,
      slug: 'archive-me',
      name: 'Archive Me LLC',
      status: 'CLOSED',
      onboarding_status: 'CLOSED',
    });
  });

  it('blocks archive attempts for protected QA and review hold tenants', async () => {
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'qa-b2b',
      legal_name: 'QA B2B',
      status: 'ACTIVE',
    });
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'qa-b2b',
      name: 'QA B2B',
      status: 'ACTIVE',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/archive`,
      payload: {
        expectedSlug: 'qa-b2b',
        reason: 'Should never archive protected QA tenants.',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(FAKE_TX.organizations.update).not.toHaveBeenCalled();
    expect(FAKE_TX.tenant.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
    expect(response.json().error).toEqual(
      expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    );
  });
});