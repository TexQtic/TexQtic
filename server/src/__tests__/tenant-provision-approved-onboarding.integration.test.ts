import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const { provisionTenantMock, writeAuditLogMock, createAdminAuditMock } = vi.hoisted(() => ({
  provisionTenantMock: vi.fn(),
  writeAuditLogMock: vi.fn().mockResolvedValue(undefined),
  createAdminAuditMock: vi.fn().mockReturnValue({}),
}));

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn((_req: unknown, _rep: unknown, done: () => void) => done()),
  requireAdminRole: vi.fn(() => async () => undefined),
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
        status: 'PENDING_VERIFICATION',
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
    app.addHook('onRequest', async req => {
      (req as unknown as Record<string, unknown>).isAdmin = true;
      (req as unknown as Record<string, unknown>).adminId = 'admin-uuid-1';
      (req as unknown as Record<string, unknown>).adminRole = 'SUPER_ADMIN';
    });
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
        orgId: 'tenant-uuid-0000-0000-0000-000000000001',
        provisioningMode: 'APPROVED_ONBOARDING',
        orchestrationReference: 'ocase_12345',
        invitePurpose: 'FIRST_OWNER_PREPARATION',
      })
    );
  });
});