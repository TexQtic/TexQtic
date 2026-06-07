/**
 * Tier 0 public-route no-auth contract tests
 * FIX-MAINAPP-APICLIENT-PUBLIC-ROUTE-NO-AUTH-HEADER-01
 *
 * Verifies:
 *   T0A-001 — /api/public/ omits Authorization header when admin token is in localStorage
 *   T0A-002 — /api/public/ omits Authorization header when tenant token is in localStorage
 *   T0A-003 — /api/public/ omits Authorization header when no token is stored (normal public user)
 *   T0A-004 — submitTier0RequestAccess sends correct JSON body to the expected endpoint
 *   T0A-005 — UTM/referral/source fields pass through in request body
 *   T0A-006 — Forbidden token/session fields are NOT present in request body
 *   T0A-007 — 429 rate-limit response maps to APIError with status 429
 *   T0A-008 — Protected (non-public) POST includes Authorization header (regression guard)
 *   T0A-009 — /api/auth/ route also omits Authorization header (existing behaviour preserved)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { post, APIError } from '../../services/apiClient';
import { submitTier0RequestAccess } from '../../services/tier0Service';
import type { Tier0RequestPayload } from '../../services/tier0Service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FetchMock = ReturnType<typeof vi.fn>;

function makeMockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function capturedHeaders(fetchMock: FetchMock): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return (init?.headers ?? {}) as Record<string, string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PAYLOAD: Tier0RequestPayload = {
  roleIntent: 'supplier',
  name: 'Test User',
  email: 'test@example.com',
  firstTouchTimestamp: '2026-06-07T10:00:00.000Z',
};

const TIER0_SUCCESS_BODY = {
  success: true,
  data: {
    requestId: 'req-id-001',
    crmReceiptId: null,
    status: 'RECEIVED',
    message: "You're on the list.",
  },
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('T0A — /api/public/ Authorization header contract', () => {

  it('T0A-001: no Authorization header sent when admin token is in localStorage', async () => {
    localStorage.setItem('texqtic_admin_token', 'admin-jwt-test-token');
    localStorage.setItem('texqtic_auth_realm', 'CONTROL_PLANE');
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    await submitTier0RequestAccess(VALID_PAYLOAD);

    const headers = capturedHeaders(fetchMock);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('T0A-002: no Authorization header sent when tenant token is in localStorage', async () => {
    localStorage.setItem('texqtic_tenant_token', 'tenant-jwt-test-token');
    localStorage.setItem('texqtic_auth_realm', 'TENANT');
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    await submitTier0RequestAccess(VALID_PAYLOAD);

    const headers = capturedHeaders(fetchMock);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('T0A-003: no Authorization header for unauthenticated public user (no token stored)', async () => {
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    await submitTier0RequestAccess(VALID_PAYLOAD);

    const headers = capturedHeaders(fetchMock);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('T0A-004: submitTier0RequestAccess sends correct JSON body to the endpoint', async () => {
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    const result = await submitTier0RequestAccess(VALID_PAYLOAD);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/public/tier0/request-access');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.roleIntent).toBe('supplier');
    expect(body.name).toBe('Test User');
    expect(body.email).toBe('test@example.com');
    expect(body.firstTouchTimestamp).toBe('2026-06-07T10:00:00.000Z');

    // Return value is the unwrapped Tier0RequestResponse (not the outer {success, data} envelope)
    expect(result.requestId).toBe('req-id-001');
    expect(result.status).toBe('RECEIVED');
  });

  it('T0A-005: UTM/referral/source fields pass through in request body', async () => {
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    await submitTier0RequestAccess({
      ...VALID_PAYLOAD,
      utmSource: 'marketing_site',
      utmMedium: 'banner',
      utmCampaign: 'supplier_2026',
      sourceChannel: 'MARKETING',
      referralCode: 'REF-TEST-001',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.utmSource).toBe('marketing_site');
    expect(body.utmMedium).toBe('banner');
    expect(body.utmCampaign).toBe('supplier_2026');
    expect(body.sourceChannel).toBe('MARKETING');
    expect(body.referralCode).toBe('REF-TEST-001');
  });

  it('T0A-006: forbidden token/session fields are NOT present in request body', async () => {
    fetchMock.mockResolvedValueOnce(makeMockResponse(201, TIER0_SUCCESS_BODY));

    await submitTier0RequestAccess(VALID_PAYLOAD);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('inviteToken');
    expect(body).not.toHaveProperty('mainAppSessionToken');
    expect(body).not.toHaveProperty('authToken');
    expect(body).not.toHaveProperty('accessToken');
    expect(body).not.toHaveProperty('refreshToken');
    expect(body).not.toHaveProperty('idToken');
    expect(body).not.toHaveProperty('mainAppTier0RequestId');
    expect(body).not.toHaveProperty('Authorization');
  });

  it('T0A-007: 429 rate-limit response maps to APIError with status 429', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMockResponse(429, {
        statusCode: 429,
        code: 'RATE_LIMITED',
        error: 'Too Many Requests',
        message: 'Too many requests. Please wait and try again.',
      }),
    );

    await expect(submitTier0RequestAccess(VALID_PAYLOAD)).rejects.toSatisfy(
      (err: unknown) => err instanceof APIError && (err as APIError).status === 429,
    );
  });

  it('T0A-008: protected (non-public) POST DOES include Authorization header (regression guard)', async () => {
    localStorage.setItem('texqtic_admin_token', 'admin-jwt-test-token');
    localStorage.setItem('texqtic_auth_realm', 'CONTROL_PLANE');
    fetchMock.mockResolvedValueOnce(makeMockResponse(200, { id: '1' }));

    await post('/api/control/some-protected-endpoint', { test: true });

    const headers = capturedHeaders(fetchMock);
    expect(headers['Authorization']).toBe('Bearer admin-jwt-test-token');
  });

  it('T0A-009: /api/auth/ route also omits Authorization header (existing behaviour preserved)', async () => {
    localStorage.setItem('texqtic_admin_token', 'admin-jwt-test-token');
    localStorage.setItem('texqtic_auth_realm', 'CONTROL_PLANE');
    fetchMock.mockResolvedValueOnce(makeMockResponse(200, { token: 'new-token' }));

    await post('/api/auth/login', { email: 'a@b.com', password: 'pwd' });

    const headers = capturedHeaders(fetchMock);
    expect(headers['Authorization']).toBeUndefined();
  });

});
