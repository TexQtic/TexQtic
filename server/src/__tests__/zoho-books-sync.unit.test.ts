import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createZohoBooksContact } from '../services/zoho/zohoBooks.sync.js';
import type { ZohoBooksRuntimeConfig } from '../services/zoho/zohoBooks.config.js';

const ORIGINAL_ENV = { ...process.env };

const MOCK_CONFIG: ZohoBooksRuntimeConfig = {
  dryRunEnabled: true,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  organizationId: '60073287085',
  apiDomain: 'https://www.zohoapis.in',
};

const SYNTHETIC_SNAPSHOT = {
  organization: {
    id: '11111111-2222-3333-4444-555555555555',
    legalName: 'CRM Verify Corp Synthetic',
    tradeName: null,
    jurisdiction: 'IN',
    status: 'VERIFICATION_APPROVED',
  },
  tenant: {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'CRM Verify Corp Synthetic',
    plan: 'FREE',
  },
  activatedAt: '2026-06-10T10:00:00.000Z',
  source: 'TexQtic Controlled Live Smoke',
};

function mockTokenRefreshOk(): void {
  vi.mocked(globalThis.fetch).mockImplementationOnce(async url => {
    expect(String(url)).toContain('/oauth/v2/token');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'test-access-token-hidden',
        api_domain: 'https://www.zohoapis.in',
        expires_in: 3600,
      }),
    } as Response;
  });
}

function mockContactUpsertResponse(status: number, body: Record<string, unknown>): void {
  vi.mocked(globalThis.fetch).mockImplementationOnce(async () => ({
    ok: status < 300,
    status,
    json: async () => body,
  }) as Response);
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe('zohoBooks.sync — createZohoBooksContact', () => {
  it('returns CONTACT_CREATED with contactId on HTTP 201 / code 0', async () => {
    mockTokenRefreshOk();
    mockContactUpsertResponse(201, {
      code: 0,
      message: 'The contact has been created.',
      contact: { contact_id: 'zoho-contact-99001', contact_name: 'CRM Verify Corp Synthetic' },
    });

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('CONTACT_CREATED');
    expect(result.liveMutationAttempted).toBe(true);
    if (result.status === 'CONTACT_CREATED') {
      expect(result.contactId).toBe('zoho-contact-99001');
      expect(result.shapeFallbackUsed).toBe(false);
    }
  });

  it('returns CONTACT_UPDATED with contactId on HTTP 200 / code 0 (upsert update path)', async () => {
    mockTokenRefreshOk();
    mockContactUpsertResponse(200, {
      code: 0,
      message: 'Contact information updated.',
      contact: { contact_id: 'zoho-contact-99001', contact_name: 'CRM Verify Corp Synthetic' },
    });

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('CONTACT_UPDATED');
    expect(result.liveMutationAttempted).toBe(true);
    if (result.status === 'CONTACT_UPDATED') {
      expect(result.contactId).toBe('zoho-contact-99001');
      expect(result.shapeFallbackUsed).toBe(false);
    }
  });

  it('calls PUT /contacts (not POST) with organization_id query param', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    // token call
    fetchMock.mockImplementationOnce(async () => ({
      ok: true, status: 200,
      json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
    }) as Response);

    // contact upsert
    fetchMock.mockImplementationOnce(async (input, init) => {
      const url = String(input);
      expect(url).toContain('/books/v3/contacts');
      expect(url).toContain('organization_id=60073287085');
      expect((init as RequestInit).method).toBe('PUT');
      return {
        ok: true, status: 201,
        json: async () => ({ code: 0, contact: { contact_id: 'c1' } }),
      } as Response;
    });

    await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('includes X-Upsert idempotency headers on PUT call', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementationOnce(async () => ({
      ok: true, status: 200,
      json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
    }) as Response);

    fetchMock.mockImplementationOnce(async (_input, init) => {
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers['X-Unique-Identifier-Key']).toBe('cf_texqtic_org_id');
      expect(headers['X-Unique-Identifier-Value']).toBe('11111111-2222-3333-4444-555555555555');
      expect(headers['X-Upsert']).toBe('true');
      return {
        ok: true, status: 201,
        json: async () => ({ code: 0, contact: { contact_id: 'c1' } }),
      } as Response;
    });

    await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);
  });

  it('does not use POST /contacts — only PUT', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/oauth/v2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }) } as Response;
      }
      // Any contacts call must be PUT, never POST
      expect((init as RequestInit).method).not.toBe('POST');
      return { ok: true, status: 201, json: async () => ({ code: 0, contact: { contact_id: 'c1' } }) } as Response;
    });

    await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);
  });

  it('on HTTP 400 primary, falls back to label-shape custom fields and succeeds', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    // token
    fetchMock.mockImplementationOnce(async () => ({
      ok: true, status: 200,
      json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
    }) as Response);

    // primary: 400 (api_name rejected)
    fetchMock.mockImplementationOnce(async () => ({
      ok: false, status: 400,
      json: async () => ({ code: 1004, message: 'Invalid custom field' }),
    }) as Response);

    // fallback (label shape): 201
    fetchMock.mockImplementationOnce(async (_input, init) => {
      const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
      const cfs = body['custom_fields'] as Array<Record<string, string>>;
      // verify fallback used label keys
      expect(cfs.some(cf => 'label' in cf)).toBe(true);
      expect(cfs.some(cf => 'api_name' in cf)).toBe(false);
      return { ok: true, status: 201, json: async () => ({ code: 0, contact: { contact_id: 'c2' } }) } as Response;
    });

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('CONTACT_CREATED');
    expect(result.liveMutationAttempted).toBe(true);
    if (result.status === 'CONTACT_CREATED') {
      expect(result.shapeFallbackUsed).toBe(true);
      expect(result.contactId).toBe('c2');
    }
  });

  it('returns SYNC_FAILED with sanitized error when both primary and fallback fail', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementationOnce(async () => ({
      ok: true, status: 200,
      json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
    }) as Response);

    fetchMock.mockImplementationOnce(async () => ({
      ok: false, status: 400,
      json: async () => ({ code: 1004, message: 'Invalid custom field' }),
    }) as Response);

    fetchMock.mockImplementationOnce(async () => ({
      ok: false, status: 400,
      json: async () => ({ code: 1004, message: 'Label not found' }),
    }) as Response);

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('SYNC_FAILED');
    expect(result.liveMutationAttempted).toBe(true);
    if (result.status === 'SYNC_FAILED') {
      expect(result.errorSummary).not.toContain('test-access-token-hidden');
      expect(result.errorSummary.length).toBeLessThanOrEqual(500);
      expect(result.shapeFallbackUsed).toBe(true);
    }
  });

  it('returns SYNC_FAILED with sanitized message on non-400 Zoho error', async () => {
    mockTokenRefreshOk();
    mockContactUpsertResponse(503, { code: -1, message: 'Service unavailable' });

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('SYNC_FAILED');
    if (result.status === 'SYNC_FAILED') {
      expect(result.errorSummary).toContain('503');
      expect(result.errorSummary).not.toContain('test-access-token-hidden');
    }
  });

  it('never returns raw access token in result', async () => {
    mockTokenRefreshOk();
    mockContactUpsertResponse(201, {
      code: 0,
      contact: { contact_id: 'c9' },
    });

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('test-access-token-hidden');
    expect(serialized).not.toContain('refresh-token');
    expect(serialized).not.toContain('client-secret');
  });

  it('SYNC_FAILED on token refresh failure — no contact call made', async () => {
    vi.mocked(globalThis.fetch).mockImplementationOnce(async () => ({
      ok: false, status: 401,
      json: async () => ({ error: 'invalid_client' }),
    }) as Response);

    const result = await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);

    expect(result.status).toBe('SYNC_FAILED');
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1); // only token call
    if (result.status === 'SYNC_FAILED') {
      expect(result.errorSummary).toContain('TOKEN_REFRESH_FAILED');
    }
  });

  it('smoke payload does not contain GST/PAN/Aadhaar/provider fields', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/oauth/v2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }) } as Response;
      }
      const bodyStr = (init as RequestInit).body as string;
      // Ensure no provider-specific sensitive fields are present
      expect(bodyStr).not.toMatch(/gst_no|gstin|pan_no|aadhaar|deepvue|provider_id|provider_response/i);
      return { ok: true, status: 201, json: async () => ({ code: 0, contact: { contact_id: 'c1' } }) } as Response;
    });

    await createZohoBooksContact(MOCK_CONFIG, SYNTHETIC_SNAPSHOT);
  });
});
