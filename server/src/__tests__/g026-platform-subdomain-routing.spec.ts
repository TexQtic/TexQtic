import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('fails safely for malformed or out-of-scope hosts on the resolver path', async () => {
    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: vi.fn(),
      tenant: {
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

  it('returns not_found for an unresolved platform subdomain', async () => {
    prismaMock.$transaction.mockImplementation(async callback => callback({
      $executeRaw: vi.fn(),
      tenant: {
        findFirst: vi.fn().mockResolvedValue(null),
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