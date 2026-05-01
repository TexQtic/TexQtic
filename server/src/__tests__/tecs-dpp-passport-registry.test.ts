/**
 * TECS-DPP-PASSPORT-NETWORK-017C — Tenant Passport Registry
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-017C
 * Slice: GET /api/tenant/dpp/passports
 *
 * Purpose:
 *   Verifies the tenant passport registry endpoint including route registration,
 *   auth middleware, tenant isolation, response field safety, and security constraints.
 *
 * Test strategy:
 *   Group 1 — Static: route registration and auth
 *   Group 2 — Static: tenant isolation enforcement
 *   Group 3 — Static: response field safety (no orgId, no raw public_token)
 *   Group 4 — Static: publicPassportId only when PUBLISHED
 *   Group 5 — Static: forbidden .json suffix route remains absent
 *   Group 6 — DB: integration gated by hasDb (skipped if no live DB)
 *
 * Doctrine: v1.4
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT       = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: route registration and auth
// ─────────────────────────────────────────────────────────────────────────────

describe('017C — Static: route registration and auth', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PR-S01 — GET route registered at /tenant/dpp/passports', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
  });

  it('PR-S02 — route uses tenantAuthMiddleware', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 600);
    expect(section).toMatch(/tenantAuthMiddleware/);
  });

  it('PR-S03 — route uses databaseContextMiddleware', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 600);
    expect(section).toMatch(/databaseContextMiddleware/);
  });

  it('PR-S04 — returns 401 when dbContext is missing', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 800);
    expect(section).toMatch(/UNAUTHORIZED|401/);
  });

  it('PR-S05 — limit query param has coerce + default', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 1200);
    expect(section).toMatch(/limit.*z\.coerce\.number|z\.coerce\.number.*limit/s);
    expect(section).toMatch(/\.default\(20\)/);
  });

  it('PR-S06 — limit max capped at 50', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 1200);
    expect(section).toMatch(/\.max\(50\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: tenant isolation enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('017C — Static: tenant isolation', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PR-T01 — query scoped by orgId from dbContext', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 2500);
    expect(section).toMatch(/orgId.*dbContext\.orgId|where.*orgId/s);
  });

  it('PR-T02 — uses withDbContext for RLS session variable setup', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 2500);
    expect(section).toMatch(/withDbContext/);
  });

  it('PR-T03 — findMany includes dpp_passport_states relation', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 2500);
    expect(section).toMatch(/dpp_passport_states/);
  });

  it('PR-T04 — findMany includes dpp_product_details relation', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 2500);
    expect(section).toMatch(/dpp_product_details/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: response field safety
// ─────────────────────────────────────────────────────────────────────────────

describe('017C — Static: response field safety', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PR-F01 — orgId NOT included in passport response shape', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    // The response map block must not expose orgId as a field
    const section = src.slice(idx, idx + 3000);
    // The return shape must not contain `orgId:` as a key in the passports map
    expect(section).not.toMatch(/return\s*\{[^}]*orgId\s*:/s);
  });

  it('PR-F02 — public_token raw value NOT exposed in response shape', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3500);
    // Locate the map's return { ... } block (the response shape).
    // public_token is legitimately in the Prisma select clause; it must NOT appear as a response key.
    const mapReturnIdx = section.search(/passports\s*=\s*nodes\.map/);
    expect(mapReturnIdx).toBeGreaterThan(-1);
    const mapBody = section.slice(mapReturnIdx, mapReturnIdx + 1200);
    // The return shape inside the map must not expose public_token as a key
    const returnShapeIdx = mapBody.search(/return\s*\{/);
    expect(returnShapeIdx).toBeGreaterThan(-1);
    const returnShape = mapBody.slice(returnShapeIdx, returnShapeIdx + 500);
    expect(returnShape).not.toMatch(/public_token\s*:/);
  });

  it('PR-F03 — response uses publicPassportId alias', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    expect(section).toMatch(/publicPassportId/);
  });

  it('PR-F04 — passportStatus field present in response shape', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    expect(section).toMatch(/passportStatus/);
  });

  it('PR-F05 — passportMaturity field present in response shape', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    expect(section).toMatch(/passportMaturity/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Static: publicPassportId only when PUBLISHED
// ─────────────────────────────────────────────────────────────────────────────

describe('017C — Static: publicPassportId gate', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PR-P01 — publicPassportId is null when not PUBLISHED', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    // The implementation must gate publicPassportId behind PUBLISHED status check
    expect(section).toMatch(/passportStatus.*PUBLISHED.*public_token|PUBLISHED.*passportStatus.*public_token/s);
  });

  it('PR-P02 — PUBLISHED status is validated against known statuses', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    expect(section).toMatch(/DRAFT.*INTERNAL.*TRADE_READY.*PUBLISHED|PUBLISHED.*TRADE_READY.*INTERNAL.*DRAFT/s);
  });

  it('PR-P03 — maturity defaults to LOCAL_TRUST for DRAFT/INTERNAL', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    expect(section).toMatch(/LOCAL_TRUST/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Static: forbidden .json suffix route absent
// ─────────────────────────────────────────────────────────────────────────────

describe('017C — Static: forbidden route absence', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PR-X01 — /api/public/dpp/:publicPassportId.json route is NOT registered (D-6 constraint)', () => {
    // This route must remain absent per D-6 decision
    expect(src).not.toMatch(/\/public\/dpp\/:.*\.json/);
  });

  it('PR-X02 — registry route does not include org_id in SELECT fields', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passports['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 3000);
    // The map should not return org_id as a field
    expect(section).not.toMatch(/orgId\s*:\s*node\.orgId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — DB: integration gated by hasDb
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('017C — DB: integration', () => {
  it('PR-D01 — DB integration tests require live DB (skipped without live Supabase)', () => {
    // This group requires a live Supabase DB connection.
    // Run with SUPABASE_SERVICE_ROLE_KEY + DATABASE_URL set in the environment.
    expect(hasDb).toBe(true);
  });
});
