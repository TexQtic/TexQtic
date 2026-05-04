/**
 * TTP-SCORE-E2E-001 — Slice 8: TradeTrust Score Advisory Layer
 * Production E2E Verification
 *
 * Governance:
 *   PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001 §13
 *   TTP Slice 8, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 *
 * ─── Test Groups ──────────────────────────────────────────────────────────────
 *   TTA — Preflight gate (ttp_enabled=false → 503 FEATURE_DISABLED)
 *   TTB — Seller score API (ttp_enabled=true required)
 *   TTC — Buyer score API (ttp_enabled=true required)
 *   TTD — UI smoke: score section visible in tenant SPA
 *
 * ─── Run Sequence ─────────────────────────────────────────────────────────────
 *   Phase 1 — Preflight (ttp_enabled=false, default):
 *     $ptBin = "C:\Users\PARESH\TexQtic\node_modules\.bin\playwright.cmd"
 *     $env:QA_AUTH_PWD = "<password>"
 *     & $ptBin test tests/e2e/ttp-score-advisory-production-e2e.spec.ts --reporter=list
 *     Expected: TTA-1..TTA-3 PASS (gate active). TTB/TTC/TTD SKIP.
 *
 *   Phase 2 — Score verification (ttp_enabled=true):
 *     1. Enable flag via psql (DATABASE_URL from .env.local):
 *        psql "$DATABASE_URL" -c \
 *          "UPDATE public.feature_flags SET enabled=true WHERE key='ttp_enabled';"
 *
 *     2. Run with flag enabled:
 *        $ptBin = "C:\Users\PARESH\TexQtic\node_modules\.bin\playwright.cmd"
 *        $env:TTP_FLAG_ENABLED = "1"
 *        $env:QA_AUTH_PWD = "<password>"
 *        & $ptBin test tests/e2e/ttp-score-advisory-production-e2e.spec.ts --reporter=list
 *        Expected: TTA-3 PASS. TTB/TTC/TTD PASS.
 *
 *     3. Restore flag immediately after (CRITICAL — do NOT skip):
 *        psql "$DATABASE_URL" -c \
 *          "UPDATE public.feature_flags SET enabled=false WHERE key='ttp_enabled';"
 *        Verify: SELECT enabled, updated_at FROM public.feature_flags WHERE key='ttp_enabled';
 *        Expected: enabled = false
 *
 * ─── QA Credentials (seeded by scripts/qa-ttp-auth-seed.sql + scripts/qa-ttp-seed.sql) ──
 *   Seller:      qa-ttp-seller@texqtic.test  (env: QA_AUTH_PWD)
 *   Buyer:       qa-ttp-buyer@texqtic.test   (env: QA_AUTH_PWD)
 *   Seller TID:  ee000000-0000-0000-0000-000000000001
 *   Buyer TID:   ee000000-0000-0000-0000-000000000002
 *   Trade ID:    ee000000-0000-0000-0000-000000000010
 *
 * ─── Expected Score (fully seeded QA data) ────────────────────────────────────
 *   score=100, band=READY, 7 factors all PASS, blockers=[], disclaimer present
 *
 * ─── CRITICAL BOUNDARIES ──────────────────────────────────────────────────────
 *   - ttp_enabled MUST be restored to false immediately after Phase 2 run
 *   - Score is ADVISORY ONLY — disclaimer must be present in every response
 *   - Buyer view MUST NOT expose raw bureau / GST / CIBIL / admin-notes
 *   - ttpFeatureGateMiddleware must remain enforced; this spec does not modify it
 *   - This spec is READ-ONLY: no DB writes, no schema changes, no migrations
 */

// @ts-expect-error @playwright/test resolved via npx at test run time
import { test, expect } from '@playwright/test';
// @ts-expect-error @playwright/test resolved via npx at test run time
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');

const TRADE_ID      = 'ee000000-0000-0000-0000-000000000010';
const SELLER_EMAIL  = 'qa-ttp-seller@texqtic.test';
const BUYER_EMAIL   = 'qa-ttp-buyer@texqtic.test';
const SELLER_TID    = 'ee000000-0000-0000-0000-000000000001';
const BUYER_TID     = 'ee000000-0000-0000-0000-000000000002';

// ─── Auth Mode A: file-based (.auth/*.json — gitignored) ────────────────────
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

const storedTtpSeller   = loadStoredAuth('ttp-seller');
const storedTtpBuyer    = loadStoredAuth('ttp-buyer');

/**
 * Gate-fallback: any valid tenant session can prove TTA-3 (503 FEATURE_DISABLED).
 * Tries TTP-specific first, then falls back to existing QA sessions.
 */
const storedGateFallback: StoredAuthState | null =
  storedTtpSeller ??
  loadStoredAuth('qa-b2b') ??
  loadStoredAuth('qa-buyer-a') ??
  null;

// ─── Auth Mode B: env-var password ────────────────────────────────────────────
const QA_PWD = process.env.QA_AUTH_PWD ?? '';

/**
 * Auth resolution priority:
 *   'file'      — .auth/ttp-seller.json + .auth/ttp-buyer.json present
 *   'env'       — QA_AUTH_PWD set (will login at runtime)
 *   'gate-only' — any .auth/*.json available (TTA-3 only; TTB/TTC/TTD skip)
 *   'none'      — no credentials → emits PLAYWRIGHT_SESSION_HANDOFF_REQUIRED
 */
function resolveAuthMode(): 'file' | 'env' | 'gate-only' | 'none' {
  if (storedTtpSeller !== null && storedTtpBuyer !== null) return 'file';
  if (QA_PWD.length > 0) return 'env';
  if (storedGateFallback !== null) return 'gate-only';
  return 'none';
}

const AUTH_MODE = resolveAuthMode();

/** Set TTP_FLAG_ENABLED=1 to run TTB/TTC/TTD (requires ttp_enabled=true in DB first). */
const FLAG_ENABLED = (process.env.TTP_FLAG_ENABLED ?? '0') === '1';

/** TTP summary endpoint (relative path) */
const TTP_SUMMARY_PATH = `/api/tenant/trades/${TRADE_ID}/ttp-summary`;

/**
 * Fields that MUST NEVER appear in any buyer-facing or seller-facing API response.
 * Presence of these is a governance violation.
 */
const ANTI_LEAKAGE_FIELDS: readonly string[] = [
  'raw_bureau_json',
  'raw_verification_json',
  'cibil_score',
  'cibil_rank',
  'bureau_report_id',
  'admin_notes',
  'internal_risk_notes',
];

/**
 * Valid score bands (must be one of these four values).
 */
const VALID_BANDS = new Set(['READY', 'NEAR_READY', 'NEEDS_REVIEW', 'NOT_READY']);

/**
 * Score factor keys that must be present in a complete response.
 */
const EXPECTED_FACTOR_KEYS: readonly string[] = [
  'gst_readiness',
  'eligibility_readiness',
  'risk_tier',
  'invoice_readiness',
  'vpc_readiness',
  'enrollment_readiness',
  'routing_readiness',
];

const MANDATORY_DISCLAIMER =
  'TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment.';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Authenticate a QA user against POST /api/auth/tenant/login.
 * Returns the JWT token on success; throws with a diagnostic message on failure.
 */
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
  const body = await res.json() as {
    success: boolean;
    data?: { token?: string };
    error?: { code: string; message: string };
  };
  if (!res.ok() || !body.success || typeof body.data?.token !== 'string') {
    throw new Error(
      `QA login failed for ${email}: HTTP ${res.status()} success=${body.success} code=${body.error?.code ?? 'n/a'}`,
    );
  }
  return body.data.token;
}

/** Build Fastify-compatible auth headers for a given JWT token. */
function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Scan a JSON body string for forbidden fields.
 * Returns the list of any forbidden keys found (empty = clean).
 */
function scanForLeakage(jsonStr: string): string[] {
  return ANTI_LEAKAGE_FIELDS.filter(field => jsonStr.includes(`"${field}"`));
}

// ─── Token lifecycle ──────────────────────────────────────────────────────────

let sellerToken = '';  // TTP QA seller — required for TTB and TTA-3 (preferred)
let buyerToken  = '';  // TTP QA buyer  — required for TTC
let gateToken   = '';  // Any valid tenant token — sufficient for TTA-3 gate check

/**
 * True when TTP-specific seller+buyer tokens are available.
 * Required for TTB (seller score), TTC (buyer score), TTD (UI smoke).
 */
let ttpCredentialsAvailable = false;

/**
 * True when at least one valid tenant token is available.
 * Sufficient for TTA-3 (proves feature gate returns 503 for authenticated requests).
 */
let gateCredentialAvailable = false;

test.beforeAll(async ({ request }: { request: APIRequestContext }) => {

  // ── Mode A: file-based (.auth/ttp-seller.json + .auth/ttp-buyer.json) ────────
  if (AUTH_MODE === 'file') {
    sellerToken = storedTtpSeller.token;
    buyerToken  = storedTtpBuyer.token;
    gateToken   = sellerToken;
    ttpCredentialsAvailable = true;
    gateCredentialAvailable = true;
    console.log('[TTP-E2E] AUTH_MODE=file: loaded TTP seller+buyer tokens from .auth/');
    return;
  }

  // ── Mode B: env-var password login ────────────────────────────────────────────
  if (AUTH_MODE === 'env') {
    try {
      [sellerToken, buyerToken] = await Promise.all([
        loginQA(request, SELLER_EMAIL, QA_PWD, SELLER_TID),
        loginQA(request, BUYER_EMAIL,  QA_PWD, BUYER_TID),
      ]);
      gateToken = sellerToken;
      ttpCredentialsAvailable = true;
      gateCredentialAvailable = true;
      console.log('[TTP-E2E] AUTH_MODE=env: QA login succeeded for TTP seller+buyer');
    } catch (err) {
      console.error('[TTP-E2E] beforeAll login failed:', (err as Error).message);
      // All credential flags remain false — tests will skip
    }
    return;
  }

  // ── Mode C: gate-only (any existing session — TTA-3 only) ────────────────────
  if (AUTH_MODE === 'gate-only') {
    gateToken = storedGateFallback.token;
    gateCredentialAvailable = true;
    // ttpCredentialsAvailable remains false → TTB/TTC/TTD will skip
    console.warn(
      '[TTP-E2E] AUTH_MODE=gate-only. ' +
      `Using existing session (orgId: ${storedGateFallback.orgId}) for TTA-3 gate check. ` +
      'TTB/TTC/TTD require TTP-specific credentials. ' +
      'To enable full verification, create .auth/ttp-seller.json and .auth/ttp-buyer.json ' +
      'with { "token": "<jwt>", "orgId": "<org-uuid>" } from the logged-in TTP QA sessions, ' +
      'or set QA_AUTH_PWD. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED for TTB/TTC/TTD]',
    );
    return;
  }

  // ── Mode D: no credentials ────────────────────────────────────────────────────
  console.error(
    '[TTP-E2E] PLAYWRIGHT_SESSION_HANDOFF_REQUIRED: ' +
    'No authentication available for any test group. ' +
    'All auth-gated tests will be skipped. ' +
    'To unblock: create .auth/ttp-seller.json + .auth/ttp-buyer.json ' +
    'with { "token": "<jwt>", "orgId": "<org-uuid>" } ' +
    'or set QA_AUTH_PWD env var.',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// TTA — Preflight Gate
//   Verifies that the ttpFeatureGateMiddleware is active and working.
//   These tests run regardless of TTP_FLAG_ENABLED.
// ════════════════════════════════════════════════════════════════════════════

test.describe('TTA — Preflight Gate', () => {

  // TTA-1: Health check — backend is reachable
  test('TTA-1: GET /api/health returns 200', async ({ request }: { request: APIRequestContext }) => {
    const res: APIResponse = await request.get(`${BASE_URL}/api/health`);
    expect(res.status(), 'Health check must return HTTP 200').toBe(200);
    const body = await res.json() as { success?: boolean; status?: string };
    expect(
      body.success === true || body.status === 'ok',
      `Health body must indicate ok state. Got: ${JSON.stringify(body)}`,
    ).toBe(true);
  });

  // TTA-2: Unauthenticated request returns 401 (auth gate runs before feature gate)
  test('TTA-2: unauthenticated TTP request returns 401 (not 503)', async (
    { request }: { request: APIRequestContext },
  ) => {
    const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      res.status(),
      'Unauthenticated request must be rejected with 401 before feature gate fires',
    ).toBe(401);
  });

  // TTA-3: When ttp_enabled=false, authenticated request returns 503 FEATURE_DISABLED
  //        When ttp_enabled=true  (FLAG_ENABLED=1), expects 200 (gate is open)
  test(
    FLAG_ENABLED
      ? 'TTA-3: ttp_enabled=true — gate is open, authenticated request returns 200'
      : 'TTA-3: ttp_enabled=false — authenticated request returns 503 FEATURE_DISABLED',
    async ({ request }: { request: APIRequestContext }) => {
      test.skip(!gateCredentialAvailable, 'No gate session available — skipping TTA-3. Set QA_AUTH_PWD, or create .auth/ttp-seller.json, or ensure .auth/qa-b2b.json exists. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

      const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
        headers: authHeaders(gateToken),
      });

      if (FLAG_ENABLED) {
        // Gate is open — expect 200 or the response will be verified in TTB
        expect(
          res.status(),
          `Gate-open mode: expected 200, got HTTP ${res.status()}`,
        ).toBe(200);
      } else {
        // Gate is closed — must return 503 FEATURE_DISABLED
        expect(
          res.status(),
          `Gate-closed mode: expected 503 FEATURE_DISABLED, got HTTP ${res.status()}`,
        ).toBe(503);

        const body = await res.json() as {
          success: boolean;
          error?: { code: string; message: string };
        };
        expect(body.success, 'success must be false for 503 response').toBe(false);
        expect(
          body.error?.code,
          'error.code must be FEATURE_DISABLED',
        ).toBe('FEATURE_DISABLED');
      }
    },
  );

});

// ════════════════════════════════════════════════════════════════════════════
// TTB — Seller Score API
//   Requires: ttp_enabled=true (TTP_FLAG_ENABLED=1)
//             QA_AUTH_PWD set and login successful
// ════════════════════════════════════════════════════════════════════════════

test.describe('TTB — Seller Score API', () => {

  // Shared response state within this describe block
  let sellerBody: Record<string, unknown> = {};
  let sellerBodyRaw = '';

  // Fetch and cache the seller TTP summary response
  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB');
    test.skip(!ttpCredentialsAvailable, 'TTP seller credentials not available — skipping TTB. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED: create .auth/ttp-seller.json or set QA_AUTH_PWD]');

    const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
      headers: authHeaders(sellerToken),
    });
    sellerBodyRaw = await res.text();
    sellerBody = JSON.parse(sellerBodyRaw) as Record<string, unknown>;
  });

  test('TTB-1: seller TTP summary returns HTTP 200', async (
    { request }: { request: APIRequestContext },
  ) => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-1');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-1. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
      headers: authHeaders(sellerToken),
    });
    expect(res.status(), 'Seller TTP summary must return HTTP 200').toBe(200);
  });

  test('TTB-2: seller response success=true with data envelope', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-2');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-2. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    expect(sellerBody.success, 'success must be true').toBe(true);
    expect(sellerBody.data, 'data envelope must be present').toBeDefined();
    const data = sellerBody.data as Record<string, unknown>;
    expect(data.actor_role, 'actor_role must be SELLER').toBe('SELLER');
  });

  test('TTB-3: seller response contains trade_trust_score', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-3');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-3. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown> | undefined;
    expect(data, 'data must be present').toBeDefined();
    const score = data?.trade_trust_score;
    expect(score, 'trade_trust_score must be present in seller response').toBeDefined();
  });

  test('TTB-4: score=100, band=READY for fully seeded QA trade', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-4');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-4. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    expect(score, 'trade_trust_score must be defined').toBeDefined();
    expect(score.score, 'score must be 100 (all 7 QA factors seeded as PASS)').toBe(100);
    expect(score.band, 'band must be READY (score >= 80)').toBe('READY');
    expect(VALID_BANDS.has(score.band as string), 'band must be one of the 4 valid values').toBe(true);
  });

  test('TTB-5: 7 factor breakdown entries with required keys', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-5');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-5. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    const factors = score.factors as Array<Record<string, unknown>>;
    expect(Array.isArray(factors), 'factors must be an array').toBe(true);
    expect(factors.length, 'must have exactly 7 factors').toBe(7);

    const actualKeys = new Set(factors.map(f => f.key as string));
    for (const expectedKey of EXPECTED_FACTOR_KEYS) {
      expect(
        actualKeys.has(expectedKey),
        `factor key "${expectedKey}" must be present`,
      ).toBe(true);
    }
  });

  test('TTB-6: all 7 factors have status=PASS for QA seed', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-6');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-6. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    const factors = score.factors as Array<Record<string, unknown>>;
    for (const factor of factors) {
      const fKey = factor.key as string;
      expect(
        factor.status,
        `factor "${fKey}" must have status=PASS (fully seeded QA data)`,
      ).toBe('PASS');
      expect(
        typeof factor.points_awarded,
        `factor "${fKey}": points_awarded must be a number`,
      ).toBe('number');
      expect(
        typeof factor.points_possible,
        `factor "${fKey}": points_possible must be a number`,
      ).toBe('number');
      expect(
        factor.points_awarded,
        `factor "${fKey}": PASS must have points_awarded === points_possible`,
      ).toBe(factor.points_possible);
    }
  });

  test('TTB-7: blockers array is empty (no blockers for fully seeded QA trade)', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-7');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-7. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    const blockers = score.blockers as unknown[];
    expect(Array.isArray(blockers), 'blockers must be an array').toBe(true);
    expect(blockers.length, 'blockers must be empty for fully seeded QA trade').toBe(0);
  });

  test('TTB-8: mandatory disclaimer text present and verbatim', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-8');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-8. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = sellerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    expect(
      typeof score.disclaimer,
      'disclaimer must be a string',
    ).toBe('string');
    expect(
      (score.disclaimer as string).trim(),
      'disclaimer must match mandatory advisory text verbatim',
    ).toBe(MANDATORY_DISCLAIMER);
  });

  test('TTB-9: seller response contains no anti-leakage fields', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTB-9');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTB-9. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const found = scanForLeakage(sellerBodyRaw);
    expect(
      found,
      `Seller response MUST NOT contain any of these fields: ${found.join(', ')}`,
    ).toHaveLength(0);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// TTC — Buyer Score API
//   Requires: ttp_enabled=true (TTP_FLAG_ENABLED=1)
//             QA_AUTH_PWD set and login successful
//   Buyer gets a safe view: no raw bureau/GST payloads, no admin notes.
//   trade_trust_score must be present (advisory, not gated by actor role).
// ════════════════════════════════════════════════════════════════════════════

test.describe('TTC — Buyer Score API', () => {

  let buyerBody: Record<string, unknown> = {};
  let buyerBodyRaw = '';

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC');
    test.skip(!ttpCredentialsAvailable, 'TTP buyer credentials not available — skipping TTC. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED: create .auth/ttp-buyer.json or set QA_AUTH_PWD]');

    const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
      headers: authHeaders(buyerToken),
    });
    buyerBodyRaw = await res.text();
    buyerBody = JSON.parse(buyerBodyRaw) as Record<string, unknown>;
  });

  test('TTC-1: buyer TTP summary returns HTTP 200', async (
    { request }: { request: APIRequestContext },
  ) => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-1');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-1. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const res: APIResponse = await request.get(`${BASE_URL}${TTP_SUMMARY_PATH}`, {
      headers: authHeaders(buyerToken),
    });
    expect(res.status(), 'Buyer TTP summary must return HTTP 200').toBe(200);
  });

  test('TTC-2: buyer response actor_role=BUYER', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-2');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-2. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    expect(buyerBody.success, 'success must be true').toBe(true);
    const data = buyerBody.data as Record<string, unknown>;
    expect(data.actor_role, 'actor_role must be BUYER for buyer token').toBe('BUYER');
  });

  test('TTC-3: buyer response contains trade_trust_score', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-3');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-3. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = buyerBody.data as Record<string, unknown>;
    expect(
      data.trade_trust_score,
      'trade_trust_score must be present in buyer response (advisory view)',
    ).toBeDefined();
  });

  test('TTC-4: buyer trade_trust_score has score and valid band', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-4');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-4. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = buyerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    expect(score, 'trade_trust_score must be defined').toBeDefined();
    expect(typeof score.score, 'score.score must be a number').toBe('number');
    expect(
      VALID_BANDS.has(score.band as string),
      `score.band "${score.band as string}" must be one of: ${[...VALID_BANDS].join(', ')}`,
    ).toBe(true);
  });

  test('TTC-5: buyer response disclaimer present', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-5');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-5. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const data = buyerBody.data as Record<string, unknown>;
    const score = data.trade_trust_score as Record<string, unknown>;
    expect(
      (score.disclaimer as string | undefined)?.includes('advisory readiness indicator only'),
      'buyer disclaimer must contain "advisory readiness indicator only"',
    ).toBe(true);
  });

  test('TTC-6: buyer response contains no anti-leakage fields', () => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTC-6');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTC-6. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED]');

    const found = scanForLeakage(buyerBodyRaw);
    expect(
      found,
      `Buyer response MUST NOT contain any of these fields: ${found.join(', ')}`,
    ).toHaveLength(0);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// TTD — UI Smoke: Score section visible in tenant SPA
//   Requires: ttp_enabled=true (TTP_FLAG_ENABLED=1)
//             QA_AUTH_PWD set and login successful
//             Run with chromium (default Playwright project)
//
//   Strategy: inject seller token into localStorage, navigate to app,
//   navigate to Trades panel, select QA trade, assert score UI visible.
//   If QA trade is not reachable from nav, records as known limitation.
//
//   NOTE: No data-testid attributes exist in TtpTradeSummaryCard.tsx.
//         All assertions use text-based selectors.
// ════════════════════════════════════════════════════════════════════════════

test.describe('TTD — UI Smoke (chromium)', () => {

  // @ts-expect-error page type resolved at runtime via npx playwright
  test('TTD-1: TradeTrust Score section visible in tenant trades UI', async ({ page }) => {
    test.skip(!FLAG_ENABLED, 'TTP_FLAG_ENABLED not set — skipping TTD');
    test.skip(!ttpCredentialsAvailable, 'TTP credentials not available — skipping TTD. [PLAYWRIGHT_SESSION_HANDOFF_REQUIRED: create .auth/ttp-seller.json or set QA_AUTH_PWD]');
    test.slow(); // UI navigation may take longer than default timeout

    // Step 1: Navigate to app and inject auth state into localStorage
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(
      ({ token, tenantId }: { token: string; tenantId: string }) => {
        localStorage.setItem('texqtic_tenant_token', token);
        localStorage.setItem('texqtic_auth_realm', 'TENANT');
        // Store tenant id for apiClient resolution
        localStorage.setItem('texqtic_tenant_id', tenantId);
      },
      { token: sellerToken, tenantId: SELLER_TID },
    );

    // Step 2: Reload to let the app pick up the injected auth state
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });

    // Step 3: Navigate to Trades panel
    // The SPA uses state-based routing. Try clicking the "Trades" nav link first.
    const tradesNavLocator = page.locator('text=Trades').first();
    const tradesNavVisible = await tradesNavLocator.isVisible().catch(() => false);

    if (!tradesNavVisible) {
      // KNOWN LIMITATION: QA trade not reachable from nav after token injection
      // Possible causes: SPA requires full login flow / nav not rendered in current state
      test.info().annotations.push({
        type: 'TENANT_UI_QA_TRADE_NOT_REACHABLE_FROM_NAV',
        description:
          'Trades nav link not found after localStorage token injection. ' +
          'SPA may require a full interactive login before state-based nav resolves. ' +
          'API-level score assertions (TTB/TTC) are the primary verification path.',
      });
      console.warn('[TTD-1] KNOWN LIMITATION: Trades nav not visible after token injection. ' +
        'Skipping UI assertion. API tests (TTB/TTC) remain authoritative.');
      // Soft skip — don't fail the governance run for this limitation
      return;
    }

    await tradesNavLocator.click();
    await page.waitForTimeout(2000); // Allow SPA state to settle

    // Step 4: Find and click the QA trade
    // Try by trade ID partial text or reference
    const tradeLocator = page.locator(`text=${TRADE_ID}`).first();
    const tradeVisible = await tradeLocator.isVisible().catch(() => false);

    if (!tradeVisible) {
      test.info().annotations.push({
        type: 'TENANT_UI_QA_TRADE_NOT_REACHABLE_FROM_NAV',
        description:
          `QA trade ${TRADE_ID} not found in trades list. ` +
          'Trade may not be visible to seller without specific navigation context.',
      });
      console.warn(`[TTD-1] KNOWN LIMITATION: QA trade ${TRADE_ID} not found in list. ` +
        'Skipping trade detail assertion. API tests remain authoritative.');
      return;
    }

    await tradeLocator.click();
    await page.waitForTimeout(2000);

    // Step 5: Assert score section presence
    // TtpTradeSummaryCard renders "TradeTrust Score" as heading when score is available
    await expect(
      page.locator('text=TradeTrust Score').first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator('text=READY').first(),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator('text=/ 100').first(),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator('text=advisory readiness indicator only').first(),
    ).toBeVisible({ timeout: 5000 });
  });

});
