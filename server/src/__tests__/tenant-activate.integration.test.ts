/**
 * FAM-07D1 — Tenant Activation Security Containment Tests
 *
 * Covers:
 *   T-GAP-02: B-01 — Existing TexQtic account blocked before any activation write
 *   T-GAP-03: B-02 — Duplicate membership returns 409 not 500
 *   T-GAP-06: Regression — new-user happy path still succeeds after B-01 guard
 *   T-GAP-07: Regression — invalid invite still returns 404 (B-01 guard does not interfere)
 *   S-01:     Duplicate pending invite returns 409 INVITE_ALREADY_PENDING
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';

const {
  tenantAuthMiddlewareMock,
  databaseContextMiddlewareMock,
  writeAuditLogMock,
  withDbContextMock,
  prismaMock,
  txMock,
  TEST_TENANT_ID,
  TEST_USER_ID,
} = vi.hoisted(() => {
  const TEST_TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TEST_USER_ID   = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const txMock = {
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
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    legalConsentSnapshot: {
      upsert: vi.fn(),
    },
    legalConsentEvent: {
      create: vi.fn(),
    },
    invite: {
      update: vi.fn(),
    },
  };

  const prismaMock = {
    invite: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
  };

  return {
    tenantAuthMiddlewareMock: vi.fn(async (req: unknown) => {
      const request = req as Record<string, unknown>;
      request.tenantId = TEST_TENANT_ID;
      request.userRole = 'OWNER';
      request.userId = TEST_USER_ID;
    }),
    databaseContextMiddlewareMock: vi.fn(async (req: unknown) => {
      const request = req as Record<string, unknown>;
      request.dbContext = {
        orgId: TEST_TENANT_ID,
        actorId: TEST_USER_ID,
        realm: 'tenant',
        requestId: 'test-request-id',
      };
    }),
    writeAuditLogMock: vi.fn().mockResolvedValue(undefined),
    withDbContextMock: vi.fn(),
    prismaMock,
    txMock,
    TEST_TENANT_ID,
    TEST_USER_ID,
  };
});

vi.mock('../middleware/auth.js', () => ({
  adminAuthMiddleware: vi.fn(async () => undefined),
  requireAdminRole: vi.fn(() => async () => undefined),
  tenantAuthMiddleware: tenantAuthMiddlewareMock,
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: databaseContextMiddlewareMock,
}));

vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../lib/database-context.js', () => ({
  canonicalizeTenantPlan: vi.fn((plan: string) => plan),
  withDbContext: withDbContextMock,
  withOrgAdminContext: vi.fn(),
  getOrganizationIdentity: vi.fn(),
  OrganizationNotFoundError: class OrganizationNotFoundError extends Error {},
}));

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: writeAuditLogMock,
  createAdminAudit: vi.fn().mockReturnValue({}),
}));

vi.mock('../services/stateMachine.service.js', () => ({
  StateMachineService: class StateMachineService {
    noop(): void {}
  },
}));

vi.mock('../routes/tenant/escalation.g022.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/trades.g017.js',     () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/escrow.g018.js',     () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/settlement.js',      () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/certifications.g019.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/traceability.g016.js',   () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/documents.js',           () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/gst-verification.js',    () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/invoices.js',            () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/pools.js',               () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/poolDemandLines.js',     () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/poolRfq.js',             () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/poolRfqSupplierInvites.js',  () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/poolRfqSupplierQuotes.js',   () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/networkInvoices.js',         () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/networkSettlement.js',       () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/networkLifecycle.js',        () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/invoice-approval.js',        () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/ttp-summary.js',             () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/ttp-enrollment.js',          () => ({ default: async () => undefined }));

vi.mock('../services/pricing/totals.service.js', () => ({
  computeTotals: vi.fn(),
  TotalsInputError: class TotalsInputError extends Error {},
}));

vi.mock('../services/email/email.service.js', () => ({
  sendInviteMemberEmail: vi.fn().mockResolvedValue({ status: 'SENT' }),
  failedInviteEmailDeliveryOutcome: vi.fn().mockReturnValue({ status: 'FAILED_NON_FATAL' }),
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

vi.mock('../services/dppEvidenceVault.js', () => ({
  DPP_EVIDENCE_TYPES: [],
  DPP_EVIDENCE_VISIBILITY_VALUES: [],
  DPP_EVIDENCE_REVIEW_STATES: [],
  isAllowedSourceTable: vi.fn(),
  assertNodeBelongsToOrg: vi.fn(),
  createDppEvidenceItem: vi.fn(),
  listDppEvidenceItemsForNode: vi.fn(),
  toDppEvidenceItemDto: vi.fn(),
}));

vi.mock('../services/dppProductDetails.js', () => ({
  toDppProductDetailsDto: vi.fn(),
  getDppProductDetailsForNode: vi.fn(),
  upsertDppProductDetailsForNode: vi.fn(),
  validateMaterialComposition: vi.fn(),
  DPP_MATERIAL_MAX_ENTRIES: 10,
}));

vi.mock('../services/dppTradeLinks.js', () => ({
  DPP_TRADE_LINK_TYPES: [],
  DPP_TRADE_LINK_VISIBILITY_VALUES: [],
  toDppTradeLinkDto: vi.fn(),
  listDppTradeLinksForNode: vi.fn(),
  createDppTradeLink: vi.fn(),
  validateDppTradeLinkSource: vi.fn(),
  assertTradeLinkNodeBelongsToOrg: vi.fn(),
}));

vi.mock('../services/pricing/pdpPriceDisclosure.service.js', () => ({
  attachPriceDisclosureToPdpView: vi.fn(),
  buildPdpDisclosureMetadata: vi.fn(),
  resolveSupplierDisclosurePolicyForPdp: vi.fn(),
  resolveSupplierDisclosurePolicyForB2bPdp: vi.fn(),
}));

vi.mock('../services/pricing/rfqPrefillContext.service.js', () => ({
  buildCatalogRfqPrefillContext: vi.fn(),
}));

vi.mock('../services/relationshipAccess.service.js', () => ({
  evaluateBuyerCatalogVisibility: vi.fn(),
  evaluateBuyerRelationshipPriceEligibility: vi.fn(),
  evaluateBuyerRelationshipRfqEligibility: vi.fn(),
  filterBuyerVisibleCatalogItems: vi.fn(),
}));

vi.mock('../services/catalogVisibilityPolicyResolver.js', () => ({
  CATALOG_VISIBILITY_POLICY_MODES: [],
  resolveCatalogVisibilityPolicy: vi.fn().mockReturnValue({ policy: 'PUBLIC' }),
}));

vi.mock('../services/relationshipAccessStorage.service.js', () => ({
  getRelationshipOrNone: vi.fn(),
}));

vi.mock('../services/rfq/supplierNotificationBoundary.service.js', () => ({
  notifySupplierRfqSubmittedGroups: vi.fn(),
}));

vi.mock('../lib/aiBudget.js', () => ({
  BudgetExceededError: class BudgetExceededError extends Error {},
  getMonthKey: vi.fn(),
}));

vi.mock('../services/ai/inferenceService.js', () => ({
  AiRateLimitExceededError: class AiRateLimitExceededError extends Error {},
}));

vi.mock('../services/ai/supplierMatching/supplierMatchSignalBuilder.service.js', () => ({
  buildSupplierMatchSignals: vi.fn(),
}));
vi.mock('../services/ai/supplierMatching/supplierMatchPolicyFilter.service.js', () => ({
  applySupplierMatchPolicyFilter: vi.fn(),
}));
vi.mock('../services/ai/supplierMatching/supplierMatchRanker.service.js', () => ({
  rankSupplierCandidates: vi.fn(),
}));
vi.mock('../services/ai/supplierMatching/supplierMatchExplanationBuilder.service.js', () => ({
  buildSupplierMatchExplanation: vi.fn(),
}));
vi.mock('../services/ai/supplierMatching/supplierMatchRuntimeGuard.service.js', () => ({
  guardSupplierMatchOutput: vi.fn(),
}));

vi.mock('../services/passportAssistant.js', () => ({
  runPassportAssistantInference: vi.fn(),
}));

vi.mock('../services/ai/rfqAssistContextBuilder.js', () => ({
  buildRfqAssistantContext: vi.fn(),
}));
vi.mock('../services/ai/rfqAssistService.js', () => ({
  runRfqAssistInference: vi.fn(),
}));
vi.mock('../services/ai/supplierProfileCompletenessService.js', () => ({
  runSupplierProfileCompletenessInference: vi.fn(),
}));

import tenantRoutes from '../routes/tenant.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_JWT_SECRET = 'tenant-jwt-test-secret-key-min-32-chars';

function makeTestTenantToken(userId: string, tenantId: string, role: string): string {
  return jwt.sign({ userId, tenantId, role }, TEST_JWT_SECRET, { expiresIn: '15m' });
}

const INVITE_TOKEN = 'test-invite-token-abc123';

const BASE_INVITE = {
  id:       'invite-id-0001',
  tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email:    'owner@example.test',
  role:     'OWNER',
  tenant: {
    memberships: [],
  },
};

const BASE_ACTIVATE_PAYLOAD = {
  inviteToken: INVITE_TOKEN,
  userData: {
    email:    'owner@example.test',
    password: 'ValidPass99',
  },
  verificationData: {
    registrationNumber: 'REG-001',
    jurisdiction:       'IN-MH',
  },
};

const BASE_ACTIVATE_PAYLOAD_NO_REGISTRATION = {
  ...BASE_ACTIVATE_PAYLOAD,
  verificationData: {
    jurisdiction: 'IN-MH',
  },
};

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyJwt, {
    secret:    'tenant-jwt-test-secret-key-min-32-chars',
    namespace: 'tenant',
    jwtSign:   'tenantJwtSign',
    jwtVerify: 'tenantJwtVerify',
  });
  await app.register(tenantRoutes, { prefix: '/api' });
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// T-GAP-02 — B-01: Existing TexQtic account must sign in
// ---------------------------------------------------------------------------
describe('B-01 — existing user must sign in to accept invite', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('returns 409 EXISTING_USER_MUST_SIGN_IN when email already has a TexQtic account', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id:    TEST_USER_ID,
      email: 'owner@example.test',
    });

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code:    'EXISTING_USER_MUST_SIGN_IN',
      message: expect.stringContaining('sign in'),
    });
  });

  it('does not call withDbContext, create user, create membership, update invite, or write audit log', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id:    TEST_USER_ID,
      email: 'owner@example.test',
    });

    await app.inject({ method: 'POST', url: '/api/tenant/activate', payload: BASE_ACTIVATE_PAYLOAD });

    expect(withDbContextMock).not.toHaveBeenCalled();
    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(txMock.membership.create).not.toHaveBeenCalled();
    expect(txMock.invite.update).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('does not issue a JWT when an existing account is detected', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: TEST_USER_ID, email: 'owner@example.test' });

    const response = await app.inject({ method: 'POST', url: '/api/tenant/activate', payload: BASE_ACTIVATE_PAYLOAD });

    const body = response.json();
    expect(body).not.toHaveProperty('data');
    expect(response.statusCode).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// T-GAP-03 — B-02: Duplicate membership returns 409 not 500
// ---------------------------------------------------------------------------
describe('B-02 — duplicate membership returns 409 ALREADY_MEMBER', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    txMock.$queryRaw.mockResolvedValue([{ org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }]);
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('returns 409 ALREADY_MEMBER when a membership row already exists for the user and tenant', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    // B-01 passes: no existing user account
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    // Inside transaction: user doesn't exist → creates new
    txMock.user.findUnique.mockResolvedValueOnce(null);
    txMock.user.create.mockResolvedValueOnce({ id: TEST_USER_ID, email: 'owner@example.test' });
    txMock.organizations.update.mockResolvedValueOnce({
      legal_name: 'Test Org', status: 'PENDING_VERIFICATION', org_type: 'B2B', is_white_label: false, plan: 'FREE',
    });

    // B-02 pre-check: membership already exists
    txMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-id-existing', role: 'OWNER' });

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({ code: 'ALREADY_MEMBER' });
  });

  it('does not call membership.create when membership pre-check detects duplicate', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    txMock.user.findUnique.mockResolvedValueOnce(null);
    txMock.user.create.mockResolvedValueOnce({ id: TEST_USER_ID, email: 'owner@example.test' });
    txMock.organizations.update.mockResolvedValueOnce({
      legal_name: 'Test Org', status: 'PENDING_VERIFICATION', org_type: 'B2B', is_white_label: false, plan: 'FREE',
    });
    txMock.membership.findFirst.mockResolvedValueOnce({ id: 'membership-id-existing', role: 'OWNER' });

    await app.inject({ method: 'POST', url: '/api/tenant/activate', payload: BASE_ACTIVATE_PAYLOAD });

    expect(txMock.membership.create).not.toHaveBeenCalled();
    expect(txMock.invite.update).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T-GAP-06 — Regression: new-user B-01 guard passes through correctly
// ---------------------------------------------------------------------------
describe('B-01 regression — new user activation proceeds when no existing account', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    txMock.$queryRaw.mockResolvedValue([{ org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }]);
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    txMock.user.findUnique.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({ id: TEST_USER_ID, email: 'owner@example.test' });
    txMock.organizations.update.mockResolvedValue({
      legal_name: 'Test Org', status: 'PENDING_VERIFICATION', org_type: 'B2B', is_white_label: false, plan: 'FREE',
    });
    txMock.organizations.findUnique.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      slug: 'test-org',
      legal_name: 'Test Org',
      status: 'PENDING_VERIFICATION',
      org_type: 'B2B',
      primary_segment_key: 'Yarn',
      is_white_label: false,
      jurisdiction: 'IN-MH',
      registration_no: 'REG-001',
      plan: 'FREE',
      secondary_segments: [],
      role_positions: [],
    });
    txMock.membership.findFirst.mockResolvedValue(null);
    txMock.membership.create.mockResolvedValue({ role: 'OWNER' });
    txMock.invite.update.mockResolvedValue({ acceptedAt: new Date() });
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('does not block a new-user activation when prisma.user.findUnique returns null', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    // B-01: no existing account
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    // Activation should proceed to withDbContext (not blocked at B-01)
    expect(withDbContextMock).toHaveBeenCalled();
    // Either 200 (full happy path) or any non-409 EXISTING_USER_MUST_SIGN_IN response
    expect(response.statusCode).not.toBe(409);
    const body = response.json();
    expect(body.error?.code).not.toBe('EXISTING_USER_MUST_SIGN_IN');
  });
});

// ---------------------------------------------------------------------------
// T-GAP-07 — Regression: invalid invite still returns 404 before B-01 check
// ---------------------------------------------------------------------------
describe('B-01 regression — invalid invite gate is not disturbed', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('returns 404 INVALID_INVITE for a missing or expired invite without reaching the B-01 check', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'INVALID_INVITE' });

    // B-01 check (prisma.user.findUnique) must not have been called
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(withDbContextMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// S-01 — Duplicate pending invite returns 409 INVITE_ALREADY_PENDING
// ---------------------------------------------------------------------------
describe('S-01 — duplicate pending invite guard on POST /api/tenant/memberships', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('returns 409 INVITE_ALREADY_PENDING when a valid pending invite exists for the email', async () => {
    // S-01 pre-check returns an existing pending invite
    prismaMock.invite.findFirst.mockResolvedValueOnce({
      id:          'existing-invite-id',
      tenantId:    TEST_TENANT_ID,
      email:       'newmember@example.test',
      acceptedAt:  null,
      expiresAt:   new Date(Date.now() + 86_400_000),
    });

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/memberships',
      payload: { email: 'newmember@example.test', role: 'MEMBER' },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatchObject({
      code:    'INVITE_ALREADY_PENDING',
      message: expect.stringContaining('pending invite'),
    });
  });

  it('does not call withDbContext or invite.create when a pending invite is found', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce({
      id:          'existing-invite-id',
      tenantId:    TEST_TENANT_ID,
      email:       'newmember@example.test',
      acceptedAt:  null,
      expiresAt:   new Date(Date.now() + 86_400_000),
    });

    await app.inject({
      method:  'POST',
      url:     '/api/tenant/memberships',
      payload: { email: 'newmember@example.test', role: 'MEMBER' },
    });

    expect(withDbContextMock).not.toHaveBeenCalled();
  });

  it('normalises email case before the S-01 check', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(null);

    // When no pending invite → proceeds to invite.create path; withDbContext is called
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    const txInviteMock = { create: vi.fn().mockResolvedValue({
      id: 'new-invite-id', email: 'newmember@example.test', role: 'MEMBER',
      expiresAt: new Date(Date.now() + 86_400_000),
    })};
    const txAuditMock = { writeAuditLog: vi.fn().mockResolvedValue(undefined) };

    withDbContextMock.mockImplementationOnce(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        ...txMock,
        invite: { ...txMock.invite, create: txInviteMock.create },
        writeAuditLog: txAuditMock.writeAuditLog,
      })
    );

    await app.inject({
      method:  'POST',
      url:     '/api/tenant/memberships',
      payload: { email: 'NEWMEMBER@EXAMPLE.TEST', role: 'MEMBER' },
    });

    // invite.findFirst was called with the lowercase email
    expect(prismaMock.invite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'newmember@example.test',
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// FAM-07D3 — POST /api/tenant/activate-authenticated
// ---------------------------------------------------------------------------

const AUTH_INVITE_TOKEN = 'auth-invite-test-token-abc123';

const AUTH_INVITE = {
  id:       'auth-invite-id-001',
  tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email:    'owner@example.test',
  role:     'MEMBER',
  tokenHash: 'computed-by-crypto-not-used-in-tests',
  acceptedAt: null,
  expiresAt: new Date(Date.now() + 86_400_000),
  tenant: {
    memberships: [{ role: 'OWNER' }],
  },
};

const AUTH_USER = {
  id:    TEST_USER_ID,
  email: 'owner@example.test',
};

const LEGAL_PENDING_CONSENT_NEW_USER = {
  agreementType: 'PLATFORM_TERMS',
  agreementVersion: 'scaffold-v1',
  agreementHash: 'hash-scaffold-v1',
  agreementSourceUrl: 'https://example.test/legal/scaffold-v1',
  legalStatus: 'LEGAL_PENDING',
  sourceFlow: 'ACTIVATE_NEW_USER',
  accepted: true,
  acceptedAt: '2026-05-30T09:30:00.000Z',
  correlationId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  requestId: 'req-consent-scaffold-001',
  metadataJson: {
    safeNote: 'scaffold-consent',
    inviteToken: 'must-not-persist',
    authSecret: 'must-not-persist',
  },
};

const LEGAL_PENDING_CONSENT_AUTHENTICATED = {
  ...LEGAL_PENDING_CONSENT_NEW_USER,
  sourceFlow: 'ACTIVATE_AUTHENTICATED_INVITE',
};

describe('FAM-07D3 — authenticated invite acceptance (POST /api/tenant/activate-authenticated)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: withDbContext calls cb with txMock (both the membership create call and resolveTenantSessionIdentity)
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    txMock.membership.create.mockResolvedValue({ id: 'auth-membership-id-001', role: 'MEMBER', tenantId: TEST_TENANT_ID, userId: TEST_USER_ID });
    txMock.invite.update.mockResolvedValue({ id: 'auth-invite-id-001', acceptedAt: new Date() });
    txMock.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'test-org',
      legal_name: 'Test Org',
      status: 'ACTIVE',
      org_type: 'B2B',
      primary_segment_key: 'Yarn',
      is_white_label: false,
      plan: 'FREE',
      secondary_segments: [],
      role_positions: [],
    });
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('ACT-AUTH-001: returns 401 when no Authorization header is provided', async () => {
    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
  });

  it('ACT-AUTH-002: returns 401 when Authorization header contains an invalid JWT', async () => {
    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: 'Bearer not-a-valid-jwt' },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
  });

  it('ACT-AUTH-003: returns 404 INVALID_INVITE when invite is not found', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'INVALID_INVITE' });
  });

  it('ACT-AUTH-004: returns 403 EMAIL_MISMATCH when invite email differs from authenticated user email', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(AUTH_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: TEST_USER_ID, email: 'different@example.test' });

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'EMAIL_MISMATCH' });
  });

  it('ACT-AUTH-005: returns 409 ALREADY_MEMBER when user is already a member of the invite tenant', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(AUTH_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(AUTH_USER);
    prismaMock.membership.findFirst.mockResolvedValueOnce({ id: 'existing-membership-id', role: 'MEMBER' });

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'ALREADY_MEMBER' });
  });

  it('ACT-AUTH-006: success — creates membership, marks invite accepted, writes audit log, returns token', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(AUTH_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(AUTH_USER);
    prismaMock.membership.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      token:      expect.any(String),
      user:       { id: TEST_USER_ID, email: 'owner@example.test' },
      tenant:     expect.objectContaining({ id: TEST_TENANT_ID }),
      membership: { role: 'MEMBER' },
    });
  });

  it('ACT-AUTH-007: success — withDbContext is called; membership.create and invite.update are invoked', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(AUTH_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(AUTH_USER);
    prismaMock.membership.findFirst.mockResolvedValueOnce(null);

    await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { inviteToken: AUTH_INVITE_TOKEN },
    });

    expect(withDbContextMock).toHaveBeenCalled();
    expect(txMock.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: 'MEMBER',
        }),
      }),
    );
    expect(txMock.invite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'auth-invite-id-001' },
        data:  expect.objectContaining({ acceptedAt: expect.any(Date) }),
      }),
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'user.invite_accepted',
        actorId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// FAM-07E2 — LEGAL_PENDING activation consent scaffold contract wiring
// ---------------------------------------------------------------------------

describe('FAM-07E2 — activation consent scaffold (LEGAL_PENDING only)', () => {
  let app: FastifyInstance;
  const originalConsentEnforce = process.env.FAM07_CONSENT_SCAFFOLD_ENFORCE;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.FAM07_CONSENT_SCAFFOLD_ENFORCE = 'false';

    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    txMock.$queryRaw.mockResolvedValue([{ org_id: TEST_TENANT_ID }]);
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    txMock.user.findUnique.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({ id: TEST_USER_ID, email: 'owner@example.test' });
    txMock.organizations.update.mockResolvedValue({
      legal_name: 'Test Org', status: 'PENDING_VERIFICATION', org_type: 'B2B', is_white_label: false, plan: 'FREE',
    });
    txMock.organizations.findUnique.mockResolvedValue({
      id: TEST_TENANT_ID,
      slug: 'test-org',
      legal_name: 'Test Org',
      status: 'PENDING_VERIFICATION',
      org_type: 'B2B',
      primary_segment_key: 'Yarn',
      is_white_label: false,
      jurisdiction: 'IN-MH',
      registration_no: 'REG-001',
      plan: 'FREE',
      secondary_segments: [],
      role_positions: [],
    });
    txMock.membership.findFirst.mockResolvedValue(null);
    txMock.membership.create.mockResolvedValue({ id: 'membership-consent-001', role: 'OWNER', tenantId: TEST_TENANT_ID, userId: TEST_USER_ID });
    txMock.invite.update.mockResolvedValue({ acceptedAt: new Date() });
    txMock.legalConsentSnapshot.upsert.mockResolvedValue({ id: 'consent-snapshot-001' });
    txMock.legalConsentEvent.create.mockResolvedValue({ id: 'consent-event-001' });

    app = await buildServer();
  });

  afterEach(async () => {
    await app.close();
    if (originalConsentEnforce === undefined) {
      delete process.env.FAM07_CONSENT_SCAFFOLD_ENFORCE;
    } else {
      process.env.FAM07_CONSENT_SCAFFOLD_ENFORCE = originalConsentEnforce;
    }
  });

  it('E2-CONSENT-001: existing activation path still succeeds without consent when scaffold enforcement is disabled', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(200);
    expect(txMock.legalConsentSnapshot.upsert).not.toHaveBeenCalled();
    expect(txMock.legalConsentEvent.create).not.toHaveBeenCalled();
  });

  it('E2-CONSENT-002: new-user activation accepts LEGAL_PENDING consent and records sanitized snapshot/event', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        ...BASE_ACTIVATE_PAYLOAD,
        consent: LEGAL_PENDING_CONSENT_NEW_USER,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(txMock.legalConsentSnapshot.upsert).toHaveBeenCalledTimes(1);
    expect(txMock.legalConsentEvent.create).toHaveBeenCalledTimes(1);

    expect(txMock.legalConsentSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          legalStatus: 'LEGAL_PENDING',
          sourceFlow: 'ACTIVATE_NEW_USER',
          agreementType: 'PLATFORM_TERMS',
          metadataJson: expect.objectContaining({ safeNote: 'scaffold-consent' }),
        }),
      }),
    );

    const snapshotCall = txMock.legalConsentSnapshot.upsert.mock.calls[0][0];
    expect(snapshotCall.create.metadataJson).not.toHaveProperty('inviteToken');
    expect(snapshotCall.create.metadataJson).not.toHaveProperty('authSecret');

    expect(txMock.legalConsentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          legalStatus: 'LEGAL_PENDING',
          sourceFlow: 'ACTIVATE_NEW_USER',
          eventType: 'ACCEPTED_PENDING',
        }),
      }),
    );
  });

  it('E2-CONSENT-003: authenticated invite acceptance accepts LEGAL_PENDING consent and records scaffold event', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');
    prismaMock.invite.findFirst.mockResolvedValueOnce(AUTH_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(AUTH_USER);
    prismaMock.membership.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        inviteToken: AUTH_INVITE_TOKEN,
        consent: LEGAL_PENDING_CONSENT_AUTHENTICATED,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(txMock.legalConsentSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          legalStatus: 'LEGAL_PENDING',
          sourceFlow: 'ACTIVATE_AUTHENTICATED_INVITE',
        }),
      }),
    );
    expect(txMock.legalConsentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          legalStatus: 'LEGAL_PENDING',
          sourceFlow: 'ACTIVATE_AUTHENTICATED_INVITE',
          eventType: 'ACCEPTED_PENDING',
        }),
      }),
    );
  });

  it('E2-CONSENT-004: missing consent returns CONSENT_REQUIRED when scaffold enforcement is enabled', async () => {
    process.env.FAM07_CONSENT_SCAFFOLD_ENFORCE = 'true';

    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'CONSENT_REQUIRED' });
    expect(withDbContextMock).not.toHaveBeenCalled();
  });

  it('E2-CONSENT-005: non-LEGAL_PENDING consent payload is rejected with CONSENT_POLICY_UNAVAILABLE', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: {
        ...BASE_ACTIVATE_PAYLOAD,
        consent: {
          ...LEGAL_PENDING_CONSENT_NEW_USER,
          legalStatus: 'LEGAL_APPROVED',
        },
      },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'CONSENT_POLICY_UNAVAILABLE' });
    expect(withDbContextMock).not.toHaveBeenCalled();
  });

  it('E2-CONSENT-006: source-flow mismatch returns CONSENT_SOURCE_MISMATCH', async () => {
    const authToken = makeTestTenantToken(TEST_USER_ID, TEST_TENANT_ID, 'OWNER');

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate-authenticated',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        inviteToken: AUTH_INVITE_TOKEN,
        consent: LEGAL_PENDING_CONSENT_NEW_USER,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'CONSENT_SOURCE_MISMATCH' });
    expect(prismaMock.invite.findFirst).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// FAM-07G — T-MISS-01..T-MISS-04: New-user activation hardening tests
// ---------------------------------------------------------------------------

const HAPPY_PATH_ORG = {
  id:                  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  slug:                'test-org',
  legal_name:          'Test Org',
  status:              'PENDING_VERIFICATION',
  org_type:            'B2B',
  primary_segment_key: 'Yarn',
  is_white_label:      false,
  jurisdiction:        'IN-MH',
  registration_no:     'REG-001',
  plan:                'FREE',
  secondary_segments:  [],
  role_positions:      [],
};

describe('FAM-07G — POST /api/tenant/activate: response shape and write verification', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    withDbContextMock.mockImplementation(async (_client: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => cb(txMock));
    txMock.$queryRaw.mockResolvedValue([{ org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }]);
    txMock.$executeRawUnsafe.mockResolvedValue(undefined);
    txMock.user.findUnique.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({ id: TEST_USER_ID, email: 'owner@example.test' });
    txMock.organizations.update.mockResolvedValue({
      legal_name: 'Test Org', status: 'PENDING_VERIFICATION', org_type: 'B2B', is_white_label: false, plan: 'FREE',
    });
    txMock.organizations.findUnique.mockResolvedValue(HAPPY_PATH_ORG);
    txMock.membership.findFirst.mockResolvedValue(null);
    txMock.membership.create.mockResolvedValue({ role: 'OWNER' });
    txMock.invite.update.mockResolvedValue({ acceptedAt: new Date() });
    app = await buildServer();
  });

  afterEach(async () => { await app.close(); });

  it('T-MISS-01: successful activation returns 200 with expected response shape', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      token:      expect.any(String),
      user:       { id: expect.any(String), email: 'owner@example.test' },
      tenant:     expect.objectContaining({ id: TEST_TENANT_ID, slug: expect.any(String) }),
      membership: { role: expect.any(String) },
    });
  });

  it('T-MISS-02: returns 403 EMAIL_MISMATCH when invite email does not match payload email', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);

    const response = await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: {
        ...BASE_ACTIVATE_PAYLOAD,
        userData: { email: 'different@example.test', password: 'ValidPass99' },
      },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toMatchObject({ code: 'EMAIL_MISMATCH' });
    // B-01 user lookup must not have been reached
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('T-MISS-03: transaction writes include membership.create, invite.update(acceptedAt), and writeAuditLog', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(txMock.user.create).toHaveBeenCalled();
    expect(txMock.membership.create).toHaveBeenCalled();
    expect(txMock.invite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invite-id-0001' },
        data:  expect.objectContaining({ acceptedAt: expect.any(Date) }),
      }),
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'user.activated' }),
    );
  });

  it('T-MISS-04: organizations.update is called with status PENDING_VERIFICATION', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await app.inject({
      method:  'POST',
      url:     '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(txMock.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING_VERIFICATION' }),
      }),
    );
  });

  it('T-MISS-05: accepts blank registration number and stores null when omitted by business type', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD_NO_REGISTRATION,
    });

    expect(response.statusCode).toBe(200);
    expect(txMock.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          registration_no: null,
          jurisdiction: 'IN-MH',
        }),
      }),
    );
  });

  it('T-MISS-06: preserves supplied registration number when present', async () => {
    prismaMock.invite.findFirst.mockResolvedValueOnce(BASE_INVITE);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await app.inject({
      method: 'POST',
      url: '/api/tenant/activate',
      payload: BASE_ACTIVATE_PAYLOAD,
    });

    expect(txMock.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          registration_no: 'REG-001',
        }),
      }),
    );
  });
});
