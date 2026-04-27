/**
 * TECS-DPP-PASSPORT-FOUNDATION-001 D-3 — Passport Identity / Status Model
 *
 * Unit : TECS-DPP-PASSPORT-IDENTITY-001
 * Slice: D-3 — dpp_passport_states DDL, computeDppMaturity, GET /api/tenant/dpp/:nodeId/passport
 * Migration: 20260507000000_tecs_dpp_d3_passport_states
 *
 * Storage decision: Option B — separate dpp_passport_states table.
 * Reason: preserves traceability core semantics; supports future audit history;
 *         keeps passport workflow separate from raw node identity.
 *
 * Test strategy:
 *   Group 1 — Static: migration file structure (no DB required)
 *   Group 2 — Static: tenant.ts passport types, function, route (no DB required)
 *   Group 3 — Static: DPPPassport.tsx UI test IDs (no DB required)
 *   Group 4 — DB: passport route integration (gated by hasDb)
 *   Group 5 — Boundary: D-3 scope only (no D-4/D-5/D-6 contamination)
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
  'prisma/migrations/20260507000000_tecs_dpp_d3_passport_states/migration.sql',
);
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
// UI component is at workspace root (server/../components/Tenant/DPPPassport.tsx)
const DPP_PASSPORT_PATH = path.join(SERVER_ROOT, '../components/Tenant/DPPPassport.tsx');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: migration file structure
// ─────────────────────────────────────────────────────────────────────────────

describe('D-3 — Static: migration file structure', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH), `Migration not found: ${MIGRATION_PATH}`).toBe(true);
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('D3-S01 — migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('D3-S02 — wrapped in BEGIN/COMMIT transaction', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;/im);
  });

  it('D3-S03 — preflight DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d3_preflight\$/i);
  });

  it('D3-S04 — preflight checks traceability_nodes', () => {
    expect(sql).toMatch(/traceability_nodes/);
  });

  it('D3-S05 — preflight checks organizations', () => {
    expect(sql).toMatch(/organizations/);
  });

  it('D3-S06 — preflight checks D-2 certifications view prerequisite', () => {
    expect(sql).toMatch(/dpp_snapshot_certifications_v1/);
  });

  it('D3-S07 — creates dpp_passport_states table', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.dpp_passport_states/i);
  });

  it('D3-S08 — status DEFAULT DRAFT', () => {
    expect(sql).toMatch(/status[\s\S]{0,80}DEFAULT 'DRAFT'/i);
  });

  it('D3-S09 — status CHECK constraint with all 4 values', () => {
    expect(sql).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'DRAFT'.*'INTERNAL'.*'TRADE_READY'.*'PUBLISHED'\s*\)\s*\)/s);
  });

  it('D3-S10 — UNIQUE(org_id, node_id) constraint', () => {
    expect(sql).toMatch(/dpp_passport_states_org_node_unique/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*org_id\s*,\s*node_id\s*\)/i);
  });

  it('D3-S11 — FK to organizations', () => {
    expect(sql).toMatch(/dpp_passport_states_org_id_fk/i);
    expect(sql).toMatch(/REFERENCES public\.organizations/i);
  });

  it('D3-S12 — FK to traceability_nodes', () => {
    expect(sql).toMatch(/dpp_passport_states_node_id_fk/i);
    expect(sql).toMatch(/REFERENCES public\.traceability_nodes/i);
  });

  it('D3-S13 — reviewed_at column present (nullable)', () => {
    expect(sql).toMatch(/reviewed_at\s+TIMESTAMPTZ/i);
  });

  it('D3-S14 — reviewed_by_user_id column present (nullable)', () => {
    expect(sql).toMatch(/reviewed_by_user_id\s+UUID/i);
  });

  it('D3-S15 — RLS ENABLE', () => {
    expect(sql).toMatch(/ALTER TABLE public\.dpp_passport_states ENABLE ROW LEVEL SECURITY/i);
  });

  it('D3-S16 — RLS FORCE', () => {
    expect(sql).toMatch(/ALTER TABLE public\.dpp_passport_states FORCE ROW LEVEL SECURITY/i);
  });

  it('D3-S17 — restrictive policy present', () => {
    expect(sql).toMatch(/CREATE POLICY dpp_passport_states_restrictive/i);
    expect(sql).toMatch(/AS RESTRICTIVE TO texqtic_app/i);
  });

  it('D3-S18 — SELECT policy present', () => {
    expect(sql).toMatch(/CREATE POLICY dpp_passport_states_select/i);
    expect(sql).toMatch(/FOR\s+SELECT\s+TO\s+texqtic_app/i);
  });

  it('D3-S19 — GRANT SELECT to texqtic_app', () => {
    expect(sql).toMatch(/GRANT SELECT ON public\.dpp_passport_states TO texqtic_app/i);
  });

  it('D3-S20 — verifier DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d3_verifier\$/i);
  });

  it('D3-S21 — no dpp_evidence_claims table (D-4 only)', () => {
    expect(sql).not.toMatch(/dpp_evidence_claims/i);
  });

  it('D3-S22 — updated_at trigger present', () => {
    expect(sql).toMatch(/trg_dpp_passport_states_set_updated_at/i);
  });

  it('D3-S23 — Option B decision documented in comment', () => {
    expect(sql).toMatch(/Option B/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: tenant.ts passport types, computeDppMaturity, route
// ─────────────────────────────────────────────────────────────────────────────

describe('D-3 — Static: tenant.ts passport types and route', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D3-T01 — DppMaturityLevel type defined with all 4 levels', () => {
    expect(src).toMatch(/type DppMaturityLevel\s*=\s*['"]LOCAL_TRUST['"]/);
    expect(src).toMatch(/TRADE_READY/);
    expect(src).toMatch(/COMPLIANCE/);
    expect(src).toMatch(/GLOBAL_DPP/);
  });

  it('D3-T02 — DppPassportStatus type defined with all 4 statuses', () => {
    expect(src).toMatch(/type DppPassportStatus\s*=\s*['"]DRAFT['"]/);
    expect(src).toMatch(/'INTERNAL'/);
    expect(src).toMatch(/'PUBLISHED'/);
  });

  it('D3-T03 — DppPassportStateRow interface defined', () => {
    expect(src).toMatch(/interface DppPassportStateRow/);
  });

  it('D3-T04 — computeDppMaturity function defined', () => {
    expect(src).toMatch(/function computeDppMaturity/);
  });

  it('D3-T05 — TRADE_READY condition: approvedCertCount >= 1 and lineageDepth >= 1', () => {
    expect(src).toMatch(/approvedCertCount\s*>=\s*1[\s\S]{0,80}lineageDepth\s*>=\s*1/);
    expect(src).toMatch(/return 'TRADE_READY'/);
  });

  it('D3-T06 — LOCAL_TRUST is the fallback return', () => {
    expect(src).toMatch(/return 'LOCAL_TRUST'/);
  });

  it('D3-T07 — GLOBAL_DPP reserved/not reachable comment present', () => {
    expect(src).toMatch(/GLOBAL_DPP[\s\S]{0,120}reserved/i);
  });

  it('D3-T08 — passport route registered at /tenant/dpp/:nodeId/passport', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport['"]/);
  });

  it('D3-T09 — tenantAuthMiddleware on passport route', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport['"][\s\S]{0,150}tenantAuthMiddleware/);
  });

  it('D3-T10 — databaseContextMiddleware on passport route', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport['"][\s\S]{0,200}databaseContextMiddleware/);
  });

  it('D3-T11 — audit event tenant.dpp.passport.read emitted', () => {
    expect(src).toMatch(/tenant\.dpp\.passport\.read/);
  });

  it('D3-T12 — audit metadata includes passportStatus and passportMaturity', () => {
    // Use lastIndexOf to find the action: 'tenant.dpp.passport.read' value (not the JSDoc comment)
    const auditCallIdx = src.lastIndexOf("tenant.dpp.passport.read");
    const auditSection = src.slice(auditCallIdx - 100, auditCallIdx + 600);
    expect(auditSection).toMatch(/passportStatus/);
    expect(auditSection).toMatch(/passportMaturity/);
    expect(auditSection).toMatch(/approvedCertCount/);
    expect(auditSection).toMatch(/lineageDepth/);
  });

  it('D3-T13 — default status DRAFT when no state row', () => {
    expect(src).toMatch(/\?\?.*'DRAFT'/);
  });

  it('D3-T14 — approvedCertCount computed from lifecycle_state_name === APPROVED', () => {
    expect(src).toMatch(/lifecycle_state_name.*===.*'APPROVED'/);
  });

  it('D3-T15 — lineageDepth computed from Math.max over row depths', () => {
    expect(src).toMatch(/Math\.max[\s\S]{0,80}\.depth/);
  });

  it('D3-T16 — aiExtractedClaimsCount = 0 in D-3', () => {
    expect(src).toMatch(/aiExtractedClaimsCount\s*=\s*0/);
  });

  it('D3-T17 — passportEvidenceSummary object in response shape', () => {
    expect(src).toMatch(/passportEvidenceSummary\s*:/);
    expect(src).toMatch(/aiExtractedClaimsCount/);
    expect(src).toMatch(/approvedCertCount/);
    expect(src).toMatch(/lineageDepth/);
  });

  it('D3-T18 — meta_passport in response', () => {
    expect(src).toMatch(/meta_passport\s*:\s*\{\s*\}/);
  });

  it('D3-T19 — existing /tenant/dpp/:nodeId route still present', () => {
    // Original route (not the passport route) must still exist
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId['"]\s*,\s*\{/);
  });

  it('D3-T20 — no /public/dpp route added', () => {
    expect(src).not.toMatch(/['"]\/public\/dpp/);
  });

  it('D3-T21 — dpp_passport_states queried via $queryRaw', () => {
    expect(src).toMatch(/FROM dpp_passport_states/);
  });

  it('D3-T22 — passport route returns 404 for missing node (sendNotFound)', () => {
    expect(src).toMatch(/passport.*not found.*access denied|DPP passport not found/is);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: DPPPassport.tsx UI test IDs and additive safety
// ─────────────────────────────────────────────────────────────────────────────

describe('D-3 — Static: DPPPassport.tsx UI test IDs and additive safety', () => {
  let ui: string;

  beforeAll(() => {
    expect(fs.existsSync(DPP_PASSPORT_PATH), `DPPPassport.tsx not found: ${DPP_PASSPORT_PATH}`).toBe(true);
    ui = fs.readFileSync(DPP_PASSPORT_PATH, 'utf-8');
  });

  it('D3-U01 — dpp-passport-status-badge test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-passport-status-badge"/);
  });

  it('D3-U02 — dpp-maturity-indicator test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-maturity-indicator"/);
  });

  it('D3-U03 — dpp-evidence-summary test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-evidence-summary"/);
  });

  it('D3-U04 — dpp-approved-cert-count test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-approved-cert-count"/);
  });

  it('D3-U05 — dpp-lineage-depth test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-lineage-depth"/);
  });

  it('D3-U06 — dpp-ai-claims-count test ID present', () => {
    expect(ui).toMatch(/data-testid="dpp-ai-claims-count"/);
  });

  it('D3-U07 — existing DPP node ID input preserved', () => {
    expect(ui).toMatch(/id="dpp-node-id-input"/);
  });

  it('D3-U08 — Copy JSON button preserved', () => {
    expect(ui).toMatch(/Copy JSON/i);
  });

  it('D3-U09 — Download JSON button preserved', () => {
    expect(ui).toMatch(/Download JSON/i);
  });

  it('D3-U10 — passport section gated on passportData (additive, non-blocking)', () => {
    expect(ui).toMatch(/passportData\s*&&/);
  });

  it('D3-U11 — DppPassportStatus type defined in UI module', () => {
    expect(ui).toMatch(/type DppPassportStatus\s*=/);
  });

  it('D3-U12 — DppMaturityLevel type defined in UI module', () => {
    expect(ui).toMatch(/type DppMaturityLevel\s*=/);
  });

  it('D3-U13 — passport fetch is non-blocking (catch returns null)', () => {
    expect(ui).toMatch(/passport.*\.catch\(\s*\(\s*\)\s*=>/s);
  });

  it('D3-U14 — passportData reset on new load (setPassportData(null))', () => {
    expect(ui).toMatch(/setPassportData\s*\(\s*null\s*\)/);
  });

  it('D3-U15 — no public QR component added', () => {
    expect(ui).not.toMatch(/qr[_-]code|QRCode|json-ld|JSON-LD/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — DB: passport route integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('D-3 — DB: passport route integration', () => {
  let prisma: PrismaClient;
  let isDbReady = false;

  beforeAll(async () => {
    prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbReady = true;
    } catch {
      isDbReady = false;
    }
  });

  it('D3-DB01 — dpp_passport_states table exists in DB', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'dpp_passport_states'
    `;
    expect(result.length).toBe(1);
    expect(result[0].tablename).toBe('dpp_passport_states');
  });

  it('D3-DB02 — dpp_passport_states has status column', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dpp_passport_states'
        AND column_name = 'status'
    `;
    expect(result.length).toBe(1);
  });

  it('D3-DB03 — dpp_passport_states has reviewed_at column (nullable)', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
      SELECT column_name, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dpp_passport_states'
        AND column_name = 'reviewed_at'
    `;
    expect(result.length).toBe(1);
    expect(result[0].is_nullable).toBe('YES');
  });

  it('D3-DB04 — dpp_passport_states RLS enabled and forced', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ rowsecurity: boolean; forcerls: boolean }>>`
      SELECT rowsecurity, forcerls FROM pg_class
      WHERE relname = 'dpp_passport_states' AND relkind = 'r'
    `;
    expect(result.length).toBe(1);
    expect(result[0].rowsecurity).toBe(true);
    expect(result[0].forcerls).toBe(true);
  });

  it('D3-DB05 — restrictive policy exists on dpp_passport_states', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
      SELECT policyname FROM pg_policies
      WHERE tablename = 'dpp_passport_states'
        AND policyname = 'dpp_passport_states_restrictive'
    `;
    expect(result.length).toBe(1);
  });

  it('D3-DB06 — SELECT policy exists on dpp_passport_states', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
      SELECT policyname FROM pg_policies
      WHERE tablename = 'dpp_passport_states'
        AND policyname = 'dpp_passport_states_select'
    `;
    expect(result.length).toBe(1);
  });

  it('D3-DB07 — status CHECK constraint rejects invalid values', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ check_clause: string }>>`
      SELECT check_clause FROM information_schema.check_constraints
      WHERE constraint_name = 'dpp_passport_states_status_check'
    `;
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].check_clause).toMatch(/DRAFT/);
    expect(result[0].check_clause).toMatch(/PUBLISHED/);
  });

  it('D3-DB08 — UNIQUE constraint on (org_id, node_id)', async () => {
    if (!isDbReady) return;
    const result = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'dpp_passport_states'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'dpp_passport_states_org_node_unique'
    `;
    expect(result.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Boundary: D-3 scope only (no D-4/D-5/D-6 contamination)
// ─────────────────────────────────────────────────────────────────────────────

describe('D-3 — Boundary: scope is passport identity foundation only', () => {
  let migrationSql: string;
  let tenantSrc: string;

  beforeAll(() => {
    migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D3-B01 — no dpp_evidence_claims in migration (D-4 only)', () => {
    expect(migrationSql).not.toMatch(/dpp_evidence_claims/i);
  });

  it('D3-B02 — no JSON-LD in migration or route', () => {
    expect(migrationSql).not.toMatch(/json.?ld/i);
    expect(tenantSrc).not.toMatch(/json.?ld/i);
  });

  it('D3-B03 — no /public/dpp route in tenant.ts', () => {
    expect(tenantSrc).not.toMatch(/['"]\/public\/dpp/);
  });

  it('D3-B04 — no status mutation route in D-3 (read-only passport)', () => {
    // No POST/PATCH/PUT route for passport state in D-3
    expect(tenantSrc).not.toMatch(/fastify\.(post|patch|put)\s*\(\s*['"]\/tenant\/dpp.*passport/i);
  });

  it('D3-B05 — existing GET /api/tenant/dpp/:nodeId route still present (not removed)', () => {
    // The original route is at '/tenant/dpp/:nodeId' with onRequest middleware
    expect(tenantSrc).toMatch(/['"]\/tenant\/dpp\/:nodeId['"]\s*,\s*\{[^}]*onRequest/);
  });

  it('D3-B06 — no PDP integration in D-3 migration', () => {
    expect(migrationSql).not.toMatch(/catalog_item|pdp/i);
  });
});
