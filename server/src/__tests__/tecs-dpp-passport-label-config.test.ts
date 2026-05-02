/**
 * TECS-DPP-PASSPORT-NETWORK-020 — White-Label Passport Naming
 *
 * Slice: dpp_passport_label_config
 *   Table:  dpp_passport_label_config (with RLS, UNIQUE org_id)
 *   Tenant: GET/PUT /api/tenant/dpp/passport-label-config
 *   Public: labelConfig in public DPP passport response
 *   UI:     WLDppLabelPanel.tsx, PublicPassport.tsx (testid: public-passport-buyer-label)
 *
 * Test strategy:
 *   Group A — Schema/source: migration + schema.prisma + route sources
 *   Group B — Tenant GET/PUT: source guards, defaults, upsert logic
 *   Group C — Input validation: required, max-len, HTML injection, misleading terms
 *   Group D — Tenant isolation: org_id scope
 *   Group E — Public route: labelConfig in response, fallback
 *   Group F — Regression: structured-data route unaffected, existing DPP routes present
 *   Group G — UI: WLDppLabelPanel.tsx test IDs, PublicPassport.tsx buyer-label testid
 *   Group H — DB integration (gated by hasDb)
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
const SCHEMA_PATH = path.join(SERVER_ROOT, 'prisma/schema.prisma');
const MIGRATION_PATH = path.join(
  SERVER_ROOT,
  'prisma/migrations/20260514000000_tecs_dpp_passport_label_config/migration.sql',
);
const WL_PANEL_PATH = path.resolve(
  __dirname,
  '../../../../components/WhiteLabelAdmin/WLDppLabelPanel.tsx',
);
const PUBLIC_PASSPORT_PATH = path.resolve(
  __dirname,
  '../../../../components/Public/PublicPassport.tsx',
);

// ─────────────────────────────────────────────────────────────────────────────
// Group A — Schema/source
// ─────────────────────────────────────────────────────────────────────────────

describe('A — Schema/source: migration + schema.prisma', () => {
  it('A01 — migration SQL file exists', () => {
    expect(fs.existsSync(MIGRATION_PATH), `Migration not found: ${MIGRATION_PATH}`).toBe(true);
  });

  it('A02 — migration creates dpp_passport_label_config table', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/CREATE TABLE.*dpp_passport_label_config/is);
  });

  it('A03 — migration has UNIQUE constraint on org_id', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/UNIQUE.*org_id|org_id.*UNIQUE/is);
  });

  it('A04 — migration has CHECK constraint on buyer_facing_label length (1..80)', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/buyer_facing_label_check|char_length.*buyer_facing_label/is);
  });

  it('A05 — migration enables RLS on dpp_passport_label_config', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it('A06 — migration grants SELECT to texqtic_public_lookup', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql).toMatch(/GRANT.*SELECT.*texqtic_public_lookup|texqtic_public_lookup.*SELECT/is);
  });

  it('A07 — schema.prisma contains dpp_passport_label_config model', () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    expect(schema).toContain('model dpp_passport_label_config {');
  });

  it('A08 — schema.prisma model has buyer_facing_label field with default', () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    expect(schema).toMatch(/buyer_facing_label.*String.*default\("Verified Supply Chain Passport"\)/);
  });

  it('A09 — schema.prisma model has show_texqtic_brand Boolean default true', () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    expect(schema).toMatch(/show_texqtic_brand.*Boolean.*default\(true\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group B — Tenant route source: GET/PUT guards and logic
// ─────────────────────────────────────────────────────────────────────────────

describe('B — Tenant route source: GET/PUT guards and logic', () => {
  let tenantSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(TENANT_ROUTE_PATH), `tenant.ts not found`).toBe(true);
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('B01 — GET /tenant/dpp/passport-label-config declared', () => {
    expect(tenantSrc).toMatch(/fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passport-label-config['"]/);
  });

  it('B02 — PUT /tenant/dpp/passport-label-config declared', () => {
    expect(tenantSrc).toMatch(/fastify\.put\s*\(\s*['"]\/tenant\/dpp\/passport-label-config['"]/);
  });

  it('B03 — GET route uses tenantAuthMiddleware', () => {
    // Route block contains tenantAuthMiddleware
    const getBlock = tenantSrc.match(
      /fastify\.get\s*\(\s*['"]\/tenant\/dpp\/passport-label-config['"]([\s\S]*?)fastify\.(get|put|post|delete|patch)/,
    );
    expect(getBlock?.[1]).toContain('tenantAuthMiddleware');
  });

  it('B04 — PUT route guards ADMIN/OWNER role', () => {
    expect(tenantSrc).toMatch(
      /ADMIN.*OWNER.*role required to configure passport label|userRole.*ADMIN.*OWNER/is,
    );
  });

  it('B05 — GET returns fallback defaults when no DB row', () => {
    expect(tenantSrc).toContain("buyerFacingLabel: 'Verified Supply Chain Passport'");
  });

  it('B06 — PUT uses upsert on org_id', () => {
    expect(tenantSrc).toMatch(/dpp_passport_label_config\.upsert/);
    expect(tenantSrc).toMatch(/where.*org_id/is);
  });

  it('B07 — PUT writes audit log with action dpp.passport_label_config.upserted', () => {
    expect(tenantSrc).toContain('dpp.passport_label_config.upserted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group C — Input validation in PUT route source
// ─────────────────────────────────────────────────────────────────────────────

describe('C — Input validation in PUT route source', () => {
  let tenantSrc: string;

  beforeAll(() => {
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('C01 — buyerFacingLabel required (min 1)', () => {
    expect(tenantSrc).toMatch(/buyerFacingLabel[\s\S]{0,200}min\(1/);
  });

  it('C02 — buyerFacingLabel max 80 chars', () => {
    expect(tenantSrc).toMatch(/buyerFacingLabel[\s\S]{0,200}max\(80/);
  });

  it('C03 — publicTitle max 120 chars', () => {
    expect(tenantSrc).toMatch(/publicTitle[\s\S]{0,200}max\(120/);
  });

  it('C04 — subtitle max 180 chars', () => {
    expect(tenantSrc).toMatch(/subtitle[\s\S]{0,200}max\(180/);
  });

  it('C04 — HTML injection guard present', () => {
    expect(tenantSrc).toMatch(/<|>|&lt;|&gt;/);
    expect(tenantSrc).toContain('Label text must not contain HTML markup');
  });

  it('C05 — misleading terms guard present', () => {
    expect(tenantSrc).toContain('Government Approved');
    expect(tenantSrc).toContain('Regulator Certified');
    expect(tenantSrc).toContain('EU Compliant');
    expect(tenantSrc).toContain('GS1 Certified');
    expect(tenantSrc).toContain('Official Regulator Passport');
  });

  it('C06 — misleading term rejection returns VALIDATION_ERROR', () => {
    expect(tenantSrc).toMatch(/misleading regulatory claim/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group D — Tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('D — Tenant isolation', () => {
  let tenantSrc: string;

  beforeAll(() => {
    tenantSrc = fs.readFileSync(TENANT_ROUTE_PATH, 'utf-8');
  });

  it('D01 — GET query scoped by org_id from dbContext', () => {
    expect(tenantSrc).toMatch(/where.*org_id.*dbContext\.orgId/is);
  });

  it('D02 — PUT upsert create/update always uses dbContext.orgId (not user-supplied)', () => {
    // The org_id in create/update must reference dbContext.orgId
    const upsertBlock = tenantSrc.match(
      /dpp_passport_label_config\.upsert\s*\(\s*\{([\s\S]*?)\}\s*\)/,
    );
    expect(upsertBlock?.[1]).toContain('dbContext.orgId');
  });

  it('D03 — texqtic_public_lookup in public.ts for label config lookup', () => {
    const publicSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
    // Must SET LOCAL ROLE before querying dpp_passport_label_config
    expect(publicSrc).toMatch(/SET LOCAL ROLE texqtic_public_lookup[\s\S]{0,500}dpp_passport_label_config/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group E — Public route: labelConfig in response
// ─────────────────────────────────────────────────────────────────────────────

describe('E — Public route: labelConfig in response', () => {
  let publicSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(PUBLIC_ROUTE_PATH), `public.ts not found`).toBe(true);
    publicSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('E01 — D6PublicDppData interface has labelConfig field', () => {
    expect(publicSrc).toMatch(/labelConfig.*\{[\s\S]{0,300}buyerFacingLabel.*string/);
  });

  it('E02 — labelConfig fallback uses "Verified Supply Chain Passport"', () => {
    expect(publicSrc).toContain("buyerFacingLabel: 'Verified Supply Chain Passport'");
  });

  it('E03 — labelConfig included in handlePublicDppRead payload', () => {
    // The payload shape in handlePublicDppRead must include labelConfig: data.labelConfig
    expect(publicSrc).toMatch(/labelConfig.*data\.labelConfig/);
  });

  it('E04 — Phase 1.5 lookup uses WHERE org_id = stateRow.org_id', () => {
    expect(publicSrc).toMatch(/dpp_passport_label_config[\s\S]{0,200}WHERE org_id/is);
  });

  it('E05 — label config lookup is non-fatal (catch block resets to empty array)', () => {
    expect(publicSrc).toMatch(/labelConfigRows\s*=\s*\[\]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group F — Regression: structured-data and existing DPP routes
// ─────────────────────────────────────────────────────────────────────────────

describe('F — Regression: existing DPP routes unaffected', () => {
  let publicSrc: string;

  beforeAll(() => {
    publicSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf-8');
  });

  it('F01 — GET /dpp/:publicPassportId still present', () => {
    expect(publicSrc).toMatch(/fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId['"]/);
  });

  it('F02 — GET /dpp/:publicPassportId/structured-data still present', () => {
    expect(publicSrc).toMatch(
      /fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\/structured-data['"]/,
    );
  });

  it('F03 — exportedAt still present in payload', () => {
    expect(publicSrc).toContain('exportedAt');
  });

  it('F04 — evidenceSummary still present in payload', () => {
    expect(publicSrc).toContain('evidenceSummary');
  });

  it('F05 — unsafe .json suffix route intentionally absent', () => {
    expect(publicSrc).not.toMatch(
      /fastify\.get\s*\(\s*['"]\/dpp\/:publicPassportId\\\\.json['"]/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group G — UI source: WLDppLabelPanel.tsx + PublicPassport.tsx
// ─────────────────────────────────────────────────────────────────────────────

describe('G — UI: WLDppLabelPanel.tsx + PublicPassport.tsx', () => {
  let wlSrc: string;
  let passportSrc: string;

  beforeAll(() => {
    expect(fs.existsSync(WL_PANEL_PATH), `WLDppLabelPanel.tsx not found: ${WL_PANEL_PATH}`).toBe(true);
    expect(
      fs.existsSync(PUBLIC_PASSPORT_PATH),
      `PublicPassport.tsx not found: ${PUBLIC_PASSPORT_PATH}`,
    ).toBe(true);
    wlSrc = fs.readFileSync(WL_PANEL_PATH, 'utf-8');
    passportSrc = fs.readFileSync(PUBLIC_PASSPORT_PATH, 'utf-8');
  });

  it('G01 — WLDppLabelPanel has testid wl-dpp-label-config-panel', () => {
    expect(wlSrc).toContain('wl-dpp-label-config-panel');
  });

  it('G02 — WLDppLabelPanel has testid wl-dpp-label-buyer-facing-input', () => {
    expect(wlSrc).toContain('wl-dpp-label-buyer-facing-input');
  });

  it('G03 — WLDppLabelPanel has testid wl-dpp-label-public-title-input', () => {
    expect(wlSrc).toContain('wl-dpp-label-public-title-input');
  });

  it('G04 — WLDppLabelPanel has testid wl-dpp-label-subtitle-input', () => {
    expect(wlSrc).toContain('wl-dpp-label-subtitle-input');
  });

  it('G05 — WLDppLabelPanel has testid wl-dpp-label-save', () => {
    expect(wlSrc).toContain('wl-dpp-label-save');
  });

  it('G06 — WLDppLabelPanel has testid wl-dpp-label-fallback-note', () => {
    expect(wlSrc).toContain('wl-dpp-label-fallback-note');
  });

  it('G07 — WLDppLabelPanel uses tenantGet and tenantPut', () => {
    expect(wlSrc).toContain('tenantGet');
    expect(wlSrc).toContain('tenantPut');
  });

  it('G08 — WLDppLabelPanel does NOT use dangerouslySetInnerHTML', () => {
    expect(wlSrc).not.toContain('dangerouslySetInnerHTML');
  });

  it('G09 — PublicPassport has testid public-passport-buyer-label', () => {
    expect(passportSrc).toContain('public-passport-buyer-label');
  });

  it('G10 — PublicPassport renders labelConfig?.buyerFacingLabel (not hardcoded)', () => {
    expect(passportSrc).toMatch(/labelConfig\?\.buyerFacingLabel/);
  });

  it('G11 — PublicPassport has fallback to "Verified Supply Chain Passport"', () => {
    expect(passportSrc).toMatch(/labelConfig\?\.buyerFacingLabel.*\?\?.*Verified Supply Chain Passport/);
  });

  it('G12 — PublicPassport PassportData interface has labelConfig field', () => {
    expect(passportSrc).toMatch(/labelConfig\?.*\{[\s\S]{0,200}buyerFacingLabel/);
  });

  it('G13 — PublicPassport does NOT use dangerouslySetInnerHTML for label', () => {
    expect(passportSrc).not.toContain('dangerouslySetInnerHTML');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group H — DB integration (gated by hasDb)
// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)('H — DB integration', () => {
  it('H01 — dpp_passport_label_config table exists in Prisma client', async () => {
    const prisma = new PrismaClient();
    try {
      expect(typeof prisma.dpp_passport_label_config.findUnique).toBe('function');
    } finally {
      await prisma.$disconnect();
    }
  });

  it('H02 — can upsert and retrieve label config for a test org', async () => {
    const prisma = new PrismaClient();
    const testOrgId = '00000000-0000-0000-0000-000000000020';
    try {
      await prisma.dpp_passport_label_config.upsert({
        where: { org_id: testOrgId },
        create: {
          org_id: testOrgId,
          buyer_facing_label: 'Test Label 020',
        },
        update: {
          buyer_facing_label: 'Test Label 020',
        },
      });
      const row = await prisma.dpp_passport_label_config.findUnique({
        where: { org_id: testOrgId },
      });
      expect(row).not.toBeNull();
      expect(row?.buyer_facing_label).toBe('Test Label 020');
      // cleanup
      await prisma.dpp_passport_label_config.delete({ where: { org_id: testOrgId } });
    } finally {
      await prisma.$disconnect();
    }
  });
});
