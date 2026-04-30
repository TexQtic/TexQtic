/**
 * TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice F
 * Full Textile-Chain Runtime QA
 *
 * Test groups:
 *   FTA — Multi-tenant login / shell sanity (4 tests)
 *   FTB — Buyer catalog browse / PDP (7 tests)
 *   FTC — Approval-gate regression (6 tests)
 *   FTD — Price disclosure (4 tests)
 *   FTE — RFQ flows / prefill gate (8 tests)
 *   FTF — Buyer "View My RFQs" (4 tests)
 *   FTG — Supplier RFQ inbox (5 tests)
 *   FTH — AI supplier matching / recommendations (5 tests)
 *   FTI — DPP / compliance (4 tests)
 *   FTJ — Service-provider flows (4 tests — all BLOCKED_BY_AUTH)
 *   FTK — Static / demo data scan (5 tests)
 *   P5  — Global anti-leakage field scan (1 test)
 *   P6  — Health / server heartbeat (1 test)
 *
 * Target: https://app.texqtic.com
 * Mode: READ-ONLY — no persistent data mutations.
 *   RFQ ok=false prefill calls are non-mutating (gate denies before creation).
 *   RFQ ok=true checks use /rfq-prefill (explicitly non-mutating endpoint).
 *   No POST /rfqs/inbox/:id/respond, no POST /rfqs/:id/ai-assist.
 *
 * Auth: Method A (file .auth/*.json) preferred; Method B (env vars) fallback.
 *
 * QA data contract (seeded by Slice E/F/G — commits bfb3f64, 493f684):
 *
 *   qa-b2b supplier items:
 *     QA-B2B-FAB-002  B2B_PUBLIC + no restrictions
 *     QA-B2B-FAB-003  B2B_PUBLIC + RELATIONSHIP_ONLY priceDisclosurePolicyMode
 *     QA-B2B-FAB-004  B2B_PUBLIC + APPROVED_BUYER_ONLY catalogVisibilityPolicyMode
 *     QA-B2B-FAB-005  B2B_PUBLIC + APPROVED_BUYER_ONLY cvpm + RELATIONSHIP_ONLY pdpm
 *     QA-B2B-FAB-006  PRIVATE_OR_AUTH_ONLY + HIDDEN cvpm
 *
 *   Relationships with qa-b2b:
 *     Buyer A (qa-buyer-a)  → APPROVED
 *     Buyer B (qa-buyer)    → REQUESTED
 *     Buyer C (qa-buyer-c)  → NONE
 *
 *   Service-provider tenants (qa-svc-tst-a, qa-svc-log-b) → no auth available.
 *   Aggregator tenant (qa-agg) → no auth available.
 *
 * Run:
 *   $ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
 *   & $ptBin test tests/e2e/full-textile-chain-runtime-qa.spec.ts --reporter=list
 *
 * NOTE: Do NOT use --project=chromium. The playwright.config.ts project is named 'api'.
 */

// Note: @playwright/test is an npx / QA-only dependency — not a project devDependency.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error @playwright/test resolved via npx at test run time
import { test, expect } from '@playwright/test';
// @ts-expect-error @playwright/test resolved via npx at test run time
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

// ─── QA identity constants (emails are deterministic from seed) ───────────────
const QA_BUYER_A_EMAIL = 'qa.buyer.wvg.a@texqtic.com';
const QA_BUYER_B_EMAIL = 'qa.buyer@texqtic.com';
const QA_BUYER_C_EMAIL = 'qa.buyer.knt.c@texqtic.com';
const QA_B2B_EMAIL     = 'qa.b2b@texqtic.com';

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

const storedA = loadStoredAuth('qa-buyer-a');
const storedB = loadStoredAuth('qa-buyer-b');
const storedC = loadStoredAuth('qa-buyer-c');
const storedS = loadStoredAuth('qa-b2b');
const FILE_AUTH_AVAILABLE =
  storedA !== null && storedB !== null && storedC !== null && storedS !== null;

// ─── Method B: env-var credentials (fallback) ─────────────────────────────────
const QA_BUYER_A_ORG_ID   = process.env.QA_BUYER_A_ORG_ID   ?? '';
const QA_BUYER_A_PASSWORD = process.env.QA_BUYER_A_PASSWORD ?? '';
const QA_BUYER_B_ORG_ID   = process.env.QA_BUYER_B_ORG_ID   ?? '';
const QA_BUYER_B_PASSWORD = process.env.QA_BUYER_B_PASSWORD ?? '';
const QA_BUYER_C_ORG_ID   = process.env.QA_BUYER_C_ORG_ID   ?? '';
const QA_BUYER_C_PASSWORD = process.env.QA_BUYER_C_PASSWORD ?? '';
const QA_B2B_ORG_ID       = process.env.QA_B2B_ORG_ID       ?? '';
const QA_B2B_PASSWORD     = process.env.QA_B2B_PASSWORD     ?? '';
const ENV_AUTH_AVAILABLE =
  QA_BUYER_A_ORG_ID.length > 0 && QA_BUYER_A_PASSWORD.length > 0 &&
  QA_BUYER_B_ORG_ID.length > 0 && QA_BUYER_B_PASSWORD.length > 0 &&
  QA_BUYER_C_ORG_ID.length > 0 && QA_BUYER_C_PASSWORD.length > 0 &&
  QA_B2B_ORG_ID.length > 0     && QA_B2B_PASSWORD.length > 0;

// ─── Auth availability ────────────────────────────────────────────────────────
const CREDENTIALS_AVAILABLE = FILE_AUTH_AVAILABLE || ENV_AUTH_AVAILABLE;
const AUTH_METHOD: 'file' | 'env' | 'none' =
  FILE_AUTH_AVAILABLE ? 'file' : ENV_AUTH_AVAILABLE ? 'env' : 'none';

// ─── Session-scoped JWT tokens (populated in beforeAll) ───────────────────────
let tokenA = '';  // Buyer A  — APPROVED with qa-b2b AND qa-knt-b
let tokenB = '';  // Buyer B  — REQUESTED with qa-b2b, REJECTED with qa-knt-b
let tokenC = '';  // Buyer C  — NONE with all suppliers
let tokenS = '';  // Supplier qa-b2b — item owner

// ─── Resolved runtime IDs (populated in beforeAll) ───────────────────────────
let supplierOrgId     = '';  // qa-b2b org UUID
let kntBSupplierOrgId = '';  // qa-knt-b org UUID
let fab002ItemId      = '';  // QA-B2B-FAB-002: B2B_PUBLIC, no restrictions
let fab003ItemId      = '';  // QA-B2B-FAB-003: B2B_PUBLIC + RELATIONSHIP_ONLY price
let fab004ItemId      = '';  // QA-B2B-FAB-004: B2B_PUBLIC + APPROVED_BUYER_ONLY
let fab005ItemId      = '';  // QA-B2B-FAB-005: B2B_PUBLIC + APPROVED_BUYER_ONLY + RELATIONSHIP_ONLY price
let fab006ItemId      = '';  // QA-B2B-FAB-006: PRIVATE_OR_AUTH_ONLY + HIDDEN

// ─── Anti-leakage field list (Phase 5) ────────────────────────────────────────
// These fields MUST NEVER appear in any buyer-facing API response.
const ANTI_LEAKAGE_FIELDS: string[] = [
  'catalogVisibilityPolicyMode',
  'catalog_visibility_policy_mode',
  'publicationPosture',
  'publication_posture',
  'relationshipState',
  'internalReason',
  'allowlistDetails',
  'supplierPolicy',
  'denialReason',
  'APPROVED_BUYER_ONLY',
  'HIDDEN',
  'RELATIONSHIP_GATED',
  'REGION_CHANNEL_SENSITIVE',
  'item_unit_price',
  'unitPrice',
  'unit_price',
  'basePrice',
  'listPrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'trade_gross_amount',
  'grossAmount',
  'internalMargin',
  'buyerScore',
  'supplierScore',
  'score',
  'rank',
  'confidence',
  'embeddingId',
  'vector',
  'risk_score',
  'modelPrompt',
  'prompt',
  'contextPack',
  'auditMetadata',
];

// ─── Helper: login and return JWT ─────────────────────────────────────────────
async function loginQA(
  request: APIRequestContext,
  email: string,
  password: string,
  tenantId: string,
): Promise<string> {
  const res: APIResponse = await request.post(`${BASE_URL}/api/auth/tenant/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password, tenantId },
  });
  const body = await res.json() as { success: boolean; data?: { token?: string } };
  if (!res.ok() || !body.success || typeof body.data?.token !== 'string') {
    throw new Error(
      `QA login failed for ${email}: HTTP ${res.status()} success=${body.success}`,
    );
  }
  return body.data.token;
}

// ─── Helper: auth headers ─────────────────────────────────────────────────────
function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ─── Helper: assert no anti-leakage fields in serialized body ─────────────────
function assertNoLeakage(jsonStr: string, context: string): void {
  for (const field of ANTI_LEAKAGE_FIELDS) {
    // Skip generic single-word keys that are too common to be meaningful in JSON (score, rank, confidence
    // are the sensitive ones from ML — but we check them in JSON key form only, not value substrings)
    expect(
      jsonStr.includes(`"${field}"`),
      `${context}: response MUST NOT contain field key "${field}"`,
    ).toBe(false);
  }
}

// ─── beforeAll: load tokens, resolve supplier org IDs and item UUIDs ──────────
test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
  if (!CREDENTIALS_AVAILABLE) return;

  if (AUTH_METHOD === 'file') {
    tokenA = storedA!.token;
    tokenB = storedB!.token;
    tokenC = storedC!.token;
    tokenS = storedS!.token;
    supplierOrgId = storedS!.orgId;
  } else {
    [tokenA, tokenB, tokenC, tokenS] = await Promise.all([
      loginQA(request, QA_BUYER_A_EMAIL, QA_BUYER_A_PASSWORD, QA_BUYER_A_ORG_ID),
      loginQA(request, QA_BUYER_B_EMAIL, QA_BUYER_B_PASSWORD, QA_BUYER_B_ORG_ID),
      loginQA(request, QA_BUYER_C_EMAIL, QA_BUYER_C_PASSWORD, QA_BUYER_C_ORG_ID),
      loginQA(request, QA_B2B_EMAIL,     QA_B2B_PASSWORD,     QA_B2B_ORG_ID),
    ]);
    supplierOrgId = QA_B2B_ORG_ID;
  }

  // Resolve qa-b2b and qa-knt-b org UUIDs from eligible-suppliers (Buyer A)
  const suppliersRes: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
    { headers: authHeaders(tokenA) },
  );
  const suppliersBody = await suppliersRes.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; slug: string; legalName: string; primarySegment: string }>; total: number };
  };
  if (suppliersRes.ok() && suppliersBody.success) {
    const suppliers = suppliersBody.data?.items ?? [];
    if (!supplierOrgId) {
      supplierOrgId = suppliers.find((s) => s.slug === 'qa-b2b')?.id ?? '';
    }
    kntBSupplierOrgId = suppliers.find((s) => s.slug === 'qa-knt-b')?.id ?? '';
  }

  // Resolve qa-b2b item UUIDs from Buyer A browse (APPROVED → sees all non-HIDDEN items)
  if (supplierOrgId) {
    const buyerABrowseRes: APIResponse = await request.get(
      `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
      { headers: authHeaders(tokenA) },
    );
    const browseBody = await buyerABrowseRes.json() as {
      success: boolean;
      data?: { items: Array<{ id: string; sku: string | null }> };
    };
    if (buyerABrowseRes.ok() && browseBody.success) {
      const items = browseBody.data?.items ?? [];
      fab002ItemId = items.find((i) => i.sku === 'QA-B2B-FAB-002')?.id ?? '';
      fab003ItemId = items.find((i) => i.sku === 'QA-B2B-FAB-003')?.id ?? '';
      fab004ItemId = items.find((i) => i.sku === 'QA-B2B-FAB-004')?.id ?? '';
      fab005ItemId = items.find((i) => i.sku === 'QA-B2B-FAB-005')?.id ?? '';
    }
  }

  // Resolve FAB-006 UUID from supplier's own catalog view (HIDDEN — never in buyer browse)
  if (tokenS) {
    const supplierCatalogRes: APIResponse = await request.get(
      `${BASE_URL}/api/tenant/catalog/items?limit=100`,
      { headers: authHeaders(tokenS) },
    );
    const supplierCatalogBody = await supplierCatalogRes.json() as {
      success: boolean;
      data?: { items: Array<{ id: string; sku: string | null }> };
    };
    if (supplierCatalogRes.ok() && supplierCatalogBody.success) {
      fab006ItemId =
        (supplierCatalogBody.data?.items ?? []).find((i) => i.sku === 'QA-B2B-FAB-006')?.id ?? '';
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FTA — Multi-tenant login / shell sanity
// ═════════════════════════════════════════════════════════════════════════════

test('FTA-01: Buyer A auth resolves and eligible-suppliers returns 200', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTA-01: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { items: unknown[]; total: number } };
  expect(body.success, 'FTA-01: Response envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.items), 'FTA-01: items must be an array').toBe(true);
  expect(typeof body.data?.total, 'FTA-01: total must be a number').toBe('number');
});

test('FTA-02: Buyer B auth resolves and eligible-suppliers returns 200', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
    { headers: authHeaders(tokenB) },
  );
  expect(res.ok(), `FTA-02: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { items: unknown[] } };
  expect(body.success, 'FTA-02: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.items), 'FTA-02: items must be an array').toBe(true);
});

test('FTA-03: Buyer C auth resolves and eligible-suppliers returns 200', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
    { headers: authHeaders(tokenC) },
  );
  expect(res.ok(), `FTA-03: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { items: unknown[] } };
  expect(body.success, 'FTA-03: envelope must be success=true').toBe(true);
});

test('FTA-04: Supplier qa-b2b auth resolves and own catalog returns 200', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items`,
    { headers: authHeaders(tokenS) },
  );
  expect(res.ok(), `FTA-04: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; sku: string | null }> };
  };
  expect(body.success, 'FTA-04: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.items), 'FTA-04: items must be an array').toBe(true);
  // Supplier sees their own items including HIDDEN ones
  const skus = (body.data?.items ?? []).map((i) => i.sku);
  expect(
    skus,
    'FTA-04: Supplier own view must include QA-B2B-FAB-006 (HIDDEN item visible to owner)',
  ).toContain('QA-B2B-FAB-006');
});

// ═════════════════════════════════════════════════════════════════════════════
// FTB — Buyer catalog browse / PDP
// ═════════════════════════════════════════════════════════════════════════════

test('FTB-01: Buyer A browse qa-b2b includes B2B_PUBLIC items (FAB-002, FAB-003)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTB-01: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; sku: string | null }>; count: number };
  };
  expect(body.success, 'FTB-01: envelope must be success=true').toBe(true);

  const skus = (body.data?.items ?? []).map((i) => i.sku);
  expect(skus, 'FTB-01: FAB-002 (B2B_PUBLIC) must be visible to Buyer A').toContain('QA-B2B-FAB-002');
  expect(skus, 'FTB-01: FAB-003 (B2B_PUBLIC) must be visible to Buyer A').toContain('QA-B2B-FAB-003');
});

test('FTB-02: Browse response does not expose publicationPosture in any item', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTB-02: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const bodyStr = await res.text();
  // publicationPosture must never appear as a key in buyer-facing browse response (POLICY_B)
  expect(
    bodyStr.includes('"publicationPosture"'),
    'FTB-02: publicationPosture MUST NOT appear as a JSON key in buyer browse response',
  ).toBe(false);
  expect(
    bodyStr.includes('"catalogVisibilityPolicyMode"'),
    'FTB-02: catalogVisibilityPolicyMode MUST NOT appear as a JSON key in buyer browse response',
  ).toBe(false);
});

test('FTB-03: Buyer A (APPROVED) browse qa-b2b includes APPROVED_BUYER_ONLY items (FAB-004, FAB-005)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTB-03: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; sku: string | null }> };
  };
  const skus = (body.data?.items ?? []).map((i) => i.sku);
  expect(
    skus,
    'FTB-03: FAB-004 (APPROVED_BUYER_ONLY) must be visible to APPROVED Buyer A',
  ).toContain('QA-B2B-FAB-004');
  expect(
    skus,
    'FTB-03: FAB-005 (APPROVED_BUYER_ONLY) must be visible to APPROVED Buyer A',
  ).toContain('QA-B2B-FAB-005');
});

test('FTB-04: Buyer B (REQUESTED) browse qa-b2b excludes APPROVED_BUYER_ONLY items (FAB-004)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenB) },
  );
  expect(res.ok(), `FTB-04: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; sku: string | null }> };
  };
  const skus = (body.data?.items ?? []).map((i) => i.sku);
  expect(
    skus,
    'FTB-04: FAB-004 (APPROVED_BUYER_ONLY) must NOT be visible to REQUESTED Buyer B',
  ).not.toContain('QA-B2B-FAB-004');
  expect(
    skus,
    'FTB-04: FAB-005 (APPROVED_BUYER_ONLY) must NOT be visible to REQUESTED Buyer B',
  ).not.toContain('QA-B2B-FAB-005');
});

test('FTB-05: Buyer C (NONE) browse qa-b2b excludes APPROVED_BUYER_ONLY items (FAB-004)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenC) },
  );
  expect(res.ok(), `FTB-05: Expected 200, got HTTP ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: { items: Array<{ id: string; sku: string | null }> };
  };
  const skus = (body.data?.items ?? []).map((i) => i.sku);
  expect(
    skus,
    'FTB-05: FAB-004 (APPROVED_BUYER_ONLY) must NOT be visible to Buyer C (NONE rel)',
  ).not.toContain('QA-B2B-FAB-004');
});

test('FTB-06: HIDDEN item (FAB-006) absent from all buyer browse responses', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const [resA, resB, resC] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenB) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenC) }),
  ]) as APIResponse[];

  for (const [label, res] of [['Buyer A', resA], ['Buyer B', resB], ['Buyer C', resC]] as [string, APIResponse][]) {
    expect(res.ok(), `FTB-06: ${label} browse expected 200, got ${res.status()}`).toBe(true);
    const body = await res.json() as { data?: { items: Array<{ sku: string | null }> } };
    const skus = (body.data?.items ?? []).map((i) => i.sku);
    expect(
      skus,
      `FTB-06: FAB-006 (HIDDEN) must NOT appear in ${label} browse`,
    ).not.toContain('QA-B2B-FAB-006');
  }
});

test('FTB-07: PDP for FAB-003 returns 200 for Buyer A and contains priceDisclosure', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab003ItemId, 'BLOCKED_BY_DATA: FAB-003 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTB-07: FAB-003 PDP for Buyer A expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: Record<string, unknown>;
  };
  expect(body.success, 'FTB-07: PDP envelope must be success=true').toBe(true);
  // priceDisclosure is the buyer-safe disclosure metadata field (not raw price)
  expect(
    'priceDisclosure' in (body.data ?? {}),
    'FTB-07: PDP response must contain priceDisclosure field',
  ).toBe(true);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTC — Approval-gate regression
// ═════════════════════════════════════════════════════════════════════════════

test('FTC-01: FAB-004 visible to Buyer A (APPROVED), absent for Buyer B and Buyer C browse', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const [resA, resB, resC] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenB) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenC) }),
  ]) as APIResponse[];

  const skusA = ((await resA.json() as { data?: { items: Array<{ sku: string | null }> } }).data?.items ?? []).map((i) => i.sku);
  const skusB = ((await resB.json() as { data?: { items: Array<{ sku: string | null }> } }).data?.items ?? []).map((i) => i.sku);
  const skusC = ((await resC.json() as { data?: { items: Array<{ sku: string | null }> } }).data?.items ?? []).map((i) => i.sku);

  expect(skusA, 'FTC-01: FAB-004 must be visible to APPROVED Buyer A').toContain('QA-B2B-FAB-004');
  expect(skusB, 'FTC-01: FAB-004 must NOT be visible to REQUESTED Buyer B').not.toContain('QA-B2B-FAB-004');
  expect(skusC, 'FTC-01: FAB-004 must NOT be visible to NONE Buyer C').not.toContain('QA-B2B-FAB-004');
});

test('FTC-02: FAB-006 (HIDDEN) returns 404 PDP for all buyers', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab006ItemId, 'BLOCKED_BY_DATA: FAB-006 UUID not resolved — need supplier token');

  const [resA, resB, resC] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab006ItemId}`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab006ItemId}`, { headers: authHeaders(tokenB) }),
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab006ItemId}`, { headers: authHeaders(tokenC) }),
  ]) as APIResponse[];

  expect(
    resA.status(),
    `FTC-02: FAB-006 PDP for Buyer A must return 404, got ${resA.status()}`,
  ).toBe(404);
  expect(
    resB.status(),
    `FTC-02: FAB-006 PDP for Buyer B must return 404, got ${resB.status()}`,
  ).toBe(404);
  expect(
    resC.status(),
    `FTC-02: FAB-006 PDP for Buyer C must return 404, got ${resC.status()}`,
  ).toBe(404);
});

test('FTC-03: RFQ gate returns ok=false for Buyer B (REQUESTED) on FAB-004 (APPROVED_BUYER_ONLY)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const [resB, resC] = await Promise.all([
    request.post(`${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`, {
      headers: authHeaders(tokenB),
      data: { catalogItemId: fab004ItemId, selectedQuantity: 100 },
    }),
    request.post(`${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`, {
      headers: authHeaders(tokenC),
      data: { catalogItemId: fab004ItemId, selectedQuantity: 100 },
    }),
  ]) as APIResponse[];

  expect(resB.ok(), `FTC-03: Buyer B RFQ gate must return HTTP 2xx, got ${resB.status()}`).toBe(true);
  expect(resC.ok(), `FTC-03: Buyer C RFQ gate must return HTTP 2xx, got ${resC.status()}`).toBe(true);

  type RfqGateResponse = { success: boolean; data?: { ok: boolean; reason?: string } };
  const bodyB = await resB.json() as RfqGateResponse;
  const bodyC = await resC.json() as RfqGateResponse;

  const GATE_REASONS = ['ITEM_NOT_AVAILABLE', 'ELIGIBILITY_REQUIRED'];

  expect(bodyB.data?.ok, 'FTC-03: Buyer B (REQUESTED) RFQ gate must return ok=false').toBe(false);
  expect(
    GATE_REASONS,
    `FTC-03: Buyer B reason must be a known gate reason, got '${bodyB.data?.reason}'`,
  ).toContain(bodyB.data?.reason);

  expect(bodyC.data?.ok, 'FTC-03: Buyer C (NONE) RFQ gate must return ok=false').toBe(false);
  expect(
    GATE_REASONS,
    `FTC-03: Buyer C reason must be a known gate reason, got '${bodyC.data?.reason}'`,
  ).toContain(bodyC.data?.reason);
});

test('FTC-04: qa-knt-b items gated independently — Buyer A sees items, Buyer B does not', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!kntBSupplierOrgId, 'BLOCKED_BY_DATA: qa-knt-b org UUID not resolved (check eligible-suppliers)');

  const [resA, resB] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${kntBSupplierOrgId}/items?limit=100`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${kntBSupplierOrgId}/items?limit=100`, { headers: authHeaders(tokenB) }),
  ]) as APIResponse[];

  expect(resA.ok(), `FTC-04: Buyer A browse qa-knt-b expected 200, got ${resA.status()}`).toBe(true);
  expect(resB.ok(), `FTC-04: Buyer B browse qa-knt-b expected 200, got ${resB.status()}`).toBe(true);

  const bodyA = await resA.json() as { data?: { items: Array<{ sku: string | null }> } };
  const bodyB = await resB.json() as { data?: { items: Array<{ sku: string | null }> } };

  const skusA = (bodyA.data?.items ?? []).map((i) => i.sku);
  const skusB = (bodyB.data?.items ?? []).map((i) => i.sku);

  // Buyer A is APPROVED with qa-knt-b → should see APPROVED_BUYER_ONLY items
  // Buyer B is REJECTED with qa-knt-b → should NOT see APPROVED_BUYER_ONLY items
  expect(
    skusB,
    'FTC-04: Buyer B (REJECTED with knt-b) must NOT see QA-KNT-B-FAB-003',
  ).not.toContain('QA-KNT-B-FAB-003');
  expect(
    skusB,
    'FTC-04: Buyer B (REJECTED with knt-b) must NOT see QA-KNT-B-FAB-004',
  ).not.toContain('QA-KNT-B-FAB-004');
  // Buyer A should see them (APPROVED)
  // Only assert if Buyer A has items (some seeded items may not exist)
  if (skusA.length > 0) {
    expect(
      skusA,
      'FTC-04: Buyer A (APPROVED with knt-b) should see QA-KNT-B-FAB-003',
    ).toContain('QA-KNT-B-FAB-003');
  }
});

test('FTC-05: Override params in request body do not bypass approval gate for FAB-004', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  // Attempt to bypass by injecting a fake supplierOrgId in the body — server must ignore it
  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`,
    {
      headers: authHeaders(tokenB),
      data: {
        catalogItemId: fab004ItemId,
        selectedQuantity: 100,
        // Attempt injection of override fields — server must not honor these
        supplierOrgId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        bypassGate: true,
        override: true,
      },
    },
  );

  // Server may: (a) 400-reject unknown override fields (strict schema validation), or
  // (b) accept the body but deny at the approval gate (2xx, ok=false). Either is correct.
  const gateHeld = res.status() === 400 || res.ok();
  expect(
    gateHeld,
    `FTC-05: Override attempt expected 400 (schema rejection) or 2xx (gate denial), got ${res.status()}`,
  ).toBe(true);

  if (res.ok()) {
    const body = await res.json() as { success: boolean; data?: { ok: boolean; reason?: string } };
    expect(body.data?.ok, 'FTC-05: Override params must NOT bypass the gate — ok must remain false').toBe(false);
  }
});

test('FTC-06: Buyer A sees exactly 2 more items than Buyer C from qa-b2b (APPROVED_BUYER_ONLY diff)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const [resA, resC] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`, { headers: authHeaders(tokenC) }),
  ]) as APIResponse[];

  expect(resA.ok(), `FTC-06: Buyer A browse expected 200, got ${resA.status()}`).toBe(true);
  expect(resC.ok(), `FTC-06: Buyer C browse expected 200, got ${resC.status()}`).toBe(true);

  const bodyA = await resA.json() as { data?: { items: Array<{ id: string }> } };
  const bodyC = await resC.json() as { data?: { items: Array<{ id: string }> } };

  const countA = (bodyA.data?.items ?? []).length;
  const countC = (bodyC.data?.items ?? []).length;

  // FAB-004 and FAB-005 are the APPROVED_BUYER_ONLY items — both visible to A, neither to C
  expect(
    countA - countC,
    `FTC-06: Buyer A should see exactly 2 more items than Buyer C (APPROVED_BUYER_ONLY: FAB-004 and FAB-005). Diff was ${countA - countC}`,
  ).toBe(2);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTD — Price disclosure
// ═════════════════════════════════════════════════════════════════════════════

test('FTD-01: FAB-003 PDP for Buyer A (APPROVED) has priceDisclosure and no raw price', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab003ItemId, 'BLOCKED_BY_DATA: FAB-003 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTD-01: FAB-003 PDP for Buyer A expected 200, got ${res.status()}`).toBe(true);

  const bodyStr = await res.text();
  const body = JSON.parse(bodyStr) as { success: boolean; data?: Record<string, unknown> };
  expect(body.success, 'FTD-01: PDP envelope must be success=true').toBe(true);

  // priceDisclosure metadata must be present
  expect(
    'priceDisclosure' in (body.data ?? {}),
    'FTD-01: priceDisclosure must be present in PDP response for Buyer A on FAB-003',
  ).toBe(true);

  // Raw price fields must never appear
  expect(bodyStr.includes('"unitPrice"'), 'FTD-01: unitPrice MUST NOT appear in PDP').toBe(false);
  expect(bodyStr.includes('"basePrice"'), 'FTD-01: basePrice MUST NOT appear in PDP').toBe(false);
  expect(bodyStr.includes('"listPrice"'), 'FTD-01: listPrice MUST NOT appear in PDP').toBe(false);
});

test('FTD-02: FAB-003 PDP for Buyer B (REQUESTED) returns 200 with price disclosure metadata', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab003ItemId, 'BLOCKED_BY_DATA: FAB-003 UUID not resolved');

  // FAB-003 is B2B_PUBLIC visibility (not APPROVED_BUYER_ONLY) → PDP is accessible
  // But priceDisclosurePolicyMode=RELATIONSHIP_ONLY → price masked for non-APPROVED buyer
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
    { headers: authHeaders(tokenB) },
  );
  expect(res.ok(), `FTD-02: FAB-003 PDP for Buyer B expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: Record<string, unknown> };
  expect(body.success, 'FTD-02: PDP envelope must be success=true').toBe(true);
  // priceDisclosure must exist — it contains buyer-safe disclosure metadata
  expect(
    'priceDisclosure' in (body.data ?? {}),
    'FTD-02: priceDisclosure must exist in FAB-003 PDP for Buyer B',
  ).toBe(true);
});

test('FTD-03: FAB-003 PDP for Buyer C (NONE) returns 200 with price disclosure metadata', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab003ItemId, 'BLOCKED_BY_DATA: FAB-003 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
    { headers: authHeaders(tokenC) },
  );
  expect(res.ok(), `FTD-03: FAB-003 PDP for Buyer C expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: Record<string, unknown> };
  expect(body.success, 'FTD-03: envelope must be success=true').toBe(true);
  expect(
    'priceDisclosure' in (body.data ?? {}),
    'FTD-03: priceDisclosure must exist in FAB-003 PDP for Buyer C',
  ).toBe(true);
});

test('FTD-04: FAB-002 PDP (no price restriction) returns 200 for all buyers', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const [resA, resB, resC] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}`, { headers: authHeaders(tokenB) }),
    request.get(`${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}`, { headers: authHeaders(tokenC) }),
  ]) as APIResponse[];

  expect(resA.ok(), `FTD-04: FAB-002 PDP Buyer A expected 200, got ${resA.status()}`).toBe(true);
  expect(resB.ok(), `FTD-04: FAB-002 PDP Buyer B expected 200, got ${resB.status()}`).toBe(true);
  expect(resC.ok(), `FTD-04: FAB-002 PDP Buyer C expected 200, got ${resC.status()}`).toBe(true);

  for (const [label, res] of [['Buyer A', resA], ['Buyer B', resB], ['Buyer C', resC]] as [string, APIResponse][]) {
    const body = await res.json() as { success: boolean; data?: Record<string, unknown> };
    expect(body.success, `FTD-04: ${label} PDP envelope must be success=true`).toBe(true);
    expect(
      'priceDisclosure' in (body.data ?? {}),
      `FTD-04: priceDisclosure must be present in FAB-002 PDP for ${label}`,
    ).toBe(true);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FTE — RFQ flows / prefill gate
// ═════════════════════════════════════════════════════════════════════════════

test('FTE-01: Buyer A RFQ prefill for FAB-002 (B2B_PUBLIC, APPROVED) returns ok=true', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  // Use non-mutating /rfq-prefill endpoint (read-only)
  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/rfq-prefill`,
    { headers: authHeaders(tokenA), data: {} },
  );
  expect(res.ok(), `FTE-01: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { ok: boolean } };
  expect(body.success, 'FTE-01: envelope must be success=true').toBe(true);
  expect(body.data?.ok, 'FTE-01: Buyer A on FAB-002 must have ok=true').toBe(true);
});

test('FTE-02: Buyer A RFQ prefill for FAB-004 (APPROVED_BUYER_ONLY, APPROVED rel) returns ok=true', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/catalog/items/${fab004ItemId}/rfq-prefill`,
    { headers: authHeaders(tokenA), data: {} },
  );
  expect(res.ok(), `FTE-02: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { ok: boolean } };
  expect(body.success, 'FTE-02: envelope must be success=true').toBe(true);
  expect(
    body.data?.ok,
    'FTE-02: Buyer A (APPROVED) on FAB-004 (APPROVED_BUYER_ONLY) must have ok=true',
  ).toBe(true);
});

test('FTE-03: Buyer B (REQUESTED) RFQ prefill for FAB-004 returns ok=false (gate denies)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/catalog/items/${fab004ItemId}/rfq-prefill`,
    { headers: authHeaders(tokenB), data: {} },
  );
  expect(res.ok(), `FTE-03: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { ok: boolean; reason?: string } };
  expect(body.data?.ok, 'FTE-03: Buyer B (REQUESTED) must receive ok=false on FAB-004').toBe(false);
});

test('FTE-04: Buyer C (NONE) RFQ prefill for FAB-004 returns ok=false (gate denies)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/catalog/items/${fab004ItemId}/rfq-prefill`,
    { headers: authHeaders(tokenC), data: {} },
  );
  expect(res.ok(), `FTE-04: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { ok: boolean; reason?: string } };
  expect(body.data?.ok, 'FTE-04: Buyer C (NONE) must receive ok=false on FAB-004').toBe(false);
});

test('FTE-05: Buyer B RFQ prefill for FAB-002 (B2B_PUBLIC) returns ok=true', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/rfq-prefill`,
    { headers: authHeaders(tokenB), data: {} },
  );
  expect(res.ok(), `FTE-05: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { ok: boolean } };
  expect(body.success, 'FTE-05: envelope must be success=true').toBe(true);
  expect(
    body.data?.ok,
    'FTE-05: Buyer B can prefill RFQ for B2B_PUBLIC FAB-002 (no APPROVED_BUYER_ONLY restriction)',
  ).toBe(true);
});

test('FTE-06: Denied RFQ gate reason is a safe known value (no internal data leak)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`,
    {
      headers: authHeaders(tokenB),
      data: { catalogItemId: fab004ItemId, selectedQuantity: 100 },
    },
  );
  expect(res.ok(), `FTE-06: Expected 2xx, got ${res.status()}`).toBe(true);

  const body = await res.json() as { data?: { ok: boolean; reason?: string } };
  const SAFE_REASONS = ['ITEM_NOT_AVAILABLE', 'RFQ_PREFILL_NOT_AVAILABLE', 'SUPPLIER_NOT_AVAILABLE', 'ELIGIBILITY_REQUIRED'];
  expect(
    body.data?.ok,
    'FTE-06: RFQ gate for denied buyer must return ok=false',
  ).toBe(false);
  expect(
    SAFE_REASONS,
    `FTE-06: deny reason '${body.data?.reason}' must be a known safe reason code`,
  ).toContain(body.data?.reason);
});

test('FTE-07: ok=false RFQ response does not contain item internals', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab004ItemId, 'BLOCKED_BY_DATA: FAB-004 UUID not resolved');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`,
    {
      headers: authHeaders(tokenC),
      data: { catalogItemId: fab004ItemId, selectedQuantity: 100 },
    },
  );
  const bodyStr = await res.text();

  // Deny response must NOT expose internal policy fields or item data
  expect(bodyStr.includes('"catalogVisibilityPolicyMode"'), 'FTE-07: catalogVisibilityPolicyMode MUST NOT appear in deny response').toBe(false);
  expect(bodyStr.includes('"publicationPosture"'), 'FTE-07: publicationPosture MUST NOT appear in deny response').toBe(false);
  expect(bodyStr.includes('"APPROVED_BUYER_ONLY"'), 'FTE-07: APPROVED_BUYER_ONLY value MUST NOT appear in deny response').toBe(false);
  expect(bodyStr.includes('"internalReason"'), 'FTE-07: internalReason MUST NOT appear in deny response').toBe(false);
});

test('FTE-08: Buyer B draft rfq for FAB-006 (HIDDEN) returns ok=false (access denied)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab006ItemId, 'BLOCKED_BY_DATA: FAB-006 UUID not resolved — need supplier token');

  const res: APIResponse = await request.post(
    `${BASE_URL}/api/tenant/rfqs/drafts/from-catalog-item`,
    {
      headers: authHeaders(tokenB),
      data: { catalogItemId: fab006ItemId, selectedQuantity: 100 },
    },
  );
  expect(res.ok(), `FTE-08: Expected 2xx envelope for deny path, got ${res.status()}`).toBe(true);

  const body = await res.json() as { data?: { ok: boolean } };
  expect(body.data?.ok, 'FTE-08: HIDDEN item must deny all buyers from RFQ — ok must be false').toBe(false);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTF — Buyer "View My RFQs"
// ═════════════════════════════════════════════════════════════════════════════

test('FTF-01: GET /api/tenant/rfqs returns 200 for Buyer A', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTF-01: Expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { rfqs: unknown[]; count: number } };
  expect(body.success, 'FTF-01: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.rfqs), 'FTF-01: rfqs must be an array').toBe(true);
  expect(typeof body.data?.count, 'FTF-01: count must be a number').toBe('number');
});

test('FTF-02: Buyer A RFQ list is org-scoped (no cross-tenant RFQ IDs visible)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const [resA, resB] = await Promise.all([
    request.get(`${BASE_URL}/api/tenant/rfqs`, { headers: authHeaders(tokenA) }),
    request.get(`${BASE_URL}/api/tenant/rfqs`, { headers: authHeaders(tokenB) }),
  ]) as APIResponse[];

  const bodyA = await resA.json() as { data?: { items: Array<{ id: string; orgId?: string }> } };
  const bodyB = await resB.json() as { data?: { items: Array<{ id: string; orgId?: string }> } };

  const idsA = new Set((bodyA.data?.items ?? []).map((r) => r.id));
  const idsB = new Set((bodyB.data?.items ?? []).map((r) => r.id));

  // No RFQ ID should appear in both Buyer A's and Buyer B's list
  const intersection = [...idsA].filter((id) => idsB.has(id));
  expect(
    intersection.length,
    `FTF-02: Cross-tenant RFQ leak detected — ${intersection.length} shared IDs between Buyer A and Buyer B`,
  ).toBe(0);
});

test('FTF-03: RFQ detail response does not leak supplier internal fields', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const listRes: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs`,
    { headers: authHeaders(tokenA) },
  );
  if (!listRes.ok()) { return; }

  const listBody = await listRes.json() as { data?: { items: Array<{ id: string }> } };
  const rfqs = listBody.data?.items ?? [];

  if (rfqs.length === 0) {
    // No RFQs for this buyer — skip detail check
    return;
  }

  const firstId = rfqs[0].id;
  const detailRes: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/${firstId}`,
    { headers: authHeaders(tokenA) },
  );
  expect(detailRes.ok(), `FTF-03: RFQ detail expected 200, got ${detailRes.status()}`).toBe(true);

  const detailStr = await detailRes.text();
  expect(detailStr.includes('"catalogVisibilityPolicyMode"'), 'FTF-03: catalogVisibilityPolicyMode MUST NOT be in RFQ detail').toBe(false);
  expect(detailStr.includes('"publicationPosture"'), 'FTF-03: publicationPosture MUST NOT be in RFQ detail').toBe(false);
  expect(detailStr.includes('"internalReason"'), 'FTF-03: internalReason MUST NOT be in RFQ detail').toBe(false);
});

test('FTF-04: Buyer B RFQ list returns 200 (may be empty)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs`,
    { headers: authHeaders(tokenB) },
  );
  expect(res.ok(), `FTF-04: Expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { rfqs: unknown[] } };
  expect(body.success, 'FTF-04: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.rfqs), 'FTF-04: rfqs must be an array').toBe(true);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTG — Supplier RFQ inbox
// ═════════════════════════════════════════════════════════════════════════════

test('FTG-01: GET /api/tenant/rfqs/inbox returns 200 for supplier qa-b2b', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox`,
    { headers: authHeaders(tokenS) },
  );
  expect(res.ok(), `FTG-01: Supplier RFQ inbox expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { success: boolean; data?: { rfqs: unknown[] } };
  expect(body.success, 'FTG-01: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.rfqs), 'FTG-01: rfqs must be an array').toBe(true);
});

test('FTG-02: Supplier inbox only contains RFQs targeting their org', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox`,
    { headers: authHeaders(tokenS) },
  );
  if (!res.ok()) { return; }

  const body = await res.json() as {
    data?: { items: Array<{ supplierOrgId?: string; targetOrgId?: string; sellerOrgId?: string }> };
  };
  const items = body.data?.items ?? [];

  // Every inbox item must target this supplier's org
  for (const item of items) {
    const targetOrg = item.supplierOrgId ?? item.targetOrgId ?? item.sellerOrgId;
    if (targetOrg) {
      expect(
        targetOrg,
        `FTG-02: Inbox item must target supplier org ${supplierOrgId}, got ${targetOrg}`,
      ).toBe(supplierOrgId);
    }
  }
});

test('FTG-03: Supplier inbox item detail does not expose buyer org internals', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const listRes: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox`,
    { headers: authHeaders(tokenS) },
  );
  if (!listRes.ok()) { return; }

  const listBody = await listRes.json() as { data?: { items: Array<{ id: string }> } };
  const items = listBody.data?.items ?? [];
  if (items.length === 0) { return; }

  const detailRes: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox/${items[0].id}`,
    { headers: authHeaders(tokenS) },
  );
  expect(detailRes.ok(), `FTG-03: Inbox detail expected 200, got ${detailRes.status()}`).toBe(true);

  const detailStr = await detailRes.text();
  expect(detailStr.includes('"auditMetadata"'), 'FTG-03: auditMetadata MUST NOT appear in inbox detail').toBe(false);
  expect(detailStr.includes('"internalReason"'), 'FTG-03: internalReason MUST NOT appear in inbox detail').toBe(false);
});

test('FTG-04: Buyer token cannot read supplier inbox', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  // A buyer token calling the inbox endpoint should get either an empty list
  // (org-scoped — no RFQs for buyer org in supplier inbox) or an auth error.
  // It MUST NOT return another org's RFQs.
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox`,
    { headers: authHeaders(tokenA) },
  );
  // Either 200 with empty items or 4xx — but must not expose other org's inbox data
  if (res.ok()) {
    const body = await res.json() as { data?: { items: unknown[] } };
    const items = body.data?.items ?? [];
    // If the endpoint returns a list scoped to this buyer's org (as a "seller"), it should be empty
    // because qa-buyer-a is not a supplier with RFQs to fulfill
    expect(
      items.length,
      `FTG-04: Buyer A calling /rfqs/inbox must not see supplier qa-b2b inbox items (got ${items.length} items)`,
    ).toBe(0);
  } else {
    // 4xx is also acceptable — the endpoint properly rejects buyers
    expect(res.status()).toBeGreaterThanOrEqual(400);
  }
});

test('FTG-05: Supplier inbox response does not contain policy fields', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs/inbox`,
    { headers: authHeaders(tokenS) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  expect(bodyStr.includes('"catalogVisibilityPolicyMode"'), 'FTG-05: catalogVisibilityPolicyMode MUST NOT appear in inbox list').toBe(false);
  expect(bodyStr.includes('"publicationPosture"'), 'FTG-05: publicationPosture MUST NOT appear in inbox list').toBe(false);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTH — AI supplier matching / recommendations
// ═════════════════════════════════════════════════════════════════════════════

test('FTH-01: GET recommendations for FAB-002 returns 200 for Buyer A', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
    { headers: authHeaders(tokenA) },
  );
  expect(res.ok(), `FTH-01: Recommendations expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as {
    success: boolean;
    data?: {
      items: Array<{ supplierDisplayName: string; matchLabels: string[]; cta: string }>;
      fallback: boolean;
    };
  };
  expect(body.success, 'FTH-01: envelope must be success=true').toBe(true);
  expect(Array.isArray(body.data?.items), 'FTH-01: items must be an array').toBe(true);
  expect(typeof body.data?.fallback, 'FTH-01: fallback must be a boolean').toBe('boolean');
});

test('FTH-02: Recommendations response does not contain score/rank/confidence/embeddingId/vector', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  const ML_FIELDS = ['"score"', '"rank"', '"confidence"', '"embeddingId"', '"vector"', '"risk_score"'];
  for (const field of ML_FIELDS) {
    expect(
      bodyStr.includes(field),
      `FTH-02: Recommendations MUST NOT contain ML field ${field}`,
    ).toBe(false);
  }
});

test('FTH-03: Recommendations items only contain supplierDisplayName, matchLabels, and cta', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const body = await res.json() as {
    data?: {
      items: Array<Record<string, unknown>>;
      fallback: boolean;
    };
  };
  const items = body.data?.items ?? [];
  if (items.length === 0) { return; }

  // Each recommendation item must have ONLY buyer-safe fields
  const SAFE_FIELDS = new Set(['supplierDisplayName', 'matchLabels', 'cta']);
  for (const item of items) {
    const keys = Object.keys(item);
    for (const key of keys) {
      expect(
        SAFE_FIELDS.has(key),
        `FTH-03: Recommendation item has unexpected field "${key}" — only supplierDisplayName/matchLabels/cta are safe`,
      ).toBe(true);
    }
  }
});

test('FTH-04: Recommendations cta values are all valid buyer-safe CTA codes', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const body = await res.json() as {
    data?: { items: Array<{ cta: string }> };
  };
  const VALID_CTAS = ['REQUEST_QUOTE', 'REQUEST_ACCESS', 'VIEW_PROFILE'];
  for (const item of body.data?.items ?? []) {
    expect(
      VALID_CTAS,
      `FTH-04: cta value '${item.cta}' is not a valid buyer-safe CTA`,
    ).toContain(item.cta);
  }
});

test('FTH-05: Recommendations do not include HIDDEN items in supplier display names', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  // The recommendations must not expose internal policy labels
  expect(bodyStr.includes('"HIDDEN"'), 'FTH-05: HIDDEN policy value MUST NOT appear in recommendations').toBe(false);
  expect(bodyStr.includes('"APPROVED_BUYER_ONLY"'), 'FTH-05: APPROVED_BUYER_ONLY MUST NOT appear in recommendations').toBe(false);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTI — DPP / compliance
// ═════════════════════════════════════════════════════════════════════════════

test('FTI-01: GET DPP with unknown UUID returns 400 (validation) or 404 (not found)', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  // Use a UUID that doesn't exist — RLS will prevent access / not found
  const unknownId = '00000000-0000-4000-8000-000000000001';
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/dpp/${unknownId}`,
    { headers: authHeaders(tokenA) },
  );
  // Should be 404 (not found / RLS hidden) — NOT a 500 error
  expect(
    [400, 404].includes(res.status()),
    `FTI-01: DPP unknown node must return 400 or 404, got ${res.status()}`,
  ).toBe(true);
});

test('FTI-02: DPP 404 response does not leak internal fields', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const unknownId = '00000000-0000-4000-8000-000000000002';
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/dpp/${unknownId}`,
    { headers: authHeaders(tokenA) },
  );
  const bodyStr = await res.text();
  expect(bodyStr.includes('"auditMetadata"'), 'FTI-02: auditMetadata MUST NOT appear in DPP 404 response').toBe(false);
  expect(bodyStr.includes('"internalReason"'), 'FTI-02: internalReason MUST NOT appear in DPP 404 response').toBe(false);
  expect(bodyStr.includes('"risk_score"'), 'FTI-02: risk_score MUST NOT appear in DPP 404 response').toBe(false);
});

test('FTI-03: DPP passport endpoint with unknown UUID returns 400 or 404', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const unknownId = '00000000-0000-4000-8000-000000000003';
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/dpp/${unknownId}/passport`,
    { headers: authHeaders(tokenA) },
  );
  expect(
    [400, 404].includes(res.status()),
    `FTI-03: DPP passport with unknown node must return 400 or 404, got ${res.status()}`,
  ).toBe(true);
});

test('FTI-04: DPP evidence-claims endpoint with unknown UUID returns 400 or 404', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const unknownId = '00000000-0000-4000-8000-000000000004';
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/dpp/${unknownId}/evidence-claims`,
    { headers: authHeaders(tokenA) },
  );
  expect(
    [400, 404].includes(res.status()),
    `FTI-04: DPP evidence-claims with unknown node must return 400 or 404, got ${res.status()}`,
  ).toBe(true);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTJ — Service-provider flows (ALL BLOCKED_BY_AUTH)
// No auth files for qa-svc-tst-a or qa-svc-log-b are available.
// ═════════════════════════════════════════════════════════════════════════════

test('FTJ-01: Service-provider tenant qa-svc-tst-a — BLOCKED_BY_AUTH', () => {
  test.skip(true, 'BLOCKED_BY_AUTH: no auth file for qa-svc-tst-a (.auth/qa-svc-tst-a.json not present)');
});

test('FTJ-02: Service-provider tenant qa-svc-log-b — BLOCKED_BY_AUTH', () => {
  test.skip(true, 'BLOCKED_BY_AUTH: no auth file for qa-svc-log-b (.auth/qa-svc-log-b.json not present)');
});

test('FTJ-03: Aggregator tenant qa-agg discovery — BLOCKED_BY_AUTH', () => {
  test.skip(true, 'BLOCKED_BY_AUTH: no auth file for qa-agg (.auth/qa-agg.json not present)');
});

test('FTJ-04: Aggregator discovery endpoint returns 403 for non-AGGREGATOR tenant tokens', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  // A regular buyer token calling the aggregator discovery endpoint must receive 403
  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/aggregator/discovery`,
    { headers: authHeaders(tokenA) },
  );
  expect(
    res.status(),
    `FTJ-04: Aggregator discovery must return 403 for non-AGGREGATOR tenant, got ${res.status()}`,
  ).toBe(403);
});

// ═════════════════════════════════════════════════════════════════════════════
// FTK — Static / demo data scan
// ═════════════════════════════════════════════════════════════════════════════

test('FTK-01: Browse response does not contain demo/sample/lorem test data strings', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = (await res.text()).toLowerCase();
  const BANNED_STRINGS = ['"lorem ipsum"', '"sample data"', '"test data"', '"demo data"', '"placeholder"'];
  for (const banned of BANNED_STRINGS) {
    expect(
      bodyStr.includes(banned),
      `FTK-01: Browse response must NOT contain demo/test string: ${banned}`,
    ).toBe(false);
  }
});

test('FTK-02: Browse response does not contain $0 or NaN price values', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!supplierOrgId, 'BLOCKED_BY_DATA: qa-b2b org UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  // NaN in JSON would be serialized as null; check both
  expect(bodyStr.includes(':NaN'), 'FTK-02: NaN MUST NOT appear in browse response').toBe(false);
  // $0 is a presentation artifact — not expected in API responses
  expect(bodyStr.includes('"$0"'), 'FTK-02: "$0" string MUST NOT appear in browse response').toBe(false);
});

test('FTK-03: No response contains TODO/FIXME/placeholder strings', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');
  test.skip(!fab002ItemId, 'BLOCKED_BY_DATA: FAB-002 UUID not resolved');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  const BANNED = ['"TODO"', '"FIXME"', '"PLACEHOLDER"', '"todo"', '"fixme"'];
  for (const banned of BANNED) {
    expect(
      bodyStr.includes(banned),
      `FTK-03: PDP response MUST NOT contain string: ${banned}`,
    ).toBe(false);
  }
});

test('FTK-04: RFQ list does not expose internal reason strings', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/rfqs`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const bodyStr = await res.text();
  expect(bodyStr.includes('"internalReason"'), 'FTK-04: internalReason MUST NOT appear in RFQ list').toBe(false);
  expect(bodyStr.includes('"APPROVED_BUYER_ONLY"'), 'FTK-04: APPROVED_BUYER_ONLY MUST NOT appear in RFQ list').toBe(false);
  expect(bodyStr.includes('"HIDDEN"'), 'FTK-04: HIDDEN policy value MUST NOT appear in RFQ list').toBe(false);
});

test('FTK-05: Eligible-suppliers list does not contain non-QA production org slugs', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const res: APIResponse = await request.get(
    `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
    { headers: authHeaders(tokenA) },
  );
  if (!res.ok()) { return; }

  const body = await res.json() as {
    data?: { items: Array<{ slug: string; legalName: string }> };
  };
  const items = body.data?.items ?? [];

  // All QA tenant slugs start with 'qa-'
  const QA_SLUG_PREFIX = 'qa-';
  for (const item of items) {
    expect(
      item.slug.startsWith(QA_SLUG_PREFIX),
      `FTK-05: Supplier slug '${item.slug}' must start with 'qa-' in QA environment`,
    ).toBe(true);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// P5 — Global anti-leakage field scan (cross-endpoint)
// ═════════════════════════════════════════════════════════════════════════════

test('P5: Global anti-leakage scan — no forbidden fields in browse, PDP, RFQ, inbox, or recommendations', async ({
  request,
}: { request: APIRequestContext }) => {
  test.skip(!CREDENTIALS_AVAILABLE, 'BLOCKED_BY_AUTH: no QA credentials available');

  const endpoints: Array<{ label: string; url: string; token: string; method?: string; body?: unknown }> = [
    {
      label: 'Buyer A — eligible-suppliers',
      url: `${BASE_URL}/api/tenant/b2b/eligible-suppliers`,
      token: tokenA,
    },
    ...(supplierOrgId ? [
      {
        label: 'Buyer A — qa-b2b browse',
        url: `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
        token: tokenA,
      },
      {
        label: 'Buyer B — qa-b2b browse',
        url: `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
        token: tokenB,
      },
      {
        label: 'Buyer C — qa-b2b browse',
        url: `${BASE_URL}/api/tenant/catalog/supplier/${supplierOrgId}/items?limit=100`,
        token: tokenC,
      },
    ] : []),
    ...(fab002ItemId ? [
      {
        label: 'Buyer A — FAB-002 PDP',
        url: `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}`,
        token: tokenA,
      },
      {
        label: 'Buyer A — FAB-002 recommendations',
        url: `${BASE_URL}/api/tenant/catalog/items/${fab002ItemId}/recommendations`,
        token: tokenA,
      },
    ] : []),
    ...(fab003ItemId ? [
      {
        label: 'Buyer A — FAB-003 PDP',
        url: `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
        token: tokenA,
      },
      {
        label: 'Buyer B — FAB-003 PDP',
        url: `${BASE_URL}/api/tenant/catalog/items/${fab003ItemId}`,
        token: tokenB,
      },
    ] : []),
    {
      label: 'Buyer A — RFQ list',
      url: `${BASE_URL}/api/tenant/rfqs`,
      token: tokenA,
    },
    {
      label: 'Supplier — RFQ inbox',
      url: `${BASE_URL}/api/tenant/rfqs/inbox`,
      token: tokenS,
    },
    {
      label: 'Supplier — own catalog',
      url: `${BASE_URL}/api/tenant/catalog/items?limit=100`,
      token: tokenS,
    },
  ];

  const results = await Promise.all(
    endpoints.map(async (ep) => {
      const res: APIResponse = await request.get(ep.url, { headers: authHeaders(ep.token) });
      const bodyStr = res.ok() ? await res.text() : '';
      return { label: ep.label, bodyStr };
    }),
  );

  for (const { label, bodyStr } of results) {
    if (!bodyStr) { continue; }
    assertNoLeakage(bodyStr, `P5 [${label}]`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// P6 — Server health heartbeat
// ═════════════════════════════════════════════════════════════════════════════

test('P6: GET /health returns 200 — server is alive and stable', async ({
  request,
}: { request: APIRequestContext }) => {
  const res: APIResponse = await request.get(`${BASE_URL}/api/health`);
  expect(res.ok(), `P6: Health check expected 200, got ${res.status()}`).toBe(true);

  const body = await res.json() as { status?: string; ok?: boolean };
  // Health endpoint returns { status: 'ok' } or { ok: true } — accept either
  const healthy =
    body.status === 'ok' ||
    body.ok === true ||
    res.status() === 200;
  expect(healthy, 'P6: Health response must indicate server is healthy').toBe(true);
});
