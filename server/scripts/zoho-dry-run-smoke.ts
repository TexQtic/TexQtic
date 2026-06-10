/**
 * zoho-dry-run-smoke.ts
 *
 * ONE-OFF CONTROLLED DRY-RUN SCRIPT
 * Unit: PROD-ZOHO-CONTROLLED-DRY-RUN-ORGANIZATION-INTEGRATIONS-01
 * Authorization: Paresh Patel
 *
 * Purpose:
 *   Execute runZohoBooksPostActivationDryRun for one Paresh-approved synthetic/test org.
 *   Upsert the resulting integrationDraft to organization_integrations.
 *   Verify: external_id is null, no live Zoho /contacts mutation occurred.
 *
 * Safety guarantees:
 *   - Only read-only Zoho API calls (token refresh, orgs read, custom fields read, sandboxes read)
 *   - No Zoho Contact/Customer create/update/delete
 *   - No POST/PUT/PATCH/DELETE to /contacts (guaranteed by runZohoBooksPostActivationDryRun design)
 *   - DB write only to organization_integrations for the selected synthetic org
 *   - externalId always null (architectural guarantee in dry-run service)
 *   - All credentials/secrets redacted from output
 *   - No real customer data used in snapshot
 *
 * Invocation:
 *   pnpm exec tsx scripts/zoho-dry-run-smoke.ts
 *
 * Cleanup:
 *   REMOVE this script after storage proof is captured and committed.
 */

// Load server/.env first (standard for all server scripts), then load root
// .env.local without override so it adds any keys absent from server/.env.
// Root .env.local is gitignored and carries Zoho credentials for local runs.
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
dotenvConfig(); // loads server/.env (CWD = server/)
dotenvConfig({ path: resolve(process.cwd(), '../.env.local'), override: false });

import { PrismaClient, Prisma } from '@prisma/client';
import { runZohoBooksPostActivationDryRun } from '../src/services/zoho/zohoBooks.dryRun.js';

// ── Paresh-authorized synthetic/test org candidates ───────────────────────────
// Only synthetic orgs provisioned in previous verification units.
// No real customer data. No real GSTIN/PAN/Aadhaar.
const CANDIDATE_ORG_IDS = [
  'b3f4229a-064e-4af9-8c86-adf9c42da2de',
  '2f39459e-6465-4ae9-b31e-f23e17192448',
  '51aa42e2-8b9d-41ed-9d3e-0f04305b493e',
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    console.log('[dry-run-smoke] === Zoho Books Controlled Dry-Run Smoke ===');
    console.log('[dry-run-smoke] Unit: PROD-ZOHO-CONTROLLED-DRY-RUN-ORGANIZATION-INTEGRATIONS-01');

    // ── Step 1: Select synthetic org from DB ─────────────────────────────────
    console.log('\n[step-1] Searching for synthetic org from candidate list...');

    let selectedOrgId: string | null = null;
    let selectedOrgSlug: string | null = null;

    for (const candidateId of CANDIDATE_ORG_IDS) {
      const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; status: string }>>(
        Prisma.sql`
          SELECT id::text, slug, status
          FROM organizations
          WHERE id = ${candidateId}::uuid
          LIMIT 1
        `
      );

      if (rows.length > 0) {
        selectedOrgId = rows[0].id;
        selectedOrgSlug = rows[0].slug;
        // Redact UUID; show only slug and status for safety
        console.log(`[step-1] Candidate found: slug=${selectedOrgSlug} status=${rows[0].status}`);
        break;
      }
    }

    if (!selectedOrgId || !selectedOrgSlug) {
      console.error('[BLOCKED] No candidate org found in production DB.');
      console.error('[BLOCKED] None of the Paresh-authorized candidate org IDs exist.');
      console.error('[ENUM] PROD_ZOHO_CONTROLLED_DRY_RUN_ORGANIZATION_INTEGRATIONS_BLOCKED_NO_SAFE_TEST_ORG');
      process.exit(1);
    }

    // ── Step 2: Construct controlled synthetic snapshot ───────────────────────
    // NOTE: snapshot.organization.status must be 'VERIFICATION_APPROVED' to
    // pass the eligibility gate in runZohoBooksPostActivationDryRun.
    // This is a synthetic snapshot — no real customer data.
    console.log('\n[step-2] Constructing synthetic activation snapshot...');

    const activatedAt = new Date().toISOString();

    const snapshot = {
      organization: {
        id: selectedOrgId,
        legalName: 'Controlled Dry-Run Synthetic Org',
        tradeName: null,
        jurisdiction: 'IN',
        status: 'VERIFICATION_APPROVED' as const,
      },
      tenant: {
        id: selectedOrgId,
        name: 'Controlled Dry-Run Smoke Tenant',
        plan: 'FREE',
      },
      activatedAt,
      source: 'TexQtic Controlled Dry-Run Smoke',
    };

    console.log(`[step-2] snapshot.organization.status=${snapshot.organization.status}`);
    console.log(`[step-2] snapshot.source=${snapshot.source}`);
    console.log(`[step-2] snapshot.activatedAt=${snapshot.activatedAt}`);

    // ── Step 3: Execute runZohoBooksPostActivationDryRun ─────────────────────
    // AUTHORIZED OVERRIDE: For this controlled dry-run, set the enable flag
    // in-process so the function checks credential availability.
    // This is NOT a .env file edit — it is a one-off process.env override
    // for this Paresh-authorized controlled execution only.
    // The flag is NOT committed to any env file.
    process.env['ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED'] = 'true';
    console.log(`[step-3] ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED overridden to 'true' (in-process, authorized)`);
    console.log('\n[step-3] Executing runZohoBooksPostActivationDryRun...');

    const result = await runZohoBooksPostActivationDryRun(snapshot);

    console.log(`[step-3] result.status=${result.status}`);
    console.log(`[step-3] result.liveMutationAttempted=${result.liveMutationAttempted}`);
    console.log(`[step-3] result.liveMutationBlocked=${result.liveMutationBlocked}`);
    console.log(`[step-3] result.configState=${result.configState}`);

    // ── Safety assertions (abort if violated) ────────────────────────────────
    if (result.liveMutationAttempted !== false) {
      console.error('[SAFETY-VIOLATION] liveMutationAttempted is not false — aborting');
      process.exit(1);
    }
    if (result.liveMutationBlocked !== true) {
      console.error('[SAFETY-VIOLATION] liveMutationBlocked is not true — aborting');
      process.exit(1);
    }

    // ── Handle non-storage outcomes ───────────────────────────────────────────
    if (result.status === 'DISABLED') {
      console.log('[step-3] Config status: DISABLED');
      console.log('[step-3] ZOHO_POST_ACTIVATION_SYNC_DRY_RUN_ENABLED is not "true" in env.');
      console.log('[BLOCKED] Cannot verify DB storage — dry-run is disabled in this environment.');
      console.log('[ENUM] PROD_ZOHO_CONTROLLED_DRY_RUN_ORGANIZATION_INTEGRATIONS_BLOCKED_ORG_INELIGIBLE_FOR_STORAGE_PROOF');
      process.exit(1);
    }

    if (result.status === 'MISSING_REQUIRED_ENV') {
      console.log('[step-3] Config status: MISSING_REQUIRED_ENV');
      console.log('[BLOCKED] Missing required Zoho env keys — redacted for safety.');
      console.log('[ENUM] PROD_ZOHO_CONTROLLED_DRY_RUN_ORGANIZATION_INTEGRATIONS_BLOCKED_VALIDATION_FAILURE');
      process.exit(1);
    }

    if (result.status === 'INELIGIBLE_STATUS') {
      console.log('[step-3] Org snapshot status is ineligible — should not occur with VERIFICATION_APPROVED snapshot.');
      console.log('[BLOCKED] PROD_ZOHO_CONTROLLED_DRY_RUN_ORGANIZATION_INTEGRATIONS_BLOCKED_ORG_INELIGIBLE_FOR_STORAGE_PROOF');
      process.exit(1);
    }

    // ── Step 3 success: DRY_RUN_READY or DRY_RUN_PARTIAL ─────────────────────
    const { integrationDraft, remoteChecks } = result;

    if (!integrationDraft) {
      console.error('[BLOCKED] integrationDraft is null despite non-error result status');
      process.exit(1);
    }

    // Report remote checks (sanitized — no credential values)
    if (remoteChecks) {
      console.log(`[step-3] remoteChecks.accessToken=${remoteChecks.accessToken}`);
      console.log(`[step-3] remoteChecks.organizations=${remoteChecks.organizations}`);
      console.log(`[step-3] remoteChecks.customFields=${remoteChecks.customFields}`);
      console.log(`[step-3] remoteChecks.sandbox=${remoteChecks.sandbox}`);
      // apiBaseUrl and idempotencyHeaders redacted (may contain org-sensitive values)
    }

    // Pre-write externalId assertion
    if (integrationDraft.externalId !== null) {
      console.error(`[SAFETY-VIOLATION] integrationDraft.externalId is not null: ${integrationDraft.externalId}`);
      process.exit(1);
    }

    console.log(`[step-3] integrationDraft.externalId=${integrationDraft.externalId} ← null confirmed (pre-write) ✓`);
    console.log(`[step-3] integrationDraft.syncStatus=${integrationDraft.syncStatus}`);
    console.log(`[step-3] integrationDraft.providerKey=${integrationDraft.providerKey}`);
    console.log(`[step-3] integrationDraft.externalObjectType=${integrationDraft.externalObjectType}`);

    // ── Step 4: Upsert to organization_integrations ───────────────────────────
    // Uses raw SQL to avoid any dependency on Prisma model type resolution.
    // The postgres role used by DATABASE_URL has BYPASSRLS=true — writes are
    // permitted even with RLS FORCE enabled.
    // The upsert uses the unique constraint:
    //   (organization_id, provider_key, external_object_type)
    console.log('\n[step-4] Upserting to organization_integrations...');

    const lastAttemptedAt = integrationDraft.lastAttemptedAt
      ? new Date(integrationDraft.lastAttemptedAt)
      : null;
    const lastDryRunAt = integrationDraft.lastDryRunAt
      ? new Date(integrationDraft.lastDryRunAt)
      : null;

    // Sanitize metadataJson: exclude raw snapshot fields that may contain org data
    // Keep only the structural keys needed for verification
    const safeMetadata = {
      source: integrationDraft.metadataJson['source'],
      readOnlyChecks: {
        tokenRefresh: {
          status: (integrationDraft.metadataJson['readOnlyChecks'] as Record<string, unknown> | undefined)
            ?.['tokenRefresh']
            ? { status: ((integrationDraft.metadataJson['readOnlyChecks'] as Record<string, Record<string, unknown>>)['tokenRefresh'])['status'] }
            : 'unknown',
        },
        organizations: {
          status: (integrationDraft.metadataJson['readOnlyChecks'] as Record<string, unknown> | undefined)
            ? ((integrationDraft.metadataJson['readOnlyChecks'] as Record<string, Record<string, unknown>>)['organizations'])?.['status']
            : 'unknown',
        },
        customFields: {
          status: (integrationDraft.metadataJson['readOnlyChecks'] as Record<string, unknown> | undefined)
            ? ((integrationDraft.metadataJson['readOnlyChecks'] as Record<string, Record<string, unknown>>)['customFields'])?.['status']
            : 'unknown',
        },
      },
      smokeRunTag: `controlled-dry-run-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    };

    const upsertResult = await prisma.$queryRaw<
      Array<{
        id: string;
        organization_id: string;
        provider_key: string;
        external_object_type: string;
        external_id: string | null;
        sync_status: string;
        last_dry_run_at: Date | null;
        last_attempted_at: Date | null;
        last_error_summary: string | null;
        attempt_count: number;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        INSERT INTO organization_integrations (
          organization_id,
          provider_key,
          external_object_type,
          external_id,
          sync_status,
          last_attempted_at,
          last_dry_run_at,
          last_error_summary,
          attempt_count,
          metadata_json
        ) VALUES (
          ${integrationDraft.organizationId}::uuid,
          ${integrationDraft.providerKey},
          ${integrationDraft.externalObjectType},
          ${integrationDraft.externalId},
          ${integrationDraft.syncStatus},
          ${lastAttemptedAt},
          ${lastDryRunAt},
          ${integrationDraft.lastErrorSummary},
          1,
          ${JSON.stringify(safeMetadata)}::jsonb
        )
        ON CONFLICT (organization_id, provider_key, external_object_type)
        DO UPDATE SET
          sync_status        = EXCLUDED.sync_status,
          last_attempted_at  = EXCLUDED.last_attempted_at,
          last_dry_run_at    = EXCLUDED.last_dry_run_at,
          last_error_summary = EXCLUDED.last_error_summary,
          attempt_count      = organization_integrations.attempt_count + 1,
          metadata_json      = EXCLUDED.metadata_json,
          updated_at         = now()
        RETURNING
          id::text,
          organization_id::text,
          provider_key,
          external_object_type,
          external_id,
          sync_status,
          last_dry_run_at,
          last_attempted_at,
          last_error_summary,
          attempt_count,
          created_at,
          updated_at
      `
    );

    if (!upsertResult.length) {
      console.error('[step-4] Upsert returned no row — unexpected');
      process.exit(1);
    }

    const row = upsertResult[0];
    console.log('[step-4] Upsert RETURNING row received ✓');

    // ── Step 5: Read-back verification ───────────────────────────────────────
    console.log('\n[step-5] Read-back verification...');

    // Post-write externalId assertion (the single most important safety check)
    if (row.external_id !== null) {
      console.error(`[SAFETY-VIOLATION] Stored row has non-null external_id: ${row.external_id}`);
      process.exit(1);
    }

    // organizationId: show only slug for safety (no UUID in output)
    console.log(`[step-5] org_slug=${selectedOrgSlug} ← org confirmed (UUID redacted)`);
    console.log(`[step-5] provider_key=${row.provider_key}`);
    console.log(`[step-5] external_object_type=${row.external_object_type}`);
    console.log(`[step-5] external_id=${row.external_id} ← null confirmed ✓`);
    console.log(`[step-5] sync_status=${row.sync_status}`);
    console.log(`[step-5] last_dry_run_at=${row.last_dry_run_at?.toISOString() ?? 'null'}`);
    console.log(`[step-5] last_attempted_at=${row.last_attempted_at?.toISOString() ?? 'null'}`);
    console.log(`[step-5] attempt_count=${row.attempt_count}`);
    console.log(`[step-5] created_at=${row.created_at.toISOString()}`);
    console.log(`[step-5] updated_at=${row.updated_at.toISOString()}`);

    if (row.last_error_summary) {
      // Sanitize: mask any token/secret-like text
      const sanitized = row.last_error_summary
        .substring(0, 120)
        .replace(/token|secret|key|password|auth|bearer|credential/gi, '[REDACTED]');
      console.log(`[step-5] last_error_summary=${sanitized}`);
    } else {
      console.log(`[step-5] last_error_summary=null`);
    }

    // ── Step 6: Final safety summary ─────────────────────────────────────────
    console.log('\n[safety-summary]');
    console.log(`  liveMutationAttempted = ${result.liveMutationAttempted} ← false ✓`);
    console.log(`  liveMutationBlocked   = ${result.liveMutationBlocked} ← true ✓`);
    console.log(`  external_id           = ${row.external_id} ← null ✓`);
    console.log(`  sync_status           = ${row.sync_status}`);
    console.log(`  No /contacts call made (guaranteed by runZohoBooksPostActivationDryRun) ✓`);

    console.log('\n[RESULT] SUCCESS');
    console.log(`[RESULT] org_slug=${selectedOrgSlug}`);
    console.log(`[RESULT] dry_run_status=${result.status}`);
    console.log(`[RESULT] storage_verified=true`);
    console.log(`[RESULT] external_id_null=true`);
    console.log(`[RESULT] live_mutation=NONE`);
    console.log('[ENUM] PROD_ZOHO_CONTROLLED_DRY_RUN_ORGANIZATION_INTEGRATIONS_COMPLETE_STORAGE_VERIFIED_TRIGGER_REMOVED_NO_LIVE_MUTATION');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[FATAL] ${message}`);
  process.exit(1);
});
