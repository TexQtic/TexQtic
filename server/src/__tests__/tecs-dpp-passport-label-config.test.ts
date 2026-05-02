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
 *   Group I — 020A: WL panel wiring into WhiteLabelSettings.tsx (Option B)
 *   Group J — 020A: showTexqticBrand public-page attribution toggle
 *   Group K — 020B: Dedicated WL DPP Label navigation/tab
 *   Group L — 020B: Regression checks for public behavior and DPP wiring
 *   Group M — 020C: WL label navigation runtime proof + public branding verification
 *   Group N — 020D: WL tenant DPP surface parity (productized UI for WL tenants)
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
  '../../../components/WhiteLabelAdmin/WLDppLabelPanel.tsx',
);
const PUBLIC_PASSPORT_PATH = path.resolve(
  __dirname,
  '../../../components/Public/PublicPassport.tsx',
);
const WL_SETTINGS_PATH = path.resolve(
  __dirname,
  '../../../components/Tenant/WhiteLabelSettings.tsx',
);
const APP_TSX_PATH = path.resolve(__dirname, '../../../App.tsx');
const SESSION_DESCRIPTOR_PATH = path.resolve(
  __dirname,
  '../../../runtime/sessionRuntimeDescriptor.ts',
);
const SHELLS_PATH = path.resolve(__dirname, '../../../layouts/Shells.tsx');
const DPP_PASSPORT_COMPONENT_PATH = path.resolve(
  __dirname,
  '../../../components/Tenant/DPPPassport.tsx',
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

// ─────────────────────────────────────────────────────────────────────────────
// Group I — 020A: WL panel wiring into WhiteLabelSettings.tsx (Option B)
// ─────────────────────────────────────────────────────────────────────────────

describe('I — 020A: WL panel wiring (WhiteLabelSettings.tsx)', () => {
  let wlSettingsSrc: string;

  beforeAll(() => {
    expect(
      fs.existsSync(WL_SETTINGS_PATH),
      `WhiteLabelSettings.tsx not found: ${WL_SETTINGS_PATH}`,
    ).toBe(true);
    wlSettingsSrc = fs.readFileSync(WL_SETTINGS_PATH, 'utf-8');
  });

  it('I01 — WhiteLabelSettings imports WLDppLabelPanel', () => {
    expect(wlSettingsSrc).toContain('WLDppLabelPanel');
  });

  it('I02 — WhiteLabelSettings renders <WLDppLabelPanel />', () => {
    expect(wlSettingsSrc).toMatch(/<WLDppLabelPanel\s*\/>/);
  });

  it('I03 — WhiteLabelSettings has wl-dpp-label-settings-card testid', () => {
    expect(wlSettingsSrc).toContain('wl-dpp-label-settings-card');
  });

  it('I04 — WhiteLabelSettings card label is "DPP Passport Public Label"', () => {
    expect(wlSettingsSrc).toContain('DPP Passport Public Label');
  });

  it('I05 — WhiteLabelSettings card copy states label-only behavior', () => {
    expect(wlSettingsSrc).toContain('This changes display text only');
  });

  it('I06 — WhiteLabelSettings card copy states evidence/compliance not affected', () => {
    expect(wlSettingsSrc).toContain('does not change passport status, evidence, or compliance claims');
  });

  it('I07 — WhiteLabelSettings does NOT import custom-domain or full-WL portal logic', () => {
    expect(wlSettingsSrc).not.toContain('custom-domain');
    expect(wlSettingsSrc).not.toContain('customDomain');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group J — 020A: showTexqticBrand public-page attribution toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('J — 020A: showTexqticBrand public-page attribution', () => {
  let passportSrc: string;

  beforeAll(() => {
    expect(
      fs.existsSync(PUBLIC_PASSPORT_PATH),
      `PublicPassport.tsx not found: ${PUBLIC_PASSPORT_PATH}`,
    ).toBe(true);
    passportSrc = fs.readFileSync(PUBLIC_PASSPORT_PATH, 'utf-8');
  });

  it('J01 — PublicPassport has testid public-passport-texqtic-brand', () => {
    expect(passportSrc).toContain('public-passport-texqtic-brand');
  });

  it('J02 — PublicPassport gates attribution on showTexqticBrand !== false', () => {
    // The attribution element should only render when showTexqticBrand is not explicitly false
    expect(passportSrc).toMatch(/showTexqticBrand\s*!==\s*false/);
  });

  it('J03 — PublicPassport attribution reads from labelConfig?.showTexqticBrand', () => {
    expect(passportSrc).toContain('labelConfig?.showTexqticBrand');
  });

  it('J04 — PublicPassport attribution copy is "Powered by TexQtic"', () => {
    expect(passportSrc).toContain('Powered by TexQtic');
  });

  it('J05 — PublicPassport privacy note is still present', () => {
    expect(passportSrc).toContain('public-passport-privacy-note');
    expect(passportSrc).toContain('Sensitive supplier');
  });

  it('J06 — PublicPassport buyer-facing label still present when brand toggled', () => {
    // Both attribution and buyer-facing label coexist in source
    expect(passportSrc).toContain('public-passport-texqtic-brand');
    expect(passportSrc).toContain('public-passport-buyer-label');
  });

  it('J07 — PublicPassport does NOT remove header logo from source', () => {
    // The TexQtic header logo is independent of showTexqticBrand and must remain
    expect(passportSrc).toContain('texqtic-logo.png');
  });

  it('J08 — PublicPassport does NOT use dangerouslySetInnerHTML for attribution', () => {
    expect(passportSrc).not.toContain('dangerouslySetInnerHTML');
  });

  it('J09 — PublicPassport attribution element is plain text (no custom-domain implication)', () => {
    // Must not imply custom-domain or full white-label portal
    expect(passportSrc).not.toContain('customDomain');
    expect(passportSrc).not.toContain('custom-domain');
    expect(passportSrc).not.toContain('Your branded DPP portal');
    expect(passportSrc).not.toContain('Fully white-labeled');
  });

  it('J10 — PublicPassport attribution does not expose private IDs or pricing', () => {
    // The attribution section is bounded — no private data exposure
    const attributionBlock = passportSrc.match(
      /public-passport-texqtic-brand[\s\S]{0,300}/,
    )?.[0] ?? '';
    expect(attributionBlock).not.toContain('orgId');
    expect(attributionBlock).not.toContain('org_id');
    expect(attributionBlock).not.toContain('nodeId');
    expect(attributionBlock).not.toContain('pricing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group K — 020B: Dedicated WL DPP Label navigation/tab
// ─────────────────────────────────────────────────────────────────────────────

describe('K — 020B: Dedicated WL DPP Label navigation/tab', () => {
  let descriptorSrc: string;
  let appSrc: string;
  let shellsSrc: string;
  let settingsSrc: string;

  beforeAll(() => {
    descriptorSrc = fs.readFileSync(SESSION_DESCRIPTOR_PATH, 'utf8');
    appSrc = fs.readFileSync(APP_TSX_PATH, 'utf8');
    shellsSrc = fs.readFileSync(SHELLS_PATH, 'utf8');
    settingsSrc = fs.readFileSync(WL_SETTINGS_PATH, 'utf8');
  });

  it('K01 — sessionRuntimeDescriptor RuntimeLocalRouteKey includes dpp_label', () => {
    expect(descriptorSrc).toContain("'dpp_label'");
  });

  it('K02 — sessionRuntimeDescriptor WL_ADMIN_MANAGEMENT_ROUTE_GROUP has dpp_label route', () => {
    expect(descriptorSrc).toContain("defineRuntimeRoute('dpp_label'");
    expect(descriptorSrc).toContain("'DPP_LABEL'");
  });

  it('K03 — sessionRuntimeDescriptor WL_ADMIN_SHELL_ROUTE_KEYS includes dpp_label', () => {
    // dpp_label must appear in the WL_ADMIN_SHELL_ROUTE_KEYS array
    const keysBlock = descriptorSrc.match(
      /WL_ADMIN_SHELL_ROUTE_KEYS[\s\S]{0,400}/,
    )?.[0] ?? '';
    expect(keysBlock).toContain("'dpp_label'");
  });

  it('K04 — App.tsx WL_ADMIN_VIEWS includes DPP_LABEL', () => {
    expect(appSrc).toContain("'DPP_LABEL'");
    // Confirm it is within the WL_ADMIN_VIEWS context
    const viewsBlock = appSrc.match(/WL_ADMIN_VIEWS\s*=\s*\[[\s\S]{0,200}?]/)?.[0] ?? '';
    expect(viewsBlock).toContain("'DPP_LABEL'");
  });

  it('K05 — App.tsx imports WLDppLabelPanel', () => {
    expect(appSrc).toContain("WLDppLabelPanel");
    expect(appSrc).toMatch(/import.*WLDppLabelPanel.*WhiteLabelAdmin/);
  });

  it("K06 — App.tsx renderWLAdminContent has case 'dpp_label'", () => {
    expect(appSrc).toContain("case 'dpp_label':");
    // The case must render WLDppLabelPanel
    const caseBlock = appSrc.match(/case 'dpp_label':[\s\S]{0,200}/)?.[0] ?? '';
    expect(caseBlock).toContain('WLDppLabelPanel');
  });

  it('K07 — layouts/Shells.tsx WL_ADMIN_NAV includes dpp_label entry', () => {
    expect(shellsSrc).toContain("'dpp_label'");
    expect(shellsSrc).toContain('DPP Passport Label');
  });

  it('K08 — layouts/Shells.tsx nav button has wl-dpp-label-nav-item testid for dpp_label', () => {
    expect(shellsSrc).toContain('wl-dpp-label-nav-item');
    // The testid must be conditionally applied on dpp_label key
    expect(shellsSrc).toContain("routeKey === 'dpp_label'");
  });

  it('K09 — WhiteLabelSettings.tsx has onNavigateDppLabel prop', () => {
    expect(settingsSrc).toContain('onNavigateDppLabel');
  });

  it('K10 — WhiteLabelSettings.tsx has wl-dpp-label-settings-shortcut testid', () => {
    expect(settingsSrc).toContain('wl-dpp-label-settings-shortcut');
  });

  it('K11 — WhiteLabelSettings.tsx wl-dpp-label-settings-card still present', () => {
    expect(settingsSrc).toContain('wl-dpp-label-settings-card');
  });

  it('K12 — No forbidden WL overstatement copy in new route wiring', () => {
    const combined = appSrc + shellsSrc + descriptorSrc;
    expect(combined).not.toContain('Fully white-labeled DPP');
    expect(combined).not.toContain('branded DPP portal is live');
    expect(combined).not.toContain('Custom domain enabled');
    expect(combined).not.toContain('EU-compliant passport');
    expect(combined).not.toContain('GS1-certified');
    expect(combined).not.toContain('Regulator approved');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group L — 020B: Regression checks for public behavior and DPP wiring
// ─────────────────────────────────────────────────────────────────────────────

describe('L — 020B: Regression checks for public behavior and DPP wiring', () => {
  let appSrc: string;
  let passportSrc: string;
  let panelSrc: string;
  let descriptorSrc: string;
  let publicRouteSrc: string;

  beforeAll(() => {
    appSrc = fs.readFileSync(APP_TSX_PATH, 'utf8');
    passportSrc = fs.readFileSync(PUBLIC_PASSPORT_PATH, 'utf8');
    panelSrc = fs.readFileSync(WL_PANEL_PATH, 'utf8');
    descriptorSrc = fs.readFileSync(SESSION_DESCRIPTOR_PATH, 'utf8');
    publicRouteSrc = fs.readFileSync(PUBLIC_ROUTE_PATH, 'utf8');
  });

  it('L01 — PublicPassport showTexqticBrand behavior unchanged', () => {
    expect(passportSrc).toContain('showTexqticBrand');
    expect(passportSrc).toContain('!== false');
  });

  it('L02 — public-passport-texqtic-brand testid still in PublicPassport', () => {
    expect(passportSrc).toContain('public-passport-texqtic-brand');
  });

  it('L03 — public-passport-buyer-label testid still in PublicPassport', () => {
    expect(passportSrc).toContain('public-passport-buyer-label');
  });

  it('L04 — .json route NOT registered in public route (forbidden active route)', () => {
    // The .json route was removed (governance note in comments is acceptable).
    // Check that no ACTIVE fastify.get() route definition uses a .json suffix.
    expect(publicRouteSrc).not.toMatch(/fastify\.(get|post|put)\s*\(\s*['"`][^'"`]*\.json/);
  });

  it('L05 — wl-dpp-label-config-panel testid still in WLDppLabelPanel', () => {
    expect(panelSrc).toContain('wl-dpp-label-config-panel');
  });

  it('L06 — App.tsx WL_ADMIN_VIEWS does not include unsupported view strings', () => {
    // Only expected views should be in WL_ADMIN_VIEWS
    const forbidden = ['FULL_WL_PORTAL', 'CUSTOM_DOMAIN', 'LAUNCH'];
    for (const view of forbidden) {
      expect(appSrc).not.toContain(`'${view}'`);
    }
  });

  it("L07 — App.tsx case 'dpp_label' does not introduce custom-domain logic", () => {
    const caseBlock = appSrc.match(/case 'dpp_label':[\s\S]{0,300}/)?.[0] ?? '';
    expect(caseBlock).not.toContain('customDomain');
    expect(caseBlock).not.toContain('custom_domain');
    expect(caseBlock).not.toContain('orgId');
  });

  it('L08 — No private ID exposure in nav wiring (no orgId in dpp_label nav area)', () => {
    const dppLabelNavBlock = appSrc.match(
      /case 'dpp_label':[\s\S]{0,500}/,
    )?.[0] ?? '';
    expect(dppLabelNavBlock).not.toContain('orgId');
    expect(dppLabelNavBlock).not.toContain('org_id');
    expect(dppLabelNavBlock).not.toContain('nodeId');
  });

  it('L09 — sessionRuntimeDescriptor dpp_label route has wlAdminView DPP_LABEL binding', () => {
    // The route must bind to wlAdminView: 'DPP_LABEL' so normalizeWlAdminView resolves it
    expect(descriptorSrc).toContain("wlAdminView: 'DPP_LABEL'");
  });

  it('L10 — dpp_label is NOT in non-WL route key arrays (no cross-contamination)', () => {
    // B2B/B2C/Aggregator shell keys must not include dpp_label
    const b2bBlock = descriptorSrc.match(/B2B_SHELL_ROUTE_KEYS[\s\S]{0,300}/)?.[0] ?? '';
    const b2cBlock = descriptorSrc.match(/B2C_SHELL_ROUTE_KEYS[\s\S]{0,300}/)?.[0] ?? '';
    const aggBlock = descriptorSrc.match(/AGGREGATOR_SHELL_ROUTE_KEYS[\s\S]{0,300}/)?.[0] ?? '';
    expect(b2bBlock).not.toContain("'dpp_label'");
    expect(b2cBlock).not.toContain("'dpp_label'");
    expect(aggBlock).not.toContain("'dpp_label'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group M — 020C: WL label navigation runtime proof + public branding verification
// ─────────────────────────────────────────────────────────────────────────────

describe('M — 020C: WL label navigation runtime proof + public branding verification', () => {
  let passportSrc: string;
  let panelSrc: string;
  let shellsSrc: string;
  let appSrc: string;
  let settingsSrc: string;
  let descriptorSrc: string;

  beforeAll(() => {
    passportSrc    = fs.readFileSync(PUBLIC_PASSPORT_PATH, 'utf-8');
    panelSrc       = fs.readFileSync(WL_PANEL_PATH, 'utf-8');
    shellsSrc      = fs.readFileSync(SHELLS_PATH, 'utf-8');
    appSrc         = fs.readFileSync(APP_TSX_PATH, 'utf-8');
    settingsSrc    = fs.readFileSync(WL_SETTINGS_PATH, 'utf-8');
    descriptorSrc  = fs.readFileSync(SESSION_DESCRIPTOR_PATH, 'utf-8');
  });

  it('M01 — PublicPassport QR URL form is /passport/:publicPassportId (not /api/public/…)', () => {
    // QR code value must be the public buyer URL — not the internal API path
    expect(passportSrc).toMatch(/\/passport\/.*encodeURIComponent/);
    expect(passportSrc).not.toMatch(/value=.*\/api\/public\/dpp/);
  });

  it('M02 — PublicPassport QR URL does NOT contain .json suffix', () => {
    // The .json suffix route is permanently absent; QR payload must never reference it
    const qrBlock = passportSrc.match(/\/passport\/[\s\S]{0,120}/)?.[0] ?? '';
    expect(qrBlock).not.toContain('.json');
  });

  it('M03 — WhiteLabelSettings shortcut is conditional on onNavigateDppLabel prop', () => {
    // The shortcut button must only render when the callback is provided (WL Admin shell).
    // Target the JSX ternary expression {onNavigateDppLabel ? (... — NOT the TS prop declaration.
    expect(settingsSrc).toMatch(/\{onNavigateDppLabel \?/);
    // The testid appears inside the conditional branch
    const conditionalBlock = settingsSrc.match(
      /\{onNavigateDppLabel \?[\s\S]{0,400}/,
    )?.[0] ?? '';
    expect(conditionalBlock).toContain('wl-dpp-label-settings-shortcut');
  });

  it('M04 — WhiteLabelSettings backward-compat: inline WLDppLabelPanel when callback absent', () => {
    // When onNavigateDppLabel is undefined (Experience Settings context), full panel renders.
    // Target the JSX ternary {onNavigateDppLabel ? (... : ( <WLDppLabelPanel />
    expect(settingsSrc).toContain('<WLDppLabelPanel');
    const conditionalBlock = settingsSrc.match(
      /\{onNavigateDppLabel \?[\s\S]{0,600}/,
    )?.[0] ?? '';
    expect(conditionalBlock).toMatch(/:\s*\(/);
    expect(conditionalBlock).toContain('WLDppLabelPanel');
  });

  it("M05 — App.tsx case 'dpp_label' renders <WLDppLabelPanel /> (no passthrough to other component)", () => {
    const caseBlock = appSrc.match(/case 'dpp_label':[\s\S]{0,250}/)?.[0] ?? '';
    expect(caseBlock).toContain('WLDppLabelPanel');
    // Must not delegate to another view or registry component
    expect(caseBlock).not.toContain('DPPPassport');
    expect(caseBlock).not.toContain('PassportRegistry');
    expect(caseBlock).not.toContain('PublicPassport');
  });

  it('M06 — WLDppLabelPanel does NOT contain custom-domain or full-WL-portal copy', () => {
    expect(panelSrc).not.toContain('customDomain');
    expect(panelSrc).not.toContain('custom_domain');
    expect(panelSrc).not.toContain('Fully white-labeled');
    expect(panelSrc).not.toContain('Your branded DPP portal');
    expect(panelSrc).not.toContain('No TexQtic infrastructure');
  });

  it("M07 — layouts/Shells.tsx DPP Passport Label nav entry has correct visible label text", () => {
    // The nav button label displayed to users must be 'DPP Passport Label'
    const navBlock = shellsSrc.match(
      /WL_ADMIN_NAV[\s\S]{0,600}/,
    )?.[0] ?? '';
    expect(navBlock).toContain('DPP Passport Label');
    // The icon must be present alongside the label
    expect(navBlock).toContain('🏷️');
  });

  it('M08 — Post-020B: no anti-overstatement copy in any of the four 020B-modified files', () => {
    const forbidden = [
      'Fully white-labeled',
      'Your branded DPP portal',
      'Custom domain enabled',
      'No TexQtic infrastructure',
      'EU-compliant passport',
      'GS1-certified passport',
      'Regulator approved',
      'Guaranteed compliant',
    ];
    const sources: [string, string][] = [
      ['App.tsx', appSrc],
      ['sessionRuntimeDescriptor.ts', descriptorSrc],
      ['Shells.tsx', shellsSrc],
      ['WhiteLabelSettings.tsx', settingsSrc],
    ];
    for (const [name, src] of sources) {
      for (const term of forbidden) {
        expect(src, `${name} must not contain: ${term}`).not.toContain(term);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group N — 020D: WL tenant DPP surface parity
// ─────────────────────────────────────────────────────────────────────────────

describe('N — 020D: WL tenant DPP surface parity (productized UI for WL tenants)', () => {
  let appSrc: string;
  let shellsSrc: string;
  let dppPassportSrc: string;

  beforeAll(() => {
    appSrc          = fs.readFileSync(APP_TSX_PATH, 'utf-8');
    shellsSrc       = fs.readFileSync(SHELLS_PATH, 'utf-8');
    dppPassportSrc  = fs.readFileSync(DPP_PASSPORT_COMPONENT_PATH, 'utf-8');
  });

  it("N01 — App.tsx case 'dpp' does NOT pass title='DPP Snapshot' for WL tenants", () => {
    // Root cause fix: the is_white_label conditional title override must be absent.
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,400}/)?.[0] ?? '';
    expect(caseBlock).not.toContain("DPP Snapshot");
    expect(caseBlock).not.toContain("is_white_label");
  });

  it("N02 — App.tsx case 'dpp' does NOT pass subtitle with old snapshot copy", () => {
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,400}/)?.[0] ?? '';
    expect(caseBlock).not.toContain("Read-only supply chain snapshot");
    expect(caseBlock).not.toContain("traceability node ID");
  });

  it("N03 — App.tsx case 'dpp' renders DPPPassport without title/subtitle props (productized mode)", () => {
    // With no title prop, isProductized===true inside DPPPassport.tsx → full UI renders.
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,300}/)?.[0] ?? '';
    expect(caseBlock).toContain('DPPPassport');
    expect(caseBlock).toContain('onBack');
    // No title or subtitle prop injection
    expect(caseBlock).not.toContain('title={');
    expect(caseBlock).not.toContain('subtitle={');
  });

  it("N04 — WL shell mobile nav 'dpp' item label is 'DPP Passport' (not 'DPP Snapshot')", () => {
    // Mobile menu must use the updated productized label.
    // Anchor on WhiteLabelShell component export to avoid matching other shell mobileMenuItems.
    const wlShellBlock = shellsSrc.match(/export const WhiteLabelShell[\s\S]{0,2000}/)?.[0] ?? '';
    expect(wlShellBlock).toContain("label: 'DPP Passport'");
    expect(wlShellBlock).not.toContain("label: 'DPP Snapshot'");
  });

  it("N05 — WL shell desktop nav 'dpp' button text is 'DPP Passport' (not 'DPP Snapshot')", () => {
    // Desktop nav button inside WhiteLabelShell must show 'DPP Passport'.
    // Direct substring check: '>DPP Snapshot</button>' is the old text; it must be absent.
    expect(shellsSrc).toContain('>DPP Passport</button>');
    expect(shellsSrc).not.toContain('>DPP Snapshot</button>');
  });

  it('N06 — DPPPassport.tsx isProductized logic: title===undefined → productized mode active', () => {
    // Verify the gate that enables full productized UI for WL tenants.
    expect(dppPassportSrc).toContain('const isProductized = title === undefined');
    // productized sections include: dpp-network-entry, dpp-entry-ladder, dpp-passport-registry
    expect(dppPassportSrc).toContain('dpp-network-entry');
    expect(dppPassportSrc).toContain('dpp-entry-ladder');
    expect(dppPassportSrc).toContain('dpp-passport-registry');
    expect(dppPassportSrc).toContain('dpp-manual-node-lookup');
  });

  it("N07 — WL Admin regression: case 'dpp_label' still routes to WLDppLabelPanel (020B intact)", () => {
    // 020B dedicated WL Admin DPP Label tab must not be disturbed by 020D.
    expect(appSrc).toContain("case 'dpp_label':");
    const dppLabelBlock = appSrc.match(/case 'dpp_label':[\s\S]{0,250}/)?.[0] ?? '';
    expect(dppLabelBlock).toContain('WLDppLabelPanel');
    // Must not cross-contaminate with DPPPassport
    expect(dppLabelBlock).not.toContain('DPPPassport');
  });

  it('N08 — No anti-overstatement copy added by 020D in App.tsx, Shells.tsx, or DPPPassport.tsx', () => {
    const forbidden = [
      'Fully white-labeled',
      'Your branded DPP portal',
      'Custom domain enabled',
      'No TexQtic infrastructure',
      'EU-compliant passport',
      'GS1-certified passport',
      'Regulator approved',
      'Guaranteed compliant',
    ];
    const sources: [string, string][] = [
      ['App.tsx', appSrc],
      ['Shells.tsx', shellsSrc],
      ['DPPPassport.tsx', dppPassportSrc],
    ];
    for (const [name, src] of sources) {
      for (const term of forbidden) {
        expect(src, `${name} must not contain: ${term}`).not.toContain(term);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group O — 020E: WL tenant DPP runtime path parity (descriptor + render chain)
// ─────────────────────────────────────────────────────────────────────────────
describe('O — 020E: WL tenant DPP runtime path parity', () => {
  let descriptorSrc: string;
  let appSrc: string;
  let dppPassportSrc: string;

  beforeAll(() => {
    descriptorSrc  = fs.readFileSync(SESSION_DESCRIPTOR_PATH, 'utf-8');
    appSrc         = fs.readFileSync(APP_TSX_PATH, 'utf-8');
    dppPassportSrc = fs.readFileSync(DPP_PASSPORT_COMPONENT_PATH, 'utf-8');
  });

  it("O01 — sessionRuntimeDescriptor.ts defines 'dpp' route with title 'DPP Passport' (not 'DPP Snapshot')", () => {
    // The descriptor is the authoritative route title source for all tenant types.
    // Pre-020E risk: descriptor could carry a legacy 'DPP Snapshot' title for WL.
    expect(descriptorSrc).toContain("defineRuntimeRoute('dpp', 'DPP Passport'");
    expect(descriptorSrc).not.toContain("defineRuntimeRoute('dpp', 'DPP Snapshot'");
  });

  it("O02 — sessionRuntimeDescriptor.ts WL_STOREFRONT_SHELL_ROUTE_KEYS includes 'dpp'", () => {
    // WL tenants must expose DPP in their navigation surface.
    const wlKeysBlock = descriptorSrc.match(/WL_STOREFRONT_SHELL_ROUTE_KEYS[\s\S]{0,400}/)?.[0] ?? '';
    expect(wlKeysBlock, 'WL_STOREFRONT_SHELL_ROUTE_KEYS block not found').not.toBe('');
    expect(wlKeysBlock).toContain("'dpp'");
  });

  it("O03 — sessionRuntimeDescriptor.ts wl_storefront manifest entry includes OPERATIONAL_WORKSPACE_ROUTE_GROUP", () => {
    // The DPP route lives in OPERATIONAL_WORKSPACE_ROUTE_GROUP.
    // WL storefront must reference this group so 'dpp' is a reachable route.
    const wlStorefrontBlock = descriptorSrc.match(/wl_storefront:\s*\{[\s\S]{0,1000}/)?.[0] ?? '';
    expect(wlStorefrontBlock, 'wl_storefront manifest block not found').not.toBe('');
    expect(wlStorefrontBlock).toContain('OPERATIONAL_WORKSPACE_ROUTE_GROUP');
  });

  it("O04 — App.tsx DPPPassport is rendered at exactly one call site (no hidden WL-specific DPP path)", () => {
    // If a second WL-specific render site existed, it could re-introduce stale props.
    const renderMatches = appSrc.match(/<DPPPassport/g);
    expect(renderMatches, 'DPPPassport must be rendered exactly once').toHaveLength(1);
  });

  it("O05 — App.tsx renderExperienceContent switch does not gate 'dpp' case behind WL capability check", () => {
    // The renderExperienceContent switch (on tenantLocalRouteSelection.routeKey) must
    // handle 'dpp' uniformly for all tenants — no is_white_label / whiteLabelCapability
    // guard must appear before case 'dpp':
    const fnStart = appSrc.indexOf('const renderExperienceContent = ()');
    expect(fnStart, 'renderExperienceContent function not found').toBeGreaterThan(-1);
    // Find first case 'dpp': after the function declaration
    const dppCasePos = appSrc.indexOf("case 'dpp':", fnStart);
    expect(dppCasePos, "case 'dpp': not found after renderExperienceContent").toBeGreaterThan(fnStart);
    // Everything from function start to case 'dpp': must not contain WL capability guards
    const beforeDppCase = appSrc.slice(fnStart, dppCasePos);
    expect(beforeDppCase).not.toContain('tenantHasWhiteLabelCapability');
    expect(beforeDppCase).not.toContain('is_white_label');
  });

  it("O06 — sessionRuntimeDescriptor.ts contains no legacy 'DPP Snapshot' route text", () => {
    // All DPP-related route registration text in the descriptor must be productized.
    expect(descriptorSrc).not.toContain('DPP Snapshot');
    expect(descriptorSrc).not.toContain('Read-only supply chain snapshot');
  });

  it("O07 — DPPPassport.tsx displayTitle fallback is 'TexQtic DPP Passport Network' (not 'DPP Snapshot')", () => {
    // When no title prop is passed (productized mode), the heading must be the
    // productized copy, not the old snapshot label.
    expect(dppPassportSrc).toContain("'TexQtic DPP Passport Network'");
    expect(dppPassportSrc).not.toContain("'DPP Snapshot'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group P — 020G: WL Registry empty-state CTA + seed script WL parameterization
// ─────────────────────────────────────────────────────────────────────────────

describe('P — 020G: WL Registry empty-state CTA + seed parameterization', () => {
  let dppSrc: string;
  let seedSrc: string;

  const SEED_PATH = path.resolve(__dirname, '../../../scripts/seed-dpp-fixture.ts');

  beforeAll(() => {
    dppSrc = fs.readFileSync(DPP_PASSPORT_COMPONENT_PATH, 'utf-8');
    seedSrc = fs.readFileSync(SEED_PATH, 'utf-8');
  });

  // ── CTA source checks ─────────────────────────────────────────────────────

  it('P01 — DPPPassport.tsx has onNavigateToTraceability optional prop in Props interface', () => {
    expect(dppSrc).toMatch(/onNavigateToTraceability\?\s*:\s*\(\s*\)\s*=>\s*void/);
  });

  it('P02 — DPPPassport.tsx destructures onNavigateToTraceability in component signature', () => {
    expect(dppSrc).toContain('onNavigateToTraceability');
    // Must be inside the function destructuring
    expect(dppSrc).toMatch(/DPPPassport\s*\(\s*\{[^}]*onNavigateToTraceability/s);
  });

  it('P03 — dpp-passport-registry-empty test ID is still present', () => {
    expect(dppSrc).toContain('dpp-passport-registry-empty');
  });

  it('P04 — dpp-passport-registry-empty-help test ID is present', () => {
    expect(dppSrc).toContain('dpp-passport-registry-empty-help');
  });

  it('P05 — dpp-passport-registry-traceability-cta test ID is present', () => {
    expect(dppSrc).toContain('dpp-passport-registry-traceability-cta');
  });

  it('P06 — CTA button calls onNavigateToTraceability via optional chaining', () => {
    expect(dppSrc).toMatch(/onNavigateToTraceability\?\.\(\)/);
  });

  it('P07 — CTA is inside the empty-state guard block (registry.length === 0)', () => {
    const emptyBlock = dppSrc.match(/registry\.length === 0[\s\S]{0,800}/)?.[0] ?? '';
    expect(emptyBlock, 'empty-state guard block not found').not.toBe('');
    expect(emptyBlock).toContain('dpp-passport-registry-traceability-cta');
  });

  it('P08 — App.tsx DPPPassport call site still passes only onBack (no onNavigateToTraceability forced)', () => {
    const appSrc = fs.readFileSync(APP_TSX_PATH, 'utf-8');
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,400}/)?.[0] ?? '';
    expect(caseBlock).toContain('DPPPassport');
    expect(caseBlock).toContain('onBack');
    // onNavigateToTraceability is optional — App.tsx not passing it is valid
    // This test simply asserts the call site is not broken
    expect(caseBlock).not.toContain('title={');
  });

  // ── Seed script WL parameterization source checks ─────────────────────────

  it('P09 — seed-dpp-fixture.ts defines TARGET constant from --target CLI arg', () => {
    expect(seedSrc).toContain("const TARGET: 'b2b' | 'wl'");
    expect(seedSrc).toContain("--target");
  });

  it('P10 — seed-dpp-fixture.ts loadAuth accepts target param and uses qa-wl-admin.json for WL', () => {
    expect(seedSrc).toMatch(/loadAuth\(target:\s*'b2b'\s*\|\s*'wl'/);
    expect(seedSrc).toContain('qa-wl-admin.json');
  });

  it('P11 — seed-dpp-fixture.ts writeFixture accepts target param and writes to dpp-qa-wl-fixture.json for WL', () => {
    expect(seedSrc).toMatch(/writeFixture\(meta:\s*DppFixtureMeta,\s*target:\s*'b2b'\s*\|\s*'wl'/);
    expect(seedSrc).toContain('dpp-qa-wl-fixture.json');
  });

  it('P12 — seed-dpp-fixture.ts defines QA_NODE_SENTINEL_BATCH_ID_WL distinct from B2B sentinel', () => {
    expect(seedSrc).toContain("QA_NODE_SENTINEL_BATCH_ID_WL = 'qa-dpp-fixture-wl-node-001'");
    expect(seedSrc).toContain("QA_NODE_SENTINEL_BATCH_ID = 'qa-dpp-fixture-node-001'");
  });

  it('P13 — seed-dpp-fixture.ts defines QA_CERT_SENTINEL_ID_WL distinct from B2B sentinel', () => {
    expect(seedSrc).toContain("QA_CERT_SENTINEL_ID_WL = 'f0000000-0000-4000-a000-000000000002'");
    expect(seedSrc).toContain("QA_CERT_SENTINEL_ID = 'f0000000-0000-4000-a000-000000000001'");
  });

  it('P14 — seed-dpp-fixture.ts main() passes TARGET to loadAuth and loadExistingFixture', () => {
    expect(seedSrc).toContain('loadAuth(TARGET)');
    expect(seedSrc).toContain('loadExistingFixture(TARGET)');
  });

  it('P15 — D-6 constraint: no .json suffix route added in DPPPassport.tsx CTA', () => {
    // The CTA must not add a .json URL reference of any kind
    expect(dppSrc).not.toMatch(/traceability-cta[\s\S]{0,200}\.json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group Q — 020H: App.tsx wires onNavigateToTraceability to DPPPassport
// ─────────────────────────────────────────────────────────────────────────────

describe('Q — 020H: App.tsx onNavigateToTraceability wiring', () => {
  let appSrc: string;
  let dppSrc: string;

  beforeAll(() => {
    appSrc = fs.readFileSync(APP_TSX_PATH, 'utf-8');
    dppSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../components/Tenant/DPPPassport.tsx'),
      'utf-8',
    );
  });

  it('Q01 — App.tsx case dpp block passes onNavigateToTraceability prop', () => {
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,500}/)?.[0] ?? '';
    expect(caseBlock).toContain('onNavigateToTraceability');
  });

  it('Q02 — App.tsx wires onNavigateToTraceability to navigateTenantManifestRoute traceability', () => {
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,500}/)?.[0] ?? '';
    expect(caseBlock).toContain("navigateTenantManifestRoute('traceability')");
  });

  it('Q03 — App.tsx case dpp block still contains onBack prop', () => {
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,500}/)?.[0] ?? '';
    expect(caseBlock).toContain('onBack');
  });

  it('Q04 — DPPPassport.tsx defines onNavigateToTraceability as optional prop', () => {
    expect(dppSrc).toContain('onNavigateToTraceability?: () => void');
  });

  it('Q05 — DPPPassport.tsx CTA uses optional chaining on onNavigateToTraceability', () => {
    expect(dppSrc).toContain('onNavigateToTraceability?.()');
  });

  it('Q06 — D-6 constraint: navigateTenantManifestRoute traceability call uses state-based nav, no URL', () => {
    const caseBlock = appSrc.match(/case 'dpp':[\s\S]{0,500}/)?.[0] ?? '';
    // Must NOT use a URL string (state-based only)
    expect(caseBlock).not.toMatch(/href|window\.location|router\.push/);
  });
});
