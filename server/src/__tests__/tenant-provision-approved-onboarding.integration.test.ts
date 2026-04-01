import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const {
  adminAuthMiddlewareMock,
  requireAdminRoleMock,
  provisionTenantMock,
  writeAuditLogMock,
  createAdminAuditMock,
  serviceBearerToken,
} = vi.hoisted(() => ({
  adminAuthMiddlewareMock: vi.fn(async (req: unknown) => {
    const request = req as Record<string, unknown>;
    request.isAdmin = true;
    request.adminId = 'admin-uuid-1';
    request.adminRole = 'SUPER_ADMIN';
  }),
  requireAdminRoleMock: vi.fn(() => async () => undefined),
  provisionTenantMock: vi.fn(),
  writeAuditLogMock: vi.fn().mockResolvedValue(undefined),
  createAdminAuditMock: vi.fn().mockReturnValue({}),
  serviceBearerToken: 'crm-approved-onboarding-service-token',
}));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: adminAuthMiddlewareMock,
  requireAdminRole: requireAdminRoleMock,
}));

vi.mock('../config/index.js', () => ({
  config: {
    APPROVED_ONBOARDING_SERVICE_TOKEN_HASH: createHash('sha256').update(serviceBearerToken).digest('hex'),
  },
}));

vi.mock('../services/tenantProvision.service.js', () => ({
  provisionTenant: provisionTenantMock,
}));

vi.mock('../db/prisma.js', () => ({ prisma: {} }));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: writeAuditLogMock,
  createAdminAudit: createAdminAuditMock,
}));

import tenantProvisionRoutes from '../routes/admin/tenantProvision.js';

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
        firstOwner: { email: 'owner@acme.test' },
      }),
      expect.objectContaining({
        adminActorId: 'admin-uuid-1',
      })
    );

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
        tenant_category: 'B2B',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(adminAuthMiddlewareMock).toHaveBeenCalled();
    expect(provisionTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgName: 'Legacy Org',
        primaryAdminEmail: 'admin@legacy.test',
      }),
      expect.objectContaining({
        adminActorId: 'admin-uuid-1',
      })
    );

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