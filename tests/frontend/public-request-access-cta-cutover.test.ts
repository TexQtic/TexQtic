/**
 * Public Request Access CTA cutover — source-level checks
 *
 * Unit:    UPDATE-MAINAPP-PUBLIC-CTA-REQUEST-ACCESS-CUTOVER-01
 * Date:    2026-06-07
 *
 * Covers:
 *   CTA-001 — B2CBrowse does not contain stale texqtic.com/request-access href
 *   CTA-002 — PublicB2CCategoryPage does not contain stale texqtic.com/request-access href
 *   CTA-003 — PublicProductDetail does not contain stale texqtic.com/request-access href
 *   CTA-004 — App.tsx SUPPLIER_REQUEST_ACCESS_URL targets /request-access
 *   CTA-005 — B2CBrowse List Your Products CTA targets /request-access
 *   CTA-006 — PublicB2CCategoryPage List Your Products CTA targets /request-access
 *   CTA-007 — PublicProductDetail List Your Products CTA targets /request-access
 *   CTA-008 — No changed CTA uses target="_blank" for the request-access route
 *
 * Harness: vitest (Node.js, no DOM needed — source-level file checks only)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Paths ────────────────────────────────────────────────────────────────────

// tests/frontend/<file>.ts → up 3 levels = repo root
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..', '..');

const B2C_BROWSE_SRC     = join(REPO_ROOT, 'components', 'Public', 'B2CBrowse.tsx');
const CATEGORY_PAGE_SRC  = join(REPO_ROOT, 'components', 'Public', 'PublicB2CCategoryPage.tsx');
const PRODUCT_DETAIL_SRC = join(REPO_ROOT, 'components', 'Public', 'PublicProductDetail.tsx');
const APP_SRC            = join(REPO_ROOT, 'App.tsx');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const read = (p: string) => readFileSync(p, 'utf-8');

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('public request access CTA cutover — source checks', () => {
  /**
   * CTA-001 — B2CBrowse must not reference the stale Marketing Website URL.
   */
  it('CTA-001 — B2CBrowse has no texqtic.com/request-access href', () => {
    const src = read(B2C_BROWSE_SRC);
    expect(src).not.toContain('texqtic.com/request-access');
  });

  /**
   * CTA-002 — PublicB2CCategoryPage must not reference the stale URL.
   */
  it('CTA-002 — PublicB2CCategoryPage has no texqtic.com/request-access href', () => {
    const src = read(CATEGORY_PAGE_SRC);
    expect(src).not.toContain('texqtic.com/request-access');
  });

  /**
   * CTA-003 — PublicProductDetail must not reference the stale URL.
   */
  it('CTA-003 — PublicProductDetail has no texqtic.com/request-access href', () => {
    const src = read(PRODUCT_DETAIL_SRC);
    expect(src).not.toContain('texqtic.com/request-access');
  });

  /**
   * CTA-004 — App.tsx SUPPLIER_REQUEST_ACCESS_URL must target the app-local route.
   */
  it('CTA-004 — App.tsx SUPPLIER_REQUEST_ACCESS_URL targets /request-access', () => {
    const src = read(APP_SRC);
    expect(src).toContain("SUPPLIER_REQUEST_ACCESS_URL = '/request-access'");
    expect(src).not.toContain("SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'");
  });

  /**
   * CTA-005 — B2CBrowse List Your Products CTA targets /request-access.
   */
  it('CTA-005 — B2CBrowse List Your Products CTA targets /request-access', () => {
    const src = read(B2C_BROWSE_SRC);
    expect(src).toMatch(/href="\/request-access"[\s\S]{0,300}List Your Products/);
  });

  /**
   * CTA-006 — PublicB2CCategoryPage List Your Products CTA targets /request-access.
   */
  it('CTA-006 — PublicB2CCategoryPage List Your Products CTA targets /request-access', () => {
    const src = read(CATEGORY_PAGE_SRC);
    expect(src).toMatch(/href="\/request-access"[\s\S]{0,300}List Your Products/);
  });

  /**
   * CTA-007 — PublicProductDetail List Your Products CTA targets /request-access.
   */
  it('CTA-007 — PublicProductDetail List Your Products CTA targets /request-access', () => {
    const src = read(PRODUCT_DETAIL_SRC);
    expect(src).toMatch(/href="\/request-access"[\s\S]{0,300}List Your Products/);
  });

  /**
   * CTA-008 — No request-access anchor uses target="_blank" (internal route; same-tab navigation).
   * Checks that the /request-access href is not immediately followed by target="_blank".
   */
  it('CTA-008 — request-access anchors do not use target="_blank"', () => {
    for (const src of [read(B2C_BROWSE_SRC), read(CATEGORY_PAGE_SRC), read(PRODUCT_DETAIL_SRC)]) {
      // Find occurrences of /request-access href and check the surrounding 100 chars for target="_blank"
      const matches = [...src.matchAll(/href="\/request-access"([\s\S]{0,100})/g)];
      for (const m of matches) {
        expect(m[1]).not.toContain('target="_blank"');
      }
    }
  });
});
