import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zohoReadonlyDiagnosticRoutes from '../routes/internal/zohoReadonlyDiagnostic.js';

const ENDPOINT = '/api/internal/diagnostics/zoho-readonly';
const TOKEN = 'diag-token-test-only';

const ORIGINAL_ENV = { ...process.env };

function resolveRequestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function setZohoEnv(): void {
  process.env.ZOHO_DIAGNOSTIC_TOKEN = TOKEN;
  process.env.ZOHO_BOOKS_CLIENT_ID = 'client-id';
  process.env.ZOHO_BOOKS_CLIENT_SECRET = 'client-secret';
  process.env.ZOHO_BOOKS_REFRESH_TOKEN = 'refresh-token';
  process.env.ZOHO_BOOKS_ORGANIZATION_ID = '123456789012345';
  process.env.ZOHO_BOOKS_API_DOMAIN = 'https://www.zohoapis.in';
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(zohoReadonlyDiagnosticRoutes, { prefix: '/api/internal' });
  await app.ready();
  return app;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  setZohoEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe('GET /api/internal/diagnostics/zoho-readonly', () => {
  it('returns 401 when diagnostic header is missing', async () => {
    const app = await buildApp();

    const response = await app.inject({ method: 'GET', url: ENDPOINT });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 when diagnostic header token is incorrect', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: ENDPOINT,
      headers: {
        'x-texqtic-diagnostic-token': 'wrong-token',
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns sanitized diagnostics and never includes secret values', async () => {
    const app = await buildApp();

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: string | URL | Request) => {
        const url = resolveRequestUrl(input);

        if (url.includes('/oauth/v2/token')) {
          return new Response(
            JSON.stringify({
              access_token: 'access-token-hidden',
              api_domain: 'https://www.zohoapis.in',
              expires_in: 3600,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.includes('/books/v3/organizations')) {
          return new Response(
            JSON.stringify({
              organizations: [{ organization_id: process.env.ZOHO_BOOKS_ORGANIZATION_ID }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.includes('/books/v3/settings/fields')) {
          return new Response(
            JSON.stringify({
              fields: [
                { api_name: 'cf_texqtic_org_id', is_unique: true },
                { api_name: 'cf_texqtic_tenant_id' },
                { api_name: 'cf_texqtic_plan_tier' },
                { api_name: 'cf_texqtic_activated_at' },
                { api_name: 'cf_texqtic_source' },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (url.includes('/books/v3/sandboxes')) {
          return new Response(
            JSON.stringify({
              sandboxes: [{ sandbox_id: 'sbx-1' }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        return new Response(JSON.stringify({ message: 'not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      });

    const response = await app.inject({
      method: 'GET',
      url: ENDPOINT,
      headers: {
        'x-texqtic-diagnostic-token': TOKEN,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.zoho.token_refresh).toBe('OK');
    expect(body.zoho.org_id_masked).toBe('...2345');
    expect(body.contact_creation).toBe('FORBIDDEN_NOT_ATTEMPTED');

    // Ensure response body does not leak raw secret env values or tokens.
    const clientSecret = process.env.ZOHO_BOOKS_CLIENT_SECRET || '';
    const refreshToken = process.env.ZOHO_BOOKS_REFRESH_TOKEN || '';
    expect(response.body).not.toContain(clientSecret);
    expect(response.body).not.toContain(refreshToken);
    expect(response.body).not.toContain('access-token-hidden');

    expect(fetchMock).toHaveBeenCalled();

    await app.close();
  });
});
