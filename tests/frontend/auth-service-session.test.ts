/**
 * FAM-06 Frontend Auth Service / Session Contract Tests
 * FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001
 *
 * Unit:    FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001
 * Family:  FAM-06 — Auth and Session Management
 * Date:    2026-05-20
 *
 * Closes G-06-002: missing dedicated frontend auth service/session suite for
 * services/authService.ts and services/apiClient.ts auth branches.
 *
 * Covers:
 *   APCL-001  setToken(TENANT) stores token in tenant key, sets realm to TENANT
 *   APCL-002  setToken(CONTROL_PLANE) stores token in admin key, sets realm to CONTROL_PLANE
 *   APCL-003  TENANT token is NOT stored in admin key
 *   APCL-004  CONTROL_PLANE token is NOT stored in tenant key
 *   APCL-005  getToken returns null when nothing stored
 *   APCL-006  getToken returns tenant token when TENANT realm active
 *   APCL-007  getToken returns admin token when CONTROL_PLANE realm active
 *   APCL-008  getToken infers TENANT when only tenant token in storage
 *   APCL-009  getToken infers CONTROL_PLANE when only admin token in storage
 *   APCL-010  clearAuth removes tenant token
 *   APCL-011  clearAuth removes admin token
 *   APCL-012  clearAuth removes realm key
 *   APCL-013  getToken returns null after clearAuth
 *   APCL-014  clearAuth is idempotent when storage is empty
 *   APCL-015  setStoredAuthRealm(TENANT) persists TENANT
 *   APCL-016  setStoredAuthRealm(null) removes realm key
 *   APCL-017  getAuthRealm returns null when nothing stored
 *   APCL-018  getAuthRealm returns stored TENANT realm
 *   APCL-019  getCurrentAuthRealm returns stored CONTROL_PLANE realm
 *   APCL-020  getCurrentAuthRealm returns fallback when no realm stored and no tokens
 *   APCL-021  isAuthenticated returns false when no token stored
 *   APCL-022  isAuthenticated returns true when TENANT token stored
 *   APCL-023  isAuthenticated returns true when CONTROL_PLANE token stored
 *   APCL-024  isAuthenticated returns false after clearAuth
 *   APCL-025  APIError is an instance of Error
 *   APCL-026  APIError has name "APIError"
 *   APCL-027  APIError carries status, message, code
 *   APCL-028  APIError carries optional details
 *   APCL-029  thrown APIError is catchable as APIError with correct status
 *   APCL-030  impersonation token overrides tenant token for getToken
 *   APCL-031  clearing impersonation restores real tenant token
 *   APCL-032  impersonation does not affect admin realm getToken
 *   APCL-033  auth route POST does not attach Authorization header
 *   APCL-034  non-auth GET attaches Authorization: Bearer when token stored
 *   APCL-035  non-auth GET omits Authorization when no token stored
 *   APCL-036  401 response throws APIError status 401 code UNAUTHORIZED
 *   APCL-037  403 response throws APIError status 403
 *   APCL-038  404 response throws APIError status 404
 *   APCL-039  5xx response throws APIError status >= 500 (post, no retry)
 *   AUTH-001  CONTROL_PLANE login calls /api/auth/admin/login
 *   AUTH-002  TENANT login calls /api/auth/login (not admin endpoint)
 *   AUTH-003  token is absent (stale cleared) when fetch is called
 *   AUTH-004  admin login body contains email and password only (no tenantId)
 *   AUTH-005  tenant login body contains email, password, and tenantId
 *   AUTH-006  TENANT login sends x-realm-hint: tenant header
 *   AUTH-007  CONTROL_PLANE login does NOT send x-realm-hint header
 *   AUTH-008  TENANT login stores token in tenant localStorage key
 *   AUTH-009  CONTROL_PLANE login stores token in admin localStorage key
 *   AUTH-010  login returns token in LoginResponse
 *   AUTH-011  login normalizes { token } payload from direct response shape
 *   AUTH-012  resolvePublicEntryDescriptor passes slug as query param
 *   AUTH-013  resolvePublicEntryDescriptor passes email as query param (encoded)
 *   AUTH-014  resolvePublicEntryDescriptor passes both slug and email
 *   AUTH-015  resolvePublicEntryDescriptor calls base endpoint with no query when neither given
 *   AUTH-016  resolveTenantBySlug returns resolvedTenantContext on RESOLVED
 *   AUTH-017  resolveTenantBySlug throws APIError 404 on UNRESOLVED_REJECTED
 *   AUTH-018  resolveTenantBySlug throws 404 when RESOLVED but no resolvedTenantContext
 *   AUTH-019  resolveTenantBySlug error message contains the slug, not internal server detail
 *   AUTH-020  resolveTenantsByEmail returns [tenant] when RESOLVED with context
 *   AUTH-021  resolveTenantsByEmail returns [] on UNRESOLVED_REJECTED with no candidates
 *   AUTH-022  resolveTenantsByEmail returns candidateTenantContexts when CANDIDATE_SELECTION_REQUIRED
 *   AUTH-023  isAuthenticatedFor returns true when stored realm matches
 *   AUTH-024  isAuthenticatedFor returns false when realm does not match
 *   AUTH-025  isAuthenticatedFor returns false when no realm stored
 *   AUTH-026  isAuthenticatedFor CONTROL_PLANE returns true when admin token stored
 *   AUTH-027  forgotPassword calls POST /api/auth/forgot-password with email body
 *   AUTH-028  forgotPassword body does not include password or token
 *   AUTH-029  resetPassword calls POST /api/auth/reset-password with token and newPassword
 *   AUTH-030  resetPassword body does not contain email field
 *   AUTH-031  verifyEmail calls POST /api/auth/verify-email with token body
 *   AUTH-032  resendVerification calls POST /api/auth/resend-verification with email body
 *   AUTH-033  resendVerification body does not include token or password
 *   AUTH-034  login 401 error throws APIError, does not expose raw response as plain object
 *   AUTH-035  network error throws APIError status 0 code NETWORK_ERROR without email in message
 *
 * Harness: vitest + jsdom (vitest.frontend.config.ts)
 * DB-free: yes — no Supabase, no live network, no real secrets
 * Fetch:   mocked per test via vi.stubGlobal / direct assignment
 * localStorage: provided by jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setToken,
  getToken,
  clearAuth,
  setStoredAuthRealm,
  getAuthRealm,
  getCurrentAuthRealm,
  isAuthenticated,
  APIError,
  setImpersonationToken,
  get,
  post,
} from '../../services/apiClient';
import {
  login,
  resolvePublicEntryDescriptor,
  resolveTenantBySlug,
  resolveTenantsByEmail,
  isAuthenticatedFor,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../../services/authService';

// ─── localStorage key contracts (inline mirror — not re-exported by apiClient) ─
const TENANT_TOKEN_KEY = 'texqtic_tenant_token';
const ADMIN_TOKEN_KEY = 'texqtic_admin_token';
const AUTH_REALM_KEY = 'texqtic_auth_realm';

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  setImpersonationToken(null);
  vi.clearAllMocks();
  // Safety net: any test that forgets to mock fetch will fail loudly, not silently pass
  global.fetch = vi.fn().mockRejectedValue(new Error('fetch not mocked in this test'));
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ─── Response helpers ─────────────────────────────────────────────────────────

/**
 * Simulate a successful response with raw JSON body (no { success, data } envelope).
 * apiClient unwraps envelopes; when data.success is undefined it returns data as-is.
 */
function okRaw(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    headers: new Headers(),
  } as unknown as Response;
}

function errorResponse(status: number, errorBody: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => errorBody,
    headers: new Headers(),
  } as unknown as Response;
}

// ─── Descriptor factory ───────────────────────────────────────────────────────

function makeDescriptor(overrides?: object) {
  return {
    publicEntryKind: 'PLATFORM' as const,
    normalizedHost: null,
    resolutionSourceType: 'SLUG_PATH' as const,
    resolutionDisposition: 'RESOLVED' as const,
    resolvedRealmClass: 'B2B_PUBLIC_DISCOVERY_ENTRY' as const,
    resolvedTenantContext: { tenantId: 't-uuid-001', slug: 'acme', name: 'Acme Textiles' },
    brandSurfaceFramingContext: null,
    allowedTargetSurfaceClass: 'TENANT_BRANDED_PUBLIC_SURFACE' as const,
    requiredTransitionClass: 'ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE' as const,
    authenticationRequired: false,
    postAuthEligibilityCheckRequired: false,
    downstreamHandoffTargetClass: 'NONE' as const,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1 — apiClient: pure localStorage functions (no fetch required)
// ─────────────────────────────────────────────────────────────────────────────

describe('apiClient — setToken / getToken realm separation', () => {
  it('APCL-001: setToken(TENANT) stores token in tenant key and sets realm', () => {
    setToken('tenant-jwt', 'TENANT');
    expect(localStorage.getItem(TENANT_TOKEN_KEY)).toBe('tenant-jwt');
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBe('TENANT');
  });

  it('APCL-002: setToken(CONTROL_PLANE) stores token in admin key and sets realm', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBe('admin-jwt');
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBe('CONTROL_PLANE');
  });

  it('APCL-003: TENANT token is NOT stored in admin key', () => {
    setToken('tenant-jwt', 'TENANT');
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it('APCL-004: CONTROL_PLANE token is NOT stored in tenant key', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    expect(localStorage.getItem(TENANT_TOKEN_KEY)).toBeNull();
  });

  it('APCL-005: getToken returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('APCL-006: getToken returns tenant token when TENANT realm active', () => {
    setToken('tenant-jwt', 'TENANT');
    expect(getToken()).toBe('tenant-jwt');
  });

  it('APCL-007: getToken returns admin token when CONTROL_PLANE realm active', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    expect(getToken()).toBe('admin-jwt');
  });

  it('APCL-008: getToken infers TENANT when only tenant token in storage (no realm key)', () => {
    localStorage.setItem(TENANT_TOKEN_KEY, 'inferred-tenant');
    expect(getToken()).toBe('inferred-tenant');
  });

  it('APCL-009: getToken infers CONTROL_PLANE when only admin token in storage (no realm key)', () => {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'inferred-admin');
    expect(getToken()).toBe('inferred-admin');
  });
});

describe('apiClient — clearAuth removes all auth state', () => {
  it('APCL-010: clearAuth removes tenant token', () => {
    setToken('t', 'TENANT');
    clearAuth();
    expect(localStorage.getItem(TENANT_TOKEN_KEY)).toBeNull();
  });

  it('APCL-011: clearAuth removes admin token', () => {
    setToken('a', 'CONTROL_PLANE');
    clearAuth();
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it('APCL-012: clearAuth removes realm key', () => {
    setToken('t', 'TENANT');
    clearAuth();
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBeNull();
  });

  it('APCL-013: getToken returns null after clearAuth', () => {
    setToken('t', 'TENANT');
    clearAuth();
    expect(getToken()).toBeNull();
  });

  it('APCL-014: clearAuth is idempotent when storage is empty', () => {
    expect(() => clearAuth()).not.toThrow();
    expect(getToken()).toBeNull();
  });
});

describe('apiClient — realm storage contract', () => {
  it('APCL-015: setStoredAuthRealm(TENANT) persists TENANT in storage', () => {
    setStoredAuthRealm('TENANT');
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBe('TENANT');
  });

  it('APCL-016: setStoredAuthRealm(null) removes realm key', () => {
    setStoredAuthRealm('TENANT');
    setStoredAuthRealm(null);
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBeNull();
  });

  it('APCL-017: getAuthRealm returns null when nothing stored', () => {
    expect(getAuthRealm()).toBeNull();
  });

  it('APCL-018: getAuthRealm returns stored TENANT realm', () => {
    setStoredAuthRealm('TENANT');
    expect(getAuthRealm()).toBe('TENANT');
  });

  it('APCL-019: getCurrentAuthRealm returns stored CONTROL_PLANE realm', () => {
    setStoredAuthRealm('CONTROL_PLANE');
    expect(getCurrentAuthRealm()).toBe('CONTROL_PLANE');
  });

  it('APCL-020: getCurrentAuthRealm returns provided fallback when no realm stored and no tokens', () => {
    expect(getCurrentAuthRealm('TENANT')).toBe('TENANT');
  });
});

describe('apiClient — isAuthenticated', () => {
  it('APCL-021: returns false when no token stored', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('APCL-022: returns true when TENANT token stored', () => {
    setToken('t', 'TENANT');
    expect(isAuthenticated()).toBe(true);
  });

  it('APCL-023: returns true when CONTROL_PLANE token stored', () => {
    setToken('a', 'CONTROL_PLANE');
    expect(isAuthenticated()).toBe(true);
  });

  it('APCL-024: returns false after clearAuth', () => {
    setToken('t', 'TENANT');
    clearAuth();
    expect(isAuthenticated()).toBe(false);
  });
});

describe('apiClient — APIError class contract', () => {
  it('APCL-025: APIError is an instance of Error', () => {
    const err = new APIError(401, 'Unauthorized.');
    expect(err).toBeInstanceOf(Error);
  });

  it('APCL-026: APIError has name "APIError"', () => {
    const err = new APIError(401, 'Unauthorized.');
    expect(err.name).toBe('APIError');
  });

  it('APCL-027: APIError carries status, message, and code', () => {
    const err = new APIError(403, 'Forbidden.', 'FORBIDDEN');
    expect(err.status).toBe(403);
    expect(err.message).toBe('Forbidden.');
    expect(err.code).toBe('FORBIDDEN');
  });

  it('APCL-028: APIError carries optional details payload', () => {
    const err = new APIError(422, 'Invalid.', 'VALIDATION_ERROR', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('APCL-029: thrown APIError is catchable and instanceof-comparable', () => {
    try {
      throw new APIError(404, 'Not found.', 'NOT_FOUND');
    } catch (e) {
      expect(e).toBeInstanceOf(APIError);
      expect((e as APIError).status).toBe(404);
      expect((e as APIError).code).toBe('NOT_FOUND');
    }
  });
});

describe('apiClient — impersonation token override', () => {
  it('APCL-030: impersonation token overrides tenant token for getToken', () => {
    setToken('real-tenant-jwt', 'TENANT');
    setImpersonationToken('impersonation-jwt');
    expect(getToken()).toBe('impersonation-jwt');
  });

  it('APCL-031: clearing impersonation (null) restores real tenant token', () => {
    setToken('real-tenant-jwt', 'TENANT');
    setImpersonationToken('impersonation-jwt');
    setImpersonationToken(null);
    expect(getToken()).toBe('real-tenant-jwt');
  });

  it('APCL-032: impersonation override does NOT affect CONTROL_PLANE token selection', () => {
    setToken('admin-jwt', 'CONTROL_PLANE');
    setImpersonationToken('impersonation-jwt');
    // Admin realm active — impersonation override applies to TENANT realm only
    expect(getToken()).toBe('admin-jwt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 2 — apiClient: fetch-based behavior (Bearer header, error shapes)
// ─────────────────────────────────────────────────────────────────────────────

describe('apiClient — auth route skips Bearer header (APCL-033)', () => {
  it('POST to /api/auth/* does not attach Authorization header even when token stored', async () => {
    setToken('stored-jwt', 'TENANT');
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'ok' }));

    await post('/api/auth/forgot-password', { email: 'x@x.com' });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('apiClient — non-auth route attaches Bearer header', () => {
  it('APCL-034: GET to non-auth endpoint attaches Authorization: Bearer when token stored', async () => {
    setToken('stored-jwt', 'TENANT');
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ user: { id: 'u1' } }));

    await get('/api/me', undefined, { retry: false });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer stored-jwt');
  });

  it('APCL-035: GET to non-auth endpoint omits Authorization when no token stored', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ user: { id: 'u1' } }));

    await get('/api/me', undefined, { retry: false });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('apiClient — HTTP error shapes', () => {
  it('APCL-036: 401 response throws APIError status 401 code UNAUTHORIZED', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(401, { error: { message: 'Token expired.', code: 'UNAUTHORIZED' } })
    );

    await expect(post('/api/tenant/resource', {})).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('APCL-037: 403 response throws APIError status 403', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(403, { error: { message: 'Forbidden.' } })
    );

    await expect(post('/api/tenant/resource', {})).rejects.toMatchObject({ status: 403 });
  });

  it('APCL-038: 404 response throws APIError status 404', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(404, { error: { message: 'Not found.' } })
    );

    await expect(post('/api/tenant/resource', {})).rejects.toMatchObject({ status: 404 });
  });

  it('APCL-039: 5xx response throws APIError with status >= 500 (POST has no retry)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(500, { error: { message: 'Server error.' } })
    );

    await expect(post('/api/tenant/resource', {})).rejects.toMatchObject({ status: 500 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 — authService: login endpoint resolution by realm
// ─────────────────────────────────────────────────────────────────────────────

describe('authService — login endpoint by realm', () => {
  it('AUTH-001: CONTROL_PLANE realm calls /api/auth/admin/login', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'admin-token', user: { id: 'u1', email: 'admin@texqtic.com' } })
    );

    await login({ email: 'admin@texqtic.com', password: 'pass123' }, 'CONTROL_PLANE');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/admin/login');
  });

  it('AUTH-002: TENANT realm calls /api/auth/login (not the admin endpoint)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'tenant-token', user: { id: 'u2', email: 'buyer@co.com' } })
    );

    await login({ email: 'buyer@co.com', password: 'pass123', tenantId: 'tid-123' }, 'TENANT');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(url).not.toContain('/api/auth/admin/login');
  });
});

describe('authService — login clears stale auth before post (AUTH-003)', () => {
  it('stored token is already absent when the fetch call executes', async () => {
    setToken('stale-jwt', 'TENANT');

    let tokenAtRequestTime: string | null = 'NOT_YET_CALLED';
    global.fetch = vi.fn().mockImplementation(() => {
      tokenAtRequestTime = getToken();
      return Promise.resolve(
        okRaw({ token: 'new-token', user: { id: 'u3', email: 'x@x.com' } })
      );
    });

    await login({ email: 'x@x.com', password: 'p', tenantId: 'tid-001' }, 'TENANT');

    // clearAuth() must have been called before post() executed
    expect(tokenAtRequestTime).toBeNull();
  });
});

describe('authService — login body shape by realm', () => {
  it('AUTH-004: admin login body contains email and password only (no tenantId)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'tok', user: { id: 'u', email: 'a@a.com' } })
    );

    await login({ email: 'a@a.com', password: 'pw123' }, 'CONTROL_PLANE');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toHaveProperty('email', 'a@a.com');
    expect(body).toHaveProperty('password', 'pw123');
    expect(body).not.toHaveProperty('tenantId');
  });

  it('AUTH-005: tenant login body contains email, password, and tenantId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'tok', user: { id: 'u', email: 'b@b.com' } })
    );

    await login({ email: 'b@b.com', password: 'pw123', tenantId: 'tid-456' }, 'TENANT');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.email).toBe('b@b.com');
    expect(body.password).toBe('pw123');
    expect(body.tenantId).toBe('tid-456');
  });
});

describe('authService — login realm-hint header', () => {
  it('AUTH-006: TENANT login sends x-realm-hint: tenant header', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'tok', user: { id: 'u', email: 'c@c.com' } })
    );

    await login({ email: 'c@c.com', password: 'pw', tenantId: 'tid' }, 'TENANT');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-realm-hint']).toBe('tenant');
  });

  it('AUTH-007: CONTROL_PLANE login does NOT send x-realm-hint header', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'tok', user: { id: 'u', email: 'd@d.com' } })
    );

    await login({ email: 'd@d.com', password: 'pw' }, 'CONTROL_PLANE');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-realm-hint']).toBeUndefined();
  });
});

describe('authService — login stores token after success', () => {
  it('AUTH-008: TENANT login stores token in tenant localStorage key', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'new-tenant-jwt', user: { id: 'u', email: 'e@e.com' } })
    );

    await login({ email: 'e@e.com', password: 'pw', tenantId: 'tid' }, 'TENANT');

    expect(localStorage.getItem(TENANT_TOKEN_KEY)).toBe('new-tenant-jwt');
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBe('TENANT');
  });

  it('AUTH-009: CONTROL_PLANE login stores token in admin localStorage key', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'new-admin-jwt', user: { id: 'u', email: 'f@f.com' } })
    );

    await login({ email: 'f@f.com', password: 'pw' }, 'CONTROL_PLANE');

    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBe('new-admin-jwt');
    expect(localStorage.getItem(AUTH_REALM_KEY)).toBe('CONTROL_PLANE');
  });

  it('AUTH-010: login returns the token in LoginResponse', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'ret-token', user: { id: 'u', email: 'g@g.com' } })
    );

    const result = await login({ email: 'g@g.com', password: 'pw', tenantId: 'tid' }, 'TENANT');
    expect(result.token).toBe('ret-token');
  });
});

describe('authService — login payload normalization (AUTH-011)', () => {
  it('returns correct token and user when backend sends raw { token, user } shape', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw({ token: 'raw-token', user: { id: 'uid', email: 'h@h.com' } })
    );

    const result = await login({ email: 'h@h.com', password: 'pw', tenantId: 'tid' }, 'TENANT');
    expect(result.token).toBe('raw-token');
    expect(result.user.email).toBe('h@h.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 4 — authService: public entry helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('authService — resolvePublicEntryDescriptor endpoint shape', () => {
  it('AUTH-012: passes slug as URL query param', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw(makeDescriptor()));

    await resolvePublicEntryDescriptor({ slug: 'acme-corp' });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/public/entry/resolve');
    expect(url).toContain('slug=acme-corp');
  });

  it('AUTH-013: passes email as URL query param (percent-encoded)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(makeDescriptor({ resolutionSourceType: 'EMAIL_MEMBERSHIP_DISCOVERY' }))
    );

    await resolvePublicEntryDescriptor({ email: 'buyer@example.com' });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('email=buyer%40example.com');
  });

  it('AUTH-014: passes both slug and email when both provided', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw(makeDescriptor()));

    await resolvePublicEntryDescriptor({ slug: 'co', email: 'x@x.com' });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('slug=co');
    expect(url).toContain('email=');
  });

  it('AUTH-015: calls base endpoint with no query string when neither slug nor email given', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(
        makeDescriptor({
          resolutionDisposition: 'NEUTRAL_NO_TENANT',
          resolvedTenantContext: null,
        })
      )
    );

    await resolvePublicEntryDescriptor({});

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/public/entry/resolve');
    expect(url).not.toContain('?');
  });
});

describe('authService — resolveTenantBySlug', () => {
  it('AUTH-016: returns resolvedTenantContext on RESOLVED disposition', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw(makeDescriptor()));

    const tenant = await resolveTenantBySlug('acme');
    expect(tenant.tenantId).toBe('t-uuid-001');
    expect(tenant.slug).toBe('acme');
    expect(tenant.name).toBe('Acme Textiles');
  });

  it('AUTH-017: throws APIError 404 with code TENANT_NOT_FOUND on UNRESOLVED_REJECTED', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(
        makeDescriptor({
          resolutionDisposition: 'UNRESOLVED_REJECTED',
          resolvedTenantContext: null,
        })
      )
    );

    await expect(resolveTenantBySlug('unknown-slug')).rejects.toMatchObject({
      status: 404,
      code: 'TENANT_NOT_FOUND',
    });
  });

  it('AUTH-018: throws 404 when disposition is RESOLVED but resolvedTenantContext is null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(makeDescriptor({ resolvedTenantContext: null }))
    );

    await expect(resolveTenantBySlug('broken-slug')).rejects.toMatchObject({ status: 404 });
  });

  it('AUTH-019: thrown error message contains the queried slug (not opaque server detail)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(
        makeDescriptor({
          resolutionDisposition: 'UNRESOLVED_REJECTED',
          resolvedTenantContext: null,
        })
      )
    );

    try {
      await resolveTenantBySlug('missing-co');
    } catch (e) {
      expect((e as Error).message).toContain('missing-co');
    }
  });
});

describe('authService — resolveTenantsByEmail', () => {
  it('AUTH-020: returns [tenant] when RESOLVED with a resolvedTenantContext', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw(makeDescriptor()));

    const tenants = await resolveTenantsByEmail('buyer@acme.com');
    expect(tenants).toHaveLength(1);
    expect(tenants[0].tenantId).toBe('t-uuid-001');
  });

  it('AUTH-021: returns empty array on UNRESOLVED_REJECTED with no candidateTenantContexts', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(
        makeDescriptor({
          resolutionDisposition: 'UNRESOLVED_REJECTED',
          resolvedTenantContext: null,
        })
      )
    );

    const tenants = await resolveTenantsByEmail('nobody@missing.com');
    expect(tenants).toEqual([]);
  });

  it('AUTH-022: returns candidateTenantContexts when CANDIDATE_SELECTION_REQUIRED', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      okRaw(
        makeDescriptor({
          resolutionDisposition: 'CANDIDATE_SELECTION_REQUIRED',
          resolvedTenantContext: null,
          candidateTenantContexts: [
            { tenantId: 'c1', slug: 'co1', name: 'Co One' },
            { tenantId: 'c2', slug: 'co2', name: 'Co Two' },
          ],
        })
      )
    );

    const tenants = await resolveTenantsByEmail('multi@member.com');
    expect(tenants).toHaveLength(2);
    expect(tenants[0].tenantId).toBe('c1');
    expect(tenants[1].tenantId).toBe('c2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — authService: isAuthenticatedFor
// ─────────────────────────────────────────────────────────────────────────────

describe('authService — isAuthenticatedFor', () => {
  it('AUTH-023: returns true when stored realm matches requested realm', () => {
    setToken('t', 'TENANT');
    expect(isAuthenticatedFor('TENANT')).toBe(true);
  });

  it('AUTH-024: returns false when stored realm does not match requested realm', () => {
    setToken('t', 'TENANT');
    expect(isAuthenticatedFor('CONTROL_PLANE')).toBe(false);
  });

  it('AUTH-025: returns false when no realm stored', () => {
    expect(isAuthenticatedFor('TENANT')).toBe(false);
  });

  it('AUTH-026: returns true for CONTROL_PLANE when admin token stored', () => {
    setToken('a', 'CONTROL_PLANE');
    expect(isAuthenticatedFor('CONTROL_PLANE')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 6 — authService: password / verification endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe('authService — forgotPassword endpoint and body', () => {
  it('AUTH-027: calls POST /api/auth/forgot-password with email in body', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'check your inbox' }));

    await forgotPassword('user@example.com');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/forgot-password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'user@example.com' });
  });

  it('AUTH-028: forgot-password body does not include password or token fields', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'ok' }));

    await forgotPassword('user@example.com');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('token');
  });
});

describe('authService — resetPassword endpoint and body', () => {
  it('AUTH-029: calls POST /api/auth/reset-password with token and newPassword', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'password reset' }));

    await resetPassword('reset-token-abc', 'newSecurePass1');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/reset-password');
    const body = JSON.parse(init.body as string);
    expect(body.token).toBe('reset-token-abc');
    expect(body.newPassword).toBe('newSecurePass1');
  });

  it('AUTH-030: reset-password body does not include email or extraneous PII fields', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'ok' }));

    await resetPassword('tok', 'pass');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('email');
    expect(Object.keys(body).sort()).toEqual(['newPassword', 'token']);
  });
});

describe('authService — verifyEmail endpoint and body (AUTH-031)', () => {
  it('calls POST /api/auth/verify-email with token in body', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'verified' }));

    await verifyEmail('verify-token-xyz');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/verify-email');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'verify-token-xyz' });
  });
});

describe('authService — resendVerification endpoint and body', () => {
  it('AUTH-032: calls POST /api/auth/resend-verification with email in body', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'sent' }));

    await resendVerification('user@example.com');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/resend-verification');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'user@example.com' });
  });

  it('AUTH-033: resend-verification body does not include token or password', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okRaw({ message: 'sent' }));

    await resendVerification('user@example.com');

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('token');
    expect(body).not.toHaveProperty('password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Part 7 — no-secret-leak and failure handling contracts
// ─────────────────────────────────────────────────────────────────────────────

describe('authService — no-secret-leak and failure handling', () => {
  it('AUTH-034: login 401 throws typed APIError (not raw response object)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      errorResponse(401, { error: { message: 'Invalid credentials.', code: 'UNAUTHORIZED' } })
    );

    try {
      await login({ email: 'bad@bad.com', password: 'wrong' }, 'CONTROL_PLANE');
      expect.fail('Expected login to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(APIError);
      const err = e as APIError;
      expect(err.status).toBe(401);
      // Message must not expose raw fetch response internals
      expect(err.message).not.toContain('"ok":');
      expect(err.message).not.toContain('"headers":');
    }
  });

  it('AUTH-035: network failure throws APIError status 0 NETWORK_ERROR without PII in message', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await login({ email: 'u@u.com', password: 'pass', tenantId: 'tid' }, 'TENANT');
      expect.fail('Expected login to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(APIError);
      const err = e as APIError;
      expect(err.status).toBe(0);
      expect(err.code).toBe('NETWORK_ERROR');
      // Error message must not contain submitted email
      expect(err.message).not.toContain('u@u.com');
    }
  });
});
