vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/database-context.js', () => ({
  withAdminContext: vi.fn(),
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('../services/publicB2BProjection.service.js', () => ({
  getPublicB2BSupplierBySlug: vi.fn(),
}));

vi.mock('../config/index.js', () => ({
  config: {
    ACQUISITION_PROVISIONING_WEBHOOK_SECRET: 'x'.repeat(64),
    FRONTEND_URL: 'https://www.texqtic.com',
  },
}));

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import acquisitionProvisioningRoutes from '../routes/internal/acquisitionProvisioning.js';
import { withAdminContext } from '../lib/database-context.js';
import { writeAuditLog } from '../lib/auditLog.js';
import { getPublicB2BSupplierBySlug } from '../services/publicB2BProjection.service.js';
import { prisma } from '../db/prisma.js';

type OrgRow = {
  id: string;
  slug: string;
  legal_name: string;
  publication_posture: string;
  status: string;
  external_orchestration_ref: string;
  jurisdiction: string;
};

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  externalOrchestrationRef: string;
  publicEligibilityPosture: string;
};

type MockState = {
  organizations: OrgRow[];
  tenants: TenantRow[];
};

const ENDPOINT = '/api/internal/acquisition/provision-supplier';
const SECRET = 'x'.repeat(64);

function canonicalBody(payload: Record<string, unknown>): string {
  const obj: Record<string, unknown> = {
    eventName: payload.eventName,
    eventId: payload.eventId,
    requestedAt: payload.requestedAt,
    external_orchestration_ref: payload.external_orchestration_ref,
    crmSupplierId: payload.crmSupplierId,
    supplierName: payload.supplierName,
    publication_posture_target: payload.publication_posture_target,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'cluster')) {
    obj.cluster = payload.cluster;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
    obj.category = payload.category;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'likelyPrimarySegment')) {
    obj.likelyPrimarySegment = payload.likelyPrimarySegment;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'provisionalPlan')) {
    obj.provisionalPlan = payload.provisionalPlan;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'jurisdiction')) {
    obj.jurisdiction = payload.jurisdiction;
  }

  return JSON.stringify(obj);
}

function signPayload(payload: Record<string, unknown>, tsMs: number): string {
  const { createHash, createHmac } = require('node:crypto') as typeof import('node:crypto');
  const bodyHash = createHash('sha256').update(canonicalBody(payload), 'utf8').digest('hex');
  const canonical = `provision:${tsMs}:${bodyHash}`;
  return createHmac('sha256', SECRET).update(canonical, 'utf8').digest('hex');
}

function buildTx(state: MockState) {
  return {
    organizations: {
      findUnique: vi.fn(async ({ where }: { where: { external_orchestration_ref: string } }) => {
        const row = state.organizations.find(
          org => org.external_orchestration_ref === where.external_orchestration_ref,
        );

        if (!row) {
          return null;
        }

        return {
          id: row.id,
          slug: row.slug,
          legal_name: row.legal_name,
          publication_posture: row.publication_posture,
          status: row.status,
        };
      }),
      findMany: vi.fn(async ({ where }: { where: { slug: { startsWith: string } } }) => {
        return state.organizations
          .filter(org => org.slug.startsWith(where.slug.startsWith))
          .map(org => ({ slug: org.slug }));
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.organizations.push({
          id: data.id as string,
          slug: data.slug as string,
          legal_name: data.legal_name as string,
          publication_posture: data.publication_posture as string,
          status: 'ACTIVE',
          external_orchestration_ref: data.external_orchestration_ref as string,
          jurisdiction: data.jurisdiction as string,
        });

        return { id: data.id as string };
      }),
    },
    tenant: {
      findMany: vi.fn(async ({ where }: { where: { slug: { startsWith: string } } }) => {
        return state.tenants
          .filter(tenant => tenant.slug.startsWith(where.slug.startsWith))
          .map(tenant => ({ slug: tenant.slug }));
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.tenants.push({
          id: data.id as string,
          slug: data.slug as string,
          name: data.name as string,
          externalOrchestrationRef: data.externalOrchestrationRef as string,
          publicEligibilityPosture: data.publicEligibilityPosture as string,
        });
        return { id: data.id as string };
      }),
    },
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(acquisitionProvisioningRoutes, { prefix: '/api/internal' });
  await app.ready();
  return app;
}

function basePayload(): Record<string, unknown> {
  return {
    eventName: 'public_supplier_profile.provision_requested.v1',
    eventId: 'event-001',
    requestedAt: '2026-05-16T10:00:00.000Z',
    external_orchestration_ref: 'crm-onboarding-001',
    crmSupplierId: 'crm-supplier-001',
    supplierName: 'Acme Textiles Pvt Ltd',
    publication_posture_target: 'B2B_PUBLIC',
  };
}

let app: FastifyInstance;
let state: MockState;

beforeEach(async () => {
  vi.clearAllMocks();

  state = {
    organizations: [],
    tenants: [],
  };

  vi.mocked(withAdminContext).mockImplementation(async (_prisma, callback) => callback(buildTx(state)));

  vi.mocked(getPublicB2BSupplierBySlug).mockImplementation(async (slug: string) => ({
    orgId: 'org-001',
    profile: {
      slug,
      publicationPosture: 'B2B_PUBLIC',
    },
  } as never));

  vi.mocked(writeAuditLog).mockResolvedValue(undefined);
  vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback({}));

  app = await buildApp();
});

describe('POST /api/internal/acquisition/provision-supplier', () => {
  it('WEBHOOK-001: missing HMAC headers -> 401', async () => {
    const response = await app.inject({ method: 'POST', url: ENDPOINT, payload: basePayload() });

    expect(response.statusCode).toBe(401);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-002: invalid timestamp header -> 401', async () => {
    const payload = basePayload();
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': 'bad-ts',
        'x-texqtic-provisioning-hmac': 'deadbeef',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-003: replay window exceeded -> 401', async () => {
    const payload = basePayload();
    const tsMs = Date.now() - 120_000;

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(401);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-004: invalid signature -> 401', async () => {
    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': '00'.repeat(32),
      },
    });

    expect(response.statusCode).toBe(401);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-005: valid signature + new payload -> 201 provisioned', async () => {
    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.accepted).toBe(true);
    expect(body.idempotent).toBe(false);
    expect(body.status).toBe('provisioned');
    expect(body.publicUrl).toContain('/supplier/');
    expect(writeAuditLog).toHaveBeenCalledTimes(2);
    expect(vi.mocked(writeAuditLog).mock.calls[0][1].action).toBe(
      'internal.public_supplier_profile.provision_requested',
    );
    expect(vi.mocked(writeAuditLog).mock.calls[1][1].action).toBe(
      'internal.public_supplier_profile.provisioned',
    );
  });

  it('WEBHOOK-006: missing required field -> 400', async () => {
    const payload = basePayload();
    delete payload.supplierName;
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-007: wrong eventName -> 400', async () => {
    const payload = {
      ...basePayload(),
      eventName: 'public_supplier_profile.bad_event.v1',
    };
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-008: prohibited field present -> 400', async () => {
    const payload = {
      ...basePayload(),
      contact_email: 'unsafe@example.com',
    };
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-009: jurisdiction absent -> defaults to IN', async () => {
    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(201);
    expect(state.organizations[0].jurisdiction).toBe('IN');
  });

  it('WEBHOOK-010: jurisdiction supplied -> uses supplied value', async () => {
    const payload = {
      ...basePayload(),
      jurisdiction: 'AE',
    };
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(201);
    expect(state.organizations[0].jurisdiction).toBe('AE');
  });

  it('WEBHOOK-011: replay same external_orchestration_ref -> 200 already_exists', async () => {
    state.organizations.push({
      id: 'org-existing-1',
      slug: 'acme-textiles',
      legal_name: 'Acme Textiles Pvt Ltd',
      publication_posture: 'B2B_PUBLIC',
      status: 'ACTIVE',
      external_orchestration_ref: 'crm-onboarding-001',
      jurisdiction: 'IN',
    });

    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('already_exists');
    expect(body.idempotent).toBe(true);
  });

  it('WEBHOOK-012: same ref with conflicting supplierName -> 409', async () => {
    state.organizations.push({
      id: 'org-existing-2',
      slug: 'acme-textiles',
      legal_name: 'Different Supplier Name',
      publication_posture: 'B2B_PUBLIC',
      status: 'ACTIVE',
      external_orchestration_ref: 'crm-onboarding-001',
      jurisdiction: 'IN',
    });

    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(409);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('WEBHOOK-013: gate failed -> 202 and gate_failed event', async () => {
    state.organizations.push({
      id: 'org-existing-3',
      slug: 'acme-textiles',
      legal_name: 'Acme Textiles Pvt Ltd',
      publication_posture: 'PRIVATE_OR_AUTH_ONLY',
      status: 'ACTIVE',
      external_orchestration_ref: 'crm-onboarding-001',
      jurisdiction: 'IN',
    });

    vi.mocked(getPublicB2BSupplierBySlug).mockResolvedValue(null);

    const payload = basePayload();
    const tsMs = Date.now();

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload,
      headers: {
        'x-texqtic-provisioning-ts': String(tsMs),
        'x-texqtic-provisioning-hmac': signPayload(payload, tsMs),
      },
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('gate_failed');
    expect(body.publicUrl).toBeNull();

    expect(writeAuditLog).toHaveBeenCalledTimes(2);
    expect(vi.mocked(writeAuditLog).mock.calls[1][1].action).toBe(
      'internal.public_supplier_profile.gate_failed',
    );
  });

  it('WEBHOOK-014: unauthorized requests emit no events', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: basePayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});
