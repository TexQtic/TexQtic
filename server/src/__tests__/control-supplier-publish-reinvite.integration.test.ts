import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const {
  TEST_ADMIN_ID,
  TEST_ADMIN_ROLE,
  TEST_TENANT_ID,
  FAKE_TX,
  prismaHolder,
  sendInviteMemberEmailMock,
} = vi.hoisted(() => {
  const FAKE_TX = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    organizations: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invite: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    legalConsentSnapshot: {
      findMany: vi.fn(),
    },
    legalConsentEvent: {
      findMany: vi.fn(),
    },
  };

  const prismaHolder = {
    $transaction: vi.fn(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX)),
  };

  return {
    TEST_ADMIN_ID: '11111111-1111-1111-1111-111111111111',
    TEST_ADMIN_ROLE: { value: 'SUPER_ADMIN' as string },
    TEST_TENANT_ID: '22222222-2222-2222-2222-222222222222',
    FAKE_TX,
    prismaHolder,
    sendInviteMemberEmailMock: vi.fn().mockResolvedValue({ status: 'SENT' }),
  };
});

vi.mock('../db/prisma.js', () => ({ prisma: prismaHolder }));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn((request: Record<string, unknown>, _reply: unknown, done: () => void) => {
    request.isAdmin = true;
    request.adminId = TEST_ADMIN_ID;
    request.adminRole = TEST_ADMIN_ROLE.value;
    done();
  }),
  requireAdminRole: vi.fn(
    (...requiredRoles: string[]) =>
      (request: Record<string, unknown>, reply: { code: (statusCode: number) => { send: (body: unknown) => void } }, done: () => void) => {
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
            error: { code: 'FORBIDDEN', message: `Requires one of: ${requiredRoles.join(', ')}` },
          });
          return;
        }

        done();
      },
  ),
}));

vi.mock('../lib/auditLog.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/auditLog.js')>('../lib/auditLog.js');
  return {
    ...actual,
    writeAuditLog: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../services/email/email.service.js', () => ({
  sendInviteMemberEmail: sendInviteMemberEmailMock,
}));

vi.mock('../services/escalation.service.js', () => ({
  EscalationService: vi.fn(function (this: object) { return this; }),
}));

vi.mock('../routes/control/escalation.g022.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/trades.g017.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/escrow.g018.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/settlement.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/certifications.g019.js', () => ({ default: async () => {} }));
vi.mock('../routes/admin/traceability.g016.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ai.g028.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/gst-verification.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ttp-eligibility.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/invoices.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/vpc.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ttp-routing-stubs.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ttp-enrollments.js', () => ({ default: async () => {} }));
vi.mock('../routes/control/ttp-score-snapshots.js', () => ({ default: async () => {} }));

import controlRoutes from '../routes/control.js';
import { writeAuditLog } from '../lib/auditLog.js';

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  await server.register(controlRoutes, { prefix: '/api/control' });
  await server.ready();
  return server;
}

function setAdminRole(role: string): void {
  TEST_ADMIN_ROLE.value = role;
}

// ─── /publish ─────────────────────────────────────────────────────────────────

describe('POST /api/control/tenants/:id/publish', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    setAdminRole('SUPER_ADMIN');
    prismaHolder.$transaction.mockImplementation(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX));
    FAKE_TX.$executeRawUnsafe.mockResolvedValue(undefined);
    FAKE_TX.organizations.findUnique.mockReset();
    FAKE_TX.organizations.update.mockReset();
    FAKE_TX.tenant.findUnique.mockReset();
    FAKE_TX.tenant.update.mockReset();
    FAKE_TX.invite.findMany.mockResolvedValue([]);
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('publishes an approved tenant and writes the audit entry', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'acme-textiles',
      publicEligibilityPosture: 'NO_PUBLIC_PRESENCE',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Acme Textiles',
      status: 'VERIFICATION_APPROVED',
      is_qa_sentinel: false,
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
    });
    FAKE_TX.tenant.update.mockResolvedValue({});
    FAKE_TX.organizations.update.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Acme Textiles',
      status: 'VERIFICATION_APPROVED',
      publication_posture: 'B2B_PUBLIC',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(200);

    expect(FAKE_TX.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TENANT_ID },
        data: { publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' },
      }),
    );
    expect(FAKE_TX.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_TENANT_ID },
        data: expect.objectContaining({ publication_posture: 'B2B_PUBLIC' }),
      }),
    );

    expect(writeAuditLog).toHaveBeenCalledOnce();
    expect(writeAuditLog).toHaveBeenCalledWith(
      prismaHolder,
      expect.objectContaining({
        action: 'control.tenants.publish.recorded',
        entity: 'tenant',
        actorId: TEST_ADMIN_ID,
        metadataJson: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          slug: 'acme-textiles',
          nextPosture: 'B2B_PUBLIC',
          nextEligibility: 'PUBLICATION_ELIGIBLE',
        }),
      }),
    );

    expect(response.json().data).toEqual(
      expect.objectContaining({
        tenantId: TEST_TENANT_ID,
        slug: 'acme-textiles',
        publicationPosture: 'B2B_PUBLIC',
        publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
        alreadyPublished: false,
      }),
    );
  });

  it('publishes an ACTIVE tenant (not just VERIFICATION_APPROVED)', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'active-supplier',
      publicEligibilityPosture: 'NO_PUBLIC_PRESENCE',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Active Supplier Ltd',
      status: 'ACTIVE',
      is_qa_sentinel: false,
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
    });
    FAKE_TX.tenant.update.mockResolvedValue({});
    FAKE_TX.organizations.update.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Active Supplier Ltd',
      status: 'ACTIVE',
      publication_posture: 'B2B_PUBLIC',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.publicationPosture).toBe('B2B_PUBLIC');
    expect(response.json().data.alreadyPublished).toBe(false);
  });

  it('returns alreadyPublished: true when postures are already correct (idempotent)', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'already-live',
      publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Already Live Co',
      status: 'ACTIVE',
      is_qa_sentinel: false,
      publication_posture: 'B2B_PUBLIC',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.alreadyPublished).toBe(true);
    expect(FAKE_TX.tenant.update).not.toHaveBeenCalled();
    expect(FAKE_TX.organizations.update).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      prismaHolder,
      expect.objectContaining({
        action: 'control.tenants.publish.skipped_already_published',
      }),
    );
  });

  it('returns 404 when tenant does not exist', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue(null);
    FAKE_TX.organizations.findUnique.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(404);
    expect(FAKE_TX.tenant.update).not.toHaveBeenCalled();
  });

  it('returns 409 when org status does not permit publication', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'pending-org',
      publicEligibilityPosture: 'NO_PUBLIC_PRESENCE',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Pending Org',
      status: 'PENDING_VERIFICATION',
      is_qa_sentinel: false,
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toEqual(
      expect.objectContaining({ code: 'TENANT_PUBLISH_STATUS_CONFLICT' }),
    );
    expect(FAKE_TX.tenant.update).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant is a QA sentinel', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'qa-sentinel',
      publicEligibilityPosture: 'NO_PUBLIC_PRESENCE',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'QA Sentinel',
      status: 'ACTIVE',
      is_qa_sentinel: true,
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(403);
    expect(FAKE_TX.tenant.update).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid UUID tenant id', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/control/tenants/not-a-uuid/publish',
    });

    expect(response.statusCode).toBe(400);
    expect(FAKE_TX.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 for non-SUPER_ADMIN role', async () => {
    setAdminRole('SUPPORT');

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/publish`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toEqual(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(FAKE_TX.tenant.findUnique).not.toHaveBeenCalled();
  });
});

// ─── /first-owner/reinvite ────────────────────────────────────────────────────

describe('POST /api/control/tenants/:id/first-owner/reinvite', () => {
  let server: FastifyInstance;

  const FIXED_INVITE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const FIXED_EXPIRES_AT = new Date('2099-01-01T00:00:00.000Z');

  beforeEach(async () => {
    vi.clearAllMocks();
    setAdminRole('SUPER_ADMIN');
    prismaHolder.$transaction.mockImplementation(async (callback: (tx: typeof FAKE_TX) => Promise<unknown>) => callback(FAKE_TX));
    FAKE_TX.$executeRawUnsafe.mockResolvedValue(undefined);
    FAKE_TX.organizations.findUnique.mockReset();
    FAKE_TX.tenant.findUnique.mockReset();
    FAKE_TX.invite.findFirst.mockReset();
    FAKE_TX.invite.updateMany.mockReset();
    FAKE_TX.invite.create.mockReset();
    FAKE_TX.invite.findMany.mockResolvedValue([]);
    sendInviteMemberEmailMock.mockResolvedValue({ status: 'SENT' });
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('creates a new invite, supersedes prior unaccepted invites, dispatches email, and audits', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'shraddha-industries',
      name: 'SHRADDHA INDUSTRIES',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'SHRADDHA INDUSTRIES',
      status: 'VERIFICATION_APPROVED',
      is_qa_sentinel: false,
    });
    FAKE_TX.invite.findFirst.mockResolvedValue({
      id: 'old-invite-id',
      email: 'owner@example.com',
    });
    FAKE_TX.invite.updateMany.mockResolvedValue({ count: 1 });
    FAKE_TX.invite.create.mockResolvedValue({
      id: FIXED_INVITE_ID,
      expiresAt: FIXED_EXPIRES_AT,
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
    });

    expect(response.statusCode).toBe(200);

    // Supersession must have happened
    expect(FAKE_TX.invite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: TEST_TENANT_ID,
          invitePurpose: 'FIRST_OWNER_PREPARATION',
          acceptedAt: null,
        },
        data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
      }),
    );

    // New invite must be created with correct fields
    expect(FAKE_TX.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          email: 'owner@example.com',
          role: 'OWNER',
          invitePurpose: 'FIRST_OWNER_PREPARATION',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      }),
    );

    // Audit must have been written
    expect(writeAuditLog).toHaveBeenCalledWith(
      prismaHolder,
      expect.objectContaining({
        action: 'control.tenants.first_owner_reinvite.recorded',
        entity: 'invite',
        actorId: TEST_ADMIN_ID,
        metadataJson: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          inviteId: FIXED_INVITE_ID,
        }),
      }),
    );

    // Response must not expose raw token or tokenHash
    const data = response.json().data;
    expect(data).toEqual({
      tenantId: TEST_TENANT_ID,
      inviteId: FIXED_INVITE_ID,
      expiresAt: FIXED_EXPIRES_AT.toISOString(),
      emailDispatched: true,
    });
    expect(JSON.stringify(data)).not.toContain('tokenHash');
    expect(JSON.stringify(data)).not.toContain('rawToken');
  });

  it('accepts an email override in the request body', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'supplier-x',
      name: 'Supplier X',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'Supplier X',
      status: 'VERIFICATION_APPROVED',
      is_qa_sentinel: false,
    });
    FAKE_TX.invite.findFirst.mockResolvedValue(null); // no prior invite
    FAKE_TX.invite.updateMany.mockResolvedValue({ count: 0 });
    FAKE_TX.invite.create.mockResolvedValue({
      id: FIXED_INVITE_ID,
      expiresAt: FIXED_EXPIRES_AT,
    });

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
      payload: { email: 'newowner@example.com' },
    });

    expect(response.statusCode).toBe(200);
    expect(FAKE_TX.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'newowner@example.com' }),
      }),
    );
  });

  it('returns 422 when no email is found and none is provided', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'no-email-tenant',
      name: 'No Email',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'No Email',
      status: 'VERIFICATION_APPROVED',
      is_qa_sentinel: false,
    });
    FAKE_TX.invite.findFirst.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error).toEqual(
      expect.objectContaining({ code: 'REINVITE_NO_EMAIL' }),
    );
    expect(FAKE_TX.invite.create).not.toHaveBeenCalled();
  });

  it('returns 404 when tenant does not exist', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue(null);
    FAKE_TX.organizations.findUnique.mockResolvedValue(null);
    FAKE_TX.invite.findFirst.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
    });

    expect(response.statusCode).toBe(404);
    expect(FAKE_TX.invite.create).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant is a QA sentinel', async () => {
    FAKE_TX.tenant.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'qa-keep',
      name: 'QA Keep',
    });
    FAKE_TX.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      legal_name: 'QA Keep',
      status: 'ACTIVE',
      is_qa_sentinel: true,
    });
    FAKE_TX.invite.findFirst.mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
    });

    expect(response.statusCode).toBe(403);
    expect(FAKE_TX.invite.create).not.toHaveBeenCalled();
  });

  it('returns 403 for non-SUPER_ADMIN role', async () => {
    setAdminRole('SUPPORT');

    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toEqual(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(FAKE_TX.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid UUID tenant id', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/control/tenants/not-a-uuid/first-owner/reinvite',
    });

    expect(response.statusCode).toBe(400);
    expect(FAKE_TX.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email in request body', async () => {
    const response = await server.inject({
      method: 'POST',
      url: `/api/control/tenants/${TEST_TENANT_ID}/first-owner/reinvite`,
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
    expect(FAKE_TX.tenant.findUnique).not.toHaveBeenCalled();
  });
});
