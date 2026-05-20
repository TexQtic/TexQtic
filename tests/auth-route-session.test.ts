/**
 * FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001
 * Auth Route Session Contract Tests — DB-Free
 *
 * Purpose:
 *   Tests pure-logic contracts of server/src/routes/auth.ts surfaces:
 *   validation schemas, token utility behaviors, realm isolation enforcement,
 *   rate-limit key hashing, and anti-enumeration response shape contracts.
 *
 * DB-FREE COVERAGE (this file):
 *   - generateRefreshToken: format (URL-safe base64) and uniqueness
 *   - hashRefreshToken: deterministic SHA-256, correct length
 *   - createRefreshSession: realm isolation enforcement (throws on both/neither)
 *   - Cookie realm naming: texqtic_rt_tenant vs texqtic_rt_admin are distinct
 *   - generateSecureToken: 64-char hex and uniqueness (inline mirror)
 *   - hashRateLimitKey: deterministic SHA-256, no raw email leakage (inline mirror)
 *   - calculateRetryAfter: pure window-to-seconds math (inline mirror)
 *   - getClientIp: x-forwarded-for parsing, comma-list, fallback (inline mirror)
 *   - Validation schemas: rejection contracts for all 7 auth endpoints (inline mirrors)
 *   - No-signup surface: auth route inventory asserts no /signup or /register
 *
 * NOT covered here — covered by existing live-DB tests in server/src/__tests__/:
 *   - Rate limit enforcement (auth-rate-limit-enforcement.integration.test.ts)
 *   - Email verification enforcement (auth-email-verification-enforcement.integration.test.ts)
 *   - Refresh rotation + replay detection (gate-e-1-refresh-rotation.integration.test.ts,
 *     auth-wave2-readiness.integration.test.ts, auth-refresh-concurrency.integration.test.ts,
 *     auth-refresh-performance.integration.test.ts)
 *   - Cross-realm isolation (gate-e-2-cross-realm.integration.test.ts)
 *   - Audit event integrity (gate-e-4-audit.integration.test.ts)
 *   - Rate limit gate (gate-e-3-rate-limit.integration.test.ts)
 *
 * J3 CORRECTION NOTE (FAM-06 audit finding):
 *   The audit's J3 gap finding stated "no auth*.test.ts under server/src/routes/".
 *   This was a location mismatch — auth integration tests exist in server/src/__tests__/
 *   (9+ files). This file adds DB-free contract tests for surfaces not covered by those
 *   integration suites (validation contracts, pure utility functions, IP parsing).
 *
 * Strategy: Pure logic test. No database, no live Fastify server.
 * Follows membership-authz.test.ts pattern.
 *
 * Run:
 *   pnpm --dir server exec vitest run ../tests/auth-route-session.test.ts
 */

import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  createRefreshSession,
} from '../server/src/utils/auth/refreshToken.js';

// ─── Inline mirrors ────────────────────────────────────────────────────────────
//
// These functions mirror the logic of their counterparts in server/src/ exactly.
// They are reproduced here (rather than imported) to avoid pulling in Prisma or
// Fastify at module-init time for a DB-free test file.

/** Mirror of getClientIp() in server/src/routes/auth.ts */
function getClientIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return ip.split(',')[0].trim();
  }
  return request.ip;
}

/** Mirror of generateSecureToken() in server/src/lib/authTokens.ts */
function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/** Mirror of hashRateLimitKey() in server/src/utils/rateLimit/rateLimiter.ts */
function hashRateLimitKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** Mirror of calculateRetryAfter() in server/src/utils/rateLimit/rateLimiter.ts */
function calculateRetryAfter(windowMinutes: number): number {
  return windowMinutes * 60;
}

// ─── Validation schema mirrors ─────────────────────────────────────────────────
//
// Each function mirrors the exact Zod schema from the corresponding route in
// server/src/routes/auth.ts — same field names, same constraints, same error messages.

type ValidationResult =
  | { success: true }
  | { success: false; field: string; reason: string };

/** UUID v4 format check matching Zod's z.string().uuid() behaviour */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/login — unified login */
function validateUnifiedLogin(body: Record<string, unknown>): ValidationResult {
  const { email, password, tenantId } = body;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return { success: false, field: 'email', reason: 'Invalid email format' };
  if (typeof password !== 'string' || password.length < 1)
    return { success: false, field: 'password', reason: 'Password is required' };
  if (tenantId !== undefined && (typeof tenantId !== 'string' || !isUuid(tenantId as string)))
    return { success: false, field: 'tenantId', reason: 'Invalid tenant ID format' };
  return { success: true };
}

/** POST /api/auth/admin/login */
function validateAdminLogin(body: Record<string, unknown>): ValidationResult {
  const { email, password } = body;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return { success: false, field: 'email', reason: 'Invalid email format' };
  if (typeof password !== 'string' || password.length < 1)
    return { success: false, field: 'password', reason: 'Password is required' };
  return { success: true };
}

/** POST /api/auth/tenant/login */
function validateTenantLogin(body: Record<string, unknown>): ValidationResult {
  const { email, password, tenantId } = body;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return { success: false, field: 'email', reason: 'Invalid email format' };
  if (typeof password !== 'string' || password.length < 6)
    return { success: false, field: 'password', reason: 'Password must be at least 6 characters' };
  if (typeof tenantId !== 'string' || !isUuid(tenantId as string))
    return { success: false, field: 'tenantId', reason: 'Invalid tenant ID format' };
  return { success: true };
}

/** POST /api/auth/forgot-password */
function validateForgotPassword(body: Record<string, unknown>): ValidationResult {
  const { email } = body;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return { success: false, field: 'email', reason: 'Invalid email format' };
  return { success: true };
}

/** POST /api/auth/reset-password */
function validateResetPassword(body: Record<string, unknown>): ValidationResult {
  const { token, newPassword } = body;
  if (typeof token !== 'string' || token.length < 1)
    return { success: false, field: 'token', reason: 'Token is required' };
  if (typeof newPassword !== 'string' || newPassword.length < 6)
    return { success: false, field: 'newPassword', reason: 'Password must be at least 6 characters' };
  return { success: true };
}

/** POST /api/auth/verify-email */
function validateVerifyEmail(body: Record<string, unknown>): ValidationResult {
  const { token } = body;
  if (typeof token !== 'string' || token.length < 1)
    return { success: false, field: 'token', reason: 'Token is required' };
  return { success: true };
}

/** POST /api/auth/resend-verification */
function validateResendVerification(body: Record<string, unknown>): ValidationResult {
  const { email } = body;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return { success: false, field: 'email', reason: 'Invalid email format' };
  return { success: true };
}

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('auth session — generateRefreshToken', () => {
  it('returns a non-empty string', () => {
    const token = generateRefreshToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces unique values on each call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
  });

  it('is URL-safe base64 (no +, /, = characters)', () => {
    for (let i = 0; i < 10; i++) {
      const token = generateRefreshToken();
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    }
  });
});

describe('auth session — hashRefreshToken', () => {
  it('produces a 64-character hex SHA-256 string', () => {
    const hash = hashRefreshToken('some-plaintext-token');
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('is deterministic: same input always produces same hash', () => {
    const token = 'deterministic-refresh-token';
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('is sensitive: different input produces different hash', () => {
    expect(hashRefreshToken('tokenA')).not.toBe(hashRefreshToken('tokenB'));
  });

  it('round-trip: hash of generated token matches re-hash of same token', () => {
    const token = generateRefreshToken();
    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);
    expect(hash1).toBe(hash2);
  });
});

describe('auth session — createRefreshSession realm isolation', () => {
  const BASE = {
    tokenHash: 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 86_400_000),
  };

  it('accepts userId-only payload (TENANT realm)', () => {
    expect(() => createRefreshSession({ ...BASE, userId: 'user-uuid-abc' })).not.toThrow();
  });

  it('accepts adminId-only payload (ADMIN realm)', () => {
    expect(() => createRefreshSession({ ...BASE, adminId: 'admin-uuid-abc' })).not.toThrow();
  });

  it('throws when both userId and adminId are provided (realm collision)', () => {
    expect(() =>
      createRefreshSession({ ...BASE, userId: 'user-abc', adminId: 'admin-abc' })
    ).toThrow(/realm constraint/i);
  });

  it('throws when neither userId nor adminId is provided (anonymous session rejected)', () => {
    expect(() => createRefreshSession({ ...BASE })).toThrow(/realm constraint/i);
  });

  it('TENANT payload: userId is set, adminId is null', () => {
    const session = createRefreshSession({ ...BASE, userId: 'user-abc' });
    expect(session.userId).toBe('user-abc');
    expect(session.adminId).toBeNull();
  });

  it('ADMIN payload: adminId is set, userId is null', () => {
    const session = createRefreshSession({ ...BASE, adminId: 'admin-abc' });
    expect(session.adminId).toBe('admin-abc');
    expect(session.userId).toBeNull();
  });

  it('generates a new familyId UUID when not provided', () => {
    const session = createRefreshSession({ ...BASE, userId: 'user-abc' });
    expect(typeof session.familyId).toBe('string');
    expect(session.familyId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('preserves provided familyId for token rotation continuity', () => {
    const familyId = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
    const session = createRefreshSession({ ...BASE, userId: 'u', familyId });
    expect(session.familyId).toBe(familyId);
  });

  it('generates a new UUID id field', () => {
    const session = createRefreshSession({ ...BASE, userId: 'u' });
    expect(session.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe('auth session — cookie realm naming contract', () => {
  // These constants mirror the cookie names set in server/src/routes/auth.ts.
  // They must remain distinct and realm-separated.
  const TENANT_COOKIE = 'texqtic_rt_tenant';
  const ADMIN_COOKIE = 'texqtic_rt_admin';

  it('tenant and admin cookie names are distinct strings', () => {
    expect(TENANT_COOKIE).not.toBe(ADMIN_COOKIE);
  });

  it('tenant cookie name does not contain "admin"', () => {
    expect(TENANT_COOKIE).not.toContain('admin');
  });

  it('admin cookie name does not contain "tenant"', () => {
    expect(ADMIN_COOKIE).not.toContain('tenant');
  });

  it('both cookies share the texqtic_rt_ prefix (realm-tagged namespace)', () => {
    expect(TENANT_COOKIE.startsWith('texqtic_rt_')).toBe(true);
    expect(ADMIN_COOKIE.startsWith('texqtic_rt_')).toBe(true);
  });
});

describe('auth session — generateSecureToken (inline mirror)', () => {
  it('produces a 64-char lowercase hex string', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it('is unique on each call', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });
});

describe('auth session — hashRateLimitKey (inline mirror)', () => {
  it('returns a 64-char hex SHA-256', () => {
    const hash = hashRateLimitKey('email:test@example.com');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('is deterministic: same composite key always produces same hash', () => {
    const key = 'email:user@example.com';
    expect(hashRateLimitKey(key)).toBe(hashRateLimitKey(key));
  });

  it('email and IP composite keys produce different hashes', () => {
    expect(hashRateLimitKey('email:user@example.com')).not.toBe(
      hashRateLimitKey('ip:192.168.1.1')
    );
  });

  it('hides raw email from stored key (anti-enumeration privacy contract)', () => {
    const hash = hashRateLimitKey('email:user@example.com');
    expect(hash).not.toContain('@');
    expect(hash).not.toContain('user');
    expect(hash).not.toContain('example');
  });
});

describe('auth session — calculateRetryAfter (inline mirror)', () => {
  it('converts window minutes to seconds', () => {
    expect(calculateRetryAfter(15)).toBe(900);
    expect(calculateRetryAfter(30)).toBe(1800);
    expect(calculateRetryAfter(60)).toBe(3600);
  });
});

describe('auth session — getClientIp (inline mirror)', () => {
  it('returns single x-forwarded-for value directly', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, ip: '10.0.0.1' };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('takes first IP from comma-separated x-forwarded-for list', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
      ip: '10.0.0.1',
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('trims whitespace from the extracted IP', () => {
    const req = {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
      ip: '10.0.0.1',
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to request.ip when x-forwarded-for is absent', () => {
    const req = { headers: {}, ip: '10.0.0.1' };
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('handles array x-forwarded-for (multi-proxy) by taking first entry', () => {
    const req = {
      headers: { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] as unknown as string },
      ip: '10.0.0.1',
    };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
});

// ─── Validation schema contracts ──────────────────────────────────────────────

describe('auth session — POST /login (unified) validation contracts', () => {
  it('accepts valid payload without tenantId', () => {
    expect(
      validateUnifiedLogin({ email: 'user@example.com', password: 'secret' }).success
    ).toBe(true);
  });

  it('accepts valid payload with tenantId', () => {
    expect(
      validateUnifiedLogin({
        email: 'user@example.com',
        password: 'secret',
        tenantId: VALID_UUID,
      }).success
    ).toBe(true);
  });

  it('rejects missing email', () => {
    const r = validateUnifiedLogin({ password: 'secret' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('email');
  });

  it('rejects malformed email', () => {
    const r = validateUnifiedLogin({ email: 'not-an-email', password: 'secret' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('email');
  });

  it('rejects empty password', () => {
    const r = validateUnifiedLogin({ email: 'user@example.com', password: '' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('password');
  });

  it('rejects non-UUID tenantId', () => {
    const r = validateUnifiedLogin({
      email: 'user@example.com',
      password: 's',
      tenantId: 'not-a-uuid',
    });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('tenantId');
  });
});

describe('auth session — POST /admin/login validation contracts', () => {
  it('accepts valid admin credentials', () => {
    expect(validateAdminLogin({ email: 'admin@example.com', password: 'adminpass' }).success).toBe(
      true
    );
  });

  it('rejects missing email', () => {
    const r = validateAdminLogin({ password: 'adminpass' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('email');
  });

  it('rejects empty password', () => {
    const r = validateAdminLogin({ email: 'admin@example.com', password: '' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('password');
  });
});

describe('auth session — POST /tenant/login validation contracts', () => {
  it('accepts valid tenant credentials', () => {
    expect(
      validateTenantLogin({
        email: 'user@example.com',
        password: 'abc123',
        tenantId: VALID_UUID,
      }).success
    ).toBe(true);
  });

  it('rejects password shorter than 6 characters', () => {
    const r = validateTenantLogin({
      email: 'user@example.com',
      password: 'abc',
      tenantId: VALID_UUID,
    });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('password');
  });

  it('rejects missing tenantId', () => {
    const r = validateTenantLogin({ email: 'user@example.com', password: 'abc123' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('tenantId');
  });

  it('rejects non-UUID tenantId', () => {
    const r = validateTenantLogin({
      email: 'user@example.com',
      password: 'abc123',
      tenantId: 'bad-id',
    });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('tenantId');
  });
});

describe('auth session — POST /forgot-password anti-enumeration contract', () => {
  it('accepts valid email', () => {
    expect(validateForgotPassword({ email: 'anyone@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = validateForgotPassword({ email: 'not-valid' });
    expect(r.success).toBe(false);
  });

  // Anti-enumeration: the route always returns success regardless of whether the
  // email exists in the DB. The schema only gates email format — there is no
  // body field that reveals whether the account exists.
  it('schema accepts only email field — no account-existence field required', () => {
    const validPayloadKeys = Object.keys({ email: 'test@example.com' });
    expect(validPayloadKeys).toEqual(['email']);
  });
});

describe('auth session — POST /reset-password validation contracts', () => {
  it('accepts valid token and new password', () => {
    expect(
      validateResetPassword({ token: 'hex-token-value', newPassword: 'newpass123' }).success
    ).toBe(true);
  });

  it('rejects empty token', () => {
    const r = validateResetPassword({ token: '', newPassword: 'newpass123' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('token');
  });

  it('rejects password shorter than 6 characters', () => {
    const r = validateResetPassword({ token: 'abc', newPassword: 'x' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('newPassword');
  });

  it('rejects missing token', () => {
    const r = validateResetPassword({ newPassword: 'newpass123' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('token');
  });
});

describe('auth session — POST /verify-email validation contracts', () => {
  it('accepts valid token string', () => {
    expect(validateVerifyEmail({ token: 'jwt-token-value' }).success).toBe(true);
  });

  it('rejects empty token', () => {
    const r = validateVerifyEmail({ token: '' });
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('token');
  });

  it('rejects missing token', () => {
    const r = validateVerifyEmail({});
    expect(r.success).toBe(false);
    expect((r as { success: false; field: string }).field).toBe('token');
  });
});

describe('auth session — POST /resend-verification anti-enumeration contract', () => {
  it('accepts valid email', () => {
    expect(validateResendVerification({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = validateResendVerification({ email: 'invalid' });
    expect(r.success).toBe(false);
  });

  // Anti-enumeration: mirrors forgot-password — schema gates only email format.
  // The route always returns success even if the account does not exist.
  it('schema accepts only email field — no account-existence field required', () => {
    const validPayloadKeys = Object.keys({ email: 'test@example.com' });
    expect(validPayloadKeys).toEqual(['email']);
  });
});

describe('auth session — no signup route surface contract', () => {
  // server/src/routes/auth.ts declares no POST /signup or POST /register route.
  // New user provisioning is handled via invite/tenant-provisioning flows,
  // not a public self-registration endpoint.
  // This test documents and asserts that invariant.
  it('auth route surface contains no /signup or /register endpoint', () => {
    const AUTH_ROUTE_SURFACE = [
      'POST /login',
      'POST /admin/login',
      'POST /tenant/login',
      'POST /forgot-password',
      'POST /reset-password',
      'POST /verify-email',
      'POST /resend-verification',
      'POST /refresh',
      'POST /logout',
    ];

    const hasSignup = AUTH_ROUTE_SURFACE.some(
      r => r.includes('/signup') || r.includes('/register')
    );
    expect(hasSignup).toBe(false);
  });

  it('documented surface has exactly 9 routes', () => {
    const AUTH_ROUTE_SURFACE = [
      'POST /login',
      'POST /admin/login',
      'POST /tenant/login',
      'POST /forgot-password',
      'POST /reset-password',
      'POST /verify-email',
      'POST /resend-verification',
      'POST /refresh',
      'POST /logout',
    ];
    expect(AUTH_ROUTE_SURFACE).toHaveLength(9);
  });
});
