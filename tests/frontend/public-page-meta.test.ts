/**
 * Public Page Metadata Utility — JSON-LD Unit Tests
 * PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
 *
 * Unit:    PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
 * Family:  TexQtic public SEO infrastructure
 * Date:    2026-08-08
 *
 * Covers:
 *   PJLD-001 — applyPublicPageMeta with no jsonLd injects no JSON-LD scripts
 *   PJLD-002 — applyPublicPageMeta with jsonLd injects script element(s)
 *   PJLD-003 — injected JSON-LD script has type="application/ld+json"
 *   PJLD-004 — injected JSON-LD script carries managed attribute data-texqtic-public-jsonld="true"
 *   PJLD-005 — injected JSON-LD script textContent parses as valid JSON with correct @type
 *   PJLD-006 — two JSON-LD blocks produce two separate script elements
 *   PJLD-007 — calling applyPublicPageMeta twice with jsonLd replaces, does not append
 *   PJLD-008 — applyPublicPageMeta without jsonLd after previous jsonLd clears prior scripts
 *
 * Harness: vitest + jsdom
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyPublicPageMeta,
  clearPublicPageMeta,
  PUBLIC_META_OG_FALLBACK_IMAGE,
  type PublicPageMetaInput,
} from '../../utils/publicPageMeta';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const ORIGIN = 'https://app.texqtic.com';

/** Minimal valid input for applyPublicPageMeta (no jsonLd). */
function makeInput(overrides: Partial<PublicPageMetaInput> = {}): PublicPageMetaInput {
  return {
    title: 'Test Page — TexQtic',
    description: 'Test description for TexQtic page.',
    canonical: `${ORIGIN}/products`,
    robots: 'index, follow',
    ogTitle: 'Test Page — TexQtic',
    ogDescription: 'Test description for TexQtic page.',
    ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ogUrl: `${ORIGIN}/products`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Test Page — TexQtic',
    twitterDescription: 'Test description for TexQtic page.',
    twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ...overrides,
  };
}

function getManagedJsonLdScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLScriptElement>('script[data-texqtic-public-jsonld]'),
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterEach(() => {
  clearPublicPageMeta();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyPublicPageMeta — JSON-LD injection', () => {
  it('PJLD-001 — no jsonLd field: no JSON-LD scripts injected into head', () => {
    applyPublicPageMeta(makeInput());
    expect(getManagedJsonLdScripts()).toHaveLength(0);
  });

  it('PJLD-002 — jsonLd with one block: one script element injected', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test', url: `${ORIGIN}/products` },
        ],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(1);
  });

  it('PJLD-003 — injected JSON-LD script has type="application/ld+json"', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' }],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts[0]?.getAttribute('type')).toBe('application/ld+json');
  });

  it('PJLD-004 — injected JSON-LD script carries data-texqtic-public-jsonld="true"', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' }],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts[0]?.getAttribute('data-texqtic-public-jsonld')).toBe('true');
  });

  it('PJLD-005 — JSON-LD script textContent parses as valid JSON with correct @type', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Collections', url: `${ORIGIN}/collections` },
        ],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(() => JSON.parse(scripts[0]?.textContent ?? '')).not.toThrow();
    const parsed = JSON.parse(scripts[0]?.textContent ?? '{}');
    expect(parsed['@type']).toBe('CollectionPage');
    expect(parsed['@context']).toBe('https://schema.org');
  });

  it('PJLD-006 — two jsonLd blocks produce two separate script elements', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
              { '@type': 'ListItem', position: 2, name: 'Products', item: `${ORIGIN}/products` },
            ],
          },
        ],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[0]?.textContent ?? '{}')['@type']).toBe('WebPage');
    expect(JSON.parse(scripts[1]?.textContent ?? '{}')['@type']).toBe('BreadcrumbList');
  });

  it('PJLD-007 — second call with different jsonLd replaces prior scripts (no accumulation)', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'First' }],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(1);

    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Second' },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
        ],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[0]?.textContent ?? '{}')['@type']).toBe('CollectionPage');
  });

  it('PJLD-008 — applyPublicPageMeta without jsonLd after previous jsonLd clears prior scripts', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Had JSON-LD' }],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(1);

    applyPublicPageMeta(makeInput()); // no jsonLd
    expect(getManagedJsonLdScripts()).toHaveLength(0);
  });
});

describe('clearPublicPageMeta — JSON-LD cleanup', () => {
  it('PJLD-006b — clearPublicPageMeta removes managed JSON-LD scripts', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
        ],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(2);
    clearPublicPageMeta();
    expect(getManagedJsonLdScripts()).toHaveLength(0);
  });

  it('PJLD-007b — clearPublicPageMeta does not remove unmanaged scripts from head', () => {
    // Inject an unmanaged script (no managed attribute)
    const unmanaged = document.createElement('script');
    unmanaged.setAttribute('type', 'application/ld+json');
    unmanaged.setAttribute('data-test-sentinel', 'unmanaged');
    unmanaged.textContent = JSON.stringify({ '@type': 'UnmanagedType' });
    document.head.appendChild(unmanaged);

    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' }],
      }),
    );

    clearPublicPageMeta();

    const sentinel = document.head.querySelector('script[data-test-sentinel="unmanaged"]');
    expect(sentinel).not.toBeNull();

    // Cleanup unmanaged sentinel
    sentinel?.remove();
  });
});

describe('DEC-004 contract — PUBLIC_ENTRY SEO posture', () => {
  it('App.tsx explicitly noindexes PUBLIC_ENTRY and sets root canonical', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

    expect(appSource).toContain("if (appState === 'PUBLIC_ENTRY') {");
    expect(appSource).toContain("robots: 'noindex, nofollow'");
    expect(appSource).toContain('canonical: `${origin}/`,');
  });
});

describe('DEC-005 contract — conditional product slug indexability', () => {
  it('PublicProductDetail meta signal distinguishes API live found vs reference fallback found', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'components', 'Public', 'PublicProductDetail.tsx'),
      'utf8',
    );

    expect(detailSource).toContain('isReferencePreview?: boolean;');
    expect(detailSource).toContain("type: 'found',");
    expect(detailSource).toContain('isReferencePreview: false,');
    expect(detailSource).toContain('isReferencePreview: true,');
    expect(detailSource).toContain('if (status === 404 && referenceProduct) {');
  });

  it('App.tsx product SEO uses noindex for reference found and index for live found', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

    expect(appSource).toContain("if (appState === 'PUBLIC_PRODUCT_DETAIL') {");
    expect(appSource).toContain('const productDetailRobots = publicProductDetailMeta.isReferencePreview === true');
    expect(appSource).toContain("? 'noindex, nofollow'");
    expect(appSource).toContain(": 'index, follow';");
    expect(appSource).toContain('robots: productDetailRobots,');
  });

  it('App.tsx product notFound branch remains noindex, nofollow', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

    expect(appSource).toContain("if (publicProductDetailMeta.type === 'notFound') {");
    expect(appSource).toContain("robots: 'noindex, nofollow',");
  });

  it('sitemap.xml remains without /product/:slug URLs', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public', 'sitemap.xml'), 'utf8');

    expect(sitemap).not.toContain('https://app.texqtic.com/product/');
  });

  it('robots.txt remains unchanged for product-detail path directives', () => {
    const robots = readFileSync(resolve(process.cwd(), 'public', 'robots.txt'), 'utf8');

    expect(robots).toContain('Allow: /products');
    expect(robots).toContain('Allow: /products/category/');
    expect(robots).not.toContain('Allow: /product/');
    expect(robots).not.toContain('Disallow: /product/');
  });
});
