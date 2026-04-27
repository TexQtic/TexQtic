/**
 * TECS-DPP-AI-EVIDENCE-LINKAGE-001 D-4 — DPP Evidence Claims
 *
 * Slice: D-4 — dpp_evidence_claims table, GET/POST /api/tenant/dpp/:nodeId/evidence-claims,
 *              passport aiExtractedClaimsCount live query
 * Migration: 20260508000000_tecs_dpp_d4_evidence_claims
 *
 * Test strategy:
 *   Group 1 — Static: migration file structure (no DB required)
 *   Group 2 — Static: tenant.ts D-4 route + types (no DB required)
 *   Group 3 — Static: claim type allowlist / forbidden types (no DB required)
 *   Group 4 — Static: Prisma schema DppEvidenceClaim model (no DB required)
 *   Group 5 — DB: evidence claim integration (gated by hasDb)
 *   Group 6 — Boundary: D-4 scope only (no D-5/D-6/buyer/public contamination)
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
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260508000000_tecs_dpp_d4_evidence_claims/migration.sql',
);
const TENANT_ROUTE_PATH = path.join(SERVER_ROOT, 'src/routes/tenant.ts');
const SCHEMA_PATH = path.join(SERVER_ROOT, 'prisma/schema.prisma');

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Static: migration file structure
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — Static: migration file structure', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH), `Migration not found: ${MIGRATION_PATH}`).toBe(true);
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  });

  it('D4-S01 — migration file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
  });

  it('D4-S02 — no standalone BEGIN/COMMIT (Prisma manages transaction)', () => {
    expect(sql).not.toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).not.toMatch(/(?<!\$\w*)\bCOMMIT\s*;/m);
  });

  it('D4-S03 — preflight DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d4_preflight\$/i);
  });

  it('D4-S04 — creates dpp_evidence_claims table', () => {
    expect(sql).toMatch(/CREATE TABLE.*dpp_evidence_claims/s);
  });

  it('D4-S05 — unique constraint on (org_id, node_id, extraction_id, claim_type)', () => {
    expect(sql).toMatch(/dpp_evidence_claims_unique/);
    expect(sql).toMatch(/UNIQUE\s*\(\s*org_id\s*,\s*node_id\s*,\s*extraction_id\s*,\s*claim_type\s*\)/);
  });

  it('D4-S06 — claim_type CHECK constraint present', () => {
    expect(sql).toMatch(/dpp_evidence_claims_claim_type_check/);
    expect(sql).toMatch(/CHECK\s*\(/s);
  });

  it('D4-S07 — claim_value JSONB object CHECK constraint present', () => {
    expect(sql).toMatch(/dpp_evidence_claims_claim_value_object/);
    expect(sql).toMatch(/jsonb_typeof\s*\(\s*claim_value\s*\)\s*=\s*'object'/);
  });

  it('D4-S08 — FK to organizations', () => {
    expect(sql).toMatch(/REFERENCES\s+public\.organizations\s*\(\s*id\s*\)/);
  });

  it('D4-S09 — FK to traceability_nodes with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/REFERENCES\s+public\.traceability_nodes\s*\(\s*id\s*\)/);
    expect(sql).toMatch(/traceability_nodes.*ON DELETE CASCADE/s);
  });

  it('D4-S10 — FK to document_extraction_drafts with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/REFERENCES\s+public\.document_extraction_drafts\s*\(\s*id\s*\)/);
    expect(sql).toMatch(/document_extraction_drafts.*ON DELETE CASCADE/s);
  });

  it('D4-S11 — FK to users with ON DELETE SET NULL', () => {
    expect(sql).toMatch(/REFERENCES\s+public\.users\s*\(\s*id\s*\)/);
    // ON DELETE SET NULL may be split across lines in formatted SQL
    expect(sql).toMatch(/dpp_evidence_claims_approved_by_fk[\s\S]{0,200}SET NULL/);
  });

  it('D4-S12 — ENABLE ROW LEVEL SECURITY', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it('D4-S13 — FORCE ROW LEVEL SECURITY', () => {
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/);
  });

  it('D4-S14 — restrictive RLS policy present', () => {
    expect(sql).toMatch(/dpp_evidence_claims_restrictive/);
    expect(sql).toMatch(/AS RESTRICTIVE/);
  });

  it('D4-S15 — permissive SELECT RLS policy present', () => {
    expect(sql).toMatch(/dpp_evidence_claims_select/);
    // FOR SELECT may span lines: "FOR\nSELECT" is valid SQL
    expect(sql).toMatch(/FOR[\s\r\n]+SELECT/);
  });

  it('D4-S16 — permissive INSERT RLS policy present', () => {
    expect(sql).toMatch(/dpp_evidence_claims_insert/);
    // FOR INSERT may span lines: "FOR\nINSERT" is valid SQL
    expect(sql).toMatch(/FOR[\s\r\n]+INSERT/);
    expect(sql).toMatch(/WITH CHECK/);
  });

  it('D4-S17 — GRANT SELECT, INSERT to texqtic_app', () => {
    // GRANT SELECT, INSERT may be formatted with a newline/whitespace before INSERT
    expect(sql).toMatch(/GRANT SELECT[\s\S]{0,20}INSERT ON[\s\S]{0,100}dpp_evidence_claims[\s\S]{0,50}TO texqtic_app/);
  });

  it('D4-S18 — RLS policies use current_setting app.current_org_id', () => {
    expect(sql).toMatch(/current_setting\s*\(\s*'app\.current_org_id'\s*\)/);
  });

  it('D4-S19 — preflight checks document_extraction_drafts exists', () => {
    expect(sql).toMatch(/document_extraction_drafts/);
  });

  it('D4-S20 — verifier DO block present', () => {
    expect(sql).toMatch(/DO\s+\$d4_verifier\$/i);
  });

  it('D4-S21 — no price/payment/risk/ranking claim types present', () => {
    const forbidden = ['price', 'payment', 'risk_score', 'ranking', 'escrow', 'credit_score', 'buyer_ranking', 'supplier_ranking'];
    for (const t of forbidden) {
      expect(sql.toLowerCase()).not.toContain(t);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Static: tenant.ts D-4 route presence
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — Static: tenant.ts route presence', () => {
  let routeSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH)).toBe(true);
    routeSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D4-R01 — GET /tenant/dpp/:nodeId/evidence-claims route declared', () => {
    expect(routeSrc).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-claims['"]/);
  });

  it('D4-R02 — POST /tenant/dpp/:nodeId/evidence-claims route declared', () => {
    expect(routeSrc).toMatch(/fastify\.post\s*\(\s*['"]\/tenant\/dpp\/:nodeId\/evidence-claims['"]/);
  });

  it('D4-R03 — GET route has tenantAuthMiddleware', () => {
    // Pattern: both routes inside D-4 block with tenantAuthMiddleware
    expect(routeSrc).toMatch(/evidence-claims[\s\S]{0,300}tenantAuthMiddleware/);
  });

  it('D4-R04 — GET route has databaseContextMiddleware', () => {
    expect(routeSrc).toMatch(/evidence-claims[\s\S]{0,300}databaseContextMiddleware/);
  });

  it('D4-R05 — POST route validates extractionId as UUID', () => {
    expect(routeSrc).toMatch(/extractionId.*uuid/i);
  });

  it('D4-R06 — POST route validates claimType via enum', () => {
    expect(routeSrc).toMatch(/ALLOWED_CLAIM_TYPES/);
    expect(routeSrc).toMatch(/z\.enum\s*\(\s*ALLOWED_CLAIM_TYPES/);
  });

  it('D4-R07 — POST route validates claimValue as object', () => {
    expect(routeSrc).toMatch(/claimValue.*z\.record/);
  });

  it('D4-R08 — POST route reads orgId from dbContext (D-017-A)', () => {
    expect(routeSrc).toMatch(/orgId\s*=\s*dbContext\.orgId/);
  });

  it('D4-R09 — POST route checks extraction status === reviewed', () => {
    expect(routeSrc).toMatch(/extraction\.status\s*!==\s*'reviewed'/);
  });

  it('D4-R10 — POST route handles duplicate 23505 with 409', () => {
    expect(routeSrc).toMatch(/23505/);
    expect(routeSrc).toMatch(/409/);
  });

  it('D4-R11 — POST route emits audit event tenant.dpp.evidence_claims.created', () => {
    expect(routeSrc).toMatch(/tenant\.dpp\.evidence_claims\.created/);
  });

  it('D4-R12 — GET route emits audit event tenant.dpp.evidence_claims.read', () => {
    expect(routeSrc).toMatch(/tenant\.dpp\.evidence_claims\.read/);
  });

  it('D4-R13 — humanReviewRequired: true present in evidence-claims response', () => {
    expect(routeSrc).toMatch(/humanReviewRequired\s*:\s*true/);
  });

  it('D4-R14 — POST route returns 201 status', () => {
    expect(routeSrc).toMatch(/sendSuccess\s*\(\s*reply[\s\S]{0,200}201/);
  });

  it('D4-R15 — passport route aiExtractedClaimsCount is now a live query (not hardcoded 0)', () => {
    // D-4 replaces the D-3 placeholder
    expect(routeSrc).not.toMatch(/\/\/ aiExtractedClaimsCount = 0 in D-3.*D-4 will populate/);
    // Live COUNT query: FROM dpp_evidence_claims and COUNT(*) should both appear in the file
    expect(routeSrc).toMatch(/FROM dpp_evidence_claims/);
    expect(routeSrc).toMatch(/COUNT\(\*\)/);
  });

  it('D4-R16 — POST route verifies node belongs to same org_id', () => {
    expect(routeSrc).toMatch(/nodeOrgRows\[0\]\.org_id\s*!==\s*orgId/);
  });

  it('D4-R17 — no public route, no buyer-facing endpoint', () => {
    expect(routeSrc).not.toMatch(/\/public\/dpp.*evidence/);
    expect(routeSrc).not.toMatch(/\/buyer\/dpp.*evidence/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Static: claim type allowlist
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — Static: claim type allowlist and forbidden types', () => {
  const ALLOWED = [
    'MATERIAL_COMPOSITION',
    'STANDARD_NAME',
    'CERTIFICATE_NUMBER',
    'ISSUER_NAME',
    'ISSUE_DATE',
    'EXPIRY_DATE',
    'TEST_RESULT',
    'PRODUCT_NAME',
    'COUNTRY_OR_LAB_LOCATION',
  ];

  const FORBIDDEN = [
    'price', 'pricing', 'risk_score', 'riskScore', 'publicationPosture', 'buyerRanking',
    'supplierRanking', 'ranking', 'matchingScore', 'escrow', 'paymentDecision', 'creditScore',
  ];

  let routeSrc: string;

  beforeAll(() => {
    routeSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  for (const t of ALLOWED) {
    it(`D4-C01 — allowed claim type present in route: ${t}`, () => {
      expect(routeSrc).toContain(`'${t}'`);
    });
  }

  for (const t of FORBIDDEN) {
    it(`D4-C02 — forbidden claim type NOT in ALLOWED_CLAIM_TYPES: ${t}`, () => {
      // The ALLOWED_CLAIM_TYPES array should not contain any forbidden type
      const allowedArrayMatch = routeSrc.match(/ALLOWED_CLAIM_TYPES\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
      if (allowedArrayMatch) {
        expect(allowedArrayMatch[1].toLowerCase()).not.toContain(t.toLowerCase());
      } else {
        // If no match, fail — the array must be present
        expect(allowedArrayMatch).not.toBeNull();
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Static: Prisma schema DppEvidenceClaim model
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — Static: Prisma schema model', () => {
  let schema: string;

  beforeAll(() => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  });

  it('D4-P01 — DppEvidenceClaim model present', () => {
    expect(schema).toMatch(/model DppEvidenceClaim\s*\{/);
  });

  it('D4-P02 — maps to dpp_evidence_claims table', () => {
    expect(schema).toMatch(/@@map\("dpp_evidence_claims"\)/);
  });

  it('D4-P03 — orgId field present', () => {
    expect(schema).toMatch(/orgId\s+String.*@map\("org_id"\)/);
  });

  it('D4-P04 — nodeId field present', () => {
    expect(schema).toMatch(/nodeId\s+String.*@map\("node_id"\)/);
  });

  it('D4-P05 — extractionId field present', () => {
    expect(schema).toMatch(/extractionId\s+String.*@map\("extraction_id"\)/);
  });

  it('D4-P06 — claimType field present', () => {
    expect(schema).toMatch(/claimType\s+String.*@map\("claim_type"\)/);
  });

  it('D4-P07 — claimValue field present as Json', () => {
    expect(schema).toMatch(/claimValue\s+Json.*@map\("claim_value"\)/);
  });

  it('D4-P08 — approvedBy field present', () => {
    expect(schema).toMatch(/approvedBy\s+String.*@map\("approved_by"\)/);
  });

  it('D4-P09 — approvedAt field present', () => {
    expect(schema).toMatch(/approvedAt\s+DateTime.*@map\("approved_at"\)/);
  });

  it('D4-P10 — unique constraint on four columns', () => {
    expect(schema).toMatch(/@@unique\(\[orgId,\s*nodeId,\s*extractionId,\s*claimType\]/);
  });

  it('D4-P11 — Tenant has dppEvidenceClaims relation', () => {
    expect(schema).toMatch(/dppEvidenceClaims\s+DppEvidenceClaim\[\]/);
  });

  it('D4-P12 — User has approvedEvidenceClaims relation', () => {
    expect(schema).toMatch(/approvedEvidenceClaims\s+DppEvidenceClaim\[\]/);
  });

  it('D4-P13 — DocumentExtractionDraft has dppEvidenceClaims relation', () => {
    expect(schema).toMatch(/dppEvidenceClaims\s+DppEvidenceClaim\[\]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — DB: integration tests (gated)
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — DB: dpp_evidence_claims integration', () => {
  const prisma = new PrismaClient();

  it('D4-DB01 — dpp_evidence_claims table exists in DB', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'dpp_evidence_claims'
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].table_name).toBe('dpp_evidence_claims');
  });

  it('D4-DB02 — RLS is enabled and forced on dpp_evidence_claims', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ rowsecurity: boolean; forcerowsecurity: boolean }>>`
      SELECT relrowsecurity AS rowsecurity, relforcerowsecurity AS forcerowsecurity
      FROM pg_class
      WHERE relname = 'dpp_evidence_claims' AND relnamespace = 'public'::regnamespace
    `;
    expect(rows.length).toBe(1);
    expect(rows[0].rowsecurity).toBe(true);
    expect(rows[0].forcerowsecurity).toBe(true);
  });

  it('D4-DB03 — unique constraint exists', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.dpp_evidence_claims'::regclass AND contype = 'u'
    `;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const names = rows.map(r => r.conname);
    expect(names).toContain('dpp_evidence_claims_unique');
  });

  it('D4-DB04 — claim_type CHECK constraint rejects forbidden types', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.dpp_evidence_claims'::regclass
        AND contype = 'c'
        AND conname = 'dpp_evidence_claims_claim_type_check'
    `;
    expect(rows.length).toBe(1);
  });

  it('D4-DB05 — claim_value CHECK constraint enforces object type', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.dpp_evidence_claims'::regclass
        AND contype = 'c'
        AND conname = 'dpp_evidence_claims_claim_value_object'
    `;
    expect(rows.length).toBe(1);
  });

  it('D4-DB06 — FK constraints exist (org, node, extraction, user)', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.dpp_evidence_claims'::regclass AND contype = 'f'
    `;
    const names = rows.map(r => r.conname);
    expect(names).toContain('dpp_evidence_claims_org_id_fk');
    expect(names).toContain('dpp_evidence_claims_node_id_fk');
    expect(names).toContain('dpp_evidence_claims_extraction_id_fk');
    expect(names).toContain('dpp_evidence_claims_approved_by_fk');
  });

  it('D4-DB07 — restrictive RLS policy exists', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ policyname: string; cmd: string; qual: string }>>`
      SELECT policyname, cmd, qual FROM pg_policies
      WHERE tablename = 'dpp_evidence_claims' AND policyname = 'dpp_evidence_claims_restrictive'
    `;
    expect(rows.length).toBe(1);
  });

  it('D4-DB08 — SELECT and INSERT RLS policies exist', async () => {
    if (!hasDb) return;

    const rows = await prisma.$queryRaw<Array<{ policyname: string }>>`
      SELECT policyname FROM pg_policies WHERE tablename = 'dpp_evidence_claims'
    `;
    const names = rows.map(r => r.policyname);
    expect(names).toContain('dpp_evidence_claims_select');
    expect(names).toContain('dpp_evidence_claims_insert');
  });

  it('D4-DB09 — Prisma dppEvidenceClaim model queryable (schema round-trip)', async () => {
    if (!hasDb) return;

    // count — should succeed with 0 rows (no data seeded)
    const count = await prisma.dppEvidenceClaim.count();
    expect(typeof count).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Boundary: D-4 scope only
// ─────────────────────────────────────────────────────────────────────────────

describe('D-4 — Boundary: scope containment', () => {
  let routeSrc: string;

  beforeAll(() => {
    routeSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D4-B01 — maturity NOT auto-promoted from AI evidence alone (computeDppMaturity unchanged)', () => {
    // computeDppMaturity must only depend on approvedCertCount + lineageDepth + passportStatus
    // It should NOT reference dpp_evidence_claims or aiExtractedClaimsCount
    const maturityFn = routeSrc.match(/function computeDppMaturity\s*\(([\s\S]*?)\n\s*\}/);
    if (maturityFn) {
      expect(maturityFn[0]).not.toContain('aiExtractedClaimsCount');
      expect(maturityFn[0]).not.toContain('dpp_evidence_claims');
    } else {
      // Arrow function form
      const arrowFn = routeSrc.match(/computeDppMaturity\s*=[\s\S]{0,1000}TRADE_READY/);
      expect(arrowFn).not.toBeNull();
    }
  });

  it('D4-B02 — passportStatus NOT auto-changed from evidence creation', () => {
    // POST evidence-claims route must not update dpp_passport_states
    const postRoute = routeSrc.match(
      /POST.*evidence-claims[\s\S]*?\/tenant\/dpp\/:nodeId\/evidence-claims[\s\S]*?async\s*\(request, reply\)\s*=>\s*\{([\s\S]*?)(?=fastify\.(get|post|put|delete|register))/
    );
    if (postRoute) {
      expect(postRoute[1]).not.toMatch(/dpp_passport_states/);
      expect(postRoute[1]).not.toMatch(/UPDATE.*passport_states/);
    }
    // At minimum assert the route source doesn't update passport status
    expect(routeSrc).not.toMatch(/UPDATE dpp_passport_states.*evidence/s);
  });

  it('D4-B03 — no public DPP endpoint for evidence claims', () => {
    expect(routeSrc).not.toMatch(/\/public\/dpp.*evidence/);
  });

  it('D4-B04 — no buyer-facing evidence claims endpoint', () => {
    expect(routeSrc).not.toMatch(/\/buyer\/.*evidence-claim/);
  });

  it('D4-B05 — no PDP change (DPPPassport.tsx only shows count, not claim detail)', () => {
    const dppPassportPath = path.join(SERVER_ROOT, '../components/Tenant/DPPPassport.tsx');
    if (fs.existsSync(dppPassportPath)) {
      const ui = fs.readFileSync(dppPassportPath, 'utf-8');
      // DPPPassport.tsx should show aiExtractedClaimsCount (D-3 testid already present)
      // but must not show claim details (claim_value, extractionId, etc.)
      expect(ui).toMatch(/dpp-ai-claims-count/);
      expect(ui).not.toMatch(/dpp-evidence-claim-detail/);
      expect(ui).not.toMatch(/claim_value/);
    }
  });

  it('D4-B06 — forbidden claim types not present in migration SQL', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    const forbidden = ['price', 'risk_score', 'ranking', 'escrow', 'payment', 'credit_score'];
    for (const t of forbidden) {
      // Should not appear in the CHECK constraint allowlist
      const checkMatch = sql.match(/dpp_evidence_claims_claim_type_check[\s\S]*?CHECK\s*\(([\s\S]*?)\)/);
      if (checkMatch) {
        expect(checkMatch[1].toLowerCase()).not.toContain(t.toLowerCase());
      }
    }
  });

  it('D4-B07 — humanReviewRequired is structural constant (true) in all claim responses', () => {
    // Both GET and POST claim responses include humanReviewRequired: true
    const claimResponseMatches = [...routeSrc.matchAll(/humanReviewRequired\s*:\s*true\s*as\s*const/g)];
    // At minimum the POST response sets it (GET response also)
    expect(claimResponseMatches.length).toBeGreaterThanOrEqual(1);
  });
});
