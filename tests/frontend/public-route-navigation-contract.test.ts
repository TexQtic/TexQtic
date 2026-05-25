/**
 * Public route navigation contract tests
 * MAINAPP-PUBLIC-READINESS-001F-HD-002-P1
 *
 * Source-level contract tests for resolver and public nav URL-state sync.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readAppSource(): string {
  return readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
}

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
