/**
 * TECS-DPP-PASSPORT-NETWORK-017 — Public Route Security Hardening
 *
 * Slice: 017 — GET /api/public/dpp/:publicPassportId — rate limit, cache headers,
 *              noindex, response normalization.
 *
 * Design: docs/TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md §12, §16, §17
 *
 * Test strategy:
 *   Group 1 (D17-S)  — Static: rate-limit registration + route config (no DB)
 *   Group 2 (D17-H)  — Static: security headers present in handler (no DB)
 *   Group 3 (D17-B)  — Static: boundary — 429 body shape, error path cache control (no DB)
 *   Group 4 (D17-P)  — Static: privacy — private fields excluded from payload shape (no DB)
 *   Group 5 (D17-X)  — Cross-slice regression: D-6 behaviour preserved, .json route absent
 *
 * NOTE on 429 behaviour:
 *   Exercising the actual 429 response requires a running Fastify instance and
 *   100+ requests within 15 minutes, which is impractical in unit tests.
 *   Tests D17-S01–D17-S04 verify the source-level configuration is correct;
 *   live 429 behaviour is covered by manual smoke testing (see §17 acceptance criteria).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '../../');
const PUBLIC_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/public.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 (D17-S) — Static: rate-limit registration + route config
// ─────────────────────────────────────────────────────────────────────────────

describe('D17-S — Static: rate-limit registration + route config', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(
      true,
    );
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D17-S01 — @fastify/rate-limit is imported in public.ts', () => {
    expect(src).toMatch(/import fastifyRateLimit from ['"]@fastify\/rate-limit['"]/);
  });

  it('D17-S02 — fastifyRateLimit registered with global: false (opt-in per route)', () => {
    expect(src).toMatch(/fastify\.register\s*\(\s*fastifyRateLimit/);
    expect(src).toMatch(/global\s*:\s*false/);
  });

  it('D17-S03 — DPP route declares config.rateLimit with max: 100', () => {
    expect(src).toMatch(/config\s*:\s*\{[\s\S]{0,60}rateLimit\s*:\s*\{[\s\S]{0,60}max\s*:\s*100/);
  });

  it("D17-S04 — DPP route timeWindow is '15 minutes'", () => {
    expect(src).toMatch(/timeWindow\s*:\s*['"]15 minutes['"]/);
  });

  it('D17-S05 — DPP errorResponseBuilder uses Object.assign to return an Error (not a plain object)', () => {
    // FIX-MAINAPP-DPP-RATELIMIT-STATUS-CODE-01: @fastify/rate-limit v10 throws the
    // errorResponseBuilder result. A plain object has no statusCode, causing the global
    // error handler to default to HTTP 500. The builder must return an Error with statusCode.
    const dppRateLimitBlock = src.slice(
      src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited'),
      src.indexOf("fastify.get('/dpp/:publicPassportId'"),
    );
    expect(dppRateLimitBlock).toMatch(/Object\.assign\s*\(\s*new Error/);
    expect(dppRateLimitBlock).toMatch(/context\.statusCode/);
    expect(dppRateLimitBlock).toMatch(/RATE_LIMITED/);
  });

  it('D17-S06 — DPP errorResponseBuilder does NOT return a plain retryAfter object (old 500-causing pattern removed)', () => {
    const dppRateLimitBlock = src.slice(
      src.indexOf('// GET /api/public/dpp/:publicPassportId — rate-limited'),
      src.indexOf("fastify.get('/dpp/:publicPassportId'"),
    );
    // The old pattern { error: 'rate_limited', retryAfter: ... } must be gone
    expect(dppRateLimitBlock).not.toMatch(/error\s*:\s*['"]rate_limited['"]/);
    expect(dppRateLimitBlock).not.toMatch(/retryAfter\s*:\s*Math\.ceil/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 (D17-H) — Static: security headers present in handler
// ─────────────────────────────────────────────────────────────────────────────

describe('D17-H — Static: security headers in handler', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it("D17-H01 — X-Robots-Tag: noindex is set in handlePublicDppRead", () => {
    expect(src).toMatch(/reply\.header\s*\(\s*['"]X-Robots-Tag['"]\s*,\s*['"]noindex['"]\s*\)/);
  });

  it("D17-H02 — Cache-Control: public, max-age=300, stale-while-revalidate=60 on success path", () => {
    expect(src).toMatch(
      /reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]public, max-age=300, stale-while-revalidate=60['"]\s*\)/,
    );
  });

  it('D17-H03 — Vary: Accept on success path', () => {
    expect(src).toMatch(/reply\.header\s*\(\s*['"]Vary['"]\s*,\s*['"]Accept['"]\s*\)/);
  });

  it('D17-H04 — Cache-Control: no-store on 404 / error paths (at least 3 occurrences)', () => {
    const matches = src.match(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/g);
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('D17-H05 — X-Robots-Tag: noindex is set before sendValidationError in route handler (validation error path)', () => {
    // The route-level validation error path must also set the noindex header
    const routeBlock = src.slice(src.lastIndexOf('/dpp/:publicPassportId'));
    expect(routeBlock).toMatch(/reply\.header\s*\(\s*['"]X-Robots-Tag['"]\s*,\s*['"]noindex['"]\s*\)/);
    expect(routeBlock).toMatch(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 (D17-B) — Static: boundary — 429 body, no-store on all error paths
// ─────────────────────────────────────────────────────────────────────────────

describe('D17-B — Static: boundary — rate-limit + cache-control placement', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D17-B01 — Cache-Control: no-store is set before Phase 1 sendError (INTERNAL_ERROR)', () => {
    // After 017E refactor: error handling is in handlePublicDppRead dispatching result.kind.
    // Phase 1 failure returns { kind: 'ERROR', phase: 1 }; handler sets no-store before 500.
    const fnStart = src.indexOf('async function handlePublicDppRead');
    const fnEnd = src.indexOf('await fastify.register(fastifyRateLimit');
    const handlerBody = src.slice(fnStart, fnEnd);
    // The handler must set Cache-Control: no-store on ERROR path
    expect(handlerBody).toMatch(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/);
    // The handler must return INTERNAL_ERROR for kind=ERROR
    expect(handlerBody).toContain('INTERNAL_ERROR');
    // The fetch function must log Phase 1 failure (in fetchPublicDppData)
    expect(src).toContain('[D6] Phase 1 passport state lookup failed');
  });

  it('D17-B02 — Cache-Control: no-store is set before Phase 1 DPP_NOT_FOUND (stateRows empty)', () => {
    const notFoundBlock = src.slice(
      src.indexOf('Safe 404 \u2014 do not distinguish'),
      src.indexOf('Safe 404 \u2014 do not distinguish') + 250,
    );
    expect(notFoundBlock).toMatch(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/);
    expect(notFoundBlock).toContain('DPP_NOT_FOUND');
  });

  it('D17-B03 — Cache-Control: no-store is set before Phase 2 sendError (INTERNAL_ERROR)', () => {
    // After 017E refactor: Phase 2 failure returns { kind: 'ERROR', phase: 2 };
    // same ERROR dispatch path in handlePublicDppRead sets no-store before 500.
    // Confirm log sentinel still present in fetchPublicDppData:
    expect(src).toContain('[D6] Phase 2 DPP snapshot query failed');
    // Confirm ERROR path dispatch sets no-store and sends INTERNAL_ERROR:
    const fnStart = src.indexOf('async function handlePublicDppRead');
    const fnEnd = src.indexOf('await fastify.register(fastifyRateLimit');
    const handlerBody = src.slice(fnStart, fnEnd);
    expect(handlerBody).toMatch(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/);
    expect(handlerBody).toContain('INTERNAL_ERROR');
  });

  it('D17-B04 — Cache-Control: no-store is set before Phase 2 DPP_NOT_FOUND (productRows empty)', () => {
    // After 017E refactor: empty productRows returns { kind: 'NOT_FOUND' };
    // handlePublicDppRead dispatches NOT_FOUND: sets no-store before DPP_NOT_FOUND 404.
    // Confirm guard sentinel in fetchPublicDppData:
    expect(src).toContain('Product row missing');
    // Confirm NOT_FOUND dispatch in handlePublicDppRead sets no-store and DPP_NOT_FOUND:
    const fnStart = src.indexOf('async function handlePublicDppRead');
    const fnEnd = src.indexOf('await fastify.register(fastifyRateLimit');
    const handlerBody = src.slice(fnStart, fnEnd);
    expect(handlerBody).toMatch(/reply\.header\s*\(\s*['"]Cache-Control['"]\s*,\s*['"]no-store['"]\s*\)/);
    expect(handlerBody).toContain('DPP_NOT_FOUND');
  });

  it('D17-B05 — Cache-Control: public cached header appears AFTER all error-path no-store headers in handler body', () => {
    // Scope check to handlePublicDppRead function body only.
    // Use the rate-limit route registration comment (unique, after the function) as end boundary.
    const fnStart = src.indexOf('async function handlePublicDppRead');
    const fnEnd = src.indexOf('await fastify.register(fastifyRateLimit');
    const handlerBody = src.slice(fnStart, fnEnd);

    const lastNoStoreInFn = handlerBody.lastIndexOf("'no-store'");
    const publicCacheIdx = handlerBody.indexOf('max-age=300');
    expect(lastNoStoreInFn).toBeGreaterThan(0);
    expect(publicCacheIdx).toBeGreaterThan(lastNoStoreInFn);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 (D17-P) — Static: privacy — private fields excluded from response
// ─────────────────────────────────────────────────────────────────────────────

describe('D17-P — Static: privacy — private fields excluded from DPP payload', () => {
  let dppSection: string;

  beforeAll(() => {
    const src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    // Isolate the DPP section payload construction
    const payloadStart = src.indexOf('Shape restricted DppPublicPassportView');
    const payloadEnd = src.indexOf('return sendSuccess(reply, payload)');
    dppSection = src.slice(payloadStart, payloadEnd + 40);
  });

  it('D17-P01 — payload does not include orgId or org_id at the top level', () => {
    // org_id is used internally but must not appear in the payload object
    const payloadLiteral = dppSection.slice(dppSection.indexOf('const payload = {'));
    expect(payloadLiteral).not.toMatch(/^\s+orgId\s*:/m);
    expect(payloadLiteral).not.toMatch(/^\s+org_id\s*:/m);
  });

  it('D17-P02 — payload does not include nodeId or node_id at top level', () => {
    const payloadLiteral = dppSection.slice(dppSection.indexOf('const payload = {'));
    expect(payloadLiteral).not.toMatch(/^\s+nodeId\s*:/m);
    expect(payloadLiteral).not.toMatch(/^\s+node_id\s*:/m);
  });

  it('D17-P03 — payload does not include public_token', () => {
    const payloadLiteral = dppSection.slice(dppSection.indexOf('const payload = {'));
    expect(payloadLiteral).not.toMatch(/public_token\s*:/);
  });

  it('D17-P04 — payload includes publicPassportId (public-safe token)', () => {
    const payloadLiteral = dppSection.slice(dppSection.indexOf('const payload = {'));
    expect(payloadLiteral).toContain('publicPassportId');
  });

  it('D17-P05 — payload includes passportStatus: PUBLISHED', () => {
    const payloadLiteral = dppSection.slice(dppSection.indexOf('const payload = {'));
    expect(payloadLiteral).toMatch(/passportStatus\s*:\s*['"]PUBLISHED['"]/);
  });

  it('D17-P06 — EXCLUDED comment lists private fields (governance annotation preserved)', () => {
    expect(dppSection).toContain('EXCLUDED');
    expect(dppSection).toMatch(/EXCLUDED.*orgId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 (D17-X) — Cross-slice regression: D-6 behaviour preserved
// ─────────────────────────────────────────────────────────────────────────────

describe('D17-X — Cross-slice regression: D-6 behaviour preserved', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D17-X01 — unsafe .json suffix route still absent (D-6 hotfix preserved)', () => {
    expect(src).not.toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\\\\.json['"]/);
  });

  it('D17-X02 — publicPassportId still validated as UUID', () => {
    expect(src).toMatch(/publicPassportId.*z\.string\(\)\.uuid/);
  });

  it('D17-X03 — Phase 1 texqtic_public_lookup role still present', () => {
    expect(src).toContain('texqtic_public_lookup');
  });

  it("D17-X04 — Phase 1 still filters by status = 'PUBLISHED'", () => {
    expect(src).toMatch(/status\s*=\s*'PUBLISHED'/);
  });

  it('D17-X05 — Phase 2 withDbContext still present (tenant-scoped snapshot queries)', () => {
    expect(src).toMatch(/withDbContext\s*\(/);
  });

  it('D17-X06 — sendSuccess still called for published DPP response', () => {
    expect(src).toContain('sendSuccess');
  });

  it('D17-X07 — qr.payloadUrl uses buyer page path /passport/:id (not API route)', () => {
    // AF-01 fix: payloadUrl must use the SPA buyer page path, not the raw API dpp route.
    // /passport/:id is the only SPA-routed public path. /dpp/:id is NOT registered in App.tsx.
    expect(src).toMatch(/payloadUrl\s*:\s*`.*\/passport\/\$\{publicPassportId\}`/);
    expect(src).not.toMatch(/payloadUrl\s*:\s*`.*\/dpp\/\$\{publicPassportId\}`/);
  });

  it('D17-X08 — DPP route path unchanged: /dpp/:publicPassportId', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId['"]/);
  });

  it('D17-X09 — rate-limit plugin is registered BEFORE the DPP route declaration in file order', () => {
    const rateLimitRegisterIdx = src.indexOf('fastify.register(fastifyRateLimit');
    const dppRouteIdx = src.indexOf("fastify.get('/dpp/:publicPassportId'");
    expect(rateLimitRegisterIdx).toBeGreaterThan(0);
    expect(dppRouteIdx).toBeGreaterThan(rateLimitRegisterIdx);
  });
});
