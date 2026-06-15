/**
 * Public route navigation contract tests
 * MAINAPP-PUBLIC-READINESS-001F-HD-002-P1
 *
 * Source-level contract tests for resolver and public nav URL-state sync.
 */

/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { __APP_ROUTING_TESTING__ } from '../../App';

function readAppSource(): string {
  return readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
}

const makeFakeAdminJwt = (adminId: string, role = 'SUPER_ADMIN', expiresInSec = 3600) => {
  const payload = btoa(JSON.stringify({
    adminId,
    role,
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
  }));

  return `x.${payload}.x`;
};

const setRoute = (pathname: string) => {
  globalThis.history.pushState(null, '', pathname);
};

const seedControlPlaneSession = (options?: { token?: string; expiresInSec?: number }) => {
  const adminId = 'admin-1';
  const token = options?.token ?? makeFakeAdminJwt(adminId, 'SUPER_ADMIN', options?.expiresInSec ?? 3600);

  localStorage.setItem('texqtic_admin_token', token);
  localStorage.setItem('texqtic_auth_realm', 'CONTROL_PLANE');
  localStorage.setItem('texqtic_control_plane_identity', JSON.stringify({
    id: adminId,
    email: 'admin@texqtic.com',
    role: 'SUPER_ADMIN',
  }));
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setRoute('/');
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setRoute('/');
});

describe('HD-002 route hardening contracts', () => {
  it('maps /b2b and /b2b/ to PUBLIC_B2B_DISCOVERY', () => {
    const source = readAppSource();

    expect(source).toContain("globalThis.window.location.pathname === '/b2b'");
    expect(source).toContain("globalThis.window.location.pathname === '/b2b/'");
    expect(source).toContain("return 'PUBLIC_B2B_DISCOVERY';");
  });

  it('keeps /products mapped to PUBLIC_B2C_BROWSE', () => {
    const source = readAppSource();

    expect(source).toContain("globalThis.window.location.pathname === '/products'");
    expect(source).toContain("globalThis.window.location.pathname === '/products/'");
    expect(source).toContain("return 'PUBLIC_B2C_BROWSE';");
  });

  it('keeps unknown non-root routes mapped to PUBLIC_NOT_FOUND', () => {
    const source = readAppSource();

    expect(source).toContain("const unknownPathname = globalThis.window.location.pathname;");
    expect(source).toContain("if (unknownPathname !== '/' && unknownPathname !== '') {");
    expect(source).toContain("return 'PUBLIC_NOT_FOUND';");
  });

  it('syncs onGoB2B and onGoProducts with replaceState URLs', () => {
    const source = readAppSource();

    expect(source).toContain("history.replaceState(null, '', '/b2b')");
    expect(source).toContain("history.replaceState(null, '', '/products')");
    expect(source).toContain('onGoB2B: navigateToPublicB2BDiscovery');
    expect(source).toContain('onGoProducts: navigateToPublicB2CBrowse');
  });

  it('does not introduce /discover route mapping', () => {
    const source = readAppSource();

    expect(source).not.toContain("'/discover'");
    expect(source).not.toContain('"/discover"');
  });
});

describe('runtime /register restore contracts', () => {
  it('keeps unauthenticated /register on PUBLIC_REGISTER', () => {
    setRoute('/register');

    expect(__APP_ROUTING_TESTING__.resolveInitialAppState()).toBe('PUBLIC_REGISTER');
  });

  it('restores a valid control-plane session on /register before public registration', () => {
    seedControlPlaneSession();
    setRoute('/register');

    expect(__APP_ROUTING_TESTING__.resolveInitialAppState()).toBe('AUTH');
    expect(__APP_ROUTING_TESTING__.resolveInitialAuthRealm()).toBe('CONTROL_PLANE');
    expect(__APP_ROUTING_TESTING__.hasStoredValidControlPlaneSession()).toBe(true);
  });

  it.each([
    { label: 'malformed', options: { token: 'not-a-jwt' } },
    { label: 'expired', options: { expiresInSec: -60 } },
  ])('does not bypass /register for $label admin tokens', ({ options }) => {
    seedControlPlaneSession(options);
    setRoute('/register');

    expect(__APP_ROUTING_TESTING__.hasStoredValidControlPlaneSession()).toBe(false);
    expect(__APP_ROUTING_TESTING__.resolveInitialAppState()).toBe('PUBLIC_REGISTER');
  });
});
