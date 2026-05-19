/**
 * SEO JSON-LD Structured Data Tests
 * PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
 *
 * Unit:    PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
 * Family:  TexQtic public SEO infrastructure
 * Date:    2026-08-08
 *
 * Covers:
 *   JLDT-001 — publicPageMeta.ts exports PublicJsonLdBlock type
 *   JLDT-002 — publicPageMeta.ts PublicPageMetaInput has optional jsonLd field
 *   JLDT-003 — publicPageMeta.ts uses data-texqtic-public-jsonld attribute for managed scripts
 *   JLDT-004 — App.tsx PUBLIC_B2C_BROWSE branch passes WebPage JSON-LD block
 *   JLDT-005 — App.tsx PUBLIC_B2C_CATEGORY_STORY known branch passes BreadcrumbList JSON-LD block
 *   JLDT-006 — App.tsx unknown category fallback does NOT pass jsonLd
 *   JLDT-007 — App.tsx PUBLIC_COLLECTIONS branch passes CollectionPage JSON-LD block
 *   JLDT-008 — App.tsx PUBLIC_COLLECTION_DETAIL known branch passes WebPage and BreadcrumbList
 *   JLDT-009 — App.tsx PUBLIC_INQUIRY branch does NOT pass jsonLd
 *   JLDT-010 — No forbidden schema types in App.tsx JSON-LD blocks
 *   JLDT-011 — No forbidden private identifiers in App.tsx JSON-LD blocks
 *   JLDT-012 — App.tsx BreadcrumbList blocks include position, name, item for each list item
 *   JLDT-013 — App.tsx PUBLIC_COLLECTION_DETAIL_UNAVAILABLE state has no jsonLd
 *   JLDT-014 — isPartOf WebSite block present in browse/collections JSON-LD
 *   JLDT-015 — publicPageMeta.ts clearPublicPageMeta also removes managed JSON-LD scripts
 *   JLDT-016 — applyPublicPageMeta injects JSON-LD script with type application/ld+json (DOM)
 *   JLDT-017 — multiple JSON-LD blocks produce separate script tags (DOM)
 *   JLDT-018 — re-calling applyPublicPageMeta replaces, not appends, prior JSON-LD (DOM)
 *   JLDT-019 — applyPublicPageMeta without jsonLd clears prior managed JSON-LD (DOM)
 *   JLDT-020 — clearPublicPageMeta does NOT remove non-managed scripts (DOM)
 *
 * Harness: vitest + Node.js fs (file-based) + jsdom (DOM-based)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyPublicPageMeta,
  clearPublicPageMeta,
  PUBLIC_META_OG_FALLBACK_IMAGE,
  type PublicPageMetaInput,
} from '../../utils/publicPageMeta';

// ---------------------------------------------------------------------------
// Path resolution (ESM-safe)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..', '..');

const UTILS_PUBPAGEMETA_PATH = join(REPO_ROOT, 'utils', 'publicPageMeta.ts');
const APP_TSX_PATH = join(REPO_ROOT, 'App.tsx');

// ---------------------------------------------------------------------------
// Helpers — file reading
// ---------------------------------------------------------------------------

function readPublicPageMeta(): string {
  return readFileSync(UTILS_PUBPAGEMETA_PATH, 'utf-8');
}

function readAppTsx(): string {
  return readFileSync(APP_TSX_PATH, 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers — DOM
// ---------------------------------------------------------------------------

const ORIGIN = 'https://app.texqtic.com';

function makeInput(overrides: Partial<PublicPageMetaInput> = {}): PublicPageMetaInput {
  return {
    title: 'Test — TexQtic',
    description: 'Test description.',
    canonical: `${ORIGIN}/products`,
    robots: 'index, follow',
    ogTitle: 'Test — TexQtic',
    ogDescription: 'Test description.',
    ogImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ogUrl: `${ORIGIN}/products`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Test — TexQtic',
    twitterDescription: 'Test description.',
    twitterImage: PUBLIC_META_OG_FALLBACK_IMAGE,
    ...overrides,
  };
}

function getManagedJsonLdScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLScriptElement>('script[data-texqtic-public-jsonld]'),
  );
}

afterEach(() => {
  clearPublicPageMeta();
});

// ---------------------------------------------------------------------------
// Tests — publicPageMeta.ts source structure (JLDT-001 to JLDT-003)
// ---------------------------------------------------------------------------

describe('publicPageMeta.ts — JSON-LD source structure', () => {
  it('JLDT-001 — publicPageMeta.ts exports PublicJsonLdBlock type', () => {
    const src = readPublicPageMeta();
    expect(src).toContain('export type PublicJsonLdBlock');
  });

  it('JLDT-002 — PublicPageMetaInput has optional jsonLd field', () => {
    const src = readPublicPageMeta();
    expect(src).toContain('readonly jsonLd?:');
    expect(src).toContain('PublicJsonLdBlock');
  });

  it('JLDT-003 — publicPageMeta.ts uses data-texqtic-public-jsonld as managed attribute', () => {
    const src = readPublicPageMeta();
    expect(src).toContain("'data-texqtic-public-jsonld'");
  });
});

// ---------------------------------------------------------------------------
// Tests — App.tsx JSON-LD branch content (JLDT-004 to JLDT-014)
// ---------------------------------------------------------------------------

describe('App.tsx — JSON-LD branch structure', () => {
  it('JLDT-004 — PUBLIC_B2C_BROWSE branch passes WebPage JSON-LD block', () => {
    const appTsx = readAppTsx();
    // Locate the PUBLIC_B2C_BROWSE branch and verify WebPage JSON-LD follows
    const browseIdx = appTsx.indexOf("appState === 'PUBLIC_B2C_BROWSE'");
    expect(browseIdx).toBeGreaterThan(-1);
    const section = appTsx.slice(browseIdx, browseIdx + 1500);
    expect(section).toContain("'@type': 'WebPage'");
    expect(section).toContain('jsonLd:');
    expect(section).toContain("'@context': 'https://schema.org'");
  });

  it('JLDT-005 — PUBLIC_B2C_CATEGORY_STORY known branch passes WebPage and BreadcrumbList', () => {
    const appTsx = readAppTsx();
    const categoryIdx = appTsx.indexOf("appState === 'PUBLIC_B2C_CATEGORY_STORY'");
    expect(categoryIdx).toBeGreaterThan(-1);
    // Known branch: before the unknown fallback ('Category Unavailable')
    const section = appTsx.slice(categoryIdx, appTsx.indexOf("'Category Unavailable — TexQtic'"));
    expect(section).toContain("'@type': 'WebPage'");
    expect(section).toContain("'@type': 'BreadcrumbList'");
    expect(section).toContain('jsonLd:');
  });

  it('JLDT-006 — unknown category fallback does NOT pass jsonLd', () => {
    const appTsx = readAppTsx();
    const fallbackIdx = appTsx.indexOf("'Category Unavailable — TexQtic'");
    expect(fallbackIdx).toBeGreaterThan(-1);
    // Check 400 chars after the fallback title — no jsonLd key present
    const nearbyText = appTsx.slice(fallbackIdx, fallbackIdx + 400);
    expect(nearbyText).not.toContain('jsonLd:');
  });

  it('JLDT-007 — PUBLIC_COLLECTIONS branch passes CollectionPage JSON-LD block', () => {
    const appTsx = readAppTsx();
    // Use lastIndexOf — the string appears twice; the SEO useEffect is the last occurrence
    const collectionsIdx = appTsx.lastIndexOf("appState === 'PUBLIC_COLLECTIONS'");
    expect(collectionsIdx).toBeGreaterThan(-1);
    const section = appTsx.slice(collectionsIdx, collectionsIdx + 1500);
    expect(section).toContain("'@type': 'CollectionPage'");
    expect(section).toContain('jsonLd:');
  });

  it('JLDT-008 — PUBLIC_COLLECTION_DETAIL known branch passes WebPage and BreadcrumbList', () => {
    const appTsx = readAppTsx();
    const detailIdx = appTsx.indexOf("appState === 'PUBLIC_COLLECTION_DETAIL'");
    expect(detailIdx).toBeGreaterThan(-1);
    // Known branch: before the fail-closed fallback ('Collection Preview Unavailable')
    const section = appTsx.slice(detailIdx, appTsx.indexOf("'Collection Preview Unavailable — TexQtic'"));
    expect(section).toContain("'@type': 'WebPage'");
    expect(section).toContain("'@type': 'BreadcrumbList'");
    expect(section).toContain('jsonLd:');
  });

  it('JLDT-009 — PUBLIC_INQUIRY branch does NOT pass jsonLd', () => {
    const appTsx = readAppTsx();
    const inquiryIdx = appTsx.indexOf("'Express Interest — TexQtic'");
    expect(inquiryIdx).toBeGreaterThan(-1);
    const nearbyText = appTsx.slice(inquiryIdx, inquiryIdx + 400);
    expect(nearbyText).not.toContain('jsonLd:');
  });

  it('JLDT-010 — no forbidden schema types in App.tsx JSON-LD blocks', () => {
    const appTsx = readAppTsx();
    const FORBIDDEN_TYPES = ["'@type': 'Product'", "'@type': 'Offer'", "'@type': 'AggregateRating'",
      "'@type': 'Review'", "'@type': 'Organization'", "'@type': 'FAQPage'", "'@type': 'ContactPage'"];
    for (const forbiddenType of FORBIDDEN_TYPES) {
      expect(appTsx).not.toContain(forbiddenType);
    }
  });

  it('JLDT-011 — no forbidden private identifiers in App.tsx JSON-LD blocks', () => {
    const appTsx = readAppTsx();
    const FORBIDDEN_IDENTIFIERS = ['org_id', 'tenant_id', 'supplier_id', 'product_id',
      'collection_id', 'user_id', 'session_id', 'auth_token'];
    // Check within each jsonLd block (1500 chars after each 'jsonLd:' occurrence)
    let searchStart = 0;
    while (true) {
      const idx = appTsx.indexOf('jsonLd:', searchStart);
      if (idx === -1) break;
      const section = appTsx.slice(idx, idx + 1500);
      for (const id of FORBIDDEN_IDENTIFIERS) {
        expect(section).not.toContain(id);
      }
      searchStart = idx + 1;
    }
  });

  it('JLDT-012 — App.tsx BreadcrumbList blocks include position, name, and item for each entry', () => {
    const appTsx = readAppTsx();
    // Find BreadcrumbList occurrences in App.tsx
    let searchStart = 0;
    let found = 0;
    while (true) {
      const idx = appTsx.indexOf("'@type': 'BreadcrumbList'", searchStart);
      if (idx === -1) break;
      const section = appTsx.slice(idx, idx + 600);
      expect(section).toContain('position:');
      expect(section).toContain('name:');
      expect(section).toContain('item:');
      found++;
      searchStart = idx + 1;
    }
    // Expect at least 2 BreadcrumbList occurrences (category + collection detail)
    expect(found).toBeGreaterThanOrEqual(2);
  });

  it('JLDT-013 — PUBLIC_COLLECTION_DETAIL_UNAVAILABLE state has no jsonLd', () => {
    const appTsx = readAppTsx();
    const unavailIdx = appTsx.indexOf("appState === 'PUBLIC_COLLECTION_DETAIL_UNAVAILABLE'");
    expect(unavailIdx).toBeGreaterThan(-1);
    const section = appTsx.slice(unavailIdx, unavailIdx + 600);
    expect(section).not.toContain('jsonLd:');
  });

  it('JLDT-014 — isPartOf WebSite block present in browse and collections JSON-LD', () => {
    const appTsx = readAppTsx();
    // Verify WebSite isPartOf appears in jsonLd sections
    let searchStart = 0;
    let webSiteCount = 0;
    while (true) {
      const idx = appTsx.indexOf("'@type': 'WebSite'", searchStart);
      if (idx === -1) break;
      webSiteCount++;
      searchStart = idx + 1;
    }
    // Expect WebSite appears in each jsonLd block that has isPartOf (4 blocks: browse, category, collections, collection detail)
    expect(webSiteCount).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Tests — publicPageMeta.ts source: clearPublicPageMeta clears JSON-LD (JLDT-015)
// ---------------------------------------------------------------------------

describe('publicPageMeta.ts — clearPublicPageMeta source contract', () => {
  it('JLDT-015 — clearPublicPageMeta source calls clearManagedJsonLd', () => {
    const src = readPublicPageMeta();
    // clearPublicPageMeta body should call clearManagedJsonLd
    const clearFnIdx = src.indexOf('export function clearPublicPageMeta');
    expect(clearFnIdx).toBeGreaterThan(-1);
    const clearFnBody = src.slice(clearFnIdx, clearFnIdx + 250);
    expect(clearFnBody).toContain('clearManagedJsonLd');
  });
});

// ---------------------------------------------------------------------------
// Tests — DOM behaviour (JLDT-016 to JLDT-020)
// ---------------------------------------------------------------------------

describe('applyPublicPageMeta / clearPublicPageMeta — JSON-LD DOM behaviour', () => {
  it('JLDT-016 — injected JSON-LD script has type="application/ld+json"', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test', url: `${ORIGIN}/products` }],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.getAttribute('type')).toBe('application/ld+json');
  });

  it('JLDT-017 — two JSON-LD blocks produce two separate script tags', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test', url: `${ORIGIN}/products` },
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

  it('JLDT-018 — re-calling applyPublicPageMeta replaces prior JSON-LD, not appends', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'WebPage', name: 'First', url: `${ORIGIN}/products` },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
        ],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(2);

    applyPublicPageMeta(
      makeInput({
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Second', url: `${ORIGIN}/collections` },
        ],
      }),
    );
    const scripts = getManagedJsonLdScripts();
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]?.textContent ?? '{}')['@type']).toBe('CollectionPage');
  });

  it('JLDT-019 — applyPublicPageMeta without jsonLd clears any prior managed JSON-LD', () => {
    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Had JSON-LD', url: `${ORIGIN}/products` }],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(1);

    // Call without jsonLd — prior scripts must be cleared
    applyPublicPageMeta(makeInput());
    expect(getManagedJsonLdScripts()).toHaveLength(0);
  });

  it('JLDT-020 — clearPublicPageMeta does NOT remove non-managed scripts', () => {
    // Add an unmanaged JSON-LD script (no managed attribute)
    const unmanaged = document.createElement('script');
    unmanaged.setAttribute('type', 'application/ld+json');
    unmanaged.setAttribute('data-test-sentinel', 'jldt-020');
    unmanaged.textContent = JSON.stringify({ '@type': 'ExternalUnmanagedType' });
    document.head.appendChild(unmanaged);

    applyPublicPageMeta(
      makeInput({
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Managed', url: `${ORIGIN}/products` }],
      }),
    );
    expect(getManagedJsonLdScripts()).toHaveLength(1);

    clearPublicPageMeta();

    // Managed JSON-LD removed
    expect(getManagedJsonLdScripts()).toHaveLength(0);
    // Unmanaged script preserved
    const sentinel = document.head.querySelector('script[data-test-sentinel="jldt-020"]');
    expect(sentinel).not.toBeNull();

    // Cleanup
    sentinel?.remove();
  });
});
