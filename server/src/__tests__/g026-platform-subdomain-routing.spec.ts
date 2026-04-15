import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { RESOLVER_SECRET, prismaMock, getUserMembershipMock } = vi.hoisted(() => ({
  RESOLVER_SECRET: 'test-g026-routing-secret'.padEnd(32, 'x'),
  prismaMock: {
    $transaction: vi.fn(),
  },
  getUserMembershipMock: vi.fn(),
}));

vi.mock('../config/index.js', () => ({
  config: {
    TEXQTIC_RESOLVER_SECRET: RESOLVER_SECRET,
  },
}));

vi.mock('../db/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../db/withDbContext.js', () => ({
  getUserMembership: getUserMembershipMock,
}));

import resolveDomainRoutes from '../routes/internal/resolveDomain.js';
import { tenantResolutionHook } from '../hooks/tenantResolutionHook.js';
import { edgeCanonicalMessage } from '../lib/tenantHeaders.js';
import { tenantAuthMiddleware } from '../middleware/auth.js';

type EdgeMiddleware = (request: Request) => Promise<Response>;

const edgeMiddlewareModulePath: string = '../../../middleware.ts';

async function loadEdgeMiddleware(): Promise<EdgeMiddleware> {
  const edgeModule = (await import(edgeMiddlewareModulePath)) as { default: EdgeMiddleware };
  return edgeModule.default;
}

const originalFetch = globalThis.fetch;
const originalResolverSecret = process.env.TEXQTIC_RESOLVER_SECRET;

function signResolverHost(host: string, tsMs: number): string {
  return createHmac('sha256', RESOLVER_SECRET)
    .update(`resolve:${host}:${tsMs}`, 'utf8')
    .digest('hex');
}

function signEdgeHost(host: string, tenantId: string, tsSeconds: number): string {
  return createHmac('sha256', RESOLVER_SECRET)
    .update(edgeCanonicalMessage(host, tenantId, tsSeconds), 'utf8')
    .digest('hex');
}

function createReplyRecorder() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    sent: false,
    code(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    send(payload?: unknown) {
      this.payload = payload;
      this.sent = true;
      return this;
    },
  };
}

function createJsonResponse(statusCode: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TEXQTIC_RESOLVER_SECRET = RESOLVER_SECRET;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalResolverSecret === undefined) {
      delete process.env.TEXQTIC_RESOLVER_SECRET;
    } else {
      process.env.TEXQTIC_RESOLVER_SECRET = originalResolverSecret;
    }
  });

  it('keeps platform root, dev, and vercel hosts on the passthrough path', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const edgeMiddleware = await loadEdgeMiddleware();

    const passthroughCases = [
      { url: 'https://texqtic.app/catalog', host: 'texqtic.app' },
      { url: 'http://localhost:5173/', host: 'localhost:5173' },
      { url: 'https://preview-123.vercel.app/', host: 'preview-123.vercel.app' },
    ];

    for (const passthroughCase of passthroughCases) {
      const response = await edgeMiddleware(new Request(passthroughCase.url, {
        headers: { host: passthroughCase.host },
      }));

      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('x-middleware-request-x-texqtic-tenant-id')).toBeNull();
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a valid platform subdomain through the signed internal resolver path', async () => {
    const executeRawMock = vi.fn();
    const findFirstMock = vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'acme' });

    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: executeRawMock,
      tenant: {
        findFirst: findFirstMock,
      },
    }));

    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const tsMs = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('acme.texqtic.app')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': signResolverHost('acme.texqtic.app', tsMs),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'resolved',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      canonicalHost: 'acme.texqtic.app',
    });
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { slug: 'acme', status: 'ACTIVE' },
      select: { id: true, slug: true },
    });

    await app.close();
  });

  it('rejects invalid resolver HMAC for an otherwise valid platform host', async () => {
    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const tsMs = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('acme.texqtic.app')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': 'deadbeef',
      },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('rejects stale resolver timestamps for an otherwise valid platform host', async () => {
    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const staleTsMs = Date.now() - 120_000;
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('acme.texqtic.app')}`,
      headers: {
        'x-texqtic-resolver-ts': String(staleTsMs),
        'x-texqtic-resolver-hmac': signResolverHost('acme.texqtic.app', staleTsMs),
      },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('resolves a verified custom domain through the signed internal resolver path', async () => {
    const executeRawMock = vi.fn();
    const platformFindFirstMock = vi.fn();
    const customDomainFindFirstMock = vi.fn().mockResolvedValue({
      tenant: { id: 'tenant-2', slug: 'brand' },
    });

    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: executeRawMock,
      tenant: {
        findFirst: platformFindFirstMock,
      },
      tenantDomain: {
        findFirst: customDomainFindFirstMock,
      },
    }));

    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const tsMs = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('shop.customer.com')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': signResolverHost('shop.customer.com', tsMs),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'resolved',
      tenantId: 'tenant-2',
      tenantSlug: 'brand',
      canonicalHost: 'shop.customer.com',
    });
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(platformFindFirstMock).not.toHaveBeenCalled();
    expect(customDomainFindFirstMock).toHaveBeenCalledWith({
      where: {
        domain: 'shop.customer.com',
        verified: true,
        tenant: {
          status: 'ACTIVE',
        },
      },
      select: {
        tenant: {
          select: { id: true, slug: true },
        },
      },
    });

    await app.close();
  });

  it('fails safely for malformed hosts and unresolved custom domains on the resolver path', async () => {
    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: vi.fn(),
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      tenantDomain: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    }));

    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const malformed = await app.inject({
      method: 'GET',
      url: '/api/internal/resolve-domain?host=bad_host',
      headers: {
        'x-texqtic-resolver-ts': String(Date.now()),
        'x-texqtic-resolver-hmac': 'deadbeef',
      },
    });
    expect(malformed.statusCode).toBe(400);

    const tsMs = Date.now();
    const customDomain = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('shop.customer.com')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': signResolverHost('shop.customer.com', tsMs),
      },
    });

    expect(customDomain.statusCode).toBe(404);
    expect(customDomain.json()).toEqual({ status: 'not_found' });

    await app.close();
  });

  it('returns not_found for an unverified custom domain', async () => {
    const executeRawMock = vi.fn();
    const customDomainFindFirstMock = vi.fn().mockResolvedValue(null);

    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: executeRawMock,
      tenant: {
        findFirst: vi.fn(),
      },
      tenantDomain: {
        findFirst: customDomainFindFirstMock,
      },
    }));

    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const tsMs = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('pending.customer.com')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': signResolverHost('pending.customer.com', tsMs),
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ status: 'not_found' });
    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(customDomainFindFirstMock).toHaveBeenCalledWith({
      where: {
        domain: 'pending.customer.com',
        verified: true,
        tenant: {
          status: 'ACTIVE',
        },
      },
      select: {
        tenant: {
          select: { id: true, slug: true },
        },
      },
    });

    await app.close();
  });

  it('returns not_found for an unresolved platform subdomain', async () => {
    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: vi.fn(),
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      tenantDomain: {
        findFirst: vi.fn(),
      },
    }));

    const app = Fastify();
    await app.register(resolveDomainRoutes, { prefix: '/api/internal' });

    const tsMs = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/internal/resolve-domain?host=${encodeURIComponent('missing.texqtic.app')}`,
      headers: {
        'x-texqtic-resolver-ts': String(tsMs),
        'x-texqtic-resolver-hmac': signResolverHost('missing.texqtic.app', tsMs),
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ status: 'not_found' });

    await app.close();
  });

  it('admits normalized custom-domain hosts into the resolver path and propagates custom_domain', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(200, {
      status: 'resolved',
      tenantId: 'tenant-2',
      tenantSlug: 'brand',
      canonicalHost: 'shop.customer.com',
    }));
    globalThis.fetch = fetchMock as typeof fetch;
    const edgeMiddleware = await loadEdgeMiddleware();

    const response = await edgeMiddleware(new Request('https://shop.customer.com/store', {
      headers: { host: 'Shop.Customer.com:443' },
    }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('host=shop.customer.com');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-request-x-texqtic-tenant-id')).toBe('tenant-2');
    expect(response.headers.get('x-middleware-request-x-texqtic-tenant-slug')).toBe('brand');
    expect(response.headers.get('x-middleware-request-x-texqtic-tenant-source')).toBe('custom_domain');
  });

  it('returns generic not_found for unresolved custom domains after resolver admission', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(404, {
      status: 'not_found',
    }));
    globalThis.fetch = fetchMock as typeof fetch;
    const edgeMiddleware = await loadEdgeMiddleware();

    const response = await edgeMiddleware(new Request('https://missing.customer.com/store', {
      headers: { host: 'missing.customer.com' },
    }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: 'not_found' });
  });

  it('propagates bounded platform tenant context only when host, source, and slug all match', async () => {
    const tsSeconds = Math.floor(Date.now() / 1000);
    const request: {
      url: string;
      headers: Record<string, string>;
      log: { warn: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
      resolvedTenantId?: string;
      resolvedTenantSlug?: string;
      tenantSource?: string;
    } = {
      url: '/api/tenant/me',
      headers: {
        host: 'acme.texqtic.app',
        'x-texqtic-tenant-id': 'tenant-1',
        'x-texqtic-tenant-slug': 'acme',
        'x-texqtic-tenant-source': 'subdomain',
        'x-texqtic-resolver-ts': String(tsSeconds),
        'x-texqtic-resolver-sig': signEdgeHost('acme.texqtic.app', 'tenant-1', tsSeconds),
      },
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };
    const reply = createReplyRecorder();

    await tenantResolutionHook(request as never, reply as never);

    expect(reply.sent).toBe(false);
    expect(request.resolvedTenantId).toBe('tenant-1');
    expect(request.resolvedTenantSlug).toBe('acme');
    expect(request.tenantSource).toBe('subdomain');
  });

  it('propagates valid custom-domain tenant context and reuses it in tenant auth', async () => {
    const tsSeconds = Math.floor(Date.now() / 1000);
    const request: {
      url: string;
      headers: Record<string, string>;
      log: { warn: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
      resolvedTenantId?: string;
      resolvedTenantSlug?: string;
      tenantSource?: string;
    } = {
      url: '/api/tenant/me',
      headers: {
        host: 'shop.customer.com',
        'x-texqtic-tenant-id': 'tenant-2',
        'x-texqtic-tenant-slug': 'brand',
        'x-texqtic-tenant-source': 'custom_domain',
        'x-texqtic-resolver-ts': String(tsSeconds),
        'x-texqtic-resolver-sig': signEdgeHost('shop.customer.com', 'tenant-2', tsSeconds),
      },
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };
    const reply = createReplyRecorder();

    await tenantResolutionHook(request as never, reply as never);

    expect(reply.sent).toBe(false);
    expect(request.resolvedTenantId).toBe('tenant-2');
    expect(request.resolvedTenantSlug).toBe('brand');
    expect(request.tenantSource).toBe('custom_domain');

    getUserMembershipMock.mockResolvedValue({ role: 'OWNER' });

    const authRequest: {
      url: string;
      tenantJwtVerify: ReturnType<typeof vi.fn>;
      user: { userId: string; tenantId: string };
      resolvedTenantId: string;
      tenantId?: string;
      userId?: string;
      userRole?: string;
    } = {
      url: '/api/tenant/me',
      tenantJwtVerify: vi.fn().mockResolvedValue(undefined),
      user: {
        userId: 'user-1',
        tenantId: 'tenant-2',
      },
      resolvedTenantId: 'tenant-2',
    };
    const authReply = createReplyRecorder();

    await tenantAuthMiddleware(authRequest as never, authReply as never);

    expect(authReply.sent).toBe(false);
    expect(getUserMembershipMock).toHaveBeenCalledWith('user-1', 'tenant-2');
    expect(authRequest.tenantId).toBe('tenant-2');
    expect(authRequest.userRole).toBe('OWNER');
  });

  it('rejects invalid edge HMAC for an otherwise valid custom host', async () => {
    const tsSeconds = Math.floor(Date.now() / 1000);
    const request: {
      url: string;
      headers: Record<string, string>;
      log: { warn: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
      resolvedTenantId?: string;
    } = {
      url: '/api/tenant/me',
      headers: {
        host: 'shop.customer.com',
        'x-texqtic-tenant-id': 'tenant-2',
        'x-texqtic-tenant-slug': 'brand',
        'x-texqtic-tenant-source': 'custom_domain',
        'x-texqtic-resolver-ts': String(tsSeconds),
        'x-texqtic-resolver-sig': 'deadbeef',
      },
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };
    const reply = createReplyRecorder();

    await tenantResolutionHook(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect(request.resolvedTenantId).toBeUndefined();
  });

  it('rejects stale edge timestamps for an otherwise valid custom host', async () => {
    const staleTsSeconds = Math.floor((Date.now() - 120_000) / 1000);
    const request: {
      url: string;
      headers: Record<string, string>;
      log: { warn: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
      resolvedTenantId?: string;
    } = {
      url: '/api/tenant/me',
      headers: {
        host: 'shop.customer.com',
        'x-texqtic-tenant-id': 'tenant-2',
        'x-texqtic-tenant-slug': 'brand',
        'x-texqtic-tenant-source': 'custom_domain',
        'x-texqtic-resolver-ts': String(staleTsSeconds),
        'x-texqtic-resolver-sig': signEdgeHost('shop.customer.com', 'tenant-2', staleTsSeconds),
      },
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };
    const reply = createReplyRecorder();

    await tenantResolutionHook(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect(request.resolvedTenantId).toBeUndefined();
  });

  it('rejects malformed tenant context and blocks JWT tenant mismatches for the bounded path', async () => {
    const tsSeconds = Math.floor(Date.now() / 1000);
    const malformedRequest: {
      url: string;
      headers: Record<string, string>;
      log: { warn: ReturnType<typeof vi.fn>; debug: ReturnType<typeof vi.fn> };
      resolvedTenantId?: string;
    } = {
      url: '/api/tenant/me',
      headers: {
        host: 'acme.texqtic.app',
        'x-texqtic-tenant-id': 'tenant-1',
        'x-texqtic-tenant-slug': 'other-slug',
        'x-texqtic-tenant-source': 'subdomain',
        'x-texqtic-resolver-ts': String(tsSeconds),
        'x-texqtic-resolver-sig': signEdgeHost('acme.texqtic.app', 'tenant-1', tsSeconds),
      },
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };
    const malformedReply = createReplyRecorder();

    await tenantResolutionHook(malformedRequest as never, malformedReply as never);

    expect(malformedReply.statusCode).toBe(401);
    expect(malformedRequest.resolvedTenantId).toBeUndefined();

    const authRequest = {
      url: '/api/tenant/me',
      tenantJwtVerify: vi.fn().mockResolvedValue(undefined),
      user: {
        userId: 'user-1',
        tenantId: 'tenant-2',
      },
      resolvedTenantId: 'tenant-1',
    };
    const authReply = createReplyRecorder();

    await tenantAuthMiddleware(authRequest as never, authReply as never);

    expect(authReply.statusCode).toBe(403);
    expect(getUserMembershipMock).not.toHaveBeenCalled();
  });
});