/**
 * TECS-DPP-PASSPORT-FOUNDATION-001 D-2 — DPP snapshot view extensions
 *
 * Unit : TECS-DPP-VIEWS-EXTENSION-001
 * Slice: D-2 — Extend dpp_snapshot_lineage_v1 and dpp_snapshot_certifications_v1
 * Migration: 20260506000000_tecs_dpp_d2_view_extensions
 *
 * Test strategy:
 *   Group 1 — Static: migration file structure (no DB required)
 *   Group 2 — Static: tenant.ts row interface alignment (no DB required)
 *   Group 3 — DB: view column presence and security posture (gated by hasDb)
 *   Group 4 — Boundary: D-2 scope is view extensions only (no D-3+ contamination)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

// __dirname = server/src/__tests__ → ../../ = server/
const SERVER_ROOT = path.resolve(__dirname, '../../');
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260506000000_tecs_dpp_d2_view_extensions/migration.sql',
);
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: migration file structure
// ─────────────────────────────────────────────────────────────────────────────

describe('D-2 — Static: migration file structure', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH), `Migration not found: ${MIGRATION_PATH}`).toBe(true);
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('D2-S01 — migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('D2-S02 — wrapped in BEGIN/COMMIT transaction', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;/im);
  });

  it('D2-S03 — preflight DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d2_preflight\$/i);
  });

  it('D2-S04 — preflight checks transformation_id on traceability_edges', () => {
    expect(sql).toMatch(/traceability_edges.*transformation_id/s);
  });

  it('D2-S05 — preflight checks issued_at on certifications', () => {
    expect(sql).toMatch(/certifications.*issued_at/s);
  });

  it('D2-S06 — lineage view replacement present', () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.dpp_snapshot_lineage_v1/i);
  });

  it('D2-S07 — lineage view has security_invoker = true', () => {
    expect(sql).toMatch(/dpp_snapshot_lineage_v1[\s\S]{0,80}security_invoker\s*=\s*true/im);
  });

  it('D2-S08 — lineage CTE column list includes transformation_id', () => {
    expect(sql).toMatch(/transformation_id/);
  });

  it('D2-S09 — lineage anchor sets transformation_id to NULL::TEXT', () => {
    expect(sql).toMatch(/NULL::TEXT\s+AS\s+transformation_id/i);
  });

  it('D2-S10 — lineage recursive part selects e.transformation_id', () => {
    expect(sql).toMatch(/e\.transformation_id/i);
  });

  it('D2-S11 — lineage final SELECT includes transformation_id', () => {
    // The outer SELECT from lineage CTE must include transformation_id
    const finalSelect = sql.match(/FROM lineage[\s\S]+?ORDER BY/s)?.[0] ?? '';
    expect(finalSelect).toMatch(/transformation_id/);
  });

  it('D2-S12 — certifications view replacement present', () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.dpp_snapshot_certifications_v1/i);
  });

  it('D2-S13 — certifications view has security_invoker = true', () => {
    expect(sql).toMatch(/dpp_snapshot_certifications_v1[\s\S]{0,80}security_invoker\s*=\s*true/im);
  });

  it('D2-S14 — certifications view selects c.issued_at', () => {
    expect(sql).toMatch(/c\.issued_at/i);
  });

  it('D2-S15 — certifications view selects ls.state_key AS lifecycle_state_name', () => {
    expect(sql).toMatch(/ls\.state_key\s+AS\s+lifecycle_state_name/i);
  });

  it('D2-S16 — certifications view LEFT JOINs lifecycle_states on lifecycle_state_id', () => {
    expect(sql).toMatch(/LEFT JOIN public\.lifecycle_states ls/i);
    expect(sql).toMatch(/ls\.id\s*=\s*c\.lifecycle_state_id/i);
  });

  it('D2-S17 — grants re-issued for both views', () => {
    expect(sql).toMatch(/GRANT SELECT ON public\.dpp_snapshot_lineage_v1\s+TO texqtic_app/i);
    expect(sql).toMatch(/GRANT SELECT ON public\.dpp_snapshot_certifications_v1\s+TO texqtic_app/i);
  });

  it('D2-S18 — verifier DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d2_verifier\$/i);
  });

  it('D2-S19 — verifier checks transformation_id column in lineage view', () => {
    expect(sql).toMatch(/dpp_snapshot_lineage_v1.*transformation_id/s);
  });

  it('D2-S20 — verifier checks issued_at column in certifications view', () => {
    const verifierBlock = sql.match(/\$d2_verifier\$([\s\S]+?)\$d2_verifier\$/)?.[1] ?? '';
    expect(verifierBlock).toMatch(/dpp_snapshot_certifications_v1.*issued_at/s);
  });

  it('D2-S21 — verifier checks lifecycle_state_name column in certifications view', () => {
    const verifierBlock = sql.match(/\$d2_verifier\$([\s\S]+?)\$d2_verifier\$/)?.[1] ?? '';
    expect(verifierBlock).toMatch(/lifecycle_state_name/i);
  });

  it('D2-S22 — migration does NOT create new tables', () => {
    expect(sql).not.toMatch(/CREATE TABLE/i);
  });

  it('D2-S23 — migration does NOT modify dpp_snapshot_products_v1', () => {
    expect(sql).not.toMatch(/CREATE OR REPLACE VIEW public\.dpp_snapshot_products_v1/i);
  });

  it('D2-S24 — migration does NOT add passport_status or DPP passport columns', () => {
    expect(sql).not.toMatch(/passport_status/i);
    expect(sql).not.toMatch(/DppPassport/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: tenant.ts row interface alignment
// ─────────────────────────────────────────────────────────────────────────────

describe('D-2 — Static: tenant.ts row interface and query alignment', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D2-T01 — DppLineageRow interface includes transformation_id', () => {
    const ifaceBlock = src.match(/interface DppLineageRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/transformation_id/);
  });

  it('D2-T02 — DppLineageRow transformation_id is string | null', () => {
    const ifaceBlock = src.match(/interface DppLineageRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/transformation_id\s*:\s*string\s*\|\s*null/);
  });

  it('D2-T03 — DppCertRow interface includes lifecycle_state_name', () => {
    const ifaceBlock = src.match(/interface DppCertRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/lifecycle_state_name/);
  });

  it('D2-T04 — DppCertRow lifecycle_state_name is string | null', () => {
    const ifaceBlock = src.match(/interface DppCertRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/lifecycle_state_name\s*:\s*string\s*\|\s*null/);
  });

  it('D2-T05 — DppCertRow interface includes issued_at', () => {
    const ifaceBlock = src.match(/interface DppCertRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/issued_at/);
  });

  it('D2-T06 — DppCertRow issued_at is Date | null', () => {
    const ifaceBlock = src.match(/interface DppCertRow\s*\{([\s\S]+?)\}/)?.[1] ?? '';
    expect(ifaceBlock).toMatch(/issued_at\s*:\s*Date\s*\|\s*null/);
  });

  it('D2-T07 — lineage SELECT query includes transformation_id column', () => {
    // transformation_id is in the SELECT clause, which appears BEFORE FROM in SQL
    expect(src).toMatch(/transformation_id[\s\S]{0,200}FROM dpp_snapshot_lineage_v1/s);
  });

  it('D2-T08 — certs SELECT query includes lifecycle_state_name column', () => {
    // lifecycle_state_name is in the SELECT clause before FROM in SQL
    expect(src).toMatch(/lifecycle_state_name[\s\S]{0,200}FROM dpp_snapshot_certifications_v1/s);
  });

  it('D2-T09 — certs SELECT query includes issued_at column', () => {
    // issued_at is in the SELECT clause before FROM in SQL
    expect(src).toMatch(/issued_at[\s\S]{0,200}FROM dpp_snapshot_certifications_v1/s);
  });

  it('D2-T10 — response mapping includes transformationId from row.transformation_id', () => {
    expect(src).toMatch(/transformationId\s*:\s*row\.transformation_id/);
  });

  it('D2-T11 — response mapping includes lifecycleStateName from row.lifecycle_state_name', () => {
    expect(src).toMatch(/lifecycleStateName\s*:\s*row\.lifecycle_state_name/);
  });

  it('D2-T12 — response mapping includes issuedAt from row.issued_at', () => {
    expect(src).toMatch(/issuedAt\s*:\s*row\.issued_at/);
  });

  it('D2-T13 — DPP route path unchanged: /tenant/dpp/:nodeId', () => {
    expect(src).toMatch(/\/tenant\/dpp\/:nodeId/);
  });

  it('D2-T14 — route still uses tenantAuthMiddleware and databaseContextMiddleware', () => {
    // The route registration (not the comment above) has onRequest with both middleware.
    // The quoted route string '/tenant/dpp/:nodeId' is immediately followed by the onRequest config.
    expect(src).toMatch(/'\/tenant\/dpp\/:nodeId'[\s\S]{0,150}tenantAuthMiddleware/s);
    expect(src).toMatch(/'\/tenant\/dpp\/:nodeId'[\s\S]{0,150}databaseContextMiddleware/s);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — DB: view column presence and security posture
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('D-2 — DB: view column presence and security posture', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  it('D2-DB01 — dpp_snapshot_lineage_v1 exists in information_schema.views', async () => {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::int AS cnt FROM information_schema.views
       WHERE table_schema = 'public' AND table_name = 'dpp_snapshot_lineage_v1'
    `;
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it('D2-DB02 — dpp_snapshot_certifications_v1 exists in information_schema.views', async () => {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::int AS cnt FROM information_schema.views
       WHERE table_schema = 'public' AND table_name = 'dpp_snapshot_certifications_v1'
    `;
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it('D2-DB03 — dpp_snapshot_lineage_v1 has transformation_id column', async () => {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::int AS cnt FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'dpp_snapshot_lineage_v1'
         AND column_name  = 'transformation_id'
    `;
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it('D2-DB04 — dpp_snapshot_certifications_v1 has lifecycle_state_name column', async () => {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::int AS cnt FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'dpp_snapshot_certifications_v1'
         AND column_name  = 'lifecycle_state_name'
    `;
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it('D2-DB05 — dpp_snapshot_certifications_v1 has issued_at column', async () => {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::int AS cnt FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'dpp_snapshot_certifications_v1'
         AND column_name  = 'issued_at'
    `;
    expect(Number(rows[0].cnt)).toBe(1);
  });

  it('D2-DB06 — dpp_snapshot_lineage_v1 has security_invoker=true', async () => {
    const rows = await prisma.$queryRaw<{ has_si: boolean }[]>`
      SELECT COALESCE(reloptions @> ARRAY['security_invoker=true'::text], false) AS has_si
        FROM pg_class
       WHERE relname = 'dpp_snapshot_lineage_v1' AND relkind = 'v'
    `;
    expect(rows[0]?.has_si).toBe(true);
  });

  it('D2-DB07 — dpp_snapshot_certifications_v1 has security_invoker=true', async () => {
    const rows = await prisma.$queryRaw<{ has_si: boolean }[]>`
      SELECT COALESCE(reloptions @> ARRAY['security_invoker=true'::text], false) AS has_si
        FROM pg_class
       WHERE relname = 'dpp_snapshot_certifications_v1' AND relkind = 'v'
    `;
    expect(rows[0]?.has_si).toBe(true);
  });

  it('D2-DB08 — dpp_snapshot_lineage_v1 preserves all original columns', async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'dpp_snapshot_lineage_v1'
       ORDER BY ordinal_position
    `;
    const cols = rows.map(r => r.column_name);
    for (const expected of ['root_node_id', 'node_id', 'parent_node_id', 'depth', 'edge_type', 'org_id', 'created_at', 'transformation_id']) {
      expect(cols, `column ${expected} missing from lineage view`).toContain(expected);
    }
  });

  it('D2-DB09 — dpp_snapshot_certifications_v1 preserves all original columns', async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'dpp_snapshot_certifications_v1'
       ORDER BY ordinal_position
    `;
    const cols = rows.map(r => r.column_name);
    for (const expected of ['node_id', 'certification_id', 'certification_type', 'lifecycle_state_id', 'lifecycle_state_name', 'issued_at', 'expiry_date', 'org_id']) {
      expect(cols, `column ${expected} missing from certifications view`).toContain(expected);
    }
  });

  it('D2-DB10 — dpp_snapshot_products_v1 is unchanged (no D-2 fields)', async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'dpp_snapshot_products_v1'
       ORDER BY ordinal_position
    `;
    const cols = rows.map(r => r.column_name);
    expect(cols).not.toContain('transformation_id');
    expect(cols).not.toContain('lifecycle_state_name');
    expect(cols).not.toContain('issued_at');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Boundary: D-2 scope is view extensions only
// ─────────────────────────────────────────────────────────────────────────────

describe('D-2 — Boundary: scope is view extensions only', () => {
  let sql: string;
  let src: string;

  beforeAll(() => {
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D2-B01 — migration does not create dpp_evidence_claims or dpp_passport_states', () => {
    expect(sql).not.toMatch(/dpp_evidence_claims/i);
    expect(sql).not.toMatch(/dpp_passport_states/i);
  });

  it('D2-B02 — migration does not reference passport_status field', () => {
    expect(sql).not.toMatch(/passport_status/i);
  });

  it('D2-B03 — tenant.ts does not gain a new /passport route', () => {
    // Confirm no new DPP passport route was added
    const passportRoutes = src.match(/\/tenant\/dpp\/:nodeId\/passport/g) ?? [];
    expect(passportRoutes.length).toBe(0);
  });

  it('D2-B04 — tenant.ts does not gain a new /public/dpp route', () => {
    expect(src).not.toMatch(/\/public\/dpp\//);
  });
});
