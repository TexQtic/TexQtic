import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';

const {
  adminAuthMiddlewareMock,
  requireAdminRoleMock,
  tenantAuthMiddlewareMock,
  databaseContextMiddlewareMock,
  provisionTenantMock,
  writeAuditLogMock,
  createAdminAuditMock,
  withDbContextMock,
  serviceBearerToken,
  prismaMock,
  txMock,
} = vi.hoisted(() => ({
  adminAuthMiddlewareMock: vi.fn(async (req: unknown) => {
    const request = req as Record<string, unknown>;
    request.isAdmin = true;
    request.adminId = 'admin-uuid-1';
    request.adminRole = 'SUPER_ADMIN';
  }),
  requireAdminRoleMock: vi.fn(() => async () => undefined),
  tenantAuthMiddlewareMock: vi.fn(async (_req: unknown) => undefined),
  databaseContextMiddlewareMock: vi.fn(async (_req: unknown) => undefined),
  provisionTenantMock: vi.fn(),
  writeAuditLogMock: vi.fn().mockResolvedValue(undefined),
  createAdminAuditMock: vi.fn().mockReturnValue({}),
  withDbContextMock: vi.fn(),
  serviceBearerToken: 'crm-approved-onboarding-service-token',
  prismaMock: {
    invite: {
      findFirst: vi.fn(),
    },
  },
  txMock: {
    $queryRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizations: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    invite: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: adminAuthMiddlewareMock,
  requireAdminRole: requireAdminRoleMock,
  tenantAuthMiddleware: tenantAuthMiddlewareMock,
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: databaseContextMiddlewareMock,
}));

vi.mock('../config/index.js', () => ({
  config: {
    APPROVED_ONBOARDING_SERVICE_TOKEN_HASH: createHash('sha256').update(serviceBearerToken).digest('hex'),
  },
}));

vi.mock('../services/tenantProvision.service.js', () => ({
  provisionTenant: provisionTenantMock,
}));

vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../lib/database-context.js', () => ({
  canonicalizeTenantPlan: vi.fn((plan: string) => {
    switch (plan) {
      case 'FREE':
      case 'STARTER':
      case 'PROFESSIONAL':
      case 'ENTERPRISE':
        return plan;
      default:
        throw new Error(`Invalid tenant plan: ${plan}`);
    }
  }),
  withDbContext: withDbContextMock,
  getOrganizationIdentity: vi.fn(),
  OrganizationNotFoundError: class OrganizationNotFoundError extends Error {},
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: writeAuditLogMock,
  createAdminAudit: createAdminAuditMock,
}));

vi.mock('../services/stateMachine.service.js', () => ({
  StateMachineService: class StateMachineService {
    noop(): void {}
  },
}));

vi.mock('../routes/tenant/escalation.g022.js', () => ({
  default: async () => undefined,
}));

vi.mock('../routes/tenant/trades.g017.js', () => ({
  default: async () => undefined,
}));

vi.mock('../routes/tenant/escrow.g018.js', () => ({
  default: async () => undefined,
}));

vi.mock('../routes/tenant/settlement.js', () => ({
  default: async () => undefined,
}));

vi.mock('../routes/tenant/certifications.g019.js', () => ({
  default: async () => undefined,
}));

vi.mock('../routes/tenant/traceability.g016.js', () => ({
  default: async () => undefined,
}));

vi.mock('../services/pricing/totals.service.js', () => ({
  computeTotals: vi.fn(),
  TotalsInputError: class TotalsInputError extends Error {},
}));

vi.mock('../services/email/email.service.js', () => ({
  sendInviteMemberEmail: vi.fn(),
}));

vi.mock('../lib/cacheInvalidateEmitter.js', () => ({
  emitCacheInvalidate: vi.fn(),
}));

vi.mock('../services/vectorIngestion.js', () => ({
  enqueueSourceIngestion: vi.fn(),
  enqueueSourceDeletion: vi.fn(),
}));

vi.mock('../services/counterpartyProfileAggregation.service.js', () => ({
  getCounterpartyProfileAggregation: vi.fn(),
  listCounterpartyDiscoveryEntries: vi.fn(),
}));

import tenantProvisionRoutes from '../routes/admin/tenantProvision.js';
import tenantRoutes from '../routes/tenant.js';

describe('approved-onboarding tenant provisioning route', () => {
  let app: FastifyInstance;
  const legacyProvisionPassword = ['legacy', 'provision', 'password'].join('-');

  beforeEach(async () => {
    vi.clearAllMocks();

    provisionTenantMock.mockResolvedValue({
      provisioningMode: 'APPROVED_ONBOARDING',
      orgId: 'tenant-uuid-0000-0000-0000-000000000001',
      slug: 'acme-textiles',
      userId: null,
      membershipId: null,
      orchestrationReference: 'ocase_12345',
      organization: {
        legalName: 'Acme Textiles LLC',
        jurisdiction: 'US-DE',
        registrationNumber: 'REG-123',
        status: 'VERIFICATION_APPROVED',
      },
      firstOwnerAccessPreparation: {
        artifactType: 'PLATFORM_INVITE',
        inviteId: 'invite-uuid-0000-0000-0000-000000000001',
        invitePurpose: 'FIRST_OWNER_PREPARATION',
        email: 'owner@acme.test',
        role: 'OWNER',
        expiresAt: new Date('2026-04-07T00:00:00.000Z'),
        inviteToken: 'invite-token-123',
      },
    });

    app = Fastify({ logger: false });
    await app.register(tenantProvisionRoutes, { prefix: '/api/control' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts the approved-onboarding handoff shape and returns platform access preparation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/control/tenants/provision',
      payload: {
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        base_family: 'B2B',
        aggregator_capability: false,
        white_label_capability: false,
        commercial_plan: 'PROFESSIONAL',
        organization: {
          legalName: 'Acme Textiles LLC',
          displayName: 'Acme Textiles',
          jurisdiction: 'US-DE',
          registrationNumber: 'REG-123',
        },
        firstOwner: {
          email: 'OWNER@ACME.TEST',
        },
        approvedOnboardingMetadata: {
          crmStatus: 'admin_approved',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(provisionTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        base_family: 'B2B',
        aggregator_capability: false,
        white_label_capability: false,
        commercial_plan: 'PROFESSIONAL',
        firstOwner: { email: 'owner@acme.test' },
      }),
      expect.objectContaining({
        adminActorId: 'admin-uuid-1',
      })
    );
    expect(provisionTenantMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('tenant_category');
    expect(provisionTenantMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('is_white_label');

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      provisioningMode: 'APPROVED_ONBOARDING',
      orgId: 'tenant-uuid-0000-0000-0000-000000000001',
      slug: 'acme-textiles',
      orchestrationReference: 'ocase_12345',
      organization: {
        legalName: 'Acme Textiles LLC',
        jurisdiction: 'US-DE',
        status: 'VERIFICATION_APPROVED',
      },
      firstOwnerAccessPreparation: {
        artifactType: 'PLATFORM_INVITE',
        invitePurpose: 'FIRST_OWNER_PREPARATION',
        email: 'owner@acme.test',
      },
    });
    expect(writeAuditLogMock).toHaveBeenCalledOnce();
    expect(createAdminAuditMock).toHaveBeenCalledWith(
      'admin-uuid-1',
      'control.tenants.provisioned',
      'tenant',
      expect.objectContaining({
        authMode: 'ADMIN_JWT',
        orgId: 'tenant-uuid-0000-0000-0000-000000000001',
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        invitePurpose: 'FIRST_OWNER_PREPARATION',
      })
    );
  });

  it('rejects conflicting canonical and legacy provisioning identity fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/control/tenants/provision',
      payload: {
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        tenant_category: 'B2B',
        base_family: 'B2B',
        aggregator_capability: true,
        white_label_capability: false,
        commercial_plan: 'FREE',
        organization: {
          legalName: 'Acme Textiles LLC',
          displayName: 'Acme Textiles',
          jurisdiction: 'US-DE',
          registrationNumber: 'REG-123',
        },
        firstOwner: {
          email: 'OWNER@ACME.TEST',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(provisionTenantMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('preserves human-admin legacy provisioning on the same seam', async () => {
    provisionTenantMock.mockResolvedValueOnce({
      provisioningMode: 'LEGACY_ADMIN',
      orgId: 'tenant-uuid-legacy-0000-0000-000000000001',
      slug: 'legacy-org',
      userId: 'user-uuid-legacy-0000-0000-000000000001',
      membershipId: 'membership-uuid-legacy-0000-0000-000000000001',
      orchestrationReference: null,
      organization: {
        legalName: 'Legacy Org',
        jurisdiction: 'UNKNOWN',
        registrationNumber: null,
        status: 'ACTIVE',
      },
      firstOwnerAccessPreparation: null,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/control/tenants/provision',
      payload: {
        orgName: 'Legacy Org',
        primaryAdminEmail: 'admin@legacy.test',
        primaryAdminPassword: legacyProvisionPassword,
        plan: 'FREE',
        tenant_category: 'B2B',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(adminAuthMiddlewareMock).toHaveBeenCalled();
    expect(provisionTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgName: 'Legacy Org',
        primaryAdminEmail: 'admin@legacy.test',
        base_family: 'B2B',
        aggregator_capability: false,
        white_label_capability: false,
        commercial_plan: 'FREE',
      }),
      expect.objectContaining({
        adminActorId: 'admin-uuid-1',
      })
    );
    expect(provisionTenantMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('plan');
    expect(provisionTenantMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('tenant_category');
    expect(provisionTenantMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('is_white_label');

    const body = response.json();
    expect(body.data).toMatchObject({
      provisioningMode: 'LEGACY_ADMIN',
      userId: 'user-uuid-legacy-0000-0000-000000000001',
      membershipId: 'membership-uuid-legacy-0000-0000-000000000001',
      firstOwnerAccessPreparation: null,
    });
  });

  it('accepts the dedicated service bearer token for approved-onboarding provisioning only', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/control/tenants/provision',
      headers: {
        authorization: `Bearer ${serviceBearerToken}`,
      },
      payload: {
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        tenant_category: 'B2B',
        is_white_label: false,
        organization: {
          legalName: 'Acme Textiles LLC',
          displayName: 'Acme Textiles',
          jurisdiction: 'US-DE',
          registrationNumber: 'REG-123',
        },
        firstOwner: {
          email: 'OWNER@ACME.TEST',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(adminAuthMiddlewareMock).not.toHaveBeenCalled();
    expect(provisionTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provisioningMode: 'APPROVED_ONBOARDING',
      }),
      expect.objectContaining({
        adminActorId: 'crm-approved-onboarding',
      })
    );
    expect(createAdminAuditMock).toHaveBeenCalledWith(
      'crm-approved-onboarding',
      'control.tenants.provisioned',
      'tenant',
      expect.objectContaining({
        authMode: 'SERVICE_BEARER',
        serviceCallerId: 'crm-approved-onboarding',
        serviceCallerType: 'APPROVED_ONBOARDING',
      })
    );
  });

  it('rejects service bearer use for legacy admin provisioning payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/control/tenants/provision',
      headers: {
        authorization: `Bearer ${serviceBearerToken}`,
      },
      payload: {
        orgName: 'Legacy Org',
        primaryAdminEmail: 'admin@legacy.test',
        primaryAdminPassword: legacyProvisionPassword,
        tenant_category: 'B2B',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(provisionTenantMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });
});

describe('tenant activation invite admission validation', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    withDbContextMock.mockImplementation(async (_client, _dbContext, callback) => callback(txMock as never));
    txMock.$queryRaw.mockResolvedValue([{ org_id: 'tenant-uuid-0000-0000-0000-000000000001' }]);
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    txMock.user.findUnique.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({
      id: 'user-uuid-0000-0000-0000-000000000001',
      email: 'owner@acme.test',
    });
    txMock.organizations.update.mockResolvedValue({
      legal_name: 'Acme Textiles LLC',
      status: 'PENDING_VERIFICATION',
      org_type: 'B2B',
      is_white_label: false,
      plan: 'FREE',
    });
    txMock.organizations.findUnique.mockResolvedValue({
      id: 'tenant-uuid-0000-0000-0000-000000000001',
      slug: 'acme-textiles',
      legal_name: 'Acme Textiles LLC',
      status: 'PENDING_VERIFICATION',
      org_type: 'B2B',
      is_white_label: false,
      jurisdiction: 'US-DE',
      registration_no: 'REG-123',
      plan: 'FREE',
    });
    txMock.tenant.update.mockResolvedValue({ name: 'Acme Textiles' });
    txMock.membership.create.mockResolvedValue({ role: 'OWNER' });
    txMock.invite.update.mockResolvedValue({ acceptedAt: new Date('2026-04-10T00:00:00.000Z') });

    app = Fastify({ logger: false });
    await app.register(fastifyJwt, {
      secret: 'tenant-jwt-test-secret-key-min-32-chars',
      namespace: 'tenant',
      jwtSign: 'tenantJwtSign',
      jwtVerify: 'tenantJwtVerify',
    });
    await app.register(tenantRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects activation payloads with a blank invite token before invite lookup', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: '',
        userData: {
          email: 'owner@acme.test',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.invite.findFirst).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens before any acceptance-side writes or artifacts', async () => {
    const inviteToken = 'invite-token-123';
    prismaMock.invite.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken,
        userData: {
          email: 'owner@acme.test',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.invite.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      include: {
        tenant: {
          include: {
            memberships: true,
          },
        },
      },
    });
    expect(withDbContextMock).not.toHaveBeenCalled();
    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(txMock.membership.create).not.toHaveBeenCalled();
    expect(txMock.invite.update).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();

    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code: 'INVALID_INVITE',
      message: 'Invite not found or expired',
    });
    expect(body).not.toHaveProperty('data');
  });

  it('rejects expired tokens before any acceptance-side writes or artifacts', async () => {
    const inviteToken = 'expired-invite-token-123';
    prismaMock.invite.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken,
        userData: {
          email: 'owner@acme.test',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.invite.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      include: {
        tenant: {
          include: {
            memberships: true,
          },
        },
      },
    });
    expect(withDbContextMock).not.toHaveBeenCalled();
    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(txMock.membership.create).not.toHaveBeenCalled();
    expect(txMock.invite.update).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();

    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code: 'INVALID_INVITE',
      message: 'Invite not found or expired',
    });
    expect(body).not.toHaveProperty('data');
  });

  it('rejects true email mismatches before any activation writes run', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce({
      id: 'invite-uuid-0000-0000-0000-000000000001',
      tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      email: 'owner@acme.test',
      role: 'ADMIN',
      tenant: {
        memberships: [],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: 'invite-token-123',
        userData: {
          email: 'other@acme.test',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(403);
    expect(withDbContextMock).not.toHaveBeenCalled();
    expect(txMock.user.findUnique).not.toHaveBeenCalled();
    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(txMock.membership.create).not.toHaveBeenCalled();
    expect(txMock.invite.update).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();

    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code: 'EMAIL_MISMATCH',
      message: 'Email does not match invite',
    });
    expect(body).not.toHaveProperty('data');
  });

  it('accepts equivalent email casing and completes first-owner activation atomically', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce({
      id: 'invite-uuid-0000-0000-0000-000000000001',
      tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      email: 'owner@acme.test',
      role: 'ADMIN',
      tenant: {
        memberships: [],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: 'invite-token-123',
        userData: {
          email: 'OWNER@ACME.TEST',
          password: 'secret123',
        },
        tenantData: {
          name: 'Acme Textiles',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(withDbContextMock).toHaveBeenCalledTimes(2);
    expect(txMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@acme.test' },
    });
    expect(txMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@acme.test',
          emailVerified: true,
        }),
      })
    );
    expect(txMock.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-uuid-0000-0000-0000-000000000001',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
        role: 'OWNER',
      },
    });
    expect(txMock.invite.update).toHaveBeenCalledWith({
      where: { id: 'invite-uuid-0000-0000-0000-000000000001' },
      data: { acceptedAt: expect.any(Date) },
    });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
        action: 'user.activated',
        entity: 'user',
        metadataJson: expect.objectContaining({
          inviteId: 'invite-uuid-0000-0000-0000-000000000001',
          role: 'OWNER',
          firstOwnerActivated: true,
          verificationStatus: 'PENDING_VERIFICATION',
        }),
      })
    );

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      user: {
        id: 'user-uuid-0000-0000-0000-000000000001',
        email: 'owner@acme.test',
      },
      tenant: {
        id: 'tenant-uuid-0000-0000-0000-000000000001',
        name: 'Acme Textiles LLC',
        slug: 'acme-textiles',
        tenant_category: 'B2B',
        is_white_label: false,
        status: 'PENDING_VERIFICATION',
        plan: 'FREE',
      },
      membership: {
        role: 'OWNER',
      },
    });
    expect(Object.keys(body.data).sort((left, right) => left.localeCompare(right))).toEqual([
      'membership',
      'tenant',
      'token',
      'user',
    ]);
    expect(Object.keys(body.data.user).sort((left, right) => left.localeCompare(right))).toEqual([
      'email',
      'id',
    ]);
    expect(Object.keys(body.data.tenant).sort((left, right) => left.localeCompare(right))).toEqual([
      'id',
      'is_white_label',
      'name',
      'plan',
      'slug',
      'status',
      'tenant_category',
      'type',
    ]);
    expect(body.data.membership).toEqual({ role: 'OWNER' });
    expect(body.data.token).toEqual(expect.any(String));
    expect(body.data).not.toHaveProperty('invite');
    expect(body.data).not.toHaveProperty('inviteToken');
    expect(body.data.user).not.toHaveProperty('passwordHash');
    expect(body.data.tenant).not.toHaveProperty('jurisdiction');
    expect(body.data.tenant).not.toHaveProperty('registration_no');
    expect(body.data.tenant).not.toHaveProperty('memberships');
    expect(body.data.tenant).not.toHaveProperty('tokenHash');
  });

  it('preserves the invited role and records non-first-owner activation metadata when an owner already exists', async () => {
    txMock.membership.create.mockResolvedValueOnce({ role: 'ADMIN' });
    prismaMock.invite.findFirst.mockResolvedValueOnce({
      id: 'invite-uuid-0000-0000-0000-000000000002',
      tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      email: 'admin@acme.test',
      role: 'ADMIN',
      tenant: {
        memberships: [{ role: 'OWNER' }],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: 'invite-token-admin',
        userData: {
          email: 'ADMIN@ACME.TEST',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(txMock.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-uuid-0000-0000-0000-000000000001',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
        role: 'ADMIN',
      },
    });
    expect(txMock.invite.update).toHaveBeenCalledWith({
      where: { id: 'invite-uuid-0000-0000-0000-000000000002' },
      data: { acceptedAt: expect.any(Date) },
    });
    expect(writeAuditLogMock).toHaveBeenCalledWith(txMock, {
      tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      realm: 'TENANT',
      actorType: 'USER',
      actorId: 'user-uuid-0000-0000-0000-000000000001',
      action: 'user.activated',
      entity: 'user',
      entityId: 'user-uuid-0000-0000-0000-000000000001',
      metadataJson: {
        inviteId: 'invite-uuid-0000-0000-0000-000000000002',
        role: 'ADMIN',
        firstOwnerActivated: false,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    });
    expect(txMock.invite.update.mock.invocationCallOrder[0]).toBeLessThan(
      writeAuditLogMock.mock.invocationCallOrder[0]
    );

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.membership).toEqual({ role: 'ADMIN' });
  });

  it('rejects replay or duplicate-use after successful activation and performs no second acceptance writes', async () => {
    prismaMock.invite.findFirst
      .mockResolvedValueOnce({
        id: 'invite-uuid-0000-0000-0000-000000000001',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
        email: 'owner@acme.test',
        role: 'ADMIN',
        tenant: {
          memberships: [],
        },
      })
      .mockResolvedValueOnce(null);

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: 'invite-token-123',
        userData: {
          email: 'owner@acme.test',
          password: 'secret123',
        },
        tenantData: {
          name: 'Acme Textiles',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    const replayResponse = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        inviteToken: 'invite-token-123',
        userData: {
          email: 'owner@acme.test',
          password: 'secret123',
        },
        verificationData: {
          registrationNumber: 'REG-123',
          jurisdiction: 'US-DE',
        },
      },
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(replayResponse.statusCode).toBe(404);
    expect(withDbContextMock).toHaveBeenCalledTimes(2);
    expect(txMock.user.create).toHaveBeenCalledTimes(1);
    expect(txMock.membership.create).toHaveBeenCalledTimes(1);
    expect(txMock.invite.update).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);

    const replayBody = replayResponse.json();
    expect(replayBody.success).toBe(false);
    expect(replayBody.error).toMatchObject({
      code: 'INVALID_INVITE',
      message: 'Invite not found or expired',
    });
    expect(replayBody).not.toHaveProperty('data');
  });
});

describe('tenant membership listing read projection validation', () => {
  let app: FastifyInstance;

  const configureTenantRequestContext = (role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    tenantAuthMiddlewareMock.mockImplementation(async req => {
      const request = req as Record<string, unknown>;
      request.userId = 'user-uuid-tenant-member';
      request.tenantId = 'tenant-uuid-0000-0000-0000-000000000001';
      request.userRole = role;
    });

    databaseContextMiddlewareMock.mockImplementation(async req => {
      const request = req as Record<string, unknown>;
      request.dbContext = {
        orgId: 'tenant-uuid-0000-0000-0000-000000000001',
        actorId: 'user-uuid-tenant-member',
        realm: 'tenant',
        requestId: 'membership-read-request',
      };
    });
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T00:00:00.000Z'));
    vi.clearAllMocks();

    configureTenantRequestContext('ADMIN');
    withDbContextMock.mockImplementation(async (_client, _dbContext, callback) => callback(txMock as never));
    txMock.membership.findMany.mockResolvedValue([
      {
        id: 'membership-uuid-0000-0000-0000-000000000001',
        role: 'OWNER',
        userId: 'user-uuid-tenant-member',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-05T00:00:00.000Z'),
        user: {
          id: 'user-uuid-tenant-member',
          email: 'owner@acme.test',
          emailVerified: true,
        },
      },
    ]);
    txMock.invite.findMany.mockResolvedValue([]);

    app = Fastify({ logger: false });
    await app.register(fastifyJwt, {
      secret: 'tenant-jwt-test-secret-key-min-32-chars',
      namespace: 'tenant',
      jwtSign: 'tenantJwtSign',
      jwtVerify: 'tenantJwtVerify',
    });
    await app.register(tenantRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await app.close();
  });

  it('returns memberships plus a pending-invite projection with pending-only safe fields', async () => {
    const seededInvites = [
      {
        id: 'invite-uuid-pending-newest',
        email: 'admin.pending@acme.test',
        role: 'ADMIN',
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-10T12:00:00.000Z'),
        acceptedAt: null,
        tokenHash: 'secret-pending-newest',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      },
      {
        id: 'invite-uuid-pending-older',
        email: 'member.pending@acme.test',
        role: 'MEMBER',
        expiresAt: new Date('2026-04-17T00:00:00.000Z'),
        createdAt: new Date('2026-04-09T08:00:00.000Z'),
        acceptedAt: null,
        tokenHash: 'secret-pending-older',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      },
      {
        id: 'invite-uuid-accepted',
        email: 'accepted@acme.test',
        role: 'MEMBER',
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-10T06:00:00.000Z'),
        acceptedAt: new Date('2026-04-10T07:00:00.000Z'),
        tokenHash: 'secret-accepted',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      },
      {
        id: 'invite-uuid-expired',
        email: 'expired@acme.test',
        role: 'ADMIN',
        expiresAt: new Date('2026-04-10T00:00:00.000Z'),
        createdAt: new Date('2026-04-08T06:00:00.000Z'),
        acceptedAt: null,
        tokenHash: 'secret-expired',
        tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
      },
    ];

    txMock.invite.findMany.mockImplementationOnce(async (args: {
      where: { acceptedAt: null; expiresAt: { gt: Date } };
      select: Record<string, boolean>;
      orderBy: { createdAt: 'desc' | 'asc' };
    }) => {
      return seededInvites
        .filter(invite => invite.acceptedAt === args.where.acceptedAt && invite.expiresAt > args.where.expiresAt.gt)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map(({ id, email, role, expiresAt, createdAt }) => ({
          id,
          email,
          role,
          expiresAt,
          createdAt,
        }));
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/tenant/memberships',
    });

    expect(response.statusCode).toBe(200);
    expect(withDbContextMock).toHaveBeenCalledTimes(1);
    expect(txMock.membership.findMany).toHaveBeenCalledWith({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
          },
        },
      },
    });
    expect(txMock.invite.findMany).toHaveBeenCalledWith({
      where: {
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.memberships).toHaveLength(1);
    expect(body.data.pendingInvites).toEqual([
      {
        id: 'invite-uuid-pending-newest',
        email: 'admin.pending@acme.test',
        role: 'ADMIN',
        expiresAt: '2026-04-18T00:00:00.000Z',
        createdAt: '2026-04-10T12:00:00.000Z',
      },
      {
        id: 'invite-uuid-pending-older',
        email: 'member.pending@acme.test',
        role: 'MEMBER',
        expiresAt: '2026-04-17T00:00:00.000Z',
        createdAt: '2026-04-09T08:00:00.000Z',
      },
    ]);

    for (const invite of body.data.pendingInvites) {
      expect(Object.keys(invite).sort((left, right) => left.localeCompare(right))).toEqual([
        'createdAt',
        'email',
        'expiresAt',
        'id',
        'role',
      ]);
      expect(invite).not.toHaveProperty('acceptedAt');
      expect(invite).not.toHaveProperty('inviteToken');
      expect(invite).not.toHaveProperty('tenantId');
      expect(invite).not.toHaveProperty('tokenHash');
    }
  });

  it('rejects VIEWER membership reads before any membership or invite query executes', async () => {
    configureTenantRequestContext('VIEWER');

    const response = await app.inject({
      method: 'GET',
      url: '/api/tenant/memberships',
    });

    expect(response.statusCode).toBe(403);
    expect(withDbContextMock).not.toHaveBeenCalled();
    expect(txMock.membership.findMany).not.toHaveBeenCalled();
    expect(txMock.invite.findMany).not.toHaveBeenCalled();

    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    });
    expect(body).not.toHaveProperty('data');
  });
});