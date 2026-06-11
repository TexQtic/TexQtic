/**
 * Unit tests — controlZohoBooksRoutes — Phase 1 Read-Only Monitoring
 *
 * Tests the three read-only SuperAdmin endpoints:
 *   GET /api/control/zoho-books/status
 *   GET /api/control/zoho-books/contacts
 *   GET /api/control/zoho-books/backfill-candidates
 *
 * Verifies:
 *   - AuthZ: SUPER_ADMIN only (401/403 for missing/wrong role)
 *   - Status: tokens only, no raw env values
 *   - Contacts: externalIdStatus PRESENT/MISSING (no raw externalId)
 *   - Contacts: metadataJson absent from response
 *   - Backfill candidates: read-only, includes warning
 *   - No mutation routes exist
 *   - Error summary sanitization
 *
 * No DB access, no live Zoho calls — all dependencies mocked.
 *
 * Run: pnpm exec vitest run src/__tests__/zoho-books-control-routes.unit.test.ts
 *       (from server/ directory)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(),
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  createAdminAudit: vi.fn().mockReturnValue({ realm: 'ADMIN', action: 'test' }),
}));

vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn(),
}));

vi.mock('../services/zoho/zohoBooks.config.js', () => ({
  readZohoBooksRuntimeConfig: vi.fn(),
}));

import { withDbContext } from '../lib/database-context.js';
import { readZohoBooksRuntimeConfig } from '../services/zoho/zohoBooks.config.js';
import controlZohoBooksRoutes from '../routes/control/zoho-books.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildApp({
  isAdmin = true,
  adminRole = 'SUPER_ADMIN',
  adminId = 'admin-uuid-001',
}: {
  isAdmin?: boolean;
  adminRole?: string | null;
  adminId?: string | null;
} = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  // Inject admin auth state (normally provided by adminAuthMiddleware)
  app.addHook('onRequest', async (request) => {
    (request as any).isAdmin = isAdmin;
    (request as any).adminRole = adminRole;
    (request as any).adminId = adminId;
  });

  app.register(controlZohoBooksRoutes, { prefix: '/zoho-books' });

  return app;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ─── /status ─────────────────────────────────────────────────────────────────

describe('GET /zoho-books/status', () => {
  it('returns 401 when not authenticated as admin', async () => {
    const app = buildApp({ isAdmin: false, adminRole: null, adminId: null });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 403 when role is PLATFORM_ADMIN (not SUPER_ADMIN)', async () => {
    const app = buildApp({ adminRole: 'PLATFORM_ADMIN' });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('returns status tokens when SUPER_ADMIN and integration ENABLED + READY', async () => {
    process.env.ZOHO_BOOKS_INTEGRATION_ENABLED = 'true';
    process.env.ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED = 'true';
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'READY',
      dryRunEnabled: true,
      config: {
        dryRunEnabled: true,
        clientId: 'x',
        clientSecret: 'x',
        refreshToken: 'x',
        organizationId: 'x',
        apiDomain: 'x',
      },
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.integrationEnabled).toBe('ENABLED');
    expect(body.data.contactSyncEnabled).toBe('ENABLED');
    expect(body.data.configReadiness).toBe('READY');
    expect(body.data.contactSyncPosture).toBe('LIVE');
    expect(body.data.missingKeys).toEqual([]);
    expect(body.data.deprecatedFlagWarning).toBe(false);
    await app.close();
  });

  it('returns DISABLED posture when integration flag is off', async () => {
    delete process.env.ZOHO_BOOKS_INTEGRATION_ENABLED;
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'DISABLED',
      dryRunEnabled: false,
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.integrationEnabled).toBe('DISABLED');
    expect(body.data.configReadiness).toBe('DISABLED');
    expect(body.data.contactSyncPosture).toBe('OFF');
    await app.close();
  });

  it('returns deprecatedFlagWarning:true when deprecated flag is present', async () => {
    process.env.ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED = 'true';
    delete process.env.ZOHO_BOOKS_INTEGRATION_ENABLED;
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'READY',
      dryRunEnabled: true,
      deprecatedFlagUsed: true,
      config: {
        dryRunEnabled: true,
        clientId: 'x',
        clientSecret: 'x',
        refreshToken: 'x',
        organizationId: 'x',
        apiDomain: 'x',
      },
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.deprecatedFlagPresent).toBe(true);
    expect(body.data.deprecatedFlagWarning).toBe(true);
    await app.close();
  });

  it('does NOT return raw env values in response', async () => {
    process.env.ZOHO_BOOKS_INTEGRATION_ENABLED = 'true';
    process.env.ZOHO_BOOKS_CLIENT_SECRET = 'super-secret-value';
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'READY',
      dryRunEnabled: true,
      config: {
        dryRunEnabled: true,
        clientId: 'x',
        clientSecret: 'super-secret-value',
        refreshToken: 'x',
        organizationId: 'x',
        apiDomain: 'x',
      },
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });
    const raw = res.body;

    // Secret value must NOT appear anywhere in response
    expect(raw).not.toContain('super-secret-value');
    await app.close();
  });

  it('returns MISSING_REQUIRED_ENV posture when keys missing', async () => {
    process.env.ZOHO_BOOKS_INTEGRATION_ENABLED = 'true';
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'MISSING_REQUIRED_ENV',
      dryRunEnabled: true,
      missingKeys: ['ZOHO_BOOKS_CLIENT_ID', 'ZOHO_BOOKS_REFRESH_TOKEN'],
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/status' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.configReadiness).toBe('MISSING_REQUIRED_ENV');
    expect(body.data.missingKeys).toContain('ZOHO_BOOKS_CLIENT_ID');
    expect(body.data.contactSyncPosture).toBe('DEGRADED');
    await app.close();
  });
});

// ─── /contacts ────────────────────────────────────────────────────────────────

const FAKE_ORG = {
  id: 'org-uuid-001',
  slug: 'acme-textiles',
  legal_name: 'Acme Textiles Pvt Ltd',
  status: 'VERIFICATION_APPROVED',
  plan: 'PROFESSIONAL',
};

const FAKE_INTEGRATION_ROW = {
  id: 'int-uuid-001',
  organizationId: 'org-uuid-001',
  providerKey: 'zoho_books',
  externalObjectType: 'contact',
  externalId: '3320375000000045003', // raw value — must NOT appear in response
  syncStatus: 'SYNC_SUCCESS',
  attemptCount: 1,
  lastAttemptedAt: new Date('2026-06-10T10:00:00Z'),
  lastDryRunAt: null,
  lastErrorSummary: null,
  metadataJson: { providerPayload: 'secret-data', someToken: 'abc123' }, // must NOT appear
  createdAt: new Date('2026-06-09T08:00:00Z'),
  updatedAt: new Date('2026-06-10T10:00:00Z'),
  organization: FAKE_ORG,
};

describe('GET /zoho-books/contacts', () => {
  beforeEach(() => {
    // Default mock: withDbContext executes the callback with a mock tx
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue([FAKE_INTEGRATION_ROW]),
        },
        organizations: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      return callback(mockTx as any);
    });
  });

  it('returns 401 when not authenticated as admin', async () => {
    const app = buildApp({ isAdmin: false, adminRole: null, adminId: null });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 403 when role is not SUPER_ADMIN', async () => {
    const app = buildApp({ adminRole: 'PLATFORM_ADMIN' });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('returns 200 with rows for SUPER_ADMIN', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('does NOT return raw externalId in rows', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    const body = res.json();
    const row = body.data.rows[0];

    // externalIdStatus must be present
    expect(row.externalIdStatus).toBe('PRESENT');
    // raw externalId must be absent
    expect(row.externalId).toBeUndefined();
    // The raw Zoho contact ID must not appear anywhere in the response
    expect(res.body).not.toContain('3320375000000045003');
    await app.close();
  });

  it('does NOT return metadataJson in rows', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    const body = res.json();
    const row = body.data.rows[0];

    expect(row.metadataJson).toBeUndefined();
    expect(res.body).not.toContain('providerPayload');
    expect(res.body).not.toContain('secret-data');
    await app.close();
  });

  it('returns MISSING for rows with null externalId', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue([
            { ...FAKE_INTEGRATION_ROW, externalId: null, syncStatus: 'NOT_SYNCED' },
          ]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    const body = res.json();
    expect(body.data.rows[0].externalIdStatus).toBe('MISSING');
    await app.close();
  });

  it('classifies synthetic orgs correctly', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue([
            {
              ...FAKE_INTEGRATION_ROW,
              organization: { ...FAKE_ORG, slug: 'crm-verify-corp-synthetic' },
            },
          ]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    const body = res.json();
    expect(body.data.rows[0].orgType).toBe('SYNTHETIC');
    await app.close();
  });

  it('classifies real orgs correctly', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    const body = res.json();
    expect(body.data.rows[0].orgType).toBe('REAL');
    await app.close();
  });

  it('sanitizes error summary — strips DB URLs', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue([
            {
              ...FAKE_INTEGRATION_ROW,
              syncStatus: 'SYNC_FAILED',
              lastErrorSummary: 'Connection failed: postgres://user:password@host:5432/db',
            },
          ]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    expect(res.body).not.toContain('postgres://user:password');
    expect(res.body).not.toContain('password');
    await app.close();
  });

  it('returns empty rows with valid shape when no rows found', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.rows).toEqual([]);
    expect(body.data.summary.total).toBe(0);
    await app.close();
  });

  it('returns 400 for invalid syncStatus filter', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/zoho-books/contacts?syncStatus=INVALID_STATUS',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns pagination shape with hasMore and nextCursor', async () => {
    // Return limit+1 rows to trigger hasMore
    const manyRows = Array.from({ length: 26 }, (_, i) => ({
      ...FAKE_INTEGRATION_ROW,
      id: `int-uuid-${String(i).padStart(3, '0')}`,
    }));

    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizationIntegration: {
          findMany: vi.fn().mockResolvedValue(manyRows),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/contacts?limit=25' });
    const body = res.json();
    expect(body.data.pagination.hasMore).toBe(true);
    expect(body.data.pagination.nextCursor).toBeTruthy();
    expect(body.data.rows).toHaveLength(25);
    await app.close();
  });
});

// ─── /backfill-candidates ─────────────────────────────────────────────────────

const FAKE_ORG_NO_INTEGRATION = {
  id: 'org-uuid-002',
  slug: 'real-corp-approved',
  legal_name: 'Real Corp Pvt Ltd',
  status: 'VERIFICATION_APPROVED',
  plan: 'PROFESSIONAL',
  organizationIntegrations: [], // no Zoho row — backfill candidate
};

describe('GET /zoho-books/backfill-candidates', () => {
  beforeEach(() => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizations: {
          findMany: vi.fn().mockResolvedValue([FAKE_ORG_NO_INTEGRATION]),
        },
      };
      return callback(mockTx as any);
    });
  });

  it('returns 401 when not admin', async () => {
    const app = buildApp({ isAdmin: false, adminRole: null, adminId: null });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 403 for non-SUPER_ADMIN', async () => {
    const app = buildApp({ adminRole: 'PLATFORM_ADMIN' });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('returns candidates with safe fields for SUPER_ADMIN', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.count).toBe(1);
    expect(body.data.rows[0].organizationSlug).toBe('real-corp-approved');
    expect(body.data.rows[0].orgType).toBe('REAL');
    await app.close();
  });

  it('includes the authorization warning in response', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    const body = res.json();
    expect(body.data.warning).toBeTruthy();
    expect(body.data.warning).toContain('explicit authorization');
    await app.close();
  });

  it('does NOT include a backfill action or mutation route', async () => {
    const app = buildApp();
    await app.ready();

    // Verify POST to backfill route returns 404 (no mutation route exists)
    const postRes = await app.inject({ method: 'POST', url: '/zoho-books/backfill-candidates' });
    expect(postRes.statusCode).toBe(404);

    // Verify DELETE does not exist
    const deleteRes = await app.inject({ method: 'DELETE', url: '/zoho-books/contacts/some-id' });
    expect(deleteRes.statusCode).toBe(404);

    await app.close();
  });

  it('classifies synthetic candidates correctly', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizations: {
          findMany: vi.fn().mockResolvedValue([
            { ...FAKE_ORG_NO_INTEGRATION, slug: 'crm-await-verify-corp-synthetic' },
          ]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    const body = res.json();
    expect(body.data.rows[0].orgType).toBe('SYNTHETIC');
    expect(body.data.syntheticCount).toBe(1);
    expect(body.data.realCount).toBe(0);
    await app.close();
  });

  it('returns empty list with correct structure when no candidates', async () => {
    vi.mocked(withDbContext).mockImplementation(async (_prisma, _ctx, callback) => {
      const mockTx = {
        $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
        organizations: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      return callback(mockTx as any);
    });

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/zoho-books/backfill-candidates' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.count).toBe(0);
    expect(body.data.rows).toEqual([]);
    expect(body.data.warning).toBeTruthy();
    await app.close();
  });
});

// ─── No mutation routes ───────────────────────────────────────────────────────

describe('Mutation routes do not exist (Phase 1 read-only enforcement)', () => {
  it('POST /zoho-books/contacts returns 404', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/zoho-books/contacts' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('POST /zoho-books/status returns 404', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/zoho-books/status' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /zoho-books/contacts/:id returns 404', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'DELETE', url: '/zoho-books/contacts/some-id' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('PATCH /zoho-books/contacts/:id returns 404', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'PATCH', url: '/zoho-books/contacts/some-id' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
