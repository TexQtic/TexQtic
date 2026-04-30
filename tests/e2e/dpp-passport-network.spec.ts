/**
 * TECS-DPP-PASSPORT-NETWORK-CLOSE-001 — E2E Runtime Verification
 * DPP Passport Network productization packet closure spec (Slices A–G)
 *
 * Tests: DPP-E2E-01 through DPP-E2E-09
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
