/**
 * zoho-live-contact-smoke.ts
 *
 * CONTROLLED SMOKE SCRIPT — RUN ONCE — REMOVE AFTER COMPLETION
 *
 * Purpose:
 *   Execute a single live Zoho Books Contact upsert for the synthetic org
 *   (slug: crm-verify-corp-synthetic), verify the returned contact_id is stored in
 *   organization_integrations.external_id, and prove the upsert path works end-to-end.
 *
 * Safety constraints:
 *   - Targets ONLY the org with slug 'crm-verify-corp-synthetic'. Exits if slug not found.
 *   - Exits if external_id is already set (prevents double-fire).
 *   - Does NOT touch any org with slug != 'crm-verify-corp-synthetic'.
 *   - Does NOT commit, process payments, or change org status.
 *   - Does NOT run prisma migrate or any schema change.
 *   - Access token and refresh token are never logged.
 *   - Raw Zoho response is never logged.
 *
 * Invocation:
 *   cd C:\Users\PARESH\TexQtic\server
 *   pnpm exec tsx scripts/zoho-live-contact-smoke.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';

// Load env — two-step pattern: server/.env first, then root .env.local
dotenvConfig();
dotenvConfig({ path: resolve(process.cwd(), '../.env.local'), override: false });

// Guard: ensure this is clearly a controlled smoke run
process.env['ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED'] = 'true';

import { PrismaClient, Prisma } from '@prisma/client';
import { readZohoBooksRuntimeConfig } from '../src/services/zoho/zohoBooks.config.js';
import { createZohoBooksContact } from '../src/services/zoho/zohoBooks.sync.js';

const TARGET_ORG_SLUG = 'crm-verify-corp-synthetic';

async function main(): Promise<void> {
  console.log('[SMOKE] zoho-live-contact-smoke starting');

  // ── 1. Config check ──────────────────────────────────────────────────────
  const configResult = readZohoBooksRuntimeConfig(process.env);
  if (configResult.status === 'DISABLED') {
    console.error('[SMOKE] Zoho config is DISABLED — ensure ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED=true');
    process.exit(1);
  }
  if (configResult.status === 'MISSING_REQUIRED_ENV') {
    console.error('[SMOKE] Missing required env keys:', configResult.missingKeys);
    process.exit(1);
  }
  console.log('[SMOKE] Config: READY — organizationId=[REDACTED] apiDomain=[REDACTED]');

  const config = configResult.config;
  const prisma = new PrismaClient({ log: [] });

  try {
    // ── 2. Look up target org by slug ─────────────────────────────────────
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; legal_name: string; status: string }>>(
      Prisma.sql`
        SELECT id, slug, legal_name, status
        FROM organizations
        WHERE slug = ${TARGET_ORG_SLUG}
        LIMIT 1
      `,
    );

    if (rows.length === 0) {
      console.error(`[SMOKE] ABORT: org slug '${TARGET_ORG_SLUG}' not found — refusing to run on unknown org`);
      process.exit(1);
    }

    const org = rows[0]!;
    console.log(`[SMOKE] Target org found: slug=${org.slug} status=${org.status}`);

    // ── 3. Check for existing external_id (idempotency guard) ─────────────
    const integRows = await prisma.$queryRaw<Array<{
      id: string;
      external_id: string | null;
      sync_status: string;
      last_dry_run_at: Date | null;
    }>>(
      Prisma.sql`
        SELECT id, external_id, sync_status, last_dry_run_at
        FROM organization_integrations
        WHERE organization_id = ${org.id}::uuid
          AND provider_key = 'zoho_books'
          AND external_object_type = 'contact'
        LIMIT 1
      `,
    );

    if (integRows.length === 0) {
      console.error('[SMOKE] ABORT: No organization_integrations row found for this org. Run controlled dry-run first.');
      process.exit(1);
    }

    const integ = integRows[0]!;
    console.log(`[SMOKE] Integration row: sync_status=${integ.sync_status} external_id=${integ.external_id ?? 'null'}`);

    if (integ.external_id !== null) {
      console.error(`[SMOKE] ABORT: external_id is already set (${integ.external_id}). Upsert already ran — use Zoho dashboard to verify if needed.`);
      process.exit(1);
    }

    // ── 4. Build snapshot from org row ────────────────────────────────────
    const snapshot = {
      organization: {
        id: org.id,
        legalName: org.legal_name,
        tradeName: undefined,
        jurisdiction: 'IN',
        status: org.status,
      },
      tenant: {
        id: org.id,
        name: org.legal_name,
        plan: 'FREE',
      },
      activatedAt: new Date().toISOString(),
      source: 'TexQtic Controlled Live Smoke',
    };

    // ── 5. Execute live upsert ────────────────────────────────────────────
    console.log('[SMOKE] Calling createZohoBooksContact...');
    const result = await createZohoBooksContact(config, snapshot);

    console.log(`[SMOKE] Zoho result status: ${result.status}`);
    console.log(`[SMOKE] liveMutationAttempted: ${result.liveMutationAttempted}`);
    if (result.status === 'SYNC_FAILED') {
      console.error(`[SMOKE] SYNC_FAILED — errorSummary: ${result.errorSummary}`);
      process.exit(1);
    }

    const contactId = result.contactId;
    const shapeFallbackUsed = result.shapeFallbackUsed;
    console.log(`[SMOKE] contactId: ${contactId}`);
    console.log(`[SMOKE] shapeFallbackUsed: ${shapeFallbackUsed}`);

    // ── 6. Persist contactId to DB ────────────────────────────────────────
    console.log('[SMOKE] Persisting contact_id to organization_integrations...');

    const updateRows = await prisma.$queryRaw<Array<{
      external_id: string;
      sync_status: string;
      attempt_count: number;
      last_attempted_at: Date;
    }>>(
      Prisma.sql`
        UPDATE organization_integrations
        SET
          external_id          = ${contactId},
          sync_status          = 'SYNC_SUCCESS',
          last_attempted_at    = NOW(),
          last_error_summary   = NULL,
          attempt_count        = attempt_count + 1,
          updated_at           = NOW()
        WHERE organization_id     = ${org.id}::uuid
          AND provider_key        = 'zoho_books'
          AND external_object_type = 'contact'
        RETURNING external_id, sync_status, attempt_count, last_attempted_at
      `,
    );

    if (updateRows.length === 0) {
      console.error('[SMOKE] ABORT: UPDATE returned no rows — persistence failed');
      process.exit(1);
    }

    const updated = updateRows[0]!;
    console.log(`[SMOKE] DB persisted: external_id=${updated.external_id} sync_status=${updated.sync_status} attempt_count=${updated.attempt_count}`);

    // ── 7. Read-back verify ───────────────────────────────────────────────
    const verifyRows = await prisma.$queryRaw<Array<{
      external_id: string | null;
      sync_status: string;
    }>>(
      Prisma.sql`
        SELECT external_id, sync_status
        FROM organization_integrations
        WHERE organization_id = ${org.id}::uuid
          AND provider_key = 'zoho_books'
          AND external_object_type = 'contact'
      `,
    );

    const verify = verifyRows[0];
    if (!verify || verify.external_id === null) {
      console.error('[SMOKE] ABORT: Read-back check failed — external_id still null after UPDATE');
      process.exit(1);
    }

    console.log(`[SMOKE] Read-back OK: external_id=${verify.external_id} sync_status=${verify.sync_status}`);
    console.log(`[SMOKE] ✔ COMPLETE — shapeFallbackUsed=${shapeFallbackUsed}`);
    if (shapeFallbackUsed) {
      console.log('[SMOKE] NOTE: Custom field label-shape fallback was used — update zohoBooks.payload.ts to use label shape permanently.');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  // Never print the error directly — it may contain env context from prisma/stack
  const msg = err instanceof Error ? err.message : String(err);
  // Redact any potential connection string fragments
  const safeMsg = msg.replace(/postgres:\/\/[^\s]*/gi, '[REDACTED_DB_URL]').replace(/password=[^\s&]*/gi, '[REDACTED]');
  console.error('[SMOKE] Unexpected error:', safeMsg);
  process.exit(1);
});
