/**
 * TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Slice G
 * Auth State Setup Helper
 *
 * PURPOSE:
 *   Opens a headed Chromium browser for each QA identity.
 *   Paresh logs in manually — no passwords are stored or printed by this script.
 *   On successful login the JWT token is read from localStorage and the tenantId
 *   claim is decoded from the token payload.
 *   Each identity's { token, orgId } is saved to .auth/{name}.json (gitignored).
 *   The main spec (catalog-visibility-policy-gating.spec.ts) reads those files
 *   automatically so tests run without env var credentials.
 *
 * SECURITY NOTES:
 *   - No passwords are stored, printed, or passed to this script.
 *   - .auth/ directory is gitignored — auth state files are never committed.
 *   - Token values are never logged by this script.
 *
 * RUN (from repo root):
 *   $ptBin = "C:\Users\PARESH\AppData\Local\npm-cache\_npx\420ff84f11983ee5\node_modules\.bin\playwright.cmd"
 *   npx tsx tests/e2e/setup-auth-state.ts
 *
 *   OR with tsx directly (if tsx is available):
 *   pnpm exec tsx tests/e2e/setup-auth-state.ts
 *
 * Requires Chromium — install with:
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com').replace(/\/$/, '');
const AUTH_DIR = join(process.cwd(), '.auth');

/** localStorage key used by TexQtic for the tenant JWT. */
const TENANT_TOKEN_KEY = 'texqtic_tenant_token';

/** Seconds to wait for the user to complete each manual login (5 minutes). */
const LOGIN_TIMEOUT_SECONDS = 300;

/** QA identities to capture auth state for. */
const IDENTITIES: { name: string; email: string; label: string }[] = [
  {
    name: 'qa-buyer-a',
    email: 'qa.buyer.wvg.a@texqtic.com',
    label: 'Buyer A — APPROVED relationship with qa-b2b',
  },
  {
    name: 'qa-buyer-b',
    email: 'qa.buyer@texqtic.com',
    label: 'Buyer B — REQUESTED relationship with qa-b2b',
  },
  {
    name: 'qa-buyer-c',
    email: 'qa.buyer.knt.c@texqtic.com',
    label: 'Buyer C — no relationship with qa-b2b',
  },
  {
    name: 'qa-b2b',
    email: 'qa.b2b@texqtic.com',
    label: 'Supplier qa-b2b — catalog item owner',
  },
];

// ─── Decode JWT payload (base64url → JSON) — no signature verification needed ─
function decodeJwtPayload(token: string): Record<string, unknown> {
  const payloadB64 = token.split('.')[1];
  if (!payloadB64) throw new Error('Invalid JWT: missing payload segment');
  // base64url → base64 → Buffer → string
  const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
}

// ─── Capture auth state for one identity ──────────────────────────────────────
async function captureAuthState(identity: { name: string; email: string; label: string }): Promise<void> {
  const { name, email, label } = identity;

  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`[SETUP] Identity: ${label}`);
  console.log(`[SETUP] Email:    ${email}`);
  console.log(`[SETUP] Opening headed browser — please log in as this identity.`);
  console.log(`[SETUP] The browser will close automatically once login is detected.`);
  console.log(`──────────────────────────────────────────────────────────\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await page.goto(BASE_URL);

  // Poll localStorage every second, up to LOGIN_TIMEOUT_SECONDS
  let token: string | null = null;
  for (let i = 0; i < LOGIN_TIMEOUT_SECONDS; i++) {
    token = await page.evaluate(
      (key: string) => (window as Window & typeof globalThis & { localStorage: Storage }).localStorage.getItem(key),
      TENANT_TOKEN_KEY,
    );
    if (token) break;
    await page.waitForTimeout(1000);
  }

  await browser.close();

  if (!token) {
    throw new Error(`[SETUP] Timed out after ${LOGIN_TIMEOUT_SECONDS}s waiting for login for: ${label}`);
  }

  // Decode JWT to extract tenantId (= orgId)
  const payload = decodeJwtPayload(token);
  const orgId = typeof payload.tenantId === 'string' ? payload.tenantId : null;

  if (!orgId) {
    throw new Error(
      `[SETUP] JWT for ${label} does not contain a 'tenantId' claim. ` +
      `Available claims: ${Object.keys(payload).join(', ')}`,
    );
  }

  // Save auth state — token + orgId only (no passwords, no secrets printed)
  mkdirSync(AUTH_DIR, { recursive: true });
  const authFile = join(AUTH_DIR, `${name}.json`);
  writeFileSync(authFile, JSON.stringify({ token, orgId }, null, 2), 'utf8');

  // Do NOT print token value — only confirm presence and orgId
  console.log(`[SETUP] ✓ Auth state saved: .auth/${name}.json`);
  console.log(`[SETUP]   orgId: ${orgId}`);
  console.log(`[SETUP]   token: <present — value not printed>`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('=================================================================');
  console.log(' TexQtic Slice G — Auth State Setup');
  console.log(' Target:', BASE_URL);
  console.log(' Identities:', IDENTITIES.length);
  console.log('=================================================================');
  console.log('');
  console.log('Instructions:');
  console.log('  For each identity a headed browser will open.');
  console.log('  Log in as that identity in the browser window.');
  console.log('  Do NOT enter credentials here — log in in the browser only.');
  console.log('  The browser closes automatically on successful login detection.');
  console.log('');

  for (const identity of IDENTITIES) {
    await captureAuthState(identity);
  }

  console.log('\n=================================================================');
  console.log(' Auth state setup complete. All 4 identities captured.');
  console.log(' Files written to .auth/ (gitignored — never committed).');
  console.log('');
  console.log(' Run the Playwright tests now:');
  console.log('   $ptBin = "C:\\Users\\PARESH\\AppData\\Local\\npm-cache\\_npx\\420ff84f11983ee5\\node_modules\\.bin\\playwright.cmd"');
  console.log('   & $ptBin test tests/e2e/catalog-visibility-policy-gating.spec.ts --reporter=list');
  console.log('=================================================================\n');
}

main().catch((err: unknown) => {
  console.error('[SETUP] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
