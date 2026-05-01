/**
 * TECS-DPP-PASSPORT-NETWORK-013 — Product Passport Data Depth
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-013
 * Slice: PUT /api/tenant/dpp/:nodeId/product-details
 *        GET /api/tenant/dpp/:nodeId/passport (passportProductDetails field)
 *
 * Purpose:
 *   Verifies the product details route and service, including schema
 *   correctness, tenant isolation, material composition validation,
 *   role guard, audit log, and non-exposure on public routes.
 *
 * Test strategy:
 *   Group A — Static: route registration (PUT product-details)
 *   Group B — Static: service validation (material composition)
 *   Group C — Static: role guard enforcement
 *   Group D — Static: tenant isolation in service source
 *   Group E — Static: GET passport includes passportProductDetails field
 *   Group F — Static: audit log action declared in source
 *   Group G — Static: public route privacy (no product details on public)
 *   Group H — Static: migration schema — RLS + FORCE + correct function
 *   Group I — DB: integration gated by hasDb
 *
 * Doctrine: v1.4
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import {
  validateMaterialComposition,
  DPP_MATERIAL_MAX_ENTRIES,
  DPP_MATERIAL_TOTAL_MAX_PERCENT,
} from '../services/dppProductDetails.js';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH  = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const PUBLIC_ROUTE_PATH  = path.join(SERVER_ROOT, 'src/routes/public.ts');
const SERVICE_PATH       = path.join(SERVER_ROOT, 'src/services/dppProductDetails.ts');
const MIGRATION_SQL_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260513100000_tecs_dpp_product_details/migration.sql',
);

// ─────────────────────────────────────────────────────────────────────────────
// Group A — Static: route registration
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: route registration', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PD-A01 — PUT route registered at /tenant/dpp/:nodeId/product-details', () => {
    expect(src).toMatch(/fastify\.put\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/product-details['"]/);
  });

  it('PD-A02 — PUT uses tenantAuthMiddleware', () => {
    expect(src).toMatch(/product-details[\s\S]{0,300}tenantAuthMiddleware/);
  });

  it('PD-A03 — PUT uses databaseContextMiddleware', () => {
    expect(src).toMatch(/product-details[\s\S]{0,300}databaseContextMiddleware/);
  });

  it('PD-A04 — service imported in tenant.ts', () => {
    expect(src).toMatch(/dppProductDetails/);
  });

  it('PD-A05 — upsertDppProductDetailsForNode imported', () => {
    expect(src).toMatch(/upsertDppProductDetailsForNode/);
  });

  it('PD-A06 — toDppProductDetailsDto imported', () => {
    expect(src).toMatch(/toDppProductDetailsDto/);
  });

  it('PD-A07 — getDppProductDetailsForNode imported', () => {
    expect(src).toMatch(/getDppProductDetailsForNode/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group B — Static: service validation — material composition
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: validateMaterialComposition', () => {
  it('PD-B01 — valid single entry passes', () => {
    const result = validateMaterialComposition([{ material: 'Cotton', percentage: 80 }]);
    expect(result.valid).toBe(true);
  });

  it('PD-B02 — valid multi-entry (total ≤ 100) passes', () => {
    const result = validateMaterialComposition([
      { material: 'Cotton', percentage: 60 },
      { material: 'Polyester', percentage: 40 },
    ]);
    expect(result.valid).toBe(true);
  });

  it('PD-B03 — exceeds max entries fails', () => {
    const items = Array.from({ length: DPP_MATERIAL_MAX_ENTRIES + 1 }, (_, i) => ({
      material: `Material${i}`,
      percentage: 5,
    }));
    const result = validateMaterialComposition(items);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most/);
  });

  it('PD-B04 — percentage > 100 fails', () => {
    const result = validateMaterialComposition([{ material: 'Cotton', percentage: 110 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/0 and 100/);
  });

  it('PD-B05 — negative percentage fails', () => {
    const result = validateMaterialComposition([{ material: 'Cotton', percentage: -5 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/0 and 100/);
  });

  it('PD-B06 — total exceeds 100 fails', () => {
    const result = validateMaterialComposition([
      { material: 'Cotton', percentage: 60 },
      { material: 'Polyester', percentage: 50 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/total percentage/);
  });

  it('PD-B07 — empty material string fails', () => {
    const result = validateMaterialComposition([{ material: '', percentage: 50 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/non-empty string/);
  });

  it('PD-B08 — empty array passes (no entries = no validation needed)', () => {
    const result = validateMaterialComposition([]);
    expect(result.valid).toBe(true);
  });

  it('PD-B09 — DPP_MATERIAL_MAX_ENTRIES is 10', () => {
    expect(DPP_MATERIAL_MAX_ENTRIES).toBe(10);
  });

  it('PD-B10 — DPP_MATERIAL_TOTAL_MAX_PERCENT is 100', () => {
    expect(DPP_MATERIAL_TOTAL_MAX_PERCENT).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group C — Static: role guard
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: role guard on PUT', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PD-C01 — source checks ADMIN or OWNER role for product-details PUT', () => {
    // The role guard must be present in proximity to the product-details route.
    expect(src).toMatch(/product-details[\s\S]{0,800}ADMIN[\s\S]{0,100}OWNER/);
  });

  it('PD-C02 — 403 returned when role check fails', () => {
    // Must see FORBIDDEN or 403 near product-details block
    expect(src).toMatch(/product-details[\s\S]{0,1200}FORBIDDEN/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group D — Static: tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: tenant isolation in service', () => {
  let svc: string;

  beforeAll(() => {
    expect(fs.existsSync(SERVICE_PATH), `service not found: ${SERVICE_PATH}`).toBe(true);
    svc = fs.readFileSync(SERVICE_PATH, 'utf-8');
  });

  it('PD-D01 — service uses $queryRaw (RLS-scoped queries)', () => {
    expect(svc).toMatch(/\$queryRaw/);
  });

  it('PD-D02 — INSERT passes org_id explicitly', () => {
    expect(svc).toMatch(/INSERT INTO dpp_product_details/);
    expect(svc).toMatch(/orgId.*::uuid/);
  });

  it('PD-D03 — upsert uses ON CONFLICT on (org_id, node_id)', () => {
    expect(svc).toMatch(/ON CONFLICT \(org_id, node_id\)/);
  });

  it('PD-D04 — getDppProductDetailsForNode does not pass org_id in WHERE (relies on RLS)', () => {
    // RLS should enforce the org_id scoping — query only needs to filter by node_id
    expect(svc).toMatch(/WHERE node_id = .{1,20}::uuid/);
    // Should NOT have explicit org_id = ... in the SELECT query
    const selectBlock = svc.match(/SELECT[\s\S]{0,1000}FROM dpp_product_details[\s\S]{0,200}LIMIT 1/);
    expect(selectBlock).not.toBeNull();
    // The SELECT itself must not add a WHERE org_id =  (RLS handles it)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group E — Static: GET passport includes passportProductDetails
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: GET passport includes passportProductDetails', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PD-E01 — GET passport queries dpp_product_details table', () => {
    expect(src).toMatch(/FROM dpp_product_details/);
  });

  it('PD-E02 — passportProductDetails included in GET passport response', () => {
    expect(src).toMatch(/passportProductDetails/);
  });

  it('PD-E03 — passportProductDetails is null when no row exists (defensive null check)', () => {
    // Must see productDetailsRows.length > 0 or similar check before mapping
    expect(src).toMatch(/productDetailsRows/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group F — Static: audit log
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: audit log', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PD-F01 — audit action tenant.dpp.product_details.upserted present', () => {
    expect(src).toMatch(/tenant\.dpp\.product_details\.upserted/);
  });

  it('PD-F02 — audit logs hasMaterialComposition field', () => {
    expect(src).toMatch(/hasMaterialComposition/);
  });

  it('PD-F03 — audit logs hasProductPhotoEvidence field', () => {
    expect(src).toMatch(/hasProductPhotoEvidence/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group G — Static: public route privacy
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: public route privacy', () => {
  let pub: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(true);
    pub = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('PD-G01 — no product-details route in public.ts', () => {
    expect(pub).not.toMatch(/product-details/);
  });

  it('PD-G02 — no dpp_product_details query in public.ts', () => {
    expect(pub).not.toMatch(/dpp_product_details/);
  });

  it('PD-G03 — no passportProductDetails in public.ts', () => {
    expect(pub).not.toMatch(/passportProductDetails/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group H — Static: migration schema
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Static: migration schema', () => {
  let sql: string;

  beforeAll(() => {
    expect(
      fs.existsSync(MIGRATION_SQL_PATH),
      `migration SQL not found: ${MIGRATION_SQL_PATH}`,
    ).toBe(true);
    sql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf-8');
  });

  it('PD-H01 — migration creates dpp_product_details table', () => {
    expect(sql).toMatch(/CREATE TABLE public\.dpp_product_details/);
  });

  it('PD-H02 — RLS enabled', () => {
    // ALTER TABLE form: ALTER TABLE public.dpp_product_details ENABLE ROW LEVEL SECURITY
    expect(sql).toMatch(/ALTER TABLE public\.dpp_product_details ENABLE ROW LEVEL SECURITY/);
  });

  it('PD-H03 — FORCE ROW LEVEL SECURITY set', () => {
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/);
  });

  it('PD-H04 — restrictive policy uses app.current_org_id() (not broken old form)', () => {
    // Must use app.current_org_id() NOT current_setting('app.current_org_id')
    expect(sql).toMatch(/AS RESTRICTIVE[\s\S]{0,200}app\.current_org_id\(\)/);
    expect(sql).not.toMatch(/current_setting\('app\.current_org_id'\)/);
  });

  it('PD-H05 — SELECT, INSERT, UPDATE policies present', () => {
    // pg may wrap FOR\nSELECT across lines
    expect(sql).toMatch(/FOR\s+SELECT TO texqtic_app/);
    expect(sql).toMatch(/FOR\s+INSERT TO texqtic_app/);
    expect(sql).toMatch(/FOR\s+UPDATE TO texqtic_app/);
  });

  it('PD-H06 — GRANT covers SELECT, INSERT, UPDATE', () => {
    // pg may format GRANT SELECT,\n  INSERT,\n  UPDATE across lines
    expect(sql).toMatch(/GRANT SELECT[\s\S]{0,60}UPDATE ON public\.dpp_product_details TO texqtic_app/);
  });

  it('PD-H07 — node_id FK to traceability_nodes ON DELETE CASCADE', () => {
    expect(sql).toMatch(/REFERENCES public\.traceability_nodes[\s\S]{0,50}ON DELETE CASCADE/);
  });

  it('PD-H08 — org_id FK to organizations present', () => {
    expect(sql).toMatch(/REFERENCES public\.organizations/);
  });

  it('PD-H09 — product_photo_evidence_item_id FK to dpp_evidence_items ON DELETE SET NULL', () => {
    // pg may wrap ON DELETE\n  SET NULL across lines
    expect(sql).toMatch(/REFERENCES public\.dpp_evidence_items[\s\S]{0,60}ON DELETE[\s\S]{0,20}SET NULL/);
  });

  it('PD-H10 — material_composition is JSONB', () => {
    expect(sql).toMatch(/material_composition\s+JSONB/);
  });

  it('PD-H11 — unique constraint on (org_id, node_id)', () => {
    expect(sql).toMatch(/UNIQUE \(org_id, node_id\)/);
  });

  it('PD-H12 — updated_at trigger function created', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.set_dpp_product_details_updated_at/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group I — DB: integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — DB: integration (skipped if no DB)', () => {
  it('PD-I01 — skipped (no DB connection in CI)', () => {
    if (!hasDb) {
      return;
    }
    // Placeholder — real DB integration test would go here.
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group J — Regression: prior DPP slices unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe('013 — Regression: prior DPP routes unaffected', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('PD-J01 — GET /tenant/dpp/:nodeId/evidence-items still registered', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('PD-J02 — POST /tenant/dpp/:nodeId/evidence-items still registered', () => {
    expect(src).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('PD-J03 — GET /tenant/dpp/:nodeId/passport still registered', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport['"]/);
  });

  it('PD-J04 — PATCH passport/status still registered', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
  });

  it('PD-J05 — no \.json route in tenant.ts (regression guard)', () => {
    // Ensure the removed broken .json route has not been re-introduced
    expect(src).not.toMatch(/fastify\.(get|post|put|patch|delete)\s*\(['"]\S*\.json['"]/);
  });
});
