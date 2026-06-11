import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readZohoBooksRuntimeConfig } from '../services/zoho/zohoBooks.config.js';
import {
  buildZohoBooksBaseUrl,
  fetchZohoBooksCustomFields,
  refreshZohoBooksAccessToken,
} from '../services/zoho/zohoBooks.client.js';
import { buildZohoBooksContactPayload, buildZohoBooksIdempotencyHeaders } from '../services/zoho/zohoBooks.payload.js';
import { runZohoBooksPostActivationDryRun } from '../services/zoho/zohoBooks.dryRun.js';

const ORIGINAL_ENV = { ...process.env };

function setDryRunEnv(enabled = true): void {
  process.env = { ...ORIGINAL_ENV };
  process.env.ZOHO_BOOKS_INTEGRATION_ENABLED = enabled ? 'true' : 'false';
  process.env.ZOHO_BOOKS_CLIENT_ID = 'client-id';
  process.env.ZOHO_BOOKS_CLIENT_SECRET = 'client-secret';
  process.env.ZOHO_BOOKS_REFRESH_TOKEN = 'refresh-token';
  process.env.ZOHO_BOOKS_ORGANIZATION_ID = '60073287085';
  process.env.ZOHO_BOOKS_API_DOMAIN = 'https://www.zohoapis.in';
}

function buildSnapshot() {
  return {
    organization: {
      id: '11111111-2222-3333-4444-555555555555',
      legalName: 'Acme Textiles Pvt Ltd',
      tradeName: 'Acme Textiles',
      jurisdiction: 'IN',
      status: 'VERIFICATION_APPROVED',
    },
    tenant: {
      id: '11111111-2222-3333-4444-555555555555',
      name: 'Acme Textiles',
      plan: 'PROFESSIONAL',
    },
    activatedAt: '2026-06-10T05:00:00.000Z',
    source: 'TexQtic Main App',
  };
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe('Zoho Books dry-run foundation', () => {
  it('reads env safely and reports missing keys without leaking values', () => {
    process.env = { ...ORIGINAL_ENV, ZOHO_BOOKS_INTEGRATION_ENABLED: 'true' };
    delete process.env.ZOHO_BOOKS_CLIENT_SECRET;

    const result = readZohoBooksRuntimeConfig();

    expect(result.status).toBe('MISSING_REQUIRED_ENV');
    if (result.status === 'MISSING_REQUIRED_ENV') {
      expect(result.missingKeys).toContain('ZOHO_BOOKS_CLIENT_SECRET');
      expect(JSON.stringify(result)).not.toContain('client-secret');
    }
  });

  it('builds the Zoho Books base URL and idempotency headers from cf_texqtic_org_id', () => {
    expect(buildZohoBooksBaseUrl('https://www.zohoapis.in')).toBe('https://www.zohoapis.in/books/v3');

    const headers = buildZohoBooksIdempotencyHeaders('11111111-2222-3333-4444-555555555555');
    expect(headers['X-Unique-Identifier-Key']).toBe('cf_texqtic_org_id');
    expect(headers['X-Unique-Identifier-Value']).toBe('11111111-2222-3333-4444-555555555555');
    expect(headers['X-Upsert']).toBe('true');
  });

  it('builds a deterministic dry-run payload with the intended custom field mapping', () => {
    const payload = buildZohoBooksContactPayload(buildSnapshot());

    expect(payload.contact_name).toBe('Acme Textiles');
    expect(payload.company_name).toBe('Acme Textiles Pvt Ltd');
    expect(payload.contact_type).toBe('customer');
    expect(payload.customer_sub_type).toBe('business');
    expect(payload.is_taxable).toBe(true);
    expect(payload.custom_fields).toEqual(
      expect.arrayContaining([
        { api_name: 'cf_texqtic_org_id', value: '11111111-2222-3333-4444-555555555555' },
        { api_name: 'cf_texqtic_tenant_id', value: '11111111-2222-3333-4444-555555555555' },
        { api_name: 'cf_texqtic_plan_tier', value: 'PROFESSIONAL' },
        { api_name: 'cf_texqtic_activated_at', value: '2026-06-10T05:00:00.000Z' },
        { api_name: 'cf_texqtic_source', value: 'TexQtic Main App' },
      ]),
    );
    expect(payload.notes).toBe('TexQtic Main App');
  });

  it('refreshes access token and reads only read-only Zoho endpoints', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockImplementationOnce(async url => {
        expect(String(url)).toContain('/oauth/v2/token');
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'access-token-hidden', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
        } as Response;
      })
      .mockImplementationOnce(async url => {
        expect(String(url)).toContain('/books/v3/settings/fields');
        return {
          ok: true,
          status: 200,
          json: async () => ({ fields: [{ api_name: 'cf_texqtic_org_id', is_unique: true }] }),
        } as Response;
      });

    setDryRunEnv(true);
    const configResult = readZohoBooksRuntimeConfig();
    expect(configResult.status).toBe('READY');
    if (configResult.status !== 'READY') return;

    const tokenResult = await refreshZohoBooksAccessToken(configResult.config);
    expect(tokenResult.status).toBe('OK');

    const fieldsResult = await fetchZohoBooksCustomFields(
      'https://www.zohoapis.in/books/v3',
      tokenResult.status === 'OK' ? tokenResult.accessToken : '',
      configResult.config.organizationId,
    );
    expect(fieldsResult.status).toBe('OK');
    expect(JSON.stringify(fieldsResult)).not.toContain('access-token-hidden');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('default-off mode makes no provider calls and blocks live mutation paths', async () => {
    setDryRunEnv(false);
    const result = await runZohoBooksPostActivationDryRun(buildSnapshot());

    expect(result.status).toBe('DISABLED');
    expect(result.liveMutationAttempted).toBe(false);
    expect(result.liveMutationBlocked).toBe(true);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('/contacts');
  });

  it('enabled dry-run produces a sanitized result and never hits contact mutation endpoints', async () => {
    setDryRunEnv(true);
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockImplementation(async input => {
      const url = String(input);

      if (url.includes('/oauth/v2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'access-token-hidden', api_domain: 'https://www.zohoapis.in', expires_in: 3600 }),
        } as Response;
      }

      if (url.includes('/books/v3/organizations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ organizations: [{ organization_id: '60073287085' }] }),
        } as Response;
      }

      if (url.includes('/books/v3/settings/fields')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ fields: [{ api_name: 'cf_texqtic_org_id', is_unique: true }] }),
        } as Response;
      }

      if (url.includes('/books/v3/sandboxes')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sandboxes: [{ sandbox_id: 'sbx-1' }] }),
        } as Response;
      }

      throw new Error(`Unexpected Zoho endpoint in dry-run: ${url}`);
    });

    const result = await runZohoBooksPostActivationDryRun(buildSnapshot());

    expect(result.status).toBe('DRY_RUN_READY');
    expect(result.liveMutationAttempted).toBe(false);
    expect(result.liveMutationBlocked).toBe(true);
    expect(result.payload?.custom_fields).toEqual(
      expect.arrayContaining([{ api_name: 'cf_texqtic_org_id', value: '11111111-2222-3333-4444-555555555555' }]),
    );
    expect(JSON.stringify(result)).not.toContain('/contacts');
    expect(JSON.stringify(result)).not.toContain('access-token-hidden');
    expect(result.integrationDraft?.organizationId).toBe('11111111-2222-3333-4444-555555555555');
    expect(result.integrationDraft?.providerKey).toBe('zoho_books');
    expect(result.integrationDraft?.externalObjectType).toBe('contact');
    expect(result.integrationDraft?.externalId).toBeNull();
    expect(result.integrationDraft?.syncStatus).toBe('DRY_RUN_READY');
  });
});

describe('readZohoBooksRuntimeConfig — flag model: ZOHO_BOOKS_INTEGRATION_ENABLED', () => {
  it('returns DISABLED when neither ZOHO_BOOKS_INTEGRATION_ENABLED nor deprecated flag is set', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ZOHO_BOOKS_INTEGRATION_ENABLED;
    delete process.env.ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED;

    const result = readZohoBooksRuntimeConfig();

    expect(result.status).toBe('DISABLED');
    expect(result.dryRunEnabled).toBe(false);
  });

  it('returns READY when ZOHO_BOOKS_INTEGRATION_ENABLED=true with no deprecatedFlagUsed', () => {
    setDryRunEnv(true); // sets ZOHO_BOOKS_INTEGRATION_ENABLED=true

    const result = readZohoBooksRuntimeConfig();

    expect(result.status).toBe('READY');
    expect(result.dryRunEnabled).toBe(true);
    if (result.status === 'READY') {
      expect(result.deprecatedFlagUsed).toBeUndefined();
    }
  });

  it('returns READY with deprecatedFlagUsed=true when only deprecated flag is set', () => {
    process.env = { ...ORIGINAL_ENV };
    process.env.ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED = 'true';
    process.env.ZOHO_BOOKS_CLIENT_ID = 'client-id';
    process.env.ZOHO_BOOKS_CLIENT_SECRET = 'client-secret';
    process.env.ZOHO_BOOKS_REFRESH_TOKEN = 'refresh-token';
    process.env.ZOHO_BOOKS_ORGANIZATION_ID = '60073287085';
    process.env.ZOHO_BOOKS_API_DOMAIN = 'https://www.zohoapis.in';
    delete process.env.ZOHO_BOOKS_INTEGRATION_ENABLED;

    const result = readZohoBooksRuntimeConfig();

    expect(result.status).toBe('READY');
    expect(result.dryRunEnabled).toBe(true);
    if (result.status === 'READY') {
      expect(result.deprecatedFlagUsed).toBe(true);
    }
  });
});