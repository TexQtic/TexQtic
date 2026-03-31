import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { provisionTenant } from './tenantProvision.service.js';

interface MockTx {
  $executeRawUnsafe: Mock;
  $queryRaw: Mock;
  tenant: {
    create: Mock;
  };
  organizations: {
    upsert: Mock;
  };
  user: {
    findUnique: Mock;
    create: Mock;
  };
  membership: {
    create: Mock;
  };
  invite: {
    create: Mock;
  };
}

const { prismaMock, tx } = vi.hoisted(() => {
  const tx: MockTx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ is_admin: 'true' }]),
    tenant: {
      create: vi.fn(),
    },
    organizations: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    membership: {
      create: vi.fn(),
    },
    invite: {
      create: vi.fn(),
    },
  };

  const prismaMock = {
    $transaction: vi.fn((cb: (client: MockTx) => Promise<unknown>) => cb(tx)),
  };

  return { prismaMock, tx };
});

vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));

describe('tenantProvision.service', () => {
  const legacyAdminPassword = ['legacy-admin', 'test-passphrase'].join('-');

  beforeEach(() => {
    vi.clearAllMocks();

    tx.$executeRawUnsafe.mockResolvedValue(undefined);
    tx.$queryRaw.mockResolvedValue([{ is_admin: 'true' }]);
    tx.tenant.create.mockResolvedValue({
      id: 'tenant-uuid-0000-0000-0000-000000000001',
      slug: 'acme-textiles',
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'FREE',
    });
    tx.organizations.upsert.mockResolvedValue({
      legal_name: 'Acme Textiles LLC',
      jurisdiction: 'US-DE',
      registration_no: 'REG-123',
      status: 'PENDING_VERIFICATION',
    });
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'user-uuid-0000-0000-0000-000000000001' });
    tx.membership.create.mockResolvedValue({ id: 'membership-uuid-0000-0000-0000-000000000001' });
    tx.invite.create.mockResolvedValue({
      id: 'invite-uuid-0000-0000-0000-000000000001',
      email: 'owner@acme.test',
      expiresAt: new Date('2026-04-07T00:00:00.000Z'),
    });
  });

  it('creates tenant plus organization plus distinct first-owner invite for approved onboarding', async () => {
    const result = await provisionTenant(
      {
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
          email: 'owner@acme.test',
        },
        approvedOnboardingMetadata: {
          crmStatus: 'admin_approved',
        },
      },
      {
        requestId: 'req-1',
        adminActorId: 'admin-1',
      }
    );

    expect(tx.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Acme Textiles',
          externalOrchestrationRef: 'ocase_12345',
        }),
      })
    );
    expect(tx.organizations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          legal_name: 'Acme Textiles LLC',
          jurisdiction: 'US-DE',
          registration_no: 'REG-123',
          external_orchestration_ref: 'ocase_12345',
          status: 'PENDING_VERIFICATION',
        }),
      })
    );
    expect(tx.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-uuid-0000-0000-0000-000000000001',
          email: 'owner@acme.test',
          externalOrchestrationRef: 'ocase_12345',
          invitePurpose: 'FIRST_OWNER_PREPARATION',
          role: 'OWNER',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
    expect(tx.user.findUnique).not.toHaveBeenCalled();
    expect(tx.membership.create).not.toHaveBeenCalled();
    expect(result.provisioningMode).toBe('APPROVED_ONBOARDING');
    expect(result.orchestrationReference).toBe('ocase_12345');
    expect(result.firstOwnerAccessPreparation).toMatchObject({
      artifactType: 'PLATFORM_INVITE',
      inviteId: 'invite-uuid-0000-0000-0000-000000000001',
      invitePurpose: 'FIRST_OWNER_PREPARATION',
      email: 'owner@acme.test',
      role: 'OWNER',
    });
    expect(result.firstOwnerAccessPreparation?.inviteToken.length).toBeGreaterThan(0);
  });

  it('preserves legacy admin provisioning without creating an invite artifact', async () => {
    tx.organizations.upsert.mockResolvedValue({
      legal_name: 'Legacy Org',
      jurisdiction: 'UNKNOWN',
      registration_no: null,
      status: 'ACTIVE',
    });

    const result = await provisionTenant(
      {
        orgName: 'Legacy Org',
        primaryAdminEmail: 'admin@legacy.test',
        primaryAdminPassword: legacyAdminPassword,
        tenant_category: 'B2B',
      },
      {
        requestId: 'req-2',
        adminActorId: 'admin-2',
      }
    );

    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@legacy.test' }, select: { id: true } });
    expect(tx.membership.create).toHaveBeenCalledOnce();
    expect(tx.invite.create).not.toHaveBeenCalled();
    expect(result.provisioningMode).toBe('LEGACY_ADMIN');
    expect(result.userId).toBe('user-uuid-0000-0000-0000-000000000001');
    expect(result.membershipId).toBe('membership-uuid-0000-0000-0000-000000000001');
    expect(result.firstOwnerAccessPreparation).toBeNull();
  });
});