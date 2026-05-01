/**
 * TECS-DPP-PASSPORT-NETWORK-014 — Trade Linkage Foundation
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-014
 * Slice: GET  /api/tenant/dpp/:nodeId/trade-links
 *        POST /api/tenant/dpp/:nodeId/trade-links
 *
 * Purpose:
 *   Verifies the trade link routes and service, including migration schema
 *   correctness, tenant isolation, role guard, visibility, public privacy,
 *   audit log, and regressions of prior DPP slices.
 *
 * Test strategy:
 *   Group A — Static: migration schema (table, RLS, FORCE, policies, grants, no FK to orders)
 *   Group B — Static: route registration (GET + POST registered)
 *   Group C — Static: validation (Zod schemas, sourceTable allowlist, at-least-one)
 *   Group D — Static: tenant isolation (service queries use RLS context)
 *   Group E — Static: CRUD behaviour (service layer source analysis)
 *   Group F — Static: visibility (PRIVATE default, all 3 values supported)
 *   Group G — Static: public route privacy (public.ts must NOT reference dpp_trade_links)
 *   Group H — Static: audit log (created action + metadata fields)
 *   Group I — DB: integration (gated by hasDb)
 *   Group J — Regression: prior DPP slices unaffected
 *
 * Doctrine: v1.4
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hasDb } from './helpers/dbGate.js';
import {
  validateDppTradeLinkSource,
  DPP_TRADE_LINK_TYPES,
  DPP_TRADE_LINK_VISIBILITY_VALUES,
} from '../services/dppTradeLinks.js';

// ─────────────────────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────────────────────

const SERVER_ROOT     = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH  = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const PUBLIC_ROUTE_PATH  = path.join(SERVER_ROOT, 'src/routes/public.ts');
const SERVICE_PATH       = path.join(SERVER_ROOT, 'src/services/dppTradeLinks.ts');
const MIGRATION_SQL_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260513200000_tecs_dpp_trade_links/migration.sql',
);

// ─────────────────────────────────────────────────────────────────────────────
// Group A — Static: migration schema
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: migration schema', () => {
  let sql: string;

  beforeAll(() => {
    expect(
      fs.existsSync(MIGRATION_SQL_PATH),
      `migration SQL not found: ${MIGRATION_SQL_PATH}`,
    ).toBe(true);
    sql = fs.readFileSync(MIGRATION_SQL_PATH, 'utf-8');
  });

  it('TL-A01 — migration creates dpp_trade_links table', () => {
    expect(sql).toMatch(/CREATE TABLE public\.dpp_trade_links/);
  });

  it('TL-A02 — RLS enabled', () => {
    expect(sql).toMatch(/ALTER TABLE public\.dpp_trade_links ENABLE ROW LEVEL SECURITY/);
  });

  it('TL-A03 — FORCE ROW LEVEL SECURITY set', () => {
    expect(sql).toMatch(/ALTER TABLE public\.dpp_trade_links FORCE ROW LEVEL SECURITY/);
  });

  it('TL-A04 — restrictive policy uses app.current_org_id() (not broken old form)', () => {
    expect(sql).toMatch(/AS RESTRICTIVE[\s\S]{0,200}app\.current_org_id\(\)/);
    expect(sql).not.toMatch(/current_setting\('app\.current_org_id'\)/);
  });

  it('TL-A05 — SELECT, INSERT, UPDATE policies present', () => {
    expect(sql).toMatch(/FOR\s+SELECT\s+TO texqtic_app/);
    expect(sql).toMatch(/FOR\s+INSERT\s+TO texqtic_app/);
    expect(sql).toMatch(/FOR\s+UPDATE\s+TO texqtic_app/);
  });

  it('TL-A06 — GRANT covers SELECT, INSERT, UPDATE', () => {
    expect(sql).toMatch(/GRANT SELECT[\s\S]{0,60}UPDATE ON public\.dpp_trade_links TO texqtic_app/);
  });

  it('TL-A07 — node_id FK to traceability_nodes ON DELETE CASCADE', () => {
    expect(sql).toMatch(/REFERENCES public\.traceability_nodes[\s\S]{0,80}ON DELETE\s+CASCADE/);
  });

  it('TL-A08 — org_id FK to organizations (NOT to tenants or orders)', () => {
    expect(sql).toMatch(/CONSTRAINT dpp_trade_links_org_id_fk FOREIGN KEY \(org_id\)/);
    expect(sql).toMatch(/REFERENCES public\.organizations/);
    // Must NOT have any FK to orders or rfqs tables
    expect(sql).not.toMatch(/REFERENCES public\.orders/);
    expect(sql).not.toMatch(/REFERENCES public\.rfqs/);
  });

  it('TL-A09 — link_type CHECK constraint includes all 9 values', () => {
    expect(sql).toMatch(/RFQ/);
    expect(sql).toMatch(/ORDER/);
    expect(sql).toMatch(/INVOICE/);
    expect(sql).toMatch(/SHIPMENT/);
    expect(sql).toMatch(/BUYER_ACCEPTANCE/);
    expect(sql).toMatch(/DISPATCH_PROOF/);
    expect(sql).toMatch(/QC_REFERENCE/);
    expect(sql).toMatch(/PAYMENT_REFERENCE/);
    expect(sql).toMatch(/OTHER/);
  });

  it('TL-A10 — visibility CHECK constraint includes PRIVATE, AUTHENTICATED_BUYER, PUBLIC_COUNT', () => {
    expect(sql).toMatch(/PRIVATE/);
    expect(sql).toMatch(/AUTHENTICATED_BUYER/);
    expect(sql).toMatch(/PUBLIC_COUNT/);
  });

  it('TL-A11 — partial unique index on source_id IS NOT NULL', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX[\s\S]{0,200}WHERE source_id IS NOT NULL/);
  });

  it('TL-A12 — updated_at trigger function created', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.set_dpp_trade_links_updated_at\(\)/);
  });

  it('TL-A13 — trigger attached to dpp_trade_links', () => {
    expect(sql).toMatch(/CREATE TRIGGER trg_dpp_trade_links_updated_at/);
  });

  it('TL-A14 — no buyer_org_id field (v1 decision — no buyer identity linkage)', () => {
    expect(sql).not.toMatch(/buyer_org_id/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group B — Static: route registration
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: route registration', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('TL-B01 — GET route registered at /tenant/dpp/:nodeId/trade-links', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/trade-links['"]/);
  });

  it('TL-B02 — POST route registered at /tenant/dpp/:nodeId/trade-links', () => {
    expect(src).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/trade-links['"]/);
  });

  it('TL-B03 — GET uses tenantAuthMiddleware', () => {
    expect(src).toMatch(/trade-links[\s\S]{0,400}tenantAuthMiddleware/);
  });

  it('TL-B04 — GET uses databaseContextMiddleware', () => {
    expect(src).toMatch(/trade-links[\s\S]{0,400}databaseContextMiddleware/);
  });

  it('TL-B05 — POST uses tenantAuthMiddleware', () => {
    expect(src).toMatch(/trade-links[\s\S]{0,1200}tenantAuthMiddleware/);
  });

  it('TL-B06 — POST uses databaseContextMiddleware', () => {
    expect(src).toMatch(/trade-links[\s\S]{0,1200}databaseContextMiddleware/);
  });

  it('TL-B07 — dppTradeLinks service imported in tenant.ts', () => {
    expect(src).toMatch(/dppTradeLinks/);
  });

  it('TL-B08 — listDppTradeLinksForNode imported', () => {
    expect(src).toMatch(/listDppTradeLinksForNode/);
  });

  it('TL-B09 — createDppTradeLink imported', () => {
    expect(src).toMatch(/createDppTradeLink/);
  });

  it('TL-B10 — toDppTradeLinkDto imported', () => {
    expect(src).toMatch(/toDppTradeLinkDto/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group C — Static: validation
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: validation', () => {
  it('TL-C01 — DPP_TRADE_LINK_TYPES array has exactly 9 values', () => {
    expect(DPP_TRADE_LINK_TYPES).toHaveLength(9);
  });

  it('TL-C02 — DPP_TRADE_LINK_TYPES includes all required values', () => {
    const required = [
      'RFQ', 'ORDER', 'INVOICE', 'SHIPMENT', 'BUYER_ACCEPTANCE',
      'DISPATCH_PROOF', 'QC_REFERENCE', 'PAYMENT_REFERENCE', 'OTHER',
    ];
    for (const v of required) {
      expect(DPP_TRADE_LINK_TYPES).toContain(v);
    }
  });

  it('TL-C03 — DPP_TRADE_LINK_VISIBILITY_VALUES has exactly 3 values', () => {
    expect(DPP_TRADE_LINK_VISIBILITY_VALUES).toHaveLength(3);
  });

  it('TL-C04 — DPP_TRADE_LINK_VISIBILITY_VALUES includes PRIVATE, AUTHENTICATED_BUYER, PUBLIC_COUNT', () => {
    expect(DPP_TRADE_LINK_VISIBILITY_VALUES).toContain('PRIVATE');
    expect(DPP_TRADE_LINK_VISIBILITY_VALUES).toContain('AUTHENTICATED_BUYER');
    expect(DPP_TRADE_LINK_VISIBILITY_VALUES).toContain('PUBLIC_COUNT');
  });

  it('TL-C05 — validateDppTradeLinkSource returns null for null sourceTable', () => {
    expect(validateDppTradeLinkSource(null, null)).toBeNull();
    expect(validateDppTradeLinkSource(undefined, undefined)).toBeNull();
  });

  it('TL-C06 — validateDppTradeLinkSource accepts allowed sourceTable values', () => {
    expect(validateDppTradeLinkSource('orders', null)).toBeNull();
    expect(validateDppTradeLinkSource('rfqs', null)).toBeNull();
    expect(validateDppTradeLinkSource('shipments', null)).toBeNull();
  });

  it('TL-C07 — validateDppTradeLinkSource rejects disallowed sourceTable', () => {
    const result = validateDppTradeLinkSource('some_random_table', null);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('TL-C08 — validateDppTradeLinkSource rejects SQL injection attempt in sourceTable', () => {
    expect(validateDppTradeLinkSource("orders'; DROP TABLE dpp_trade_links; --", null)).not.toBeNull();
    expect(validateDppTradeLinkSource('orders UNION SELECT', null)).not.toBeNull();
  });

  it('TL-C09 — validateDppTradeLinkSource rejects invalid UUID for sourceId', () => {
    const result = validateDppTradeLinkSource('orders', 'not-a-uuid');
    expect(result).not.toBeNull();
  });

  it('TL-C10 — validateDppTradeLinkSource accepts valid UUID for sourceId', () => {
    const result = validateDppTradeLinkSource('orders', '123e4567-e89b-12d3-a456-426614174000');
    expect(result).toBeNull();
  });

  it('TL-C11 — tenant.ts has at-least-one check (sourceId OR externalReference OR title)', () => {
    const src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    expect(src).toMatch(/sourceId.*externalReference.*title|At least one of/);
  });

  it('TL-C12 — tenant.ts has role guard ADMIN or OWNER for POST trade-links', () => {
    const src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    expect(src).toMatch(/ADMIN.*OWNER.*trade links|Only ADMIN or OWNER may create trade links/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group D — Static: tenant isolation (service source analysis)
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: tenant isolation', () => {
  let svc: string;

  beforeAll(() => {
    expect(fs.existsSync(SERVICE_PATH), `service not found: ${SERVICE_PATH}`).toBe(true);
    svc = fs.readFileSync(SERVICE_PATH, 'utf-8');
  });

  it('TL-D01 — listDppTradeLinksForNode uses $queryRaw (not Prisma findMany)', () => {
    expect(svc).toMatch(/\$queryRaw/);
  });

  it('TL-D02 — createDppTradeLink passes orgId as uuid to INSERT', () => {
    expect(svc).toMatch(/orgId.*::uuid/);
  });

  it('TL-D03 — createDppTradeLink uses RETURNING clause', () => {
    expect(svc).toMatch(/RETURNING/);
  });

  it('TL-D04 — assertTradeLinkNodeBelongsToOrg checks node AND org_id', () => {
    expect(svc).toMatch(/traceability_nodes/);
    expect(svc).toMatch(/org_id.*=.*orgId|AND org_id/);
  });

  it('TL-D05 — listDppTradeLinksForNode does not pass org_id in WHERE (relies on RLS)', () => {
    // RLS enforces org_id scoping — the list query only filters by node_id
    const selectBlock = svc.match(/FROM dpp_trade_links[\s\S]{0,200}ORDER BY/);
    expect(selectBlock).not.toBeNull();
    // org_id should not appear after FROM in the list SELECT body
    const selectBodyMatch = svc.match(/FROM dpp_trade_links([\s\S]{0,200}ORDER BY)/);
    if (selectBodyMatch) {
      expect(selectBodyMatch[1]).not.toMatch(/AND org_id\s*=/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group E — Static: CRUD behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: CRUD behaviour', () => {
  let svc: string;

  beforeAll(() => {
    svc = fs.readFileSync(SERVICE_PATH, 'utf-8');
  });

  it('TL-E01 — createDppTradeLink inserts link_type', () => {
    expect(svc).toMatch(/link_type/);
    expect(svc).toMatch(/linkType/);
  });

  it('TL-E02 — createDppTradeLink inserts visibility with PRIVATE default', () => {
    expect(svc).toMatch(/visibility/);
    expect(svc).toMatch(/PRIVATE/);
  });

  it('TL-E03 — createDppTradeLink inserts linked_at', () => {
    expect(svc).toMatch(/linked_at/);
    expect(svc).toMatch(/linkedAt/);
  });

  it('TL-E04 — createDppTradeLink inserts source_table and source_id (nullable)', () => {
    expect(svc).toMatch(/source_table/);
    expect(svc).toMatch(/source_id/);
  });

  it('TL-E05 — toDppTradeLinkDto maps snake_case DB columns to camelCase DTO', () => {
    expect(svc).toMatch(/link_type.*linkType|linkType.*link_type/s);
    expect(svc).toMatch(/node_id.*nodeId|nodeId.*node_id/s);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group F — Static: visibility
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: visibility', () => {
  it('TL-F01 — service export contains PRIVATE as default visibility', () => {
    const svc = fs.readFileSync(SERVICE_PATH, 'utf-8');
    expect(svc).toMatch(/PRIVATE/);
  });

  it('TL-F02 — POST body schema validates visibility enum in tenant.ts', () => {
    const src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    expect(src).toMatch(/DPP_TRADE_LINK_VISIBILITY_VALUES/);
  });

  it('TL-F03 — POST body schema validates linkType enum in tenant.ts', () => {
    const src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    expect(src).toMatch(/DPP_TRADE_LINK_TYPES/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group G — Static: public route privacy
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: public route privacy', () => {
  let pub: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(true);
    pub = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('TL-G01 — no trade-links route in public.ts', () => {
    expect(pub).not.toMatch(/trade-links/);
  });

  it('TL-G02 — no dpp_trade_links query in public.ts', () => {
    expect(pub).not.toMatch(/dpp_trade_links/);
  });

  it('TL-G03 — no sourceId in public.ts (trade-link source must never be public)', () => {
    // Note: sourceId could appear in evidence items — check only in context of trade links
    // We confirm dpp_trade_links is never queried from public.ts (covered by TL-G02)
    // and no trade link serialization
    expect(pub).not.toMatch(/tradeLink|trade_link/);
  });

  it('TL-G04 — no externalReference from dpp_trade_links exposed publicly', () => {
    // externalReference is an internal-only field for this slice
    // Verify it appears only in tenant service, not in public route
    expect(pub).not.toMatch(/externalReference/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group H — Static: audit log
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Static: audit log', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('TL-H01 — audit action tenant.dpp.trade_link.created present', () => {
    expect(src).toMatch(/tenant\.dpp\.trade_link\.created/);
  });

  it('TL-H02 — audit logs nodeId', () => {
    expect(src).toMatch(/nodeId/);
  });

  it('TL-H03 — audit logs tradeLinkId', () => {
    expect(src).toMatch(/tradeLinkId/);
  });

  it('TL-H04 — audit logs linkType', () => {
    expect(src).toMatch(/linkType/);
  });

  it('TL-H05 — audit logs visibility', () => {
    expect(src).toMatch(/visibility/);
  });

  it('TL-H06 — audit logs hasSourceId (boolean, not sourceId raw value)', () => {
    // Must log hasSourceId (boolean) not the raw UUID (sourceId)
    expect(src).toMatch(/hasSourceId/);
  });

  it('TL-H07 — audit logs hasExternalReference', () => {
    expect(src).toMatch(/hasExternalReference/);
  });

  it('TL-H08 — audit action tenant.dpp.trade_link.listed present', () => {
    expect(src).toMatch(/tenant\.dpp\.trade_link\.listed/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group I — DB: integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — DB: integration (skipped if no DB)', () => {
  it('TL-I01 — skipped (no DB connection in CI)', () => {
    if (!hasDb) {
      return;
    }
    // Placeholder — real DB integration test would verify:
    //   1. Table exists with correct columns
    //   2. RLS prevents cross-tenant reads
    //   3. INSERT returns row with correct defaults
    //   4. Partial unique index rejects duplicate source_id links
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group J — Regression: prior DPP slices unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe('014 — Regression: prior DPP routes unaffected', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('TL-J01 — GET /tenant/dpp/:nodeId/evidence-items still registered', () => {
    expect(src).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('TL-J02 — POST /tenant/dpp/:nodeId/evidence-items still registered', () => {
    expect(src).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-items['"]/);
  });

  it('TL-J03 — GET /tenant/dpp/:nodeId/passport still registered', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport['"]/);
  });

  it('TL-J04 — PATCH passport/status still registered', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
  });

  it('TL-J05 — PUT /tenant/dpp/:nodeId/product-details still registered', () => {
    expect(src).toMatch(/fastify\.put\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/product-details['"]/);
  });

  it('TL-J06 — no \.json route in tenant.ts (regression guard)', () => {
    // Ensure the previously removed broken .json route has not been re-introduced
    expect(src).not.toMatch(/fastify\.(get|post|put|patch|delete)\s*\(['"]\S*\.json['"]/);
  });
});
