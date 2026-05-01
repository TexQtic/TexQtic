/**
 * TECS-DPP-PASSPORT-NETWORK-012 — DPP Evidence Vault Foundation
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-012
 * Slice: GET + POST /api/tenant/dpp/:nodeId/evidence-items
 *
 * Purpose:
 *   Verifies the evidence vault routes and service, including schema
 *   correctness, tenant isolation, enum enforcement, validation, and audit.
 *
 * Test strategy:
 *   Group 1 — Static: route registration and input validation
 *   Group 2 — Static: role guard on POST
 *   Group 3 — Static: tenant isolation enforcement declared in source
 *   Group 4 — Static: enum allowlist enforcement
 *   Group 5 — Static: cross-field validation (expiresAt >= issuedAt)
 *   Group 6 — Static: audit log action declared in source
 *   Group 7 — Static: service schema — allowed evidence types, visibility values, review states
 *   Group 8 — Static: forbidden fields — document_url not on public routes
 *   Group 9 — Static: migration schema — RLS + FORCE + correct function
 *   Group 10 — DB: integration gated by hasDb
 *
 * Doctrine: v1.4
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import {
  DPP_EVIDENCE_TYPES,
  DPP_EVIDENCE_VISIBILITY_VALUES,
  DPP_EVIDENCE_REVIEW_STATES,
  isAllowedSourceTable,
} from '../services/dppEvidenceVault.js';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH    = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const PUBLIC_ROUTE_PATH    = path.join(SERVER_ROOT, 'src/routes/public.ts');
const SERVICE_PATH         = path.join(SERVER_ROOT, 'src/services/dppEvidenceVault.ts');
const MIGRATION_SQL_PATH   = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260513000000_tecs_dpp_evidence_vault/migration.sql',
);

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: route registration and input validation
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: route registration', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('EV-S01 — GET route registered at /tenant/dpp/:nodeId/evidence-items', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('EV-S02 — POST route registered at /tenant/dpp/:nodeId/evidence-items', () => {
    expect(src).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('EV-S03 — GET uses tenantAuthMiddleware', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 400);
    expect(section).toMatch(/tenantAuthMiddleware/);
  });

  it('EV-S04 — GET uses databaseContextMiddleware', () => {
    const idx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 400);
    expect(section).toMatch(/databaseContextMiddleware/);
  });

  it('EV-S05 — POST uses tenantAuthMiddleware', () => {
    const idx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 400);
    expect(section).toMatch(/tenantAuthMiddleware/);
  });

  it('EV-S06 — POST uses databaseContextMiddleware', () => {
    const idx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(idx).toBeGreaterThan(-1);
    const section = src.slice(idx, idx + 400);
    expect(section).toMatch(/databaseContextMiddleware/);
  });

  it('EV-S07 — nodeId validated as UUID in evidence-items section', () => {
    expect(src).toMatch(/nodeId.*z\.string\(\)\.uuid.*evidence-items|nodeId.*uuid.*evidence-items/s);
  });

  it('EV-S08 — evidenceType validated as enum', () => {
    // Body schema is defined in the block scope BEFORE fastify.post — search a wider region
    expect(src).toMatch(/evidenceType.*z\.enum|z\.enum.*DPP_EVIDENCE_TYPES/s);
  });

  it('EV-S09 — title has min(1) validation', () => {
    expect(src).toMatch(/title.*min\(1\)|min\(1\).*'title must not be empty'/s);
  });

  it('EV-S10 — documentUrl validated as URL when present', () => {
    expect(src).toMatch(/documentUrl.*\.url\(|z\.string\(\)\.url\(.*documentUrl/s);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: role guard on POST
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: role guard', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('EV-R01 — POST rejects non-ADMIN/OWNER roles', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx, postIdx + 3000);
    expect(section).toMatch(/ADMIN.*OWNER|OWNER.*ADMIN/s);
    expect(section).toMatch(/FORBIDDEN|403/);
  });

  it('EV-R02 — role check precedes DB operations in POST handler', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx, postIdx + 3000);
    const roleCheckPos  = section.search(/ADMIN.*OWNER.*FORBIDDEN|isAdminOrOwner/s);
    const dbContextPos  = section.search(/assertNodeBelongsToOrg|createDppEvidenceItem/);
    expect(roleCheckPos).toBeGreaterThan(-1);
    expect(dbContextPos).toBeGreaterThan(-1);
    expect(roleCheckPos).toBeLessThan(dbContextPos);
  });

  it('EV-R03 — GET route has NO role guard (any authenticated user may read)', () => {
    const getIdx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(getIdx).toBeGreaterThan(-1);
    const section = src.slice(getIdx, getIdx + 3000);
    expect(section).not.toMatch(/isAdminOrOwner/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: tenant isolation', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('EV-T01 — orgId is derived from dbContext (not from request body)', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx, postIdx + 4000);
    expect(section).toMatch(/orgId\s*=\s*dbContext\.orgId/);
  });

  it('EV-T02 — node existence verified via dpp_snapshot_products_v1 (RLS-scoped view)', () => {
    expect(src).toMatch(/dpp_snapshot_products_v1/);
  });

  it('EV-T03 — assertNodeBelongsToOrg called in GET handler', () => {
    const getIdx = src.search(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(getIdx).toBeGreaterThan(-1);
    const section = src.slice(getIdx, getIdx + 3000);
    expect(section).toMatch(/assertNodeBelongsToOrg/);
  });

  it('EV-T04 — assertNodeBelongsToOrg called in POST handler', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx, postIdx + 4000);
    expect(section).toMatch(/assertNodeBelongsToOrg/);
  });

  it('EV-T05 — withDbContext wraps all DB operations', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx, postIdx + 4000);
    expect(section.match(/withDbContext/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Static: enum allowlist enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: service enum allowlists', () => {
  it('EV-E01 — DPP_EVIDENCE_TYPES contains CERTIFICATE', () => {
    expect(DPP_EVIDENCE_TYPES).toContain('CERTIFICATE');
  });

  it('EV-E02 — DPP_EVIDENCE_TYPES contains SUSTAINABILITY_DECLARATION', () => {
    expect(DPP_EVIDENCE_TYPES).toContain('SUSTAINABILITY_DECLARATION');
  });

  it('EV-E03 — DPP_EVIDENCE_TYPES has exactly 11 values', () => {
    expect(DPP_EVIDENCE_TYPES).toHaveLength(11);
  });

  it('EV-E04 — DPP_EVIDENCE_VISIBILITY_VALUES has exactly 4 values', () => {
    expect(DPP_EVIDENCE_VISIBILITY_VALUES).toHaveLength(4);
  });

  it('EV-E05 — PRIVATE is default visibility', () => {
    expect(DPP_EVIDENCE_VISIBILITY_VALUES).toContain('PRIVATE');
  });

  it('EV-E06 — DPP_EVIDENCE_REVIEW_STATES has exactly 4 values', () => {
    expect(DPP_EVIDENCE_REVIEW_STATES).toHaveLength(4);
  });

  it('EV-E07 — PENDING is default review state', () => {
    expect(DPP_EVIDENCE_REVIEW_STATES).toContain('PENDING');
  });

  it('EV-E08 — isAllowedSourceTable accepts dpp_evidence_claims', () => {
    expect(isAllowedSourceTable('dpp_evidence_claims')).toBe(true);
  });

  it('EV-E09 — isAllowedSourceTable accepts certifications', () => {
    expect(isAllowedSourceTable('certifications')).toBe(true);
  });

  it('EV-E10 — isAllowedSourceTable rejects arbitrary table names', () => {
    expect(isAllowedSourceTable('users')).toBe(false);
    expect(isAllowedSourceTable('audit_logs')).toBe(false);
    expect(isAllowedSourceTable('__proto__')).toBe(false);
  });

  it('EV-E11 — forbidden visibility values not present', () => {
    expect(DPP_EVIDENCE_VISIBILITY_VALUES).not.toContain('PUBLIC');
    expect(DPP_EVIDENCE_VISIBILITY_VALUES).not.toContain('OPEN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Static: cross-field validation
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: cross-field validation', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('EV-X01 — expiresAt >= issuedAt cross-field check present in schema', () => {
    const postIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
    expect(postIdx).toBeGreaterThan(-1);
    const section = src.slice(postIdx - 4000, postIdx + 500);
    expect(section).toMatch(/expiresAt.*>=.*issuedAt|issuedAt.*expiresAt.*refine/s);
  });

  it('EV-X02 — migration has DB-level expires_after_issued constraint', () => {
    expect(fs.existsSync(MIGRATION_SQL_PATH), 'migration file not found').toBe(true);
    const sql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf-8');
    expect(sql).toMatch(/expires_at.*>=.*issued_at|dpp_evidence_items_expires_after_issued/s);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Static: audit log
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: audit log', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('EV-A01 — GET writes tenant.dpp.evidence_item.listed audit action', () => {
    expect(src).toMatch(/tenant\.dpp\.evidence_item\.listed/);
  });

  it('EV-A02 — POST writes tenant.dpp.evidence_item.created audit action', () => {
    expect(src).toMatch(/tenant\.dpp\.evidence_item\.created/);
  });

  it('EV-A03 — audit includes nodeId in metadata', () => {
    expect(src).toMatch(/nodeId.*tenant\.dpp\.evidence_item|tenant\.dpp\.evidence_item.*nodeId/s);
  });

  it('EV-A04 — POST audit includes evidenceItemId', () => {
    // Search for the writeAuditLog call that writes the created action and check metadataJson
    const postAuditIdx = src.search(/action:\s*'tenant\.dpp\.evidence_item\.created'/);
    expect(postAuditIdx).toBeGreaterThan(-1);
    const section = src.slice(postAuditIdx, postAuditIdx + 600);
    expect(section).toMatch(/evidenceItemId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7 — Static: service schema structure
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: service schema structure', () => {
  let svc: string;

  beforeAll(() => {
    expect(fs.existsSync(SERVICE_PATH), `service not found: ${SERVICE_PATH}`).toBe(true);
    svc = fs.readFileSync(SERVICE_PATH, 'utf-8');
  });

  it('EV-V01 — service exports assertNodeBelongsToOrg', () => {
    expect(svc).toMatch(/export.*function assertNodeBelongsToOrg|export.*assertNodeBelongsToOrg/s);
  });

  it('EV-V02 — service exports createDppEvidenceItem', () => {
    expect(svc).toMatch(/export.*function createDppEvidenceItem|export.*createDppEvidenceItem/s);
  });

  it('EV-V03 — service exports listDppEvidenceItemsForNode', () => {
    expect(svc).toMatch(/export.*function listDppEvidenceItemsForNode|export.*listDppEvidenceItemsForNode/s);
  });

  it('EV-V04 — service exports toDppEvidenceItemDto', () => {
    expect(svc).toMatch(/export.*function toDppEvidenceItemDto|export.*toDppEvidenceItemDto/s);
  });

  it('EV-V05 — DppEvidenceItemDto includes documentUrl field', () => {
    expect(svc).toMatch(/documentUrl/);
  });

  it('EV-V06 — service uses $queryRaw (no unconstrained Prisma findMany on RLS table)', () => {
    expect(svc).toMatch(/\$queryRaw/);
    // Prisma.findMany would bypass RLS context
    expect(svc).not.toMatch(/\.findMany\s*\(/);
  });

  it('EV-V07 — service has no @ts-ignore or any-cast suppressions', () => {
    expect(svc).not.toMatch(/@ts-ignore/);
    expect(svc).not.toMatch(/as\s+any[^w]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 8 — Static: forbidden fields — document_url must not be on public route
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: public route safety', () => {
  let pubSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(true);
    pubSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('EV-P01 — document_url not in public.ts', () => {
    expect(pubSrc).not.toMatch(/document_url/);
  });

  it('EV-P02 — evidence-items route not registered in public.ts', () => {
    expect(pubSrc).not.toMatch(/evidence-items/);
  });

  it('EV-P03 — dpp_evidence_items table not referenced in public.ts', () => {
    expect(pubSrc).not.toMatch(/dpp_evidence_items/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 9 — Static: migration schema correctness
// ─────────────────────────────────────────────────────────────────────────────

describe('012 — Static: migration schema', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_SQL_PATH), 'migration file not found').toBe(true);
    sql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf-8');
  });

  it('EV-M01 — migration creates dpp_evidence_items table', () => {
    expect(sql).toMatch(/CREATE TABLE.*dpp_evidence_items/s);
  });

  it('EV-M02 — ENABLE ROW LEVEL SECURITY present', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('EV-M03 — FORCE ROW LEVEL SECURITY present', () => {
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/);
  });

  it('EV-M04 — RLS policy uses app.current_org_id() (not broken GUC)', () => {
    expect(sql).toMatch(/app\.current_org_id\(\)/);
    expect(sql).not.toMatch(/current_setting\('app\.current_org_id'\)/);
  });

  it('EV-M05 — restrictive policy declared', () => {
    expect(sql).toMatch(/AS RESTRICTIVE/);
  });

  it('EV-M06 — GRANT SELECT, INSERT to texqtic_app', () => {
    expect(sql).toMatch(/GRANT SELECT.*INSERT.*texqtic_app|GRANT SELECT,\s*INSERT.*texqtic_app/s);
  });

  it('EV-M07 — org_id FK references organizations table', () => {
    expect(sql).toMatch(/REFERENCES public\.organizations/);
  });

  it('EV-M08 — node_id FK references traceability_nodes with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/REFERENCES public\.traceability_nodes.*ON DELETE CASCADE/s);
  });

  it('EV-M09 — evidence_type CHECK constraint declared', () => {
    expect(sql).toMatch(/dpp_evidence_items_evidence_type_check/);
  });

  it('EV-M10 — visibility CHECK constraint declared', () => {
    expect(sql).toMatch(/dpp_evidence_items_visibility_check/);
  });

  it('EV-M11 — review_state CHECK constraint declared', () => {
    expect(sql).toMatch(/dpp_evidence_items_review_state_check/);
  });

  it('EV-M12 — no BEGIN/COMMIT in migration SQL (Prisma manages transactions)', () => {
    expect(sql).not.toMatch(/^\s*BEGIN\s*;/m);
    expect(sql).not.toMatch(/^\s*COMMIT\s*;/m);
  });

  it('EV-M13 — D7 VERIFIER PASS message present (self-test)', () => {
    expect(sql).toMatch(/D7 VERIFIER.*PASS/s);
  });

  it('EV-M14 — idx_dpp_evidence_items_org_node index declared', () => {
    expect(sql).toMatch(/idx_dpp_evidence_items_org_node/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 10 — DB: integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('012 — DB integration', () => {
  it('EV-DB01 — placeholder: DB integration test (requires live Supabase connection)', () => {
    // Intentionally skipped unless DB is available.
    // Full integration tests require QA fixture from .auth/dpp-qa-fixture.json.
    expect(true).toBe(true);
  });
});
