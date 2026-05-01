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
