/**
 * TECS-DPP-STRUCTURED-DATA-018 — JSON-LD Machine-Readable Public DPP
 * TECS-DPP-PASSPORT-NETWORK-024 — Group S: JSON-LD context document resolvability
 *
 * Slice: 018 — GET /api/public/dpp/:publicPassportId/structured-data
 * Slice: 024 — JSON-LD @context document at /dpp/v1/context.jsonld
 *
 * Test strategy:
 *   Group A (SD-A) — Route registration: structured-data registered; .json absent; base route intact
 *   Group B (SD-B) — JSON-LD shape: @context, @type, @id, passportUrl, required fields
 *   Group C (SD-C) — Content-Type / response headers
 *   Group D (SD-D) — Privacy: denylist fields absent from JSON-LD source
 *   Group E (SD-E) — Response normalization: invalid/unpublished token → safe 404
 *   Group F (SD-F) — Route safety: .json absent; structured-data coexists with base route
 *   Group S (SD-S) — 024: JSON-LD context document file: exists, parses, required terms, no forbidden terms
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '../../');
const PUBLIC_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/public.ts');
const CONTEXT_FILE_PATH = path.resolve(SERVER_ROOT, '../public/dpp/v1/context.jsonld');

// ─────────────────────────────────────────────────────────────────────────────
// Group A (SD-A) — Route registration
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-A — Route registration', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(
      true,
    );
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('SD-A01 — GET /dpp/:publicPassportId/structured-data registered in public.ts', () => {
    expect(src).toMatch(
      /fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\/structured-data['"]/,
    );
  });

  it('SD-A02 — TECS-DPP-STRUCTURED-DATA-018 block marker present', () => {
    expect(src).toContain('TECS-DPP-STRUCTURED-DATA-018');
  });

  it('SD-A03 — unsafe .json suffix route intentionally absent (D-6 hotfix constraint)', () => {
    // The .json suffix route was removed in D-6 hotfix (find-my-way SyntaxError).
    // It must not be restored for structured-data or any other route.
    expect(src).not.toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\\\\.json['"]/);
    expect(src).not.toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\.json['"]/);
  });

  it('SD-A04 — base GET /dpp/:publicPassportId route still present alongside D-18', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId['"]/);
  });

  it('SD-A05 — D-18 route is rate-limited (max 100/15 min)', () => {
    const d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
    expect(d18Block).toContain('rateLimit');
    expect(d18Block).toMatch(/max:\s*100/);
    expect(d18Block).toMatch(/timeWindow:\s*['"]15 minutes['"]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group B (SD-B) — JSON-LD shape in source
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-B — JSON-LD shape', () => {
  let d18Block: string;

  beforeAll(() => {
    const src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
  });

  it('SD-B01 — @context present in D-18 structured-data block', () => {
    expect(d18Block).toContain("'@context'");
  });

  it('SD-B02 — @vocab set to TexQtic DPP v1 namespace', () => {
    expect(d18Block).toContain('https://texqtic.com/dpp/v1#');
  });

  it('SD-B03 — schema.org mapping present in @context', () => {
    expect(d18Block).toContain("'schema': 'https://schema.org/'");
  });

  it('SD-B04 — @type set to ProductPassport', () => {
    expect(d18Block).toContain("'@type': 'ProductPassport'");
  });

  it('SD-B05 — @id uses APP_PUBLIC_URL + /passport/ path', () => {
    expect(d18Block).toMatch(/'@id'.*APP_PUBLIC_URL.*\/passport\//);
  });

  it('SD-B06 — passportUrl present in JSON-LD payload', () => {
    expect(d18Block).toContain("'passportUrl'");
  });

  it('SD-B07 — publicPassportId present in JSON-LD payload', () => {
    expect(d18Block).toContain("'publicPassportId'");
  });

  it('SD-B08 — passportStatus present in JSON-LD payload', () => {
    expect(d18Block).toContain("'passportStatus'");
  });

  it('SD-B09 — passportMaturity present in JSON-LD payload', () => {
    expect(d18Block).toContain("'passportMaturity'");
  });

  it('SD-B10 — product block with schema:Product type present', () => {
    expect(d18Block).toContain("'product'");
    expect(d18Block).toContain("'schema:Product'");
  });

  it('SD-B11 — certifications array present in JSON-LD payload', () => {
    expect(d18Block).toContain("'certifications'");
    expect(d18Block).toContain("'Certification'");
  });

  it('SD-B12 — lineageSummary present in JSON-LD payload', () => {
    expect(d18Block).toContain("'lineageSummary'");
  });

  it('SD-B13 — evidenceSummary present in JSON-LD payload', () => {
    expect(d18Block).toContain("'evidenceSummary'");
  });

  it('SD-B14 — generatedAt (ISO timestamp) present in JSON-LD payload', () => {
    expect(d18Block).toContain("'generatedAt'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group C (SD-C) — Content-Type / response headers in source
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-C — Content-Type / response headers', () => {
  let d18Block: string;

  beforeAll(() => {
    const src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
  });

  it('SD-C01 — Content-Type set to application/ld+json; charset=utf-8', () => {
    expect(d18Block).toContain('application/ld+json; charset=utf-8');
  });

  it('SD-C02 — X-Robots-Tag: noindex set on success path', () => {
    expect(d18Block).toContain('X-Robots-Tag');
    expect(d18Block).toContain('noindex');
  });

  it('SD-C03 — Cache-Control for success: public, max-age=300, stale-while-revalidate=60', () => {
    expect(d18Block).toContain('public, max-age=300, stale-while-revalidate=60');
  });

  it('SD-C04 — Cache-Control no-store set on 404 path', () => {
    expect(d18Block).toContain('no-store');
  });

  it('SD-C05 — Vary: Accept header set', () => {
    expect(d18Block).toContain("'Vary'");
    expect(d18Block).toContain('Accept');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group D (SD-D) — Privacy denylist: forbidden fields absent from D-18 block
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-D — Privacy: denylist fields absent from structured-data payload', () => {
  let d18Block: string;

  beforeAll(() => {
    const src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
  });

  it("SD-D01 — 'orgId' / 'org_id' not in JSON-LD payload keys", () => {
    // These must not appear as payload field keys (allowance: comments only)
    expect(d18Block).not.toMatch(/'orgId'\s*:/);
    expect(d18Block).not.toMatch(/'org_id'\s*:/);
  });

  it("SD-D02 — 'nodeId' / 'node_id' not in JSON-LD payload keys", () => {
    expect(d18Block).not.toMatch(/'nodeId'\s*:/);
    expect(d18Block).not.toMatch(/'node_id'\s*:/);
  });

  it("SD-D03 — 'public_token' not in JSON-LD payload keys", () => {
    expect(d18Block).not.toMatch(/'public_token'\s*:/);
    expect(d18Block).not.toMatch(/'publicToken'\s*:/);
  });

  it("SD-D04 — 'sourceId' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'sourceId'\s*:/);
  });

  it("SD-D05 — 'documentUrl' / 'document_url' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'documentUrl'\s*:/);
    expect(d18Block).not.toMatch(/'document_url'\s*:/);
  });

  it("SD-D06 — 'pricing' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'pricing'\s*:/);
  });

  it("SD-D07 — 'claimValue' / 'claim_value' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'claimValue'\s*:/);
    expect(d18Block).not.toMatch(/'claim_value'\s*:/);
  });

  it("SD-D08 — 'extractionId' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'extractionId'\s*:/);
  });

  it("SD-D09 — 'confidence' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'confidence'\s*:/);
  });

  it("SD-D10 — 'buyerOrgId' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'buyerOrgId'\s*:/);
  });

  it("SD-D11 — 'createdByUserId' / 'reviewedByUserId' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'createdByUserId'\s*:/);
    expect(d18Block).not.toMatch(/'reviewedByUserId'\s*:/);
  });

  it("SD-D12 — 'approvedBy' / 'approvedAt' not in JSON-LD payload", () => {
    expect(d18Block).not.toMatch(/'approvedBy'\s*:/);
    expect(d18Block).not.toMatch(/'approvedAt'\s*:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group E (SD-E) — Response normalization / safe 404
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-E — Response normalization (safe 404)', () => {
  let d18Block: string;

  beforeAll(() => {
    const src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
  });

  it('SD-E01 — DPP_NOT_FOUND error code used for 404 on structured-data route', () => {
    expect(d18Block).toContain("'DPP_NOT_FOUND'");
  });

  it('SD-E02 — 404 message is generic (no distinction not-found vs unpublished)', () => {
    expect(d18Block).toContain("'DPP passport not found'");
  });

  it('SD-E03 — ERROR and NOT_FOUND paths both return 404 to public callers', () => {
    // The structured-data route must collapse both ERROR and NOT_FOUND into a safe 404
    // so callers cannot enumerate token existence via error type.
    expect(d18Block).toMatch(/result\.kind\s*!==\s*'OK'/);
  });

  it('SD-E04 — publicPassportId validated as UUID before lookup', () => {
    expect(d18Block).toMatch(/dppPublicParamSchema\.safeParse/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group F (SD-F) — Route safety regression
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-F — Route safety regression', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('SD-F01 — no regex-escaped .json route pattern in public.ts (D-6 hotfix constraint)', () => {
    // Backslash in find-my-way route string causes SyntaxError at Fastify startup.
    // This must NEVER be re-introduced. See D-6 hotfix commit 59f2dcd.
    expect(src).not.toMatch(/fastify\.get\s*\(\s*['"][^'"]*\\\\/);
  });

  it('SD-F02 — fetchPublicDppData shared lookup function present in public.ts', () => {
    expect(src).toMatch(/async function fetchPublicDppData\s*\(/);
  });

  it('SD-F03 — handlePublicDppRead still present (base route not removed)', () => {
    expect(src).toMatch(/async function handlePublicDppRead\s*\(/);
  });

  it('SD-F04 — texqtic_public_lookup role used in D-18 data path', () => {
    // fetchPublicDppData (shared by D-6 and D-18) must use the restricted lookup role
    const fetchFnBlock = src.slice(
      src.indexOf('async function fetchPublicDppData'),
      src.indexOf('async function handlePublicDppRead'),
    );
    expect(fetchFnBlock).toContain('texqtic_public_lookup');
  });

  it('SD-F05 — SYSTEM_PUBLIC_DPP sentinel actorId used in D-18 data path', () => {
    // The shared fetch function must use the sentinel actor for audit log context
    const fetchFnBlock = src.slice(
      src.indexOf('async function fetchPublicDppData'),
      src.indexOf('async function handlePublicDppRead'),
    );
    expect(fetchFnBlock).toContain('SYSTEM_PUBLIC_DPP');
  });

  it('SD-F06 — no auth middleware on structured-data route', () => {
    const d18Block = src.slice(src.indexOf('TECS-DPP-STRUCTURED-DATA-018'));
    expect(d18Block.slice(0, 600)).not.toContain('tenantAuthMiddleware');
    expect(d18Block.slice(0, 600)).not.toContain('databaseContextMiddleware');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group S (SD-S) — 024: JSON-LD context document (public/dpp/v1/context.jsonld)
// Verifies: file exists, JSON parses, @context key present, required terms
// present, forbidden private terms absent.
// ─────────────────────────────────────────────────────────────────────────────

describe('SD-S — 024: JSON-LD context document', () => {
  let contextDoc: Record<string, unknown>;
  let contextTerms: Record<string, unknown>;

  beforeAll(() => {
    expect(fs.existsSync(CONTEXT_FILE_PATH), `context.jsonld not found: ${CONTEXT_FILE_PATH}`).toBe(true);
    const raw = fs.readFileSync(CONTEXT_FILE_PATH, 'utf-8');
    contextDoc = JSON.parse(raw) as Record<string, unknown>;
    contextTerms = contextDoc['@context'] as Record<string, unknown>;
  });

  it('SD-S01 — context document file exists at public/dpp/v1/context.jsonld', () => {
    expect(fs.existsSync(CONTEXT_FILE_PATH)).toBe(true);
  });

  it('SD-S02 — context document parses as valid JSON', () => {
    expect(contextDoc).toBeDefined();
    expect(typeof contextDoc).toBe('object');
  });

  it('SD-S03 — @context key present at document root', () => {
    expect(contextDoc).toHaveProperty('@context');
    expect(contextTerms).toBeDefined();
  });

  it('SD-S04 — ProductPassport term defined in @context', () => {
    expect(contextTerms).toHaveProperty('ProductPassport');
  });

  it('SD-S05 — Certification term defined in @context', () => {
    expect(contextTerms).toHaveProperty('Certification');
  });

  it('SD-S06 — passportUrl term defined in @context', () => {
    expect(contextTerms).toHaveProperty('passportUrl');
  });

  it('SD-S07 — publicPassportId term defined in @context', () => {
    expect(contextTerms).toHaveProperty('publicPassportId');
  });

  it('SD-S08 — passportStatus term defined in @context', () => {
    expect(contextTerms).toHaveProperty('passportStatus');
  });

  it('SD-S09 — passportMaturity term defined in @context', () => {
    expect(contextTerms).toHaveProperty('passportMaturity');
  });

  it('SD-S10 — product term defined in @context', () => {
    expect(contextTerms).toHaveProperty('product');
  });

  it('SD-S11 — certifications term defined in @context', () => {
    expect(contextTerms).toHaveProperty('certifications');
  });

  it('SD-S12 — lineageSummary term defined in @context', () => {
    expect(contextTerms).toHaveProperty('lineageSummary');
  });

  it('SD-S13 — evidenceSummary term defined in @context', () => {
    expect(contextTerms).toHaveProperty('evidenceSummary');
  });

  it('SD-S14 — generatedAt term defined in @context', () => {
    expect(contextTerms).toHaveProperty('generatedAt');
  });

  it('SD-S15 — context document does not contain forbidden private terms', () => {
    const raw = fs.readFileSync(CONTEXT_FILE_PATH, 'utf-8');
    const FORBIDDEN = [
      'orgId', 'org_id', 'nodeId', 'node_id', 'public_token',
      'documentUrl', 'document_url', 'sourceId', 'orderId',
      'rfqId', 'invoiceId', 'buyerOrgId', 'pricing',
      'claimValue', 'extractionId', 'confidence',
    ];
    for (const term of FORBIDDEN) {
      expect(raw, `context.jsonld must not contain private term: ${term}`).not.toContain(term);
    }
  });

  it('SD-S16 — texqtic namespace base URI used consistently in @context', () => {
    const raw = fs.readFileSync(CONTEXT_FILE_PATH, 'utf-8');
    expect(raw).toContain('https://texqtic.com/dpp/v1#');
  });

  it('SD-S17 — schema.org namespace present in @context', () => {
    expect(contextTerms).toHaveProperty('schema');
    expect(contextTerms['schema']).toBe('https://schema.org/');
  });

  it('SD-S18 — context document path consistent with Vercel static hosting (public/dpp/v1/)', () => {
    // Vercel routes: handle filesystem serves dist/dpp/v1/context.jsonld
    // Vite copies public/ → dist/ at build time.
    // This test confirms the file is in the correct public/ subdirectory.
    expect(CONTEXT_FILE_PATH).toContain(path.join('public', 'dpp', 'v1', 'context.jsonld'));
  });
});
