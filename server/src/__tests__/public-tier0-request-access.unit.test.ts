/**
 * Unit tests — POST /api/public/tier0/request-access
 *
 * Design authority: DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01 (commit a1b6ab34)
 * Source contract: GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01 (commit 42f0248c)
 * CRM receiver: IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01 (CRM commit 64ba995)
 *
 * Tests (TIR = Tier 0 Integration Route):
 *   TIR-001: valid supplier WEB payload → 201 RECEIVED with requestId + crmReceiptId
 *   TIR-002: missing contact (no email, no phone) → 400 validation error
 *   TIR-003: invalid email format → 400 validation error
 *   TIR-004: forbidden field inviteToken present → 400, CRM not called
 *   TIR-005: forbidden field mainAppTier0RequestId present → 400, CRM not called
 *   TIR-006: missing CRM env (CRM_MAINAPP_TIER0_BASE_URL) → 503 config error
 *   TIR-007: CRM returns 201 RECEIVED → success 201 to browser
 *   TIR-008: CRM returns 200 DUPLICATE → success 201 to browser (treated as success)
 *   TIR-009: CRM returns 409 DUPLICATE_CONFLICT → 409 conflict to browser
 *   TIR-010: CRM returns 400 INVALID_PAYLOAD → 500 internal error to browser
 *   TIR-011: CRM returns 401 UNAUTHORIZED → 503 service unavailable
 *   TIR-012: CRM returns 500 → 503 service unavailable
 *   TIR-013: CRM call throws (network timeout) → 503 service unavailable
 *   TIR-014: mainAppTier0RequestId is server-generated, not from client
 *   TIR-015: CRM payload does not include forbidden fields
 *   TIR-016: honeypot field h_trap non-empty → fake 200 success, CRM not called
 *   TIR-017: sourceChannel WEB passed correctly to CRM
 *   TIR-018: buyer roleIntent accepted at Tier 0
 *   TIR-019: missing roleIntent → 400 validation error
 *   TIR-020: notes PII (email pattern) rejected → 400 validation error
 */

// ─── Module mocks (hoisted by Vitest) ────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    membership: { findFirst: vi.fn() },
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

vi.mock('../lib/auditLog.js', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('../lib/hostNormalize.js', () => ({
  normalizeHost: vi.fn(),
  parsePlatformHost: vi.fn(),
}));

vi.mock('./internal/resolveDomain.js', () => ({
  resolveHostToTenant: vi.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import publicRoutes from '../routes/public.js';
import { config } from '../config/index.js';
import { notifyCrmTier0Capture } from '../services/crmTier0NotifyClient.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFIX = '/api/public';
const ENDPOINT = `${PREFIX}/tier0/request-access`;

const VALID_MINIMAL_PAYLOAD = {
  roleIntent: 'supplier',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  firstTouchTimestamp: '2026-06-06T10:00:00.000Z',
  sourceChannel: 'WEB',
};

const CRM_201_RESPONSE = {
  status: 201,
  ack: {
    success: true,
    crmReceiptId: 'crm-receipt-aabbccdd',
    intakeStatus: 'RECEIVED',
    retryable: false,
  },
};

const CRM_200_DUPLICATE_RESPONSE = {
  status: 200,
  ack: {
    success: true,
    crmReceiptId: 'crm-receipt-existing',
    intakeStatus: 'DUPLICATE',
  },
};

// ─── Test harness ─────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(publicRoutes, { prefix: PREFIX });
  await fastify.ready();
  return fastify;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

type MutableConfig = {
  CRM_MAINAPP_TIER0_BASE_URL: string | undefined;
  CRM_MAINAPP_TIER0_INGESTION_SECRET: string | undefined;
  ADMIN_NOTIFICATION_EMAIL: string | null;
};

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  app = await buildApp();

  // Default: CRM env configured
  (config as unknown as MutableConfig).CRM_MAINAPP_TIER0_BASE_URL = 'https://crm.texqtic.com';
  (config as unknown as MutableConfig).CRM_MAINAPP_TIER0_INGESTION_SECRET = 'test-shared-secret-that-is-32-chars-long';

  // Default: CRM notify returns 201 RECEIVED
  vi.mocked(notifyCrmTier0Capture).mockResolvedValue(CRM_201_RESPONSE);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/public/tier0/request-access', () => {

  it('TIR-001: valid supplier WEB payload → 201 with requestId + crmReceiptId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.data.requestId).toBe('string');
    expect(body.data.requestId).toHaveLength(36); // UUID v4
    expect(body.data.crmReceiptId).toBe('crm-receipt-aabbccdd');
    expect(body.data.status).toBe('RECEIVED');
    expect(typeof body.data.message).toBe('string');
    expect(vi.mocked(notifyCrmTier0Capture)).toHaveBeenCalledOnce();
  });

  it('TIR-002: missing contact (no email, no phone) → 400 validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        roleIntent: 'supplier',
        name: 'Rahul Sharma',
        firstTouchTimestamp: '2026-06-06T10:00:00.000Z',
        sourceChannel: 'WEB',
        // email and phone both absent
      },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-003: invalid email format → 400 validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        email: 'not-an-email',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-004: forbidden field inviteToken present → 400, CRM not called', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        inviteToken: 'tok_abc123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-005: forbidden field mainAppTier0RequestId present → 400, CRM not called', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        mainAppTier0RequestId: 'client-injected-id',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-006: missing CRM env → 503 service unavailable', async () => {
    (config as unknown as MutableConfig).CRM_MAINAPP_TIER0_BASE_URL = undefined;

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(503);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-007: CRM returns 201 RECEIVED → success 201 to browser', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue(CRM_201_RESPONSE);

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('RECEIVED');
    expect(body.data.crmReceiptId).toBe('crm-receipt-aabbccdd');
  });

  it('TIR-008: CRM returns 200 DUPLICATE → success 201 to browser (treated as success)', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue(CRM_200_DUPLICATE_RESPONSE);

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('DUPLICATE');
    expect(body.data.crmReceiptId).toBe('crm-receipt-existing');
  });

  it('TIR-009: CRM returns 409 DUPLICATE_CONFLICT → 409 conflict to browser', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue({
      status: 409,
      ack: { success: false, errorCode: 'DUPLICATE_CONFLICT', retryable: false },
    });

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('TIR-010: CRM returns 400 INVALID_PAYLOAD → 500 internal error to browser', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue({
      status: 400,
      ack: { success: false, errorCode: 'INVALID_PAYLOAD' },
    });

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(500);
    expect(vi.mocked(notifyCrmTier0Capture)).toHaveBeenCalledOnce();
  });

  it('TIR-011: CRM returns 401 UNAUTHORIZED → 503 service unavailable', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue({
      status: 401,
      ack: { success: false, errorCode: 'UNAUTHORIZED' },
    });

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(503);
  });

  it('TIR-012: CRM returns 500 → 503 service unavailable', async () => {
    vi.mocked(notifyCrmTier0Capture).mockResolvedValue({
      status: 500,
      ack: { retryable: true },
    });

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(503);
  });

  it('TIR-013: CRM call throws (network/timeout) → 503 service unavailable', async () => {
    vi.mocked(notifyCrmTier0Capture).mockRejectedValue(new Error('AbortError: signal timed out'));

    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(503);
  });

  it('TIR-014: mainAppTier0RequestId is server-generated — differs from any client value', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    const serverGeneratedId: string = body.data.requestId;

    // Verify UUID v4 format
    expect(serverGeneratedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Verify CRM was called with the server-generated ID (not a client-injected one)
    const crmCallArgs = vi.mocked(notifyCrmTier0Capture).mock.calls[0];
    const crmPayload = crmCallArgs?.[2] as Record<string, unknown>;
    expect(crmPayload?.mainAppTier0RequestId).toBe(serverGeneratedId);
  });

  it('TIR-015: CRM payload does not include forbidden fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: VALID_MINIMAL_PAYLOAD,
    });

    expect(response.statusCode).toBe(201);
    const crmCallArgs = vi.mocked(notifyCrmTier0Capture).mock.calls[0];
    const crmPayload = crmCallArgs?.[2] as Record<string, unknown>;

    // None of the forbidden fields should appear in the CRM payload
    expect(crmPayload).not.toHaveProperty('inviteToken');
    expect(crmPayload).not.toHaveProperty('mainAppSessionToken');
    expect(crmPayload).not.toHaveProperty('authToken');
    expect(crmPayload).not.toHaveProperty('accessToken');
    expect(crmPayload).not.toHaveProperty('refreshToken');
    expect(crmPayload).not.toHaveProperty('idToken');
    expect(crmPayload).not.toHaveProperty('tokenHash');
    expect(crmPayload).not.toHaveProperty('privateInviteUrl');
    expect(crmPayload).not.toHaveProperty('h_trap');
  });

  it('TIR-016: honeypot h_trap non-empty → fake 200 success, CRM not called', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        h_trap: 'bot-value',
      },
    });

    // Fake success returned — status 200 (not 201)
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('RECEIVED');

    // CRM must NOT have been called
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-017: sourceChannel WEB forwarded correctly to CRM', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: { ...VALID_MINIMAL_PAYLOAD, sourceChannel: 'WEB' },
    });

    expect(response.statusCode).toBe(201);
    const crmCallArgs = vi.mocked(notifyCrmTier0Capture).mock.calls[0];
    const crmPayload = crmCallArgs?.[2] as Record<string, unknown>;
    expect(crmPayload?.sourceChannel).toBe('WEB');
  });

  it('TIR-018: buyer roleIntent accepted at Tier 0', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        roleIntent: 'buyer',
      },
    });

    expect(response.statusCode).toBe(201);
    const crmCallArgs = vi.mocked(notifyCrmTier0Capture).mock.calls[0];
    const crmPayload = crmCallArgs?.[2] as Record<string, unknown>;
    expect(crmPayload?.roleIntent).toBe('buyer');
  });

  it('TIR-019: missing roleIntent → 400 validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        firstTouchTimestamp: '2026-06-06T10:00:00.000Z',
        sourceChannel: 'WEB',
        // roleIntent absent
      },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

  it('TIR-020: notes containing email pattern → 400 validation error (PII rejection)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ENDPOINT,
      payload: {
        ...VALID_MINIMAL_PAYLOAD,
        notes: 'Please contact me at private@example.com for details',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(vi.mocked(notifyCrmTier0Capture)).not.toHaveBeenCalled();
  });

});
