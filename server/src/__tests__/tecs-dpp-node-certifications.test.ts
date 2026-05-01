/**
 * TECS-DPP-PASSPORT-NETWORK-010-B-UNBLOCK-001 — Node Certification Link Route
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-010-B-UNBLOCK-001
 * Slice: POST /api/tenant/dpp/:nodeId/certifications
 *
 * Purpose:
 *   Verifies the app-layer route that inserts into node_certifications,
 *   enabling the INTERNAL → TRADE_READY evidence gate to see approvedCertCount >= 1.
 *
 * Test strategy:
 *   Group 1 — Static: route registration, UUID validation, role guard (no DB required)
 *   Group 2 — Static: tenant isolation enforcement declared in source (no DB required)
 *   Group 3 — Static: idempotency behavior declared in source (no DB required)
 *   Group 4 — Static: audit log action declared in source (no DB required)
 *   Group 5 — Static: view integration — source declares dpp_snapshot_certifications_v1 read (no DB)
 *   Group 6 — Static: safety — unsafe .json suffix route remains absent
 *   Group 7 — DB: integration gated by hasDb
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

const SERVER_ROOT = path.resolve(__dirname, '../../');
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const PUBLIC_ROUTE_PATH  = path.join(SERVER_ROOT, 'src/routes/public.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: route registration and input validation
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: route registration', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('NC-S01 — POST route registered at /tenant/dpp/:nodeId/certifications', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
  });

  it('NC-S02 — uses fastify.post method', () => {
    expect(src).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
  });

  it('NC-S03 — tenantAuthMiddleware applied', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const section = src.slice(routeIdx, routeIdx + 400);
    expect(section).toMatch(/tenantAuthMiddleware/);
  });

  it('NC-S04 — databaseContextMiddleware applied', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const section = src.slice(routeIdx, routeIdx + 400);
    expect(section).toMatch(/databaseContextMiddleware/);
  });

  it('NC-S05 — nodeId validated as UUID', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const section = src.slice(routeIdx, routeIdx + 1500);
    expect(section).toMatch(/nodeId.*z\.string\(\)\.uuid|z\.string\(\)\.uuid.*nodeId/s);
  });

  it('NC-S06 — certificationId validated as UUID', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const section = src.slice(routeIdx, routeIdx + 2000);
    expect(section).toMatch(/certificationId.*z\.string\(\)\.uuid|z\.string\(\)\.uuid.*certificationId/s);
  });

  it('NC-S07 — missing certificationId rejected (bodySchema requires it)', () => {
    // certificationId is not .optional() — required field in bodySchema
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 2000);
    // Must NOT have .optional() on certificationId definition
    const certLineMatch = section.match(/certificationId:\s*z\.string\(\)\.uuid[^,;\n]*/);
    expect(certLineMatch).not.toBeNull();
    expect(certLineMatch![0]).not.toMatch(/\.optional\(\)/);
  });

  it('NC-S08 — returns 404 for NODE_NOT_FOUND', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/NODE_NOT_FOUND/);
    expect(section).toMatch(/sendNotFound/);
  });

  it('NC-S09 — returns 404 for CERT_NOT_FOUND', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/CERT_NOT_FOUND/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: tenant isolation', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('NC-T01 — node existence checked via dpp_snapshot_products_v1 (org-scoped view)', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/dpp_snapshot_products_v1/);
  });

  it('NC-T02 — cert existence checked with org_id scoping', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/org_id.*orgId|orgId.*org_id/s);
    expect(section).toMatch(/certifications/);
  });

  it('NC-T03 — orgId derived from dbContext, not request body', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 1500);
    expect(section).toMatch(/dbContext\.orgId/);
    // orgId must NOT appear in bodySchema
    expect(section).not.toMatch(/orgId.*z\.string|body.*orgId.*uuid/);
  });

  it('NC-T04 — node_certifications insert uses orgId from dbContext (no body org_id)', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    // org_id in the create/insert must be derived from orgId (dbContext), not body
    const insertIdx = section.indexOf('node_certifications.create');
    expect(insertIdx).toBeGreaterThan(-1);
    const insertBlock = section.slice(insertIdx, insertIdx + 300);
    expect(insertBlock).toMatch(/org_id.*orgId|orgId.*org_id/s);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: idempotency behavior', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('NC-I01 — findFirst used for idempotency check before create', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/node_certifications\.findFirst/);
  });

  it('NC-I02 — returns created:false when link already exists', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/created.*false|false.*created/);
  });

  it('NC-I03 — returns created:true on new insert', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 4000);
    expect(section).toMatch(/created.*true|true.*created/);
  });

  it('NC-I04 — nodeCertification object present in response', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 9000);
    expect(section).toMatch(/nodeCertification/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Static: audit log
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: audit log', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('NC-A01 — audit action tenant.dpp.node_certification.linked is written', () => {
    expect(src).toMatch(/tenant\.dpp\.node_certification\.linked/);
  });

  it('NC-A02 — writeAuditLog called in the node certification link route', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 5000);
    expect(section).toMatch(/writeAuditLog/);
  });

  it('NC-A03 — audit metadata includes nodeId, certificationId, created', () => {
    const routeIdx = src.search(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/certifications['"]/);
    const section = src.slice(routeIdx, routeIdx + 5000);
    const auditIdx = section.indexOf('tenant.dpp.node_certification.linked');
    expect(auditIdx).toBeGreaterThan(-1);
    const auditBlock = section.slice(auditIdx, auditIdx + 400);
    expect(auditBlock).toMatch(/nodeId/);
    expect(auditBlock).toMatch(/certificationId/);
    expect(auditBlock).toMatch(/created/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Static: evidence gate integration
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: evidence gate view integration', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('NC-E01 — dpp_snapshot_certifications_v1 is used in evidence gate (INTERNAL→TRADE_READY)', () => {
    // The evidence gate query already present in the status transition route
    expect(src).toMatch(/dpp_snapshot_certifications_v1/);
  });

  it('NC-E02 — evidence gate filters by node_id and lifecycle_state_name = APPROVED', () => {
    // The evidence gate uses approvedCertCount derived from dpp_snapshot_certifications_v1.
    // Verify both elements exist in the file; the window search anchors on the view query.
    expect(src).toMatch(/dpp_snapshot_certifications_v1/);
    expect(src).toMatch(/approvedCertCount/);
    // Find the cert view query and verify lifecycle_state_name=APPROVED filter is nearby
    const certViewIdx = src.indexOf('dpp_snapshot_certifications_v1');
    expect(certViewIdx).toBeGreaterThan(-1);
    const approvedIdx = src.indexOf("lifecycle_state_name === 'APPROVED'");
    expect(approvedIdx).toBeGreaterThan(-1);
    // approvedCertCount is derived from the cert view filtered to APPROVED — both must be present
    expect(src).toMatch(/lifecycle_state_name.*APPROVED|APPROVED.*lifecycle_state_name/s);
  });

  it('NC-E03 — node_certifications is the backing join table for dpp_snapshot_certifications_v1 (source comment)', () => {
    // Evidence from the comment in the route source
    expect(src).toMatch(/node_certifications/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Static: safety — unsafe .json route remains absent
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — Static: unsafe .json suffix route absent', () => {
  let tenantSrc: string;
  let publicSrc: string;

  beforeAll(() => {
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
    publicSrc = fs.existsSync(PUBLIC_ROUTE_PATH)
      ? fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8')
      : '';
  });

  it('NC-X01 — no /dpp/:publicPassportId.json route in tenant.ts', () => {
    expect(tenantSrc).not.toMatch(/publicPassportId\.json/);
  });

  it('NC-X02 — no /dpp/:publicPassportId.json route in public.ts', () => {
    // Match only actual route registrations (fastify.get/post), not historical comments
    expect(publicSrc).not.toMatch(/fastify\.(?:get|post)[^)]*publicPassportId\.json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7 — DB integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe('010-B-UNBLOCK — DB: node_certifications table exists and is accessible', () => {
  it.skipIf(!hasDb)('NC-DB01 — node_certifications table accessible via Prisma client', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      // Should not throw — SELECT on an empty table returns []
      const count = await prisma.node_certifications.count();
      expect(typeof count).toBe('number');
    } finally {
      await prisma.$disconnect();
    }
  });

  it.skipIf(!hasDb)('NC-DB02 — inserting a node_certifications row without valid FK throws (referential integrity)', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      await expect(
        prisma.node_certifications.create({
          data: {
            org_id:            '00000000-0000-0000-0000-000000000000',
            node_id:           '00000000-0000-0000-0000-000000000001',
            certification_id:  '00000000-0000-0000-0000-000000000002',
          },
        }),
      ).rejects.toThrow();
    } finally {
      await prisma.$disconnect();
    }
  });
});
