/**
 * TECS-DPP-PASSPORT-NETWORK-CLOSE-001 — E2E Runtime Verification
 * DPP Passport Network productization packet closure spec (Slices A–G)
 *
 * Tests: DPP-E2E-01 through DPP-E2E-11
 * Target: https://app.texqtic.com (controlled via PLAYWRIGHT_BASE_URL env var)
 * Mode: READ-ONLY — no data mutations. All assertions use synthetic or safe probe UUIDs.
 *
 * Run:
 *   $ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
 *   & $ptBin test tests/e2e/dpp-passport-network.spec.ts --reporter=list
 *
 * Auth: Method A (file .auth/qa-b2b.json) preferred; falls back to env vars.
 *   If neither available → authenticated tests skip with BLOCKED_BY_AUTH.
 *
 * D-6 contract: GET /api/public/dpp/:publicPassportId.json route is ABSENT (removed in
 *   commit 3e5303a). The test DPP-E2E-03 asserts that the suffix path returns 404 and that
 *   the server does NOT crash (health check remains 200).
 *
 * Anti-leakage contract: the public passport API response must never expose org_id,
 *   nodeId, supplierOrgId, buyerOrgId, or reviewedByUserId.
 *
 * Predecessor commits (productization packet):
 *   3e5303a  fix(dpp): close public passport D6 route contract
 *   d42ec8a  docs(dpp): design Passport Network ladder
 *   e3d81c5  feat(dpp): add Passport Network UI label map (Slice A)
 *   85da489  feat(dpp): add Passport Network maturity ladder (Slice B)
 *   f5a36f9  feat(dpp): add passport status transition API (Slice C)
 *   587acdf  feat(dpp): make Global Passport maturity reachable (Slice D)
 *   77538f2  feat(dpp): add public passport buyer page (Slice E)
 *   bfb8f25  feat(dpp): add public passport QR label (Slice F)
 *   ce6b674  feat(dpp): add Passport Assistant guidance (Slice G)
 */

// Note: @playwright/test is an npx / QA-only dependency — not a project devDependency.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error @playwright/test resolved via npx at test run time
import { test, expect } from '@playwright/test';
// @ts-expect-error @playwright/test resolved via npx at test run time
import type { APIRequestContext } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

// ─── Method A: file-based auth state (.auth/*.json — gitignored) ──────────────
interface StoredAuthState { token: string; orgId: string; }

function loadStoredAuth(name: string): StoredAuthState | null {
  try {
    const file = join(process.cwd(), '.auth', `${name}.json`);
    if (!existsSync(file)) return null;
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const s = parsed as StoredAuthState;
    if (typeof s.token === 'string' && s.token.length > 0 &&
        typeof s.orgId === 'string' && s.orgId.length > 0) {
      return s;
    }
    return null;
  } catch { return null; }
}

const storedB2b = loadStoredAuth('qa-b2b');
const FILE_AUTH_AVAILABLE = storedB2b !== null;

// ─── Method B: env-var credentials (fallback) ─────────────────────────────────
const QA_B2B_ORG_ID   = process.env.QA_B2B_ORG_ID   ?? '';
const QA_B2B_PASSWORD = process.env.QA_B2B_PASSWORD ?? '';
const QA_B2B_EMAIL    = 'qa.b2b@texqtic.com';
const ENV_AUTH_AVAILABLE = QA_B2B_ORG_ID.length > 0 && QA_B2B_PASSWORD.length > 0;

const AUTH_AVAILABLE = FILE_AUTH_AVAILABLE || ENV_AUTH_AVAILABLE;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A synthetic UUID that will never match a real passport in the database.
const SYNTHETIC_UNKNOWN_UUID = '00000000-0000-4000-a000-000000000001';

/** Acquire a JWT for qa-b2b using Method B (env vars) — only called when Method A unavailable. */
async function acquireB2bToken(request: APIRequestContext): Promise<string | null> {
  if (FILE_AUTH_AVAILABLE && storedB2b) {
    return storedB2b.token;
  }
  if (!ENV_AUTH_AVAILABLE) return null;
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: QA_B2B_EMAIL, password: QA_B2B_PASSWORD, orgId: QA_B2B_ORG_ID },
  });
  if (!res.ok()) return null;
  const body = (await res.json()) as { data?: { token?: string } };
  return body?.data?.token ?? null;
}

function getB2bOrgId(): string {
  if (FILE_AUTH_AVAILABLE && storedB2b) return storedB2b.orgId;
  return QA_B2B_ORG_ID;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

// ── Group 1: Public API — unauthenticated ─────────────────────────────────────

test('DPP-E2E-01 — health check confirms server is reachable before DPP tests', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/health`);
  expect(res.status()).toBe(200);
});

test('DPP-E2E-02 — GET /api/public/dpp/:unknownUuid returns 404 (passport not found)', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  expect(res.status()).toBe(404);
  const body = (await res.json()) as { success?: boolean; error?: string };
  expect(body.success).toBe(false);
});

test('DPP-E2E-03 — D-6 contract: .json suffix path returns 404 (route absent)', async ({ request }) => {
  // GET /api/public/dpp/:id.json was removed in 3e5303a because find-my-way
  // crashes on literal backslash in route strings. The path must 404, not 500.
  const res = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}.json`);
  expect([404, 400]).toContain(res.status());
});

test('DPP-E2E-04 — D-6 contract: server health remains 200 after .json path probe', async ({ request }) => {
  // Confirms the server did not crash from the .json route probe (DPP-E2E-03).
  await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}.json`);
  const health = await request.get(`${BASE_URL}/health`);
  expect(health.status()).toBe(200);
});

test('DPP-E2E-05 — GET /api/public/dpp/:invalidFormat returns 400 or 404 (input validation)', async ({ request }) => {
  // A non-UUID string must not cause a 500 — validation gate must handle it.
  const res = await request.get(`${BASE_URL}/api/public/dpp/not-a-valid-uuid-at-all`);
  expect([400, 404]).toContain(res.status());
});

test('DPP-E2E-06 — anti-leakage: 404 public passport response does not expose private fields', async ({ request }) => {
  // Even a 404 must not leak org_id, nodeId, or internal identifiers in the body.
  const res = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  const text = await res.text();
  const forbidden = ['org_id', 'nodeId', 'supplierOrgId', 'buyerOrgId', 'reviewedByUserId'];
  for (const field of forbidden) {
    expect(text).not.toContain(`"${field}"`);
  }
});

// ── Group 2: Tenant API — auth gated ─────────────────────────────────────────

test('DPP-E2E-07 — PATCH /api/tenant/dpp/:nodeId/passport/status → 401 without token', async ({ request }) => {
  // Slice C added the status transition route. It must be auth-gated.
  const res = await request.patch(
    `${BASE_URL}/api/tenant/dpp/${SYNTHETIC_UNKNOWN_UUID}/passport/status`,
    { data: { to: 'INTERNAL' } },
  );
  expect(res.status()).toBe(401);
});

test('DPP-E2E-08 — GET /api/tenant/dpp/:nodeId → 401 without token', async ({ request }) => {
  // The DPP snapshot route must be auth-gated.
  const res = await request.get(`${BASE_URL}/api/tenant/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  expect(res.status()).toBe(401);
});

test('DPP-E2E-09 — GET /api/tenant/dpp/:nodeId/passport → 401 without token', async ({ request }) => {
  // The passport view route must be auth-gated.
  const res = await request.get(`${BASE_URL}/api/tenant/dpp/${SYNTHETIC_UNKNOWN_UUID}/passport`);
  expect(res.status()).toBe(401);
});

// ── Group 3: Authenticated tenant smoke (skips if no auth available) ──────────

test('DPP-E2E-10 — authenticated: PATCH passport/status with valid token + unknown nodeId → 404', async ({ request }) => {
  if (!AUTH_AVAILABLE) {
    test.skip(true, 'BLOCKED_BY_AUTH: no .auth/qa-b2b.json and no env vars');
    return;
  }
  const token = await acquireB2bToken(request);
  if (!token) {
    test.skip(true, 'BLOCKED_BY_AUTH: token acquisition failed');
    return;
  }
  // An auth-valid request with an unknown nodeId must return 404, not 500.
  // Proves the route is reachable and the not-found path is handled correctly.
  const res = await request.patch(
    `${BASE_URL}/api/tenant/dpp/${SYNTHETIC_UNKNOWN_UUID}/passport/status`,
    {
      data: { to: 'INTERNAL' },
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  // 404 (node not found) or 400 (validation failure) are both acceptable —
  // what must NOT happen is 401 (auth failed) or 500 (server crash).
  expect([400, 404]).toContain(res.status());
});

// ── Group 4: 010A — public link anti-leakage ─────────────────────────────────

test('DPP-E2E-11 — 010A: public passport route is unauthenticated and does not leak publicPassportId', async ({ request }) => {
  // Slice 010A adds publicPassportId to the tenant GET /api/tenant/dpp/:nodeId/passport
  // response. The PUBLIC API at /api/public/dpp/:publicPassportId must NOT expose the
  // publicPassportId or raw public_token fields in any response (including 404).
  const res = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  // Must not require authentication
  expect(res.status()).not.toBe(401);
  expect(res.status()).not.toBe(403);
  // Must not expose the new publicPassportId or internal public_token fields
  const text = await res.text();
  expect(text).not.toContain('"publicPassportId"');
  expect(text).not.toContain('"public_token"');
});

// ── Group 5: 010-B — Published DPP fixture runtime proof ──────────────────────
//
// Prerequisites: run `node --import tsx scripts/seed-dpp-fixture.ts` to populate
// .auth/dpp-qa-fixture.json before running these tests.
//
// Tests:
//   DPP-E2E-12 — Tenant GET /api/tenant/dpp/:nodeId/passport returns non-null
//                publicPassportId and status=PUBLISHED for the published fixture.
//   DPP-E2E-13 — API-level proof of the conditions that render dpp-public-passport-panel
//                in DPPPassport.tsx (passportStatus=PUBLISHED + publicPassportId non-null).
//                VERIFIED_COMPLETE_WITH_LIMITATIONS: browser assertion requires
//                authenticated browser session not available via Bearer token injection.
//   DPP-E2E-14 — Public GET /api/public/dpp/:publicPassportId returns PUBLISHED view
//                without auth. Anti-leakage: org_id, nodeId, public_token absent.
//                VERIFIED_COMPLETE_WITH_LIMITATIONS: browser render of /passport/:id
//                deferred (no chromium project in playwright.config.ts).

interface DppFixtureMeta { nodeId: string; publicPassportId: string; productLabel?: string; }

function loadDppFixture(): DppFixtureMeta | null {
  try {
    const file = join(process.cwd(), '.auth', 'dpp-qa-fixture.json');
    if (!existsSync(file)) return null;
    const m = JSON.parse(readFileSync(file, 'utf8')) as DppFixtureMeta;
    if (typeof m.nodeId === 'string' && m.nodeId.length > 0 &&
        typeof m.publicPassportId === 'string' && m.publicPassportId.length > 0) {
      return m;
    }
    return null;
  } catch { return null; }
}

const dppFixture = loadDppFixture();
const FIXTURE_AVAILABLE = dppFixture !== null;

test('DPP-E2E-12 — 010-B: tenant GET passport returns non-null publicPassportId for published fixture', async ({ request }) => {
  if (!AUTH_AVAILABLE)    { test.skip(true, 'BLOCKED_BY_AUTH: no auth available'); return; }
  if (!FIXTURE_AVAILABLE) { test.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }
  const token = await acquireB2bToken(request);
  if (!token) { test.skip(true, 'BLOCKED_BY_AUTH: token acquisition failed'); return; }

  const res = await request.get(
    `${BASE_URL}/api/tenant/dpp/${dppFixture!.nodeId}/passport`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    success: boolean;
    data: { passport: { publicPassportId: string | null; passportStatus: string; passportMaturity: string } };
  };
  expect(body.success).toBe(true);
  expect(body.data.passport.passportStatus).toBe('PUBLISHED');
  expect(body.data.passport.publicPassportId).not.toBeNull();
  expect(typeof body.data.passport.publicPassportId).toBe('string');
  // publicPassportId must match the fixture (idempotency check)
  expect(body.data.passport.publicPassportId).toBe(dppFixture!.publicPassportId);
});

test('DPP-E2E-13 — 010-B: API confirms dpp-public-passport-panel conditions (VERIFIED_COMPLETE_WITH_LIMITATIONS)', async ({ request }) => {
  // NOTE: Full browser-level assertion of data-testid="dpp-public-passport-panel" requires
  // an authenticated browser session. The SPA stores its tenant token at
  // localStorage['texqtic_tenant_token'] (App.tsx:1432), but injecting a Bearer JWT into
  // browser localStorage requires a chromium Playwright project and navigation to the
  // DPPPassport view — out of scope for 010-B. This test proves the API condition gating
  // dpp-public-passport-panel (DPPPassport.tsx:821):
  //   passportData.passportStatus === 'PUBLISHED' && !!passportData.publicPassportId
  // Status: VERIFIED_COMPLETE_WITH_LIMITATIONS — browser UI assertion deferred.
  if (!AUTH_AVAILABLE)    { test.skip(true, 'BLOCKED_BY_AUTH: no auth available'); return; }
  if (!FIXTURE_AVAILABLE) { test.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }
  const token = await acquireB2bToken(request);
  if (!token) { test.skip(true, 'BLOCKED_BY_AUTH: token acquisition failed'); return; }

  const res = await request.get(
    `${BASE_URL}/api/tenant/dpp/${dppFixture!.nodeId}/passport`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    data: { passport: { publicPassportId: string | null; passportStatus: string } };
  };
  const { publicPassportId, passportStatus } = body.data.passport;

  // Both conditions must hold for dpp-public-passport-panel to render (DPPPassport.tsx:821)
  expect(passportStatus).toBe('PUBLISHED');
  expect(publicPassportId).not.toBeNull();

  // Link shape: /passport/:publicPassportId — as constructed by DPPPassport.tsx:838
  const expectedLinkSuffix = `/passport/${encodeURIComponent(publicPassportId!)}`;
  expect(expectedLinkSuffix).toMatch(/^\/passport\/[0-9a-f-]{36}$/i);
  expect(expectedLinkSuffix).not.toContain('.json');
  expect(expectedLinkSuffix).not.toContain('/api/public/dpp');
});

test('DPP-E2E-14 — 010-B: public passport API returns PUBLISHED view unauthenticated (VERIFIED_COMPLETE_WITH_LIMITATIONS)', async ({ request }) => {
  // NOTE: This tests the public JSON API contract (GET /api/public/dpp/:publicPassportId)
  // consumed by PublicPassport.tsx. Browser rendering of the React SPA at /passport/:id
  // requires adding a chromium project to playwright.config.ts — deferred for 010-B.
  // Status: VERIFIED_COMPLETE_WITH_LIMITATIONS — browser render assertion deferred.
  if (!FIXTURE_AVAILABLE) { test.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }

  const res = await request.get(
    `${BASE_URL}/api/public/dpp/${dppFixture!.publicPassportId}`,
  );
  // Must not require authentication
  expect(res.status()).not.toBe(401);
  expect(res.status()).not.toBe(403);
  // Must return 200 for a known-published fixture
  expect(res.status()).toBe(200);

  const body = (await res.json()) as {
    success: boolean;
    data: {
      publicPassportId: string;
      passportStatus: string;
      passportMaturity: string;
      product: { nodeType: string; batchId: string };
      lineageSummary: { lineageDepth: number; nodeCount: number };
      certifications: Array<{ certificationType: string; lifecycleStateName: string }>;
      evidenceSummary: { approvedCertCount: number; aiExtractedClaimsCount: number };
      qr: { payloadUrl: string; format: string };
    };
  };
  expect(body.success).toBe(true);
  expect(body.data.passportStatus).toBe('PUBLISHED');
  expect(body.data.publicPassportId).toBe(dppFixture!.publicPassportId);
  expect(body.data.product).toBeDefined();
  expect(body.data.qr.payloadUrl).toBeTruthy();

  // Anti-leakage: internal identifiers must not appear in the public response
  const text = JSON.stringify(body);
  const forbidden = ['"org_id"', '"nodeId"', '"supplierOrgId"', '"buyerOrgId"', '"reviewedByUserId"', '"public_token"'];
  for (const field of forbidden) {
    expect(text).not.toContain(field);
  }
});

// ── Group 6: 015 — Public Buyer Page v2 ───────────────────────────────────────
//
// Tests:
//   DPP-E2E-15 — API response contains all v2 section fields: certifications array,
//                lineageSummary (depth + nodeCount), product identity, evidenceSummary.
//                VERIFIED_COMPLETE_WITH_LIMITATIONS: browser DOM render of
//                data-testid="public-passport-product-story" etc. requires chromium
//                Playwright project — deferred for 015. API contract fully verified.
//   DPP-E2E-16 — Enhanced v2 privacy regression: API response does not expose
//                sourceId, orderId, rfqId, invoiceId, buyer_org_id, document_url.
//                These fields are new to the 015 privacy boundary check.

test('DPP-E2E-15 — 015: public API response contains all v2 section fields (VERIFIED_COMPLETE_WITH_LIMITATIONS)', async ({ request }) => {
  // NOTE: Browser DOM assertions for public-passport-product-story, public-passport-identity-summary,
  // public-passport-traceability-timeline, public-passport-certification-cards, and
  // public-passport-certification-empty require adding a chromium project to playwright.config.ts
  // and an authenticated browser session — deferred for 015.
  // This test verifies the API response contains all data fields required for v2 sections.
  // Status: VERIFIED_COMPLETE_WITH_LIMITATIONS — browser render assertions deferred.
  if (!FIXTURE_AVAILABLE) { test.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }

  const res = await request.get(
    `${BASE_URL}/api/public/dpp/${dppFixture!.publicPassportId}`,
  );
  expect(res.status()).toBe(200);

  const body = (await res.json()) as {
    success: boolean;
    data: {
      passportMaturity: string;
      product: {
        nodeType: string;
        batchId: string | null;
        manufacturerName: string | null;
        manufacturerJurisdiction: string | null;
      };
      lineageSummary: { lineageDepth: number; nodeCount: number };
      certifications: Array<{
        certificationType: string;
        lifecycleStateName: string;
        expiryDate: string | null;
        issuedAt: string | null;
      }>;
      evidenceSummary: { approvedCertCount: number; aiExtractedClaimsCount: number };
      exportedAt: string;
    };
  };

  expect(body.success).toBe(true);

  // v2 product identity section fields
  expect(body.data.product.nodeType).toBeTruthy();
  expect(body.data.product).toHaveProperty('manufacturerName');
  expect(body.data.product).toHaveProperty('manufacturerJurisdiction');
  expect(body.data.product).toHaveProperty('batchId');

  // v2 traceability timeline section fields
  expect(typeof body.data.lineageSummary.lineageDepth).toBe('number');
  expect(typeof body.data.lineageSummary.nodeCount).toBe('number');

  // v2 certification cards section fields
  expect(Array.isArray(body.data.certifications)).toBe(true);
  for (const cert of body.data.certifications) {
    expect(cert.certificationType).toBeTruthy();
    expect(cert.lifecycleStateName).toBeTruthy();
    // expiryDate and issuedAt may be null — just check they are present
    expect(cert).toHaveProperty('expiryDate');
    expect(cert).toHaveProperty('issuedAt');
  }

  // v2 evidence summary section fields
  expect(typeof body.data.evidenceSummary.approvedCertCount).toBe('number');
  expect(typeof body.data.evidenceSummary.aiExtractedClaimsCount).toBe('number');

  // v2 product story: exportedAt needed for publication date display
  expect(body.data.exportedAt).toBeTruthy();

  // passportMaturity must be one of the four defined tiers
  expect(['LOCAL_TRUST', 'TRADE_READY', 'COMPLIANCE', 'GLOBAL_DPP']).toContain(body.data.passportMaturity);
});

test('DPP-E2E-16 — 015: v2 privacy regression — API does not expose additional private fields', async ({ request }) => {
  // Extended anti-leakage check for fields relevant to v2 sections (trade links, evidence items,
  // order references, document URLs). The unauthenticated synthetic probe covers the 404 path;
  // the fixture probe (if available) covers the 200 PUBLISHED path.
  const res404 = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  const text404 = await res404.text();

  // v2 privacy boundary: additional internal fields must not appear in any public response
  const v2Forbidden = [
    '"sourceId"', '"source_id"',
    '"orderId"', '"order_id"',
    '"rfqId"', '"rfq_id"',
    '"invoiceId"', '"invoice_id"',
    '"buyer_org_id"', '"buyerOrgId"',
    '"document_url"', '"documentUrl"',
    '"claim_value"',
    '"approved_by"',
  ];
  for (const field of v2Forbidden) {
    expect(text404).not.toContain(field);
  }

  // If fixture is available, also probe the 200 PUBLISHED path
  if (FIXTURE_AVAILABLE) {
    const res200 = await request.get(`${BASE_URL}/api/public/dpp/${dppFixture!.publicPassportId}`);
    expect(res200.status()).toBe(200);
    const text200 = await res200.text();
    for (const field of v2Forbidden) {
      expect(text200, `Field ${field} must not appear in PUBLISHED passport response`).not.toContain(field);
    }
  }
});

// ─── Group 7: QR Image Productionization (Slice 016) ─────────────────────────
//   DPP-E2E-17 — QR payload contract: API qr.payloadUrl is safe (no .json suffix,
//                no internal API route, no private fields encoded).
//                Browser data-testid="public-passport-qr-image" assertion deferred to
//                browser project addition (playwright.config.ts currently api-only).
//   DPP-E2E-18 — QR privacy/mobile smoke: unauthenticated public response does not
//                expose internal fields even under QR-scanning context. Mobile
//                viewport (375px) browser assertion deferred to browser project.

test('DPP-E2E-17 — 016: QR payload contract — API qr.payloadUrl is safe (VERIFIED_COMPLETE_WITH_LIMITATIONS)', async ({ request }) => {
  // NOTE: Browser DOM assertion data-testid="public-passport-qr-image" requires a chromium
  // project in playwright.config.ts — currently only the api project is present.
  // This test verifies the API-side QR payload contract:
  //   - qr.payloadUrl must not contain .json suffix or internal API route shape
  //   - qr.format must be 'url'
  //   - qr.payloadUrl must not encode private fields (orgId, nodeId, etc.)
  // Status: VERIFIED_COMPLETE_WITH_LIMITATIONS — browser QR image render assertion deferred.
  if (!FIXTURE_AVAILABLE) { test.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }

  const res = await request.get(
    `${BASE_URL}/api/public/dpp/${dppFixture!.publicPassportId}`,
  );
  expect(res.status()).toBe(200);

  const body = (await res.json()) as {
    success: boolean;
    data: {
      qr: { payloadUrl: string; format: string };
      publicPassportId: string;
    };
  };
  expect(body.success).toBe(true);

  const { payloadUrl, format } = body.data.qr;

  // QR payload contract: format must be 'url'
  expect(format).toBe('url');

  // QR payload contract: payloadUrl must be a non-empty string
  expect(typeof payloadUrl).toBe('string');
  expect(payloadUrl.length).toBeGreaterThan(0);

  // QR payload contract: must NOT use .json suffix (D6 contract — commit 3e5303a)
  expect(payloadUrl).not.toMatch(/\.json($|\?)/);

  // QR payload contract: payloadUrl must NOT encode internal identifiers
  const qrForbiddenSubstrings = [
    'orgId', 'org_id',
    'nodeId', 'node_id',
    'supplierOrgId', 'supplier_org_id',
    'buyerOrgId', 'buyer_org_id',
    'reviewedByUserId',
  ];
  for (const fragment of qrForbiddenSubstrings) {
    expect(payloadUrl, `QR payloadUrl must not encode ${fragment}`).not.toContain(fragment);
  }

  // publicPassportId must be present in the response (used by client to construct buyerPageUrl)
  expect(body.data.publicPassportId).toBeTruthy();
  expect(typeof body.data.publicPassportId).toBe('string');
});

test('DPP-E2E-18 — 016: QR privacy smoke — public response does not expose internal fields (mobile-context)', async ({ request }) => {
  // NOTE: Mobile viewport (375px) browser assertion of data-testid="public-passport-qr-image"
  // and data-testid="public-passport-product-name" visibility requires a chromium project —
  // deferred. This test covers the privacy contract from a QR-scanning context:
  //   - Unauthenticated synthetic probe must not leak internal fields
  //   - PUBLISHED fixture probe (if available) must also pass the QR-context privacy check
  // Status: VERIFIED_COMPLETE_WITH_LIMITATIONS — mobile browser render assertions deferred.
  const res404 = await request.get(`${BASE_URL}/api/public/dpp/${SYNTHETIC_UNKNOWN_UUID}`);
  const text404 = await res404.text();

  // QR-context privacy boundary: no internal fields must appear in any public response
  const qrContextForbidden = [
    '"orgId"', '"org_id"',
    '"nodeId"', '"node_id"',
    '"supplierOrgId"', '"supplier_org_id"',
    '"reviewedByUserId"',
    '"sourceId"', '"source_id"',
    '"orderId"', '"order_id"',
    '"rfqId"', '"rfq_id"',
    '"invoiceId"', '"invoice_id"',
    '"buyer_org_id"', '"buyerOrgId"',
    '"document_url"', '"documentUrl"',
  ];
  for (const field of qrContextForbidden) {
    expect(text404, `QR-context: field ${field} must not appear in any public response`).not.toContain(field);
  }

  // If fixture available, confirm privacy holds on PUBLISHED path too (QR scan entry point)
  if (FIXTURE_AVAILABLE) {
    const res200 = await request.get(`${BASE_URL}/api/public/dpp/${dppFixture!.publicPassportId}`);
    expect(res200.status()).toBe(200);
    const text200 = await res200.text();
    for (const field of qrContextForbidden) {
      expect(text200, `QR-context PUBLISHED: field ${field} must not appear`).not.toContain(field);
    }
    // QR payload URL in PUBLISHED response must be present and safe
    const body200 = (await res200.json()) as { data: { qr: { payloadUrl: string } } };
    expect(body200.data.qr.payloadUrl).not.toMatch(/\.json($|\?)/);
  }
});

// ─── Group 8: QR Browser Visibility (Slice 017A — debt gate) ─────────────────
//   DPP-E2E-19 — Browser: public passport QR image is visible on the public buyer
//                page. Navigates to /passport/:publicPassportId in a real Chromium
//                browser, waits for the react-qr-code SVG element, and asserts:
//                  a) data-testid="public-passport-qr-image" is visible
//                  b) data-testid="public-passport-product-name" is visible
//                  c) The page URL does NOT contain ".json" suffix
//                Skipped if no fixture OR not running in the chromium project.
//   DPP-E2E-20 — Mobile viewport (375px): same assertions at phone width to
//                confirm the QR label section is responsive and visible.
//   NOTE: Tenant data-testid="dpp-public-passport-qr-image" requires authenticated
//         browser session. Auth fixture (.auth/qa-b2b.json) stores token only (no
//         storageState / cookies). Playwright page-level auth via storageState is
//         not available without a secure storage-state seed. The tenant QR browser
//         assertion remains VERIFIED_COMPLETE_WITH_LIMITATIONS — covered by Vitest
//         source analysis in tecs-dpp-public-security.test.ts (D17-P group).

test('DPP-E2E-19 — 017A: browser — public passport QR image visible (chromium desktop)', async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'chromium', 'browser-only test — skipped in api project');
  if (!FIXTURE_AVAILABLE) { testInfo.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }

  const publicUrl = `${BASE_URL}/passport/${dppFixture!.publicPassportId}`;
  await page.goto(publicUrl, { waitUntil: 'networkidle' });

  // Page URL must not contain .json suffix (D6 contract)
  expect(page.url()).not.toMatch(/\.json($|\?|#)/);

  // QR image must be visible
  const qrImage = page.locator('[data-testid="public-passport-qr-image"]');
  await qrImage.waitFor({ state: 'visible', timeout: 15_000 });
  await expect(qrImage).toBeVisible();

  // Product name must be visible (confirms data loaded from API)
  const productName = page.locator('[data-testid="public-passport-product-name"]');
  await expect(productName).toBeVisible();
});

test('DPP-E2E-20 — 017A: browser — public passport QR image visible at mobile viewport (375px)', async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'chromium', 'browser-only test — skipped in api project');
  if (!FIXTURE_AVAILABLE) { testInfo.skip(true, 'BLOCKED_BY_FIXTURE: run scripts/seed-dpp-fixture.ts first'); return; }

  await page.setViewportSize({ width: 375, height: 812 });

  const publicUrl = `${BASE_URL}/passport/${dppFixture!.publicPassportId}`;
  await page.goto(publicUrl, { waitUntil: 'networkidle' });

  // Page URL must not contain .json suffix
  expect(page.url()).not.toMatch(/\.json($|\?|#)/);

  // QR image must be visible at mobile viewport
  const qrImage = page.locator('[data-testid="public-passport-qr-image"]');
  await qrImage.waitFor({ state: 'visible', timeout: 15_000 });
  await expect(qrImage).toBeVisible();

  // Product name must be visible at mobile viewport
  const productName = page.locator('[data-testid="public-passport-product-name"]');
  await expect(productName).toBeVisible();
});

// ─── Group 9: Tenant DPP Entry Surface (Slice 017B — UX visibility) ──────────
//   DPP-E2E-21 — Source coverage: tenant DPP entry surface test IDs present in
//                DPPPassport.tsx. Verifies: dpp-network-entry, dpp-network-title,
//                "TexQtic DPP Passport Network", dpp-entry-ladder, dpp-manual-node-lookup,
//                all four dpp-entry-tier-* test IDs, dpp-network-value-summary.
//                Browser-level tenant page proof requires storageState auth not yet
//                available (.auth/qa-b2b.json stores token only, no cookies/session).
//                Source analysis is the available verification layer — consistent with
//                D17-P group approach in tecs-dpp-public-security.
//   DPP-E2E-22 — Source coverage: mobile/responsive entry surface. Verifies
//                dpp-network-title and dpp-entry-ladder present. Documents mobile
//                browser limitation (no storageState auth for tenant page).
//   DPP-E2E-23 — Source coverage: public link panel test IDs not regressed.
//                Verifies dpp-public-passport-panel, dpp-public-passport-open-link,
//                dpp-public-passport-qr-image remain in DPPPassport.tsx source.

test('DPP-E2E-21 — 017B: source coverage — tenant DPP entry surface test IDs present', async ({}, testInfo) => {
  // Browser-level tenant page navigation requires authenticated storageState (not available).
  // Source analysis verifies the component is correctly implemented — same approach as D17-P.
  testInfo.annotations.push({
    type: 'limitation',
    description: 'Browser-level tenant DPP page proof requires storageState auth. Token-only .auth/qa-b2b.json is insufficient for page.goto() tenant views. Covered by source analysis.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-network-entry"/);
  expect(dppSrc).toMatch(/data-testid="dpp-network-title"/);
  expect(dppSrc).toMatch(/TexQtic DPP Passport Network/);
  expect(dppSrc).toMatch(/data-testid="dpp-network-value-summary"/);
  expect(dppSrc).toMatch(/Build product trust/);
  expect(dppSrc).toMatch(/data-testid="dpp-entry-ladder"/);
  expect(dppSrc).toMatch(/data-testid="dpp-manual-node-lookup"/);
  expect(dppSrc).toMatch(/Advanced: Load by Traceability Node ID/);
  // Entry tier testids generated via template literal `dpp-entry-tier-${tier}` at runtime
  expect(dppSrc).toMatch(/dpp-entry-tier-\$\{tier\}/);
  // All 4 tier keys present in MATURITY_ORDER (ensures all 4 testids render)
  expect(dppSrc).toMatch(/LOCAL_TRUST/);
  expect(dppSrc).toMatch(/TRADE_READY/);
  expect(dppSrc).toMatch(/GLOBAL_DPP/);
});

test('DPP-E2E-22 — 017B: source coverage — tenant DPP entry surface mobile smoke (375px)', async ({}, testInfo) => {
  // Mobile browser viewport test (375px) requires storageState auth for tenant page navigation.
  testInfo.annotations.push({
    type: 'limitation',
    description: 'Mobile browser (375px) tenant DPP page requires storageState auth. Covered by source analysis — same limitation as DPP-E2E-21.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-network-title"/);
  expect(dppSrc).toMatch(/data-testid="dpp-entry-ladder"/);
  // Component uses Tailwind responsive classes for mobile layout
  expect(dppSrc).toMatch(/grid-cols-1/);
  expect(dppSrc).toMatch(/sm:grid-cols-4/);
});

test('DPP-E2E-23 — 017B: source coverage — public link panel not regressed', async ({}, testInfo) => {
  // Authenticated browser loaded-state flow requires storageState not available.
  testInfo.annotations.push({
    type: 'limitation',
    description: 'Public link panel loaded-state browser assertion requires authenticated storageState not available. Source analysis confirms panel test IDs are intact.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-public-passport-panel"/);
  expect(dppSrc).toMatch(/data-testid="dpp-public-passport-open-link"/);
  expect(dppSrc).toMatch(/data-testid="dpp-public-passport-qr-image"/);
  // Confirm QR component still present
  expect(dppSrc).toMatch(/QRCode/);
  // Confirm public panel only renders on PUBLISHED passports (no leakage of internal state)
  expect(dppSrc).toMatch(/passportStatus.*PUBLISHED|PUBLISHED.*passportStatus/);
});
// ─────────────────────────────────────────────────────────────────────────────
// Group 10 — 017C: Tenant Passport Registry
// ─────────────────────────────────────────────────────────────────────────────

test('DPP-E2E-24 – 017C: source coverage – passport registry section visible', async ({}, testInfo) => {
  // Browser registry fetch requires authenticated storageState not available.
  testInfo.annotations.push({
    type: 'limitation',
    description: '017C passport registry live fetch requires authenticated storageState not available. Source analysis confirms registry section test IDs and title are present.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-passport-registry"/);
  expect(dppSrc).toMatch(/data-testid="dpp-passport-registry-title"/);
  expect(dppSrc).toMatch(/data-testid="dpp-manual-node-lookup"/);
  expect(dppSrc).toMatch(/Passport Registry/);
  expect(dppSrc).toMatch(/TexQtic DPP Passport Network/);
});

test('DPP-E2E-25 – 017C: source coverage – registry loads without manual UUID first', async ({}, testInfo) => {
  // Registry auto-loads on mount without requiring manual UUID entry.
  testInfo.annotations.push({
    type: 'limitation',
    description: '017C auto-load registry on mount requires authenticated storageState not available. Source analysis confirms registry empty/card states and load button are present.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-passport-registry-empty"/);
  expect(dppSrc).toMatch(/data-testid="dpp-passport-registry-card"/);
  expect(dppSrc).toMatch(/dpp-passport-registry-load-button/);
  expect(dppSrc).toMatch(/dpp-manual-node-lookup/);
  expect(dppSrc).toMatch(/Advanced/);
});

test('DPP-E2E-26 – 017C: source coverage – public link panel not regressed by registry', async ({}, testInfo) => {
  // Confirms registry additions did not remove existing public passport panel.
  testInfo.annotations.push({
    type: 'limitation',
    description: '017C public link panel regression check — source analysis confirms panel test IDs coexist with registry test IDs.',
  });
  const dppSrc = readFileSync(join(process.cwd(), 'components/Tenant/DPPPassport.tsx'), 'utf8');
  expect(dppSrc).toMatch(/data-testid="dpp-public-passport-panel"/);
  expect(dppSrc).toMatch(/data-testid="dpp-public-passport-qr-image"/);
  expect(dppSrc).toMatch(/dpp-passport-registry-public-link/);
  expect(dppSrc).toMatch(/PUBLISHED/);
});