/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice F2
 * Auth State Setup Helper — Orders F2 Missing Identities
 *
 * PURPOSE:
 *   Opens a headed Chromium browser for each missing QA identity.
 *   Paresh logs in manually — no passwords are stored or printed by this script.
 *   On successful login the JWT token is read from localStorage and the tenantId
 *   claim is decoded from the token payload.
 *   Each identity's { token, orgId } is saved to .auth/{name}.json (gitignored).
 *
 *   Identities captured:
 *     qa-buyer-member → MEMBER role user in the QA WL tenant
 *                       (qa.wl.member@texqtic.com — proves MEMBER role enforcement on Orders API)
 *     qa-wl-admin     → OWNER/WL_ADMIN of QA WL tenant
 *                       (qa.wl@texqtic.com — proves WL_ADMIN can access Orders panel)
 *
 * SECURITY NOTES:
 *   - No passwords are stored, printed, or passed to this script.
 *   - .auth/ directory is gitignored — auth state files are never committed.
 *   - Token values are never logged by this script.
 *
 * RUN (from repo root):
 *   pnpm exec tsx tests/e2e/setup-orders-f2-auth.ts
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

/** The two missing identities for Slice F2. */
const IDENTITIES: { name: string; email: string; label: string }[] = [
  {
    name: 'qa-buyer-member',
    email: 'qa.wl.member@texqtic.com',
    label: 'QA WL Member — MEMBER role in QA WL tenant (proves MEMBER role enforcement on Orders API)',
  },
  {
    name: 'qa-wl-admin',
    email: 'qa.wl@texqtic.com',
    label: 'QA WL Admin — OWNER/WL_ADMIN of QA WL tenant (proves WL_ADMIN Orders panel access)',
  },
];

// ─── Decode JWT payload (base64url → JSON) — no signature verification needed ─
function decodeJwtPayload(token: string): Record<string, unknown> {
  const payloadB64 = token.split('.')[1];
  if (!payloadB64) throw new Error('Invalid JWT: missing payload segment');
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

  // Do NOT print token value — only confirm presence and orgId (not the token value itself)
  console.log(`[SETUP] ✓ Auth state saved: .auth/${name}.json`);
  console.log(`[SETUP]   orgId: ${orgId}`);
  console.log(`[SETUP]   token: <present — value not printed>`);

  // Confirm the role claim (for visibility — not sensitive)
  const role = typeof payload.role === 'string' ? payload.role : '(not in JWT payload)';
  console.log(`[SETUP]   role claim in JWT: ${role}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('=================================================================');
  console.log(' TexQtic Slice F2 — Orders Auth State Setup');
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
  console.log(' Auth state setup complete. 2 identities captured.');
  console.log(' Files written to .auth/ (gitignored — never committed).');
  console.log('');
  console.log(' Run the Playwright tests now:');
  console.log('   $ptBin = "C:\\Users\\PARESH\\AppData\\Local\\npm-cache\\_npx\\420ff84f11983ee5\\node_modules\\.bin\\playwright.cmd"');
  console.log('   & $ptBin test tests/e2e/orders-lifecycle.spec.ts --reporter=list');
  console.log('=================================================================');
}

main().catch((err: unknown) => {
  console.error('\n[SETUP] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
