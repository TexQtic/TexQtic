/**
 * TECS-DPP-PUBLIC-QR-001 D-6 — Public QR Access / Published DPP
 *
 * Slice: D-6 — GET /api/public/dpp/:publicPassportId
 *              Migration: 20260509000000_tecs_dpp_d6_public_token
 *
 * NOTE: GET /api/public/dpp/:publicPassportId.json was introduced in D-6 commit 5ba6db9
 *       then immediately removed by hotfix 59f2dcd. The backslash in the route string
 *       caused a find-my-way SyntaxError at Fastify startup, crashing ALL routes.
 *       The .json suffix route is intentionally not restored. The base route already
 *       returns application/json. See D6-S02 and GOVERNANCE-CHANGELOG.md (2026-04-28).
 *
 * Test strategy:
 *   Group 1 (D6-S)  — Static: route presence + structure in public.ts (no DB)
 *   Group 2 (D6-B)  — Static: boundary — status guard, no internal data leak (no DB)
 *   Group 3 (D6-P)  — Static: public payload projection — included + excluded fields (no DB)
 *   Group 4 (D6-QR) — Static: QR descriptor (no DB)
 *   Group 5 (D6-DB) — DB: integration (gated by hasDb)
 *   Group 6 (D6-X)  — Cross-slice: D-3, D-4, D-5 routes still present alongside D-6
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '../../');
const PUBLIC_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/public.ts');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const MIGRATION_D6_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260509000000_tecs_dpp_d6_public_token/migration.sql',
);
const MIGRATION_D5_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260508000000_tecs_dpp_d4_evidence_claims/migration.sql',
);

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 (D6-S) — Static: route presence + structure
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-S — Static: route presence + structure', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(
      true,
    );
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D6-S01 — GET /dpp/:publicPassportId route declared in public.ts', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId['"]/);
  });

  it('D6-S02 â€" unsafe .json suffix route intentionally absent; base route is canonical JSON surface', () => {
    // The route GET /dpp/:publicPassportId\.json was in D-6 commit 5ba6db9 then removed by
    // hotfix 59f2dcd: backslash in find-my-way route string causes SyntaxError at Fastify init,
    // crashing ALL routes. The base route already returns application/json (Fastify default).
    // Canonical machine-readable public passport endpoint: GET /api/public/dpp/:publicPassportId
    expect(src).not.toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\\\\.json['"]/);
  });

  it('D6-S03 — publicPassportId validated as UUID', () => {
    expect(src).toMatch(/publicPassportId.*z\.string\(\)\.uuid/);
  });

  it('D6-S04 — Phase 1 uses texqtic_public_lookup role', () => {
    expect(src).toContain('texqtic_public_lookup');
  });

  it('D6-S05 — Phase 1 SET LOCAL ROLE texqtic_public_lookup via $executeRaw', () => {
    expect(src).toMatch(/\$executeRaw[\s\S]{0,50}SET LOCAL ROLE texqtic_public_lookup/);
  });

  it("D6-S06 — Phase 1 filters by status = 'PUBLISHED'", () => {
    expect(src).toMatch(/status\s*=\s*'PUBLISHED'/);
  });

  it('D6-S07 — Phase 1 queries dpp_passport_states by public_token', () => {
    expect(src).toMatch(/FROM dpp_passport_states[\s\S]{0,200}public_token/);
  });

  it('D6-S08 — Phase 2 calls withDbContext', () => {
    expect(src).toMatch(/withDbContext\s*\(/);
  });

  it('D6-S09 — Phase 2 uses SYSTEM_PUBLIC_DPP sentinel actorId', () => {
    expect(src).toContain('SYSTEM_PUBLIC_DPP');
  });

  it('D6-S10 — Phase 2 queries dpp_snapshot_products_v1', () => {
    expect(src).toContain('dpp_snapshot_products_v1');
  });

  it('D6-S11 — Phase 2 queries dpp_snapshot_lineage_v1', () => {
    expect(src).toContain('dpp_snapshot_lineage_v1');
  });

  it('D6-S12 — Phase 2 queries dpp_snapshot_certifications_v1', () => {
    expect(src).toContain('dpp_snapshot_certifications_v1');
  });

  it('D6-S13 — sendSuccess called for successful response', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).toContain('sendSuccess');
  });

  it('D6-S14 — no auth middleware on D-6 public routes', () => {
    // Public DPP routes must NOT be protected by tenantAuthMiddleware or databaseContextMiddleware
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    const routeBlock = d6Block.slice(d6Block.indexOf('/dpp/:publicPassportId'));
    // Neither auth middleware should appear on the public DPP route
    expect(routeBlock.slice(0, 500)).not.toContain('tenantAuthMiddleware');
    expect(routeBlock.slice(0, 500)).not.toContain('databaseContextMiddleware');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 (D6-B) — Static: boundary rules
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-B — Static: boundary rules', () => {
  let src: string;
  let migSql: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    migSql = fs.readFileSync(MIGRATION_D6_PATH, 'utf-8');
  });

  it('D6-B01 — DPP_NOT_FOUND error returned for non-PUBLISHED token', () => {
    expect(src).toContain("'DPP_NOT_FOUND'");
  });

  it('D6-B02 — safe 404 with generic message (no distinction published/not-found)', () => {
    expect(src).toContain("'DPP passport not found'");
  });

  it('D6-B03 — public route does NOT expose /passport/export path', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).not.toContain('/passport/export');
  });

  it('D6-B04 — public route does not mutate passportStatus', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    // Should not contain INSERT, UPDATE, or passportStatus mutation
    expect(d6Block).not.toMatch(/INSERT INTO dpp_passport_states/);
    expect(d6Block).not.toMatch(/UPDATE dpp_passport_states/);
  });

  it('D6-B05 — public_token field exists in migration (Option B)', () => {
    expect(migSql).toContain('public_token');
  });

  it('D6-B06 — public_token is UNIQUE in migration', () => {
    expect(migSql).toMatch(/UNIQUE[\s\S]{0,200}public_token/);
  });

  it('D6-B07 — public_token DEFAULT NULL (not auto-generated at DB level)', () => {
    expect(migSql).toMatch(/public_token\s+UUID\s+DEFAULT\s+NULL/);
  });

  it('D6-B08 — RLS policy for texqtic_public_lookup present in migration', () => {
    expect(migSql).toContain('texqtic_public_lookup');
    expect(migSql).toContain("status = 'PUBLISHED'");
  });

  it('D6-B09 — GRANT SELECT on dpp_passport_states to texqtic_public_lookup in migration', () => {
    expect(migSql).toMatch(/GRANT SELECT ON public\.dpp_passport_states TO texqtic_public_lookup/);
  });

  it("D6-B10 — no JSON-LD fields in D-6 response", () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).not.toContain('@context');
    expect(d6Block).not.toContain('@type');
    expect(d6Block).not.toContain('json-ld');
    expect(d6Block).not.toContain('jsonld');
  });

  it('D6-B11 — D-5 internal export route NOT accessible via public path', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    // The D-5 export route (/passport/export) must NOT appear in the D-6 public block
    expect(d6Block).not.toMatch(/\/tenant\/dpp/);
  });

  it('D6-B12 — preflight block in migration raises on missing dpp_passport_states', () => {
    expect(migSql).toContain('D6 PREFLIGHT FAIL');
    expect(migSql).toContain('dpp_passport_states');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 (D6-P) — Static: public payload projection
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-P — Static: public payload projection', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  const d6BlockFn = () => src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));

  it('D6-P01 — publicPassportId present in payload', () => {
    expect(d6BlockFn()).toContain('publicPassportId,');
  });

  it("D6-P02 — passportStatus: 'PUBLISHED' present in payload", () => {
    expect(d6BlockFn()).toContain("passportStatus: 'PUBLISHED' as const");
  });

  it('D6-P03 — passportMaturity present in payload', () => {
    expect(d6BlockFn()).toContain('passportMaturity,');
  });

  it('D6-P04 — product.nodeType in payload', () => {
    expect(d6BlockFn()).toContain('nodeType: product.node_type');
  });

  it('D6-P05 — product.batchId in payload', () => {
    expect(d6BlockFn()).toContain('batchId: product.batch_id');
  });

  it('D6-P06 — product.manufacturerName in payload', () => {
    expect(d6BlockFn()).toContain('manufacturerName: product.manufacturer_name');
  });

  it('D6-P07 — product.manufacturerJurisdiction in payload', () => {
    expect(d6BlockFn()).toContain('manufacturerJurisdiction: product.manufacturer_jurisdiction');
  });

  it('D6-P08 — orgId excluded from payload (not in payload shape)', () => {
    const payloadBlock = d6BlockFn();
    // orgId must NOT appear as a response field key
    // Look for payload object definition — no `orgId:` key after `const payload = {`
    const payloadShape = payloadBlock.slice(payloadBlock.indexOf('const payload = {'));
    const payloadEnd = payloadShape.indexOf('exportedAt');
    const payloadDef = payloadShape.slice(0, payloadEnd + 200);
    expect(payloadDef).not.toMatch(/^\s+orgId:/m);
  });

  it('D6-P09 — raw nodeId excluded from response payload shape', () => {
    const payloadShape = d6BlockFn().slice(d6BlockFn().indexOf('const payload = {'));
    const payloadDef = payloadShape.slice(0, 1500);
    expect(payloadDef).not.toMatch(/^\s+nodeId:/m);
  });

  it('D6-P10 — meta (raw JSONB) excluded from product projection', () => {
    // D-6 product query must not select meta column
    const d6Block = d6BlockFn();
    const productQuery = d6Block.slice(
      d6Block.indexOf('dpp_snapshot_products_v1'),
      d6Block.indexOf('dpp_snapshot_products_v1') + 400,
    );
    expect(productQuery).not.toContain(', meta');
  });

  it('D6-P11 — geoHash excluded from product projection', () => {
    const d6Block = d6BlockFn();
    const productQuery = d6Block.slice(
      d6Block.indexOf('dpp_snapshot_products_v1'),
      d6Block.indexOf('dpp_snapshot_products_v1') + 400,
    );
    expect(productQuery).not.toContain('geo_hash');
  });

  it('D6-P12 — visibility excluded from product projection', () => {
    const d6Block = d6BlockFn();
    const productQuery = d6Block.slice(
      d6Block.indexOf('dpp_snapshot_products_v1'),
      d6Block.indexOf('dpp_snapshot_products_v1') + 400,
    );
    expect(productQuery).not.toContain('visibility');
  });

  it('D6-P13 — manufacturerRegistrationNo excluded from product projection', () => {
    const d6Block = d6BlockFn();
    const productQuery = d6Block.slice(
      d6Block.indexOf('dpp_snapshot_products_v1'),
      d6Block.indexOf('dpp_snapshot_products_v1') + 400,
    );
    expect(productQuery).not.toContain('manufacturer_registration_no');
  });

  it('D6-P14 — certificationId excluded from certification projection', () => {
    const d6Block = d6BlockFn();
    const certQuery = d6Block.slice(
      d6Block.indexOf('dpp_snapshot_certifications_v1'),
      d6Block.indexOf('dpp_snapshot_certifications_v1') + 400,
    );
    expect(certQuery).not.toContain('certification_id');
  });

  it('D6-P15 — claim_value excluded (dpp_evidence_claims not queried in SQL)', () => {
    const d6Block = d6BlockFn();
    // dpp_evidence_claims must NOT appear in any FROM or JOIN clause (must not be queried).
    // It may appear in rationale comments — that is acceptable and expected.
    expect(d6Block).not.toMatch(/FROM\s+dpp_evidence_claims/);
    expect(d6Block).not.toMatch(/JOIN\s+dpp_evidence_claims/);
    // claim_value column must not appear in any SQL SELECT
    expect(d6Block).not.toMatch(/SELECT[\s\S]{0,300}claim_value/);
  });

  it('D6-P16 — aiExtractedClaimsCount fixed at 0 in D-6 (pending D-3/D-4 RLS fix)', () => {
    expect(d6BlockFn()).toContain('aiExtractedClaimsCount: 0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 (D6-QR) — Static: QR descriptor
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-QR — Static: QR descriptor', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D6-QR01 — qr field present in payload', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).toContain('qr: {');
  });

  it('D6-QR02 — qr.payloadUrl includes publicPassportId interpolation', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).toMatch(/payloadUrl:.*publicPassportId/);
  });

  it("D6-QR03 — qr.format is 'url'", () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).toMatch(/format:\s*'url'/);
  });

  it('D6-QR04 — no qrcode image generation (no qrcode package import)', () => {
    // No qrcode package should be imported anywhere in public.ts
    expect(src).not.toContain("'qrcode'");
    expect(src).not.toContain('"qrcode"');
    expect(src).not.toContain('QRCode');
  });

  it('D6-QR05 — qr.payloadUrl uses APP_PUBLIC_URL constant', () => {
    const d6Block = src.slice(src.indexOf('TECS-DPP-PUBLIC-QR-001'));
    expect(d6Block).toContain('APP_PUBLIC_URL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 (D6-DB) — DB integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-DB — DB integration', () => {
  it('D6-DB01 — migration file 20260509000000_tecs_dpp_d6_public_token exists', () => {
    expect(fs.existsSync(MIGRATION_D6_PATH)).toBe(true);
  });

  it('D6-DB02 — migration SQL contains D6 verifier block', () => {
    const sql = fs.readFileSync(MIGRATION_D6_PATH, 'utf-8');
    expect(sql).toContain('D6 VERIFIER');
    expect(sql).toContain('[D6 VERIFIER] PASS');
  });

  it('D6-DB03 — migration SQL references idx_dpp_passport_states_public_token', () => {
    const sql = fs.readFileSync(MIGRATION_D6_PATH, 'utf-8');
    expect(sql).toContain('idx_dpp_passport_states_public_token');
  });

  it.skipIf(!hasDb)('D6-DB04 — dpp_passport_states has public_token column', async () => {
    const prismaClient = new PrismaClient();
    try {
      const rows = await prismaClient.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dpp_passport_states'
          AND column_name = 'public_token'
      `;
      expect(rows.length).toBe(1);
    } finally {
      await prismaClient.$disconnect();
    }
  });

  it.skipIf(!hasDb)('D6-DB05 — public_token has unique constraint', async () => {
    const prismaClient = new PrismaClient();
    try {
      const rows = await prismaClient.$queryRaw<Array<{ conname: string }>>`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.dpp_passport_states'::regclass
          AND contype = 'u'
          AND conname = 'dpp_passport_states_public_token_unique'
      `;
      expect(rows.length).toBe(1);
    } finally {
      await prismaClient.$disconnect();
    }
  });

  it.skipIf(!hasDb)('D6-DB06 — texqtic_public_lookup has SELECT on dpp_passport_states', async () => {
    const prismaClient = new PrismaClient();
    try {
      const rows = await prismaClient.$queryRaw<Array<{ privilege_type: string }>>`
        SELECT privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'dpp_passport_states'
          AND grantee = 'texqtic_public_lookup'
          AND privilege_type = 'SELECT'
      `;
      expect(rows.length).toBeGreaterThanOrEqual(1);
    } finally {
      await prismaClient.$disconnect();
    }
  });

  it.skipIf(!hasDb)('D6-DB07 — RLS policy dpp_passport_states_public_lookup_select exists', async () => {
    const prismaClient = new PrismaClient();
    try {
      const rows = await prismaClient.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname FROM pg_policies
        WHERE tablename = 'dpp_passport_states'
          AND policyname = 'dpp_passport_states_public_lookup_select'
      `;
      expect(rows.length).toBe(1);
    } finally {
      await prismaClient.$disconnect();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 (D6-X) — Cross-slice coexistence
// ─────────────────────────────────────────────────────────────────────────────

describe('D6-X — Cross-slice coexistence', () => {
  let tenantSrc: string;
  let publicSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH)).toBe(true);
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    publicSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('D6-X01 — D-3 passport route still present in tenant.ts', () => {
    expect(tenantSrc).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport['"]/);
  });

  it('D6-X02 — D-4 evidence-claims GET route still present in tenant.ts', () => {
    expect(tenantSrc).toMatch(
      /fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-claims['"]/,
    );
  });

  it('D6-X03 — D-5 internal export route still present in tenant.ts', () => {
    expect(tenantSrc).toMatch(
      /fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport\/export['"]/,
    );
  });

  it('D6-X04 — TECS-DPP-EXPORT-SHARE-001 D-5 anchor still present in tenant.ts', () => {
    expect(tenantSrc).toContain('TECS-DPP-EXPORT-SHARE-001');
  });

  it('D6-X05 — TECS-DPP-PASSPORT-IDENTITY-001 D-3 anchor still present in tenant.ts', () => {
    expect(tenantSrc).toContain('TECS-DPP-PASSPORT-IDENTITY-001');
  });

  it('D6-X06 — TECS-DPP-PUBLIC-QR-001 D-6 anchor present in public.ts', () => {
    expect(publicSrc).toContain('TECS-DPP-PUBLIC-QR-001');
  });

  it('D6-X07 — D-5 route NOT accessible via /api/public prefix (not in public.ts)', () => {
    // D-5 export route must NOT appear in public.ts
    expect(publicSrc).not.toContain('/passport/export');
  });

  it('D6-X08 — D-6 migration file is distinct from D-4 migration', () => {
    // Ensure D-6 migration has its own directory
    expect(fs.existsSync(MIGRATION_D6_PATH)).toBe(true);
    expect(MIGRATION_D6_PATH).not.toEqual(MIGRATION_D5_PATH);
    const d6Sql = fs.readFileSync(MIGRATION_D6_PATH, 'utf-8');
    expect(d6Sql).toContain('D-6');
    expect(d6Sql).not.toContain('D-4');
  });
});
