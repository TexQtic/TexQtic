import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    auditLog: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../config/index.js', () => ({
  config: {
    ADMIN_NOTIFICATION_EMAIL: null as string | null,
    CRM_MAINAPP_TIER0_BASE_URL: 'https://crm.texqtic.com' as string | undefined,
    CRM_MAINAPP_TIER0_INGESTION_SECRET: 'test-shared-secret-that-is-32-chars-long' as string | undefined,
  },
}));

vi.mock('../services/crmTier0NotifyClient.js', () => ({
  notifyCrmTier0Capture: vi.fn(),
}));

vi.mock('../services/crmLifecycleNotifyClient.js', () => ({
  notifyRegistrationSubmitted: vi.fn().mockResolvedValue({ dispatch_status: 'NOOP_SKIPPED' }),
}));

vi.mock('../services/email/email.service.js', () => ({
  sendBuyerInquiryAcknowledgementEmail: vi.fn(),
  sendSupplierInquiryNotificationEmail: vi.fn(),
  sendAdminInquiryAlertEmail: vi.fn(),
}));

vi.mock('../services/publicB2BProjection.service.js', () => ({
  listPublicB2BSuppliers: vi.fn(),
  getPublicB2BSupplierBySlug: vi.fn(),
}));

vi.mock('../services/publicB2CProjection.service.js', () => ({
  listPublicB2CProducts: vi.fn(),
  getPublicB2CProductBySlug: vi.fn(),
}));

vi.mock('../lib/hostNormalize.js', () => ({
  normalizeHost: vi.fn(),
  parsePlatformHost: vi.fn(),
}));

vi.mock('./internal/resolveDomain.js', () => ({
  resolveHostToTenant: vi.fn(),
}));

import publicRoutes from '../routes/public.js';
import { prisma } from '../db/prisma.js';
import { getPersistedDirectRegistrationRoleIntentByTenantId } from '../services/publicDirectRegistration.service.js';
import { notifyRegistrationSubmitted } from '../services/crmLifecycleNotifyClient.js';

type MockTx = {
  $executeRawUnsafe: ReturnType<typeof vi.fn>;
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  tenant: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  organizations: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  membership: {
    create: ReturnType<typeof vi.fn>;
  };
  invite: {
    create: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
};

const ENDPOINT = '/api/public/register';

function buildTransactionMock(overrides?: {
  existingUserId?: string | null;
  tenantSlug?: string;
}): MockTx {
  const existingUserId = overrides?.existingUserId ?? null;
  const tenantSlug = overrides?.tenantSlug ?? 'acme-textiles';

  return {
    $executeRawUnsafe: vi.fn(async () => []),
    user: {
      findUnique: vi.fn(async () => (existingUserId ? { id: existingUserId } : null)),
      create: vi.fn(async () => ({ id: 'user-1' })),
    },
    tenant: {
      findMany: vi.fn(async () => [{ slug: tenantSlug }]),
      create: vi.fn(async ({ data }) => ({ id: 'tenant-1', slug: data.slug })),
    },
    organizations: {
      findMany: vi.fn(async () => [{ slug: tenantSlug }]),
      update: vi.fn(async () => ({ id: 'tenant-1' })),
    },
    membership: {
      create: vi.fn(async () => ({ id: 'membership-1', role: 'OWNER' })),
    },
    invite: {
      create: vi.fn(async () => ({ id: 'invite-1' })),
    },
    auditLog: {
      create: vi.fn(async () => ({
        id: 'audit-1',
        action: 'public.direct_registration.created',
        tenantId: 'tenant-1',
        actorType: 'SYSTEM',
      })),
    },
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = typeof (error as { statusCode?: number }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

    reply.code(statusCode).send({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Unexpected error',
      },
    });
  });

  await app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

describe('POST /api/public/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates supplier provisional account with OWNER membership and pending verification status', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'acme-textiles' });

    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'A Supplier',
        email: 'supplier@example.com',
        password: 'Password123!',
        companyName: 'Acme Textiles',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.roleIntent).toBe('supplier');
    expect(body.data.organizationStatus).toBe('PENDING_VERIFICATION');
    expect(body.data.membershipRole).toBe('OWNER');
    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'OWNER' }) }),
    );
    expect(tx.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_VERIFICATION' }) }),
    );
    expect(tx.invite.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'public.direct_registration.created',
          metadataJson: expect.objectContaining({ roleIntent: 'supplier' }),
        }),
      }),
    );

    await app.close();
  });

  it('creates buyer provisional account and preserves role intent', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'buyer-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'buyer',
        name: 'Buyer User',
        email: 'buyer@example.com',
        password: 'Password123!',
        companyName: 'Buyer Co',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.roleIntent).toBe('buyer');
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'public.direct_registration.created',
          metadataJson: expect.objectContaining({ roleIntent: 'buyer' }),
        }),
      }),
    );

    await app.close();
  });

  it('creates service-provider provisional account and preserves role intent', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'svc-pro' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'service_provider',
        name: 'Service User',
        email: 'service@example.com',
        password: 'Password123!',
        companyName: 'Service Pro',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.roleIntent).toBe('service_provider');
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'public.direct_registration.created',
          metadataJson: expect.objectContaining({ roleIntent: 'service_provider' }),
        }),
      }),
    );

    await app.close();
  });

  it('returns conflict for duplicate email', async () => {
    const tx = buildTransactionMock({ existingUserId: 'user-existing', tenantSlug: 'dup-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'Duplicate User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        companyName: 'Duplicate Co',
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DUPLICATE_EMAIL');

    await app.close();
  });

  it('rejects invalid role intent payload', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'invalid-role-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'unknown',
        name: 'Invalid Role',
        email: 'invalid@example.com',
        password: 'Password123!',
        companyName: 'Invalid Co',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('emits CRM registration lifecycle event after successful registration', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'crm-test-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'CRM Test User',
        email: 'crm-test@example.com',
        password: 'Password123!',
        companyName: 'CRM Test Co',
      },
    });

    expect(response.statusCode).toBe(201);
    // Sender is now awaited — no drainTick needed; mock must be called by the time inject() resolves.
    expect(vi.mocked(notifyRegistrationSubmitted)).toHaveBeenCalledOnce();

    await app.close();
  });

  it('CRM lifecycle event call includes email and role intent, excludes passwordHash', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'crm-payload-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'buyer',
        name: 'Payload User',
        email: 'PAYLOAD@EXAMPLE.COM',
        password: 'Password123!',
        companyName: 'Payload Co',
      },
    });

    // Sender is awaited — mock is called before inject() resolves; no drainTick needed.
    expect(vi.mocked(notifyRegistrationSubmitted)).toHaveBeenCalledOnce();
    const callArg = vi.mocked(notifyRegistrationSubmitted).mock.calls[0][0];

    // Email must be lowercase-normalized
    expect(callArg.email).toBe('payload@example.com');
    expect(callArg.roleIntent).toBe('buyer');
    expect(callArg.orgStatus).toBe('PENDING_VERIFICATION');
    expect(callArg.externalOrchestrationRef).toBeNull();
    // passwordHash must never appear
    expect(callArg).not.toHaveProperty('passwordHash');

    await app.close();
  });

  it('CRM lifecycle event failure does not fail registration', async () => {
    const tx = buildTransactionMock({ tenantSlug: 'crm-fail-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));
    vi.mocked(notifyRegistrationSubmitted).mockRejectedValueOnce(new Error('CRM down'));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'CRM Fail User',
        email: 'crmfail@example.com',
        password: 'Password123!',
        companyName: 'CRM Fail Co',
      },
    });

    // Registration must succeed even when CRM notify throws
    expect(response.statusCode).toBe(201);

    await app.close();
  });

  it('CRM lifecycle event is NOT called for duplicate email (registration fails)', async () => {
    const tx = buildTransactionMock({ existingUserId: 'user-existing', tenantSlug: 'dup-co' });
    vi.mocked(prisma.$transaction).mockImplementation(async callback => callback(tx as never));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'Duplicate User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        companyName: 'Duplicate Co',
      },
    });

    expect(response.statusCode).toBe(409);
    // Sender is not reached when registration fails; no drainTick needed.
    expect(vi.mocked(notifyRegistrationSubmitted)).not.toHaveBeenCalled();

    await app.close();
  });
});

describe('getPersistedDirectRegistrationRoleIntentByTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns persisted supplier role intent from registration audit metadata', async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      metadataJson: {
        roleIntent: 'supplier',
      },
    } as never);

    const persisted = await getPersistedDirectRegistrationRoleIntentByTenantId('tenant-1');

    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'public.direct_registration.created',
        }),
      }),
    );
    expect(persisted).toEqual({
      roleIntent: 'supplier',
      source: 'audit_log.public.direct_registration.created',
    });
  });

  it('returns persisted buyer role intent from registration audit metadata', async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      metadataJson: {
        roleIntent: 'buyer',
      },
    } as never);

    const persisted = await getPersistedDirectRegistrationRoleIntentByTenantId('tenant-2');

    expect(persisted).toEqual({
      roleIntent: 'buyer',
      source: 'audit_log.public.direct_registration.created',
    });
  });

  it('returns persisted service_provider role intent from registration audit metadata', async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      metadataJson: {
        roleIntent: 'service_provider',
      },
    } as never);

    const persisted = await getPersistedDirectRegistrationRoleIntentByTenantId('tenant-3');

    expect(persisted).toEqual({
      roleIntent: 'service_provider',
      source: 'audit_log.public.direct_registration.created',
    });
  });

  it('returns null when registration audit metadata has invalid role intent', async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      metadataJson: {
        roleIntent: 'unknown',
      },
    } as never);

    const persisted = await getPersistedDirectRegistrationRoleIntentByTenantId('tenant-4');

    expect(persisted).toBeNull();
  });
});
