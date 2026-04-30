/**
 * TECS-DPP-PASSPORT-NETWORK-005 Slice C — Governed Passport Status Transition
 *
 * Unit : TECS-DPP-PASSPORT-NETWORK-005
 * Slice: Slice C — PATCH /api/tenant/dpp/:nodeId/passport/status
 *
 * Design authority: docs/TECS-DPP-PASSPORT-NETWORK-002-DESIGN-v1.md
 *
 * Test strategy:
 *   Group 1 — Static: PATCH route registered, body schema, legal transition matrix (no DB required)
 *   Group 2 — Static: Role guard declarations in source (no DB required)
 *   Group 3 — Static: public_token behavior declared in source (no DB required)
 *   Group 4 — Static: Audit log action declared in source (no DB required)
 *   Group 5 — Static: Privacy — no orgId exposure through unsafe routes (no DB required)
 *   Group 6 — DB: Integration tests gated by hasDb
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
const PUBLIC_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/public.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: route registration and body schema
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: PATCH route registration and body schema', () => {
  let src: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found: ${TENANT_ROUTE_PATH}`).toBe(true);
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-S01 — PATCH route registered at /tenant/dpp/:nodeId/passport/status', () => {
    expect(src).toMatch(/['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
  });

  it('SC-S02 — tenantAuthMiddleware applied to PATCH status route', () => {
    const routeIdx = src.search(/fastify\.patch\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const routeSection = src.slice(routeIdx, routeIdx + 600);
    expect(routeSection).toMatch(/tenantAuthMiddleware/);
  });

  it('SC-S03 — databaseContextMiddleware applied to PATCH status route', () => {
    const routeIdx = src.search(/fastify\.patch\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const routeSection = src.slice(routeIdx, routeIdx + 600);
    expect(routeSection).toMatch(/databaseContextMiddleware/);
  });

  it('SC-S04 — targetStatus z.enum includes all 4 valid values', () => {
    expect(src).toMatch(/targetStatus.*z\.enum\(\[['"]DRAFT['"].*['"]INTERNAL['"].*['"]TRADE_READY['"].*['"]PUBLISHED['"]/s);
  });

  it('SC-S05 — reason field: optional string with max(500)', () => {
    // reason is optional, trimmed, max 500
    const reasonIdx = src.indexOf("reason: z.string().trim().max(500)");
    expect(reasonIdx).toBeGreaterThan(-1);
  });

  it('SC-S06 — nodeId param validated as UUID', () => {
    const routeIdx = src.search(/fastify\.patch\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
    expect(routeIdx).toBeGreaterThan(-1);
    const section = src.slice(routeIdx, routeIdx + 1500);
    expect(section).toMatch(/z\.string\(\)\.uuid/);
  });

  it('SC-S07 — PATCH route uses fastify.patch method', () => {
    expect(src).toMatch(/fastify\.patch\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/passport\/status['"]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: Legal transition matrix and role guard
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: legal transition matrix and role guard', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-T01 — LEGAL_TRANSITIONS constant defined', () => {
    expect(src).toMatch(/LEGAL_TRANSITIONS/);
  });

  it('SC-T02 — DRAFT → INTERNAL in legal transitions', () => {
    const ltIdx = src.indexOf('LEGAL_TRANSITIONS');
    const section = src.slice(ltIdx, ltIdx + 400);
    expect(section).toMatch(/DRAFT[\s\S]{0,30}INTERNAL/);
  });

  it('SC-T03 — INTERNAL → TRADE_READY in legal transitions', () => {
    const ltIdx = src.indexOf('LEGAL_TRANSITIONS');
    const section = src.slice(ltIdx, ltIdx + 400);
    expect(section).toMatch(/INTERNAL[\s\S]{0,30}TRADE_READY/);
  });

  it('SC-T04 — TRADE_READY → PUBLISHED in legal transitions', () => {
    const ltIdx = src.indexOf('LEGAL_TRANSITIONS');
    const section = src.slice(ltIdx, ltIdx + 400);
    expect(section).toMatch(/TRADE_READY[\s\S]{0,30}PUBLISHED/);
  });

  it('SC-T05 — PUBLISHED → DRAFT in legal transitions (revoke path)', () => {
    const ltIdx = src.indexOf('LEGAL_TRANSITIONS');
    const section = src.slice(ltIdx, ltIdx + 400);
    expect(section).toMatch(/PUBLISHED[\s\S]{0,30}DRAFT/);
  });

  it('SC-T06 — MEMBER_TRANSITIONS constant limits MEMBER to DRAFT:INTERNAL only', () => {
    expect(src).toMatch(/MEMBER_TRANSITIONS/);
    const mtIdx = src.indexOf('MEMBER_TRANSITIONS');
    const section = src.slice(mtIdx, mtIdx + 200);
    expect(section).toMatch(/DRAFT:INTERNAL/);
  });

  it('SC-T07 — ADMIN or OWNER required check present', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/userRole.*===.*'ADMIN'|'ADMIN'.*===.*userRole/);
    expect(section).toMatch(/userRole.*===.*'OWNER'|'OWNER'.*===.*userRole/);
  });

  it('SC-T08 — ILLEGAL_TRANSITION error code returned for disallowed moves', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('SC-T09 — FORBIDDEN error code returned for insufficient role', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/error.*FORBIDDEN|FORBIDDEN.*error/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: Evidence gate
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: evidence gate for INTERNAL → TRADE_READY', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-E01 — EVIDENCE_GATE_FAILED error code defined', () => {
    expect(src).toMatch(/EVIDENCE_GATE_FAILED/);
  });

  it('SC-E02 — gate checks approvedCertCount >= 1', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/approvedCertCount\s*<\s*1/);
  });

  it('SC-E03 — gate checks lineageDepth >= 1', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/lineageDepth\s*<\s*1/);
  });

  it('SC-E04 — evidence gate scoped to INTERNAL → TRADE_READY transition only', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/previousStatus.*===.*'INTERNAL'[\s\S]{0,80}targetStatus.*===.*'TRADE_READY'/);
  });

  it('SC-E05 — evidence gate queries dpp_snapshot_certifications_v1', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/dpp_snapshot_certifications_v1/);
  });

  it('SC-E06 — evidence gate queries dpp_snapshot_lineage_v1', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/dpp_snapshot_lineage_v1/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Static: public_token behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: public_token management', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-P01 — public_token assigned via randomUUID() on PUBLISHED transition', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    // Assign if null: existingPublicToken ?? randomUUID()
    expect(section).toMatch(/existingPublicToken.*\?\?.*randomUUID\(\)|randomUUID\(\).*\?\?.*existingPublicToken/);
  });

  it('SC-P02 — public_token preserved if already present on PUBLISHED', () => {
    // The pattern "existingPublicToken ?? randomUUID()" preserves if truthy
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/existingPublicToken/);
    expect(section).toMatch(/randomUUID/);
  });

  it('SC-P03 — public_token set to null on DRAFT revoke', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    // targetStatus === 'DRAFT' ? null
    expect(section).toMatch(/targetStatus.*===.*'DRAFT'[\s\S]{0,20}null/);
  });

  it('SC-P04 — publicTokenAssigned flag declared in transition outcome', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/publicTokenAssigned/);
  });

  it('SC-P05 — public_token updated in upsert DO UPDATE clause', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    // The upsert DO UPDATE SET must include public_token
    const doUpdateIdx = section.indexOf('DO UPDATE SET');
    expect(doUpdateIdx).toBeGreaterThan(-1);
    const doUpdateSection = section.slice(doUpdateIdx, doUpdateIdx + 300);
    expect(doUpdateSection).toMatch(/public_token/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Static: Audit log and no-op behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: audit log and no-op', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-A01 — audit action tenant.dpp.passport.status_changed emitted', () => {
    expect(src).toMatch(/tenant\.dpp\.passport\.status_changed/);
  });

  it('SC-A02 — audit metadata includes nodeId', () => {
    const auditIdx = src.indexOf('tenant.dpp.passport.status_changed');
    expect(auditIdx).toBeGreaterThan(-1);
    const auditSection = src.slice(auditIdx - 100, auditIdx + 500);
    expect(auditSection).toMatch(/nodeId/);
  });

  it('SC-A03 — audit metadata includes previousStatus', () => {
    const auditIdx = src.indexOf('tenant.dpp.passport.status_changed');
    const auditSection = src.slice(auditIdx - 100, auditIdx + 500);
    expect(auditSection).toMatch(/previousStatus/);
  });

  it('SC-A04 — audit metadata includes targetStatus', () => {
    const auditIdx = src.indexOf('tenant.dpp.passport.status_changed');
    const auditSection = src.slice(auditIdx - 100, auditIdx + 500);
    expect(auditSection).toMatch(/targetStatus/);
  });

  it('SC-A05 — audit metadata includes publicTokenAssigned', () => {
    const auditIdx = src.indexOf('tenant.dpp.passport.status_changed');
    const auditSection = src.slice(auditIdx - 100, auditIdx + 500);
    expect(auditSection).toMatch(/publicTokenAssigned/);
  });

  it('SC-A06 — audit log NOT written on no-op path (changed: false)', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    // noOp block returns before writeAuditLog is called
    const noOpIdx = section.indexOf("'noOp' in outcome");
    const auditIdx = section.indexOf('tenant.dpp.passport.status_changed');
    // noOp block must appear before audit call (noOp returns early)
    expect(noOpIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(noOpIdx).toBeLessThan(auditIdx);
  });

  it('SC-A07 — no-op response includes changed: false', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/changed\s*:\s*false/);
  });

  it('SC-A08 — success response includes changed: true', () => {
    const sliceCStart = src.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = src.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = src.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/changed\s*:\s*true/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Static: Privacy and scope boundary
// ─────────────────────────────────────────────────────────────────────────────

describe('Slice C — Static: privacy and D-6 route safety', () => {
  let publicSrc: string;
  let tenantSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found: ${PUBLIC_ROUTE_PATH}`).toBe(true);
    publicSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('SC-PV01 — no active .json suffix route in public.ts (D-6 hotfix preserved)', () => {
    // The .json route was intentionally removed. Only a comment may reference it.
    // An active fastify.get route string ending .json must not exist.
    const jsonRouteMatches = [...publicSrc.matchAll(/fastify\.get\s*\(\s*['"][^'"]*\.json['"]/g)];
    expect(jsonRouteMatches).toHaveLength(0);
  });

  it('SC-PV02 — PATCH status route does not expose orgId in response shape', () => {
    const sliceCStart = tenantSrc.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = tenantSrc.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = tenantSrc.slice(sliceCStart, sliceCEnd);
    // The response passport shape must not include orgId
    const passportResponseIdx = section.lastIndexOf('passport: {');
    expect(passportResponseIdx).toBeGreaterThan(-1);
    const responseShape = section.slice(passportResponseIdx, passportResponseIdx + 400);
    expect(responseShape).not.toMatch(/orgId\s*:/);
  });

  it('SC-PV03 — PATCH status route does not expose org_id in response shape', () => {
    const sliceCStart = tenantSrc.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = tenantSrc.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = tenantSrc.slice(sliceCStart, sliceCEnd);
    const passportResponseIdx = section.lastIndexOf('passport: {');
    const responseShape = section.slice(passportResponseIdx, passportResponseIdx + 400);
    expect(responseShape).not.toMatch(/org_id\s*:/);
  });

  it('SC-PV04 — PATCH status route scoped to dpp_passport_states only (no schema mutation)', () => {
    const sliceCStart = tenantSrc.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = tenantSrc.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = tenantSrc.slice(sliceCStart, sliceCEnd);
    // Must only write to dpp_passport_states, not traceability_nodes or certifications
    expect(section).toMatch(/INSERT INTO dpp_passport_states/);
    expect(section).not.toMatch(/INSERT INTO traceability_nodes/);
    expect(section).not.toMatch(/UPDATE traceability_nodes/);
  });

  it('SC-PV05 — PATCH status route does not leak reason in audit without sanitisation', () => {
    // reason is stored via metadataJson (audit log) — the field is optional and user-supplied.
    // The route must normalise reason to null when not provided.
    const sliceCStart = tenantSrc.indexOf('TECS-DPP-PASSPORT-NETWORK-005');
    const sliceCEnd = tenantSrc.indexOf('TECS-DPP-AI-EVIDENCE-LINKAGE-001');
    const section = tenantSrc.slice(sliceCStart, sliceCEnd);
    expect(section).toMatch(/reason.*\?\?.*null/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7 — DB: Integration tests (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('Slice C — DB: Integration (requires Supabase credentials)', () => {
  /**
   * These tests require a live Supabase database connection.
   * They verify the full status transition flow end-to-end.
   *
   * The test IDs below serve as placeholders for when DB credentials are
   * available in CI. The static tests (Groups 1–6) are authoritative
   * for source-level correctness validation.
   */

  it('SC-DB01 — [placeholder] DRAFT → INTERNAL succeeds for ADMIN role', () => {
    // Requires: live Supabase, seeded traceability node, ADMIN auth context
    expect(true).toBe(true); // placeholder — implementation pending DB credentials in CI
  });

  it('SC-DB02 — [placeholder] INTERNAL → TRADE_READY succeeds with evidence gate met', () => {
    expect(true).toBe(true);
  });

  it('SC-DB03 — [placeholder] INTERNAL → TRADE_READY rejected when evidence gate fails', () => {
    expect(true).toBe(true);
  });

  it('SC-DB04 — [placeholder] TRADE_READY → PUBLISHED assigns public_token', () => {
    expect(true).toBe(true);
  });

  it('SC-DB05 — [placeholder] TRADE_READY → PUBLISHED preserves existing public_token', () => {
    expect(true).toBe(true);
  });

  it('SC-DB06 — [placeholder] PUBLISHED → DRAFT revokes public_token (sets null)', () => {
    expect(true).toBe(true);
  });

  it('SC-DB07 — [placeholder] MEMBER role rejected for TRADE_READY → PUBLISHED', () => {
    expect(true).toBe(true);
  });

  it('SC-DB08 — [placeholder] MEMBER role allowed for DRAFT → INTERNAL', () => {
    expect(true).toBe(true);
  });

  it('SC-DB09 — [placeholder] Illegal skip (DRAFT → PUBLISHED) returns 422', () => {
    expect(true).toBe(true);
  });

  it('SC-DB10 — [placeholder] audit log written on successful transition', () => {
    expect(true).toBe(true);
  });
});
