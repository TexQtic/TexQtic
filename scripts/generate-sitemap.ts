#!/usr/bin/env node --import tsx
/* global process */
/**
 * generate-sitemap.ts — PUBLIC-SEO-SITEMAP-ROBOTS-IMPLEMENTATION-001
 *
 * Build-time script that regenerates public/sitemap.xml from the canonical
 * static config registries.
 *
 * Authority:
 *   PUBLIC-SEO-SITEMAP-ROBOTS-JSONLD-STRATEGY-DESIGN-001
 *   B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
 *   PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
 *
 * Usage:
 *   node --import tsx scripts/generate-sitemap.ts
 *
 * Output:
 *   public/sitemap.xml — deterministic static XML sitemap
 *
 * Design constraints:
 *   - No API calls, no DB queries, no network I/O.
 *   - Reads only from config/ static registries.
 *   - Filters collections by listState.availability === 'AVAILABLE'.
 *   - Canonical base domain is hardcoded to https://app.texqtic.com.
 *   - Output is deterministic: same config → same output (no timestamps).
 *
 * GOVERNANCE:
 *   - No query parameters in any <loc>.
 *   - No private identifiers, org IDs, tenant IDs, or auth-gated paths.
 *   - Forbidden paths: /product/, /supplier/, /passport/, /join/,
 *     /trust, /industries, /aggregator, /.
 *   - Run this script and commit the result when the config registries change.
 *
 * SAFETY:
 *   - This script only writes to public/sitemap.xml.
 *   - It does not read or write any environment variables or secrets.
 *   - It does not touch the database.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Config imports — static TypeScript registries, no browser or network deps.
// tsx resolves .ts extensions when running under node --import tsx.
import { B2C_CATEGORY_PAGE_CONFIGS } from '../config/publicB2CCategoryPages';
import { PUBLIC_COLLECTION_PROJECTIONS } from '../config/publicCollectionsProjection';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANONICAL_ORIGIN = 'https://app.texqtic.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_PATH = join(__dirname, '..', 'public', 'sitemap.xml');

// ---------------------------------------------------------------------------
// URL entry types
// ---------------------------------------------------------------------------

interface SitemapEntry {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

// ---------------------------------------------------------------------------
// Build URL list
// ---------------------------------------------------------------------------

function buildEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // 1. B2C browse root
  entries.push({
    loc: `${CANONICAL_ORIGIN}/products`,
    changefreq: 'weekly',
    priority: '0.8',
  });

  // 2. B2C category story pages — all approved configs are indexable
  for (const config of B2C_CATEGORY_PAGE_CONFIGS) {
    entries.push({
      loc: `${CANONICAL_ORIGIN}/products/category/${config.slug}`,
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  // 3. Collection list root
  entries.push({
    loc: `${CANONICAL_ORIGIN}/collections`,
    changefreq: 'weekly',
    priority: '0.8',
  });

  // 4. AVAILABLE collection detail pages only
  for (const collection of PUBLIC_COLLECTION_PROJECTIONS) {
    if (collection.listState.availability === 'AVAILABLE') {
      entries.push({
        loc: `${CANONICAL_ORIGIN}/collections/${collection.publicSlug}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  // 5. Public inquiry surface
  entries.push({
    loc: `${CANONICAL_ORIGIN}/inquiry`,
    changefreq: 'monthly',
    priority: '0.5',
  });

  return entries;
}

// ---------------------------------------------------------------------------
// XML generation
// ---------------------------------------------------------------------------

function renderEntry(entry: SitemapEntry): string {
  return [
    '  <url>',
    `    <loc>${entry.loc}</loc>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function buildXml(entries: SitemapEntry[]): string {
  const urlBlocks = entries.map(renderEntry).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlBlocks,
    '</urlset>',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const entries = buildEntries();
  const xml = buildXml(entries);

  writeFileSync(OUTPUT_PATH, xml, 'utf-8');

  console.log(`✅ Sitemap generated: ${OUTPUT_PATH}`);
  console.log(`   ${entries.length} URLs written:`);
  for (const entry of entries) {
    console.log(`   - ${entry.loc}`);
  }
}

main();
