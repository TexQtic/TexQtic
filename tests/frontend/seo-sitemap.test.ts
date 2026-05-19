/**
 * SEO Sitemap & Robots Infrastructure Tests
 * PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
 *
 * Unit:    PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
 * Family:  TexQtic public SEO infrastructure
 * Date:    2026-08-08
 *
 * Covers:
 *   SSR-001 — public/sitemap.xml exists
 *   SSR-002 — sitemap.xml is valid XML (has required declaration and root element)
 *   SSR-003 — sitemap.xml declares correct sitemap namespace
 *   SSR-004 — sitemap.xml contains exactly 12 <url> entries
 *   SSR-005 — sitemap.xml contains /products URL
 *   SSR-006 — sitemap.xml contains all 4 category page URLs
 *   SSR-007 — sitemap.xml contains /collections URL
 *   SSR-008 — sitemap.xml contains all 5 AVAILABLE collection detail URLs
 *   SSR-009 — sitemap.xml contains /inquiry URL
 *   SSR-010 — sitemap.xml contains no query parameters in any <loc>
 *   SSR-011 — sitemap.xml contains no forbidden paths (/api/, /passport/, /join/, /supplier/, /trust, /industries, /aggregator)
 *   SSR-012 — sitemap.xml contains no private identifiers (org IDs, UUIDs in paths)
 *   SSR-013 — all <loc> values use canonical origin https://app.texqtic.com
 *   SSR-014 — public/robots.txt exists
 *   SSR-015 — robots.txt has User-agent: * directive
 *   SSR-016 — robots.txt allows /products, /products/category/, /collections, /inquiry
 *   SSR-017 — robots.txt disallows /api/, /passport/, /join/, /supplier/
 *   SSR-018 — robots.txt disallows stub paths /trust, /industries, /aggregator
 *   SSR-019 — robots.txt declares Sitemap: https://app.texqtic.com/sitemap.xml
 *   SSR-020 — index.html contains <link rel="sitemap"> pointing to /sitemap.xml
 *   SSR-021 — App.tsx PUBLIC_TRUST_LANDING state has robots: 'noindex, nofollow'
 *   SSR-022 — App.tsx PUBLIC_INDUSTRY_CLUSTER_LANDING state has robots: 'noindex, nofollow'
 *   SSR-023 — App.tsx PUBLIC_AGGREGATOR state has robots: 'noindex, nofollow'
 *   SSR-024 — sitemap.xml category URLs match B2C_CATEGORY_PAGE_CONFIGS slugs
 *   SSR-025 — sitemap.xml collection URLs match AVAILABLE PUBLIC_COLLECTION_PROJECTIONS slugs
 *
 * Harness: vitest + Node.js fs (file-based assertions)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { B2C_CATEGORY_PAGE_CONFIGS } from '../../config/publicB2CCategoryPages';
import { PUBLIC_COLLECTION_PROJECTIONS } from '../../config/publicCollectionsProjection';

// ---------------------------------------------------------------------------
// Path resolution (ESM-safe)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
// tests/frontend → repo root = two levels up
const REPO_ROOT = join(__filename, '..', '..', '..');

const SITEMAP_PATH = join(REPO_ROOT, 'public', 'sitemap.xml');
const ROBOTS_PATH = join(REPO_ROOT, 'public', 'robots.txt');
const INDEX_HTML_PATH = join(REPO_ROOT, 'index.html');
const APP_TSX_PATH = join(REPO_ROOT, 'App.tsx');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSitemap(): string {
  return readFileSync(SITEMAP_PATH, 'utf-8');
}

function readRobots(): string {
  return readFileSync(ROBOTS_PATH, 'utf-8');
}

function readIndexHtml(): string {
  return readFileSync(INDEX_HTML_PATH, 'utf-8');
}

function readAppTsx(): string {
  return readFileSync(APP_TSX_PATH, 'utf-8');
}

function extractLocs(sitemap: string): string[] {
  const matches = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

// ---------------------------------------------------------------------------
// Derived test data from config (ground truth)
// ---------------------------------------------------------------------------

const AVAILABLE_COLLECTION_SLUGS = PUBLIC_COLLECTION_PROJECTIONS.filter(
  (c) => c.listState.availability === 'AVAILABLE',
).map((c) => c.publicSlug);

const CATEGORY_SLUGS = B2C_CATEGORY_PAGE_CONFIGS.map((c) => c.slug);

const CANONICAL_ORIGIN = 'https://app.texqtic.com';

// Expected 12 URLs derived from static config
const EXPECTED_LOCS: string[] = [
  `${CANONICAL_ORIGIN}/products`,
  ...CATEGORY_SLUGS.map((s) => `${CANONICAL_ORIGIN}/products/category/${s}`),
  `${CANONICAL_ORIGIN}/collections`,
  ...AVAILABLE_COLLECTION_SLUGS.map((s) => `${CANONICAL_ORIGIN}/collections/${s}`),
  `${CANONICAL_ORIGIN}/inquiry`,
];

// Forbidden paths that must never appear in sitemap
const FORBIDDEN_PATHS = ['/api/', '/passport/', '/join/', '/supplier/', '/trust', '/industries', '/aggregator'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('public/sitemap.xml', () => {
  it('SSR-001 — sitemap.xml file exists', () => {
    expect(existsSync(SITEMAP_PATH)).toBe(true);
  });

  it('SSR-002 — sitemap.xml starts with XML declaration', () => {
    const content = readSitemap();
    expect(content.trimStart()).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('SSR-003 — sitemap.xml declares sitemap namespace', () => {
    const content = readSitemap();
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('SSR-004 — sitemap.xml contains exactly 12 <url> entries', () => {
    const content = readSitemap();
    const urlMatches = [...content.matchAll(/<url>/g)];
    expect(urlMatches).toHaveLength(12);
  });

  it('SSR-005 — sitemap.xml contains /products URL', () => {
    const locs = extractLocs(readSitemap());
    expect(locs).toContain(`${CANONICAL_ORIGIN}/products`);
  });

  it('SSR-006 — sitemap.xml contains all 4 category page URLs', () => {
    const locs = extractLocs(readSitemap());
    for (const slug of CATEGORY_SLUGS) {
      expect(locs).toContain(`${CANONICAL_ORIGIN}/products/category/${slug}`);
    }
    // Confirm config still has 4 slugs (guard against accidental config drift)
    expect(CATEGORY_SLUGS).toHaveLength(4);
  });

  it('SSR-007 — sitemap.xml contains /collections URL', () => {
    const locs = extractLocs(readSitemap());
    expect(locs).toContain(`${CANONICAL_ORIGIN}/collections`);
  });

  it('SSR-008 — sitemap.xml contains all 5 AVAILABLE collection detail URLs', () => {
    const locs = extractLocs(readSitemap());
    for (const slug of AVAILABLE_COLLECTION_SLUGS) {
      expect(locs).toContain(`${CANONICAL_ORIGIN}/collections/${slug}`);
    }
    // Confirm config still has 5 AVAILABLE collections (guard against config drift)
    expect(AVAILABLE_COLLECTION_SLUGS).toHaveLength(5);
  });

  it('SSR-009 — sitemap.xml contains /inquiry URL', () => {
    const locs = extractLocs(readSitemap());
    expect(locs).toContain(`${CANONICAL_ORIGIN}/inquiry`);
  });

  it('SSR-010 — sitemap.xml has no query parameters in any <loc>', () => {
    const locs = extractLocs(readSitemap());
    for (const loc of locs) {
      expect(loc).not.toContain('?');
      expect(loc).not.toContain('&');
    }
  });

  it('SSR-011 — sitemap.xml has no forbidden paths', () => {
    const locs = extractLocs(readSitemap());
    for (const loc of locs) {
      for (const forbidden of FORBIDDEN_PATHS) {
        const path = loc.replace(CANONICAL_ORIGIN, '');
        // Exact match or prefix match for forbidden paths ending with /
        if (forbidden.endsWith('/')) {
          expect(path).not.toMatch(new RegExp(`^${forbidden.replace('/', '\\/')}`));
        } else {
          expect(path).not.toBe(forbidden);
        }
      }
    }
  });

  it('SSR-012 — sitemap.xml has no UUID-pattern private identifiers in paths', () => {
    const locs = extractLocs(readSitemap());
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    for (const loc of locs) {
      expect(loc).not.toMatch(uuidPattern);
    }
  });

  it('SSR-013 — all <loc> values use canonical origin https://app.texqtic.com', () => {
    const locs = extractLocs(readSitemap());
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc.startsWith(CANONICAL_ORIGIN)).toBe(true);
    }
  });

  it('SSR-024 — sitemap category URLs match B2C_CATEGORY_PAGE_CONFIGS slugs exactly', () => {
    const locs = extractLocs(readSitemap());
    const categoryLocs = locs.filter((l) => l.includes('/products/category/'));
    const expectedCategoryLocs = CATEGORY_SLUGS.map(
      (s) => `${CANONICAL_ORIGIN}/products/category/${s}`,
    );
    expect(categoryLocs.sort()).toEqual(expectedCategoryLocs.sort());
  });

  it('SSR-025 — sitemap collection URLs match AVAILABLE PUBLIC_COLLECTION_PROJECTIONS slugs exactly', () => {
    const locs = extractLocs(readSitemap());
    // Exclude /collections root itself
    const collectionDetailLocs = locs.filter(
      (l) => l.includes('/collections/') && l !== `${CANONICAL_ORIGIN}/collections`,
    );
    const expectedCollectionLocs = AVAILABLE_COLLECTION_SLUGS.map(
      (s) => `${CANONICAL_ORIGIN}/collections/${s}`,
    );
    expect(collectionDetailLocs.sort()).toEqual(expectedCollectionLocs.sort());
  });
});

describe('public/robots.txt', () => {
  it('SSR-014 — robots.txt file exists', () => {
    expect(existsSync(ROBOTS_PATH)).toBe(true);
  });

  it('SSR-015 — robots.txt has User-agent: * directive', () => {
    const content = readRobots();
    expect(content).toContain('User-agent: *');
  });

  it('SSR-016 — robots.txt allows required public paths', () => {
    const content = readRobots();
    expect(content).toContain('Allow: /products');
    expect(content).toContain('Allow: /products/category/');
    expect(content).toContain('Allow: /collections');
    expect(content).toContain('Allow: /inquiry');
  });

  it('SSR-017 — robots.txt disallows private/API paths', () => {
    const content = readRobots();
    expect(content).toContain('Disallow: /api/');
    expect(content).toContain('Disallow: /passport/');
    expect(content).toContain('Disallow: /join/');
    expect(content).toContain('Disallow: /supplier/');
  });

  it('SSR-018 — robots.txt disallows stub state paths', () => {
    const content = readRobots();
    expect(content).toContain('Disallow: /trust');
    expect(content).toContain('Disallow: /industries');
    expect(content).toContain('Disallow: /aggregator');
  });

  it('SSR-019 — robots.txt declares Sitemap directive pointing to canonical URL', () => {
    const content = readRobots();
    expect(content).toContain(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`);
  });
});

describe('index.html sitemap link', () => {
  it('SSR-020 — index.html contains <link rel="sitemap"> pointing to /sitemap.xml', () => {
    const content = readIndexHtml();
    expect(content).toContain('rel="sitemap"');
    expect(content).toContain('href="/sitemap.xml"');
    expect(content).toContain('type="application/xml"');
  });
});

describe('App.tsx stub state noindex guards', () => {
  it('SSR-021 — App.tsx PUBLIC_TRUST_LANDING arm contains robots: noindex, nofollow', () => {
    const content = readAppTsx();
    // Match the SEO arm: state check → applyPublicPageMeta → robots: 'noindex, nofollow'
    const pattern =
      /appState === 'PUBLIC_TRUST_LANDING'[\s\S]{0,150}applyPublicPageMeta[\s\S]{0,400}robots: 'noindex, nofollow'/;
    expect(pattern.test(content)).toBe(true);
  });

  it('SSR-022 — App.tsx PUBLIC_INDUSTRY_CLUSTER_LANDING arm contains robots: noindex, nofollow', () => {
    const content = readAppTsx();
    const pattern =
      /appState === 'PUBLIC_INDUSTRY_CLUSTER_LANDING'[\s\S]{0,150}applyPublicPageMeta[\s\S]{0,400}robots: 'noindex, nofollow'/;
    expect(pattern.test(content)).toBe(true);
  });

  it('SSR-023 — App.tsx PUBLIC_AGGREGATOR arm contains robots: noindex, nofollow', () => {
    const content = readAppTsx();
    const pattern =
      /appState === 'PUBLIC_AGGREGATOR'[\s\S]{0,150}applyPublicPageMeta[\s\S]{0,400}robots: 'noindex, nofollow'/;
    expect(pattern.test(content)).toBe(true);
  });
});
